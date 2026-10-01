# PARTIE 1 — Vision, positionnement, architecture et modèle de données

> Cette partie fixe le « pourquoi » et le « sur quoi on construit ». Toutes les autres parties (2 à 8) en dépendent. Quand une règle ci-dessous contredit une partie ultérieure, **cette partie fait foi** sauf mention explicite. Les éléments `[STACK_...]` sont des placeholders : l'assistant applique la recommandation de la section 1.6 sauf instruction contraire de l'utilisateur, et l'écrit dans `docs/adr/0001-stack.md`.

---

## 1.1 Vision, promesse et positionnement

### 1.1.1 Vision en une phrase

**[NOM_APP_SPORTS] est le carnet de bord et le coach unique de toute la vie cardio d'une personne** : il enregistre ce qu'elle fait (courir, marcher, randonner, rouler), comprend ce que cela coûte à son corps, et ajuste en continu entraînement, récupération et nutrition, y compris la musculation et les repas gérés dans [NOM_APP_FIT].

### 1.1.2 Promesse utilisateur (testable)

| # | Promesse | Test d'acceptation produit |
|---|----------|----------------------------|
| P1 | « Je n'ai plus à arbitrer seul entre mes disciplines. » | Un utilisateur qui court 3x, roule 1x et fait 2 séances de muscu reçoit un plan hebdomadaire où la séance jambes n'est jamais la veille de la sortie longue. |
| P2 | « Mon enregistrement ne me lâche jamais. » | Une sortie de 4 h en mode avion, app tuée par l'OS deux fois, est récupérée avec moins de 30 s de trou cumulé. |
| P3 | « On me dit la vérité sur ma forme. » | Chaque estimation (VO2max, forme, temps de course prévu) affiche une plage de confiance et sa source. |
| P4 | « Mes données m'appartiennent. » | Export complet en un geste (GPX/FIT/JSON), suppression de compte effective sous 30 jours, zones de confidentialité masquant domicile et travail. |
| P5 | « Un seul compte, deux apps. » | Un abonnement Ultra souscrit dans une app débloque les droits dans l'autre en moins de 10 s après achat, sans reconnexion. |

### 1.1.3 Différenciateur n°1 : le coach unique transversal

Le coach n'est pas un module de l'app : c'est une **couche transverse** qui lit un modèle unifié de la vie sportive (charge, sommeil, nutrition, blessures, agenda, objectifs) et écrit des recommandations dans trois canaux : plan d'entraînement, récupération, nutrition. Règle d'architecture : **aucun module sportif ne calcule sa propre recommandation**. Il publie des événements (`activity.completed`, `injury.reported`) et consomme des directives du coach (voir Partie 5). Conséquence : ajouter une discipline cardio (natation, ski de fond…) ne demande ni refonte du coach ni nouvelle logique de charge, seulement un adaptateur de charge (section 1.5.4). Ces disciplines ne sont pas spécifiées dans ce prompt : le moteur doit seulement rester extensible.

### 1.1.4 Positionnement face à l'existant

Principe : on n'est pas « un Strava de plus ». On est **le seul endroit où un coureur qui roule le week-end et soulève le jeudi obtient un plan cohérent**.

| Concurrent | Ce qu'il fait très bien | Sa limite | Notre réponse | Ce qu'on ne copie PAS |
|---|---|---|---|---|
| Strava | Social, segments, base installée | Pas de coach adaptatif réel, paywall sur l'analyse, pas de lien avec la musculation et la nutrition | Coach transverse, analyse de base gratuite | Segments comme moteur central (risques de sécurité en voie publique) ; flux d'activité public par défaut |
| Komoot | Planification d'itinéraires, rando | Peu d'entraînement, pas de charge | Itinéraire adapté à la forme du jour (Partie 4) | Paiement par région de carte |
| AllTrails | Catalogue de sentiers, avis | Qualité inégale des traces, peu d'offline gratuit | Traces vérifiées, offline dans Sports | Notes de sentiers anonymes non modérées |
| Runna | Plans de course très bien écrits | Course uniquement, plan figé hors vie réelle | Plan qui s'adapte à une séance manquée, une nuit courte ou une séance de muscu la veille | Tarif unique cher sans palier gratuit |
| TrainingPeaks | Modèle de charge (TSS, CTL/ATL/TSB) | Interface de coach pro, courbe d'apprentissage | Même rigueur, présentée en langage simple | Jargon brut par défaut (disponible en mode avancé) |
| Garmin Connect | Données capteurs profondes | Verrouillé à la montre, UX datée | Import de toutes montres, une seule vue | Dépendance matérielle |
| Hevy | Journal de musculation fluide | Mono-sport | Intégration native avec [NOM_APP_FIT] | Duplication de la muscu (on lit Fit, on ne la refait pas) |
| MyFitnessPal | Base d'aliments immense | Nutrition déconnectée de l'effort | Besoins caloriques recalculés sur la charge réelle de la semaine | Compteur de calories culpabilisant |
| Nike Run Club | Motivation, gratuité | Peu de personnalisation | Gratuit utile + coach | Gamification à base de streak punitif |
| Peloton | Contenu guidé, communauté | Cher, matériel, indoor | Séances guidées audio simples | Production vidéo studio |

### 1.1.5 Matrice de comparaison (capacités)

Légende : ● natif et solide, ◐ partiel/payant, ○ absent.

| Capacité | Nous | Strava | Komoot | AllTrails | Runna | TrainingPeaks | Garmin | NRC |
|---|---|---|---|---|---|---|---|---|
| Enregistrement GPS fiable offline | ● | ● | ● | ◐ | ◐ | ○ | ● | ◐ |
| Rando + cartes offline | ● | ◐ | ● | ● | ○ | ○ | ◐ | ○ |
| Plan adaptatif multi-sports | ● | ○ | ○ | ○ | ◐ | ◐ | ◐ | ○ |
| Plan lié à la musculation et à la nutrition | ● (via Fit) | ○ | ○ | ○ | ○ | ◐ | ○ | ○ |
| Charge unifiée tous sports + muscu | ● | ◐ | ○ | ○ | ○ | ● | ◐ | ○ |
| Nutrition liée à la charge | ● (via Fit) | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Sécurité (suivi live, détection de chute) | ● | ◐ | ◐ | ◐ | ○ | ○ | ◐ | ○ |
| Vie privée par défaut | ● | ◐ | ◐ | ◐ | ● | ● | ● | ◐ |

**Décision** : sur chaque ligne où l'on est en ● alors que le marché est en ○/◐, la fonctionnalité doit être démontrable en démo de 60 s. Sinon elle n'est pas prioritaire.

---

## 1.2 Personas

Chaque persona sert de **scénario de recette** : l'assistant crée un fichier `docs/personas/<id>.md` et un utilisateur seed correspondant (section 1.8).

| ID | Persona | Âge | Contexte |
|---|---|---|---|
| P1 | Camille, la coureuse débutante | 29 | Prépare ses premiers 10 km |
| P2 | Karim, le traileur | 34 | Trail 2x/semaine, musculation d'appoint |
| P3 | Hélène, la randonneuse de week-end | 52 | Rando 1 à 2 jours par semaine, parfois en solo |
| P4 | Thomas, le cycliste de commuting devenu gravel | 41 | Vélo-travail 4x/semaine, sorties longues |
| P5 | Inès, la duathlète amateur | 37 | Course et vélo enchaînés, charge élevée |
| P6 | Lucas, le lycéen coureur de demi-fond | 16 | Club d'athlétisme, course sur piste et cross, mineur |
| P7 | Marc, le retraité actif | 67 | Marche, vélo électrique, santé |
| P8 | Sofia, la coach indépendante | 33 | Entraîne 25 clients, vend des plans |
| P9 | Paul, l'utilisateur Fit pur qui découvre le sport | 27 | Muscu 4x, veut cardio sans perdre ses gains |
| P10 | Amina, l'animatrice d'un club de course | 31 | Organise sorties collectives et défis entre membres |

### 1.2.1 Détail des personas

