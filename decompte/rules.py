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
    ResultatPiece,
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


def numeroter(dossier: Dossier) -> None:
    """Numéros proposés à l'analyse, dans l'ordre de lecture, mais seulement aux justificatifs.

    Un reçu de carte, un récépissé ou une pièce « taux de change » accompagne un ticket et n'a pas
    de numéro à lui sur le papier. Lui en donner un décalait tous les suivants (le kiosque devenait
    4 au lieu de 3), jusque dans les libellés de l'Excel qui servent à retrouver le papier. La
    personne corrige ensuite d'après les numéros écrits sur les tickets."""
    rang = 0
    for p in dossier.pieces:
        if p.kind in NON_REMBOURSABLES:
            p.numero = ""
        else:
            rang += 1
            p.numero = str(rang)


def propose(dossier: Dossier) -> None:
    """Fixe inclusion / mode / rubrique de chaque pièce selon les règles."""
    seen_totals: dict[tuple[str, float], str] = {}
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
        # Deux pièces du même montant. Ce peut être un vrai doublon — une lettre d'accompagnement
        # qui répète le montant de la facture —, mais aussi deux nuitées ou deux repas au même
        # prix : dans une auberge, quatre nuits font quatre fois la même somme. Les écarter d'office
        # faisait disparaître les trois quarts d'un hébergement sans rien dire, et une pièce écartée
        # ne se réclame pas toute seule. On les garde donc toutes, et on le signale : c'est la
        # personne qui tranche, la pièce en main.
        if p.include and p.mode == "prorata" and p.total is not None and p.kind in ("facture", "autre"):
            key = (p.currency or "CHF", round(p.total, 2))
            if key in seen_totals:
                jumelle = seen_totals[key]
                p.notes.append(
                    f"Même montant que le justificatif n° {jumelle} ({p.total:.2f}) : deux nuitées ou deux repas"
                    " au même prix, ou bien la même dépense comptée deux fois — à vérifier."
                )
                dossier.warnings.append(
                    f"Justificatifs n° {jumelle} et n° {p.numero} : même montant ({p.total:.2f}). Les deux sont"
                    " comptés ; décochez-en un s'il s'agit de la même dépense."
                )
            else:
                seen_totals[key] = p.numero
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
    """Numéros des pièces tels qu'on les écrit sur un décompte : « Pce 1 », « Pces 1-3 »."""
    if not numeros:
        return ""
    if len(numeros) == 1:
        return f"Pce {numeros[0]}"
    ints = []
    for n in numeros:
        try:
            ints.append(int(n))
        except ValueError:
            return "Pces " + ", ".join(numeros)
    ints.sort()
    if ints == list(range(ints[0], ints[-1] + 1)) and len(ints) > 2:
        return f"Pces {ints[0]}-{ints[-1]}"
    if len(ints) == 2 and ints[1] == ints[0] + 1:
        return f"Pces {ints[0]}-{ints[1]}"
    return "Pces " + ", ".join(str(i) for i in ints)


def _libelle(detail: str, numeros: list[str]) -> str:
    """Libellé d'une ligne : le détail du calcul, puis les numéros entre parenthèses, « (Pce 1) »
    ou « (Pces 1-3) », comme sur les décomptes établis à la main — c'est par eux qu'on retrouve la
    pièce papier."""
    label = _piece_label(numeros)
    return f"{detail} ({label})" if detail else f"({label})"


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
        # (deux totaux illisibles ne sont pas « le même montant » : sans ce garde-fou, une division
        # par None faisait échouer le recalcul et l'export)
        if (
            other is not piece
            and other.currency == "EUR"
            and other.total
            and piece.total is not None
            and other.total == piece.total
            and other.total_chf
        ):
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


def _ens(n: int) -> str:
    """« 2 enseignant·e·s titré·e·s », « 1 enseignant·e titré·e »."""
    return f"{n} enseignant·e·s titré·e·s" if n > 1 else f"{n} enseignant·e titré·e"


def _pluriel(n: int, mot: str) -> str:
    return f"{n} {mot}s" if n > 1 else f"{n} {mot}"


