# La démonstration de douze minutes

Pour une commune, une école ou un service de l'État qui veut voir avant de demander une offre. Ce que l'on montre existe, se joue sur le zip
publié (jamais sur le poste de développement), et chaque minute est tenue par une preuve que la personne en face peut refaire seule.

**Avant la séance (dix minutes, une fois)** — le poste de démonstration est un portable Windows ordinaire, sans droits d'administrateur :

- Le zip **publié en stable** (ou en candidate, dite telle), décompressé sur le Bureau. Rien d'autre installé.
- Le document d'exemple de l'application (bouton « Charger un exemple » de l'écran d'accueil) ; pas de document réel, jamais, même anonymisé « à peu près ».
- Un scan réel de commune **que le client a fourni et autorisé**, ou à défaut le courrier numérisé de l'exemple.
- Une seconde fenêtre prête, avec l'observateur de connexions (Moniteur de ressources › Réseau, intégré à Windows) filtré sur `AktumPDF.exe`.
- La fiche « Comment vérifier que rien ne sort » (PDF de l'archive) imprimée en un exemplaire, à laisser.

**Règle de la séance :** on ne dit pas « c'est rapide » ni « c'est sûr ». On fait, on montre la preuve, on se tait. Chaque limite que la personne
trouve elle-même est notée à voix haute et renvoyée à la fiche « Ce que le logiciel ne fait pas encore » : celui qui l'annonce gagne en
crédibilité, celui qui la laisse découvrir la perd.

## Le déroulé

| Minutes | Geste | Ce que l'on dit | La preuve |
| --- | --- | --- | --- |
| 0:00 – 1:30 | **Le câble débranché.** Couper le Wi-Fi (ou le Mode Avion) devant la personne, puis lancer `AktumPDF.exe` depuis le Bureau. | « Tout ce qui suit se fait sans réseau. Vous verrez à la fin ce que l'ordinateur a émis. » | L'application s'ouvre ; aucune installation, aucune question d'administrateur. |
| 1:30 – 3:30 | **Un scan devient lisible.** Ouvrir le courrier numérisé ; « Reconnaître le texte » (français) ; chercher un mot du courrier. | « Ce scan n'avait pas de texte ; il en a un, calculé sur ce poste. » | La recherche trouve le mot. Réseau toujours coupé. |
| 3:30 – 5:30 | **Un dossier de pièces.** « Constituer un dossier » : glisser quatre documents (courrier, procès-verbal, tableau, annexe), les mettre dans l'ordre, numéroter, exporter un seul PDF. | « C'est le geste du secrétariat avant une séance de Conseil. » | Un seul fichier, pages numérotées, ordre voulu. |
| 5:30 – 7:00 | **Corriger et signer.** Double-clic sur la page du préavis : corriger un mot ; tamponner « Reçu le » ; tracer et poser une signature. | « Corriger du texte dans le PDF, pas seulement dessiner par-dessus. » | Le texte corrigé se sélectionne. Dire : « cette signature est une image, pas une preuve d'intégrité » — c'est la limite n° 1 de la fiche. |
| 7:00 – 10:00 | **Caviarder, puis le prouver.** « Rechercher, remplacer, caviarder » : « Caviarder tout » sur un nom, lire la liste, confirmer ; exporter sous un autre nom ; **rouvrir la copie et chercher le nom : zéro résultat** ; la sélectionner tout et la coller dans le Bloc-notes. | « Un rectangle noir ne suffit pas : le texte reste dans le fichier. Ici la page est reconstruite à l'export. À vous de vérifier, dans le lecteur de votre choix. » | Le nom n'est ni cherchable ni copiable, y compris dans le lecteur de la personne en face (Acrobat Reader, Edge). **C'est le moment fort : laisser la personne vérifier elle-même.** |
| 10:00 – 11:00 | **Protéger.** Mot de passe d'ouverture, enregistrer sous, rouvrir : le mot de passe est demandé. « Nettoyer le document » : auteur et logiciel retirés. | « Chiffrement AES-256 ; le fichier ne sort pas avec l'auteur de la commune dans ses propriétés. » | La demande de mot de passe à la réouverture. |
| 11:00 – 12:00 | **Ce que l'ordinateur a émis.** Ouvrir l'observateur de connexions ; montrer qu'il n'y a **aucune connexion** du processus `AktumPDF.exe` vers une adresse autre que `127.0.0.1`. Remettre le Wi-Fi seulement ensuite. | « Vous pouvez refaire ceci sur votre réseau avec la fiche que je vous laisse. Nous pouvons aussi faire faire la capture par un tiers. » | Le tableau des connexions : vide, hors boucle locale. Laisser la fiche imprimée. |

Les douze minutes tiennent sans parler d'OCR en allemand, de formulaires en série ni de signature par certificat : ce sont des sujets de
questions, pas de démonstration.

## Les questions qui viennent, et la réponse honnête

- **« Pouvez-vous signer électroniquement ? »** — Oui, par certificat local (.p12) : une signature avancée ; ce n'est **pas** une signature
  qualifiée (SCSE). Une signature qualifiée passe par un prestataire reconnu, que le logiciel n'est pas. (Fiche « Ce que le logiciel ne fait pas encore ».)
- **« Est-ce accessible (PDF/UA) ? »** — Les documents que nous produisons sont balisés ; un PDF reçu et déjà balisé ne garde pas son balisage quand
  on le recompose. La déclaration d'accessibilité le dit.
- **« Qui nous soutient quand vous partez en vacances ? »** — Le délai de première réponse est écrit dans la procédure de support, par niveau de
  gravité ; ce qui est écrit est tenable par une personne seule. Ne pas promettre davantage.
- **« Et si vous arrêtez ? »** — La clause de pérennité (séquestre ou publication) est dans l'ossature de contrat ; elle n'est pas encore
  signée avec qui que ce soit : le dire tel quel, tant que c'est vrai.
- **« Combien ? »** — Renvoyer à la page Tarifs et à l'offre écrite ; ne jamais annoncer un prix de tête.

## Après la séance

Noter, le jour même : ce qui a étonné, ce qui a manqué, la case que la personne a trouvée seule, le nombre de postes de l'entité, la date de la
prochaine décision (Conseil, budget). Ces notes alimentent la fiche comparative et la liste des limites ; elles ne contiennent aucun nom de
personne au-delà de la fonction.
