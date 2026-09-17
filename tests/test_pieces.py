import pytest

from decompte.models import Block, Line, Word
from decompte.pieces import analyse_block, classify_kind, parse_fares
from decompte.textutils import normalize


def block(lines: list[str], page: int = 1) -> Block:
    out = []
    for i, t in enumerate(lines):
        y = 10 + i * 30
        words = []
        x = 10
        for tok in t.split():
            words.append(Word(x0=x, y0=y, x1=x + 12 * len(tok), y1=y + 24, text=tok))
            x += 12 * len(tok) + 10
        out.append(Line(words=words, text=t, x0=10, y0=y, x1=x, y1=y + 24))
    return Block(page=page, bbox=(10, 10, 600, 10 + 30 * len(lines)), lines=out)


MOBILIS = [
    "Mobilis", "Billet de groupes individuel", "Valable: 10.03.2025 13:10 -", "10.03.2025 15:10", "Zones 70 72 74",
    "3 Prix entier CHF 4.20", "1 demi-tarif CHF 2.10", "39 Jeune 6-24.99 CHF 2.10", "43 Total", "2. Cl.", "CHF 96.60",
    "No article: 80186", "104 1277912978 03030956", "1352 incl. 8.10% TVA/MOB BAR",
]


def test_mobilis_ticket():
    p = analyse_block(block(MOBILIS), 3)
    assert p.kind == "billet"
    assert p.vendor == "Mobilis"
    assert p.date == "10.03.2025"
    assert p.currency == "CHF"
    assert p.total == 96.60
    assert p.rubrique == "Transport"
    cats = [(f.category, f.qty, f.unit_price) for f in p.fares]
    assert cats == [("plein", 3, 4.20), ("demi", 1, 2.10), ("enfant", 39, 2.10)]
    assert not any("≠" in n for n in p.notes)


def test_mobilis_ticket_with_dash_after_currency_and_ocr_noise():
    lines = [l.replace("CHF 96.60", "CHF- 96.60").replace("3 Prix entier", "Ks Prix entier").replace("1 demi-tarif", "4 demi-tarif") for l in MOBILIS]
    p = analyse_block(block(lines), 3)
    assert p.total == 96.60
    # le solveur (43 personnes, 96.60) rétablit 3 plein tarifs + 1 demi-tarif
    assert [(f.category, f.qty) for f in p.fares] == [("plein", 3), ("demi", 1), ("enfant", 39)]
    assert any("corrigées" in n for n in p.notes)


def test_carte_journaliere_single_adult():
    lines = ["Mobilis", "Carte journalière de groupes", "Valable: 31.10.2025 00:00 -", "Zones 70 71 72 74",
             "1 demi-tarif CHF 5.50", "19 Jeune 6-24.99 CHF 5.50", "20 Total", "2. Cl.", "CHF. 110.00"]
    p = analyse_block(block(lines), 1)
    assert p.total == 110.0
    assert [(f.category, f.qty, f.unit_price) for f in p.fares] == [("demi", 1, 5.5), ("enfant", 19, 5.5)]


def test_invoice_with_free_invites():
    lines = ["Théâtre Le Reflet", "Facture n°:10223313", "Catégories Qté Prix Unitaire Montant TTC",
             "ECOLES 15,-groupe 38 15,00 570,00", "INVITE MEDIATION 4 0,00 0,00",
             "ECOLES 15,-groupe 39 15,00 585,00", "INVITE MEDIATION 4 0,00 0,00", "Total TTC 1155,00 CHF"]
    p = analyse_block(block(lines), 5)
    assert p.kind == "facture"
    assert p.total == 1155.0
    assert p.rubrique == "Activité"
    assert [(f.category, f.qty, f.unit_price) for f in p.fares] == [
        ("enfant", 38, 15.0), ("invite", 4, 0.0), ("enfant", 39, 15.0), ("invite", 4, 0.0)]
    assert not p.adult_fares()


def test_invoice_total_line_beats_montant_line():
    lines = ["Théâtre Le Reflet", "Concerne : facture no 10223313", "85 Billets -- Montant : 9158,00 CHF",
             "Total facture no 10223313 fr. 1'155.-", "Total net fr. 1155.-"]
    p = analyse_block(block(lines), 4)
    assert p.total == 1155.0


def test_lump_sum_invoice():
    lines = ["Ville de Vevey", "Musée suisse de l'appareil photographique", "FACTURE N° 296'868",
             "Payable jusqu'au: 20.12.2025", "31.10.2025 Excursion photographique à Lavaux", "18 élèves + 2 accompagnateurs", "300.00"]
    p = analyse_block(block(lines), 5)
    assert p.kind == "facture"
    assert p.total == 300.0
    assert p.fares == []
    assert p.rubrique == "Activité"


def test_recepisse_is_detected():
    lines = ["Récépissé", "Compte / Payable à", "CH53 3000 0001 1800 0004 6", "Ville de Vevey", "Payable par",
             "Commune de Blonay", "Monnaie Montant", "CHF 300.00", "Point de dépôt"]
    p = analyse_block(block(lines), 5)
    assert p.kind == "recepisse"


