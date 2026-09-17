"""Serveur local (FastAPI) : interface web + API JSON. Aucune donnée ne quitte le poste."""
from __future__ import annotations

import logging
import os
import shutil
import unicodedata
import urllib.parse
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from . import __version__
from .analyse import analyse_pdf
from .excel import build_workbook, output_filename
from .models import Dossier
from .ocr import TESSERACT_CMD, app_dir, tesseract_available
from .rules import compute_rows, compute_total

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
    return data


def _from_client(payload: dict) -> Dossier:
    payload = dict(payload)
    payload["pages"] = []  # les mots ne sont pas renvoyés par le client
    payload.pop("effectifs_calc", None)
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
    return public(dossier)


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
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode() or "decompte.xlsx"
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
