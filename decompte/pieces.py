"""Analyse d'un bloc de texte : type de pièce, fournisseur, date, devise, tarifs, total."""
from __future__ import annotations

import itertools
import re
from dataclasses import dataclass
from typing import Optional

from .models import Block, Currency, FareLine, Piece
from .textutils import AMOUNT_RE, normalize, parse_amount

# ---------------------------------------------------------------------------
# Montants
# ---------------------------------------------------------------------------

CURRENCY_BEFORE_RE = re.compile(r"(CHF|SFr|Fr|frs?|EUR|€)[.:\-]?\s*$", re.I)
CURRENCY_AFTER_RE = re.compile(r"^\s*(CHF|SFr|Fr|frs?|EUR|€)", re.I)
DATE_RE = re.compile(r"\b(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})\b")
RATE_RE = re.compile(
    r"(?:taux(?: de change)?|kurs|wechselkurs|rate|cours|eur\s*/\s*chf|1\s*(?:eur|€)\s*=)\D{0,12}(\d[.,]\d{3,6})",
    re.I,
)


@dataclass
class Amount:
    value: float
    currency: Optional[Currency]
    line_index: int
    text: str


def _currency_of(token: str) -> Optional[Currency]:
    t = token.lower().rstrip(".")
    if t in ("chf", "sfr", "fr", "frs"):
        return "CHF"
    if t in ("eur", "€"):
        return "EUR"
    return None


def find_amounts(lines: list[str]) -> list[Amount]:
    out: list[Amount] = []
    for i, line in enumerate(lines):
        for m in AMOUNT_RE.finditer(line):
            cur = None
            before = CURRENCY_BEFORE_RE.search(line[: m.start()])
            after = CURRENCY_AFTER_RE.search(line[m.end():])
            if before:
                cur = _currency_of(before.group(1))
            elif after:
                cur = _currency_of(after.group(1))
            try:
                out.append(Amount(parse_amount(m.group(0)), cur, i, line))
            except ValueError:
                continue
    return out


# ---------------------------------------------------------------------------
# Type de pièce
# ---------------------------------------------------------------------------

KIND_KEYWORDS: dict[str, list[str]] = {
    "billet": [
        "mobilis", "billet", "ticket", "fahrkarte", "tageskarte", "carte journaliere", "cff", "sbb", "ffs",
        "zones", "2. cl", "1. cl", "prix entier", "demi-tarif", "halbtax", "jeune 6-24", "aller", "retour",
        "einfach", "gruppen", "groupe", "entree", "eintritt", "admission", "tarif", "adulte", "enfant",
        "enseignant", "accompagnat", "mob ", "goldenpass", "golden pass", "montreux oberland", "voyage de groupe",
    ],
    "facture": [
        "facture", "rechnung", "invoice", "fattura", "debiteur", "payable jusqu", "echeance", "fallig",
        "conditions de paiement", "total ttc", "montant ttc", "total net", "total facture", "no facture",
        "n° facture", "facture n", "nous vous prions d'effectuer", "avec nos remerciements",
    ],
    "recepisse": [
        "recepisse", "empfangsschein", "ricevuta", "section paiement", "zahlteil", "point de depot",
        "annahmestelle", "bulletin de versement", "einzahlungsschein", "payable par", "zahlbar durch",
        "compte / payable a", "konto / zahlbar an", "compte/payable a",
    ],
    "recu_carte": [
        "quittance", "kartenzahlung", "maestro", "mastercard", "visa", "twint", "postfinance card", "debit",
        "code d'autorisation", "aid:", "terminal", "no de trans", "trx", "emv", "contactless", "sans contact",
        "kaufbetrag", "montant achat", "purchase", "total eft", "signature du titulaire", "copie client",
        "kundenbeleg", "carte de credit", "carte de debit", "payment receipt", "recu de paiement",
        "recu carte", "carte bancaire", "worldline", "six payment", "sumup",
    ],
    "taux_change": ["taux de change", "exchange rate", "wechselkurs", "kurs", "cours du", "1 eur", "eur/chf", "eur ="],
}