def test_card_receipt_is_detected():
    lines = ["Quittance", "Maestro", "Terminal 12345678", "AID: A0000000043060", "Montant CHF 45.50", "Code d'autorisation 123456"]
    p = analyse_block(block(lines), 2)
    assert p.kind == "recu_carte"


def test_eur_ticket_with_chf_printed():
    lines = ["Musée du Louvre", "Billet", "2 Adulte 17,00 EUR", "19 Scolaire 0,00 EUR", "Total 34,00 EUR", "Montant CHF 32.50"]
    p = analyse_block(block(lines), 2)
    assert p.currency == "EUR"
    assert p.total == 34.0
    assert p.total_chf == 32.5
    assert [(f.category, f.qty, f.unit_price, f.currency) for f in p.fares][0] == ("plein", 2, 17.0, "EUR")


def test_eur_ticket_with_rate():
    lines = ["Boulangerie", "Total 12,50 EUR", "Taux de change 0.9450"]
    p = analyse_block(block(lines), 2)
    assert p.currency == "EUR"
    assert p.rate == 0.945


def test_classify_kind_invoice_containing_recepisse():
    text = normalize("FACTURE n° 12 Débiteur Total TTC 300.00 Récépissé Section paiement Payable par Point de dépôt")
    assert classify_kind(text)[0] == "facture"


def test_parse_fares_line_total_interpretation():
    # « 3 Adulte CHF 45.00 » où 45.00 est le total de ligne : la somme doit retomber sur le total
    fares, _ = parse_fares(["3 Adulte CHF 45.00", "10 Enfant CHF 50.00"], "CHF", 95.0)
    assert [(f.qty, f.unit_price) for f in fares] == [(3, 15.0), (10, 5.0)]


MOB_GROUPE = [
    "MOB GoldenPass", "Montreux - Zweisimmen", "Voyage de groupe 12.06.2025",
    "18 Elèves CHF 9.00 162.00", "2 Enseignants CHF 26.00 52.00", "1 Accompagnateur CHF 26.00 26.00",
    "21 Total", "Total CHF 240.00",
]


def test_mob_group_ticket_teacher_fares_are_adult_fares():
    """Billet de groupe MOB : les tarifs « Enseignant » et « Accompagnateur » sont des tarifs adultes
    (plein), retenus pour la part État ; les élèves restent des enfants."""
    p = analyse_block(block(MOB_GROUPE), 5)
    assert p.kind == "billet"
    assert p.total == 240.00
    cats = [(f.category, f.qty, f.unit_price) for f in p.fares]
    assert ("plein", 2, 26.00) in cats
    assert ("plein", 1, 26.00) in cats
    assert ("enfant", 18, 9.00) in cats
    assert sum(f.qty for f in p.adult_fares()) == 3


# ---------------------------------------------------------------------------
# Relecture de septembre
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "phrase",
    [
        "A l'attention de l'enseignant responsable CHF 250.00",
        "Facture enseignant responsable CHF 250.00",
        "Payable par l'enseignant CHF 250.00",
        "Concerne : camp - enseignant CHF 250.00",
    ],
)
def test_mention_enseignant_dans_une_phrase_nest_pas_un_tarif(phrase):
    """Sans quantité et pour le montant total de la pièce : c'est une phrase, pas un tarif.

    Pris pour un tarif adulte, le montant entier partait à la charge de l'État au lieu de
    passer par la règle de trois."""
    p = analyse_block(block(["Facture", phrase, "Total CHF 250.00"]), 1)
    assert p.fares == [], f"tarif inventé : {[(f.category, f.qty, f.unit_price, f.label) for f in p.fares]}"
    assert p.total == 250.0


@pytest.mark.parametrize(
    "ligne,qty,prix",
    [
        ("2 Enseignants CHF 8.40", 2, 8.40),
        ("3 Accompagnants / Begleitpersonen CHF 26.00 78.00", 3, 26.00),
        ("Begleitperson 2 x 12.40", 2, 12.40),
        ("1 accompagnateur CHF 12.00", 1, 12.00),
    ],
)
def test_ligne_tarifaire_enseignant_reste_un_tarif_adulte(ligne, qty, prix):
    p = analyse_block(block(["MOB Golden Pass", ligne, "24 Jeune 6-16 CHF 4.20", "CHF 300.00"]), 1)
    cats = {(f.category, f.qty, f.unit_price) for f in p.fares}
    assert ("plein", qty, prix) in cats, f"tarifs lus : {cats}"


def test_page_de_decompte_reste_un_dossier_valide():
    from decompte.models import Dossier, PageData

    d = Dossier(id="t", pages=[PageData(number=1, kind="decompte", width=595, height=842)])
    assert Dossier.model_validate(d.model_dump()).pages[0].kind == "decompte"
