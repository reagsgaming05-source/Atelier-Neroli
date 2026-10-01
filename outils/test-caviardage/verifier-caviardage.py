#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""verifier-caviardage.py <fichier.pdf> <terme> [<terme>...]
Protocole de verification du caviardage : cherche chaque terme sur dix surfaces
distinctes d'un PDF. Code de retour 1 si une seule le trouve.
Dependances : pikepdf, et les binaires pdftotext / qpdf (poppler, qpdf)."""
import sys, re, zlib, subprocess, os, tempfile

SURFACES = ['octets bruts', 'flux decompresses (maison)', 'texte (pdftotext)',
            'tous objets (qpdf --qdf)', 'proprietes (Info)', 'XMP document',
            'XMP de page', 'annotations', 'champs de formulaire', 'signets',
            'pieces jointes', 'noms de police / ToUnicode',
            'objets non references', 'images non dessinees',
            'texte coupe par une cesure']

def flux(data):
    out = []
    for m in re.finditer(rb'stream\r?\n', data):
        a = m.end(); b = data.find(b'endstream', a)
        if b < 0: continue
        bloc = data[a:b]
        try: bloc = zlib.decompress(bloc)
        except Exception: pass
        out.append(bloc)
    return b'\n'.join(out)

def verifier(chemin, termes):
    import pikepdf
    data = open(chemin, 'rb').read()
    res = {s: [] for s in SURFACES}
    def note(s, t): res[s].append(t)
    qdf = b''
    with tempfile.TemporaryDirectory() as d:
        q = os.path.join(d, 'q.pdf')
        try:
            subprocess.run(['qpdf', '--qdf', '--object-streams=disable', chemin, q],
                           capture_output=True, timeout=120)
            qdf = open(q, 'rb').read()
        except Exception: pass
    try:
        txt = subprocess.run(['pdftotext', '-layout', chemin, '-'],
                             capture_output=True, timeout=120).stdout
    except Exception: txt = b''
    fl = flux(data)
    pdf = pikepdf.open(chemin)
    info = ' '.join('%s=%s' % (k, v) for k, v in (pdf.docinfo.items() if pdf.docinfo else []))
    try: xmp = bytes(pdf.Root.Metadata.read_bytes()).decode('utf8', 'replace')
    except Exception: xmp = ''
    xmpp = ''
    for pg in pdf.pages:
        try: xmpp += bytes(pg.Metadata.read_bytes()).decode('utf8', 'replace')
        except Exception: pass
    ann = champs = ''
    for pg in pdf.pages:
        for a in (pg.get('/Annots') or []):
            try:
                ann += repr(dict(a))
                if a.get('/FT') is not None: champs += repr(dict(a))
            except Exception: pass
    try:
        signets = ' '.join(str(o.title) for o in pdf.open_outline().root)
    except Exception: signets = ''
    pj = ''
    for o in pdf.objects:
        try:
            if isinstance(o, pikepdf.Stream) and str(dict(o).get('/Type')) == '/EmbeddedFile':
                pj += bytes(o.read_bytes()).decode('latin-1', 'replace')
        except Exception: pass
    pol = ''
    for o in pdf.objects:
        try:
            d = dict(o)
            if '/BaseFont' in d: pol += str(d['/BaseFont'])
            if isinstance(o, pikepdf.Stream) and '/Subtype' not in d:
                b = bytes(o.read_bytes())
                if b'beginbfchar' in b or b'beginbfrange' in b:
                    pol += b.decode('latin-1', 'replace')
        except Exception: pass
    # objets joignables depuis le catalogue, et images jamais dessinees
    vus = set()
    def parcourir(o, prof=0):
        if prof > 60: return
        try: r = o.objgen
        except Exception: r = None
        # (0,0) = objet direct : il n'a pas d'identite propre, on ne le memorise pas
        if r == (0, 0): r = None
        if r:
            if r in vus: return
            vus.add(r)
        try:
            if isinstance(o, pikepdf.Dictionary) or isinstance(o, pikepdf.Stream):
                for k in o.keys(): parcourir(o[k], prof+1)
            elif isinstance(o, pikepdf.Array):
                for x in o: parcourir(x, prof+1)
        except Exception: pass
    try: parcourir(pdf.Root)
    except Exception: pass
    # l'Info du trailer n'est pas sous le catalogue : ce n'est pas un orphelin
    try: parcourir(pdf.trailer.get('/Info'))
    except Exception: pass
    try: parcourir(pdf.trailer.get('/Encrypt'))
    except Exception: pass
    orphelins = ''
    for o in pdf.objects:
        try:
            if o.objgen in vus: continue
            # /ObjStm et /XRef sont les contenants du fichier, pas du contenu
            if str(dict(o).get('/Type')) in ('/ObjStm', '/XRef'): continue
            orphelins += repr(o)[:4000]
            if isinstance(o, pikepdf.Stream):
                try: orphelins += bytes(o.read_bytes()).decode('latin-1', 'replace')
                except Exception: pass
        except Exception: pass
    dessinees = set()
    for pg in pdf.pages:
        try:
            c = pg.Contents
            blocs = [bytes(x.read_bytes()) for x in c] if isinstance(c, pikepdf.Array) else [bytes(c.read_bytes())]
            s2 = b'\n'.join(blocs).decode('latin-1', 'replace')
            for m in re.finditer(r'/([A-Za-z0-9#_.-]+)\s+Do', s2): dessinees.add(m.group(1))
        except Exception: pass
    img_orph = 0
    for pg in pdf.pages:
        try:
            xo = pg['/Resources']['/XObject']
            for k, v in xo.items():
                if str(dict(v).get('/Subtype')) == '/Image' and k.lstrip('/') not in dessinees: img_orph += 1
        except Exception: pass
    for t in termes:
        tb = t.encode('utf8'); tl = t.encode('latin-1', 'replace')
        if tb in data or tl in data: note('octets bruts', t)
        if tb in fl or tl in fl: note('flux decompresses (maison)', t)
        if tb in txt: note('texte (pdftotext)', t)
        if tb in qdf or tl in qdf: note('tous objets (qpdf --qdf)', t)
        if t in info: note('proprietes (Info)', t)
        if t in xmp: note('XMP document', t)
        if t in xmpp: note('XMP de page', t)
        if t in ann: note('annotations', t)
        if t in champs: note('champs de formulaire', t)
        if t in signets: note('signets', t)
        if t in pj: note('pieces jointes', t)
        if t in pol: note('noms de police / ToUnicode', t)
        if t in orphelins: note('objets non references', t)
        # cesure : « Mul-\nler » ne contient pas « Muller »
        rx = re.compile('-?[\\s\\\\(\\)]*'.join(re.escape(c) for c in t), re.I)
        plat = re.sub(r'[^\x20-\x7e\u00a0-\u024f]+', ' ', (fl + b' ' + txt).decode('latin-1', 'replace'))
        if rx.search(plat) and t not in plat: note('texte coupe par une cesure', t)
    if img_orph: res['images non dessinees'] = ['%d image(s) presente(s) dans le fichier mais dessinee(s) par aucune page' % img_orph]
    return res

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    chemin, termes = sys.argv[1], sys.argv[2:]
    r = verifier(chemin, termes)
    rate = False
    print('%s — %s' % (os.path.basename(chemin), ', '.join('« %s »' % t for t in termes)))
    for s in SURFACES:
        if r[s]:
            rate = True
            print('  FUITE  %-28s %s' % (s, ', '.join(r[s])))
    if not rate: print('  propre sur les %d surfaces' % len(SURFACES))
    sys.exit(1 if rate else 0)
