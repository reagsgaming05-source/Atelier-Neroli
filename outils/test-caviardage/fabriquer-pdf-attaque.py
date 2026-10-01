# -*- coding: utf-8 -*-
"""Fabrique les PDF d'attaque du chapitre 15. Noms inventes."""
import os, zlib, io
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pdf')
os.makedirs(D, exist_ok=True)

def build(objs, root, extra_trailer='', version='1.7'):
    """objs: liste de bytes, 1-indexes. root: numero objet catalogue."""
    out = bytearray(('%%PDF-%s\n' % version).encode('latin-1'))
    offs = []
    for i, o in enumerate(objs):
        offs.append(len(out))
        out += ('%d 0 obj\n' % (i+1)).encode('latin-1') + o + b'\nendobj\n'
    xref = len(out)
    out += ('xref\n0 %d\n' % (len(objs)+1)).encode('latin-1')
    out += b'0000000000 65535 f \n'
    for d in offs:
        out += ('%010d 00000 n \n' % d).encode('latin-1')
    out += ('trailer\n<< /Size %d /Root %d 0 R %s>>\nstartxref\n%d\n%%%%EOF\n' % (len(objs)+1, root, extra_trailer, xref)).encode('latin-1')
    return bytes(out)

def stream(dic, data):
    if isinstance(data, str): data = data.encode('latin-1')
    return ('<< %s /Length %d >>\nstream\n' % (dic, len(data))).encode('latin-1') + data + b'\nendstream'

def txt(x, y, s, size=12, font='F1'):
    return 'BT /%s %d Tf 1 0 0 1 %s %s Tm (%s) Tj ET' % (font, size, x, y, s.replace('\\','\\\\').replace('(','\\(').replace(')','\\)'))

HELV = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'

def write(name, data):
    p = os.path.join(D, name)
    open(p, 'wb').write(data)
    print('%-34s %7d octets' % (name, len(data)))
    return p

# ===================================================================== 1
# Metadonnees : /Title /Subject /Keywords /Author + XMP + metadonnees de page
NOM = 'Vasilakis'
xmp = ('<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>'
 '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
 '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">'
 '<dc:title><rdf:Alt><rdf:li xml:lang="x-default">Dossier %s XMPTITRE</rdf:li></rdf:Alt></dc:title>'
 '<dc:creator><rdf:Seq><rdf:li>%s XMPAUTEUR</rdf:li></rdf:Seq></dc:creator>'
 '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>') % (NOM, NOM)
pagemeta = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/">%s METAPAGE</x:xmpmeta><?xpacket end="w"?>' % NOM
objs = [
 b'<< /Type /Catalog /Pages 2 0 R /Metadata 7 0 R >>',                      #1
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',                              #2
 HELV.encode('latin-1'),                                                     #3
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R /Metadata 8 0 R >>', #4
 stream('', txt(70,760,'Decision du Conseil communal')+'\n'+txt(70,720,'Requerant : Kalliope '+NOM)), #5
 ('<< /Title (Dossier %s TITRE) /Author (%s AUTEUR) /Subject (Recours %s SUJET) /Keywords (%s MOTCLE, permis) /Producer (Scanner communal) >>' % (NOM,NOM,NOM,NOM)).encode('latin-1'), #6
 stream('/Type /Metadata /Subtype /XML', xmp),                               #7
 stream('/Type /Metadata /Subtype /XML', pagemeta),                           #8
]
write('01-metadonnees.pdf', build(objs, 1, extra_trailer='/Info 6 0 R '))

