# PDF d'essai de « Modifier le texte existant »

Neuf PDF, faits par d'autres logiciels que le nôtre, qui portent tous la même lettre de commune (ou une attestation). **Rien de réel dedans** : les noms, les
adresses, les numéros de téléphone et les montants sont inventés (« Claire Exemple », « Exemple-sur-Lac », « 021 000 00 00 »). Ils servent à
`modifier-texte.spec.js`, qui joue la correction dans l'application puis juge la page avec poppler et qpdf.

Leur intérêt est de ne pas se ressembler dans leur flux : c'est là que la correction se casse.

| Fichier | Fait par | Ce que son flux a de particulier |
| --- | --- | --- |
| `lettre-lo-sans.pdf` | LibreOffice 24.2, d'un .docx en Arial | un affichage par ligne, polices TrueType simples ; justification, puces, tableau, montant en gras au milieu d'une ligne, date calée à droite |
| `attestation-lo.pdf` | LibreOffice 24.2 | titre centré, sous-titre en italique, adresse soulignée, pied de page en petit, un nom en gras dans un paragraphe |
| `lettre-chromium.pdf` | Chromium (« imprimer en PDF ») | une lettre par affichage, matrice renversée, polices Identity-H |
| `lettre-gs.pdf` | Ghostscript (`gs -sDEVICE=pdfwrite`, depuis `lettre-lo-sans.pdf`) | une ligne de tableau entière dans un seul TJ, avec des écarts de plusieurs centaines de points entre les cellules |
| `lettre-cairo.pdf` | Poppler (`pdftocairo -pdf`, depuis `lettre-lo-sans.pdf`) | polices Identity-H, crénage par mot |
| `lettre-reportlab.pdf` | reportlab, polices TrueType Liberation | un autre ordre d'écriture des lignes |
| `lettre-rot90-droit.pdf` | `lettre-lo-sans.pdf`, contenu tourné et page marquée `/Rotate 90` | page enregistrée en paysage, affichée droite |
| `lettre-rot90.pdf` | `lettre-lo-sans.pdf`, page marquée `/Rotate 90` sans toucher au contenu | texte couché à l'écran : l'outil doit le dire |
| `scan-ocr.pdf` | la page de `lettre-lo-sans.pdf` rendue en image à 150 ppp, avec un texte invisible (mode de rendu 3) par-dessus, comme un scan reconnu par OCR | ce qu'on lit est l'image ; le texte qu'on corrigerait « dans le flux » est caché |

Pour en refaire un : un .docx fait avec python-docx (le texte de la lettre se relit dans les fichiers),
`soffice --headless --convert-to pdf`, puis les transformations de la colonne « Fait par ». Les fichiers sont gardés tels quels dans le dépôt :
c'est leur flux, octet pour octet, que les tests lisent.
