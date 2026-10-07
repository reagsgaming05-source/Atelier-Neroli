# Contrat de licence et de maintenance — ossature de travail

**Ce document n'est pas un contrat.** C'est la matière première d'un contrat : seize clauses dont le contenu technique est vérifié contre le
produit livré, et dont chaque point juridique encore ouvert est marqué **[À DÉCIDER]** ou **[JURISTE]**. Il se donne à un juriste avec les
Conditions générales de la Confédération pour l'acquisition et la maintenance de logiciels standard (Conférence des achats de la Confédération),
que l'acheteur public imposera presque toujours et qu'il faut lire avant de négocier (non lues à la source par l'auteur de cette ossature).
**Il ne se signe pas en l'état, et rien ne s'y signe tant que l'accord de propriété du code n'existe pas (clause 5).**

Les noms de l'éditeur et du client n'y figurent pas : le dépôt est public, les parties s'écrivent au moment de l'offre.

## Partie I — Licence

1. **Objet et définitions.** Le logiciel est « Aktum PDF », dans la version indiquée à l'offre, pour Windows (dossier portable) et macOS, tel que décrit
   par la **fiche produit** et borné par l'annexe « Ce que le logiciel ne fait pas encore » (les deux jointes au contrat). Ce qui n'y figure pas
   n'est pas promis. Le logiciel s'exécute sur le poste ; il ne comporte aucun service en ligne, aucun stockage chez l'éditeur, aucune disponibilité à garantir.
2. **Étendue du droit d'usage.** Droit non exclusif, non transférable, d'utiliser le logiciel au sein de l'entité souscriptrice, pour ses besoins propres,
   y compris depuis un lecteur réseau partagé (c'est le mode de déploiement normal). La licence est portée par un fichier signé (`licence.json`), vérifié
   hors ligne par l'application ; elle porte le nom de l'entité et une date de fin des mises à jour (`majJusqu`).
3. **Comptage.** [À DÉCIDER] La mesure est **déclarative** : l'entité déclare le nombre de personnes qui utilisent le logiciel. L'application ne compte
   pas les postes et le contrat ne prévoit pas d'audit que le produit ne pourrait pas faire. [À DÉCIDER : tranche de postes, ou entité entière — voir le
   barème, chapitre 25.]
4. **Durée, mises à jour, fin.** La licence donne le **droit d'utiliser sans limite de durée** la dernière version reçue pendant la période payée ;
   la redevance annuelle paie les **mises à jour** (jusqu'à la date `majJusqu`) et le **support** (partie II). À la fin de la période non renouvelée, le
   logiciel continue de fonctionner ; seules les mises à jour postérieures à `majJusqu` sont refusées par l'application. Aucune désactivation à distance
   n'existe, et le contrat n'en prévoit pas. [À DÉCIDER : le site et les CGV parlent encore d'« abonnement » ; le produit fait « licence + mises à jour
   jusqu'à une date » — les aligner dans un sens ou dans l'autre.] Version d'essai : toutes fonctions, 45 jours.
5. **Propriété intellectuelle.** Le code et la documentation restent à l'éditeur ; le client n'acquiert aucun droit sur les sources ; **les documents
   produits avec le logiciel appartiennent au client**. [JURISTE — BLOQUANT] Cette clause suppose que l'éditeur détienne les droits : l'accord écrit de
   l'employeur (art. 17 LDA, programmes d'ordinateur créés dans l'exercice de l'activité) doit exister et être signé **avant** ce contrat.
6. **Pérennité.** Si l'éditeur cesse son activité, ou la transfère sans reprise du support : remise des sources à un tiers séquestre, ou publication sous
   licence libre. [À DÉCIDER : choix du séquestre — notaire ou autre ; coût annuel à budgéter.] Les sources et le journal des empreintes (SBOM) existent déjà
   et peuvent être déposés.
7. **Garantie.** Conformité à la documentation pendant [durée à fixer], correction des défauts dans les délais de la partie II. **Les limitations connues sont
   déclarées en toutes lettres** dans l'annexe « Ce que le logiciel ne fait pas encore » (la seule manière valable de limiter la garantie : l'art. 199 CO rend
   nulle l'exclusion d'un défaut dissimulé). [JURISTE]
8. **Responsabilité.** Plafond à deux étages : le plus élevé des redevances de douze mois et d'un montant absolu **[montant aligné sur la RC professionnelle
   souscrite]** ; exclusion des dommages indirects et du manque à gagner ; **réserve expresse du dol et de la faute grave** (art. 100 CO — une exclusion
   d'avance serait nulle). [JURISTE] [À DÉCIDER : l'assurance RC professionnelle, avec dommages immatériels non consécutifs, est à souscrire avant la première livraison.]
9. **Obligations de l'éditeur.** Les délais chiffrés de la partie II ; la mise à disposition des mises à jour jusqu'à `majJusqu` ; l'information du client sur
   toute limitation nouvelle connue.
