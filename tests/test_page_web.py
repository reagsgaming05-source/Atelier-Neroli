"""Page web de Décompte DGEO (celle que Compta Blonay affiche) : ce que le serveur lui fournit
et ce qu'il garde pour elle."""

import re
from pathlib import Path

import pytest

try:
    from fastapi.testclient import TestClient
except Exception as exc:  # noqa: BLE001
    pytest.skip(f"client de test indisponible ({exc})", allow_module_level=True)

from decompte.app import app
from decompte.models import RUBRIQUES_CAMP, RUBRIQUES_COURSE

STATIC = Path(__file__).resolve().parents[1] / "decompte" / "static"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    import decompte.app as mod

    monkeypatch.setattr(mod, "DATA_DIR", tmp_path)
    with TestClient(app) as c:
        yield c


def _dossier(**kw):
    d = {
        "id": "abc123abc123",
        "filename": "BER120626.pdf",
        "numero": "BER120626",
        "type_activite": "course",
        "effectifs": {"eleves": 20, "enseignants_dgeo": 2, "enseignants_js": 0, "moniteurs_js": 0, "autres": 1},
        "pieces": [],
        "rows": [],
        "warnings": [],
    }
    d.update(kw)
    return d


def test_la_page_recoit_les_rubriques_du_serveur(client):
    """La page avait sa propre liste, recopiée à la main, sans « Nourriture » pour la course :
    le ticket du restaurant s'affichait « Transport » alors que l'Excel écrivait « Nourriture ».
    Les listes viennent maintenant du serveur, avec chaque dossier."""
    r = client.post("/api/recompute", json=_dossier())
    assert r.status_code == 200, r.text
    assert r.json()["rubriques"] == {"course": RUBRIQUES_COURSE, "camp": RUBRIQUES_CAMP}
    assert "Nourriture" in r.json()["rubriques"]["course"]


def _etat(**kw):
    return {"version": 1, "dossier": _dossier(**kw), "auto_rows": [],
            "retouches": {"Transport|direct": {"libelle": {"valeur": "Billets Mobilis", "base": "2*4.20 (Pce 1)"}}}}


def test_un_decompte_en_cours_se_garde_et_se_reprend(client, tmp_path):
    """Effectifs, corrections et retouches n'existaient que dans la page : fermer Compta Blonay,
    recharger ou déposer un autre PDF les perdait sans un mot, et rien ne permettait de reprendre."""
    (tmp_path / "abc123abc123").mkdir()
    etat = _etat(activite="Rochers-de-Naye", total=60.9)
    r = client.post("/api/dossiers/abc123abc123", json=etat)
    assert r.status_code == 200, r.text
    liste = client.get("/api/dossiers").json()
    assert [(x["id"], x["numero"], x["activite"], x["total"]) for x in liste] == [("abc123abc123", "BER120626", "Rochers-de-Naye", 60.9)]
    assert liste[0]["enregistre"]
    repris = client.get("/api/dossiers/abc123abc123").json()
    assert repris["retouches"] == etat["retouches"] and repris["dossier"]["activite"] == "Rochers-de-Naye"


def test_enregistrement_envoye_en_quittant_la_page(client, tmp_path):
    """En quittant la page, le dernier état part par navigator.sendBeacon, en texte brut."""
    import json

    (tmp_path / "abc123abc123").mkdir()
    r = client.post("/api/dossiers/abc123abc123", content=json.dumps(_etat()), headers={"Content-Type": "text/plain;charset=UTF-8"})
    assert r.status_code == 200, r.text
    assert (tmp_path / "abc123abc123" / "etat.json").exists()


def test_identifiant_de_dossier_hors_des_donnees_refuse(client, tmp_path):
    for mauvais in ("..", "abc", "ABC123ABC123", "abc123abc12z", "abc123abc123abc"):
        assert client.post(f"/api/dossiers/{mauvais}", json=_etat()).status_code == 404, mauvais
        assert client.get(f"/api/dossiers/{mauvais}").status_code == 404, mauvais
    # bien formé, mais jamais analysé ici : rien n'est créé
    assert client.post("/api/dossiers/ffffffffffff", json=_etat()).status_code == 404
    assert not (tmp_path / "ffffffffffff").exists()
    # l'état doit être celui de CE dossier
    (tmp_path / "abc123abc123").mkdir()
    autre = _etat()
    autre["dossier"]["id"] = "0123456789ab"
    assert client.post("/api/dossiers/abc123abc123", json=autre).status_code == 400


def test_lanalyse_garde_tout_de_suite_le_decompte(client, tmp_path):
    import pymupdf

    pdf = tmp_path / "course.pdf"
    doc = pymupdf.open()
    doc.new_page().insert_text((60, 90), "Restaurant du Lac  Total CHF 396.00", fontsize=12)
    doc.save(str(pdf))
    doc.close()
    with pdf.open("rb") as fh:
        r = client.post("/api/analyse", files={"file": ("BER120626.pdf", fh, "application/pdf")})
    assert r.status_code == 200, r.text
    ident = r.json()["id"]
    assert [x["id"] for x in client.get("/api/dossiers").json()] == [ident]
    assert client.get(f"/api/dossiers/{ident}").json()["dossier"]["id"] == ident


def test_retirer_un_decompte_de_la_liste(client, tmp_path):
    (tmp_path / "abc123abc123").mkdir()
    (tmp_path / "abc123abc123" / "source.pdf").write_bytes(b"%PDF")
    client.post("/api/dossiers/abc123abc123", json=_etat())
    assert client.delete("/api/dossiers/abc123abc123").status_code == 200
    assert client.get("/api/dossiers").json() == []
    assert (tmp_path / "abc123abc123" / "source.pdf").exists()  # le PDF analysé reste


def test_la_page_ne_recopie_plus_de_liste_de_rubriques():
    """Une seule source de vérité : aucune liste de rubriques écrite en dur dans la page."""
    js = (STATIC / "app.js").read_text(encoding="utf-8")
    noms = "|".join(re.escape(r) for r in set(RUBRIQUES_COURSE + RUBRIQUES_CAMP))
    copie = re.search(rf'\[\s*"(?:{noms})"\s*,\s*"(?:{noms})"', js)
    assert copie is None, f"liste de rubriques recopiée dans static/app.js : {copie.group(0) if copie else ''}"
