/*
 * Ce que le logiciel ne fait pas encore : la même liste que le document « Limites-connues.pdf » livré avec l'application (outils/docs/limites-connues.html).
 * Une limite dite avant l'achat est une limite assumée ; la même, découverte après, est un défaut. Aucune date n'est promise : « pas encore » veut dire
 * « pas dans cette version ». outils/test/limites.test.js vérifie que les deux listes disent les mêmes limites.
 */
export type Limite = { limite: string; apres: string };
export type GroupeDeLimites = { titre: string; limites: Limite[] };

export const limites: GroupeDeLimites[] = [
  {
    titre: "Signature, archivage, conformité",
    limites: [
      {
        limite: "Pas de signature électronique qualifiée (SCSE / ZertES) ni d'horodatage qualifié",
        apres:
          "Une signature dessinée (image) ; une signature numérique avancée avec le certificat personnel de la personne (.p12) ; la lecture des signatures des PDF reçus (contenu intact ou modifié, signataire) sans dire si l'autorité du certificat est reconnue. Pour une signature qualifiée : un fournisseur reconnu (non intégré).",
      },
      {
        limite: "PDF/A : niveaux 2b et 2u seulement — ni PDF/A-1, ni PDF/A-3, ni niveau « a »",
        apres:
          "« Archiver en PDF/A », seul ou par lots, contrôlé à chaque construction par veraPDF. Les pages dont les polices ne peuvent pas être incorporées ne passent en images qu'avec l'accord de la personne.",
      },
      {
        limite: "Un PDF balisé reçu perd son balisage quand ses pages sont réassemblées (l'application prévient avant)",
        apres: "Le balisage des documents produits par l'application (titres, tables des matières, liens, artefacts) ; vérifié par des outils qui ne sont pas les nôtres.",
      },
      {
        limite: "Les formulaires XFA sont reconnus et gardés tels quels, pas modifiables",
        apres: "Les formulaires AcroForm : remplissage, séries depuis un tableau CSV.",
      },
    ],
  },
  {
    titre: "Accessibilité et langues",
    limites: [
      {
        limite: "Accessibilité partiellement conforme (WCAG 2.2 AA) : poser une annotation dans l'éditeur de page se fait à la souris ; aucun lecteur d'écran réel n'a été essayé par l'éditeur",
        apres: "La Déclaration d'accessibilité, critère par critère, avec ses limites ; la navigation au clavier de toute l'interface.",
      },
      {
        limite: "Interface en français et en allemand ; le manuel, les documents et le site sont en français ; pas d'italien",
        apres:
          "Le bouton DE/FR dans la barre ; la reconnaissance de texte lit le français et l'allemand. L'allemand n'a pas été relu par un germanophone de métier : à signaler si un terme sonne faux.",
      },
    ],
  },
  {
    titre: "Poste de travail et déploiement",
    limites: [
      {
        limite: "Pas d'installateur (.msi, .intunewin) : c'est une version portable, par choix",
        apres:
          "Un dossier à poser sur un partage ou une clé, sans droits d'administrateur ; un script de déploiement fourni (Deployer-Aktum-PDF.ps1) pose, met à jour et retire l'application ; le guide d'administration donne les commandes pour le script de connexion, la stratégie de groupe et Intune — non essayés dans un parc réel.",
      },
      {
        limite: "Windows 10/11 est la plateforme essayée ; la version Mac est livrée mais l'éditeur ne l'a pas essayée sur de vrais Mac ; pas de version Linux",
        apres: "La construction essaie l'application sur Windows et sur macOS à chaque version ; la liste de recette manuelle de l'éditeur est jouée avant chaque version stable.",
      },
      {
        limite: "Mise à jour complète, pas différentielle : toute l'application (≈ 290 Mo) se repose à chaque version",
        apres: "Une mise à jour signée posée sur le partage, vérifiée avant d'être installée, avec retour à la version précédente (chaque version reste téléchargeable).",
      },
      {
        limite: "Pas de connecteur GEVER ni de numérisation directe par pilote de scanner",
        apres:
          "L'application peut être le programme qui ouvre les PDF, réécrit le fichier là où le GEVER l'a mis ; une « boîte de réception » surveille le dossier où le copieur dépose ses numérisations ; l'envoi par courriel joint le document (Outlook).",
      },
      {
        limite: "Les mots de passe de comptes ne chiffrent pas les fichiers : le dossier de données est lisible en clair par qui peut l'ouvrir",
        apres: "Les droits du dossier (poser le partage en lecture seule pour l'application, données sur un dossier personnel) ; « Effacer mes traces sur ce poste » ; la fiche de protection des données dit tout ce qui est gardé.",
      },
    ],
  },
  {
    titre: "Documents et fonctions",
    limites: [
      {
        limite: "Conçu pour des documents jusqu'à 2 000 pages ou 50 Mo : au-delà, l'application prévient, tout reste possible mais plus lent",
        apres: "Le traitement par lots de nombreux fichiers.",
      },
      {
        limite: "La correction du texte existant n'est pas un traitement de texte : elle ne déplace pas les blocs voisins (un bloc qui s'allonge et touche le texte d'à côté est signalé, pas poussé), ne corrige pas un texte couché ou à l'envers, et dans un scan elle recouvre l'image et redessine les lignes refaites (le gras du scan n'est pas reconnu) ; une lettre que la police du document n'a pas est écrite dans une police de même dessin que l'Arial, le Times ou le Courier",
        apres:
          "La correction « sur place » d'un nom, d'un montant, d'un mot ou d'un paragraphe, qui laisse intact tout le reste de la page (vérifiée par des outils qui ne sont pas les nôtres sur des PDF de LibreOffice, Chromium, Ghostscript, Cairo et reportlab) ; « Rechercher, remplacer » pour un mot partout ; l'avertissement et le cadre rouge quand le texte corrigé touche son voisin.",
      },
      {
        limite: "Le caviardage ne reconnaît pas de lui-même une donnée personnelle : il retire ce que la personne désigne (une zone, un mot, un modèle : numéro AVS, IBAN…)",
        apres:
          "Un mode « certifié » qui reconstruit le fichier, un journal, et un contrôle indépendant (quatre outils qui ne sont pas les nôtres) sur dix-sept documents piégés à chaque construction.",
      },
      {
        limite: "Pas de travail à plusieurs en même temps sur le même fichier, pas de synchronisation, pas de nuage : par construction, rien ne sort du poste",
        apres: "Le verrou de document (qui l'a ouvert, depuis quand) et la comparaison de date avant d'écraser le travail d'une collègue ; la comparaison de deux versions d'un document.",
      },
      {
        limite: "L'export vers Word garde les titres, les paragraphes et les sauts de page ; les tableaux sont défaits, la mise en page n'est pas reproduite",
        apres: "« Copier un tableau vers Excel » (montants lus en nombres), l'export en texte, l'export en images.",
      },
      {
        limite: "La reconnaissance de texte (OCR) n'est pas parfaite : environ 96–98 % des caractères sur les pages de référence de l'éditeur (français, allemand), moins sur un scan abîmé, un manuscrit ou un tableau dense",
        apres: "L'écran de relecture du texte reconnu (un mot corrigé est ce qui part dans le PDF) ; la mesure est refaite à chaque construction.",
      },
    ],
  },
];
