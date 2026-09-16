"""Règles de calcul de la part à charge de l'État de Vaud.

* Récépissés, reçus de carte et pièces « taux de change » ne sont jamais des pièces
  remboursables (ils servent seulement à retrouver un montant CHF ou un taux).
* Billet avec tarifs par personne → **saisie directe** : pour chaque billet on retient
  au maximum N tarifs adultes (N = accompagnants titrés), d'abord les plein tarifs,
  ensuite les demi-tarifs.
* Facture / montant global (hébergement, hôtel, bus, activité au prix de groupe…) → **règle de
  trois** dans l'Excel : coût total × titrés / total participants (formule du modèle).
* Accompagnants invités (0.00) ou pièce sans tarif adulte → rien à charge de l'État ; si une
  telle pièce est retenue quand même, elle passe par la règle de trois sur son total.
* Chaque ligne de l'Excel porte son coût total (colonne H) et une formule (colonne I) : la
  règle de trois du modèle, ou le détail des tarifs adultes retenus (« =6*2.8+2*2.1 »).
* Pièce en EUR → montant CHF imprimé sur la pièce, sinon taux de change du dossier.
* Le libellé contient toujours le détail du calcul.
"""
from __future__ import annotations

from collections import OrderedDict
from typing import Optional

from .models import (
    RUBRIQUES_CAMP,
    RUBRIQUES_COURSE,
    DecompteRow,
    Dossier,
    FareLine,
    Piece,
)

NON_REMBOURSABLES = {
    "recepisse": "Récépissé (bulletin de versement) : pas une pièce justificative",
    "recu_carte": "Reçu de paiement par carte : seul le ticket fait foi",
    "taux_change": "Pièce « taux de change » : sert uniquement à la conversion",
}


def rubriques_for(type_activite: str) -> list[str]:
    return RUBRIQUES_CAMP if type_activite == "camp" else RUBRIQUES_COURSE


def normalize_rubrique(rubrique: str, type_activite: str) -> str:
    allowed = rubriques_for(type_activite)
    if rubrique in allowed:
        return rubrique
    return "Autre"


# ---------------------------------------------------------------------------
# Proposition initiale (une seule fois, après l'analyse)
# ---------------------------------------------------------------------------


def propose(dossier: Dossier) -> None:
    """Fixe inclusion / mode / rubrique de chaque pièce selon les règles."""
    seen_totals: dict[tuple[str, float], int] = {}
    for p in dossier.pieces:
        p.rubrique = normalize_rubrique(p.rubrique, dossier.type_activite)
        if p.kind in NON_REMBOURSABLES:
            p.include = False
            p.mode = "prorata"
            p.exclusion_reason = NON_REMBOURSABLES[p.kind]
            continue
        adults = p.adult_fares()
        invites = [f for f in p.fares if f.category == "invite"]
        kids = [f for f in p.fares if f.category == "enfant"]
        if adults:
            p.mode = "direct"
            p.include = True
            p.exclusion_reason = None
        elif invites:
            p.mode = "direct"
            p.include = False
            p.exclusion_reason = "Accompagnants invités (0.00) : rien à charge de l'État"
        elif kids:
            # pas de prix adulte connu : si la pièce est retenue malgré tout, règle de trois sur son total
            p.mode = "prorata"
            p.include = False
            p.exclusion_reason = "Aucun tarif adulte lu sur la pièce (seulement des élèves) : à vérifier"
        else:
            p.mode = "prorata"
            if p.total is None:
                p.include = False
                p.exclusion_reason = "Montant total illisible : à saisir ou à exclure"
            else:
                p.include = True
                p.exclusion_reason = None
        # doublons probables (ex. lettre d'accompagnement + facture du même montant)
        if p.include and p.mode == "prorata" and p.total is not None and p.kind in ("facture", "autre"):
            key = (p.currency or "CHF", round(p.total, 2))
            if key in seen_totals:
                p.include = False
                p.exclusion_reason = f"Doublon probable de la pièce {seen_totals[key]} (même montant {p.total:.2f})"
            else:
                seen_totals[key] = p.id
    if dossier.taux_eur_chf is None:
        for p in dossier.pieces:
            if p.rate:
                dossier.taux_eur_chf = p.rate
                break


