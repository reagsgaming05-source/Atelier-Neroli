# Caisse écoles – Saisie automatique des pièces comptables

Application locale (un seul fichier HTML, sans installation) qui lit un PDF scanné de
pièces comptables et remplit le journal de caisse Excel dans le même format que le
classeur existant :

| Date | No | Compte | Libellé | Débit | Crédit | Solde |
|------|----|--------|---------|-------|--------|-------|

Le solde est une formule cumulée (`=G(n-1)+E(n)-F(n)`), comme dans le classeur d'origine.
Le compte caisse au **DOIT** de la pièce donne un **Débit** (entrée en caisse), le compte
caisse à l'**AVOIR** donne un **Crédit** (sortie de caisse). La colonne *Compte* reçoit le
compte de contrepartie.

## Utilisation (PC de l'État, sans installation)

1. Copier `dist/Caisse-ecoles.html` sur le PC (clé USB, courriel, téléchargement depuis GitHub).
2. Double-cliquer dessus : il s'ouvre dans le navigateur (Edge, Chrome, Firefox). Rien n'est
   envoyé sur internet, tout se passe dans le navigateur ; l'application fonctionne hors ligne.
3. **Étape 1 – Classeur Excel** : soit *Continuer un classeur existant* (choisir le fichier de
   l'année en cours : les nouvelles pièces sont ajoutées à la suite), soit *Nouveau classeur*
   (indiquer la date et le montant du solde à nouveau). Vérifier le n° du compte caisse
   (`9100.104` par défaut).
4. **Étape 2 – PDF** : glisser le PDF des pièces (ex. `Pce 01 à 33.pdf`). Le PDF doit avoir été
   scanné avec reconnaissance de texte (PDF « consultable »), ce que fait le copieur.
5. **Étape 3 – Vérification** : chaque pièce reconnue apparaît sur une ligne ; cliquer sur une
   ligne affiche la pièce scannée à droite. Les lignes ⚠ demandent une vérification
   (plusieurs comptes possibles, montant douteux, compte caisse des deux côtés…) : corriger
   au besoin puis cocher « Vérifié ». On peut aussi ajouter une écriture manuelle.
6. **Étape 4 – Excel** : *Générer le fichier Excel* télécharge `Caisse écoles AAAA.xlsx`.
   L'ouvrir dans Excel et l'enregistrer à la place du classeur.

Les copies de pièces jointes à d'autres pièces (même numéro, même montant) sont ignorées
automatiquement ; les numéros manquants dans la séquence sont signalés.

## Ce que l'application lit sur une pièce

Formulaire « PIÈCE COMPTABLE » : le numéro (en haut au milieu), les comptes des colonnes
DOIT et AVOIR, la SOMME et le Total, les lignes du libellé (type en majuscules, description,
personne) et la date sous le tableau. Le libellé du journal est composé ainsi :
`TYPE - Description - Personne` (ex. `REMBOURSEMENT - Collation chœur 7-11S concert du 12.12.2024 - A. Nagy`).
Les fautes d'OCR courantes sont corrigées (`10'OOO.OQ` → 10 000.00, `51000. 3662. 50` → `51000.3662.50`,
`REMBOURSMENT` → `REMBOURSEMENT`).

## Développement

```bash
cd caisse-ecoles
npm install          # pdf.js + ExcelJS
npm run build        # -> dist/Caisse-ecoles.html (fichier autonome)
npm test             # tests unitaires (parser, Excel)
```

Le test d'intégration `test/sample.test.js` compare les pièces d'un vrai PDF au classeur de
référence si l'on place `samples/pieces.pdf` et `samples/caisse.xlsx` (dossier non versionné,
car il contient des données personnelles).

Structure :

- `src/parser.js` – analyse de la couche texte des pièces (positions des mots → champs → écriture)
- `src/excel.js` – lecture d'un classeur existant et génération du classeur au format du modèle
- `src/app.js`, `src/index.html`, `src/app.css` – interface
- `build.js` – assemble tout (avec pdf.js et ExcelJS) dans `dist/Caisse-ecoles.html`

## Limites

- Le PDF doit contenir une couche texte (scan avec OCR). Un PDF « image » seule est signalé
  et ne peut pas être traité.
- L'OCR du scanner peut confondre certains caractères (`œ`, `S`/`8`) dans le libellé :
  la relecture à l'étape 3 reste nécessaire.
- Quand une pièce porte plusieurs comptes de contrepartie, le premier est proposé et la
  ligne est signalée pour choisir le bon.
