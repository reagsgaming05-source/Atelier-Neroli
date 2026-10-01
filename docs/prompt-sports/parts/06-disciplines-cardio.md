# PARTIE 6 — Approfondissement par discipline cardio : course, vélo, randonnée

> Périmètre de l'app : **cardio uniquement** (course à pied, vélo, randonnée, marche incluse sous « rando »). Cette partie approfondit chaque discipline au-dessus du socle commun : enregistrement (voir Partie 3), cartes, itinéraires et sécurité (voir Partie 4), charge, santé, coach et IA (voir Partie 5), social et intégration Fit (voir Partie 7), UX, qualité et conformité (voir Partie 8). Les droits d'accès (Gratuit, Sports, Fit, Ultra) sont **vérifiés côté serveur** (voir Partie 2). Placeholders : [STACK_BACKEND], [STACK_DB], [STACK_CARTES], [STACK_METEO], [STACK_BLE], [STACK_PUSH].

## 6.0 Règles pour toi (assistant de code)

1. Aucune règle propre à une discipline n'est codée en dur dans l'interface ou les services : tout provient de la **configuration de discipline** (6.1). Un `if (discipline === 'running')` hors adaptateur de configuration est un défaut.
2. Chaque fonctionnalité livre : migration, endpoint, tests unitaires des formules, test d'intégration, écran, chaînes i18n (fr, prêt en/es).
3. Toute formule de cette partie est implémentée dans un module pur (`calc/`), testée avec les exemples chiffrés fournis.
4. Aucune recommandation de matériel ne comporte de publicité cachée : pas de classement sponsorisé ; tout lien d'affiliation éventuel est étiqueté « lien partenaire » (voir Partie 8).
5. Repères d'accès : **Gratuit** = enregistrement, 1 plan de base, inventaire de 3 équipements, fiches d'événements ; **Sports** = prédictions, stratégies de course, courbes de puissance, alertes d'entretien illimitées, plans d'événement jour par jour ; **Fit** = + liens muscu (6.7) ; **Ultra** = coach adaptatif complet, entraînement virtuel, analyses avancées.
6. Aucun message de santé n'est un diagnostic ; formulation prudente et renvoi vers un professionnel (voir Partie 8).

---

## 6.1 Moteur de disciplines configurable

### 6.1.1 Principe
Une discipline est un **document de configuration versionné** (JSON validé par schéma, table `discipline_definition`). Ajouter la natation, le ski de fond ou le trail de montagne = ajouter une configuration et des tests de conformité, **sans refaire le code** de l'enregistrement, de l'historique ni du coach. Une activité enregistrée stocke `discipline_id` et `discipline_version` ; un changement de configuration ne modifie jamais rétroactivement les calculs passés (recalcul explicite et optionnel).

### 6.1.2 Schéma
```json
{
  "id": "running_road", "version": 4, "family": "endurance_gps", "parent": "running",
  "name_fr": "Course sur route",
  "sensors": ["gps","hr","cadence_accel","power_optional"],
  "metrics": [
    {"key":"distance","unit":"km"},{"key":"pace","unit":"min/km","smooth_s":10},
    {"key":"elevation_gain","unit":"m"},{"key":"cadence","unit":"spm"},
    {"key":"gap","unit":"min/km","formula":"grade_adjusted_pace"}],
  "screens": {"live":[["time","distance"],["pace","hr_zone"]],"summary":["map","splits","hr_chart","pace_chart"]},
  "zones": {"hr":"zones_5_karvonen","pace":"zones_from_threshold","power":null},
  "auto_pause": {"speed_min_kmh": 2.0, "resume_kmh": 3.0, "delay_s": 5},
  "split_default": {"mode":"distance","value_km":1},
  "sessions": ["easy","long","tempo","intervals","hills","fartlek","recovery"],
  "load_model": {"primary":"hrTSS","fallback":"sRPE","calories":{"met_table":"running_by_speed"}},
  "equipment_types": ["shoes"],
  "trophies": ["first_5k","first_10k","half_marathon","negative_split","100km_month"],
  "validations": {"max_speed_kmh":30,"max_pace_min_km_fast":2.0}
}
```
Champs obligatoires : `id, version, family, sensors, metrics, screens, zones, load_model, validations`. Familles : `endurance_gps` (course, vélo, rando), `endurance_indoor` (tapis, home-trainer), `endurance_water` (futur). L'héritage `parent` permet `running_trail` de surcharger `running`.

### 6.1.3 Disciplines livrées
| id | Parent | Spécificités de configuration |
|---|---|---|
| `running_road` | running | allure, cadence, splits au km |
| `running_track` | running | tours de 400 m, distance **non GPS** (compte-tours), splits par 200/400 m |
| `running_trail` | running | D+/D-, allure ajustée à la pente (GAP), effort par FC, ravitaillements, cut-offs |
| `running_treadmill` | running | distance de l'appareil ou foulée calibrée, pente saisie, pas de carte |
| `cycling_road` | cycling | vitesse, puissance, cadence, FTP |
| `cycling_gravel` | cycling | idem + surface, pression pneus |
| `cycling_mtb_xc/enduro/dh` | cycling | descentes chronométrées (segments), suspensions, pas de cadence |
| `cycling_city` / `ebike` | cycling | assistance (niveau), autonomie batterie, charge réduite (facteur 0,6 à 0,8 selon niveau) |
| `cycling_indoor` | cycling | FTMS, ERG, parcours virtuels |
| `hiking_day`, `hiking_multiday`, `hiking_high_mountain`, `walking`, `nordic_walking` | hiking | pas, D+, temps de déplacement vs total, niveau de difficulté, matériel obligatoire |

