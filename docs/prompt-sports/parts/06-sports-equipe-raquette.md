# PARTIE 6 — Sports d'équipe et de raquette (football, basket, tennis, puis volley, padel, rugby, handball, badminton, tennis de table, squash)

> Cette partie est livrée en **vague 2**, après l'endurance (voir Partie 3 et Partie 4). Le besoin dominant est **social et organisationnel** (équipes, calendrier, présence, scores, classements), pas l'entraînement solo. Tout droit d'accès (nombre d'équipes, stats avancées, tournois) est **vérifié côté serveur** (voir Partie 2) ; le client ne fait qu'afficher. Le coach unique multi-sports (voir Partie 5) reçoit la charge de match et la disponibilité ; c'est le différenciateur n°1.

## 6.0 Règles d'application pour toi (assistant de code)

1. Ne code **aucune règle de sport en dur** dans l'interface ou les services : tout passe par le moteur de sport (6.1). Si tu écris `if (sport === 'football')` en dehors d'un adaptateur de configuration, c'est un défaut.
2. Chaque fonctionnalité est livrée avec : migration, endpoint, test unitaire, test d'intégration, écran, chaînes i18n françaises.
3. Les droits : `Gratuit` = 1 équipe, saisie de match basique, calendrier, présence, messagerie ; `Sports` = équipes illimitées, stats avancées, compositions, bibliothèque d'exercices complète, export PDF ; `Fit` = `Sports` + intégration muscu (Partie 7) ; `Ultra` = tout + organisateur de tournoi >32 équipes, vidéo, analyses IA. Détail en 6.14.
4. Placeholders : [STACK_BACKEND], [STACK_DB], [STACK_TEMPS_REEL] (WebSocket), [STACK_PUSH], [STACK_CARTES], [STACK_PAIEMENT_TOURNOI], [STACK_STOCKAGE_MEDIA].
5. Tout horodatage est stocké en UTC avec le fuseau IANA du lieu ; affichage en heure locale du lieu.

---

## 6.1 Architecture « moteur de sport » configurable

### 6.1.1 Principe
Un sport est un **document de configuration versionné** (JSON, validé par un schéma) chargé en base (`sport_definition`) et mis en cache. Ajouter le volley ou le squash = ajouter une configuration + tests de conformité, **zéro changement de code** hors éventuel nouvel *évaluateur de score* (6.1.3). Le moteur expose trois services purs, sans I/O, testables : `ScoreEngine` (applique un événement à un état de match), `StatsEngine` (agrège des événements en métriques), `CompetitionEngine` (calendriers et classements, voir 6.8).

### 6.1.2 Schéma d'une définition de sport
```json
{
  "id": "football_11", "version": 3, "family": "team_invasion",
  "name_fr": "Football à 11",
  "players_on_field": 11, "squad_max": 23, "squad_min_to_start": 7,
  "time": { "mode": "clock_up", "periods": [{"name":"1re mi-temps","minutes":45},{"name":"2e mi-temps","minutes":45}],
            "extra_time": {"periods":[15,15],"enabled_in":["knockout"]}, "break_minutes": 15,
            "stoppage_display": true },
  "score": { "evaluator": "points_sum", "unit": "but", "events_scoring": {"goal":1,"own_goal":1} },
  "events": ["goal","own_goal","assist","shot","shot_on_target","foul","yellow_card","red_card","corner","offside","save","substitution","penalty_scored","penalty_missed"],
  "substitutions": {"max": 5, "windows": 3, "reentry": false},
  "sanctions": {"yellow_to_red": 2, "suspension_after_yellows": 3},
  "positions": ["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"],
  "formations": ["4-4-2","4-3-3","3-5-2","4-2-3-1"],
  "stats": ["goals","assists","shots","shots_on_target","fouls","cards","saves","minutes"],
  "competition_formats": ["league","knockout","groups_knockout","swiss"],
  "tiebreakers_default": ["points","goal_diff","goals_for","head_to_head"],
  "points_system": {"win":3,"draw":1,"loss":0}
}
```
Champs obligatoires : `id, version, family, players_on_field, time, score.evaluator, events, positions, stats`. Familles : `team_invasion` (foot, basket, hand, rugby), `team_net_sets` (volley), `duel_sets` (tennis, padel, badminton, tennis de table, squash). Un match stocke `sport_definition_id` **et** `sport_definition_version` : une feuille de match ne change jamais rétroactivement. Une organisation (club, ligue) peut **surcharger** des champs (durée des périodes, points) via `rules_override` validé par le même schéma.

### 6.1.3 Évaluateurs de score
| Évaluateur | Logique | Sports |
|---|---|---|
| `points_sum` | somme d'événements valorisés | foot, hand, basket, rugby (essai 5, transformation 2, pénalité 3, drop 3) |
| `sets_games` | machine à états jeux, sets, tie-break | tennis, padel |
| `sets_rally` | premier à N points, écart de 2, plafond | volley, badminton, tennis de table, squash |

### 6.1.4 Définitions détaillées

**Football** — mêmes champs, paramètres variants :
| Variante | Joueurs | Périodes | Remplacements | Particularités |
|---|---|---|---|---|
| `football_11` | 11 | 2 x 45 min (modifiable 2 x 30/35/40) | 5 en 3 fenêtres, sans retour | prolongations 2 x 15 puis tirs au but (5 tireurs, puis mort subite) |
| `football_7` | 7 | 2 x 25 min | volants illimités avec retour | pas de hors-jeu (option), surface réduite |
| `football_5` / futsal | 5 | 2 x 20 min temps arrêté (option : temps courant) | illimités avec retour | 5 fautes cumulées par période = coup franc direct sans mur ; temps mort 1 par période ; gardien-volant |

