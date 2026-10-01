# PARTIE 7 — Social, gamification, communautés, marketplace de coachs, événements et intégration avec Fit

Cette partie définit tout ce qui relie les personnes entre elles (amis, clubs, défis, événements, coachs humains) et à l'app [NOM_APP_FIT]. Elle s'appuie sur l'identité et les droits de la Partie 2, le moteur d'activité de la Partie 3, les cartes et la sécurité de la Partie 4, le coach de la Partie 5 et l'approfondissement par discipline cardio de la Partie 6. Principe directeur : **la vie privée est le réglage par défaut, le partage est un choix explicite, et aucune mécanique sociale ne doit pousser à se blesser**. Stack : [STACK_BACKEND], [STACK_TEMPS_REEL], [STACK_STOCKAGE_MEDIAS], [STACK_PUSH].

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
| `group_ride` | Sortie collective terminée (7.4.4) | Participants, parcours, photos de groupe |
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
Formats : story 1080×1920, carré 1080×1080, paysage 1200×630. Templates : « Carte du tracé », « Stats en grand », « Record », « Trophée », « Bilan annuel », « Défi gagné », « Sortie de groupe ». Fond : photo, carte stylisée, ou dégradé.
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
Tout utilisateur Sports, Fit ou Ultra peut créer jusqu'à 3 clubs (Gratuit : peut rejoindre, pas créer). Types : `running_club`, `hiking_group`, `cycling_club`, `company`, `school`, `city`, `other`. Champs : nom unique, description, sports, ville, logo, couverture, langue, règles, `join_policy` (`open`, `approval`, `invite_only`, `paid`).

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
- **Km toutes disciplines** avec coefficients d'équivalence : marche ×1, course ×1, randonnée ×1, vélo ×0,25 (4 km de vélo = 1 km), trail ×1,2 (effort pondéré par le dénivelé), marche nordique ×1,1. Coefficients publiés dans le règlement et versionnés.
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

**Disciplines cardio (6)**
97. Foulée régulière (C) : 20 sorties de course de plus de 5 km. 98. Trailer (R) : 10 sorties de trail avec plus de 300 m D+ chacune. 99. Rouleur (R) : 20 sorties vélo de plus de 40 km. 100. Gravel-addict (R) : 500 km cumulés sur chemins en gravel ou VTT. 101. Trekkeur (E) : 3 jours consécutifs de randonnée avec au moins 15 km chacun (itinérance). 102. Sommet (E) : atteindre 5 sommets référencés différents.

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

## 7.7 Classements et segments

### 7.7.1 Classements
Portées : amis, club, local (ville ou rayon de 25 km, agrégé par cellule géographique, jamais par adresse), et défi. Périodes : semaine, mois, année. Métriques : distance, durée, D+, jours actifs, XP. Les classements ne comptent que les activités `valid` ; les utilisateurs au profil privé n'apparaissent que dans les classements d'amis et de clubs où ils ont adhéré. Mise à jour toutes les 5 minutes (cache), reconstruction nocturne. Départage : valeur, puis date d'atteinte. Affichage par défaut : moi + 3 au-dessus et 3 en dessous, plutôt que le top mondial ; le « local » est affiché par fourchettes (top 10 %, 25 %).

### 7.7.2 Segments (retenus pour l'endurance, activés par feature flag `segments`)
- **Création** : tronçon de 300 m à 50 km choisi sur une activité par un abonné Sports, Ultra ou Fit ; le tronçon est rejeté s'il passe dans une zone masquée d'un tiers connu, traverse une voie ferrée ou une autoroute, ou a un départ à moins de 150 m d'un domicile détecté. Chaque segment reçoit une classification de risque (7.7.3).
- **Détection** : appariement géométrique tolérant (tampon 25 m, direction cohérente, début et fin dépassés dans la limite de 40 m), exécuté de manière asynchrone après l'activité ; temps interpolé aux frontières.
- **Tableaux de temps** : meilleur temps par utilisateur, historique personnel, classement par catégorie. Un temps issu d'une activité `suspect` n'est pas affiché publiquement.
- **Vie privée** : participation publique désactivable segment par segment ou globalement (« Mes temps de segment sont visibles : Amis par défaut »). Un temps affiché publiquement n'expose jamais le tracé complet. Le tableau public de segments n'est visible que pour les segments situés hors zones masquées.
- **Retrait volontaire** : un utilisateur peut retirer tous ses temps en un tap ; un propriétaire de terrain, une commune ou un club peut demander le retrait d'un segment via un formulaire (réponse sous 7 jours).

### 7.7.3 Règles de sécurité des segments
Classification automatique : `route_urbaine`, `chemin`, `descente`. Pour les **descentes** (pente moyenne < −4 % sur plus de 400 m, ou segment vélo avec vitesse > 50 km/h) et les **routes ouvertes à la circulation** : pas de classement public des temps absolus, seulement un temps personnel, un classement « amis » optionnel et un avertissement. Les « KOM/QOM » de descente et de traversées de carrefour sont interdits. Tout segment signalé dangereux (3 signalements indépendants) est suspendu automatiquement pour revue. Message au franchissement d'un segment à risque : « Segment masqué : la sécurité passe avant le chrono. »