def _resultat_partage(chf: float, dossier: Dossier, avant: str = "") -> ResultatPiece:
    """Montant global partagé (règle de trois) : montant ÷ total des personnes pendant l'activité ×
    enseignant·e·s titré·e·s. L'Excel le calcule sur la ligne ; ici, pour ce seul justificatif."""
    eff = dossier.effectifs
    if eff.total == 0:
        return ResultatPiece(montant=None, texte=f"{avant}{_fmt(chf)} à partager : remplissez les effectifs (section 2).")
    part = chf / eff.total * eff.titres
    return ResultatPiece(montant=part, texte=f"{avant}{_fmt(chf)} ÷ {_pluriel(eff.total, 'personne')} × {_ens(eff.titres)} = {_fmt(part)}")


def _resultat_direct(taken: list[tuple[int, float, str]], rate: Optional[float], n: int, adultes_billet: int) -> ResultatPiece:
    """Tarifs adultes retenus sur un billet, et ce qui n'est pas pour l'État."""
    termes, montant = [], 0.0
    for q, unit, cur in taken:
        if cur == "EUR":
            termes.append(f"{q} × {_fmt(unit)} EUR × {rate:.4f}")
            montant += round(q * unit * rate, 2)
        else:
            termes.append(f"{q} × {_fmt(unit)}")
            montant += round(q * unit, 2)
    texte = f"{' + '.join(termes)} = {_fmt(montant)} · {_ens(n)}"
    retenus = sum(q for q, _, _ in taken)
    reste = adultes_billet - retenus
    if reste > 1:
        texte += f" ; {reste} autres tarifs adultes du billet ne sont pas pour l'État"
    elif reste == 1:
        texte += " ; 1 autre tarif adulte du billet n'est pas pour l'État"
    elif retenus < n:
        texte += f" ; seulement {_pluriel(retenus, 'tarif adulte')} sur le billet"
    return ResultatPiece(montant=round(montant, 2), texte=texte)