**Basket** :
- `basketball_5x5` : 4 x 10 min (FIBA) ou 4 x 12 (NBA, option `ruleset`) ; prolongation 5 min illimitée ; points 1/2/3 ; 5 fautes personnelles = exclusion ; bonus à 5 fautes d'équipe par période ; 24 s ; 2 temps morts en 1re mi-temps, 3 en 2e. Postes : meneur, arrière, ailier, ailier fort, pivot. Événements : tir réussi/raté (2/3/LF), rebond off/déf, passe décisive, interception, contre, balle perdue, faute.
- `basketball_3x3` : 1 période de 10 min (arrêt à 21 points), 12 s d'attaque, tirs 1 et 2 points, prolongation « premier à 2 points », 3 joueurs + 1 remplaçant, bonus dès la 7e faute d'équipe, exclusion à 2 fautes antisportives.

**Tennis** (évaluateur `sets_games`, paramètres) :
| Paramètre | Valeurs possibles |
|---|---|
| `sets_to_win` | 1, 2 (meilleur de 3), 3 (meilleur de 5) |
| `games_per_set` | 6 (défaut), 4 (format court), 9 (pro-set 8 jeux + tie-break à 8-8) |
| `tiebreak_at` | 6-6 (défaut), aucun (avantage illimité), 12-12 |
| `tiebreak_points` | 7 (écart 2), 10 |
| `final_set` | `normal`, `super_tiebreak_10` (remplace le 3e set), `no_tiebreak_advantage` |
| `scoring` | `ad` (avantage) ou `no_ad` (point décisif à 40-40 ; l'équipe qui relance choisit le côté de réception) |
| `format` | `singles`, `doubles` |
Détail du marquage et de la machine à états : 6.6.4.

**Sports complémentaires (version concise)** :
| Sport | id | Format | Score | Points clés |
|---|---|---|---|---|
| Volley | `volleyball_6x6` | 5 sets, 25 pts (5e à 15), écart 2, plafond optionnel 30 | `sets_rally` | 6 joueurs, rotation obligatoire, libero, 6 remplacements/set, 2 temps morts/set |
| Padel | `padel_doubles` | 2 sets gagnants à 6 jeux, 3e set = tie-break 7 ou super tie-break 10 | `sets_games` | toujours en double, point d'or (no-ad) par défaut, service en dessous de la taille |
| Rugby | `rugby_15`, `rugby_7` | 2 x 40 min (15) ; 2 x 7 min (7) | `points_sum` | essai 5, transformation 2, pénalité 3, drop 3 ; 8 remplaçants (15) ; carton jaune 10 min (15) / 2 min (7) |
| Handball | `handball_7` | 2 x 30 min | `points_sum` | 7 joueurs dont gardien, suspension 2 min, 3 suspensions = disqualification, jet de 7 m, zone des 6 m |
| Badminton | `badminton_singles/doubles` | 3 manches de 21, écart 2, plafond 30 | `sets_rally` | service en diagonale, changement de côté |
| Tennis de table | `tt_singles/doubles` | meilleur de 5 manches de 11, écart 2 | `sets_rally` | service alterné tous les 2 points (à 10-10 : 1 point) |
| Squash | `squash_singles` | meilleur de 5 manches de 11 (PAR), écart 2 | `sets_rally` | point à chaque échange, lets/strokes en événements |

### 6.1.5 Critères d'acceptation 6.1
- Ajouter `beach_volleyball` (2 sets de 21, 3e à 15, changement de côté tous les 7 points) ne nécessite **que** un fichier JSON et un jeu de tests ; la saisie, les stats, le classement fonctionnent.
- Un match démarré en version 3 d'une définition reste rejouable en version 3 après publication de la version 4.
- Une configuration invalide (ex. `periods` vide) est refusée au chargement avec un message précis et n'est jamais mise en cache.

---

## 6.2 Équipes et clubs

### 6.2.1 Entités et rôles
Un **Club** (optionnel) contient des **Équipes** (par sport, catégorie, saison). Un utilisateur a un **profil de joueur** par sport et des **appartenances** (`membership`) à des équipes.

| Rôle | Droits |
|---|---|
| Propriétaire du club | tout, facturation, suppression, transfert de propriété |
| Coach | composition, séances, présence, saisie de match, stats complètes, messagerie, validation des adhésions |
| Capitaine | convocations, présence, composition si délégué, saisie de match |
| Joueur | voir calendrier/stats, répondre à la présence, saisir ses disponibilités |
| Remplaçant | joueur avec priorité de convocation 2, apparaît en liste d'attente |
| Parent/tuteur | lié à 1 ou plusieurs mineurs ; consentements, présence de l'enfant, messagerie encadrée, **pas** de stats physiques de l'enfant sans accord |
| Supporter | lecture des pages publiques et annonces (si équipe publique) |
| Arbitre | saisie et validation de match assigné, aucun accès aux messages d'équipe |
Un utilisateur peut cumuler plusieurs rôles ; les droits sont l'union, sauf pour les mineurs (6.2.4).

### 6.2.2 Création et invitations
- Création d'équipe : nom, sport, variante (6.1), catégorie (U7...U18, senior, vétéran, loisir mixte), niveau, couleur et logo, ville, visibilité (`privée`, `sur invitation`, `publique`). Gratuit : 1 équipe active par compte ; la 2e déclenche le paywall `Sports` (vérification serveur sur `POST /teams`).
- Invitations : **lien** (jeton aléatoire 128 bits, durée 7 jours par défaut, usages max configurable, révocable), **QR code** généré du même lien, **contacts** (sélection dans le carnet avec consentement système ; les numéros ne quittent jamais l'appareil, seul un hash salé sert à la correspondance), invitation par pseudo.
- Adhésion : `invitation` → `pending_validation` (si l'équipe exige validation) → `active`. Le coach valide ou refuse ; un refus ne notifie pas la raison à l'utilisateur sauf message libre du coach.
- Effectif : numéro de maillot unique par équipe et saison (conflit = erreur `409 number_taken`), poste principal et secondaire, pied/main fort, taille, photo (facultative), statut (`actif`, `blessé`, `suspendu`, `indisponible`, `prêté`).

### 6.2.3 Confidentialité
Niveaux par champ : `équipe`, `coachs seulement`, `privé`. Défauts : nom et poste = équipe ; date de naissance, téléphone, e-mail, poids, données de santé = privé ; stats de match = équipe ; stats physiques = coach seulement **si le joueur l'a accepté** (6.7bis). Un joueur voit exactement ce que les autres voient de lui via « Voir mon profil comme... ».

### 6.2.4 Mineurs (règles strictes, bloquantes)
- Âge déclaré < 15 ans (seuil à paramétrer par pays dans [CONFIG_PAYS], voir Partie 8) : compte **rattaché à un parent/tuteur** vérifié (e-mail + validation par code ou pièce selon pays). Sans consentement parental enregistré (`parental_consent`, horodaté, révocable), l'enfant ne peut ni rejoindre une équipe, ni être photographié dans l'app.
- 15-17 ans : adhésion autorisée avec **notification** aux parents ; partage de localisation désactivé par défaut.
- Messagerie mineurs : pas de message privé adulte-mineur ; tout échange passe par canaux d'équipe comportant **au moins 2 adultes** coach/parent référents ; messages visibles par les parents ; mots interdits filtrés ; signalement en un tap.
- Photos et vidéos de mineurs : jamais publiques sans consentement parental explicite par média ; pas de géolocalisation ; flou automatique du visage dans les pages publiques si le consentement manque.
- Un coach adulte doit être **vérifié** (e-mail + déclaration d'honorabilité ; option : numéro de licence fédérale) avant d'encadrer une équipe de mineurs.
- Suppression : le parent peut exporter et supprimer toutes les données de l'enfant.

### 6.2.5 Multi-équipes, transferts, saisons
- Un joueur peut appartenir à N équipes (club + équipe d'amis + salle de 5) ; le calendrier agrège tout et détecte les conflits (6.3.6).
- Transfert : le joueur demande, le coach sortant approuve (ou délai de 7 jours), le coach entrant accepte ; l'historique de stats **suit le joueur** (par `player_profile`), le classement d'équipe garde les matchs joués.
- Saison : entité `season` (début, fin) ; clôture = archivage (équipes en lecture seule, stats figées, résumé de saison partageable). Nouvelle saison : copie de l'effectif avec confirmation joueur par joueur.
- Archives : conservation illimitée des matchs, accessibles en lecture ; suppression d'une équipe = archivage 30 jours puis effacement des données personnelles, anonymisation des stats agrégées.

### 6.2.6 Critères d'acceptation 6.2
- Un lien d'invitation expiré renvoie `410` et propose de demander un nouveau lien.
- Un mineur sans consentement parental ne peut pas accepter une invitation (test serveur, pas seulement UI).
- Deux joueurs ne peuvent pas porter le même numéro dans une équipe sur une saison.

---

## 6.3 Calendrier et organisation

### 6.3.1 Événements
Types : `match`, `training`, `event` (repas, assemblée), `tournament_day`. Champs : titre, équipe, lieu (6.4), début/fin, durée d'arrivée anticipée (RDV 30 min avant), adversaire, domicile/extérieur, tenue, notes, `min_players`, `max_players`, `rsvp_deadline`, `visibility`.

### 6.3.2 Récurrences
Règle RRULE (RFC 5545) : « chaque mardi et jeudi 19h-20h30 jusqu'au 30 juin », exceptions (vacances), modification d'une occurrence vs de toute la série vs « cette occurrence et les suivantes ». Génération matérialisée sur 90 jours glissants par un job quotidien. Changement de fuseau/DST : l'heure locale est conservée.

### 6.3.3 Présence
Réponses : `présent`, `absent` (motif facultatif : blessure, travail, autre), `peut-être`. Règles :
1. Relances automatiques : J-3, J-1 et H-4 aux non-répondants uniquement ; max 3 relances ; jamais entre 22h et 8h heure locale.
2. Capacité : au-delà de `max_players`, les nouveaux « présents » passent en **liste d'attente** ordonnée par priorité (titulaire > remplaçant) puis horodatage ; si un présent se désiste, le premier de la liste est promu et notifié (délai de confirmation 2 h).
3. **Seuil minimum** : si à `rsvp_deadline` le nombre de présents < `min_players`, l'événement passe en `at_risk` ; le coach reçoit une alerte et peut lancer « chercher des remplaçants » (6.3.8).
4. **Annulation conditionnelle** : option `auto_cancel_if_below_min` : annulation automatique à l'échéance, notification à tous, motif « effectif insuffisant ». L'annulation automatique n'est jamais appliquée sur un match de compétition (seul le coach décide ; forfait géré en 6.8).
5. Un changement de réponse après l'échéance est autorisé mais notifie le coach.

### 6.3.4 Covoiturage
Pour un événement extérieur : un joueur propose un trajet (départ approximatif arrondi à 500 m, heure, places), d'autres réservent. Les adresses exactes ne sont partagées qu'entre conducteur et passagers confirmés. Aucune compensation financière gérée dans l'app (afficher un simple indicatif de partage de frais).

### 6.3.5 Rappels et synchronisation externe
- Rappels : push H-24 et H-2 par défaut, configurable par utilisateur ; regroupement si plus de 3 événements dans la journée.
- Export **iCal** : flux d'abonnement `webcal://` par utilisateur (jeton secret révocable) incluant matchs et entraînements, mises à jour par `SEQUENCE` et `LAST-MODIFIED`. Ajout direct à Google Calendar et Apple Calendar par API native appareil avec permission ; import optionnel de la disponibilité (occupé/libre, sans détails).

### 6.3.6 Conflits d'agenda et coach
Avant confirmation d'une présence, comparer à : autres équipes du joueur, séances planifiées par le coach (voir Partie 5) et à la charge du jour. Conflit = bandeau « Tu as une séance de course prévue à 18h : décaler ou garder ? ». Si match dans les 48 h, le coach IA propose automatiquement d'alléger la séance (voir Partie 5) ; l'utilisateur garde le dernier mot.

### 6.3.7 Météo
Prévision [STACK_METEO] pour lieu et heure à J-3 et J-1 ; alerte seuils : pluie > 60 %, vent > 40 km/h, température < 2 °C ou > 32 °C, orage. Le coach peut proposer un report ; la décision de reporter ne se déclenche jamais seule. Pour un terrain couvert/synthétique éclairé, la pluie est ignorée.

### 6.3.8 Remplaçants de dernière minute
Bouton « Il me manque N joueurs » : diffuse une annonce aux remplaçants de l'équipe, puis (si activé) aux joueurs du voisinage de même niveau ayant opté pour « disponible pour dépanner » (voir 6.4.5). Le premier qui accepte est ajouté, notifié, et le coach valide en un tap. Contrainte : jamais pour des mineurs hors de leur club.

### 6.3.9 Critères d'acceptation 6.3
- Série hebdomadaire modifiée à partir de la 5e occurrence : les 4 premières restent inchangées.
- Annulation conditionnelle : 7 présents sur 8 requis à l'échéance -> événement annulé, 1 notification par membre, aucune relance ensuite.
- Désistement d'un présent avec 2 en liste d'attente : le 1er promu, le 2e reste en attente.

---

## 6.4 Terrains et lieux

### 6.4.1 Base de lieux
Sources : import **OpenStreetMap** (tags `leisure=pitch|sports_centre|stadium`, `sport=*`, `surface=*`, `lit=yes`) rafraîchi chaque semaine par [STACK_BACKEND] ; lieux **partenaires** (centres de foot en salle, clubs de padel) avec fiche enrichie ; lieux **créés par les utilisateurs** (modération : validation par 2 autres utilisateurs ou un admin avant publication). Dédoublonnage : même nom normalisé à moins de 80 m = fusion proposée.

```
venue { id, name, geo(point), address, city, osm_id?, partner_id?, sports[], pitches[{type, surface, dimensions?, indoor, lit}],
        amenities{changing_rooms, showers, parking, bar, lighting}, price_hint{min,max,currency,per:'hour'|'player'},
        opening_hours(OSM syntax), booking_url?, booking_provider?, rating_avg, rating_count, status:'active'|'pending'|'closed' }
```

### 6.4.2 Recherche et filtres
Recherche texte + rayon (1 à 50 km) + carte ([STACK_CARTES], voir Partie 4). Filtres : sport, type de terrain (gazon, synthétique, parquet, terre battue, dur, résine, sable), intérieur/extérieur, éclairage, vestiaires, prix max, ouvert maintenant/à une heure donnée, note minimale. Tri : distance, note, prix. Index géospatial (6.14). Résultats pagination curseur, max 50.

### 6.4.3 Avis
Note 1-5 + critères (état du terrain, éclairage, accueil, propreté), texte 500 caractères, 1 avis par utilisateur et lieu, **éditable**. Seuls les utilisateurs ayant un match/événement passé sur ce lieu (ou check-in GPS à moins de 150 m) peuvent noter (anti-faux avis). Signalement et modération (6.10.4). Un propriétaire de lieu partenaire peut répondre, pas supprimer.

### 6.4.4 Réservation
Trois niveaux, du plus simple au plus intégré :
1. **Lien externe** (`booking_url`) : ouverture dans le navigateur avec paramètres préremplis si connus.
2. **Intégration tierce** via interface `BookingProvider { searchSlots(venue, date, sport), book(slot, user), cancel(booking) }` ; un adaptateur par système ([INTEGRATION_RESERVATION_1..N]), activé par lieu. Le prix et le statut sont ceux du tiers ; l'app ne stocke jamais de numéro de carte.
3. **Réservation manuelle** : le coach saisit « terrain réservé, confirmation n° », statut `à confirmer` -> `confirmé`.
Un événement lié à une réservation affiche son statut ; annulation de l'un propose d'annuler l'autre. Partage des frais : calcul indicatif prix / nombre de présents, sans paiement in-app (le paiement de frais est limité aux tournois, 6.8.7).

### 6.4.5 Parties ouvertes (pickup games)
Un joueur propose une partie : sport, variante, lieu, horaire, places (ex. 10), niveau cible (échelle 1-10, voir 6.9.2) avec tolérance ± N, prix par joueur, description, visibilité (publique, amis, club). Règles :
- Les autres s'inscrivent ; l'organisateur peut **valider** chaque inscription ou laisser en acceptation automatique si niveau compatible.
- Liste d'attente comme 6.3.3 ; annulation sous 3 h du début = pénalité de fiabilité (6.11.3).
- **Matching** : pour un utilisateur, score de recommandation `S = 0,4·niveau + 0,3·distance + 0,2·horaire + 0,1·fiabilité` avec `niveau = max(0, 1 - |Δniveau|/3)`, `distance = max(0, 1 - d/rayon)`, `horaire = 1` si l'horaire est dans les créneaux préférés du joueur et pas en conflit d'agenda, `0,5` si seulement libre, `0` sinon ; `fiabilité` = taux de présence 90 j. Notification push uniquement si `S ≥ 0,7` et max 1 push de suggestion par jour.
- Après la partie : saisie de score optionnelle, évaluation de niveau (6.9), « rejouer ensemble » (ajout comme coéquipiers connus).
- Sécurité : lieux publics uniquement ; pas de partie ouverte pour mineurs hors cadre d'un club ; le lieu exact n'est révélé qu'aux inscrits acceptés si le lieu est privé.

### 6.4.6 Critères d'acceptation 6.4
- Recherche « padel, couvert, éclairé, < 15 € » dans 10 km renvoie uniquement des lieux satisfaisant tous les critères, triés par distance.
- Un utilisateur sans passage sur le lieu ne peut pas poster d'avis (403 `not_eligible_reviewer`).
- Partie à 10 places, 12 inscrits : 2 en liste d'attente ; un désistement promeut le premier.

---

## 6.5 Composition et tactique

### 6.5.1 Composition
Éditeur glisser-déposer sur terrain vectoriel adapté au sport (terrain foot, demi-terrain basket, terrain de volley avec rotation). Données : `lineup { match_id, formation, starters[{player, slot, x, y}], bench[], captain, notes }`.
- Foot : formations prédéfinies (4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2 à 11 ; 2-3-1, 3-2-1 à 7 ; 1-2-1, 2-2 à 5), placement libre possible, couleur par ligne, alerte si 0 gardien ou ≠ N titulaires.
- Basket : cinq de départ + rotations planifiées par quart (grille minutes par joueur) ; alerte si un joueur dépasse 4 fautes.
- Volley : 6 positions de service 1-6, rotation automatique (sens horaire), libero gérés (ne peut pas servir, remplace seulement les arrières).
- Rugby/hand : formations par numéros de poste (1-15 en rugby ; 1 gardien + 6 en hand).
- Aide : « composition suggérée » (Sports+) = optimisation sous contraintes : maximise `Σ(note_poste·disponibilité·forme)` avec forme issue de la charge (voir Partie 5) ; exclut blessés/suspendus ; explique en une phrase pourquoi chaque joueur est choisi. Le coach modifie librement ; l'IA ne publie jamais seule.
- Publication de la composition : notification aux convoqués, verrouillage éditable jusqu'à H-1.

### 6.5.2 Tableau tactique
Canevas dessinable : joueurs, adversaires, ballon, flèches de déplacement, zones, étapes (séquence animée de 1 à 12 frames), export image/vidéo courte, enregistrement dans la bibliothèque de l'équipe. Consignes écrites par poste attachées à la composition (visibles par le joueur concerné seulement ou par tous, au choix).

### 6.5.3 Bibliothèque d'exercices (≥ 30)
Structure : `exercise { id, sport, title, objective, duration_min, players_min, players_max, equipment[], level, category, description, variants[], coaching_points[], intensity_rpe }`. Les 30 exercices ci-dessous constituent le **contenu initial** à insérer en base ; le coach peut en créer et partager les siens.

| # | Sport | Titre | Objectif | Durée | Effectif | Matériel | Variantes |
|---|---|---|---|---|---|---|---|
| 1 | Foot | Rondo 4 contre 2 | conservation, passe en 1-2 touches | 10 | 6-8 | plots, ballon | 5c2, 3 touches max, 1 touche |
| 2 | Foot | Conduite slalom + passe | contrôle orienté | 10 | 4+ | plots, ballons | pied faible, avec défenseur passif |
| 3 | Foot | Jeu en 3 zones | circulation, jeu long | 15 | 10-14 | plots, chasubles | zone interdite à un joueur |
| 4 | Foot | Finition 1c1 + gardien | duel tir | 15 | 6+ | but, ballons | départ dos au but |
| 5 | Foot | Jeu de position 7c7+2 | supériorité, appuis | 20 | 16 | plots, chasubles | 8 touches/but après 10 passes |
| 6 | Foot | Transition 3c2 puis 2c1 | contre-attaque | 15 | 8+ | 2 buts | limite 8 secondes |
| 7 | Foot | Gardien : plongeons ciblés | réflexes, placement | 12 | 1-2 | ballons | tirs au sol, aériens |
| 8 | Foot | Petit-jeu 5c5 à thème | pressing | 20 | 10 | plots | 2 touches max |
| 9 | Basket | Mikan et finitions | lay-up deux mains | 8 | 1+ | ballon, panier | pied inversé |
| 10 | Basket | Tir 5 spots | adresse | 12 | 1-6 | ballons | chrono 60 s |
| 11 | Basket | 3 contre 2 / 2 contre 1 | lecture, passe | 12 | 5+ | panier | continu avec défense en retour |
| 12 | Basket | Défense « shell » 4c4 | rotations défensives | 15 | 8 | demi-terrain | 5c5 |
| 13 | Basket | Pick and roll à l'arrêt | écran, lecture | 12 | 4+ | panier | défense « switch » |
| 14 | Basket | Lancers francs sous fatigue | concentration | 10 | 2+ | ballons | après sprints |
| 15 | Basket | Dribble à deux ballons | maniement | 8 | 1+ | 2 ballons | en marche arrière |
| 16 | Tennis | Mini-tennis croisé | toucher | 10 | 2 | raquettes, balles | 1 coup droit/1 revers |
| 17 | Tennis | Montée au filet : approche + volée | transition | 15 | 2-4 | panier de balles | volée de revers |
| 18 | Tennis | Séries de services ciblés | précision service | 15 | 1+ | 20 balles, cibles | deuxième balle kickée |
| 19 | Tennis | Cross/long de ligne | contrôle direction | 15 | 2 | balles | rythme imposé |
| 20 | Tennis | Points commencés à 30-40 | gestion de pression | 20 | 2 | balles | tie-break d'entraînement |
| 21 | Volley | Passe haute en triangle | régularité | 10 | 3 | ballon | alterner manchette |
| 22 | Volley | Service ciblé zones 1-5 | précision | 12 | 6+ | ballons | service smashé |
| 23 | Volley | Réception-passe-attaque | enchaînement | 20 | 6 | filet | libero seul à la réception |
| 24 | Padel | Balles au mur (bandejas) | sorties de vitre | 15 | 2-4 | balles | vibora |
| 25 | Padel | Montée au filet en double | positionnement | 15 | 4 | balles | lob obligatoire |
| 26 | Rugby | Passes en triangle en course | passe sous pression | 12 | 6 | ballon ovale | passe longue |
| 27 | Rugby | Plaquages à genoux progressifs | technique sécurité | 15 | 4+ | boucliers | debout lent |
| 28 | Handball | Tirs en suspension depuis 9 m | puissance | 12 | 6+ | ballons, but | tirs à rebond |
| 29 | Badminton | Jeu de volants en carré (footwork) | déplacements | 12 | 1-2 | volants | chrono 45 s |
| 30 | Tennis de table | Panier de balles topspin | régularité | 10 | 2 | balles | alternance coup droit/revers |
| 31 | Squash | Drives le long du mur | longueur | 12 | 1-2 | balles | cible 1 m du mur de fond |
| 32 | Tous | Circuit d'agilité en échelle | appuis | 8 | 1+ | échelle, plots | enchaînement avec ballon |

Chaque exercice doit s'afficher avec un schéma (terrain + flèches), un minuteur et un bouton « ajouter à la séance ». Niveaux : débutant, intermédiaire, avancé ; filtre par âge (U7-U18) qui masque les exercices à contact pour les jeunes enfants.

### 6.5.4 Séance de club
`session_plan { id, team, date, blocks[{exercise|free_text, duration, intensity_rpe}], total_minutes, objective, notes }`. Le coach compose en glissant des exercices ; l'app affiche **charge prévue** = Σ(durée × RPE) (unités arbitraires, voir Partie 5), alerte si > 120 % de la moyenne des 4 dernières semaines. Partage : au groupe (notification), PDF, lien. Retour de séance : RPE ressenti par joueur (1-10) en 2 taps, alimentant la charge (voir 6.13).

### 6.5.5 Critères d'acceptation 6.5
- Une composition à 11 titulaires sans gardien est signalée mais publiable avec confirmation.
- Filtre « basket, débutant, ≤ 10 min » ne renvoie que les exercices correspondants.
- La charge prévue d'une séance de 3 blocs (10 min RPE 4, 20 min RPE 7, 10 min RPE 3) vaut 40 + 140 + 30 = 210.

---

## 6.6 Saisie de match en direct

### 6.6.1 Principes d'interface
- **Une main, boutons géants** : zone d'action minimale 64 x 64 pt, 6 boutons principaux max par écran (sport configurable via `events` du moteur), vibration haptique à chaque saisie, aucun écran modal bloquant pendant le jeu.
- Bandeau fixe : score, chronomètre, période. Flux de saisie en 2 taps maximum : **équipe/joueur -> action** (ou action -> joueur) ; mode « rapide » = action seule (but de l'équipe A) et attribution au joueur plus tard dans une file « à compléter ».
- Chronomètre : démarrage/pause, ajout de temps additionnel, périodes enchaînées, prolongations, temps morts (compteur et durée), minuteries de sport (24 s basket en option). Le chrono continue en arrière-plan et survit à la fermeture de l'app (stocké comme `started_at` + cumul, jamais comme compteur local).
- **Annulation** : bouton « Annuler » du dernier événement ; l'historique est un **journal d'événements immuable** (event sourcing) : une annulation crée un événement `void` référençant l'original ; modification = void + nouvel événement.
- Remplacement : écran 2 listes (terrain/banc), horodatage automatique, contrôle des règles (limite, retour interdit) avec message d'erreur clair mais **dérogation** possible par le coach (marquée dans la feuille).

### 6.6.2 Modèle d'événement
```json
{ "id":"uuid-v7","match_id":"m_91","seq":42,"client_id":"dev_a#17","type":"goal",
  "team":"home","player_id":"p_7","related_player_id":"p_9",
  "period":2,"clock_ms":3125000,"payload":{"body_part":"right_foot","penalty":false,"xy":[0.82,0.41]},
  "recorded_by":"u_3","recorded_at":"2026-10-03T15:12:03Z","voids":null }
```
`seq` est attribué par le serveur ; `client_id` (appareil + compteur local) garantit l'**idempotence** : rejouer le même événement ne le duplique pas.

### 6.6.3 Saisie multi-utilisateurs, hors ligne, conflits
- **Statisticien unique** (défaut) : un jeton de saisie `scorer_lock` ; un second appareil est en lecture seule, le coach peut **reprendre la main** (l'ancien scoreur est notifié).
- **Collaboratif** (Sports+) : plusieurs saisissants avec périmètres (équipe A, tirs, fautes). Deux événements identiques (même type, joueur, ±10 s) sont signalés comme **doublon probable**, fusion proposée au coach.
- **Hors ligne** : toutes les saisies vont dans une file locale ([STACK_DB_LOCALE]) ; à la reconnexion, envoi par lots ordonnés ; le serveur renvoie `accepted[]`, `rejected[]`, `conflicts[]`. Le score affiché localement est recalculé par le `ScoreEngine` embarqué (même code que serveur) ; en cas d'écart après synchro, le serveur gagne et un bandeau l'explique.
- Conflit : (a) même événement saisi par 2 appareils : dédoublonné ; (b) événements contradictoires (cartons rouges sur joueur déjà exclu, remplacement d'un joueur absent du terrain) : état `needs_review`, résolution manuelle par le coach/arbitre ; (c) horodatage hors période : accepté avec drapeau.
- Temps réel : diffusion par [STACK_TEMPS_REEL] aux abonnés (fans, 6.12) avec latence cible < 2 s ; repli sur interrogation toutes les 10 s.

### 6.6.4 Tennis : marquage point par point
**État** : `{ sets:[{games:[a,b], tiebreak?:[a,b]}], current_game:{points:[a,b]}, server, receiver, tiebreak_mode, in_super_tiebreak, winner }`. Une seule action de saisie : « point pour X » + type de point.

Règles exactes (config par défaut, avantage) :
1. **Jeu normal** : points 0, 15, 30, 40 ; à 40-40 (« égalité »), le point suivant donne « avantage » ; un point de plus gagne le jeu ; sinon retour à égalité. En **no-ad** : à 40-40, le point suivant gagne le jeu.
2. **Set** : premier à 6 jeux avec 2 d'écart ; à 6-6, tie-break (si `tiebreak_at` = 6-6).
3. **Tie-break** (7 points, écart 2) : points comptés 0,1,2... ; le service change après le 1er point, puis tous les 2 points ; les joueurs changent de côté tous les 6 points. Le premier serveur du tie-break est celui qui aurait servi le jeu suivant ; le 1er serveur du jeu suivant le tie-break est le **relanceur** du premier point du tie-break. Score du set affiché 7-6 (7-4) ; le score du tie-break du perdant est noté en exposant.
4. **Super tie-break** (10 points, écart 2) à la place du 3e set (si `final_set=super_tiebreak_10`) : comptes en jeu ; chaque set gagné compte pour 1 set ; le super tie-break est enregistré comme un set « 1-0 (10-7) ».
5. **Service** : alterne à chaque jeu ; en double, l'ordre de service des 4 joueurs est fixé au début de chaque set et se répète. Le côté de service alterne à chaque point (droite à 0 et pair, gauche impair).
6. **Fin de match** : `sets_to_win` atteint -> `winner`. Abandon/forfait/disqualification : événement `retired|walkover|default` avec score partiel conservé.
Événements d'un point : `ace`, `double_fault`, `winner`, `unforced_error`, `forced_error`, `first_serve_in/out`, `second_serve_in`, `break_point`, `net_point`. 

**Statistiques tennis** : aces, doubles fautes, % premières balles = `1res_in / services`, points gagnés sur 1re/2e balle, points gagnants, fautes directes, **break points** (occasions = points où le relanceur peut gagner le jeu ; convertis = jeux gagnés au service adverse), total de points gagnés, `dominance = pts gagnés au retour / pts de retour joués`. Annuler un point rejoue la machine à états depuis le journal (jamais de décrément manuel).

### 6.6.5 Exemple de feuille de match (football 11)
```
FEUILLE DE MATCH  AS Neroli 3 - 2 FC Voisins   (Championnat D3, J7)  Stade municipal, 12/10/2026 15:00
Arbitre : M. Dupont   Scoreur : T. Martin   Météo : 14 °C, couvert
Compo A (4-4-2) : 1 Leroy, 2 Aït ... ; banc : 12 Roux, 14 Petit...
Chronologie : 12' But n°9 Diallo (pd n°10 Moreau) | 34' Carton jaune n°5 | 46' Remplacement 7 -> 15 |
              58' But adversaire n°11 | 71' But n°9 Diallo (pen.) | 80' But adversaire | 88' But n°10 Moreau
Stats équipe : tirs 14-9, cadrés 7-5, corners 6-3, fautes 11-14, possession estimée 54-46
Homme du match : n°9 Diallo (12 votes)       Validation : A (coach) 15:58 | B (coach) 16:04 -> VALIDÉ
```

### 6.6.6 Validation, rapport, partage
- Cycle : `scheduled -> live -> finished (provisoire) -> validated | disputed`. À la fin, les deux équipes (coach ou capitaine) valident ; **validation implicite** si l'adversaire ne conteste pas sous 48 h (match amical : 24 h). Contestation = litige (6.11.1) ; tant que `disputed`, le classement affiche le résultat provisoire avec pastille.
- Feuille de match PDF (Sports+) : en-tête, composition, chronologie, stats, signatures numériques (horodatage + identifiant) ; génération serveur asynchrone, lien partageable révocable, filigrane si non validé.
- Partage : carte image « résumé de match » (score, buteurs, homme du match) pour réseaux sociaux (voir Partie 7).

### 6.6.7 Critères d'acceptation 6.6
- Un événement saisi hors ligne puis synchronisé deux fois n'apparaît qu'une seule fois.
- Annuler le dernier but ramène score et stats du buteur/passeur à leur valeur précédente, et l'historique conserve le `void`.
- Tennis : à 6-6 tie-break, le premier serveur sert 1 point, l'adversaire 2, etc. ; score final 7-6(5) s'affiche correctement.

---

## 6.7 Statistiques

### 6.7.1 Règle générale
Toutes les métriques sont **dérivées des événements** (jamais saisies directement), recalculables. Les stats avancées (marquées *) sont payantes (`Sports`) ; les basiques sont gratuites. Minimum d'échantillon : un pourcentage n'est affiché qu'à partir de 5 tentatives (sinon « — »).

### 6.7.2 Métriques par sport
**Football** : buts, passes décisives, `G+A`, tirs, tirs cadrés, `précision de tir = cadrés / tirs`, `conversion = buts / tirs`, minutes, `buts/90 = buts × 90 / minutes`, cartons, fautes, arrêts, `% arrêts = arrêts / tirs cadrés subis`, clean sheets, `+/-` (buts pour moins buts contre pendant la présence sur le terrain)*, **xG*** simple : `xG(tir) = f(distance, angle, partie du corps, penalty=0,76)` via régression logistique `xG = 1 / (1 + e^-(b0 + b1·d + b2·θ + b3·tête))` avec coefficients initiaux b0=0,4, b1=-0,11 (d en m), b2=1,2 (θ en rad), b3=-0,7, recalibrés par jeu de données [DONNEES_XG] ; nécessite la position du tir (`xy`), sinon xG non affiché. Possession approximée* = `passes équipe / (passes A + passes B)` (si passes saisies), sinon non affichée.

**Basket** : points, rebonds (off/déf), passes, interceptions, contres, balles perdues, fautes, minutes, `%TIR = réussis/tentés`, `eFG% = (FGM + 0,5 × 3PM) / FGA`, **`TS% = PTS / (2 × (FGA + 0,44 × FTA))`***, `ratio passes/pertes = AST / TOV`, `+/-`* (différentiel pendant présence), **évaluation (efficiency)** = `PTS + REB + AST + STL + BLK − (FGA−FGM) − (FTA−FTM) − TOV`, `rythme = possessions/40 min` avec `possessions ≈ FGA + 0,44·FTA − OREB + TOV`, `note offensive = 100 × PTS / possessions`*.

**Tennis** : voir 6.6.4 plus `% points gagnés`, `jeux de service tenus`, `% breaks convertis`, `séries de victoires`. Cartes de **placement** des services (zones T/corps/large) si saisies.

**Volley** : attaques (kills), `efficacité d'attaque = (kills − fautes) / tentatives`, aces, fautes de service, blocs, réceptions parfaites `%`, manchettes, passes décisives.
**Rugby** : essais, transformations, pénalités, plaquages réussis / tentés, mêlées, mètres gagnés, cartons. **Handball** : buts, tirs, `% réussite`, arrêts gardien, 7 m, suspensions 2 min. **Badminton/tennis de table/squash/padel** : points gagnés, `% points au service`, séries, `smashs gagnants`, fautes directes, durée moyenne des échanges si saisie.

### 6.7.3 Agrégations, historiques, comparaisons
- Niveaux : match, saison, carrière, par adversaire, domicile/extérieur. Tendances : moyenne glissante sur 5 matchs avec flèche (↑ ≥ +10 %, ↓ ≤ -10 %). Comparaisons : joueur vs moyenne équipe, joueur vs lui-même saison précédente, deux joueurs côte à côte (si les deux ont partagé).
- Records personnels et d'équipe : détection automatique (« meilleur total de points », « plus longue série d'invincibilité ») avec carte de partage.
- Visuels : **carte de tirs** (xy sur terrain, vert = réussi), **heatmap de position** (GPS, 6.7bis, grille 10 x 6 m), radar de profil (6 axes normalisés par poste), courbes d'évolution. Accessibles : alternative textuelle et palette daltonien-safe (voir Partie 8).
- Classements internes : buteurs, passeurs, meilleurs notes, assiduité (présence ÷ convocations), fair-play. Visibles uniquement par l'équipe ; désactivables par le coach (surtout < 13 ans : par défaut **désactivés**, remplacés par un message de progression).

### 6.7.4 Homme du match et évaluation entre pairs
- **Vote** : 24 h après validation ; chaque membre présent vote pour un coéquipier (jamais pour soi) ; égalité = co-hommes du match ; badge + trophée (voir Partie 7). Pour les mineurs : choix par le coach seul.
- **Évaluation entre pairs** (1-5 sur critères : esprit d'équipe, engagement, ponctualité) : anonyme, agrégée, **affichée seulement si ≥ 5 évaluations**, jamais de texte libre, jamais sous 15 ans. Garde-fous : un évaluateur ne peut pas évaluer plus de 3 fois le même joueur par saison ; détection de campagne coordonnée (≥ 3 notes de 1 en 24 h sur une même cible) -> notes gelées, revue de modération ; un joueur peut masquer ses résultats ; signalement possible.

---

## 6.7bis Suivi physique en match et à l'entraînement

### 6.7bis.1 Enregistrement
Le joueur lance l'enregistrement de son téléphone/montre en mode « match » lié à un match d'équipe (réutiliser le moteur d'enregistrement de la Partie 3 : GPS 1 Hz, FC via capteur, accéléromètre). Métriques : distance totale, distance par zone de vitesse (marche < 7 km/h, course 7-14, haute intensité 14-21, sprint > 21 km/h, seuils par sport et profil), **nombre de sprints** (≥ 1 s au-dessus du seuil), vitesse max, accélérations/décélérations (> ± 2,5 m/s² sur ≥ 0,5 s), zones de FC (voir Partie 5 pour les zones), temps de jeu effectif (mouvement ≥ 1 km/h), charge de séance `sRPE = RPE × minutes` et charge FC (TRIMP, voir Partie 5).
Intérieur (basket, volley, squash) : pas de GPS ; FC + accéléromètre (sauts, changements de direction) seulement.

### 6.7bis.2 Heatmap et comparaison
Heatmap = histogramme 2D du temps passé par cellule, calée sur le terrain via 4 points de calage (coins) saisis une fois par terrain. Comparaison avec l'équipe : percentiles anonymes par défaut ; noms visibles **seulement** si chaque joueur concerné a activé le partage.

### 6.7bis.3 Confidentialité (strict)
Par défaut tout est **privé au joueur**. Il choisit, par catégorie (distance/vitesse, FC, charge, heatmap) : `rien`, `coach seulement`, `équipe`. Révocable à tout moment (les données déjà vues ne sont plus accessibles ensuite). Les données de santé (FC, blessures) ne sont jamais montrées aux autres joueurs sans consentement explicite et n'alimentent aucun classement. Mineurs : consentement parental requis pour tout partage au coach.

### 6.7bis.4 Charge, risque de blessure, temps de jeu
- La charge de match est envoyée au moteur du coach (voir Partie 5) sous forme `{ date, sport, duration, rpe, trimp, hi_distance, sprint_count }` ; le coach IA ajuste les séances J+1 et J+2 (récupération) et la prochaine séance de préparation.
- **Risque de blessure** (indicateur d'alerte, non diagnostique) : ratio charge aiguë/chronique `ACWR = charge_7j / moyenne_charge_28j` ; vert 0,8-1,3, orange 1,3-1,5 ou < 0,8, rouge > 1,5 ; additionnel : monotonie, hausse hebdomadaire > 30 %. Message prudent : « Ta charge a beaucoup augmenté ; envisage de récupérer », jamais de diagnostic (voir Partie 8 pour mentions de santé).
- **Temps de jeu** : minutes par joueur calculées à partir des remplacements ; règles configurables d'équité (ex. U13 : minimum 50 % du match) ; alerte coach à la fin de composition si un joueur ne passe pas le minimum ; tableau de répartition saison.

### 6.7.5 Critères d'acceptation 6.7 / 6.7bis
- `TS%` d'un joueur à 20 pts, 14 tirs, 4 lancers = 20 / (2 × (14 + 1,76)) = 63,5 %.
- Un joueur qui n'a rien partagé n'apparaît dans aucun tableau du coach, même agrégé ; le coach voit « donnée non partagée ».
- Un match enregistré de 90 min à RPE 7 ajoute 630 unités à la charge et déplace le ratio ACWR le jour même.