RUBRIQUE_KEYWORDS: dict[str, list[str]] = {
    "Transport": [
        "mobilis", "cff", "sbb", "ffs", "train", "bus", "car ", "autocar", "tl ", "tpg", "mob ", "cgn", "bateau",
        "telecabine", "funiculaire", "remontees", "telepherique", "telesiege", "parking", "essence", "carburant",
        "billet de groupe", "zones", "postauto", "carpostal", "vmcv", "transports", "chemin de fer",
        "tageskarte", "fahrkarte", "gruppenbillett", "bls", "rhb", "navette", "peage", "vignette", "aller",
    ],
    "Activité": [
        "musee", "museum", "theatre", "spectacle", "entree", "eintritt", "visite", "guidee", "atelier", "cinema",
        "zoo", "piscine", "patinoire", "ski", "forfait", "bowling", "laser", "escape", "accrobranche", "alimentarium",
        "chaplin", "papiliorama", "aquatis", "technorama", "swissminiatur", "verkehrshaus", "aquarium", "parc",
        "billetterie", "fondation", "exposition", "concert", "opera", "opéra", "stade", "match", "location",
        "animation", "moniteur", "guide", "cours", "initiation", "grottes", "mines", "chateau", "abbaye",
    ],
    "Nourriture": [
        "restaurant", "migros", "coop", "denner", "aldi", "lidl", "boulangerie", "pique-nique", "repas", "menu",
        "cafe", "pizza", "kebab", "mcdonald", "burger", "boisson", "snack", "kiosque", "epicerie", "alimentation",
        "landi", "volg", "prix garantie", "buvette", "cantine", "traiteur", "brasserie", "auberge", "pain",
        "sandwich", "glace", "eau", "jus", "nourriture", "food", "lebensmittel", "manor food", "aligro",
    ],
    "Hébergement": [
        "hotel", "hostel", "nuitee", "nuit", "chalet", "colonie", "centre de vacances", "gite", "logement",
        "taxe de sejour", "camping", "cabane", "dortoir", "hebergement", "unterkunft", "jugendherberge",
        "pension", "sejour", "auberge de jeunesse", "nuitees",
    ],
}

VENDOR_SKIP = re.compile(
    r"^(billet|ticket|valable|zones?|facture|factu|rechnung|invoice|date|datum|no|n°|tel|www|http|page|seite|"
    r"recepisse|récépissé|quittance|copie|debiteur|débiteur|client|kunde|annee|année|numero|numéro|monsieur|madame|"
    r"concerne|carte|karte)\b",
    re.I,
)


def classify_kind(text_norm: str) -> tuple[str, dict[str, int]]:
    sc = {k: sum(1 for kw in kws if kw in text_norm) for k, kws in KIND_KEYWORDS.items()}
    if sc["facture"] >= 2:
        return "facture", sc
    if sc["billet"] >= 2 and sc["recu_carte"] < 2:
        return "billet", sc
    if sc["recu_carte"] >= 3:
        return "recu_carte", sc
    if sc["billet"] >= 1 and sc["recu_carte"] < 2 and sc["recepisse"] < 3:
        return "billet", sc
    if sc["recepisse"] >= 2 and sc["facture"] == 0 and sc["billet"] == 0:
        return "recepisse", sc
    if sc["recu_carte"] >= 2:
        return "recu_carte", sc
    if sc["facture"] >= 1:
        return "facture", sc
    if sc["recepisse"] >= 2:
        return "recepisse", sc
    if sc["taux_change"] >= 1:
        return "taux_change", sc
    return "autre", sc


def guess_rubrique(text_norm: str, kind: str) -> str:
    best, best_score = "Autre", 0
    for rub, kws in RUBRIQUE_KEYWORDS.items():
        score = sum(1 for kw in kws if kw in text_norm)
        if score > best_score:
            best, best_score = rub, score
    if best == "Autre" and kind == "billet":
        return "Transport"
    return best


