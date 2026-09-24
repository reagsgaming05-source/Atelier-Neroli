"""Lignes du décompte dans la page (static/lignes.js) : retoucher une ligne ne fige plus rien.

Le module est exécuté par Node, tel que la page le charge ; sans Node, ces essais sont sautés."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="Node introuvable")
LIGNES = Path(__file__).resolve().parents[1] / "decompte" / "static" / "lignes.js"
EFF = {"eleves": 20, "enseignants_dgeo": 2, "enseignants_js": 0, "moniteurs_js": 0, "autres": 1}


def node(script: str):
    prog = f"const L = require({json.dumps(str(LIGNES))});\nconst out = (() => {{ {script} }})();\nprocess.stdout.write(JSON.stringify(out));"
    # Le programme passe par l'entrée standard et revient par la sortie, en UTF-8 dans les deux
    # sens : sans encodage explicite, Python lisait la réponse de Node avec celui de Windows
    # (cp1252), et « Activité » revenait « ActivitÃ© ».
    r = subprocess.run([NODE, "-"], input=prog, capture_output=True, text=True, encoding="utf-8", timeout=30)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


BILLET = {"rubrique": "Transport", "mode": "direct", "libelle": "2*4.20 (Pce 1)", "cout_total": 54.6, "cout_direct": 8.4, "formule": "2*4.20", "pieces": [1]}
MUSEE = {"rubrique": "Activité", "mode": "prorata", "libelle": "(Pce 4)", "cout_total": 150.0, "pieces": [5]}
REPAS = {"rubrique": "Nourriture", "mode": "prorata", "libelle": "396.00 + 57.50 (Pces 2-3)", "cout_total": 453.5, "pieces": [2, 4]}


def test_une_retouche_ne_fige_plus_le_decompte():
    """Scénario du constat : le libellé du billet est retouché, puis le musée est décoché. La page
    gardait alors ses lignes (total 60.90, musée compris) ; le calcul doit suivre (47.85) et la
    retouche rester."""
    out = node(f"""
        const eff = {json.dumps(EFF)};
        const avant = {json.dumps([BILLET, MUSEE, REPAS])};
        const retouches = {{}};
        L.retoucher(retouches, avant, "Transport|direct", "libelle", "Billets Mobilis");
        const apres = {json.dumps([BILLET, REPAS])};  // recalcul du serveur, musée décoché
        const lignes = L.effectives(apres, retouches);
        return {{ total: L.total(lignes, eff), libelles: lignes.map((r) => r.libelle), marques: lignes.map((r) => Object.keys(r._marques)) }};
    """)
    assert out["total"] == 47.85
    assert out["libelles"] == ["Billets Mobilis", "396.00 + 57.50 (Pces 2-3)"]
    assert out["marques"] == [["libelle"], []]


def test_une_retouche_depassee_par_le_calcul_se_signale():
    """Un montant tapé à la main alors que les justificatifs changent ensuite : le calcul donne
    autre chose, et la page doit le dire au lieu de garder l'ancien montant en silence."""
    out = node(f"""
        const retouches = {{}};
        const avant = {json.dumps([REPAS])};
        L.retoucher(retouches, avant, "Nourriture|prorata", "cout_total", 400);
        const apres = [Object.assign({{}}, avant[0], {{ cout_total: 396.0, pieces: [2] }})];
        const [r] = L.effectives(apres, retouches);
        return {{ valeur: r.cout_total, marque: r._marques.cout_total }};
    """)
    assert out["valeur"] == 400
    assert out["marque"] == {"auto": 396.0, "perimee": True}


def test_retouche_dune_ligne_disparue_puis_revenue():
    out = node(f"""
        const retouches = {{}};
        L.retoucher(retouches, {json.dumps([MUSEE])}, "Activité|prorata", "libelle", "Musée alpin");
        const sans = L.orphelines({json.dumps([BILLET])}, retouches);
        const avec = L.effectives({json.dumps([MUSEE])}, retouches)[0].libelle;
        return {{ sans, avec }};
    """)
    assert out == {"sans": ["Activité|prorata"], "avec": "Musée alpin"}


def test_revenir_a_la_valeur_calculee_efface_la_retouche():
    out = node(f"""
        const auto = {json.dumps([REPAS])};
        const retouches = {{}};
        L.retoucher(retouches, auto, "Nourriture|prorata", "mode", "direct");
        L.retoucher(retouches, auto, "Nourriture|prorata", "cout_direct", 39.45);
        const pendant = L.nombre(retouches);
        L.retoucher(retouches, auto, "Nourriture|prorata", "mode", "prorata");  // retour au calcul d'origine
        return {{ pendant, apres: L.nombre(retouches) }};
    """)
    assert out == {"pendant": 2, "apres": 0}


def test_la_rubrique_changee_emmene_les_retouches():
    out = node("""
        const retouches = { "Autre|prorata": { libelle: { valeur: "Glaces", base: "(Pce 3)" } } };
        L.deplacer(retouches, "Autre|prorata", "Nourriture|prorata");
        return retouches;
    """)
    assert out == {"Nourriture|prorata": {"libelle": {"valeur": "Glaces", "base": "(Pce 3)"}}}
