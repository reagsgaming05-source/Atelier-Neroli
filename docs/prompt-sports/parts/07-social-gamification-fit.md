# PARTIE 7 — Social, gamification, communautés, marketplace de coachs, événements et intégration avec Fit

Cette partie définit tout ce qui relie les personnes entre elles (amis, clubs, défis, événements, coachs humains) et à l'app [NOM_APP_FIT]. Elle s'appuie sur l'identité et les droits de la Partie 2, le moteur d'activité de la Partie 3, les cartes et la sécurité de la Partie 4, le coach de la Partie 5 et les sports collectifs de la Partie 6. Principe directeur : **la vie privée est le réglage par défaut, le partage est un choix explicite, et aucune mécanique sociale ne doit pousser à se blesser**. Stack : [STACK_BACKEND], [STACK_TEMPS_REEL], [STACK_STOCKAGE_MEDIAS], [STACK_PUSH].

---

## 7.1 Graphe social

### 7.1.1 Relations
Le graphe est **commun aux deux apps** (source de vérité : service `social-graph`, voir 7.10). Deux types de relations :

| Relation | Sens | Mécanisme |
|---|---|---|
| Ami | Symétrique | Demande, puis acceptation. Statuts : `pending`, `accepted`, `declined`, `cancelled`. |
| Abonnement (follow) | Asymétrique | Un profil **public** peut être suivi sans accord ; un profil **privé** exige une approbation. |

Règles :
- Un ami est automatiquement un abonné mutuel. Retirer un ami conserve un abonnement si le profil est public.
- Limites : 1 000 amis maximum, 50 demandes sortantes en attente, 20 nouvelles demandes par jour (anti-spam). Une demande refusée ne peut être renvoyée qu'après 30 jours.
- **Blocage** : effet immédiat et bidirectionnel. Le bloqué ne voit plus le profil, les publications, les commentaires, les clubs privés communs, les segments ni les classements de l'autre ; il ne peut plus le mentionner, le chercher ni l'inviter. Il n'est **jamais notifié**. Les relations existantes sont supprimées. Le blocage s'applique aussi aux comptes liés (même appareil, même e-mail normalisé) lorsqu'un signalement de harcèlement est avéré.
- **Mute** : silencieux et unilatéral. Masque le fil et les notifications d'une personne sans rompre la relation. Options : mute des publications seules, ou aussi des commentaires.
- **Restriction** (« limiter ») : l'autre peut commenter, mais ses commentaires ne sont visibles que de lui, sauf approbation.

### 7.1.2 Suggestions d'amis
Sources, chacune derrière un **consentement séparé, désactivé par défaut et révocable** :
1. Contacts du téléphone : hachage SHA-256 salé côté appareil, comparaison côté serveur ; jamais de stockage des contacts non appariés ; suppression des empreintes à la révocation.
2. Activité proche : personnes ayant pratiqué à moins de 300 m et dans les 10 minutes sur un même parcours, **uniquement si les deux ont activé « Être suggéré aux personnes croisées »**. Jamais de position précise exposée, seulement un nom et « croisé sur un parcours ».
3. Clubs et événements communs.
4. Amis d'amis (≥ 2 amis en commun).

Score = 3 × amis communs + 2 × clubs communs + 2 × événements communs + 1 × sports communs + 1 × contacts. Seuil minimal 3. Exclure les bloqués, les mutés, les mineurs vers adultes inconnus (voir 7.3.6) et les profils ayant refusé la suggestion (mémoriser le rejet 90 jours).

### 7.1.3 Recherche
Recherche par nom d'affichage ou identifiant (`@handle`, unique, 3-20 caractères). Résultats : amis, puis amis d'amis, puis public. Les profils qui ont désactivé « Apparaître dans la recherche » ne sont trouvables que par `@handle` exact. Pas de recherche par e-mail ni par numéro de téléphone sans consentement mutuel. Limite de 60 requêtes par heure et par compte (anti-moissonnage).

### 7.1.4 Profils publics
| Champ | Visibilité par défaut | Options |
|---|---|---|
| Nom d'affichage, avatar, @handle | Public (nécessaire à la recherche) | Pseudonyme autorisé |
| Bio (200 car.), ville approximative | Amis | Privé / Amis / Public |
| Sports pratiqués, niveau par sport | Amis | idem |
| Statistiques cumulées (km, durée) | Amis | idem |
| Niveau, trophées, séries | Amis | idem |
| Activités | Selon l'activité (7.3) | idem |
| Date de naissance, poids, santé | **Jamais visibles** | Aucune option publique |

Un profil neuf est **privé (amis)** par défaut. Le passage en public exige un écran de confirmation listant ce qui devient visible.

### 7.1.5 Vérification de profil
Badge « Vérifié » (coche) pour : coachs certifiés (7.9), clubs officiels, organisateurs d'événements, athlètes publics. Procédure : demande dans l'app, pièce d'identité traitée par [FOURNISSEUR_KYC] (non conservée au-delà de 30 jours), preuve de lien (diplôme, statut d'organisateur). Retrait automatique si le compte est sanctionné deux fois en 12 mois.

