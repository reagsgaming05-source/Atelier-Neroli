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
| Apple Watch | App watchOS native + HealthKit (séance autonome, GPS, FC) | Très haute | Haute | Cycle de revue, contraintes batterie | Contrôle à distance depuis le téléphone | 7 |
| Wear OS | App Wear OS + Health Services | Haute | Haute | Fragmentation | Synchronisation via Health Connect | 7 |
| Garmin | Connect Developer Program (Health API, Activity API, Training API pour pousser des séances) ; app Connect IQ en option | Très haute | Moyenne | Accès sous accord commercial, quotas | Import FIT manuel ; passage par Strava ou Health Connect | 7 |
| Polar | Polar AccessLink (activités, sommeil) | Moyenne | Faible | Quotas par client | Import FIT | 8 |
| Suunto | API partenaire sur demande | Moyenne | Moyenne | Accès par partenariat | Import FIT/GPX | 8 |
| Coros | API partenaire sur demande | Moyenne | Moyenne | Accès restreint | Import FIT | 8 |
| Wahoo | API Cloud (séances, activités) | Moyenne (vélo) | Faible | Conditions d'usage | Import FIT | 9 (home-trainer) |
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

## 8.9 Sécurité

### 8.9.1 Modèle de menaces (STRIDE appliqué)
Actifs à protéger : position (domicile, habitudes, trajets), données de santé (FC, sommeil, blessures, poids), identité, jetons de fournisseurs, droits d'abonnement, échanges avec le coach.
| STRIDE | Menace concrète | Contre-mesures obligatoires |
|---|---|---|
| Usurpation (Spoofing) | Prise de compte, faux jeton d'abonnement, faux appareil de suivi | MFA optionnel puis recommandé, OAuth/Passkeys, vérification serveur des reçus App Store/Play, jetons courts + rotation, signature des requêtes sensibles |
| Falsification (Tampering) | Séance modifiée pour tricher aux défis, trace GPS falsifiée, modification de plan | Validation serveur de plausibilité (vitesse, dénivelé, signature d'appareil), journal d'audit, signatures sur les fichiers importés |
| Répudiation | « Je n'ai pas résilié / partagé » | Journal immuable des consentements, achats, partages et suppressions |
| Divulgation (Information disclosure) | IDOR sur activités, fuite du domicile via carte ou suivi en direct, logs contenant des positions, sauvegardes en clair | Contrôle d'accès par ressource, zones de confidentialité côté serveur, jetons de suivi aléatoires, chiffrement, logs expurgés |
| Déni de service | Rafale d'uploads, scraping des itinéraires, saturation du coach IA (coût) | Limites de débit, quotas par palier, files d'attente, plafonds de coût IA, protections réseau |
| Élévation de privilèges | Utilisateur gratuit accédant aux fonctions Ultra, accès au back-office, injection de prompt faisant exécuter une action | Droits vérifiés côté serveur (Partie 2), séparation des rôles, coach sans accès en écriture aux comptes ni aux paiements, listes d'outils autorisés |

### 8.9.2 Authentification et autorisation
- Sessions : jeton d'accès 15 min, jeton de rafraîchissement à rotation et détection de réutilisation ; révocation par appareil ; déconnexion à distance.
- **Autorisation par ressource** : toute lecture/écriture vérifie propriétaire, relation d'amitié, ou jeton de partage ; la logique est centralisée (politique unique, pas de vérifications dispersées) ; règle « refus par défaut ».
- **Tests d'IDOR** : pour chaque route avec identifiant, un test automatique appelle la ressource d'un utilisateur A avec le jeton d'un utilisateur B, d'un anonyme et d'un utilisateur d'un palier insuffisant et exige 403/404 uniforme ; la CI échoue si une route n'a pas son test (couverture générée depuis OpenAPI).
- Identifiants non devinables (UUID v4/ULID), jamais séquentiels.

### 8.9.3 Chiffrement et secrets
- Transit : TLS 1.2+ (1.3 préféré), HSTS ; repos : chiffrement du disque et de la base par le fournisseur ; **champs sensibles** (jetons de fournisseurs, notes médicales, blessures) chiffrés au niveau applicatif avec clés gérées par un KMS et rotation annuelle ; clés par environnement.
- Secrets : gestionnaire dédié [GESTIONNAIRE_SECRETS] ; jamais dans le dépôt, les images ou les journaux ; analyse de secrets en pré-commit et en CI ; rotation immédiate en cas de fuite ; clés de l'app mobile limitées (restrictions par identifiant de paquet, domaines).

### 8.9.4 Durcissement mobile
- Stockage sécurisé : Keychain (iOS) / Keystore + EncryptedSharedPreferences (Android) pour jetons ; base locale des séances chiffrée (SQLCipher ou équivalent) car elle contient des positions ; pas de données sensibles dans les captures d'écran de multitâche ni dans les sauvegardes cloud non chiffrées.
- Jailbreak/root : détection **informative** (signal de risque pour le serveur, pas de blocage de l'utilisateur) ; blocage uniquement des fonctionnalités à enjeu (défis classés, paiements).
- **Pinning de certificat** : à discuter. Recommandation : épingler la clé publique (pas le certificat) avec deux clés de secours et un mécanisme de désactivation à distance ; ne pas l'activer avant d'avoir la rotation maîtrisée, car une erreur bloque tous les utilisateurs.
- Obfuscation du code de release, protection du débogage, intégrité de l'app (App Attest / Play Integrity) pour les appels sensibles.
- Liens profonds : valider tous les paramètres, ne jamais exécuter d'action destructive par lien sans confirmation.

### 8.9.5 Sécurité des API et suivi en direct
- Limites de débit par utilisateur, IP et route (ex. connexion 5/min, upload de séance 30/h, coach selon le palier) ; validation stricte des schémas, taille maximale (fichier de trace 50 Mo), protection contre les bombes de décompression de fichiers GPX/FIT ; requêtes paramétrées ; en-têtes de sécurité ; CORS restreint ; anti-abus (détection de scraping, comptes jetables).
- **Suivi en direct** : jeton de partage aléatoire de 128 bits, expirant (durée choisie, 24 h par défaut), révocable en un tap ; la page du proche n'affiche que la position récente et le tracé du jour (pas l'historique, ni l'adresse de départ si zone de confidentialité) ; notification à l'utilisateur à chaque consultation si activée ; arrêt automatique à la fin de séance ; position affinée seulement si l'utilisateur déclenche le SOS.
- **Données de santé et localisation** : accès interne par rôle et motif, journalisé ; pas de données réelles en environnement de test (jeux synthétiques) ; pseudonymisation dans l'entrepôt analytique ; zones de confidentialité (rayon par défaut 200 m autour du domicile et du travail) appliquées à l'export, au partage, aux cartes d'amis et aux classements.

### 8.9.6 Journalisation, détection et incident
- Journaux structurés sans position précise ni contenu de santé ni jeton ; conservation 12 mois pour la sécurité, 30 jours pour le débogage ; alertes sur anomalies (pics de 401/403, accès massifs, exports en masse, connexions impossibles géographiquement).
- **Runbook d'incident** : (1) détecter et classer (sévérité 1 à 4) ; (2) nommer un responsable d'incident ; (3) contenir (révoquer jetons, couper un flag, isoler un service) ; (4) préserver les preuves ; (5) évaluer l'impact sur les personnes ; (6) **notifier la CNIL sous 72 h** si violation de données personnelles présentant un risque, et les personnes concernées si risque élevé (voir 8.10) ; (7) corriger, communiquer (8.12), faire un retour d'expérience sans reproche sous 5 jours ouvrés. Un exercice à blanc par semestre.
- **Tests d'intrusion** : prestataire externe avant le lancement public puis annuellement, périmètre : API, mobile, back-office, flux de paiement, coach (injection de prompt) ; remédiation des critiques sous 7 jours, des élevées sous 30 jours.
- **Divulgation responsable** : page `security.txt`, adresse dédiée, politique de bonne foi, accusé de réception sous 3 jours, correction selon sévérité, remerciements ; programme de primes envisagé après 12 mois.
- **Sauvegardes et reprise** : sauvegardes continues de la base avec restauration à un instant donné ; copie quotidienne chiffrée dans une autre région de l'UE ; **RPO ≤ 15 min, RTO ≤ 4 h** (service dégradé en lecture en 1 h) ; test de restauration trimestriel, documenté ; les enregistrements locaux sur téléphone sont une seconde protection (la séance n'est supprimée localement qu'après confirmation serveur).

---

## 8.10 Conformité et juridique

> Les points suivants sont des orientations de conception, pas un avis juridique : fais valider par un juriste/DPO avant lancement ; marque `À VÉRIFIER` ce qui dépend d'un texte récent.

| Sujet | Exigences et décisions de conception |
|---|---|
| **RGPD** | Base légale par finalité (exécution du contrat pour l'enregistrement et le coach ; consentement explicite pour données de santé, analytics, marketing) ; **registre des traitements** tenu dans `docs/legal/registre.md` (finalité, données, base légale, durée, destinataires, transferts, sécurité) ; **AIPD/DPIA obligatoire** (données de santé + géolocalisation à grande échelle + profilage) avant le développement des Phases 3 et 4 et mise à jour à chaque changement majeur ; droits : accès, rectification, portabilité (export GPX/FIT/JSON), effacement (suppression de compte avec délai de grâce de 30 jours puis effacement des sauvegardes sous 90 jours), opposition, limitation, retrait du consentement ; traitement des demandes sous 1 mois ; **DPO** désigné ou référent (à trancher selon l'échelle) ; contrats de sous-traitance (art. 28) avec chaque fournisseur (hébergeur, analytics, e-mail, météo, IA, support) ; hébergement UE privilégié ; **transferts hors UE** (ex. fournisseur d'IA ou d'analytics américain) : clauses contractuelles types + évaluation d'impact du transfert, ou fournisseur UE/option de résidence en UE |
| **Données de santé (HDS)** | L'hébergement certifié HDS (France) s'impose lorsqu'un hébergeur stocke des données de santé collectées dans le cadre d'une activité de prévention, de diagnostic ou de soins. Une app de sport/bien-être grand public n'est en principe pas dans ce périmètre, mais la frontière est interprétative : **À VÉRIFIER avec un juriste** ; recommandation : hébergeur UE avec certification HDS disponible, pour pouvoir basculer à faible coût ; ne jamais présenter l'app comme dispositif médical |
| **App Store et Google Play** | Santé : pas de diagnostic ni de promesse médicale, pas de données de santé pour la publicité, justification de chaque permission ; localisation en arrière-plan : déclaration de finalité, vidéo de démonstration pour Play, texte d'usage explicite pour iOS, fonctionnalité visible et nécessaire ; abonnements : prix, durée, renouvellement, essai affichés clairement, restauration des achats, achat intégré pour le numérique sauf exceptions admises (règles de redirection vers paiement externe à vérifier selon région) ; contenus générés par IA : signalement, filtre, voie de signalement dans l'app ; suppression de compte accessible dans l'app (obligatoire) ; étiquettes de confidentialité (Privacy Nutrition Labels, Data Safety) exactes |
| **Mineurs** | Âge minimum : 15 ans en France pour consentir seul (autorisation parentale en dessous) ; recommandation : réserver l'app aux 16 ans et plus au lancement, avec écran d'âge neutre ; pas de coach conversationnel ni de profil public pour un mineur identifié ; aucune publicité ciblée ; plans d'entraînement prudents |
| **Loi sur l'IA de l'UE** | Le coach conversationnel est un système à **risque limité** (obligations de transparence : informer l'utilisateur qu'il parle à une IA, étiqueter les contenus générés) ; éviter toute fonction qui basculerait en haut risque ou en pratique interdite (pas d'inférence d'émotions, pas de score social, pas de manipulation) ; documentation technique du modèle utilisé, journal d'évaluation (8.8) ; calendrier d'application progressive : **À VÉRIFIER** |
| **DSA** | Si contenu d'utilisateurs public (itinéraires, commentaires, photos) : mécanisme de signalement, procédure de notification et action, motivation des décisions de modération, point de contact, rapports de transparence si applicable, traitement des signalements sous délai raisonnable (voir Partie 7) |
| **Consommation** | Informations précontractuelles claires, **résiliation aussi simple que la souscription** (bouton « Résilier » dans l'app ou lien vers la gestion de l'abonnement du store), droit de rétractation de 14 jours encadré pour le numérique (renonciation exprimée à l'achat), rappel avant renouvellement annuel, aucun dark pattern (pas de case pré-cochée, pas de sortie cachée), prix TTC affichés |
| **Mentions médicales** | « Cette application ne remplace pas un avis médical. Consulte un médecin avant de commencer ou reprendre une activité, surtout si tu as une maladie cardiaque, une douleur ou un doute » : à l'onboarding (acceptation consignée), dans les plans et dans les CGU ; questionnaire d'aptitude (type PAR-Q) avant plan intensif |
| **Propriété intellectuelle** | Données cartographiques : OpenStreetMap sous licence ODbL (attribution « © les contributeurs d'OpenStreetMap » et obligations de partage des bases dérivées à analyser avant de publier des itinéraires dérivés) ; IGN, fournisseurs de tuiles, Copernicus : respecter les licences et les conditions d'usage commercial ; polices et icônes : licences vérifiées ; contenus utilisateurs : licence limitée d'hébergement et d'affichage ; contenus des coachs de la marketplace : contrat de cession/licence |
| **Assurance** | Responsabilité civile professionnelle et cyber-assurance ; aucune garantie de sécurité en montagne : CGU et avertissements (météo, itinéraire, connectivité) ; SOS ne remplace pas les secours |
| **CGU / CGV / confidentialité** | Rédigées en français clair par un juriste, versionnées, acceptation consignée avec version et date, notification des changements substantiels ; politique de confidentialité par couches |
| **Conservation** | Séances et profil : durée du compte + 30 jours ; journaux de sécurité : 12 mois ; factures : 10 ans (obligation comptable) ; analytics bruts : 13 mois ; comptes inactifs : avertissement puis suppression après 24 mois d'inactivité |

---

## 8.11 Infrastructure et DevOps

- **Environnements** : `local`, `dev` (déploiement à chaque merge), `staging` (copie de la production sans données réelles, jeux synthétiques), `prod`. Comptes cloud, bases, clés et domaines séparés ; promotion par artefact immuable, jamais par reconstruction.
- **CI/CD** [STACK_CI] (recommandation : GitHub Actions + Fastlane pour les builds mobiles). Étapes d'une PR : format/lint (1 min) > typage (2 min) > tests unitaires (5 min) > tests d'intégration et de contrat (10 min) > analyse statique et dépendances (5 min) > build de l'app (15 min) > tests visuels du design system (8 min) > tests E2E sur émulateurs, parcours critiques (20 min). Objectif : retour PR < 30 min (parallélisation). Nightly : E2E large, charge légère, tests de batterie planifiés, pseudo-localisation. Merge bloqué si une étape échoue.
- **Versionnement et publication** : SemVer, branche principale protégée, `release/x.y` ; build numéroté automatiquement ; iOS : TestFlight interne puis externe ; Android : test interne, test fermé, test ouvert, puis production en **déploiement progressif** (1 %, 5 %, 20 %, 50 %, 100 % sur 7 jours) avec arrêt automatique si crash-free < 99,3 % ; mises à jour d'urgence via correctif de configuration (flags) avant publication. Journal de modifications généré depuis les commits.
- **Infrastructure en code** : Terraform/OpenTofu (ou Pulumi) pour tout (réseau, base, files, stockage, DNS, alertes) ; revue de plan en PR ; aucun changement manuel en production ; dérive détectée chaque nuit. Conteneurs, déploiement bleu/vert ou canari.
- **Observabilité** [STACK_OBSERVABILITE] (OpenTelemetry + Grafana/Datadog/Sentry) : logs structurés avec identifiant de corrélation ; métriques (latence, erreurs, saturation, files, coût IA) ; traces distribuées sur l'ingestion de séance ; alertes par gravité vers astreinte (1 personne, rotation hebdomadaire). **SLO** : disponibilité API 99,9 % mensuel ; envoi de séance réussi en < 30 s p95 à 99,5 % ; suivi en direct latence p95 < 10 s ; coach p95 < 8 s au premier jeton. Budget d'erreur : si consommé, gel des fonctionnalités jusqu'au rétablissement. Tableaux de bord : santé API, ingestion, intégrations, coût, mobile (crash, ANR).
- **Coûts** : budgets mensuels par service (hébergement, base, cartes/tuiles, météo, IA, e-mail/push, analytics, stockage) définis par phase ; alerte à 50, 80 et 100 % ; étiquettes de coût par fonctionnalité ; coût IA par utilisateur actif plafonné (quotas par palier, mise en cache, modèles plus petits pour les tâches simples) ; revue des coûts mensuelle. Hypothèse de départ à valider : coût d'infrastructure ≤ 0,35 € par utilisateur actif mensuel, hors IA, et ≤ 20 % du revenu moyen par utilisateur payant.
- **Mise à l'échelle** : services sans état et mise à l'échelle horizontale ; ingestion par file (une séance = un message idempotent) ; lectures sur réplicas ; cache des itinéraires et de la météo ; CDN pour tuiles et médias ; partitionnement des tables de points GPS par date ; pré-calcul des agrégats de charge.
- **Sauvegardes** : voir 8.9.6 ; vérifier la restauration par un script automatisé mensuel.
- **Mise à jour forcée** : l'API renvoie la version minimale supportée ; trois niveaux : information (bannière), recommandée (écran avec « Plus tard »), obligatoire (écran bloquant, seulement pour faille grave ou rupture d'API) ; jamais pendant un enregistrement : l'écran apparaît à la fin de la séance, après sauvegarde.
- **Versions d'API anciennes** : API versionnée (`/v1`) ; une version reste supportée au moins 12 mois après la suivante ; changements additifs uniquement dans une version ; en-têtes `Deprecation` et `Sunset` ; mesure de la part des clients par version ; tests de contrat contre les 2 dernières versions d'app.

---

## 8.12 Support et exploitation

- **Centre d'aide** : site `aide.[DOMAINE]` en français (puis EN/ES), 60 articles au lancement : démarrage, enregistrement et GPS (précision, économie d'énergie par constructeur), capteurs, montres, import/export, plans et coach, abonnement et résiliation, confidentialité et suppression, sécurité en sortie. Chaque article : problème, étapes, captures, dernière mise à jour. Recherche dans l'app ; liens contextuels depuis les erreurs.
- **Processus** : contact depuis l'app (journal anonymisé joint avec accord) > ticketing [OUTIL_SUPPORT] > triage par catégorie (bug, facturation, compte, données/RGPD, sécurité, retours produit) > réponse. **SLA** (heures ouvrées) : première réponse 24 h (Gratuit), 12 h (Sports/Fit), 4 h (Ultra) ; urgences (sécurité, perte de séance, double facturation) : 4 h tous paliers ; résolution cible 3 jours ouvrés. Demandes RGPD : accusé sous 72 h, clôture sous 30 jours.
- **Gestion des bugs** : sévérité S1 (perte de séance, indisponibilité, faille) correction immédiate et hotfix ; S2 (fonction majeure dégradée) sous 7 jours ; S3 (gêne) planifié ; S4 (cosmétique). Chaque bug S1/S2 a un ticket, un responsable, un test de non-régression ajouté. Tableau de bord des tickets support par fonctionnalité nourrit la priorisation.
- **Communication de crise** : page d'état publique [STATUS_PAGE] ; modèle de message (ce qui se passe, qui est touché, ce que nous faisons, prochain point à heure fixe) ; bannière in-app ; si perte de séances potentielle : message prioritaire expliquant comment retrouver les données locales ; excuses sincères, pas de jargon ; retour d'expérience publié pour les incidents majeurs.
- **Notes de version** : à chaque release, dans l'app et sur le site, en français simple (« Nouveau », « Amélioré », « Corrigé »), pas de langage technique ; grosses nouveautés accompagnées d'une carte « Quoi de neuf ».
- **Back-office** : voir Partie 2 (outil d'administration, droits, remboursements). Exigences exploitation : journalisation de toute action d'agent, rôles (support, modération, finance, admin), masquage par défaut des données de santé et de position, accès par motif (ticket lié), impersonation en lecture seule avec consentement de l'utilisateur.

---

## 8.13 Lancement et croissance

Public : coureurs, cyclistes, randonneurs et marcheurs. Aucun positionnement sur d'autres disciplines au lancement.
- **ASO** : titre « [NOM_APP_SPORTS] : Course, vélo, rando » ; sous-titre axé coach unique ; mots-clés de départ (FR) : course à pied, plan d'entraînement, semi-marathon, 10 km, trail, vélo GPS, randonnée, itinéraires, coach running, enregistrer course, allure, marche active ; recherche des mots-clés par outil ASO, test de textes via expérimentations de fiches (Product Page Optimization, Store Listing Experiments) ; description en bénéfices (« Un coach qui s'adapte à ta vie »), 6 à 8 captures sur le parcours (séance du jour, enregistrement, carte, progression, coach, hors ligne), vidéo de 30 s sous-titrée ; mise à jour des textes toutes les 6 semaines ; réponse à tous les avis.
- **Site et pages de destination** : page d'accueil, une page par discipline (course, vélo, rando), page coach, page tarifs, page sécurité et confidentialité (argument de confiance), blog ; liste d'attente avec e-mail et choix de discipline ; liens universels avec attribution (UTM) ; consentement conforme.
- **SEO** : pages d'itinéraires publics indexables (avec accord et zones de confidentialité), plans d'entraînement gratuits type « plan semi-marathon 10 semaines », glossaire, comparatifs honnêtes ; maillage ; performance et accessibilité du site ; objectif 20 000 visites organiques mensuelles à 6 mois.
- **Bêta publique et liste d'attente** : après la bêta fermée, invitation par vagues de 500 depuis la liste d'attente ; programme de parrainage ; les utilisateurs de Fit reçoivent un accès anticipé.
- **Lancement progressif** : (1) France, 3 semaines à 10 % puis 100 % ; (2) pays francophones (Belgique, Suisse, Canada) ; (3) anglophones (Royaume-Uni, Irlande puis États-Unis) après Phase 8 ; (4) Espagne et Amérique latine. Critère de passage : crash-free ≥ 99,5 %, rétention J30 ≥ 15 %, support ≤ 24 h.
- **Presse et créateurs** : kit presse (logo, captures, histoire, chiffres), 30 créateurs micro-influenceurs course/vélo/rando avec essai long, partenariats d'affichage honnêtes (mention « partenariat ») ; tests produits envoyés aux journalistes spécialisés ; contenu de lancement : « Je prépare mon premier 10 km en 8 semaines ».
- **Partenariats** : clubs de course, clubs cyclistes, associations et comités de randonnée, fédérations (athlétisme, cyclisme, randonnée pédestre) pour des plans et défis ; magasins de running, de cycles et d'outdoor (code d'essai, événements en magasin) ; organisateurs de courses et d'événements (codes, plans officiels de préparation, voir Partie 7).
- **Contenu éducatif** : séries courtes (technique de course, nutrition d'effort avec Fit, lire une carte, sécurité en montagne), newsletter bimensuelle, webinaires avec coachs.
- **Acquisition payante** (hypothèses à valider en test) : coût par installation 1,2 à 2,5 € (France, iOS plus cher), taux d'activation 50 % > coût par utilisateur activé ≈ 3 à 4 €, conversion payante 4 % > coût d'acquisition d'un abonné ≈ 75 à 100 € ; avec une valeur vie (LTV) cible de 60 à 90 €, **l'acquisition payante n'est rentable qu'avec une rétention annuelle > 40 %** : démarrer par canaux organiques et Fit, n'investir qu'après preuve (budget de test 3 000 € sur 4 semaines, arrêt si coût par abonné > 120 €).
- **Rétention (cycle de vie)** : J0 première séance guidée ; J1 message « Ta prochaine séance » ; J3 relance si aucune séance ; J7 bilan de première semaine ; J14 invitation à définir un objectif ; J30 bilan mensuel partageable ; dormants (14 jours) : réactivation sans culpabilisation ; fin d'essai : rappel 2 jours avant avec ce qui sera perdu ; limites : 3 notifications par semaine maximum, heures calmes, désactivation fine.
- **Prix et tests** : voir la décision D1 (8.16) ; tests de prix par pays via expériences de prix du store (jamais d'expérience de prix sur une même personne visible entre appareils) ; mensuel vs annuel, essai 7 vs 14 jours ; garde-fous : remboursements, avis, churn à 3 mois.
- **Lancement croisé avec Fit** : e-mail et notification in-app à la base Fit (segmentée : coureurs/cyclistes déclarés d'abord), carte « Découvre [NOM_APP_SPORTS] » dans Fit, connexion en un tap (compte commun, voir Partie 2), avantage : essai prolongé ou palier Fit inclus (voir Partie 2), bundle Fit + Sports ; mesure : % de la base Fit installant Sports (objectif 15 % à 3 mois), % d'abonnés Fit passant à l'offre combinée (objectif 8 %).
- **Métriques de lancement** : installations, activation A1, rétention J1/J7/J30, séances par utilisateur actif, conversion essai > payant, MRR, churn, note de store (≥ 4,5), tickets par 1 000 utilisateurs (< 40), crash-free.

---

## 8.14 Feuille de route détaillée

Estimations en **semaines-ingénieur (s-i)** pour une petite équipe (cible : 4 ingénieurs dont 1 backend, 2 mobile, 1 full-stack ; 1 designer à mi-temps ; 1 produit ; un expert en entraînement en vacation). Une marge de 25 % est incluse. Durée calendaire ≈ s-i ÷ 4.

| Phase | Nom | Objectif et périmètre | Dépendances | Livrables | Critères de sortie mesurables | Risques | Charge |
|---|---|---|---|---|---|---|---|
| 0 | Fondations | Audit du design de Fit et `DESIGN_AUDIT.md`, paquet partagé, dépôt, CI/CD, environnements, auth de base, i18n, schéma de données, observabilité, AIPD lancée | Aucune | Squelette d'app 5 onglets, paquet design, pipeline < 30 min, `docs/decisions` | Build + tests verts en CI ; audit validé ; déploiement dev automatique ; 0 chaîne en dur | Dette du design de Fit, choix de stack tardif | 14 |
| 1 | Enregistrement cœur | Enregistrement GPS course/vélo/marche/rando, pause, tours, mode hors ligne, reprise après plantage, bandeau live, Live Activity/notification (Partie 3) | 0 | Enregistreur fiable, stockage local chiffré | 50 séances de test, perte = 0 ; ± 2 % distance ; ≤ 8 %/h batterie ; 99 % d'enregistrements de 2 h sans coupure | Restrictions d'arrière-plan Android, batterie | 22 |
| 2 | Activités, synchronisation, santé | Historique, détail, récapitulatif, sync hors ligne idempotente, import/export GPX/FIT, HealthKit/Health Connect, dédoublonnage | 1 | Backend d'ingestion, import/export, connecteurs santé | Tests de sync verts (8.8) ; 30 cas de doublons ; p95 envoi < 800 ms | Conflits de sync, formats FIT | 20 |
| 3 | Cartes, itinéraires, sécurité | Cartes et tuiles, hors ligne, itinéraires, navigation, profil d'altitude, météo, suivi en direct, SOS, zones de confidentialité (Partie 4) | 1, 2 | Explorer complet, partage de suivi, alertes | Hors ligne vérifié en mode avion ; SOS testé avec 5 pays ; AIPD validée ; 0 fuite de domicile aux tests | Coûts de tuiles, légalité du SOS, précision d'altitude | 26 |
| 4 | Charge, santé et coach v1 | Charge/forme, zones, plans par objectif, coach conversationnel avec garde-fous, ajustements (Partie 5) | 2 (données), 3 (partiel) | Plan adaptatif, moteur de charge, coach IA | Golden tests verts ; 100 requêtes à risque correctement traitées ; satisfaction coach ≥ 4/5 en alpha | Qualité et coût de l'IA, responsabilité médicale | 28 |
| 5 | Comptes, abonnements, paywall, liaison Fit | Comptes communs, 4 paliers, achats intégrés, vérification serveur, liaison Fit, back-office minimal (Partie 2) | 0 ; 4 pour les droits | Paywall, reçus vérifiés, passerelle Fit | Achat sandbox complet sur 2 stores ; 0 contournement aux tests d'IDOR/droits ; restauration OK | Règles des stores, double facturation | 18 |
| 6 | Social, gamification, **lancement France** | Amis, défis, trophées, partage, fil, modération (DSA), bêta fermée puis publique, stores, site, support (Partie 7, 8.12–8.13) | 5 | v1.0 publique | Seuils de sortie 8.8 atteints ; bêta ≥ 150 testeurs, 2 000 séances ; accessibilité validée ; pentest sans critique | Retard cumulé, avis initiaux | 24 |
| 7 | Montres natives et Garmin | Apple Watch, Wear OS, Garmin (API), envoi de séances vers la montre | 6 | Apps montre, connecteur Garmin | 80 % des séances montre sans erreur ; batterie ≤ budget | Accès Garmin, cycles de revue | 24 |
| 8 | International et autres fabricants | Anglais, espagnol, unités, Polar/Suunto/Coros/Fitbit, pays anglophones puis hispanophones | 6 | 3 langues, 4 connecteurs | Pseudo-locale verte ; rétention J30 non dégradée de plus de 10 % hors France | Qualité de traduction, quotas API | 18 |
| 9 | Approfondissement disciplines | Vélo et home-trainer (puissance, FTP, ERG avec capteurs, Wahoo), trail/ultra (D+, nutrition d'effort, ravitaillements), rando haute montagne (météo montagne, cotation, avalanche avec avertissements) (Partie 6) | 7, 8 | Modules par discipline | Adoption ≥ 25 % des utilisateurs concernés ; golden tests par discipline ; 0 incident de sécurité attribuable | Responsabilité en montagne, complexité des formules | 30 |
| 10 | Marketplace de coachs et contenus | Coachs humains, plans vendus, paiements partagés, avis, KYC, réservation partenaires (Partie 7) | 9 | Marketplace v1 | 20 coachs actifs, 100 ventes à 3 mois, litiges < 2 % | Réglementation (paiements, statut des coachs), modération | 26 |
| 11 | Disciplines cardio supplémentaires | Natation, ski de fond (puis aviron) : capteurs, métriques, plan et charge unifiée | 9, 10 | 2 nouvelles disciplines | 20 % des actifs pratiquent au moins 2 disciplines ; golden tests étendus | Dilution du produit, précision des capteurs | 28 |

Total ≈ 278 s-i (≈ 70 semaines à 4 ingénieurs ; calendrier réaliste : 16 à 18 mois, lancement France autour du mois 10 à 11).
**Jalons** : **Alpha interne** : fin Phase 2 (enregistrer, synchroniser, voir son historique) ; **Alpha coach** : fin Phase 4 ; **Bêta fermée** : milieu Phase 6 (4 semaines) ; **Lancement France** : fin Phase 6 ; **Lancement international** : fin Phase 8.
**MoSCoW** (si le temps manque, couper dans cet ordre : le dernier de la liste Won't part en premier)
- **Must** : enregistrement fiable, sync hors ligne, cartes hors ligne et SOS, suivi en direct, charge + plan + coach avec garde-fous, abonnements vérifiés, confidentialité, accessibilité AA, mentions médicales.
- **Should** : liaison Fit, Apple Santé/Health Connect, import/export, Live Activities, défis, widgets, Garmin.
- **Could** : trophées avancés, navigation vocale riche, Wear OS, Polar/Suunto/Coros/Fitbit, SEO d'itinéraires publics, thème plein soleil automatique.
- **Won't (coupes dans cet ordre)** : 1) Phase 11, 2) Phase 10, 3) fabricants secondaires, 4) espagnol, 5) approfondissement vélo avancé avant retours utilisateurs. Ne JAMAIS couper : tests, sécurité, accessibilité, conformité, sauvegardes.

---

## 8.15 Backlog initial (prêt à importer)

Colonnes : ID | Epic | Titre | Description courte | Critères d'acceptation | Priorité (P0 critique, P1 haute, P2 moyenne) | Dépendances. Un ticket par ligne ; ne crée aucun code avant que l'epic de la phase soit planifié.

| ID | Epic | Titre | Description | Critères d'acceptation | Prio | Dép. |
|---|---|---|---|---|---|---|
| FND-1 | Fondations | Audit du design de Fit | Produire `DESIGN_AUDIT.md` (8.1.2) | Document complet, validé par le fondateur ; captures de référence | P0 | — |
| FND-2 | Fondations | Paquet `design-system` partagé | Extraire tokens et composants de Fit | Fit consomme le paquet sans différence visuelle (≤ 0,1 %) ; tokens avec source | P0 | FND-1 |
| FND-3 | Fondations | Dépôt, CI/CD | Pipeline lint/test/build/déploiement | PR < 30 min ; merge bloqué si rouge | P0 | — |
| FND-4 | Fondations | Environnements et IaC | dev/staging/prod en code | `apply` reproductible ; aucun changement manuel | P0 | FND-3 |
| FND-5 | Fondations | Architecture i18n | Catalogues, lint chaînes en dur, pseudo-locale | 0 chaîne en dur ; pseudo-locale en CI | P0 | FND-3 |
| FND-6 | Fondations | Observabilité de base | Logs, métriques, traces, alertes | Tableau de bord API ; alerte test reçue | P1 | FND-4 |
| FND-7 | Fondations | Fichiers de décisions et de risques | `docs/decisions`, `docs/risks` | Créés et à jour à chaque phase | P0 | — |
| FND-8 | Fondations | Squelette 5 onglets | Navigation, deep links de base | Routes de 8.2.3 testées | P0 | FND-2 |
| ACC-1 | Comptes | Inscription/connexion | E-mail, Apple, Google, passkeys | Connexion < 3 taps ; jetons à rotation | P0 | FND-4 |
| ACC-2 | Comptes | Compte commun avec Fit | Liaison d'identité | Un compte, deux apps ; test de liaison | P1 | ACC-1 |
| ACC-3 | Comptes | Suppression et export de compte | Droits RGPD en self-service | Export < 24 h ; suppression avec délai de 30 jours | P0 | ACC-1 |
| ACC-4 | Comptes | Onboarding et questionnaire d'aptitude | Objectifs, niveau, mentions médicales | Acceptation consignée ; < 3 min | P0 | FND-8 |
| SUB-1 | Abonnements | Catalogue et droits serveur | 4 paliers, matrice de droits | Test : palier insuffisant refusé côté serveur | P0 | ACC-1 |
| SUB-2 | Abonnements | Achats intégrés iOS/Android | Produits, essai, restauration | Achat sandbox OK ; restauration OK | P0 | SUB-1 |
| SUB-3 | Abonnements | Vérification des reçus et webhooks | Sources de vérité serveur | Rejeu de webhook sans doublon | P0 | SUB-2 |
| SUB-4 | Abonnements | Paywall contextuel | Écran 8.3.11 | Jamais pendant l'enregistrement ; sortie visible | P1 | SUB-2 |
| SUB-5 | Abonnements | Résiliation et gestion | Lien de gestion, rappels | Parcours en ≤ 3 taps | P0 | SUB-2 |
| SUB-6 | Abonnements | Back-office minimal | Droits, remboursements, journal | Actions journalisées ; rôles | P1 | SUB-1 |
| REC-1 | Enregistrement | Moteur d'enregistrement | GPS, filtres, pause, tours | ± 2 % distance sur 20 parcours | P0 | FND-8 |
| REC-2 | Enregistrement | Arrière-plan fiable | Service de premier plan, modes iOS | 2 h écran éteint sans trou | P0 | REC-1 |
| REC-3 | Enregistrement | Reprise après plantage | Journal incrémental | Séance récupérée à 100 % ; test de kill | P0 | REC-1 |
| REC-4 | Enregistrement | Écran live et bandeau | 8.3.2, `MetricLive` | Lisible plein soleil ; appui long pour terminer | P0 | REC-1, FND-2 |
| REC-5 | Enregistrement | Auto-pause, tours, vocal | Options et annonces | Réglages persistés ; annonces conformes | P1 | REC-1 |
| REC-6 | Enregistrement | Capteurs Bluetooth FC/vitesse/cadence | Voir Partie 3 | 5 modèles testés ; reconnexion auto | P1 | REC-1 |
| REC-7 | Enregistrement | Live Activity et notification | 8.2.5 | Mise à jour sans position brute | P1 | REC-4 |
| ACT-1 | Activités | Récapitulatif de séance | 8.3.3 | Sauvegarde locale immédiate ; RPE en 1 tap | P0 | REC-1 |
| ACT-2 | Activités | Historique et détail | 8.3.4 | 1 000 activités fluides (≥ 55 fps) | P0 | ACT-1 |
| ACT-3 | Activités | Synchronisation hors ligne | File idempotente | Tests de coupure verts | P0 | ACT-1, FND-4 |
| ACT-4 | Activités | Import/export GPX/FIT | Formats et validation | Fichiers invalides rejetés ; round-trip | P1 | ACT-3 |
| ACT-5 | Activités | Nettoyage de trace | Points aberrants | Jeu de 50 traces ; original conservé | P1 | ACT-1 |
| HLT-1 | Santé | HealthKit | Lecture/écriture | Permissions par catégorie ; dégradation propre | P1 | ACT-3 |
| HLT-2 | Santé | Health Connect | Idem Android | Idem | P1 | ACT-3 |
| HLT-3 | Santé | Fusion et déduplication | Règles 8.6.1 | 30 cas de doublons réussis | P1 | HLT-1 |
| MAP-1 | Cartes | Fonds de carte et styles | Clair/sombre/plein soleil | Attribution visible ; coût suivi | P0 | FND-2 |
| MAP-2 | Cartes | Cartes hors ligne | Téléchargement de zones | Mode avion OK ; reprise de téléchargement | P0 | MAP-1 |
| MAP-3 | Cartes | Recherche d'itinéraires | Filtres et profil d'altitude | Résultats < 1 s ; profil lié à la carte | P1 | MAP-1 |
| MAP-4 | Cartes | Navigation sur tracé | Écart et recalcul | Alerte à 50 m ; hors ligne | P1 | MAP-2 |
| MAP-5 | Cartes | Météo et conditions | Fournisseur + cache | Horodatage ; repli secondaire | P1 | MAP-1 |
| SAF-1 | Sécurité | Suivi en direct | Jeton, durée, révocation | Révocation immédiate ; pas d'historique exposé | P0 | ACT-3 |
| SAF-2 | Sécurité | SOS et numéros par pays | Table de données | 5 pays testés ; texte de limites | P0 | MAP-1 |
| SAF-3 | Sécurité | Zones de confidentialité | Masquage serveur | Tests : domicile non reconstructible | P0 | ACT-3 |
| SAF-4 | Sécurité | Détection de chute/immobilité | Option avec alerte | Faux positifs < seuil défini ; consentement | P2 | SAF-1 |
| COA-1 | Coach | Moteur de charge et forme | Formules documentées | Golden tests verts | P0 | ACT-3 |
| COA-2 | Coach | Zones personnelles | FC max, seuils, FTP | Source et date affichées | P1 | COA-1 |
| COA-3 | Coach | Génération de plan | Par objectif et disponibilité | 40 profils golden ; explication « Pourquoi » | P0 | COA-1 |
| COA-4 | Coach | Ajustement adaptatif | Séance manquée, fatigue, blessure | Règles testées ; pas de surcharge > seuil | P0 | COA-3 |
| COA-5 | Coach | Coach conversationnel | IA avec outils limités | Transparence IA ; 100 requêtes à risque OK | P0 | COA-1 |
| COA-6 | Coach | Garde-fous et orientation médicale | Signaux d'alerte | Réponse prudente systématique | P0 | COA-5 |
| COA-7 | Coach | Évaluation continue du coach | Jeu d'évaluation, retours | Rapport avant chaque changement de modèle | P1 | COA-5 |
| PRG-1 | Progression | Écran Progression et charge | 8.3.8 | Version tableau ; état < 3 séances | P0 | COA-1 |
| PRG-2 | Progression | Objectifs | 8.3.9 | Faisabilité affichée ; ton non culpabilisant | P1 | COA-3 |
| PRG-3 | Progression | Records et tendances | Records par distance | Recalcul après édition | P2 | ACT-2 |
| SOC-1 | Social | Amis et fil | Invitations, fil | Respect des visibilités | P1 | ACC-2 |
| SOC-2 | Social | Défis et classements | Entre amis | Anti-triche de plausibilité | P1 | SOC-1 |
| SOC-3 | Social | Trophées et passerelle Fit | Voir Partie 7 | Trophées partagés avec Fit | P2 | SOC-1 |
| SOC-4 | Social | Signalement et modération | DSA | Délai de traitement mesuré ; motivation | P0 | SOC-1 |
| INT-1 | Intégrations | Strava | Import/export conforme | Attribution ; conditions vérifiées | P1 | ACT-3 |
| INT-2 | Intégrations | Garmin | Connect API | Import auto ; révocation | P1 | ACT-3 |
| INT-3 | Intégrations | Apple Watch | App autonome | Séance sans téléphone | P1 | REC-1 |
| INT-4 | Intégrations | Wear OS | App autonome | Idem | P2 | REC-1 |
| INT-5 | Intégrations | Autres fabricants | Polar, Suunto, Coros, Wahoo, Fitbit | Via `ProviderConnector` | P2 | INT-2 |
| UXA-1 | Accessibilité | Audit lecteurs d'écran | Parcours critiques | 0 bloquant | P0 | REC-4 |
| UXA-2 | Accessibilité | Texte ×2 et daltonisme | Graphiques | Captures validées | P1 | PRG-1 |
| UXA-3 | Accessibilité | Déclaration d'accessibilité | RGAA/EAA | Publiée avant lancement | P0 | UXA-1 |
| WDG-1 | Surfaces | Widgets et raccourcis | 8.2.5 | Deep links testés | P2 | FND-8 |
| WDG-2 | Surfaces | Siri / Assistant | App Intents/Actions | 4 commandes fonctionnelles | P2 | REC-1 |
| ANA-1 | Analytics | Schéma et SDK | Plan 8.7 | Événements validés en CI ; consentement | P0 | FND-3 |
| ANA-2 | Analytics | Tableaux de bord et flags | 7 tableaux | Activation et rétention visibles | P1 | ANA-1 |
| QLT-1 | Qualité | E2E sur parcours critiques | 15 parcours | Verts à chaque release | P0 | REC-1 |
| QLT-2 | Qualité | Tests de charge | Scénarios 8.8 | Seuils tenus | P1 | ACT-3 |
| QLT-3 | Qualité | Tests de batterie et parc | 12 appareils | Budget respecté | P0 | REC-2 |
| SEC-1 | Sécurité | Politique d'autorisation et IDOR | Tests générés | Aucune route sans test | P0 | ACC-1 |
| SEC-2 | Sécurité | Chiffrement et secrets | KMS, base locale chiffrée | Rotation testée | P0 | FND-4 |
| SEC-3 | Sécurité | Pentest et divulgation | Externe + security.txt | Critiques corrigées | P0 | Phase 6 |
| LEG-1 | Conformité | Registre RGPD et AIPD | 8.10 | Validés par juriste | P0 | — |
| LEG-2 | Conformité | CGU, CGV, confidentialité | Rédaction | Versionnées, acceptées | P0 | LEG-1 |
| LEG-3 | Conformité | Fiches stores et labels | Privacy labels | Exactes ; revue passée | P0 | LEG-2 |
| OPS-1 | Exploitation | Centre d'aide et support | 60 articles | Publié avant la bêta publique | P1 | — |
| OPS-2 | Exploitation | Mise à jour forcée | 3 niveaux | Jamais en cours de séance | P1 | FND-3 |
| LCH-1 | Lancement | ASO et site | 8.13 | Fiches soumises ; liste d'attente active | P1 | LEG-3 |
| LCH-2 | Lancement | Parcours de cycle de vie | Notifications | Plafond 3/semaine ; opt-out | P1 | ANA-1 |
| MKT-1 | Marketplace | Profils de coachs et KYC | Phase 10 | Vérification d'identité ; contrat | P2 | SUB-3 |
| MKT-2 | Marketplace | Paiements partagés | Prestataire de paiement | Réconciliation exacte | P2 | MKT-1 |
| DSC-1 | Disciplines | Home-trainer et puissance | Phase 9, Partie 6 | ERG avec 3 capteurs | P2 | INT-5 |
| DSC-2 | Disciplines | Trail/ultra | D+, ravitaillement | Plans dédiés validés par expert | P2 | COA-3 |
| DSC-3 | Disciplines | Haute montagne | Météo, cotation, avertissements | Avertissements juridiques validés | P2 | MAP-5 |
| DSC-4 | Disciplines | Natation et ski de fond | Phase 11 | Capteurs de base | P2 | DSC-1 |

---

## 8.16 Risques et décisions ouvertes

Maintiens ce tableau dans `docs/risks.md` ; revue à chaque fin de phase. P = probabilité, I = impact (F faible, M moyen, É élevé).

| # | Type | Risque | P | I | Mitigation |
|---|---|---|---|---|---|
| R1 | Technique | Enregistrement coupé en arrière-plan (économie d'énergie constructeurs) | É | É | Service de premier plan, guides par marque, journal incrémental, tests sur parc réel |
| R2 | Technique | Batterie excessive | M | É | Budget de test, modes d'échantillonnage adaptatif |
| R3 | Technique | Perte ou doublon de séances en synchronisation | M | É | File idempotente, confirmation serveur avant suppression locale, tests de coupure |
| R4 | Technique | Précision GPS/altitude insuffisante | M | M | Filtrage, correction par modèles d'élévation, barométrie |
| R5 | Technique | Coûts de tuiles et de météo explosifs | M | É | Cache, hors ligne, tuiles auto-hébergées, plafonds |
| R6 | Technique | Coût et dérive du coach IA | É | É | Quotas par palier, cache, évaluation continue, modèle de repli |
| R7 | Technique | Dépendance à un fournisseur d'IA ou de cartes | M | É | Couche d'abstraction, second fournisseur testé |
| R8 | Technique | Dette du design de Fit propagée au paquet partagé | M | M | Audit, table de fusion, versionnement majeur validé |
| R9 | Technique | Régression de Fit lors de l'adoption du paquet | M | É | Captures de référence, migration écran par écran |
| R10 | Produit | Le coach unique n'est pas perçu comme meilleur | M | É | Tests utilisateurs dès l'alpha, métriques A1/W4, itérations |
| R11 | Produit | Activation faible (première séance non faite) | M | É | Onboarding court, séance guidée J0, rappels |
| R12 | Produit | Surcharge de fonctionnalités, app complexe | M | M | Divulgation progressive, coupes MoSCoW |
| R13 | Produit | Plans inadaptés provoquant blessure | F | É | Validation par expert, garde-fous, progressivité plafonnée, avertissements |
| R14 | Légal | Qualification de dispositif médical ou HDS | F | É | Formulations prudentes, avis juridique, hébergeur compatible HDS |
| R15 | Légal | Non-conformité RGPD (consentement, transferts) | M | É | AIPD, DPO/référent, hébergement UE, audits |
| R16 | Légal | Refus ou retrait par un store (localisation en arrière-plan, santé) | M | É | Déclarations soignées, vidéo, revue préalable, plan de recours |
| R17 | Légal | Licences cartographiques (ODbL, IGN) mal respectées | M | M | Revue juridique, attribution, séparation des bases dérivées |
| R18 | Légal | Obligations de la loi sur l'IA et du DSA mal évaluées | M | M | Veille, transparence IA, procédure de signalement |
| R19 | Légal | Responsabilité en cas d'accident en montagne | F | É | CGU, assurance, avertissements, SOS non garanti |
| R20 | Sécurité | Fuite de position (domicile) via partage ou carte | M | É | Zones de confidentialité côté serveur, tests dédiés, jetons expirants |
| R21 | Sécurité | IDOR ou contournement des droits d'abonnement | M | É | Politique centralisée, tests générés, droits serveur |
| R22 | Sécurité | Compromission de jetons de fournisseurs | F | É | Chiffrement applicatif, rotation, révocation |
| R23 | Marché | Concurrents établis (Strava, Garmin, Komoot) | É | M | Différenciation coach unique, passerelle Fit, niche francophone |
| R24 | Marché | Coût d'acquisition trop élevé | É | É | Canaux organiques et base Fit d'abord, test budgété avec arrêt |
| R25 | Marché | Changement de conditions d'API (Strava, Garmin) | M | M | Interfaces `ProviderConnector`, plans B (import de fichiers) |
| R26 | Marché | Churn élevé après la saison (hiver, après un objectif) | É | M | Plans d'entre-saison, objectifs successifs, offre annuelle |
| R27 | Ressources | Équipe trop petite pour le périmètre | É | É | Phasage, coupes MoSCoW, prestataires ponctuels |
| R28 | Ressources | Dépendance à une personne clé | M | É | Documentation, revues croisées, décisions écrites |
| R29 | Ressources | Budget d'API et d'IA dépassé | M | M | Alertes à 50/80/100 %, plafonds, revue mensuelle |
| R30 | Ressources | Retards de partenaires (Garmin, Apple Watch) | É | M | Démarrage des demandes d'accès dès la Phase 0 ; plan B Santé/FIT |

### Décisions du fondateur (avec recommandation)
| # | Décision | Recommandation |
|---|---|---|
| D1 | Prix des paliers (voir Partie 2) | Gratuit : enregistrement + historique ; Sports ≈ 6,99 €/mois ou 49,99 €/an ; Fit ≈ prix actuel de Fit ; Ultra ≈ 11,99 €/mois ou 89,99 €/an (coach complet, marketplace) ; essai 14 jours ; à tester par pays |
| D2 | Nom de l'app et du domaine | Vérifier disponibilité (INPI, stores, domaine, réseaux) avant la Phase 0 ; nom court, prononçable, cohérent avec Fit |
| D3 | Stack mobile | Si l'équipe est petite : Flutter ou React Native avec modules natifs pour GPS, capteurs et montres ; si priorité à la fiabilité d'enregistrement : natif Swift/Kotlin pour le moteur d'enregistrement + UI partagée ; aligner sur la stack de Fit |
| D4 | Stack backend et base | Un monolithe modulaire (TypeScript, Kotlin ou Python) + PostgreSQL/PostGIS + file de tâches ; hébergeur UE ; pas de microservices avant la Phase 8 |
| D5 | Fournisseur de cartes | Fonds OSM via fournisseur de tuiles UE au lancement, IGN pour la France ; auto-hébergement si coût > seuil |
| D6 | Fournisseur d'IA et lieu de traitement | Fournisseur avec résidence UE ou clauses adaptées, sans entraînement sur les données ; abstraction pour changer |
| D7 | Licence du code et des contenus | Code propriétaire ; contenus utilisateurs sous licence limitée ; contenus tiers uniquement sous licence compatible |
| D8 | Budget d'API mensuel (cartes, météo, IA) | Plafond initial 1 500 €/mois en bêta, 0,35 €/utilisateur actif ensuite (hors IA) et plafond IA par palier |
| D9 | Partenaires prioritaires | Garmin (accès API), un fabricant de capteurs, 3 clubs pilotes, 1 organisateur de course |
| D10 | Âge minimum | 16 ans au lancement |
| D11 | DPO interne ou externe | Externe mutualisé au démarrage |
| D12 | Hébergement HDS dès le début ou non | Hébergeur UE compatible HDS sans l'exiger au lancement ; décision après avis juridique |
| D13 | Pinning de certificat | Reporter après la stabilisation de la rotation (8.9.4) |
| D14 | Date et pays de lancement | France d'abord, après les seuils 8.8 ; pas de date publique avant la fin de la bêta fermée |
| D15 | Politique de gratuité des plans | Plans génériques gratuits, adaptation par le coach réservée aux paliers payants |

---

## 8.17 Instructions finales à l'assistant de code

### Protocole de travail
1. **Phase par phase** (8.14). Avant chaque phase : relis les Parties concernées, liste le périmètre, les tickets (8.15), les risques ; annonce-les en 15 lignes maximum.
2. **Validation avant de continuer** : en fin de phase, lance tests, lint, typage, tests visuels et d'accessibilité ; vérifie les critères de sortie un par un ; si un critère échoue, corrige avant d'avancer. Demande une validation explicite du fondateur pour passer à la phase suivante.
3. **Résumé à chaque étape** : fait / reste / risques / décisions prises / questions (maximum 20 lignes).
4. **Fichiers à maintenir** : `docs/decisions/` (une décision = un fichier daté : contexte, options, choix, conséquences), `docs/risks.md` (8.16), `docs/DESIGN_AUDIT.md`, `docs/legal/registre.md`, `docs/experiments/`, `CHANGELOG.md`, `docs/integrations.md` (conditions d'API vérifiées avec date et lien).
5. **Hypothèses** : si une information manque, pose au plus 5 questions groupées, puis continue avec des hypothèses notées dans `docs/decisions/`.
6. **Commits** petits et clairs, un sujet par commit ; une PR par ticket.

### Demande d'accord avant d'agir
Demande-moi AVANT : de choisir ou changer la stack, un hébergeur ou un fournisseur payant ; de modifier l'apparence de [NOM_APP_FIT] ou le paquet partagé de façon visible ; de modifier un prix, un palier ou un texte juridique ; d'ajouter une collecte de données ; de supprimer ou migrer des données existantes ; de lancer un traitement coûteux (appels IA en masse, tuiles) ; de publier quoi que ce soit en production ou sur un store.

### Interdits absolus
- Écrire un secret, un jeton ou une clé en dur (utiliser le gestionnaire de secrets) ; commiter un fichier `.env` réel.
- Contourner ou détourner les conditions d'utilisation d'une API (Strava, Garmin, cartes, météo, stores), faire du scraping, dépasser les quotas par ruse.
- Désactiver, supprimer ou affaiblir un test, un lint, une règle de sécurité ou d'accessibilité pour faire passer la CI.
- Faire confiance au client pour les droits d'abonnement ; ignorer le contrôle serveur.
- Inventer des valeurs de design, des formules du coach ou des chiffres médicaux sans source et validation ; présenter l'app comme un dispositif médical.
- Collecter ou journaliser une position précise ou une donnée de santé hors du cadre prévu ; utiliser des données réelles en test.
- Ajouter toute discipline hors du périmètre cardio (course, vélo, randonnée/marche) avant la Phase 11 et mon accord.
- Introduire un dark pattern d'abonnement ou de consentement.
- Exécuter des commandes destructrices (suppression de base, force-push, `rm -rf` hors du projet) sans accord explicite.

### Première action à exécuter
1. Lis la structure du dépôt courant et celle de [NOM_APP_FIT] si disponible ; détecte la stack ; résume-la en 10 lignes maximum.
2. Crée l'arborescence `docs/decisions/`, `docs/risks.md` (avec les 30 risques de 8.16 recopiés), `docs/design/fit-reference/`.
3. Lance l'audit du design de Fit selon 8.1.2 et produis `docs/DESIGN_AUDIT.md`. Ne crée aucun écran et n'écris aucun code d'app avant que ce document soit validé.
4. Termine par : (a) le résumé de la stack, (b) tes questions groupées (maximum 5), (c) le plan détaillé de la Phase 0 avec les tickets FND-1 à FND-8, (d) les décisions D2, D3 et D4 de 8.16 à trancher.
