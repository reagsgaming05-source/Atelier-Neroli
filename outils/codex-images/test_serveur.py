"""Checks the image server without internet: a local web server stands in for the image sites.
  python test_serveur.py        (uses the same packages as the server)"""
import asyncio, base64, io, json, os, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageDraw
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

HERE = Path(__file__).resolve().parent


def brick_wall(w=1200, h=800) -> bytes:
    im = Image.new("RGB", (w, h), "#b9b2a6")
    d = ImageDraw.Draw(im)
    for row, y in enumerate(range(0, h, 40)):
        for x in range(-60 if row % 2 else 0, w, 120):
            d.rectangle([x + 4, y + 4, x + 116, y + 36], fill=(150 + (x * 7 + y) % 50, 60, 40))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90)
    return buf.getvalue()


def logo() -> bytes:
    im = Image.new("RGBA", (300, 120), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse([0, 0, 299, 119], fill=(255, 255, 255, 220))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


WALL = brick_wall()
PAGES = {
    "/mur.jpg": ("image/jpeg", WALL),
    "/vignette.jpg": ("image/jpeg", brick_wall(300, 200)),
    "/page.html": ("text/html", b'<html><head><meta content="/mur.jpg" property="og:image"></head><body>Briqueterie</body></html>'),
    "/sans-image.html": ("text/html", b"<!doctype html><html><body>rien</body></html>"),
    "/texte.txt": ("text/plain", b"pas une image"),
}


class Site(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/redirection":
            self.send_response(302)
            self.send_header("Location", "/mur.jpg")
            self.end_headers()
            return
        if path not in PAGES:
            self.send_error(404)
            return
        ctype, body = PAGES[path]
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def failed(result) -> bool:
    return result.is_error if hasattr(result, "is_error") else result.isError  # mcp 2.x / 1.x


def text_of(result) -> str:
    return "\n".join(c.text for c in result.content if c.type == "text")


def images_of(result) -> list[Image.Image]:
    return [Image.open(io.BytesIO(base64.b64decode(c.data))) for c in result.content if c.type == "image"]


async def call(session, tool, **args):
    return await session.call_tool(tool, args)


async def end_to_end(base: str, root: Path) -> None:
    env = {**os.environ, "IMAGES_DIR": str(root), "IMAGES_ALLOW_PRIVATE": "1"}
    params = StdioServerParameters(command=sys.executable, args=[str(HERE / "serveur_images.py")], env=env)
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        tools = {t.name for t in (await session.list_tools()).tools}
        assert tools >= {"search_images", "download_image", "view_image", "compare_images", "edit_image", "ai_edit_image", "list_images"}, tools

        # A web page: its main picture is taken, and seen by the model.
        r = await call(session, "download_image", source=f"{base}/page.html", name="Mur de briques")
        assert not failed(r), text_of(r)
        assert (root / "originaux/mur-de-briques.jpg").read_bytes() == WALL
        record = json.loads((root / "originaux/mur-de-briques.json").read_text(encoding="utf-8"))
        assert record["url"] == f"{base}/mur.jpg" and record["page"] == f"{base}/page.html" and record["width"] == 1200, record
        assert [im.size for im in images_of(r)] == [(1200, 800)]
        assert f'referenced_image_paths = ["{root / "originaux/mur-de-briques.jpg"}"]' in text_of(r), text_of(r)

        r = await call(session, "download_image", source=f"{base}/redirection")
        assert not failed(r) and (root / "originaux/mur.jpg").exists(), text_of(r)
        for bad, why in [("sans-image.html", "image principale"), ("texte.txt", "pas une image"), ("absent.jpg", "404")]:
            r = await call(session, "download_image", source=f"{base}/{bad}")
            assert failed(r) and why in text_of(r), (bad, text_of(r))

        r = await call(session, "view_image", path="originaux/mur.jpg", max_side=600)
        assert not failed(r) and images_of(r)[0].size == (600, 400) and "1200×800" in text_of(r), text_of(r)

        # Retouching: a new file each time, and a before/after picture.
        logo_path = root / "logo.png"
        logo_path.write_bytes(logo())
        r = await call(session, "edit_image", path="originaux/mur.jpg", output="site/bandeau.jpg", operations=[
            {"op": "crop", "aspect": "16:9", "focus": "top"}, {"op": "resize", "width": 800},
            {"op": "auto_contrast"}, {"op": "temperature", "value": 20}, {"op": "vignette", "strength": 0.3},
            {"op": "text", "text": "Briqueterie", "position": "bottom-left"},
            {"op": "overlay", "path": str(logo_path), "position": "top-right", "scale": 0.15}])
        assert not failed(r), text_of(r)
        assert Image.open(root / "site/bandeau.jpg").size == (800, 450)
        assert len(images_of(r)) == 1 and (root / "originaux/mur.jpg").exists()

        every = [{"op": "crop", "box": [0.1, 0.1, 0.9, 0.9]}, {"op": "crop", "box": [10, 10, 500, 400]},
                 {"op": "resize", "max_side": 300}, {"op": "resize", "height": 200}, {"op": "rotate", "angle": 4, "crop": True},
                 {"op": "rotate", "angle": 90}, {"op": "flip", "direction": "vertical"}, {"op": "flip"},
                 {"op": "perspective", "corners": [[0.05, 0], [0.95, 0.02], [1, 1], [0, 0.98]]},
                 {"op": "white_balance"}, {"op": "levels", "black": 10, "white": 240, "gamma": 1.1},
                 {"op": "brightness", "value": 1.1}, {"op": "contrast", "value": 1.2}, {"op": "saturation", "value": 0.8},
                 {"op": "sharpness", "value": 1.5}, {"op": "gamma", "value": 1.2}, {"op": "sharpen"}, {"op": "denoise"},
                 {"op": "blur", "radius": 1}, {"op": "grayscale"}, {"op": "sepia"}, {"op": "pad", "aspect": "1:1", "color": "blur"},
                 {"op": "pad", "width": 4, "height": 5, "color": "#ffffff"}, {"op": "text", "text": "© X", "position": [0.5, 0.5]}]
        made = []
        for op in every:
            r = await call(session, "edit_image", path="originaux/mur.jpg", operations=[op])
            assert not failed(r), (op, text_of(r))
            made.append(Image.open(text_of(r).split("Enregistrée : ")[1].split("  —")[0]))
        assert all(im.format == "JPEG" for im in made)
        assert made[2].size == (300, 200) and made[3].size == (300, 200), "resize"
        assert sum(made[4].getpixel((0, 0))) < 700 and sum(made[4].getpixel((made[4].width - 1, made[4].height - 1))) < 700, "rotate+crop left a blank corner"
        assert made[5].size == (800, 1200), "rotate 90"
        assert made[21].size == (1200, 1200) and made[22].size == (1200, 1500), "pad"

        for op, why in [({"op": "inconnue"}, "opération inconnue"), ({"op": "perspective", "corners": [[0, 0], [1, 1]]}, "4 coins"),
                        ({"op": "crop"}, "paramètre manquant : 'aspect'")]:
            r = await call(session, "edit_image", path="originaux/mur.jpg", operations=[op])
            assert failed(r) and why in text_of(r), (op, text_of(r))
        r = await call(session, "edit_image", path="originaux/mur.jpg", operations=[], output="../dehors.jpg")
        assert failed(r) and "permise" in text_of(r) and not (root.parent / "dehors.jpg").exists(), "writes stay in IMAGES_DIR"
        r = await call(session, "view_image", path="nulle-part.jpg")
        assert failed(r) and "introuvable" in text_of(r)

        r = await call(session, "compare_images", paths=["originaux/mur.jpg", "site/bandeau.jpg", "retouches/mur.jpg"], labels=["A", "B"])
        assert not failed(r) and len(images_of(r)) == 1 and "retouches/mur.jpg" in text_of(r), text_of(r)

        r = await call(session, "list_images")
        assert f"{base}/page.html" in text_of(r) and "site/bandeau.jpg" in text_of(r), text_of(r)

        r = await call(session, "ai_edit_image", path="originaux/mur.jpg", prompt="ciel bleu")
        assert failed(r) and "OPENAI_API_KEY" in text_of(r), text_of(r)
        r = await call(session, "search_images", query="brique", source="web")
        assert failed(r) and "BRAVE_API_KEY" in text_of(r)

    # Without the test switch, local addresses are refused.
    env.pop("IMAGES_ALLOW_PRIVATE")
    params = StdioServerParameters(command=sys.executable, args=[str(HERE / "serveur_images.py")], env=env)
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        r = await call(session, "download_image", source=f"{base}/mur.jpg")
        assert failed(r) and "réseau local" in text_of(r), text_of(r)
        r = await call(session, "download_image", source="file:///etc/passwd")
        assert failed(r) and "non prise en charge : file:///etc/passwd" in text_of(r), text_of(r)


def search_providers(base: str, root: Path) -> None:
    """Reads each site's answer (in the shape its documentation gives) into the common list."""
    os.environ.update(IMAGES_DIR=str(root), PEXELS_API_KEY="k", UNSPLASH_ACCESS_KEY="k", PIXABAY_API_KEY="k",
                      BRAVE_API_KEY="k", SERPAPI_API_KEY="k")
    sys.path.insert(0, str(HERE))
    import serveur_images as s
    s.ALLOW_PRIVATE = True
    thumb, full = f"{base}/vignette.jpg", f"{base}/mur.jpg"
    answers = {
        "api.openverse.org": {"results": [{"id": "a", "title": "Four à briques", "url": full, "thumbnail": thumb, "foreign_landing_url": "https://flickr.com/x",
                                           "creator": "Ann", "license": "by-sa", "license_version": "4.0", "width": 1200, "height": 800}]},
        "commons.wikimedia.org": {"query": {"pages": [
            {"title": "File:Kiln.jpg", "index": 2, "imageinfo": [{"url": full, "thumburl": thumb, "descriptionurl": "https://commons.wikimedia.org/wiki/File:Kiln.jpg",
                                                                  "width": 1200, "height": 800, "mime": "image/jpeg",
                                                                  "extmetadata": {"LicenseShortName": {"value": "CC BY 3.0"}, "Artist": {"value": "<a href='x'>Bob</a>"}}}]},
            {"title": "File:Logo.svg", "index": 1, "imageinfo": [{"url": "x.svg", "mime": "image/svg+xml"}]}]}},
        "api.pexels.com": {"photos": [{"id": 1, "width": 4000, "height": 3000, "url": "https://pexels.com/p/1", "photographer": "Cy", "alt": "Brick wall",
                                       "src": {"original": full, "medium": thumb}}]},
        "api.unsplash.com": {"results": [{"id": "u", "width": 5000, "height": 3000, "alt_description": "red bricks", "user": {"name": "Di"},
                                          "urls": {"raw": f"{full}?ixid=1", "small": thumb, "regular": thumb},
                                          "links": {"html": "https://unsplash.com/photos/u", "download_location": f"{base}/vignette.jpg"}}]},
        "pixabay.com": {"hits": [{"id": 2, "pageURL": "https://pixabay.com/p/2", "tags": "brick, kiln", "previewURL": thumb, "webformatURL": thumb,
                                  "largeImageURL": full, "imageWidth": 1280, "imageHeight": 853, "user": "Ed"}]},
        "api.search.brave.com": {"results": [{"title": "Briqueterie", "url": "https://example.com/b", "source": "example.com",
                                              "thumbnail": {"src": thumb}, "properties": {"url": full}}]},
        "serpapi.com": {"images_results": [{"title": "Brique", "link": "https://example.org/b", "source": "example.org", "original": full,
                                            "original_width": 1200, "original_height": 800, "thumbnail": thumb}]},
    }
    asked = []
    def fake_get_json(url, params, headers=None, ua=s.API_UA):
        host = url.split("/")[2]
        asked.append((host, params))
        return answers[host]
    s._get_json = fake_get_json
    expected = {"openverse": "CC BY-SA 4.0", "wikimedia": "CC BY 3.0", "pexels": "Pexels", "unsplash": "Unsplash",
                "pixabay": "Pixabay", "brave": "inconnue", "serpapi": "réutilisable"}
    for name, licence in expected.items():
        out = s.search_images("briques", source=name)
        assert len(out) == 2 and licence in out[0] and out[0].count("\nr") == 1, (name, out[0])
        assert out[1].data[:2] == b"\xff\xd8", name
    assert "Bob" in s.search_images("four", source="wikimedia", preview=False)[0]
    assert [p.get("license_type") for h, p in asked if h == "api.openverse.org"][0] == "commercial,modification"
    assert [p.get("licenses") for h, p in asked if h == "serpapi.com"][0] == "fmc"

    out = s.search_images("briques", count=3, preview=False)  # auto: the free sources, until 3 pictures
    assert out[0].count("\nr") == 2 and "pexels" in out[0] and "unsplash" in out[0], out[0]  # one url, kept once
    assert {h for h, p in asked[-5:]} == {"api.pexels.com", "api.unsplash.com", "pixabay.com", "api.openverse.org", "commons.wikimedia.org"}
    answers["api.pexels.com"] = {"photos": []}
    answers["api.unsplash.com"]["results"][0]["urls"]["raw"] = f"{base}/vignette.jpg?ixid=2"

    rid = s.search_images("briques", source="unsplash", preview=False)[0].split("\n")[1].split()[0]
    text, picture = s.download_image(rid, name="unsplash")
    assert "Unsplash" in text and (root / "originaux/unsplash.json").exists(), text
    assert json.loads((root / "originaux/unsplash.json").read_text(encoding="utf-8"))["author"] == "Di"

    def failing(url, params, headers=None, ua=None):
        raise ValueError("hors service")
    s._get_json = failing
    try:
        s.search_images("briques", preview=False)
        raise AssertionError("no result should be an error")
    except Exception as e:
        assert "hors service" in str(e), e


def main() -> None:
    site = ThreadingHTTPServer(("127.0.0.1", 0), Site)
    threading.Thread(target=site.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{site.server_port}"
    with tempfile.TemporaryDirectory() as tmp:
        asyncio.run(end_to_end(base, Path(tmp) / "e2e"))
        print("bout en bout (Codex ↔ serveur ↔ site) : ok")
        search_providers(base, Path(tmp) / "search")
        print("lecture des sept sources de recherche : ok")
    site.shutdown()


if __name__ == "__main__":
    main()