# ---------------------------------------------------------------------------
# Lignes tarifaires
# ---------------------------------------------------------------------------

FARE_CATEGORIES: list[tuple[str, re.Pattern]] = [
    ("invite", re.compile(r"invit|inv[il1]t|gratuit|offert|\bfree\b|\bfrei\b|kostenlos|mediation", re.I)),
    ("enfant", re.compile(r"jeune|enfant|\bkind|ecole|ecoles|eleve|etudiant|student|junior|scolaire|schuler|\b6-(?:24|16|15)|\bado\b", re.I)),
    ("demi", re.compile(r"demi|1/2|½|halbtax|\bhalb|reduit|ermassigt|ermaessigt|\bred\.|\babo\b|\bag\b", re.I)),
    ("plein", re.compile(r"prix entier|plein tarif|tarif entier|adulte|adult|erwachsen|\bentier\b|\bnormal\b|\bstandard\b|\bplein\b", re.I)),
]

# « enseignant », « accompagnateur », « maître » : tarifs adultes des billets de groupe (MOB, CFF,
# TL…). Ces mots sont trop courants pour être reconnus n'importe où : une facture adressée « à
# l'attention de l'enseignant responsable » n'est pas une ligne tarifaire.
STAFF_RE = re.compile(r"accompagnat|acc\.|enseignant|maitre|maitresse|professeur|\bprof\b|lehrer|lehrperson|begleit", re.I)
STAFF_LABEL_MAX = 40

TOTAL_COUNT_RE = re.compile(r"^\s*(\d{1,3})\s+(total|tot\.?)\s*$", re.I)
QTY_PREFIX_RE = re.compile(r"^\s*(\d{1,3})\s*[xX×]?\s+(?=[A-Za-zÀ-ÿ])")
QTY_MIDDLE_RE = re.compile(r"(?:^|\s)(\d{1,3})\s*[xX×]\s*(?=\d)")
QTY_AFTER_LABEL_RE = re.compile(r"[A-Za-zÀ-ÿ)]\s+(\d{1,3})\s+(?=\d)")


def fare_label(line: str) -> str:
    """Intitulé d'une ligne tarifaire : la ligne sans les montants, la devise ni la quantité."""
    label = AMOUNT_RE.sub(" ", line)
    label = re.sub(r"\b(CHF|SFr|Fr|frs?|EUR)\b[.:]?|€", " ", label, flags=re.I)
    label = re.sub(r"^\s*\d{1,3}\s*[xX×]?\s+", "", label)
    return re.sub(r"\s+", " ", label).strip(" -:|")


def _staff_fare_line(line: str, piece_total: Optional[float]) -> bool:
    """« 2 Enseignants CHF 8.40 » est une ligne tarifaire ; « À l'attention de l'enseignant
    responsable CHF 250.00 » est une phrase de facture.

    La longueur de l'intitulé ne sépare pas les deux : « 3 Accompagnants / Begleitpersonen »
    est long et « Facture enseignant responsable » est court. On regarde donc la structure :
    une quantité écrite sur la ligne, ou bien un montant qui n'est pas le total de la pièce
    (c'est-à-dire un prix unitaire, et non la somme à payer)."""
    if QTY_PREFIX_RE.match(line) or QTY_MIDDLE_RE.search(line) or QTY_AFTER_LABEL_RE.search(line):
        return True
    label = fare_label(line)
    if len(label) > STAFF_LABEL_MAX:
        return False
    # Intitulé qui n'est (presque) que le mot de fonction — « Enseignant », « Enseignants »,
    # « Begleitperson » : ligne tarifaire, même seule et même pour le montant total de la pièce
    # (billet d'un seul adulte). « Facture enseignant responsable », lui, garde des mots autour.
    if len(re.sub(r"[^a-z]", "", STAFF_RE.sub(" ", normalize(label)))) <= 4:
        return True
    if piece_total is None:
        return True
    return all(abs(a.value - piece_total) > 0.011 for a in find_amounts([line]))