### 6.1.4 Ce que le moteur calcule
`MetricEngine` (agrégation, lissage, détection d'anomalies), `ZoneEngine` (zones FC/allure/puissance), `LoadEngine` (charge, voir Partie 5), `SessionEngine` (modèles de séances, 6.2.2), `TrophyEngine` (voir Partie 7). Chaque moteur lit uniquement la configuration.

### 6.1.5 Critères d'acceptation 6.1
- Ajouter `swimming_open_water` (capteur : montre, métrique : distance en m, allure /100 m) ne demande que JSON + tests ; l'enregistrement, l'historique et la charge fonctionnent.
- Une activité enregistrée en version 4 reste identique après publication de la version 5.
- Une configuration invalide est refusée au chargement avec message précis et n'est jamais mise en cache.

---

## 6.2 Course à pied

### 6.2.1 Types et particularités
| Type | Règles de gestion |
|---|---|
| Route | splits au km, allure lissée sur 10 s, auto-pause configurable |
| Piste | tours de 400 m ; distance = tours × 400 m (+ GPS ignoré car dérive) ; couloir 1 = 400 m, couloirs extérieurs ajoutent 7,5 m par couloir environ (option) |
| Trail | D+/D-, GAP (voir 6.2.4), effort par FC, cartes topo (voir Partie 4) |
| Ultra | > 42,195 km ou > 6 h ; mode économie de batterie (GPS 1 point/3 s, écran éteint), rappels ravitaillement, sauvegarde toutes les 30 s |
| Tapis | distance de l'appareil, correction de calibration : `facteur = distance_GPS_étalon / distance_tapis` mémorisé par appareil ; pente 1 % ≈ compense la résistance de l'air |
| Fractionné | séance structurée avec alertes (voir 6.2.2) |
| Parkrun / courses officielles | 6.5 |

### 6.2.2 Séances structurées
Un modèle de séance est une suite de blocs `{type, durée|distance, cible, répétitions, récupération}`.
Exemples exécutables :
- **Fractionné 8 x 400 m** : échauffement 15 min facile, 8 x (400 m à allure 5 km − 5 s/km, récupération 200 m trot ou 90 s), retour au calme 10 min.
- **Seuil 3 x 10 min** : 3 x (10 min à allure seuil ± 5 s/km, récup 2 min).
- **Sortie longue progressive** : 60 % facile, 30 % allure marathon, 10 % allure semi.
- **Fartlek** : 10 x (1 min vite / 1 min lent) libre ; **côtes** : 6-10 x 45 s à effort 8/10, descente en trot.
- **Récupération** : 30 min en zone 1, cadence ≥ 170 spm facultatif.
Pendant l'enregistrement : annonce vocale du bloc suivant 10 s avant, vibration, écart à la cible (« +6 s/km trop lent »), alerte si FC > zone cible plus de 20 s. Tolérance de cible : ±3 % allure par défaut.

### 6.2.3 Allures, zones et prédictions
- **Zones d'allure** à partir d'une allure seuil `Ts` (min/km) : Z1 > 1,29·Ts ; Z2 1,14-1,29·Ts ; Z3 1,06-1,14 ; Z4 0,99-1,05 (seuil) ; Z5 < 0,99·Ts.
- **VDOT/VO2max estimé** (Daniels) : `vitesse v = distance_m / temps_min` ; `VO2 = −4,60 + 0,182258·v + 0,000104·v²` ; `%VO2max = 0,8 + 0,1894393·e^(−0,012778·t) + 0,2989558·e^(−0,1932605·t)` (t en minutes) ; `VDOT = VO2 / %VO2max`.
- **Prédiction de temps** par la formule de Riegel : `T2 = T1 × (D2 / D1)^1,06`. Exemple : 10 km en 50:00 → semi : `3000 s × (21,0975/10)^1,06 = 3000 × 2,2288 ≈ 6 686 s = 1:51:26`. Affiner l'exposant (1,04 à 1,10) selon l'historique de l'utilisateur ; ne jamais prédire à partir d'une distance < 3 km pour un marathon ; afficher une **fourchette** (± 3 %) et la date de la performance source (péremption 8 semaines).

### 6.2.4 Technique : cadence, foulée
- Cadence (spm) = pas/min ; zone de repère affichée 160-190 sans prescrire une cible unique ; conseil d'augmenter de 5 % si cadence < 160 et foulée longue, **par palier de 5 spm sur 2 semaines**.
- Longueur de foulée = `vitesse (m/min) / cadence`. Oscillation verticale, temps de contact : affichés seulement si capteur compatible ; jamais interprétés comme risque de blessure.
- **GAP** (allure ajustée à la pente) : `coût(g) = 1 + 0,0338·g_%` pour g > 0 jusqu'à +10 % puis modèle de Minetti (polynôme de degré 5 du coût énergétique `Cr(g) = 155,4g⁵ − 30,4g⁴ − 43,3g³ + 46,3g² + 19,5g + 3,6` en J/kg/m, g en fraction) ; `GAP = allure_réelle × Cr(0)/Cr(g)`. En descente raide (< −15 %) le gain est plafonné pour rester réaliste.

### 6.2.5 Stratégies de course
- **Negative split** : seconde moitié ≥ 1 % plus rapide ; tableau cible par km affiché avant la course. Départ : ne pas dépasser l'allure cible de plus de 3 % sur les 3 premiers km (alerte).
- **Gestion de la pente** : sur un parcours GPX, plan « effort constant » : allure par segment `allure_cible × coût(g)/coût(0)` ; montée > 8 % : marche active recommandée en trail si FC > Z4 depuis 2 min.
- **Ravitaillement** : glucides 30-60 g/h après 60-75 min (jusqu'à 90 g/h pour les ultra entraînés), eau 400-800 ml/h selon chaleur, sodium 300-600 mg/h ; calendrier d'alertes calculé depuis durée estimée. Ces valeurs sont des repères, personnalisés par le coach nutrition (voir Partie 5) ; ne jamais conseiller d'essayer un nouvel aliment le jour J.

### 6.2.6 Matériel : chaussures
Voir 6.6 pour l'inventaire. Repères d'usure : alerte douce à 600 km, forte à 800 km (réglables par modèle, 300-1 000 km). **Rotation** : conseil d'utiliser 2 paires si > 3 sorties/semaine. Recommandations : critères (amorti, drop, largeur, usage), jamais de marque mise en avant par défaut ; tri alphabétique ou par critères de l'utilisateur ; mention « conseil indicatif, essayer en magasin ».

### 6.2.7 Préparation d'événement jour par jour
Plan généré à partir de la date de l'événement (voir 6.5) : phases base, spécifique, affûtage (taper : volume −40 à −60 % sur 10-14 jours pour un marathon, 7 jours pour 10 km, intensité maintenue).
Semaine de course (marathon) : J-7 sortie facile 40 min + 4 lignes droites ; J-5 repos ou 30 min ; J-3 20 min + 3 x 1 min allure course ; J-2 repos, glucides 8-10 g/kg/jour à J-2 et J-1 (valeur indicative) ; J-1 15 min + check-list (6.5.3) ; **Jour J** : réveil 3 h avant, petit-déjeuner testé, échauffement 10 min (5 km max : 15-20 min avec lignes droites), stratégie affichée sur montre.

### 6.2.8 Après-course et reprise
Après un marathon : repos actif 3-7 jours, aucune intensité 2 semaines, reprise progressive : semaine 1 : 25 % du volume pré-course ; chaque semaine +20 %. 10 km : 2-3 jours faciles. Après blessure ou arrêt > 14 jours : plan de reprise (marche-course 1/2 min, volume −50 % puis +10 %/semaine). L'app suggère de consulter si douleur persistante > 7 jours.

### 6.2.9 Trail
- D+ cumulé avec filtrage (altitude lissée sur 10 m, seuil de gain 3 m) ; correction par modèle numérique de terrain ([STACK_CARTES], voir Partie 4) plutôt que baromètre seul si l'écart > 10 %.
- **Km-effort** : `km + D+/100` (règle UTMB indicative). Exemple : 45 km et 2 800 m D+ = 73 km-effort.
- **Bâtons** : option « bâtons » (changement d'économie de marche), pas de modification de la charge sauf déclaration.
- **Sac** : poids déclaré, matériel obligatoire de la course (liste importée de la fiche événement).
- **GPX de course** : import, comparaison position vs tracé (alerte hors-parcours > 30 m), profil altimétrique avec points d'eau.
- **Ravitaillements et barrières horaires** : liste `{nom, km, D+ cumulé, ouverture, fermeture, services}` ; le moteur calcule l'**heure d'arrivée prévue** à chaque point selon l'allure ajustée et affiche la **marge** : `marge = fermeture − arrivée_prévue`. Alerte orange si marge < 30 min, rouge si < 10 min, avec le calcul de l'allure minimale requise jusqu'au prochain cut-off. Hors ligne obligatoire.

### 6.2.10 Critères d'acceptation 6.2
- Riegel : 10 km en 50:00 prédit 1:51:26 (± 1 s) pour le semi.
- Séance 8x400 : 8 alertes de début de répétition, 8 de récupération, écart de cible affiché.
- Trail : un point de ravitaillement dont la marge descend sous 30 min déclenche une alerte même sans réseau.

---

## 6.3 Vélo

### 6.3.1 Types
| Discipline | Spécificités |
|---|---|
| Route | puissance, cadence, FTP, groupes, drafting |
| Gravel | surface (asphalte, piste, chemin), pression de pneus conseillée, itinéraires mixtes (voir Partie 4) |
| VTT XC | montées/descentes, FC et puissance ; **enduro** : sections chronométrées en descente (segments auto-détectés par pente < −8 % sur > 30 s), montées en liaison non chronométrées ; **descente** : vitesse max, saut/chocs (accéléromètre), sécurité renforcée (détection de chute, voir Partie 4) |
| Ville | trajets domicile-travail, calcul CO₂ évité (indicatif), pas de charge d'entraînement par défaut si vitesse moyenne < 15 km/h |
| Électrique | niveau d'assistance par sortie, autonomie estimée `km_restants = batterie_% × autonomie_nominale × facteur_niveau`, charge physique × (1 − 0,25 par niveau d'assistance, plancher 0,4) |
| Home-trainer | 6.3.4 |

### 6.3.2 Puissance, FTP et courbes
- **Puissance normalisée** : moyenne mobile 30 s de la puissance, élevée à la puissance 4, moyenne, puis racine 4e : `NP = (moyenne(P30⁴))^(1/4)`.
- **Facteur d'intensité** `IF = NP / FTP` ; **TSS** `= (durée_s × NP × IF) / (FTP × 3600) × 100`. Exemple : 1 h à NP = FTP donne TSS = 100. Rapport d'effort : variabilité `VI = NP / puissance_moyenne`.
- **FTP** : tests proposés (20 min : `FTP = 0,95 × P20`; rampe : `FTP = 0,75 × puissance moyenne de la dernière minute complétée`) ; estimation automatique à partir de la courbe de puissance sur 90 jours (95 % de la meilleure P20 ou modèle de puissance critique) avec confirmation de l'utilisateur ; jamais de mise à jour silencieuse.
- **Zones de puissance** (% FTP) : Z1 < 55 ; Z2 56-75 ; Z3 76-90 ; Z4 91-105 ; Z5 106-120 ; Z6 121-150 ; Z7 > 150.
- **Courbe de puissance** (mean-maximal) : meilleure puissance moyenne pour des durées 1 s à 5 h, records personnels par durée, comparaison 30/90/365 jours. **Puissance critique** (modèle 2 paramètres) : `P(t) = CP + W'/t`, ajustement par moindres carrés sur les efforts de 3 à 20 min.
- Sans capteur de puissance : estimation depuis vitesse, pente, masse, CdA, Crr (modèle physique) étiquetée « estimée », jamais utilisée pour la FTP.
- Équation du modèle : `P = (Crr·m·g·cosθ + m·g·sinθ + ½·ρ·CdA·v²)·v / rendement_transmission` (rendement 0,975).

### 6.3.3 Sorties de groupe, drafting
Sortie de groupe : un organisateur crée une sortie (tracé, heure, allure cible, niveau, point de départ), les inscrits voient le **partage de position en direct** facultatif entre participants. Règles : mineurs encadrés uniquement ; vitesse affichée d'un groupe = moyenne ; alerte « un membre est resté à plus de 2 km de l'arrière » (sécurité, voir Partie 4). Le drafting est estimé par la différence entre puissance mesurée et puissance prédite ; il est un **indicateur** et jamais un classement.

### 6.3.4 Home-trainer (entraînement virtuel léger)
- **Connexion** [STACK_BLE] : FTMS (Fitness Machine Service) pour contrôle de résistance, Cycling Power Service, Heart Rate Service. Appairage guidé, mémorisation, reconnexion auto en 5 s, bandeau en cas de perte (la séance continue en mode estimé).
- **Mode ERG** : l'application envoie la puissance cible du bloc (`Set Target Power`) ; transitions en rampe de 5 s ; correction si cadence < 50 rpm (suspension 10 s) ; ajustement `± 5 %` par boutons pendant la séance.
- **Mode pente/simulation** : `Set Indoor Bike Simulation Parameters` (pente, vent, Crr, Cw).
- **Parcours virtuels simples** : tracés GPX réels convertis en profil de pente ; avatar 2D, vitesse virtuelle dérivée de la puissance via le modèle physique ci-dessus ; pas d'environnement multi-joueurs temps réel au lancement (extension prévue).
- Séances prédéfinies (modèles) : 3 x 12 min à 90 % FTP ; 5 x 5 min à 110 % ; rampe test ; endurance 90 min Z2. Export de la séance FIT/ZWO.
- Hors ligne complet, sauvegarde toutes les 10 s.

### 6.3.5 Entretien et composants
Voir 6.6. Alertes spécifiques : chaîne (voir 6.6.3), pneus (repère 4 000-6 000 km route, à régler par l'utilisateur), plaquettes (examen tous les 1 500 km ou 3 mois de pluie), câbles (annuel), révision générale (annuel ou 5 000 km). Chaque rappel est modifiable et il y a un historique de dates et de coûts.

### 6.3.6 Réglages de base (« fit basique »)
Assistant en 6 questions : taille, entrejambe, souplesse perçue, objectif, douleurs ; propose repères de hauteur de selle (`entrejambe × 0,883` du centre du boîtier à l'axe de selle, méthode indicative), recul, longueur de potence, pression de pneus selon poids et largeur. **Avertissement obligatoire** : repères indicatifs, voir un professionnel pour douleurs.

### 6.3.7 Cyclosportives et bikepacking
- Cyclosportive : fiche d'événement (6.5), stratégie : puissance cible sur les montées `= 0,85 à 0,95 × FTP` pour une durée > 1 h, jamais > 105 % ; ravitaillement 60-90 g glucides/h ; plan de pacing sur GPX.
- Bikepacking : itinérance sur plusieurs jours (étapes calculées selon vitesse moyenne chargée = vitesse habituelle × 0,8), points d'eau/ravitaillement/hébergement sur le tracé (voir Partie 4), poids des sacoches et liste de matériel, consommation batterie des appareils, mode ultra-économie, balise de sécurité partageable.

### 6.3.8 Critères d'acceptation 6.3
- Puissance constante de 200 W avec FTP 200 W pendant 1 h donne NP = 200, IF = 1,00, TSS = 100.
- Une perte de connexion FTMS en séance ERG n'interrompt pas l'enregistrement et affiche un bandeau.
- Une sortie e-bike avec assistance niveau 2 réduit la charge d'un facteur 0,5 selon la règle.

---

## 6.4 Randonnée et marche

### 6.4.1 Niveaux de pratique
| Niveau | Définition | Règles produit |
|---|---|---|
| Marche quotidienne | pas, trajets | objectif de pas par défaut 7 000 (réglable 3 000-15 000) ; marche active = cadence > 100 pas/min ; minutes actives hebdomadaires cible 150 |
| Marche nordique | bâtons, cadence | facteur de dépense × 1,2 (indicatif), technique en conseils |
| Balade | < 2 h, < 200 m D+ | fiche simple |
| Rando journée | 2 à 9 h | checklist, estimation de durée, météo |
| Itinérance / trek | plusieurs jours | étapes, hébergements, ravitaillement, GR |
| Haute montagne légère | > 2 500 m, neige/glace possibles | avertissements, prudence, matériel obligatoire |

### 6.4.2 Difficulté et cotations
Score interne de difficulté : `score = 0,5·(distance_km) + 1,0·(D+/100) + 2·(altitude_max > 2500) + 3·(passages exposés)`. Niveaux : < 6 facile ; 6-12 moyen ; 12-20 difficile ; > 20 très difficile. Cotations officielles : **échelle SAC** (T1 à T6, randonnée de montagne), **UIAA** (I à XII, escalade), balisage **GR/GRP/PR** (blanc-rouge, blanc-jaune), cotations locales (ex. vert/bleu/rouge/noir pour certaines randonnées). Règle : afficher la cotation de la source avec son nom et sa date, **jamais la convertir silencieusement**. T4 et plus : avertissement renforcé, recommandation de ne pas partir seul sans expérience.

### 6.4.3 Estimation de durée
Temps de marche (formule de Naismith modifiée) : `heures = distance_km / 5 + D+_m / 600`, avec facteur de l'utilisateur (calibré sur son historique, plage 0,6-1,6) ; en descente raide (> 15 %), ajouter 1 h par 500 m D− sur tracés techniques. **Pause** : +10 % de temps total. Exemple : 12 km et 900 m D+ = 2,4 + 1,5 = 3,9 h, avec pauses ≈ 4 h 17.

### 6.4.4 Conditions, matériel obligatoire, prudence
- Conditions : neige/glace, risque d'avalanche (lien vers bulletin officiel, voir Partie 4), météo montagne, heure de coucher du soleil ; pas de prévision d'avalanche produite par l'app.
- **Matériel obligatoire** par niveau : base (eau 1,5 L, eau/coupe-vent, trousse, téléphone chargé, carte hors ligne) ; montagne (lampe frontale, couverture de survie, vêtements chauds) ; neige/glace (crampons, piolet, casque : alerte si non coché). Le démarrage d'une rando affiche une **check-list** ; non bloquante sauf niveau haute montagne où l'app demande une confirmation explicite.
- Prudence : départ avant midi conseillé en montagne ; règle du demi-tour : si la marge de jour restante < 1 h pour le retour, alerte ; partage d'itinéraire avec un contact de sécurité (voir Partie 4).

### 6.4.5 Publics et accessibilité
- Enfants : durée conseillée = âge en ans × 30 min de marche effective (max 4 h), D+ ≤ 300 m < 8 ans, pauses toutes les 45 min, aucun passage exposé.
- Seniors : rythme confortable calibré ; recommandation de rando courte, bâtons, points d'eau.
- Accessibilité : filtre de tracés (pente max, largeur, surface, bancs, toilettes), compatible fauteuil/poussette (source : données OSM `wheelchair`, `smoothness`), mention de fiabilité des données.

### 6.4.6 Bivouac, bâtons, sac, altitude
- Bivouac : respect des réglementations locales ; l'app rappelle la règle locale quand elle est connue et invite à vérifier ; conseil « pas de feu, aucun déchet ».
- **Poids du sac** : conseil indicatif ≤ 10-15 % du poids du corps en rando journée, ≤ 20 % en trek ; calcul d'impact : charge supplémentaire de 10 % ajoute environ 5-8 % à la dépense énergétique.
- Altitude et acclimatation : à partir de 2 500 m, alerte de signes de mal des montagnes (maux de tête, nausées, fatigue inhabituelle) ; règle : dormir ≤ 500 m plus haut par jour au-delà de 3 000 m ; ne pas dépasser 1 000 m de gain de couchage par jour. Jamais de diagnostic ; si symptômes : descendre et demander de l'aide.
- Dépense énergétique : formule ACSM de marche `VO2 = 0,1·v + 1,8·v·pente + 3,5` (v en m/min, pente en fraction) → kcal/min `= VO2 × poids_kg / 1000 × 5`.

### 6.4.7 Critères d'acceptation 6.4
- Une rando 12 km / 900 m D+ affiche une estimation de ~ 4 h 17 pour un facteur 1,00.
- Un tracé coté T4 déclenche l'avertissement renforcé avant démarrage.
- Le filtre accessibilité exclut les tracés dont la pente max dépasse la valeur choisie.

---

## 6.5 Événements et compétitions

### 6.5.1 Découverte et fiches
Catalogue d'événements (courses, cyclosportives, treks, randonnées organisées) issu de partenaires et de saisies utilisateur modérées. Fiche : nom, discipline, date, lieu, distances, D+, parcours GPX, **barrières horaires**, prix, lien d'inscription externe, matériel obligatoire, ravitaillements, limite de places, statut. Recherche par distance, rayon, date, discipline, niveau, difficulté. Les inscriptions se font **sur le site de l'organisateur** (lien externe), l'app ne traite aucun paiement. Parkrun et courses officielles : lien et import du tracé, résultat saisi ou importé, **sans** revendiquer d'affiliation officielle.

### 6.5.2 Plan lié et résultats
Ajouter un événement à « mes objectifs » : génère un plan jour par jour (6.2.7 pour course ; équivalent vélo : affûtage 5-7 jours ; rando : montée en volume de D+). Après l'événement : saisie du temps officiel, classement général/catégorie (facultatif), **comparaison avec l'estimation de la montre**, PB, rapport de course. Classements personnels : liste de performances par distance/année, records par édition. Un résultat saisi à la main est marqué « non vérifié ».

### 6.5.3 Logistique jour J
Check-list modifiable (dossard, épingles, chaussures testées, nutrition, vêtement météo, sac de change, carte hors ligne, montre chargée) ; trajets (lien itinéraire, temps de départ conseillé : arrivée 90 min avant), hébergement (liens, saisie manuelle), récupération du dossard (horaires), météo prévue (voir 6.8), rappel J-7/J-2/J-1/H-3. Souvenirs : album, carte de la course, médaille virtuelle, partage (voir Partie 7).

### 6.5.4 Critères d'acceptation 6.5
- Ajouter un semi dans 12 semaines génère un plan daté de 12 semaines avec affûtage.
- Un lien d'inscription externe s'ouvre dans le navigateur sans transmettre de données personnelles.
- Un résultat saisi manuellement porte la mention « non vérifié ».

---

## 6.6 Matériel

### 6.6.1 Inventaire
Types : chaussures (route, trail, piste, rando), vélos (par type), composants, sacs, vêtements techniques, capteurs. Champ `equipment { id, user_id, type, name, brand?, model?, purchase_date, initial_km, retire_km_threshold, status:'active'|'retired', specs{}, notes }`. Gratuit : 3 équipements actifs ; Sports : illimité.

### 6.6.2 Kilométrage et cycle de vie
- Affectation d'un équipement à chaque activité : défaut = dernier équipement utilisé pour la discipline ; modifiable ; une activité peut affecter des composants multiples (vélo et ses composants montés).
- `km_total = initial_km + Σ distance des activités affectées`. Réaffectation rétroactive recalcule les totaux (job asynchrone).
- Cycle de vie : `neuf -> actif -> proche de la limite (≥ 85 %) -> à remplacer (≥ 100 %) -> retiré`. Retrait = archivage en conservant l'historique.
- Aucune revente dans l'app (hors périmètre). Aucune suggestion de marque sponsorisée.

### 6.6.3 Alertes et rappels d'entretien
| Élément | Déclencheur par défaut | Notes |
|---|---|---|
| Chaussures | 600 km (douce), 800 km (forte) | ajustable par modèle |
| Chaîne vélo | 2 000 km route (1 000 km boue) | mesure d'usure manuelle (0,5 % : à changer) |
| Pneus | 4 000 km | alerte supplémentaire après crevaison répétée |
| Plaquettes | 1 500 km ou 3 mois pluie | |
| Révision | 12 mois ou 5 000 km | |
| Sac / bâtons | contrôle annuel | |
Rappel : 1 notification à 85 %, 1 à 100 %, snooze 7 jours, **jamais plus de 1 rappel par jour tous équipements confondus**. Historique d'entretien : date, action, coût, kilométrage.

### 6.6.4 Critères d'acceptation 6.6
- Une chaussure à 598 km reçoit une activité de 5 km : alerte douce 600 km émise une seule fois.
- Réaffecter une sortie de 40 km d'un vélo à un autre met à jour les deux totaux.
- Le 4e équipement d'un compte Gratuit est refusé côté serveur (`402`/`403 quota_exceeded`).

---

## 6.7 Entraînement croisé et renforcement spécifique

L'entraînement croisé est proposé par le coach (voir Partie 5) pour réduire le risque de blessure et améliorer la performance. Le renforcement musculaire est exécuté dans l'app Fit (voir Partie 7 pour l'intégration) ; cette partie ne définit que les **prescriptions** et les liens.

| Discipline | Renforcement prioritaire | Fréquence | Entraînement croisé conseillé |
|---|---|---|---|
| Course | fessiers, mollets, gainage, fentes, montées de marches, travail du pied | 2 x/sem. 20-30 min | vélo, natation, aquajogging (en cas de blessure) |
| Trail | quadriceps excentriques (descentes), proprioception, haut du corps léger (bâtons) | 2 x/sem. | randonnée avec dénivelé, escaliers |
| Vélo | gainage, hanches, tirage, squats | 1-2 x/sem., hors veille de séance clé | course douce, natation |
| Rando | fentes, step-ups chargés, mollets, tronc | 1-2 x/sem. | course légère, vélo |
Règles : pas de séance de renforcement lourde dans les 24 h avant une séance qualité ; en période d'affûtage, volume −50 % mais intensité maintenue ; la charge de la séance Fit est ajoutée à la charge globale (voir Partie 5). Un utilisateur sans l'app Fit reçoit une séance de renforcement au poids du corps de 4 exercices (squat, fente, planche, pont fessier) en texte et illustration ; l'accès aux programmes complets est un renvoi vers [NOM_APP_FIT] (voir Partie 7).

Échauffements par discipline (3 modèles intégrés, 8-10 min) : course (marche 2 min, trot 3 min, gammes : talons-fesses, montées de genoux, 2 lignes droites) ; vélo (10 min de progression 50 → 75 % FTP avec 2 x 15 s à cadence haute) ; rando (5 min de marche lente, mobilité chevilles/hanches).

### 6.7.1 Critères d'acceptation 6.7
- Une séance de renforcement lourd planifiée la veille d'une séance de fractionné est déplacée en suggestion ou signalée par le coach.
- La charge d'une séance Fit synchronisée apparaît dans le tableau de charge global.

---

## 6.8 Spécificités saisonnières et météo par discipline

Données [STACK_METEO] : température ressentie, pluie, vent (vitesse et direction), humidité, indice UV, qualité de l'air, neige/gel. Chaque séance planifiée est réévaluée à J-1 et H-3.

| Condition | Règle d'adaptation |
|---|---|
| Chaleur (température ressentie > 25 °C) | course : allure cible augmentée de **1,5 % par tranche de 2 °C au-delà de 15 °C** (borne : 12 %) ; recommander tôt le matin, eau 500 ml/h minimum ; > 32 °C : proposer déplacer ou réduire de 30 % ; > 35 °C ou indice de chaleur dangereux : proposer de remplacer par du tapis/home-trainer |
| Froid | < 0 °C : échauffement allongé de 5 min, vêtements en couches, avertissement verglas (suggérer route dégagée ou salle) ; < −10 °C ressentis : réduire durée de 30 % |
| Pluie | vélo : pression de pneus −10 %, freinage prolongé, alerte visibilité ; course : avertissement surfaces glissantes ; rando : sentiers argileux plus lents (+15 % de temps) |
| Vent | vélo : vent de face > 30 km/h : cible de puissance, pas de vitesse ; plan de boucle avec vent de face à l'aller ; course : effort constant plutôt qu'allure fixe |
| Neige/glace | course : proposer tapis ou marche ; vélo : home-trainer ; rando : matériel obligatoire (6.4.4) et durée augmentée de 25-50 % |
| Orage | arrêt de séance recommandé, abri, message de sécurité (voir Partie 4) |
| Qualité de l'air dégradée (indice > seuil local) | proposer séance en intérieur |
| Nuit/crépuscule | alerte visibilité, lampe, tenues réfléchissantes |
Règles de produit : toute adaptation est une **proposition** que l'utilisateur accepte ou refuse ; l'adaptation est tracée (`adjustment_log`) ; la séance reportée ne se cumule pas (pas de rattrapage de plus de 50 % du volume manqué). Acclimatation à la chaleur : les 10-14 premiers jours, volume réduit de 20 %.

### 6.8.1 Critères d'acceptation 6.8
- Séance d'allure 5:00/km prévue à 31 °C : cible suggérée 5:00 × (1 + 0,015 × 8) = 5:06/km.
- Prévision d'orage pendant une sortie vélo : notification à H-3 avec option de report.
- Un refus de la proposition conserve la séance d'origine et n'affiche plus le même avertissement pour cette séance.

---

## 6.9 Modèle de données et API de cette partie

### 6.9.1 Tables
```
discipline_definition (id PK, version, family, parent_id FK null, config jsonb, status, created_at)  -- UNIQUE(id,version)
session_template (id, discipline_id, name, level, blocks jsonb, owner_id null, is_public)   -- INDEX(discipline_id, level)
equipment (id, user_id FK, type, discipline_id, name, brand, model, purchase_date, initial_km, retire_km_threshold, status, specs jsonb)  -- INDEX(user_id,status)
equipment_assignment (id, activity_id FK, equipment_id FK, created_at)  -- UNIQUE(activity_id,equipment_id); INDEX(equipment_id)
maintenance_task (id, equipment_id FK, kind, due_km, due_date, snoozed_until, done_at, cost_cents, notes)  -- INDEX(equipment_id,done_at)
event_catalog (id, discipline_id, name, date, geo point, city, distances jsonb, elevation_gain, gpx_asset_id, cutoffs jsonb, registration_url, mandatory_gear jsonb, status)  -- GiST(geo), INDEX(date,discipline_id)
user_event (id, user_id, event_id, goal, bib, status:'planned'|'done'|'dns'|'dnf', plan_id null)  -- UNIQUE(user_id,event_id)
event_result (id, user_event_id, official_time_s, rank_overall, rank_category, source:'manual'|'import', verified bool)
power_curve_cache (user_id, window_days, duration_s, best_watts, activity_id)  -- PK(user_id,window_days,duration_s)
performance_prediction (id, user_id, source_activity_id, target_distance_m, predicted_s, low_s, high_s, model, exponent, created_at)
adjustment_log (id, user_id, planned_session_id, reason, original jsonb, proposed jsonb, accepted bool null, created_at)
```
Contraintes : toutes les tables utilisateur portent `user_id` et sont filtrées côté serveur par le jeton ; suppression de compte = effacement en cascade (voir Partie 2 et Partie 8).

### 6.9.2 API
| Méthode et chemin | Rôle | Droit |
|---|---|---|
| `GET /disciplines` | liste des configurations actives | Gratuit |
| `GET /disciplines/{id}?version=` | une configuration | Gratuit |
| `GET /session-templates?discipline=&level=` | modèles de séances | Gratuit (liste limitée), Sports (complet) |
| `POST /predictions` | prédiction de temps (Riegel/VDOT) | Sports |
| `GET /activities/{id}/power-analysis` | NP, IF, TSS, VI, courbes | Sports |
| `GET /users/me/power-curve?days=90` | courbe de puissance | Sports |
| `POST /ftp/estimate` | estimation (confirmation requise) | Sports |
| `POST /equipment` ; `GET /equipment` ; `PATCH /equipment/{id}` | inventaire | quota Gratuit : 3 |
| `POST /activities/{id}/equipment` | affecter un équipement | Gratuit |
| `GET /equipment/{id}/maintenance` ; `POST` | entretien | Gratuit/Sports |
| `GET /events?discipline=&near=&radius=&from=` | catalogue | Gratuit |
| `POST /me/events` | ajouter un objectif et générer un plan | Gratuit (1 actif), Sports (illimité) |
| `POST /me/events/{id}/result` | saisir un résultat | Gratuit |
| `POST /trail/{eventId}/eta` | ETA et marges de cut-off | Sports |
| `POST /weather/adjust` | proposition d'adaptation de séance | Gratuit (alertes), Sports (adaptation chiffrée) |

Exemple :
```json
POST /predictions
{ "source_activity_id":"a_123", "target_distance_m":21097.5 }
→ 200 { "predicted_s":6686, "low_s":6485, "high_s":6887, "model":"riegel", "exponent":1.06, "source_date":"2026-09-12", "expires_at":"2026-11-07" }
POST /trail/ev_9/eta { "planned_pace_s_per_km":420, "start":"2026-10-17T06:00:00Z" }
→ 200 { "checkpoints":[{"name":"Col Rouge","km":18.4,"eta":"2026-10-17T09:41:00Z","cutoff":"2026-10-17T10:00:00Z","margin_min":19,"level":"orange"}] }
```
Erreurs standard : `401`, `403 plan_required` (avec `required_plan`), `404`, `409 conflict`, `422 validation_failed`.

---

## 6.10 Tests et critères d'acceptation

### 6.10.1 Scénarios de bout en bout
1. **Préparation d'un semi-marathon** : créer l'objectif, accepter le plan 12 semaines, enregistrer 3 sorties, obtenir une prédiction, subir une alerte chaleur, reprogrammer une séance, saisir le résultat final.
2. **Trail avec cut-offs** : importer le GPX, calculer l'ETA, simuler une marge de 8 min, vérifier l'alerte rouge hors ligne.
3. **Sortie vélo avec capteur de puissance** : calculer NP/IF/TSS, détecter un record sur 20 min, proposer la mise à jour FTP avec confirmation.
4. **Randonnée itinérante de 3 jours** : étapes, hors ligne, check-list, partage de sécurité.

### 6.10.2 Cas limites
Activité à 0 m D+ (tapis), GPS perdu 10 min dans un tunnel, FC aberrante (> 230 bpm : ignorée), puissance à 0 en roue libre (comptée dans la moyenne mobile, pas dans la puissance moyenne en mouvement selon réglage), changement d'heure (DST) pendant une sortie, équipement supprimé après affectation, événement annulé par l'organisateur.

### 6.10.3 Critères d'acceptation numérotés
1. Une configuration de discipline invalide est refusée avec un message précis.
2. Une activité ancienne conserve sa `discipline_version`.
3. Ajouter une nouvelle discipline par JSON ne nécessite aucune modification de code d'écran.
4. Les zones d'allure se calculent depuis l'allure seuil (Z4 = 0,99-1,05 × Ts).
5. Le VDOT calculé pour 5 km en 20:00 est ≈ 49,8 (tolérance ± 0,3).
6. Riegel 10 km en 50:00 → semi 1:51:26 (± 1 s).
7. Aucune prédiction marathon n'est produite à partir d'une course < 3 km.
8. Une prédiction de plus de 8 semaines est marquée « périmée ».
9. Un fractionné 8 x 400 émet 8 alertes de départ et 8 de récupération.
10. Une FC hors zone cible > 20 s déclenche une alerte.
11. L'allure sur piste est calculée depuis les tours, pas depuis le GPS.
12. Une activité sur tapis applique le facteur de calibration mémorisé.
13. Le km-effort de 45 km et 2 800 m D+ vaut 73.
14. Une marge de cut-off < 30 min déclenche une alerte orange, < 10 min une rouge, y compris sans réseau.
15. Sortir du tracé GPX de plus de 30 m déclenche l'alerte hors-parcours.
16. Le D+ est corrigé par MNT si l'écart baromètre/MNT > 10 %.
17. NP = FTP pendant 1 h → TSS = 100.
18. Aucune mise à jour de FTP n'est appliquée sans confirmation.
19. Une estimation de puissance sans capteur est étiquetée « estimée » et exclue de la FTP.
20. Une perte FTMS n'interrompt pas l'enregistrement.
21. En ERG, la cible change en rampe de 5 s à chaque bloc.
22. L'assistance e-bike niveau 2 réduit la charge selon le facteur défini.
23. Une chaîne à 2 000 km déclenche son rappel une seule fois puis respecte le snooze.
24. Pas plus d'un rappel d'entretien par jour toutes catégories confondues.
25. Le 4e équipement d'un compte Gratuit est refusé côté serveur.
26. Réaffecter une activité met à jour les kilométrages des deux équipements.
27. Aucune recommandation de matériel n'est sponsorisée ni classée par annonceur.
28. Rando 12 km / 900 m D+ → ≈ 4 h 17 avec pauses.
29. La cotation affichée garde sa source et sa date, sans conversion silencieuse.
30. T4 et plus : avertissement renforcé avant démarrage.
31. Le filtre accessibilité respecte la pente maximale choisie.
32. Une alerte de demi-tour s'affiche si la marge de jour est < 1 h pour le retour.
33. Altitude ≥ 2 500 m : avertissement de mal des montagnes, sans diagnostic.
34. Un objectif d'événement génère un plan daté avec affûtage.
35. Un lien d'inscription s'ouvre en externe sans transmettre de données personnelles.
36. Un résultat manuel est marqué « non vérifié ».
37. 5:00/km à 31 °C → cible suggérée 5:06/km.
38. Une adaptation météo est une proposition ; son refus conserve la séance.
39. Une séance de renforcement lourd la veille d'une séance qualité est signalée.
40. La charge d'une séance Fit synchronisée apparaît dans la charge globale.
41. Les droits (quota, prédictions, courbes) sont vérifiés côté serveur même si l'UI est contournée.
42. Un utilisateur Gratuit voit le paywall (et non une erreur) sur `/predictions`.
43. La suppression d'un compte efface équipements, résultats et prédictions.
44. Les activités enregistrées hors ligne se synchronisent sans duplication (voir Partie 3).
45. Toute chaîne visible est présente en français dans les fichiers i18n.

### 6.10.4 Définition de terminé
Tests unitaires verts (formules avec exemples ci-dessus), tests d'intégration des endpoints, lint/typecheck verts, revue d'accessibilité (voir Partie 8), résumé des risques, commits petits et clairs.
