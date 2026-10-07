# Fiche comparative honnête — brouillon interne, à vérifier avant toute diffusion

**Statut : ne pas envoyer, ne pas imprimer pour un client, ne pas mettre sur le site.** Tout ce qui concerne un concurrent vient d'extraits de
recherche et de documentation lus le 1er octobre 2026 ; aucun concurrent n'a été installé ni essayé, et la plupart de leurs pages officielles n'ont pas pu
être ouvertes. Une comparaison publiée doit être exacte et non trompeuse (art. 3 al. 1 let. e et f LCD — [JURISTE] à confirmer) : une case fausse, et la
fiche entière ne vaut plus rien devant un service juridique. Les cellules marquées **†** sont à vérifier à la source avant usage ; la liste est en bas.

Une règle de rédaction : **les cases où l'on perd s'écrivent en premier et sans adoucir.** Un acheteur public qui trouve lui-même une case manquante cesse
de croire le reste ; un fournisseur qui l'annonce gagne en crédibilité.

## Ce que l'on dit de soi (chaque ligne se prouve dans le dépôt ou en démonstration)

| Critère | Aktum PDF |
| --- | --- |
| Peut-il appeler l'extérieur ? | Non, par construction : résolveur de noms fermé, mandataire mort, requêtes refusées, page sous politique de sécurité ; vérifié à chaque version derrière un mandataire d'observation, et rejouable par le client (fiche « Comment vérifier que rien ne sort ») |
| Installation | Dossier portable, aucun droit d'administrateur ; pas d'installateur (.msi) — voir « Ce que le logiciel ne fait pas encore » |
| Plateformes | Windows et macOS (un seul binaire universel) |
| Langues | Français et allemand pour l'interface et la documentation (traductions à relire par une personne de langue allemande) ; italien : non |
| Dossier de pièces (sommaire, intercalaires, pagination) | Oui, et le sommaire se refait quand on déplace une pièce |
| Caviardage | Oui : texte réellement retiré, page reconstruite à l'export, vérifié sur les octets du fichier produit |
| Reconnaissance de texte | Oui, sur le poste, français et allemand |
| Comparaison de deux versions, numérotation, traitement par lots | Oui |
| Signature | Dessinée, ou **avancée** par certificat local (.p12) ; **pas qualifiée** (SCSE) |
| Archivage PDF/A | Export PDF/A-2b et contrôle embarqué ; la conformité de l'archivage vaudois n'est pas attestée par un tiers |
| Accessibilité | Documents produits balisés ; un PDF reçu déjà balisé perd son balisage quand on le recompose |
| Support | Un éditeur d'une personne, délais écrits en jours ouvrables (procédure de support) |
| Code source | Public, relisible par l'informaticien du service ; licence propriétaire |

## Là où l'on perd (à dire avant qu'on ne nous le dise)

1. **Face à Microsoft Edge et à Acrobat Reader, déjà installés et gratuits** : ils couvrent lire, imprimer, annoter, remplir, signer d'un trait — la majorité des
   gestes d'un secrétariat. Notre argument n'est pas « faites tout chez nous », c'est les cinq ou six gestes qu'ils ne font pas.
2. **Face aux outils en ligne gratuits (iLovePDF et pairs)** † : un clic, aucune décision à prendre. Nous ne gagnons que sur un point, qui est le seul qui compte pour
   une commune : le document n'en sort pas.
3. **Face à PDF-XChange Editor** † : il coûte l'ordre d'une soixantaine de dollars, couvre presque toute la matrice fonctionnelle, **a lui aussi une version
   portable**, et nous est supérieur sur le nombre de fonctions. Nous ne le battons ni sur le prix ni sur « rien à installer ». Nous le battons — si nous
   le battons — sur le métier (dossier de pièces, pages vides, tableaux de montants en francs), la langue, macOS, et le fait que notre application ne peut pas
   appeler l'extérieur (à vérifier de leur côté : nous ne savons pas ce que le leur fait).
