# Décompte DGEO — courses d'école & camps (Blonay – St-Légier)

Logiciel local qui lit un dossier de décompte scanné (formulaire + toutes les pièces
justificatives), repère ce qui concerne les **accompagnants titrés** et remplit
automatiquement le fichier Excel « Décompte DGEO » (part à rembourser à la commune
par l'État de Vaud), avec le détail du calcul dans chaque libellé.

**Application fenêtrée autonome** : aucune donnée n'est envoyée sur Internet, aucun
navigateur n'est utilisé (interface native embarquée, lecture des scans par Tesseract OCR).

## Version portable Windows (recommandée) — aucune installation

1. Téléchargez **`DecompteDGEO-windows.zip`** depuis la page *Releases* du dépôt
   (version « Décompte DGEO — Windows portable »).
2. Décompressez le zip où vous voulez (Bureau, Documents, clé USB…).
3. Double-cliquez sur **`DecompteDGEO.exe`** : la fenêtre de l'application s'ouvre.

Python, l'interface et Tesseract OCR (avec les langues français / allemand / anglais) sont
**inclus dans le dossier** : rien à installer, rien n'est écrit dans le registre ni dans
*Program Files*, aucun navigateur n'est sollicité. Les dossiers analysés vont dans le
sous-dossier `data/` à côté de l'exécutable (avec le journal `decompte.log`).

Au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre
ordinateur » (exécutable non signé) : cliquez sur *Informations complémentaires* puis
*Exécuter quand même*. Si un antivirus bloque le fichier, ajoutez le dossier en exception.

L'exécutable est construit automatiquement par GitHub Actions
(`.github/workflows/build-windows.yml`) : PyInstaller + l'installateur Tesseract
d'UB Mannheim extrait avec 7-Zip + `fra`/`deu` de `tessdata_fast`, puis testé
(`build/smoke_test.py`) avant publication.

## Installation depuis les sources (Windows)

1. **Python 3.10 ou plus récent** : <https://www.python.org/downloads/windows/> — cochez
   « *Add python.exe to PATH* » pendant l'installation.
2. **Tesseract OCR** (lecture des scans) : installateur Windows
   <https://github.com/UB-Mannheim/tesseract/wiki> — pendant l'installation, dans
   *Additional language data*, cochez **French** (et *German* si vous avez des tickets
   en allemand). Si Tesseract n'est pas dans le PATH, définissez la variable
   d'environnement `TESSERACT_CMD` (chemin de `tesseract.exe`), ou copiez son dossier
   sous le nom `tesseract/` à côté de `run.bat` : il est détecté automatiquement.
3. Téléchargez ce dépôt (bouton *Code → Download ZIP*) et décompressez-le.
4. Double-cliquez sur **`run.bat`** : la première fois, l'environnement Python et les
   dépendances s'installent (une minute), puis la fenêtre de l'application s'ouvre.

### macOS / Linux

```bash
brew install tesseract tesseract-lang      # macOS (Homebrew)
# ou : sudo apt install tesseract-ocr tesseract-ocr-fra tesseract-ocr-deu   (Debian/Ubuntu)
./run.sh
```

Mode serveur local (interface dans le navigateur, optionnel) : `./run.sh --web --port 9000`.

## Utilisation

1. **Ouvrez le PDF** du dossier complet (formulaire de décompte de la commune + pièces
   numérotées) avec le bouton « Ouvrir un dossier PDF… ». Le type (course d'école / camp)
   est détecté ; vous pouvez le changer dans l'onglet 1.
2. **Dossier & effectifs** : les champs lus sur le formulaire sont pré-remplis (classe,
   enseignant-e, activité, dates, nombre d'élèves, enseignants DGEO…). Les champs
   manuscrits sont souvent illisibles : **c'est vous qui fixez les effectifs**.
   - *Acc. titrés* (part État, colonne F) = enseignants DGEO + enseignants J&S.
   - *Acc. non titrés* (colonne D) = moniteurs J+S + autres accompagnants.
3. **Pièces** : chaque pièce détectée s'affiche avec son aperçu (cliquez pour voir la page
   entière et le texte lu), son type, son total, ses tarifs par personne, sa rubrique et
   son mode de calcul. Corrigez ce qui doit l'être, cochez/décochez les pièces à retenir.
4. **Lignes du décompte** : les lignes Excel sont recalculées à chaque modification
   (libellé avec le détail du calcul, montants, total arrondi à 0.05). Vous pouvez
   retoucher un libellé ou un montant ; « Recalculer » régénère tout depuis les pièces.
5. **Générer le fichier Excel** : le modèle officiel (course ou camp) est rempli avec ses
   formules (règle de trois `H/G11×F11`, total `MROUND(…, 0.05)`), nommé d'après le
   n° de dossier (ex. `ANS100325.xlsx`).

Les PDF analysés et les images de pages sont conservés dans le dossier `data/` (local).

## Règles appliquées

| Situation | Traitement |
|---|---|
| Récépissé (bulletin de versement QR), reçu de carte, pièce « taux de change » | **Jamais** retenus comme pièce (seul le ticket / la facture fait foi). Ils servent uniquement à retrouver un montant CHF ou un taux. |
| Billet avec tarifs par personne (ex. Mobilis « 3 Prix entier CHF 2.80 ») | **Saisie directe** (colonne I) : pour chaque billet on retient au plus *N titrés* tarifs adultes, **d'abord les plein tarifs, puis les demi-tarifs**. Libellé : `pces 1-4 (6*2.80 + 6*4.20 + 2*2.10)`. |
| Facture / montant global (bus, musée, hébergement…) | **Règle de trois** (colonne H + formule du modèle) : total × titrés ÷ total participants. Libellé : `pce 2` ou `pces 2-3 (300.00 + 150.00)`. |
| Accompagnants invités à 0.00 (ex. « INVITE MEDIATION ») ou aucun tarif adulte sur la pièce | Rien à charge de l'État : pièce exclue avec motif (modifiable). |
| Pièce en EUR | Montant CHF imprimé sur la pièce s'il existe, sinon taux d'une pièce « taux de change » / reçu de carte du dossier, sinon taux saisi dans l'interface. Le libellé montre la conversion (`45.00 EUR*0.9500 = 42.75 CHF`). |
| Deux pièces de même montant (lettre + facture) | La seconde est signalée comme doublon probable et exclue (modifiable). |
| Rubriques | Course d'école : Transport / Activité / Autre. Camp : Nourriture / Hébergement / Transport / Activité / Autre / Cuisinière. Seules les rubriques utilisées apparaissent dans l'Excel, comme dans les décomptes établis à la main. |

Le logiciel corrige aussi les quantités mal lues sur un billet grâce au nombre de personnes
(« 43 Total ») et au montant total du billet (ex. `Ks Prix entier 4.20` + `4 demi-tarif 2.10`
+ 39 jeunes ⇒ 3 plein tarifs + 1 demi-tarif).

## Limites connues

- L'écriture manuscrite (effectifs, n° de pièces écrits à la main) n'est pas lue de façon
  fiable : vérifiez toujours les effectifs et les aperçus des pièces.
- Un scan de mauvaise qualité peut donner un texte incomplet ; le total lu et les tarifs
  sont modifiables, et une pièce manquante peut être ajoutée à la main.
- Les décomptes déjà établis joints au PDF (page « Décompte DGEO ») sont ignorés.

## Développement

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest            # tests unitaires (les tests sur vrais dossiers sont sautés sans PDF dans tests/fixtures/)
python -m decompte          # application fenêtrée (python -m decompte --web : serveur local)
pyinstaller build/decompte.spec --noconfirm   # dossier portable dist/DecompteDGEO/ (ajouter tesseract/ à côté)
python build/smoke_test.py  # test de fumée contre un serveur lancé
```

Structure : `decompte/ocr.py` (rendu + OCR + orientation) → `segment.py` (découpage des
pièces) → `forms.py` (formulaire) / `pieces.py` (tickets, factures) → `rules.py` (règles
de calcul) → `excel.py` (modèles `templates/`) ; `gui.py` (application fenêtrée Tkinter) ;
`app.py` + `static/` (interface web optionnelle, `--web`).
