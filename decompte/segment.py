"""Découpage d'une page en lignes de texte puis en blocs (pièces candidates).

Plusieurs tickets sont souvent collés sur une même feuille A4 (grille 2×2, rangée de 3…).
Algorithme :
1. Découpage XY récursif sur les mots : on coupe aux bandes vides verticales
   (colonnes) puis horizontales, ce qui isole chaque ticket — mais coupe aussi
   parfois un ticket en deux (grand blanc entre les tarifs et le total).
2. Fusion : une région qui ne commence pas par un en-tête de pièce (mot-clé connu
   ou en-tête répété sur la page, ex. « Mobilis » ×4) est rattachée à la région
   située juste au-dessus dans la même colonne.
3. Les régions sans aucun montant (adresse, numéro manuscrit…) sont rattachées
   à leur voisine.
"""
from __future__ import annotations

import re
import statistics

from .models import BBox, Block, Line, PageData, Word
from .textutils import AMOUNT_RE, normalize

# En-têtes typiques de début de pièce (normalisés : minuscules, sans accents)
HEADER_KEYWORDS = [
    "mobilis", "cff", "sbb", "ffs", "mob ", "tpg", "tl ", "vmcv", "cgn", "postauto", "carpostal",
    "billet", "ticket", "fahrkarte", "tageskarte", "carte journaliere", "carte journaliere",
    "facture", "rechnung", "invoice", "fattura", "quittance", "recu", "receipt", "kassenbon",
    "recepisse", "empfangsschein", "section paiement", "zahlteil", "bulletin de versement",
    "coop", "migros", "denner", "aldi", "lidl", "landi", "volg", "manor",
]
RECEIPT_SPLIT_KEYWORDS = ["recepisse", "empfangsschein", "section paiement", "zahlteil", "ricevuta"]

MIN_COLUMN_WIDTH_RATIO = 0.22  # une colonne doit faire ≥ 22 % de la largeur de la région
MAX_VERTICAL_MERGE_FACTOR = 24.0  # blanc maximal (en hauteurs de mot) pour rattacher un bas de pièce


# ---------------------------------------------------------------------------
# Lignes
# ---------------------------------------------------------------------------


def median_height(words: list[Word]) -> float:
    hs = [w.h for w in words if w.h > 0]
    if not hs:
        return 20.0
    return float(statistics.median(hs))


def _overlap_x(a: Word, b: Word) -> float:
    inter = min(a.x1, b.x1) - max(a.x0, b.x0)
    if inter <= 0:
        return 0.0
    return inter / max(1.0, min(a.x1 - a.x0, b.x1 - b.x0))


def build_lines(words: list[Word], y_tol: float | None = None) -> list[Line]:
    """Regroupe les mots dont les centres verticaux sont proches, triés de gauche à droite."""
    if not words:
        return []
    h = median_height(words)
    tol = y_tol if y_tol is not None else 0.55 * h
    lines: list[list[Word]] = []
    for w in sorted(words, key=lambda w: (w.cy, w.x0)):
        placed = False
        for line in lines:
            ref = statistics.mean(x.cy for x in line)
            if abs(w.cy - ref) <= tol and not any(_overlap_x(w, x) > 0.5 for x in line):
                line.append(w)
                placed = True
                break
        if not placed:
            lines.append([w])
    out: list[Line] = []
    for line in lines:
        line.sort(key=lambda w: w.x0)
        out.append(
            Line(
                words=line,
                text=" ".join(w.text for w in line),
                x0=min(w.x0 for w in line),
                y0=min(w.y0 for w in line),
                x1=max(w.x1 for w in line),
                y1=max(w.y1 for w in line),
            )
        )
    out.sort(key=lambda l: (l.y0, l.x0))
    return out


# ---------------------------------------------------------------------------
# Découpage XY
# ---------------------------------------------------------------------------


def _full_extent_gaps(intervals: list[tuple[float, float]], min_gap: float) -> list[tuple[float, float]]:
    """Intervalles vides entre des segments 1-D (union), de largeur ≥ min_gap."""
    if not intervals:
        return []
    ivs = sorted(intervals)
    merged = [list(ivs[0])]
    for a, b in ivs[1:]:
        if a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    return [(a1, b0) for (a0, a1), (b0, b1) in zip(merged, merged[1:]) if b0 - a1 >= min_gap]


def _split_at(words: list[Word], gaps: list[tuple[float, float]], axis: int) -> list[list[Word]]:
    cuts = sorted((g[0] + g[1]) / 2 for g in gaps)
    parts: list[list[Word]] = [[] for _ in range(len(cuts) + 1)]
    for w in words:
        c = w.cx if axis == 0 else w.cy
        parts[sum(1 for cut in cuts if c > cut)].append(w)
    return [p for p in parts if p]


def _bbox_words(words: list[Word]) -> BBox:
    return (min(w.x0 for w in words), min(w.y0 for w in words), max(w.x1 for w in words), max(w.y1 for w in words))