**Critères d'acceptation 7.1** : un bloqué ne peut plus retrouver l'autre par aucune route API (profil, recherche, mention, classement : 404 uniforme) ; les contacts non appariés ne sont jamais écrits en base ; désactiver la suggestion supprime l'utilisateur des suggestions en moins de 15 minutes.

---

## 7.2 Fil d'activité

### 7.2.1 Types de publications
| Type | Origine | Contenu |
|---|---|---|
| `activity` | Fin d'activité (publication manuelle ou auto selon réglage) | Résumé, carte floutée, stats choisies, photos |
| `record` | Détection d'un record personnel (7.6.5) | Ancien/nouveau record, delta |
| `trophy` | Obtention d'un trophée | Visuel, rareté, date |
| `challenge` | Participation, victoire, classement de défi | Rang, progression |
| `photo` | Manuelle | 1 à 10 photos/vidéos, légende |
| `event` | Inscription ou résultat à un événement (7.8) | Fiche, temps officiel |
| `match` | Fin de match en sport d'équipe/raquette (Partie 6) | Score, équipe, stats |
| `club_post` | Fil de club (7.4) | Texte, sondage, annonce |

Chaque publication a : `visibility` (`private|friends|clubs|public`), `source_activity_id` optionnel, `app_origin` (`sports|fit`). Les séances de muscu de Fit apparaissent dans le fil Sports si l'utilisateur l'autorise (réglage « Fil unifié »).

### 7.2.2 Ranking du fil
Deux onglets : **Suivis** (chronologique inverse strict, par défaut) et **Pour toi** (classé). Score du classé :

`score = 0,45 × récence + 0,30 × affinité + 0,15 × engagement + 0,10 × nouveauté_type − pénalités`

- `récence = exp(−âge_en_heures / 18)`.
- `affinité = min(1, 0,1 × interactions_30j_avec_l'auteur + 0,3 × ami + 0,15 × club_commun + 0,15 × même_sport)`.
- `engagement = min(1, ln(1 + réactions + 3 × commentaires) / ln(40))`.
- `nouveauté_type` = 1 pour trophée/record/événement, 0,6 pour activité, 0,3 pour répétition d'un même type du même auteur dans les 6 h.
- Pénalités : −0,5 si l'auteur est muté en « réduit » ; −0,3 si publication déjà vue ; −1 si signalée et en attente de revue.
- Diversité : pas plus de 2 publications consécutives du même auteur. Pas de classement par émotion négative ni par « temps passé ». Fin de fil explicite (« Tu es à jour ») après 7 jours de contenu.

### 7.2.3 Interactions
- **Réactions** : 5 icônes (bravo, force, feu, cœur, rire). Une seule réaction par personne et par publication, modifiable.
- **Commentaires** : 1 000 caractères, un niveau de réponse, édition 15 min, suppression par l'auteur du commentaire, de la publication ou un modérateur.
- **Mentions** `@handle` : seulement les amis, abonnés mutuels et membres du même club ; la personne mentionnée peut se retirer de la mention. Une mention d'un non-ami déclenche une demande d'acceptation, pas une notification directe.
- **Partages** : repartage interne uniquement si la publication source est `public` ; sinon bouton absent. Le repartage hérite de la visibilité la plus restrictive.

### 7.2.4 Médias
- Photos : compression côté appareil (côté long 2 048 px, qualité 80, WebP/HEIC → JPEG de repli), poids cible < 800 Ko ; **suppression des métadonnées EXIF, dont le GPS**, côté serveur systématiquement.
- Vidéos : 60 s maximum, 1080p, transcodage serveur en HLS 720p et 480p, taille max d'envoi 200 Mo.
- Stockage [STACK_STOCKAGE_MEDIAS] avec URL signées expirant en 1 h ; effacement physique 30 jours après suppression logique.
- Modération avant diffusion hors cercle d'amis : classifieur automatique de nudité, violence, mineurs en situation inappropriée ; seuil haut → blocage immédiat et file humaine (7.13) ; seuil moyen → diffusion limitée aux amis en attendant la revue.

