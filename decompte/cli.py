"""Point d'entrée : démarre le serveur local et ouvre le navigateur.

Utilisé par `python -m decompte` et par l'exécutable portable (launcher.py / PyInstaller).
"""
from __future__ import annotations

import argparse
import logging
import socket
import sys
import threading
import webbrowser

import uvicorn


def _free_port(host: str, preferred: int) -> int:
    """Le port demandé s'il est libre, sinon un port libre attribué par le système."""
    for port in (preferred, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, port))
                return s.getsockname()[1]
            except OSError:
                continue
    return preferred


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Décompte DGEO — serveur local (aucune donnée ne quitte le poste)")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true", help="ne pas ouvrir le navigateur")
    args = parser.parse_args(argv)
    if not logging.getLogger().handlers:
        logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    from .app import DATA_DIR, app  # import tardif : le démarrage affiche vite le message
    from .ocr import tesseract_available

    port = _free_port(args.host, args.port)
    url = f"http://{args.host}:{port}/"
    print("\n=== Décompte DGEO — courses d'école & camps ===")
    print(f"Ouvrez {url} dans votre navigateur (Ctrl+C ou fermez cette fenêtre pour arrêter).")
    print(f"Dossiers de travail : {DATA_DIR}")
    if not tesseract_available():
        print("ATTENTION : Tesseract OCR introuvable — la lecture des scans ne fonctionnera pas (voir README).")
    print()
    if not args.no_browser:
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    try:
        uvicorn.run(app, host=args.host, port=port, log_level="warning", use_colors=False)
    except KeyboardInterrupt:  # pragma: no cover
        pass


if __name__ == "__main__":  # pragma: no cover
    main(sys.argv[1:])
