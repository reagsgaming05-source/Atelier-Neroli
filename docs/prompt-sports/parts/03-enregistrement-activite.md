# PARTIE 3 — Enregistrement d'activité et suivi endurance (marche, randonnée, course, vélo)

Cette partie spécifie le cœur de [NOM_APP_SPORTS] : le moteur `ActivityEngine` qui enregistre une sortie, de l'appui sur « Démarrer » jusqu'à la sauvegarde. Une sortie perdue est le pire échec possible du produit : chaque règle ci-dessous est subordonnée à la garantie « zéro perte de données ». Modèle de données global : voir Partie 1. Droits d'accès aux fonctions payantes : voir Partie 2. Cartes, parcours, navigation et sécurité : voir Partie 4. Charge, coach et séances générées : voir Partie 5.

## 3.1 Machine à états de l'enregistrement

### 3.1.1 États

| État | Description | Capteurs actifs |
|---|---|---|
| `IDLE` | Aucune sortie. Écran de choix d'activité. | Aucun (GPS éteint) |
| `PREPARING` | Choix du type, vérification permissions, recherche du signal, connexion capteurs BLE. | GPS en mode « chaud », BLE |
| `COUNTDOWN` | Compte à rebours 3-2-1 (réglable 0/3/5/10 s). Annulable. | GPS, BLE |
| `RECORDING` | Sortie en cours, temps et métriques cumulés. | Tous |
| `PAUSED_MANUAL` | Pause demandée par l'utilisateur. | GPS en basse fréquence (1 point / 10 s, non enregistré dans la distance), BLE maintenu |
| `PAUSED_AUTO` | Pause déclenchée par l'immobilité (voir 3.3.6). | Idem |
| `RESUMING` | Transition transitoire (≤ 1 s) : purge des points de pause, relance de la fréquence nominale. | Tous |
| `FINISHED_REVIEW` | Sortie arrêtée, écran de récap non encore validé. | Aucun GPS ; BLE coupé |
| `SAVING` | Écriture finale, calcul des agrégats, mise en file de synchronisation. | Aucun |
| `RECOVERING` | Reprise après crash/redémarrage détectée au lancement de l'app. | Aucun |

### 3.1.2 Transitions

