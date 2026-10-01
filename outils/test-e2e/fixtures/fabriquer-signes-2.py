#!/usr/bin/env python3
"""Fabrique les PDF signés de la vérification des signatures (3.2) : d'autres algorithmes,
une chaîne de certificats, une signature ajoutée après une première.

Les clés et certificats sont jetables : créés ici, utilisés pour signer, détruits. Seuls les
PDF signés sont gardés dans le dépôt — jamais de clé privée.

    python3 -m venv /tmp/v && /tmp/v/bin/pip install pyhanko
    /tmp/v/bin/python fabriquer-signes-2.py
"""
import os, subprocess, tempfile
from pyhanko.sign import signers
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.fields import SigFieldSpec, append_signature_field

ICI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ICI, '..', '..', 'test-caviardage', 'pdf', '12-ordinaire.pdf')

def openssl(*args):
    subprocess.run(['openssl', *args], check=True, capture_output=True)

def signer_avec(nom_fichier, signataire, champ='Signature1', ecrire_sur=None, **meta):
    source = ecrire_sur or BASE
    with open(source, 'rb') as f:
        w = IncrementalPdfFileWriter(f)
        sortie = signers.sign_pdf(w, signers.PdfSignatureMetadata(field_name=champ, **meta), signer=signataire)
    with open(os.path.join(ICI, nom_fichier), 'wb') as g:
        g.write(sortie.getvalue())
    print(nom_fichier, os.path.getsize(os.path.join(ICI, nom_fichier)), 'octets')

with tempfile.TemporaryDirectory() as d:
    p = lambda n: os.path.join(d, n)
    # 1. ECDSA P-256, SHA-256, certificat auto-signé
    openssl('ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', p('ec.pem'))
    openssl('req', '-x509', '-new', '-key', p('ec.pem'), '-days', '3650', '-subj', '/CN=Signataire ECDSA d essai (non valide)/O=Essai', '-out', p('ec.crt'))
    signer_avec('signee-ecdsa.pdf', signers.SimpleSigner.load(p('ec.pem'), p('ec.crt'), key_passphrase=None), reason='ECDSA')

    # 2. RSA 3072, SHA-384
    openssl('req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-keyout', p('r3.pem'), '-out', p('r3.crt'), '-days', '3650', '-subj', '/CN=Signataire RSA-3072 d essai (non valide)/O=Essai')
    s384 = signers.SimpleSigner.load(p('r3.pem'), p('r3.crt'), key_passphrase=None)
    signer_avec('signee-sha384.pdf', s384, reason='SHA-384', md_algorithm='sha384')

    # 3. Une chaîne : autorité d'essai -> certificat du signataire (l'autorité n'est dans aucune liste de confiance)
    openssl('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', p('ca.pem'), '-out', p('ca.crt'), '-days', '3650',
            '-subj', '/CN=Autorite d essai (non reconnue)/O=Essai', '-addext', 'basicConstraints=critical,CA:TRUE')
    openssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', p('leaf.pem'), '-out', p('leaf.csr'), '-subj', '/CN=Signataire de la chaine d essai/O=Essai')
    openssl('x509', '-req', '-in', p('leaf.csr'), '-CA', p('ca.crt'), '-CAkey', p('ca.pem'), '-CAcreateserial', '-out', p('leaf.crt'), '-days', '3650')
    chaine = signers.SimpleSigner.load(p('leaf.pem'), p('leaf.crt'), ca_chain_files=(p('ca.crt'),), key_passphrase=None)
    signer_avec('signee-chaine.pdf', chaine, reason='Chaîne')

    # 4. Deux signatures : la seconde couvre la première (aucune modification entre les deux)
    premiere = os.path.join(ICI, 'signee-chaine.pdf')
    openssl('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', p('b.pem'), '-out', p('b.crt'), '-days', '3650', '-subj', '/CN=Second signataire d essai (non valide)/O=Essai')
    second = signers.SimpleSigner.load(p('b.pem'), p('b.crt'), key_passphrase=None)
    signer_avec('signee-deux.pdf', second, champ='Signature2', ecrire_sur=premiere, reason='Seconde signature')