### 7.7.4 Catégories et inclusivité
Catégories optionnelles : âge (tranches de 5 ans à partir de 18 ans, jeunes de 13 à 17 ans séparés et sans classement public), niveau (débutant, intermédiaire, avancé, élite, déduit de l'allure ou de la puissance de référence), **catégorie de compétition** (sexe ou « ouverte »). Traitement inclusif : le champ de sexe propose femme, homme, non-binaire, ne souhaite pas répondre ; les personnes non-binaires ou sans réponse peuvent choisir la catégorie dans laquelle elles se classent (règle auto-déclarée, sans justificatif) ou la catégorie « Ouverte » ; aucune obligation de renseigner la date de naissance exacte pour les classements publics (une tranche suffit). **Option « Ne pas figurer »** : l'utilisateur peut sortir de tous les classements publics et segments sans perdre ses statistiques, trophées ni XP. Pour les défis sponsorisés ou compétitifs avec dotation, le règlement peut définir ses propres catégories.

**Critères d'acceptation 7.7** : un utilisateur ayant choisi « Ne pas figurer » est absent de toute réponse de classement ; aucun classement de temps absolu n'est servi pour un segment classé « descente » ; le retrait d'un segment est effectif en moins de 24 h.

---

## 7.8 Événements et compétitions

### 7.8.1 Découverte
Catalogue d'événements : courses sur route et trail, randonnées organisées, cyclosportives, trails, ultra-trails, marches nordiques collectives, brevets cyclistes et treks organisés (disciplines de la Partie 6). Sources : importation de partenaires ([API_EVENEMENTS_PARTENAIRES]), soumission par les organisateurs (vérifiés), suggestions de la communauté (modération). Filtres : sport, distance, date, lieu, rayon, difficulté, prix, label « accessible aux débutants ». Carte et liste, favoris, alerte « nouveaux événements proches ».

### 7.8.2 Fiche événement
Champs : nom, date et heure, lieu et point de départ, parcours(s) téléchargeables (GPX, profil D+), distances, tarifs, délai d'inscription, barrière horaire, limite de places, règlement (certificat médical selon la législation locale), organisateur (badge vérifié), site officiel, météo prévisionnelle à J−7, avis de participants, label d'accessibilité. Inscriptions **externes par lien** vers le site de l'organisateur ; l'app n'encaisse rien sauf partenariat contractuel. Statuts utilisateur : intéressé, inscrit, participé, abandon.

### 7.8.3 Objectifs liés et coach
Bouton « Préparer cet événement » : le coach (Partie 5) crée un plan à partir de la date, de la distance, du dénivelé, du niveau actuel et de la disponibilité hebdomadaire ; avertit si le délai est trop court (par exemple moins de 8 semaines pour un semi débutant) et propose un objectif alternatif ou plus tardif. Le plan inclut la semaine d'affûtage, la reconnaissance de parcours, le plan de ravitaillement (7.10.5) et le rappel de matériel. Si l'événement est annulé ou reporté, le plan est proposé en réadaptation.

### 7.8.4 Résultats, groupes, souvenirs
- **Résultats** : saisie manuelle du temps officiel ou rapprochement automatique avec l'activité enregistrée (± 3 % de distance, heure cohérente) ; import de classements ouverts uniquement via partenaires. Statut « officiel » vs « enregistré ».
- **Groupe d'événement** : créé à l'inscription ; échange de covoiturage, rendez-vous, partage de photos ; fermeture 30 jours après l'événement.
- **Souvenirs** : carte « Souvenir de course » (temps, tracé flouté, photos, dossard optionnel), album d'événement, ajout au bilan annuel (7.6.6).
- **Calendrier communautaire** : vue mensuelle des événements favoris, des sorties de club et des défis ; export ICS ; synchronisation avec le planning unifié (7.10.6).

**Critères d'acceptation 7.8** : « Préparer cet événement » produit un plan dont la dernière séance précède la date de l'événement de 1 jour ; un événement annulé notifie tous les inscrits suivis sous 15 minutes.

---

## 7.9 Marketplace de coachs et de plans

### 7.9.1 Coachs humains certifiés
Rôle `coach` demandé depuis le profil. **Vérification** : identité ([FOURNISSEUR_KYC]), diplôme ou carte professionnelle (en France : BPJEPS, DEJEPS, STAPS, carte professionnelle d'éducateur sportif ; équivalents par pays dans une table paramétrable), assurance responsabilité civile professionnelle en cours de validité, casier judiciaire (extrait du bulletin n°3 ou équivalent) lorsqu'il y a travail avec des mineurs, charte de l'app signée. Revue humaine sous 5 jours ouvrés. Statuts : `pending`, `verified`, `suspended`, `revoked`. Renouvellement annuel des justificatifs ; alerte à J−30. Profils acceptés : coachs de course à pied (route, trail), coachs vélo (route, gravel, VTT), coachs de randonnée et de trek, **accompagnateurs en moyenne montagne et guides de haute montagne** (diplôme d'État, UIAGM/IFMGA ou équivalent national, carte professionnelle en cours, assurance couvrant l'activité encadrée). Les coachs affichent leur spécialité, leur niveau de terrain (plaine, moyenne montagne, haute montagne), langues, tarifs et disponibilités. Les sorties encadrées en montagne affichent obligatoirement la qualification du guide et la zone d'intervention.

### 7.9.2 Produits vendus
| Produit | Description | Livraison |
|---|---|---|
| Plan d'entraînement | Plan fixe (ex. « 10 km en 8 semaines ») importable dans le planning | Numérique |
| Abonnement coach | Suivi mensuel : plan adaptatif humain, messages, ajustements | Numérique + service |
| Séance en visio | 30/60 min planifiée | Service à distance |
| Séance physique ou sortie encadrée | Coaching présentiel, sortie de trail, stage vélo, randonnée guidée, trek | Service physique |

Un plan vendu est importé dans le planning unifié (7.10.6) ; le coach IA (Partie 5) en respecte la structure, ajuste les charges en cas de fatigue ou de blessure et notifie le coach humain des écarts significatifs (si consentement 7.9.8).

### 7.9.3 Outils du coach
Tableau de bord : liste des athlètes, statut (conforme, en retard, signal de fatigue), semaine à venir, taux d'adhérence, alertes (3 séances manquées, charge > 1,5, douleur déclarée). Assignation de séances par glisser-déposer, bibliothèque de séances, modèles ; retour de données (activité, ressenti, FC, charge) en lecture ; commentaires sur séance ; **messagerie** coach-athlète (texte, notes vocales, images ; pas de pièces jointes exécutables) ; calendrier de séances en visio ; **facturation** (factures PDF, TVA selon statut du coach, relevés mensuels, export comptable).

### 7.9.4 Commission et paiements
Commission de plateforme : 20 % sur les ventes numériques réalisées via achat in-app (alignée sur le barème des stores, ajustée à 15 % pour le petit programme de réduction des stores), 12 % sur les abonnements coach facturés hors store si autorisé, 0 % sur les séances physiques. Versement mensuel via [FOURNISSEUR_PAIEMENT_CONNECT] après 14 jours de rétractation, seuil minimal de 30 €.

### 7.9.5 Évaluations, litiges, modération qualité
Évaluation 1 à 5 étoiles et avis écrit uniquement par les clients ayant acheté ; modération des avis ; réponse du coach possible ; note affichée à partir de 5 avis. Litiges : ouverture dans les 30 jours ; médiation par le support sous 5 jours ouvrés ; remboursement total ou partiel par décision motivée ; blocage des virements du coach pendant l'instruction. Suspension automatique : note < 3,0 sur 10 avis, 2 litiges perdus en 90 jours ou toute plainte pour conduite inappropriée. Audit qualité : échantillonnage trimestriel de plans, vérification de non-promesses de résultats médicaux.

### 7.9.6 Règles des stores : services physiques et numériques
- **Contenus numériques** (plans, abonnements à contenu, programmes dans l'app) : achat intégré obligatoire sur iOS et Android, avec commission du store.
- **Services physiques ou en personne** (séance présentielle) et **services entre personnes en temps réel** : paiement externe autorisé par les règles des stores en vigueur ; **vérifier la politique actuelle de chaque store à chaque version** (voir Partie 8) et ne jamais diriger les utilisateurs vers un paiement externe pour un contenu numérique hors des exceptions autorisées.
- Les séances en visio individuelles sont traitées comme services en temps réel entre personnes, sous réserve de validation juridique.
- L'app ne doit proposer aucune incitation à contourner les achats intégrés ; les liens externes sont conformes aux règles régionales.

### 7.9.7 Responsabilité, assurances, mentions
Mentions obligatoires dans les conditions et sur chaque fiche : l'app est une plateforme de mise en relation ; le coach est un professionnel indépendant responsable de ses conseils ; les contenus ne remplacent pas un avis médical ; recommandation de consulter un médecin avant reprise ou effort intense ; le coach doit détenir une RC professionnelle ; la plateforme n'est pas responsable des blessures liées à un conseil de coach, dans la limite permise par la loi ([MENTIONS_LEGALES], validation juridique en Partie 8). L'athlète accepte un questionnaire d'aptitude (PAR-Q) avant le premier plan.

### 7.9.8 Confidentialité athlète-coach
Aucune donnée n'est visible du coach sans **consentement explicite, granulaire et révocable** : catégories activités, charge, FC, sommeil, poids/nutrition (Fit), blessures, localisation. Écran « Mes coachs » listant exactement ce qui est partagé ; révocation immédiate, le coach perd l'accès en moins de 60 s et conserve seulement ses notes propres pendant 12 mois (les données reçues de l'athlète sont supprimées de sa vue). Journal d'accès consultable. Les données de santé (art. 9 RGPD) exigent un consentement dédié. Un coach ne peut jamais exporter les données en masse.

**Critères d'acceptation 7.9** : un coach non vérifié ne peut rien vendre ; après révocation du consentement « FC », les données de FC sont absentes de l'API coach ; un litige ouvert bloque le versement correspondant.

---

## 7.10 Intégration avec Fit : contrat complet

### 7.10.1 Principes
Deux apps, un écosystème : **identité unique, profil partagé, droits partagés (Partie 2), événements asynchrones, jamais de dépendance synchrone bloquante**. Les services partagés : `identity`, `entitlements`, `social-graph`, `gamification` (XP, niveaux, trophées), `planning`, `nutrition`. L'app Sports fonctionne seule en mode dégradé (7.10.9). Contrat versionné `v1` ; toute rupture crée `v2` avec coexistence de 6 mois.

### 7.10.2 Identité et profil partagés
Table `profile` unique ; champs partagés : prénom, avatar, @handle, date de naissance, sexe, taille, poids (historique), objectifs, unités, langue, allergies et régimes alimentaires, FC max/repos, blessures déclarées. Champs spécifiques Sports : FTP, seuils de course, zones. Champs spécifiques Fit : charges, 1RM. Règle de conflit : le dernier écrit gagne champ par champ, avec `updated_at` et `source_app` ; poids : conserver l'historique, jamais d'écrasement silencieux.

### 7.10.3 API interne (v1)
Authentification service à service : jetons signés à courte durée de vie ([STACK_AUTH_SERVICE]) ; chaque appel porte `user_id` du jeton utilisateur et `X-Idempotency-Key`.

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/internal/v1/profile/{userId}` | Profil partagé |
| PATCH | `/internal/v1/profile/{userId}` | Mise à jour par champ |
| GET | `/internal/v1/entitlements/{userId}` | Droits : `free,sports,fit,ultra` |
| POST | `/internal/v1/energy/expenditure` | Publier dépense énergétique |
| GET | `/internal/v1/nutrition/targets/{userId}?date=` | Cibles du jour (calories, macros, hydratation) |
| POST | `/internal/v1/nutrition/fueling-plans` | Plan de ravitaillement |
| GET | `/internal/v1/planning/{userId}?from=&to=` | Séances unifiées |
| POST | `/internal/v1/planning/{userId}/sessions` | Créer une séance |
| POST | `/internal/v1/planning/{userId}/conflicts/check` | Vérification de conflit |
| GET | `/internal/v1/exercises?role=runner` | Exercices de renforcement |
| POST | `/internal/v1/gamification/events` | Événement de gamification |
| GET | `/internal/v1/friends/{userId}` | Amis et relations |

Événements (bus [STACK_BUS_EVENEMENTS], at-least-once, schéma versionné) : `activity.completed`, `energy.expenditure.computed`, `nutrition.target.adjusted`, `workout.completed` (Fit), `plan.session.moved`, `trophy.awarded`, `friend.accepted`, `entitlement.changed`, `profile.updated`.

Payload `activity.completed` :
```json
{
  "event_id": "evt_01HZX…", "schema": "activity.completed.v1",
  "user_id": "usr_123", "occurred_at": "2026-10-04T08:12:00Z",
  "activity": {"id": "act_998", "sport": "run", "subtype": "trail",
    "moving_s": 5400, "distance_m": 13200, "elevation_gain_m": 640,
    "avg_hr": 148, "load": 112, "start_local": "2026-10-04T10:05:00+02:00",
    "validity": "valid"}
}
```
Payload `energy.expenditure.computed` :
```json
{"event_id": "evt_01HZY…", "schema": "energy.expenditure.computed.v1",
 "user_id": "usr_123", "activity_id": "act_998", "date": "2026-10-04",
 "kcal_active": 920, "method": "hr_based", "confidence": 0.82,
 "carbs_used_g_est": 150}
```
Payload `nutrition.target.adjusted` :
```json
{"event_id": "evt_01HZZ…", "schema": "nutrition.target.adjusted.v1",
 "user_id": "usr_123", "date": "2026-10-04",
 "kcal_target": 2780, "delta_kcal": 420,
 "macros": {"protein_g": 130, "carbs_g": 380, "fat_g": 80},
 "reason": "long_run_recovery", "guardrails": {"max_delta_pct": 25, "min_kcal": 1500}}
```
Payload `trophy.awarded` :
```json
{"event_id": "evt_01J00…", "schema": "trophy.awarded.v1", "user_id": "usr_123",
 "trophy_code": "TR_021", "rarity": "R", "awarded_at": "2026-10-04T12:00:00Z",
 "source_app": "sports", "dedupe_key": "usr_123:TR_021"}
```

### 7.10.4 Chaîne activité, dépense, nutrition
1. `activity.completed` publié par Sports.
2. Le service énergie calcule la dépense (basée FC si disponible, sinon MET × poids × durée) et publie `energy.expenditure.computed`.
3. Fit ajuste la cible du jour : `delta_kcal = clamp(0,5 × kcal_active, 0, 25 % de la cible de base)` avec plancher de sécurité (jamais en dessous de 1 500 kcal pour un adulte, ni en dessous du métabolisme de base estimé × 1,1) ; l'ajustement est un **ajustement de récupération, pas une prime à manger moins** ; l'utilisateur peut le désactiver.
4. L'app affiche « Ta sortie de 13 km : +420 kcal aujourd'hui, de préférence en glucides et protéines. »
Cas limites : activités multiples le même jour (cumul avec plafond), activité invalide (aucune dépense), objectif de perte de poids (jamais de diminution automatique de la récupération), mineur (pas de cible calorique restrictive ; suggestions qualitatives seulement).

### 7.10.5 Nutrition adaptée à l'effort
- **Recettes avant/après** : suggestions issues de la base recettes de Fit selon la séance : avant (2-3 h) riche en glucides faciles à digérer ; après (dans les 60 min) rapport glucides:protéines ≈ 3:1 ; filtrage par allergies et régimes (végétarien, sans gluten…).
- **Plan de ravitaillement** pour sorties de plus de 75 min : 30-60 g de glucides/h (jusqu'à 90 g/h au-delà de 3 h selon tolérance), 400-800 ml de liquide/h ajustés à la météo, sodium 300-600 mg/h par forte chaleur ; plan imprimable et rappels pendant la séance (« Prends un gel dans 5 min »). Avertissements : s'entraîner l'intestin, ne rien essayer de nouveau un jour de course, pas de conseil médical pour diabète ou pathologies (renvoi vers un professionnel).
- Fit fournit aliments et recettes, Sports fournit contexte d'effort ; la logique de nutrition (écriture de cibles) reste dans Fit.

### 7.10.6 Planning unifié et anti-conflit
Calendrier commun (`planning`) contenant séances de muscu (Fit), endurance (Sports), repos, événements, séances de coach humain. Règles anti-conflit (évaluées avant chaque insertion et chaque déplacement) :
| Règle | Seuil | Action |
|---|---|---|
| Jambes lourdes avant séance clé | Séance de jambes < 36 h avant sortie longue ou fractionné | Avertissement, proposer haut du corps ou décalage |
| Sortie longue avant jambes | Sortie > 90 min < 24 h avant séance de jambes lourde | Déplacer ou alléger |
| Deux séances dures consécutives | Charge ≥ 80 la veille | Remplacer la 2e par récupération |
| Total hebdomadaire | Ratio charge aigu/chronique > 1,4 | Bloquer l'ajout, proposer un déplacement |
| Jour de repos | Moins de 1 jour de repos par semaine | Avertissement |
| Événement | Séance dure < 3 jours avant course | Suppression recommandée |
Exemples : « Séance jambes mardi 18 h + fractionné mercredi 7 h » : conflit, proposition « fractionné jeudi ou jambes mardi en haut du corps » ; « Sortie longue samedi + Pull dimanche matin » : accepté (haut du corps). Les décisions finales appartiennent à l'utilisateur, une dérogation est enregistrée et le coach s'adapte.

### 7.10.7 Renforcement pour sportifs d'endurance
Bibliothèque Fit d'exercices étiquetés `runner`, `cyclist`, `hiker` : gainage (planche, planche latérale), fentes, squats bulgares, soulevé de terre roumain, mollets (montées sur pointes excentriques), fessiers (pont fessier, clam shell), tractions, mobilité de hanche, proprioception. Séances types de 20 à 30 min, 2 par semaine, intensité réduite en semaine de course. Les exercices sont démontrés avec vidéo et variantes de blessure (genou, tendon d'Achille, bas du dos). Contre-indications renseignées par blessure déclarée.

### 7.10.8 Trophées et amis communs
**Source de vérité** : `social-graph` pour les amitiés, `gamification` pour les trophées et XP, hébergés au niveau écosystème et non dans l'une des apps. Synchronisation par événements ; déduplication par `dedupe_key = user_id:trophy_code` et contrainte unique ; si deux événements arrivent en parallèle, le premier horodaté gagne ; réconciliation nocturne comparant comptes de trophées et d'amis. Les trophées multi-apps (7.6.3 n°103-106) sont évalués par `gamification` à partir des deux flux. L'amitié acceptée dans une app est visible dans l'autre en moins de 10 secondes.

### 7.10.9 Mode dégradé selon l'abonnement
| Plan | Sports | Fit | Passerelle Fit ↔ Sports |
|---|---|---|---|
| Gratuit | Enregistrement et historique de base | Fonctions de base | Profil, amis, trophées communs |
| Sports | Toutes fonctions Sports | Lecture seule des cibles nutrition par défaut | Dépense énergétique et estimation simple affichées, pas d'ajustement automatique |
| Fit | Basique | Toutes fonctions Fit | Activités importées en lecture pour calcul de dépense ; pas de plan endurance |
| Ultra | Tout | Tout | Planning unifié, ajustements, coach multi-sports, ravitaillement |
Les droits sont lus via `/internal/v1/entitlements` et vérifiés côté serveur à chaque appel. Un droit expiré dégrade l'accès sans suppression de données.

### 7.10.10 Découverte croisée
Invitations contextuelles et non intrusives : après 3 sorties longues, « Ta nutrition peut améliorer tes sorties : essaie [NOM_APP_FIT] » ; après 4 semaines de muscu sans cardio, invitation à essayer Sports ; offres Ultra présentées après un événement de plan ou lorsque le conflit de planning apparaît. Fréquence maximale : 1 invitation par semaine par app, aucune après refus répété (3 refus = silence 90 jours). Lien profond vers la fiche d'installation (Partie 8) avec attribution.

### 7.10.11 Versionnement, pannes, tests de contrat, migration
- **Versionnement** : schémas JSON Schema dans un dépôt partagé ; politique de compatibilité ascendante ; champ `schema` obligatoire ; consommateurs tolérants aux champs inconnus.
- **Pannes** : file d'attente locale côté appareil et côté serveur, reprises exponentielles (1 s à 15 min), dead-letter queue après 10 échecs, alertes. Si Fit est indisponible : l'app Sports continue, les événements s'accumulent, la nutrition affiche « calcul en cours ». Idempotence par `event_id`.
- **Tests de contrat** : consumer-driven contracts ([STACK_TEST_CONTRAT]) exécutés en CI des deux dépôts ; échec bloquant ; tests de compatibilité N-1.
- **Migration des données existantes de Fit** : migration en tâche de fond avec double lecture : identités et amis fusionnés par e-mail vérifié, trophées existants rapprochés par `trophy_code` ; XP existants conservés (ne jamais baisser), rapport de migration, retour arrière possible 30 jours, aucun doublon d'ami ni de trophée (vérifié par comptage avant/après).

**Critères d'acceptation 7.10** : une activité de 13 km génère un ajustement nutritionnel dans Fit en moins de 60 s ; un trophée gagné simultanément dans les deux apps n'apparaît qu'une fois ; avec Fit indisponible, l'enregistrement et la publication fonctionnent normalement.

## 7.11 Notifications et engagement

### 7.11.1 Principes
Chaque notification a : catégorie, déclencheur, priorité, fréquence maximale, canaux autorisés, texte français (clés i18n), lien profond. **Budget global : 3 push par jour hors sécurité, 10 par semaine hors sécurité**. Heures calmes par défaut de 22 h à 8 h (fuseau local), modifiables ; seules les notifications de sécurité (position en direct, alerte d'immobilité de la Partie 4) les traversent, et uniquement avec consentement. Désactivation par catégorie et par canal (push, e-mail, dans l'app). Aucune notification ne culpabilise, aucune ne dit « tu nous manques ». Regroupement : plus de 3 événements sociaux en 1 h donnent un seul message (« 5 personnes ont réagi »).

### 7.11.2 Catalogue
| Catégorie | Déclencheur | Texte | Fréquence max. |
|---|---|---|---|
| Social | Demande d'ami reçue | « Camille veut être ton amie sur [NOM_APP_SPORTS]. » | 5/jour |
| Social | Ami accepté | « Léo a accepté ta demande. » | 5/jour |
| Social | Réaction ou commentaire | « 3 bravos sur ta sortie du matin. » | groupés, 1/h |
| Social | Mention | « Inès t'a mentionné dans une sortie. » | 5/jour |
| Club | Nouvelle sortie de club | « Sortie vélo dimanche 8 h, 12 places restantes. » | 2/jour |
| Club | Annonce épinglée | « Annonce du club Foulées du Parc. » | 1/jour |
| Sortie | Rappel d'inscription | « Ta sortie démarre demain à 8 h au parc. » | 1 à J−1, 1 à H−2 |
| Sortie | Annulation ou changement | « Sortie annulée : orage prévu. » | immédiat |
| Sortie | Place libérée (liste d'attente) | « Une place s'est libérée, confirme avant 18 h. » | immédiat |
| Défi | Défi débute / presque terminé / terminé | « Il te reste 4 km pour finir le défi de la semaine. » | 2 par défi |
| Défi | Rang dépassé | « Tu as repris la 2e place du défi entre amis. » | 1/jour |
| Trophée | Trophée obtenu | « Nouveau trophée : Mille bornes. » | immédiat, groupés |
| Record | Record personnel | « Nouveau record sur 10 km : 52:14. » | 3/semaine |
| Événement | Ouverture/clôture des inscriptions | « Les inscriptions du semi de ta ville ferment dans 7 jours. » | 2 par événement |
| Coach (IA) | Veille de séance clé | « Demain sortie longue : pense à manger plus de glucides ce soir. » | 1/jour |
| Coach (IA) | Fatigue détectée | « Ta charge est élevée : on allège la séance de demain ? » | 2/semaine |
| Coach (IA) | Météo défavorable | « Orages prévus sur ta sortie : on la décale ? » | 1/sortie |
| Coach humain | Message ou retour de séance | « Marc a commenté ta séance de seuil. » | selon activité |
| Marketplace | Achat, litige, avis | « Ton plan 10 km est disponible. » | immédiat |
| Résumé | Résumé hebdomadaire | « Ta semaine : 34 km, 3 sorties, +1 niveau. » | 1/semaine |
| Fit | Ajustement nutrition | « +420 kcal conseillées aujourd'hui pour récupérer. » | 1/jour |
| Sécurité | Partage de position, alerte | « Ta position est partagée jusqu'à 14 h. » | non limité (sécurité) |
| Compte | Sécurité du compte, facturation | « Nouvelle connexion détectée. » | non limité |

### 7.11.3 Notifications intelligentes liées au coach
Conditions : plan actif, notifications « Coach » activées. Exemples de règles :
- J−1 d'une sortie > 90 min : conseil nutrition du soir, envoyé à 18 h locales, avec bouton « Voir les recettes » (7.10.5).
- H−2 avant la séance planifiée si créneau météo OK : « Ton créneau est idéal, 14 °C, pas de pluie. »
- Après trois séances manquées : un seul message neutre « Besoin d'adapter ton plan ? », puis silence 7 jours.
- Jamais de rappel de séance un jour de repos, de pause santé ou de maladie déclarée ; les conseils de récupération remplacent les relances.

### 7.11.4 Canaux, résumés, anti-spam
- **Push** : [STACK_PUSH], jeton par appareil, demande de permission après la première activité (pas au lancement), page de préférences accessible en deux taps.
- **E-mail** : résumé hebdomadaire (dimanche soir), récapitulatif de défi, e-mails transactionnels ; lien de désinscription en un clic, en-tête `List-Unsubscribe`.
- **Dans l'app** : centre de notifications, conservation 60 jours, état lu/non lu.
- **Anti-spam** : déduplication par `(user, type, entité)` sur 24 h, suppression si l'utilisateur a déjà ouvert l'entité, désactivation automatique des e-mails après 5 envois non ouverts, dégradation du push vers dans l'app après 3 ignorés.
- **Tests** : test unitaire de chaque règle de fréquence, test de fuseau horaire et de passage à l'heure d'été, test de non-envoi pendant heures calmes et pauses santé, test A/B encadré par feature flag.
- **Métriques saines** : taux d'ouverture par catégorie, taux de désactivation (alerte si > 2 % par semaine), plaintes, part d'utilisateurs actifs avec ≥ 1 séance (jamais « temps passé dans l'app » comme objectif), séances suivies par rapport aux séances planifiées, adhérence à 4 semaines.

**Critères d'acceptation 7.11** : aucune notification non critique entre 22 h et 8 h ; un utilisateur en pause santé ne reçoit aucune relance ; le résumé hebdomadaire est envoyé une seule fois.

---

## 7.12 Parrainage et croissance

### 7.12.1 Parrainage
Lien ou code personnel. Récompense : le filleul reçoit 14 jours d'essai de l'offre Sports ; le parrain reçoit 30 jours après que le filleul a terminé **3 activités valides sur 14 jours** (plafond de 6 mois offerts par an, 10 parrainages récompensés par an). Les récompenses sont créditées via le service d'entitlements (Partie 2). Le parrainage est valable entre apps (un filleul de Fit ayant installé Sports compte une fois).
**Antifraude** : un même appareil, une même carte, une même adresse IP répétée ou un e-mail jetable annulent la récompense ; auto-parrainage détecté par empreinte d'appareil et de moyen de paiement ; limite de 5 inscriptions par IP et par jour ; revue manuelle au-delà de 3 parrainages en 24 h ; récompense retardée de 14 jours après l'achat éventuel. Aucune récompense en argent.

### 7.12.2 Partage et liens profonds
Partage d'un plan, d'un itinéraire, d'un défi, d'un club, d'un événement par lien universel ([STACK_LIENS_PROFONDS]) : ouvre l'app si installée, sinon la page web publique puis le store avec attribution différée. Les itinéraires partagés suppriment les 200 premiers et derniers mètres s'ils sont issus d'une activité (7.2.5).

### 7.12.3 Pages web publiques et SEO
Pages indexables, rendues côté serveur : itinéraires marqués publics, clubs publics, événements, défis publics. Contenu : titre, résumé, carte statique, profil de dénivelé, difficulté, saison conseillée, avis ; balisage `schema.org` (`SportsEvent`, `Place`), `sitemap.xml`, canonical, hreflang. Aucun contenu privé, aucune page de profil individuel indexable par défaut (option « profil indexable » désactivée). Possibilité de retrait par `noindex` immédiat. Les itinéraires issus de traces d'utilisateurs sont publiés **uniquement avec consentement explicite** et passent par un contrôle de sécurité (Partie 4).

### 7.12.4 Widgets et ambassadeurs
Widgets écran d'accueil : objectif de la semaine, prochaine sortie de club, série, compte à rebours d'événement ; ne montrent aucune position. Programme ambassadeur : clubs et coachs invités (conditions : 50 filleuls actifs ou club de 100 membres), codes dédiés, tableau de bord de conversions, avantages en plan offert et visibilité ; charte de transparence obligatoire (mention « partenariat » dans toute communication). Pas de commissions en argent sur les ambassadeurs mineurs.

---

## 7.13 Modération et sécurité communautaire

### 7.13.1 Politique de contenu
Interdits : harcèlement, haine, menaces, doxxing et partage de position d'un tiers, contenu sexuel ou nudité, violence, automutilation et troubles du comportement alimentaire (promotion), contenu impliquant des mineurs de façon inappropriée, spam et arnaques, fausses informations médicales dangereuses, publicité non autorisée, contenus portant atteinte à la propriété intellectuelle, tricherie organisée sur défis. Politique rédigée en français clair, versionnée, consultable depuis chaque menu de signalement.

### 7.13.2 Signalements et file de modération
Signalement en 3 taps avec catégorie. Priorités : P0 (mineur en danger, menace imminente, nudité impliquant un mineur : traitement immédiat, astreinte 24/7), P1 (harcèlement, haine : sous 24 h), P2 (spam, divers : sous 72 h). Outils : tableau de revue avec contexte (publication, historique de l'auteur, signalements précédents), actions (retirer, restreindre, avertir, suspendre, bannir, escalader), notes internes, journal d'audit immuable, double validation pour un bannissement définitif. Aucun modérateur n'accède aux données de santé ; l'accès aux tracés est limité à ce qui est signalé.

### 7.13.3 Sanctions graduées et appels
Échelle : 1) avertissement et suppression du contenu ; 2) restriction de 24 h à 7 jours (pas de commentaires, pas de messages) ; 3) suspension de 30 jours ; 4) bannissement définitif (récidive grave, ou dès la première infraction pour contenu pédocriminel, menaces graves, usurpation). Notification motivée et référence à la règle ; **appel** en un clic, réponse sous 7 jours par un modérateur différent de celui qui a décidé ; décision finale conservée pour audit. Les sanctions expirent de la liste de récidive après 12 mois, sauf infractions graves.

### 7.13.4 Détection d'abus
- **Spam** : limites de débit, détection de liens et de répétition, score de réputation des nouveaux comptes.
- **Harcèlement** : détection de messages répétés vers une personne bloquante, de langage injurieux (modèle de classification de langue française), alerte de la cible avec options de blocage.
- **Contenu sexuel** : classifieur d'images avant diffusion (7.2.4), floutage par défaut et révision humaine.
- **Pédocriminalité** : empreintes de hachage ([FOURNISSEUR_HASH_CSAM], par exemple PhotoDNA ou équivalent) sur tous les médias envoyés ; correspondance = blocage, conservation sécurisée des éléments, **signalement obligatoire aux autorités compétentes** (en France : plateforme PHAROS et le Centre national d'assistance ; selon les juridictions, le NCMEC aux États-Unis) selon la procédure légale validée par le conseil juridique ; accès aux éléments strictement limité à une équipe habilitée ; aucun visionnage à des fins autres que la revue légale ; soutien psychologique des modérateurs. Les messages privés entre adultes et mineurs sont soumis à des détecteurs de grooming (demande de photos, de rendez-vous, de changement de plateforme).

### 7.13.5 Transparence, DSA, parents
- **Conformité DSA** : mécanisme de notification et d'action, exposé des motifs pour chaque restriction, voie de recours interne, point de contact unique, rapport de transparence annuel (nombre de signalements, délais, décisions, usage de l'automatisation), conditions d'utilisation claires sur les systèmes de recommandation avec option de fil non classé (7.2.2), publicités identifiées. Voir Partie 8 pour le détail réglementaire.
- **Outils pour les parents** : compte parent lié (consentement vérifié), visibilité sur la liste d'amis, clubs rejoints, paramètres de confidentialité verrouillés, possibilité de supprimer le compte de l'enfant, aucun accès aux messages privés ni aux positions, notification de toute demande d'ami d'un adulte.

**Critères d'acceptation 7.13** : un contenu P0 est bloqué avant diffusion et visible de la file en moins de 5 minutes ; une décision de sanction comporte toujours un motif et un lien d'appel ; le rapport de transparence se génère depuis les données de modération.

---

## 7.14 Modèle de données et API

### 7.14.1 Tables
Types : `uuid` pour les identifiants, `timestamptz` pour les dates, `jsonb` pour les extensions. Tous les index listés sont obligatoires.

| Table | Champs principaux | Index et contraintes |
|---|---|---|
| `friendships` | `id`, `user_a`, `user_b`, `status`, `requested_by`, `created_at`, `accepted_at` | unique `(least(user_a,user_b), greatest(...))` ; index `(user_a,status)`, `(user_b,status)` |
| `follows` | `follower_id`, `followee_id`, `status`, `created_at` | PK composite ; index `(followee_id,status)` |
| `blocks` | `blocker_id`, `blocked_id`, `reason`, `created_at` | PK composite ; index `(blocked_id)` |
| `mutes` | `muter_id`, `muted_id`, `scope`, `created_at` | PK composite |
| `posts` | `id`, `author_id`, `type`, `visibility`, `source_ref`, `body`, `club_id`, `status`, `created_at`, `deleted_at` | index `(author_id,created_at desc)`, `(club_id,created_at desc)`, `(status)` |
| `post_media` | `id`, `post_id`, `kind`, `storage_key`, `width`, `height`, `moderation_state` | index `(post_id)` |
| `reactions` | `post_id`, `user_id`, `kind`, `created_at` | PK `(post_id,user_id)` |
| `comments` | `id`, `post_id`, `author_id`, `parent_id`, `body`, `status`, `created_at` | index `(post_id,created_at)` |
| `privacy_settings` | `user_id`, `profile_visibility`, `activity_default`, `search_visible`, `suggest_nearby`, `delay_minutes`, `jsonb extras` | PK `user_id` |
| `privacy_zones` | `id`, `user_id`, `center` (geography), `radius_m`, `label` | index spatial GiST |
| `clubs` | `id`, `name`, `type`, `join_policy`, `owner_id`, `city`, `fee_cents`, `archived_at` | unique lower(name) |
| `club_members` | `club_id`, `user_id`, `role`, `status`, `joined_at` | PK composite ; index `(user_id)` |
| `group_rides` | `id`, `club_id`, `organizer_id`, `route_id`, `starts_at`, `meeting_point`, `pace_min`, `pace_max`, `capacity`, `status` | index `(club_id,starts_at)`, `(starts_at)` |
| `ride_signups` | `ride_id`, `user_id`, `status`, `position_waitlist`, `checked_in_at` | PK composite |
| `challenges` | `id`, `type`, `metric`, `sports[]`, `starts_at`, `ends_at`, `creator_id`, `visibility`, `sponsor_id`, `rules_json`, `status` | index `(status,starts_at)` |
| `challenge_participants` | `challenge_id`, `user_id`, `team_id`, `progress`, `rank`, `joined_at` | PK composite ; index `(challenge_id,progress desc)` |
| `activity_validation` | `activity_id`, `status`, `reasons[]`, `evaluated_at`, `appeal_status` | index `(status)` |
| `xp_ledger` | `id`, `user_id`, `source`, `source_id`, `xp`, `day`, `created_at` | unique `(user_id,source,source_id)` ; index `(user_id,day)` |
| `user_levels` | `user_id`, `xp_total`, `level`, `prestige` | PK `user_id` |
| `trophies` | `code`, `category`, `rarity`, `rule_json`, `secret` | PK `code` |
| `user_trophies` | `user_id`, `trophy_code`, `awarded_at`, `source_app`, `revoked_at` | unique `(user_id,trophy_code)` |
| `streaks` | `user_id`, `current_weeks`, `best_weeks`, `jokers_left`, `pause_until` | PK `user_id` |
| `personal_records` | `id`, `user_id`, `metric`, `value`, `activity_id`, `set_at` | index `(user_id,metric,value)` |
| `segments` | `id`, `creator_id`, `geom` (linestring), `length_m`, `risk_class`, `status` | GiST `(geom)` |
| `segment_efforts` | `segment_id`, `user_id`, `activity_id`, `time_s`, `visibility` | index `(segment_id,time_s)` |
| `events` | `id`, `name`, `sport`, `starts_at`, `location`, `distance_m`, `elevation_m`, `external_url`, `organizer_id`, `status` | index `(starts_at)`, spatial `(location)` |
| `event_participations` | `event_id`, `user_id`, `status`, `result_time_s`, `activity_id` | PK composite |
| `coach_profiles` | `user_id`, `verification_status`, `qualifications jsonb`, `insurance_expiry`, `rating_avg`, `rating_count` | index `(verification_status)` |
| `coach_products` | `id`, `coach_id`, `kind`, `price_cents`, `currency`, `duration_weeks`, `store_sku` | index `(coach_id)` |
| `coach_engagements` | `id`, `coach_id`, `athlete_id`, `product_id`, `status`, `consent_scopes[]`, `started_at`, `ended_at` | index `(coach_id,status)`, `(athlete_id,status)` |
| `coach_data_access_log` | `engagement_id`, `scope`, `accessed_at` | index `(engagement_id,accessed_at)` |
| `reviews` | `id`, `engagement_id`, `rating`, `body`, `status` | unique `(engagement_id)` |
| `disputes` | `id`, `engagement_id`, `opened_by`, `status`, `decision` | index `(status)` |
| `notifications` | `id`, `user_id`, `category`, `payload`, `read_at`, `sent_channels[]`, `created_at` | index `(user_id,created_at desc)` |
| `notification_prefs` | `user_id`, `category`, `push`, `email`, `in_app`, `quiet_start`, `quiet_end` | PK `(user_id,category)` |
| `referrals` | `id`, `referrer_id`, `referee_id`, `status`, `fraud_score`, `rewarded_at` | unique `(referee_id)` |
| `reports` | `id`, `reporter_id`, `target_type`, `target_id`, `category`, `priority`, `status`, `decided_by`, `decision`, `created_at` | index `(status,priority,created_at)` |
| `sanctions` | `id`, `user_id`, `level`, `reason`, `report_id`, `expires_at`, `appeal_status` | index `(user_id,created_at)` |
| `fit_sync_outbox` | `id`, `event_type`, `payload`, `attempts`, `next_attempt_at`, `status` | index `(status,next_attempt_at)` |

### 7.14.2 API publique (extraits, préfixe `/v1`)
Authentification : jeton utilisateur ; pagination par curseur ; limites de débit par route ; réponse d'erreur uniforme `{ "error": { "code", "message", "request_id" } }`.

| Méthode et route | Rôle |
|---|---|
| `POST /friends/requests` | Envoyer une demande |
| `POST /friends/requests/{id}/accept` | Accepter |
| `POST /blocks`, `DELETE /blocks/{userId}` | Bloquer, débloquer |
| `GET /feed?tab=following\|foryou&cursor=` | Fil |
| `POST /posts`, `PATCH /posts/{id}/visibility` | Publier, changer la visibilité |
| `POST /posts/{id}/reactions`, `POST /posts/{id}/comments` | Interactions |
| `POST /reports` | Signaler |
| `POST /clubs`, `GET /clubs/{id}`, `POST /clubs/{id}/join` | Clubs |
| `POST /clubs/{id}/rides`, `POST /rides/{id}/signup` | Sorties |
| `POST /challenges`, `POST /challenges/{id}/join`, `GET /challenges/{id}/leaderboard` | Défis |
| `POST /activities/{id}/validation/appeal` | Contester |
| `GET /me/gamification` | XP, niveau, séries, trophées |
| `GET /events?lat=&lon=&radius=&sport=` , `POST /events/{id}/prepare` | Événements et plan |
| `POST /coach/engagements`, `PUT /coach/engagements/{id}/consent` | Marketplace, consentement |
| `GET /me/notifications`, `PUT /me/notification-prefs` | Notifications |

Exemple `POST /posts` :
```json
{"type": "activity", "source_ref": {"activity_id": "act_998"},
 "visibility": "friends", "body": "Belle sortie trail ce matin",
 "media": [{"upload_id": "upl_77"}], "share_card": {"template": "route", "blur_ends_m": 200}}
```
Réponse :
```json
{"id": "post_5521", "status": "published", "visibility": "friends",
 "visible_from": "2026-10-04T10:30:00Z", "created_at": "2026-10-04T09:58:00Z"}
```
Exemple `GET /challenges/{id}/leaderboard` :
```json
{"challenge_id": "chl_42", "metric": "distance_equiv_km", "updated_at": "2026-10-04T10:00:00Z",
 "me": {"rank": 8, "value": 41.3},
 "entries": [{"rank": 1, "user": {"id": "usr_9", "name": "Sam"}, "value": 63.0, "status": "valid"}]}
```
Exemple `PUT /coach/engagements/{id}/consent` :
```json
{"scopes": ["activities", "load", "hr"], "excluded": ["weight", "sleep", "injuries"], "expires_at": "2027-04-01T00:00:00Z"}
```

---

## 7.15 Tests et critères d'acceptation

### 7.15.1 Stratégie
Tests unitaires du domaine (formules d'XP, ranking, anti-triche, règles anti-conflit), tests d'intégration API (droits, blocage, visibilité), tests de contrat avec Fit (7.10.11), tests de charge (fil à 1 000 req/s, classement de 100 000 participants), tests de sécurité (IDOR, énumération, abus de pagination) et tests d'accessibilité. Jeux de données : 1 000 tracés synthétiques avec zones masquées, 50 traces de véhicules, 200 cas de timing pour séries.

### 7.15.2 Cas d'acceptation numérotés
**Graphe social**
1. Une demande d'ami acceptée crée une relation symétrique visible des deux côtés en moins de 10 s, dans Sports et dans Fit.
2. Un utilisateur bloqué reçoit 404 sur le profil, les publications, les commentaires et les classements du bloqueur.
3. Le 21e envoi de demande d'ami du jour est refusé avec un code d'erreur lisible.
4. Les contacts non appariés ne sont jamais stockés.
5. Un profil passé de « public » à « amis » retire ses publications des fils d'inconnus en moins de 60 s.

**Fil et médias**
6. Une photo envoyée avec GPS dans l'EXIF est publiée sans aucune métadonnée de position.
7. L'onglet « Suivis » est strictement chronologique inverse ; « Pour toi » ne montre pas plus de 2 publications consécutives du même auteur.
8. Une publication signalée trois fois par des comptes distincts passe en revue prioritaire et est masquée à titre conservatoire.
9. Le repartage est absent pour une publication non publique.
10. La carte de partage affiche par défaut un flou de 200 m au début et à la fin du tracé.

**Confidentialité et mineurs**
11. Aucun point de tracé situé dans une zone masquée n'apparaît dans la réponse API d'un tiers (1 000 tracés).
12. Un tracé n'est visible d'un ami que 30 minutes après la fin par défaut.
13. Un compte de 14 ans ne peut pas passer en public (403, y compris par appel direct).
14. Un adulte sans lien préalable ne peut pas envoyer de demande d'ami à un mineur.
15. La suppression de compte rend le profil introuvable immédiatement et purge les données personnelles sous 30 jours.

**Clubs et sorties**
16. Un membre exclu perd l'accès au chat en moins de 60 s.
17. Une sortie complète place la 13e personne en liste d'attente, promue automatiquement lors d'un désistement.
18. L'annulation d'une sortie notifie tous les inscrits sous 60 s.
19. Un club d'entreprise de moins de 10 membres n'affiche aucune statistique agrégée.
20. Un propriétaire unique qui quitte le club déclenche le transfert au plus ancien admin.

**Défis et anti-triche**
21. Une activité en voiture (vitesse constante de 60 km/h sur route) est classée `invalid` et exclue du classement.
22. Une course à 30 km/h soutenus pendant 2 min est `invalid`.
23. Deux enregistrements d'une même sortie (montre et téléphone) ne comptent qu'une seule fois.
24. La correction du type d'activité relance l'évaluation et met à jour le classement en moins de 60 s.
25. Un défi de 20 km « toutes disciplines » applique le coefficient vélo ×0,25.
26. Un défi sponsorisé sans mention « Sponsorisé » est refusé à la publication.
27. Un appel d'exclusion de défi reçoit une décision motivée sous 72 h.

**Gamification**
28. Le plafond de 400 XP/jour est respecté sur 5 activités le même jour.
29. Un trophée n'est attribué qu'une seule fois (contrainte unique, événement rejoué deux fois).
30. Une pause santé de 3 semaines conserve la série et n'envoie aucune relance.
31. Un record personnel issu d'une activité `suspect` n'est pas validé.
32. Le bilan annuel ne contient aucune donnée de santé dans ses cartes de partage.
33. Un utilisateur au ratio de charge de 1,6 ne reçoit plus de bonus de régularité et reçoit une suggestion de repos.

**Classements et segments**
34. Un utilisateur « Ne pas figurer » est absent de tout classement et segment publics.
35. Un segment de descente ne génère aucun classement de temps absolu public.
36. Le retrait d'un segment demandé par une commune est effectif en moins de 24 h.

**Événements**
37. « Préparer cet événement » à 6 semaines d'un semi débutant produit un avertissement de délai court.
38. Un résultat saisi à ± 3 % de la distance est rapproché automatiquement de l'activité enregistrée.

**Marketplace**
39. Un coach non vérifié ne peut créer aucun produit ni recevoir de paiement.
40. La révocation du consentement « fréquence cardiaque » supprime la FC de la réponse de l'API coach en moins de 60 s.
41. Un litige ouvert bloque le versement correspondant.
42. Un guide de montagne affiche sa qualification sur toute sortie encadrée, ou la sortie est refusée.

**Intégration Fit**
43. Une sortie de 13 km publie `activity.completed` puis un ajustement nutritionnel dans Fit en moins de 60 s.
44. Un trophée gagné dans les deux apps n'est enregistré qu'une fois.
45. Avec Fit indisponible, l'enregistrement, la publication et le fil fonctionnent ; la file de reprise rejoue les événements à la reprise.
46. Un abonnement Sports seul n'accède pas à l'ajustement nutritionnel automatique (droit vérifié côté serveur).
47. Un conflit « jambes la veille d'un fractionné » déclenche un avertissement et une proposition d'alternative.

**Notifications, parrainage, modération**
48. Aucune notification non critique n'est envoyée entre 22 h et 8 h.
49. Un parrainage depuis le même appareil n'accorde aucune récompense.
50. Un contenu P0 est bloqué avant diffusion et visible de la file en moins de 5 minutes.
51. Toute sanction affiche un motif et un lien d'appel.
52. Un média dont l'empreinte correspond à la base de contenus pédocriminels est bloqué, conservé de façon sécurisée et signalé selon la procédure légale.
