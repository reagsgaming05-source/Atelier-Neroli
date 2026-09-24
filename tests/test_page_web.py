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


def test_la_page_ne_recopie_plus_de_liste_de_rubriques():
    """Une seule source de vérité : aucune liste de rubriques écrite en dur dans la page."""
    js = (STATIC / "app.js").read_text(encoding="utf-8")
    noms = "|".join(re.escape(r) for r in set(RUBRIQUES_COURSE + RUBRIQUES_CAMP))
    copie = re.search(rf'\[\s*"(?:{noms})"\s*,\s*"(?:{noms})"', js)
    assert copie is None, f"liste de rubriques recopiée dans static/app.js : {copie.group(0) if copie else ''}"
