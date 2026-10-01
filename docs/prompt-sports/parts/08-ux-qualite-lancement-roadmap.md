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
Réutilise le jeu d'icônes de Fit (trait, grille, coins) ; dessine en plus les icônes de sport dans les mêmes règles : marche, randonnée, course (route, trail, piste), vélo (route, gravel, VTT, ville, électrique) et réserves pour de futures disciplines cardio (natation, ski de fond, aviron). Chaque icône existe en trait et rempli. SVG, nom `icon.sport.run`. Une icône n'est jamais seule porteuse de sens. Illustrations : même style que Fit (audit) ; 6 situations au lancement (premier lancement, aucun plan, hors ligne, permission refusée, objectif atteint, erreur serveur).

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

## 8.5 Internationalisation et localisation

- **Ordre** : français (lancement), anglais puis espagnol (Phase 8, voir 8.14). L'architecture i18n est complète dès la Phase 0 : zéro chaîne en dur (règle de lint qui échoue sur tout littéral visible).
- **Architecture** : catalogues par langue (ICU MessageFormat) ; clés sémantiques (`record.pause.confirm`) ; contexte et longueur maximale commentés pour les traducteurs ; plateforme de traduction [STACK_I18N] avec revue ; la langue de repli est le français ; une clé manquante affiche le français, jamais la clé brute, et déclenche un événement de monitoring.
- **Pluriels et genres** : règles CLDR (français : 0 et 1 au singulier ; espagnol et anglais selon CLDR) ; exemple : `{count, plural, =0 {Aucune séance} one {# séance} other {# séances}}`. Écriture inclusive : privilégier les formulations neutres.
- **Formats** : utiliser les API natives de formatage selon la locale (dates, heures 24 h/12 h, nombres : virgule décimale en français, espace fine insécable pour milliers) ; jamais de concaténation de chaînes.
- **Unités** : réglage indépendant de la langue. Distance km/mi ; allure **min/km** ou **min/mi** (conversion exacte : 1 mi = 1,609344 km) ; vitesse km/h ou mph pour le vélo ; altitude m/ft ; température °C/°F ; poids kg/lb. Stockage interne toujours en SI (mètres, secondes, m/s) ; la conversion n'existe qu'à l'affichage. Test : un aller-retour d'unités ne dérive pas de plus de 0,01 %.
- **Textes longs** : l'allemand n'est pas prévu mais l'espagnol et le français dépassent l'anglais de 20 à 30 % : les composants s'étendent, ne tronquent pas ; tests d'écran avec chaînes ×1,4.
- **RTL préparé** : propriétés logiques (début/fin au lieu de gauche/droite), icônes directionnelles miroir, cartes et graphiques non miroités (le temps va de gauche à droite pour les courbes, par convention), test avec une pseudo-locale RTL ; aucune langue RTL au lancement.
- **Localisation de contenu** : numéros d'urgence par pays (France 112 ou 15/17/18, SAMU 15, secours en montagne 112 ; Espagne 112 ; Royaume-Uni 999) stockés dans une table de données versionnée, jamais dans le code ; le pays est déduit de la position pour le bouton SOS (voir Partie 4) et non de la langue ; itinéraires et séances ont une langue et un pays ; noms de lieux dans la langue locale ; avertissements médicaux et mentions légales par juridiction.
- **Pseudo-localisation** : une locale artificielle (accents, allongement +40 %, crochets `[!! … !!]`) est construite en CI ; des tests visuels l'exécutent sur les écrans clés et échouent sur toute troncature, chevauchement ou texte non entouré de crochets (preuve d'une chaîne en dur).
- Critères d'acceptation : 0 chaîne en dur ; ajout d'une langue = ajout d'un catalogue sans modification de code ; coach conversationnel : langue de l'utilisateur respectée (voir Partie 5).

---

## 8.6 Intégrations d'appareils et de plateformes

> Vérifie les conditions officielles, quotas et tarifs en vigueur à la date de développement : les informations ci-dessous sont des hypothèses de départ à confirmer (marquer `À VÉRIFIER` dans `docs/decisions/integrations.md`). Ne contourne jamais une condition d'API.

