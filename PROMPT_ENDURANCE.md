# PROMPT MAÎTRE — App « Sports » : module ENDURANCE (marche, randonnée, course, vélo)

> Copie tout ce document dans Claude Code (ou un autre assistant de code) à la racine du projet de la nouvelle app.
> Remplace les éléments entre [CROCHETS] avant de l'envoyer.

---

## 0. RÔLE ET MÉTHODE DE TRAVAIL

Tu es un lead engineer / product designer senior spécialisé en applications mobiles de sport et de santé. Tu construis le **module Endurance** d'une app multi-sports nommée **[NOM_APP_SPORTS]**.

Règles de travail :
1. **Avant d'écrire du code**, lis la structure du dépôt, détecte la stack existante et résume-la-moi en 10 lignes maximum. Si une information manque, pose-moi au plus 5 questions groupées, puis continue avec des hypothèses raisonnables que tu notes explicitement.
2. Travaille **par phases** (section 14). À la fin de chaque phase : lance les tests, lance le lint/typecheck, fais un résumé de ce qui est fait, de ce qui reste, et des risques. Ne passe pas à la phase suivante tant que la précédente n'est pas verte.
3. Fais des **commits petits et clairs**, un par sujet cohérent.
4. Écris du code **lisible, typé, testé**. Pas de code mort, pas de TODO sans ticket, pas de secrets en dur.
5. Quand un choix a plusieurs options valables, donne une recommandation en deux lignes puis applique-la. Ne me fais pas un catalogue.
6. Tout le texte visible par l'utilisateur est **en français**, avec une architecture d'internationalisation prête pour l'anglais et l'espagnol.

---

## 1. VISION PRODUIT

**[NOM_APP_SPORTS]** est la deuxième app d'un écosystème. La première, **[NOM_APP_FIT]**, couvre musculation, nutrition (recettes, aliments), coach sur mesure, planning, trophées et amis.

L'app Sports vise à être **meilleure que les apps spécialisées** (Strava, Komoot, AllTrails, Runna, TrainingPeaks, Garmin Connect) sur un point précis qu'aucune ne traite :

> **Un coach unique qui comprend toute la vie sportive d'une personne** (marche, rando, course, vélo, et plus tard sports d'équipe et de raquette, plus la muscu de l'app Fit), et qui adapte entraînement, récupération et nutrition à l'ensemble.

Promesse utilisateur en une phrase : **« Dis-moi ton objectif, je construis ton plan, je m'adapte à ta vie réelle et à ta fatigue, et je te guide jusqu'au jour J. »**

Public cible :
- Débutants qui reprennent le sport (marche, premières courses).
- Pratiquants réguliers (courir 2-4 fois par semaine, rouler le week-end, randonner).
- Sportifs multi-activités qui veulent un suivi cohérent.

Principes produit non négociables :
- **Simple pour un débutant, profond pour un expert** (divulgation progressive : écrans simples par défaut, détails avancés à un tap).
- **Fonctionne hors ligne** (sorties, cartes téléchargées, enregistrement de séance).
- **Respect de la vie privée** (zones de confidentialité, contrôle fin de ce qui est partagé, export et suppression des données).
- **Sécurité d'abord** (surcharge, blessure, météo, rando en montagne).

---

## 2. PÉRIMÈTRE DU MODULE ENDURANCE

Quatre activités au lancement, avec un moteur commun :

| Activité | Variantes |
|---|---|
| Marche | marche quotidienne, marche active/rapide, marche nordique |
| Randonnée | journée, itinérance multi-jours, trek, balade facile |
| Course | route, trail, piste, tapis (intérieur), fractionné |
| Vélo | route, gravel, VTT, vélo de ville, home-trainer (intérieur) |