def xy_cut(words: list[Word], h: float) -> list[list[Word]]:
    if len(words) < 2:
        return [words]
    x0, y0, x1, y1 = _bbox_words(words)
    width = max(1.0, x1 - x0)
    xgaps = _full_extent_gaps([(w.x0, w.x1) for w in words], 3.0 * h)
    if xgaps:
        parts = _split_at(words, xgaps, axis=0)
        # on refuse de séparer une simple colonne de prix : chaque colonne doit être large
        if all((_bbox_words(p)[2] - _bbox_words(p)[0]) >= MIN_COLUMN_WIDTH_RATIO * width for p in parts):
            return [r for p in parts for r in xy_cut(p, h)]
    ygaps = _full_extent_gaps([(w.y0, w.y1) for w in words], 2.5 * h)
    if ygaps:
        return [r for p in _split_at(words, ygaps, axis=1) for r in xy_cut(p, h)]
    return [words]


# ---------------------------------------------------------------------------
# Fusion des régions en pièces
# ---------------------------------------------------------------------------


def _is_header_line(text: str, repeated: set[str]) -> bool:
    n = normalize(text)
    if not n:
        return False
    # Même normalisation que _repeated_first_lines et _is_ticket_header : le numéro manuscrit au
    # bout de la ligne (« Auberge du Lac 3 ») doit être retiré avant la comparaison. Sans cela les
    # quatre reçus étaient bien comptés comme quatre en-têtes, puis fondus en une seule pièce.
    if re.sub(r"\s*\d+$", "", n) in repeated:
        return True
    n_pad = n + " "
    if any(n_pad.startswith(k) for k in HEADER_KEYWORDS):
        return True
    return any(k in n_pad for k in RECEIPT_SPLIT_KEYWORDS)


def _repeated_first_lines(firsts: list[str]) -> set[str]:
    """Premières lignes répétées sur la page (ex. « Mobilis » ×4) = en-têtes de pièces.

    Un pied de billet répété (« 2. Cl. », « CHF 73.00 ») ne compte pas : il faut une
    ligne qui commence par une lettre, contient des lettres et aucun montant."""
    counts: dict[str, int] = {}
    for f in firsts:
        f = re.sub(r"\s*\d+$", "", normalize(f))  # « Mobilis 3 » (numéro manuscrit) → « mobilis »
        if len(f) >= 3 and f[0].isalpha() and len(re.sub(r"[^a-z]", "", f)) >= 3 and not AMOUNT_RE.search(f):
            counts[f] = counts.get(f, 0) + 1
    return {f for f, n in counts.items() if n >= 2}


def _x_overlap(a: BBox, b: BBox) -> float:
    inter = min(a[2], b[2]) - max(a[0], b[0])
    if inter <= 0:
        return 0.0
    return inter / max(1.0, min(a[2] - a[0], b[2] - b[0]))


def _v_overlap(a: BBox, b: BBox) -> float:
    inter = min(a[3], b[3]) - max(a[1], b[1])
    if inter <= 0:
        return 0.0
    return inter / max(1.0, min(a[3] - a[1], b[3] - b[1]))


class _Region:
    def __init__(self, page: int, lines: list[Line]):
        self.page = page
        self.lines = lines

    @property
    def bbox(self) -> BBox:
        return (
            min(l.x0 for l in self.lines), min(l.y0 for l in self.lines),
            max(l.x1 for l in self.lines), max(l.y1 for l in self.lines),
        )

    @property
    def first_text(self) -> str:
        return self.lines[0].text if self.lines else ""

    @property
    def has_amount(self) -> bool:
        return any(AMOUNT_RE.search(l.text) for l in self.lines)

    def absorb(self, other: "_Region") -> None:
        self.lines = sorted(self.lines + other.lines, key=lambda l: (l.y0, l.x0))


def _nearest_above(target: _Region, pool: list[_Region], h: float) -> _Region | None:
    tb = target.bbox
    best, best_gap = None, None
    for r in pool:
        rb = r.bbox
        if _x_overlap(rb, tb) < 0.5:
            continue
        gap = tb[1] - rb[3]
        if gap < -h or gap > MAX_VERTICAL_MERGE_FACTOR * h:
            continue
        if best_gap is None or gap < best_gap:
            best, best_gap = r, gap
    return best


def _nearest_neighbour(target: _Region, pool: list[_Region], h: float) -> _Region | None:
    tb = target.bbox
    best, best_d = None, None
    for r in pool:
        rb = r.bbox
        if _x_overlap(rb, tb) < 0.3 and _v_overlap(rb, tb) < 0.3:
            continue
        d = max(0.0, tb[1] - rb[3], rb[1] - tb[3]) + max(0.0, tb[0] - rb[2], rb[0] - tb[2])
        if d > MAX_VERTICAL_MERGE_FACTOR * h:
            continue
        if best_d is None or d < best_d:
            best, best_d = r, d
    return best