### 8.6.1 Santé de la plateforme
**Apple Santé (HealthKit)** et **Health Connect (Android)**. 
- Lecture : fréquence cardiaque, FC au repos, VFC, sommeil, pas, énergie active, VO2max, poids, séances (entraînements) externes, distance. Écriture : séances Sports (type de sport, durée, distance, énergie, itinéraire, FC si captée). 
- Permissions : demandées par catégorie, au moment du besoin, avec explication préalable en français ; refus = fonctionnalités dégradées expliquées, jamais bloquantes. L'app fonctionne sans Santé.
- Fréquence : import initial limité aux 90 derniers jours (puis extensible à la demande), puis observation en arrière-plan et rattrapage à l'ouverture ; Health Connect : lecture par jetons de changements.
- **Fusion et déduplication** : une séance importée est dupliquée si même sport, début ± 2 min et durée ± 10 % qu'une séance existante ; priorité de sources : séance enregistrée par Sports > montre/appareil dédié > téléphone tiers > pas passifs ; on conserve la source dominante pour les métriques et les autres comme annexes ; les séances que Sports a écrites dans Santé ne sont pas relues (étiquette de source). Test : jeu de 30 cas de doublons.
- Valeur : très élevée. Difficulté : moyenne. Risque : politiques de plateforme sur l'usage des données de santé (finalité limitée, pas de revente, pas de publicité). Plan B : saisie manuelle et import de fichiers.

### 8.6.2 Montres et fabricants
| Plateforme | Voie officielle (hypothèse) | Valeur | Difficulté | Risques | Plan B | Phase |
|---|---|---|---|---|---|---|
| Apple Watch | App watchOS native + HealthKit (séance autonome, GPS, FC) | Très haute | Haute | Cycle de revue, contraintes batterie | Contrôle à distance depuis le téléphone | 5 |
| Wear OS | App Wear OS + Health Services | Haute | Haute | Fragmentation | Synchronisation via Health Connect | 6 |
| Garmin | Connect Developer Program (Health API, Activity API, Training API pour pousser des séances) ; app Connect IQ en option | Très haute | Moyenne | Accès sous accord commercial, quotas | Import FIT manuel ; passage par Strava ou Health Connect | 5 |
| Polar | Polar AccessLink (activités, sommeil) | Moyenne | Faible | Quotas par client | Import FIT | 7 |
| Suunto | API partenaire sur demande | Moyenne | Moyenne | Accès par partenariat | Import FIT/GPX | 7 |
| Coros | API partenaire sur demande | Moyenne | Moyenne | Accès restreint | Import FIT | 8 |
| Wahoo | API Cloud (séances, activités) | Moyenne (vélo) | Faible | Conditions d'usage | Import FIT | 7 |
| Fitbit | Web API (Google) | Moyenne | Moyenne | Évolution vers Health Connect | Health Connect | 8 |
Priorisation : couverture par Apple Santé et Health Connect d'abord (couvre indirectement la plupart des montres), puis Garmin (public sportif), puis Watch natives. Chaque fournisseur est derrière une interface `ProviderConnector` (auth OAuth, import, webhooks, révocation, quotas) pour qu'ajouter un fournisseur n'impacte pas le domaine ; stockage des jetons chiffrés ; respect du retrait de consentement (suppression des données du fournisseur sur demande).

### 8.6.3 Strava et autres réseaux
Import et export via l'API officielle de Strava, selon ses conditions en vigueur à vérifier (restrictions connues sur l'affichage, la mise en cache et la réutilisation des données Strava, y compris pour l'IA ; quotas de requêtes ; processus d'approbation pour dépasser le plafond d'athlètes). Règles : attribution « Powered by Strava » ; ne jamais utiliser les données Strava pour entraîner un modèle sans autorisation écrite ; export vers Strava en un tap avec choix de visibilité ; import du seul compte connecté. Valeur : haute (acquisition). Difficulté : faible. Risque : modification unilatérale des conditions. Plan B : export GPX/FIT manuel, partage d'image, import de fichiers.

