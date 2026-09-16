from decompte.forms import parse_date_any


def test_numeric_dates_two_and_four_digit_years():
    # « 31.10.25 » comme sur les formulaires, mais aussi « 12.06.2026 » écrit en entier
    assert parse_date_any("du 31.10.25 au 31.10.25", None) == "31.10.2025"
    assert parse_date_any("du 12.06.2026 au 12.06.2026", None) == "12.06.2026"
    assert parse_date_any("le 5/3/2026", None) == "05.03.2026"


def test_textual_dates_use_default_year():
    assert parse_date_any("du 10 mars au 14 mars", 2026) == "10.03.2026"
    assert parse_date_any("1er juin 2025", None) == "01.06.2025"
