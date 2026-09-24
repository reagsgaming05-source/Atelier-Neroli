"""Tests de bout en bout sur de vrais dossiers scannés.

Les PDF ne sont pas dans le dépôt (données personnelles) : déposez-les dans tests/fixtures/
(ANS100325.pdf, DEL311025.pdf) pour activer ces tests. Ils nécessitent Tesseract."""
from pathlib import Path

import pytest

from decompte.analyse import analyse_pdf
from decompte.ocr import tesseract_available
from decompte.rules import compute_rows

FIXTURES = Path(__file__).parent / "fixtures"


def _run(name, tmp_path):
    pdf = FIXTURES / f"{name}.pdf"
    if not pdf.exists() or not tesseract_available():
        pytest.skip(f"{pdf.name} absent ou Tesseract indisponible")
    return analyse_pdf(pdf, tmp_path / name, name.lower(), pdf.name)


def test_del311025(tmp_path):
    d = _run("DEL311025", tmp_path)
    assert d.numero == "DEL311025" and d.type_activite == "course"
    assert d.effectifs.eleves == 19 and d.effectifs.titres == 2
    assert d.date_debut == "31.10.2025"
    assert [(r.rubrique, r.mode) for r in d.rows] == [("Transport", "direct"), ("Activité", "prorata")]
    assert d.rows[0].cout_direct == 5.5 and d.rows[1].cout_total == 300.0
    assert d.total == 34.05


def test_ans100325(tmp_path):
    d = _run("ANS100325", tmp_path)
    assert d.numero == "ANS100325" and d.effectifs.eleves == 77
    d.effectifs.enseignants_dgeo, d.effectifs.autres = 6, 2  # effectifs manuscrits : saisis à la main
    compute_rows(d)
    assert len(d.rows) == 1
    assert d.rows[0].libelle == "6*2.80 + 6*4.20 + 2*2.10 (Pces 1-4)"
    assert d.total == 46.20
    theatre = [p for p in d.pieces if p.total == 1155.0]
    assert theatre and not any(p.include for p in theatre)
