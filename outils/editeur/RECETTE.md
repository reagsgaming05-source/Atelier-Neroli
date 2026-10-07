# Liste de recette — à jouer à la main avant chaque version stable

La suite automatique (≈ 340 scénarios de bout en bout, 370 tests unitaires, 10 essais de l'application de bureau, trois vérificateurs
indépendants : qpdf, pikepdf, veraPDF) prouve ce qu'une machine sait vérifier. Elle ne remplace pas une personne devant un poste Windows réel,
une imprimante réelle et un partage réseau réel. Cette liste est ce que la suite **ne peut pas** voir. Elle se joue sur le zip **publié en
candidate** (celui qui partira en stable), pas sur le poste de développement. Durée : une heure et demie la première fois, une heure ensuite.

Notez la date, la version (« Aide › À propos ») et le poste. Un point qui échoue arrête la publication stable ; on corrige, on republie en
candidate, on rejoue la liste.

## A. Installation et premier lancement (poste Windows 10 ou 11, sans droits d'administrateur)

1. Télécharger le zip **et** son `.signature.json` ; clic droit › Propriétés › Débloquer ; décompresser sur le Bureau : l'application s'ouvre au
   double-clic, sans question d'installation.
2. Avec le zip non débloqué : le message « Windows a protégé votre ordinateur » apparaît et le chemin « Informations complémentaires › Exécuter quand
   même » le lève, comme le dit le LISEZ-MOI.