def compute_rows(dossier: Dossier) -> None:
    n = dossier.effectifs.titres
    warnings = [w for w in dossier.warnings if not w.startswith("[calcul]")]
    if n == 0:
        warnings.append("[calcul] Aucun·e enseignant·e titré·e dans les effectifs : rien n'est à la charge de l'État.")
    # Ce que chaque justificatif retenu apporte, en clair. Le « 3 tarifs adultes sur le billet, 2
    # titrés retenus » était un avertissement, affiché en orange dans les effectifs, loin du billet
    # et comme un doute : c'est la règle appliquée normalement, et elle se lit sur le billet.
    resultats: dict[int, ResultatPiece] = {}
    groups: "OrderedDict[tuple[str, str], dict]" = OrderedDict()
    for p in dossier.pieces:
        if not p.include:
            continue
        # Sans numéro (reçu de carte compté malgré tout, justificatif ajouté à la main), « ? » :
        # le rang de lecture interne ne correspond à rien sur le papier, et pouvait même tomber sur
        # le numéro d'un autre justificatif (« Pces 2, 3, 3 »).
        num = p.numero or "?"
        if not p.numero:
            warnings.append("[calcul] Un justificatif compté est sans numéro : écrivez le n° inscrit sur le ticket (section 3).")
        rub = normalize_rubrique(p.rubrique, dossier.type_activite)
        key = (rub, p.mode)
        g = groups.setdefault(key, {"numeros": [], "ids": [], "parts": OrderedDict(), "amounts": [], "chf_parts": [], "eur_parts": [], "totals": []})
        rate = _eur_rate_for(p, dossier)
        if p.currency == "EUR" and rate is None:
            warnings.append(f"[calcul] Justificatif n° {num} en EUR sans taux de change : non compté. Indiquez le taux EUR → CHF (section 2).")
            resultats[p.id] = ResultatPiece(texte="indiquez le taux EUR → CHF (section 2).")
            continue
        g["numeros"].append(num)
        g["ids"].append(p.id)
        mode = p.mode
        taken: list[tuple[int, float, str]] = []
        adults_on_ticket = 0
        if mode == "direct":
            taken = take_adult_fares(p.fares, n)
            adults_on_ticket = sum(f.qty for f in p.adult_fares())
            if not taken and n > 0:
                # prix adulte inconnu : la pièce passe par la règle de trois sur son total (colonne H + formule)
                if p.total is not None:
                    warnings.append(f"[calcul] Justificatif n° {num} : aucun tarif adulte lisible, son total ({_fmt(p.total)}) est partagé en règle de trois.")
                    mode = "prorata"
                else:
                    warnings.append(f"[calcul] Justificatif n° {num} : aucun tarif adulte retenu et total illisible : non compté.")
                    resultats[p.id] = ResultatPiece(texte="aucun tarif adulte lu, et le total est illisible.")
                    # retirée du groupe : sinon son numéro figurait dans le libellé de la ligne
                    # (« Pces 1-2 ») alors qu'elle ne compte pour rien
                    g["numeros"].pop()
                    g["ids"].pop()
                    continue
        if mode != p.mode:
            g["numeros"].pop(); g["ids"].pop()
            key = (rub, mode)
            g = groups.setdefault(key, {"numeros": [], "ids": [], "parts": OrderedDict(), "amounts": [], "chf_parts": [], "eur_parts": [], "totals": []})
            g["numeros"].append(num)
            g["ids"].append(p.id)
        avant = "Aucun tarif adulte lisible, le total est partagé : " if mode != p.mode else ""
        if mode == "direct":
            for q, unit, cur in taken:
                k = (unit, cur, rate if cur == "EUR" else None)
                g["parts"][k] = g["parts"].get(k, 0) + q
            # coût total des billets (colonne H, à titre d'information : la part État est saisie directement)
            if p.total is not None:
                g["totals"].append(round(p.total * rate, 2) if p.currency == "EUR" else round(p.total, 2))
            resultats[p.id] = _resultat_direct(taken, rate, n, adults_on_ticket) if taken else ResultatPiece(montant=0.0, texte=f"{_ens(n)} : rien pour l'État.")
        else:
            if p.total is None:
                warnings.append(f"[calcul] Justificatif n° {num} : total illisible, non compté.")
                resultats[p.id] = ResultatPiece(texte="total illisible, à saisir ci-dessus.")
                g["numeros"].pop()
                g["ids"].pop()
                continue
            if p.currency == "EUR":
                chf = round(p.total * rate, 2)
                g["eur_parts"].append((p.numero, p.total, rate, chf, p.total_chf is not None))
                g["amounts"].append(chf)
                resultats[p.id] = _resultat_partage(chf, dossier, f"{avant}{_fmt(p.total)} EUR = {_fmt(chf)} CHF ; ")
            else:
                g["amounts"].append(round(p.total, 2))
                g["chf_parts"].append(round(p.total, 2))
                resultats[p.id] = _resultat_partage(round(p.total, 2), dossier, avant)

    rows: list[DecompteRow] = []
    order = rubriques_for(dossier.type_activite)
    for (rub, mode), g in sorted(groups.items(), key=lambda kv: (order.index(kv[0][0]) if kv[0][0] in order else 99, 0 if kv[0][1] == "direct" else 1)):
        if not g["ids"]:
            continue
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
            libelle = _libelle(" + ".join(terms), g["numeros"])
            cout_total = round(sum(g["totals"]), 2) if g["totals"] else None
            rows.append(DecompteRow(rubrique=rub, libelle=libelle, mode="direct", cout_total=cout_total, cout_direct=round(total, 2), pieces=g["ids"], formule=" + ".join(terms)))
        else:
            total = round(sum(g["amounts"]), 2)
            detail = ""
            if g["eur_parts"]:
                parts = []
                for numero, eur, rate, chf, printed in g["eur_parts"]:
                    parts.append(f"{_fmt(eur)} EUR = {_fmt(chf)} CHF" if printed else f"{_fmt(eur)} EUR*{rate:.4f} = {_fmt(chf)} CHF")
                # les montants en francs sont listés à part : les repérer par leur valeur ferait
                # disparaître un montant CHF égal par hasard à la contre-valeur d'une pièce en EUR
                parts += [_fmt(a) for a in g["chf_parts"]]
                detail = " + ".join(parts)
            elif len(g["amounts"]) > 1:
                detail = " + ".join(_fmt(a) for a in g["amounts"])
            rows.append(DecompteRow(rubrique=rub, libelle=_libelle(detail, g["numeros"]), mode="prorata", cout_total=total, pieces=g["ids"]))
    dossier.rows = rows
    dossier.resultats = resultats
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
