# PARTIE 2 — Comptes, onboarding, profil, abonnements, paywall, monétisation, légal

> Cette partie définit tout ce qui précède et conditionne l'usage du produit : identité, première expérience, profil, droits d'accès payants, conversion, facturation, support et conformité. Elle est partagée avec [NOM_APP_FIT] : toute décision ici s'applique aux deux apps. Pour l'enregistrement d'activité voir Partie 3 ; pour la charge, la santé et le coach voir Partie 5 ; pour le social voir Partie 7 ; pour les intégrations et le lancement voir Partie 8.

Règles générales pour cette partie :
- Tout texte visible est en français, externalisé dans des fichiers de traduction (clés `auth.*`, `onb.*`, `paywall.*`, `legal.*`), prêt pour EN et ES.
- Aucune décision d'accès payant n'est prise uniquement côté client. Le client affiche, le serveur autorise.
- Chaque flux décrit ci-dessous émet des événements d'analytics (§2.2.8) et doit fonctionner avec une connexion instable.

---

## 2.1 Authentification et comptes

### 2.1.1 Méthodes de connexion

Implémente un module `auth` unique (package partagé avec Fit si le dépôt est un monorepo, sinon service d'identité commun `[STACK_AUTH]`). Recommandation : un fournisseur d'identité géré (Supabase Auth, Firebase Auth, Auth0 ou Clerk) plutôt qu'une solution maison, car passkeys, rotation de jetons et conformité OAuth sont coûteux à maintenir. Choisis celui qui permet l'export des hashes de mots de passe (réversibilité) et l'hébergement des données dans l'UE.

| Méthode | Exigences |
|---|---|
| E-mail + mot de passe | Minimum 10 caractères, vérification contre une liste de mots de passe compromis (k-anonymity HIBP), pas de règle « 1 majuscule + 1 symbole ». E-mail vérifié obligatoire avant tout paiement et tout partage social. |
| Sign in with Apple | Obligatoire sur iOS dès qu'une autre connexion sociale existe. Gérer l'e-mail relais (`privaterelay.appleid.com`) : l'afficher tel quel, proposer d'ajouter un e-mail réel dans Profil pour la récupération. Gérer la notification serveur de révocation Apple (consent-revoked, account-delete). |
| Google | OAuth natif (Credential Manager Android, Google Sign-In iOS). Scopes minimaux : `openid email profile`. |
| Lien magique | E-mail avec lien à usage unique valable 15 min, lié à l'appareil demandeur (code à 6 chiffres en secours si l'appli de messagerie ouvre un autre navigateur). Limiter à 5 demandes/heure/e-mail. |
| Passkeys (WebAuthn) | Proposées après la première connexion réussie (« Connexion par empreinte ou visage, sans mot de passe »). Plusieurs passkeys par compte, nommées par appareil. Synchronisation via trousseau iCloud / Gestionnaire de mots de passe Google. |

Écran de connexion (`AuthLanding`) : logo, accroche « Ton coach pour tous tes sports. », boutons dans l'ordre Apple (iOS) / Google / « Continuer avec un e-mail », lien discret « Explorer sans compte ». L'e-mail saisi détermine le flux : compte existant → mot de passe / passkey / lien magique ; inexistant → création. Ne jamais révéler par un message d'erreur si un e-mail existe (réponse identique « Si un compte existe, un e-mail vient d'être envoyé ») pour la récupération et le lien magique.

### 2.1.2 Compte unique partagé avec Fit

Un seul `user_id` (UUID v7) identifie la personne dans les deux apps. Les tables `identity`, `profile_core`, `entitlement` et `consent` appartiennent au domaine « Compte » (service commun) ; chaque app possède ses propres données métier.

Règles :
1. **Nouvel utilisateur Sports sans compte Fit** : création normale, compte marqué `origin_app = "sports"`. Dans Fit, première connexion avec le même e-mail/fournisseur → l'utilisateur est reconnu, pas de second compte.
2. **Utilisateur Fit existant qui ouvre Sports** : se connecte avec ses identifiants Fit ; écran « Bienvenue [Prénom], on reprend ton profil Fit » listant ce qui est importé (taille, poids, objectifs, blessures, matériel) avec un interrupteur par catégorie ; les données Fit ne sont **jamais** copiées sans cet écran (consentement, voir §2.3.5).
3. **Liaison de comptes existants** : l'utilisateur a deux comptes (ex. Fit avec e-mail A, Sports avec Apple relais). Dans Profil > Comptes > « Lier un autre compte », il se connecte au second compte (preuve de contrôle obligatoire), puis lance la fusion.
4. **Fusion** (`AccountMergeService`, transaction idempotente avec journal) :
   - Compte principal = celui qui a le plus ancien abonnement actif, à défaut le plus ancien `created_at`.
   - Les identités (e-mails, Apple, Google, passkeys) du compte secondaire sont rattachées au principal.
   - Profil : champs en conflit → le principal gagne ; l'utilisateur voit un écran de comparaison pour poids, taille, date de naissance (3 boutons : « Garder A », « Garder B », « Les plus récents »).
   - Activités, séances, plans, amis, trophées : union ; doublons détectés par (type, début ±2 min, durée ±5 %) et proposés à la suppression, jamais supprimés automatiquement.
   - Abonnements : **jamais fusionnés par le service** (ils restent liés à leur compte de store). Si les deux comptes ont un abonnement actif, afficher « Tu as deux abonnements actifs. Résilie-en un dans les réglages de ton store pour éviter de payer deux fois » avec lien direct, et additionner les droits sans dupliquer (voir §2.4.6).
   - Le compte secondaire passe en `merged_into = principal`, ses jetons sont révoqués, une redirection de 30 jours est conservée, puis anonymisation.
   - Annulation possible 14 jours (snapshot chiffré du secondaire).
5. **Conflit d'e-mail** : si une connexion sociale renvoie un e-mail vérifié déjà associé à un compte existant, ne crée pas de doublon : demande une preuve de contrôle du compte existant (mot de passe, lien magique) puis lie la méthode. Si l'e-mail du fournisseur n'est pas vérifié, refuse la liaison automatique. Cas Apple relais : aucune correspondance possible, créer un compte distinct et proposer la liaison ensuite.
6. **Migration des utilisateurs Fit** : script batch idempotent (`migrate_fit_users`), exécuté par lots de 1 000, avec mode simulation (dry-run) ; conserve les `user_id` Fit comme `user_id` unifiés ; migre les hashes de mots de passe sans réinitialisation (hash importé, rehash transparent à la prochaine connexion) ; rapport final : comptes migrés, e-mails en doublon, comptes sans e-mail vérifié (restent en `unverified` avec bannière). Les abonnements Fit existants sont reflétés dans la table `entitlement` avant la mise en production de Sports (test : un abonné Fit ouvre Sports le jour J et voit « Fit actif », sans accès Sports).
7. Un utilisateur peut avoir plusieurs e-mails (un principal, des secondaires vérifiés) ; seul le principal reçoit factures et alertes sécurité.

### 2.1.3 Sessions, jetons et appareils