### 8.6.4 Autres intégrations
| Intégration | Choix recommandé | Valeur | Difficulté | Risque et plan B |
|---|---|---|---|---|
| Capteurs Bluetooth | Voir Partie 3 | Haute | Moyenne | Compatibilité : liste d'appareils testés |
| Calendriers | Calendrier système (EventKit, Calendar Provider) en écriture des séances planifiées ; ICS en abonnement | Moyenne | Faible | Permissions ; plan B : fichier ICS |
| Musique | Contrôle de lecture système (centre de contrôle, MediaSession) ; pas d'intégration profonde au lancement ; ajustement du volume du coach vocal par « ducking » | Moyenne | Faible | Pas de dépendance à un catalogue musical |
| Météo | Fournisseur [METEO] : comparer Open-Meteo (open data, usage commercial payant), Météo-France (données publiques, qualité France), Apple WeatherKit (inclus avec compte développeur dans une limite), OpenWeather. Recommandation : Open-Meteo ou WeatherKit en principal, cache 30 min par maille 5 km, repli sur une seconde source | Haute | Faible | Coût par appel : plafonner via cache serveur ; plan B : dernière donnée avec horodatage |
| Altitude | Modèles d'élévation ouverts (Copernicus GLO-30, SRTM, IGN RGE ALTI pour la France) pour corriger l'altitude GPS ; correction barométrique sur appareil si présent | Haute | Moyenne | Précision variable ; héberger soi-même les tuiles |
| Géocodage | [GEOCODAGE] : Géoplateforme/BAN (France, gratuit) + Nominatim auto-hébergé ou service payant (MapTiler, Mapbox) ; respecter les limites d'usage de Nominatim public (pas de production) | Moyenne | Faible | Coût ; plan B : recherche locale hors ligne |
| Fonds de carte | OpenStreetMap via fournisseur de tuiles (MapTiler, Stadia…) ou auto-hébergé ; IGN pour la France ; licences et attribution (voir 8.10, Partie 4) | Très haute | Moyenne | Coût au volume : cache et hors ligne |
| Partenaires de réservation | Réservation d'épreuves, hébergements, refuges, locations via liens d'affiliation ou API partenaires (voir Partie 7) | Moyenne | Moyenne | Dépendance commerciale ; plan B : liens simples |
Toutes les intégrations tierces : interrupteur de désactivation à distance (feature flag), disjoncteur (circuit breaker), timeout 5 s, métriques de santé, contrat testé (8.8).

---

## 8.7 Analytics et expérimentation

### 8.7.1 Principes et outils
- Recommandation [STACK_ANALYTICS] : PostHog (auto-hébergeable en UE, funnels, cohortes, flags, expériences) ou Amplitude/Mixpanel hébergés en UE ; entrepôt SQL pour analyses profondes (BigQuery/ClickHouse) ; crash : Sentry ou Firebase Crashlytics. Un seul identifiant pseudonyme (`user_hash`), jamais l'e-mail ni la position dans les événements.
- **Consentement** : bandeau au premier lancement, refus aussi facile que l'acceptation ; sans consentement, seules les mesures strictement nécessaires (crash anonymisé, sécurité) ; consentement relu à chaque changement de finalité ; le choix est modifiable dans Réglages > Confidentialité.
- **Minimisation** : pas de coordonnées dans les analytics (seulement pays, pas de ville fine), pas de données de santé brutes ; les propriétés de santé sont des classes (`load_band: high`). Conservation : événements bruts 13 mois maximum, agrégats anonymes ensuite. Aucune donnée vendue ni partagée à des fins publicitaires.
- Convention : `objet_action` en snake_case, propriétés typées, schéma versionné dans `analytics/schema.yaml`, validé en CI (un événement hors schéma fait échouer le test).

### 8.7.2 Plan de tracking (événements et propriétés)
Propriétés communes : `app_version`, `platform`, `locale`, `plan_tier` (free/sports/fit/ultra), `days_since_install`, `session_id`.
| Domaine | Événements (propriétés spécifiques) |
|---|---|
| Acquisition | `app_install` (source), `onboarding_started`, `onboarding_step_completed` (step, durée), `onboarding_completed`, `permission_prompted` (type), `permission_result` (type, granted) |
| Compte | `signup_completed` (method), `login` (method), `fit_account_linked` (via) |
| Enregistrement | `recording_started` (sport, guided, plan_id présent), `recording_paused`, `recording_resumed`, `recording_finished` (sport, durée_s, distance_m, gps_quality_band), `recording_recovered` (après plantage), `recording_discarded` |
| Activité | `activity_saved`, `activity_viewed`, `activity_edited`, `activity_exported` (format), `activity_shared` (cible), `activity_deleted` |
| Plan et coach | `plan_created` (goal_type, weeks), `plan_session_completed`, `plan_session_skipped` (reason), `plan_adjusted` (auto/manuel), `coach_message_viewed`, `coach_question_asked` (catégorie, pas le texte), `coach_feedback` (up/down), `coach_safety_flag_shown` |
| Cartes | `route_searched`, `route_viewed`, `route_saved`, `map_downloaded` (taille_Mo), `navigation_started`, `off_route_alert` |
| Santé et appareils | `integration_connected` (provider), `integration_error` (provider, code), `sensor_paired` (type), `import_completed` (nombre) |
| Social | `friend_invited`, `friend_added`, `challenge_joined`, `kudos_given`, `live_tracking_started`, `live_tracking_viewed` |
| Monétisation | `paywall_viewed` (trigger_feature), `trial_started`, `purchase_started`, `purchase_completed` (produit, période), `purchase_failed` (code), `subscription_cancelled` (reason), `restore_tapped` |
| Qualité | `app_crash`, `sync_failed` (code), `gps_lost`, `battery_saver_prompted`, `api_error` (route, status) |
| Notifications | `push_sent`, `push_opened` (catégorie) |