def _reading_order(regions: list[_Region]) -> list[_Region]:
    """Ordre de lecture : bandes horizontales de haut en bas, de gauche à droite dans une bande."""
    remaining = sorted(regions, key=lambda r: (r.bbox[1], r.bbox[0]))
    ordered: list[_Region] = []
    while remaining:
        head = remaining[0]
        band = [r for r in remaining if _v_overlap(r.bbox, head.bbox) > 0.3]
        band.sort(key=lambda r: r.bbox[0])
        ordered.extend(band)
        remaining = [r for r in remaining if r not in band]
    return ordered


TICKET_HEADER_KEYWORDS = [
    "mobilis", "cff", "sbb", "ffs", "mob ", "tpg", "tl ", "vmcv", "cgn", "postauto", "carpostal",
    "billet", "ticket", "fahrkarte", "tageskarte", "carte journaliere", "quittance", "recu", "receipt",
    "kassenbon", "coop", "migros", "denner", "aldi", "lidl", "landi", "volg", "manor",
]


def _is_ticket_header(text: str, repeated: set[str]) -> bool:
    n = normalize(text)
    if not n:
        return False
    if re.sub(r"\s*\d+$", "", n) in repeated:
        return True
    n_pad = n + " "
    return any(n_pad.startswith(k) for k in TICKET_HEADER_KEYWORDS)


def _is_receipt_start(text: str) -> bool:
    n = normalize(text) + " "
    return any(k in n for k in RECEIPT_SPLIT_KEYWORDS)


def _merge_regions(regions: list[_Region], repeated: set[str], h: float) -> list[_Region]:
    """Page de billets collés : chaque en-tête ouvre une pièce, le reste est rattaché au-dessus."""
    blocks: list[_Region] = []
    for r in regions:
        if not _is_header_line(r.first_text, repeated):
            above = _nearest_above(r, blocks, h)
            if above is not None:
                above.absorb(r)
                continue
        blocks.append(r)
    with_amount = [b for b in blocks if b.has_amount]
    if with_amount:
        for b in [b for b in blocks if not b.has_amount]:
            target = _nearest_neighbour(b, with_amount, h)
            if target is not None:
                target.absorb(b)
                blocks.remove(b)
            elif sum(len(l.words) for l in b.lines) < 3:
                blocks.remove(b)
    return blocks


def _single_document(page: int, regions: list[_Region]) -> list[_Region]:
    """Page d'une seule pièce (facture, lettre…) : un bloc, plus le récépissé QR séparé s'il y en a un."""
    if not regions:
        return []
    y_min = min(r.bbox[1] for r in regions)
    y_max = max(r.bbox[3] for r in regions)
    split_at = None
    for i, r in enumerate(regions):
        if _is_receipt_start(r.first_text) and r.bbox[1] > y_min + 0.4 * (y_max - y_min):
            split_at = i
            break
    if split_at is None or split_at == 0:
        return [_Region(page, sorted([l for r in regions for l in r.lines], key=lambda l: (l.y0, l.x0)))]
    head = _Region(page, sorted([l for r in regions[:split_at] for l in r.lines], key=lambda l: (l.y0, l.x0)))
    tail = _Region(page, sorted([l for r in regions[split_at:] for l in r.lines], key=lambda l: (l.y0, l.x0)))
    return [head, tail]


def _segment_column(page: int, words: list[Word], h: float, repeated: set[str]) -> list[_Region]:
    regions = [_Region(page, build_lines(ws)) for ws in xy_cut(words, h)]
    regions = _reading_order([r for r in regions if r.lines])
    n_headers = sum(1 for r in regions if _is_ticket_header(r.first_text, repeated))
    if n_headers <= 1:
        return _single_document(page, regions)
    return _merge_regions(regions, repeated, h)


def _top_columns(words: list[Word], h: float) -> list[list[Word]]:
    """Colonnes de premier niveau (bandes vides sur toute la hauteur) : pièces collées côte à côte."""
    x0, y0, x1, y1 = _bbox_words(words)
    width = max(1.0, x1 - x0)
    gaps = _full_extent_gaps([(w.x0, w.x1) for w in words], 3.0 * h)
    if not gaps:
        return [words]
    parts = _split_at(words, gaps, axis=0)
    if all((_bbox_words(p)[2] - _bbox_words(p)[0]) >= MIN_COLUMN_WIDTH_RATIO * width for p in parts):
        return parts
    return [words]


def segment_page(page: PageData) -> list[Block]:
    words = page.words
    if not words:
        return []
    h = median_height(words)
    # en-têtes répétés sur toute la page (ex. « Mobilis » ×4), calculés une fois
    all_regions = [_Region(page.number, build_lines(ws)) for ws in xy_cut(words, h)]
    repeated = _repeated_first_lines([r.first_text for r in all_regions if r.lines])
    blocks: list[_Region] = []
    for col in _top_columns(words, h):
        blocks.extend(_segment_column(page.number, col, h, repeated))
    blocks = _reading_order([b for b in blocks if b.lines])
    return [Block(page=page.number, bbox=b.bbox, lines=b.lines) for b in blocks]


def page_text(page: PageData) -> str:
    return "\n".join(l.text for l in build_lines(page.words))
