"""Extraction des mots (avec coordonnées) de chaque page d'un PDF.

Stratégie, 100 % locale :
1. Page « native » (PDF généré par un logiciel, texte vectoriel) → couche texte exacte.
2. Page scannée → rendu 300 dpi, détection de l'orientation (Tesseract OSD),
   redressement, puis OCR Tesseract en mode « texte épars » (psm 11).
3. Si Tesseract n'est pas installé → repli sur la couche texte du scanner si elle existe.
"""
from __future__ import annotations

import logging
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Callable

import pymupdf
from PIL import Image

from .models import PageData, Word

log = logging.getLogger(__name__)

DPI = 300
JPEG_QUALITY = 80

_OCR_LANGS_PREFERRED = ["fra", "deu", "eng"]

try:  # pytesseract est optionnel à l'import : on veut un message clair si absent
    import pytesseract
except ImportError:  # pragma: no cover
    pytesseract = None


def app_dir() -> Path:
    """Dossier de l'application : celui de l'exécutable (version portable) ou du dépôt."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


def configure_tesseract() -> str | None:
    """Utilise Tesseract embarqué (dossier `tesseract/` à côté de l'exécutable) ou `TESSERACT_CMD`.

    Retourne le chemin retenu, ou None pour laisser pytesseract chercher dans le PATH."""
    if pytesseract is None:
        return None
    cmd = os.environ.get("TESSERACT_CMD")
    if not cmd:
        base = app_dir()
        for cand in (
            base / "tesseract" / "tesseract.exe", base / "tesseract" / "tesseract",
            base / "_internal" / "tesseract" / "tesseract.exe", base / "_internal" / "tesseract" / "tesseract",
        ):
            if cand.exists():
                cmd = str(cand)
                break
    if not cmd:
        return None
    pytesseract.pytesseract.tesseract_cmd = cmd
    tessdata = Path(cmd).parent / "tessdata"
    if tessdata.is_dir():
        os.environ.setdefault("TESSDATA_PREFIX", str(tessdata))
    return cmd


TESSERACT_CMD = configure_tesseract()


def tesseract_available() -> bool:
    if pytesseract is None:
        return False
    if TESSERACT_CMD is None and shutil.which("tesseract") is None:
        return False
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        return False
    return True


def _ocr_langs() -> str:
    try:
        installed = set(pytesseract.get_languages(config=""))
    except Exception:
        installed = {"eng"}
    langs = [l for l in _OCR_LANGS_PREFERRED if l in installed] or ["eng"]
    return "+".join(langs)


# ---------------------------------------------------------------------------
# Rendu
# ---------------------------------------------------------------------------


def render_page(page: pymupdf.Page, dpi: int = DPI) -> Image.Image:
    pix = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csRGB, alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def is_native_text_page(page: pymupdf.Page) -> bool:
    """Vrai si la page contient du vrai texte (pas seulement une image scannée + OCR)."""
    text = page.get_text().strip()
    if len(text) < 40:
        return False
    page_area = page.rect.width * page.rect.height
    for info in page.get_image_info():
        x0, y0, x1, y1 = info["bbox"]
        if (x1 - x0) * (y1 - y0) > 0.5 * page_area:
            return False  # une image couvre la page : c'est un scan
    return True


# ---------------------------------------------------------------------------
# Couche texte
# ---------------------------------------------------------------------------


def words_from_textlayer(page: pymupdf.Page, scale: float) -> list[Word]:
    words: list[Word] = []
    mat = page.rotation_matrix if page.rotation else None
    for x0, y0, x1, y1, text, *_ in page.get_text("words"):
        if not text.strip():
            continue
        if mat is not None:
            r = pymupdf.Rect(x0, y0, x1, y1) * mat
            x0, y0, x1, y1 = r.x0, r.y0, r.x1, r.y1
        words.append(Word(x0=x0 * scale, y0=y0 * scale, x1=x1 * scale, y1=y1 * scale, text=text))
    return _normalize_textlayer_numbers(words)


def _normalize_textlayer_numbers(words: list[Word]) -> list[Word]:
    """Les OCR de scanner coupent souvent « 2.80 » en « 2. » + « 80 » : on recolle."""
    out: list[Word] = []
    i = 0
    while i < len(words):
        w = words[i]
        if i + 1 < len(words):
            n = words[i + 1]
            same_line = abs(n.cy - w.cy) < max(w.h, n.h) * 0.6
            # l'écart doit aussi être positif : sur une ligne lue de droite à gauche, recoller
            # donnait un mot dont x1 < x0, dont l'intervalle inversé fausse la découpe en colonnes
            gap = n.x0 - w.x1
            if same_line and re.fullmatch(r"\d+[.,]", w.text) and re.fullmatch(r"\d{2}", n.text) and 0 <= gap < w.h * 1.5:
                out.append(Word(x0=w.x0, y0=min(w.y0, n.y0), x1=n.x1, y1=max(w.y1, n.y1), text=w.text + n.text, conf=min(w.conf, n.conf)))
                i += 2
                continue
        out.append(w)
        i += 1
    return out


# ---------------------------------------------------------------------------
# Tesseract
# ---------------------------------------------------------------------------


def detect_rotation(img: Image.Image) -> int:
    """Angle (0/90/180/270, sens horaire) à appliquer pour redresser la page."""
    try:
        osd = pytesseract.image_to_osd(img, config="--psm 0")
    except Exception as exc:  # page vide, trop peu de texte…
        log.debug("OSD indisponible: %s", exc)
        return 0
    m = re.search(r"Rotate:\s*(\d+)", osd)
    return int(m.group(1)) % 360 if m else 0


def rotate_image(img: Image.Image, rotation: int) -> Image.Image:
    if rotation % 360 == 0:
        return img
    # PIL tourne dans le sens anti-horaire pour un angle positif
    return img.rotate(-rotation, expand=True)


def words_from_tesseract(img: Image.Image, langs: str, psm: int = 11) -> list[Word]:
    gray = img.convert("L")
    data = pytesseract.image_to_data(gray, lang=langs, config=f"--psm {psm}", output_type=pytesseract.Output.DICT)
    words: list[Word] = []
    for i, text in enumerate(data["text"]):
        text = (text or "").strip()
        if not text:
            continue
        try:
            conf = float(data["conf"][i])
        except (TypeError, ValueError):
            conf = 0.0
        if conf < 0:
            continue
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        words.append(Word(x0=x, y0=y, x1=x + w, y1=y + h, text=text, conf=conf))
    return words


def _quality(words: list[Word]) -> float:
    """Score grossier de lisibilité : mots « sûrs » contenant des lettres ou des chiffres."""
    return sum(1 for w in words if w.conf >= 60 and re.search(r"[A-Za-zÀ-ÿ]{3,}|\d", w.text))


def ocr_page_best_rotation(img: Image.Image, langs: str) -> tuple[Image.Image, list[Word], int]:
    """OSD d'abord ; si le résultat est pauvre, on essaie les autres orientations."""
    rotation = detect_rotation(img)
    rotated = rotate_image(img, rotation)
    words = words_from_tesseract(rotated, langs)
    best = (rotated, words, rotation, _quality(words))
    if best[3] >= 15:
        return best[:3]
    for alt in (0, 90, 180, 270):
        if alt == rotation:
            continue
        r = rotate_image(img, alt)
        w = words_from_tesseract(r, langs)
        q = _quality(w)
        if q > best[3]:
            best = (r, w, alt, q)
    return best[:3]


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------


ProgressCb = Callable[[int, int], None]


def load_pages(
    pdf_path: str | Path, out_dir: str | Path, dpi: int = DPI, progress: ProgressCb | None = None
) -> tuple[list[PageData], str]:
    """Extrait chaque page : image redressée (JPEG) + mots avec coordonnées.

    `progress(page_en_cours, nb_pages)` est appelé avant chaque page. Retourne (pages, moteur utilisé)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    use_tess = tesseract_available()
    langs = _ocr_langs() if use_tess else ""
    engine = f"tesseract ({langs})" if use_tess else "couche texte du PDF (Tesseract absent)"
    pages: list[PageData] = []
    scale = dpi / 72.0
    # « with » : sans lui le fichier restait ouvert (mmap) à chaque dossier analysé et, sous
    # Windows, le dossier de travail restait verrouillé dès qu'un rendu de page échouait.
    with pymupdf.open(str(pdf_path)) as doc:
        for idx, page in enumerate(doc):
            num = idx + 1
            if progress:
                progress(num, len(doc))
            img = render_page(page, dpi)
            rotation = 0
            if is_native_text_page(page):
                words = words_from_textlayer(page, scale)
                source = "textlayer"
            elif use_tess:
                img, words, rotation = ocr_page_best_rotation(img, langs)
                source = "tesseract"
            else:
                words = words_from_textlayer(page, scale)
                source = "textlayer" if words else "none"
            image_path = out_dir / f"page-{num}.jpg"
            img.save(image_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
            pages.append(
                PageData(
                    number=num,
                    width=img.width,
                    height=img.height,
                    rotation=rotation,
                    source=source,
                    words=words,
                    image=str(image_path),
                    kind="pieces" if words else "empty",
                )
            )
            log.info("page %d: %s, rotation %d°, %d mots", num, source, rotation, len(words))
    return pages, engine
