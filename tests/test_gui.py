"""Fenêtre de Décompte DGEO (Tkinter) : les corrections de l'audit, exercées pour de vrai.

Sautés là où Tkinter ou un affichage manquent (c'est le cas de la construction Windows,
qui ne lance que le test de fumée de l'exécutable).
"""

import time

import pytest

tk = pytest.importorskip("tkinter", reason="Tkinter absent")
try:  # un affichage est-il utilisable ? (oui sur Windows, oui sous xvfb, non en console nue)
    _essai = tk.Tk()
    _essai.destroy()
except Exception as exc:  # noqa: BLE001
    pytest.skip(f"aucun affichage disponible ({exc})", allow_module_level=True)

from decompte.gui import App, PieceCard  # noqa: E402
from decompte.models import DecompteRow, Dossier, Effectifs, FareLine, Piece  # noqa: E402


def dossier_simple() -> Dossier:
    piece = Piece(
        id=1, numero="1", page=1, bbox=(0.0, 0.0, 100.0, 100.0), kind="billet",
        currency="CHF", total=110.0, rubrique="Transport", mode="prorata",
        fares=[FareLine(label="Élève", category="enfant", qty=19, unit_price=5.5, currency="CHF")],
    )
    return Dossier(
        id="t", filename="test.pdf", numero="TEST", type_activite="course",
        effectifs=Effectifs(eleves=19, enseignants_dgeo=2, enseignants_js=0, moniteurs_js=0, autres=0),
        pieces=[piece],
        rows=[DecompteRow(rubrique="Transport", libelle="pce 1", mode="prorata", cout_total=110.0, pieces=[1])],
    )


@pytest.fixture()
def app():
    try:
        a = App([])
    except tk.TclError as exc:  # pragma: no cover
        pytest.skip(f"Tk indisponible ({exc})")
    a.withdraw()
    yield a
    a.destroy()


def test_lignes_modifiees_a_la_main_le_total_suit_les_effectifs(app):
    """Le total affiché doit suivre les effectifs même sur des lignes retouchées à la main :
    sinon l'export annonçait un total différent de celui affiché à l'écran."""
    app.load_dossier(dossier_simple())
    app.rows_manual = True
    avant = app.lbl_total.cget("text")
    app.dossier.effectifs.enseignants_dgeo = 6  # 2 titrés -> 6
    app._recompute()
    apres = app.lbl_total.cget("text")
    assert avant != apres, f"le total n'a pas suivi : {avant} puis {apres}"
    assert apres == f"CHF {app.dossier.total:.2f}"


def test_ajouter_un_tarif_met_la_liste_du_mode_a_jour(app):
    d = dossier_simple()
    app.load_dossier(d)
    carte = PieceCard(app, app, d.pieces[0])
    assert carte.mode_combo.code() == "prorata"
    carte._add_fare()
    assert d.pieces[0].mode == "direct"
    assert carte.mode_combo.code() == "direct", "la liste affiche encore « Règle de trois »"
    carte.destroy()


def test_vignette_absente_ne_disloque_pas_la_fiche(app):
    """Sans image, Tkinter compte width/height en caractères et en lignes : la vignette de
    remplacement mesurait 230 caractères sur 170 lignes."""
    d = dossier_simple()
    app.load_dossier(d)  # aucune image de page : thumbnail() renvoie None
    assert app.thumbnail(d.pieces[0]) is None
    carte = PieceCard(app, app, d.pieces[0])
    carte.update_idletasks()
    etiquette = next(w for w in carte.winfo_children()[0].winfo_children() if isinstance(w, tk.Label))
    assert etiquette.cget("text") == "(aperçu indisponible)"
    largeur = int(etiquette.cget("width"))
    assert largeur <= 40, f"largeur de {largeur} caractères : la fiche serait disloquée"
    carte.destroy()


def _pdf_lisible(path):
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((60, 90), "Gare de Vevey", fontsize=12)
    page.insert_text((60, 120), "2 Enseignants CHF 8.40", fontsize=12)
    page.insert_text((60, 150), "Total CHF 16.80", fontsize=12)
    doc.save(str(path))
    doc.close()
    return path


def test_fermer_la_fenetre_danalyse_ne_perd_pas_la_lecture(app, tmp_path, monkeypatch):
    """La croix referme la fenêtre de progression ; la lecture continue et son résultat arrive.

    Avant : la détruire faisait écrire poll() dans des widgets disparus (TclError) et le
    dossier était perdu. L'interdire enfermait l'utilisateur devant la barre de progression.
    """
    import decompte.gui as gui

    monkeypatch.setattr(gui, "DATA_DIR", tmp_path)
    incidents = []
    monkeypatch.setattr(app, "report_callback_exception", lambda *a: incidents.append(a))
    monkeypatch.setattr(gui.messagebox, "showerror", lambda *a, **k: incidents.append(("showerror",) + a))

    app.run_analysis(str(_pdf_lisible(tmp_path / "course.pdf")))
    fenetre = next(w for w in app.winfo_children() if isinstance(w, tk.Toplevel))

    # la croix : on appelle le gestionnaire enregistré, comme le ferait le gestionnaire de fenêtres
    commande = fenetre.protocol("WM_DELETE_WINDOW")
    assert commande, "aucun gestionnaire de fermeture : la croix ne faisait rien"
    app.tk.call(commande)
    app.update()
    assert not fenetre.winfo_exists(), "la fenêtre ne s'est pas fermée"

    # la lecture se poursuit sans elle et charge son dossier
    for _ in range(400):
        app.update()
        if app.dossier is not None and app.dossier.filename == "course.pdf":
            break
        time.sleep(0.02)
    assert incidents == [], f"incidents pendant la lecture : {incidents}"
    assert app.dossier is not None and app.dossier.filename == "course.pdf", "le résultat de la lecture a été perdu"


def test_chaque_analyse_a_sa_propre_file(app):
    """Une file par analyse : deux lectures lancées à la suite se volaient leurs messages,
    et la seconde chargeait le dossier de la première."""
    assert not hasattr(app, "_queue"), "une file partagée par toutes les analyses subsiste"
    import inspect

    source = inspect.getsource(App.run_analysis)
    assert "q: \"queue.Queue\" = queue.Queue()" in source
    assert "self._queue" not in source