# ===================================================================== 2
# Annotations : note collante, FreeText, champ de formulaire (valeur + infobulle),
# piece jointe avec fichier embarque.
piece = 'Note interne : %s PIECEJOINTE' % NOM
objs = [
 b'<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [9 0 R] /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv 3 0 R >> >> >> >>', #1
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',                              #2
 HELV.encode('latin-1'),                                                     #3
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /Helv 3 0 R >> >> /Contents 5 0 R /Annots [6 0 R 7 0 R 9 0 R 10 0 R] >>', #4
 stream('', txt(70,760,'Decision du Conseil communal')+'\n'+txt(70,720,'Requerant : Kalliope '+NOM)), #5
 ('<< /Type /Annot /Subtype /Text /Rect [400 740 420 760] /Contents (Voir dossier %s NOTECOLLANTE) /T (Secretariat) /F 4 >>' % NOM).encode('latin-1'), #6
 ('<< /Type /Annot /Subtype /FreeText /Rect [70 640 400 670] /Contents (Remarque : %s FREETEXT) /DA (/Helv 11 Tf 0 g) /AP << /N 8 0 R >> /F 4 >>' % NOM).encode('latin-1'), #7
 stream('/Type /XObject /Subtype /Form /BBox [0 0 330 30] /Resources << /Font << /Helv 3 0 R >> >>', txt(2,8,'Remarque : %s APPARENCE' % NOM, 11, 'Helv')), #8
 ('<< /Type /Annot /Subtype /Widget /FT /Tx /Rect [70 580 400 605] /T (nom_requerant) /TU (Nom du requerant %s INFOBULLE) /V (%s CHAMP) /DA (/Helv 11 Tf 0 g) /AP << /N 11 0 R >> /F 4 >>' % (NOM,NOM)).encode('latin-1'), #9
 b'<< /Type /Annot /Subtype /FileAttachment /Rect [500 740 515 755] /FS 12 0 R /Contents (piece) /F 4 >>', #10
 stream('/Type /XObject /Subtype /Form /BBox [0 0 330 25] /Resources << /Font << /Helv 3 0 R >> >>', txt(2,7,'%s CHAMP' % NOM, 11, 'Helv')), #11
 b'<< /Type /Filespec /F (note.txt) /UF (note.txt) /EF << /F 13 0 R >> >>',  #12
 stream('/Type /EmbeddedFile /Subtype /text#2Fplain', piece),                #13
]
write('02-annotations.pdf', build(objs, 1))

# ===================================================================== 3
# Signets (table des matieres) citant le nom
objs = [
 b'<< /Type /Catalog /Pages 2 0 R /Outlines 6 0 R /PageMode /UseOutlines >>',#1
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',                              #2
 HELV.encode('latin-1'),                                                     #3
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>', #4
 stream('', txt(70,760,'Decision du Conseil communal')+'\n'+txt(70,720,'Requerant : Kalliope '+NOM)), #5
 b'<< /Type /Outlines /First 7 0 R /Last 7 0 R /Count 1 >>',                #6
 ('<< /Title (1. Recours %s SIGNET) /Parent 6 0 R /Dest [4 0 R /XYZ 0 800 0] >>' % NOM).encode('latin-1'), #7
]
write('03-signets.pdf', build(objs, 1))

# ===================================================================== 4
# Texte hors zone visible : hors page, blanc sur blanc, taille nulle,
# mode de rendu invisible (Tr 3), calque masque (OCG).
flux = '\n'.join([
 txt(70,760,'Decision du Conseil communal'),
 txt(70,720,'Requerant : Kalliope '+NOM),
 # hors de la page (x = -4000)
 'BT /F1 12 Tf 1 0 0 1 -4000 400 Tm (%s HORSPAGE) Tj ET' % NOM,
 # blanc sur blanc
 'q 1 1 1 rg BT /F1 12 Tf 1 0 0 1 70 660 Tm (%s BLANCSURBLANC) Tj ET Q' % NOM,
 # taille nulle
 'BT /F1 0 Tf 1 0 0 1 70 640 Tm (%s TAILLENULLE) Tj ET' % NOM,
 # mode de rendu invisible
 'BT 3 Tr /F1 12 Tf 1 0 0 1 70 620 Tm (%s INVISIBLETR3) Tj ET' % NOM,
 # calque masque
 '/OC /MC0 BDC BT /F1 12 Tf 1 0 0 1 70 600 Tm (%s CALQUEMASQUE) Tj ET EMC' % NOM,
])
objs = [
 b'<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [6 0 R] /D << /OFF [6 0 R] /Order [6 0 R] >> >> >>', #1
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',                              #2
 HELV.encode('latin-1'),                                                     #3
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> /Properties << /MC0 6 0 R >> >> /Contents 5 0 R >>', #4
 stream('', flux),                                                           #5
 b'<< /Type /OCG /Name (Calque cache) >>',                                   #6
]
write('04-invisible.pdf', build(objs, 1))

# ===================================================================== 5
# Texte dans un XObjet de formulaire pose a l'identite (BBox large)
forme = '\n'.join([txt(70,760,'Decision du Conseil communal'),
                   txt(70,720,'Requerant : Kalliope %s' % NOM)])
