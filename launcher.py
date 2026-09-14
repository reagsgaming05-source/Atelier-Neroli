"""Point d'entrée de l'exécutable portable (PyInstaller)."""
import multiprocessing
import sys

from decompte.entry import main

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main(sys.argv[1:])