3. Le même dossier posé sur un **lecteur réseau** (partage de l'équipe) : l'application s'ouvre ; deux comptes l'ouvrent en même temps ; le second
   voit le message qui nomme le premier poste lorsqu'il tente une mise à jour.
4. Premier lancement : la visite guidée se déroule (quatre gestes), se quitte à tout moment, et ne revient pas au lancement suivant.
5. Création du premier compte administrateur ; connexion ; déconnexion ; mot de passe oublié (récupération par la personne qui administre).
6. « Aide › À propos » : version, canal (stable), licence ou essai, et la date de construction annoncée sont celles de la release.

## B. Ouvrir, lire, organiser

7. Ouvrir par glisser-déposer, par Fichier › Ouvrir, par double-clic sur un PDF (après « Proposer Aktum PDF pour ouvrir les PDF… » dans les
   Préférences, puis choix dans les réglages de Windows) et par « Ouvrir avec » : quatre chemins, le document s'ouvre à chaque fois, dans la
   fenêtre déjà ouverte ou une nouvelle selon la règle annoncée.
8. Un PDF de 300 pages issu du copieur : l'ouverture, le défilement et la recherche restent fluides ; le message d'avertissement n'apparaît pas
   (il apparaît au-delà de 2 000 pages ou 50 Mo : essayer un fichier de cette taille).
9. Un PDF protégé par mot de passe : le mot de passe est demandé, le mauvais est refusé avec un message clair, le bon ouvre.
10. Réorganiser : déplacer, supprimer, pivoter, dupliquer, fusionner deux fichiers, extraire une sélection ; Ctrl+Z et Ctrl+Y défont et refont
    chaque geste.
11. Fermer la fenêtre avec des modifications non enregistrées : la confirmation s'affiche ; « Annuler » garde le travail.
12. Tuer le processus (gestionnaire des tâches) pendant un travail, relancer : la proposition de récupération s'affiche et rend le travail.

## C. Annoter, remplir, signer

13. Surligner, cadre, texte, dessin à main levée, tampon, image : posés à la souris, exportés, relus dans **Adobe Acrobat Reader** : mêmes
    positions, mêmes couleurs.
14. Remplir un formulaire PDF (champs texte, cases, listes) ; l'enregistrer ; le rouvrir dans Reader : les valeurs sont là.
15. Signature dessinée : tracer, placer, exporter ; relire dans Reader.
16. Signature par certificat (.p12 de l'éditeur ou d'essai) : signer, ouvrir dans Reader : la signature est reconnue, le message de Reader
    est celui que le manuel annonce (autorité non approuvée tant que le certificat n'est pas dans le magasin du poste).
17. Un PDF signé reçu d'un tiers : « Vérifier les signatures » dit intact ou modifié, et nomme le signataire.
18. Corriger le texte existant d'un PDF (double-clic sur une page) : la correction est visible dans Reader et le texte est sélectionnable.

## D. Protéger, caviarder, nettoyer

19. Caviarder une zone et un mot (mode « certifié ») ; exporter ; **sélectionner tout et copier** dans Reader puis dans un éditeur de texte : le
    mot caviardé n'y est pas. Chercher le mot dans Reader : zéro résultat.
20. Mot de passe d'ouverture et autorisations : le fichier exporté demande le mot de passe dans Reader ; les autorisations refusées (copier,
    modifier) le sont dans Reader.
21. « Nettoyer le document » : les propriétés (auteur, logiciel) sont retirées, vérifiées dans Reader › Propriétés du document.

## E. Imprimer et numériser (le point que seule une imprimante prouve)

22. Imprimer sur **l'imprimante par défaut** (laser du secrétariat) : pages choisies, plusieurs pages par feuille, livret : le résultat papier est
    juste (ordre des pages, recto verso « bords courts » réglé dans Windows).
23. Imprimer sur une **seconde imprimante** (copieur multifonction) après avoir changé l'imprimante par défaut de Windows.
24. Un dossier aux formats mêlés (A4 et A3) : chaque suite de pages sort sur son papier. « Nuances de gris » : la sortie est grise.
25. Échelle d'affichage de Windows à **125 % et 150 %** : la barre d'outils tient sur une ligne, aucun bouton ne sort de l'écran, les boîtes de
    dialogue sont lisibles ; fenêtre réduite à 1000 px de large.
26. Copieur multifonction : numériser vers le dossier désigné comme boîte de réception ; l'annonce « Arrivées » se montre une fois le fichier
    complet (pas pendant l'écriture) ; ouvrir, classer, supprimer (avec confirmation).
27. Un scan (page sans texte) : reconnaissance de texte en français, puis en allemand ; le texte relu est cherchable dans Reader.

## F. Messagerie et fichiers

28. « Envoyer par courriel… » avec Outlook installé : le message s'ouvre avec le PDF joint, sans rien envoyer tout seul.
29. Sans Outlook (poste de test) : le message dit comment faire et ne plante pas.
30. Enregistrer sur place un PDF ouvert depuis un dossier **partagé** : le fichier est remplacé ; si Reader l'a ouvert au même moment, le message
    nomme la cause (Reader, GEVER, antivirus) et rien n'est perdu.
31. Un nom de fichier à accents, espaces et apostrophe (« Décision n° 12 — Commune d'Échallens.pdf ») : ouvert, enregistré, glissé vers le
    Bureau, envoyé par courriel : le nom est intact partout.

## G. Mise à jour et retour en arrière

32. Depuis la **version stable précédente** : poser le nouveau zip et son `.signature.json` à côté de l'exécutable ; « Aide › Rechercher une mise
    à jour » propose, installe, relance ; les comptes, tampons, signatures (`data\`) et la licence sont intacts.
33. Poser un zip dont le `.signature.json` a été modifié d'un octet : la mise à jour est refusée avec un message qui dit pourquoi.
34. Revenir à la version précédente (zip signé de l'ancienne version) : proposé « sur demande, et dit comme tel », installé, données intactes.

## H. Langue, accessibilité, version Mac

35. Passer en allemand (Aide › Langue) : les menus, les boîtes de dialogue, les messages d'erreur, l'aide « ? » sont en allemand ; un
    germanophone lit trois boîtes au hasard et note ce qui sonne faux (liste à remettre à l'éditeur).
36. Navigation **au clavier seul** de l'ouverture à l'export (Tab, flèches, Entrée, Échap) ; avec le **Narrateur** de Windows : le titre de
    la fenêtre, les boutons de la barre d'outils et les boîtes de dialogue sont annoncés.
37. Sur un Mac (zip Mac) : ouverture (clic droit › Ouvrir la première fois si l'application n'est pas notariée), double-clic sur un PDF après
    association, Cmd+C/Cmd+V dans les champs, glisser une page vers le Bureau, impression.

## Compte rendu

| Version | Date | Poste | Points échoués | Corrections | Rejoué le |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
