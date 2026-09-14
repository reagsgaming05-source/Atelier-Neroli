"""Lecture du « Formulaire de décompte camp & course pour les écoles de Blonay - St-Légier ».

Le formulaire (1 ou 2 pages) donne les effectifs, les noms et le tableau des dépenses
avec les numéros de pièces. Les champs dactylographiés sont lus ; les champs manuscrits
restent souvent vides et sont complétés dans l'interface.

Les petits nombres dans les cases (« 2 enseignants DGEO ») sont souvent sautés par l'OCR
global de la page : on relit alors la case, ciblée, à gauche de chaque étiquette.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

from PIL import Image

from .models import Effectifs, FormExpense, Line, PageData, Word
from .segment import build_lines, median_height
from .textutils import AMOUNT_RE, normalize, parse_amount

log = logging.getLogger(__name__)

try:
    import pytesseract
except ImportError:  # pragma: no cover
    pytesseract = None

FORM_MARKERS = [
    "formulaire de decompte", "nombre de participants", "dgeo", "noms des ens", "total des depenses",
    "total des recettes", "rembourser par la dgeo", "participation communale", "payees par la",
    "moniteurs j", "participante", "budget total accorde", "annexes necessaires", "signature ens",
]

MONTHS = {
    "janvier": 1, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6, "juillet": 7, "aout": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12,
}
DATE_NUM_RE = re.compile(r"(\d{1,2})[./,:](\d{1,2})[./,:](\d{2}|\d{4})")
DATE_TXT_RE = re.compile(
    r"(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?"
)
# début d'une autre étiquette sur la même ligne : la valeur s'arrête là
LABEL_STARTS = [
    "type d", "nom de l", "responsable", "dates", "budget", "classe", "noms des", "noms et fonction",
    "nombre de participants", "descripti", "n° piece", "no piece", "payees", "cout total", "depenses",
    "recettes", "dont", "signature", "lieu", "date :",
]

# étiquettes des effectifs : (champ, motif tolérant à l'OCR)
COUNT_LABELS = [
    ("eleves", r"^eleves\b|\beleves\b"),
    ("accompagnants", r"\baccompagnants\b(?! j)"),
    ("total_participants", r"total participants"),
    ("enseignants_dgeo", r"ens\w+ dgeo"),
    ("enseignants_js", r"ens\w+ (?:avec )?j.?[&e8]?.?s\b"),
    ("moniteurs_js", r"moniteurs? j"),
    ("autres", r"^autres$|\bautres\b(?! \(ex)"),
]


def is_form_page(page: PageData) -> bool:
    text = normalize(" ".join(w.text for w in page.words))
    return sum(1 for m in FORM_MARKERS if m in text) >= 3


# ---------------------------------------------------------------------------
# Recherche spatiale
# ---------------------------------------------------------------------------


class Hit:
    def __init__(self, page: PageData, line: Line, start: int, end: int):
        self.page, self.line, self.start, self.end = page, line, start, end  # mots [start, end)

    @property
    def label_words(self) -> list[Word]:
        return self.line.words[self.start : self.end]

    @property
    def x0(self) -> float:
        return self.label_words[0].x0

    @property
    def x1(self) -> float:
        return self.label_words[-1].x1

    @property
    def y0(self) -> float:
        return min(w.y0 for w in self.label_words)

    @property
    def y1(self) -> float:
        return max(w.y1 for w in self.label_words)

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2


class FormPages:
    """Lignes de toutes les pages du formulaire, avec accès aux mots et aux images."""

    def __init__(self, pages: list[PageData]):
        self.pages = pages
        self.lines: list[tuple[PageData, Line]] = []
        for p in pages:
            for l in build_lines(p.words):
                self.lines.append((p, l))
        words = [w for p in pages for w in p.words]
        self.h = median_height(words) if words else 20.0
        self._images: dict[int, Image.Image] = {}

    def image(self, page: PageData) -> Optional[Image.Image]:
        if page.number not in self._images:
            try:
                self._images[page.number] = Image.open(page.image).convert("L")
            except Exception:  # noqa: BLE001
                return None
        return self._images[page.number]

    def find(self, pattern: str) -> list[Hit]:
        rx = re.compile(pattern)
        hits: list[Hit] = []
        for page, line in self.lines:
            norm_words = [normalize(w.text) for w in line.words]
            joined = " ".join(norm_words)
            offsets, pos = [], 0
            for nw in norm_words:
                offsets.append((pos, pos + len(nw)))
                pos += len(nw) + 1
            for m in rx.finditer(joined):
                start = next((i for i, (a, b) in enumerate(offsets) if b > m.start()), None)
                end = next((i for i, (a, b) in enumerate(offsets) if a >= m.end()), len(offsets))
                if start is not None and end > start:
                    hits.append(Hit(page, line, start, end))
        return hits

    def _same_row(self, w: Word, hit: Hit) -> bool:
        """Même ligne visuelle : recouvrement vertical suffisant ou centres proches."""
        inter = min(w.y1, hit.y1) - max(w.y0, hit.y0)
        frac = inter / max(1.0, min(w.h, hit.y1 - hit.y0))
        return frac >= 0.4 or abs(w.cy - hit.cy) <= 0.6 * self.h

    def words_right_of(self, hit: Hit, max_gap_factor: float = 6.0) -> list[Word]:
        """Mots à droite de l'étiquette, sur la même ligne visuelle (toutes lignes confondues)."""
        cands: list[Word] = []
        for page, line in self.lines:
            if page is not hit.page:
                continue
            for w in line.words:
                if w.x0 >= hit.x1 - 2 and self._same_row(w, hit):
                    cands.append(w)
        cands.sort(key=lambda w: w.x0)
        out: list[Word] = []
        prev_x1 = hit.x1
        for i, w in enumerate(cands):
            t = w.text.strip()
            if t in (":", "-", "|", ";", "=", "[", "]", "_") and not out:
                prev_x1 = w.x1
                continue
            if w.x0 - prev_x1 > max_gap_factor * self.h and out:
                break
            rest = normalize(" ".join(x.text for x in cands[i:]))
            if any(rest.startswith(s) for s in LABEL_STARTS):
                break
            out.append(w)
            prev_x1 = w.x1
        return out

    def text_right_of(self, hit: Hit, max_gap_factor: float = 6.0) -> str:
        t = " ".join(w.text for w in self.words_right_of(hit, max_gap_factor))
        return re.sub(r"^[\[|(\s:;=_-]+|[\]|)\s:;=_-]+$", "", t).strip()

    def int_left_of(self, hit: Hit, max_gap_factor: float = 8.0) -> Optional[int]:
        cands = [
            w for page, line in self.lines if page is hit.page for w in line.words
            if w.x1 <= hit.x0 + 2 and self._same_row(w, hit)
        ]
        for w in sorted(cands, key=lambda w: -w.x1):
            if hit.x0 - w.x1 > max_gap_factor * self.h:
                break
            m = re.fullmatch(r"[\[(|]?(\d{1,3})[\])|]?", w.text)
            if m:
                return int(m.group(1))
            if re.search(r"[A-Za-zÀ-ÿ]{2,}", w.text):
                break
        return None

    def ocr_box_left_of(self, hit: Hit, width_factor: float = 4.0) -> Optional[int]:
        """Relit avec Tesseract la petite case située juste à gauche de l'étiquette (chiffres seuls)."""
        img = self.image(hit.page)
        if img is None or pytesseract is None:
            return None
        h = self.h
        x1 = int(hit.x0 - 0.2 * h)
        x0 = int(max(0, x1 - width_factor * h))
        y0 = int(max(0, hit.cy - 1.3 * h))
        y1 = int(min(img.height, hit.cy + 1.3 * h))
        if x1 - x0 < 8 or y1 - y0 < 8:
            return None
        crop = img.crop((x0, y0, x1, y1))
        crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
        try:
            txt = pytesseract.image_to_string(crop, config="--psm 7 -c tessedit_char_whitelist=0123456789")
        except Exception:  # noqa: BLE001
            return None
        m = re.search(r"\d{1,3}", txt)
        return int(m.group(0)) if m else None

    def int_near(self, hit: Hit, allow_ocr: bool = True) -> Optional[int]:
        v = self.int_left_of(hit)
        if v is not None:
            return v
        right = self.text_right_of(hit, max_gap_factor=3.0)
        m = re.match(r"(\d{1,3})$", right.strip())
        if m:
            return int(m.group(1))
        return self.ocr_box_left_of(hit) if allow_ocr else None


