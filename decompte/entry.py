"""Point d'entrée commun : application fenêtrée par défaut, `--web` pour le serveur local."""
from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(data_dir: Path) -> None:
    handlers: list[logging.Handler] = []
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        handlers.append(RotatingFileHandler(data_dir / "decompte.log", maxBytes=1_000_000, backupCount=2, encoding="utf-8"))
    except OSError:
        pass
    if sys.stderr is not None:
        handlers.append(logging.StreamHandler())
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", handlers=handlers, force=True)


def redirect_std_streams(data_dir: Path) -> None:
    """Exécutable fenêtré (sans console) : stdout/stderr n'existent pas. On les envoie
    dans un fichier pour que ni print() ni uvicorn ne plantent, et pour garder les erreurs."""
    if sys.stdout is not None and sys.stderr is not None:
        return
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        stream = open(data_dir / "console.log", "a", encoding="utf-8", buffering=1)  # noqa: SIM115
    except OSError:
        stream = open(os.devnull, "w", encoding="utf-8")  # noqa: SIM115
    if sys.stdout is None:
        sys.stdout = stream
    if sys.stderr is None:
        sys.stderr = stream


def main(argv: list[str] | None = None) -> None:
    argv = list(sys.argv[1:] if argv is None else argv)
    from .ocr import app_dir

    data_dir = Path(os.environ.get("DECOMPTE_DATA", app_dir() / "data"))
    redirect_std_streams(data_dir)
    setup_logging(data_dir)
    if "--web" in argv:
        from .cli import main as web_main

        web_main([a for a in argv if a != "--web"])
        return
    from .gui import main as gui_main

    gui_main(argv)
