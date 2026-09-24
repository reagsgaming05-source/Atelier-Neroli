"""Pipeline complet : PDF → pages → formulaire + pièces → propositions → lignes."""
from __future__ import annotations

import datetime as dt
import logging
import re
import unicodedata
from pathlib import Path

from .forms import is_form_page, parse_form
from .models import Dossier, PageData
from .ocr import load_pages
from .pieces import analyse_block
from .rules import compute_rows, numeroter, propose
from .segment import normalize, segment_page

log = logging.getLogger(__name__)

NUMERO_RE = re.compile(r"[A-Z]{3}\d{6}")


def is_decompte_page(page: PageData) -> bool:
    """Page « Décompte DGEO » déjà établie (jointe au dossier) : on l'ignore."""
    text = normalize(" ".join(w.text for w in page.words))
    return "decompte dgeo" in text and ("total du remboursement" in text or "charge de l'etat" in text)


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def make_numero(filename: str, enseignant: str, date_debut: str | None) -> str:
    m = NUMERO_RE.search(Path(filename).stem.upper())
    if m:
        return m.group(0)
    if enseignant and date_debut:
        parts = [p for p in re.split(r"[\s,]+", _strip_accents(enseignant)) if len(p) > 2 and not p.endswith(".")]
        last = parts[-1] if parts else ""
        letters = re.sub(r"[^A-Z]", "", last.upper())[:3]
        try:
            d, mth, y = date_debut.split(".")
            return f"{letters}{int(d):02d}{int(mth):02d}{y[-2:]}" if len(letters) == 3 else ""
        except ValueError:
            return ""
    return ""


def guess_type(form: dict) -> str:
    t = normalize(form.get("type_activite_texte") or "")
    if "camp" in t or "colonie" in t or "sejour" in t:
        return "camp"
    if form.get("date_debut") and form.get("date_fin") and form["date_debut"] != form["date_fin"]:
        return "camp"
    for e in form.get("form_expenses", []):
        if e.categorie == "Hébergement" and (e.paye_commune or e.paye_enseignant or e.cout_total):
            return "camp"
    return "course"


def analyse_pdf(
    pdf_path: str | Path,
    work_dir: str | Path,
    dossier_id: str,
    filename: str = "",
    pages: list[PageData] | None = None,
    engine: str = "",
    progress=None,
    type_activite: str | None = None,
) -> Dossier:
    if pages is None:
        pages, engine = load_pages(pdf_path, work_dir, progress=progress)
    form_pages: list[PageData] = []
    for p in pages:
        if not p.words:
            p.kind = "empty"
        elif is_decompte_page(p):
            p.kind = "decompte"
        elif is_form_page(p):
            p.kind = "form"
            form_pages.append(p)
    form = parse_form(form_pages)
    warnings = list(form.pop("warnings", []))
    if not form_pages:
        warnings.append("Formulaire de décompte non détecté dans le PDF : complétez les effectifs à la main.")
    pieces = []
    for p in pages:
        if p.kind != "pieces":
            continue
        for block in segment_page(p):
            pieces.append(analyse_block(block, len(pieces) + 1))
    filename = filename or Path(pdf_path).name
    dossier = Dossier(
        id=dossier_id,
        filename=filename,
        numero=make_numero(filename, form.get("enseignant", ""), form.get("date_debut")),
        # Le type choisi à l'envoi doit être connu avant propose() : celui-ci ramène à « Autre »
        # toute rubrique absente de la liste du type, et l'imposer après coup ne rendait plus
        # « Hébergement », « Nourriture » ou « Cuisinière » à un camp détecté comme course.
        type_activite=(type_activite if type_activite in ("course", "camp") else guess_type(form)),  # type: ignore[arg-type]
        pages=pages,
        pieces=pieces,
        warnings=warnings,
        ocr_engine=engine,
        date_decompte=dt.date.today().strftime("%d.%m.%Y"),
        **form,
    )
    if not pieces:
        dossier.warnings.append("Aucune pièce justificative détectée.")
    numeroter(dossier)
    propose(dossier)
    compute_rows(dossier)
    return dossier
