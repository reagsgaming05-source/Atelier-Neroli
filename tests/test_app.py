"""Points d'entrée web (audit) : export du classeur et type d'activité imposé."""

import pymupdf
import pytest
from fastapi.testclient import TestClient

from decompte.app import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    import decompte.app as mod

    monkeypatch.setattr(mod, "DATA_DIR", tmp_path)
    with TestClient(app) as c:
        yield c


def test_export_dun_decompte_au_nom_accentue_hors_latin1(client):
    """« Bożena » : l'en-tête HTTP ne sait écrire que du latin-1, l'export répondait 500."""
    dossier = {
        "id": "t1",
        "filename": "Bożena.pdf",
        "numero": "BOŻ120626",
        "type_activite": "course",
        "classe": "5P/3",
        "enseignant": "B. Nowak",
        "effectifs": {"eleves": 20, "enseignants_dgeo": 2, "enseignants_js": 0, "moniteurs_js": 0, "autres": 1},
        "pieces": [],
        "rows": [{"rubrique": "Transport", "libelle": "pce 1", "mode": "direct", "cout_direct": 24.4, "pieces": []}],
        "warnings": [],
    }
    r = client.post("/api/excel", json=dossier)
    assert r.status_code == 200, r.text
    cd = r.headers["content-disposition"]
    assert "filename=" in cd
    cd.encode("latin-1")  # l'en-tête doit être transmissible telle quelle
    assert len(r.content) > 1000


def _pdf_camp(path):
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((60, 90), "Hotel des Alpes - Leysin", fontsize=12)
    page.insert_text((60, 120), "Nuitees pension complete", fontsize=12)
    page.insert_text((60, 150), "Total CHF 1200.00", fontsize=12)
    doc.save(str(path))
    doc.close()
    return path


def test_type_dactivite_impose_avant_le_classement_des_rubriques(client, tmp_path):
    """Imposer « camp » après coup ne rendait plus « Hébergement » : les rubriques du camp
    avaient déjà été ramenées à « Autre » pour une course."""
    pdf = _pdf_camp(tmp_path / "camp.pdf")
    with pdf.open("rb") as fh:
        r = client.post("/api/analyse", files={"file": ("camp.pdf", fh, "application/pdf")}, data={"type_activite": "camp"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["type_activite"] == "camp"
    rubriques = {p["rubrique"] for p in d["pieces"]}
    assert rubriques and rubriques != {"Autre"}, f"rubriques lues : {rubriques}"