### 8.7.3 Entonnoirs, cohortes, rétention
- Entonnoirs : installation > fin d'onboarding > première séance enregistrée (jalon d'activation « A1 » dans les 48 h) > deuxième séance (J7) > plan créé > paywall vu > essai > payant ; entonnoir du coach : plan créé > 3 séances de plan faites en 14 jours.
- Cohortes : par semaine d'installation, par source, par sport principal, par origine Fit/non-Fit, par palier d'abonnement.
- Rétention : J1, J7, J30, J90 ; rétention « active » = au moins 1 séance enregistrée par semaine (W1, W4, W12).
- Métriques par fonctionnalité : adoption (% d'actifs utilisant), fréquence, rétention des utilisateurs de la fonctionnalité vs non-utilisateurs, impact sur la conversion. 
- **Tableaux de bord** : (1) Santé produit (activation, rétention, WAU, séances/utilisateur) ; (2) Entonnoir de conversion et paywall ; (3) Coach (adoption, satisfaction, drapeaux de sécurité) ; (4) Qualité (crash-free, GPS, synchronisations) ; (5) Intégrations (taux d'erreur par fournisseur) ; (6) Croissance (installations, coût d'acquisition, K-factor) ; (7) Finance (MRR, churn, LTV, remboursements).

### 8.7.4 Expérimentation et drapeaux de fonctionnalités
- **Feature flags** pour toute fonctionnalité nouvelle, avec propriétaire, date de retrait et valeur par défaut sûre ; les flags de droits ne remplacent JAMAIS le contrôle serveur des abonnements (voir Partie 2).
- **Infrastructure A/B** : attribution déterministe par `user_hash`, exposition journalisée (`experiment_exposure`), exclusion mutuelle entre expériences sur un même écran ; pas d'expérience sur la sécurité, l'enregistrement en cours ou les messages médicaux.
- **Règles statistiques** : hypothèse et métrique principale écrites avant le lancement ; puissance 80 %, seuil 5 % bilatéral ; taille d'échantillon calculée d'avance ; pas d'arrêt anticipé sur « regard » (ou méthode séquentielle déclarée) ; une seule métrique principale, garde-fous (crash, désinstallations) ; correction pour comparaisons multiples ; durée minimale de 2 cycles hebdomadaires ; résultats archivés dans `docs/experiments/`.
- **Objectifs chiffrés par phase** (valeurs de départ, à recalibrer) : bêta fermée : activation A1 ≥ 60 %, W4 ≥ 25 %, crash-free ≥ 99,5 % ; lancement (mois 1) : activation ≥ 55 %, rétention J7 ≥ 30 %, J30 ≥ 15 %, conversion payante des actifs ≥ 3 % ; mois 6 : W12 ≥ 20 %, conversion ≥ 5 %, churn mensuel payant ≤ 6 % ; extension (Phase 11) : 20 % des actifs pratiquent au moins deux disciplines cardio.

---

## 8.8 Qualité logicielle

### 8.8.1 Pyramide de tests
| Niveau | Part | Contenu | Outils (adapter à [STACK_...]) | Cible |
|---|---|---|---|---|
| Unitaires | 70 % | Domaine pur : calcul d'allure, distance, filtres GPS, charge, zones, droits, conversions | Jest/XCTest/JUnit | Couverture du domaine ≥ 90 %, durée < 3 min |
| Intégration | 20 % | Dépôts, base, file de tâches, ingestion de séance, webhooks, stockage | Conteneurs de test | Exécution < 10 min |
| Contrat | transversal | API ↔ clients (OpenAPI/Pact), fournisseurs externes simulés | Pact, schémas | Toute rupture échoue la CI |
| Bout en bout mobile | 10 % | Parcours : onboarding, enregistrement, achat (bac à sable), synchro | Maestro, Detox, XCUITest, Espresso | 15 parcours critiques à chaque PR de release |

### 8.8.2 Tests spécifiques
- **Domaine** : tests basés sur des propriétés (distance ≥ 0, allure monotone avec vitesse, conversions inverses) et sur des traces réelles anonymisées (≥ 50 : ville, forêt, tunnel, saut GPS, pause, vélo rapide).
- **Formules du coach (non-régression)** : jeu de référence « golden » (≥ 40 profils sportifs avec séances et résultat attendu de charge, forme, plan, alertes) ; tout changement de formule change le golden dans la même PR avec justification validée par un humain expert ; tests de sécurité du coach : 100 requêtes à risque (douleur thoracique, trouble alimentaire, mineur, surentraînement) doivent déclencher les réponses de prudence (voir Partie 5) ; évaluation du modèle conversationnel par jeu d'évaluation versionné avant chaque changement de modèle ou de prompt.
- **Charge backend** : outil k6/Gatling ; scénarios : (a) 20 000 utilisateurs simultanés en pic de week-end matin, (b) 600 envois de séance par minute en régime et 6 000 par minute en pointe (dimanche 10 h), (c) 5 000 suivis en direct simultanés avec position toutes les 5 s, (d) 50 000 notifications en 10 min, (e) rafale de reconnexion après panne (thundering herd). Seuils : p95 < 400 ms (lecture), < 800 ms (écriture), erreurs < 0,5 %, aucune perte de séance. Test d'endurance de 4 h ; test de rupture jusqu'à la saturation, avec dégradation progressive documentée.
- **Sync hors ligne** : simulations de coupure à chaque étape ; deux appareils modifiant la même séance ; horloge décalée ; 7 jours hors ligne puis resynchronisation ; reprise d'envoi interrompu à 50 % ; idempotence (même séance envoyée 3 fois = 1 séance).
- **Migrations** : migration de base testée en avant et en arrière sur une copie anonymisée de volumétrie réelle ; migration de schéma local mobile testée depuis les 3 dernières versions de l'app ; zéro interruption (migrations en 2 temps, voir 8.11).
- **Sécurité** : analyse SAST/DAST en CI, tests d'IDOR automatisés pour chaque ressource, analyse des dépendances (voir 8.9).
- **Batterie** : enregistrement d'1 h en écran verrouillé sur 6 appareils de référence ; budget : ≤ 8 % de batterie/h en course GPS seule, ≤ 12 % avec capteurs ; échec de la release si dépassement de 25 % du budget.
- **Parc d'appareils** : 12 appareils physiques minimum (iOS : 3 versions majeures, 4 modèles dont un ancien ; Android : Samsung, Pixel, Xiaomi, un modèle d'entrée de gamme, 3 versions) + ferme d'appareils pour la couverture large ; vérifier particulièrement les restrictions d'économie d'énergie constructeurs en arrière-plan.
- **Bêta fermée** : 150 à 300 testeurs recrutés parmi les utilisateurs de Fit et des clubs, TestFlight et test fermé Play ; 4 semaines minimum ; formulaire de retour dans l'app (capture + journal anonymisé) ; réunion hebdomadaire de tri ; au moins 2 000 séances enregistrées avant le lancement ; enquête de satisfaction (note ≥ 4/5, NPS ≥ 30).
- **Seuils de sortie (release gates)** : crash-free sessions ≥ 99,5 % et crash-free users ≥ 99 % ; ANR < 0,3 % ; 0 bug bloquant ou majeur ouvert sur enregistrement, sync ou achat ; perte de séance = 0 sur la bêta ; précision de distance ± 2 % sur 20 parcours de référence ; démarrage à froid < 2 s (appareil médian) ; temps d'enregistrement du premier point GPS < 10 s ; tous les tests verts, aucun test désactivé.
- **Revue de code et analyse statique** : PR de moins de 400 lignes, 1 relecteur obligatoire (2 pour domaine du coach, sécurité, paiements) ; linters, formateur, typage strict, analyse statique (SonarQube ou équivalent), couverture sur le code modifié ≥ 80 % ; interdiction de merger avec test désactivé sans ticket et accord.
- **Dépendances** : inventaire (SBOM), mise à jour automatisée (Renovate/Dependabot), vérification des licences (pas de GPL dans l'app), audit des vulnérabilités à chaque build, verrouillage des versions, revue manuelle des nouvelles dépendances.

---
