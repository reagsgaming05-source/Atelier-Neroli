"""Serveur local (FastAPI) : interface web + API JSON. Aucune donnée ne quitte le poste."""
from __future__ import annotations

import datetime as dt
import json
import logging
import os
import re
import shutil
import unicodedata
import urllib.parse
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from . import __version__
from .analyse import analyse_pdf
from .excel import build_workbook, output_filename
from .models import RUBRIQUES_CAMP, RUBRIQUES_COURSE, Dossier
from .ocr import TESSERACT_CMD, app_dir, tesseract_available
from .rules import NON_REMBOURSABLES, compute_rows, compute_total

log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = Path(os.environ.get("DECOMPTE_DATA", app_dir() / "data"))

app = FastAPI(title="Décompte DGEO", version=__version__)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

_dossiers: dict[str, Dossier] = {}


def public(dossier: Dossier) -> dict:
    """Représentation envoyée à l'interface (sans les milliers de mots OCR)."""
    data = dossier.model_dump()
    data["pages"] = [
        {
            "number": p.number, "width": p.width, "height": p.height, "kind": p.kind,
            "rotation": p.rotation, "source": p.source, "url": f"/api/pages/{dossier.id}/{p.number}",
        }
        for p in dossier.pages
    ]
    data["effectifs_calc"] = {
        "titres": dossier.effectifs.titres, "non_titres": dossier.effectifs.non_titres, "total": dossier.effectifs.total,
    }
    # Les rubriques de chaque type partent d'ici, avec le dossier : la page en avait une copie
    # écrite à la main, sans « Nourriture » pour la course, et affichait « Transport » là où
    # l'Excel écrivait « Nourriture ».
    data["rubriques"] = {"course": list(RUBRIQUES_COURSE), "camp": list(RUBRIQUES_CAMP)}
    # de même, pourquoi un reçu de carte, un récépissé ou un taux de change n'est pas compté
    data["motifs_exclusion"] = dict(NON_REMBOURSABLES)
    return data


def _from_client(payload: dict) -> Dossier:
    payload = dict(payload)
    payload["pages"] = []  # les mots ne sont pas renvoyés par le client
    payload.pop("effectifs_calc", None)
    payload.pop("rubriques", None)
    payload.pop("motifs_exclusion", None)
    return Dossier.model_validate(payload)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict:
    return {"version": __version__, "tesseract": tesseract_available(), "tesseract_cmd": TESSERACT_CMD, "data_dir": str(DATA_DIR)}


@app.post("/api/analyse")
async def analyse(file: UploadFile = File(...), type_activite: str | None = Form(None)) -> dict:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Le fichier doit être un PDF.")
    dossier_id = uuid.uuid4().hex[:12]
    work = DATA_DIR / dossier_id
    work.mkdir(parents=True, exist_ok=True)
    pdf_path = work / "source.pdf"
    with pdf_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    try:
        dossier = await run_in_threadpool(
            analyse_pdf,
            pdf_path,
            work / "pages",
            dossier_id,
            file.filename or "",
            type_activite=type_activite if type_activite in ("course", "camp") else None,
        )
    except Exception as exc:  # noqa: BLE001 — on veut remonter le message à l'écran
        log.exception("analyse impossible")
        raise HTTPException(500, f"Analyse impossible : {exc}") from exc
    _dossiers[dossier_id] = dossier
    data = public(dossier)
    # gardé tout de suite : même si la fenêtre se ferme avant la première correction, le
    # dossier analysé se reprend sans refaire la lecture
    _ecrire_etat(work / ETAT, {"version": 1, "dossier": data, "auto_rows": data["rows"], "retouches": {}})
    return data


# ---------------------------------------------------------------------------
# Décomptes en cours : gardés sur ce PC, repris plus tard
# ---------------------------------------------------------------------------
# Effectifs, corrections de pièces et retouches n'existaient que dans la page : fermer Compta
# Blonay, recharger ou déposer un autre PDF les perdait sans un mot, et il fallait tout refaire.
# La page envoie son état à chaque modification ; il est rangé à côté du PDF analysé.

ETAT = "etat.json"
ID_RE = re.compile(r"^[0-9a-f]{12}$")  # identifiant donné à l'analyse (uuid4().hex[:12])
ETAT_MAX = 8 * 1024 * 1024


def _etat_path(dossier_id: str) -> Path:
    """Fichier d'état d'un dossier analysé sur ce PC ; rien d'autre (ni chemin, ni dossier inventé)."""
    if not ID_RE.match(dossier_id) or not (DATA_DIR / dossier_id).is_dir():
        raise HTTPException(404, "Dossier inconnu")
    return DATA_DIR / dossier_id / ETAT