**P1 Camille (débutante course, Plan : Gratuit puis Sports)**
- Objectifs : courir 10 km en 60 min dans 12 semaines sans se blesser.
- Frustrations : plans génériques trop durs, honte face aux allures des autres sur Strava, abandon après 3 semaines.
- Parcours : onboarding en 2 minutes (objectif, disponibilité, niveau auto-déclaré) → premier plan « marche/course » → enregistrement avec guidage audio → bilan simple (« séance réussie, repos demain ») → plan ajusté si une séance est manquée.
- Fonctions clés : plan débutant adaptatif, audio, comparaison à soi-même uniquement, messages d'encouragement non culpabilisants, alerte douleur → suspension du plan.
- Conversion : Sports vers la semaine 4 quand le plan adaptatif devient décisif (jamais bloquer une séance en cours).
- Cas limite : Camille déclare une douleur au genou ; le coach doit proposer repos et consultation, jamais « continuer progressivement ».

**P2 Karim (trail et musculation, Plan : Ultra)**
- Objectifs : finir un trail de 42 km / 2 000 m D+ en 7 h, garder sa force de jambes, perdre 4 kg sans perdre de muscle.
- Frustrations : les apps de course ignorent sa muscu ; il enchaîne séance jambes puis sortie longue ; ses descentes le détruisent et aucune app ne le mesure.
- Parcours : importe ses sorties de montre, le coach affiche « charge excessive en descente (D- cumulé 1 800 m), séance de gainage au lieu de la muscu jambes jeudi », propose un repas riche en glucides le soir via Fit.
- Fonctions clés : charge avec composante dénivelé négatif (Partie 5), plan trail, interférence muscu/course, nutrition de course liée.
- Conversion : Ultra dès qu'il active le lien avec Fit.

**P3 Hélène (randonnée, Plan : Sports)**
- Objectifs : rando de 15 km avec 800 m D+ en sécurité, partager sa position à sa fille.
- Frustrations : perte de réseau, batterie, traces peu fiables, peur de se perdre seule.
- Parcours : choisit un itinéraire, télécharge la carte, active le suivi live, reçoit alerte batterie à 20 %, alerte de déviation de trace.
- Fonctions clés : cartes offline, suivi live, SOS, estimation de durée honnête (Naismith ajusté + âge/forme), météo (Partie 4).
- Cas limite : trace sans réseau pendant 6 h ; le suivi live doit afficher « dernière position il y a 6 h », jamais « en ligne ».

**P4 Thomas (vélo, Plan : Sports)**
- Objectifs : sortie gravel 120 km, FTP progressif.
- Frustrations : capteurs de puissance mal synchronisés, doublons Strava/Garmin.
- Fonctions clés : BLE (puissance, cadence, FC), import FIT, dédoublonnage, charge TSS, segments privés, mode vélotaf (trajets récurrents regroupés).

**P5 Inès (triathlète, Plan : Ultra)**
- Objectifs : demi-Ironman dans 20 semaines.
- Frustrations : 3 outils pour 3 disciplines, charge fragmentée.
- Fonctions clés : charge unifiée, plan multi-disciplines, nutrition de course, import de montre, export vers coach externe.

**P6 Lucas (mineur, Plan : Gratuit via compte parent)**
- Objectifs : progresser sur 1 500 m et en cross avec son club d'athlétisme.
- Contraintes légales : < 15 ans (France) consentement parental ; jamais de publicité ciblée, profil privé forcé, pas de messages avec inconnus, pas de recommandations de perte de poids ni de plans à fort volume (Partie 8).
- Fonctions clés : journal de séances, défis amicaux sans classement public, plafonds de charge adaptés à l'âge.

**P7 Marc (senior, Plan : Gratuit ou Sports)**
- Objectifs : 8 000 pas/jour, rester actif après un problème cardiaque stabilisé.
- Frustrations : textes trop petits, jargon, notifications intempestives.
- Fonctions clés : mode simplifié (gros boutons, 3 écrans), détection de chute, contact de confiance, plafonds de FC conseillés avec avertissement « avis médical ».

**P8 Sofia (coach, Plan : Coach Pro [voir Partie 7])**
- Objectifs : gérer 25 clients, vendre des plans, voir leur charge.
- Fonctions clés : tableau de bord clients (avec consentement explicite par client), bibliothèque de séances, vente via marketplace, messagerie.
- Cas limite : un client retire son consentement ; l'accès aux données doit être coupé immédiatement, historique de messages conservé selon règle de rétention.

**P9 Paul (utilisateur Fit, Plan : Fit puis Ultra)**
- Objectifs : ajouter du cardio sans perdre en force.
- Fonctions clés : le coach détecte l'interférence (cardio long la veille d'une séance jambes), ajuste plan Fit et plan Sports ; identité partagée, pas de nouvelle inscription.

