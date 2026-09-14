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