- Jeton d'accès JWT court (15 min), jeton de rafraîchissement opaque (30 jours glissants, 90 jours absolus) stocké dans Keychain iOS / Keystore Android, jamais en stockage non chiffré.
- **Rotation avec détection de réutilisation** : chaque rafraîchissement émet un nouveau jeton et invalide l'ancien ; la réutilisation d'un jeton invalidé révoque toute la famille de jetons de la session et déclenche une notification « Connexion suspecte détectée ».
- Table `session` : `id, user_id, device_id, device_name, platform, app, ip_hash, country, created_at, last_seen_at, revoked_at`.
- Écran Profil > Sécurité > « Appareils connectés » : liste (« iPhone de Jonathan · Lyon · actif il y a 3 min · Sports, Fit »), bouton « Déconnecter » par appareil et « Déconnecter tous les autres appareils ». La révocation est effective à la prochaine vérification (≤ 15 min) ; l'appli déconnectée garde ses données locales chiffrées 7 jours (reconnexion du même compte = reprise sans perte ; autre compte = effacement local).
- Actions sensibles (changer d'e-mail, supprimer le compte, exporter, gérer passkeys) exigent une ré-authentification de moins de 5 minutes.
- Verrouillage biométrique optionnel de l'app (Face ID / empreinte), désactivé par défaut.
- Limiter les tentatives de connexion : 5 échecs/15 min/compte+IP, puis délai exponentiel et CAPTCHA invisible ; ne jamais verrouiller définitivement.

### 2.1.4 Récupération de compte

- Mot de passe oublié : lien valable 30 min, usage unique, invalide toutes les sessions après changement.
- Perte de tous les moyens de connexion : e-mail de récupération + délai de sécurité de 72 h avec notification sur tous les appareils connus et possibilité d'annuler. Aucune récupération par le support sans vérification (voir §2.7.5).
- Changement d'e-mail : confirmation sur le nouvel et l'ancien e-mail ; l'ancien reçoit un lien d'annulation valable 7 jours.

### 2.1.5 Vérification d'âge et mineurs

Âge minimal d'utilisation : **16 ans** par défaut ; 13-15 ans possible avec consentement parental là où la loi l'exige. Règles par pays (table `age_policy` pilotée par configuration, pas codée en dur) :

| Zone | Âge du consentement numérique | Comportement |
|---|---|---|
| France | 15 ans | < 15 : consentement parental obligatoire |
| Allemagne, Pays-Bas, Irlande (UE à 16) | 16 ans | < 16 : consentement parental |
| Belgique | 13 ans | consentement parental < 13 : refus |
| Royaume-Uni | 13 ans | Respecter l'Age Appropriate Design Code |
| États-Unis | 13 ans (COPPA) | < 13 : inscription refusée |
| Autres | 16 ans par défaut | configurable |

Flux : date de naissance demandée **avant** tout traitement, sélecteur neutre (pas de pré-remplissage). Refus < 13 ans : message « Tu n'as pas l'âge requis pour créer un compte. » ; ne pas conserver la date, mémoriser seulement un indicateur d'appareil 24 h pour empêcher la ressaisie immédiate.

Mineurs consentis (13-17 ans) : consentement parental par e-mail du parent avec lien + vérification (micro-transaction 0 € autorisée par carte, ou pièce d'identité via un prestataire `[STACK_VERIF_AGE]`) ; profil privé par défaut, aucun marketing, pas de classements publics, pas de messagerie avec inconnus, pas de calcul de poids cible ni de déficit calorique (désactivation des fonctions de nutrition restrictive, voir Partie 5), pas d'achat sans consentement parental (le store gère Ask to Buy / Family Link). Limiter la localisation partagée : jamais de partage de position en direct avec des non-amis. Le parent peut retirer son consentement : compte gelé 30 jours puis supprimé.

### 2.1.6 Suppression de compte et export des données

- Profil > Données > « Supprimer mon compte » : écran listant les conséquences (abonnement non résilié automatiquement : « Résilie d'abord ton abonnement dans l'App Store / Google Play », avec liens), ré-authentification, délai de grâce de 14 jours (compte désactivé, annulable par reconnexion), puis suppression irréversible sous 30 jours maximum de toutes les données personnelles dans les deux apps et sauvegardes sous 90 jours. Conserver uniquement : données de facturation (10 ans, obligation comptable), journal d'audit anonymisé, identifiants de fraude hachés. Les activités publiées dans des classements ou défis de groupe sont anonymisées (« Ancien membre »).
- Suppression Apple : appeler l'API de révocation de jeton Apple. Obligatoire pour la conformité App Store.
- Export : Profil > Données > « Exporter mes données » ; archive ZIP prête sous 72 h (e-mail avec lien valable 7 jours, chiffré, ré-auth requise) contenant `profile.json`, `activities/*.fit` + `.gpx` + `.json`, `plans.json`, `health_metrics.csv`, `consents.json`, `subscriptions.json`, `messages.json`. Format lisible par machine (portabilité RGPD art. 20). Une demande à la fois, 3 par an.

### 2.1.7 Mode invité / découverte

- Sans compte : l'utilisateur peut enregistrer une sortie (marche/course/vélo), voir la carte et ses statistiques de base ; données stockées en local, rattachées à un `guest_id` anonyme.
- Bloqué en invité : coach IA, plans, synchronisation, partage, amis, import d'appareils, achat. Message : « Crée un compte gratuit pour sauvegarder tes sorties et débloquer ton coach. »
- Invitation au compte après la 1re activité terminée (moment de valeur) puis après 3 jours ; conversion invité→compte rattache toutes les données locales au `user_id` (migration sans perte, testée avec 50 activités).
- Les données invité non converties sont purgées après 90 jours d'inactivité, avec avertissement local à J-14.
- Les invités ne sont pas comptés comme utilisateurs actifs dans les KPI de monétisation ; suivre séparément l'entonnoir « invité → compte ».

---

## 2.2 Onboarding

Objectif : première valeur perçue en **moins de 2 minutes** (un plan de départ ou un premier enregistrement lancé), 8 écrans maximum avant l'accueil pour la voie rapide, tout le reste différé (« profil à compléter » à 100 % progressivement).

### 2.2.1 Flux écran par écran

| # | Écran | Copy FR (exemple exact) | Validation / états | Sauts |
|---|---|---|---|---|
| O1 | Splash + choix de langue implicite | « Un seul coach pour tous tes sports. » CTA « Commencer » | Hors ligne : fonctionne, contenu embarqué | — |
| O2 | Objectif principal | « Qu'est-ce qui t'amène ? » Choix unique : « Me remettre en mouvement », « Courir mon premier 5 km / 10 km », « Préparer un semi / marathon », « Randonner plus loin », « Rouler plus fort », « Rester en forme (course, vélo, rando) », « Autre » | 1 choix requis ; « Autre » ouvre un champ libre 80 car. | Non |
| O3 | Sports pratiqués | « Tu pratiques quoi aujourd'hui ? » Puces multiples : Marche, Rando, Course, Vélo, Musculation (Fit), Autre | ≥ 1 choix ; « Autre » enregistre l'intérêt pour d'autres disciplines d'endurance (ski de fond, natation) | Non |
| O4 | Âge et sexe | « Pour adapter ton plan en sécurité. » Date de naissance (obligatoire), sexe : Femme / Homme / Autre / Je préfère ne pas dire | Âge < seuil local → flux mineurs §2.1.5 ; futur/impossible refusés | Sexe : oui |
| O5 | Niveau (par discipline principale) | 3 questions concrètes par discipline (§2.2.2) | Au moins une discipline | « Je ne sais pas » → niveau débutant prudent |
| O6 | Disponibilités | « Combien de séances par semaine ? » 1-7, jours préférés (puces L-D), durée max (20/30/45/60/90+ min) | Au moins 1 jour | Oui (valeurs par défaut : 3 jours, 45 min) |
| O7 | Santé et blessures | « Une gêne, une blessure ? » Zones corporelles (genou, cheville, dos, hanche, épaule, tendon d'Achille, autre) + « Rien à signaler » ; puis PAR-Q (§2.2.3) | « Rien à signaler » exclusif | PAR-Q non sautable avant un plan intensif ; sautable avec plan « doux » seulement |
| O8 | Permissions | Voir §2.2.4 | Chaque refus a un chemin dégradé | Oui, chaque permission |
| O9 | Création de compte | « Sauvegarde ton plan » : Apple / Google / e-mail | Si invité : voie « Plus tard » | Oui (mode invité) |
| O10 | Première valeur | Plan de départ généré en direct (animation 3 s max) : « Ton premier plan : 3 séances par semaine, 4 semaines. Première séance demain à 18 h. » CTA « Voir mon plan » et « Lancer une sortie libre maintenant » | Génération échouée (hors ligne) → plan de secours embarqué par persona | — |
| O11 | Paywall doux | Voir §2.6.2 : proposition d'essai après le plan | Fermable en 1 tap | Oui |

L'ordre peut varier par variante A/B (§2.2.8), mais O2 reste en premier (conditionne la suite) et la date de naissance précède toujours toute collecte de santé.

Barre de progression « Étape 3 sur 7 » visible, bouton retour sur chaque écran, état sauvegardé localement à chaque réponse (fermer l'appli et la rouvrir reprend à l'écran en cours). Aucune réponse n'est perdue en cas de crash.

### 2.2.2 Niveau par discipline : questions concrètes

Éviter « débutant / intermédiaire / expert » seul. Poser des questions factuelles, puis calculer un `level` (0-4) et un `confidence` ; le coach affine par les données réelles (Partie 5).

**Course à pied**
1. « Peux-tu courir 10 minutes sans t'arrêter ? » (Non / Avec difficulté / Oui facilement)
2. « Ta dernière course de 5 km ou plus : en combien de temps ? » (Jamais / > 35 min / 28-35 / 22-28 / < 22 / Je ne sais pas)
3. « Combien de kilomètres cours-tu par semaine ? » (0 / 1-10 / 10-25 / 25-50 / > 50)

**Marche / randonnée**
1. « Quelle distance marches-tu facilement en continu ? » (< 3 km / 3-8 / 8-15 / > 15)
2. « Dénivelé positif d'une journée de rando confortable ? » (< 300 m / 300-700 / 700-1 200 / > 1 200 m / Je ne sais pas)
3. « As-tu déjà randonné en moyenne montagne (> 2 000 m) ou en autonomie sur plusieurs jours ? »

**Vélo**
1. « Combien de temps roules-tu d'une traite ? » (< 30 min / 1 h / 2-3 h / > 4 h)
2. « Vitesse moyenne sur sortie plate de 1 h ? » (< 15 km/h / 15-20 / 20-27 / > 27 / Je ne sais pas)
3. « As-tu un capteur de puissance ou connais-tu ta FTP ? » (Non / Oui → champ numérique 80-600 W)

Les questions sont définies en données (`onboarding_questions.json`), pas en dur dans l'UI, pour ajouter une discipline d'endurance sans mise à jour d'app.

Matériel (écran optionnel dans le profil, proposé après O10) : montre GPS/cardio, capteur FC (ceinture/bracelet), capteur de puissance, vélo (route/gravel/VTT/ville/home-trainer), tapis, chaussures de trail, bâtons. Chaque réponse débloque des suggestions (ex. home-trainer → séances d'intérieur proposées en cas de pluie).

### 2.2.3 Questionnaire d'aptitude physique (type PAR-Q+)

Sept questions oui/non adaptées du PAR-Q, présentées sur un écran à la fois, sans jargon :
1. Un médecin t'a-t-il déjà dit que tu as un problème cardiaque ou de tension ?
2. Ressens-tu une douleur dans la poitrine à l'effort ou au repos ?
3. As-tu des vertiges ou perds-tu l'équilibre / connaissance ?
4. As-tu un problème osseux ou articulaire que l'effort pourrait aggraver ?
5. Prends-tu un traitement pour le cœur, la tension ou un autre problème de santé chronique ?
6. Es-tu enceinte ou as-tu accouché il y a moins de 6 mois ?
7. Connais-tu une autre raison pour laquelle tu ne devrais pas faire d'activité physique ?

Règles :
- **Toutes « Non »** : message « Parfait, on peut commencer. Écoute toujours ton corps. » ; `par_q_status = "clear"`.
- **Au moins un « Oui »** : écran d'avertissement non culpabilisant : « Tu as répondu oui à une question. Avant de commencer un programme, parle-en à ton médecin. Tu peux quand même continuer avec un plan très progressif, à ta responsabilité. » Boutons « J'ai l'accord de mon médecin », « Continuer avec un plan doux », « Plus tard ». `par_q_status = "flagged"` : le coach plafonne l'intensité (pas de fractionné, pas de rando > 600 m D+ proposée, pas de FC > 85 % FCmax), conserve la mention dans le profil santé, et revalide à 12 mois.
- Question 2 ou 3 à « Oui » : message renforcé « Si tu ressens une douleur à la poitrine ou un malaise pendant l'effort, arrête-toi et appelle les secours (112 / 15). »
- Les réponses sont des **données de santé** : consentement explicite dédié (§2.8.3), chiffrement au repos, exclues de tout partage, de l'analytics produit et des exports vers des tiers.
- Mention permanente sous le résultat : « [NOM_APP_SPORTS] ne fournit pas de conseil médical. »

### 2.2.4 Permissions : écrans d'explication préalables

Principe : ne **jamais** déclencher le dialogue système sans écran préalable (« pré-permission ») expliquant le bénéfice ; demander au moment où c'est utile (contextuel) plutôt qu'en bloc quand c'est possible. Chaque écran : icône, titre, 2 lignes de bénéfice, CTA « Autoriser », lien « Plus tard ». Si le système a déjà refusé définitivement : bouton « Ouvrir les réglages ».

| Permission | Quand | Copy | Si refusé |
|---|---|---|---|
| Localisation (pendant l'utilisation) | Avant 1re sortie GPS | « Pour tracer ta course et ta distance. Ta position n'est utilisée que pendant l'enregistrement. » | Saisie manuelle et tapis/home-trainer ; bandeau d'aide |
| Localisation en arrière-plan / « toujours » | Seulement si l'enregistrement s'interrompt écran verrouillé (Android) ou pour le suivi sécurité (Partie 4) | « Pour continuer à enregistrer écran éteint. » | Enregistrement foreground avec service ; avertir |
| Mouvement et forme (CoreMotion / Activity Recognition) | À l'activation du podomètre ou détection auto | « Pour compter tes pas et détecter ta cadence. » | Pas de comptage de pas phone-only |
| Notifications | Après la première valeur (fin O10) ou 1re séance planifiée, jamais avant | « Un rappel avant ta séance et un bilan quand elle est finie. Tu choisis les types dans Profil. » | Rappels in-app et badge uniquement |
| Santé (HealthKit / Health Connect) | Écran dédié avec liste précise des types lus/écrits (voir Partie 8) | « Récupère tes pas, ton sommeil et ta FC pour adapter ton entraînement. Rien n'est partagé sans ton accord. » | Saisie manuelle de la FC repos, du sommeil |
| Bluetooth | À l'ajout d'un capteur | « Pour connecter ta ceinture cardio ou ton capteur de puissance. » | Aucun capteur, FC via montre/Health |

Android : gérer l'ordre `ACCESS_FINE_LOCATION` → `ACCESS_BACKGROUND_LOCATION` (deux demandes séparées), `POST_NOTIFICATIONS` (API 33+), `BLUETOOTH_SCAN/CONNECT`, déclaration de la catégorie foreground service `location`. Le formulaire Play « Données de santé » et les chaînes d'usage iOS (`NSLocationWhenInUseUsageDescription`, etc.) sont rédigés en français clair avec la même formulation.

### 2.2.5 Première valeur en moins de 2 minutes

Chronomètre produit : `time_to_first_value` = du premier écran à l'événement `plan_viewed` OU `activity_started`. Objectif médian ≤ 110 s. Moyens obligatoires : voie rapide (O1, O2, O3, O4, O5 abrégé, O10), plan généré localement par règles si le réseau échoue (le coach conversationnel prend le relais ensuite), réponses par défaut raisonnables, un seul champ de texte avant la valeur (e-mail), pas de paywall avant la valeur.

Critères d'acceptation : sur un appareil milieu de gamme en 4G, un testeur atteint `plan_viewed` en moins de 120 s en 90 % des essais ; en mode avion, un plan de secours s'affiche.

### 2.2.6 Onboarding adaptatif selon persona

Persona calculée après O2/O3 (`persona_id`), qui modifie ordre, longueur et ton :

| Persona | Signal | Adaptation |
|---|---|---|
| « Reprise » | Objectif remise en mouvement, niveau 0-1 | Ton rassurant, PAR-Q avant plan, plan marche-course, pas de métriques avancées, pas de questions FC/FTP |
| « Coureur régulier » | Course ≥ 10 km/sem. | Demande objectif chiffré (distance, date, temps cible), proposition d'import Strava/montre, questions blessures détaillées |
| « Randonneur » | Rando dominante | Questions dénivelé, sécurité montagne, téléchargement de cartes proposé |
| « Cycliste » | Vélo dominante | FTP, type de vélo, home-trainer |
| « Multi-activités / Fit » | ≥ 2 disciplines (course + vélo + rando) ou compte Fit | Import du profil Fit, écran « Ton coach unique », demande de lecture des séances Fit |
| « Compétiteur » | Objectif préparer course avec date | Date de l'épreuve, créneau d'affûtage, accès direct paywall d'essai Sports |

### 2.2.7 Cas limites
- Retour arrière après création de compte : les réponses sont conservées et ne sont pas redemandées.
- Utilisateur qui change d'objectif en cours : bouton « Modifier mon objectif » dans le profil relance O2 seulement.
- Date de naissance changée après coup : modification limitée à 2 fois, au-delà passage par le support (anti-contournement mineurs).
- Poids/taille hors plausibilité (ex. 20 kg ou 300 cm) : refus avec message ; unité mal choisie : alerte « 180 lb ? » si saisie 180 en kg.
- Utilisateur existant (Fit) : saute O2-O7 si le profil Fit est complet, ne voit que les écrans spécifiques à Sports (niveau par discipline).

### 2.2.8 Mesure de l'entonnoir et variantes A/B

Événements (nom, propriétés) : `onboarding_started`, `onb_step_viewed {step, variant}`, `onb_step_completed {step, duration_ms}`, `onb_step_skipped`, `permission_prompt_shown/granted/denied {type}`, `account_created {method}`, `plan_viewed`, `trial_started`. Pas de donnée de santé dans les propriétés (seulement des booléens et classes grossières).

Entonnoir cible (à comparer à la référence initiale) : O2 → compte ≥ 70 %, compte → première activité sous 7 jours ≥ 45 %, notifications acceptées ≥ 55 %. Chaque écran affiche un taux d'abandon dans le tableau de bord (voir §2.6.9).

Variantes à prévoir (feature flag `onb_variant`) : (A) compte avant plan / (B) plan avant compte ; (A) PAR-Q dans le flux / (B) PAR-Q différé à la première séance ; (A) 1 question par écran / (B) deux regroupées ; (A) paywall après plan / (B) paywall à la 2e séance. Règle d'expérimentation : tirage stable par `user_id`/`device_id`, taille d'échantillon calculée avant lancement, arrêt automatique si le taux d'activation chute de plus de 15 % relatif avec signification.

---

## 2.3 Profil et préférences

### 2.3.1 Champs du profil

| Champ | Type / contraintes | Obligatoire | Source de vérité |
|---|---|---|---|
| Prénom / pseudo | 2-30 car., pseudo unique insensible à la casse, filtre d'insultes | Oui | Compte commun |
| Photo | JPEG/PNG ≤ 5 Mo, recadrée 512 px, modération automatique | Non | Compte commun |
| Date de naissance | date, modifiable 2 fois (voir §2.2.7) | Oui | Compte commun |
| Sexe | enum + `unspecified` | Non | Compte commun |
| Taille | 120-230 cm | Oui pour plans | Compte commun (partagé Fit) |
| Poids | 30-250 kg, historisé | Non (conseillé) | Compte commun (partagé Fit) |
| FC max / FC repos | 100-230 / 30-100 bpm, estimées si vides (`220 − âge` marquée « estimation ») | Non | Sports (lecture seule pour Fit) |
| FTP, seuil de course, VMA | numériques optionnels, source `manual \| test \| estimated` | Non | Sports |
| Niveau par discipline | 0-4 + `confidence` | Oui (au moins une) | Sports |
| Blessures et limites | liste structurée (zone, gravité, date, active/guérie) | Non | Commun (visible Fit et Sports) |
| Matériel | liste | Non | Sports (Fit : son matériel propre) |
| Pays, fuseau, langue | ISO, IANA, BCP-47 | Auto | Appareil, modifiable |

### 2.3.2 Unités, langue, accessibilité
- Unités : distance (km/mi), allure (min/km, min/mi, km/h), altitude (m/ft), poids (kg/lb/st), température (°C/°F), 1re jour de semaine (lundi/dimanche). Par défaut dérivées de la région ; réglage unique valable dans les deux apps ; toutes les valeurs sont **stockées en SI** et converties à l'affichage (jamais l'inverse).
- Langue : suit le système, surchargeable dans l'app (FR par défaut, EN/ES prêts). Formats de date/nombre via `Intl`.
- Accessibilité : texte dynamique jusqu'à 200 %, VoiceOver/TalkBack complets (labels sur toutes les métriques : « Allure moyenne, 5 minutes 32 par kilomètre »), contrastes WCAG AA, mode sombre automatique, option « réduire les animations », retours haptiques réglables, annonces vocales pendant l'enregistrement (Partie 3), cibles tactiles ≥ 44 pt, aucune information portée par la seule couleur (graphes de zones avec motifs).

### 2.3.3 Confidentialité
Écran Profil > Confidentialité, avec valeurs par défaut **les plus protectrices** :
- Visibilité par défaut des activités : « Moi seul » (options : Amis, Public). Surcharge par activité et par type (ex. footing public, rando privée).
- Profil : visible aux amis uniquement par défaut ; recherche par pseudo activable ; invitation par lien.
- **Zones de confidentialité** : jusqu'à 10 zones (domicile, travail, autre), rayon 200 m à 1 km (500 m par défaut), les 200-1 000 m de début/fin de tracé masqués pour tout autre que le propriétaire. Proposées automatiquement après la première sortie (« Cacher ton domicile ? »). Les zones sont stockées chiffrées, le masquage est appliqué **côté serveur** avant toute diffusion (voir Partie 4 pour la carte et Partie 7 pour le fil).
- Partage de santé : FC, sommeil, poids, calories ne sont jamais visibles par défaut ; un interrupteur par catégorie et par audience (amis/public/coach humain de la marketplace).
- Suivi de sécurité en direct (position partagée) : activé par sortie, jamais par défaut (Partie 4).
- Boutons « Télécharger mes données », « Supprimer mon compte », « Révoquer tous les partages » (rend tout privé en une opération), « Voir qui a accès à quoi » (liste des audiences et applications tierces avec bouton révoquer).

### 2.3.4 Notifications
Catégories, chacune avec interrupteur push, e-mail et in-app :

| Catégorie | Exemple | Défaut |
|---|---|---|
| Séances et plan | « Séance fractionné à 18 h. Tu es prêt(e) ? » | Push on |
| Coach et récupération | « Ta charge est élevée, on allège demain. » | Push on |
| Résumé d'activité | « Sortie terminée : 8,4 km, bien joué. » | Push on |
| Social | Likes, commentaires, invitations | Push on pour invitations, off pour likes |
| Défis et trophées | « Nouveau trophée : 100 km en un mois. » | On |
| Sécurité et compte | Connexion, facturation, alerte sécurité | Toujours on (non désactivable pour sécurité/paiement) |
| Offres et nouveautés | Promotions | Off tant que non opt-in explicite |

Réglages : plage silencieuse (22 h-7 h par défaut, selon le fuseau local de l'utilisateur), jours sans notification, **plafond de fréquence** de 1 push marketing/semaine et 3 push non essentiels/jour, regroupement (digest), respect du Focus iOS / Ne pas déranger, canaux Android par catégorie. Une notification obsolète (séance déjà faite) est supprimée côté serveur avant envoi. Désinscription e-mail en un clic (en-tête `List-Unsubscribe`).

### 2.3.5 Connexions d'appareils
Écran Profil > Appareils et apps : Apple Santé / Health Connect, Garmin, Polar, Coros, Suunto, Wahoo, Strava, capteurs Bluetooth (Partie 8 pour les détails). Pour chaque connexion : état (connecté, expiré, erreur), dernière synchronisation, données lues/écrites, bouton « Déconnecter » qui révoque le jeton chez le fournisseur et propose « Supprimer aussi les données importées ». Priorité de source configurable par donnée (ex. FC : ceinture > montre > téléphone) pour dédoublonner.

### 2.3.6 Données corporelles partagées avec Fit
- **Source de vérité unique** : le service Compte détient `body_measurement(user_id, type, value, unit, measured_at, source, written_by_app)`. Aucune app ne garde une copie divergente : elles lisent et écrivent via l'API commune.
- Un poids saisi dans Fit apparaît dans Sports et inversement (délai < 60 s en ligne). Le plus récent par `measured_at` fait foi ; en cas d'égalité, la source la plus fiable (balance connectée > saisie manuelle > estimation).
- **Consentement** : le partage inter-apps est présenté à l'écran « Ton coach unique » : « Partager ton poids, ta taille, tes blessures et tes séances avec [NOM_APP_FIT] pour que ton coach voie tout. » Interrupteurs par catégorie ; refus = chaque app garde ses données séparées, mais le profil de base (âge, taille) reste commun car nécessaire à l'identité.
- **Historique des modifications** : table `profile_change_log(user_id, field, old, new, changed_at, app, device, reason)` visible dans Profil > Historique (30 dernières modifications), utile pour annuler (« Rétablir 78,4 kg »). Les modifications suspectes (poids ±10 % en 24 h) demandent confirmation.
- Les données corporelles d'un mineur ne sont pas utilisées pour des objectifs de perte de poids.

---

## 2.4 Plans d'abonnement

### 2.4.1 Tableau des fonctions par plan

| Fonction | Gratuit | Sports | Fit | Ultra (Fit + Sports) |
|---|---|---|---|---|
| Enregistrer marche, rando, course, vélo (GPS, métriques de base, hors ligne) | Oui, illimité | Oui | Non applicable (Sports) | Oui |
| Historique des activités | 90 derniers jours | Illimité | — | Illimité |
| Cartes hors ligne | 1 zone, 100 Mo | Illimité (quota stockage seulement) | — | Illimité |
| Création / import d'itinéraires (GPX) | 3 itinéraires | Illimité | — | Illimité |
| Plan d'entraînement endurance | 1 plan découverte (4 semaines, 3 séances/sem.) | Plans illimités adaptatifs | — | Illimités |
| Coach IA conversationnel | 5 messages/jour (version simple) | Illimité, mémoire longue | Illimité côté Fit | Illimité, **coach unifié course, vélo, rando et musculation** |
| Analyse de charge, récupération, readiness | Charge simple (7 j) | Complète (CTL/ATL, tendances, alertes surcharge) | — | Complète + croisée musculation |
| Rando avancée : profils d'élévation, météo montagne, itinéraires multi-jours | Aperçu (1 profil) | Inclus | — | Inclus |
| Musculation, programmes, bibliothèque d'exercices | — | — | Oui | Oui |
| Nutrition : recettes, aliments, journal | Consultation limitée (20 recettes, journal 7 jours) | Conseils de ravitaillement endurance (Sports) | Complète | Complète + **nutrition adaptée à la charge de toutes les activités** |
| Planning unifié (séances Sports + Fit sur un même calendrier) | Non | Sports seul | Fit seul | **Oui** |
| Intégrations montres (import automatique) | 1 connexion | Illimité | Selon Fit | Illimité |
| Sécurité (suivi live, détection de chute) | Partage de position manuel | Complet | — | Complet |
| Trophées, amis, défis | Oui | Oui | Oui | Oui |
| Défis premium, marketplace de plans de coachs | Achat à l'unité | Remise 10 % | Remise 10 % | Remise 15 % |
| Export GPX/FIT/CSV | GPX d'une activité | Tout | Selon Fit | Tout |
| Support | Centre d'aide | Chat 48 h | Chat 48 h | Chat prioritaire 24 h |

Règles produit : le suivi de base et la sécurité fondamentale ne sont **jamais** verrouillés derrière un paywall (alerte d'urgence, partage de position manuel, enregistrement GPS). L'accès à un contenu verrouillé affiche toujours « Débloquer avec Sports » plutôt qu'un écran vide. Les données déjà créées ne sont jamais supprimées à cause d'une résiliation : elles passent en lecture seule/archivage (voir §2.4.7).

### 2.4.2 Quotas du gratuit
Quotas définis en configuration serveur (`plan_limits`) pour modification sans mise à jour d'app, appliqués côté serveur (compteurs `usage_counter(user_id, key, period_start, count)`) :
- `coach_messages_daily = 5` (remise à zéro à minuit local) ;
- `history_days = 90` (les activités plus anciennes restent stockées et réapparaissent à l'abonnement) ;
- `offline_map_mb = 100`, `routes_saved = 3`, `device_connections = 1`, `plans_active = 1`.
Messages d'approche de limite à 80 % (« Il te reste 1 message aujourd'hui ») et à 100 % (paywall contextuel, §2.6.2). Un quota dépassé n'interrompt jamais une activité en cours.

### 2.4.3 Ultra, prix et remise
- Principe : Ultra = Fit + Sports avec une remise de **~25 %** sur la somme (fourchette autorisée 20-30 %). Formule : `prix_ultra = arrondi_charme(0,75 × (prix_fit + prix_sports))`.
- Prix suggérés France (TTC, à valider par test A/B et par les coûts d'IA) :

| Plan | Mensuel | Annuel | Équivalent mensuel annuel |
|---|---|---|---|
| Sports | 7,99 € | 59,99 € | 5,00 € |
| Fit | 9,99 € | 69,99 € | 5,83 € |
| Ultra | 13,99 € | 99,99 € | 8,33 € |

(Somme mensuelle 17,98 € → Ultra 13,99 € soit −22 % ; somme annuelle 129,98 € → Ultra 99,99 € soit −23 %.)
- Avantages exclusifs Ultra : coach unifié, planning unifié, nutrition adaptée à la charge, readiness croisée muscu/endurance, remise 15 % marketplace, chat prioritaire, accès anticipé aux nouvelles fonctions d'endurance.
- Un seul Ultra annuel coûte toujours moins que Fit annuel + Sports annuel ; un test automatisé vérifie cet invariant sur la grille de prix de chaque pays.

### 2.4.4 Essai, annuel, familles, étudiants, lancement
- **Essai gratuit** : 7 jours pour Sports et Fit mensuel/annuel, 14 jours pour Ultra annuel (introductory offer App Store / free trial Google Play). Une seule période d'essai par groupe d'abonnement et par compte (la protection du store suffit côté iOS ; côté serveur, `trial_used_at` par `user_id` ET par identifiant d'appareil haché pour détecter les doubles comptes). Rappel local/push à J-2 : « Ton essai se termine dans 2 jours. Tu seras facturé(e) 59,99 € le [date]. »
- **Offres annuelles** : mise en avant « 2 mois offerts » avec prix mensuel équivalent, jamais d'engagement masqué.
- **Famille** : Ultra Famille (jusqu'à 5 comptes, 129,99 €/an). Utiliser le partage familial des stores (iOS Family Sharing) quand disponible ; sinon Stripe sur le web avec invitation par e-mail (le titulaire gère les membres, un membre ne voit ni la facturation ni les données des autres). Android : Google Play family library avec limites propres.
- **Étudiants** : −40 % sur Sports et Fit annuels sur justificatif (vérification via `[STACK_VERIF_ETUDIANT]` type SheerID ou UNiDAYS), renouvelable chaque année, web uniquement ou code d'offre store.
- **Offres de lancement** : « Fondateur » −30 % la première année pour les 5 000 premiers abonnés, tarif gelé tant que l'abonnement n'est pas interrompu ; Ultra à prix Fit pendant 3 mois pour les abonnés Fit existants (migration, offre promotionnelle store).
- **Codes promo** : codes d'offre stores (iOS offer codes, Google Play promo codes) pour les stores ; codes Stripe pour le web. Table `promo_code(code, type, value, scope_plans, start, end, max_redemptions, per_user_limit, channel)`. Règles : non cumulables entre eux, non cumulables avec la remise Ultra étudiante, expiration stricte, journalisation des usages.
- **Parrainage** : lien et code personnel ; le filleul reçoit 14 jours d'essai Sports, le parrain 1 mois offert pour chaque filleul qui devient payant après essai (plafond 6 mois/an). Récompense validée seulement après la première facturation réussie et non remboursée (anti-fraude : un seul bénéfice par appareil/carte/IP raisonnablement identique). Le mois offert côté store passe par code d'offre ; côté web, par crédit Stripe.

### 2.4.5 Prix par pays (parité de pouvoir d'achat)
Utiliser les **paliers de prix** des stores (price tiers/price points) plutôt que des conversions de devise. Tableau indicatif Sports mensuel :

| Région | Indice | Sports mensuel | Remarque |
|---|---|---|---|
| France, Allemagne, Benelux | 1,00 | 7,99 € | TVA incluse |
| Royaume-Uni | 1,00 | 6,99 £ | TVA 20 % incluse |
| États-Unis, Canada | 1,05 | 7,99 $ | taxes en sus selon État |
| Espagne, Italie, Portugal | 0,85 | 6,99 € | |
| Europe de l'Est | 0,60 | 4,99 € / équivalent local | |
| Brésil, Mexique, Turquie | 0,45 | prix local ≈ 3,5 € | |
| Inde, Asie du Sud-Est, Afrique | 0,30 | prix local ≈ 2,5 € | |

Règles : table `price_book(plan, country, store, product_id, amount, currency, version)` versionnée ; revue trimestrielle ; la parité Ultra se recalcule par pays avec la formule §2.4.3 ; empêcher l'arbitrage (abonnement dans un pays à bas prix) par la limitation d'un changement de pays du store ; ne jamais afficher un prix codé en dur, toujours le prix localisé renvoyé par le store/Stripe.

### 2.4.6 Passage d'un plan à l'autre
Chaque plan est un produit d'un **groupe d'abonnement** unique par app-store pour permettre mises à niveau/rétrogradations natives. Recommandation de structure : un groupe « Sports/Fit/Ultra » (iOS) avec niveaux : Ultra (1) > Fit (2) = Sports (2) ; Android : un abonnement par plan avec offres de base, changement via `replacement mode`.

| Cas | Règle |
|---|---|
| Gratuit → Sports/Fit/Ultra | Achat immédiat, essai si éligible |
| Sports → Ultra (upgrade) | Immédiat, prorata crédité par le store (iOS : upgrade immédiat avec prorata ; Android : `CHARGE_PRORATED_PRICE`) ; Fit débloqué instantanément |
| Fit → Sports (changement latéral entre produits de même niveau) | iOS : prend effet à la fin de la période (crossgrade différé) ; l'app affiche « Sports démarrera le [date] » ; Android : `DEFERRED` |
| **Abonné Fit qui prend Sports** | Recommandation affichée : « Passe à Ultra pour 13,99 € au lieu de 17,98 € ». S'il choisit de cumuler quand même, deux abonnements indépendants coexistent (le groupe iOS n'autorise pas deux abonnements actifs du même groupe : prévoir un second groupe `sports_standalone` OU forcer Ultra). Décision : **groupes distincts `fit_group` et `sports_group` + groupe `ultra_group`**, et si l'utilisateur détient Fit + Sports, afficher un bandeau « Tu paies plus cher que Ultra » avec migration en un tap qui annule logiquement les deux (résiliation à effet fin de période + crédit d'essai Ultra de la période restante via offre promotionnelle) |
| Ultra → Sports seul (downgrade) | À la fin de la période payée ; les droits Fit restent jusqu'à l'échéance ; ensuite Fit repasse Gratuit, ses données restent en lecture seule |
| **Ultra qui résilie un seul volet** | Les stores ne permettent pas de résilier « un volet » d'un produit Ultra : l'écran « Gérer mon abonnement » propose « Passer à Sports » ou « Passer à Fit » (downgrade programmé en fin de période) plutôt qu'une résiliation partielle ; message : « Tu garderas Ultra jusqu'au [date], puis Fit seul à 9,99 €/mois » |
| Mensuel → annuel | Upgrade immédiat avec prorata (iOS) ; économie affichée |
| Annuel → mensuel | Fin de période |
| Changement de store (iOS → Android) | Pas de transfert automatique ; double droit autorisé, avertir du double paiement, restauration par e-mail |
| Résiliation | Le droit reste actif jusqu'à `expires_at` ; jamais de coupure immédiate hors remboursement |

### 2.4.7 Fin d'abonnement et conservation des données
À l'expiration : accès aux fonctions payantes retiré, données conservées (historique > 90 j masqué mais stocké 24 mois, plans archivés en lecture seule, mémoire du coach conservée mais gelée), possibilité d'exporter tout. Messagerie « Tes données sont en sécurité. Réactive Sports pour retrouver ton plan. » Au-delà de 24 mois sans activité ni abonnement, avertissement e-mail puis suppression des données volumineuses (traces GPS brutes) tout en gardant les agrégats.

---

## 2.5 Architecture des entitlements

### 2.5.1 Service unique
Recommandation : **RevenueCat** (ou équivalent) en couche d'abstraction des reçus iOS/Android/Stripe, **plus** un service `entitlements` maison qui reste l'unique autorité lue par les apps et les backends. RevenueCat est la source des événements d'achat ; la base maison est la source de décision (réversibilité : si on quitte RevenueCat, seule l'ingestion change). `[STACK_ENTITLEMENTS]` peut être remplacé par une implémentation 100 % maison (App Store Server API v2 + Google Play Developer API + Stripe) si le coût l'impose ; l'interface interne reste identique.

Les droits exposés : `fit`, `sports`, `ultra`. **Règle de dérivation** : `ultra` accorde `fit` ET `sports` ; l'API renvoie la liste développée `["fit","sports","ultra"]` pour qu'aucun client ne recalcule cette logique. Granularité fine par fonctionnalité via `feature_access(feature_key → entitlement requis, quota)` pour éviter de coder des plans dans l'app.

### 2.5.2 Modèle de données

```sql
product(id, store, store_product_id, plan, period, trial_days, active)
entitlement_grant(
  id uuid, user_id, entitlement text,          -- fit | sports | ultra
  source text,                                 -- apple | google | stripe | promo | referral | admin | family
  product_id, original_txn_id, status text,    -- voir machine à états
  starts_at, expires_at, grace_until,
  auto_renew bool, period_type text,           -- trial | intro | normal
  will_downgrade_to text, environment text,    -- production | sandbox
  revoked_reason, updated_at, raw_event_ref)
purchase_event(id, provider_event_id UNIQUE, type, payload_json, received_at, processed_at)  -- idempotence
entitlement_effective(user_id, entitlements text[], valid_until, computed_at)  -- vue matérialisée
```

Un utilisateur peut avoir plusieurs `entitlement_grant` actifs de sources différentes ; `entitlement_effective` prend l'union, avec `valid_until` = max des échéances. Index sur `(user_id, status)`, `original_txn_id`, `provider_event_id` unique.

### 2.5.3 Machine à états d'un abonnement

```
          achat                      renouvellement OK
 NONE ───────────► TRIAL ──fin d'essai paiement OK──► ACTIVE ◄──────────────┐
                     │ résilié                          │  │ échec facturation │ reprise paiement
                     ▼                                  │  ▼                   │
               TRIAL_CANCELED (accès jusqu'à fin)       │ BILLING_RETRY/GRACE ──┘
                     │                                  │  │ période de grâce écoulée
                     ▼                                  │  ▼
                  EXPIRED ◄── résilié, fin de période ──┘ ON_HOLD (Google) / EXPIRED (Apple)
                     ▲                                       │ 
                     └──────── remboursement ─► REFUNDED/REVOKED
 ACTIVE ──upgrade──► ACTIVE(nouveau produit)  ACTIVE ──downgrade programmé──► ACTIVE + will_downgrade_to
```

Règles par état :
| État | Accès | Message utilisateur |
|---|---|---|
| `trial` | Complet | « Essai : encore 5 jours » |
| `active` | Complet | — |
| `canceled_pending` (auto-renew off, avant échéance) | Complet jusqu'à `expires_at` | « Ton abonnement se termine le 14 nov. Le réactiver ? » |
| `grace` (échec de paiement, période de grâce) | Complet pendant 16 jours (Apple : 6 j mensuel, 16 j annuel configurables ; Google : 7 j) | « Problème de paiement. Mets à jour ta carte pour garder l'accès. » (bannière non bloquante) |
| `on_hold` (Google, récupération de compte) | Retiré | « Ton accès est suspendu. Mets à jour ton paiement. » |
| `expired` | Gratuit | Offre de réactivation |
| `refunded` / `revoked` | Retiré immédiatement | Message neutre, pas d'accusation de fraude |
| `paused` (Google) | Retiré jusqu'à la reprise | |

Les transitions sont des fonctions pures `next(state, event) → state`, testées en table (événement × état), y compris événements hors ordre : chaque événement porte `event_ts` ; les anciens événements ne régressent jamais un état plus récent (comparaison de `expires_at` et de l'horodatage).

### 2.5.4 Vérification serveur et validation des reçus
- À l'achat : le client envoie le jeton de transaction (StoreKit 2 signed transaction JWS / Play purchase token) à `POST /v1/entitlements/sync` ; le serveur le vérifie auprès du store (App Store Server API, Google Play Developer API `subscriptionsv2`) ou via RevenueCat, **jamais en faisant confiance au client**, puis recalcule `entitlement_effective` et répond avec les droits et `valid_until`.
- Vérifier : signature, `bundleId`/`packageName`, `environment` (rejeter sandbox en production), `appAccountToken`/`obfuscatedExternalAccountId` = `user_id` (lie la transaction au compte et empêche le rejeu d'un reçu sur un autre compte), produit connu.
- Un reçu déjà lié à un autre `user_id` est refusé avec un message « Cet abonnement est déjà associé à un autre compte » et un choix de transfert après ré-authentification des deux comptes.
- Les API métier (coach, plans, export…) lisent `entitlement_effective` côté serveur à chaque requête (cache Redis 60 s) ; le jeton d'accès JWT peut porter un claim `ent` **informatif** mais jamais décisif.

### 2.5.5 Notifications serveur (webhooks)
- Apple : App Store Server Notifications V2 ; Google : Real-time developer notifications (Pub/Sub) ; Stripe : webhooks signés ; RevenueCat : webhook avec secret.
- Endpoint public `POST /webhooks/{provider}` : vérification de signature, enregistrement brut dans `purchase_event` (déduplication par `provider_event_id`), réponse 200 rapide, traitement asynchrone par file avec reprises exponentielles (jusqu'à 72 h) et file morte supervisée (alerte si > 0 depuis 15 min).
- Événements à gérer : achat initial, renouvellement, échec de facturation (`DID_FAIL_TO_RENEW`), entrée/sortie de période de grâce, résiliation, reprise, changement de produit, expiration, remboursement, révocation (`REVOKE`, `REFUND`), demande de consentement à une hausse de prix, changement de statut de partage familial, rétrofacturation (chargeback).
- Rattrapage (réconciliation) : tâche quotidienne qui interroge les stores pour tous les abonnements dont `expires_at` est passé dans les dernières 48 h ou dont l'état est ambigu, afin de corriger tout webhook perdu.

### 2.5.6 Achats web (Stripe) et règles des stores
- Stripe Checkout pour un achat web, relié au `user_id` par `client_reference_id` ; Stripe Customer Portal pour gérer/résilier ; les abonnements Stripe alimentent les mêmes droits (`source = stripe`).
- **Conformité** : appliquer la politique en vigueur dans chaque pays au moment du développement et la faire valider par un juriste. À titre d'état connu : aux États-Unis, les liens et boutons vers un paiement externe sont autorisés dans l'app iOS (décision judiciaire *Epic v. Apple*) avec possibles commissions selon l'évolution ; dans l'UE, le DMA permet des offres externes sous conditions et avec écrans d'information Apple ; sur Google Play, le programme « alternative billing / user choice billing » existe selon les pays. Ailleurs, **ne pas mentionner ni lier** un achat web dans l'app iOS/Android. Un drapeau `external_offer_allowed(country, platform)` en configuration serveur active ou non les liens. Aucun prix web moins cher n'est affiché dans l'app là où c'est interdit.
- Un abonné Stripe qui ouvre l'app iOS voit son accès normalement, et « Géré sur le web » dans Gérer l'abonnement (lien portail uniquement si autorisé, sinon texte « Gère ton abonnement depuis ton compte sur notre site »).
- Un utilisateur ne doit pas pouvoir cumuler involontairement stores et web : à l'achat, si un droit actif existe d'une autre source, afficher un avertissement avant paiement.

### 2.5.7 Synchronisation entre les deux apps, cache et hors ligne
- Les deux apps appellent la même API `GET /v1/me/entitlements` ; push silencieux « entitlements_changed » (APNs/FCM) déclenche un rafraîchissement dans l'autre app dans les 5-10 s ; au premier plan, rafraîchissement systématique si le cache a plus de 15 min.
- Cache local chiffré : `{entitlements, valid_until, fetched_at, signature}` ; la réponse serveur est **signée** (JWS, clé publique embarquée) pour empêcher la modification locale.
- **Hors ligne** : tolérance de **72 h** après `fetched_at` tant que `valid_until` n'est pas passé ; au-delà, si l'abonnement a une date de fin passée, retour au Gratuit ; si `valid_until` est dans le futur, l'accès est conservé jusqu'à cette date, plafonné à 7 jours hors ligne. Un enregistrement en cours n'est jamais interrompu ; l'activité terminée hors ligne reste sauvegardée, et les analyses payantes se débloquent à la resynchronisation.
- Détection de manipulation d'horloge : comparer l'heure système à `server_time` mémorisé ; si recul constaté, refuser l'extension.
- Jailbreak/root : ne pas bloquer ; l'autorité reste serveur.

### 2.5.8 Remboursements, restauration, partage familial
- Remboursement Apple (`REFUND`) / Google (`voided purchases` API) : retrait des droits, annulation d'un éventuel crédit de parrainage, enregistrement dans l'audit. Remboursements demandés par l'utilisateur : Apple le gère (lien « Demander un remboursement » vers le store) ; web : politique de 14 jours (droit de rétractation UE), remboursement via Stripe en back-office.
- **Restauration** : bouton « Restaurer mes achats » (Profil > Abonnement et écran de paywall) qui lance la synchronisation des transactions du store ; message de succès « Ton abonnement Ultra a été restauré » ou « Aucun abonnement trouvé pour ce compte de store ». Restauration automatique à chaque connexion sur un nouvel appareil.
- Partage familial : accordé via `FamilyShared` Apple ; les membres reçoivent `source = family`, perdent l'accès si le partage est retiré (notification serveur), et ne voient pas la facturation.

### 2.5.9 Détection de fraude
Signaux : reçu rejoué sur plusieurs comptes ; même appareil créant de multiples comptes pour des essais ; remboursement abusif répété (> 2) ; abonnements jailbreak/sandbox en production ; parrainages circulaires. Actions graduées : signal faible → journalisation ; moyen → blocage du nouvel essai ; fort → revue manuelle dans le back-office (§2.7.6). Ne jamais bannir automatiquement sur un seul signal. Score stocké dans `risk_signal(user_id, type, score, at)`.

### 2.5.10 Tests de tous les scénarios d'abonnement
Environnements : Apple Sandbox + StoreKit Testing (configuration locale accélérant le temps), Google Play licence testers + Play Billing Lab, Stripe test clocks. Matrice minimale à automatiser (serveur) et à vérifier manuellement (client) : achat avec essai ; essai → payant ; résiliation pendant l'essai ; renouvellement ; échec de paiement → grâce → récupération ; échec → expiration ; upgrade/downgrade/crossgrade ; mensuel→annuel ; remboursement ; révocation ; restauration sur nouvel appareil ; partage familial retiré ; webhook en double, hors ordre, perdu (réconciliation) ; achat sur un second compte avec le même reçu ; sandbox en production ; hors ligne 72 h ; hausse de prix avec consentement ; Stripe → App sans achat store. Chaque scénario est un test nommé `ent_NN_description`.

---

## 2.6 Paywall et conversion

### 2.6.1 Principes
Valeur avant demande ; transparence totale (prix, durée, renouvellement, comment résilier) ; zéro dark pattern (bouton de fermeture visible dès l'ouverture, pas de compte à rebours factice, pas de case pré-cochée). Les paywalls sont **pilotés à distance** (`[STACK_PAYWALL]`, ex. RevenueCat Paywalls ou composant maison + config JSON) pour tester textes, ordre et prix sans publier.

### 2.6.2 Moments de valeur (déclencheurs)
| Déclencheur | Condition | Variante de copy |
|---|---|---|
| Après génération du premier plan | fin onboarding | « Ton plan est prêt. Débloque l'adaptation automatique avec Sports. » |
| 1re sortie terminée | ≥ 1 activité | « Découvre ton analyse détaillée : zones, charge, récupération. » |
| 6e message du coach | quota atteint | « Tu as posé tes 5 questions du jour. Continue avec un coach illimité. » |
| Tentative d'ouvrir une fonction verrouillée | carte hors ligne 2, plan 2 | Paywall contextuel avec la fonction en tête |
| Fin de 4 semaines du plan découverte | J+28 | « Bravo, 12 séances. La suite adaptative t'attend. » |
| Séance muscu + course la même semaine (utilisateur Fit) | compte Fit | Paywall Ultra : « Un seul coach pour ta muscu et ta course. » |
| Blessure déclarée | après saisie | **Aucun paywall** : l'adaptation de sécurité est gratuite |

Plafond de fréquence : 1 paywall plein écran par session, 3 par semaine, jamais pendant ou immédiatement après un effort (attendre 10 min), jamais après une alerte de sécurité.

### 2.6.3 Écrans et copy (FR)
**Écran principal** : titre « Ton coach, sur tous tes sports ». 3 bénéfices (« Un plan qui s'adapte à ta fatigue », « Récupération et nutrition liées à tes sorties », « Cartes hors ligne et sécurité complète »). Sélecteur de plan à 3 cartes (Sports / Fit / **Ultra** pré-sélectionné avec badge « Le plus complet ») et bascule Mensuel/Annuel (annuel par défaut, économie en pourcentage calculée). Sous le bouton : « 7 jours gratuits, puis 59,99 € par an. Résiliable à tout moment dans les réglages de l'App Store. » CTA « Essayer 7 jours gratuitement » (si éligible, sinon « S'abonner »). Liens : « Restaurer mes achats », « Conditions », « Confidentialité ». Bouton de fermeture « × » visible en haut à gauche, zone 44 pt.

**Frise de l'essai** (réduit l'anxiété, améliore la confiance) : « Aujourd'hui : accès complet · Jour 5 : rappel · Jour 7 : début de l'abonnement, annulable avant. »

États : chargement des prix (squelette ; si > 5 s, bouton désactivé et « Prix indisponibles, réessaie »), pas de produits (erreur store) → message et réessai, achat en attente (« Paiement en attente d'approbation » : Ask to Buy / paiements différés), achat réussi (écran de confirmation avec « Ce qui est débloqué » et retour au contexte exact), annulation (retour silencieux).

### 2.6.4 Conformité aux stores
Afficher : prix localisé du store, durée, mention de renouvellement automatique et prix de renouvellement après essai, le lien de résiliation, CGU et confidentialité. Taille du prix après essai au moins aussi lisible que la mention « gratuit » (règle Apple). Pas d'incitation à la résiliation contournée. Appliquer le parcours de gestion natif (`manageSubscriptionsSheet` iOS, lien Play). Textes validés avec les guidelines en vigueur (App Store 3.1.2, politique d'abonnements Google Play).

### 2.6.5 A/B testing
Variables : ordre des plans, plan pré-sélectionné, mensuel vs annuel par défaut, durée d'essai (7/14 j), présence de la frise, texte du CTA, prix (par pays, avec prudence légale), moment d'affichage. Règles : un test à la fois par surface ; mesure principale = **revenu par utilisateur exposé à 30 jours** et non le clic ; garde-fous = résiliations dans les 48 h, remboursements, notes de l'app ; arrêt du test si la rétention J7 chute. Journaliser `experiment_exposure {key, variant}`.

### 2.6.6 Relance, win-back, rétention
- **Relance de panier** : utilisateur ayant ouvert le paywall sans achat : une notification (si autorisée) à H+24 « Ton plan t'attend. 7 jours gratuits, sans engagement. » et un e-mail à J+3, puis stop. Pas de relance sur un utilisateur qui a fermé trois fois le paywall.
- **Win-back** : à J+7, J+30, J+90 après expiration, offre dédiée (offre de reconquête du store ou code) : « Reviens pour 1 mois à 2,99 € ». Segmentation par raison de résiliation et par activité récente.
- **Offre de rétention à la résiliation** : l'app ne peut pas intercepter la résiliation faite dans les réglages du store, mais détecte `auto_renew = false` (webhook) et affiche à l'ouverture suivante une carte « Avant ton départ » : pause de 1 à 3 mois (Google pause native ; sur iOS, remplacer par offre « 1 mois gratuit » via offre promotionnelle), downgrade vers Sports/Fit moins cher, ou offre −30 %. Une seule offre de rétention par 12 mois et par utilisateur.
- **Enquête de résiliation** (non bloquante, 1 écran) : « Pourquoi pars-tu ? » Trop cher / Je ne m'en sers pas assez / Il me manque une fonction / Problème technique / Blessure ou pause / Autre (champ libre). Stocker `cancel_reason`.
- **Avis de hausse de prix** : respecter les consentements des stores, prévenir 30 jours avant par e-mail.

### 2.6.7 Métriques et tableau de bord
Définitions : conversion visiteur→essai, **conversion essai→payant** (cible ≥ 40 %), conversion globale utilisateur→payant à 30 j (cible 3-6 %), churn mensuel (cible < 6 %), churn annuel de renouvellement, ARPU, ARPPU, **LTV** (cohorte, revenu net après commission store 15-30 % et TVA), MRR/ARR, mix des plans, taux de remboursement, récupération de facturation (cible > 40 %), taux d'adoption Ultra. Tableau de bord interne (`[STACK_BI]`) : entonnoir par paywall/placement, cohortes de rétention payante, résultats A/B avec intervalles de confiance, raisons de résiliation, cartes par pays, alertes (chute de conversion > 20 % sur 24 h, pic de remboursements, file de webhooks bloquée). Les chiffres viennent de la base `entitlement_grant`/`purchase_event`, pas des seuls événements client.

---

## 2.7 Facturation et support

### 2.7.1 E-mails transactionnels
Fournisseur `[STACK_EMAIL]` (domaine authentifié SPF/DKIM/DMARC). Liste : confirmation d'adresse, lien magique, alerte sécurité (nouvel appareil), bienvenue, début d'essai, rappel de fin d'essai (J-2), confirmation d'abonnement avec reçu, échec de paiement (avec lien de mise à jour), expiration, remboursement, changement de plan, hausse de prix, export prêt, suppression programmée/confirmée, consentement parental. Chaque e-mail : texte brut + HTML, FR/EN/ES, pas de suivi pour les e-mails de sécurité, adresse d'expéditeur dédiée, lien de support. Exemple : objet « Ton essai Sports se termine dans 2 jours » ; corps : « Le 12 octobre, 59,99 € seront débités par l'App Store. Pour éviter la facturation, résilie avant cette date dans Réglages > Abonnements. »

### 2.7.2 Factures et TVA
Les achats store sont facturés par le store (Apple/Google collectent et reversent la TVA ; nous recevons un reçu net). Pour les achats web Stripe : Stripe Tax, factures numérotées séquentielles, TVA par pays (règle OSS UE : taux du pays du client ; pays tiers selon règles locales), mention légale complète (raison sociale, adresse, n° TVA, taux, montants HT/TTC), PDF téléchargeable depuis Profil > Abonnement > Factures et envoyé par e-mail. Conservation 10 ans. Les entreprises (B2B) peuvent saisir un n° de TVA validé VIES (autoliquidation). Écran Profil > Abonnement : plan, prochaine échéance, moyen de paiement (web), historique, boutons Gérer/Restaurer/Résilier.

### 2.7.3 Centre d'aide, chat et FAQ intégrée
Centre d'aide `[STACK_HELPDESK]` (Zendesk, Intercom, Crisp ou Help Scout) avec articles FR indexés ; depuis l'app : Profil > Aide ouvre la FAQ avec recherche et suggestions contextuelles (sur l'écran paywall : « Comment résilier ? », « Que se passe-t-il à la fin de l'essai ? »). Chat support : assistant de premier niveau (réponses issues de la base d'articles uniquement, sans accès à la santé) avec escalade humaine ; en-tête automatique envoyé au support : `user_id`, version de l'app, plateforme, plan, 20 derniers codes d'erreur (sans données de santé). SLA : réponse < 48 h (Sports/Fit), < 24 h (Ultra), 4 h pour les questions de paiement bloquant. Bouton « Signaler un problème » avec capture d'écran facultative et journaux anonymisés avec consentement.

### 2.7.4 Litiges et remboursements
Procédure : (1) achat store → rediriger vers la demande de remboursement du store ; (2) achat web → politique 14 jours, au-delà geste commercial à la discrétion du support avec plafond (> 100 € : validation d'un responsable) ; (3) rétrofacturation (chargeback) → révocation des droits, constitution du dossier de preuve (journal de connexion, usage, reçus), délai de réponse de 7 jours ; (4) compte compromis → remboursement et réinitialisation sécurisée. Chaque litige a un ticket, un motif codé, un montant, un résultat.

### 2.7.5 Vérification d'identité côté support
Avant toute action sur un compte : demande de confirmation via l'e-mail principal ou ré-authentification dans l'app (jamais de modification d'e-mail par simple demande). Aucun agent ne demande ni ne reçoit de mot de passe ; les agents ne voient jamais les données de santé détaillées sans consentement explicite de l'utilisateur dans le ticket.

### 2.7.6 Back-office d'administration
Application web interne (`[STACK_ADMIN]`) derrière SSO + MFA obligatoire, accès par IP/VPN, rôles :

| Rôle | Droits |
|---|---|
| Support N1 | Recherche, lecture profil minimal, renvoi d'e-mails, état d'abonnement |
| Support N2 | + droits manuels temporaires, resynchronisation reçus, annulation de suppression |
| Finance | Remboursements web, factures, litiges |
| Modération | Bannissement, contenus, signalements |
| Admin | Rôles, impersonation, drapeaux |

Fonctions : **recherche utilisateur** (e-mail, `user_id`, pseudo, `original_txn_id`, 4 derniers chiffres Stripe), fiche (identités, appareils, sessions, droits, historique d'achats, tickets, signaux de risque), **octroi manuel de droits** (plan, durée max 90 jours, motif obligatoire, `source = admin`, notification à l'utilisateur), forcer resynchronisation, **remboursement** (Stripe via API, store via lien), **bannissement** (suspension temporaire / définitive, motif, appel possible, blocage de l'appareil haché), annulation de suppression pendant la période de grâce, fusion manuelle de comptes (double validation), export à la demande.

**Impersonation sécurisée** : réservée Admin/N2 ; nécessite un ticket lié et le **consentement de l'utilisateur** (case dans le ticket ou approbation dans l'app) ; session lecture seule par défaut, 15 minutes max, bandeau rouge permanent « Session d'impersonation », aucune action de paiement, de suppression ni de modification du mot de passe, données de santé masquées sauf accord explicite. Le tout dans un **journal d'audit** immuable (`audit_log(id, actor, action, target_user, ticket, before, after, ip, at)`, écriture seule, hachage chaîné, conservation 3 ans) ; chaque consultation d'une fiche est aussi journalisée ; revue mensuelle des accès ; l'utilisateur voit dans Profil > Sécurité « Accès du support » les accès des 90 derniers jours.

---

## 2.8 Légal et conformité propres à cette partie

> Le texte juridique final doit être validé par un avocat ; l'assistant de code implémente la structure, le versionnage et les parcours.

### 2.8.1 CGU et politique de confidentialité
- Documents versionnés (`legal_document(type, version, locale, published_at, content_hash)`) ; à chaque nouvelle version majeure, écran d'acceptation bloquant mais non punitif (l'utilisateur peut exporter/supprimer). Preuve d'acceptation : `consent(user_id, doc, version, at, ip_hash, app_version)`.
- Contenu minimal CGU : description du service, abonnements et renouvellement, résiliation, absence de conseil médical, règles de conduite, propriété du contenu utilisateur, limitation de responsabilité (sports à risque, rando en montagne), loi applicable. Politique de confidentialité : données collectées, finalités, bases légales, destinataires/sous-traitants, transferts hors UE, durées, droits, contact DPO.
- Langage clair, résumé « en 5 lignes » en tête.

### 2.8.2 RGPD : bases légales et durées
| Donnée | Base légale | Durée |
|---|---|---|
| Compte, identité | Contrat | Durée du compte + 30 j |
| Activités GPS | Contrat (+ consentement pour localisation) | Compte ; traces brutes 24 mois après inactivité |
| Données de santé (FC, sommeil, PAR-Q, blessures, poids) | **Consentement explicite** (art. 9) | Jusqu'au retrait, 24 mois d'inactivité |
| Analytics produit | Intérêt légitime ou consentement selon pays/CMP | 13 mois |
| Marketing | Consentement | Jusqu'au retrait, 3 ans d'inactivité |
| Facturation | Obligation légale | 10 ans |
| Journaux de sécurité | Intérêt légitime | 12 mois |
Droits : accès, rectification, effacement, limitation, portabilité, opposition, retrait du consentement, décision automatisée (le coach IA n'a pas d'effet juridique, mais l'explication des recommandations est disponible, voir Partie 5). Réponse sous 30 jours ; formulaire in-app et e-mail DPO. Registre des traitements, AIPD (analyse d'impact) réalisée pour santé + localisation + mineurs. Sous-traitants avec DPA ; hébergement UE ; clauses contractuelles types pour tout transfert.

### 2.8.3 Consentements granulaires
Écrans séparés, non pré-cochés, révocables à tout moment dans Profil > Confidentialité > Mes consentements, avec date d'octroi :
1. Localisation (enregistrement) ; 2. Localisation en arrière-plan ; 3. **Données de santé** (lecture HealthKit/Health Connect, PAR-Q, poids, sommeil) ; 4. Partage des données entre [NOM_APP_SPORTS] et [NOM_APP_FIT] ; 5. Utilisation des données pour personnaliser le coach IA ; 6. Mesures d'audience ; 7. Marketing e-mail ; 8. Marketing push ; 9. Amélioration des modèles (données anonymisées, désactivé par défaut) ; 10. Partage avec un coach humain de la marketplace (par coach).
Retrait d'un consentement : effet immédiat sur le traitement (ex. santé retirée → le coach ne lit plus ces données, bandeau « Le coach fonctionne sans tes données de santé »), pas de dégradation punitive du service de base. CMP pour les analytics/pubs selon pays (UE/UK : consentement ; Californie : « Ne pas vendre ni partager »).

### 2.8.4 Règles des stores : abonnements et données de santé
- Apple : permissions avec chaînes d'usage claires ; HealthKit : aucune donnée de santé pour publicité ni revente, politique de confidentialité obligatoire, pas de stockage dans iCloud ; étiquettes de confidentialité (« privacy nutrition labels ») exactes ; Sign in with Apple ; suppression de compte in-app ; abonnements : affichages §2.6.4 et bouton Restaurer.
- Google Play : formulaire Données de santé et applications de santé, déclaration de la localisation en arrière-plan avec vidéo de démonstration, section Sécurité des données, politique de suppression de compte accessible aussi sur le web, Health Connect : types de données minimaux.
- Revoir chaque version de politique des stores avant soumission (voir Partie 8, checklist de lancement).

### 2.8.5 Mentions de santé et mineurs
Mention visible à l'onboarding, dans les CGU et dans le coach : « [NOM_APP_SPORTS] est un outil de coaching sportif. Il ne remplace pas un avis médical. En cas de douleur, de malaise ou de doute, arrête l'effort et consulte un professionnel. » Pas d'allégation de diagnostic ni de traitement. Les recommandations de nutrition ne dépassent pas des seuils de sécurité (pas de déficit extrême, pas de conseils restrictifs pour mineurs, détection de signaux de troubles alimentaires avec orientation vers une aide, voir Partie 5). Mineurs : voir §2.1.5 et profil privé par défaut ; aucune publicité ciblée.

### 2.8.6 Localisation par pays
Variables de configuration par pays (`country_policy`) : âge de consentement, langues obligatoires des documents légaux (France : français exigé), TVA, activation des liens d'achat externes, présence d'une CMP, hébergement des données (certains pays imposent un stockage local : prévoir `data_region`), blocage de pays sous sanctions, textes légaux locaux (mentions légales françaises, droit de rétractation 14 jours UE, loi californienne CCPA/CPRA, LGPD Brésil, UK GDPR). Un pays inconnu utilise la politique la plus protectrice (UE).

---

## 2.9 Tests et critères d'acceptation

Chaque scénario ci-dessous devient au moins un test automatisé (unitaire, intégration ou E2E) ou une fiche de test manuel. Un scénario est « vert » quand le résultat attendu est observé sans intervention manuelle et sans erreur dans les journaux.

**Authentification et comptes**
1. Inscription e-mail + mot de passe avec mot de passe compromis → refus avec message explicite.
2. E-mail non vérifié → achat et partage bloqués, bannière visible, lien renvoyé (limite 5/h).
3. Sign in with Apple avec e-mail relais → compte créé, ajout d'e-mail réel possible, suppression de compte révoque le jeton Apple.
4. Google avec e-mail déjà existant (vérifié) → liaison après preuve de contrôle, aucun doublon.
5. Lien magique ouvert sur un autre appareil → code à 6 chiffres fonctionne ; lien utilisé deux fois → refus.
6. Passkey ajoutée, supprimée, compte avec une seule méthode → suppression de la dernière méthode refusée.
7. Réutilisation d'un jeton de rafraîchissement ancien → toute la famille révoquée et alerte envoyée.
8. « Déconnecter les autres appareils » → l'autre appareil perd l'accès en ≤ 15 min.
9. 6 échecs de connexion → délai croissant + CAPTCHA, compte non verrouillé définitivement.
10. Changement d'e-mail → confirmation des deux adresses, lien d'annulation 7 jours fonctionnel.
11. Utilisateur Fit ouvre Sports : profil reconnu, écran d'import avec interrupteurs, rien n'est copié avant validation.
12. Fusion de deux comptes avec abonnements actifs différents → droits cumulés, avertissement de double paiement, annulation de fusion possible sous 14 jours.
13. Migration des utilisateurs Fit en dry-run puis réel : zéro perte, idempotence (relance sans effet).
14. Date de naissance → 12 ans (US) → refus, nouvelle saisie immédiate bloquée 24 h.
15. 14 ans en France → consentement parental requis, compte limité avant validation, profil privé par défaut.
16. Suppression de compte avec abonnement actif → avertissement + liens de résiliation ; données supprimées après 14 j de grâce ; reconnexion pendant la grâce annule la suppression.
17. Export des données → archive complète, ré-auth requise, lien expire à 7 jours, limite de 3 par an.
18. Mode invité : enregistrement d'une sortie, création de compte → 50 activités locales rattachées sans perte.

**Onboarding et permissions**
19. Fermeture de l'app à l'écran O5 puis réouverture → reprise à O5 avec réponses conservées.
20. Mode avion pendant O10 → plan de secours affiché en < 3 s.
21. Temps jusqu'à la première valeur ≤ 120 s en 90 % des essais (appareil milieu de gamme, 4G).
22. PAR-Q avec une réponse « Oui » → avertissement, plan plafonné (pas de fractionné), statut `flagged` stocké.
23. PAR-Q question 2 à « Oui » → message d'urgence 112/15 affiché.
24. Localisation refusée définitivement → bouton « Ouvrir les réglages », mode manuel et tapis disponibles.
25. Notifications demandées seulement après la première valeur, jamais avant.
26. Poids saisi 180 en kg alors que l'unité sélectionnée est kg → alerte de plausibilité ; unité lb correcte acceptée.
27. Persona « Reprise » → aucune question de FC/FTP posée.
28. Variante A/B stable : un utilisateur voit la même variante après réinstallation avec le même compte.

**Profil et confidentialité**
29. Poids modifié dans Fit → visible dans Sports en < 60 s ; historique des modifications mentionne l'app source.
30. Refus du partage Fit → les deux apps ne s'échangent que l'identité de base.
31. Zone de confidentialité de 500 m → début et fin de tracé invisibles dans toute vue non propriétaire, vérifié sur l'API (pas seulement l'UI).
32. « Révoquer tous les partages » → toutes les activités deviennent privées en une opération, journalisée.
33. Notifications : plage silencieuse respectée par fuseau local, plafond de 3 push non essentiels/jour respecté, notification obsolète supprimée.

**Abonnements et entitlements**
34. Achat Sports avec essai → droit `sports` actif, `fit` inactif ; rappel J-2 envoyé.
35. Abonné Ultra → l'API renvoie `["fit","sports","ultra"]` dans les deux apps sous 10 s après l'achat.
36. Upgrade Sports → Ultra → accès immédiat, prorata correct, aucun double accès de facturation.
37. Downgrade Ultra → Sports → Ultra conservé jusqu'à l'échéance puis Fit repasse Gratuit, données Fit en lecture seule.
38. Ultra qui veut résilier « un seul volet » → l'app propose Sports/Fit seul, jamais de résiliation partielle impossible.
39. Échec de paiement → période de grâce, bannière non bloquante, récupération → retour `active` sans interruption.
40. Échec définitif → `expired` à la fin de la grâce ; Google : `on_hold` avec message dédié.
41. Remboursement Apple/Google → droits retirés, crédit de parrainage annulé, audit enregistré.
42. Webhook en double → un seul effet ; webhook hors ordre → l'état le plus récent est conservé ; webhook perdu → rattrapé par la réconciliation quotidienne.
43. Même reçu utilisé sur un second compte → refus avec choix de transfert.
44. Sandbox en production → rejeté.
45. Hors ligne 72 h avec abonnement valide → accès conservé ; abonnement expiré hors ligne → retour au Gratuit à la resynchronisation ; recul de l'horloge système → aucune extension.
46. Restauration sur un nouvel appareil → droits retrouvés ; aucun abonnement → message dédié.
47. Abonné Stripe ouvre l'app iOS → accès normal, aucun lien d'achat externe là où il est interdit (`external_offer_allowed = false`).
48. Double abonnement Fit + Sports → bannière « Passe à Ultra » et migration guidée.
49. Invariant de prix : pour chaque pays, Ultra annuel < Fit annuel + Sports annuel (test automatique sur `price_book`).
50. Quota gratuit : 6e message du coach → paywall contextuel, activité en cours jamais interrompue ; historique > 90 j masqué puis restauré après abonnement.
51. Code promo expiré/épuisé/non cumulable → message précis ; parrainage : récompense seulement après première facturation non remboursée.
52. Essai : second essai sur un compte lié au même appareil → refusé.

**Paywall, support, back-office, légal**
53. Paywall : croix visible immédiatement, prix localisé + mention du renouvellement, lien Restaurer présent ; aucune fréquence > 1 plein écran/session.
54. Aucun paywall après déclaration de blessure ou alerte de sécurité.
55. Résiliation détectée (`auto_renew = false`) → carte « Avant ton départ » affichée une fois, enquête enregistrée.
56. Retrait du consentement santé → le coach cesse de lire les données de santé sous 1 minute, bandeau d'information, service de base intact.
57. Nouvelle version des CGU → écran d'acceptation, preuve enregistrée ; refus → export/suppression proposés.
58. Back-office : octroi manuel de droit sans motif → refusé ; avec motif → `source = admin`, notification utilisateur, audit écrit.
59. Impersonation sans ticket ni consentement → impossible ; session > 15 min → coupée ; paiement/suppression bloqués ; audit chaîné vérifiable ; l'utilisateur voit l'accès dans « Accès du support ».
60. Facture web : numérotation séquentielle, TVA du pays du client, PDF téléchargeable, n° TVA B2B validé VIES.

Critère de sortie de la Partie 2 : les 60 scénarios sont verts en CI (serveur) ou validés sur matrice d'appareils (iOS 16+, Android 10+, un petit écran et une tablette), couverture de tests ≥ 90 % sur la machine à états, `AccountMergeService` et le calcul des droits, aucune donnée de santé dans les journaux et l'analytics, revue sécurité et revue juridique signées.
