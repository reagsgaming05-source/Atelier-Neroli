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
