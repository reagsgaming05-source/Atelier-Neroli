# Éditeur : ce qui se fait hors du code

Ce dossier réunit les outils de l'éditeur (clés, licences, signature des mises à jour, audit des dépendances, nomenclature logicielle) et,
ici, ce que le code ne peut pas faire à votre place : des réglages du dépôt GitHub, des achats, des relectures. Aucun secret n'est dans le
dépôt ; aucune de ces étapes ne se fait dans une conversation.

## 1. Les secrets du dépôt

*Settings › Secrets and variables › Actions*. Aucun n'est obligatoire pour construire : sans eux, les archives sortent **non signées**, et le
disent (dans la construction, les notes de la version et le guide d'administration, §9 et §10).

| Secret | À quoi il sert | D'où il vient |
|---|---|---|
| `MAJ_CLE_PRIVEE` | signe chaque archive de mise à jour (Ed25519) | `node outils/editeur/generer-cles.js maj` (une fois, sur votre poste) |
| `WIN_CERTIFICAT_PFX`, `WIN_CERTIFICAT_MOT_DE_PASSE` | signature de code de l'exécutable Windows | un certificat de signature de code acheté (le .pfx en base64) |
| `MAC_CERTIFICAT_P12`, `MAC_CERTIFICAT_MOT_DE_PASSE` | signature de l'application Mac | un certificat « Developer ID Application » d'Apple |
| `MAC_API_CLE_P8`, `MAC_API_CLE_ID`, `MAC_API_EMETTEUR` | notarisation chez Apple | une clé d'API App Store Connect |

La clé privée des **licences** (`generer-cles.js licence`) n'est dans aucun de ces secrets : elle reste sur votre poste et sur une sauvegarde hors
ligne. Après chaque génération de clé : commitez `outils/desktop/cles-publiques.json` et `site/src/content/licence-cles.json` (ce sont les clés
**publiques**).

## 2. Verrouiller la signature (à faire une fois, 10 minutes)

La construction ne remet les certificats Windows et Apple aux étapes de signature que pour `main` et les étiquettes `v*` : une branche de travail
se construit et se publie en candidate, **sans** toucher à l'identité de l'éditeur. Mais un secret de dépôt reste lisible par n'importe quel
travail du dépôt ; pour qu'il ne le soit que par une signature relue :

1. *Settings › Environments › New environment*, nommez-le `signature`.
2. *Required reviewers* : vous, et une seconde personne si possible. *Deployment branches and tags* : « Selected » ; ajoutez `main` et `v*`.
3. Déplacez-y les secrets de signature du tableau ci-dessus (*Environment secrets*) et retirez-les des secrets du dépôt.
4. Dans `.github/workflows/build-aktumpdf-windows.yml`, ajoutez `environment: signature` aux travaux `build` et `mac` — à faire seulement quand
   les certificats existent, sinon chaque construction attendra une approbation pour rien.

Pour la même raison, protégez la branche `main` (*Settings › Branches › Add rule* : relecture obligatoire, contrôles d'état obligatoires
« e2e », « build », « mac »), et n'activez pas de déclencheur `pull_request` sur ce workflow sans relire l'effet sur les secrets.

**Pourquoi la signature n'est pas un travail à part.** Séparer entièrement la signature (un travail qui ne reçoit qu'une archive déjà construite,
la signe, la notarise) est la bonne architecture finale. Elle n'a pas été faite : sans certificat, on ne peut pas la mettre à l'essai, et une
chaîne de publication qui marche ne se réécrit pas à l'aveugle. Ce qui est fait en attendant : aucun secret n'est visible des étapes `npm ci`,
`npm run libs` ou de construction (chacun n'est remis qu'à l'étape qui signe) ; `npm ci --ignore-scripts` et `npm pack --ignore-scripts` partout
(les seuls scripts d'installation du dépôt appartiennent à des outils qu'on n'utilise pas) ; les actions GitHub sont épinglées par empreinte de
commit. Le jour où le certificat Windows est acheté, faites le découpage en deux travaux (construire → signer) avant de publier une version stable.

## 3. Surveillance des dépendances

- `node outils/editeur/audit-dependances.js` : `npm audit` sur chaque manifeste, jugé contre `outils/editeur/avis-acceptes.json`. Il tourne à
  chaque version (bloquant pour une stable), chaque lundi (`.github/workflows/audit-dependances.yml`) et à chaque changement d'un fichier de
  dépendances.
- Une **exception** (un avis connu qu'on garde) dit pourquoi, quand elle a été relue, et expire au plus tard six mois plus tard : à l'échéance
  l'audit redevient rouge, et il faut relire l'avis — le corriger, ou renouveler l'exception avec une nouvelle date. Ne jamais allonger une
  date sans relire.
- Dependabot (`.github/dependabot.yml`) propose les mises à jour des cinq manifestes et des actions. Pour les bibliothèques **embarquées**
  (`outils/libs-manifeste/`), sa proposition n'est qu'un signal : on récupère l'archive, on la relit, puis on met à jour `recuperer-libs.js`
  (version **et** empreinte SHA-512), `build.js`, `mentions-tierces.js`, `libs-manifeste/package.json` et son verrou. `npm test` dans `outils/`
  refuse tout désaccord entre ces fichiers (`test/dependances.test.js`).
- Changer une bibliothèque embarquée, pas à pas : `npm pack <paquet>@<version>` dans un dossier vide ; `openssl dgst -sha512 -binary <archive> | base64`
  et comparer à `npm view <paquet>@<version> dist.integrity` ; lire le diff avec la version précédente ; poser version et empreinte dans
  `recuperer-libs.js` ; `npm run libs && npm run build && npm test`, puis la suite de bout en bout.
- La nomenclature logicielle (`node outils/editeur/sbom.js <fichier>`) est jointe à chaque publication ; la licence **retenue** de chaque
  composant est dite dans `editeur/sbom.js` (JSZip et node-forge sont offerts sous deux licences : c'est la permissive qui est retenue).

## 4. Les documents de l'éditeur (jamais livrés dans l'archive)

| Fichier | À quoi il sert | Avant de s'en servir |
| --- | --- | --- |
| `RECETTE.md` | Liste de recette manuelle (37 points) à jouer sur le zip publié en candidate, avant chaque version stable | — |
| `DEMONSTRATION.md` | La démonstration de douze minutes, chronométrée, et les réponses honnêtes aux questions qui viennent | Une répétition sur le zip publié |
| `CONTRAT-OSSATURE.md` | Seize clauses de licence et la partie maintenance, vérifiées contre le produit, avec les points ouverts marqués | **Un juriste**, et l'accord de propriété du code : ce n'est pas un contrat |
| `FICHE-COMPARATIVE.md` | Le comparatif honnête face aux concurrents, avec les cases où l'on perd | **Vérifier chaque ligne « † » à la source** : brouillon interne, jamais envoyé en l'état |