| De | Événement | Vers | Garde / action |
|---|---|---|---|
| IDLE | `START_TAPPED(type)` | PREPARING | Créer l'`activity_id` (UUID v7) immédiatement, écrire l'en-tête `status=preparing` en base locale |
| PREPARING | `SIGNAL_OK` ou `SKIP_SIGNAL` ou activité intérieure | COUNTDOWN | Signal OK = précision horizontale ≤ 20 m sur 3 fixes consécutifs ; sinon bouton « Démarrer quand même » après 10 s |
| PREPARING | `CANCEL` | IDLE | Supprimer l'en-tête, couper les capteurs |
| COUNTDOWN | `COUNTDOWN_DONE` | RECORDING | `t0 = horloge monotone` ; journaliser `START` |
| COUNTDOWN | `CANCEL` | IDLE | Idem |
| RECORDING | `PAUSE_TAPPED` | PAUSED_MANUAL | Journaliser `PAUSE{reason:manual}` |
| RECORDING | `AUTO_PAUSE_TRIGGER` | PAUSED_AUTO | Seulement si l'option est active (par défaut : course, vélo, marche : ON ; randonnée : OFF) |
| PAUSED_* | `RESUME_TAPPED` ou `AUTO_RESUME_TRIGGER` (auto uniquement) | RESUMING → RECORDING | Journaliser `RESUME` |
| RECORDING, PAUSED_* | `STOP_LONG_PRESS` (2 s) | FINISHED_REVIEW | Écrire `END`, figer les compteurs |
| FINISHED_REVIEW | `SAVE` | SAVING → IDLE | Voir 3.7 |
| FINISHED_REVIEW | `DISCARD` (confirmation en deux étapes) | IDLE | Sortie déplacée vers la corbeille locale 30 jours |
| FINISHED_REVIEW | `RESUME_TAPPED` (« Reprendre », 60 s max après l'arrêt) | RECORDING | Le trou est traité comme une pause |
| (lancement app) | journal avec `status ∈ {recording, paused, finished_review}` | RECOVERING | Voir 3.1.4 |
| RECOVERING | `RECOVER_ACCEPT` | FINISHED_REVIEW | Fermer le journal à la dernière donnée valide |
| RECOVERING | `RECOVER_CONTINUE` (si dernier point < 15 min) | RECORDING | Le trou devient une pause |

L'arrêt se fait par appui long de 2 s pour éviter l'arrêt accidentel en poche ; l'appui court sur « Pause » est la seule action immédiate.

### 3.1.3 Garanties de persistance

1. Chaque transition écrit un événement dans le journal (`activity_events`) AVANT de mettre à jour l'état en mémoire (write-ahead).
2. Chaque point GPS validé est écrit en base locale par lots de 5 s maximum (ou 10 points), avec `fsync` (SQLite en mode WAL, `synchronous=NORMAL` pour les points, `FULL` pour les événements d'état).
3. Le temps écoulé se calcule à partir de l'horloge monotone, jamais de l'horloge murale (changement d'heure, fuseau, réglage manuel). On stocke aussi l'horodatage UTC de chaque événement.
4. L'état courant est reconstructible uniquement à partir du journal ; l'état en mémoire n'est qu'un cache.
5. Le moteur d'enregistrement vit dans un service au premier plan (Android) ou une session de localisation en arrière-plan (iOS), séparé du cycle de vie de l'UI : la destruction de l'activité UI ne doit jamais interrompre l'enregistrement.

### 3.1.4 Récupération après crash

Algorithme `recover()` exécuté au démarrage de l'app, avant tout écran :

```
pour chaque activité locale dont status ∈ {preparing, recording, paused, finished_review, saving}:
    dernier = dernier événement du journal ; dernierPoint = dernier échantillon GPS
    si status == preparing: supprimer (aucune donnée)
    si status == saving: relancer SAVING (idempotent, voir 3.7.6)
    sinon:
        ageDernierPoint = maintenant - dernierPoint.t
        si ageDernierPoint < 15 min ET service de localisation encore actif: reprendre silencieusement (RECORDING), notification "Enregistrement repris"
        sinon: afficher l'écran "Sortie interrompue" avec distance, durée, carte
               choix: Reprendre / Terminer et sauvegarder / Supprimer
```

Cas limites : batterie vide (le dernier point fait foi, durée = dernier point − t0 moins pauses) ; mise à jour de l'OS pendant la sortie ; kill par le gestionnaire de tâches (iOS relance l'app via la localisation significative ; Android via le service `START_STICKY`) ; espace disque insuffisant (voir 3.7.7).

## 3.2 GPS et localisation

### 3.2.1 Choix technique et fournisseurs par plateforme

Recommandation [STACK_MOBILE] : **module natif pour la localisation en arrière-plan, UI cross-platform possible**. Justification : le GPS en arrière-plan fiable pendant 8 h dépend de services de premier plan Android, de `CLLocationManager` avec `allowsBackgroundLocationUpdates` sur iOS, de restrictions fabricants (Xiaomi, Huawei, Samsung) et de Live Activities ; les bibliothèques cross-platform génériques (`react-native-background-geolocation` commercial, `expo-location` + `TaskManager`, plugin Flutter `geolocator`) sont acceptables pour un MVP mais ont des pertes documentées sur Android agressif. Ordre de préférence : (1) cœur d'enregistrement écrit en Swift et Kotlin, exposé à l'UI par un pont ; (2) à défaut, `react-native-background-geolocation` avec licence ; (3) `expo-location` interdit en production pour l'enregistrement long sans test de 8 h réussi (voir 3.14). Un SDK UI cross-platform (React Native ou Flutter) reste recommandé pour l'ensemble hors enregistrement. Le choix final est consigné dans un ADR.

| Plateforme | Fournisseur | Paramètres |
|---|---|---|
| Android (Play Services présents) | `FusedLocationProviderClient` | `PRIORITY_HIGH_ACCURACY`, `setMinUpdateIntervalMillis`, `setMinUpdateDistanceMeters(0)`, `setWaitForAccurateLocation(false)` |
| Android sans Play Services (Huawei) | `LocationManager` GPS_PROVIDER + GNSS raw | Même cadence ; activer `GnssMeasurements` si dispo |
| iOS | `CLLocationManager` | `desiredAccuracy = kCLLocationAccuracyBest` (jamais `…ForNavigation` hors vélo/VTT), `activityType = .fitness` (ou `.otherNavigation` à vélo), `pausesLocationUpdatesAutomatically = false`, `distanceFilter = kCLDistanceFilterNone` |

Android : activer si disponible la double fréquence L1/L5 (`GnssCapabilities`) ; marquer l'appareil dans le point (`gnss_dual`).

### 3.2.2 Fréquence d'échantillonnage adaptative

Intervalle cible entre fixes, évalué toutes les 5 s à partir de la vitesse lissée v (m/s) :

| Activité | v < 0,5 | 0,5 ≤ v < 2 | 2 ≤ v < 5 | 5 ≤ v < 10 | v ≥ 10 |
|---|---|---|---|---|---|
| Marche / randonnée | 5 s | 2 s | 1 s (1 s si virages) | — | — |
| Course | 5 s | 2 s | 1 s | 1 s | — |
| Vélo | 5 s | 2 s | 1 s | 1 s | 1 s |
| Trail/VTT technique (option « précision max ») | 3 s | 1 s | 1 s | 1 s | 1 s |

Règle de virage : si la variation de cap lissé dépasse 25° sur 3 s, forcer 1 s pendant 10 s. Règle « randonnée longue » : en mode économie (3.13) passer à 3 s en marche lente (v < 1,5), sans jamais dépasser 5 s ; l'interpolation de la distance reste correcte grâce à la simplification (voir 3.3.4). L'échantillonnage est un souhait envoyé à l'OS : l'app mesure la cadence réelle et la journalise.

### 3.2.3 Compromis batterie / précision (budgets cibles)

Consommation maximale de l'enregistrement seul, écran éteint, appareil milieu de gamme, 20 °C, ciel dégagé :

| Mode | Cible max / heure | Précision visée (CEP 68 %) |
|---|---|---|
| Précision max (1 s, double fréquence) | 7 % | ≤ 4 m |
| Standard (adaptatif ci-dessus) | 5 % | ≤ 6 m |
| Économie (3 s, pas de BLE continu hors capteurs connectés) | 3 % | ≤ 10 m |
| Ultra-économie randonnée (fixe 10 s, 1 point utile / 10 s, écran éteint forcé) | 1,5 % | ≤ 15 m |

Avec écran allumé et cartes : budget 12 %/h maximum (voir 3.13). Un test de dérive est exécuté en CI de nuit sur appareils réels (voir 3.14).

### 3.2.4 Permissions et écrans d'explication

**iOS** : demander `WhenInUse` d'abord, avec écran d'explication préalable (« Pour tracer votre parcours, [NOM_APP_SPORTS] a besoin de votre position, même écran éteint »). Après la première sortie réussie en premier plan, proposer « Toujours » via l'écran de réglages avec capture d'écran guidée (iOS 13+ ne le propose qu'en deuxième temps). Déclarer `UIBackgroundModes: location`, `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSMotionUsageDescription`, `NSBluetoothAlwaysUsageDescription`. Utiliser une Live Activity pour afficher temps/distance sur l'écran verrouillé.

**Android** : `ACCESS_FINE_LOCATION` et `ACCESS_COARSE_LOCATION` ; `FOREGROUND_SERVICE_LOCATION` (Android 14+, `foregroundServiceType="location"`) ; `POST_NOTIFICATIONS` (13+) ; `ACTIVITY_RECOGNITION` ; `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` (12+). `ACCESS_BACKGROUND_LOCATION` n'est PAS demandée si le service de premier plan suffit (Google Play la refuse sans justification). Notification persistante obligatoire : titre « Sortie en cours », temps et distance, boutons Pause / Reprendre / Ouvrir ; canal « Enregistrement » à priorité basse non masquable par un balayage. Écran d'aide « Optimisation batterie » : lien vers les réglages constructeur (modèle de dontkillmyapp.com maintenu côté [STACK_CONTENU]), détecté par `Build.MANUFACTURER`.

**Refus** : si refusé une fois, afficher une carte explicative avec bouton vers les réglages ; si refusé définitivement, proposer « Saisie manuelle » ou « Tapis / home-trainer sans GPS » (aucun GPS requis) ; ne jamais bloquer l'app. Si la permission est révoquée pendant la sortie : continuer avec les capteurs restants (podomètre, BLE), insérer un événement `GAP{reason:permission_revoked}` et une notification d'action.

**Précision approximative** (iOS 14+ / Android 12+) : détecter `accuracyAuthorization == reducedAccuracy` ou absence de `FINE`. Bloquer le démarrage GPS avec un écran dédié (« Position approximative : tracé impossible ») et proposer de passer en précision exacte ; l'enregistrement en position approximative est interdit.

### 3.2.5 Perte de signal et démarrage à froid

- **Qualité du signal** (indicateur 4 barres en préparation et en sortie) : barres = 4 si précision ≤ 8 m ; 3 si ≤ 15 ; 2 si ≤ 30 ; 1 si ≤ 60 ; 0 sinon ou si aucun fix depuis 10 s.
- **Perte** : aucun fix pendant > 10 s → état de signal `LOST`, bandeau « Signal GPS faible », continuer le chrono. Pendant la perte : à pied/course, estimer la distance par podomètre × longueur de foulée calibrée (voir 3.3.9) ; à vélo, par capteur de vitesse BLE si présent, sinon rien. Ces segments portent le drapeau `estimated=true` et ne comptent pas pour les records.
- **Retour du signal** après perte : si la distance en ligne droite entre le dernier point et le premier nouveau est < vitesse estimée × durée × 1,5, relier par une ligne droite (segment « tunnel », dessiné en pointillé) ; sinon, traiter comme un saut (3.3.1) et ne pas ajouter la distance, sauf confirmation utilisateur proposée après la sortie.
- **Démarrage à froid** : en PREPARING, lancer la localisation dès l'ouverture de l'écran d'activité (pas au clic). Objectif : premier fix précis ≤ 20 m en < 15 s après lancement à chaud, < 45 s à froid. Utiliser le dernier emplacement connu uniquement pour centrer la carte, jamais comme point d'enregistrement. Les 10 premières secondes après `COUNTDOWN_DONE` : écarter tout point de précision > 25 m.
- **Environnements** : tunnels (perte longue : tolérer jusqu'à 10 min avant d'alerter), forêt dense (précision 15-30 m : élargir le seuil de rejet à 40 m en mode trail), canyons urbains (rebonds multi-trajets : s'appuyer sur la cohérence vitesse/cap, voir 3.3.1).

## 3.3 Traitement du signal

Le pipeline est une suite de filtres purs et testables, exécutés dans l'ordre. Chaque filtre est une fonction `(état, échantillon) -> (état, échantillon | rejet{motif})`. Les points bruts sont TOUJOURS conservés (flux `raw`) ; les points filtrés forment le flux `clean`, recalculable avec de nouveaux paramètres (versionnés : `pipeline_version`).

### 3.3.1 Rejet d'aberrations

```
rejeter si:
  horizontalAccuracy < 0 ou > seuilPrecision(activité)      # marche 30 m, course 30, vélo 35, trail 40
  timestamp <= précédent                                     # non monotone
  dt = t - tPrev ; d = haversine(p, pPrev) ; v = d/dt
  v > vMax(activité)                                         # marche 3,5 m/s ; rando 4 ; course 9 (sprint 12 sur <10 s) ; vélo 30 (descente 35) ; VTT 25
  |a| = |v - vPrev| / dt > aMax                              # marche/course 6 m/s², vélo 4 m/s²
  d > 50 m ET dt < 2 s                                       # saut
  point isolé: d(prev,p) > 30 m ET d(p,next) > 30 m ET d(prev,next) < 15 m   # pic de rebond (vérifié avec 1 point de retard)
  si vitesse Doppler disponible (speedAccuracy ≤ 1): rejeter si |v - vDoppler| > 3 m/s
```

Un rejet consécutif de plus de 5 points déclenche une réinitialisation du filtre de Kalman sur le prochain point accepté de précision ≤ 20 m. Statistique : stocker le compteur `rejected_points` par motif.

### 3.3.2 Lissage de position (filtre de Kalman)

Modèle à vitesse constante, 4 états (x, y en mètres dans un repère local ENU, vx, vy), mise à jour par fix :

```
F = [[1,0,dt,0],[0,1,0,dt],[0,0,1,0],[0,0,0,1]]
Q = q * [[dt^4/4,0,dt^3/2,0],[0,dt^4/4,0,dt^3/2],[dt^3/2,0,dt^2,0],[0,dt^3/2,0,dt^2]]
R = diag(sigma², sigma²) avec sigma = max(horizontalAccuracy, 3) 
H = [[1,0,0,0],[0,1,0,0]]
```

Bruit de processus `q` (m²/s³) : marche 0,5 ; course 1,5 ; vélo route 3 ; VTT 4 ; sprint détecté 6. Si une vitesse Doppler fiable existe, ajouter une observation de vitesse avec variance `speedAccuracy²`. Porte de Mahalanobis : rejeter l'observation si `innovation' S⁻¹ innovation > 9,21` (χ² 2 ddl, 99 %). Sortie : positions lissées ; la distance utilise la sortie lissée, jamais le brut. Alternative acceptable : filtre de Savitzky-Golay (fenêtre 5, ordre 2) sur positions + filtre médian de vitesse (fenêtre 3), si le Kalman pose problème sur appareil bas de gamme.

### 3.3.3 Distance, vitesse, allure

- Distance : somme des distances haversine (rayon 6 371 008,8 m) entre points `clean` consécutifs, hors pauses et segments `gap` non confirmés. Seuil anti-dérive à l'arrêt : ignorer un segment < max(2 m, 0,5 × précision) quand la vitesse lissée < 0,4 m/s.
- Vitesse instantanée : `v_i = d/dt` sur le dernier segment (affichage interdit pour allure : trop instable).
- Vitesse lissée : moyenne mobile exponentielle `v_s = α·v_i + (1-α)·v_s`, α = 0,3 (course), 0,25 (vélo), 0,2 (marche). 
- Allure en s/km = 1000 / v_s ; affichée mm:ss /km pour marche/course, km/h pour vélo (réglage utilisateur, min/mi et mph supportés). Allure plafonnée : au-delà de 20:00 /km à pied, afficher « -- ».
- Allure sur fenêtre : « Allure 10 s », « Allure 30 s », « Allure tour », « Allure moyenne » = temps en mouvement / distance. Valeurs par défaut en course : lissée 10 s ; en vélo : vitesse lissée 3 s.

### 3.3.4 Simplification pour stockage et affichage

Le tracé affiché utilise Ramer-Douglas-Peucker (ε = 1 m pour détail, 5 m pour liste, 25 m pour vignette). Ne jamais simplifier avant le calcul des agrégats.

### 3.3.5 Détection d'activité automatique

Suggestion (jamais changement silencieux) quand l'utilisateur a démarré un type et que 3 min de données contredisent :

| Vitesse médiane (3 min) | Cadence pas | Suggestion |
|---|---|---|
| < 2,2 m/s | < 130 ppm | Marche |
| 2,2 à 6,5 m/s | ≥ 140 ppm | Course |
| > 5,5 m/s sans pas (accéléro faible variance < 0,5 g·rms) | — | Vélo |
| > 9 m/s | — | Véhicule : proposer de mettre en pause |

Utiliser `CMMotionActivityManager` (iOS) et Activity Recognition API (Android) comme second avis (confiance ≥ `medium`). Si l'utilisateur refuse, mémoriser 30 min. Détection d'un trajet en voiture pendant la sortie : pause suggérée avec seuil v > 12 m/s pendant 60 s.

### 3.3.6 Détection de pause (auto-pause)

```
entrer en PAUSED_AUTO si v_s < vSeuil pendant ≥ tSeuil
sortir si v_s > vReprise pendant ≥ 2 s (2 fixes consécutifs)
```

| Activité | vSeuil | vReprise | tSeuil |
|---|---|---|---|
| Course | 0,6 m/s | 1,0 m/s | 5 s |
| Marche | 0,3 m/s | 0,5 m/s | 8 s |
| Vélo | 1,5 m/s | 2,2 m/s | 4 s |
| Rando | désactivée par défaut ; « temps en mouvement » calculé après coup avec vSeuil 0,2 m/s | | |

Les feux rouges (vélo) : sensibilité réglable (faible/moyenne/haute = tSeuil ×2 / ×1 / ×0,5). Le temps écoulé continue de courir en arrière-plan (`elapsed`) ; le temps en mouvement (`moving`) s'arrête.

### 3.3.7 Altitude

Sources par priorité : (1) baromètre (`CMAltimeter` iOS, `TYPE_PRESSURE` Android) ; (2) altitude GNSS corrigée par modèle de géoïde ; (3) modèle numérique d'élévation (MNE) tuiles terrain ([STACK_MNE], ex. Copernicus GLO-30 / tuiles Terrain-RGB, résolution 30 m) appliqué après la sortie.

- Altitude baromètre : `h = 44330 · (1 - (p/p0)^(1/5,255))` ; p0 recalibré toutes les 10 min par fusion avec l'altitude MNE du point GPS (filtre complémentaire, constante de temps 300 s) ; plage de validité 0-5 000 m.
- Sans baromètre : altitude GNSS (MSL = ellipsoïdale − ondulation du géoïde EGM96), puis remplacement par le MNE à la fin de sortie si l'écart GNSS/MNE médian > 10 m.
- Lissage : médiane glissante 5 points puis moyenne mobile 15 s (baromètre) ou 30 s (GNSS).
- **Dénivelé** : algorithme d'hystérésis. Pour le baromètre, seuil 2 m ; pour GNSS ou MNE, 5 m ; en tapis/home-trainer, 0.

```
ref = alt[0] ; D+ = 0 ; D- = 0
pour chaque altitude lissée a:
    si a - ref >= seuil: D+ += a - ref ; ref = a
    sinon si ref - a >= seuil: D- += ref - a ; ref = a
    sinon si a est un nouvel extrême dans la direction de la dernière montée/descente: ref étendu à a (suivre l'extrême sans cumuler)
```
Exemple : profil 100 → 103 → 101 → 106 avec seuil 5 : D+ = 6 (une seule montée de 100 à 106), D- = 0.
- Pente % = 100 · Δalt / Δdistance sur fenêtre glissante de 30 m (course/marche) ou 50 m (vélo), plafonnée à ±40 %, rafraîchie toutes les 2 s. Pente moyenne de montée = D+ / distance des segments montants.

### 3.3.8 Cadence et podomètre

- Source cadence de pas : accéléromètre 50 Hz (fenêtre 4 s) ; norme `|a|`, passe-bande 0,5-4 Hz (Butterworth ordre 2), détection de pics avec seuil adaptatif = 0,6 × écart-type de la fenêtre, distance minimale entre pics 0,25 s. Cadence = pics / durée × 60 (ppm = pas par minute, 2 pieds). Rafraîchissement 2 s, lissage médian sur 3 valeurs. Précision visée ±3 % en course à plat, ±5 % en marche.
- Podomètre intégré : utiliser le podomètre natif (`CMPedometer`, `Sensor.TYPE_STEP_COUNTER`) comme source primaire du nombre de pas en marche quotidienne ; le détecteur maison sert de repli et à la cadence de course. En sortie, réconcilier : si l'écart natif/maison > 8 %, privilégier le natif.
- Foulée : `longueur_foulée = distance GPS / pas` sur segments de 100 m à vitesse stable (variation < 10 %) ; modèle d'étalonnage par activité : régression `L = a + b·v` (course) apprise sur les 20 dernières sorties GPS propres. Utilisée pour estimer la distance sans GPS (tapis, tunnel) : `d = pas × L(v)`. Sur tapis sans capteur de pied, précision attendue ±5 % après 3 calibrations ; proposer « Calibrer avec la distance affichée au tapis » en fin de séance.

## 3.4 Métriques en direct

### 3.4.1 Catalogue

| Métrique | Formule / source | Unité | Rafraîchissement | Activités |
|---|---|---|---|---|
| Temps écoulé | horloge monotone | h:mm:ss | 1 s | toutes |
| Temps en mouvement | écoulé − pauses | h:mm:ss | 1 s | toutes |
| Distance | 3.3.3 | km / mi | 1 s (0,01 km) | toutes sauf muscu |
| Allure lissée | 3.3.3 | min/km | 1 s | marche, course, rando |
| Allure tour / moyenne | temps/distance | min/km | 1 s | idem |
| Allure ajustée pente (GAP) | Minetti : coût `C(i) = 155,4i⁵ − 30,4i⁴ − 43,3i³ + 46,3i² + 19,5i + 3,6` (J/kg/m, i = pente en fraction) ; GAP = allure × C(0)/C(i) | min/km | 5 s | course, rando |
| Vitesse / moyenne / max | 3.3.3 | km/h | 1 s | vélo (option autres) |
| FC | capteur BLE | bpm | 1 s | toutes |
| Zone FC | seuils zone (voir Partie 5) | Z1-Z5 | 1 s | toutes |
| % FCmax / FC moyenne tour | calcul | % / bpm | 1 s | toutes |
| Cadence pas | 3.3.8 | ppm | 2 s | marche, course |
| Cadence pédalage | BLE CSC | rpm | 1 s | vélo |
| Puissance instantanée / 3 s / 10 s / 30 s | BLE | W | 1 s | vélo, course (capteur) |
| Puissance normalisée (NP) | moyenne glissante 30 s, puissance 4, moyenne, racine 4e | W | 5 s | vélo |
| IF, TSS | IF = NP/FTP ; TSS = durée(s)×NP×IF/(FTP×3600)×100 | — | 10 s | vélo |
| Travail | ∫P dt | kJ | 1 s | vélo |
| Dénivelé +/− | 3.3.7 | m | 2 s | toutes |
| Altitude, pente | 3.3.7 | m, % | 2 s | toutes |
| Pas | podomètre | pas | 2 s | marche, course |
| Calories | 3.12 | kcal | 5 s | toutes |
| Temps estimé d'arrivée | (distance restante) / allure moyenne 5 min | h:mm | 10 s | si parcours ou objectif |
| Distance restante / D+ restant | parcours (voir Partie 4) | km / m | 5 s | si parcours |
| Heure, batterie, température capteur | système | — | 30 s | toutes |
| Écart à la cible | 3.5.4 | s/km ou W | 1 s | séances guidées |

### 3.4.2 Écrans personnalisables

- Chaque activité possède 1 à 5 pages ; chaque page 1 à 8 champs en grille (1×1, 1×2, 2×2, 2×3, 3×3). Un champ = métrique + variante (instantané / 10 s / tour / moyen / max).
- Tailles de police : S (24 pt), M (36), L (56), XL (80, un champ plein écran). Chiffres tabulaires pour éviter les sauts de largeur.
- Presets : Course route (page 1 : temps, distance, allure 10 s, FC ; page 2 : tour, allure tour, cadence, D+ ; page 3 : carte) ; Trail (distance, D+, allure GAP, FC, pente) ; Vélo route (vitesse, puissance 3 s, FC, cadence, distance, NP) ; Marche (pas, distance, temps, calories) ; Rando (distance restante, D+, altitude, temps en mouvement, carte). Presets propres à l'utilisateur sauvegardés et synchronisés (Partie 2 : droits : 1 profil d'écran en Gratuit, illimité à partir de Sports).
- **Mode plein soleil** : thème contraste maximal (noir sur blanc, polices grasses, ratio ≥ 12:1), bascule auto si capteur de lumière > 10 000 lux, manuelle sinon.
- Écran toujours allumé (`WAKE_LOCK` / `isIdleTimerDisabled`) ; option « écran faible : atténuer à 10 % après 30 s » pour économiser la batterie, tap réveille.
- **Verrouillage tactile** : bouton cadenas ; déverrouillage par glissement de 1 s ou appui long ; seul le bouton Pause reste actif (option). Verrouillage automatique à 10 s sans toucher, réglable.
- **Gestes à une main** : zones d'action en bas d'écran (pouce), boutons ≥ 64 dp, appui long 2 s pour arrêter, balayage horizontal pour changer de page, double-tap pour poser un tour (« lap »). Compatibilité boutons volume/casque (appui long = tour). VoiceOver/TalkBack : chaque champ annoncé « Allure : 5 minutes 12 par kilomètre ».

## 3.5 Séances guidées

### 3.5.1 Structure d'une séance

```
Workout { id, nom, sport, blocs[], source{coach|bibliothèque|utilisateur|test} }
Bloc { type: échauffement|travail|récupération|retour_au_calme|libre,
       répétitions: n (un bloc « groupe » contient des sous-blocs répétés n fois),
       fin: durée | distance | bouton | atteinte_FC,
       cible: { type: allure|FC|puissance|RPE|cadence|aucune, min, max } }
```
Exemple chiffré : 15 min échauffement Z2 ; 6 × (400 m à 4:10-4:20 /km, récup 90 s trot) ; 10 min retour au calme. Les cibles sont exprimées en valeurs absolues dans le fichier de séance, résolues à partir du profil (seuils, zones, FTP) au moment de la création (Partie 5 pour la génération et la bibliothèque ; Partie 2 : séances guidées illimitées à partir de Sports, 3 séances gratuites enregistrées par mois en Gratuit, contrôle serveur). Cible RPE : échelle 1-10, pas de mesure, rappel sonore uniquement. Maximum 50 blocs aplatis par séance.

### 3.5.2 Moteur d'exécution

Un automate imbriqué `WorkoutRunner` lit la séance aplatie. Auto-avancement : à la fin de la durée ou distance du bloc, bip + vibration + annonce « Bloc suivant », transition instantanée (les 3 dernières secondes comptées par bips à 1 s). Fin par FC : atteint quand la FC passe sous (ou au-dessus de) la valeur pendant 10 s. Mode manuel : un appui sur « Suivant » ou un double-tap avance ; l'avancement manuel est enregistré comme tour. Bouton « Passer le bloc », « Répéter le bloc », « Prolonger de 30 s ». Pause de séance gèle le minuteur du bloc.

### 3.5.3 Alertes

| Alerte | Déclencheur | Audio | Vibration |
|---|---|---|---|
| Début de bloc | transition | annonce + bip | 2 pulsations courtes |
| 3-2-1 | −3 s | bips | 1 pulsation par bip |
| Trop rapide / lent | écart hors cible > 10 s | « Ralentis » / « Accélère » | 1 longue / 2 courtes |
| FC haute | FC > max zone cible 15 s | « Fréquence cardiaque élevée » | 3 pulsations |
| Hors-cible puissance | P 10 s hors fourchette | idem | idem |
| Fin de séance | dernier bloc | « Séance terminée » | long |

Anti-fatigue sonore : cooldown de 30 s entre alertes d'écart identiques ; maximum 4 alertes d'écart par bloc ; désactivable par type.

### 3.5.4 Écart à la cible

Écart d'allure = allure lissée 10 s − centre de la fourchette ; affiché en s/km avec flèche et barre colorée : vert dans la fourchette, jaune jusqu'à ±5 % hors fourchette, rouge au-delà. FC : écart en bpm et zone. Puissance : écart en W sur moyenne 3 s (10 s pour alertes). En côte, option « cible ajustée à la pente » : comparer le GAP à la cible (course), et ne jamais alerter « accélère » quand la pente > 8 %.

### 3.5.5 Annonces vocales

- Moteur : TTS natif (`AVSpeechSynthesizer`, `TextToSpeech` Android) ; voix françaises hors ligne obligatoires ; langues fr, en, es à terme, via fichiers de gabarits `{distance}` `{allure}` `{fc}` localisés. Aucun TTS réseau pendant une sortie.
- Fréquence réglable : tous les 1 km / 1 mi / 5 min / à chaque tour / désactivé ; contenu : distance, temps, allure moyenne, allure tour, FC, D+. Format : « 5 kilomètres. Temps : 27 minutes 40. Allure moyenne : 5 minutes 32. »
- Audio : catégorie `.playback` avec `.duckOthers` + `.interruptSpokenAudioAndMixWithOthers` (iOS) ; `AudioFocus TRANSIENT_MAY_DUCK` (Android). La musique baisse à 30 % pendant l'annonce puis remonte. Respecter le mode silencieux pour les bips si l'utilisateur a choisi « vibration seule ». Écouteurs Bluetooth : router vers l'appareil actif ; sans écouteurs, annonces sur haut-parleur seulement si l'option « haut-parleur » est cochée. Appel entrant : suspendre la file d'annonces.

### 3.5.6 Séances de test

Intégrer des protocoles guidés avec calculs automatiques : test de 30 min (FC lactique : moyenne des 20 dernières min), test de 20 min (FTP = 95 % de la puissance moyenne), test 5 km chrono, test de marche 6 minutes, test de Cooper 12 min (VO₂max ≈ (distance m − 504,9)/44,73). Le résultat met à jour les seuils du profil après confirmation (Partie 5).

## 3.6 Capteurs et appareils

### 3.6.1 Profils Bluetooth Low Energy

| Capteur | Service GATT | Caractéristique | Notes |
|---|---|---|---|
| FC (ceinture, bracelet optique) | 0x180D | 0x2A37 | Flag 8/16 bits, RR-intervalles pour VFC |
| Vitesse/cadence (CSC) | 0x1816 | 0x2A5B | Calcul à partir des compteurs de tours avec gestion du rollover (16 bits) ; circonférence roue paramétrable (défaut 2 105 mm pour 700×25c) |
| Puissance vélo | 0x1818 | 0x2A63 | Pédales, manivelles, moyeux ; équilibre G/D ; flag de calibration |
| Course (RSC) | 0x1814 | 0x2A53 | Cadence, longueur de foulée, vitesse ; capteurs de pied |
| Home-trainer / tapis (FTMS) | 0x1826 | 0x2AD2 (Indoor Bike), 0x2ACD (Treadmill), 0x2AD9 (Control Point) | Voir 3.6.4 |
| Batterie | 0x180F | 0x2A19 | Alerte < 15 % |

Hors BLE : support de l'ANT+ non requis au lancement (risque : coût matériel Android uniquement). Compteurs propriétaires et temps de contact au sol/oscillation verticale (accessoires type Stryd, pods) : lire via leur profil de puissance de course (0x1818 variante) ou leurs données développeur ; sinon marquer non supporté.

### 3.6.2 Appairage et reconnexion

Écran « Capteurs » : scan 15 s filtré par services connus, tri par RSSI, nom + type + batterie. Un capteur appairé est mémorisé (identifiant stable, rôle : FC/vitesse/puissance/…). Reconnexion automatique : tentatives à 1, 2, 5, 10, 30 s puis toutes les 30 s pendant toute la sortie ; indicateur de statut par capteur ; si déconnecté > 10 s afficher « -- » (jamais la dernière valeur figée) et journaliser `SENSOR_GAP`. Multi-capteurs : un seul capteur actif par rôle, priorité choisie par l'utilisateur ; repli automatique (ex. : FC bracelet si la ceinture est perdue) avec bannière. Android : service de premier plan de type `connectedDevice` en plus de `location`. iOS : `bluetooth-central` en arrière-plan et restauration d'état (`CBCentralManagerOptionRestoreIdentifierKey`).

Filtrage FC : rejeter < 30 et > 230 bpm ; médiane glissante 5 s pour détecter les erreurs de bracelet optique (changement > 30 bpm en 2 s sans accélération) ; flag `hr_quality`.

### 3.6.3 Calibration puissance

Commande de calibration (offset zéro) via point de contrôle 0x2A66 : bouton « Calibrer à 0 » avec consigne (pédale libre, vélo droit) ; afficher la valeur retournée et un échec explicite. Circonférence roue : table + saisie. Détection d'anomalie : puissance > 2 500 W ou saut > 1 000 W/s → rejet. Pic < 3 s sans cadence → rejet (cadence 0 avec puissance > 50 W = rejet).

### 3.6.4 Home-trainer et tapis (FTMS)

- Écriture sur 0x2AD9 : `Request Control (0x00)`, `Start/Resume (0x07)`, `Stop/Pause (0x08)`, `Set Target Power (0x05, sint16 W)`, `Set Indoor Bike Simulation (0x11 : vent, pente 0,01 %, coef roulement, coef traînée)`, `Set Target Speed (0x02)` et `Set Target Inclination (0x03)` pour tapis.
- Mode ERG : puissance cible = bloc de la séance ; transitions lissées par une rampe de 3 s ; si cadence < 40 rpm pendant 5 s, réduire la cible de 30 % (protection de la « spirale de la mort »). Mode pente (SIM) : pente du parcours (Partie 4) × facteur de réalisme (50-100 %), plafonnée à ±15 %. Mode libre : mesures seules.
- Tapis : allure et inclinaison pilotées par la séance, confirmation d'arrêt d'urgence à l'écran ; ne jamais modifier la vitesse sans geste préalable de l'utilisateur la première fois (confirmation « Autoriser le contrôle »). Dérogation : si le tapis n'expose pas 0x2AD9, utiliser les mesures seules.
- Distance sur tapis = distance fournie par le tapis (priorité) > podomètre × foulée.

### 3.6.5 Montre et FC importée, montre autonome

Import de la FC depuis la montre : HealthKit (`HKWorkout` + `HKQuantityTypeIdentifierHeartRate`) et Health Connect (Android) sur autorisation ; fusion par horodatage avec tolérance 2 s. Diffusion de FC par la montre en mode « FC diffusée » (BLE) acceptée comme capteur standard. **Préparation « montre autonome »** : concevoir `ActivityEngine` comme bibliothèque sans dépendance UI avec interface `SensorSource` et `Store` abstraites, et un format de journal compact identique (3.7) pour qu'une future app watchOS / Wear OS réutilise le moteur ; ne pas implémenter les apps montre dans cette phase.

## 3.7 Persistance et fiabilité

### 3.7.1 Écriture continue et journal

Base locale [STACK_STOCKAGE_LOCAL] : SQLite WAL recommandé. Tables : `activities` (en-tête, état), `activity_events` (journal), `samples` (un échantillon par seconde : t_mono, t_utc, lat, lon, acc, alt_baro, alt_gnss, v_doppler, hr, cad, power, steps, flags), `laps`. Écriture par lots de 5 s ; un point n'est jamais attendu en mémoire plus de 5 s. Double écriture du flux brut dans un fichier journal binaire append-only (`.rec`, enregistrements de 64 octets avec CRC32), indépendant de la base : si la base est corrompue, le fichier permet la reconstruction.

### 3.7.2 Sauvegarde incrémentale et compression

Toutes les 60 s, point de contrôle (`checkpoint`) : agrégats courants + dernier index. Flux compressé à l'archivage : coordonnées en entiers 1e-7° encodés en delta + varint, puis zstd niveau 6 ; cible ≤ 6 octets/échantillon avant zstd, soit environ 40 Ko/h après compression pour 1 point/s avec FC/cadence (≈ 2 Mo/h non compressé en JSON : interdit). Stockage local : une sortie de 8 h < 400 Ko compressée.

### 3.7.3 Limites de stockage

Alerte si espace libre < 200 Mo au démarrage (bloquant < 50 Mo avec option « enregistrer quand même »). Plafond d'une sortie : 24 h ou 100 000 points ; au-delà, scinder automatiquement en segments liés. Corbeille 30 jours. Les tuiles de carte hors ligne ne comptent pas dans ce quota (Partie 4).

### 3.7.4 Synchronisation différée

File d'envoi `outbox` persistée : fichier compressé + métadonnées ; envoi en Wi-Fi par défaut (option « données mobiles »), reprise par fragments, retries à backoff exponentiel 30 s → 1 h, plafond 24 tentatives par jour. Les activités n'attendent jamais le réseau pour être visibles dans l'historique local.

### 3.7.5 Doublons

Clé d'idempotence : `activity_id` (UUID v7 généré client). Serveur : `INSERT ... ON CONFLICT (user_id, activity_id) DO NOTHING` renvoyant l'existant. Détection de quasi-doublons (import/montre/autre app) : même utilisateur, début à ± 2 min, durée à ± 10 %, distance à ± 10 % → proposer fusion ou conservation (par défaut, garder la source la plus riche : capteurs > GPS seul). Ne jamais supprimer sans confirmation.

### 3.7.6 Idempotence de la sauvegarde

`SAVING` est rejouable : l'agrégation écrit dans une table temporaire puis bascule `status=saved` dans une transaction. Une seconde exécution recalcule les mêmes valeurs (fonctions pures) sans effet cumulatif (charge, records, trophées : événements dédupliqués par `activity_id`, voir Parties 5 et 7).

### 3.7.7 Test de 8 heures et pannes

Critère : une sortie simulée de 8 h (replay accéléré ×60 + un test réel de 8 h en randonnée) ne perd aucun point, pas de croissance mémoire > 50 Mo, CPU moyen < 5 %. Cas : kill forcé toutes les 20 min ; batterie vide ; mode avion 30 min ; espace disque plein (le moteur doit passer en mode « agrégats seuls », avertir, et ne jamais corrompre l'existant) ; changement de fuseau et heure d'été.

## 3.8 Fin de séance

### 3.8.1 Récapitulatif

Écran en 3 sections : (1) en-tête (titre auto, date, type, météo, note, ressenti) ; (2) carte, courbes (allure/vitesse, FC, altitude, puissance, cadence) et tours ; (3) analyse (zones, records battus, charge ajoutée). Éléments : carte avec tracé coloré par allure ; graphiques ; tours manuels et automatiques (1 km/mi, réglable) ; **records battus** (bannière) ; charge ajoutée (TSS/charge interne, Partie 5) ; **RPE** (échelle 1-10, obligatoire mais ignorable, rappel dans la notification) ; météo (température, vent, pluie) récupérée à l'heure et au lieu du début ; « météo vécue » (ressenti : trop chaud / bien / trop froid / vent / pluie, saisie rapide à 5 pictos) ; note de 1 à 5 étoiles ; photos (jusqu'à 10, EXIF géolocalisé placé sur la carte, compressées 1 600 px) ; matériel (chaussures, vélo : proposé selon dernier usage par type, modifiable en un tap).

### 3.8.2 Détection de records personnels

| Activité | Fenêtres distance | Fenêtres temps |
|---|---|---|
| Course | 400 m, 1 km, 1 mi, 5 km, 10 km, 15 km, 21,1 km, 42,2 km | meilleure distance en 12 min (Cooper), 30 min, 1 h |
| Marche | 1 km, 5 km, 10 km | 1 h |
| Vélo | 10 km, 20 km, 40 km | puissance max 5 s, 1 min, 5 min, 20 min, 60 min ; courbe de puissance |
| Rando / toutes | plus longue distance, plus grand D+, plus longue durée | — |

Méthode : fenêtre glissante sur le flux `clean` ré-échantillonné à 1 Hz, interpolation linéaire de la distance cumulée pour atteindre exactement la distance cible ; meilleur temps = min sur toutes les fenêtres (pas seulement les tours). Exclure segments `estimated`, sorties du type « véhicule », vitesses aberrantes, et sorties où `rejected_points` > 10 % ; tapis et home-trainer comptabilisés dans des classements séparés. Un record est confirmé s'il bat l'ancien d'au moins 1 s (ou 1 W). Le record d'une sortie modifiée ou supprimée est recalculé (jamais perdu : conserver l'historique des records).

### 3.8.3 Classification automatique et titre

Type de séance (règles, pas de modèle lourd) : « Sortie longue » si durée ≥ 1,5 × médiane des 8 dernières semaines et FC en Z1-Z2 ; « Fractionné » si ≥ 3 alternances de vitesse (écart > 25 %, 30 s à 8 min) ; « Tempo » si ≥ 20 min dans Z3-Z4 ; « Récupération » si Z1 > 80 % ; « Course / sortie » sinon. Titre : `{Moment de la journée} {activité} — {lieu ou type}`, ex. « Course du matin — Parc Borély » ; lieu par géocodage inverse hors ligne (communes) à la fin ; modifiable ; si séance guidée, reprendre son nom. Moment : matin 5-11 h, midi 11-14, après-midi 14-18, soir 18-22, nuit sinon.

### 3.8.4 Suggestions et partage

Récupération : durée suggérée = f(charge ajoutée, charge chronique) (Partie 5) ; repas : bouton « Repas de récupération » qui ouvre [NOM_APP_FIT] avec calories dépensées et besoin protéines/glucides pré-calculés (Partie 7, intégration Fit). Partage : visibilité par activité (Privée / Amis / Public), défaut = réglage du compte ; **zones de confidentialité** (rayon 200 m, 500 m ou 1 km autour de domicile/travail masquent début et fin du tracé) appliquées aussi aux images de partage ; carte-image de partage (tracé, stats, sans fond de carte précis en privé). Le partage ne se fait jamais avant la validation du récap.

## 3.9 Historique et analyses

### 3.9.1 Liste, calendrier, recherche

Liste infinie triée par date (tri : date, distance, durée, allure, D+, charge) ; filtres combinables : activité/variante, période, distance min-max, durée, D+, matériel, étiquettes, météo, parcours, source, avec ou sans FC ; recherche plein texte (titre, notes, lieu, étiquettes) via FTS5. Vue calendrier mensuelle : pastilles colorées par activité, taille proportionnelle à la charge, total hebdomadaire en marge ; tap = liste du jour. Temps de réponse cible < 150 ms sur 5 000 activités locales.

### 3.9.2 Détail d'une activité

Graphiques synchronisés avec la carte : le curseur sur une courbe déplace le marqueur sur la carte, et réciproquement (index par distance cumulée). Zoom par pincement horizontal ; sélection d'un intervalle → statistiques de l'intervalle (distance, temps, allure, FC moyenne, D+). Axes X : distance ou temps. Courbes : allure (inversée), FC, altitude, pente, cadence, puissance, température. Comparaisons : superposition d'une autre sortie ; delta de temps cumulé (courbe « avance/retard ») sur un parcours commun détecté par corrélation de tracés (≥ 90 % des points à moins de 25 m, même sens), voir Partie 4 pour les segments.

### 3.9.3 Tours et terrains

Tableau des tours : n°, distance, temps, allure, FC, D+, cadence ; barres proportionnelles ; meilleur tour surligné ; écart par tour à la moyenne ; détection de « split négatif » (2e moitié plus rapide). Analyse par terrain : segmentation par pente (plat ±2 %, montée 2-8 %, forte montée > 8 %, descente −2 à −8 %, forte descente < −8 %) avec temps, distance, allure et GAP par classe ; surfaces si la donnée existe (Partie 4).

### 3.9.4 Tendances, matériel

Tendances : volume hebdomadaire/mensuel (distance, durée, D+), allure moyenne à FC égale (indice d'efficacité = vitesse / FC moyenne), FC au repos (importée, voir Partie 5), charge aiguë/chronique. Matériel : chaussures (kilométrage cumulé, alerte à 600 km, réglable 400-900) ; vélos (kilométrage, composants : chaîne alerte 3 000 km, pneus 4 000 km, plaquettes 2 000 km, révision annuelle), entretien consigné avec date et coût ; rappel quand le seuil est franchi ; archivage d'un équipement.

### 3.9.5 Corrections et export

Édition non destructive (le flux brut reste conservé, les corrections sont des opérations rejouables, annulables 30 jours) : **rognage** début/fin ; **découpe** en deux sorties ; **fusion** de deux sorties proches (écart < 3 h, le trou devient pause) ; **correction d'altitude** par MNE ; suppression de points aberrants ; changement de type d'activité et de matériel ; recalcul automatique des records et de la charge après chaque édition. Suppression : corbeille 30 jours puis suppression définitive, y compris sur le serveur (conformité : voir Partie 8). Export unitaire GPX/TCX/FIT (voir 3.10).

## 3.10 Saisie manuelle et import/export

### 3.10.1 Saisie manuelle

Formulaire : activité, date/heure, durée, distance (ou allure), D+, FC moyenne, RPE, matériel, notes. Calculs croisés : deux champs parmi durée/distance/allure déduisent le troisième. Source `manual`, exclue des records de fenêtres courtes (seuls les records de distance totale et durée sont éligibles), contrôle de plausibilité (allure course < 2:30 /km ou vitesse vélo > 70 km/h : avertir, pas bloquer).

### 3.10.2 Formats

| Format | Import | Export | Champs gérés | Fidélité |
|---|---|---|---|---|
| GPX 1.1 | oui | oui | trkpt lat/lon/ele/time ; extensions Garmin TrackPointExtension v1 (hr, cad, atemp) ; wpt | Pas de tours ni puissance natifs : puissance via extension `power` |
| TCX | oui | oui | Activity, Lap, Trackpoint, DistanceMeters, HeartRateBpm, Cadence, Watts (ActivityExtension TPX) | Tours conservés |
| FIT | oui | oui | messages file_id, session, lap, record (position en semicircles, altitude, FC, cadence, puissance, vitesse, distance, température), event (start/stop/pause), device_info, sport ; développeur fields ignorés mais préservés au mieux | Référence ; export FIT = format préféré pour Garmin/Wahoo |

Règles : tolérance au format (UTF-8, BOM, fuseaux, horodatages sans `Z` = UTC) ; coordonnées hors plage rejetées ; fichier max 50 Mo ; analyse en flux ; échec d'une ligne n'interrompt pas l'import, rapport final « 3 points ignorés ». Export fidèle : un aller-retour GPX → app → GPX perd < 1 m de position et ne perd aucun point valide. L'export respecte les zones de confidentialité en option (par défaut : non masqué pour ses propres données).

### 3.10.3 Import en masse et autres plateformes

Import de plusieurs fichiers et d'archives ZIP (jusqu'à 2 000 fichiers) en tâche de fond avec progression, annulation, reprise ; déduplication selon 3.7.5 (rapport : importés / doublons ignorés / en erreur). Guides intégrés pour récupérer son historique : Strava (export de compte, dossier `activities`), Garmin Connect, Apple Santé (`export.xml`, entraînements et routes GPX), Google Fit / Health Connect, Komoot, Wahoo, Polar Flow, Suunto. Les activités importées conservent leur `source` et `external_id`. Les trophées et records rétroactifs sont recalculés sans notification en rafale (une seule synthèse).

### 3.10.4 Export des données personnelles

Depuis Réglages : archive ZIP (activités en FIT + GPX, JSON complet avec toutes métriques, matériel, records, photos), générée côté serveur, lien valable 7 jours, disponible sous 24 h (voir Partie 8 pour RGPD).

## 3.11 Spécificités d'enregistrement par activité

Cette section ne détaille que l'enregistrement et les métriques ; l'approfondissement par discipline (entraînement, techniques, plans) relève de la Partie 6.

### 3.11.1 Marche

Pas via podomètre natif en continu (même hors sortie) pour l'objectif quotidien : défaut 7 000 pas, réglable 1 000-30 000, coach adapte (Partie 5). Anneau de progression, historique journalier reconstruit depuis `CMPedometer`/Health Connect (jusqu'à 30 jours rétroactifs), sans GPS. Marche active : démarrée comme sortie, active si cadence ≥ 110 ppm et vitesse ≥ 1,67 m/s (6 km/h) → « minutes actives » ; marche nordique : variante avec facteur MET 4,8-6,8 (3.12), cadence mesurée au poignet non fiable → utiliser GPS. Dédoublonnage : les pas d'une sortie enregistrée ne sont pas comptés deux fois dans le total journalier (soustraire la fenêtre de la sortie du podomètre quotidien puis ajouter celle de la sortie).

### 3.11.2 Randonnée

Métriques : D+, D−, altitude, altitude max, temps en mouvement vs total, pauses longues (arrêt > 3 min = « pause », > 20 min = « pause longue » listée dans le récap avec lieu). Mode économie par défaut proposé si durée prévue > 4 h. Poids du sac (kg, saisi au départ, mémorisé) intégré aux calories (charge portée, formule de Pandolf simplifiée, 3.12). Météo en altitude : en préparation, afficher température à l'altitude du point haut (gradient −6,5 °C / 1 000 m par rapport à la station) et rappel sécurité (Partie 4). Itinérance : une « sortie » par jour liée à un projet multi-jours, rechargement automatique de l'état au matin ; coupure nocturne du GPS avec événement `OVERNIGHT`. Trek : sauvegarde locale prioritaire (aucune synchronisation requise pendant 7 jours).

### 3.11.3 Course

Cadence, longueur de foulée (3.3.8), temps de contact au sol et oscillation verticale si capteur BLE, allure ajustée à la pente (GAP, 3.4.1), tapis (3.6.4 et calibration de distance), piste : mode piste avec couloirs (couloir 1 : 400 m par tour ; couloir n : 400 + 7,04 × (n−1) m pour un tour de 400 m ; correction GPS impossible, tours comptés par bouton ou géorepérage ± 5 m, distance recalée sur multiples de 400 m), fractionné (3.5), parkrun/chrono : mode « course officielle » : départ synchronisé, distance cible 5 000 m avec alerte à l'arrivée, résultat officiel saisissable dans le récap, distinction « effort en course ».

### 3.11.4 Vélo

Puissance, FTP (valeur du profil ou test 3.5.6 ; estimation automatique 95 % du meilleur 20 min des 90 derniers jours, confirmation requise), vitesse, cadence, pente, énergie en kJ (≈ kcal dépensées grâce à rendement 24 % : 1 kJ travail ≈ 1 kcal dépensée). Virages et descentes : détection pour la fréquence d'échantillonnage (1 s imposé) et statistiques « vitesse max en descente », « pente max ». Mode VTT : seuil de rejet précision 40 m, Kalman q = 4, pas d'auto-pause à v < 1,5 m/s dans les montées techniques (seuil 0,8), détection de chute (accéléromètre > 4 g puis immobilité 20 s : alerte d'urgence, voir Partie 4). Vélo électrique : détection si puissance moteur BLE (profil CSC/ANT LEV, 0x1826 variante) ou si vitesse > 25 km/h soutenue avec puissance/FC incompatibles (FC < 60 % FCmax et vitesse > 30 km/h en montée > 4 %) → proposer « Vélo électrique » ; sorties VAE exclues des records de vélo classiques, charge calculée à la FC uniquement, kJ non crédités. Home-trainer : sans GPS, distance virtuelle = ∫v dt avec v issue de la puissance (modèle physique) ou du capteur de vitesse. Entretien : kilométrage ajouté au vélo choisi (3.9.4).

## 3.12 Calories et dépense énergétique

Trois méthodes, choisies par priorité de disponibilité :

1. **Puissance (vélo)** : `kcal = travail(kJ) / 4,184 / 0,24 ≈ travail(kJ)` (rendement 24 %). Marge d'erreur ±5 % avec capteur calibré.
2. **FC (Keytel et al.)**, si FC fiable ≥ 70 % du temps, âge a, poids m (kg), durée t (min) : hommes `kcal/min = (−55,0969 + 0,6309·FC + 0,1988·m + 0,2017·a)/4,184` ; femmes `(−20,4022 + 0,4472·FC − 0,1263·m + 0,074·a)/4,184` ; valider uniquement si FC ≥ 90 bpm ; en dessous, basculer sur MET. Marge ±15 %.
3. **MET (Compendium)** : `kcal = MET × m × t(h)` (net : (MET−1) × m × t). Table indicative : marche 3,0 km/h → 2,3 ; 5 km/h → 3,5 ; 6,5 km/h → 5,0 ; nordique 4,8-6,8 ; randonnée sans sac 5,3, avec sac > 10 kg 7,0 ; course 8 km/h → 8,3 ; 10 km/h → 9,8 ; 12 km/h → 11,8 ; 14 km/h → 12,8 ; vélo 16-19 km/h → 6,8, 19-22 → 8,0, 22-26 → 10,0, VTT 8,5. Course : formule ACSM `VO₂ = 0,2·v(m/min) + 0,9·v·pente + 3,5` ; kcal = VO₂ × m × t / 1000 × 5. Marge ±20 %.

Exemple : 70 kg, course 10 km/h, 45 min → 9,8 × 70 × 0,75 = 514 kcal (brut), net ≈ 462 kcal. Affichage : toujours en fourchette dans le récap (« ≈ 510 kcal, ±15 % ») et mention de la méthode ; valeur seule en direct. Si deux méthodes divergent de plus de 25 %, afficher celle de plus faible marge d'erreur. Les calories sont exposées à [NOM_APP_FIT] en net (hors métabolisme de base) pour éviter le double comptage avec le besoin journalier.

## 3.13 Batterie et performance

Budgets (milieu de gamme, mesurés par outils constructeur : Xcode Energy Log, Battery Historian, Perfetto) : enregistrement standard 5 %/h écran éteint ; 12 %/h écran allumé avec carte ; BLE FC + vitesse ajoute ≤ 1 %/h ; annonces vocales ≤ 0,5 %/h ; CPU moyen < 5 % écran éteint ; mémoire résidente < 150 Mo ; démarrage de l'écran d'enregistrement < 1,5 s.

Modes d'économie (3 niveaux) : **Standard** ; **Économie** (3 s d'intervalle, rafraîchissement UI 2 s, carte désactivée, Kalman allégé) ; **Ultra** (10 s, écran noir, capteurs BLE conservés, pas de graphiques). Activation automatique : batterie < 20 % → proposition, < 10 % → Économie ; à 5 % → sauvegarde immédiate du point de contrôle et notification « Il vous reste ~X min d'enregistrement » (estimation = batterie % / taux de décharge des 10 dernières minutes). Pas de calcul lourd en sortie : agrégats incrémentaux O(1) par point ; recalcul complet seulement en SAVING.

Appareils bas de gamme (référence : Android 2 Go RAM, SoC d'entrée de gamme, iPhone SE 2e génération) : tests obligatoires de 2 h et 8 h, rendu 30 ips minimum, aucune perte de point, aucun ANR ; désactiver animations de cartes et graphiques en direct si FPS < 24 sur 10 s.

## 3.14 Tests et critères d'acceptation

### 3.14.1 Plan de tests terrain

Pour chaque version majeure : 12 parcours de référence mesurés (piste de 400 m, boucle urbaine, canyon urbain, forêt dense, tunnel de 800 m, montagne avec D+ 1 000 m, route de campagne, VTT technique, vélo à 40 km/h, tapis, home-trainer, rando 6 h) sur 4 appareils (iPhone récent, iPhone SE, Pixel, Android bas de gamme + Xiaomi/Samsung à gestion batterie agressive) avec montre GPS de référence ; écart de distance toléré ≤ 1 % sur boucle dégagée, ≤ 3 % en forêt/canyon ; écart de D+ ≤ 5 % (baromètre) ou ≤ 10 % (GNSS+MNE).

### 3.14.2 Jeux de rejeu automatisés

Corpus de fichiers GPX/FIT « dorés » versionnés dans `/testdata/replay` (≥ 40 sorties) incluant : saut de 200 m, tunnel de 2 min, dérive à l'arrêt, zigzags de canyon, sprint, descente à 60 km/h, tapis. Un rejeu injecte les points avec horloge simulée dans `ActivityEngine`; sorties attendues stockées (distance, D+, temps en mouvement, records) avec tolérances ; régression bloquante en CI si dépassement. Tests de propriété : distance monotone croissante, `moving ≤ elapsed`, rejeu idempotent, recouvrement identique après crash simulé à n'importe quel point du flux.

### 3.14.3 Cas d'acceptation

1. Démarrer une course : premier fix précis ≤ 20 m en < 15 s à chaud ; compte à rebours puis RECORDING.
2. Annuler en PREPARING ne laisse aucune activité en base.
3. Arrêt uniquement par appui long de 2 s ; un appui court ne termine pas.
4. Pause manuelle : distance et temps en mouvement figés ; temps écoulé continue.
5. Auto-pause course : déclenchée à v < 0,6 m/s pendant 5 s, reprise à v > 1,0 m/s.
6. Tuer l'app à 20 min : au relancement, écran de récupération avec ≥ 99,9 % des points.
7. Batterie vide à 1 h 10 : sortie récupérable, durée = dernier point − pauses.
8. Mode avion 30 min : enregistrement complet, synchronisation au retour réseau.
9. Un saut de 200 m en 1 s est rejeté et compté dans `rejected_points`.
10. Un point avec précision 80 m est rejeté.
11. Tunnel de 2 min : bandeau signal faible, ligne pointillée, distance non gonflée (écart < 5 %).
12. Boucle de piste 400 m ×10 : distance 4 000 m ± 1 % en mode piste.
13. Course 10 km dégagée : distance à ± 1 % de la référence.
14. Dérive à l'arrêt 5 min : distance ajoutée < 5 m.
15. D+ d'une montée de 100 m avec bruit ±3 m : 100 m ± 5 % (baromètre).
16. Profil de test 100 → 103 → 101 → 106 (seuil 5) : D+ = 6.
17. Allure affichée : stable (variation < 5 s/km sur plat à vitesse constante).
18. Cadence : ±3 % en course sur tapis de 3 min à 170 ppm.
19. Podomètre : écart natif/maison > 8 % → valeur native retenue.
20. Détection marche→course suggérée après 3 min sans changement silencieux.
21. Trajet voiture à 50 km/h : suggestion de pause en ≤ 60 s.
22. Permission de localisation refusée : l'app propose saisie manuelle et tapis sans blocage.
23. Précision approximative : démarrage GPS refusé avec écran explicatif.
24. Permission révoquée en cours de sortie : événement `GAP` et enregistrement des capteurs restants.
25. Android : notification persistante avec Pause/Reprendre fonctionne écran verrouillé.
26. iOS : Live Activity à jour toutes les 5 s écran verrouillé.
27. Ceinture FC perdue puis retrouvée : reconnexion en < 30 s, « -- » affiché pendant la coupure.
28. Deux capteurs de FC : un seul actif, bascule signalée.
29. Puissance : calibration à zéro renvoie un offset et une confirmation.
30. Home-trainer ERG : cible suivie ±5 W, rampe de 3 s, réduction de 30 % si cadence < 40 rpm.
31. Séance 6 × 400 m : auto-avancement correct, 18 annonces de bloc, aucun bloc sauté.
32. Alerte « Ralentis » espacée d'au moins 30 s, max 4 par bloc.
33. Musique : baisse à 30 % pendant l'annonce puis retour automatique.
34. Appel entrant : annonces suspendues, reprise après appel.
35. Record 5 km détecté sur fenêtre glissante dans une sortie de 8 km (hors tours).
36. Record non attribué à une sortie `estimated` ou `manual`.
37. Suppression d'une sortie record : record précédent restauré.
38. Import GPX de 50 000 points : < 5 s, aucune perte.
39. Import en double du même fichier : détecté, rien de dupliqué.
40. Aller-retour GPX : écart de position < 1 m.
41. Export FIT lisible par un lecteur de référence (FitCSVTool) sans erreur.
42. Rognage d'une sortie : agrégats et records recalculés, annulable.
43. Fusion de deux sorties à 20 min d'écart : le trou devient pause, total correct.
44. Zone de confidentialité 500 m : début/fin invisibles dans le partage et la carte-image.
45. Calories vélo : kcal ≈ kJ à ±5 % ; fourchette affichée avec méthode.
46. Sortie de 8 h : mémoire < +50 Mo, aucune perte, batterie conforme au mode choisi.
47. Disque plein : mode agrégats seuls, aucun fichier existant corrompu.
48. Espace de stockage 8 h : < 400 Ko compressé.
49. Batterie à 10 % : bascule Économie proposée, sauvegarde de contrôle à 5 %.
50. Mode plein soleil : contraste ≥ 12:1 et lisibilité vérifiée par audit automatique.
51. Écran personnalisable : une configuration créée sur un appareil se retrouve après synchronisation, droits vérifiés côté serveur.
52. Randonnée 6 h : temps en mouvement correct à ±3 min près ; pauses longues listées.
53. VAE : détection proposée et records vélo non polluée.
54. Tapis : distance du tapis prioritaire, calibration proposée en fin de séance.
55. Bas de gamme : 30 ips, aucun ANR pendant 2 h d'enregistrement.
