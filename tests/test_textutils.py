from decompte.textutils import AMOUNT_RE, normalize, parse_amount


def amounts(text):
    return [parse_amount(m.group(0)) for m in AMOUNT_RE.finditer(text)]


def test_amounts_formats():
    assert amounts("CHF 73.00") == [73.0]
    assert amounts("Total 1'155.00 CHF") == [1155.0]
    assert amounts("1 155,00") == [1155.0]
    assert amounts("ECOLES 15,-groupe 38 15,00 570,00") == [15.0, 15.0, 570.0]
    assert amounts("Total facture fr. 1'155.-") == [1155.0]
    assert amounts("INVITE MEDIATION 4 0,00 0,00") == [0.0, 0.0]


def test_amounts_rejects_dates_times_percents_codes():
    assert amounts("Valable: 10.03.2025 09:12 - 10.03.2025 10:12") == []
    assert amounts("38 Jeune 6-24.99") == []
    assert amounts("1352 incl. 8.10% TVA/MOB BAR") == []
    assert amounts("0220.09/43") == []
    assert amounts("Tél +41 21 925 34 80") == []
    assert amounts("IBAN CH65 0900 0000 1802 5465 8") == []


def test_normalize():
    assert normalize("  Récépissé   Théâtre ") == "recepisse theatre"


# ---------------------------------------------------------------------------
# Audit : recollage « 2. » + « 80 »
# ---------------------------------------------------------------------------


def test_recollage_des_decimales_seulement_de_gauche_a_droite():
    from decompte.models import Word
    from decompte.ocr import _normalize_textlayer_numbers

    def w(text, x0, x1, y0=100.0, h=10.0):
        return Word(x0=x0, y0=y0, x1=x1, y1=y0 + h, text=text, conf=90)

    # cas normal : « 2. » puis « 80 » un peu plus à droite → « 2.80 »
    out = _normalize_textlayer_numbers([w("2.", 10, 20), w("80", 24, 34)])
    assert [x.text for x in out] == ["2.80"]
    assert out[0].x0 < out[0].x1

    # lecture de droite à gauche : recoller donnerait un mot dont x1 < x0, qui fausse la
    # découpe en colonnes — les deux mots restent séparés
    out2 = _normalize_textlayer_numbers([w("2.", 40, 50), w("80", 10, 20)])
    assert [x.text for x in out2] == ["2.", "80"]