# ---------------------------------------------------------------------------
# Champs
# ---------------------------------------------------------------------------


def _split_names(v: str) -> list[str]:
    parts = re.split(r",|;| - | / |\bet\b", v)
    return [p.strip(" .:") for p in parts if len(re.sub(r"[^A-Za-zÀ-ÿ]", "", p)) >= 2]


def parse_date_any(text: str, default_year: Optional[int]) -> Optional[str]:
    n = normalize(text)
    m = DATE_NUM_RE.search(n)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
        if 1 <= d <= 31 and 1 <= mo <= 12:
            y = "20" + y if len(y) == 2 else y
            return f"{d:02d}.{mo:02d}.{y}"
    m = DATE_TXT_RE.search(n)
    if m:
        d, mo = int(m.group(1)), MONTHS[m.group(2)]
        y = m.group(3) or (str(default_year) if default_year else None)
        if y and 1 <= d <= 31:
            return f"{d:02d}.{mo:02d}.{y}"
    return None


def parse_form(pages: list[PageData]) -> dict:
    """Extrait les informations du formulaire. Retourne un dict de champs du Dossier."""
    result: dict = {
        "type_activite_texte": "", "activite": "", "classe": "", "enseignant": "", "telephone": "",
        "date_debut": None, "date_fin": None, "budget": None, "effectifs": Effectifs(),
        "noms_enseignants": [], "noms_accompagnants": [], "form_expenses": [], "form_total": None,
        "warnings": [],
    }
    if not pages:
        return result
    fp = FormPages(pages)
    full_text = "\n".join(l.text for _, l in fp.lines)

    def first_right(pattern: str, gap: float = 6.0) -> str:
        for hit in fp.find(pattern):
            v = fp.text_right_of(hit, gap)
            if v:
                return v
        return ""

    result["type_activite_texte"] = first_right(r"type d.?activite\s*:?")
    result["activite"] = first_right(r"nom de l.?activite\s*:?")
    result["classe"] = first_right(r"classe\(?s?\)? participante\(?s?\)?\s*:?")
    resp = first_right(r"responsable de l.?activite(?: et telephone)?\s*:?")
    if resp:
        m = re.search(r"(\+?\d[\d .]{8,}\d)", resp)
        if m:
            result["telephone"] = re.sub(r"\s+", " ", m.group(1)).strip()
            resp = resp.replace(m.group(1), "")
        result["enseignant"] = resp.strip(" ,;-(")

    # Dates : « du 31.10.25 au 31.10.25 » ou « du 10 mars au … »
    year_hint = None
    m_year = re.search(r"\b(20\d{2})\b", full_text)
    if m_year:
        year_hint = int(m_year.group(1))
    for hit in fp.find(r"^dates?\s*:?\s*(?:du)?$|\bdates?\s*:\s*(?:du)?"):
        v = fp.text_right_of(hit, 10)
        result["date_debut"] = parse_date_any(v, year_hint)
        if result["date_debut"]:
            m = re.search(r"\bau\b\s*(.+)$", normalize(v))
            if m:
                result["date_fin"] = parse_date_any(m.group(1), year_hint)
            break
    if not result["date_debut"]:
        for hit in fp.find(r"^du$|\bdu\b\s*:"):
            result["date_debut"] = parse_date_any(fp.text_right_of(hit, 10), year_hint)
            if result["date_debut"]:
                break
    if not result["date_fin"]:
        for hit in fp.find(r"^au$|\bau\b\s*:"):
            result["date_fin"] = parse_date_any(fp.text_right_of(hit, 10), year_hint)
            if result["date_fin"]:
                break
    if result["date_debut"] and not result["date_fin"]:
        result["date_fin"] = result["date_debut"]

    # Budget : montant au voisinage de l'étiquette (à droite ou juste au-dessus / en dessous)
    for hit in fp.find(r"budget total accorde"):
        best = None
        for page, line in fp.lines:
            if page is not hit.page or abs(line.y0 - hit.y0) > 5 * fp.h or line.x1 < hit.x0:
                continue
            for m in AMOUNT_RE.finditer(line.text):
                val = parse_amount(m.group(0))
                if best is None or val > best:
                    best = val
        if best is not None:
            result["budget"] = best
            break

    # Effectifs
    counts: dict[str, Optional[int]] = {}
    for field, pattern in COUNT_LABELS:
        hits = fp.find(pattern)
        if field == "autres":
            ref = fp.find(r"moniteurs? j")
            if ref:
                hits.sort(key=lambda x: abs(x.cy - ref[0].cy))
        val = None
        for hit in hits[:2]:
            val = fp.int_near(hit)
            if val is not None:
                break
        counts[field] = val
    eff = Effectifs(
        eleves=counts.get("eleves") or 0,
        enseignants_dgeo=counts.get("enseignants_dgeo") or 0,
        enseignants_js=counts.get("enseignants_js") or 0,
        moniteurs_js=counts.get("moniteurs_js") or 0,
        autres=counts.get("autres") or 0,
    )
    accompagnants = counts.get("accompagnants")
    if accompagnants is not None and eff.titres + eff.non_titres != accompagnants:
        if eff.titres + eff.non_titres == 0:
            result["warnings"].append(
                f"Le formulaire indique {accompagnants} accompagnant(s) mais la répartition titrés / non titrés n'a pas pu être lue : à compléter."
            )
        else:
            result["warnings"].append(
                f"Le formulaire indique {accompagnants} accompagnant(s) mais la répartition lue en compte {eff.titres + eff.non_titres} : à vérifier."
            )
    total_p = counts.get("total_participants")
    if total_p is not None and eff.total and eff.total != total_p:
        result["warnings"].append(f"Total participants du formulaire ({total_p}) ≠ effectifs lus ({eff.total}) : à vérifier.")
    result["effectifs"] = eff

    # Noms
    ens: list[str] = []
    for hit in fp.find(r"noms des ens\w+\s*:?"):
        ens += _split_names(fp.text_right_of(hit, 12))
    result["noms_enseignants"] = ens
    acc: list[str] = []
    for hit in fp.find(r"noms des accompagnants(?: j.?\+?.?s)?\s*:?|noms et fonction(?: \(ex\.? [a-z]+\))?\s*:?"):
        acc += _split_names(fp.text_right_of(hit, 12))
    result["noms_accompagnants"] = [a for a in acc if not re.fullmatch(r"j.?\+?.?s|ex\.? \w+", normalize(a))]

    # Tableau des dépenses
    expenses, total = parse_expense_table(fp)
    result["form_expenses"] = expenses
    result["form_total"] = total
    return result