# ---------------------------------------------------------------------------
# Calcul des lignes (à chaque modification)
# ---------------------------------------------------------------------------


def _fmt(x: float) -> str:
    return f"{x:.2f}"


def _piece_label(numeros: list[str]) -> str:
    if not numeros:
        return ""
    if len(numeros) == 1:
        return f"pce {numeros[0]}"
    ints = []
    for n in numeros:
        try:
            ints.append(int(n))
        except ValueError:
            return "pces " + ", ".join(numeros)
    ints.sort()
    if ints == list(range(ints[0], ints[-1] + 1)) and len(ints) > 2:
        return f"pces {ints[0]}-{ints[-1]}"
    if len(ints) == 2 and ints[1] == ints[0] + 1:
        return f"pces {ints[0]}-{ints[1]}"
    return "pces " + ", ".join(str(i) for i in ints)


def _eur_rate_for(piece: Piece, dossier: Dossier) -> Optional[float]:
    """Taux EUR→CHF applicable à une pièce : implicite (CHF imprimé), sinon pièce, sinon dossier."""
    if piece.currency != "EUR":
        return None
    if piece.total_chf and piece.total:
        return piece.total_chf / piece.total
    if piece.rate:
        return piece.rate
    for other in dossier.pieces:
        # reçu de carte / relevé mentionnant le même montant EUR avec sa contre-valeur CHF
        if other is not piece and other.currency == "EUR" and other.total == piece.total and other.total_chf:
            return other.total_chf / other.total
        if other is not piece and other.kind in ("recu_carte", "taux_change") and other.rate:
            return other.rate
    return dossier.taux_eur_chf


def take_adult_fares(fares: list[FareLine], n_titres: int) -> list[tuple[int, float, str]]:
    """Retient jusqu'à n_titres tarifs adultes : plein tarifs d'abord, puis demi-tarifs.

    Retourne [(quantité retenue, prix unitaire, devise)]."""
    remaining = n_titres
    taken: list[tuple[int, float, str]] = []
    ordered = sorted(fares, key=lambda f: (0 if f.category == "plein" else 1, -f.unit_price))
    for f in ordered:
        if f.category not in ("plein", "demi") or remaining <= 0:
            continue
        q = min(f.qty, remaining)
        if q > 0:
            taken.append((q, f.unit_price, f.currency))
            remaining -= q
    return taken


