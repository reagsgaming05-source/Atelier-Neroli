"""Point d'entrée commun : application fenêtrée par défaut, `--web` pour le serveur local."""
from __future__ import annotations

import logging
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
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", handlers=handlers)


def main(argv: list[str] | None = None) -> None:
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--web" in argv:
        from .cli import main as web_main

        web_main([a for a in argv if a != "--web"])
        return
    from .gui import main as gui_main

    gui_main(argv)
