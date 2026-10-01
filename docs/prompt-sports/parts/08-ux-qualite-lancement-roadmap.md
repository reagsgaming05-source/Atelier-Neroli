# PARTIE 8 — UX et design system, intégrations, qualité, sécurité, conformité, analytics, lancement et feuille de route

> Cette partie est la contrainte transversale du projet. Les Parties 1 à 7 disent QUOI construire ; celle-ci dit COMMENT cela doit se voir, se sentir, être testé, sécurisé, publié et ordonné. En cas de conflit entre une partie fonctionnelle et cette partie sur l'ordre de livraison, la feuille de route (8.14) fait foi. Placeholders : [STACK_MOBILE], [STACK_BACKEND], [STACK_DB], [STACK_ANALYTICS], [STACK_CI], [STACK_CARTES], [STACK_OBSERVABILITE].

---

## 8.1 Design system

### 8.1.0 Règle d'or : Sports reprend le design de [NOM_APP_FIT]
La source de vérité visuelle est l'app et le dépôt **[NOM_APP_FIT]**. Tu ne crées PAS un nouveau design : tu audites celui de Fit, tu l'extrais dans un paquet partagé, puis tu l'étends pour le sport. Interdit : inventer une couleur, une police, un rayon ou une ombre. Toute valeur absente de Fit est soit dérivée d'une valeur de Fit par une règle écrite (ex. « +15 % de luminosité »), soit marquée `À VALIDER PAR LE FONDATEUR` dans `DESIGN_AUDIT.md`.

### 8.1.1 Principes visuels (hérités, à confirmer par l'audit)
1. **Lisible en mouvement** : une métrique critique (allure, distance, FC) se lit en moins d'une seconde, à bout de bras, sous le soleil.
2. **Cohérence d'écosystème** : un utilisateur qui passe de Fit à Sports ne doit percevoir ni rupture de composants, ni rupture de ton ; seule l'identité sportive (accents par discipline, cartes, graphiques) est nouvelle.
3. **Données d'abord** : graphiques et cartes sont des composants de première classe.
4. **Divulgation progressive** : un écran = une question ; le détail avancé est à un tap.