# ---------------------------------------------------------------------------
# Tableau des dépenses
# ---------------------------------------------------------------------------

CATEGORY_LABELS = [
    ("Nourriture", r"^nourriture"),
    ("Hébergement", r"^hebergement"),
    ("Transport", r"^transport\b"),
    ("Divers", r"^divers\b"),
]
CATEGORY_PREFIX_RE = re.compile(r"^(nourriture\s*/?\s*boissons|nourriture|hébergement|hebergement|transport|divers)\s*", re.I)


def parse_expense_table(fp: FormPages) -> tuple[list[FormExpense], Optional[float]]:
    header_desc = fp.find(r"^descripti\w*|\bdescripti\w*")
    header_piece = fp.find(r"n.? ?piece|no piece|n° piece|n° pi\w+")
    header_ens = fp.find(r"payees par l.?ens\w+")
    header_com = fp.find(r"payees par la.{0,4}commune")
    header_tot = fp.find(r"cout total")
    if not (header_desc and header_com):
        return [], None
    page = header_com[0].page
    header_desc = [h for h in header_desc if h.page is page] or header_desc
    top = min(header_desc[0].y0, header_com[0].y0)
    total_hits = [h for h in fp.find(r"total des depenses") if h.page is page]
    page_lines = [l for p, l in fp.lines if p is page]
    bottom = total_hits[0].y0 if total_hits else max(l.y1 for l in page_lines)

    def col_x(hits: list[Hit]) -> Optional[float]:
        hs = [h for h in hits if h.page is page and abs(h.cy - header_com[0].cy) < 3 * fp.h]
        return (hs[0].x0 + hs[0].x1) / 2 if hs else None

    xs = {
        "descriptif": col_x(header_desc), "pieces": col_x(header_piece), "ens": col_x(header_ens),
        "com": col_x(header_com), "tot": col_x(header_tot),
    }
    cols = sorted((x, k) for k, x in xs.items() if x is not None)
    if len(cols) < 2:
        return [], None
    bounds: dict[str, tuple[float, float]] = {}
    for i, (x, k) in enumerate(cols):
        left = -1e9 if i == 0 else (cols[i - 1][0] + x) / 2
        right = 1e9 if i == len(cols) - 1 else (x + cols[i + 1][0]) / 2
        bounds[k] = (left, right)
    # étiquettes de catégories (colonne de gauche)
    cats: list[tuple[float, str]] = []
    for name, rx in CATEGORY_LABELS:
        for hit in fp.find(rx):
            if hit.page is page and top - 2 * fp.h < hit.y0 < bottom and hit.x0 < (xs["descriptif"] or 0):
                cats.append((hit.y0, name))
                break
    cats.sort()
    expenses: list[FormExpense] = []
    for l in page_lines:
        if not (top + fp.h < l.y0 < bottom - 0.5 * fp.h) or "total des" in normalize(l.text):
            continue
        cells: dict[str, list[Word]] = {k: [] for k in bounds}
        for w in l.words:
            for k, (a, b) in bounds.items():
                if a <= w.cx < b:
                    cells[k].append(w)
        desc = CATEGORY_PREFIX_RE.sub("", " ".join(w.text for w in cells.get("descriptif", [])).strip())
        desc = desc.strip(" |=_-")
        pieces_txt = " ".join(w.text for w in cells.get("pieces", [])).strip(" |=_-")

        def amt(k: str) -> Optional[float]:
            txt = " ".join(w.text for w in cells.get(k, []))
            if "#" in txt:
                return None
            m = AMOUNT_RE.search(txt)
            return parse_amount(m.group(0)) if m else None

        e = FormExpense(
            descriptif=desc, pieces=pieces_txt, paye_enseignant=amt("ens"), paye_commune=amt("com"), cout_total=amt("tot")
        )
        if not (re.search(r"[A-Za-zÀ-ÿ]{3,}", e.descriptif) or e.paye_commune is not None or e.paye_enseignant is not None or e.cout_total is not None):
            continue
        cat = ""
        for y, name in cats:
            if y <= l.y0 + fp.h:
                cat = name
        e.categorie = cat
        # n° de pièce dans une case : relecture ciblée si vide
        if not e.pieces and xs.get("pieces") is not None and e.descriptif:
            cx = xs["pieces"]
            a, b = cx - 3.5 * fp.h, cx + 3.5 * fp.h
            img = fp.image(page)
            if img is not None and pytesseract is not None:
                x0, x1 = int(max(0, a)), int(min(img.width, b))
                y0, y1 = int(max(0, l.y0 - 0.6 * fp.h)), int(min(img.height, l.y1 + 0.6 * fp.h))
                if x1 - x0 > 8 and y1 - y0 > 8:
                    crop = img.crop((x0, y0, x1, y1)).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.LANCZOS)
                    try:
                        txt = pytesseract.image_to_string(crop, config="--psm 7 -c tessedit_char_whitelist=0123456789-,")
                        m = re.search(r"\d{1,2}(?:\s*[-,]\s*\d{1,2})*", txt)
                        if m:
                            e.pieces = re.sub(r"\s+", "", m.group(0))
                    except Exception:  # noqa: BLE001
                        pass
        expenses.append(e)
    total = None
    if total_hits:
        tl = total_hits[0]
        vals = [parse_amount(m.group(0)) for m in AMOUNT_RE.finditer(tl.line.text)]
        if not vals:
            for l in page_lines:
                if abs(l.y0 - tl.y0) < 1.5 * fp.h and l is not tl.line:
                    vals += [parse_amount(m.group(0)) for m in AMOUNT_RE.finditer(l.text)]
        if vals:
            total = max(vals)
    return expenses, total
