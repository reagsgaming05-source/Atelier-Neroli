from decompte.models import DecompteRow, Dossier, Effectifs, FareLine, Piece
from decompte.rules import compute_rows, compute_total, propose, round_005, take_adult_fares


def piece(id, kind="billet", fares=None, total=None, currency="CHF", rubrique="Transport", **kw):
    return Piece(id=id, numero=str(id), page=1, bbox=(0, 0, 1, 1), kind=kind, fares=fares or [], total=total,
                 currency=currency, rubrique=rubrique, **kw)


def fare(cat, qty, price, cur="CHF"):
    return FareLine(label=cat, category=cat, qty=qty, unit_price=price, currency=cur)


def dossier(pieces, titres=6, eleves=77, autres=2, type_activite="course", **kw):
    d = Dossier(id="t", type_activite=type_activite, effectifs=Effectifs(eleves=eleves, enseignants_dgeo=titres, autres=autres), pieces=pieces, **kw)
    propose(d)
    compute_rows(d)
    return d


def test_take_adult_fares_plein_first_then_demi_capped_by_titres():
    fares = [fare("enfant", 39, 2.10), fare("demi", 1, 2.10), fare("plein", 3, 4.20)]
    assert take_adult_fares(fares, 6) == [(3, 4.20, "CHF"), (1, 2.10, "CHF")]
    assert take_adult_fares(fares, 2) == [(2, 4.20, "CHF")]
    assert take_adult_fares(fares, 0) == []


def test_ans100325_like_dossier():
    t1 = [fare("plein", 3, 2.80), fare("enfant", 38, 1.70)]
    t3 = [fare("plein", 3, 4.20), fare("demi", 1, 2.10), fare("enfant", 39, 2.10)]
    theatre = piece(5, kind="facture", fares=[fare("enfant", 38, 15.0), fare("invite", 4, 0.0)], total=1155.0, rubrique="Activité")
    d = dossier([piece(1, fares=t1, total=73.0), piece(2, fares=t1, total=73.0), piece(3, fares=t3, total=96.6), piece(4, fares=t3, total=96.6), theatre])
    assert not theatre.include and "invités" in theatre.exclusion_reason
    assert len(d.rows) == 1
    row = d.rows[0]
    assert row.rubrique == "Transport" and row.mode == "direct"
    assert row.libelle == "6*2.80 + 6*4.20 + 2*2.10 (Pces 1-4)"
    assert row.cout_direct == 46.20
    assert d.total == 46.20


def test_del311025_like_dossier():
    d = dossier([piece(1, fares=[fare("demi", 1, 5.5), fare("enfant", 19, 5.5)], total=110.0),
                 piece(2, kind="facture", total=300.0, rubrique="Activité")], titres=2, eleves=19, autres=0)
    assert [(r.rubrique, r.mode, r.libelle, r.cout_total, r.cout_direct) for r in d.rows] == [
        ("Transport", "direct", "1*5.50 (Pce 1)", 110.0, 5.5),  # coût total du billet en H (information), part État directe en I
        ("Activité", "prorata", "(Pce 2)", 300.0, None),
    ]
    assert d.rows[0].formule == "1*5.50"
    assert d.total == 34.05  # 5.50 + 300/21*2 = 34.07 → arrondi à 0.05


def test_non_reimbursable_kinds_excluded():
    d = dossier([piece(1, kind="facture", total=300.0, rubrique="Activité"), piece(2, kind="recepisse", total=300.0),
                 piece(3, kind="recu_carte", total=300.0)], titres=2, eleves=19, autres=0)
    assert [p.include for p in d.pieces] == [True, False, False]
    assert len(d.rows) == 1


def test_same_amount_twice_is_flagged_but_counted():
    """Quatre nuits à l'auberge font quatre fois le même montant.

    Ces pièces étaient écartées d'office comme « doublon probable » : les trois quarts d'un
    hébergement disparaissaient du décompte sans que rien ne le dise, et une pièce écartée ne se
    réclame pas toute seule. Elles comptent maintenant toutes, avec un avertissement.
    """
    d = dossier([piece(i, kind="facture", total=300.0, rubrique="Hébergement") for i in (1, 2, 3, 4)],
                titres=2, eleves=19, autres=0, type_activite="camp")
    assert [p.include for p in d.pieces] == [True, True, True, True]
    # le coût total de la ligne porte bien les quatre nuits
    assert sum(r.cout_total or 0 for r in d.rows) == 1200.0
    # et la personne est prévenue, sur la pièce comme sur le dossier
    assert any("Même montant" in n for n in d.pieces[1].notes)
    assert any("même montant" in w for w in d.warnings)


def test_prorata_grouping_and_libelle_with_several_pieces():
    d = dossier([piece(2, kind="facture", total=300.0, rubrique="Activité"), piece(3, kind="facture", total=150.0, rubrique="Activité")], titres=2, eleves=19, autres=0)
    assert d.rows[0].libelle == "300.00 + 150.00 (Pces 2-3)"
    assert d.rows[0].cout_total == 450.0


def test_eur_piece_uses_printed_chf_or_rate():
    printed = piece(1, kind="facture", total=100.0, currency="EUR", total_chf=95.0, rubrique="Activité")
    d = dossier([printed], titres=2, eleves=18, autres=0)
    assert d.rows[0].cout_total == 95.0 and "100.00 EUR = 95.00 CHF" in d.rows[0].libelle
    rated = piece(1, fares=[fare("plein", 2, 10.0, "EUR")], total=20.0, currency="EUR")
    d = dossier([rated], titres=2, eleves=18, autres=0, taux_eur_chf=0.95)
    assert d.rows[0].cout_direct == 19.0 and d.rows[0].libelle == "2*10.00 EUR*0.9500 (Pce 1)"
    missing = piece(1, kind="facture", total=20.0, currency="EUR", rubrique="Activité")
    d = dossier([missing], titres=2, eleves=18, autres=0)
    assert d.rows == [] and any("taux" in w for w in d.warnings)