def _ecrire_etat(path: Path, etat: dict) -> str:
    etat = dict(etat, enregistre=dt.datetime.now().isoformat(timespec="seconds"))
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(etat, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)  # jamais un fichier à moitié écrit si le PC s'éteint
    return etat["enregistre"]


@app.get("/api/dossiers")
def dossiers_en_cours() -> list[dict]:
    """Décomptes gardés sur ce PC, le plus récent d'abord (pour « Reprendre »)."""
    out = []
    for f in DATA_DIR.glob(f"*/{ETAT}"):
        if not ID_RE.match(f.parent.name):
            continue
        try:
            etat = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        d = etat.get("dossier") if isinstance(etat, dict) else None
        if not isinstance(d, dict):
            continue
        out.append({
            "id": f.parent.name, "numero": d.get("numero") or "", "filename": d.get("filename") or "",
            "type_activite": d.get("type_activite") or "course", "activite": d.get("activite") or "",
            "classe": d.get("classe") or "", "total": d.get("total"), "enregistre": etat.get("enregistre") or "",
        })
    out.sort(key=lambda x: x["enregistre"], reverse=True)
    return out[:12]


@app.get("/api/dossiers/{dossier_id}")
def dossier_en_cours(dossier_id: str) -> Response:
    path = _etat_path(dossier_id)
    if not path.exists():
        raise HTTPException(404, "Aucun décompte gardé pour ce dossier")
    return Response(content=path.read_bytes(), media_type="application/json")


@app.post("/api/dossiers/{dossier_id}")
async def garder_dossier(dossier_id: str, request: Request) -> dict:
    # corps lu tel quel : en quittant la page, navigator.sendBeacon l'envoie en texte brut
    path = _etat_path(dossier_id)
    body = await request.body()
    if len(body) > ETAT_MAX:
        raise HTTPException(413, "État du décompte trop volumineux")
    try:
        etat = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError) as exc:
        raise HTTPException(400, "État du décompte illisible") from exc
    d = etat.get("dossier") if isinstance(etat, dict) else None
    if not isinstance(d, dict) or d.get("id") != dossier_id:
        raise HTTPException(400, "État d'un autre dossier")
    return {"enregistre": _ecrire_etat(path, etat)}


@app.delete("/api/dossiers/{dossier_id}")
def oublier_dossier(dossier_id: str) -> dict:
    """Retire un décompte de la liste « Reprendre » ; le PDF analysé reste dans data/."""
    path = _etat_path(dossier_id)
    if path.exists():
        path.unlink()
    return {"ok": True}


@app.post("/api/recompute")
def recompute(payload: dict) -> dict:
    dossier = _from_client(payload)
    compute_rows(dossier)
    stored = _dossiers.get(dossier.id)
    if stored is not None:
        dossier.pages = stored.pages
    return public(dossier)


@app.post("/api/total")
def total(payload: dict) -> dict:
    """Total arrondi pour des lignes éventuellement modifiées à la main."""
    dossier = _from_client(payload)
    return {"total": compute_total(dossier)}


@app.post("/api/excel")
def excel(payload: dict) -> Response:
    dossier = _from_client(payload)
    dossier.total = compute_total(dossier)
    data = build_workbook(dossier)
    name = output_filename(dossier)
    # L'en-tête HTTP ne sait écrire que du latin-1 : un nom d'enseignant ou de fichier avec une
    # lettre hors de cet alphabet (ł, ě, ş) faisait échouer l'export en erreur 500. On donne donc
    # une version simplifiée en filename, et le nom complet en filename* (RFC 5987, lu par les
    # navigateurs et par la fenêtre « Enregistrer sous » de l'application).
    stem, dot, ext = name.rpartition(".")
    ascii_stem = "".join(ch for ch in unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode() if ch.isalnum() or ch in "-_")
    ascii_name = f"{ascii_stem or 'decompte'}.{ext}" if dot else (ascii_stem or "decompte")
    quoted = urllib.parse.quote(name, safe="")
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quoted}'},
    )


@app.get("/api/pages/{dossier_id}/{number}")
def page_image(dossier_id: str, number: int) -> FileResponse:
    path = DATA_DIR / dossier_id / "pages" / f"page-{number}.jpg"
    if not path.exists():
        raise HTTPException(404, "Page introuvable")
    return FileResponse(path, media_type="image/jpeg")