def fare_category(label: str, piece_total: Optional[float] = None) -> str:
    n = normalize(label)
    for cat, rx in FARE_CATEGORIES:
        if rx.search(n):
            return cat
    if STAFF_RE.search(n) and _staff_fare_line(label, piece_total):
        return "plein"
    return "autre"


def parse_fare_line(line: str, default_currency: Currency, piece_total: Optional[float]) -> Optional[FareLine]:
    parsed = parse_fare_line_ex(line, default_currency, piece_total)
    return parsed[0] if parsed else None


def parse_fare_line_ex(
    line: str, default_currency: Currency, piece_total: Optional[float]
) -> Optional[tuple[FareLine, list[float]]]:
    """Reconnaît « 3 Prix entier CHF 2.80 », « ECOLES 15,-groupe 38 15,00 570,00 », « Erwachsene 2 x 12.40 »…"""
    cat = fare_category(line, piece_total)
    if cat == "autre":
        return None
    amounts = find_amounts([line])
    if not amounts:
        return None
    qty: Optional[int] = None
    uncertain = False
    m = QTY_PREFIX_RE.match(line) or QTY_MIDDLE_RE.search(line) or QTY_AFTER_LABEL_RE.search(line)
    if m:
        qty = int(m.group(1))
    if qty is None:
        qty, uncertain = 1, True
    values = [a.value for a in amounts]
    currency = next((a.currency for a in amounts if a.currency), None) or default_currency
    unit: Optional[float] = None
    # deux montants dont l'un = qté × l'autre → (unitaire, total de ligne)
    for i, u in enumerate(values):
        for j, t in enumerate(values):
            if i != j and abs(u * qty - t) < 0.011:
                unit = u
                break
        if unit is not None:
            break
    if unit is None:
        if len(values) >= 2 and qty > 1 and abs(values[-1] / qty - values[-2]) < 0.011:
            unit = values[-2]
        elif len(values) == 1:
            v = values[0]
            unit = v if piece_total is None or v * qty <= piece_total + 0.011 else round(v / qty, 2)
        else:
            unit = values[0]
    label = fare_label(line)
    fare = FareLine(label=label or cat, category=cat, qty=qty, unit_price=unit, currency=currency, source_line=line)
    if uncertain:
        fare.label += " (quantité illisible)"
    return fare, values


def parse_fares(lines: list[str], currency: Currency, total: Optional[float]) -> tuple[list[FareLine], list[str]]:
    """Toutes les lignes tarifaires d'une pièce, avec choix de l'interprétation la plus cohérente.

    Une ligne « 3 Prix entier CHF 2.80 » peut donner un prix unitaire (2.80) ou un total de
    ligne (2.80 pour 3 personnes). On retient l'interprétation dont la somme retombe sur le
    total de la pièce, sinon le prix unitaire (usage des billets suisses)."""
    notes: list[str] = []
    parsed: list[tuple[FareLine, list[float]]] = []
    for l in lines:
        if TOTAL_COUNT_RE.match(l):
            continue
        p = parse_fare_line_ex(l, currency, total)
        if p:
            parsed.append(p)
    fares = [f for f, _ in parsed]
    if not fares:
        return fares, notes
    if total is not None:
        def total_of(fs: list[FareLine]) -> float:
            return round(sum(f.amount for f in fs), 2)

        if abs(total_of(fares) - total) > 0.011:
            alt: list[FareLine] = []
            for f, values in parsed:
                g = f.model_copy()
                if len(values) == 1 and f.qty > 1:
                    g.unit_price = round(values[0] / f.qty, 2)
                alt.append(g)
            if abs(total_of(alt) - total) <= 0.011:
                fares = alt
        note = solve_adult_quantities(fares, total, _total_count(lines))
        if note:
            notes.append(note)
    notes += _reconcile_count(fares, lines)
    if total is not None and abs(sum(f.amount for f in fares) - total) > 0.011 and any(f.category in ("plein", "demi") for f in fares):
        notes.append(f"Somme des lignes tarifaires ({sum(f.amount for f in fares):.2f}) ≠ total lu ({total:.2f}) : à vérifier")
    return fares, notes


