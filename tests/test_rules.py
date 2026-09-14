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
    assert row.libelle == "pces 1-4 (6*2.80 + 6*4.20 + 2*2.10)"
    assert row.cout_direct == 46.20
    assert d.total == 46.20


def test_del311025_like_dossier():
    d = dossier([piece(1, fares=[fare("demi", 1, 5.5), fare("enfant", 19, 5.5)], total=110.0),
                 piece(2, kind="facture", total=300.0, rubrique="Activité")], titres=2, eleves=19, autres=0)
    assert [(r.rubrique, r.mode, r.libelle, r.cout_total, r.cout_direct) for r in d.rows] == [
        ("Transport", "direct", "pce 1 (1*5.50)", None, 5.5),
        ("Activité", "prorata", "pce 2", 300.0, None),
    ]
    assert d.total == 34.05  # 5.50 + 300/21*2 = 34.07 → arrondi à 0.05


def test_non_reimbursable_kinds_excluded_and_duplicates():
    d = dossier([piece(1, kind="facture", total=300.0, rubrique="Activité"), piece(2, kind="recepisse", total=300.0),
                 piece(3, kind="recu_carte", total=300.0), piece(4, kind="facture", total=300.0, rubrique="Activité")], titres=2, eleves=19, autres=0)
    assert [p.include for p in d.pieces] == [True, False, False, False]
    assert "Doublon" in d.pieces[3].exclusion_reason
    assert len(d.rows) == 1


def test_prorata_grouping_and_libelle_with_several_pieces():
    d = dossier([piece(2, kind="facture", total=300.0, rubrique="Activité"), piece(3, kind="facture", total=150.0, rubrique="Activité")], titres=2, eleves=19, autres=0)
    assert d.rows[0].libelle == "pces 2-3 (300.00 + 150.00)"
    assert d.rows[0].cout_total == 450.0


def test_eur_piece_uses_printed_chf_or_rate():
    printed = piece(1, kind="facture", total=100.0, currency="EUR", total_chf=95.0, rubrique="Activité")
    d = dossier([printed], titres=2, eleves=18, autres=0)
    assert d.rows[0].cout_total == 95.0 and "100.00 EUR = 95.00 CHF" in d.rows[0].libelle
    rated = piece(1, fares=[fare("plein", 2, 10.0, "EUR")], total=20.0, currency="EUR")
    d = dossier([rated], titres=2, eleves=18, autres=0, taux_eur_chf=0.95)
    assert d.rows[0].cout_direct == 19.0 and d.rows[0].libelle == "pce 1 (2*10.00 EUR*0.9500)"
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