objs = [
 b'<< /Type /Catalog /Pages 2 0 R >>',                                       #1
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',                              #2
 HELV.encode('latin-1'),                                                     #3
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Fm0 6 0 R >> >> /Contents 5 0 R >>', #4
 stream('', 'q 1 0 0 1 0 0 cm /Fm0 Do Q'),                                   #5
 stream('/Type /XObject /Subtype /Form /BBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >>', forme), #6
]
write('05-xobjet-formulaire.pdf', build(objs, 1))

# ===================================================================== 6
# Mise a jour incrementale : l'ancien flux reste dans le fichier, orphelin.
base_objs = [
 b'<< /Type /Catalog /Pages 2 0 R >>',                                       #1
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',                              #2
 HELV.encode('latin-1'),                                                     #3
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>', #4
 stream('', txt(70,760,'Brouillon')+'\n'+txt(70,700,'Requerant : Kalliope %s VERSION1' % NOM)), #5
]
base = build(base_objs, 1)
# mise a jour : objet 6 = nouveau flux, objet 4 reecrit pour le pointer
nouveau = stream('', txt(70,760,'Decision du Conseil communal')+'\n'+txt(70,720,'Requerant : Kalliope %s VERSION2' % NOM))
maj = bytearray(base)
prev = base.rfind(b'startxref')
prevoff = int(base[prev+9:base.rfind(b'%%EOF')].strip())
off6 = len(maj); maj += b'6 0 obj\n' + nouveau + b'\nendobj\n'
newpage = b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 6 0 R >>'
off4 = len(maj); maj += b'4 0 obj\n' + newpage + b'\nendobj\n'
x = len(maj)
maj += b'xref\n0 1\n0000000000 65535 f \n'
maj += ('4 1\n%010d 00000 n \n' % off4).encode('latin-1')
maj += ('6 1\n%010d 00000 n \n' % off6).encode('latin-1')
maj += ('trailer\n<< /Size 7 /Root 1 0 R /Prev %d >>\nstartxref\n%d\n%%%%EOF\n' % (prevoff, x)).encode('latin-1')
write('06-incrementale.pdf', bytes(maj))

# ===================================================================== 7
# Couche de texte OCR invisible sous une image (scan + OCR d'un autre outil)
import struct
def png_gris(w, h, val=200):
    raw = b''.join(b'\x00' + bytes([val])*w for _ in range(h))
    return zlib.compress(raw)
W = H = 200
img = png_gris(W, H, 210)
objs = [
 b'<< /Type /Catalog /Pages 2 0 R >>',                                       #1
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',                              #2
 HELV.encode('latin-1'),                                                     #3
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> /XObject << /Im0 6 0 R >> >> /Contents 5 0 R >>', #4
 stream('', 'q 455 0 0 400 70 400 cm /Im0 Do Q\n'
            + 'BT 3 Tr /F1 12 Tf 1 0 0 1 90 700 Tm (Requerant : Kalliope %s OCRSOUSIMAGE) Tj ET' % NOM
            + '\n' + txt(70,340,'Page scannee ci-dessus.')),                 #5
 stream('/Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode' % (W,H), img.decode('latin-1')), #6
]
write('07-ocr-sous-image.pdf', build(objs, 1))

# ===================================================================== 8
# Recherche partielle : casse, tirets, cesure, nom coupe en deux Tj
flux = '\n'.join([
 txt(70,780,'Mueller'),
 txt(70,756,'MULLER-MAJUSCULES'),
 txt(70,732,'Muller-Dupont'),
 # nom coupe par une cesure en fin de ligne
 txt(70,708,'Le requerant Mul-'),
 txt(70,684,'ler a depose un recours.'),
 # nom ecrit en deux morceaux dans le flux (meme ligne)
 'BT /F1 12 Tf 1 0 0 1 70 660 Tm (Mul) Tj (ler) Tj ET',
 # nom en deux chaines d'un TJ
 'BT /F1 12 Tf 1 0 0 1 70 636 Tm [(Mul) 0 (ler)] TJ ET',
 txt(70,612,'Muller tout simple'),
])
objs = [
 b'<< /Type /Catalog /Pages 2 0 R >>',
 b'<< /Type /Pages /Kids [4 0 R] /Count 1 >>',
 HELV.encode('latin-1'),
 b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
 stream('', flux),
]
write('08-partielle.pdf', build(objs, 1))

print('ok')
