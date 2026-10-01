#!/usr/bin/env python3
"""Contrôle indépendant du balisage d'un PDF (pikepdf, qui n'est pas notre code).

    python3 verifier-balisage.py fichier.pdf     -> JSON sur la sortie, code 0 si l'arbre est cohérent

Ce que l'on vérifie, sans rien croire de ce que le logiciel dit de lui-même :
  - le document se déclare balisé (MarkInfo/Marked), porte /Lang, une racine de structure ;
  - chaque feuille de l'arbre (MCID) existe dans le flux de contenu de sa page, dans une séquence BDC ;
  - chaque séquence de contenu à MCID du flux appartient à un élément de l'arbre (aucune orpheline) ;
  - la table des renvois (ParentTree) donne, pour chaque page, le bon élément pour chaque MCID ;
  - les séquences BDC/EMC du flux sont équilibrées ; les artefacts ne portent pas de MCID.
"""
import json, sys
import pikepdf
from pikepdf import Name, Pdf, parse_content_stream

def principal(chemin):
    pdf = Pdf.open(chemin)
    rapport = {'balise': False, 'langue': None, 'titre': None, 'roles': {}, 'elements': 0, 'erreurs': [], 'pages': len(pdf.pages), 'artefacts': 0}
    racine = pdf.Root
    marque = racine.get('/MarkInfo')
    struct = racine.get('/StructTreeRoot')
    rapport['balise'] = bool(marque is not None and bool(marque.get('/Marked', False)) and struct is not None)
    rapport['langue'] = str(racine.get('/Lang')) if '/Lang' in racine else None
    try:
        rapport['titre'] = str(pdf.docinfo.get('/Title')) if '/Title' in pdf.docinfo else None
    except Exception:
        pass
    if not rapport['balise']:
        return rapport

    # 1. Les séquences du flux de chaque page.
    par_page = {}   # index de page -> { mcid: étiquette }
    for i, page in enumerate(pdf.pages):
        profondeur = 0
        mcids = {}
        for operandes, op in parse_content_stream(page):
            o = str(op)
            if o in ('BDC', 'BMC'):
                profondeur += 1
                etiquette = str(operandes[0])
                if o == 'BDC' and isinstance(operandes[1], pikepdf.Dictionary) and '/MCID' in operandes[1]:
                    mcid = int(operandes[1]['/MCID'])
                    if etiquette == '/Artifact':
                        rapport['erreurs'].append(f'page {i+1} : un artefact porte un MCID')
                    if mcid in mcids:
                        rapport['erreurs'].append(f'page {i+1} : MCID {mcid} en double dans le flux')
                    mcids[mcid] = etiquette
                if etiquette == '/Artifact':
                    rapport['artefacts'] += 1
            elif o == 'EMC':
                profondeur -= 1
                if profondeur < 0:
                    rapport['erreurs'].append(f'page {i+1} : EMC sans BDC')
                    profondeur = 0
        if profondeur != 0:
            rapport['erreurs'].append(f'page {i+1} : {profondeur} séquence(s) BDC non fermée(s)')
        par_page[i] = mcids

    # 2. L'arbre : chaque MCID cité existe, une seule fois.
    index_page = {p.objgen: i for i, p in enumerate(pdf.pages)}
    cites = {}   # (page, mcid) -> objgen de l'élément
    vus = set()
    def visiter(elem, parent_gen=None):
        gen = elem.objgen
        if gen in vus:
            rapport['erreurs'].append(f'élément {gen} visité deux fois')
            return
        vus.add(gen)
        rapport['elements'] += 1
        role = str(elem.get('/S', ''))
        rapport['roles'][role] = rapport['roles'].get(role, 0) + 1
        if parent_gen is not None and elem.get('/P') is not None and elem['/P'].objgen != parent_gen and parent_gen != 0:
            rapport['erreurs'].append(f'élément {gen} : /P ne désigne pas son parent')
        k = elem.get('/K')
        if k is None:
            return
        liste = list(k) if isinstance(k, pikepdf.Array) else [k]
        for x in liste:
            if isinstance(x, int) or (hasattr(x, 'is_integer') and not isinstance(x, pikepdf.Object)):
                rapport['erreurs'].append(f'élément {gen} : MCID nu (non pris en charge par ce contrôle)')
            elif isinstance(x, pikepdf.Dictionary) and x.get('/Type') == Name.MCR:
                pg = index_page.get(x['/Pg'].objgen)
                mcid = int(x['/MCID'])
                if pg is None:
                    rapport['erreurs'].append(f'élément {gen} : page inconnue')
                elif mcid not in par_page[pg]:
                    rapport['erreurs'].append(f'élément {gen} : MCID {mcid} absent du flux de la page {pg+1}')
                elif (pg, mcid) in cites:
                    rapport['erreurs'].append(f'MCID {mcid} de la page {pg+1} cité deux fois')
                else:
                    cites[(pg, mcid)] = gen
            elif isinstance(x, pikepdf.Dictionary):
                visiter(x, gen)
    k0 = struct.get('/K')
    for e in (list(k0) if isinstance(k0, pikepdf.Array) else [k0]):
        visiter(e, 0)

    # 3. Aucune séquence orpheline.
    for pg, mcids in par_page.items():
        for mcid in mcids:
            if (pg, mcid) not in cites:
                rapport['erreurs'].append(f'page {pg+1} : le MCID {mcid} du flux n\'appartient à aucun élément')

    # 4. La table des renvois.
    nums = struct.get('/ParentTree', {}).get('/Nums', [])
    table = {}
    for j in range(0, len(nums), 2):
        table[int(nums[j])] = nums[j + 1]
    for i, page in enumerate(pdf.pages):
        sp = page.get('/StructParents')
        if not par_page[i]:
            continue
        if sp is None:
            rapport['erreurs'].append(f'page {i+1} : du contenu balisé mais pas de /StructParents')
            continue
        entree = table.get(int(sp))
        if entree is None:
            rapport['erreurs'].append(f'page {i+1} : /StructParents {int(sp)} absent de la table')
            continue
        for mcid in par_page[i]:
            try:
                e = entree[mcid]
            except Exception:
                rapport['erreurs'].append(f'page {i+1} : MCID {mcid} absent de la table des renvois')
                continue
            if (i, mcid) in cites and e.objgen != cites[(i, mcid)]:
                rapport['erreurs'].append(f'page {i+1} : la table des renvois désigne le mauvais élément pour le MCID {mcid}')
    return rapport

if __name__ == '__main__':
    r = principal(sys.argv[1])
    print(json.dumps(r, ensure_ascii=False))
    sys.exit(1 if r['erreurs'] else 0)