### 8.1.2 Méthode d'audit de Fit, pas à pas
Exécute ces étapes AVANT tout écran de Sports (livrable de la Phase 0, voir 8.14) :
1. **Inventaire** : liste les fichiers de thème, de styles, de composants et d'assets du dépôt Fit (recherche : `theme`, `colors`, `tokens`, `styles`, `typography`, `spacing`, fichiers de police, SVG d'icônes, fichiers Lottie ou d'animation, fichiers de traduction).
2. **Extraction mécanique** : produis un export brut de toutes les valeurs réellement utilisées (couleurs hex, tailles et poids de police, espacements, rayons, ombres, durées d'animation) avec le nombre d'occurrences et les fichiers d'usage ; ne retiens que ce qui est utilisé.
3. **Captures de référence** : prends une capture de chaque écran de Fit en clair, sombre et texte ×1 / ×2 (appareil ou simulateur) et range-les dans `docs/design/fit-reference/`.
4. **Normalisation** : regroupe les quasi-doublons (ex. trois gris presque identiques) en proposant une table de fusion ; ne fusionne rien sans l'indiquer dans l'audit.
5. **Tokenisation** : transforme en tokens sémantiques (`color.bg.base`, `space.4`, `radius.m`…) au format Design Tokens W3C, avec la valeur issue de Fit et la source (fichier:ligne).
6. **Contrastes** : calcule le contraste de chaque paire texte/fond ; signale ce qui est sous AA (4,5:1 texte normal, 3:1 grand texte et éléments graphiques) et propose une correction minimale, sans l'appliquer à Fit sans accord.
7. **Composants** : recense chaque composant de Fit avec ses variantes et états ; marque chacun `RÉUTILISÉ`, `À ÉTENDRE` ou `À CRÉER`.
8. **Ton rédactionnel** : relève 30 chaînes représentatives (boutons, erreurs, vides, encouragements) et en déduis un guide (tutoiement ou vouvoiement, longueur, emoji, ponctuation).
9. **Écarts** : liste les incohérences internes de Fit (dette) ; ne les reproduis pas dans le paquet partagé sans décision.
10. **Validation** : présente `DESIGN_AUDIT.md` au fondateur ; aucun développement d'écran avant son accord.

**Format de `DESIGN_AUDIT.md`** : (a) Résumé en 10 lignes ; (b) Tableau Tokens (nom, valeur Fit, source, occurrences, contraste, décision) ; (c) Typographie ; (d) Espacements, rayons, ombres ; (e) Mouvements ; (f) Thèmes présents (clair/sombre/autres) ; (g) Inventaire des composants (nom, variantes, états, statut RÉUTILISÉ/À ÉTENDRE/À CRÉER) ; (h) Iconographie et illustrations ; (i) Guide de ton ; (j) Dette et incohérences ; (k) Plan d'extraction vers le paquet partagé ; (l) Questions ouvertes.

### 8.1.3 Paquet partagé et gouvernance
- Crée `packages/design-system` (ou un dépôt/paquet versionné consommé par les deux apps ; recommandation : monorepo si Fit et Sports partagent la stack [STACK_MOBILE], sinon paquet privé publié) contenant : `tokens.json` (source unique), générateurs de code natif/JS (Style Dictionary ou équivalent), composants, icônes, guide de ton, stories.
- **Propagation** : une modification d'un token ou d'un composant partagé se fait en UN seul endroit et se propage aux deux apps à la mise à jour de la dépendance ; les deux apps sont reconstruites et testées visuellement par la CI du paquet avant publication.
- **Versionnement sémantique** : patch (correction sans effet visuel notable), mineur (ajout), majeur (changement visuel ou d'API). Un majeur exige l'accord du fondateur et un plan de migration des deux apps ; un changement qui modifie l'apparence de Fit ne se fait jamais « en passant » depuis Sports.
- **Couches** : `eco.*` (noyau partagé, repris de Fit, immuable côté Sports) ; `sports.*` (extensions propres à Sports, voir ci-dessous) ; aucune couche `sports.*` ne redéfinit un token `eco.*`.
- **Migration de Fit** : Fit adopte le paquet progressivement (Phase 0 : lecture seule ; ensuite remplacement des constantes locales par les tokens, écran par écran, avec captures de non-régression). Ne casse pas Fit.
- **Revue** : toute PR sur le paquet exige un second relecteur et la mise à jour des stories.

### 8.1.4 Ce qui est réutilisé, étendu, créé
| Statut | Éléments |
|---|---|
| **Réutilisé tel quel (valeur issue de l'audit de Fit)** | Neutres de fond et de texte, couleurs sémantiques (succès, alerte, danger), typographie et échelle, espacements, rayons, ombres, mouvements, boutons, champs, cases, interrupteurs, listes, cartes génériques, onglets, feuilles modales, bannières, toasts, squelettes, états vides, erreurs, avatar, trophées, amis, paywall (structure), icônes générales |
| **Étendu pour le sport** | Palette d'accents par discipline : marche, randonnée, course, vélo (valeur dérivée de la couleur d'accent de Fit par une règle de teinte documentée dans l'audit, jamais seule : toujours icône + libellé) ; couleurs de zones d'intensité 1 à 5 (valeurs à valider, toujours doublées d'un numéro) ; chiffres tabulaires et style « métrique live » basé sur la police de Fit ; icônes de sport dans le trait et la grille des icônes de Fit |
| **Créé pour Sports** | Composants : métrique live (très grand format), bandeau live d'enregistrement, bouton géant d'enregistrement, carte géographique et contrôles, tracé, profil d'altitude lié à la carte, graphiques (ligne, barres, aire de charge, zones empilées, radar, jauge de forme, sparkline, calendrier-chaleur), anneau de progression hebdomadaire, curseur RPE, sélecteur d'allure/FC (roue), carte de séance structurée (barres de blocs), carte météo, étiquette de droit (Sports/Fit/Ultra), indicateur capteurs/GPS/batterie |
| **Nouveau thème** | **Plein soleil** : variante de contraste maximal dérivée des thèmes de Fit (fond et texte aux extrêmes du jeu de neutres de Fit, bordures épaissies, sans transparence sur la carte) ; contraste ≥ 10:1 sur tout élément informatif ; activable manuellement ou par capteur de luminosité |
| **Option batterie** | Écran d'enregistrement « sombre économe » (OLED) dérivé du thème sombre de Fit |

Règles de contraste (cibles, valeurs de couleur issues de l'audit) : texte normal ≥ 4,5:1 (AA) ; métriques live et texte secondaire ≥ 7:1 (AAA) ; éléments graphiques ≥ 3:1. Un test automatique sur `tokens.json` échoue le build si une paire déclarée passe sous son seuil. Si une paire de Fit est insuffisante, le paquet partagé la corrige pour les deux apps après accord du fondateur.

**Échelle et mouvement** : reprends tels quels les paliers de typographie, d'espacement, de rayon, d'ombre et de durée de Fit (valeurs issues de l'audit). Seul ajout : un style `display.metric` (valeur issue de l'audit : taille la plus grande de Fit × facteur documenté) pour les métriques live. Les ombres en thème sombre suivent la convention de Fit.

### 8.1.5 Composants (liste exhaustive ; Fit d'abord)
Chaque composant a : variantes, états (défaut, pressé, focus, désactivé, chargement, erreur si pertinent), version claire/sombre/plein soleil, story. Colonne Statut : R = réutilisé de Fit, E = étendu, C = à créer.

| Famille | Composants | Statut | Variantes et états clés |
|---|---|---|---|
| Actions | Bouton primaire, secondaire, tertiaire, destructif | R | chargement avec libellé conservé |
| | Bouton géant d'enregistrement (min 72 pt) | C | prêt, en cours, pause, verrouillé |
| | Bouton icône, flottant, interrupteur, case, radio, segment | R | cible ≥ 48 dp |
| Saisie | Champ texte, date, recherche, curseur | R | erreur sous le champ, aide, compteur |
| | Nombre avec unité, durée (hh:mm:ss), roue allure/FC | E/C | conversion d'unités |
| Listes | Ligne de liste générique | R | glisser pour supprimer avec annulation |
| | Ligne d'activité (vignette de tracé), ligne de séance, ligne de segment | C | |
| Cartes UI | Carte générique, carte coach, carte objectif | R/E | compacte / étendue ; squelette |
| | Carte activité, carte plan, carte météo, carte métrique | C | |
| Graphiques | Ligne, barres, aire, zones empilées, radar, jauge, sparkline, calendrier-chaleur | C (réutiliser la bibliothèque de graphiques de Fit si elle existe) | tooltip tactile, version tableau accessible, palette daltonisme-safe, figé hors ligne |
| Cartes géo | Vue carte, tracé, marqueur, jalons, profil d'altitude lié, contrôles | C | styles clair/sombre/plein soleil/topo ; hors ligne ; contrôles ≥ 48 dp |
| Navigation | Barre d'onglets (5 onglets), barre supérieure, fil d'étape | R/E | badge, onglet actif |
| Feuilles | Feuille modale (3 crans), dialogue de confirmation, menu contextuel | R | geste de fermeture + bouton explicite |
| Onglets internes | Segmented tabs, chips de filtre | R | scrollables |
| Retours | Bannière, toast, badge, progression | R | bannière unique par priorité : sécurité > hors ligne > info |
| Chargement | Squelettes (carte, ligne) | R ; graphique et carte géo : C | shimmer désactivé si mouvement réduit |
| États vides | Illustration + titre + action | R (style) ; 6 nouvelles illustrations C | |
| Erreurs | Inline, plein écran, réseau, autorisation (GPS, santé) | R/E | cause, remède, bouton |
| Spécifiques | Anneau de progression hebdo, puce de zone, bandeau live, curseur RPE, étiquette de droit, indicateur capteurs | C | |

### 8.1.6 Iconographie et illustrations
Réutilise le jeu d'icônes de Fit (trait, grille, coins) ; dessine en plus les icônes de sport dans les mêmes règles : marche, randonnée, course (route, trail, piste), vélo (route, gravel, VTT, ville, électrique) et réserves pour la vague 2 (foot, basket, tennis, padel…). Chaque icône existe en trait et rempli. SVG, nom `icon.sport.run`. Une icône n'est jamais seule porteuse de sens. Illustrations : même style que Fit (audit) ; 6 situations au lancement (premier lancement, aucun plan, hors ligne, permission refusée, objectif atteint, erreur serveur).

### 8.1.7 Animations
Reprends les principes et durées de Fit. Ajouts Sports : incrémentation de métrique à chiffres tabulaires sans saut de largeur, anneau qui se remplit, tracé qui se dessine sur la carte du récapitulatif, célébration d'objectif (≤ 1,5 s). Toute animation est fonctionnelle, interruptible. **Réduction de mouvement** : si le réglage système est actif, tout déplacement devient un fondu bref, sans shimmer, confettis ni parallaxe ; un test automatisé vérifie la lecture du réglage.

### 8.1.8 Bibliothèque et tests visuels
Storybook (ou équivalent natif) dans le paquet partagé : une story par état et par thème, contrôles, notes d'accessibilité, exemples de textes français longs, « Do / Don't ». **Tests visuels** : capture automatique de chaque story (clair, sombre, plein soleil, texte ×1 et ×2, français long) comparée aux références ; seuil de différence 0,1 % ; revue humaine pour toute mise à jour de référence ; exécutés sur chaque PR du paquet, pour les deux apps. Les captures de `docs/design/fit-reference/` servent de contrôle : les écrans de Fit migrés doivent rester identiques au pixel près (tolérance 0,1 %).

Critères d'acceptation 8.1 : (a) `DESIGN_AUDIT.md` validé avant tout écran Sports ; (b) aucune valeur de couleur ou de taille en dur dans Sports (règle de lint) ; (c) toute valeur de token a une source Fit ou une règle de dérivation écrite ; (d) une modification du paquet se retrouve dans les deux apps dans la même release de CI ; (e) 100 % des composants listés ont une story et 4 thèmes validés ; (f) le build échoue si un contraste déclaré est insuffisant.

---

## 8.2 Architecture de l'information et navigation

### 8.2.1 Les 5 onglets
| Onglet | Question à laquelle il répond | Contenu, de haut en bas |
|---|---|---|
| **Aujourd'hui** | « Que dois-je faire maintenant ? » | Salutation + météo ; carte « Séance du jour » (action unique : Démarrer) ; état de forme/charge en une ligne ; message du coach (1 phrase) ; semaine en cours (anneaux) ; rappel nutrition si Fit lié ; objectifs proches |
| **Enregistrer** | « Je pars. » | Choix du sport, de la séance guidée ou libre, état GPS/capteurs/batterie, bouton géant Démarrer ; derniers modèles d'itinéraires |
| **Explorer** | « Où aller ? » | Carte plein écran, recherche, filtres (sport, distance, dénivelé, difficulté), itinéraires proches, sauvegardés, cartes hors ligne, météo/conditions |
| **Progression** | « Où j'en suis ? » | Charge et forme, volume, records, objectifs, plan en cours, historique des activités, bilan santé |
| **Social** | « Qui bouge avec moi ? » | Fil d'amis, défis, clubs, classements d'amis, trophées, partage de suivi en direct (voir Partie 7) |

Le coach n'est pas un onglet : il est omniprésent (carte sur Aujourd'hui, bouton « Demander au coach » en en-tête de Progression, après chaque séance), pour ne pas fragmenter l'expérience (voir Partie 5). Profil et Réglages : avatar en haut à droite de chaque onglet racine.

### 8.2.2 Hiérarchie et règles
- Profondeur maximale de pile : 3 écrans avant un détail ; chaque écran a un retour explicite.
- Le bouton Enregistrer est visuellement dominant dans la barre (forme proéminente) mais reste un onglet, pas un modal.
- Un onglet conserve sa pile à la sélection ; retaper l'onglet actif revient à la racine puis remonte en haut.
- Les badges d'onglet indiquent uniquement : séance du jour non faite, invitation reçue, alerte sécurité.

### 8.2.3 Deep links et liens universels
Schéma `[SCHEME_SPORTS]://` et liens universels `https://[DOMAINE]/…`. Routes minimales : `/today`, `/record?sport=run&plan=<id>`, `/activity/<id>`, `/route/<id>`, `/plan/<id>`, `/session/<id>`, `/goal/<id>`, `/friend/<id>`, `/challenge/<id>`, `/live/<token>` (suivi), `/paywall?feature=<clé>`, `/settings/<section>`, `/fit/<chemin>` (passerelle, voir Partie 7). Règles : toute route authentifie d'abord puis redirige (conservation de la destination) ; une route inconnue ouvre Aujourd'hui avec un toast ; un lien vers une ressource privée d'un autre utilisateur affiche « Ce contenu n'est pas accessible » sans révéler son existence ; tests automatisés pour chaque route, app froide et app en arrière-plan.

### 8.2.4 Navigation pendant l'enregistrement
- Une séance en cours verrouille la navigation vers un **bandeau live** persistant au-dessus de la barre d'onglets (sport, durée, distance, pause) : l'utilisateur peut consulter Explorer ou Social sans interrompre la séance.
- Le plein écran d'enregistrement se rouvre d'un tap sur le bandeau.
- Interdit pendant l'enregistrement : modales bloquantes, publicités, paywall, demandes de notation, mises à jour.
- Écran verrouillé : métriques lisibles via Live Activity/notification persistante ; appui long ou glisser pour reprendre, pas de bouton Stop accidentel (confirmation).

### 8.2.5 Widgets, Live Activities, raccourcis, assistants
| Surface | Contenu | Notes |
|---|---|---|
| Widget accueil petit | Séance du jour + Démarrer | deep link `/record` |
| Widget accueil moyen | Anneaux de la semaine + prochaine séance | mise à jour par rafraîchissement système ≤ 4 fois/h |
| Widget écran verrouillé | Anneau d'objectif hebdo, ou statut de la séance en cours | |
| Live Activity iOS / notification persistante Android (service de premier plan) | Durée, distance, allure, pause/reprise | mises à jour ≤ 1/s côté app, throttlé par plateforme ; ne contient aucune donnée de localisation brute |
| Raccourcis d'app (appui long icône) | Démarrer course, Démarrer vélo, Démarrer marche, Dernière activité | |
| Siri / Assistant | « Démarre une course », « Pause », « Termine ma séance », « Quelle est ma séance aujourd'hui ? » | App Intents (iOS) et App Actions (Android) ; une phrase de confirmation vocale |
| Montre | Voir 8.6 | |

### 8.2.6 Tablettes, plis, orientation
- Mise en page adaptative par classes de taille (compact, moyen, étendu) : en étendu, barre latérale à la place des onglets, liste + détail côte à côte (activités, itinéraires), carte en panneau fixe.
- Appareils pliables : continuité d'état au pliage/dépliage sans perte de séance ; posture « tabletop » : métriques en haut, carte en bas.
- Orientation : portrait par défaut sur téléphone ; paysage autorisé pour carte, graphiques et récapitulatif ; écran d'enregistrement supporte les deux (support vélo). Pas de rotation en cours de pause involontaire : l'état est conservé.

Critères d'acceptation 8.2 : toutes les routes testées ; enregistrement non interrompu par navigation, rotation, changement de thème ou appel entrant ; widget et Live Activity ne divulguent pas de position exacte.

---

## 8.3 Écrans clés (wireframes en texte)

Convention : `[ ]` bouton, `( )` valeur, `~` graphique, `▒` carte. Les wireframes utilisent d'abord les composants de [NOM_APP_FIT] (R dans 8.1.5 : boutons, cartes génériques, onglets, feuilles, bannières, toasts, squelettes, états vides, paywall) ; les composants à créer sont nommés en `code` : `MetricLive`, `LiveBanner`, `RecordButton`, `MapView`, `ElevationProfile`, `LoadChart`, `ProgressRing`, `SessionCard`, `ActivityRow`, `WeatherCard`, `RpeSlider`, `ZoneChip`, `EntitlementBadge`, `SensorStatus`. Tous les textes sont ici fournis en français et stockés dans les fichiers de traduction (8.5), jamais en dur.

### 8.3.1 Aujourd'hui
Objectif : donner la prochaine action en 2 secondes.
```
Bonjour Léa ☀ 18 °C, vent faible          (avatar)
┌──────────────────────────────────────┐
│ SÉANCE DU JOUR · Footing facile      │
│ 45 min · Zone 2 · Parc de la Tête d'Or│
│ Pourquoi : tu as bien récupéré.      │
│ [ Démarrer ]            [ Modifier ] │
└──────────────────────────────────────┘
Forme : Bonne (○○○●○)   Charge 7 j : équilibrée
Coach : « Reste en aisance respiratoire aujourd'hui. »
Cette semaine : ◔ 3/4 séances · 22 km · 1 h 40
Objectif : Semi-marathon · J-47 · Sur la bonne voie
```
États : **vide** (aucun plan) → « Choisis un objectif et je construis ton plan » + [Créer mon plan] + [Enregistrer une sortie libre] ; **chargement** → squelettes des 3 cartes ; **erreur** → bannière « Impossible de mettre à jour. Affichage de tes dernières données » + [Réessayer] ; **hors ligne** → bannière grise « Hors ligne. Ta séance reste disponible », météo masquée. Cas limites : séance du jour déjà faite (carte « Bien joué » + proposition de récupération) ; jour de repos ; blessure déclarée (la carte devient « Mobilité et marche douce ») ; Fit lié et séance de muscu prévue le même jour (carte double, voir Partie 5).

### 8.3.2 Enregistrement en direct
Objectif : informations vitales, zéro friction, sécurité.
```
 ● GPS fort   ♥ 142   🔋 78 %          (état capteurs)
        DURÉE            
        00:32:14                      (display.xl)
   DISTANCE 5,42 km    ALLURE 5:57 /km
   ▒▒▒▒▒ carte (repliable) ▒▒▒▒▒▒
   Coach vocal : « Tu es dans la zone cible. »
 [ ⏸ Pause ]   [ Tour ]   [ ⏹ Terminer (appui long) ]
```
Éléments : 4 champs de données configurables (jusqu'à 3 pages balayables), auto-pause, tour manuel/automatique, bouton SOS et partage de suivi (voir Partie 4), verrouillage tactile. États : **GPS faible** → bannière « Signal GPS faible, la distance peut être imprécise » ; **permission refusée** → écran guide vers Réglages avant démarrage ; **batterie < 15 %** → proposition du mode économie ; **hors ligne** → aucun changement visible (tout est local) ; **appel entrant** → séance continue, pause auto optionnelle. Interactions : appui long 1,5 s pour terminer, annulation par geste, haptique à chaque tour. Reprise après plantage (voir Partie 3) : au relancement « Une séance était en cours. [Reprendre] [Terminer et enregistrer] ».

### 8.3.3 Récapitulatif de séance
Objectif : récompenser, expliquer, décider de la suite.
Éléments : carte du tracé animée ; titre éditable (« Course du matin ») ; métriques clés (durée, distance, allure moyenne, dénivelé, FC moyenne) ; graphiques allure/altitude/FC liés à la carte ; ressenti et RPE (obligatoire en 1 tap, passable) ; effet sur la charge (« +62 de charge, forme légèrement fatiguée ») ; records battus ; message du coach ; [Enregistrer] [Partager] [Supprimer]. États : **sauvegarde locale** immédiate puis « Synchronisation… » ; **hors ligne** → « Enregistrée sur ton téléphone, envoi dès que possible » ; **erreur de synchronisation** → badge discret dans l'historique, nouvelles tentatives automatiques. Cas limites : séance < 2 min (« Séance très courte. L'enregistrer quand même ? ») ; données GPS incohérentes (saut > seuil, voir Partie 3) → bandeau « Nous avons corrigé N points aberrants » + [Voir l'original].

### 8.3.4 Détail d'activité
Onglets : Résumé · Analyse · Tours · Carte · Photos. Actions : modifier, partager (avec zone de confidentialité), exporter (GPX/FIT), supprimer avec confirmation, reclasser le sport. Analyse : zones, découplage, allure par km, comparaison avec séances similaires. États : chargement par squelettes ; trace volumineuse chargée en décimation progressive ; activité importée (badge de source, par exemple Strava ou Garmin) ; activité d'un ami (lecture seule, confidentialité respectée).

### 8.3.5 Plan d'entraînement
Objectif : rendre le plan lisible et modifiable. Éléments : en-tête (objectif, date, progression en %) ; calendrier de semaine avec séances glissables ; vue plan complet par blocs (base, développement, affûtage) ; bouton « Ajuster » (déplacer, alléger, sauter une séance : le coach recalcule, voir Partie 5) ; explication « Pourquoi ce plan ? ». États : vide (création en 4 questions : objectif, date, disponibilités, niveau), plan en cours, plan terminé, plan suspendu (blessure). Droits : plan complet selon abonnement, paywall contextuel (8.3.11). Cas limites : date d'objectif trop proche (« Il reste 3 semaines : je te propose un plan réduit »), données insuffisantes pour le niveau.

### 8.3.6 Bibliothèque de séances
Éléments : recherche, filtres (sport, durée, intensité, matériel, terrain), carte de séance avec structure en barres (échauffement, blocs, retour au calme), [Ajouter au plan] [Démarrer] [Favori]. États : vide des favoris ; erreur de chargement avec cache ; séances Fit visibles sous un filtre « Muscu » si lié.

### 8.3.7 Carte et itinéraire
Objectif : trouver, évaluer, suivre un itinéraire. Éléments : carte avec tracé, profil d'altitude interactif, statistiques (distance, dénivelé +/-, durée estimée, difficulté), météo prévue, points d'eau et refuges, alertes (voir Partie 4), [Télécharger hors ligne (23 Mo)] [Naviguer] [Enregistrer]. États : téléchargement avec progression et reprise ; stockage insuffisant (« Il faut 120 Mo. Libère de l'espace ou réduis la zone ») ; hors ligne avec zone non téléchargée (« Carte indisponible ici ») ; hors tracé en navigation (« Tu t'écartes de 80 m. [Recalculer] »).

### 8.3.8 Progression et charge
Éléments : sélecteur période (7 j, 6 sem., 1 an) ; jauge de forme ; graphique charge aiguë/chronique avec zone cible ombrée et version tableau ; volume hebdo par sport (barres empilées) ; records ; tendances (allure à FC constante) ; bilan santé (sommeil, FC repos, VFC, voir Partie 5). Texte d'aide à chaque métrique (« Qu'est-ce que c'est ? »). États : **moins de 3 séances** → « Il me faut encore quelques séances pour estimer ta forme » (jamais de chiffre inventé) ; sans données santé → carte d'invitation à connecter Santé ; erreur avec cache.

### 8.3.9 Objectifs
Types : distance, durée, fréquence, événement (course/rando), dénivelé, poids de forme (si Fit lié). Création en 3 étapes (type, valeur, échéance) avec faisabilité (« Réaliste », « Ambitieux », « À revoir »). États : atteint (célébration), en retard (message non culpabilisant : « Ajustons la cible »), abandonné (archivé). Cas limite : objectif contradictoire avec une blessure.

### 8.3.10 Profil
Avatar, pseudo, niveau, trophées (voir Partie 7), statistiques à vie, zones personnelles (FC max, FTP, seuils, avec source et date de calcul), matériel (chaussures avec kilométrage et alerte d'usure à 700 km, vélos), confidentialité (visibilité, zones masquées), abonnement. États : profil incomplet (checklist « 3 étapes pour un coach précis »).

### 8.3.11 Paywall
Principes : jamais pendant l'enregistrement ; toujours contextuel (déclenché par la fonction convoitée) ; valeur avant prix ; sortie visible. Éléments : titre bénéfice (« Débloque ton plan jusqu'au jour J »), 3 puces, comparatif Gratuit / Sports / Fit / Ultra (voir Partie 2), prix avec périodicité et prix annuel ramené au mois, essai gratuit avec date de fin explicite, [Continuer], [Restaurer mes achats], liens CGU/confidentialité, mention de résiliation (« Résiliable à tout moment dans les réglages de ton compte »), croix de fermeture ≥ 48 dp. États : produits indisponibles (store injoignable → « Les offres ne sont pas disponibles pour le moment ») ; achat en attente ; déjà abonné (redirection) ; abonnement acquis via Fit (reconnaissance, voir Partie 2). Cas limite : essai déjà consommé → pas de mention d'essai.

### 8.3.12 Réglages
Sections : Compte, Abonnement, Unités (km/mi, °C/°F), Enregistrement (auto-pause, bips, champs), Capteurs et appareils, Santé et données (connexions, export, suppression), Confidentialité (analytics, partage, zones), Notifications (par catégorie, heures calmes), Apparence (thème, plein soleil), Langue, Accessibilité, À propos (version, licences, mentions médicales). États : suppression de compte en 2 étapes avec délai de grâce de 30 jours ; export de données généré en arrière-plan avec notification.

---

## 8.4 Accessibilité

Cible : **WCAG 2.2 niveau AA** sur tous les écrans, AAA sur les métriques d'enregistrement, conformité **RGAA 4.x** (référentiel français) et **directive européenne sur l'accessibilité (EAA, applicable aux services depuis juin 2025)** ; publier une déclaration d'accessibilité et un schéma pluriannuel.

| Domaine | Exigences exécutables |
|---|---|
| Lecteurs d'écran (VoiceOver, TalkBack) | Chaque élément interactif a un label, un rôle, un état ; ordre de lecture = ordre visuel ; regroupement des cartes en un seul élément avec action ; images décoratives masquées ; graphiques : résumé textuel (« Charge en hausse de 12 % sur 7 jours ») + tableau de données consultable |
| Annonces dynamiques | Enregistrement : annonce vocale (réglable) tous les km/min ; changements d'état (pause, GPS perdu) annoncés en région « polie » ; alertes de sécurité en mode « assertif » ; jamais d'annonce par seconde |
| Texte dynamique | Support jusqu'à 200 % (iOS : catégories d'accessibilité ; Android : échelle de police 2.0) sans troncature de contenu essentiel ; les métriques live passent à une seule colonne |
| Contrastes | Voir 8.1.4 ; ne jamais coder l'information par la seule couleur |
| Cibles tactiles | ≥ 44 pt iOS / 48 dp Android, espacement ≥ 8 ; boutons d'enregistrement ≥ 72 pt |
| Usage à une main et en mouvement | Actions principales dans la moitié basse ; pas de geste complexe pendant l'effort ; appui long avec retour haptique ; verrou tactile ; commandes vocales ; grands chiffres |
| Daltonisme | Palette graphique testée en protanopie/deutéranopie/tritanopie ; zones identifiées par numéro, motif et libellé ; mode « motifs » optionnel |
| Sous-titres et transcriptions | Toute vidéo (tutoriels, séances) a sous-titres français et transcription ; coach vocal : texte équivalent affiché |
| Animations | Réduction de mouvement respectée (8.1.7) ; aucune animation clignotante > 3 Hz |
| Voix | Commandes vocales de base (8.2.5) ; saisie dictée supportée dans tous les champs |
| Cognitif | Langage simple (niveau B1), pas de limite de temps sur la saisie, confirmation des actions destructives |

**Tests automatisés** : règles d'accessibilité dans les tests de composants et les tests end-to-end (outils : Accessibility Inspector/XCUITest audit, Accessibility Test Framework/Espresso, axe pour le web) ; échec de CI sur toute violation de niveau « critique ». **Tests manuels** : à chaque phase, parcours critiques (onboarding, démarrer/terminer une séance, achat) au VoiceOver et TalkBack, avec texte ×2, thème plein soleil, et par au moins 3 testeurs en situation de handicap (recrutés via une association) avant le lancement. **Critères d'acceptation** : 0 bloquant ouvert pour les parcours critiques ; déclaration d'accessibilité publiée avant le lancement public.

---
