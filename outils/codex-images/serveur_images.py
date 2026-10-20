# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.10", "httpx>=0.27", "pillow>=10.1"]
# ///
"""Serveur MCP « images » pour Codex : chercher des images sur internet, les télécharger,
les regarder et les retoucher. Il tourne hors du bac à sable de Codex (qui coupe le réseau
des commandes), et renvoie les images elles-mêmes au modèle, qui les voit.
  uv run --script serveur_images.py        ou   pip install -r requirements.txt && python serveur_images.py
Réglages par variables d'environnement : voir README.md."""
import base64, functools, html, io, ipaddress, itertools, json, math, os, re, socket, unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from PIL import Image as PILImage, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps, ImageStat

try:
    from mcp.server.mcpserver import Image, MCPServer
    from mcp.server.mcpserver.exceptions import ToolError
except ImportError:  # mcp 1.x
    from mcp.server.fastmcp import FastMCP as MCPServer, Image
    from mcp.server.fastmcp.exceptions import ToolError

ROOT = Path(os.environ.get("IMAGES_DIR") or Path.cwd() / "images").expanduser().resolve()
ALLOW_PRIVATE = os.environ.get("IMAGES_ALLOW_PRIVATE") == "1"
MAX_BYTES = int(os.environ.get("IMAGES_MAX_MB", "40")) * 1024 * 1024
API_UA = "codex-images-mcp/1.0 (image search tool for a local coding agent)"
WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}
RESULTS: dict[str, dict] = {}  # search results of this session, by id ("r1", "r2"…)
_ids = itertools.count(1)

mcp = MCPServer("images", instructions=f"""Images du web pour le projet, enregistrées dans {ROOT}.
Démarche : search_images (regarder la planche de vignettes) → download_image("rN"), qui donne le chemin du fichier
→ retouche avec le générateur d'images de Codex : image_gen.imagegen avec referenced_image_paths = [ce chemin]
→ view_image pour vérifier le résultat. Codex range ce qu'il génère dans generated_images/.
edit_image sert aux gestes simples et exacts (recadrer, redimensionner, redresser, ajouter un logo), sans IA.
Ne jamais retoucher l'original : edit_image écrit toujours un nouveau fichier dans retouches/.
Garder la licence et l'auteur (fichier .json à côté de chaque original) ; list_images donne les crédits.""")


# Network

