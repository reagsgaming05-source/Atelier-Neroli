"""Utilitaires texte partagés : normalisation et reconnaissance des montants."""
from __future__ import annotations

import re
import unicodedata

# 73.00 · 1'155.00 · 1 155,00 · 15.- · 0,00  — mais ni dates (10.03.2025), ni heures (09:12),
# ni pourcentages (8.10%), ni « 6-24.99 », ni codes « 0220.09/43 ».
AMOUNT_RE = re.compile(
    r"(?<![\d.,:\-/])(\d{1,3}(?:['’ ]\d{3})+|\d+)(?:[.,](\d{2})|[.,]-)(?![\d.,/]?\d)(?!\s*%)"
)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text).strip().lower()


def parse_amount(s: str) -> float:
    s = s.strip().replace("'", "").replace("’", "").replace(" ", "")
    s = re.sub(r"[.,]-$", ".00", s)
    s = s.replace(",", ".")
    return round(float(s), 2)


def has_amount(text: str) -> bool:
    return AMOUNT_RE.search(text) is not None
