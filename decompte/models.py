"""Modèles de données partagés entre l'analyse, les règles, l'Excel et l'interface."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Géométrie / OCR
# ---------------------------------------------------------------------------

BBox = tuple[float, float, float, float]  # x0, y0, x1, y1 en pixels de l'image rendue


class Word(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    conf: float = 100.0

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def h(self) -> float:
        return self.y1 - self.y0


class Line(BaseModel):
    """Une ligne de texte reconstruite à partir des mots alignés verticalement."""

    words: list[Word]
    text: str
    x0: float
    y0: float
    x1: float
    y1: float


class Block(BaseModel):
    """Une zone de page (candidate « pièce »)."""

    page: int  # numéro de page, base 1
    bbox: BBox
    lines: list[Line]

    @property
    def text(self) -> str:
        return "\n".join(l.text for l in self.lines)


PageKind = Literal["form", "pieces", "empty"]


class PageData(BaseModel):
    number: int  # base 1
    width: int
    height: int
    rotation: int = 0  # rotation appliquée (degrés, sens horaire) pour redresser la page
    source: Literal["tesseract", "textlayer", "none"] = "none"
    words: list[Word] = Field(default_factory=list)
    image: str = ""  # chemin du JPEG rendu (redressé)
    kind: PageKind = "pieces"


# ---------------------------------------------------------------------------
# Pièces justificatives
# ---------------------------------------------------------------------------

FareCategory = Literal["plein", "demi", "enfant", "invite", "autre"]
Currency = Literal["CHF", "EUR"]
PieceKind = Literal["billet", "facture", "recepisse", "recu_carte", "taux_change", "autre"]
Mode = Literal["direct", "prorata"]

RUBRIQUES_COURSE = ["Transport", "Activité", "Autre"]
RUBRIQUES_CAMP = ["Nourriture", "Hébergement", "Transport", "Activité", "Autre", "Cuisinière"]


class FareLine(BaseModel):
    """Une ligne tarifaire par personne (ex. « 3 Prix entier CHF 2.80 »)."""

    label: str
    category: FareCategory = "autre"
    qty: int = 1
    unit_price: float = 0.0
    currency: Currency = "CHF"
    source_line: str = ""

    @property
    def amount(self) -> float:
        return round(self.qty * self.unit_price, 2)


class Piece(BaseModel):
    id: int  # ordre de lecture (1, 2, 3…) — proposé comme n° de pièce
    numero: str = ""  # n° de pièce affiché (modifiable)
    page: int
    bbox: BBox
    kind: PieceKind = "autre"
    vendor: str = ""
    date: Optional[str] = None
    currency: Optional[Currency] = None
    total: Optional[float] = None  # total dans la devise de la pièce
    total_chf: Optional[float] = None  # montant CHF trouvé sur la pièce (si EUR)
    rate: Optional[float] = None  # taux EUR→CHF trouvé sur la pièce
    fares: list[FareLine] = Field(default_factory=list)
    rubrique: str = "Autre"
    mode: Mode = "prorata"
    include: bool = True
    exclusion_reason: Optional[str] = None
    notes: list[str] = Field(default_factory=list)
    text: str = ""

    def adult_fares(self) -> list[FareLine]:
        return [f for f in self.fares if f.category in ("plein", "demi")]


# ---------------------------------------------------------------------------
# Formulaire de couverture
# ---------------------------------------------------------------------------


class Effectifs(BaseModel):
    eleves: int = 0
    enseignants_dgeo: int = 0
    enseignants_js: int = 0
    moniteurs_js: int = 0
    autres: int = 0

    @property
    def titres(self) -> int:
        """Accompagnants titrés (part État) = enseignants DGEO + enseignants J&S."""
        return self.enseignants_dgeo + self.enseignants_js

    @property
    def non_titres(self) -> int:
        return self.moniteurs_js + self.autres

    @property
    def total(self) -> int:
        return self.eleves + self.titres + self.non_titres


class FormExpense(BaseModel):
    categorie: str = ""
    descriptif: str = ""
    pieces: str = ""
    paye_enseignant: Optional[float] = None
    paye_commune: Optional[float] = None
    cout_total: Optional[float] = None


# ---------------------------------------------------------------------------
# Lignes du décompte Excel
# ---------------------------------------------------------------------------


class DecompteRow(BaseModel):
    rubrique: str
    libelle: str
    mode: Mode
    cout_total: Optional[float] = None  # colonne H (règle de 3)
    cout_direct: Optional[float] = None  # colonne I (saisie directe)
    pieces: list[int] = Field(default_factory=list)


class Dossier(BaseModel):
    id: str
    filename: str = ""
    numero: str = ""
    type_activite: Literal["course", "camp"] = "course"
    type_activite_texte: str = ""
    activite: str = ""
    classe: str = ""
    enseignant: str = ""
    telephone: str = ""
    date_debut: Optional[str] = None  # jj.mm.aaaa
    date_fin: Optional[str] = None
    budget: Optional[float] = None
    effectifs: Effectifs = Field(default_factory=Effectifs)
    noms_enseignants: list[str] = Field(default_factory=list)
    noms_accompagnants: list[str] = Field(default_factory=list)
    form_expenses: list[FormExpense] = Field(default_factory=list)
    form_total: Optional[float] = None
    taux_eur_chf: Optional[float] = None
    pages: list[PageData] = Field(default_factory=list)
    pieces: list[Piece] = Field(default_factory=list)
    rows: list[DecompteRow] = Field(default_factory=list)
    total: float = 0.0
    warnings: list[str] = Field(default_factory=list)
    ocr_engine: str = ""
