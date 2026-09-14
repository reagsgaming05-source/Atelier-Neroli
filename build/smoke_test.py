"""Test de fumée de l'exécutable : le serveur répond, Tesseract embarqué lit un PDF image.

Usage : python build/smoke_test.py http://127.0.0.1:8765
"""
from __future__ import annotations

import io
import json
import sys
import urllib.request
import uuid

import pymupdf
from PIL import Image, ImageDraw, ImageFont

TICKET = [
    "Mobilis", "Billet de groupes individuel", "Valable: 10.03.2025 09:12 -", "Zones 70 72",
    "3 Prix entier CHF 2.80", "38 Jeune 6-24.99 CHF 1.70", "41 Total", "", "2. Cl.", "CHF 73.00", "No article: 80186",
]


def image_pdf() -> bytes:
    """Un PDF composé uniquement d'une image (comme un scan), donc lu par Tesseract."""
    img = Image.new("RGB", (1240, 1754), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=36)
    except TypeError:  # Pillow < 10.1
        font = ImageFont.load_default()
    for i, line in enumerate(TICKET):
        d.text((120, 120 + i * 60), line, fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(page.rect, stream=buf.getvalue())
    return doc.tobytes()


def post_multipart(url: str, field: str, filename: str, data: bytes) -> dict:
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; filename=\"{filename}\"\r\n"
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.load(resp)


def main(base: str) -> None:
    health = json.load(urllib.request.urlopen(base + "/api/health", timeout=30))
    print("health:", health)
    assert health["tesseract"] is True, "Tesseract embarqué introuvable"
    assert urllib.request.urlopen(base + "/", timeout=30).status == 200
    d = post_multipart(base + "/api/analyse", "file", "TST100325.pdf", image_pdf())
    print("pieces:", [(p["kind"], p["total"], [(f["category"], f["qty"], f["unit_price"]) for f in p["fares"]]) for p in d["pieces"]])
    assert d["pieces"], "aucune pièce lue"
    p = d["pieces"][0]
    assert p["total"] == 73.0, f"total lu {p['total']} ≠ 73.00"
    assert any(f["category"] == "plein" and f["qty"] == 3 and f["unit_price"] == 2.8 for f in p["fares"]), "tarif adulte non lu"
    d["effectifs"]["eleves"], d["effectifs"]["enseignants_dgeo"] = 38, 3
    req = urllib.request.Request(base + "/api/recompute", data=json.dumps(d).encode(), headers={"Content-Type": "application/json"})
    d2 = json.load(urllib.request.urlopen(req, timeout=60))
    print("rows:", [(r["rubrique"], r["libelle"], r["cout_direct"]) for r in d2["rows"]], "total", d2["total"])
    assert d2["total"] == 8.4, f"total {d2['total']} ≠ 8.40"
    req = urllib.request.Request(base + "/api/excel", data=json.dumps(d2).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        xlsx = resp.read()
    assert xlsx[:2] == b"PK" and len(xlsx) > 3000, "fichier Excel invalide"
    print("excel:", len(xlsx), "octets — OK")
    print("SMOKE TEST OK")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765")