**P10 Amina (animatrice d'un club de course, Plan : Gratuit puis Sports)**
- Objectifs : organiser des sorties collectives hebdomadaires, lancer des défis de club, rassurer les nouvelles recrues.
- Fonctions clés : clubs, événements (sortie du mardi 19 h), invitations, défis de club, partage vers messagerie externe, parcours partagés (Partie 7).

### 1.2.2 Règle d'usage
Toute fonctionnalité de la roadmap (Partie 8) doit citer au moins un persona qui en bénéficie. Une fonctionnalité sans persona est refusée.

---

## 1.3 Principes produit et règles de décision

Chaque principe a une **règle exécutable** : en cas de doute pendant le développement, l'assistant applique la règle sans demander.

| # | Principe | Règle de décision | Exemple concret |
|---|---|---|---|
| D1 | Simplicité | Une action principale par écran. Toute fonction utilisée par < 10 % des actifs va dans « Avancé ». | Démarrer une course = 2 taps depuis l'écran d'accueil. |
| D2 | Offline-first | Toute action de l'utilisateur doit réussir sans réseau, puis se synchroniser. Une erreur réseau n'est jamais bloquante pour : enregistrer, consulter l'historique, voir le plan de la semaine, naviguer sur une carte téléchargée. | Fin de séance en forêt : l'activité est sauvegardée localement, un badge « en attente de sync » apparaît. |
| D3 | Vie privée par défaut | Nouveaux profils : privés. Activités : visibilité « moi seul » par défaut. Zones de confidentialité : proposées à l'onboarding avec rayon par défaut 200 m. Données de santé jamais envoyées à un tiers analytics. | Le premier partage demande explicitement la visibilité. |
| D4 | Sécurité de l'utilisateur d'abord | Aucune mécanique (segment, défi, trophée, classement) ne doit encourager un comportement dangereux : pas de classement de vitesse sur route ouverte, pas de défi « plus de km en 24 h », plafonds d'augmentation de charge. | Le coach refuse un plan avec +30 % de volume hebdomadaire. |
| D5 | Honnêteté des estimations | Toute valeur estimée (VO2max, FTP, temps d'arrivée, calories, charge) porte : valeur, plage, source, niveau de confiance (`low|medium|high`). Sous un seuil de données, on affiche « pas assez de données » plutôt qu'un chiffre. | VO2max : « 46 (±3) — estimée sur 5 sorties avec FC ». Jamais « 46,37 ». |
| D6 | Anti-dark-patterns | Interdits : compte à rebours artificiel, désabonnement plus long que l'abonnement, case pré-cochée de consentement, culpabilisation (« vous avez perdu votre série »), notifications de relance > 1/jour, essai gratuit sans date de fin visible. | Résiliation : 2 écrans max, depuis les réglages. |
| D7 | Le gratuit est vraiment utile | L'enregistrement d'activité de base, l'historique et l'export sont gratuits à vie. On ne retire jamais une donnée à un abonné qui revient en Gratuit : lecture seule, jamais suppression. | Après résiliation, ses 3 ans d'activités restent consultables. |
| D8 | Une source de vérité par donnée | Droits : serveur. Charge : calculée côté domaine pur, recalculable. Muscu/nutrition : [NOM_APP_FIT] reste propriétaire, on lit. | Pas de copie divergente d'une séance de muscu. |
| D9 | Réversibilité | Toute suppression destructive : confirmation + délai de grâce (30 jours pour le compte, 7 jours pour une activité en corbeille). | « Corbeille » visible dans l'historique. |
| D10 | Mesurer sans espionner | Analytics à base d'événements nommés et typés, sans coordonnées GPS ni données de santé brutes. Consentement requis hors mesure d'audience anonyme. | L'événement `activity_saved` contient sport, durée en tranche, pas de trace. |

**Arbitrage en cas de conflit** : sécurité > vie privée > honnêteté > simplicité > monétisation > croissance.

---

## 1.4 Indicateurs de succès

### 1.4.1 North Star
**« Semaines actives structurées » par utilisateur** : nombre de semaines où l'utilisateur a réalisé au moins 2 activités enregistrées dont au moins 1 conforme au plan du coach (ou 2 séances libres si pas de plan). Pourquoi : mesure l'habitude, pas les téléchargements, et est indépendante du sport.

### 1.4.2 Entonnoir et définitions

| Métrique | Définition précise | Cible lancement (T+3 mois) | Cible T+12 mois |
|---|---|---|---|
| Activation | % de nouveaux comptes enregistrant une activité (≥ 5 min ou ≥ 1 km) dans les 48 h | 45 % | 60 % |
| Onboarding terminé | % ayant fini ≤ 6 écrans | 75 % | 85 % |
| Rétention J1 / J7 / J30 | Retour avec ≥ 1 session dans la fenêtre | 40 / 22 / 12 % | 48 / 30 / 20 % |
| Rétention sem. 12 (utilisateurs avec plan) | Actifs semaine 12 | 25 % | 40 % |
| Conversion payant | Gratuit → payant sous 30 jours d'ancienneté | 3 % | 6 % |
| Conversion Fit vers Ultra | Abonnés Fit de [NOM_APP_FIT] qui prennent Ultra | 4 % | 10 % |
| Churn mensuel payant | Résiliations / abonnés début de mois | < 8 % | < 5 % |
| Enregistrements réussis | Activités sauvegardées sans perte / démarrées | ≥ 99,5 % | ≥ 99,9 % |
| Crash-free sessions | Sessions sans crash | ≥ 99,3 % | ≥ 99,7 % |
| NPS | Enquête in-app, jamais après paiement ni pendant effort | ≥ 30 | ≥ 45 |
| Note stores | Moyenne | ≥ 4,4 | ≥ 4,6 |
| Satisfaction coach | « Ce conseil m'a été utile » (pouce) | ≥ 70 % | ≥ 80 % |

### 1.4.3 Objectifs par phase

| Phase | Périmètre | Jalon chiffré |
|---|---|---|
| Alpha (interne, 20 testeurs) | Enregistrement endurance, sync | 0 perte de données sur 200 sorties |
| Bêta fermée (500) | + plans, cartes offline | Activation ≥ 40 %, J7 ≥ 18 % |
| Lancement endurance | Abonnements Sports/Ultra | 10 000 comptes, conversion ≥ 3 % |
| Phase 2 | Approfondissement par discipline (course, vélo, rando, Partie 6) | 25 % des actifs utilisent un plan spécifique à leur discipline |
| Phase 3 | Sports extensibles, marketplace | 50 coachs actifs, 5 % du CA |

### 1.4.4 Garde-fous (métriques à ne pas dégrader)
Temps de démarrage d'enregistrement < 2 s ; consommation batterie < 6 %/h GPS en écran éteint ; taux de remboursement < 3 % ; plaintes vie privée = 0 non traitées sous 72 h. Un changement qui dégrade un garde-fou de plus de 10 % est annulé (feature flag, section 1.5.13).

---

## 1.5 Architecture globale

### 1.5.1 Couches

```
┌──────────────────────────── Client mobile ────────────────────────────┐
│ UI (écrans, navigation, design system)                                │
│ Application (cas d'usage, orchestration, état)                        │
│ Domaine pur (charge, zones, estimations, règles de plan, scoring)     │
│ Infrastructure (GPS, BLE, capteurs santé, SQLite, sync, carte, push)  │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ HTTPS (REST /v1) + WebSocket (live)
┌───────────────────────────────▼───────────────────────────────────────┐
│ Passerelle API : auth, rate-limit, versionnement, idempotence         │
│ Services applicatifs (modules, section 1.5.3)                         │
│ Domaine pur partagé (même code que le client, package `domain`)       │
│ Infrastructure : Postgres+PostGIS, Redis, stockage objet, file jobs   │
└───────────────────────────────────────────────────────────────────────┘
```

**Règle du domaine pur** : le package `domain` n'importe rien d'infrastructure (pas de réseau, pas de base, pas d'horloge système, pas d'aléatoire non injecté). Il reçoit tout en paramètre (dont `now`), est testé unitairement à 90 % de couverture de branches et est **partagé** entre mobile et serveur pour garantir qu'une même activité produit la même charge des deux côtés.

### 1.5.2 Flux principal (texte)

```
Capteurs (GPS, FC, BLE) → Recorder (client) → SQLite locale (points toutes les 1 s, WAL)
  → fin de séance → Activity (statut local) → OutboxSync
  → POST /v1/sync/push (batch, Idempotency-Key) → Serveur : valide, stocke
  → événement activity.completed → jobs : lissage GPS, dédoublonnage, charge,
     records, trophées, notification
  → coach.recompute(userId) → directives (plan, récupération, nutrition)
  → GET /v1/sync/pull?cursor=… → client met à jour plan et stats
```

### 1.5.3 Modules (backend et client)

| Module | Responsabilité | Dépend de |
|---|---|---|
| `identity` | Compte unique de l'écosystème, sessions, appareils, MFA, consentements | — |
| `entitlements` | Droits issus des abonnements, vérification serveur (Partie 2) | identity, billing |
| `billing` | Achats stores/web, reçus, webhooks | identity, entitlements |
| `profile` | Profil, préférences, unités, zones de confidentialité | identity |
| `recording` | Machine d'état de l'enregistrement, tampon local (client surtout) | sensors |
| `sensors` | GPS, accéléromètre, BLE, HealthKit/Health Connect | — |
| `activities` | Activités, tours, flux de points, import/export GPX/FIT/TCX | media |
| `geo` | Itinéraires, POI, cartes hors ligne, élévation, snapping | activities |
| `safety` | Suivi live, détection de chute, contacts de confiance | geo, notifications |
| `load` | Charge d'entraînement toutes disciplines, fatigue, forme | activities, fit-bridge |
| `health` | Sommeil, FC repos, VFC, blessures, signaux de santé | profile |
| `coach` | Moteur de directives, IA conversationnelle, garde-fous | load, health, plans, fit-bridge |
| `plans` | Plans, séances, blocs, adaptation | coach |
| `disciplines` | Spécificités course, vélo, rando (zones, métriques, règles) | activities, load |
| `clubs` | Clubs d'endurance, événements collectifs | social, geo |
| `social` | Amis, fil, commentaires, messages, signalements, modération | identity |
| `gamification` | Défis, trophées, séries bienveillantes | activities, social |
| `marketplace` | Coachs, produits, ventes, versements | billing, plans |
| `fit-bridge` | Contrat d'échange avec [NOM_APP_FIT] (lecture seule) | identity |
| `notifications` | Push, e-mail, in-app, préférences, plafonds | identity |
| `sync` | Outbox, curseurs, résolution de conflits | tous les modules de données |
| `config` | Feature flags, config distante, expériences | identity |
| `analytics` | Événements typés, consentement | config |
| `admin` | Outils support, modération, RGPD | tous (lecture) |

**Règle de dépendance** : les flèches vont du haut vers le bas du tableau ; interdiction de cycle ; un module n'accède aux tables d'un autre que via son interface publique (`index.ts` / API interne). Une règle de lint (`dependency-cruiser` ou équivalent) l'impose en CI.

### 1.5.4 Adaptateurs de charge par sport
Le module `load` expose `LoadAdapter { sport; compute(activity, athleteProfile): LoadResult }` avec `LoadResult = { load_au: number, method: string, confidence: 'low'|'medium'|'high', components: {...} }`. Exemples : course = rTSS (allure/seuil) ou TRIMP si FC ; vélo = TSS (puissance) ; marche/rando = charge par dénivelé et durée ; trail = rTSS corrigée du dénivelé positif et négatif. Ajouter une discipline (natation, ski de fond…) = ajouter un adaptateur et un fichier de tests de référence, rien d'autre.

### 1.5.5 Événements internes
Bus interne (en processus au départ, file de messages ensuite) avec enveloppe versionnée :

```json
{
  "id": "01J9ZK3V0Y3E8Q7R6T5W4X2N1M",
  "type": "activity.completed",
  "version": 2,
  "occurred_at": "2026-10-01T07:12:44Z",
  "actor_user_id": "usr_01J9…",
  "idempotency_key": "act_01J9…#completed",
  "payload": { "activity_id": "act_01J9…", "sport": "run", "duration_s": 3120, "distance_m": 10040 }
}
```

Événements minimum : `activity.completed|updated|deleted`, `plan.generated|adapted`, `injury.reported|resolved`, `entitlement.changed`, `consent.changed`, `account.deletion_requested`, `follow.created`, `challenge.joined|completed`. Règle : un consommateur est **idempotent** (il stocke `event.id` traité) et tolère `version` inconnue (ignore les champs ajoutés, rejette une version majeure inconnue vers une file de rejeu).

---

### 1.5.6 API
- **Style** : REST JSON sous `/v1`, spécification **OpenAPI 3.1 générée** et publiée ; clients typés générés (pas de types écrits à la main côté mobile). GraphQL est écarté au lancement (cache HTTP, idempotence, simplicité d'audit) ; réévaluer si le fil social exige des agrégations flexibles.
- **Versionnement** : majeur dans l'URL (`/v1`). Changements additifs (nouveau champ optionnel) autorisés sans nouvelle version ; suppression ou changement de sens = `/v2` avec 12 mois de coexistence. Les anciennes versions d'app sont gérées par `min_supported_app_version` (config distante) et un écran « mise à jour requise » qui n'empêche jamais d'exporter ses données.
- **Conventions** : identifiants préfixés ULID (`act_`, `usr_`, `pln_`), dates ISO-8601 UTC, unités SI en base (mètres, secondes, m/s) et conversion à l'affichage, pagination par curseur (`?cursor=&limit=50`, max 200), erreurs au format RFC 9457 (`application/problem+json`) avec `code` stable (`ENTITLEMENT_REQUIRED`, `VALIDATION_FAILED`, `RATE_LIMITED`).
- **Idempotence** : toute écriture accepte `Idempotency-Key` (UUID) ; le serveur conserve clé + empreinte de requête + réponse 24 h ; même clé + empreinte différente = `409`.
- **Limites** : 600 req/min/utilisateur en lecture, 120 en écriture ; upload de flux GPS ≤ 5 Mo compressé par requête.
- **Droits** : un endpoint payant renvoie `402` avec `code=ENTITLEMENT_REQUIRED` et `required=["sports.plans"]` ; le client ne devine jamais les droits localement sans les avoir reçus du serveur (cache de droits avec expiration, Partie 2).

### 1.5.7 Synchronisation offline-first

**Modèle** : la base locale (SQLite) est la source pour l'UI. Chaque ligne synchronisable porte `id` (ULID généré côté client), `updated_at` (horloge hybride logique), `version` (entier incrémenté par le serveur), `deleted_at`, `device_id`. Une table `outbox(id, entity, entity_id, op, payload, idempotency_key, attempts, next_try_at)` stocke les mutations. Une table `sync_state(entity, cursor)` stocke le curseur de pull.

**Protocole** :
1. `POST /v1/sync/push` : lot de ≤ 100 mutations ordonnées ; réponse par mutation : `applied | conflict(server_version) | rejected(code)`.
2. `GET /v1/sync/pull?since=<cursor>` : changements serveur ordonnés par `server_seq` monotone ; le client applique dans une transaction puis avance le curseur.
3. Reprise : échec réseau → backoff exponentiel 2 s ×2 jusqu'à 15 min, avec gigue ±20 %. Les flux GPS lourds sont envoyés à part (section 1.5.10) et référencés.

**Résolution de conflits par type de donnée**

| Donnée | Stratégie | Détail |
|---|---|---|
| Activité (métadonnées : titre, description, sport, visibilité) | Dernier écrivain gagnant champ par champ | Comparaison par `updated_at` de champ ; égalité → serveur gagne |
| Flux de points GPS | Immuable après finalisation | Jamais fusionné ; une correction crée une `revision` |
| Tours (laps) | Dérivés | Recalculés depuis le flux ; jamais en conflit |
| Plan et séances | Serveur gagne pour la structure, client gagne pour le statut | `status=done` posé hors-ligne est conservé ; une séance replanifiée par le coach entre-temps est signalée à l'utilisateur |
| Objectifs, préférences | Dernier écrivain gagnant | |
| Matériel (kilométrage) | Recalculé | Somme dérivée des activités ; pas de valeur éditée directement sauf offset |
| Sortie collective (événement de club) | Journal d'inscriptions (append-only) | Les inscriptions/désinscriptions sont fusionnées par union, ordonnées par `occurred_at` ; la liste des participants est une projection |
| Commentaires/messages | Append-only | Pas de conflit ; suppression = marqueur |
| Suppression vs modification | Suppression gagne | Sauf corbeille : restaurable 7 jours |
| Droits/abonnement | Serveur uniquement | Jamais écrits par le client |

**Cas limites** : horloge du téléphone fausse (> 5 min d'écart avec le serveur) → le client envoie `client_clock_offset_ms` mesuré à la dernière réponse, le serveur corrige `updated_at` ; deux appareils enregistrent la même sortie (montre + téléphone) → dédoublonnage par chevauchement temporel > 80 % et distance de départ < 100 m, proposé à l'utilisateur, jamais fusionné silencieusement ; téléphone réinstallé → pull complet par pages avec reprise ; schéma local plus ancien que le serveur → migration locale avant tout pull.

**Critères d'acceptation** : test automatisé « deux appareils, 200 mutations croisées, coupures aléatoires » converge vers un état identique ; aucune activité n'est créée en double si le push est rejoué 5 fois.

### 1.5.8 Jobs asynchrones et files
- File de jobs durable (recommandation : BullMQ sur Redis ou pg-boss pour rester sur Postgres au début) ; une file par priorité : `critical` (traitement d'une activité, droits), `default` (charge, trophées), `bulk` (recalculs, exports, anonymisation).
- Tout job : idempotent, identifié (`job_id` déterministe), avec `max_attempts=5`, backoff exponentiel, file des morts (DLQ) alertée.
- Jobs minimum : `activity.process` (lissage, élévation corrigée, dédoublonnage), `load.recompute(user, from_date)`, `coach.recompute`, `notifications.dispatch`, `export.build`, `account.purge`, `retention.sweep` (quotidien), `billing.reconcile` (toutes les 6 h, compare stores et base), `tiles.build`.
- SLO : activité visible traitée en < 20 s au 95e centile après réception.

### 1.5.9 Cache
- Redis pour : sessions courtes, limites de débit, cache de droits (TTL 60 s, invalidé par `entitlement.changed`), classements, présence de suivi live.
- CDN pour tuiles et médias publics. Cache client : HTTP ETag sur ressources de lecture. **Règle** : jamais de cache de données personnelles dans le CDN.

### 1.5.10 Stockage de fichiers et flux GPS volumineux
- **Objets** (S3-compatible) : photos, médias de publication, fichiers FIT/GPX originaux, exports, packs de tuiles hors ligne. Buckets séparés : `private-user-originals`, `public-media`, `exports` (expiration 7 jours), `offline-packs`. Accès par URL signée de 15 min.
- **Flux de points** : un point = `t` (ms relatif), `lat`, `lon`, `ele`, `hr`, `cad`, `pwr`, `spd`, `acc`. Stockage en base **par segments de 1 000 points** dans une colonne binaire compressée (delta encoding des coordonnées en entiers 1e-7° puis zstd), avec une table de métadonnées indexée par `(activity_id, segment_index)`. Estimation : 4 h à 1 Hz = 14 400 points ≈ 60 à 110 Ko compressés. En complément, une **trace simplifiée** (Douglas-Peucker, tolérance 5 m) en colonne `geography(LineString)` pour la recherche spatiale, les cartes et les aperçus.
- **Partitionnement** : table des segments partitionnée par plage de `created_at` mensuelle ; archivage à 24 mois vers stockage objet froid (consultation à la demande, latence acceptée de 3 s). Les activités d'utilisateurs Gratuit conservent le flux complet (principe D7).
- **Upload** : multipart reprenable (chunks de 512 Ko), checksum SHA-256 par chunk, finalisation atomique.

### 1.5.11 Recherche
Au lancement, **Postgres seul** : `pg_trgm` (utilisateurs, clubs, lieux), `tsvector` français (itinéraires, publications), PostGIS (`ST_DWithin` pour « autour de moi »). Basculer vers un moteur dédié (Meilisearch ou Typesense) seulement si la latence p95 de recherche dépasse 300 ms ou si le catalogue dépasse 5 millions de documents.

### 1.5.12 Temps réel (suivi en direct)
- WebSocket (ou SSE pour le sens serveur→client) pour : suivi live d'une sortie par des proches, position des participants à une sortie de club (opt-in), messages.
- Position live : envoi toutes les 10 s en mouvement, 60 s à l'arrêt, avec tampon si offline ; la page de suivi public (lien sans compte) expire à la fin de l'activité + 2 h et n'expose jamais l'identité complète ni les zones masquées.
- Dégradation : si le temps réel est indisponible, repli sur polling toutes les 15 s. Détails sécurité dans la Partie 4.

### 1.5.13 Feature flags et configuration distante
- Table `feature_flags(key, enabled, rollout_pct, audience jsonb, min_app_version)` et `remote_config(key, value jsonb)` ; évaluation côté serveur pour tout ce qui touche aux droits, côté client pour l'UI, avec valeurs par défaut embarquées (l'app fonctionne si la config est injoignable).
- Un flag a un **propriétaire**, une **date d'expiration** et un ticket de suppression ; au-delà de 90 jours après 100 % de déploiement, la CI échoue (« flag périmé »).
- Kill switches obligatoires : `kill.live_tracking`, `kill.ai_coach`, `kill.new_sync`, `kill.maps_provider_a`.

### 1.5.14 Multi-tenant d'écosystème (identité partagée avec Fit)
- Un seul **compte** (`accounts`) pour [NOM_APP_FIT] et [NOM_APP_SPORTS]. Chaque app est une `application` (`fit`, `sports`) ; l'utilisateur a un enregistrement par app dans `app_memberships`.
- Fournisseur d'identité unique : OIDC (jetons d'accès 15 min, refresh 30 jours avec rotation, détection de réutilisation). Connexion croisée : « Continuer avec mon compte [NOM_APP_FIT] » sur l'écran d'accueil.
- Données partagées via **contrat versionné** `fit-bridge` (lecture seule par défaut) : poids, taille, objectif, séances de muscu terminées (date, groupes musculaires, volume), apports caloriques et macros du jour. **Chaque catégorie partagée exige un consentement par catégorie**, révocable, journalisé.
- Les droits sont une table commune `entitlements` (voir 1.7) ; le produit « Ultra » accorde les droits `fit.*` et `sports.*`. Le code des deux apps appelle la même API de droits.
- Cas limite : l'utilisateur supprime son compte dans une app → suppression de compte écosystème proposée avec choix explicite (« supprimer aussi [NOM_APP_FIT] ? »), jamais implicite.

### 1.5.15 Environnements
| Env | Usage | Données | Particularités |
|---|---|---|---|
| `dev` | Local (docker compose) | Seed (1.8) | Paiements en bac à sable, stockage local MinIO |
| `staging` | Recette, bêta interne | Données synthétiques uniquement | Mêmes versions que prod, flags libres, webhooks stores en sandbox |
| `prod` | Production | Réelles | Migrations en deux temps, sauvegardes PITR 14 jours, alerte astreinte |

Règle : aucune donnée réelle en dehors de `prod`, aucune clé de prod hors du gestionnaire de secrets, parité d'infrastructure (même version Postgres/PostGIS) vérifiée en CI.

### 1.5.16 Monorepo ou multi-repo
**Recommandation : monorepo** (pnpm workspaces + Turborepo ou Nx) : `apps/mobile`, `apps/api`, `apps/web`, `packages/domain`, `packages/api-client` (généré), `packages/ui`, `packages/schemas`. Raison : le domaine pur partagé et les contrats générés évoluent ensemble, un seul PR change serveur et client. Alternative multi-repo : seulement si des équipes distinctes et un rythme de release très différent apparaissent. L'intégration avec [NOM_APP_FIT] se fait par un package de contrats versionné publié (`@eco/contracts`), pas par import de code.

### 1.5.17 Gestion des erreurs et logs
- Erreurs typées : `DomainError` (règle métier violée), `ValidationError`, `AuthError`, `EntitlementError`, `InfraError` (réessayable). Seules les `InfraError` déclenchent des retries.
- Côté client, jamais d'écran blanc : chaque écran a des états `loading|empty|error|offline` explicites (voir Partie 8). Messages d'erreur en français clair avec action (« Réessayer », « Voir hors ligne »).
- Logs structurés JSON : `ts, level, service, env, request_id, user_id_hash, event, duration_ms`. **Interdit dans les logs** : coordonnées GPS, jetons, e-mail en clair, données de santé, contenu de messages. `request_id` propagé du mobile aux jobs.
- Observabilité : traces distribuées (OpenTelemetry), métriques RED, alertes sur SLO (taux d'erreur sync, latence de traitement d'activité, DLQ non vide). Rétention logs 30 jours.

---

## 1.6 Recommandation de stack

Le choix est un **placeholder par défaut** ; l'assistant le confirme en 10 lignes puis l'applique. Critères de pondération : fiabilité GPS en arrière-plan (30 %), vitesse de livraison (20 %), partage de code domaine (15 %), coût (15 %), recrutement (10 %), maturité écosystème sport (10 %).

| Composant | Recommandation `[STACK_...]` | Pourquoi | Alternatives (quand les préférer) |
|---|---|---|---|
| Mobile `[STACK_MOBILE]` | **React Native (Expo, nouvelle architecture) + TypeScript**, modules natifs Swift/Kotlin pour GPS, BLE, HealthKit/Health Connect | Un seul code pour 2 OS, domaine TS partagé avec le serveur, OTA pour correctifs d'UI | **Flutter** si l'équipe maîtrise Dart et privilégie le rendu cartographique custom ; **natif Swift/Kotlin** si l'enregistrement en arrière-plan et la montre (Wear OS/watchOS) deviennent le cœur et si le budget le permet |
| Backend `[STACK_BACKEND]` | **TypeScript (NestJS ou Fastify) modulaire monolithique** | Même langage que le domaine, modules = section 1.5.3, extraction en services plus tard | **Kotlin/Spring** (équipe JVM), **Go** (si le traitement de flux devient critique) |
| Base `[STACK_DB]` | **PostgreSQL 16 + PostGIS + TimescaleDB optionnel** | Relationnel solide, géospatial mûr, séries temporelles si besoin | Aurora/Cloud SQL managé ; MongoDB à éviter (relations nombreuses, intégrité de droits) |
| Base locale mobile | **SQLite** (op-sqlite ou WatermelonDB) | Offline-first éprouvé | Realm (maintenance incertaine : à éviter) |
| Cache/files `[STACK_QUEUE]` | **Redis + BullMQ** | Simple, performant | pg-boss (moins d'infra), SQS/Pub/Sub (si cloud unique) |
| Stockage `[STACK_STORAGE]` | **S3-compatible** (Cloudflare R2 pour l'absence de frais de sortie) | Coût | AWS S3, GCS |
| Cartes `[STACK_MAPS]` | **MapLibre GL + tuiles vectorielles** (MapTiler/Stadia en démarrage, auto-hébergement OSM ensuite) ; relief et sentiers OSM + données d'altitude ouvertes | Pas de verrou fournisseur, offline possible | Mapbox (meilleure qualité clé en main, coût élevé à l'échelle) ; Apple/Google Maps (pas de sentiers offline) |
| Notifications `[STACK_PUSH]` | **FCM + APNs via un orchestrateur maison léger** ; e-mail via Postmark/Resend | Contrôle des plafonds et préférences | OneSignal (rapide, données chez un tiers) |
| Paiements `[STACK_PAY]` | **RevenueCat** pour les achats in-app + Stripe pour le web et la marketplace (Stripe Connect) | Reçus unifiés, webhooks, essais | StoreKit 2/Play Billing directs (moins de coût, plus de code) |
| Analytics `[STACK_ANALYTICS]` | **PostHog (auto-hébergé UE)** | Respect des données, flags/expériences | Amplitude, Mixpanel (hébergement hors UE à justifier) |
| Erreurs/crashs | Sentry | Standard | Firebase Crashlytics |
| IA `[STACK_LLM]` | API LLM derrière une couche d'abstraction maison, sans données brutes identifiantes, journal des prompts anonymisé (Partie 5) | Remplaçable | Modèle auto-hébergé pour tâches simples |
| CI/CD `[STACK_CI]` | **GitHub Actions + EAS Build + Fastlane**, déploiement par Terraform | Écosystème | GitLab CI, Bitrise |
| Hébergement | Conteneurs managés (Fly.io/Render au départ, puis AWS/GCP UE) | Rapidité puis conformité | Kubernetes seulement > 20 services |

**Ordres de grandeur de coût mensuel (hors salaires)** : 1 000 MAU ≈ 150–300 € ; 10 000 MAU ≈ 1 200–2 500 € (dont tuiles/cartes 300–800 €, LLM 200–600 €) ; 100 000 MAU ≈ 12 000–30 000 €. Le poste dominant à l'échelle est l'IA conversationnelle et les cartes ; le coach garde donc un **plafond de tokens par utilisateur et par jour** et met en cache les directives calculées par règles (l'IA reformule, ne calcule pas).

**Hébergement des données** : région UE exclusivement pour les données personnelles ; sous-traitants documentés dans un registre `docs/compliance/subprocessors.md` (Partie 8).

---

## 1.7 Modèle de données complet

### 1.7.1 Conventions globales (valables pour toutes les tables)
- Clé primaire `id text` = préfixe + ULID (`act_01J9…`), générée côté client si l'entité est créable hors ligne.
- Colonnes communes : `created_at timestamptz not null default now()`, `updated_at timestamptz not null`, `deleted_at timestamptz null` (soft delete), `version int not null default 1`, `server_seq bigint` (séquence globale pour la synchronisation).
- Unités SI en base. Temps en UTC, fuseau stocké à part (`tz text`, nom IANA) pour afficher l'heure locale de l'activité.
- Données sensibles marquées `[S]` (santé), `[G]` (géolocalisation), `[P]` (identifiant personnel), `[F]` (financier). Les colonnes `[S]` et `[G]` sont chiffrées au repos (chiffrement disque + chiffrement applicatif par enveloppe pour `health_*` et `injuries`), exclues des logs, des exports analytics et des environnements non-prod.
- Tout `enum` est un `text` avec contrainte `CHECK` (évolution sans migration lourde).
- Chaque table de données utilisateur a un index `(user_id, updated_at)` pour le pull de synchronisation.

### 1.7.2 Tables centrales en SQL

```sql
-- IDENTITÉ (partagée avec Fit)
create table accounts (
  id text primary key,                         -- acc_
  email citext unique not null,                -- [P]
  email_verified_at timestamptz,
  password_hash text,                          -- argon2id, null si SSO seul
  status text not null default 'active' check (status in ('active','suspended','pending_deletion','deleted')),
  birth_date date,                             -- [P] sert à calculer le statut de mineur
  country text, locale text not null default 'fr-FR',
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table app_memberships (
  account_id text references accounts(id),
  app text check (app in ('fit','sports')),
  joined_at timestamptz not null default now(),
  primary key (account_id, app)
);

create table profiles (
  account_id text primary key references accounts(id),
  display_name text not null check (char_length(display_name) between 2 and 40),
  handle citext unique not null,               -- @pseudo
  avatar_url text,
  height_cm numeric(5,1), weight_kg numeric(5,1),   -- [S]
  sex_at_birth text check (sex_at_birth in ('f','m','x','undisclosed')),  -- [S] usage : formules physiologiques
  max_hr int check (max_hr between 120 and 230),    -- [S]
  resting_hr int, lthr int, ftp_w int, threshold_pace_s_per_km int,  -- [S] seuils, chacun avec source
  profile_visibility text not null default 'private' check (profile_visibility in ('private','friends','public')),
  privacy_zones jsonb not null default '[]',   -- [G] [{lat,lon,radius_m,label}]
  updated_at timestamptz not null default now(), version int not null default 1
);

create table preferences (
  account_id text primary key references accounts(id),
  units text not null default 'metric', week_start smallint not null default 1,
  default_activity_visibility text not null default 'private',
  audio_cues jsonb, notification_prefs jsonb, simplified_mode boolean not null default false,
  updated_at timestamptz not null default now(), version int not null default 1
);

create table devices (
  id text primary key,                         -- dev_
  account_id text not null references accounts(id),
  platform text check (platform in ('ios','android','web','garmin','wearos','watchos')),
  push_token text, app_version text, last_seen_at timestamptz, revoked_at timestamptz
);

-- ACTIVITÉS
create table activities (
  id text primary key,                         -- act_
  user_id text not null references accounts(id),
  sport text not null,                         -- run, walk, hike, ride, ... extensible via table sports
  sub_sport text, source text not null check (source in ('app','import_fit','import_gpx','import_tcx','manual','health_platform','partner')),
  external_id text,                            -- id chez le partenaire
  title text, description text, started_at timestamptz not null, tz text not null,
  elapsed_s int not null, moving_s int not null,
  distance_m numeric(10,1), elevation_gain_m numeric(7,1), elevation_loss_m numeric(7,1),
  avg_hr smallint, max_hr smallint, avg_power_w smallint, calories_kcal int,
  load_au numeric(7,2), load_method text, load_confidence text,   -- dérivés
  start_point geography(Point,4326),           -- [G]
  route_simplified geography(LineString,4326), -- [G] tolérance 5 m
  bbox box2d,
  visibility text not null default 'private' check (visibility in ('private','friends','public')),
  perceived_effort smallint check (perceived_effort between 1 and 10),
  gear_id text references gear(id), route_id text references routes(id), plan_session_id text,
  dedupe_group text,                           -- regroupe doublons montre/téléphone
  stream_status text not null default 'pending' check (stream_status in ('pending','ready','archived','missing')),
  device_id text, client_created_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null,
  deleted_at timestamptz, version int not null default 1, server_seq bigint,
  unique (user_id, source, external_id)
);
create index activities_user_started on activities (user_id, started_at desc) where deleted_at is null;
create index activities_user_sync on activities (user_id, server_seq);
create index activities_route_gix on activities using gist (route_simplified);
create index activities_dedupe on activities (user_id, dedupe_group);

create table activity_streams (                -- segments compressés
  activity_id text references activities(id) on delete cascade,
  segment_index int, point_count int not null, t_start_ms bigint not null,
  codec text not null default 'delta-zstd-v1', data bytea not null,  -- [G] [S]
  created_at timestamptz not null default now(),
  primary key (activity_id, segment_index)
) partition by range (created_at);

create table laps (
  id text primary key, activity_id text not null references activities(id) on delete cascade,
  idx int not null, trigger text check (trigger in ('manual','distance','time','auto_pause','interval')),
  start_offset_s int, duration_s int, distance_m numeric(9,1), avg_hr smallint, elevation_gain_m numeric(6,1),
  unique (activity_id, idx)
);
```

### 1.7.3 Géographie, plans, charge, clubs, droits

```sql
create table routes (
  id text primary key,                         -- rte_
  owner_id text references accounts(id), title text not null, sport text not null,
  geometry geography(LineString,4326) not null, -- [G]
  distance_m numeric(10,1), ascent_m numeric(7,1), descent_m numeric(7,1),
  difficulty text check (difficulty in ('easy','moderate','hard','expert')),
  surface_profile jsonb,                       -- part de sentier, route, gravier
  source text check (source in ('user','generated','import','curated')),
  visibility text not null default 'private', verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null, deleted_at timestamptz, version int default 1
);
create index routes_geom on routes using gist (geometry);

create table pois (
  id text primary key, kind text not null check (kind in ('water','shelter','summit','parking','danger','viewpoint','refuge','custom')),
  name text, location geography(Point,4326) not null, created_by text references accounts(id),
  osm_ref text, status text default 'active' check (status in ('active','reported','removed'))
);
create index pois_gix on pois using gist (location);

create table training_plans (
  id text primary key, user_id text not null references accounts(id), goal_id text,
  origin text check (origin in ('coach_ai','template','marketplace','human_coach')),
  title text not null, start_date date not null, end_date date,
  status text not null default 'active' check (status in ('draft','active','paused','completed','abandoned')),
  generation_params jsonb not null, engine_version text not null,
  updated_at timestamptz not null, version int not null default 1
);

create table planned_sessions (
  id text primary key, plan_id text not null references training_plans(id) on delete cascade,
  user_id text not null, scheduled_on date not null, sport text not null,
  kind text check (kind in ('easy','long','tempo','intervals','recovery','strength_ref','race','rest','cross')),
  blocks jsonb not null,                       -- [{type:'warmup',duration_s:600,target:{zone:2}}, ...]
  target_load_au numeric(6,1), status text not null default 'planned'
    check (status in ('planned','done','skipped','moved','adapted')),
  adapted_from text, adaptation_reason text,   -- traçabilité de chaque ajustement du coach
  fit_session_ref text,                        -- référence lecture seule vers séance Fit
  completed_activity_id text references activities(id)
);
create index ps_user_date on planned_sessions (user_id, scheduled_on);

create table daily_load (                      -- agrégat recalculable
  user_id text, day date, load_au numeric(7,2) not null, by_sport jsonb,
  acute_7d numeric(7,2), chronic_28d numeric(7,2), form numeric(7,2), model_version text not null,
  primary key (user_id, day)
);

create table health_signals (                  -- [S] sommeil, FC repos, VFC, poids
  id text primary key, user_id text not null, kind text not null check (kind in ('sleep_h','rhr','hrv_ms','weight_kg','soreness','mood','steps')),
  value numeric not null, measured_at timestamptz not null, source text not null
);
create table injuries (                        -- [S]
  id text primary key, user_id text not null, body_part text not null, severity smallint check (severity between 1 and 3),
  started_on date not null, resolved_on date, notes_encrypted bytea
);

create table goals (
  id text primary key, user_id text not null, kind text check (kind in ('race','distance','weekly_volume','weight','event','habit')),
  sport text, target jsonb not null, due_on date, status text default 'active'
);
create table gear (
  id text primary key, user_id text not null, kind text check (kind in ('shoes','bike','racket','boots','other')),
  name text not null, retired_at timestamptz, alert_after_m int, offset_m int not null default 0
);

-- CLUBS ET ÉVÉNEMENTS (endurance uniquement)
create table clubs (
  id text primary key,                         -- clb_
  name text not null, discipline text not null check (discipline in ('run','ride','hike','walk','multi')),
  city text, owner_id text not null references accounts(id),
  visibility text not null default 'private' check (visibility in ('private','invite','public')),
  invite_code text unique, created_at timestamptz not null default now(), deleted_at timestamptz
);
create table club_members (
  club_id text references clubs(id), user_id text references accounts(id),
  role text not null check (role in ('owner','admin','member')),
  joined_at timestamptz default now(), left_at timestamptz, primary key (club_id, user_id)
);
create table events (
  id text primary key,                         -- evt_
  club_id text references clubs(id), organizer_id text not null references accounts(id),
  title text not null, discipline text not null, starts_at timestamptz not null, tz text not null,
  meeting_point geography(Point,4326),         -- [G]
  route_id text references routes(id), pace_group jsonb, max_participants int,
  kind text check (kind in ('group_run','group_ride','group_hike','race','virtual')),
  status text default 'scheduled' check (status in ('scheduled','cancelled','done')),
  updated_at timestamptz not null, version int default 1
);
create table event_registrations (             -- append-only, projection = participants
  id text primary key, event_id text not null references events(id) on delete cascade,
  user_id text not null references accounts(id), action text not null check (action in ('join','leave','waitlist')),
  occurred_at timestamptz not null, device_id text
);

-- DROITS ET ACHATS (détail Partie 2)
create table entitlements (
  id text primary key, account_id text not null references accounts(id),
  feature text not null,                       -- ex. 'sports.plans', 'fit.coach'
  granted_by text not null check (granted_by in ('subscription','trial','promo','gift','admin','grace')),
  product_id text, source_purchase_id text, starts_at timestamptz not null, expires_at timestamptz,
  revoked_at timestamptz, created_at timestamptz default now()
);
create index ent_active on entitlements (account_id, feature) where revoked_at is null;
create table purchases (                       -- [F]
  id text primary key, account_id text not null, store text check (store in ('apple','google','stripe','promo')),
  store_transaction_id text not null, product_id text not null, status text not null,
  period_start timestamptz, period_end timestamptz, price_cents int, currency char(3),
  raw_receipt_ref text, unique (store, store_transaction_id)
);
create table consents (
  id text primary key, account_id text not null, purpose text not null,   -- 'analytics','health_data','fit_bridge:nutrition','coach_share:<coach_id>'
  granted boolean not null, policy_version text not null, granted_at timestamptz not null default now(),
  ip_hash text, source text, unique (account_id, purpose, granted_at)
);
```

### 1.7.4 Entités complémentaires (champs essentiels, types, contraintes)

| Entité | Champs clés | Contraintes / index | Rétention | Sensibilité |
|---|---|---|---|---|
| `challenges` | id, title, kind (`distance|duration|elevation|streak|club`), rules jsonb, starts_at, ends_at, visibility, created_by | check `ends_at > starts_at` ; max 365 j | 2 ans après fin | — |
| `challenge_participants` | challenge_id, user_id, progress jsonb, joined_at | PK composite | idem | — |
| `trophies` / `user_trophies` | code unique, tier, criteria jsonb / user_id, trophy_code, earned_at, activity_id | unique (user_id, trophy_code, tier) | durée du compte | — |
| `follows` | follower_id, followee_id, status (`pending|accepted|blocked`) | unique ; index inverse | durée du compte | [P] |
| `posts` | id, author_id, activity_id?, body (≤ 2000), media_ids, visibility | index (author_id, created_at desc) | soft delete 30 j | [P] [G] |
| `comments` | id, post_id, author_id, parent_id, body (≤ 1000) | index (post_id, created_at) | suit le post | [P] |
| `reactions` | post_id, user_id, kind | PK composite | suit le post | — |
| `messages` / `conversations` | conversation_id, sender_id, body, sent_at, read_at | partition par mois ; participants max 50 | 24 mois, ou suppression à la demande | [P] |
| `notifications` | id, user_id, type, payload, channel, sent_at, read_at, dedupe_key | unique (user_id, dedupe_key) ; plafond 1 relance/jour | 90 jours | — |
| `reports` | id, reporter_id, target_type, target_id, reason, status, handled_by, handled_at | index (status, created_at) | 3 ans (obligations légales) | [P] |
| `blocks` | blocker_id, blocked_id | PK composite ; appliqué à tous les modules sociaux | durée du compte | — |
| `coaches` | account_id, bio, certifications jsonb, verified_at, stripe_account_id, commission_pct | verified_at requis pour vendre | durée du compte + 5 ans pour pièces comptables | [P] [F] |
| `coach_clients` | coach_id, client_id, status, consent_id, scopes text[] | accès coupé dès `status != 'active'` | historique des consentements conservé | [S] |
| `marketplace_products` | id, coach_id, kind (`plan|session_pack|subscription`), price_cents, currency, status, plan_template_id | status `published` après revue | 5 ans (comptabilité) | [F] |
| `sales` | id, product_id, buyer_id, amount_cents, fee_cents, payout_id, refunded_at | immuable (écritures inverses) | 10 ans | [F] |
| `audit_log` | id, actor_id, actor_type, action, target_type, target_id, diff jsonb, ip_hash, at | append-only, index (target_type, target_id, at) | 12 mois (13 pour accès support) | [P] |
| `imports` | id, user_id, source, file_ref, status, error_code, created_at | — | fichier 30 j | [G] |
| `live_sessions` | id, activity_id, share_token_hash, contacts jsonb, last_position, last_seen_at, expires_at | token haché ; expiration forcée | 7 jours après fin | [G] |
| `sports` | code pk, family (`endurance`, extensible), discipline (`run|ride|hike|walk`), load_adapter, stat_schema jsonb, enabled | catalogue extensible | — | — |

### 1.7.5 Règles de rétention et données sensibles
- **Flux GPS bruts** : conservés tant que le compte existe (principe D7) ; archivés à froid après 24 mois. **Positions du suivi live** : supprimées 7 jours après la fin.
- **Données de santé** (`health_signals`, `injuries`, FC, poids) : chiffrées, accessibles uniquement par l'utilisateur, le coach avec consentement actif, et le moteur coach ; jamais exportées vers analytics ni vers un modèle externe sans pseudonymisation.
- **Compte supprimé** : jours 0–30 = `pending_deletion` (restaurable, données inaccessibles aux autres) ; jour 30 = purge dure via `account.purge` ; sauvegardes purgées à J+35 ; conservation légale limitée aux achats et ventes (identifiant remplacé).

### 1.7.6 Soft delete, audit, anonymisation
- **Soft delete** : `deleted_at` posé, ligne exclue par les index partiels et les vues `active_*`. Purge dure par `retention.sweep` après 7 jours (activités), 30 jours (publications), sauf conservation légale. Un élément supprimé reste dans le flux de pull comme **tombstone** (`id`, `deleted_at`) 90 jours pour que les appareils hors ligne se mettent à jour.
- **Audit** : toute opération sensible (changement de droits, accès support à des données, export, suppression, changement de consentement, accès d'un coach à un client) écrit dans `audit_log`, dans la même transaction. Aucune modification ni suppression de cette table en applicatif (rôle sans `UPDATE/DELETE`).
- **Anonymisation** : à la suppression, `anonymize_user(account_id)` remplace `display_name` par « Ancien utilisateur », `handle` par `deleted_<hash>`, vide e-mail et avatar, conserve les contenus agrégés non identifiants (statistiques agrégées d'un club) avec `linked_user_id = null`. Pour l'analytics et les jeux de test : généralisation des positions (arrondi 3 décimales ≈ 100 m), bruit sur la date de naissance (±6 mois), suppression des zones de confidentialité.

### 1.7.7 Migrations et versionnement des schémas
- **Migrations** : outil unique (`[STACK_MIGRATIONS]` : Drizzle Kit, Prisma Migrate ou Atlas), fichiers SQL versionnés, jamais modifiés après fusion. Règle **expand / migrate / contract** : (1) ajouter colonne nullable, (2) double écriture et backfill par job, (3) basculer la lecture, (4) supprimer dans une release ultérieure. Chaque migration doit être réversible ou accompagnée d'un plan de retour écrit. Test CI : appliquer toutes les migrations sur une base vide **et** sur un dump anonymisé de staging.
- **Verrous** : interdiction de `ALTER TABLE` bloquant sur tables > 1 M de lignes sans `CONCURRENTLY`/`NOT VALID` puis `VALIDATE`.
- **Schémas d'événements et de JSON** (`blocks`, `rules`, `score`, `payload`) : champ `schema_version` obligatoire, registre dans `packages/schemas` (JSON Schema), compatibilité **arrière** vérifiée en CI (un nouveau schéma doit valider les anciens exemples enregistrés). Les lecteurs sont tolérants ; une « upcaster » convertit chaque ancienne version vers la courante à la lecture.
- **Schéma local mobile** : numéro de version SQLite, migrations ordonnées et testées depuis chaque version publiée des 12 derniers mois.

---

## 1.8 Données de test et de seed

### 1.8.1 Fixtures
Dossier `fixtures/` versionné (fichiers ≤ 2 Mo chacun, sans donnée réelle) :
- `gpx/` : 12 traces réalistes générées par script reproductible (graine fixe) : course 10 km urbaine, trail 18 km 900 m D+, rando 15 km avec pause de 1 h, vélo 80 km, trace avec tunnel (perte GPS de 90 s), trace avec saut GPS de 400 m, trace avec timestamps non monotones, trace à 0 point d'altitude, trace de 6 h, trace traversant le méridien de changement de date (cas test), trace à l'arrêt total (bruit GPS), trace très courte (< 50 m).
- `fit/` : 8 fichiers (course avec FC, vélo avec puissance et cadence, activité multi-disciplines (course + vélo), fichier tronqué, fichier avec champs développeurs, doublon d'un GPX, fichier d'une version de firmware ancienne).
- `events/` : 4 sorties de club (course avec 3 groupes d'allure, rando avec désistements de dernière minute, événement annulé, inscription faite hors ligne depuis 2 appareils).
- `streams/` : flux binaires pour tests de compression (aller-retour sans perte à 1e-7°).

### 1.8.2 Utilisateurs seed
Un utilisateur par persona (section 1.2), mot de passe local `dev-only`, domaine `@example.test`. Chacun a un historique de 6 mois généré avec une **charge réaliste** (progression, semaine de repos toutes les 4 semaines, 1 blessure pour Camille, 1 coupure de 3 semaines pour Marc). Karim possède un lien Fit actif avec 20 séances de muscu ; Sofia a 25 clients dont 3 avec consentement retiré ; Lucas est mineur avec compte parent ; Amina anime un club de 40 membres.

### 1.8.3 Scénarios de bout en bout (obligatoires en CI nocturne)
1. Enregistrement 4 h avec 2 coupures réseau et un kill d'app → activité complète, un seul enregistrement serveur.
2. Doublon montre + téléphone → proposition de fusion, pas de fusion silencieuse.
3. Achat Ultra sur mobile → droits `fit.*` et `sports.*` actifs en < 10 s ; remboursement → droits retirés au prochain cycle de réconciliation.
4. Inscription à une sortie de club faite par deux appareils hors ligne → liste de participants identique après sync.
5. Suppression de compte → aucun enregistrement `[P]` ou `[G]` après J+30 (requête de contrôle automatisée).
6. Utilisateur Gratuit qui revient de Sports → lecture seule de ses plans, aucune donnée perdue.
7. Horloge du téléphone décalée de 2 h → dates d'activité cohérentes.
Un script `pnpm seed:dev` recrée tout en < 60 s ; `pnpm seed:scale` génère 100 000 utilisateurs et 20 M de points pour les tests de performance (requête « mes 30 dernières activités » < 50 ms p95).

---

## 1.9 Standards de code et de travail

### 1.9.1 Structure de dossiers recommandée

```
/
├─ apps/
│  ├─ mobile/            (src/{ui,features,application,infra}, native/{ios,android})
│  ├─ api/               (src/modules/<module>/{domain,application,infra,http})
│  └─ web/               (site, pages de suivi live, back-office)
├─ packages/
│  ├─ domain/            (pur : load/, zones/, estimates/, plan-rules/, scoring/)
│  ├─ schemas/           (JSON Schema + types générés, événements)
│  ├─ api-client/        (généré depuis OpenAPI)
│  ├─ ui/                (design system, Partie 8)
│  └─ config/            (eslint, tsconfig, prettier)
├─ fixtures/  ├─ docs/{adr,personas,runbooks,compliance}  ├─ infra/ (Terraform, docker)  └─ scripts/
```

### 1.9.2 Règles de code
- TypeScript `strict`, aucun `any` sans commentaire `// ANY: raison` ; erreurs de lint = échec de build ; formatage automatique (Prettier).
- Fonctions ≤ 40 lignes recommandées, fichiers ≤ 400 lignes ; pas de logique métier dans les composants d'UI ni dans les contrôleurs HTTP.
- Horloge, aléatoire, identifiants injectés (testabilité). Pas de singleton global mutable.
- Toute formule physiologique est dans `packages/domain`, avec **source citée en commentaire** (référence publique), valeurs de référence testées et `model_version`.
- Textes visibles : fichiers de traduction, jamais de chaîne en dur ; français d'abord, clés prêtes pour d'autres langues.
- Pas de secret en dépôt (scan en CI) ; dépendances épinglées, audit de vulnérabilités hebdomadaire.

### 1.9.3 Branches, commits, revues
- **Branches** : trunk-based, branches courtes `feat/<module>-<sujet>`, `fix/…`, `chore/…` (vie ≤ 3 jours), fusion par squash après CI verte.
- **Commits** : Conventional Commits (`feat(load): ajoute la correction de dénivelé négatif en trail`), un sujet par commit, corps expliquant le pourquoi.
- **Revue** : 1 relecteur minimum, 2 pour `entitlements`, `billing`, `identity`, `sync`, migrations et tout code touchant des données `[S]`/`[G]`. Checklist de PR : tests, droits vérifiés côté serveur, aucun log sensible, états offline/erreur, accessibilité, flag si risque, doc mise à jour.

### 1.9.4 Définition de « terminé » (DoD)
Une tâche n'est terminée que si toutes les cases sont vraies :
1. Critères d'acceptation de la partie concernée validés par un test automatisé ou une démonstration écrite.
2. Tests unitaires (domaine ≥ 90 % de branches), test d'intégration pour chaque endpoint, test de contrat OpenAPI à jour.
3. Fonctionne hors ligne ou dégrade proprement (état `offline` testé).
4. Droits vérifiés côté serveur avec test « utilisateur sans droit → 402/403 ».
5. Aucune régression des garde-fous 1.4.4 (mesure ou justification).
6. Événements analytics nommés dans le plan de tracking, sans donnée sensible.
7. Accessibilité : labels, contrastes, taille dynamique, lecteur d'écran sur le parcours principal.
8. Migration testée (vide et dump), plan de retour écrit.
9. Documentation : ADR si choix structurant, runbook si nouvelle alerte, README du module à jour.
10. Feature flag créé avec propriétaire et date d'expiration si le déploiement est progressif.

### 1.9.5 Documentation obligatoire
`docs/adr/NNNN-titre.md` (contexte, décision, alternatives, conséquences) pour chaque choix de 1.6 ; `docs/runbooks/` (panne sync, DLQ pleine, incident paiement, fuite de données, panne fournisseur de cartes) ; `docs/personas/` ; `docs/data-dictionary.md` généré depuis les migrations (champ, type, sensibilité, rétention) ; `docs/compliance/` (registre des traitements, sous-traitants, analyse d'impact santé). Le dictionnaire de données est **vérifié en CI** : une colonne sans classification de sensibilité fait échouer le build.
