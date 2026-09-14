"""`python -m decompte` : démarre le serveur local et ouvre le navigateur."""
from __future__ import annotations

import argparse
import logging
import threading
import webbrowser

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(description="Décompte DGEO — serveur local")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true", help="ne pas ouvrir le navigateur")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    url = f"http://{args.host}:{args.port}/"
    if not args.no_browser:
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    print(f"\nDécompte DGEO — ouvrez {url} dans votre navigateur (Ctrl+C pour arrêter).\n")
    uvicorn.run("decompte.app:app", host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