def test_camp_rubriques_kept_course_rubriques_folded_to_autre():
    d = dossier([piece(1, kind="facture", total=500.0, rubrique="Hébergement")], type_activite="camp", titres=3, eleves=20, autres=1)
    assert d.rows[0].rubrique == "Hébergement"
    d = dossier([piece(1, kind="facture", total=500.0, rubrique="Hébergement")], type_activite="course", titres=3, eleves=20, autres=1)
    assert d.rows[0].rubrique == "Autre"


def test_round_005():
    assert round_005(34.07) == 34.05
    assert round_005(34.08) == 34.10
    assert round_005(46.20) == 46.20


def test_piece_without_readable_adult_fare_falls_back_to_rule_of_three():
    # billet où seuls des tarifs élèves ont été lus : exclu avec motif, mode règle de trois si on le retient quand même
    kids_only = piece(1, fares=[fare("enfant", 20, 5.2)], total=143.9)
    d = dossier([kids_only], titres=2, eleves=20, autres=1)
    assert not kids_only.include and kids_only.mode == "prorata" and "Aucun tarif adulte" in kids_only.exclusion_reason
    kids_only.include = True
    compute_rows(d)
    assert [(r.mode, r.cout_total, r.cout_direct) for r in d.rows] == [("prorata", 143.9, None)]
    assert d.total == 12.5  # 143.90 / 23 × 2 = 12.51 → 12.50
    # pièce forcée en saisie directe (interface) sans tarif adulte : règle de trois sur son total, avec avertissement,
    # au lieu de disparaître du décompte
    forced = piece(2, fares=[fare("autre", 23, 8.0)], total=184.0, rubrique="Activité", mode="direct")
    d2 = Dossier(id="t", type_activite="course", effectifs=Effectifs(eleves=20, enseignants_dgeo=2, autres=1), pieces=[forced])
    compute_rows(d2)
    assert [(r.rubrique, r.mode, r.cout_total) for r in d2.rows] == [("Activité", "prorata", 184.0)]
    assert any("règle de trois" in w for w in d2.warnings)
    # sans total lisible : non comptée, mais signalée
    forced.total = None
    compute_rows(d2)
    assert d2.rows == [] and any("non compté" in w for w in d2.warnings)


def test_direct_rows_keep_ticket_totals_and_formula_detail():
    t = [fare("plein", 2, 19.95), fare("enfant", 20, 5.2)]
    d = dossier([piece(1, fares=t, total=143.9), piece(2, fares=t, total=143.9)], titres=2, eleves=20, autres=1)
    row = d.rows[0]
    # deux billets (aller, retour) : 2 titrés retenus sur chacun ; coût total des deux billets en H
    assert row.mode == "direct" and row.cout_direct == 79.8 and row.cout_total == 287.8
    assert row.formule == "4*19.95" and row.libelle == "4*19.95 (Pces 1-2)"


# ---------------------------------------------------------------------------
# Relecture de septembre
# ---------------------------------------------------------------------------


def test_deux_pieces_eur_sans_total_ne_font_pas_echouer_le_calcul():
    # Deux totaux illisibles ne sont pas « le même montant » : la recherche d'un taux ne doit pas
    # tenter une division sur None. Cas atteint quand on retient malgré tout des pièces que le
    # logiciel avait écartées : le recalcul et l'export échouaient alors en erreur.
    d = dossier([piece(1, kind="facture", total=None, total_chf=50.0, currency="EUR", rubrique="Activité"),
                 piece(2, kind="facture", total=None, currency="EUR", rubrique="Activité")], titres=2, eleves=19, autres=0)
    for p in d.pieces:
        p.include = True
    compute_rows(d)
    assert d.rows == []
    assert any("n° 2" in w and "taux de change" in w for w in d.warnings)


def test_montant_chf_egal_a_la_contre_valeur_dune_piece_eur_reste_dans_le_detail():
    d = dossier([piece(1, kind="facture", total=100.0, currency="EUR", rate=1.0, rubrique="Activité"),
                 piece(2, kind="facture", total=100.0, currency="CHF", rubrique="Activité")], titres=2, eleves=19, autres=0)
    row = next(r for r in d.rows if r.rubrique == "Activité")
    assert row.cout_total == 200.0
    assert row.libelle == "100.00 EUR*1.0000 = 100.00 CHF + 100.00 (Pces 1-2)"


def test_piece_sans_tarif_adulte_ni_total_nest_pas_annoncee_dans_la_ligne():
    # pièce retenue à la main, en saisie directe, sans tarif adulte lisible ni total
    d = dossier([piece(1, fares=[fare("plein", 2, 2.80)], total=5.6),
                 piece(2, fares=[fare("enfant", 3, 1.0)], total=None)], titres=2, eleves=19, autres=0)
    d.pieces[1].include = True
    d.pieces[1].mode = "direct"
    compute_rows(d)
    row = next(r for r in d.rows if r.rubrique == "Transport")
    assert row.pieces == [1]
    assert row.libelle == "2*2.80 (Pce 1)"
    assert any("n° 2" in w and "non compté" in w for w in d.warnings)
