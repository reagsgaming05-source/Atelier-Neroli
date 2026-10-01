# PARTIE 5 — Charge d'entraînement, santé, récupération, coach adaptatif et IA

> Cette partie est le cœur du différenciateur de [NOM_APP_SPORTS] : un coach unique qui adapte entraînement, récupération et nutrition à TOUTE la vie sportive (endurance, sports d'équipe et de duel, musculation venant de [NOM_APP_FIT]). Principe d'architecture impératif : le **moteur de règles déterministe** (module `training-load` + `planning-coach`, domaine pur, sans réseau) est la **source de vérité** des plans, des charges et de la sécurité. Un LLM sert uniquement à expliquer, reformuler et converser (5.9). Aucun chiffre de charge, de zone ou de plan ne doit jamais être produit par le LLM. Droits d'accès par abonnement : voir Partie 2 ; données d'activité : voir Partie 3 ; cartes et sécurité de sortie : voir Partie 4 ; sports d'équipe : voir Partie 6 ; échanges avec Fit et social : voir Partie 7 ; conformité et qualité transverses : voir Partie 8.

## 5.1 Moteur de charge d'entraînement

### 5.1.1 Hiérarchie des sources
Pour chaque séance, calcule une **charge** `L` (unité : points « TSS-équivalents », notée `pTSS`, 100 pTSS = 1 h à l'allure/puissance seuil). Choisis la méthode de la meilleure source disponible, dans cet ordre :

1. **Puissance** (vélo avec capteur, ou course avec capteur de puissance) : TSS.
2. **Fréquence cardiaque** (FC fiable : ceinture, ou optique avec qualité ≥ 80 % des échantillons valides) : hrTSS via TRIMP exponentiel.
3. **Allure ajustée à la pente** (GAP) pour course/marche/rando avec GPS : rTSS.
4. **RPE × durée** (saisie manuelle ou de secours) : sRPE converti.

Stocke toujours `load_method` (`power|hr|pace|rpe|manual`), `load_confidence` (0-1) et les paramètres utilisés (FTP, FCmax, seuil...) dans l'enregistrement de charge pour permettre un **recalcul rétroactif** quand le profil change (5.2). Confiances par défaut : puissance 0,95 ; FC 0,85 ; allure 0,75 ; RPE 0,60 ; manuel 0,50.

### 5.1.2 Formules
**Vélo, puissance** :
- Puissance normalisée : lisser la puissance par moyenne glissante de 30 s, élever chaque valeur à la puissance 4, moyenner, puis racine 4e : `NP = (mean(P30^4))^(1/4)`.
- `IF = NP / FTP` ; `TSS = (durée_s × NP × IF) / (FTP × 3600) × 100`.
- Exemple : 90 min, NP 210 W, FTP 250 W → IF = 0,84 ; TSS = (5400 × 210 × 0,84)/(250 × 3600) × 100 = 105,8.
- Si durée < 20 min ou pauses > 25 % : calcule sur le temps en mouvement et marque `confidence −0,1`.

**FC, TRIMP exponentiel de Banister (méthode par défaut)** :
- Réserve de FC : `HRR = (FC_moy_segment − FCrepos) / (FCmax − FCrepos)`, bornée [0 ; 1].
- Pour chaque minute (ou segment de 1 min) : `TRIMP_min = HRR × a × e^(b × HRR)` avec `a = 0,64, b = 1,92` (hommes), `a = 0,86, b = 1,67` (femmes) ; si sexe non renseigné, utiliser la moyenne (a = 0,75 ; b = 1,80).
- `TRIMP = somme des TRIMP_min`. Normalisation : `hrTSS = 100 × TRIMP / TRIMP_1h_seuil`, où `TRIMP_1h_seuil` est le TRIMP d'une heure à la FC du seuil lactique (HRR_seuil ≈ 0,85 par défaut ; calcule-le avec le profil).
- Alternative **Edwards** (affichage avancé, non utilisée pour la charge) : temps en zone Z1..Z5 × coefficient 1..5.

**Course, rTSS avec allure ajustée à la pente** :
- Coût énergétique de la pente (Minetti) : `Cr(g) = 155,4g^5 − 30,4g^4 − 43,3g^3 + 46,3g^2 + 19,5g + 3,6` (J/kg/m, g = pente en fraction, bornée [−0,45 ; +0,45]). `vitesse_ajustée = vitesse × Cr(g)/3,6`.
- `IF_course = vitesse_ajustée_normalisée / vitesse_seuil` (normalisation par moyenne glissante 30 s puis puissance 4 comme NP) ; `rTSS = durée_h × IF_course² × 100`.
- Exemple : 60 min, vitesse ajustée normalisée 12,0 km/h, seuil 13,3 km/h → IF 0,90 ; rTSS = 1 × 0,81 × 100 = 81.

**Marche et randonnée** (faible intensité, effort dominé par durée, dénivelé et charge portée) :
- `L_marche = durée_h × 100 × IF_m²`, avec :
  `IF_m = 0,30 + 0,0006 × (D+_m/durée_h) + 1,2 × (sac_kg / poids_kg) + 0,10 × max(0, vitesse_kmh − 4,5)`, bornée [0,25 ; 0,75].
- Exemple : 5 h, 800 m D+ (160 m/h), sac 8 kg, poids 70 kg, 4 km/h → IF_m = 0,30 + 0,096 + 0,137 + 0 = 0,533 ; L = 5 × 100 × 0,284 = 142 pTSS.
- Si la FC est disponible, prends `max(L_marche, hrTSS)` plafonné à `1,3 × L_marche` (la FC dérive à la chaleur).

**RPE × durée** (Foster) : `sRPE = RPE_CR10 × durée_min` (unités arbitraires). Conversion en pTSS : `L = sRPE × k_sport`, avec `k` calibré par l'utilisateur dès qu'il possède ≥ 8 séances ayant à la fois un sRPE et une charge mesurée (régression linéaire sans intercept, k borné [0,25 ; 0,60] ; défaut `k = 0,30` : RPE 5 × 60 min = 300 → 90 pTSS).

### 5.1.3 Normalisation inter-sports et charge neuromusculaire
Toutes les charges sont exprimées en pTSS sur la même échelle. Chaque séance porte deux composantes :
- `L_cardio` (pTSS ci-dessus) ;
- `L_neuro` (charge musculo-squelettique/impacts), en pTSS-équivalents : coefficient d'impact par sport `c_imp` : vélo 0,3 ; natation 0,2 ; marche 0,5 ; rando 0,7 (descentes) ; course route 1,0 ; trail 1,1 ; foot/basket/tennis voir 5.1.4 ; muscu voir 5.1.5. `L_neuro = L_cardio × c_imp + L_excentrique`, avec `L_excentrique = 0,02 × D−_m` pour rando/trail.

Le total « systémique » (ATL/CTL) utilise `L_cardio`. Le total « mécanique » (ATL_m/CTL_m) utilise `L_neuro`. Les deux sont affichés en vue avancée ; le ratio de risque (5.1.6) utilise `max` des deux ratios.

### 5.1.4 Sports d'équipe et de duel (interface avec Partie 6)
Hiérarchie : FC (hrTSS) si disponible ; sinon `sRPE` (RPE de session demandé dans les 30 min, rappel à +4 h). Spécificités :
- Durée = **temps de jeu réel + 50 % du temps de banc/repos actif** (saisie ou estimation de la Partie 6).
- Intensité estimée si pas de FC : RPE par défaut selon sport/rôle (foot 6, basket 6, tennis simple 6, tennis double 4, padel 5, badminton 5), modifiable.
- `L_neuro = L_cardio × c_imp` avec foot 1,3 ; basket 1,4 ; tennis 1,0 ; rugby 1,6 ; plus `+ 0,5 × nb_sprints_>20km/h` et `+ 0,2 × nb_accélérations_fortes` si capteur GPS disponible.
- Un match compte ×1,10 (stress psychologique/compétition) sur `L_cardio`.

### 5.1.5 Musculation (venant de [NOM_APP_FIT], contrat : voir Partie 7)
Reçois de Fit : séries, répétitions, charge, RPE ou RIR par série, durée. Calcule :
- `sRPE_muscu = RPE_séance × durée_min` avec `RPE_séance = moyenne pondérée par séries des RPE (RPE = 10 − RIR)` ;
- `L_cardio = sRPE × 0,16` (la muscu pèse peu sur le système cardiovasculaire) ; `L_neuro = sRPE × 0,35 × m_groupes`, avec `m_groupes` = 1,2 si séance jambes dominante, 1,0 haut du corps, 0,8 isolation. Charge de **jambes** stockée séparément pour la règle « pas de séance de qualité course/vélo dans les 36 h après jambes lourdes » (5.5).

### 5.1.6 ATL / CTL / TSB, ratio aigu/chronique
Moyennes mobiles exponentielles quotidiennes sur la charge du jour `L_j` (somme des séances) :
- `CTL_j = CTL_{j−1} + (L_j − CTL_{j−1}) × (1 − e^(−1/42))` (forme physique, τ = 42 j) ;
- `ATL_j = ATL_{j−1} + (L_j − ATL_{j−1}) × (1 − e^(−1/7))` (fatigue, τ = 7 j) ;
- `TSB_j = CTL_{j−1} − ATL_{j−1}` (fraîcheur du matin).
- **ACWR EWMA** : `ACWR = ATL / CTL` (si CTL ≥ 15, sinon non affiché).

| Zone | Condition | Signification | Action du moteur |
|---|---|---|---|
| Sous-charge | ACWR < 0,8 | désentraînement possible | proposer d'augmenter prudemment |
| Optimale | 0,8 ≤ ACWR ≤ 1,3 | progression saine | maintenir |
| Vigilance | 1,3 < ACWR ≤ 1,5 | risque accru | plafonner la semaine suivante |
| Danger | ACWR > 1,5 | pic de charge | alléger obligatoirement la prochaine séance clé |

TSB indicatif : > +15 très frais/perte de forme ; +5 à +15 prêt à performer ; −10 à +5 neutre ; −30 à −10 charge productive ; < −30 risque.

### 5.1.7 Indicateur grand public (3 états)
Affiche un seul badge : **Vert « Tu peux charger »** (ACWR 0,8–1,3 et TSB > −20 et disponibilité ≥ 70), **Orange « Reste raisonnable »** (ACWR 1,3–1,5 ou TSB −20 à −30 ou disponibilité 50–69), **Rouge « Récupère »** (ACWR > 1,5 ou TSB < −30 ou disponibilité < 50 ou signal d'alerte 5.3.8). Le pire des trois critères l'emporte. Un tap ouvre le détail (courbes CTL/ATL/TSB, explication en une phrase).

### 5.1.8 Données manquantes, démarrage à froid, pauses, transitions, corrections
- **Séance sans aucune donnée** (ex. match sans capteur) : demande le RPE ; sans réponse sous 48 h, impute `RPE par défaut du sport × durée`, `confidence 0,4`, drapeau `imputed`.
- **Démarrage à froid** : sans historique, initialise `CTL₀ = ATL₀ = ` charge hebdomadaire moyenne déclarée à l'onboarding /7 (ex. « je cours 2×30 min » ≈ 2×45/7 = 13). Pendant 28 jours, affiche « calibrage en cours » et n'émets AUCUN état rouge basé sur ACWR (uniquement basé sur disponibilité/douleurs). Importe jusqu'à 90 jours d'historique depuis Health Connect/HealthKit/Strava si autorisé (Partie 3) et recalcule.
- **Longue pause** : charges = 0 les jours sans séance (la décroissance est naturelle). Si pause > 14 jours, pas de rattrapage : le moteur reprend à `CTL_reprise` et impose un plan de reprise (5.7.6). Pause > 42 jours : recalibrer les zones par un test (5.2.4).
- **Transition de source** (ex. passage d'une montre FC à un capteur de puissance) : garde les deux calculs 14 jours en parallèle, calcule le ratio médian `r = L_nouvelle / L_ancienne` et, si 0,8 ≤ r ≤ 1,25, ne corrige rien ; sinon recale `FTP`/seuils et recalcule l'historique des 42 derniers jours en marquant `recomputed_at`.
- **Corrections manuelles** : l'utilisateur peut modifier durée, RPE, type, ou exclure une séance (ex. FC aberrante). Toute correction déclenche un recalcul incrémental de CTL/ATL depuis la date concernée (idempotent, < 200 ms pour 2 ans) et est journalisée (`audit_log`). Rejette FC > FCmax + 10 bpm sur > 20 % des échantillons : bascule automatiquement sur allure/RPE.

## 5.2 Profil physiologique et zones

### 5.2.1 Paramètres et estimation
| Paramètre | Estimation initiale | Mise à jour |
|---|---|---|
| FCmax | `208 − 0,7 × âge` (Tanaka) ; affiche marge ± 10 bpm | max observé sur effort ≥ 3 min à RPE ≥ 9 avec ceinture ; ignorer pics isolés (> 2 bpm au-dessus du 99e percentile glissant 6 mois) |
| FCrepos | médiane des 7 dernières mesures matinales ou nocturnes | glissant 14 j ; baseline sur 60 j |
| Seuil lactique (FCS) | 0,88 × FCmax (avancé) ; 0,85 (débutant) | test 20 min ×0,95, ou détection (5.2.5) |
| FTP | débutant sans donnée : `2,0 W/kg` (H) / `1,7 W/kg` (F) estimation grossière ; sinon 0,95 × meilleure puissance 20 min | test 20 min ou rampe ; détection auto |
| Seuil de course (vitesse) | vitesse critique ou 95 % de la vitesse moyenne sur 30 min d'effort maximal | test, détection |
| VO2max estimée | voir ci-dessous | recalcul mensuel |

**VO2max** (afficher toujours « ≈ X ± e ») :
1. Formule Uth : `VO2max = 15,3 × FCmax/FCrepos` (± 4 ml/kg/min), repli sans effort.
2. Course (Daniels) : à partir d'une performance de 5 à 30 min en effort maximal, `VO2 = −4,60 + 0,182258 v + 0,000104 v²` (v en m/min) divisé par `%VO2max(t) = 0,8 + 0,1894393 e^(−0,012778 t) + 0,2989558 e^(−0,1932605 t)` (t en min). Erreur affichée ± 3.
3. Efforts sous-maximaux avec FC : `VO2_effort = f(vitesse)` / `HRR`, extrapolation à HRR = 1, erreur ± 5, confiance faible si < 5 séances.
4. Marche : test de Rockport `VO2 = 132,853 − 0,0769 P − 0,3877 âge + 6,315 S − 3,2649 T − 0,1565 FC` (P poids en lb, S = 1 homme/0 femme, T temps pour 1 mile en min) ; erreur ± 5.
5. Vélo : `VO2 = 10,8 × W_rampe_max / poids + 7`, erreur ± 4.
Fusion : moyenne pondérée par confiance inverse de la variance ; affiche l'intervalle, jamais une valeur « précise ». Mise à jour limitée à ±3 % par semaine (lissage).

### 5.2.2 Zones (5 à 7 niveaux)
| Méthode | Z1 | Z2 | Z3 | Z4 | Z5 | (Z6 / Z7) |
|---|---|---|---|---|---|---|
| FC % FCmax (5 zones, défaut) | 50–60 | 60–70 | 70–80 | 80–90 | 90–100 | — |
| FC % FCS (Friel, 5 zones) | < 85 | 85–89 | 90–94 | 95–99 | 100–106 | — |
| Puissance % FTP (Coggan, 7 zones) | < 55 | 56–75 | 76–90 | 91–105 | 106–120 | 121–150 / > 150 |
| Course % vitesse seuil (6 zones) | < 78 | 78–88 | 88–95 | 95–102 | 102–110 | 110+ |
| RPE (CR10) | 1–2 | 3–4 | 5 | 6–7 | 8–10 | — |

Mode « 3 zones » (facile / modéré / dur) disponible pour les débutants (correspond à Z1-2 / Z3 / Z4-5). Les zones sont recalculées à chaque modification de seuil, versionnées (`zones_version`) et les anciennes séances conservent leurs zones d'époque.

### 5.2.3 Tests guidés
Chaque test est un écran pas à pas (échauffement, consignes vocales, minuteur, résumé), proposé seulement si disponibilité ≥ 70 et pas de douleur déclarée.
- **Test 20 min (vélo/course)** : 20 min d'échauffement, 3×1 min vite, 5 min facile, 20 min effort maximal régulier. FTP = 0,95 × puissance moyenne ; seuil FC = 0,95 × FC moyenne des 20 min ; seuil course = 0,95 × vitesse moyenne.
- **Cooper (12 min course)** : distance d (m). `VO2max = (d − 504,9)/44,73`. Estimation seuil : vitesse 12 min × 0,92.
- **Marche 6 min** : distance parcourue sur 6 min ; niveaux repères : < 400 m faible, 400–500 moyen, 500–600 bon, > 600 très bon (adulte en bonne santé). Si essoufflement anormal ou douleur : arrêt, message de prudence (5.3.10).
- **Rampe vélo** : démarrage 100 W, +20 W/min jusqu'à épuisement ; `FTP = 0,75 × W_max_minute` ; VO2max selon formule vélo.
- **Test sous-maximal marche/Rockport** pour les non-sportifs.

### 5.2.4 Détection automatique de nouveaux seuils
Détecte : (a) un effort ≥ 20 min dont la puissance moyenne ×0,95 dépasse FTP de ≥ 3 % ; (b) une FCmax observée > FCmax actuelle + 3 bpm sur ceinture ; (c) une allure de 5 km/10 km avec VDOT implicite > VDOT actuel de ≥ 1 point ; (d) 3 séances Z2 consécutives où FC baisse de ≥ 4 bpm à allure identique (progrès aérobie). Ne modifie JAMAIS un seuil sans validation : notification « Nouveau seuil détecté : FTP 250 → 258 W. Appliquer ? [Oui] [Non] [Plus tard] » avec explication et effet (zones, recalcul de charge). Un refus bloque la même détection 21 jours. Limite : max 1 changement de seuil validé/14 jours par paramètre ; baisse de seuil proposée uniquement après 28 jours sans effort supérieur.

### 5.2.5 Prédictions de temps
- **Riegel** : `T2 = T1 × (D2/D1)^1,06` (exposant 1,10 pour débutants, 1,05 pour très entraînés ; pour D2/D1 > 4, majorer de 0,02).
- **VDOT (Daniels)** : VDOT = VO2 effectif ci-dessus ; temps cibles par distance calculés en inversant la formule ; allures d'entraînement : facile 59–74 % VO2max, marathon ≈ 80–83 %, seuil 86–88 %, intervalle 98–100 %, répétition > 105 %.
- Trail : ajoute ``temps_trail = temps_plat_equivalent(GAP)`, + 10 % si technique.
- Vélo : modèle puissance/vitesse (traînée CdA 0,32 m², Crr 0,005, masse totale, pente, vent) pour estimer le temps d'un parcours à X % FTP.
- Toujours afficher une fourchette (± 3 % court, ± 6 % marathon, ± 10 % trail) et la condition (« sans chaleur ni blessure »).

### 5.2.6 Âge physiologique et meilleurs efforts
- **Âge physiologique** (indicatif, bien-être) : `âge_phys = âge − (VO2max − VO2_médiane(âge,sexe)) / 0,4`, bornée à âge ± 15 ans ; message « estimation de forme, pas un avis médical ».
- **Courbe de puissance / d'allure** : meilleurs efforts moyens sur 5 s, 1, 5, 20, 60 min (vélo) ; 400 m, 1 km, 5 km, 10 km, semi (course) ; calcul par fenêtre glissante, stockage `best_efforts` mis à jour incrémentalement ; comparaison sur 90 jours, 12 mois et à vie ; flags « record ». Détecter et exclure les pics GPS aberrants (vitesse > 12 m/s en course).

## 5.3 Récupération et santé

### 5.3.1 Sources de données
| Donnée | Source | Fallback | Baseline |
|---|---|---|---|
| Sommeil (durée, réveils, phases) | Health Connect (Android), HealthKit (iOS), montre | saisie : « heure de coucher / lever + qualité 1-5 » | médiane 28 j |
| FC de repos | montre/ceinture au réveil ou minimum nocturne | mesure guidée 60 s au lever | médiane 28 j ± 1,5 écart-type |
| HRV (RMSSD, ms) | montre/ceinture, nuit | aucune (ne jamais inventer) | moyenne ln(RMSSD) sur 28 j, bande de normalité ± 0,75 σ |
| Stress, courbatures, humeur, énergie | check-in | — | moyenne 14 j |
Demande les permissions au moment de la valeur (pas à l'installation) ; chaque source se révoque individuellement dans Réglages ; les données de santé sont chiffrées au repos, classées « sensibles » (voir Partie 8 pour le RGPD, données de santé et consentement explicite).

### 5.3.2 Check-in quotidien de 10 secondes
Un seul écran, 5 questions, une échelle 1-5 par pictogrammes, pré-remplies sur la valeur de la veille, tout facultatif :
1. Énergie (1 épuisé – 5 plein de forme) ; 2. Sommeil ressenti ; 3. Courbatures/jambes lourdes ; 4. Stress/mental ; 5. Humeur.
Une 6e entrée « Douleur ou gêne ? » (Non / Oui → zone du corps sur silhouette + intensité 0-10 + « type : musculaire, articulaire, autre ») apparaît via un lien discret. Stockage : table `daily_checkin(user_id, date, energy, sleep_q, soreness, stress, mood, pain_flag, source, created_at)` ; une ligne par jour, modifiable 48 h ; synchronisé offline-first. Notification de rappel à l'heure choisie, jamais plus d'une par jour, supprimée si déjà rempli ou si le sommeil importé suffit.

### 5.3.3 Score de disponibilité (0-100), formule transparente
Chaque composante est convertie en sous-score 0-100 ; les composantes manquantes sont retirées et les poids renormalisés (affiche « basé sur 3 signaux sur 6 », confiance abaissée).
| Composante | Poids | Calcul du sous-score |
|---|---|---|
| Sommeil | 0,25 | `100 × clamp(durée / besoin, 0, 1)` − 10 si ≥ 3 réveils longs ; besoin = 8 h (réglable 7-9) ; dette sur 3 nuits pondérée 0,5 |
| FC repos | 0,15 | écart `Δ = FCrepos − baseline` ; sous-score = `100 − 12 × max(0, Δ)` (Δ en bpm), min 0 |
| HRV | 0,20 | `z = (ln RMSSD − moy)/σ` ; sous-score = `clamp(70 + 20 z, 0, 100)` |
| Charge récente | 0,20 | basé sur TSB : `clamp(70 + 1,5 × TSB, 0, 100)` ; ACWR > 1,5 plafonne à 40 |
| Courbatures | 0,10 | `(5 − soreness) × 25` (100 si 1, 0 si 5) |
| Stress/humeur/énergie | 0,10 | moyenne de `(valeur − 1) × 25` |
`Disponibilité = Σ(poids × sous-score)/Σ(poids présents)`. **Plafonds durs** : douleur ≥ 6/10 → max 40 ; fièvre/maladie déclarée → max 20 ; sommeil < 4 h → max 55. Bandes : ≥ 80 excellent ; 65-79 bon ; 50-64 moyen ; < 50 faible. Affiche toujours les 2 facteurs principaux : « Disponibilité 58 : sommeil court (5 h 20) et FC repos +6 bpm ». Aucune valeur n'est présentée comme un diagnostic. Free : check-in et score simplifié (sommeil + ressenti). Sports/Fit/Ultra : score complet ; Ultra : tendances 90 jours, corrélations.

### 5.3.4 Temps de récupération conseillé
`Récup_h = clamp(8 + 0,30 × L_cardio + 0,20 × L_neuro, 12, 96)`, ×1,25 si disponibilité < 50 ou ≥ 45 ans (×1,10 si ≥ 35 ans), ×0,85 si CTL > 70. Exemple : séance 90 pTSS cardio, 110 neuro, pas d'âge avancé → 8 + 27 + 22 = 57 h. Arrondi en « prochaine séance dure possible : après-demain soir ». Le chiffre est une suggestion, pas une interdiction : une séance facile (Z1-Z2) reste toujours autorisée (« récupération active »).

### 5.3.5 Semaines de décharge
Toutes les 3 ou 4 semaines de charge croissante (3 si ≥ 45 ans, débutant < 6 mois, ou ACWR moyen > 1,2 ; 4 sinon) : réduire le volume de 30 % (40 % si fatigue élevée), garder 1 séance courte avec intensité (rappel neuromusculaire) et la fréquence à −1 séance. Déclenchement anticipé si : disponibilité moyenne 5 jours < 55, TSB < −25 pendant 4 jours, ou 3 séances « trop dures » consécutives (5.7).

### 5.3.6 Surentraînement et signaux d'alerte
Signaux (le moteur affiche l'alerte si ≥ 3 simultanés sur 7 jours) : FC repos +5 bpm au-dessus de la baseline 5 jours de suite ; HRV sous la bande 5 jours de suite ; performance en baisse à RPE égal (allure −3 % à FC égale) ; sommeil dégradé ; humeur/motivation ≤ 2 sur 5 jours ; courbatures persistantes > 5 jours ; ACWR > 1,5 deux semaines. Réponse : état rouge, 3-7 jours de charge réduite (≤ 50 % de CTL), message de prudence et suggestion de consulter un médecin si symptômes persistent > 2 semaines. Aucun terme « syndrome de surentraînement » diagnostiqué.

### 5.3.7 Prévention de blessure : règles chiffrées
- **Progression hebdomadaire plafonnée** (charge pTSS, hebdomadaire) : débutant (< 6 mois ou CTL < 25) +8 % ; intermédiaire +10 % ; avancé (CTL > 60) +7 % si le volume est > 6 h ; jamais > +15 % ni > +30 pTSS en absolu sur la semaine pour CTL < 30.
- **Règle des 10 % nuancée** : s'applique au volume de course (km) et au dénivelé séparément ; autorise +20 % sur la semaine suivant une décharge (retour au pic précédent) mais jamais au-delà du pic des 4 dernières semaines + 10 %.
- **Plafond de séance longue** : la séance la plus longue ne dépasse pas 120 % de la plus longue des 28 derniers jours (course) ni 50 % du volume hebdomadaire total (course) / 60 % (vélo).
- **Pics** : si une séance seule dépasse 2 × la charge quotidienne moyenne des 28 jours + 30 %, avertissement avant démarrage de séance planifiée (« Cette séance est exceptionnelle pour toi : échauffe-toi bien »).
- **Jours consécutifs d'impact** : max 3 jours de course consécutifs pour un débutant, 4 pour intermédiaire, 6 avancé.
- **Mobilité/renforcement** : 2 séances/semaine ≥ 10 min proposées si charge d'impact > seuil (via Fit : voir Partie 7).

### 5.3.8 Douleurs déclarées et adaptation
Échelle 0-10. Règles :
- 1-3 (gêne légère, disparaît à l'échauffement) : conserver, réduire l'intensité de 10 %, surveiller 48 h.
- 4-5 : remplacer course/saut par séance à faible impact (vélo/natation/marche), pas de séance intense sur la zone ; message « Écoute ce signal ».
- ≥ 6, douleur nocturne/au repos, boiterie, gonflement, douleur qui augmente pendant l'effort : arrêt des séances concernées, redirection vers un professionnel de santé.
- **Persistante** (> 7 jours, 3 check-ins consécutifs ≥ 4) : l'app propose de consulter, désactive les séances à impact pour la zone et n'émet plus de plan de qualité.

### 5.3.9 Retour de blessure ou de maladie
Protocole de reprise en 4 paliers selon l'arrêt : 1-3 j (maladie légère, sans fièvre) → reprise à 70 % de la charge hebdomadaire précédente, 1 semaine ; 4-7 j → 50 % puis 70 % puis 85 % sur 3 semaines ; 8-21 j → 3 semaines à 40 / 55 / 70 % puis retour progressif ; > 21 j → reprise comme débutant, test de calibrage. Après maladie avec fièvre ou symptômes sous le cou (« neck check » : fièvre, courbatures généralisées, toux grasse) : 24-48 h sans symptôme avant toute séance, une semaine sans intensité. Après blessure : exiger confirmation « Un professionnel m'a donné son feu vert ou je n'ai plus de douleur au quotidien ». Jamais de séance intense dans les 3 premiers jours de reprise.

### 5.3.10 Femmes : suivi du cycle (optionnel)
Activation explicite, désactivable, hors par défaut. Données : date des règles, durée du cycle, symptômes (crampes, fatigue). **Confidentialité renforcée** : stockées chiffrées, jamais partagées avec amis/social/marketplace (voir Partie 7), exclues des exports publics et des prompts envoyés au LLM sauf case « autoriser le coach à utiliser mon cycle » cochée séparément. Adaptation douce uniquement : en phase de règles/lutéale tardive avec symptômes déclarés, abaisser de 5 points le seuil « séance dure » et proposer une séance alternative ; aucune baisse de charge automatique sans symptôme ; aucune prédiction de fertilité ni contraception ; message « La littérature montre de grandes différences individuelles : l'app s'adapte à ce que tu ressens, pas à un calendrier. » Retard/absence de règles prolongée + charge élevée ou perte de poids rapide : message de prudence (déficit énergétique relatif) et redirection vers un professionnel.

### 5.3.11 Chaleur, froid, altitude, acclimatation
- **Chaleur** : indice WBGT ou température ressentie ; au-dessus de 25 °C ajuster allure cible de +1,5 % par °C jusqu'à 30 °C puis +2,5 % ; au-dessus de 32 °C ressenti, séances dures déplacées tôt le matin/soir ou en intérieur ; alerte canicule officielle : séance réduite de moitié ou annulée. Acclimatation : 10-14 jours d'exposition progressive, durée −20 % les 3 premiers jours.
- **Froid** : < 0 °C, échauffement allongé de 5 min, pas de fractionné sur sol verglacé ; rappel des couches, notif sécurité (voir Partie 4).
- **Altitude** : au-dessus de 1 500 m, allure −1 % par 150 m d'altitude (course), charge ×1,1 à 2 000 m ×1,2 à 3 000 m ; 2-3 jours d'adaptation sans effort dur à > 2 500 m ; signes du mal aigu des montagnes (maux de tête, nausées, vertiges) → redescendre et consulter (renvoi sécurité, Partie 4).

### 5.3.12 Règles médicales (impératives)
- **AUCUN diagnostic**, aucune interprétation de maladie, aucun conseil de médicament, aucun ajustement de traitement.
- Redirection vers un professionnel (médecin, kiné) à chaque seuil de 5.3.8 et pour tout sujet médical.
- **Signaux nécessitant arrêt immédiat de l'effort et appel des secours (15/112)** : douleur ou oppression thoracique, essoufflement anormal au repos ou disproportionné, malaise/évanouissement, palpitations inhabituelles avec vertige, douleur irradiant au bras/mâchoire, trouble de la parole ou de la vue, confusion, coup de chaleur (peau chaude et sèche, désorientation). Ces textes sont codés en dur, non générés.
- Questionnaire PAR-Q+ simplifié à l'onboarding ; réponse positive → « Parles-en à ton médecin avant de commencer » + plan limité à la marche facile tant que non levé.
- Mentions légales à afficher (onboarding, CGU, pied de page des plans) : « [NOM_APP_SPORTS] ne fournit ni diagnostic ni avis médical. Consulte un professionnel de santé avant de débuter ou reprendre une activité, surtout en cas de pathologie, de grossesse ou de traitement. » Voir Partie 8 pour la qualification réglementaire (dispositif non médical).

## 5.4 Objectifs

### 5.4.1 Types
| Type | Exemple | Mesure de réussite |
|---|---|---|
| Habitude | « 3 séances/semaine » | semaines remplies / semaines totales |
| Volume | « 100 km en mars » | cumul vs cible |
| Distance | « courir 10 km sans m'arrêter » | séance réussie |
| Performance | « 10 km en 50:00 » | temps validé (course ou test) |
| Événement | « semi de Lyon le 12/04 » | date fixe, distance ; plan inversé depuis le jour J |
| Dénivelé | « 3 000 m D+ en un mois » | cumul |
| Poids/forme | « perdre 4 kg en 16 semaines » | poids, tour de taille, FC repos (avec Fit) |
Chaque objectif : `goal(id, type, metric, target, unit, deadline, priority 1-3, status, baseline, created_at)`.

### 5.4.2 Faisabilité (évaluation honnête)
Calcule un **score de faisabilité** F ∈ [0 ; 1] :
`F = min(F_niveau, F_temps, F_progression, F_santé)`.
- `F_niveau` : écart entre la performance prédite aujourd'hui (Riegel/VDOT) et l'objectif : écart ≤ 3 % → 1,0 ; 3-8 % → 0,8 ; 8-15 % → 0,55 ; 15-25 % → 0,3 ; > 25 % → 0,1 (pour la durée disponible, un gain réaliste est ~1 % par semaine en début de pratique, 0,3 % pour intermédiaires).
- `F_temps` : charge hebdomadaire requise (modèle de 5.5) vs temps disponible déclaré ; ratio ≤ 1 → 1,0 ; 1-1,2 → 0,6 ; > 1,2 → 0,2.
- `F_progression` : la montée de charge nécessaire respecte-t-elle les plafonds de 5.3.7 ? sinon 0,3 maximum.
- `F_santé` : 0,5 si douleurs actives ou reprise récente.
Messages types (jamais culpabilisants) : F ≥ 0,8 « Objectif réaliste. On y va. » ; 0,5-0,8 « Ambitieux mais possible si tu tiens 4 séances/semaine ; je te propose aussi un objectif intermédiaire. » ; < 0,5 « Aujourd'hui, ce chrono est hors de portée en 10 semaines (il demanderait +18 % de vitesse). Voici 3 alternatives : [objectif atteignable 54:30] [plus de temps : 18 semaines] [objectif d'habitude]. » L'utilisateur peut garder son objectif ; le plan reste soumis aux plafonds de sécurité et affiche « objectif risqué ».

### 5.4.3 Objectifs multiples et conflits
Max 1 objectif prioritaire 1 (A), 2 secondaires (B, C). Conflit si : deux événements A à moins de 6 semaines ; objectif de perte de poids + objectif de performance exigeant un déficit < −300 kcal/j toléré ; volume hebdomadaire cumulé requis > temps dispo ; objectif de prise de masse (Fit) + marathon. Résolution : priorités, séquençage (« d'abord le semi, ensuite le trail »), ou réduction du plus faible. Le plan ne sert jamais deux objectifs de performance simultanés sans en désigner un maître.

### 5.4.4 Suivi et révision
Barre de progression par objectif, trajectoire attendue vs réelle (écart > 15 % deux semaines → révision proposée). Révision automatique toutes les 4 semaines, après un test ou une pause. Objectif atteint : célébration (voir Partie 7 trophées) et suggestion du suivant. Objectif manqué : message neutre, rapport d'enseignements (5.10), nouveau plan proposé.