Hors périmètre de cette phase (mais l'architecture doit pouvoir les accueillir) : natation, ski de fond, sports d'équipe, sports de raquette.

---

## 3. ARCHITECTURE GÉNÉRALE

### 3.1 Principes
- **Un moteur d'activité unique** (`ActivityEngine`) qui gère toutes les activités d'endurance via un système de **types d'activité configurables** (champs affichés, métriques, calculs spécifiques), et non quatre implémentations séparées.
- **Architecture en couches** : présentation / domaine / données. Le domaine (calculs de charge, génération de plans, règles du coach) est **pur et testable**, sans dépendance à l'UI ni au réseau.
- **Offline-first** : toute action utilisateur s'écrit d'abord en local, puis se synchronise. Résolution de conflits définie (dernier écrit gagne pour les préférences, fusion pour les activités).
- **Comptes et abonnements partagés avec l'app Fit** : même identité utilisateur, même service d'**entitlements** (droits d'accès : `fit`, `sports`, `ultra`). Les droits sont **vérifiés côté serveur**, jamais uniquement côté client.
- **Feature flags** pour activer/désactiver chaque fonction (déploiement progressif, tests A/B).

### 3.2 Stack
[À ADAPTER : décris ici la stack réelle. Exemple : React Native + Expo + TypeScript, backend Supabase/Postgres ou Node + Postgres, abonnements via RevenueCat, cartes via MapLibre + tuiles vectorielles.]
Si la stack n'est pas précisée, propose-moi la plus adaptée en justifiant en cinq lignes, puis attends ma validation avant de coder.

### 3.3 Modules à prévoir
`auth`, `entitlements`, `activity-recording`, `activity-history`, `maps-routes`, `planning-coach`, `training-load`, `nutrition-bridge` (lien avec l'app Fit), `social`, `gamification`, `devices-sync`, `safety`, `notifications`, `analytics`, `settings-privacy`.

---

## 4. MODÈLE DE DONNÉES (à implémenter et migrer)

Propose les schémas complets (types, index, contraintes) pour au minimum :

- **User / Profile** : âge ou date de naissance, sexe (optionnel), taille, poids, FC max et FC repos (optionnelles, estimables), FTP vélo (optionnel), seuil de course (optionnel), niveau déclaré par activité, unités (métrique/impérial), langue, fuseau, préférences de confidentialité.
- **Activity** : id, user, type et sous-type, début/fin, durée en mouvement et durée totale, distance, dénivelé positif/négatif, allure/vitesse moyenne et max, FC moyenne/max, cadence, puissance, calories estimées, météo au départ, matériel utilisé, ressenti (RPE 1-10), note libre, privé/amis/public, source (enregistrée, importée, saisie manuelle), lien vers un plan/séance.
- **ActivityStream** : points échantillonnés (temps, lat, lon, altitude, vitesse, FC, cadence, puissance) stockés de façon compacte (compression, polyline pour la carte) et séparés de la fiche.
- **Lap / Split** : tours manuels, automatiques (par km/mile) et par intervalle d'une séance structurée.
- **Route / Itinéraire** : tracé, distance, dénivelé, profil d'altitude, type de surface, difficulté, source (créé, importé GPX, communauté), points d'intérêt, avertissements.
- **Plan d'entraînement** : objectif, date cible, semaines, séances (structurées en blocs), règles d'adaptation, statut.
- **Séance (Workout)** : blocs (échauffement, intervalles, récupération, retour au calme), cibles (allure, FC, puissance, RPE, durée, distance), consignes audio.
- **Charge d'entraînement** : valeur quotidienne par activité (voir §7), cumul glissant 7/28 jours, indicateurs de forme et de fatigue.
- **Matériel** : chaussures (kilométrage, alerte d'usure), vélos (composants, entretien), sac de rando.
- **Objectif** : type (distance, temps, dénivelé, événement, habitude), valeur, échéance, progression.
- **Événement** : course, rando, randonnée organisée (date, lieu, distance), pour les objectifs.
- **Trophée / Défi** : définitions, progression, récompenses, saison.
- **Social** : amitiés, abonnements, commentaires, réactions, clubs, classements.
- **Entitlement** : user, produit, source (App Store, Google Play, web), statut, dates, essai.
- **Conformité** : consentements, journal d'export, demandes de suppression.

Fournis aussi : stratégie de **migrations**, jeux de données de test (fixtures GPX réalistes : une sortie course 10 km, une rando 800 m D+, une sortie vélo 60 km, une marche courte), et règles de **rétention** des flux GPS bruts.

---

## 5. ENREGISTREMENT D'ACTIVITÉ (CŒUR TECHNIQUE)

Exigences fonctionnelles :
1. **Écran de démarrage rapide** : choix d'activité en un tap, compte à rebours optionnel, détection du signal GPS avec indicateur de qualité, choix de séance/plan lié ou séance libre.
2. **Enregistrement fiable en arrière-plan** : écran verrouillé, app en veille, économie d'énergie. Gestion correcte des permissions de localisation (iOS « toujours / pendant l'utilisation », Android foreground service) avec écrans d'explication avant la demande système.
3. **Récupération après crash ou arrêt système** : l'enregistrement en cours est persisté régulièrement ; à la réouverture, proposer de reprendre ou de sauvegarder.
4. **Pause manuelle et auto-pause** (seuil de vitesse configurable, adapté à l'activité).
5. **Filtrage GPS** : rejet des points aberrants (précision, vitesse irréaliste), lissage, correction d'altitude (barométrique si dispo, sinon modèle d'élévation) pour un dénivelé crédible.
6. **Métriques en direct personnalisables** : jusqu'à 6 champs par écran, plusieurs pages, valeurs par défaut par activité (course : allure, distance, durée, FC ; vélo : vitesse, distance, puissance ; rando : distance, D+, altitude, durée).
7. **Annonces vocales** configurables (par km, par intervalle, écarts de rythme) avec respect des écouteurs et de la musique en cours.
8. **Séances guidées** : affichage du bloc en cours, du suivant, de l'écart à la cible, alertes sonores et vibrations.
9. **Tours** automatiques et manuels.
10. **Capteurs Bluetooth** : FC (ceinture/bracelet), cadence, puissance, vitesse. Détection, appairage, reconnexion automatique, indicateur de signal.
11. **Mode intérieur** : tapis (distance saisie ou estimée) et home-trainer (puissance/cadence via capteurs).
12. **Fin de séance** : récapitulatif immédiat (carte, graphiques, records battus, charge ajoutée, ressenti RPE à renseigner, recommandation de récupération, repas conseillé via l'app Fit).
13. **Saisie manuelle** et **import** (GPX, TCX, FIT), **export** (GPX, TCX, FIT).

Critères de qualité : consommation batterie mesurée et documentée, test sur sorties de 3 h+, test de coupure réseau, test d'entrée dans un tunnel/forêt (perte GPS).

---

## 6. CARTES, ITINÉRAIRES ET RANDONNÉE

1. **Cartes** : fond de carte adapté (rue, topographique, satellite), couches (dénivelé/pente, sentiers, pistes cyclables, points d'eau). Indique la source de données choisie (OpenStreetMap, fournisseurs de tuiles, IGN pour la France) avec ses **licences et coûts**.
2. **Cartes hors ligne** : téléchargement par zone ou par itinéraire, gestion du stockage, mises à jour, suppression, indicateur de fraîcheur.
3. **Création d'itinéraire** : saisie de points, calcul automatique sur sentiers/routes selon l'activité, boucle automatique à partir d'une distance cible, profil d'altitude interactif, estimation du temps selon le profil de l'utilisateur.
4. **Découverte** : itinéraires autour de soi, filtres (distance, D+, difficulté, surface, boucle/aller-retour, adapté aux enfants, accessible en transport), tri par pertinence, favoris, listes.
5. **Navigation** : suivi du tracé, alerte de sortie d'itinéraire, retour au départ, instructions vocales ou simples flèches selon l'activité.
6. **Randonnée avancée** :
   - Étapes d'une itinérance multi-jours (gîtes, refuges, points de ravitaillement).
   - Estimation du temps de marche avec une règle reconnue (type Naismith/Tobler adaptée à l'utilisateur et affinée par ses données réelles).
   - **Check-list de préparation** générée selon durée, météo et altitude (matériel, eau, nourriture, trousse de secours).
   - **Plan de nutrition et d'hydratation** de la rando (calories, glucides, eau par heure) via l'app Fit.
7. **Sécurité** :
   - Partage de position en direct avec des contacts de confiance.
   - **Heure de retour prévue** et alerte automatique aux contacts si dépassée.
   - Détection de chute/immobilité prolongée (avec confirmation).
   - Rappel du numéro d'urgence local (112) et des coordonnées à communiquer.
   - Alertes météo et orages pour la zone et l'heure de la sortie.
   - Avertissements de difficulté honnêtes (ne jamais minimiser un parcours).
8. **Contenu communautaire** : avis, photos, conditions du sentier, signalement de problèmes, **modération** et signalement de contenu.

---

## 7. CHARGE D'ENTRAÎNEMENT, FORME ET RÉCUPÉRATION

Construis un **moteur unique de charge** qui compare des activités différentes sur une même échelle.

1. **Score de charge par séance**, calculé avec la meilleure donnée disponible, par ordre de priorité : puissance (vélo) → FC (TRIMP ou équivalent) → allure/vitesse ajustée au profil → RPE × durée en dernier recours. Explique la formule retenue pour chaque cas et documente les limites.
2. **Charge aiguë (7 jours) vs chronique (28 jours)**, ratio et zones (sous-entraînement, zone optimale, risque). Affichage simple pour le grand public : « Tu peux pousser », « Maintiens », « Récupère ».
3. **Indicateurs** : forme estimée, fatigue, tendance, régularité, volume hebdomadaire par activité.
4. **Estimations de performance** : VO2max estimée (avec marge d'erreur affichée), temps prédits sur 5 km, 10 km, semi, marathon, seuils de course et de puissance estimés à partir des sorties.
5. **Zones d'entraînement** personnalisées (FC, allure, puissance) recalculées quand de nouvelles données arrivent, avec validation par l'utilisateur.
6. **Récupération** : temps de récupération conseillé après chaque séance, **sommeil et repos** saisis ou importés (Apple Santé, Health Connect), fréquence cardiaque au repos et variabilité si disponibles.
7. **Prévention de blessure** : alertes de montée de charge trop rapide (règle de progression hebdomadaire plafonnée), signaux de douleur déclarés, ajustement du plan en conséquence. **Jamais de diagnostic médical** : message clair de consulter un professionnel de santé.

Tout le calcul doit être dans le **domaine pur**, avec une suite de tests unitaires couvrant les cas limites (données manquantes, première semaine, long arrêt, capteurs incohérents).

---

## 8. COACH INTELLIGENT (DIFFÉRENCIATEUR N°1)

### 8.1 Création du plan
Parcours de configuration (court, ludique, reprenable) :
- Objectif : « me remettre à marcher », « courir 5 km », « 10 km en moins de 55 min », « semi », « marathon », « trail de 30 km avec 1 500 m D+ », « rando de 3 jours », « premier 100 km à vélo », « maintenir ma forme »…
- Date cible ou « sans date ».
- Niveau actuel (questions concrètes plutôt qu'auto-évaluation : « combien de minutes peux-tu courir sans t'arrêter ? »).
- Disponibilité réelle : jours, durée max par jour, créneaux préférés, jours de travail/charge mentale.
- Contraintes : blessures passées, terrain disponible (plat/dénivelé), matériel (capteurs, home-trainer), météo locale.
- Autres sports déjà pratiqués (muscu de l'app Fit, sport d'équipe) pour construire un planning **global**.

### 8.2 Génération
- Périodisation (base, développement, spécifique, affûtage, récupération), semaines de décharge, progression plafonnée, séances clés vs séances faciles, diversité d'allures (80/20 ou méthode équivalente expliquée).
- Types de séances : endurance fondamentale, sortie longue, fractionné court et long, seuil, côtes, tempo, récupération active, renforcement/mobilité (lien avec les exercices de l'app Fit), sorties-test.
- Rando : montée en charge du dénivelé et du poids du sac, sorties longues, enchaînement de journées.
- **Chaque séance est expliquée** (« pourquoi aujourd'hui ») en une phrase.

### 8.3 Adaptation continue (le vrai atout)
Le plan **se réécrit automatiquement** selon :
- séances manquées, raccourcies ou trop dures (écart entre prévu et réel, RPE) ;
- charge et fatigue mesurées (§7) ;
- sommeil, stress, douleurs déclarés ;
- météo (canicule, orage, verglas) avec alternative intérieure ;
- événements du calendrier (voyage, week-end chargé) ;
- activités des autres sports (match de foot mardi → on allège le fractionné de mercredi).
Toute modification est **proposée et expliquée**, l'utilisateur peut accepter, refuser ou ajuster. Historique des versions du plan consultable.

### 8.4 Interaction
- **Check-in quotidien** (10 secondes) : énergie, sommeil, douleurs.
- **Coach conversationnel** [optionnel, derrière un feature flag] : questions libres (« j'ai mal au genou en descente, que faire ? ») avec **garde-fous stricts** : pas de diagnostic, renvoi vers un professionnel en cas de signal inquiétant, réponses courtes, ton bienveillant et honnête. Spécifie le prompt système, les limites, la journalisation et la gestion des coûts si un LLM est utilisé. Le moteur de règles reste la **source de vérité** des plans ; le LLM explique et reformule, il ne contourne pas les règles de sécurité.
- **Débrief après séance** : ce qui s'est bien passé, un point d'attention, ce qui change pour la suite.

---

## 9. LIEN AVEC L'APP FIT (NUTRITION, MUSCU, PLANNING)

Contrat d'intégration clair (API/SDK interne), avec les droits vérifiés côté serveur :
1. **Dépense énergétique réelle** → ajustement automatique des objectifs caloriques et macros du jour dans l'app Fit.
2. **Suggestions de repas** avant et après effort (recettes de l'app Fit), plan de ravitaillement pour sorties longues et courses.
3. **Planning unifié** : muscu + endurance sur un seul calendrier, avec règles anti-conflit (pas de jambes lourdes la veille d'une séance clé, etc.).
4. **Renforcement musculaire ciblé** pour coureurs, cyclistes et randonneurs (prévention) proposé depuis la bibliothèque de l'app Fit.
5. **Profil et données corporelles partagés** (poids, objectifs) avec une seule source de vérité et consentement explicite.
6. **Trophées et amis communs** aux deux apps.
7. **Mode dégradé** : si l'utilisateur n'a que Sports, ces fonctions apparaissent en version limitée avec invitation à découvrir Fit ; s'il a Ultra, tout est débloqué.

---

## 10. SOCIAL ET GAMIFICATION

- **Fil d'activité** (amis, clubs) avec réactions et commentaires, carte et statistiques clés, contrôle fin de la visibilité (privé / amis / public), **zones de confidentialité** autour du domicile et du travail.
- **Clubs et groupes** : création, invitations, classements, défis collectifs, sorties planifiées en commun.
- **Défis** : hebdomadaires, mensuels, saisonniers, **croisés entre activités** (kilomètres cumulés toutes disciplines, dénivelé total, régularité).
- **Trophées** : paliers de distance, régularité (séries de semaines), records personnels, découvertes (premier trail, première rando de 1 000 m D+), actions de sécurité et de préparation. Pas de mécanique qui pousse à l'excès (pas de série qui punit une pause maladie : prévoir des « jours de repos protégés »).
- **Classements locaux et segments** [phase ultérieure] : toujours avec options pour se retirer.
- **Partage** : cartes visuelles prêtes pour les réseaux, avec confidentialité par défaut.
- **Modération** : signalement, blocage, filtre des contenus, conformité aux règles des stores pour les contenus générés par les utilisateurs.

---

## 11. APPAREILS ET INTÉGRATIONS

- **Apple Santé / HealthKit** et **Health Connect (Android)** : lecture (pas, FC, sommeil, poids) et écriture des activités, avec permissions fines.
- **Montres** : prévoir l'architecture pour une app Apple Watch et Wear OS (enregistrement autonome, synchronisation) ; phase dédiée plus tard, mais n'empêche pas d'importer des fichiers FIT dès le départ.
- **Garmin, Polar, Suunto, Wahoo, Coros, Strava** : évalue les API officielles disponibles, leurs conditions d'utilisation, quotas et coûts ; propose un ordre de priorité et ne contourne **jamais** les conditions d'une API.
- **Import/Export** de fichiers (GPX, TCX, FIT) dès la V1.
- **Capteurs Bluetooth** standards (profils FC, vitesse/cadence, puissance).

---

## 12. MONÉTISATION ET ABONNEMENTS

Plans (tarifs à définir, structure imposée) :
- **Gratuit** : enregistrement d'activités, historique de base, statistiques simples, quelques itinéraires, marche et suivi de pas, trophées de base, social de base.
- **Sports (payant)** : coach adaptatif complet, plans multi-semaines, charge d'entraînement et récupération, cartes hors ligne illimitées, navigation avancée, sécurité avancée (partage de position, heure de retour), analyses détaillées, import/export avancés.
- **Fit (payant)** : l'offre existante de l'app Fit.
- **Ultra (Fit + Sports)** : tout, plus planning unifié, nutrition adaptée à l'effort, défis croisés. Prix inférieur à la somme des deux (remise de l'ordre de 20 à 30 %).

Technique :
- Achats intégrés via les stores (App Store, Google Play) avec un **service d'entitlements unique** (ex. RevenueCat ou équivalent) qui débloque les droits dans **les deux apps**.
- **Vérification côté serveur** des droits, validation des reçus, gestion de la restauration d'achats, des essais gratuits, de la période de grâce, des remboursements, du changement de plan (upgrade/downgrade) et du passage Fit → Ultra sans payer deux fois (calcul au prorata géré par le store).
- **Écran d'abonnement** clair (honnête sur les prix, la durée, le renouvellement et la résiliation, conforme aux règles des stores), déclenché au bon moment (après une première valeur perçue, pas avant l'onboarding).
- **Analytics de conversion** et expérimentations de pricing derrière feature flags.

---

## 13. EXPÉRIENCE UTILISATEUR ET DESIGN

- **Onboarding** en moins de 2 minutes : objectif, niveau, première activité possible immédiatement, demande de permissions expliquée au bon moment.
- **Navigation principale** (5 onglets maximum) : Aujourd'hui (plan du jour + check-in), Enregistrer, Cartes/Itinéraires, Progression (charge, records, objectifs), Social.
- **Écran « Aujourd'hui »** : séance du jour, pourquoi, météo, conseil nutrition, bouton démarrer, état de forme en un coup d'œil.
- **Design system** commun avec l'app Fit (couleurs, typographie, composants) pour une identité d'écosystème, avec une personnalité propre à Sports.
- **Accessibilité** : tailles de texte dynamiques, contrastes, lecteurs d'écran, usage à une main, gros boutons pendant l'effort, mode sombre et lecture en plein soleil.
- **États vides, chargement et erreurs** soignés sur tous les écrans, avec messages humains.
- **Performance** : démarrage rapide, listes virtualisées, cartes fluides, historique volumineux géré par pagination.
- **Micro-copie** : ton encourageant, jamais culpabilisant.

---

## 14. FEUILLE DE ROUTE PAR PHASES (À SUIVRE DANS L'ORDRE)

**Phase 0 : Fondations** : audit du dépôt, choix techniques validés, structure des modules, design system, authentification partagée, service d'entitlements, CI (lint, types, tests), feature flags, analytics, gestion d'erreurs.

**Phase 1 : Enregistrement** : enregistrement GPS fiable (course, marche, vélo), historique, détail d'activité (carte + graphiques), métriques en direct, pause, tours, récupération après crash, import/export GPX, profils d'activité. *Critère de sortie : tests terrain de 3 h sans perte de données.*

**Phase 2 : Progression et charge** : moteur de charge, zones, records personnels, objectifs, statistiques hebdomadaires et mensuelles, matériel (chaussures).

**Phase 3 : Coach adaptatif v1** : création de plan (course 5 km → semi, marche → course, objectif de forme), séances structurées guidées en direct, adaptation sur séances manquées et charge, check-in quotidien.

**Phase 4 : Cartes, itinéraires et randonnée** : fonds de carte, hors ligne, création et découverte d'itinéraires, navigation, profil d'altitude, rando multi-jours, check-list, sécurité (partage de position, heure de retour).

**Phase 5 : Écosystème Fit et Ultra** : planning unifié, nutrition adaptée, trophées et amis partagés, écran d'abonnement complet, offre Ultra.

**Phase 6 : Social et défis** : fil, clubs, défis croisés, confidentialité avancée, modération.

**Phase 7 : Appareils** : HealthKit/Health Connect, capteurs Bluetooth, imports de plateformes tierces, préparation montres.

**Phase 8 : Vélo avancé et trail** : puissance et FTP, home-trainer, séances de côtes, ravitaillement longue distance, plans trail avec D+.

**Phase 9 : Coach conversationnel et finitions** : assistant (derrière feature flag), a11y, localisation EN/ES, optimisation batterie et performance, préparation de la sortie publique.

Pour chaque phase, produis : liste des tickets, schéma de données impacté, écrans, critères d'acceptation, plan de test, risques.

---

## 15. QUALITÉ, TESTS ET OBSERVABILITÉ

- **Tests unitaires** du domaine (charge, zones, génération et adaptation de plans, estimations de temps, filtrage GPS, formules de calories) avec cas limites et jeux de données réalistes.
- **Tests d'intégration** : synchronisation offline/online, conflits, migrations, entitlements (achat, annulation, restauration, remboursement).
- **Tests de bout en bout** des parcours critiques : onboarding, démarrage et fin d'une sortie, achat d'abonnement, création de plan, téléchargement de carte hors ligne.
- **Tests terrain** documentés (appareils bas de gamme et haut de gamme, iOS et Android, mauvaise couverture).
- **Observabilité** : crash reporting, traces de performance, métriques produit (activation, rétention J1/J7/J30, enregistrements terminés, taux d'abandon d'enregistrement, conversion payante), journaux sans données personnelles sensibles.
- **CI/CD** : builds automatiques, canaux de test (TestFlight, tests internes Google Play), déploiement progressif, retour arrière simple.

---

## 16. CONFORMITÉ, SÉCURITÉ ET ÉTHIQUE

- **RGPD** : base légale, consentements granulaires, export et suppression des données, minimisation, durées de conservation, registre des traitements. Les données de localisation et de santé sont **sensibles** : chiffrement en transit et au repos, accès restreint, journalisation des accès.
- **Règles des stores** : permissions de localisation et d'arrière-plan justifiées, texte de confidentialité exact, contenus générés par les utilisateurs modérés, abonnements conformes.
- **Avertissements de santé** : l'app ne remplace pas un avis médical ; questionnaire d'aptitude (type PAR-Q) à l'onboarding ; recommandation de consulter un médecin pour certains profils.
- **Sécurité** : authentification robuste, protection contre les abus d'API, limites de débit, validation côté serveur, gestion des secrets, dépendances auditées.
- **Honnêteté des estimations** : afficher les marges d'erreur (VO2max, temps prédits, calories), ne pas promettre de résultats.
- **Éthique du design** : pas de dark patterns, pas de gamification qui encourage le surentraînement, désinscription facile.

---

## 17. LIVRABLES ATTENDUS À CHAQUE ÉTAPE

1. Un **résumé d'architecture** à jour (diagramme texte des modules et flux de données).
2. Le **code** commité par petits lots, avec tests.
3. Un fichier `docs/DECISIONS.md` listant chaque décision technique importante (contexte, options, choix, conséquences).
4. Un fichier `docs/RISQUES.md` listant risques techniques, légaux et produit avec plan d'atténuation.
5. Un fichier `docs/ROADMAP.md` mis à jour (fait / en cours / suivant).
6. Une **liste de ce qui doit être décidé par moi** (prix, noms, contenus, licences de données de cartes, budget d'API).

---

## 18. PREMIÈRE ACTION DEMANDÉE

1. Analyse le dépôt et résume la stack existante.
2. Liste tes hypothèses et au plus 5 questions bloquantes.
3. Propose l'architecture détaillée de la **Phase 0** et le découpage en tickets.
4. Attends ma validation avant de commencer à coder la Phase 1.