### 7.2.5 Cartes de partage pour réseaux sociaux
Formats : story 1080×1920, carré 1080×1080, paysage 1200×630. Templates : « Carte du tracé », « Stats en grand », « Record », « Trophée », « Bilan annuel », « Défi gagné », « Match ». Fond : photo, carte stylisée, ou dégradé.
**Confidentialité par défaut** : le tracé est affiché avec **flou de début et de fin de 200 m** (ou la zone masquée de l'utilisateur, 7.3.3), sans fond de carte détaillé permettant de reconnaître une rue ; pas d'heure précise de départ ; pas de nom de lieu de domicile. L'utilisateur peut afficher le tracé complet uniquement pour un parcours qu'il marque « parcours public » ; un avertissement s'affiche. Génération côté appareil (rendu hors ligne), filigrane [NOM_APP_SPORTS] discret, lien profond de parrainage optionnel (7.12).

### 7.2.6 Vie privée par publication, signalement
Chaque publication porte son sélecteur de visibilité, initialisé au réglage par défaut du type d'activité (7.3.2). Modifier la visibilité vers plus restrictif est immédiat et retire la publication des fils, caches CDN compris, en moins de 60 s. Menu « … » : signaler (spam, harcèlement, nudité, violence, mineur en danger, dangereux, autre), masquer, mute, bloquer. La modération combine détection automatique (texte et image) et revue humaine (7.13).

**Cas limites** : activité supprimée → publication liée supprimée et commentaires archivés ; auteur supprimé → contenu anonymisé dans les clubs (« Ancien membre ») ou supprimé selon son choix ; commentaire contenant un lien → refusé pour les comptes de moins de 7 jours.

---

## 7.3 Confidentialité sociale

### 7.3.1 Niveaux
`private` (moi seul) < `friends` < `clubs` (membres des clubs choisis, y compris les amis) < `public`. Le niveau `clubs` ouvre un sélecteur de clubs ; la visibilité effective est l'intersection avec les règles de blocage.

### 7.3.2 Paramètres par défaut protecteurs
| Réglage | Défaut |
|---|---|
| Visibilité du profil | Amis |
| Visibilité des activités | Amis (et **Privé** pour les activités marquées « santé » ou en intérieur de domicile) |
| Publication automatique à la fin | Désactivée (proposition à confirmer) |
| Zones masquées | Domicile détecté et proposé dès la 2e activité commençant au même endroit |
| Positions en direct | Désactivées |
| Apparaître dans la recherche / suggestions | Recherche oui, suggestions « croisés » non |
| Statistiques de santé (FC, poids, sommeil, charge) | Jamais partagées par défaut |

### 7.3.3 Zones masquées
Cercles de 200 m, 500 m ou 1 km (par défaut 400 m) autour d'adresses (domicile, travail, école, autres), jusqu'à 10 zones. Toute portion de tracé dans la zone est **retirée côté serveur à la diffusion** (le tracé complet reste privé pour l'utilisateur). La détection automatique propose une zone quand ≥ 3 activités démarrent ou finissent dans un rayon de 150 m. Les zones s'appliquent rétroactivement aux anciennes publications (recalcul asynchrone). Les segments ne comptent pas de temps dans une zone masquée pour l'affichage public (voir 7.7).

### 7.3.4 Partage de santé, historique, effacement
- Aucune donnée de santé (FC, VFC, sommeil, poids, blessures, cycle) n'apparaît dans un profil public. Partage vers un coach humain uniquement par consentement explicite (7.9.8).
- L'historique des positions et activités est exportable (GPX, FIT, JSON, voir Partie 8) et supprimable par activité, par période ou en totalité.
- **Droit à l'oubli** : suppression du compte = suppression immédiate de l'accès public, purge des données personnelles sous 30 jours, anonymisation irréversible des agrégats (classements passés, statistiques de clubs). Sauvegardes purgées sous 90 jours. Les segments créés par l'utilisateur restent mais sans attribution.

### 7.3.5 Prévention du pistage (stalking)
Mesures obligatoires :
1. **Le domicile n'est jamais exposé** : zone masquée proposée par défaut, et aucune carte publique ne montre un départ ou une arrivée à moins de 200 m d'une zone détectée.
2. **Délai de publication** : un tracé n'est visible par d'autres qu'au minimum **30 minutes après la fin** (paramétrable jusqu'à 24 h). Aucun partage de « dernière position » en public.
3. **Positions en direct** (Partie 4, sécurité) : limitées à des contacts de sécurité nominatifs choisis, lien à durée limitée (max 12 h), révocable en un tap, affichage d'un bandeau permanent « Position partagée » pendant l'enregistrement.
4. **Blocage efficace** (7.1.1), y compris dans les clubs et événements : la personne bloquée est masquée des listes de participants vues par le bloqueur.
5. Pas de notification « X est à proximité » ni de carte de chaleur individuelle. Cartes de chaleur agrégées avec seuil minimal de 10 personnes distinctes par cellule.
6. Alerte à l'utilisateur lorsqu'un compte non ami consulte son profil plus de 10 fois en 24 h (sans révéler l'identité, avec bouton de renforcement de la confidentialité).

### 7.3.6 Protection des mineurs
- 13-15 ans (ou âge légal local, voir Partie 8 pour la conformité) : compte privé forcé, aucun message de non-amis, pas de suggestions « croisés », pas de position en direct publique, pas de clubs publics, pas de défis sponsorisés ni de marketplace ; consentement parental vérifié [FOURNISSEUR_CONSENTEMENT_PARENTAL].
- 16-17 ans : profil limité à « Amis » au maximum, messages de non-amis désactivés, publicité ciblée interdite.
- Moins de 13 ans : inscription refusée.
- Un adulte ne peut pas envoyer de demande d'ami à un mineur sans lien préalable (club commun validé par un responsable, ou code d'invitation du parent). Tout mineur bénéficie d'une revue prioritaire en modération.

**Critères d'acceptation 7.3** : une activité commençant dans une zone masquée ne produit jamais de point dans cette zone dans la réponse API d'un tiers (test automatisé avec 1 000 tracés) ; le lien de position en direct expire à l'heure dite ; un compte mineur ne peut pas passer en public même par appel API direct (403 testé).

## 7.4 Clubs et communautés

### 7.4.1 Création et types
Tout utilisateur Sports, Fit ou Ultra peut créer jusqu'à 3 clubs (Gratuit : peut rejoindre, pas créer). Types : `running_club`, `hiking_group`, `cycling_club`, `team` (sports collectifs, Partie 6), `company`, `school`, `city`, `other`. Champs : nom unique, description, sports, ville, logo, couverture, langue, règles, `join_policy` (`open`, `approval`, `invite_only`, `paid`).

### 7.4.2 Rôles et permissions
| Action | Propriétaire | Admin | Modérateur | Coach du club | Membre |
|---|---|---|---|---|---|
| Supprimer/transférer le club | oui | non | non | non | non |
| Gérer rôles, facturation | oui | oui | non | non | non |
| Accepter/exclure membres | oui | oui | oui | non | non |
| Créer sorties, défis, annonces | oui | oui | oui | oui | non (propositions) |
| Modérer publications | oui | oui | oui | non | non |
| Voir stats agrégées | oui | oui | non | oui | non |
| Publier, commenter, s'inscrire | oui | oui | oui | oui | oui |

Un club doit toujours avoir au moins un propriétaire ; en cas de départ du dernier, transfert automatique au plus ancien admin, sinon archivage après 30 jours.

### 7.4.3 Adhésion et contenus
- Clubs publics : contenu minimal visible (nom, description, nombre de membres, prochaines sorties). Clubs privés : rien hors membres. Mineurs : voir 7.3.6, un responsable majeur vérifié obligatoire.
- **Fil de club** (type `club_post`), **annonces épinglées** (max 3), sondages, **chat** de club (canaux : général, sorties, un canal par sortie) ; messages 2 000 caractères, pièces jointes images, modération identique à 7.13, historique conservé 12 mois, mute par canal.
- **Classements de club** : kilomètres, durée, dénivelé, jours actifs, sur semaine/mois/année glissante, toutes disciplines ou filtrés. Option club « classement masqué » (affiche seulement l'effort collectif) ; chaque membre peut choisir de ne pas figurer (7.7.4).
- **Défis de club** : voir 7.5.

### 7.4.4 Sorties collectives
Modèle `group_ride` : titre, sport, parcours (itinéraire de la Partie 4, avec trace et dénivelé), date et heure, **point de rendez-vous** (adresse + coordonnées, visible aux seuls inscrits), allure ou vitesse cible (fourchette, ex. 5:30-6:00 /km ou 24-26 km/h), niveau (débutant/intermédiaire/avancé), nombre de places, liste d'attente, politique de retardataires, regroupement (oui/non), eau/ravitaillement, contact d'urgence de l'organisateur.
- **Inscription** : un tap, désinscription libre jusqu'à H−2 ; liste d'attente avec promotion automatique et notification.
- **Météo** : prévision J−3, J−1 et H−3 sur le point de rendez-vous et le point haut du parcours ; seuils d'alerte (orage, vent > 50 km/h, température < −5 °C ou > 33 °C, verglas) déclenchant une proposition d'annulation à l'organisateur.
- **Annulation** : par l'organisateur, notification immédiate aux inscrits avec motif ; annulation automatique suggérée si moins de 2 inscrits à H−6 ; sorties récurrentes (hebdomadaires) avec exceptions.
- **Pendant la sortie** : mode groupe optionnel affichant aux seuls participants consentants la position des autres (désactivé par défaut, durée limitée à la sortie). Présence validée par check-in à moins de 150 m du rendez-vous ; l'activité enregistrée est rattachée automatiquement à la sortie.
- Sécurité : rappel du matériel obligatoire (casque, lampe), alerte si l'itinéraire dépasse le niveau de la majorité des inscrits (Partie 4).

### 7.4.5 Adhésion payante optionnelle
Le propriétaire peut fixer une cotisation (mensuelle ou annuelle) pour accéder à des contenus ou sorties. Paiement : achat in-app pour les contenus numériques du club (règles des stores, 7.9.6) ; paiement externe permis pour les cotisations d'association réelle ([STACK_PAIEMENT_WEB]) lorsque la politique du store le permet. Commission plateforme : 10 % sur le numérique, 0 % sur cotisation d'association hors app. Remboursement : prorata à la demande dans les 14 jours si aucune sortie n'a été suivie.

### 7.4.6 Outils de gestion et entreprises
Tableau de bord : membres actifs 7/30 jours, sorties, participation, croissance, export CSV des inscrits (avec consentement des membres). Invitation par lien, code, e-mail. Messages groupés (max 1 par jour).
**Programmes d'entreprise** (type `company`, offre B2B [OFFRE_ENTREPRISE]) : l'employeur configure défis et objectifs bien-être. **Agrégation anonyme obligatoire** : aucune donnée individuelle ni santé n'est visible de l'employeur ; seuils d'agrégation minimaux de 10 participants par groupe ; seules sont publiées les statistiques collectives (participation, kilomètres totaux, jours actifs moyens). L'adhésion au programme est volontaire et l'employé peut partir sans justification, avec suppression de sa contribution nominative.

**Critères d'acceptation 7.4** : un membre exclu perd l'accès en moins de 60 s au chat et aux sorties ; une sortie annulée notifie 100 % des inscrits et libère le point de rendez-vous ; un groupe d'entreprise de moins de 10 membres n'affiche aucune statistique.

---

## 7.5 Défis

### 7.5.1 Types
| Type | Durée | Exemple |
|---|---|---|
| Hebdomadaire | Lun-dim | « 20 km, toutes disciplines » |
| Mensuel | Mois civil | « 12 jours actifs » |
| Saisonnier | 3 mois | « Défi de l'été : 500 km cumulés » |
| Événementiel | Autour d'un événement | « Prépare ton semi » |
| Entre amis | 1 à 30 jours | 1 contre 1 ou équipes de 2 à 10 |
| Club / Entreprise | Libre | Collectif ou individuel |
| Sponsorisé | Libre | Marque partenaire |

### 7.5.2 Métriques croisées entre activités
Un défi choisit une métrique et un jeu d'activités éligibles :
- **Km toutes disciplines** avec coefficients d'équivalence : marche ×1, course ×1, randonnée ×1, vélo ×0,25 (4 km de vélo = 1 km), natation ×4, rando raquettes ×1,5. Coefficients publiés dans le règlement et versionnés.
- **Dénivelé positif total**, **jours actifs** (au moins 20 min d'effort ou 3 000 pas supplémentaires), **régularité** (nombre de semaines consécutives avec ≥ 3 séances), **temps en mouvement**, **points d'expérience** (7.6) hors muscu.
- Plafonds par défaut pour limiter l'abus : 100 km/jour de course/marche, 300 km/jour de vélo, 5 000 m de D+/jour ; les valeurs au-delà ne comptent pas mais l'activité reste enregistrée.
- Les séances de muscu de Fit comptent dans « jours actifs » et « régularité » si l'utilisateur est abonné Fit ou Ultra.

### 7.5.3 Défis entre amis
Création en 3 taps : métrique, durée, adversaire(s). Invitation avec acceptation. Handicaps optionnels : pourcentage de progression plutôt que valeur absolue (équitable entre niveaux). Un duel affiche la progression relative, jamais d'écart humiliant ; trop d'avance affiche « Belle avance ! ».

### 7.5.4 Défis sponsorisés
Règles : mention « Sponsorisé par [MARQUE] » visible dès la liste, règlement public, récompense décrite (produit, remise, don), dotation précise, aucune collecte de données personnelles au-delà du nécessaire (consentement distinct pour toute transmission à la marque), exclusion des mineurs, pas de défi encourageant la vitesse excessive ou la distance extrême. Revue éditoriale obligatoire avant publication ; le sponsor ne voit que des agrégats.

### 7.5.5 Anti-triche
Pipeline exécuté à la fin de chaque activité (Partie 3 fournit les données) :
| Contrôle | Règle |
|---|---|
| Vitesse impossible | Course > 25 km/h soutenus 60 s, marche > 9 km/h, vélo route > 80 km/h hors descente (pente < −5 %), vélo VTT > 60 km/h |
| Véhicule | Vitesse constante 30-130 km/h sur trace routière, absence de cadence en course/marche, capteur de mouvement incompatible |
| Doublons | Même trace (Hausdorff < 30 m) et chevauchement horaire > 70 % entre sources (montre + téléphone) : fusion ou exclusion de l'une |
| Téléportation | Saut > 500 m en < 5 s sans perte GPS |
| Cohérence physio | FC moyenne < 70 bpm à allure de sprint, puissance > 2 100 W |
| Dénivelé | D+ > 600 m/km sur plus de 1 km sans pente correspondante |
| Saisie manuelle | Activités saisies à la main exclues des classements de défis compétitifs par défaut |

Résultat : `valid`, `suspect`, `invalid`. `suspect` (marge de tolérance de 10 %) est inclus provisoirement avec mention discrète « en vérification » ; `invalid` est exclu avec explication à l'auteur (« Vitesse moyenne incohérente avec la course à pied »). Option « Je faisais du vélo/ je me suis trompé » : correction de type d'activité en un tap, puis nouvelle évaluation. Faux positifs : appel simple de l'utilisateur (7.5.6).

### 7.5.6 Arbitrage, récompenses, calendrier, création
- **Arbitrage** : tout participant peut contester une activité exclue. Trois niveaux : réévaluation automatique avec seuils élargis ; revue humaine sous 72 h ; décision finale motivée. L'organisateur d'un défi de club peut invalider une activité avec motif, tracé dans un journal visible des administrateurs.
- **Récompenses** : points d'expérience (7.6), trophées de défi, récompense sponsorisée. Aucune récompense monétaire directe sans règlement légal ([MENTIONS_JEUX_CONCOURS], voir Partie 8). Égalités : départage par date d'atteinte du seuil.
- **Calendrier de défis** : écran « Défis » avec onglets En cours / À venir / Terminés, carrousel hebdomadaire, un défi officiel par semaine et par mois, rotation saisonnière éditée par l'équipe.
- **Création par l'utilisateur** : modèle guidé (nom, métrique, dates, activités, public cible, visibilité, règlement court). Limites : 5 défis actifs par utilisateur ; publication publique soumise à modération a priori pour les 3 premiers défis. Gratuit : participer et créer entre amis ; clubs : selon plan du propriétaire (Partie 2).

**Critères d'acceptation 7.5** : une activité enregistrée en voiture est classée `invalid` dans 95 % des 50 traces de test ; une correction de type relance l'évaluation et met à jour le classement en moins de 60 s ; un défi sponsorisé sans mention est refusé à la publication.

---

## 7.6 Gamification

### 7.6.1 Points d'expérience (XP) et niveaux
XP par activité, calculés à la fin de chaque séance :

`XP_activité = base_durée + base_distance + bonus_effort`

- `base_durée = 1 XP par minute en mouvement`, plafonné à 120 XP par activité.
- `base_distance` : course 8 XP/km, marche 5 XP/km, rando 6 XP/km, vélo 2 XP/km ; plafonné à 150 XP.
- `bonus_effort = 0,25 × charge_session` (Partie 5, charge relative), plafonné à 40 XP.
- Séance de muscu Fit : 60 XP fixes + 0,5 XP par série de travail, plafond 120.
Bonus de régularité : +20 XP pour la 3e séance de la semaine, +30 XP pour la 5e jour actif sur 7 (plafonné à 1 fois/semaine). Bonus de progression : +50 XP pour un record personnel (max 3 par semaine), +25 XP pour une semaine à objectif atteint, +100 XP pour un objectif de plan terminé.
**Plafonds anti-abus** : 400 XP par jour, 1 500 XP par semaine tous types confondus ; XP sociaux (réactions, commentaires) = 0 ; XP de défi hors plafond mais limités à 300 par défi. Aucune activité marquée `invalid` ne donne d'XP, et les activités de plus de 4 h en marche/course ne donnent pas d'XP au-delà de la 4e heure.

**Niveaux** : `XP_cumulé(n) = 100 × n^1,6` arrondi à la dizaine (niveau 1 : 0 ; niveau 10 : ≈ 3 980 ; niveau 50 : ≈ 52 000 ; niveau maximal 100, puis « étoiles » de prestige). Noms par paliers : 1-9 Éclaireur, 10-24 Marcheur, 25-49 Endurant, 50-74 Vétéran, 75-100 Légende. L'XP et les niveaux sont **communs à Fit et Sports** (service `gamification`, voir 7.10).

### 7.6.2 Séries de régularité
Une **série hebdomadaire** compte les semaines consécutives avec au moins N jours actifs (N configurable 2-5, défaut 3). Une série **quotidienne** n'est pas proposée par défaut afin de ne pas inciter à s'entraîner malade. Protections :
- **Jours de repos protégés** : jusqu'à 2 par semaine déclarés ou planifiés par le coach ; un jour de repos du plan compte comme jour tenu.
- **Pause santé** : blessure, maladie, voyage, deuil, grossesse : l'utilisateur déclare une pause (jusqu'à 8 semaines, prolongeable) qui gèle la série sans la casser, sans question et sans texte culpabilisant.
- **Jokers** : 2 par trimestre, appliqués automatiquement une semaine manquée.
- Messages à la rupture : « Ta série repart de zéro, ton meilleur record reste à 14 semaines. » Jamais de rappel du type « Ne perds pas ta série ! » les jours où le coach préconise du repos.

### 7.6.3 Catalogue de trophées (110)
Raretés : commun (C), rare (R), épique (E), légendaire (L). Chaque trophée a un identifiant `trophy_code`, des critères évalués côté serveur sur activités valides uniquement. Les trophées sont partagés avec Fit (7.10.8).

**Distance cumulée (14)**
1. Premiers pas (C) : 1 premier km enregistré.
2. Dix bornes (C) : 10 km cumulés.
3. Cent bornes (C) : 100 km cumulés.
4. Cinq cents (R) : 500 km cumulés.
5. Mille bornes (R) : 1 000 km cumulés.
6. Tour de France (E) : 3 400 km cumulés, toutes disciplines.
7. Marathon sur la durée (C) : 42,2 km cumulés en course.
8. Dix marathons (R) : 422 km cumulés en course.
9. Tour de la Terre (L) : 40 075 km cumulés.
10. Cycliste du dimanche (C) : 100 km cumulés à vélo.
11. Mille à deux roues (R) : 1 000 km cumulés à vélo.
12. Sentier battu (R) : 200 km cumulés en randonnée.
13. Pas pressé (C) : 100 km cumulés en marche.
14. Pas de côté (R) : 100 km cumulés en marche nordique.

**Sorties uniques (10)**
15. Mon premier 5 km (C), 16. Mon premier 10 km (C), 17. Semi accompli (R), 18. Marathonien (E) : sorties de 5, 10, 21,1 et 42,2 km en course (une seule activité valide).
19. Ultra-fondeur (L) : 50 km en une course.
20. Cinquante à vélo (C) : 50 km en une sortie vélo.
21. Century (R) : 100 km à vélo en une sortie.
22. Double century (L) : 200 km à vélo en une sortie.
23. Journée de rando (C) : 15 km et 4 h de marche en une sortie.
24. Grande traversée (E) : 30 km de randonnée en une journée.

**Dénivelé (10)**
25. Première côte (C) : 100 m D+ en une activité. 26. Colline (C) : 500 m D+ en une activité. 27. Montagnard (R) : 1 000 m D+ en une activité. 28. Everesting partiel (E) : 4 000 m D+ en une activité. 29. Everest (L) : 8 849 m D+ en une activité, sécurité contrôlée (activité unique, plafond d'XP appliqué). 30. Cumulé 10 000 m (C). 31. Cumulé 50 000 m (R). 32. Cumulé 100 000 m (E). 33. Cumulé 8 849 × 10 m (L) : 88 490 m en un an civil. 34. Col mythique (R) : franchir un col référencé de catégorie 1 ou hors catégorie.

**Régularité (12)**
35. Trois semaines (C) : série de 3 semaines. 36. Mois de fer (C) : 4 semaines. 37. Trimestre (R) : 12 semaines. 38. Semestre (E) : 26 semaines. 39. Année pleine (L) : 52 semaines. 40. Jours actifs 7 (C) : 7 jours actifs dans un mois. 41. 15 jours actifs (R) dans un mois. 42. 100 jours actifs (R) dans une année. 43. 200 jours actifs (E) dans une année. 44. Retour gagnant (C) : reprendre dans les 7 jours qui suivent une pause santé terminée. 45. Rythme tranquille (C) : 4 semaines à charge équilibrée (ratio de charge entre 0,8 et 1,3, Partie 5). 46. Repos assumé (C) : respecter 4 jours de repos recommandés par le coach.

**Découvertes (12)**
47. Première rando (C), 48. Premier vélo (C), 49. Première course (C), 50. Première marche (C). 51. Touche-à-tout (R) : 4 disciplines en un mois. 52. Explorateur (C) : 10 itinéraires différents. 53. Cartographe (R) : créer et parcourir un itinéraire de 20 km. 54. Hors des sentiers battus (R) : 20 itinéraires jamais parcourus. 55. Globe-trotteur (E) : activités dans 5 pays. 56. Sept communes (C) : 7 communes différentes. 57. Aube (C) : activité démarrée avant 6 h 00 (hors alerte nuit sécurité). 58. Soleil couchant (C) : activité terminant au coucher du soleil, avec lampe active.

**Sécurité (8)**
59. Prêt à partir (C) : renseigner un contact de sécurité. 60. Sur écoute (C) : partager une position en direct pour une première sortie en solo. 61. Météo consultée (C) : consulter la météo avant 10 sorties. 62. Randonneur prévoyant (R) : télécharger la carte hors ligne avant 5 randonnées. 63. Casque obligatoire (C) : confirmer le casque avant 20 sorties de vélo. 64. Retour à bon port (R) : 10 sorties de plus de 2 h clôturées avec « arrivé en sécurité ». 65. Cap sur l'abri (R) : renoncer à une sortie après alerte météo orange ou rouge (l'app l'applaudit, jamais de pénalité). 66. Bon samaritain (E) : signalement validé d'un danger de parcours.

**Social (12)**
67. Premier ami (C). 68. Cinq amis (C). 69. Vingt-cinq amis (R). 70. Premier bravo (C) : 10 réactions envoyées. 71. Encourageant (R) : 200 réactions envoyées. 72. Duel loyal (C) : terminer un défi 1 contre 1. 73. Vainqueur sportif (R) : gagner 5 défis entre amis. 74. Capitaine (C) : créer un club avec 5 membres. 75. Chef de peloton (R) : organiser 10 sorties de club avec ≥ 4 inscrits. 76. Ambassadeur (R) : 3 parrainages validés (7.12). 77. Photographe (C) : 10 photos publiées. 78. Mentor (E) : un filleul atteint 12 semaines de série.

**Saisons et événements (10)**
79. Printemps vert (C), 80. Été brûlant (C), 81. Automne doré (C), 82. Hiver courageux (C) : 20 jours actifs dans la saison correspondante. 83. Quatre saisons (E) : les 4 trophées saisonniers dans une année. 84. Premier de l'an (C) : activité le 1er janvier. 85. Nuit de la Saint-Sylvestre (C) : activité le 31 décembre. 86. Participant (C) : terminer un événement de la fiche (7.8). 87. Dossard (R) : terminer 5 événements. 88. Podium de défi (R) : top 3 d'un défi de plus de 100 participants.

**Records et progrès (8)**
89. Premier record (C). 90. Dix records (R). 91. Mieux que la veille (C) : battre sa distance hebdomadaire d'il y a 4 semaines. 92. Progression de 10 % (R) : améliorer son allure moyenne sur 5 km de 10 %. 93. Sous les 30 (R) : 5 km en moins de 30 min. 94. Sous les 25 (E) : 5 km en moins de 25 min. 95. Sub-2 (E) : semi en moins de 2 h. 96. Sub-4 (E) : marathon en moins de 4 h.

**Sports d'équipe (6) (Partie 6)**
97. Premier match (C). 98. Dix matchs (C). 99. Cent matchs (R). 100. Capitaine de terrain (R) : capitaine sur 10 matchs. 101. Esprit d'équipe (R) : 10 matchs avec la même équipe sur 3 mois. 102. Invaincu (E) : 5 victoires d'affilée en équipe de club.

**Combiné Fit + Sports (4)**
103. Complet (R) : muscu et endurance dans la même semaine pendant 4 semaines. 104. Bien nourri (C) : 14 jours de nutrition renseignée autour de séances longues. 105. Ravito réussi (C) : utiliser un plan de ravitaillement sur 3 sorties longues. 106. Athlète complet (E) : 100 séances de renforcement, 100 sorties d'endurance.

**Secrets (4, non listés dans l'app avant déblocage)**
107. Pleine lune (E) : activité de nuit de 5 km durant une pleine lune. 108. 11/11 (C) : 11 km un 11 novembre. 109. Pile à l'heure (E) : sortie dont la durée en mouvement est exactement 1:00:00. 110. Retour aux sources (L) : première sortie anniversaire exactement un an après l'inscription.

### 7.6.4 Gestion des trophées
Évaluation événementielle (consommateur `activity.completed`), idempotente par `(user_id, trophy_code)`. Les trophées de dénivelé et de distance extrêmes ne donnent aucun XP bonus. Un trophée inapplicable après invalidation d'activité est retiré avec explication. Les trophées « sécurité » ne dépendent jamais de la performance. Les trophées secrets apparaissent comme « ??? » sans critère.

### 7.6.5 Records personnels
Distances de référence : 1 km, 1 mile, 5 km, 10 km, semi, marathon ; vélo : 20 min de puissance moyenne, 40 km, 100 km ; plus longue sortie, plus fort D+. Détection sur meilleure fenêtre glissante (précision GPS, rejet si activité `suspect`). Un record est validé après contrôle anti-triche ; badge « Nouveau record » ; historique des records modifiables (suppression d'un record erroné).

### 7.6.6 Objectifs annuels et bilan « Wrapped »
- **Objectifs annuels** : distance, jours actifs, dénivelé ou événement ; proposition réaliste basée sur l'année précédente (+5 à +10 % maximum) ; suivi avec courbe « en avance / dans les temps / en retard » sans ton punitif ; ajustement possible une fois en cours d'année.
- **Bilan annuel** (généré du 15 décembre au 31 janvier, aussi mensuel simplifié) : total km/heures/D+, disciplines, plus longue sortie, record le plus marquant, meilleure semaine, mois le plus actif, lieux découverts (ville, jamais l'adresse), compagnons de sortie les plus fréquents (amis consentants), trophées de l'année, niveau gagné, comparaison avec l'année passée, « personnalité sportive » (ex. « Matinal régulier »). Données Fit incluses si l'utilisateur est abonné aux deux apps. Génération : tâche asynchrone la nuit, résultat mis en cache, 8 à 12 cartes animées, partage par images (7.2.5) avec confidentialité par défaut. Aucune donnée de santé (poids, FC) dans le contenu partageable.

### 7.6.7 Éthique et équilibrage
- Aucune mécanique de perte (pas de « tu perds tes points »), pas de compte à rebours anxiogène, pas de classement à effort croissant sans limite.
- **Détecteur de surentraînement** : si la charge dépasse 1,5 de ratio aigu/chronique (Partie 5) ou 6 jours actifs consécutifs avec charge élevée, l'app masque les bonus de régularité et propose un repos ; le bonus « jour de repos respecté » vaut 15 XP.
- Les défis proposés par l'app plafonnent la progression à +10 % par semaine par rapport à la moyenne des 4 dernières.
- Équilibrage : objectif de 1 niveau par mois pour un utilisateur régulier jusqu'au niveau 20, 1 niveau par trimestre au-delà ; la distribution des trophées vise 60 % obtenus par ≥ 30 % des actifs (communs), < 5 % pour les légendaires ; revue trimestrielle des taux d'obtention.
- Messages d'encouragement fondés sur l'effort réalisé, jamais sur le poids ou l'apparence.

**Critères d'acceptation 7.6** : le plafond de 400 XP/jour est respecté pour 5 activités le même jour ; une pause santé de 3 semaines conserve la série intacte ; aucun texte ne contient de formulation culpabilisante (liste de motifs interdits testée) ; chaque trophée a au moins un test unitaire de seuil (valeur juste en dessous, valeur exacte).