def compute_rows(dossier: Dossier) -> None:
    n = dossier.effectifs.titres
    warnings = [w for w in dossier.warnings if not w.startswith("[calcul]")]
    if n == 0:
        warnings.append("[calcul] Aucun accompagnant titré : rien n'est à charge de l'État.")
    groups: "OrderedDict[tuple[str, str], dict]" = OrderedDict()
    for p in dossier.pieces:
        if not p.include:
            continue
        rub = normalize_rubrique(p.rubrique, dossier.type_activite)
        key = (rub, p.mode)
        g = groups.setdefault(key, {"numeros": [], "ids": [], "parts": OrderedDict(), "amounts": [], "eur_parts": [], "totals": []})
        rate = _eur_rate_for(p, dossier)
        if p.currency == "EUR" and rate is None:
            warnings.append(f"[calcul] Pièce {p.numero} en EUR sans taux de change : non comptée. Indiquez le taux EUR→CHF.")
            continue
        g["numeros"].append(p.numero or str(p.id))
        g["ids"].append(p.id)
        mode = p.mode
        taken: list[tuple[int, float, str]] = []
        if mode == "direct":
            taken = take_adult_fares(p.fares, n)
            adults_on_ticket = sum(f.qty for f in p.adult_fares())
            if adults_on_ticket > n and n > 0:
                warnings.append(
                    f"[calcul] Pièce {p.numero} : {adults_on_ticket} tarifs adultes sur le billet, {n} titrés retenus."
                )
            if not taken and n > 0:
                # prix adulte inconnu : la pièce passe par la règle de trois sur son total (colonne H + formule)
                if p.total is not None:
                    warnings.append(f"[calcul] Pièce {p.numero} : aucun tarif adulte lisible, règle de trois sur son total ({_fmt(p.total)}).")
                    mode = "prorata"
                else:
                    warnings.append(f"[calcul] Pièce {p.numero} : aucun tarif adulte retenu et total illisible : non comptée.")
        if mode != p.mode:
            g["numeros"].pop(); g["ids"].pop()
            key = (rub, mode)
            g = groups.setdefault(key, {"numeros": [], "ids": [], "parts": OrderedDict(), "amounts": [], "eur_parts": [], "totals": []})
            g["numeros"].append(p.numero or str(p.id))
            g["ids"].append(p.id)
        if mode == "direct":
            for q, unit, cur in taken:
                k = (unit, cur, rate if cur == "EUR" else None)
                g["parts"][k] = g["parts"].get(k, 0) + q
            # coût total des billets (colonne H, à titre d'information : la part État est saisie directement)
            if p.total is not None:
                g["totals"].append(round(p.total * rate, 2) if p.currency == "EUR" else round(p.total, 2))
        else:
            if p.total is None:
                continue
            if p.currency == "EUR":
                chf = round(p.total * rate, 2)
                g["eur_parts"].append((p.numero, p.total, rate, chf, p.total_chf is not None))
                g["amounts"].append(chf)
            else:
                g["amounts"].append(round(p.total, 2))

    rows: list[DecompteRow] = []
    order = rubriques_for(dossier.type_activite)
    for (rub, mode), g in sorted(groups.items(), key=lambda kv: (order.index(kv[0][0]) if kv[0][0] in order else 99, 0 if kv[0][1] == "direct" else 1)):
        if not g["ids"]:
            continue
        label = _piece_label(g["numeros"])
        if mode == "direct":
            terms = []
            total = 0.0
            for (unit, cur, rate), q in g["parts"].items():
                if cur == "EUR":
                    chf = round(q * unit * rate, 2)
                    terms.append(f"{q}*{_fmt(unit)} EUR*{rate:.4f}")
                else:
                    chf = round(q * unit, 2)
                    terms.append(f"{q}*{_fmt(unit)}")
                total += chf
            if not terms:
                continue
            libelle = f"{label} ({' + '.join(terms)})"
            cout_total = round(sum(g["totals"]), 2) if g["totals"] else None
            rows.append(DecompteRow(rubrique=rub, libelle=libelle, mode="direct", cout_total=cout_total, cout_direct=round(total, 2), pieces=g["ids"], formule=" + ".join(terms)))
        else:
            total = round(sum(g["amounts"]), 2)
            detail = ""
            if g["eur_parts"]:
                parts = []
                for numero, eur, rate, chf, printed in g["eur_parts"]:
                    parts.append(f"{_fmt(eur)} EUR = {_fmt(chf)} CHF" if printed else f"{_fmt(eur)} EUR*{rate:.4f} = {_fmt(chf)} CHF")
                others = [a for a in g["amounts"] if a not in [e[3] for e in g["eur_parts"]]]
                parts += [_fmt(a) for a in others]
                detail = f" ({' + '.join(parts)})"
            elif len(g["amounts"]) > 1:
                detail = f" ({' + '.join(_fmt(a) for a in g['amounts'])})"
            rows.append(DecompteRow(rubrique=rub, libelle=f"{label}{detail}", mode="prorata", cout_total=total, pieces=g["ids"]))
    dossier.rows = rows
    dossier.warnings = warnings
    dossier.total = compute_total(dossier)


def row_amount_etat(row: DecompteRow, dossier: Dossier) -> float:
    """Montant à charge de l'État pour une ligne (colonne J), comme l'Excel le calcule."""
    if row.mode == "direct":
        return round(row.cout_direct or 0.0, 2)
    eff = dossier.effectifs
    if eff.total == 0 or row.cout_total is None:
        return 0.0
    return row.cout_total / eff.total * eff.titres


def round_005(x: float) -> float:
    return round(round(x / 0.05) * 0.05, 2)


def compute_total(dossier: Dossier) -> float:
    return round_005(sum(row_amount_etat(r, dossier) for r in dossier.rows))
