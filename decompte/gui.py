"""Interface fenêtrée native (Tkinter) — aucun navigateur, aucune dépendance externe.

Trois onglets : 1. dossier & effectifs, 2. pièces (vignettes, tarifs modifiables),
3. lignes du décompte + génération du fichier Excel. L'analyse OCR tourne dans un
fil d'arrière-plan avec une barre de progression.
"""
from __future__ import annotations

import calendar
import datetime as dt
import logging
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import tkinter as tk
import uuid
from collections import OrderedDict
from pathlib import Path
from tkinter import filedialog, font as tkfont, messagebox, ttk
from typing import Callable, Optional

from PIL import Image, ImageTk

from . import __version__
from .analyse import analyse_pdf
from .excel import build_workbook, output_filename
from .models import DecompteRow, Dossier, FareLine, Piece
from .ocr import TESSERACT_CMD, app_dir, tesseract_available
from .rules import compute_rows, compute_total, row_amount_etat, rubriques_for

log = logging.getLogger(__name__)

DATA_DIR = Path(os.environ.get("DECOMPTE_DATA", app_dir() / "data"))

KINDS = OrderedDict([
    ("billet", "Billet / ticket"), ("facture", "Facture"), ("recepisse", "Récépissé (exclu)"),
    ("recu_carte", "Reçu de carte (exclu)"), ("taux_change", "Taux de change (exclu)"), ("autre", "Autre"),
])
CATS = OrderedDict([
    ("plein", "Plein tarif (adulte)"), ("demi", "Demi-tarif (adulte)"), ("enfant", "Élève / enfant"),
    ("invite", "Invité (gratuit)"), ("autre", "Autre"),
])
MODES = OrderedDict([("direct", "Saisie directe (tarifs adultes)"), ("prorata", "Règle de trois (montant global)")])
TYPES = OrderedDict([("course", "Course d'école"), ("camp", "Camp")])
CURRENCIES = OrderedDict([("CHF", "CHF"), ("EUR", "EUR")])
NON_REMB = {"recepisse": "Récépissé (bulletin de versement) : pas une pièce justificative",
            "recu_carte": "Reçu de paiement par carte : seul le ticket fait foi",
            "taux_change": "Pièce « taux de change » : sert uniquement à la conversion"}

DATE_FIELDS = ("date_debut", "date_fin", "date_decompte")
THUMB = (230, 170)
ACCENT = "#1f6f8b"
MUTED = "#5d6b7a"
BAD = "#b3261e"
WARN_BG = "#fbf1dc"
CARD_BG = "#ffffff"


# ---------------------------------------------------------------------------
# Petits utilitaires
# ---------------------------------------------------------------------------


def fmt(x: Optional[float]) -> str:
    return "" if x is None else f"{x:.2f}"


def parse_float(s: str) -> Optional[float]:
    s = s.strip().replace("'", "").replace("’", "").replace(" ", "").replace(",", ".")
    if not s:
        return None
    try:
        return round(float(s), 4)
    except ValueError:
        return None


def parse_int(s: str, default: int = 0) -> int:
    try:
        return max(0, int(float(s.strip() or default)))
    except ValueError:
        return default


def parse_date_str(s: str) -> Optional[dt.date]:
    m = re.match(r"\s*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\s*$", s or "")
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 100:
        y += 2000
    try:
        return dt.date(y, mo, d)
    except ValueError:
        return None


def open_file(path: str) -> None:
    try:
        if hasattr(os, "startfile"):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
    except OSError as exc:
        log.warning("ouverture impossible: %s", exc)


class Combo(ttk.Combobox):
    """Liste déroulante code → libellé."""

    def __init__(self, master, choices: "OrderedDict[str, str]", value: str, on_change: Callable[[str], None], width: int = 24):
        self.choices = choices
        super().__init__(master, values=list(choices.values()), state="readonly", width=width)
        self.set_code(value)
        self.bind("<<ComboboxSelected>>", lambda e: on_change(self.code()))

    def code(self) -> str:
        label = self.get()
        for k, v in self.choices.items():
            if v == label:
                return k
        return next(iter(self.choices))

    def set_code(self, code: str) -> None:
        self.set(self.choices.get(code, next(iter(self.choices.values()))))


class ScrollFrame(ttk.Frame):
    """Cadre défilant verticalement (canvas + cadre intérieur)."""

    def __init__(self, master, **kw):
        super().__init__(master, **kw)
        self.canvas = tk.Canvas(self, highlightthickness=0, bg="#f4f6f8")
        self.vsb = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.vsb.set)
        self.inner = ttk.Frame(self.canvas, style="Page.TFrame")
        self._win = self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.inner.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.bind("<Configure>", lambda e: self.canvas.itemconfigure(self._win, width=e.width))
        self.canvas.pack(side="left", fill="both", expand=True)
        self.vsb.pack(side="right", fill="y")
        self.canvas.bind("<Enter>", lambda e: self._bind_wheel())
        self.canvas.bind("<Leave>", lambda e: self._unbind_wheel())

    def _bind_wheel(self) -> None:
        self.canvas.bind_all("<MouseWheel>", self._on_wheel)
        self.canvas.bind_all("<Button-4>", lambda e: self.canvas.yview_scroll(-3, "units"))
        self.canvas.bind_all("<Button-5>", lambda e: self.canvas.yview_scroll(3, "units"))

    def _unbind_wheel(self) -> None:
        for seq in ("<MouseWheel>", "<Button-4>", "<Button-5>"):
            self.canvas.unbind_all(seq)

    def _on_wheel(self, event) -> None:
        self.canvas.yview_scroll(int(-event.delta / 40), "units")

    def scroll_top(self) -> None:
        self.canvas.yview_moveto(0)


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------