def _total_count(lines: list[str]) -> Optional[int]:
    total_count = None
    for l in lines:
        m = TOTAL_COUNT_RE.match(l)
        if m:
            total_count = int(m.group(1))
    return total_count


def solve_adult_quantities(fares: list[FareLine], total: Optional[float], total_count: Optional[int]) -> Optional[str]:
    """Corrige les quantités des lignes adultes mal lues grâce aux deux contraintes du billet :
    nombre de personnes (« 43 Total ») et montant total. Ex. « Ks Prix entier 4.20 » + « 4 demi-tarif 2.10 »
    + 39 jeunes 2.10 = 96.60 pour 43 personnes ⇒ 3 plein tarifs + 1 demi-tarif."""
    adults = [f for f in fares if f.category in ("plein", "demi")]
    others = [f for f in fares if f.category not in ("plein", "demi")]
    if not adults or len(adults) > 3 or total is None or any(f.unit_price <= 0 for f in adults):
        return None
    if abs(sum(f.amount for f in fares) - total) <= 0.011 and not any("illisible" in f.label for f in adults):
        return None
    rest_amount = round(total - sum(f.amount for f in others), 2)
    rest_count = (total_count - sum(f.qty for f in others)) if total_count is not None else None
    if rest_amount < -0.011 or (rest_count is not None and rest_count < 0):
        return None
    max_q = rest_count if rest_count is not None else int(rest_amount / min(f.unit_price for f in adults) + 1)
    max_q = max(0, min(max_q, 60))
    solutions = []
    for combo in itertools.product(range(max_q + 1), repeat=len(adults)):
        if rest_count is not None and sum(combo) != rest_count:
            continue
        if abs(sum(q * f.unit_price for q, f in zip(combo, adults)) - rest_amount) > 0.011:
            continue
        solutions.append(combo)
    if not solutions:
        return None

    def cost(c: tuple[int, ...]) -> int:
        return sum(abs(q - f.qty) for q, f in zip(c, adults) if "illisible" not in f.label)

    best = min(solutions, key=cost)
    if sum(1 for c in solutions if cost(c) == cost(best)) > 1:
        return None
    changes, confirmed = [], []
    for q, f in zip(best, adults):
        label = f.label.replace(" (quantité illisible)", "")
        if q != f.qty:
            changes.append(f"« {label} » : {f.qty} → {q}")
        elif "illisible" in f.label:
            confirmed.append(f"« {label} » = {q}")
        f.qty = q
        f.label = label
    if not changes and not confirmed:
        return None
    basis = f"{total_count} personnes et " if total_count is not None else ""
    parts = []
    if changes:
        parts.append("corrigées : " + ", ".join(changes))
    if confirmed:
        parts.append("quantité illisible déduite : " + ", ".join(confirmed))
    return f"Quantités adultes d'après le billet ({basis}total {total:.2f}) — " + " ; ".join(parts)


def _reconcile_count(fares: list[FareLine], lines: list[str]) -> list[str]:
    """Si une ligne « 41 Total » donne le nombre de personnes, on corrige une quantité illisible."""
    notes: list[str] = []
    total_count = None
    for l in lines:
        m = TOTAL_COUNT_RE.match(l)
        if m:
            total_count = int(m.group(1))
    if total_count is None:
        return notes
    uncertain = [f for f in fares if "illisible" in f.label]
    known = sum(f.qty for f in fares if "illisible" not in f.label)
    if len(uncertain) == 1 and total_count - known >= 1:
        f = uncertain[0]
        f.qty = total_count - known
        f.label = f.label.replace(" (quantité illisible)", "")
        notes.append(f"Quantité de « {f.label} » déduite du total de personnes ({total_count}) : {f.qty}")
    return notes