4. **Face à Stirling PDF** † : gratuit, libre, auto-hébergeable ; un informaticien intercommunal le pose en une après-midi sur un serveur du réseau communal, et
   toute l'équipe l'utilise par navigateur. Pour une commune qui a un informaticien et un serveur, il peut nous rendre invendables. Notre réponse (poste de
   travail sans serveur à tenir, ni mise à jour de serveur, ni compte à gérer, installation chez les collègues qui n'ont pas de serveur) est valable seulement là
   où il n'y a ni serveur ni informaticien.
5. **Face à Acrobat** : plus de fonctions, partout, et c'est le format de référence — un document qui s'affiche autrement ailleurs qu'Acrobat est réputé fautif.
   Acrobat Standard ne caviarde pas † ; Acrobat Pro caviarde, reconnaît le texte, compare, produit du PDF/A.
6. **Face aux suites métier suisses** † : elles occupent déjà le budget informatique et la relation de confiance ; la voie est la revente, pas la bataille.
7. **Sur la signature qualifiée, le PDF/UA certifié, la ligne d'assistance par téléphone, l'installateur .msi, Linux, l'italien, un revendeur en Suisse, un
   deuxième éditeur si le premier s'arrête** : nous ne l'avons pas. Chaque ligne est dans « Ce que le logiciel ne fait pas encore » ou dans le contrat (pérennité).

## Les trois épreuves à proposer (chacune se joue devant la personne, sans nous)

1. **Le câble débranché** (trois minutes) : couper le réseau, ouvrir, travailler, regarder les connexions. Notre logiciel n'y change rien ; un abonnement qui
   revalide sa licence tous les trente jours † ne peut pas en dire autant.
2. **Le dossier de pièces** : six documents reçus → un dossier paginé, avec sommaire et intercalaires, qui se refait quand on déplace une pièce (mesuré à 872 ms
   dans l'audit).
3. **Le caviardage vérifié sur le fichier produit** : caviarder un nom, exporter, rouvrir, chercher, copier — dans le lecteur de la personne.

## Ce qu'il ne faut pas dire

- Que nous égalons Acrobat : le chapitre « écart avec Acrobat » a chiffré le contraire.
- Que la résolution de privatim du 18 novembre 2025 † interdit les services PDF en ligne : ce n'est pas une interdiction légale, et le dire décrédibilise toute l'offre devant
  le seul lecteur qui compte, le juriste du canton.
- Qu'Adobe « lit les documents » : la controverse de juin 2024 sur les conditions d'utilisation a été suivie d'une clarification ; la citer sans elle serait inexact. L'issue
  de la procédure de la FTC † n'a pas été recherchée ; une citation doit être à jour.
- Un prix de concurrent en francs : aucun n'a été vérifié en francs, ni les remises par volume, ni les tarifs de l'administration publique ou de l'éducation.
- « Portable » comme argument premier : un concurrent à soixante dollars l'est aussi. L'argument est « ne peut pas appeler l'extérieur ».

## À vérifier à la source avant de diffuser quoi que ce soit (une demi-journée, depuis un poste ordinaire)

- Adobe : comparaison des versions d'Acrobat (adobe.com, helpx.adobe.com), prix et revalidation hors ligne tous les trente jours, fin de l'offre perpétuelle.
- Tracker Software : page tarifaire de PDF-XChange Editor, variantes portables, plateformes.
- Stirling PDF : page « Modes and Licensing », ce que fait l'application de bureau localement, ce qui passe par le serveur.
- privatim : texte de la résolution du 18 novembre 2025.
- Microsoft : fonctions de Edge pour les PDF.
- iLovePDF et autres services en ligne : où sont traités les documents.
- Foxit, Nitro, Tungsten Power PDF : prix et modèles de licence.
- Préposé vaudois à la protection des données : existe-t-il un avis cantonal sur les services PDF en ligne, et accepterait-il d'être cité ?
- Un **essai comparatif réel** contre Stirling PDF et PDF-XChange, sur un même lot de documents communaux : tant qu'il n'est pas fait, « notre détection
  de pages vides / notre reconnaissance de texte / notre caviardage valent mieux que les leurs » n'est pas une mesure — ne pas l'écrire.