class App(tk.Tk):
    def __init__(self, argv: list[str] | None = None):
        super().__init__()
        self.title(f"Décompte DGEO — courses d'école & camps   (v{__version__})")
        self.geometry("1280x840")
        self.minsize(1000, 650)
        self.dossier: Optional[Dossier] = None
        self.rows_manual = False
        self._recompute_job: Optional[str] = None
        self._thumbs: list = []
        self._page_images: dict[str, Image.Image] = {}
        self._setup_style()
        self._build()
        self.report_callback_exception = self._tk_error  # type: ignore[assignment]
        pdf = next((a for a in (argv or []) if a.lower().endswith(".pdf")), None)
        if pdf:
            self.after(300, lambda: self.run_analysis(pdf))

    # ------------------------------------------------------------ style
    def _setup_style(self) -> None:
        style = ttk.Style(self)
        for theme in ("vista", "winnative", "clam"):
            if theme in style.theme_names():
                style.theme_use(theme)
                break
        family = "Segoe UI" if sys.platform.startswith("win") else tkfont.nametofont("TkDefaultFont").actual("family")
        for name in ("TkDefaultFont", "TkTextFont", "TkHeadingFont", "TkMenuFont"):
            tkfont.nametofont(name).configure(family=family, size=10)
        self.font_bold = tkfont.Font(family=family, size=10, weight="bold")
        self.font_title = tkfont.Font(family=family, size=12, weight="bold")
        self.font_total = tkfont.Font(family=family, size=14, weight="bold")
        self.font_small = tkfont.Font(family=family, size=9)
        style.configure("Page.TFrame", background="#f4f6f8")
        style.configure("Card.TFrame", background=CARD_BG, relief="solid", borderwidth=1)
        style.configure("Card.TLabel", background=CARD_BG)
        style.configure("CardMuted.TLabel", background=CARD_BG, foreground=MUTED, font=self.font_small)
        style.configure("CardBad.TLabel", background=CARD_BG, foreground=BAD)
        style.configure("Muted.TLabel", foreground=MUTED, font=self.font_small)
        style.configure("Title.TLabel", font=self.font_title)
        style.configure("Total.TLabel", foreground=ACCENT, font=self.font_total)
        style.configure("Link.TLabel", foreground=ACCENT, background=CARD_BG, font=self.font_small)
        style.configure("Accent.TButton", font=self.font_bold)
        style.configure("Warn.TLabel", background=WARN_BG, foreground="#5b4a1e")

    # ------------------------------------------------------------ construction
    def _build(self) -> None:
        bar = ttk.Frame(self, padding=(10, 8))
        bar.pack(fill="x")
        ttk.Button(bar, text="Ouvrir un dossier PDF…", style="Accent.TButton", command=self.open_pdf).pack(side="left")
        ttk.Button(bar, text="↻ Recalculer depuis les pièces", command=self.recompute_from_pieces).pack(side="left", padx=(8, 0))
        ttk.Button(bar, text="⬇ Générer le fichier Excel…", style="Accent.TButton", command=self.export_excel).pack(side="left", padx=(8, 0))
        self.lbl_file = ttk.Label(bar, text="Aucun dossier ouvert", style="Muted.TLabel")
        self.lbl_file.pack(side="left", padx=16)

        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=10, pady=(0, 6))
        self.tab_dossier = ttk.Frame(self.nb, padding=12)
        self.tab_pieces = ttk.Frame(self.nb)
        self.tab_rows = ttk.Frame(self.nb, padding=12)
        self.nb.add(self.tab_dossier, text="  1. Dossier & effectifs  ")
        self.nb.add(self.tab_pieces, text="  2. Pièces justificatives  ")
        self.nb.add(self.tab_rows, text="  3. Décompte DGEO & Excel  ")
        self._build_dossier_tab()
        self._build_pieces_tab()
        self._build_rows_tab()

        status = ttk.Frame(self, padding=(10, 4))
        status.pack(fill="x")
        ocr = f"OCR local : Tesseract ✓ ({TESSERACT_CMD or 'système'})" if tesseract_available() else "⚠ Tesseract OCR introuvable : la lecture des scans ne fonctionnera pas"
        ttk.Label(status, text=ocr + "   ·   traitement 100 % local, aucune donnée ne quitte ce poste", style="Muted.TLabel").pack(side="left")
        ttk.Label(status, text=f"Dossiers de travail : {DATA_DIR}", style="Muted.TLabel").pack(side="right", padx=(16, 0))

    # --- onglet 1
    def _build_dossier_tab(self) -> None:
        t = self.tab_dossier
        ttk.Label(t, text="Ouvrez un dossier PDF scanné (formulaire de décompte + toutes les pièces). Le logiciel lit les tickets, exclut les récépissés et propose la part à charge de l'État ; vous validez les effectifs puis chaque pièce.", wraplength=1150, style="Muted.TLabel").grid(row=0, column=0, columnspan=4, sticky="w", pady=(0, 10))
        self.dfields: dict[str, tk.StringVar] = {}
        specs = [
            ("numero", "N° de dossier (course / camp n°)"), ("classe", "Classe(s)"), ("enseignant", "Enseignant-e responsable"),
            ("activite", "Nom de l'activité"), ("date_debut", "Date début (jj.mm.aaaa)"), ("date_fin", "Date fin (jj.mm.aaaa)"),
            ("date_decompte", "Date du décompte (signature, en bas de l'Excel)"), ("budget", "Budget accordé (information)"),
        ]
        r, c = 1, 0
        for key, label in specs:
            ttk.Label(t, text=label, style="Muted.TLabel").grid(row=r, column=c, sticky="w", padx=(0, 12))
            var = tk.StringVar()
            if key in DATE_FIELDS:
                cell = ttk.Frame(t)
                cell.grid(row=r + 1, column=c, sticky="we", padx=(0, 12), pady=(0, 8))
                ttk.Entry(cell, textvariable=var, width=14).pack(side="left", fill="x", expand=True)
                ttk.Button(cell, text="▾ Calendrier", width=12, command=lambda v=var, l=label: self.pick_date(v, l)).pack(side="left", padx=(4, 0))
            else:
                ttk.Entry(t, textvariable=var, width=32).grid(row=r + 1, column=c, sticky="we", padx=(0, 12), pady=(0, 8))
            self.dfields[key] = var
            var.trace_add("write", lambda *_, k=key, v=var: self._on_dossier_field(k, v.get()))
            c += 1
            if c == 4:
                c, r = 0, r + 2
        ttk.Label(t, text="Type d'activité (modèle Excel)", style="Muted.TLabel").grid(row=r, column=c, sticky="w")
        self.type_combo = Combo(t, TYPES, "course", self._on_type_change, width=28)
        self.type_combo.grid(row=r + 1, column=c, sticky="we", pady=(0, 8))
        r += 2

        eff = ttk.LabelFrame(t, text="Effectifs — c'est vous qui fixez qui est titré", padding=10)
        eff.grid(row=r, column=0, columnspan=4, sticky="we", pady=(8, 4))
        ttk.Label(eff, text="Enseignants DGEO + enseignants J&S = acc. titrés (part État, colonne F) · moniteurs J+S + autres = acc. non titrés (colonne D)", style="Muted.TLabel").grid(row=0, column=0, columnspan=5, sticky="w", pady=(0, 6))
        self.evars: dict[str, tk.StringVar] = {}
        for i, (key, label) in enumerate([("eleves", "Élèves"), ("enseignants_dgeo", "Enseignants DGEO (titrés)"), ("enseignants_js", "Enseignants J&S (titrés)"), ("moniteurs_js", "Moniteurs J+S (non titrés)"), ("autres", "Autres accompagnants (non titrés)")]):
            ttk.Label(eff, text=label, style="Muted.TLabel").grid(row=1, column=i, sticky="w", padx=(0, 16))
            var = tk.StringVar(value="0")
            ttk.Spinbox(eff, from_=0, to=999, textvariable=var, width=8).grid(row=2, column=i, sticky="w", padx=(0, 16))
            self.evars[key] = var
            var.trace_add("write", lambda *_, k=key, v=var: self._on_effectif(k, v.get()))
        self.lbl_effcalc = ttk.Label(eff, text="", font=self.font_bold)
        self.lbl_effcalc.grid(row=3, column=0, columnspan=5, sticky="w", pady=(8, 0))
        r += 1

        self.eur_frame = ttk.Frame(t)
        self.eur_frame.grid(row=r, column=0, columnspan=4, sticky="w", pady=(6, 0))
        ttk.Label(self.eur_frame, text="Taux EUR → CHF (ex. 0.95) — une pièce est en euros :", style="Muted.TLabel").pack(side="left")
        self.taux_var = tk.StringVar()
        ttk.Entry(self.eur_frame, textvariable=self.taux_var, width=10).pack(side="left", padx=8)
        self.taux_var.trace_add("write", lambda *_: self._on_taux(self.taux_var.get()))
        self.eur_frame.grid_remove()
        r += 1

        self.lbl_noms = ttk.Label(t, text="", wraplength=1150, style="Muted.TLabel", justify="left")
        self.lbl_noms.grid(row=r, column=0, columnspan=4, sticky="w", pady=(8, 0))
        r += 1
        self.warn_frame = ttk.LabelFrame(t, text="Avertissements", padding=8)
        self.warn_frame.grid(row=r, column=0, columnspan=4, sticky="we", pady=(10, 0))
        self.lbl_warn = ttk.Label(self.warn_frame, text="—", wraplength=1120, justify="left")
        self.lbl_warn.pack(anchor="w")
        for col in range(4):
            t.columnconfigure(col, weight=1)

    # --- onglet 2
    def _build_pieces_tab(self) -> None:
        head = ttk.Frame(self.tab_pieces, padding=(12, 8, 12, 4))
        head.pack(fill="x")
        self.lbl_pieces = ttk.Label(head, text="Pièces justificatives", style="Title.TLabel")
        self.lbl_pieces.pack(side="left")
        ttk.Button(head, text="+ Ajouter une pièce manquante", command=self.add_piece).pack(side="right")
        ttk.Label(self.tab_pieces, text="Cliquez sur une vignette pour voir la page entière et le texte lu. Saisie directe : tarifs adultes du billet (jusqu'à N titrés, plein tarif puis demi-tarif). Règle de trois : montant global réparti selon les effectifs dans l'Excel. Récépissés et reçus de carte sont exclus automatiquement.", wraplength=1200, style="Muted.TLabel", padding=(12, 0, 12, 6)).pack(fill="x")
        self.pieces_scroll = ScrollFrame(self.tab_pieces)
        self.pieces_scroll.pack(fill="both", expand=True)
        self.cards: list[PieceCard] = []

    # --- onglet 3
    def _build_rows_tab(self) -> None:
        t = self.tab_rows
        ttk.Label(t, text="Ces lignes seront écrites dans le modèle Excel officiel (avec ses formules : règle de trois H/G11×F11, total MROUND à 0.05). Vous pouvez retoucher un libellé ou un montant ; « Recalculer » régénère tout depuis les pièces.", wraplength=1150, style="Muted.TLabel").pack(anchor="w", pady=(0, 10))
        self.rows_frame = ttk.Frame(t)
        self.rows_frame.pack(fill="x")
        bottom = ttk.Frame(t, padding=(0, 14, 0, 0))
        bottom.pack(fill="x")
        ttk.Label(bottom, text="Total du remboursement demandé à la DGEO (arrondi à 0.05) :", font=self.font_bold).pack(side="left")
        self.lbl_total = ttk.Label(bottom, text="CHF 0.00", style="Total.TLabel")
        self.lbl_total.pack(side="left", padx=12)
        actions = ttk.Frame(t, padding=(0, 14, 0, 0))
        actions.pack(fill="x")
        ttk.Button(actions, text="↻ Recalculer depuis les pièces", command=self.recompute_from_pieces).pack(side="left")
        ttk.Button(actions, text="⬇ Générer le fichier Excel…", style="Accent.TButton", command=self.export_excel).pack(side="left", padx=8)
        self.lbl_rows_state = ttk.Label(actions, text="", style="Muted.TLabel")
        self.lbl_rows_state.pack(side="left", padx=8)

    # ------------------------------------------------------------ actions
    def open_pdf(self) -> None:
        path = filedialog.askopenfilename(title="Choisir le dossier PDF scanné", filetypes=[("Fichier PDF", "*.pdf"), ("Tous les fichiers", "*.*")])
        if path:
            self.run_analysis(path)

    def run_analysis(self, path: str) -> None:
        src = Path(path)
        if not src.exists():
            messagebox.showerror("Fichier introuvable", str(src))
            return
        dossier_id = uuid.uuid4().hex[:12]
        work = DATA_DIR / dossier_id
        work.mkdir(parents=True, exist_ok=True)
        pdf = work / "source.pdf"
        shutil.copyfile(src, pdf)
        win = tk.Toplevel(self)
        win.title("Analyse en cours")
        win.transient(self)
        win.resizable(False, False)
        ttk.Label(win, text=f"Lecture de {src.name}", font=self.font_bold, padding=(16, 12, 16, 4)).pack()
        lbl = ttk.Label(win, text="Rendu des pages…", padding=(16, 0, 16, 6))
        lbl.pack()
        bar = ttk.Progressbar(win, length=360, mode="determinate")
        bar.pack(padx=16, pady=(0, 14))
        win.update_idletasks()
        win.geometry(f"+{self.winfo_rootx() + 380}+{self.winfo_rooty() + 260}")
        win.grab_set()
        # La croix ne ferme pas la fenêtre : la détruire pendant l'analyse laissait poll() écrire
        # dans des widgets détruits (TclError) et le résultat de la lecture était perdu.
        win.protocol("WM_DELETE_WINDOW", lambda: None)
        # Une file par analyse : deux lectures lancées à la suite ne se volent plus leurs messages
        # (la seconde chargeait le dossier de la première).
        q: "queue.Queue" = queue.Queue()

        def worker() -> None:
            try:
                d = analyse_pdf(pdf, work / "pages", dossier_id, src.name, progress=lambda i, n: q.put(("progress", i, n)))
                q.put(("done", d))
            except Exception as exc:  # noqa: BLE001
                log.exception("analyse impossible")
                q.put(("error", str(exc)))

        threading.Thread(target=worker, daemon=True).start()

        def fermer() -> None:
            if win.winfo_exists():
                win.grab_release()
                win.destroy()

        def poll() -> None:
            vivante = win.winfo_exists()
            try:
                while True:
                    msg = q.get_nowait()
                    if msg[0] == "progress":
                        if vivante:
                            _, i, n = msg
                            bar.configure(maximum=n, value=i - 1)
                            lbl.configure(text=f"Lecture OCR de la page {i} / {n}…")
                    elif msg[0] == "done":
                        fermer()
                        self.load_dossier(msg[1])
                        return
                    else:
                        fermer()
                        messagebox.showerror("Analyse impossible", msg[1])
                        return
            except queue.Empty:
                pass
            self.after(120, poll)

        poll()

    def load_dossier(self, d: Dossier) -> None:
        self.dossier = d
        self.rows_manual = False
        self._page_images.clear()
        self.lbl_file.configure(text=f"{d.filename} — {len(d.pages)} page(s) — {d.ocr_engine}")
        self.refresh_dossier_tab()
        self.refresh_pieces_tab()
        self.refresh_rows_tab()
        self.nb.select(self.tab_dossier)

    def schedule_recompute(self) -> None:
        if self._recompute_job:
            self.after_cancel(self._recompute_job)
        self._recompute_job = self.after(250, self._recompute)

    def _recompute(self) -> None:
        self._recompute_job = None
        if not self.dossier:
            return
        if self.rows_manual:
            # Les lignes retouchées à la main sont conservées telles quelles, mais la part de
            # l'État et le total doivent quand même suivre les effectifs et le taux EUR : sinon
            # l'export annonçait un total différent de celui affiché à l'écran.
            self._refresh_total()
            return
        compute_rows(self.dossier)
        self.refresh_rows_tab()
        self.refresh_warnings()

    def recompute_from_pieces(self) -> None:
        if not self.dossier:
            return
        self.rows_manual = False
        self._recompute()

    def export_excel(self) -> None:
        if not self.dossier:
            messagebox.showinfo("Aucun dossier", "Ouvrez d'abord un dossier PDF.")
            return
        self.dossier.total = compute_total(self.dossier)
        path = filedialog.asksaveasfilename(title="Enregistrer le décompte Excel", defaultextension=".xlsx", initialfile=output_filename(self.dossier), filetypes=[("Classeur Excel", "*.xlsx")])
        if not path:
            return
        Path(path).write_bytes(build_workbook(self.dossier))
        if messagebox.askyesno("Décompte généré", f"Fichier enregistré :\n{path}\n\nTotal à charge de l'État : CHF {self.dossier.total:.2f}\n\nOuvrir le fichier maintenant ?"):
            open_file(path)

    def add_piece(self) -> None:
        if not self.dossier:
            return
        d = self.dossier
        page = next((p for p in d.pages if p.kind == "pieces"), d.pages[0] if d.pages else None)
        pid = max([p.id for p in d.pieces], default=0) + 1
        piece = Piece(id=pid, numero=str(pid), page=page.number if page else 1, bbox=(0, 0, page.width if page else 100, page.height if page else 100),
                      kind="facture", currency="CHF", rubrique="Autre", mode="prorata", include=True, notes=["Pièce ajoutée à la main"])
        d.pieces.append(piece)
        card = PieceCard(self.pieces_scroll.inner, self, piece)
        card.pack(fill="x", padx=12, pady=6)
        self.cards.append(card)
        self.update_idletasks()
        self.pieces_scroll.canvas.yview_moveto(1.0)
        self.schedule_recompute()
        self.lbl_pieces.configure(text=self._pieces_title())

    def remove_piece(self, card: "PieceCard") -> None:
        if not self.dossier or not messagebox.askyesno("Supprimer", f"Supprimer la pièce {card.piece.numero} de la liste ?"):
            return
        self.dossier.pieces = [p for p in self.dossier.pieces if p is not card.piece]
        self.cards.remove(card)
        card.destroy()
        self.schedule_recompute()
        self.lbl_pieces.configure(text=self._pieces_title())

    # ------------------------------------------------------------ rafraîchissements
    def refresh_dossier_tab(self) -> None:
        d = self.dossier
        assert d is not None
        self._loading = True
        for key, var in self.dfields.items():
            val = getattr(d, key)
            var.set("" if val is None else (fmt(val) if key == "budget" else str(val)))
        self.type_combo.set_code(d.type_activite)
        for key, var in self.evars.items():
            var.set(str(getattr(d.effectifs, key)))
        self.taux_var.set("" if d.taux_eur_chf is None else f"{d.taux_eur_chf:.4f}")
        self._loading = False
        self._refresh_effcalc()
        self._refresh_eur_visibility()
        noms = []
        if d.noms_enseignants or d.noms_accompagnants:
            noms.append(f"Noms lus sur le formulaire — enseignants : {', '.join(d.noms_enseignants) or '–'} · accompagnants : {', '.join(d.noms_accompagnants) or '–'}")
        if d.form_expenses:
            items = [f"{e.categorie or '?'} · {e.descriptif}{' (pce ' + e.pieces + ')' if e.pieces else ''}{' · commune ' + fmt(e.paye_commune) if e.paye_commune is not None else ''}" for e in d.form_expenses]
            noms.append("Tableau des dépenses du formulaire : " + " — ".join(items) + (f" — total {fmt(d.form_total)}" if d.form_total is not None else ""))
        self.lbl_noms.configure(text="\n".join(noms))
        self.refresh_warnings()

    def refresh_warnings(self) -> None:
        d = self.dossier
        if not d:
            return
        msgs = [w.replace("[calcul] ", "") for w in d.warnings]
        self.lbl_warn.configure(text="\n".join(f"• {m}" for m in msgs) if msgs else "Aucun avertissement.")

    def _refresh_effcalc(self) -> None:
        if not self.dossier:
            return
        e = self.dossier.effectifs
        self.lbl_effcalc.configure(text=f"Acc. titrés (F11) : {e.titres}      Acc. non titrés (D11) : {e.non_titres}      Élèves (E11) : {e.eleves}      Total participants (G11) : {e.total}")

    def _refresh_eur_visibility(self) -> None:
        if self.dossier and any(p.currency == "EUR" for p in self.dossier.pieces):
            self.eur_frame.grid()
        else:
            self.eur_frame.grid_remove()

    def _pieces_title(self) -> str:
        d = self.dossier
        if not d:
            return "Pièces justificatives"
        return f"Pièces justificatives — {len(d.pieces)} détectée(s), {sum(1 for p in d.pieces if p.include)} retenue(s)"

    def refresh_pieces_tab(self) -> None:
        for c in self.cards:
            c.destroy()
        self.cards = []
        self._thumbs = []
        d = self.dossier
        if not d:
            return
        self.lbl_pieces.configure(text=self._pieces_title())
        for piece in d.pieces:
            card = PieceCard(self.pieces_scroll.inner, self, piece)
            card.pack(fill="x", padx=12, pady=6)
            self.cards.append(card)
        self.pieces_scroll.scroll_top()

    def refresh_rows_tab(self) -> None:
        for w in self.rows_frame.winfo_children():
            w.destroy()
        d = self.dossier
        if not d:
            return
        heads = ["Rubrique", "Libellé (détail du calcul)", "Coût total (H)", "Part État saisie (I)", "À charge de l'État (J)"]
        for i, h in enumerate(heads):
            ttk.Label(self.rows_frame, text=h, font=self.font_bold).grid(row=0, column=i, sticky="w", padx=6, pady=(0, 4))
        self.rows_frame.columnconfigure(1, weight=1)
        rubs = OrderedDict((r, r) for r in rubriques_for(d.type_activite))
        self._row_labels: list[ttk.Label] = []
        if not d.rows:
            ttk.Label(self.rows_frame, text="Aucune ligne : aucune pièce retenue ou aucun accompagnant titré.", style="Muted.TLabel").grid(row=1, column=0, columnspan=5, sticky="w", padx=6)
        for i, row in enumerate(d.rows, start=1):
            self._build_row_widgets(i, row, rubs)
        self._refresh_total()

    def _build_row_widgets(self, i: int, row: DecompteRow, rubs: "OrderedDict[str, str]") -> None:
        f = self.rows_frame

        def set_rub(code: str, r=row) -> None:
            r.rubrique = code
            self._mark_manual()

        Combo(f, rubs, row.rubrique if row.rubrique in rubs else "Autre", set_rub, width=14).grid(row=i, column=0, sticky="w", padx=6, pady=2)
        lv = tk.StringVar(value=row.libelle)
        ttk.Entry(f, textvariable=lv, width=70).grid(row=i, column=1, sticky="we", padx=6, pady=2)
        lv.trace_add("write", lambda *_, r=row, v=lv: (setattr(r, "libelle", v.get()), self._mark_manual()))
        if row.mode == "prorata":
            hv = tk.StringVar(value=fmt(row.cout_total))
            ttk.Entry(f, textvariable=hv, width=12, justify="right").grid(row=i, column=2, sticky="w", padx=6)
            hv.trace_add("write", lambda *_, r=row, v=hv: (setattr(r, "cout_total", parse_float(v.get())), self._mark_manual(), self._refresh_total()))
            ttk.Label(f, text="formule H / G11 × F11", style="Muted.TLabel").grid(row=i, column=3, sticky="w", padx=6)
        else:
            ttk.Label(f, text="–", style="Muted.TLabel").grid(row=i, column=2, sticky="w", padx=6)
            iv = tk.StringVar(value=fmt(row.cout_direct))
            ttk.Entry(f, textvariable=iv, width=12, justify="right").grid(row=i, column=3, sticky="w", padx=6)
            iv.trace_add("write", lambda *_, r=row, v=iv: (setattr(r, "cout_direct", parse_float(v.get())), self._mark_manual(), self._refresh_total()))
        lab = ttk.Label(f, text=fmt(row_amount_etat(row, self.dossier)), font=self.font_bold)  # type: ignore[arg-type]
        lab.grid(row=i, column=4, sticky="e", padx=6)
        self._row_labels.append(lab)

    def _mark_manual(self) -> None:
        if getattr(self, "_loading", False):
            return
        self.rows_manual = True
        self.lbl_rows_state.configure(text="Lignes modifiées à la main — « Recalculer » les régénère depuis les pièces.")

    def _refresh_total(self) -> None:
        d = self.dossier
        if not d:
            return
        for lab, row in zip(self._row_labels, d.rows):
            lab.configure(text=fmt(row_amount_etat(row, d)))
        d.total = compute_total(d)
        self.lbl_total.configure(text=f"CHF {d.total:.2f}")
        if not self.rows_manual:
            self.lbl_rows_state.configure(text="Lignes calculées automatiquement depuis les pièces retenues.")

    # ------------------------------------------------------------ callbacks des champs
    def _on_dossier_field(self, key: str, value: str) -> None:
        if not self.dossier or getattr(self, "_loading", False):
            return
        if key == "budget":
            self.dossier.budget = parse_float(value)
        elif key in DATE_FIELDS:
            setattr(self.dossier, key, value.strip() or None)
        else:
            setattr(self.dossier, key, value.strip())

    def _on_type_change(self, code: str) -> None:
        if not self.dossier:
            return
        self.dossier.type_activite = code  # type: ignore[assignment]
        self.refresh_pieces_tab()
        self.schedule_recompute()

    def _on_effectif(self, key: str, value: str) -> None:
        if not self.dossier or getattr(self, "_loading", False):
            return
        setattr(self.dossier.effectifs, key, parse_int(value))
        self._refresh_effcalc()
        self.schedule_recompute()

    def _on_taux(self, value: str) -> None:
        if not self.dossier or getattr(self, "_loading", False):
            return
        self.dossier.taux_eur_chf = parse_float(value)
        self.schedule_recompute()

    def on_piece_changed(self) -> None:
        self.lbl_pieces.configure(text=self._pieces_title())
        self._refresh_eur_visibility()
        self.schedule_recompute()

    # ------------------------------------------------------------ images
    def page_image(self, number: int) -> Optional[Image.Image]:
        d = self.dossier
        if not d:
            return None
        page = next((p for p in d.pages if p.number == number), None)
        if not page or not page.image:
            return None
        if page.image not in self._page_images:
            try:
                self._page_images[page.image] = Image.open(page.image).convert("RGB")
            except OSError:
                return None
        return self._page_images[page.image]

    def thumbnail(self, piece: Piece) -> Optional[ImageTk.PhotoImage]:
        img = self.page_image(piece.page)
        if img is None:
            return None
        x0, y0, x1, y1 = piece.bbox
        pad = 14
        crop = img.crop((int(max(0, x0 - pad)), int(max(0, y0 - pad)), int(min(img.width, x1 + pad)), int(min(img.height, y1 + pad))))
        crop.thumbnail(THUMB, Image.LANCZOS)
        canvas = Image.new("RGB", THUMB, "#e9edf0")
        canvas.paste(crop, ((THUMB[0] - crop.width) // 2, 0))
        photo = ImageTk.PhotoImage(canvas)
        self._thumbs.append(photo)
        return photo

    def open_viewer(self, piece: Optional[Piece]) -> None:
        if self.dossier:
            PageViewer(self, piece)

    def pick_date(self, var: tk.StringVar, title: str) -> None:
        DatePicker(self, parse_date_str(var.get()), lambda d: var.set(d.strftime("%d.%m.%Y")), title)

    # ------------------------------------------------------------ erreurs
    def _tk_error(self, exc, val, tb) -> None:  # noqa: ANN001
        log.error("erreur interface", exc_info=(exc, val, tb))
        messagebox.showerror("Erreur", f"{val}\n\nDétails dans le fichier decompte.log du dossier data/.")


# ---------------------------------------------------------------------------
# Carte d'une pièce
# ---------------------------------------------------------------------------


class PieceCard(ttk.Frame):
    def __init__(self, master, app: App, piece: Piece):
        super().__init__(master, style="Card.TFrame", padding=10)
        self.app = app
        self.piece = piece
        self._build()

    def _build(self) -> None:
        p, app = self.piece, self.app
        left = ttk.Frame(self, style="Card.TFrame")
        left.grid(row=0, column=0, sticky="n", padx=(0, 12))
        photo = app.thumbnail(p)
        if photo is None:
            # sans image, Tkinter compte width/height en CARACTÈRES et en LIGNES : la vignette de
            # remplacement mesurait 230 caractères sur 170 lignes et disloquait l'onglet des pièces
            thumb = tk.Label(left, text="(aperçu indisponible)", bd=1, relief="solid", cursor="hand2", bg="#e9edf0", width=26, height=9)
        else:
            thumb = tk.Label(left, image=photo, bd=1, relief="solid", cursor="hand2", bg="#e9edf0", width=THUMB[0], height=THUMB[1])
        thumb.pack()
        thumb.bind("<Button-1>", lambda e: app.open_viewer(p))
        cap = ttk.Frame(left, style="Card.TFrame")
        cap.pack(fill="x")
        ttk.Label(cap, text=f"page {p.page}", style="CardMuted.TLabel").pack(side="left")
        link = ttk.Label(cap, text="voir la page", style="Link.TLabel", cursor="hand2")
        link.pack(side="right")
        link.bind("<Button-1>", lambda e: app.open_viewer(p))

        body = ttk.Frame(self, style="Card.TFrame")
        body.grid(row=0, column=1, sticky="nwe")
        self.columnconfigure(1, weight=1)

        head = ttk.Frame(body, style="Card.TFrame")
        head.pack(fill="x", pady=(0, 6))
        ttk.Label(head, text="Pièce", font=app.font_title, style="Card.TLabel").pack(side="left")
        self.num_var = tk.StringVar(value=p.numero or str(p.id))
        ttk.Entry(head, textvariable=self.num_var, width=6, font=app.font_bold).pack(side="left", padx=(6, 10))
        self.num_var.trace_add("write", lambda *_: (setattr(p, "numero", self.num_var.get().strip() or str(p.id)), app.on_piece_changed()))
        Combo(head, KINDS, p.kind, self._on_kind, width=22).pack(side="left")
        self.inc_var = tk.BooleanVar(value=p.include)
        ttk.Checkbutton(head, text="Retenir cette pièce", variable=self.inc_var, command=self._on_include, style="TCheckbutton").pack(side="left", padx=16)
        ttk.Button(head, text="Supprimer", command=lambda: app.remove_piece(self)).pack(side="right")

        fields = ttk.Frame(body, style="Card.TFrame")
        fields.pack(fill="x")
        self._entry(fields, 0, "Fournisseur", "vendor", width=30)
        self._entry(fields, 1, "Date", "date", width=12)
        ttk.Label(fields, text="Devise", style="CardMuted.TLabel").grid(row=0, column=2, sticky="w", padx=(0, 10))
        Combo(fields, CURRENCIES, p.currency or "CHF", self._on_currency, width=6).grid(row=1, column=2, sticky="w", padx=(0, 10), pady=(0, 6))
        self._entry(fields, 3, "Total de la pièce", "total", width=12, numeric=True)
        rubs = OrderedDict((r, r) for r in rubriques_for(app.dossier.type_activite if app.dossier else "course"))
        ttk.Label(fields, text="Rubrique Excel", style="CardMuted.TLabel").grid(row=2, column=0, sticky="w", padx=(0, 10))
        Combo(fields, rubs, p.rubrique if p.rubrique in rubs else "Autre", lambda c: (setattr(p, "rubrique", c), app.on_piece_changed()), width=16).grid(row=3, column=0, sticky="w", padx=(0, 10), pady=(0, 6))
        ttk.Label(fields, text="Mode de calcul", style="CardMuted.TLabel").grid(row=2, column=1, columnspan=3, sticky="w")
        self.mode_combo = Combo(fields, MODES, p.mode, lambda c: (setattr(p, "mode", c), app.on_piece_changed()), width=32)
        self.mode_combo.grid(row=3, column=1, columnspan=3, sticky="w", pady=(0, 6))
        self.eur_fields = ttk.Frame(body, style="Card.TFrame")
        self.eur_fields.pack(fill="x")
        self._entry(self.eur_fields, 0, "Montant CHF imprimé sur la pièce (si présent)", "total_chf", width=12, numeric=True)
        self._entry(self.eur_fields, 1, "Taux EUR→CHF sur la pièce", "rate", width=10, numeric=True)
        if p.currency != "EUR":
            self.eur_fields.pack_forget()

        self.fares_frame = ttk.Frame(body, style="Card.TFrame")
        self.fares_frame.pack(fill="x", pady=(4, 0))
        self._build_fares()

        self.notes = ttk.Frame(body, style="Card.TFrame")
        self.notes.pack(fill="x", pady=(6, 0))
        self.refresh_notes()

    def _entry(self, master, col: int, label: str, attr: str, width: int, numeric: bool = False) -> None:
        p, app = self.piece, self.app
        ttk.Label(master, text=label, style="CardMuted.TLabel").grid(row=0, column=col, sticky="w", padx=(0, 10))
        val = getattr(p, attr)
        var = tk.StringVar(value=fmt(val) if numeric else ("" if val is None else str(val)))
        ttk.Entry(master, textvariable=var, width=width).grid(row=1, column=col, sticky="w", padx=(0, 10), pady=(0, 6))

        def on_write(*_):
            v = var.get()
            setattr(p, attr, parse_float(v) if numeric else (v.strip() or None if attr == "date" else v.strip()))
            app.on_piece_changed()

        var.trace_add("write", on_write)

    def _build_fares(self) -> None:
        for w in self.fares_frame.winfo_children():
            w.destroy()
        p, app = self.piece, self.app
        f = self.fares_frame
        if p.fares:
            ttk.Label(f, text="Tarifs par personne lus sur la pièce (saisie directe : jusqu'à N titrés tarifs adultes, plein tarif d'abord)", style="CardMuted.TLabel").grid(row=0, column=0, columnspan=5, sticky="w", pady=(0, 2))
            for i, h in enumerate(["Qté", "Catégorie", "Prix unitaire", "Libellé lu", ""]):
                ttk.Label(f, text=h, style="CardMuted.TLabel").grid(row=1, column=i, sticky="w", padx=(0, 8))
        else:
            ttk.Label(f, text="Aucun tarif par personne lu → montant global (règle de trois), ou ajoutez les tarifs :", style="CardMuted.TLabel").grid(row=0, column=0, columnspan=5, sticky="w")
        for i, fare in enumerate(p.fares, start=2):
            qv = tk.StringVar(value=str(fare.qty))
            ttk.Spinbox(f, from_=0, to=999, textvariable=qv, width=5).grid(row=i, column=0, sticky="w", padx=(0, 8), pady=1)
            qv.trace_add("write", lambda *_, fl=fare, v=qv: (setattr(fl, "qty", parse_int(v.get())), app.on_piece_changed()))
            Combo(f, CATS, fare.category, lambda c, fl=fare: (setattr(fl, "category", c), app.on_piece_changed()), width=20).grid(row=i, column=1, sticky="w", padx=(0, 8), pady=1)
            pv = tk.StringVar(value=fmt(fare.unit_price))
            ttk.Entry(f, textvariable=pv, width=9, justify="right").grid(row=i, column=2, sticky="w", padx=(0, 8), pady=1)
            pv.trace_add("write", lambda *_, fl=fare, v=pv: (setattr(fl, "unit_price", parse_float(v.get()) or 0.0), app.on_piece_changed()))
            lv = tk.StringVar(value=fare.label)
            ttk.Entry(f, textvariable=lv, width=46).grid(row=i, column=3, sticky="we", padx=(0, 8), pady=1)
            lv.trace_add("write", lambda *_, fl=fare, v=lv: setattr(fl, "label", v.get()))
            ttk.Button(f, text="✕", width=3, command=lambda fl=fare: self._remove_fare(fl)).grid(row=i, column=4, sticky="w", pady=1)
        ttk.Button(f, text="+ Ajouter un tarif", command=self._add_fare).grid(row=len(p.fares) + 2, column=0, columnspan=2, sticky="w", pady=(4, 0))

    def _add_fare(self) -> None:
        p = self.piece
        p.fares.append(FareLine(label="Adulte", category="plein", qty=1, unit_price=0.0, currency=p.currency or "CHF"))
        p.mode = "direct"
        # la liste « Mode de calcul » doit le dire : elle affichait encore « Règle de trois »
        # pendant que la pièce ne comptait plus que le tarif à 0.00 qui vient d'être ajouté
        if getattr(self, "mode_combo", None) is not None:
            self.mode_combo.set_code("direct")
        self._build_fares()
        self.app.on_piece_changed()

    def _remove_fare(self, fare: FareLine) -> None:
        self.piece.fares = [f for f in self.piece.fares if f is not fare]
        self._build_fares()
        self.app.on_piece_changed()

    def _on_kind(self, code: str) -> None:
        p = self.piece
        p.kind = code  # type: ignore[assignment]
        if code in NON_REMB:
            p.include = False
            p.exclusion_reason = NON_REMB[code]
        elif p.exclusion_reason in NON_REMB.values():
            p.include = True
            p.exclusion_reason = None
        self.inc_var.set(p.include)
        self.refresh_notes()
        self.app.on_piece_changed()

    def _on_include(self) -> None:
        p = self.piece
        p.include = bool(self.inc_var.get())
        if p.include:
            p.exclusion_reason = None
        self.refresh_notes()
        self.app.on_piece_changed()

    def _on_currency(self, code: str) -> None:
        self.piece.currency = code  # type: ignore[assignment]
        for fl in self.piece.fares:
            fl.currency = code  # type: ignore[assignment]
        if code == "EUR":
            self.eur_fields.pack(fill="x", before=self.fares_frame)
        else:
            self.eur_fields.pack_forget()
        self.app.on_piece_changed()

    def refresh_notes(self) -> None:
        for w in self.notes.winfo_children():
            w.destroy()
        p = self.piece
        if not p.include and p.exclusion_reason:
            ttk.Label(self.notes, text=f"Exclue : {p.exclusion_reason}", style="CardBad.TLabel", wraplength=900, justify="left").pack(anchor="w")
        for n in p.notes:
            ttk.Label(self.notes, text=f"• {n}", style="CardMuted.TLabel", wraplength=900, justify="left").pack(anchor="w")


# ---------------------------------------------------------------------------
# Calendrier
# ---------------------------------------------------------------------------

MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


class DatePicker(tk.Toplevel):
    """Petit calendrier pour choisir une date (lundi → dimanche)."""

    def __init__(self, master, initial: Optional[dt.date], on_pick: Callable[[dt.date], None], title: str = "Choisir une date"):
        super().__init__(master)
        self.title(title)
        self.transient(master)
        self.resizable(False, False)
        self.on_pick = on_pick
        self.selected = initial
        base = initial or dt.date.today()
        self.year, self.month = base.year, base.month
        head = ttk.Frame(self, padding=(8, 8, 8, 4))
        head.pack(fill="x")
        ttk.Button(head, text="◀", width=3, command=lambda: self._shift(-1)).pack(side="left")
        self.lbl = ttk.Label(head, text="", font=master.font_bold, anchor="center")
        self.lbl.pack(side="left", fill="x", expand=True)
        ttk.Button(head, text="▶", width=3, command=lambda: self._shift(1)).pack(side="right")
        self.grid_frame = ttk.Frame(self, padding=(8, 0, 8, 4))
        self.grid_frame.pack()
        foot = ttk.Frame(self, padding=(8, 4, 8, 8))
        foot.pack(fill="x")
        ttk.Button(foot, text="Aujourd'hui", command=lambda: self._pick(dt.date.today())).pack(side="left")
        ttk.Button(foot, text="Annuler", command=self.destroy).pack(side="right")
        self._render()
        self.update_idletasks()
        x = master.winfo_pointerx() - 40
        y = master.winfo_pointery() + 12
        self.geometry(f"+{max(0, x)}+{max(0, y)}")
        self.bind("<Escape>", lambda e: self.destroy())
        self.grab_set()

    def _shift(self, delta: int) -> None:
        m = self.month + delta
        if m < 1:
            self.month, self.year = 12, self.year - 1
        elif m > 12:
            self.month, self.year = 1, self.year + 1
        else:
            self.month = m
        self._render()

    def _render(self) -> None:
        for w in self.grid_frame.winfo_children():
            w.destroy()
        self.lbl.configure(text=f"{MONTHS_FR[self.month - 1]} {self.year}")
        for i, d in enumerate(["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"]):
            ttk.Label(self.grid_frame, text=d, style="Muted.TLabel", anchor="center", width=4).grid(row=0, column=i)
        today = dt.date.today()
        for r, week in enumerate(calendar.monthcalendar(self.year, self.month), start=1):
            for c, day in enumerate(week):
                if day == 0:
                    continue
                date = dt.date(self.year, self.month, day)
                text = f"[{day}]" if date == self.selected else (f"·{day}" if date == today else str(day))
                ttk.Button(self.grid_frame, text=text, width=4, command=lambda d=date: self._pick(d)).grid(row=r, column=c, padx=1, pady=1)

    def _pick(self, date: dt.date) -> None:
        self.on_pick(date)
        self.destroy()


# ---------------------------------------------------------------------------
# Visionneuse de page
# ---------------------------------------------------------------------------


class PageViewer(tk.Toplevel):
    def __init__(self, app: App, piece: Optional[Piece]):
        super().__init__(app)
        self.app = app
        self.piece = piece
        self.page_no = piece.page if piece else 1
        self.zoom = 1.0
        self.title("Page")
        self.geometry("1200x860")
        self.transient(app)
        bar = ttk.Frame(self, padding=(10, 6))
        bar.pack(fill="x")
        self.lbl = ttk.Label(bar, text="", font=app.font_bold)
        self.lbl.pack(side="left")
        ttk.Button(bar, text="Fermer ✕", command=self.destroy).pack(side="right")
        ttk.Button(bar, text="Page suiv. ▶", command=lambda: self.go(1)).pack(side="right", padx=4)
        ttk.Button(bar, text="◀ Page préc.", command=lambda: self.go(-1)).pack(side="right", padx=4)
        ttk.Button(bar, text="Zoom +", command=lambda: self.set_zoom(self.zoom * 1.25)).pack(side="right", padx=4)
        ttk.Button(bar, text="Zoom −", command=lambda: self.set_zoom(self.zoom / 1.25)).pack(side="right", padx=4)
        paned = ttk.PanedWindow(self, orient="horizontal")
        paned.pack(fill="both", expand=True)
        left = ttk.Frame(paned)
        self.canvas = tk.Canvas(left, bg="#dddddd", highlightthickness=0)
        vs = ttk.Scrollbar(left, orient="vertical", command=self.canvas.yview)
        hs = ttk.Scrollbar(left, orient="horizontal", command=self.canvas.xview)
        self.canvas.configure(yscrollcommand=vs.set, xscrollcommand=hs.set)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        vs.grid(row=0, column=1, sticky="ns")
        hs.grid(row=1, column=0, sticky="we")
        left.rowconfigure(0, weight=1)
        left.columnconfigure(0, weight=1)
        paned.add(left, weight=4)
        right = ttk.Frame(paned, padding=6)
        ttk.Label(right, text="Texte lu (OCR)", style="Muted.TLabel").pack(anchor="w")
        self.text = tk.Text(right, wrap="word", width=42, font=("Consolas" if sys.platform.startswith("win") else "TkFixedFont", 9))
        self.text.pack(fill="both", expand=True)
        paned.add(right, weight=1)
        self.canvas.bind("<MouseWheel>", lambda e: self.canvas.yview_scroll(int(-e.delta / 40), "units"))
        self.canvas.bind("<Button-4>", lambda e: self.canvas.yview_scroll(-3, "units"))
        self.canvas.bind("<Button-5>", lambda e: self.canvas.yview_scroll(3, "units"))
        self.bind("<Escape>", lambda e: self.destroy())
        self.after(50, self.fit_and_show)

    def fit_and_show(self) -> None:
        img = self.app.page_image(self.page_no)
        if img is not None:
            avail = max(400, self.canvas.winfo_width() - 20)
            self.zoom = avail / img.width
        self.show()

    def set_zoom(self, z: float) -> None:
        self.zoom = max(0.1, min(3.0, z))
        self.show()

    def go(self, delta: int) -> None:
        d = self.app.dossier
        if not d:
            return
        self.page_no = max(1, min(len(d.pages), self.page_no + delta))
        self.show()

    def show(self) -> None:
        d = self.app.dossier
        if not d:
            return
        page = next((p for p in d.pages if p.number == self.page_no), None)
        kind = {"form": " — formulaire", "decompte": " — décompte DGEO joint", "empty": " — page vide"}.get(page.kind if page else "", "")
        extra = f" — pièce {self.piece.numero}" if self.piece and self.piece.page == self.page_no else ""
        self.lbl.configure(text=f"Page {self.page_no} / {len(d.pages)}{kind}{extra}")
        self.canvas.delete("all")
        img = self.app.page_image(self.page_no)
        if img is None:
            return
        w, h = int(img.width * self.zoom), int(img.height * self.zoom)
        self._photo = ImageTk.PhotoImage(img.resize((w, h), Image.LANCZOS if self.zoom < 1 else Image.BILINEAR))
        self.canvas.create_image(0, 0, anchor="nw", image=self._photo)
        self.canvas.configure(scrollregion=(0, 0, w, h))
        if self.piece and self.piece.page == self.page_no:
            x0, y0, x1, y1 = [v * self.zoom for v in self.piece.bbox]
            self.canvas.create_rectangle(x0 - 6, y0 - 6, x1 + 6, y1 + 6, outline="#e53935", width=3)
            self.canvas.yview_moveto(max(0.0, (y0 - 40) / h))
        self.text.configure(state="normal")
        self.text.delete("1.0", "end")
        self.text.insert("1.0", self.piece.text if self.piece and self.piece.page == self.page_no else "")
        self.text.configure(state="disabled")


def main(argv: list[str] | None = None) -> None:
    if sys.platform.startswith("win"):
        try:
            import ctypes

            ctypes.windll.shcore.SetProcessDpiAwareness(1)  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001
            pass
    if not logging.getLogger().handlers:
        from .entry import setup_logging

        setup_logging(DATA_DIR)
    app = App(argv)
    app.update_idletasks()
    log.info("interface démarrée (fenêtre affichée) — version %s", __version__)
    app.mainloop()
