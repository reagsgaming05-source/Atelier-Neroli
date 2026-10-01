#!/usr/bin/env python3
"""Fabrique les deux PDF signés de la suite (decision-signee.pdf, decision-certifiee.pdf).

La clé et le certificat sont jetables : créés ici, utilisés pour signer, détruits.
Seuls les PDF signés sont gardés dans le dépôt — jamais de clé privée.

    python3 -m venv /tmp/v && /tmp/v/bin/pip install pyhanko
    /tmp/v/bin/python fabriquer-signes.py
"""
import os, subprocess, tempfile, shutil, io
from pyhanko.sign import signers, fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.fields import MDPPerm

ICI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(ICI, '..', '..', 'test-caviardage', 'pdf', '12-ordinaire.pdf')

with tempfile.TemporaryDirectory() as d:
    cle, crt, p12 = (os.path.join(d, n) for n in ('k.pem', 'c.pem', 'c.p12'))
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', cle, '-out', crt,
                    '-days', '3650', '-subj', '/CN=Signataire d essai (non valide)/O=Essai'], check=True, capture_output=True)
    signataire = signers.SimpleSigner.load(cle, crt, key_passphrase=None)
    for nom, certifie in (('decision-signee.pdf', False), ('decision-certifiee.pdf', True)):
        with open(BASE, 'rb') as f:
            w = IncrementalPdfFileWriter(f)
            meta = signers.PdfSignatureMetadata(
                field_name='Signature1', reason='Fixture de test',
                certify=certifie, docmdp_permissions=MDPPerm.NO_CHANGES if certifie else None)
            sortie = signers.sign_pdf(w, meta, signer=signataire)
        with open(os.path.join(ICI, nom), 'wb') as g:
            g.write(sortie.getvalue())
        print(nom, os.path.getsize(os.path.join(ICI, nom)), 'octets')
