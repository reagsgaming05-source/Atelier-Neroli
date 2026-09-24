"""Relecture d'ergonomie : ce que le calcul dit de chaque justificatif, en clair, et les numéros
qu'il propose."""

from decompte.models import Dossier, Effectifs, FareLine, Piece
from decompte.rules import compute_rows, numeroter, propose


def piece(id, kind="billet", fares=None, total=None, rubrique="Transport", **kw):
    return Piece(id=id, numero=str(id), page=1, bbox=(0, 0, 1, 1), kind=kind, fares=fares or [], total=total,
                 currency="CHF", rubrique=rubrique, **kw)


def fare(cat, qty, price):
    return FareLine(label=cat, category=cat, qty=qty, unit_price=price)


def course(eleves=20, titres=2, autres=1):
    """Course d'école fictive : billet de groupe (3 plein tarifs pour 2 titrés), restaurant, reçu de
    la carte qui a payé le kiosque, ticket du kiosque, musée."""
    d = Dossier(id="t", type_activite="course", effectifs=Effectifs(eleves=eleves, enseignants_dgeo=titres, autres=autres), pieces=[
        piece(1, fares=[fare("plein", 3, 4.20), fare("enfant", 20, 2.10)], total=54.6),
        piece(2, kind="facture", total=396.0, rubrique="Nourriture"),
        piece(3, kind="recu_carte", total=57.5, rubrique="Autre"),
        piece(4, kind="billet", total=57.5, rubrique="Nourriture"),
        piece(5, kind="facture", total=150.0, rubrique="Activité"),
    ])
    numeroter(d)  # comme à l'analyse du PDF
    propose(d)
    compute_rows(d)
    return d


def test_chaque_justificatif_retenu_dit_ce_quil_rapporte_a_letat():
    """La part de l'État d'un justificatif ne se lisait nulle part : il fallait la retrouver dans une
    ligne qui en regroupe plusieurs, et le « × 2 titrés ÷ 23 » n'était que dans une infobulle."""
    d = course()
    billet, resto = d.resultats[1], d.resultats[2]
    assert billet.montant == 8.4
    assert billet.texte.startswith("2 × 4.20 = 8.40")
    assert "1 autre tarif adulte" in billet.texte  # le 3e adulte du billet n'est pas pour l'État
    assert resto.texte == "396.00 ÷ 23 personnes × 2 enseignant·e·s titré·e·s = 34.43"
    assert round(resto.montant, 2) == 34.43
    assert 3 not in d.resultats  # écarté : son motif suffit


def test_la_regle_appliquee_normalement_nest_plus_un_avertissement():
    """« 3 tarifs adultes sur le billet, 2 titrés retenus » s'affichait en orange dans les effectifs,
    comme un doute, loin du billet : c'est la règle, et elle se lit maintenant sur le billet."""
    d = course()
    assert not any("tarifs adultes sur le billet" in w for w in d.warnings)


def test_sans_effectifs_le_partage_attend_les_effectifs():
    d = course(eleves=0, titres=0, autres=0)
    assert d.resultats[2].montant is None
    assert "effectifs" in d.resultats[2].texte


def test_les_numeros_proposes_sautent_les_recus_de_carte():
    """Un reçu de carte accompagne son ticket et n'a pas de numéro à lui sur le papier : lui en donner
    un décalait les suivants (le kiosque devenait 4, le musée 5) jusque dans les libellés Excel."""
    d = course()
    assert [p.numero for p in d.pieces] == ["1", "2", "", "3", "4"]
    nourriture = next(r for r in d.rows if r.rubrique == "Nourriture")
    assert nourriture.libelle == "396.00 + 57.50 (Pces 2-3)"


def test_un_justificatif_compte_sans_numero_se_voit():
    """Le ticket lu à tort comme reçu de carte n'a pas de numéro ; compté quand même, il prenait
    son rang de lecture interne (« 3 »), qui ne correspond à rien sur le papier. Il porte
    maintenant « ? » dans le libellé, et un avertissement demande le numéro."""
    d = course()
    recu = d.pieces[2]
    recu.kind, recu.include, recu.rubrique = "billet", True, "Nourriture"
    compute_rows(d)
    nourriture = next(r for r in d.rows if r.rubrique == "Nourriture")
    assert nourriture.libelle.endswith("(Pces 2, ?, 3)")  # et non « (Pces 2, 3, 3) »
    assert any("sans numéro" in w for w in d.warnings)
