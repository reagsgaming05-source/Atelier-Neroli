# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller : `pyinstaller build/decompte.spec --noconfirm` → dist/DecompteDGEO/ (dossier portable).

L'exécutable ouvre l'application fenêtrée (Tkinter, embarqué) ; `--web` lance l'ancien serveur local."""
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

ROOT = Path(SPECPATH).parent

hidden = (
    collect_submodules("uvicorn")
    + collect_submodules("anyio")
    + collect_submodules("pydantic")
    + ["multipart", "python_multipart", "email.mime.multipart", "email.mime.text", "openpyxl.cell._writer"]
    + ["tkinter", "tkinter.ttk", "tkinter.filedialog", "tkinter.messagebox", "tkinter.font", "PIL.ImageTk", "PIL._tkinter_finder"]
)

datas = [
    (str(ROOT / "decompte" / "static"), "decompte/static"),
    (str(ROOT / "decompte" / "templates"), "decompte/templates"),
]

a = Analysis(
    [str(ROOT / "launcher.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hidden,
    hookspath=[],
    runtime_hooks=[],
    excludes=["unittest", "pytest", "IPython", "matplotlib", "scipy", "pandas"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="DecompteDGEO",
    debug=False,
    strip=False,
    upx=False,
    console=False,  # application fenêtrée : pas de console noire
    icon=str(ROOT / "build" / "icon.ico"),
)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="DecompteDGEO")