# ---------------------------------------------------------------------------
# Analyse d'un bloc
# ---------------------------------------------------------------------------

TOTAL_LINE_RE = re.compile(r"total|a payer|à payer|zu zahlen|gesamt|somme|montant du|net", re.I)
AMOUNT_LINE_RE = re.compile(r"montant|betrag|summe|prix|preis", re.I)


def find_vendor(lines: list[str]) -> str:
    for l in lines[:8]:
        t = l.strip(" .:-|=_")
        letters = re.sub(r"[^A-Za-zÀ-ÿ]", "", t)
        if len(letters) < 3 or len(letters) < 0.5 * len(t.replace(" ", "")):
            continue
        if VENDOR_SKIP.match(t) or re.search(r":\s*\d", t):
            continue
        return t[:60]
    return ""


def find_date(text: str) -> Optional[str]:
    m = DATE_RE.search(text)
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
    if not (1 <= d <= 31 and 1 <= mo <= 12):
        return None
    if len(y) == 2:
        y = "20" + y
    return f"{d:02d}.{mo:02d}.{y}"


def pick_total(amounts: list[Amount], lines: list[str], currency: Currency) -> Optional[float]:
    """Total de la pièce : ligne « Total » d'abord, puis « Montant », puis montant avec devise
    hors lignes tarifaires, puis maximum."""
    same = [a for a in amounts if a.currency in (None, currency)]
    if not same:
        return None

    def is_fare(a: Amount) -> bool:
        return fare_category(lines[a.line_index]) != "autre"

    tiers = [
        [a for a in same if TOTAL_LINE_RE.search(lines[a.line_index]) and not TOTAL_COUNT_RE.match(lines[a.line_index]) and not is_fare(a)],
        [a for a in same if AMOUNT_LINE_RE.search(lines[a.line_index]) and not is_fare(a)],
        [a for a in same if a.currency == currency and not is_fare(a)],
        [a for a in same if not is_fare(a)],
        same,
    ]
    for tier in tiers:
        if tier:
            return max(a.value for a in tier)
    return None


def analyse_block(block: Block, piece_id: int) -> Piece:
    lines = [l.text for l in block.lines]
    text = "\n".join(lines)
    norm = normalize(text)
    kind, _scores = classify_kind(norm)
    amounts = find_amounts(lines)
    has_eur = any(a.currency == "EUR" for a in amounts) or bool(re.search(r"\b(eur|euro)\b|€", norm))
    has_chf = any(a.currency == "CHF" for a in amounts)
    currency: Currency = "EUR" if has_eur and not has_chf else "CHF"
    if has_eur and has_chf:
        # devise du total = celle de la ligne « total » si elle existe, sinon EUR (pièce étrangère)
        tot_lines = [a for a in amounts if a.currency and TOTAL_LINE_RE.search(lines[a.line_index])]
        currency = tot_lines[-1].currency if tot_lines else "EUR"
    total = pick_total(amounts, lines, currency) if amounts else None
    fares, notes = parse_fares(lines, currency, total)
    total_chf = None
    rate = None
    if currency == "EUR":
        chf = [a for a in amounts if a.currency == "CHF"]
        if chf:
            total_chf = max(a.value for a in chf)
        m = RATE_RE.search(text)
        if m:
            try:
                rate = float(m.group(1).replace(",", "."))
            except ValueError:
                rate = None
        if total_chf is None and rate is None:
            notes.append("Pièce en EUR : montant CHF ou taux de change à préciser")
    if kind == "taux_change" and not amounts:
        kind = "autre"
    piece = Piece(
        id=piece_id,
        numero=str(piece_id),
        page=block.page,
        bbox=block.bbox,
        kind=kind,  # type: ignore[arg-type]
        vendor=find_vendor(lines),
        date=find_date(text),
        currency=currency if amounts else None,
        total=total,
        total_chf=total_chf,
        rate=rate,
        fares=fares,
        rubrique=guess_rubrique(norm, kind),
        notes=notes,
        text=text,
    )
    return piece