def _check_url(url: str) -> None:
    """Refuses non-web schemes and, unless IMAGES_ALLOW_PRIVATE=1, local network addresses:
    the server runs outside Codex's sandbox, so a web page must not steer it to the LAN."""
    u = urlparse(url)
    if u.scheme not in ("http", "https") or not u.hostname:
        raise ValueError(f"adresse non prise en charge : {url}")
    if ALLOW_PRIVATE:
        return
    try:
        infos = socket.getaddrinfo(u.hostname, u.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return  # left to the HTTP client (a proxy may resolve it)
    for info in infos:
        if not ipaddress.ip_address(info[4][0].split("%")[0]).is_global:
            raise ValueError(f"adresse du réseau local refusée : {u.hostname}")


def _client(ua: str = WEB_UA, timeout: float = 30) -> httpx.Client:
    return httpx.Client(follow_redirects=True, timeout=timeout,
                        headers={"User-Agent": ua, "Accept-Language": "fr,en;q=0.8"},
                        event_hooks={"request": [lambda r: _check_url(str(r.url))]})


def _ua_for(url: str) -> str:
    host = urlparse(url).hostname or ""
    return API_UA if host.endswith(("wikimedia.org", "wikipedia.org")) else WEB_UA


def _get_json(url: str, params: dict, headers: dict | None = None, ua: str = API_UA) -> Any:
    with _client(ua) as c:
        r = c.get(url, params=params, headers=headers)
        if r.status_code >= 400:
            raise ValueError(f"{urlparse(url).hostname} a répondu {r.status_code} : {r.text[:300]}")
        return r.json()


def _fetch(url: str, referer: str = "", max_bytes: int = MAX_BYTES, timeout: float = 30) -> tuple[bytes, str, str]:
    """Returns (body, content type, final url)."""
    _check_url(url)
    headers = {"Accept": "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.9,text/html;q=0.5,*/*;q=0.3"}
    if referer:
        headers["Referer"] = referer
    with _client(_ua_for(url), timeout) as c, c.stream("GET", url, headers=headers) as r:
        if r.status_code >= 400:
            raise ValueError(f"téléchargement refusé ({r.status_code}) : {url}")
        body = bytearray()
        for chunk in r.iter_bytes():
            body += chunk
            if len(body) > max_bytes:
                raise ValueError(f"fichier de plus de {max_bytes // 1048576} Mo : {url}")
        return bytes(body), r.headers.get("content-type", ""), str(r.url)


def _page_image(page: str, base: str) -> str:
    """The main picture of a web page (og:image, twitter:image, image_src)."""
    found = {}
    for tag in re.findall(r"<(?:meta|link)\b[^>]*>", page, re.I):
        attrs = {k.lower(): html.unescape(a or b) for k, a, b in re.findall(r"([\w:-]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)')", tag)}
        key = (attrs.get("property") or attrs.get("name") or attrs.get("rel") or "").lower()
        value = attrs.get("content") or attrs.get("href")
        if value and key in ("og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src", "image_src"):
            found.setdefault(key, value)
    for key in ("og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src", "image_src"):
        if key in found:
            return urljoin(base, found[key])
    return ""


# Search providers: each returns dicts with title, url, thumb, page, width, height, license, author, provider

def _key(name: str) -> str:
    return os.environ.get(name, "").strip()


def _openverse(q: str, n: int, commercial: bool) -> list[dict]:
    params = {"q": q, "page_size": min(n, 20)}
    if commercial:
        params["license_type"] = "commercial,modification"
    data = _get_json("https://api.openverse.org/v1/images/", params)
    def lic(r):
        l, v = (r.get("license") or "").lower(), r.get("license_version") or ""
        return "CC0" if l == "cc0" else "domaine public" if l == "pdm" else f"CC {l.upper()} {v}".strip()
    return [dict(title=r.get("title") or "", url=r["url"], thumb=r.get("thumbnail") or r["url"], page=r.get("foreign_landing_url") or "",
                 width=r.get("width"), height=r.get("height"), license=lic(r), author=r.get("creator") or "", provider="openverse")
            for r in data.get("results", []) if r.get("url")]


def _strip_html(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def _wikimedia(q: str, n: int, commercial: bool) -> list[dict]:
    # Commons only accepts free licenses, all of them open to commercial use and modification.
    data = _get_json("https://commons.wikimedia.org/w/api.php", {
        "action": "query", "format": "json", "formatversion": "2", "generator": "search",
        "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": "6", "gsrlimit": min(n, 50),
        "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "400",
        "iiextmetadatafilter": "LicenseShortName|Artist|ObjectName"})
    out = []
    for p in sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        if not ii.get("url") or not ii.get("mime", "").startswith("image/") or "svg" in ii.get("mime", ""):
            continue
        meta = ii.get("extmetadata") or {}
        val = lambda k: _strip_html((meta.get(k) or {}).get("value", ""))
        out.append(dict(title=val("ObjectName") or p.get("title", "").removeprefix("File:"), url=ii["url"], thumb=ii.get("thumburl") or ii["url"],
                        page=ii.get("descriptionurl", ""), width=ii.get("width"), height=ii.get("height"),
                        license=val("LicenseShortName"), author=val("Artist"), provider="wikimedia"))
    return out


def _pexels(q: str, n: int, commercial: bool) -> list[dict]:
    data = _get_json("https://api.pexels.com/v1/search", {"query": q, "per_page": min(n, 80), "locale": "fr-FR"},
                     headers={"Authorization": _key("PEXELS_API_KEY")})
    return [dict(title=p.get("alt") or "", url=p["src"]["original"], thumb=p["src"].get("medium") or p["src"]["original"], page=p.get("url", ""),
                 width=p.get("width"), height=p.get("height"), license="licence Pexels (usage commercial libre)",
                 author=p.get("photographer", ""), provider="pexels")
            for p in data.get("photos", [])]


def _unsplash(q: str, n: int, commercial: bool) -> list[dict]:
    data = _get_json("https://api.unsplash.com/search/photos", {"query": q, "per_page": min(n, 30), "lang": "fr"},
                     headers={"Authorization": f"Client-ID {_key('UNSPLASH_ACCESS_KEY')}", "Accept-Version": "v1"})
    return [dict(title=p.get("description") or p.get("alt_description") or "", url=p["urls"]["raw"] + ("&" if "?" in p["urls"]["raw"] else "?") + "w=2560&fm=jpg&q=90",
                 thumb=p["urls"].get("small") or p["urls"]["regular"], page=p.get("links", {}).get("html", ""),
                 width=p.get("width"), height=p.get("height"), license="licence Unsplash (usage commercial libre)",
                 author=p.get("user", {}).get("name", ""), provider="unsplash",
                 ping=p.get("links", {}).get("download_location", ""))  # Unsplash asks to report each download
            for p in data.get("results", [])]


def _pixabay(q: str, n: int, commercial: bool) -> list[dict]:
    data = _get_json("https://pixabay.com/api/", {"key": _key("PIXABAY_API_KEY"), "q": q[:100], "image_type": "photo",
                                                  "per_page": max(3, min(n, 200)), "lang": "fr", "safesearch": "true"})
    return [dict(title=h.get("tags", ""), url=h.get("largeImageURL") or h["webformatURL"], thumb=h.get("webformatURL") or h["previewURL"],
                 page=h.get("pageURL", ""), width=h.get("imageWidth"), height=h.get("imageHeight"),
                 license="licence Pixabay (usage commercial libre)", author=h.get("user", ""), provider="pixabay")
            for h in data.get("hits", [])]


def _brave(q: str, n: int, commercial: bool) -> list[dict]:
    data = _get_json("https://api.search.brave.com/res/v1/images/search", {"q": q, "count": min(n, 100), "safesearch": "strict"},
                     headers={"X-Subscription-Token": _key("BRAVE_API_KEY"), "Accept": "application/json"})
    out = []
    for r in data.get("results", []):
        props = r.get("properties") or {}
        if props.get("url"):
            out.append(dict(title=r.get("title", ""), url=props["url"], thumb=(r.get("thumbnail") or {}).get("src") or props["url"],
                            page=r.get("url", ""), width=props.get("width"), height=props.get("height"),
                            license="inconnue : vérifier sur la page", author=r.get("source", ""), provider="brave"))
    return out


def _serpapi(q: str, n: int, commercial: bool) -> list[dict]:
    params = {"engine": "google_images", "q": q, "api_key": _key("SERPAPI_API_KEY"), "hl": "fr"}
    if commercial:
        params["licenses"] = "fmc"  # Google: free to use, share or modify, even commercially
    data = _get_json("https://serpapi.com/search.json", params)
    lic = "réutilisable commercialement selon Google : vérifier sur la page" if commercial else "inconnue : vérifier sur la page"
    return [dict(title=r.get("title", ""), url=r["original"], thumb=r.get("thumbnail") or r["original"], page=r.get("link", ""),
                 width=r.get("original_width"), height=r.get("original_height"), license=lic, author=r.get("source", ""), provider="serpapi")
            for r in data.get("images_results", [])[:n] if r.get("original")]


PROVIDERS = {"pexels": (_pexels, "PEXELS_API_KEY"), "unsplash": (_unsplash, "UNSPLASH_ACCESS_KEY"),
             "pixabay": (_pixabay, "PIXABAY_API_KEY"), "openverse": (_openverse, ""), "wikimedia": (_wikimedia, ""),
             "brave": (_brave, "BRAVE_API_KEY"), "serpapi": (_serpapi, "SERPAPI_API_KEY")}
FREE_SOURCES = ["pexels", "unsplash", "pixabay", "openverse", "wikimedia"]


# Pictures

def _font(size: int, path: str = "") -> ImageFont.ImageFont:
    for name in ([path] if path else []) + ["arial.ttf", "DejaVuSans.ttf", "Helvetica.ttc"]:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10.1
        return ImageFont.load_default()


def _open_bytes(data: bytes) -> PILImage.Image:
    try:
        im = PILImage.open(io.BytesIO(data))
        im.load()
    except Exception as e:
        raise ValueError(f"ce n'est pas une image lisible ({e})") from None
    return im


def _load(path: Path) -> PILImage.Image:
    im = _open_bytes(path.read_bytes())
    fmt = im.format
    im = ImageOps.exif_transpose(im)
    im.format = fmt
    return im


def _flatten(im: PILImage.Image, color: str = "white") -> PILImage.Image:
    if im.mode in ("RGBA", "LA", "P", "PA"):
        im = im.convert("RGBA")
        bg = PILImage.new("RGB", im.size, color)
        bg.paste(im, mask=im.getchannel("A"))
        return bg
    return im.convert("RGB")


def _jpeg(im: PILImage.Image, side: int, quality: int = 85) -> bytes:
    im = _flatten(im)
    im.thumbnail((side, side), PILImage.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return buf.getvalue()


def _preview(im: PILImage.Image, side: int = 1280) -> Image:
    return Image(data=_jpeg(im, side), format="jpeg")


def _sheet(cells: list[tuple[str, PILImage.Image | None]], cell: int = 256, cols: int = 4) -> Image:
    """A grid of labelled pictures, so that the model sees many at once."""
    cols = max(1, min(cols, len(cells)))
    rows = math.ceil(len(cells) / cols)
    pad, label = 6, max(16, min(28, cell // 12))
    sheet = PILImage.new("RGB", (cols * (cell + pad) + pad, rows * (cell + pad) + pad), "#202020")
    draw, font = ImageDraw.Draw(sheet), _font(label)
    for i, (name, im) in enumerate(cells):
        x, y = pad + (i % cols) * (cell + pad), pad + (i // cols) * (cell + pad)
        if im is None:
            draw.rectangle([x, y, x + cell, y + cell], fill="#444")
            draw.text((x + cell // 2, y + cell // 2), "×", fill="#999", font=_font(cell // 3), anchor="mm")
        else:
            im = _flatten(im)
            im.thumbnail((cell, cell), PILImage.Resampling.LANCZOS)
            sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        box = draw.textbbox((x + 4, y + 2), name, font=font)
        draw.rectangle([box[0] - 4, box[1] - 2, box[2] + 4, box[3] + 3], fill="black")
        draw.text((x + 4, y + 2), name, fill="#ffd54a", font=font)
    buf = io.BytesIO()
    sheet.save(buf, "JPEG", quality=85)
    return Image(data=buf.getvalue(), format="jpeg")


def _thumb(url: str, referer: str) -> PILImage.Image | None:
    try:
        return _open_bytes(_fetch(url, referer, max_bytes=8 * 1048576, timeout=15)[0])
    except Exception:
        return None


def _slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()[:60] or "image"


def _unique(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    n, candidate = 2, path
    while candidate.exists():
        candidate, n = path.with_name(f"{path.stem}-{n}{path.suffix}"), n + 1
    return candidate


def _in(path: str) -> Path:
    p = Path(path).expanduser()
    for candidate in ([p] if p.is_absolute() else [Path.cwd() / p, ROOT / p]):
        if candidate.is_file():
            return candidate.resolve()
    raise ValueError(f"fichier introuvable : {path} (les images sont dans {ROOT})")


def _out(path: str, default: Path) -> Path:
    """Where to write: always inside IMAGES_DIR, never over an existing file."""
    if not path:
        return _unique(default)
    p = Path(path).expanduser()
    p = (p if p.is_absolute() else ROOT / p).resolve()
    if not p.is_relative_to(ROOT):
        raise ValueError(f"écriture permise seulement dans {ROOT}")
    if not p.suffix:
        p = p.with_suffix(default.suffix)
    return _unique(p)


def _save(im: PILImage.Image, path: Path, quality: int = 92) -> None:
    ext = path.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        _flatten(im).save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    elif ext == ".webp":
        im.save(path, "WEBP", quality=quality, method=6)
    elif ext == ".png":
        im.save(path, "PNG", optimize=True)
    else:
        raise ValueError(f"format d'enregistrement non pris en charge : {ext} (jpg, png ou webp)")


def _info(path: Path, im: PILImage.Image) -> str:
    return f"{path}  —  {im.width}×{im.height} px, {im.format or path.suffix[1:].upper()}, {path.stat().st_size // 1024} Ko"


# Retouching

def _fractions(values: list, sizes: list[int]) -> list[float]:
    """Coordinates in pixels, or in fractions of the picture when all of them lie in 0–1."""
    values = [float(v) for v in values]
    if all(0 <= v <= 1 for v in values):
        return [v * sizes[i % len(sizes)] for i, v in enumerate(values)]
    return values


def _ratio(aspect: str | float) -> float:
    if isinstance(aspect, (int, float)):
        return float(aspect)
    w, _, h = str(aspect).replace("/", ":").partition(":")
    return float(w) / float(h or 1)


def _place(position: Any, size: tuple[int, int], canvas: tuple[int, int], margin: int) -> tuple[int, int]:
    (w, h), (cw, ch) = size, canvas
    if isinstance(position, (list, tuple)):
        x, y = _fractions(position, [cw, ch])
        return int(x), int(y)
    pos = str(position or "bottom-right").lower()
    x = margin if "left" in pos else cw - w - margin if "right" in pos else (cw - w) // 2
    y = margin if "top" in pos else ch - h - margin if "bottom" in pos else (ch - h) // 2
    return x, y


def _solve(a: list[list[float]], b: list[float]) -> list[float]:
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[pivot][col]) < 1e-12:
            raise ValueError("les quatre coins ne forment pas un quadrilatère")
        m[col], m[pivot] = m[pivot], m[col]
        for r in range(n):
            if r != col:
                f = m[r][col] / m[col][col]
                m[r] = [x - f * y for x, y in zip(m[r], m[col])]
    return [m[i][n] / m[i][i] for i in range(n)]


def _perspective(im: PILImage.Image, corners: list) -> PILImage.Image:
    pts = [tuple(_fractions(c, [im.width, im.height])) for c in corners]
    if len(pts) != 4:
        raise ValueError("perspective : 4 coins [haut-gauche, haut-droit, bas-droit, bas-gauche]")
    (tl, tr, br, bl), dist = pts, math.dist
    w, h = int(max(dist(tl, tr), dist(bl, br))), int(max(dist(tl, bl), dist(tr, br)))
    rows, rhs = [], []
    for (x, y), (u, v) in zip([(0, 0), (w, 0), (w, h), (0, h)], pts):
        rows += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        rhs += [u, v]
    return im.transform((w, h), PILImage.Transform.PERSPECTIVE, _solve(rows, rhs), PILImage.Resampling.BICUBIC)


def _inner_rect(w: int, h: int, angle: float) -> tuple[float, float]:
    """The largest upright rectangle inside a w×h picture rotated by angle."""
    a = math.radians(angle)
    s, c = abs(math.sin(a)), abs(math.cos(a))
    long, short = max(w, h), min(w, h)
    if short <= 2 * s * c * long or abs(s - c) < 1e-10:
        x = 0.5 * short
        return (x / s, x / c) if w >= h else (x / c, x / s)
    cos2 = c * c - s * s
    return (w * c - h * s) / cos2, (h * c - w * s) / cos2


def _channels(im: PILImage.Image, fn) -> PILImage.Image:
    """Applies fn(r, g, b) -> (r, g, b) on the colour channels, keeping transparency."""
    alpha = im.getchannel("A") if im.mode == "RGBA" else None
    r, g, b = im.convert("RGB").split()
    out = PILImage.merge("RGB", fn(r, g, b))
    if alpha:
        out.putalpha(alpha)
    return out


def _apply(im: PILImage.Image, op: dict) -> PILImage.Image:
    name = str(op.get("op", "")).lower()
    W, H = im.size
    value = op.get("value")
    if name == "crop":
        if "box" in op:
            l, t, r, b = _fractions(op["box"], [W, H])
        else:
            target = _ratio(op["aspect"])
            w, h = (W, W / target) if W / H < target else (H * target, H)
            focus = op.get("focus", "center")
            fx, fy = (_fractions(focus, [1, 1]) if isinstance(focus, (list, tuple)) else
                      (0 if "left" in focus else 1 if "right" in focus else 0.5, 0 if "top" in focus else 1 if "bottom" in focus else 0.5))
            l, t = (W - w) * fx, (H - h) * fy
            r, b = l + w, t + h
        return im.crop(tuple(round(v) for v in (max(0, l), max(0, t), min(W, r), min(H, b))))
    if name == "resize":
        if op.get("max_side"):
            k = float(op["max_side"]) / max(W, H)
            size = (W * k, H * k)
        else:
            w, h = op.get("width"), op.get("height")
            size = (w, h) if w and h else (w, H * w / W) if w else (W * h / H, h)
        return im.resize((max(1, round(size[0])), max(1, round(size[1]))), PILImage.Resampling.LANCZOS)
    if name == "rotate":
        angle = float(op.get("angle", value or 0))
        if angle % 90 == 0:
            return im.rotate(angle, expand=True)
        if not op.get("crop"):
            fill = op.get("fill", (0, 0, 0, 0) if im.mode == "RGBA" else "white")
            return im.rotate(angle, PILImage.Resampling.BICUBIC, expand=True, fillcolor=fill)
        out = im.rotate(angle, PILImage.Resampling.BICUBIC, expand=True)
        w, h = _inner_rect(W, H, angle)
        l, t = (out.width - w) / 2, (out.height - h) / 2
        return out.crop((math.ceil(l), math.ceil(t), math.floor(l + w), math.floor(t + h)))
    if name == "flip":
        return ImageOps.mirror(im) if str(op.get("direction", value or "horizontal")).startswith("h") else ImageOps.flip(im)
    if name == "perspective":
        return _perspective(im, op["corners"])
    if name == "auto_contrast":
        return _channels(im, lambda *ch: ImageOps.autocontrast(PILImage.merge("RGB", ch), cutoff=float(op.get("cutoff", 0.5))).split())
    if name == "white_balance":
        means = ImageStat.Stat(im.convert("RGB")).mean
        gray = sum(means) / 3
        return _channels(im, lambda *ch: [c.point(lambda x, k=gray / max(m, 1): min(255, int(x * k))) for c, m in zip(ch, means)])
    if name == "levels":
        black, white, gamma = float(op.get("black", 0)), float(op.get("white", 255)), float(op.get("gamma", 1))
        lut = [min(255, max(0, round(255 * (max(0, x - black) / max(1, white - black)) ** (1 / gamma)))) for x in range(256)]
        return _channels(im, lambda *ch: [c.point(lut) for c in ch])
    if name in ("brightness", "contrast", "saturation", "sharpness"):
        enhancer = {"brightness": ImageEnhance.Brightness, "contrast": ImageEnhance.Contrast,
                    "saturation": ImageEnhance.Color, "sharpness": ImageEnhance.Sharpness}[name]
        return _channels(im, lambda *ch: enhancer(PILImage.merge("RGB", ch)).enhance(float(value if value is not None else 1)).split())
    if name == "gamma":
        lut = [round(255 * (x / 255) ** (1 / float(value or 1))) for x in range(256)]
        return _channels(im, lambda *ch: [c.point(lut) for c in ch])
    if name == "temperature":
        k = float(value or 0) / 400
        return _channels(im, lambda r, g, b: (r.point(lambda x: min(255, int(x * (1 + k)))), g, b.point(lambda x: min(255, int(x * (1 - k))))))
    if name == "sharpen":
        f = ImageFilter.UnsharpMask(float(op.get("radius", 2)), int(op.get("percent", 120)), int(op.get("threshold", 3)))
        return _channels(im, lambda *ch: PILImage.merge("RGB", ch).filter(f).split())
    if name == "denoise":
        size = int(op.get("size", 3)) | 1
        return _channels(im, lambda *ch: PILImage.merge("RGB", ch).filter(ImageFilter.MedianFilter(size)).split())
    if name == "blur":
        return im.filter(ImageFilter.GaussianBlur(float(op.get("radius", value or 2))))
    if name == "vignette":
        strength = float(op.get("strength", value or 0.35))
        edge = PILImage.radial_gradient("L").resize(im.size, PILImage.Resampling.BILINEAR)
        mask = edge.point(lambda x: int(255 * strength * (x / 255) ** 2))
        return _channels(im, lambda *ch: PILImage.composite(PILImage.new("RGB", im.size, "black"), PILImage.merge("RGB", ch), mask).split())
    if name == "grayscale":
        return _channels(im, lambda *ch: [ImageOps.grayscale(PILImage.merge("RGB", ch))] * 3)
    if name == "sepia":
        return _channels(im, lambda *ch: ImageOps.colorize(ImageOps.grayscale(PILImage.merge("RGB", ch)), "#2b1d0e", "#fff2dc", mid="#a37b54").split())
    if name == "pad":
        target = _ratio(op["aspect"]) if "aspect" in op else float(op["width"]) / float(op["height"])
        w, h = (round(H * target), H) if W / H < target else (W, round(W / target))
        color = op.get("color", "white")
        if color == "blur":
            canvas = ImageOps.fit(_flatten(im), (w, h), PILImage.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(max(w, h) / 30))
        else:
            canvas = PILImage.new("RGB", (w, h), color)
        canvas.paste(im, ((w - W) // 2, (h - H) // 2), im if im.mode == "RGBA" else None)
        return canvas
    if name == "text":
        size = int(op.get("size") or max(12, H * 0.04))
        margin = int(op.get("margin", size))
        font = _font(size, op.get("font", ""))
        layer = PILImage.new("RGBA", im.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        l, t, r, b = draw.textbbox((0, 0), op["text"], font=font)
        x, y = _place(op.get("position"), (r - l, b - t), im.size, margin)
        color = PILImage.new("RGBA", (1, 1), op.get("color", "white")).getpixel((0, 0))
        draw.text((x - l, y - t), op["text"], font=font, fill=color[:3] + (int(255 * float(op.get("opacity", 0.85))),))
        return PILImage.alpha_composite(im.convert("RGBA"), layer).convert(im.mode if im.mode == "RGBA" else "RGB")
    if name == "overlay":
        logo = _load(_in(op["path"])).convert("RGBA")
        lw = max(1, round(W * float(op.get("scale", 0.2))))
        logo = logo.resize((lw, max(1, round(logo.height * lw / logo.width))), PILImage.Resampling.LANCZOS)
        logo.putalpha(logo.getchannel("A").point(lambda a: int(a * float(op.get("opacity", 1)))))
        x, y = _place(op.get("position"), logo.size, im.size, int(op.get("margin", W * 0.03)))
        out = im.convert("RGBA")
        out.alpha_composite(logo, (max(0, x), max(0, y)))
        return out if im.mode == "RGBA" else out.convert("RGB")
    raise ValueError(f"opération inconnue : {name!r}")


# Tools

def tool(fn):
    """Registers a tool whose failures reach the model in words, so that it can correct itself
    (the MCP library would otherwise hide the message of an unexpected error)."""
    @functools.wraps(fn)
    def run(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except ToolError:
            raise
        except KeyError as e:
            raise ToolError(f"paramètre manquant : {e}") from e
        except httpx.HTTPError as e:
            raise ToolError(f"réseau : {e!r}") from e
        except Exception as e:
            raise ToolError(str(e) or type(e).__name__) from e
    return mcp.tool(structured_output=False)(run)


@tool
def search_images(query: str, source: str = "auto", count: int = 12, commercial_only: bool = True, preview: bool = True) -> list:
    """Cherche des images sur internet. Renvoie la liste (numéro rN, taille, licence, auteur, page)
    et une planche de vignettes numérotées pour choisir d'un coup d'œil ; ensuite download_image("rN").
    source : "auto" (banques d'images libres : Pexels, Unsplash, Pixabay si leurs clés sont réglées, puis Openverse
    et Wikimedia Commons, sans clé), l'une d'elles par son nom, ou "web" (tout le web via Brave ou SerpAPI, clé requise).
    commercial_only : seulement des images utilisables et modifiables pour un usage commercial (recommandé pour un site d'entreprise).
    Astuce : chercher aussi en anglais (« brick kiln », « red brick wall texture »), les banques d'images y sont plus riches."""
    count = max(1, min(int(count), 40))
    if source == "web":
        names = [n for n in ("brave", "serpapi") if _key(PROVIDERS[n][1])]
        if not names:
            raise ValueError("source web : régler BRAVE_API_KEY ou SERPAPI_API_KEY (voir README.md)")
    elif source == "auto":
        names = [n for n in FREE_SOURCES if not PROVIDERS[n][1] or _key(PROVIDERS[n][1])]
    elif source in PROVIDERS:
        names = [source]
    else:
        raise ValueError(f"source inconnue : {source} ({', '.join(['auto', 'web', *PROVIDERS])})")
    found, notes, seen = [], [], set()
    for name in names:
        fn, key = PROVIDERS[name]
        if key and not _key(key):
            raise ValueError(f"{name} : régler {key} (voir README.md)")
        try:
            items = fn(query, count, commercial_only)
        except Exception as e:
            notes.append(f"{name} indisponible : {e}")
            continue
        for item in items:
            if item["url"] not in seen and len(found) < count:
                seen.add(item["url"])
                found.append(item)
        if len(found) >= count:
            break
    if not found:
        raise ValueError("aucune image trouvée. " + " ".join(notes) + " Essayer d'autres mots, en anglais, ou une autre source.")
    lines = [f"{len(found)} images pour « {query} » :"]
    for item in found:
        item["id"] = f"r{next(_ids)}"
        RESULTS[item["id"]] = item
        size = f"{item['width']}×{item['height']}" if item.get("width") else "taille ?"
        lines.append(f"{item['id']}  {size}  {item['provider']}  « {item['title'][:70]} »  licence : {item['license'] or '?'}"
                     f"  auteur : {item['author'][:40] or '?'}  page : {item['page']}")
    lines += notes
    out: list = ["\n".join(lines)]
    if preview:
        with ThreadPoolExecutor(8) as pool:
            thumbs = list(pool.map(lambda it: _thumb(it["thumb"], it["page"]), found))
        out.append(_sheet([(it["id"], th) for it, th in zip(found, thumbs)]))
    return out


@tool
def download_image(source: str, name: str = "") -> list:
    """Télécharge une image dans originaux/ et la montre. source : un numéro de search_images (« r3 »),
    l'adresse directe d'une image, ou l'adresse d'une page web (son image principale est prise).
    La provenance, l'auteur et la licence sont notés dans un .json du même nom. name : nom de fichier souhaité (sans extension)."""
    meta = dict(RESULTS.get(source.strip()) or {"url": source.strip(), "page": "", "title": ""})
    if meta.get("ping"):
        try:
            with _client(API_UA, 10) as c:
                c.get(meta["ping"], headers={"Authorization": f"Client-ID {_key('UNSPLASH_ACCESS_KEY')}"})
        except Exception:
            pass
    data, ctype, final = _fetch(meta["url"], meta.get("page", ""))
    if "html" in ctype or data[:200].lstrip().lower().startswith((b"<!doctype", b"<html")):
        picture = _page_image(data.decode("utf-8", "ignore"), final)
        if not picture:
            raise ValueError("cette page n'indique pas d'image principale : donner l'adresse directe de l'image, ou passer par search_images")
        meta["page"] = meta.get("page") or final
        data, ctype, final = _fetch(picture, final)
    im = _open_bytes(data)
    ext = FORMATS.get(im.format)
    stem = _slug(name or meta.get("title") or Path(urlparse(final).path).stem)
    if ext:
        path = _unique(ROOT / "originaux" / f"{stem}{ext}")
        path.write_bytes(data)
    else:  # TIFF, AVIF, BMP…: kept as PNG so that every tool and Codex can read it
        path = _unique(ROOT / "originaux" / f"{stem}.png")
        im.save(path, "PNG")
    record = {k: meta.get(k) for k in ("title", "page", "license", "author", "provider") if meta.get(k)}
    record.update(url=final, width=im.width, height=im.height, downloaded=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    path.with_suffix(".json").write_text(json.dumps(record, ensure_ascii=False, indent=1), encoding="utf-8")
    im = ImageOps.exif_transpose(im)
    return [f"Enregistrée : {_info(path, im)}\nlicence : {record.get('license', 'inconnue : vérifier sur ' + (record.get('page') or record['url']))}"
            f"\npour la retoucher avec le générateur d'images de Codex : image_gen.imagegen, referenced_image_paths = [\"{path}\"]",
            _preview(im)]


@tool
def view_image(path: str, max_side: int = 1280) -> list:
    """Montre une image enregistrée (chemin absolu, ou relatif au dossier des images), avec sa taille et son format."""
    p = _in(path)
    im = _load(p)
    return [_info(p, im), _preview(im, max(256, min(int(max_side), 2048)))]


@tool
def compare_images(paths: list[str], labels: list[str] | None = None) -> list:
    """Montre plusieurs images côte à côte (variantes d'une retouche, choix entre originaux), chacune avec son étiquette."""
    files = [_in(p) for p in paths[:12]]
    names = list(labels or []) + [f.name for f in files[len(labels or []):]]
    return ["\n".join(f"{n} : {f}" for n, f in zip(names, files)),
            _sheet([(n, _load(f)) for n, f in zip(names, files)], cell=640 if len(files) <= 2 else 400, cols=2 if len(files) <= 4 else 3)]


@tool
def edit_image(path: str, operations: list[dict[str, Any]], output: str = "", quality: int = 92) -> list:
    """Retouche une image et écrit le résultat dans retouches/ (l'original n'est jamais modifié), puis montre l'avant/après.
    operations : liste appliquée dans l'ordre, chacune {"op": …, paramètres}. Coordonnées en pixels, ou en fractions 0–1.
    - crop : box [gauche, haut, droite, bas] ; ou aspect "16:9" avec focus "center"|"top"|"bottom"|"left"|"right"|[x, y]
    - resize : width et/ou height (proportions gardées), ou max_side
    - rotate : angle (degrés, sens inverse des aiguilles), crop true pour couper les coins vides (redresser une photo penchée), fill (couleur des coins sinon)
    - flip : direction "horizontal"|"vertical"
    - perspective : corners [[x,y] haut-gauche, haut-droit, bas-droit, bas-gauche] → redressés en rectangle (façade, mur de briques)
    - auto_contrast : cutoff (% écrêté, 0.5) ; white_balance (sans paramètre) ; levels : black, white (0–255), gamma
    - brightness | contrast | saturation | sharpness : value (1 = inchangé, 1.15 = +15 %) ; gamma : value (>1 éclaircit)
    - temperature : value (−100 froid … +100 chaud) ; sharpen : radius, percent, threshold ; denoise : size ; blur : radius
    - vignette : strength (0–1) ; grayscale ; sepia
    - pad : aspect "1:1" (ou width + height), color "#ffffff" ou "blur" (fond flou tiré de l'image)
    - text : text, position ("bottom-right", "top-left", "center"… ou [x, y]), size (px), color, opacity, margin, font (fichier .ttf)
    - overlay : path (logo PNG), position, scale (part de la largeur, 0.2), opacity, margin
    output : nom ou chemin dans le dossier des images (extension .jpg, .png ou .webp) ; par défaut retouches/<nom>.<ext>."""
    src = _in(path)
    before = _load(src)
    im = before.convert("RGBA" if "A" in before.getbands() or "transparency" in before.info else "RGB")
    for op in operations:
        im = _apply(im, op)
    ext = src.suffix.lower() if src.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp") else ".png"
    if im.mode == "RGBA" and ext in (".jpg", ".jpeg") and not output:
        ext = ".png"
    dest = _out(output, ROOT / "retouches" / f"{src.stem}{ext}")
    _save(im, dest, int(quality))
    im.format = dest.suffix[1:].upper()
    return [f"Enregistrée : {_info(dest, im)}\nopérations : {json.dumps(operations, ensure_ascii=False)}",
            _sheet([("avant", before), ("après", im)], cell=640, cols=2)]


@tool
def ai_edit_image(path: str, prompt: str, output: str = "", mask: str = "", size: str = "auto", quality: str = "high") -> list:
    """Retouche par IA via l'API OpenAI (clé OPENAI_API_KEY requise), seulement si le générateur d'images de Codex
    (image_gen.imagegen) n'est pas disponible. prompt : la retouche voulue, en précisant ce qui doit rester identique.
    mask : PNG facultatif dont les zones transparentes sont celles à modifier. size : "auto", "1536x1024", "1024x1536" ou "1024x1024".
    Résultat dans retouches/, avec l'avant/après."""
    key = _key("OPENAI_API_KEY")
    if not key:
        raise ValueError("régler OPENAI_API_KEY pour la retouche par IA (sinon, edit_image fait les retouches classiques)")
    src = _in(path)
    before = _load(src)
    def png(im: PILImage.Image, side: int = 2048) -> bytes:
        im = im.copy()
        im.thumbnail((side, side), PILImage.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "PNG")
        return buf.getvalue()
    sent = png(before)
    files = [("image", ("image.png", sent, "image/png"))]
    if mask:
        size_sent = _open_bytes(sent).size
        files.append(("mask", ("mask.png", png(_load(_in(mask)).convert("RGBA").resize(size_sent)), "image/png")))
    form = {"model": os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1"), "prompt": prompt, "size": size,
            "quality": quality, "n": "1", "input_fidelity": "high"}
    url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/") + "/images/edits"
    with _client(API_UA, 300) as c:
        r = c.post(url, headers={"Authorization": f"Bearer {key}"}, data=form, files=files)
        if r.status_code == 400 and "input_fidelity" in r.text:  # model without this option
            form.pop("input_fidelity")
            r = c.post(url, headers={"Authorization": f"Bearer {key}"}, data=form, files=files)
    if r.status_code >= 400:
        raise ValueError(f"OpenAI a répondu {r.status_code} : {r.text[:500]}")
    im = _open_bytes(base64.b64decode(r.json()["data"][0]["b64_json"]))
    dest = _out(output, ROOT / "retouches" / f"{src.stem}-ia.png")
    _save(im, dest)
    im.format = dest.suffix[1:].upper()
    return [f"Enregistrée : {_info(dest, im)}\nretouche : {prompt}", _sheet([("avant", before), ("après", im)], cell=640, cols=2)]


@tool
def list_images() -> str:
    """Liste les images enregistrées (originaux et retouches) avec leur taille, et les crédits à citer (auteur, licence, page)."""
    if not ROOT.exists():
        return f"Aucune image pour l'instant ({ROOT})."
    lines = [f"Images dans {ROOT} :"]
    for p in sorted(ROOT.rglob("*")):
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
            line = f"{p.relative_to(ROOT)}  ({p.stat().st_size // 1024} Ko)"
            sidecar = p.with_suffix(".json")
            if sidecar.exists():
                m = json.loads(sidecar.read_text(encoding="utf-8"))
                line += f"  —  {m.get('author', '?')}, {m.get('license', 'licence inconnue')}, {m.get('page') or m.get('url')}"
            lines.append(line)
    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run()