10. **Obligations du client.** Sauvegarder ses documents avant un traitement par lots ; **vérifier le résultat d'un caviardage avant de transmettre** (la
    procédure est dans la formation et l'aide-mémoire : rouvrir la copie et chercher) ; **vérifier la validité d'une signature dans un lecteur tiers avant de
    transmettre un document signé** ; contrôler l'accessibilité d'un document avant publication ; tenir ses postes à jour. Ces clauses ne déplacent pas la
    responsabilité : elles disent comment on la partage.
11. **Protection des données.** L'éditeur ne traite **aucune donnée** du client en exécution de la licence : tout se passe sur le poste, rien ne sort
    (fiche « Comment vérifier que rien ne sort », que le client peut rejouer). **Régime distinct pour le support** : un diagnostic n'est envoyé que si la personne
    l'envoie elle-même ; il est anonymisé et le client en voit le contenu avant (fiche de protection des données). [JURISTE] Avis de droit à obtenir : la
    livraison d'un logiciel local n'est pas une sous-traitance de traitement (art. 5 nLPD, art. 4 RGPD : définition du sous-traitant — numéros à confirmer) — une phrase du contrat ne remplace pas l'avis.
12. **Composants de tiers.** Annexe : `MENTIONS-TIERCES.txt` livrée dans chaque archive, et la nomenclature SBOM (format CycloneDX) jointe à chaque
    publication, avec la licence de chaque composant.
13. **Références.** Le nom du client n'est cité nulle part sans son accord écrit (témoignage, référence, liste de clients).
14. **Cession.** Accord préalable du client pour toute cession du contrat ; l'éditeur prévoit ce qui arrive si son activité est reprise (clause 6).
15. **Modification.** Préavis écrit de [à fixer] ; droit de résiliation du client en cas de modification défavorable.
16. **Droit applicable et for.** Droit suisse ; for au siège de l'éditeur **sous réserve des fors impératifs**. Une collectivité imposera souvent son droit
    cantonal et son for : à céder, mais à avoir prévu.

## Partie II — Maintenance et support (séparée de la licence)

Ces délais sont ceux de la **procédure de support** livrée (ils se changent à un seul endroit du dépôt et le contrat ne les recopie pas : il les cite).
Ils sont tenables par une personne seule ; ne rien promettre de plus.

| Gravité | Définition | Accusé de réception | Première réponse utile | Contournement / correction |
| --- | --- | --- | --- | --- |
| 1 — Données | Des données sont perdues, altérées ou exposées ; un caviardage laisse un mot dans le fichier ; une licence ou une mise à jour fait perdre l'accès au travail | 1 jour ouvrable | 2 jours ouvrables | contournement sous 5 jours ouvrables ; correctif dès que la cause est comprise |
| 2 — Bloqué | Une fonction principale ne marche plus pour tout le service (l'application ne s'ouvre pas, on ne peut plus enregistrer) | 1 jour ouvrable | 3 jours ouvrables | contournement sous 10 jours ouvrables ; correctif dans la version suivante |
| 3 — Gênant | Une fonction marche mal pour un cas précis ; un contournement existe | 2 jours ouvrables | 5 jours ouvrables | dans une prochaine version |
| 4 — Question | Comment faire ? Une suggestion | 2 jours ouvrables | 5 jours ouvrables | — |

- **Canal :** l'adresse de support indiquée à l'offre ; le rapport de diagnostic (« Aide › Rapport de diagnostic pour le support… ») s'y joint, anonymisé, après lecture par la
  personne.
- **Horaires :** jours ouvrables ; [À DÉCIDER : jours de fermeture annuels de l'éditeur, à annoncer d'avance].
- **Remplacement de l'éditeur :** [À DÉCIDER] — un éditeur d'une seule personne ne tient pas ces délais pendant une absence ; soit un remplaçant désigné
  (sous-traitance : voir le point suivant), soit des délais assortis d'une clause d'absence annoncée.
- **Sous-traitance :** [JURISTE] le chapitre 28 conclut qu'un contrat de sous-traitance n'est pas nécessaire pour livrer un logiciel local ; il le devient
  si un tiers reçoit des diagnostics ou assure le support à la place de l'éditeur.
- **Intégrateur-revendeur (si un jour) :** support de premier niveau chez lui, deuxième niveau chez l'éditeur ; à écrire avec lui, pas avant.

## Les annexes du contrat

1. Fiche produit (version, périmètre).
2. **Ce que le logiciel ne fait pas encore** (limites connues).
3. Procédure de support.
4. Fiche de protection des données.
5. Mentions des composants de tiers et nomenclature SBOM.
6. Déclaration d'accessibilité (auto-déclaration : aucun organisme ne certifie un logiciel PDF en Suisse ; elle dit ce qui est conforme et ce qui ne l'est pas).
7. Extrait du registre du commerce, attestations (poursuites, AVS, assurance RC) — **périssables à trois mois**, à demander au moment de l'offre.

## Ce qui reste à faire avant de pouvoir signer quoi que ce soit

L'accord de propriété du code (clause 5) ; la structure de l'éditeur (raison individuelle ou société) et son identité à l'IDE ; l'assurance RC ; l'avis de
droit sur la clause 11 ; le choix du séquestre ; le choix du modèle de vente (clause 4) ; la relecture complète par un juriste.
