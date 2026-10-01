# PARTIE 4 — Cartes, itinéraires, randonnée, vélo-route, navigation et sécurité

Cette partie spécifie tout ce qui touche à la carte dans [NOM_APP_SPORTS] : rendu, données, hors ligne, création et découverte d'itinéraires, navigation, randonnée avancée et sécurité. Elle s'appuie sur l'enregistrement d'activité (voir Partie 3), les droits d'abonnement (voir Partie 2), le coach et la charge (voir Partie 5) et la confidentialité sociale (voir Partie 7). Règle générale : tout écran cartographique doit rester utilisable sans réseau avec les données déjà présentes sur l'appareil, et tout droit payant est vérifié côté serveur (jamais seulement côté client).

## 4.1 Choix techniques cartographiques

### 4.1.1 Moteur de rendu

| Option | Licence | Forces | Faiblesses | Verdict |
|---|---|---|---|---|
| MapLibre Native (via [STACK_MAP_BINDING], ex. `@maplibre/maplibre-react-native`) | BSD-3 | Open source, tuiles vectorielles, styles Mapbox GL compatibles, hors ligne via packs, aucune facturation par chargement de carte | Écosystème de plugins plus petit, 3D/terrain moins abouti | **Recommandé** |
| Mapbox SDK | Propriétaire (v2+) | Très abouti, Navigation SDK | Facturation par MAU et par requête, verrouillage, hors ligne soumis à conditions | Rejeté comme socle |
| Google Maps SDK | Propriétaire | Familier | Pas de sentiers/courbes de niveau, hors ligne très limité, CGU restrictives sur le tracé GPS | Rejeté |
| Apple MapKit / Android natif | Propriétaire | Gratuit, léger | Pas de styles outdoor, divergence iOS/Android | Rejeté |
| Leaflet / OpenLayers en WebView | BSD | Rapide à prototyper | Performances insuffisantes sur gros tracés, pas de vectoriel fluide | Réservé au site web de partage |

Recommandation : MapLibre Native sur mobile, MapLibre GL JS sur le web (pages de partage, éditeur d'itinéraire desktop). Un seul style JSON versionné, partagé par les deux plateformes. Encapsule le moteur derrière une interface `MapEngine` (méthodes : `setStyle`, `addGeoJsonLayer`, `fitBounds`, `queryRenderedFeatures`, `downloadRegion`, `setCamera`) pour pouvoir changer de moteur sans toucher au domaine.

### 4.1.2 Tuiles, styles, hébergement

- **Format** : tuiles **vectorielles** (MVT) pour fonds, sentiers, POI ; tuiles **raster** uniquement pour le satellite, l'ombrage (hillshade) pré-calculé et les radars météo. Pourquoi : un pack vectoriel d'un département français pèse 40 à 120 Mo, le même en raster topo dépasse 1 Go.
- **Conteneur** : archives **PMTiles** (fichier unique, lectures par plages HTTP) servies depuis un stockage objet + CDN. Aucun serveur de tuiles à maintenir ; le téléchargement hors ligne consiste à récupérer des plages d'octets ou un extrait découpé côté serveur.
- **Génération** : planète ou pays via Planetiler (schéma OpenMapTiles personnalisé + couche `trails` enrichie : `sac_scale`, `mtb:scale`, `surface`, `tracktype`, `network`, `ref`) ; courbes de niveau via `contours` depuis un MNT (équidistance 10 m à zoom 13-14, 20 m à zoom 12, 50 m à zoom 10-11, 100 m en dessous) ; ombrage généré en gdaldem à partir de Copernicus GLO-30 (hillshade multidirectionnel, 3 exagérations).
- **Styles** : cinq styles JSON dérivés d'une même palette de tokens (`rue`, `topo`, `satellite-hybride`, `velo`, `sombre`) ; mode sombre automatique selon le thème système ; polices en glyphes PBF hébergées par nous.
- **Hébergement** : [STACK_TILES_HOST] — comparer à l'implémentation : (a) Cloudflare R2 + CDN (pas de frais de sortie, ~15 $/To stocké par mois pour 1 To, requêtes à ~0,36 $/million lectures de classe B) ; (b) Protomaps/MapTiler/Stadia en service géré ; (c) serveur auto-hébergé de tuiles (coûts fixes, plus de maîtrise). Recommandation : (a) pour les fonds, avec CDN devant, et un service géré uniquement pour le satellite.
- **Satellite** : jamais de copie d'imagerie sous licence restrictive. Options : Sentinel-2 (libre, 10 m, flou en zoom fort), IGN Ortho HR (France, Licence Ouverte pour une partie, 20 cm), MapTiler/Mapbox Satellite (payant, CGU interdisant parfois le cache hors ligne massif). Recommandation : IGN pour la France, fournisseur payant ailleurs, et satellite **non téléchargeable hors ligne** en gratuit, téléchargeable limité en payant si la licence du fournisseur l'autorise (vérifier par écrit avant d'activer).

### 4.1.3 Moteurs de routage

| Moteur | Forces | Limites | Usage |
|---|---|---|---|
| **Valhalla** | Profils dynamiques par requête (coûts modifiables sans recompiler), isochrones, map-matching (Meili), tuiles de graphe par région, RAM raisonnable | Pas de profil trail/VTT natif ; il faut régler `use_trails`, `use_hills`, `use_roads` | **Recommandé** pour route/vélo/marche, map-matching |
| **BRouter** | Profils scriptables très fins (trek, gravel, VTT), rend le « bon » chemin pour le vélo, prise en compte de la pente | Moins d'API de haut niveau, scalabilité moyenne, segments de 5°x5° à charger | **Recommandé** en second moteur pour trail/rando/gravel |
| GraphHopper | Flexible, custom models JSON, bon moteur de boucles (`round_trip`) | Fonctions avancées dans l'édition payante, RAM élevée à l'échelle planète | Alternative à Valhalla |
| OSRM | Très rapide | Profils figés à la compilation, un graphe par profil, pas de pente | Rejeté (inadapté à l'outdoor) |

Recommandation : Valhalla pour tout ce qui est routier et map-matching, BRouter pour trail/rando/gravel/VTT, derrière un service interne `RoutingService` unique (`POST /route`, `/loop`, `/matrix`, `/match`) qui choisit le moteur selon le profil. Cache de requêtes (hash du profil + points arrondis à 5 décimales). Si [STACK_ROUTING] impose un seul moteur, choisir GraphHopper avec custom models.

### 4.1.4 Données et licences

| Donnée | Licence | Attribution obligatoire | Notes |
|---|---|---|---|
| OpenStreetMap | ODbL 1.0 | « © contributeurs d'OpenStreetMap » avec lien | Les bases dérivées (extraits de graphe, POI) restent ODbL ; l'usage d'une carte produite reste libre mais l'attribution est affichée **en permanence** sur la carte |
| IGN (SCAN, Plan IGN, BD TOPO, Ortho) | Licence Ouverte Etalab 2.0 pour les données ouvertes depuis 2021 ; certaines couches (SCAN 25 en usage intensif) via accès géoservices | « © IGN » | Vérifier les conditions de la clé géoservices et les quotas de tuiles |
| SRTM 1 arcsec | Domaine public (NASA) | Pas obligatoire, courtoisie | Trous en montagne, bruit ~±16 m |
| Copernicus GLO-30 | Licence Copernicus libre, attribution requise | « Copernicus DEM © ESA » | 30 m, plus propre que SRTM sur les reliefs, **recommandé** |
| RGE ALTI IGN (France) | Licence Ouverte | « © IGN » | 1 m à 5 m, très précis ; utiliser pour la France |
| Données de cartes de risque (Météo-France, Bulletin Estimation Risque d'Avalanche, prévention incendie) | Variables, souvent Licence Ouverte | Mentionner la source et l'heure d'émission | Voir 4.2 |

Implémente un écran « Sources et licences » (Réglages > À propos) généré depuis un fichier `ATTRIBUTIONS.json`, et un bouton « i » toujours visible dans le coin de chaque carte. L'attribution ne doit jamais être masquée par un contrôle ni rognée dans les captures de partage.

### 4.1.5 Coûts par ordre de grandeur

Hypothèses : 30 % des utilisateurs actifs mensuels (MAU) ouvrent la carte, une session moyenne charge 1,5 Mo de tuiles (cache hors compris), 10 % téléchargent un pack hors ligne de 80 Mo par mois.

| MAU | Trafic tuiles/mois | CDN + stockage (option R2) | Routage (instances) | Total indicatif |
|---|---|---|---|---|
| 1 000 | ~1 Go | < 5 $ | 1 petite VM partagée (~20 $) | ~30 $ |
| 10 000 | ~15 Go + 80 Go packs | ~20 $ | 1 VM 8 Go (~60 $) | ~100 $ |
| 100 000 | ~150 Go + 800 Go packs | ~100 $ | 3 VM dont 1 BRouter (~400 $) | ~600 $ |
| 1 000 000 | ~1,5 To + 8 To packs | ~600 $ | cluster auto-scalé (~3 500 $) | ~5 000 $ |

Comparaison : le même volume chez un fournisseur facturant au chargement de carte (modèle Mapbox) coûte typiquement 10 à 50 fois plus à partir de 100 000 MAU. Rappelle dans le code des constantes de coût estimé par MAU et alerte l'équipe si le coût réel par MAU dépasse 0,02 $.

### 4.1.6 Plan B en cas de changement de tarifs

- Aucune clé de fournisseur commercial dans le client : toutes les URL de tuiles passent par `https://tiles.[DOMAINE]/` (proxy/CDN à nous). Changer de fournisseur = changer la config du proxy.
- Le style JSON référence `sources` par alias, jamais directement le fournisseur.
- Deux fournisseurs configurés en parallèle (primaire et secours) avec bascule automatique après 3 erreurs 5xx/429 consécutives ou si le budget mensuel dépasse 120 %.
- Packs hors ligne produits par nous (PMTiles extraits), donc indépendants du fournisseur de fond.
- Test trimestriel de bascule : critère d'acceptation, une carte complète s'affiche avec le fournisseur de secours en moins de 2 s sur 4G.

## 4.2 Fonds de carte et couches

### 4.2.1 Fonds de carte

| Fond | Contenu | Gratuit | Payant |
|---|---|---|---|
| Rue | routes, bâtiments, transports | oui | oui |
| Topographique | sentiers, courbes de niveau, ombrage, cotes de sommets, forêts, eau | oui (zoom ≤ 15) | zoom complet, 3 niveaux d'ombrage |
| Satellite / hybride | imagerie + libellés | aperçu zoom ≤ 14 | oui (Sports, Ultra) |
| Vélo | pistes cyclables, itinéraires nationaux et régionaux, revêtements, trafic | oui | oui |
| Sombre | version nocturne de rue/topo | oui | oui |

Le sélecteur de fond mémorise le dernier choix par activité (rando : topo ; vélo route : vélo ; course : rue).

### 4.2.2 Couches activables

Chaque couche est un objet `{id, source, minZoom, offlineEligible, plan, legend, refreshPolicy}`. Contrôles : panneau de couches avec interrupteurs, légende contextuelle, mémorisation par activité, maximum 6 couches simultanées affichées pour préserver les performances.

1. **Courbes de niveau et ombrage** : voir 4.1.2 ; courbes maîtresses (tous les 5 traits) épaissies et étiquetées.
2. **Sentiers balisés** : ways OSM `highway=path|footway|track` avec `route=hiking` ; couleur selon `osmc:symbol` (GR rouge/blanc, GRP jaune/rouge, PR jaune) ; libellé `ref` (GR20, GR®5).
3. **Difficulté des sentiers** : dérivée de `sac_scale` (hiking, mountain_hiking, demanding_mountain_hiking, alpine_hiking...) et `mtb:scale` (0 à 6), avec `trail_visibility`. Affiche vert/bleu/rouge/noir ; si tag absent, afficher « non évalué », jamais « facile ». Pour les itinéraires importés d'un tiers, mapper la cotation locale (T1 à T6 suisse, F/PD/AD, UIAA) vers le même enum interne `DifficultyClass`.
4. **Surfaces** : `surface` + `smoothness` regroupés en `paved`, `compacted`, `gravel`, `dirt`, `grass`, `sand`, `rock`, `unknown`. Sert au calcul du pourcentage non goudronné (voir 4.8).
5. **Pente** : couche raster calculée depuis le MNT, classes <5 %, 5-10, 10-15, 15-20, 20-30, 30-40, >40 % ; couleurs sans dépendre uniquement du rouge/vert (daltonisme), motif hachuré pour >30 %. Avec une couche « zones de pente avalancheuse » (30°-45°) pour la montagne l'hiver, accompagnée d'un avertissement qu'elle **n'indique pas** le danger réel.
6. **Heatmap personnelle** : agrégation de toutes les activités de l'utilisateur, calculée localement en tuiles de grille ~ 15 m, rendue en dégradé monochrome. Toujours privée, jamais envoyée.
7. **Heatmap communautaire** : alimentée uniquement par les utilisateurs ayant activé la contribution ; règles de confidentialité en 4.10. Gratuite en lecture limitée (zoom ≤ 12), complète en payant.
8. **POI pratiques** : points d'eau potable (`amenity=drinking_water`, `natural=spring` avec `drinking_water=yes`), refuges (`tourism=alpine_hut|wilderness_hut`), abris (`amenity=shelter`), toilettes, parkings, arrêts de transport (train, bus, téléphérique), campings, boulangeries/épiceries (ravitaillement), secours (`emergency=*`). Chaque POI affiche la fraîcheur de la donnée ; une source d'eau signalée « à sec » par la communauté depuis moins de 30 jours est grisée.
9. **Zones interdites ou réglementées** : réserves naturelles, cœurs de parc national (chiens interdits, bivouac réglementé), zones militaires, zones de nidification saisonnières, périodes de chasse **si une source officielle est disponible** (par département via données ouvertes ; sinon couche indisponible, **ne jamais afficher « pas de chasse » par absence de donnée**). Chaque zone a une règle affichée en texte clair et une date de mise à jour.
10. **Météo** : radar de précipitations animé (source [STACK_WEATHER], ex. RainViewer, Météo-France, OpenWeather) avec horodatage, rafraîchi toutes les 10 min ; couche non disponible hors ligne et affichée comme telle.
11. **Danger d'avalanche** : BERA Météo-France pour les massifs français, SLF pour la Suisse, lawinen.report en Europe ; afficher le niveau 1-5, l'altitude, l'exposition et l'heure d'émission, avec lien vers le bulletin officiel. Hors zone couverte : ne rien afficher plutôt qu'une valeur approximative.
12. **Risque incendie** : cartes préfectorales/Météo-France « risque feux de forêt » en saison ; niveaux avec restrictions d'accès éventuelles.

### 4.2.3 Règles transverses

- Chaque couche externe porte `sourceName`, `fetchedAt`, `validUntil`. Si `now > validUntil`, afficher un badge « donnée périmée » et ne jamais présenter la couche comme actuelle.
- Droits : gratuit = fonds rue/topo/vélo, POI, pente, heatmap personnelle, météo radar ; payant (Sports et au-dessus) = satellite complet, heatmap communautaire complète, zones réglementées détaillées, avalanche/incendie ; Ultra = couches premium (cartes locales de détail éventuelles). Les URL de tuiles premium sont signées côté serveur (jeton de 1 h) après vérification d'entitlement.
- Critère d'acceptation : activer/désactiver une couche prend < 150 ms et ne recharge pas le style complet.

## 4.3 Cartes hors ligne

### 4.3.1 Unités de téléchargement

1. **Région** : département/zone administrative prédéfinie, ou rectangle dessiné à la main.
2. **Itinéraire** : corridor autour d'un tracé (rayon réglable 1/2/5 km, défaut 2 km) avec zoom de 8 à 16.
3. **Zone autour de moi** : disque de 10/25/50 km.
4. **Auto** : à la planification d'une sortie ou d'une rando multi-jours, proposer le téléchargement en un tap (« Télécharger cette rando : 38 Mo »).

### 4.3.2 Contenu d'un pack

Fond topo vectoriel (zoom 6-16), courbes et ombrage compressés, POI, couche sentiers, glyphes, sprites, MNT basse résolution pour profil d'altitude (tuiles Terrain-RGB à zoom ≤ 12), graphe de routage léger si le plan l'autorise (voir 4.4.9). Satellite : exclu par défaut, optionnel payant, niveau de zoom plafonné à 15.

### 4.3.3 Tailles de référence

| Pack | Zoom | Taille approximative |
|---|---|---|
| Corridor 40 km × 4 km, topo vectoriel | 8-16 | 25-45 Mo |
| Département montagneux (ex. Savoie) | 6-15 | 90-140 Mo |
| Département plat (ex. Beauce) | 6-15 | 30-60 Mo |
| Pays (France), zoom 6-13 | 6-13 | 600-900 Mo |
| Ajout satellite, même corridor | 8-15 | 180-300 Mo |

Affiche toujours la taille estimée avant téléchargement avec calcul `estimate = Σ(tiles_per_zoom × avg_tile_bytes_per_zoom)` calibré par échantillonnage serveur ; erreur tolérée ±20 %.

### 4.3.4 Quotas par abonnement

| | Gratuit | Sports | Fit | Ultra |
|---|---|---|---|---|
| Packs hors ligne simultanés | 1 (max 150 Mo) | 10 | 3 | illimité (plafond 5 Go) |
| Satellite hors ligne | non | 500 Mo | non | 3 Go |
| Navigation hors ligne | oui, sur le pack téléchargé | oui | oui | oui |
| Mises à jour auto | manuelle | auto Wi-Fi | manuelle | auto Wi-Fi |

« Fit » correspond à l'abonnement de l'app Fit : il donne des avantages cartographiques minimaux (voir Partie 2 pour la matrice exacte, qui prévaut). Le serveur délivre un « jeton de téléchargement » signé par pack ; le client ne peut pas dépasser le quota en contournant l'UI. Si l'abonnement expire : les packs existants restent lisibles 30 jours, puis ceux dépassant le quota gratuit sont marqués « verrouillés » (non supprimés) pendant 60 jours, avec invitation à se réabonner.

### 4.3.5 Gestion du stockage et cycle de vie

- Écran « Cartes hors ligne » : liste de packs avec taille, date, état (`à jour`, `mise à jour disponible`, `expire dans N jours`, `verrouillé`), total utilisé et espace libre.
- Refuser un téléchargement si l'espace libre restant serait < max(500 Mo, 10 %) du stockage ; proposer de libérer (suppression des packs les plus anciens non utilisés depuis 90 jours).
- Téléchargement : reprise après coupure (plages HTTP), file d'attente, Wi-Fi seulement par défaut (réglable), vérification d'intégrité par hash, priorité : packs de la prochaine sortie planifiée > packs récents > autres. Pause automatique sous 20 % de batterie sauf si l'utilisateur force.
- **Mises à jour différentielles** : les PMTiles sont versionnés par date (`2026-10`) ; le serveur fournit un manifeste de tuiles modifiées (hash par tuile ou par bloc de 1 Mo) ; le client ne télécharge que les blocs changés. Fréquence : fonds mensuels, POI hebdomadaires, couches réglementaires selon leur source.
- **Expiration** : un pack plus ancien que 6 mois affiche « données anciennes » ; à 12 mois il reste utilisable mais la navigation affiche un bandeau d'avertissement (sentiers peut-être modifiés).
- **Partage des données** : un pack est un fichier immuable ; le partage entre appareils d'un même compte passe par le serveur ; le partage d'un pack entre utilisateurs n'est pas autorisé (licences), seul le partage de l'itinéraire l'est, le destinataire télécharge selon ses propres droits.

### 4.3.6 Comportement sans réseau, écran par écran

| Écran | Sans réseau |
|---|---|
| Carte principale | affiche les packs ; hors zone téléchargée : fond gris quadrillé + message « zone non téléchargée » et bouton télécharger (actif au retour du réseau) |
| Recherche de lieux | recherche locale dans les POI/noms du pack ; adresses complètes indisponibles |
| Création d'itinéraire | tracé libre et accrochage via graphe local si présent ; sinon mode « ligne droite » avec avertissement explicite |
| Découverte | itinéraires déjà mis en cache/enregistrés uniquement, badge « hors ligne » |
| Navigation | complète : positionnement GNSS, suivi du tracé, déviation, boussole, profil |
| Enregistrement d'activité | complet (voir Partie 3), tuiles manquantes ignorées sans erreur |
| Couches météo/avalanche | dernière valeur reçue avec horodatage rouge si > 6 h |
| Partage de position (4.9) | file d'attente d'envoi, SOS satellite natif si disponible |
| Avis/photos | écriture mise en file locale, envoi à la reconnexion |

Critère d'acceptation : en mode avion, ouvrir un pack téléchargé, démarrer la navigation sur un itinéraire enregistré, avancer 2 h : zéro écran d'erreur bloquant.

## 4.4 Création d'itinéraire

### 4.4.1 Édition point à point

- Interaction : tap long ou bouton « + » pose un point ; le segment vers le point précédent est routé automatiquement. Glisser un point recalcule les deux segments adjacents (aperçu en ligne pointillée pendant le glissement, calcul au relâchement, objectif < 800 ms en réseau 4G).
- Insérer un point sur un segment : tap sur le tracé puis glisser. Supprimer : tap sur le point puis corbeille.
- Bascule « Accrocher aux chemins » (par défaut ON) / « Ligne droite » (hors réseau routable ou pour traversée hors-sentier, segment marqué `offTrail=true`, signalé en pointillé orange et compté séparément dans le résumé).
- **Annuler/rétablir** : pile d'opérations illimitée en session (`AddPoint`, `MovePoint`, `DeletePoint`, `InsertPoint`, `ChangeProfile`, `ReverseRoute`, `ApplyLoop`), 100 niveaux persistés dans le brouillon ; raccourcis geste (secouer l'appareil désactivé par défaut) et boutons visibles.
- Brouillon auto-sauvegardé toutes les 5 s en local (offline-first, voir Partie 1).

### 4.4.2 Profils de routage par activité

Coût d'une arête : `cost = length × facteur_voie × facteur_surface × facteur_pente × facteur_danger`. Un facteur > 1 pénalise, < 1 favorise ; la valeur 99 signifie « interdit sauf nécessité absolue ». Valeurs initiales à régler empiriquement :

| Type de voie | Course route | Trail | Vélo route | Gravel | VTT | Marche | Rando |
|---|---|---|---|---|---|---|---|
| Trottoir / voie piétonne | 0,9 | 1,2 | 99 | 99 | 99 | 0,8 | 1,2 |
| Rue résidentielle | 1,0 | 1,5 | 1,0 | 1,1 | 1,5 | 1,0 | 1,5 |
| Route secondaire (faible trafic) | 1,1 | 2,0 | 0,9 | 1,0 | 1,6 | 1,3 | 2,0 |
| Route primaire/nationale | 3,0 | 5,0 | 2,5 | 3,0 | 4,0 | 3,0 | 5,0 |
| Piste cyclable séparée | 1,2 | 2,0 | 0,7 | 0,9 | 1,2 | 1,1 | 2,0 |
| Chemin goudronné / voie verte | 0,9 | 1,0 | 0,8 | 0,9 | 1,1 | 0,9 | 1,0 |
| Chemin compact / piste forestière | 1,3 | 0,7 | 3,0 | 0,7 | 0,8 | 1,0 | 0,7 |
| Sentier (path), `sac_scale` T1-T2 | 2,0 | 0,6 | 99 | 2,5 | 0,7 | 1,2 | 0,6 |
| Sentier T3 et plus | 99 | 1,0 | 99 | 99 | 1,5 | 99 | 1,3 |
| Escalier | 1,5 | 1,5 | 99 | 99 | 99 | 1,2 | 1,2 |
| Sable / boue (`smoothness` très mauvais) | 3,0 | 2,0 | 99 | 3,0 | 2,0 | 2,0 | 1,8 |

Facteurs additionnels :
- **Pente** : `facteur_pente = 1 + k × max(0, |p| − p0)²` avec `p` en fraction ; course route k=8, p0=0,06 ; vélo route k=14, p0=0,05 ; VTT montée k=6 mais descente autorisée jusqu'à −0,25 ; rando k=3, p0=0,10. Pente interdite (facteur 99) pour vélo route si `|p| > 0,18` sur plus de 100 m, sauf option « accepter les raidillons ».
- **Danger routier** : `facteur_danger = 1 + 2 × (vitesse_max ≥ 70 km/h) + 1 × (pas d'accotement) + 1 × (tunnel > 200 m)` pour course, vélo, marche.
- **Évitements** (cases à cocher dans « Options d'itinéraire ») : éviter routes dangereuses (multiplie le danger par 3), escaliers, boue/sentiers non roulants, autoroutes (toujours exclues), gués et passages à pied (VTT), propriétés privées (`access=private` toujours interdit), tronçons marqués fermés par la communauté (voir 4.4bis), zones réglementées (voir 4.2).
- Les valeurs de poids vivent dans un fichier de configuration versionné (`routing-profiles/*.json`), chargé par le service ; tout changement exige l'exécution de la suite de tests de 4.12.

### 4.4.3 Boucle depuis une distance cible

Entrée : point de départ, distance cible `D`, profil, tolérance (défaut ±10 %), direction préférée optionnelle (nord/est/sud/ouest ou « vers les sentiers »).

Algorithme :
```
function generateLoops(start, D, profile, n=5):
  candidates = []
  for angle in randomSample(0..360, 12):
    # triangle/quadrilatère de contrôle
    r = D / (2π) * 0.9              # rayon d'un cercle de périmètre D, corrigé
    waypoints = [start, pointAt(start, angle, r), pointAt(start, angle+90°, r), pointAt(start, angle+180°, r*0.5)]
    route = router.route(waypoints + [start], profile)
    for _ in 1..3:                    # correction itérative d'échelle
      ratio = D / route.length
      if abs(1 - ratio) < tol: break
      r *= ratio; reroute
    score = w1*(1-overlapRatio) + w2*surfaceMatch + w3*(1-roadShare) + w4*scenic - w5*abs(1-ratio)
    candidates.append(route, score)
  return topN(dedupeBySimilarity(candidates, 0.7), n)
```
`overlapRatio` = part du tracé empruntée deux fois (pénalité forte ; une boucle « sans retour sur ses pas » > 85 % est exigée en défaut). Dédupliquer par similarité de Fréchet discrète ou Jaccard sur cellules de 30 m. Résultat : jusqu'à 5 propositions, temps de calcul < 6 s, avec indicateur de progression. Si aucune ne respecte la tolérance après 3 corrections : proposer la plus proche en indiquant l'écart réel (« 11,4 km au lieu de 10 km »).

### 4.4.4 Aller-retour, dénivelé cible

- **Aller-retour** : l'utilisateur donne une distance totale ; on calcule un point d'extrémité à D/2 le long du meilleur axe (choix du chemin le plus vers l'extérieur par isochrone), retour par le même chemin ou, option « retour différent », par une variante qui ne partage pas plus de 40 %.
- **Dénivelé cible** : entrée `D+` cible (ex. 600 m) ; générer des boucles candidates (4.4.3) en ajoutant au score `-w6*abs(1 - D+_route / D+_cible)` et en biaisant les waypoints vers les sommets/cols OSM dans le rayon. Exemple : pour 15 km et 600 m D+, tolérance ±15 %.

### 4.4.5 Import, export, versionnement

- **Import** : GPX 1.0/1.1 (trk, rte, wpt), KML/KMZ (LineString, gx:Track), TCX, FIT (parcours). Limite 20 Mo et 200 000 points ; au-delà simplifier (RDP, voir 4.11). Nettoyage : suppression des doublons consécutifs, pics de vitesse irréalistes (> 80 m/s), corrections d'altitude via MNT quand l'altitude manque ou est incohérente (écart > 50 m avec le MNT). Détection du format par contenu, pas par extension. Rejeter XML malformé avec message clair ; refuser les entités externes (XXE) et les fichiers « bombes ».
- **Export** : GPX 1.1 avec waypoints nommés et extensions (`<extensions>` pour difficulté, surface), KML, FIT course (pour montres compatibles, voir Partie 8), lien de partage web. L'export est gratuit pour ses propres itinéraires ; l'envoi direct vers un appareil tiers dépend de l'intégration (voir Partie 8).
- **Versionnement** : chaque sauvegarde crée une `RouteVersion {id, routeId, createdAt, authorId, geometryHash, stats, note}` ; conservation des 30 dernières versions (gratuit : 5), restauration en un tap, comparaison visuelle de deux versions (surlignage des segments modifiés). Un itinéraire partagé en lecture seule fige la version publiée.

### 4.4.6 Estimation de temps

Toujours afficher une **fourchette** (ex. 4 h 10 – 4 h 50) et la méthode utilisée, jamais un chiffre unique faussement précis.

**Marche/randonnée.** Deux modèles combinés :
- **Naismith (révisé)** : `t = d/5 km/h + D+/600 m/h`, auquel on ajoute pour les descentes raides (> 12°) 10 min par 300 m de D− (règle d'Aitken/Langmuir).
- **Tobler** : `v = 6 × exp(−3,5 × |s + 0,05|)` en km/h, avec `s` la pente en fraction (Tobler hikers function), v_max ≈ 6 km/h à s = −0,05 ; pour le hors-sentier multiplier par 0,6.
- Estimation de base = moyenne pondérée 0,5 Naismith + 0,5 Tobler, par segment de 100 m, avec corrections : surface technique (T3+ : ×1,25), altitude > 2 500 m (+3 % de temps par 300 m supplémentaires), charge du sac (+1 % du temps par kg au-delà de 8 kg), chaleur > 28 °C (+10 %), pauses non incluses (prévoir 10 min/heure en rando de journée, à afficher séparément).
- Exemple chiffré : 12 km, 900 m D+, 900 m D−, sentier T2, sac 8 kg. Naismith : 12/5 = 2,4 h + 900/600 = 1,5 h → 3,9 h. Tobler moyen pondéré ≈ 3,6 h. Base ≈ 3,75 h ; en fourchette 3 h 30 – 4 h 15 plus pauses de 35 min → « 4 h 05 – 4 h 50 total ».

**Course.** Vitesse ajustée à la pente (grade-adjusted pace, GAP) : coût énergétique `C(g) = 155,4g⁵ − 30,4g⁴ − 43,3g³ + 46,3g² + 19,5g + 3,6` (J/kg/m, Minetti 2002, `g` fraction entre −0,45 et +0,45). Allure sur un segment : `allure(g) = allure_plat × C(g)/C(0)`, avec une plafond de ralentissement en montée raide (marche au-delà de 15 % : passer à un modèle marche). Pour le trail, ajouter un facteur de technicité (surface ×1,05 à ×1,25) et la fatigue `+0,4 % d'allure par km au-delà de 20 km`. `allure_plat` provient des données réelles de l'utilisateur (voir plus bas).

**Vélo.** Résoudre l'équilibre de puissance : `P = v × (Crr·m·g·cosθ + m·g·sinθ + ½·ρ·CdA·v²)/η`, avec m masse totale, Crr 0,004 (route) à 0,012 (gravel), 0,02 (VTT), CdA 0,32-0,40 m², ρ 1,2 kg/m³, η 0,975. Résolution numérique de `v` pour une puissance soutenue `P` (par défaut 70 % de la puissance critique 20 min si connue ; sinon vitesse plate de référence). En descente, plafonner à une vitesse de sécurité (route 55 km/h, gravel 40, VTT 30) et réduire selon la technicité.

**Personnalisation par les données réelles.** Calcule pour chaque utilisateur, sur ses 90 derniers jours, un modèle `v_user(activité, pente_bin, surface)` à partir de ses activités (bins de pente de 2 %, médiane des vitesses en excluant les arrêts, minimum 30 min de données par bin). Mélange bayésien : `v = (n·v_user + k·v_modèle)/(n+k)` avec `n` minutes de données du bin et `k=60`. Si les données sont insuffisantes, utiliser le modèle de base et le dire (« estimation générique »). Calibrer les échelles de pause : médiane réelle du ratio temps arrêté/temps total par type d'activité. Évaluation : l'erreur absolue médiane sur les activités de test doit être < 8 % (rando), < 6 % (course route), < 10 % (VTT).

### 4.4.7 Profil d'altitude interactif

Graphique distance/temps en abscisse, altitude en ordonnée ; couleur du tracé par pente (mêmes classes que 4.2.2) ; le doigt déplacé sur le profil déplace un curseur sur la carte et inversement ; surbrillance de tronçon par glissement avec statistiques (distance, D+, D−, pente moyenne, temps estimé). Marqueurs : sommets, cols, points d'eau, refuges, passages difficiles (4.4.8). Altitude lissée : filtre médian sur 5 points puis moyenne mobile 30 m ; D+ cumulé avec seuil d'hystérésis de 3 m pour éviter l'inflation de bruit (le D+ brut GPS surestime de 15 à 40 %). Afficher « D+ calculé sur MNT » vs « D+ mesuré » quand les deux existent.

### 4.4.8 Détection de passages difficiles

Un tronçon est « difficile » si l'une de ces règles s'applique, avec la raison affichée :
- pente > 30 % sur plus de 80 m (« montée très raide ») ou descente < −30 % sur 50 m ;
- `sac_scale ≥ demanding_mountain_hiking` ou `mtb:scale ≥ 3` ou `via_ferrata`, `ladder`, `cable` ;
- `highway=steps` > 50 marches ; gué (`ford=yes`) ; passage hors-sentier > 200 m ;
- exposition : pente transversale > 40° près d'une rupture (calcul MNT) ou tag `exposed`/`trail_visibility=bad` ;
- tronçon sans point d'eau > 15 km ou > 4 h ; segment à plus de 2 800 m en hiver ; traversée de pierrier/glacier (tags `natural=scree|glacier`).
Chaque passage reçoit `{start, end, type, severity 1-3, advice}`. Les flags servent la check-list (4.7.4) et le résumé.

### 4.4.9 Routage hors ligne

Un pack « Plan de routage » (graphe simplifié par profil, 15 à 40 Mo par département) est optionnel : payant (Sports/Ultra). Sans lui, l'édition hors ligne fonctionne en ligne droite avec avertissement ; la navigation d'un itinéraire déjà tracé fonctionne toujours. Recalcul hors ligne (4.6.3) est limité au profil du pack et à son périmètre.

### 4.4.10 Résumé en une phrase honnête

Génère automatiquement une phrase factuelle, sans superlatif, à partir des données et des drapeaux :
`[Difficulté] · [distance] km, [D+] m D+ · [exposition/technicité] · [eau]`.
Exemples :
- « Modérée : 12 km, 900 m de D+ ; sentier bien marqué, un passage de pierrier de 300 m ; aucun point d'eau après le km 3. »
- « Difficile : 21 km, 1 600 m de D+ ; passage exposé équipé de câbles au km 14, à éviter par mauvaise météo ; une source au km 8 (donnée de 2025). »
- « Facile : 5 km, 60 m de D+ ; chemin goudronné adapté aux poussettes ; fontaine au départ. »
Règles : citer l'incertitude (« non évalué » si données absentes), ne jamais écrire « facile » sans données de pente, de surface et de cotation. Échelle de difficulté globale (`facile`, `modérée`, `difficile`, `très difficile`) calculée par score `S = 0,35·z(D+/h) + 0,25·z(durée) + 0,25·z(technicité) + 0,15·z(exposition)` avec seuils étalonnés sur les parcours de référence (4.12). L'échelle est personnalisable : avec le niveau de forme de l'utilisateur (voir Partie 5), la phrase peut ajouter « adaptée à ton niveau » ou « plus exigeante que tes dernières sorties (+40 % de D+) ».

## 4.5 Découverte d'itinéraires

### 4.5.1 Recherche et filtres

- Recherche par zone (carte déplacée « Chercher dans cette zone »), par nom de lieu, par rayon autour de soi, par couloir autour d'un trajet.
- Filtres : activité ; distance (curseur) ; D+ ; durée estimée (personnalisée, voir 4.4.6) ; difficulté ; surface (goudron/chemin/sentier, pourcentage minimal) ; boucle ou non ; **adapté aux enfants** (distance < 6 km, pente < 10 %, pas de passage T3+, pas d'exposition, eau/toilettes) ; **poussette** (surface compactée/goudron, pente < 8 %, pas d'escalier, largeur ≥ 1 m si connue) ; **accessible en transport en commun** (départ et arrivée à moins de 600 m d'un arrêt de train/bus/téléphérique, source GTFS ou OSM) ; chiens autorisés ; ombragé ; saison praticable.
- Les filtres sont indexés côté serveur (PostGIS + index spatial + colonnes dérivées) ; réponse < 700 ms pour 50 résultats. Les filtres dérivés sont calculés à l'ingestion de chaque itinéraire, jamais à la requête.

### 4.5.2 Classement par pertinence

`score = 0,30·popularité + 0,20·qualité + 0,15·fraîcheur + 0,20·adéquation_niveau + 0,10·proximité + 0,05·diversité`

- popularité : log(nombre d'enregistrements distincts sur 12 mois) normalisé par zone, avec seuil d'au moins 5 utilisateurs distincts ;
- qualité : note bayésienne `(C·m + Σnotes)/(C + n)` avec `m=4,0`, `C=8` pour éviter qu'un parcours à une seule note de 5 passe devant ;
- fraîcheur : décroissance exponentielle demi-vie 18 mois, remontée si une confirmation de condition récente existe ;
- adéquation au niveau : 1 si la durée et le D+ sont dans ±25 % de l'activité habituelle de l'utilisateur (médiane de ses 10 dernières sorties de même type), décroissant ensuite ; 0,5 si utilisateur sans historique ;
- diversité : éviter 10 résultats quasi identiques (MMR : maximal marginal relevance).
Les itinéraires **officiels** (balisés par fédérations, parcs, offices du tourisme, parcours de course) portent un badge « Officiel » et la source ; **communautaires** un badge « Communauté ». Par défaut, mélange avec léger bonus (+0,05) aux officiels et priorité aux itinéraires récemment confirmés. Toute publicité/sponsoring est étiqueté et ne modifie pas le classement.

### 4.5.3 Favoris, listes, collections

- Favori en un tap (cœur), listes personnalisées (« Rando août », « Sorties 90 min »), listes partageables par lien, listes collaboratives (avec amis, voir Partie 7).
- **Collections éditoriales** : sélections rédigées par l'équipe (« Les plus belles boucles autour de Grenoble », « Premières randos avec enfants »), gérées par un back-office ; chaque collection a une date de revue et un propriétaire ; les itinéraires qui deviennent obsolètes (fermés, signalés) sont retirés automatiquement.
- Gratuit : 3 listes, 50 favoris ; payant : illimité.

### 4.5.4 Suggestions personnalisées

Exemple type : « Une sortie de 90 min près de chez toi adaptée à ta séance. » Pipeline :
1. Lire la séance du jour issue du plan (voir Partie 5) : type, durée, intensité, cible de pente (ex. endurance fondamentale, 90 min, terrain plutôt plat).
2. Déterminer la distance cible via l'allure personnalisée : `D = durée × v_user(zone d'intensité, activité)`.
3. Chercher des itinéraires existants dans un rayon de 20 min de trajet pour lesquels |durée_estimée − 90| ≤ 8 min et dont le profil respecte la contrainte (pente moyenne ≤ 3 % pour l'endurance fondamentale) ; sinon générer une boucle (4.4.3).
4. Filtrer par météo des 3 prochaines heures, heures de jour restantes (4.9.8), conditions signalées.
5. Présenter 3 options maximum avec la raison (« pente régulière, 2 fontaines, sans trafic »).
Ne jamais suggérer un itinéraire fermé ou signalé dangereux. Respecter les préférences (activités, surfaces, évitements) et ne pas répéter plus de deux fois le même suggestions sur 14 jours.

### 4.5.5 Partage par lien

Lien `https://[DOMAINE]/r/{slug}` ouvrant une page web publique (MapLibre GL JS, résumé, profil, bouton « Ouvrir dans l'app ») avec Open Graph et image de prévisualisation générée côté serveur. Niveaux : `privé`, `lien secret` (jeton de 128 bits, révocable), `public`. Le lien n'expose jamais le domicile : les zones de masquage de l'auteur (4.10) s'appliquent au début/fin avant publication. Lien profond universel (iOS Universal Links/Android App Links). Page lisible sans compte ; le téléchargement GPX sans compte est autorisé pour les itinéraires publics.

## 4.4bis Qualité du contenu

### Avis, notes et photos
- Note de 1 à 5 sur : tracé, balisage, intérêt, difficulté ressentie. Avis texte facultatif (max 1 500 caractères) ; l'utilisateur doit avoir **enregistré** l'itinéraire (≥ 60 % du tracé parcouru) pour publier une note « vérifiée » (badge). Photos géolocalisées sur le tracé (EXIF GPS utilisé pour placer, puis supprimé des fichiers publiés), limitées à 10 par avis, compressées (1 600 px côté long, ~400 Ko).
- Possibilité de répondre en tant que gestionnaire officiel (comptes vérifiés d'offices/parcs).

### Conditions et obstacles
Signalements rapides en 2 taps depuis la carte ou la navigation : arbre tombé, sentier fermé, boue/inondation, neige/glace, éboulement, balisage manquant, travaux, source à sec, danger (animal, chasse). Chaque signalement : `{type, position, photo?, createdAt, expiresAt, confirmations, dismissals}` ; durée de vie par défaut 14 jours (neige 7, fermeture 30) ; prolongé par confirmation (« toujours là ? » poussé aux utilisateurs passant à proximité), supprimé après 2 infirmations ou expiration. Un signalement « fermeture » émis par une autorité officielle a priorité et fait passer l'itinéraire à l'état `fermé` dans la découverte.

### Modération
- Filtrage automatique à l'envoi (insultes, coordonnées personnelles, spam, liens) ; file de modération humaine pour tout signalement utilisateur ; sanction progressive (avertissement, suspension des contributions, blocage).
- Avis d'un utilisateur ayant plus de 5 contributions en 24 h : revue automatique.
- Les photos subissent détection de contenu inapproprié ; suppression EXIF et floutage de visages si option activée.

### Déduplication d'itinéraires
À l'ingestion : calculer une empreinte (cellules géohash 7 des points rééchantillonnés tous les 50 m) ; similarité = Jaccard ; ≥ 0,85 → doublon proposé en fusion (le plus ancien/plus complet devient l'« itinéraire canonique » ; les autres deviennent des variantes avec leurs notes agrégées). Les boucles sont comparées dans les deux sens.

### Détection de tracés frauduleux ou dangereux
Rejet automatique ou mise en quarantaine pour : vitesse moyenne irréaliste pour l'activité (marche > 9 km/h, course > 25 km/h, vélo > 70 km/h sur plus de 1 km sans descente), téléportation (saut > 500 m en < 5 s), altitude incohérente avec le MNT (> 200 m d'écart), traversée de propriété privée, voies interdites (autoroute, voie ferrée, zone militaire, cœur de réserve interdit), tracé passant par un précipice (pente > 60° sur plus de 30 m sans équipement) ou sur plan d'eau/glacier sans tag adapté. Tout itinéraire public est analysé avant publication ; un itinéraire en quarantaine est invisible dans la découverte jusqu'à revue. Un itinéraire créé par un utilisateur pour autrui qui franchit un seuil de danger reçoit l'avertissement obligatoire « tronçon à risque » avec sa nature.

## 4.6 Navigation

### 4.6.1 Suivi du tracé et déviation

- Projection de la position GNSS sur le tracé par map-matching local (distance au segment le plus proche, avec fenêtre de recherche glissante de ±500 m autour du dernier point connu pour éviter les sauts sur des boucles qui se croisent). Affichage : progression (km restants, D+ restant), prochain virage ou point d'intérêt.
- **Seuils de sortie d'itinéraire** (distance latérale au tracé, maintenue 10 s avec précision GPS ≤ 30 m) :

| Activité | Alerte « attention » | Alerte « hors itinéraire » |
|---|---|---|
| Marche / rando | 25 m | 50 m (100 m en terrain ouvert d'altitude) |
| Course route | 20 m | 40 m |
| Trail | 25 m | 50 m |
| Vélo route / gravel | 30 m | 60 m |
| VTT | 25 m | 50 m |

- Alerte en trois niveaux : vibration + bandeau, voix (si activée), puis proposition d'action (« Revenir au tracé : 80 m au sud-est », « Recalculer », « Ignorer 10 min »). Hystérésis : l'alerte se désarme quand l'écart repasse sous 60 % du seuil. Ne pas déclencher à l'arrêt (vitesse < 0,5 m/s pendant une pause) ni quand la précision > 50 m (afficher « signal GPS faible » à la place).
- **Retour au départ** : bouton permanent « Revenir au départ » avec deux modes : par le tracé parcouru (inversé, favorise la sécurité en montagne) ou par le chemin le plus court (routage). Affiche distance, temps, et alerte si le retour dépasse la lumière ou la batterie restante (4.9.8).
- **Recalcul** : en ligne, automatique après 30 s hors tracé si l'option « recalcul automatique » est active, vers le prochain point du tracé en aval (pas le plus proche, pour ne pas sauter une section). Hors ligne : recalcul avec le plan de routage (4.4.9) sinon guidage en ligne droite avec distance et cap.

### 4.6.2 Instructions selon l'activité

| Activité | Mode par défaut |
|---|---|
| Course route / trail | voix courte + flèches ; annonces à 150 m et 30 m, vibration de la montre (voir Partie 8) |
| Vélo route / gravel / VTT | flèches grande taille + signal sonore bref et vibration ; **pas de texte long, pas de manipulation d'écran en roulant** ; voix possible via écouteurs ouverts |
| Marche urbaine | voix + flèches |
| Randonnée | suivi du tracé et alerte de déviation prioritaires, voix minimale (point de décision seulement) |

Instruction générée depuis la géométrie : angle de virage classé (droite, légèrement à droite, demi-tour...), nom de voie, distance ; langue conforme aux réglages. Paramètres : volume, fréquence des annonces, ducking de la musique, sans voix du tout.

### 4.6.3 Vues et informations

- **Vue boussole** : flèche vers le prochain point, cap magnétique avec déclinaison corrigée (modèle WMM), calibration guidée si précision < 2 ; utile hors sentier ; fonctionne sans carte.
- **Prochains POI** le long du tracé : eau, refuge, col, abri avec distance et temps ; bandeau configurable (3 éléments max).
- **Temps restant** : recalculé toutes les 30 s à partir de l'allure réelle des 20 dernières minutes mélangée avec le modèle (poids 0,6 réel / 0,4 modèle) ; afficher heure d'arrivée estimée et comparaison à l'heure de coucher du soleil.
- **Orientation de la carte** : nord en haut, cap en haut, ou verrouillée ; recentrage automatique après 8 s d'inactivité.

### 4.6.4 Mode économie de batterie (écran noir avec alertes)

L'écran s'éteint (ou affichage minimal OLED très sombre) ; le GNSS continue à intervalle adaptatif (1 s en mouvement rapide, 5 s en rando lente, 10-15 s à l'arrêt) ; les alertes de déviation, de point d'eau, de lumière et de sécurité (4.9) restent actives et allument l'écran ou vibrent. Gestes pour réveiller (bouton volume, bouton latéral). Objectif de consommation : ≤ 6 % de batterie par heure en navigation écran éteint sur un téléphone récent, ≤ 12 % par heure écran allumé avec carte vectorielle (voir 4.11). Bannière de seuil à 20 % et 10 % avec proposition automatique d'activer ce mode.

### 4.6.5 Navigation hors ligne complète

Tout ce qui précède fonctionne sans réseau avec le pack téléchargé et l'itinéraire local ; seule la météo et les messages de partage dépendent du réseau. Si l'itinéraire n'est pas encore en local, la navigation refuse le démarrage hors ligne avec un message clair. Au démarrage, vérifier que le pack couvre ≥ 95 % du corridor ; sinon avertir et proposer le téléchargement.

### 4.6.6 Sécurité de la navigation

- Vélo : verrouillage de l'édition d'itinéraire, du clavier et des écrans de choix dès que la vitesse > 8 km/h ; les alertes sont brèves et non interactives.
- Course : afficher au plus 4 champs.
- Le message « Garde les yeux sur la route/le sentier » apparaît à la première utilisation de la navigation vélo et à chaque changement majeur de mode. Aucune fonction ludique (classements, notifications sociales) ne s'affiche pendant la navigation.
- Critère d'acceptation : une alerte de déviation à 60 m en vélo s'affiche en < 5 s, avec vibration et signal sonore, sans action requise de l'utilisateur.

## 4.7 Randonnée avancée

### 4.7.1 Itinérance multi-jours

Modèle de données : `MultiDayPlan {id, name, startDate, stages[], accommodations[], resupplyPoints[], escapes[], gearListId}`. Une `Stage` : `{day, start, end, distance, dPlus, dMinus, estTimeRange, difficulty, hazards[], water[], accommodationId?, weather}`.

- **Découpage en étapes** : à partir d'un tracé long (ex. GR20, 180 km) ; trois modes : par nombre de jours, par distance/dénivelé cibles par jour, par hébergements disponibles (programmation dynamique : minimiser `Σ (effort_jour − effort_cible)²` sous contrainte d'arrivée sur un hébergement). `effort = distance_equivalente = d + D+/100 + D−/300` (km-effort).
- **Estimation étape par étape** : temps par 4.4.6, charge du sac incluse (poids à jour par jour, car la nourriture s'allège : `poids_jour_n = base + nourriture_restante`), heure d'arrivée, marge avant le coucher du soleil (alerte si arrivée prévue < 90 min avant le coucher).
- **Hébergements** : refuges, gîtes, campings, bivouacs (réglementation affichée), hôtels ; données issues d'OSM et de partenaires ; pour chaque : altitude, capacité, ouverture saisonnière (date de mise à jour visible), ravitaillement possible (repas, vivres), eau, réseau mobile. Réservation : **lien externe** vers le système de réservation du refuge ou du gestionnaire (aucune réservation dans l'app au lancement) ; ajouter dans le plan un champ « statut » (`à réserver`, `réservé`, `confirmé`) et un rappel 30 jours avant. Disclaimer : disponibilité non garantie.
- **Ravitaillement** : points d'achat de vivres sur le trajet (épiceries, refuges), ainsi que stratégie de colis ; calcul des jours d'autonomie nécessaires entre deux ravitaillements.
- **Plan B (échappatoires)** : pour chaque étape, détecter les points de sortie (route carrossable, village, arrêt de transport, refuge) tous les ≤ 5 km ou 1 h, avec distance, temps de repli et coordonnées ; mise en avant dans la fiche étape et téléchargeables hors ligne. Variante « mauvaise météo » (itinéraire bas) proposée si disponible.
- **Météo par étape et par altitude** : prévision pour le point de départ, le point culminant et l'arrivée de chaque étape, avec corrections d'altitude (gradient −0,65 °C/100 m, vent croissant avec l'altitude, isotherme 0 °C) ; ressenti ; probabilité d'orage entre 12 h et 18 h ; rafraîchie à J-7, J-3, J-1 et chaque matin.

### 4.7.2 Plan de nutrition et d'hydratation (via Fit)

Appel au service nutrition de l'app Fit (voir Partie 5 et Partie 7 pour l'intégration) avec : durée estimée, dépense énergétique, température, altitude, poids, sudation connue, préférences alimentaires et allergies. Cibles par défaut en effort d'endurance (à moduler par le coach) :
- énergie : `kcal/h ≈ 5 × poids_kg × (allure_facteur)` ; en rando 300-500 kcal/h (poids 70 kg, sac de 10 kg) ; objectif d'apport 60-70 % de la dépense en marche longue ;
- glucides : 30-60 g/h au-delà de 90 min (60-90 g/h en effort intense de plus de 2,5 h, avec entraînement digestif) ;
- sodium : 300-600 mg/h (jusqu'à 800 en forte chaleur chez gros sudateurs) ; eau : 400-800 ml/h, +250 ml/h par tranche de 8 °C au-dessus de 25 °C ; **ne jamais recommander plus de 1 L/h** (risque d'hyponatrémie) ;
- diététique du jour (petit-déjeuner, en-cas, repas du soir) avec recettes de l'app Fit et listes de courses ; poids des aliments intégré au poids du sac.
Exemple : rando 8 h, 70 kg, 24 °C : ~3 200 kcal dépensées ; apport ~2 000 kcal (≈ 250 kcal/h) ; glucides 45 g/h ; eau 550 ml/h → 4,4 L sur la journée, répartis avec recharges aux points d'eau identifiés ; sodium 450 mg/h. L'app calcule les « kilomètres sans eau » pour dimensionner la réserve. Ce sont des repères généraux, pas un avis médical.

### 4.7.3 Entraînement préparatoire

Depuis un `MultiDayPlan` ou une rando de journée exigeante, le coach (voir Partie 5) génère un plan de préparation jusqu'à la date : volume et D+ hebdomadaires progressifs (+10 % max par semaine, semaine de décharge tous les 4), sorties longues avec sac chargé, travail de descente, renforcement des jambes (liaison avec les séances de l'app Fit), acclimatation en altitude si l'objectif dépasse 3 000 m. Cette partie ne spécifie pas l'algorithme du coach ; elle fournit l'entrée : `{distance, dPlus, dMinus, altitudeMax, durée, charge, niveau_requis}`.

### 4.7.4 Check-list de matériel générée

Génération par règles (jamais par IA seule) : `Gear = base(durée) + saison + altitude + météo + niveau + sécurité`, chaque item avec `quantité`, `poids_g`, `catégorie`, `critique(bool)`, `raison`. L'utilisateur coche, retire, ajoute ; ses objets réels (poids pesés) sont mémorisés dans « Mon matériel ». Poids de sac : somme avec affichage « poids de base », « consommables » et « total départ », avec alerte si le sac dépasse 20 % du poids du corps (rando journée > 10 %).

Règles principales :
- Durée > 1 jour : tente/hébergement, sac de couchage (température de confort = min prévue − 5 °C), réchaud + combustible (100 g par personne par jour environ), vivres ;
- Altitude > 2 500 m : lunettes catégorie 3-4, crème solaire indice 50+, couche chaude supplémentaire, protection contre le mal aigu (info) ;
- Altitude > 3 000 m ou neige annoncée : piolet, crampons, casque (selon cotation ; avertissement sur formation nécessaire) ;
- Pluie probabilité > 40 % : veste imperméable, sur-pantalon, housse de sac ; chaleur > 28 °C : eau +1 L, casquette, sels ; température min < 5 °C : bonnet, gants, doudoune ;
- Toujours : trousse de secours, couverture de survie, sifflet, lampe frontale + piles, carte/GPS hors ligne, batterie externe, carte d'identité.
- Niveau débutant : ajout de conseils (chaussettes de rechange, pansements pour ampoules) ; expert : retrait des items évidents.

**Exemple 1 : rando journée d'été en moyenne montagne (8 h, 1 000 m D+, 22 °C, 1 800-2 400 m)**
Sac 25 L ; chaussures de randonnée basses/mi-hautes ; chaussettes ; t-shirt respirant ; pantalon/short ; polaire légère ; veste imperméable (300 g) ; casquette ; lunettes de soleil ; crème solaire ; 2 L d'eau + 1 pastille de purification ; 3 en-cas (barres, fruits secs, sandwich) ; trousse de secours (pansements, élastique, antalgique, bande) ; couverture de survie ; sifflet ; frontale ; téléphone avec carte hors ligne + batterie externe ; bâtons optionnels. Poids estimé : 6,5 kg.

**Exemple 2 : trek 3 jours en refuges en été (GR/Alpes, 2 700 m max)**
Sac 38-45 L ; tout l'exemple 1 plus : sac à viande et boules Quies, vêtements de rechange (1 t-shirt, 1 sous-vêtement, 2 paires de chaussettes), doudoune légère, bonnet/gants fins, serviette microfibre, trousse de toilette minimale, argent liquide pour le refuge, réservation imprimée/hors ligne, protection solaire renforcée, 2 L + filtre. Pas de tente ni réchaud. Poids estimé : 9-11 kg. Alerte : arrivée en refuge avant l'orage, vérifier le jour de fermeture du refuge.

**Exemple 3 : itinérance 5 jours en autonomie, bivouac, hiver doux/automne (1 500 m, -2 °C la nuit)**
Tente 4 saisons ou 3 saisons renforcée (1,6 kg), sac de couchage confort -5 °C, matelas isolant R≥3, réchaud + gaz (400 g) + popote, 5 jours de nourriture (≈ 600 g/jour, 3 000 kcal), filtre à eau, couche chaude + doudoune, gants + sur-gants, bonnet, guêtres, bâtons, balise de détresse ou communicateur satellite (recommandé), cartes papier + boussole, batterie externe 20 000 mAh, trousse de secours étendue, sacs étanches, lampe frontale + piles de rechange. Poids départ : 15-18 kg (alerte à > 20 % du poids du corps).

Les listes peuvent être imprimées, exportées (PDF), partagées et sauvegardées comme modèles.

### 4.7.5 Journal de rando, sommets et collections

- **Journal** : à la fin ou pendant la sortie, ajout de notes, photos géolocalisées (position issue de l'EXIF, sinon de l'horodatage rapproché du tracé), humeur, conditions, rencontre de faune ; export en carnet PDF avec carte et profil ; confidentialité par entrée (voir 4.10).
- **Sommets** : base de sommets OSM (`natural=peak`) avec altitude, prominence, massif ; détection automatique d'un sommet atteint (rayon 40 m horizontal, 15 m vertical sur le MNT, maintenu 20 s) ; confirmation manuelle possible ; entrée au **carnet de sommets** (date, météo, photo).
- **Collections de sommets** : « les 4 000 des Alpes » (82 selon la liste UIAA/2 : définir la liste dans les données et la versionner, car les listes varient), « Plus hauts sommets des départements », « GR20 » (étapes), « Ballons des Vosges » ; avancement en pourcentage, carte des sommets, trophées (liaison avec l'app Fit et gamification, voir Partie 7). Les collections sont éditoriales (comités de revue) ; l'utilisateur peut créer des collections privées.

## 4.8 Vélo et course spécifiques

### 4.8.1 Segments et sections chronométrées

Fonction **optionnelle** (activée par un flag ; décision produit à valider au regard des risques de comportements dangereux). Si retenue :
- Segment : tronçon défini par début/fin, longueur 300 m à 50 km, `activité`, `géométrie`, `date`, `créateur`, classement par temps pour la période (tout, année, mois), catégories (âge, genre auto-déclaré, poids optionnel).
- Appariement : un passage compte si la trace passe à ≤ 25 m du début, reste à ≤ 25 m du segment (tolérance 15 % en cas de GPS bruité), et atteint la fin ; temps interpolé entre points. Rejet des passages avec vitesse impossible ou en véhicule motorisé (profil accélération).
- **Retrait** : option par utilisateur « ne pas participer aux segments » (global), par segment (« masquer mes temps »), et possibilité de demande de retrait d'un segment sur propriété d'une collectivité ou d'un site à risque (route fréquentée, descente dangereuse) via formulaire ; un segment signalé dangereux est retiré du classement après revue. Aucun segment sur voie publique ouverte à la circulation dans les descentes à forte pente par défaut. Pas de notifications compétitives pendant la navigation (4.6.6).

### 4.8.2 Côtes, montées catégorisées

Détection de montées par balayage du profil lissé : une montée commence quand la pente moyenne glissante sur 200 m dépasse 3 % et se termine quand l'altitude descend de plus de 10 m depuis le sommet local. Catégorie via `score = longueur_m × pente_pourcent` (pente moyenne) :

| Catégorie | Score | Exemple |
|---|---|---|
| 4 | 8 000 – 16 000 | 2 km à 5 % → 10 000 |
| 3 | 16 000 – 32 000 | 4 km à 6 % → 24 000 |
| 2 | 32 000 – 64 000 | 6 km à 7 % → 42 000 |
| 1 | 64 000 – 80 000 | 8 km à 9 % → 72 000 |
| HC | > 80 000 | 13,8 km à 7,8 % ≈ 107 600 |

Contraintes : longueur minimale 500 m, pente moyenne minimale 3 %. Chaque côte affiche longueur, D+, pente moyenne et maximale (sur 100 m), kilomètre de début, et alimente les alertes « montée dans 500 m » et l'estimation de temps. Pour la course : « côtes » d'entraînement (30 s à 3 min, 6-10 %) listées pour les séances de côtes du plan (voir Partie 5).

### 4.8.3 Parcours de course et distances

- **Officiels** : parcours de courses (10 km, semi, marathon, trails) fournis par organisateurs avec tracé validé, ravitos, barrières horaires, profil ; badge « Officiel » et date de l'édition ; mise à jour annuelle ; aucune promesse de conformité si l'organisateur change le tracé (afficher « tracé de l'édition 2026 »).
- **Distances types** : 5 km, 10 km, 10 miles, semi-marathon (21 097,5 m), marathon (42 195 m), ultra (50 km, 100 km, 100 miles) ; tolérance de mesure : une boucle générée « 10 km » doit mesurer 10 000 m ±1 %, avec une marge optionnelle de +0,1 % pour éviter les mesures courtes (règle de mesure de course certifiée).
- **Parcours d'entraînement standards** : boucle de 5 km et de 10 km générées autour de l'utilisateur (4.4.3), faible trafic, sans traversées majeures, enregistrées comme « mon 5 km habituel » avec historique de temps (progression à comparer) ; piste d'athlétisme (400 m) sur la couche POI.
- **Parkours** : parcours de parc d'entraînement (parkrun, parcours santé, stations de fitness en plein air) avec équipement ; lien avec la communauté locale.

### 4.8.4 VTT, gravel, électrique

- **VTT** : difficulté `mtb:scale` 0-6 et `mtb:scale:uphill`, couleurs de balisage des stations (vert, bleu, rouge, noir) harmonisées ; catégories **cross-country**, **trail/all-mountain**, **enduro** (liaisons montantes + spéciales descendantes chronométrables, avec marquage des tronçons de descente et temps montée/descente séparés), **descente** (remontées mécaniques en POI, parcs de bike park, sauts signalés). Casque et protections recommandés avant navigation de niveau rouge/noir. Les segments chronométrés VTT descente sont désactivés par défaut.
- **Gravel** : pourcentage de surface non goudronnée = `longueur(surface ∈ {gravel, dirt, grass, sand, compacted}) / longueur totale`, affiché avec répartition en barre ; recommandation de pneus (section de pneu ≥ 38 mm si > 40 % non goudronné) ; alerte « surface inconnue » si > 15 % du tracé non renseigné.
- **Vélo électrique** : autonomie estimée `A = capacité_wh × (1 − marge) / (conso_wh_km)` avec `conso = (P_moyenne_requise − assistance)/vitesse` ; modèle simple : conso de base 8-12 Wh/km sur plat, +4 Wh/km par 1 % de pente moyenne, +30 % en mode Turbo ; marge de sécurité 20 % ; froid < 5 °C : −20 % de capacité. L'utilisateur saisit batterie (400-750 Wh) et mode d'assistance ; alerte « autonomie insuffisante » si le trajet dépasse 80 % de l'autonomie estimée, avec bornes de recharge sur la carte. Exemple : 500 Wh, tracé 60 km, 900 m D+ (pente moyenne ≈ 1,5 %) : conso ≈ 10 + 6 = 16 Wh/km → 960 Wh requis → 500 × 0,8 / 16 ≈ 25 km seulement en assistance continue, donc plan : mode Eco ou recharge (ex. Eco 7 Wh/km → 57 km, trop juste).

## 4.9 Sécurité (module critique)

Ce module est prioritaire sur toute autre fonction : en cas de conflit (batterie, performance, monétisation), la sécurité l'emporte. Les fonctions de sécurité de base (partage de position, numéros d'urgence, fiche médicale, alerte de lumière) sont **gratuites** pour tous ; la détection de chute/immobilité automatique et les contacts illimités peuvent être réservés aux abonnements payants **sans jamais retirer** le bouton d'urgence manuel ni les numéros (décision à valider, voir Partie 2).

### 4.9.1 Partage de position en direct

- Création d'une « Sortie suivie » : l'utilisateur choisit des **contacts de confiance** (max 5 en gratuit, 10 en payant), la durée (1 h à 72 h ; défaut = durée estimée + 2 h), le niveau de précision (exacte, ~500 m), la fréquence d'envoi (30 s en mouvement, 5 min à l'arrêt, adaptée à la batterie).
- **Consentement explicite** : un écran explique ce qui est partagé (position, batterie, vitesse, itinéraire prévu), avec qui, combien de temps ; consentement du contact également (lien d'invitation : le contact accepte avant de recevoir, il peut quitter à tout moment).
- Le contact reçoit un **lien web** (sans installation) `https://[DOMAINE]/live/{jeton}` : jeton aléatoire de 128 bits à durée limitée, révocable en un tap, expirant automatiquement à la fin de la sortie ou à l'heure limite. Affiche carte, dernier point connu avec horodatage (rouge si > 15 min), batterie, itinéraire prévu, heure de retour prévue, fiche médicale si l'utilisateur l'a autorisée.
- **Chiffrement** : TLS 1.3 en transit ; positions chiffrées au repos (clé par sortie) ; jeton non devinable ; aucune indexation moteur de recherche (`noindex`) ; suppression complète des points 7 jours après la fin sauf si l'utilisateur les garde dans son historique. Aucun partage de position à des tiers publicitaires.
- Le partage continue en mode économie (4.6.4) ; en cas de perte de réseau, les positions sont mises en file et envoyées dans l'ordre à la reconnexion, avec la dernière position connue et son âge.

### 4.9.2 Heure de retour prévue (check-in)

Au départ, proposer « Heure de retour prévue » = durée estimée haute (4.4.6) + marge (30 min, ou 20 % de la durée si > 5 h). Machine à états `Planned → Active → (Overdue1 → Overdue2 → Alerting) → Closed`.

| Étape | Délai après l'heure prévue | Action |
|---|---|---|
| Rappel doux | −15 min | notification « Tu rentres bientôt ? Prolonge si besoin » |
| Retard 1 | +0 min | notification, vibration, boutons « Je vais bien (+1 h) », « Terminer », « J'ai besoin d'aide » |
| Retard 2 | +20 min | seconde notification, appel automatique sonore, rappel écran verrouillé |
| Alerte | +45 min sans réponse | SMS/notification aux contacts de confiance avec dernière position et fiche utilitaire |
| Escalade | +90 min (réglable) | seconde alerte, suggestion explicite aux contacts d'appeler le secours (« Appelle le 112/15/17/18 ou le PGHM/secours en montagne ») |

L'**app ne contacte pas les secours automatiquement** sauf après confirmation explicite de l'utilisateur ou de la détection de chute (4.9.3) et uniquement selon les capacités de la plateforme/pays ; sinon elle guide un appel manuel. L'alerte à retardement s'exécute **côté serveur** (planificateur) pour fonctionner même si le téléphone est éteint ou sans batterie : c'est la fonction de sécurité la plus fiable sans réseau. Le serveur doit déclencher l'alerte avec précision à ±2 min.

### 4.9.3 Détection de chute et d'immobilité

Capteurs : accéléromètre et gyroscope (100 Hz en fenêtre), baromètre (chute d'altitude), GNSS, état de l'enregistrement. Actif uniquement pendant une activité avec la fonction activée (consentement explicite, avertissement sur la consommation).

**Chute (course, rando, vélo)** :
1. **Impact** : pic d'accélération > 3 g (course/rando) ou > 4 g (vélo, pour limiter les nids-de-poule) suivi d'une phase de **faible mouvement** : variance d'accélération < 0,05 g² pendant ≥ 5 s ;
2. Contexte vélo : décélération brutale de plus de 15 km/h/s en moins de 1 s, puis vitesse < 2 km/h ;
3. Chute libre préalable (|a| < 0,4 g pendant 150-400 ms) renforce le score.
Score combiné `s = 0,4·impact + 0,3·immobilité + 0,2·chute_libre + 0,1·rupture_vitesse` ; déclenchement si `s ≥ 0,7`.

**Immobilité** : vitesse < 0,3 m/s et activité accéléro nulle depuis `T` sans pause volontaire (pas de bouton Pause) : T = 3 min en vélo, 5 min en course, 10 min en rando (haute altitude/froid : 6 min) ; les pauses légitimes réduisent la sensibilité si l'utilisateur confirme « pause photo/repas » (valable 30 min).

**Réduction des faux positifs** : ignorer si la montre/téléphone a été posé et que l'utilisateur interagit avec l'écran dans les 10 s ; ignorer les mouvements de véhicule (vitesse GNSS > 25 km/h en marche/course sans activité cyclique) ; ignorer pendant le transport en téléphérique/train (profil de vitesse régulier) ; ajuster les seuils avec la position du téléphone (poche, sac, bras, guidon) ; adapter après 3 faux positifs consécutifs (baisse de sensibilité proposée). Objectif de test : < 1 faux positif pour 50 heures d'activité, détection d'une chute simulée ≥ 90 %.

**Confirmation à l'écran** : plein écran rouge, vibration forte et sonnerie, bouton « Je vais bien » (tap ou geste), bouton « J'ai besoin d'aide ». **Compte à rebours 30 s** (60 s en rando si option) ; sans réponse, envoi de l'alerte aux contacts de confiance (position précise, heure, type de détection, fiche médicale autorisée, itinéraire) et, selon la plateforme, appel aux urgences après confirmation par un second compte à rebours de 10 s (optionnel, activé par l'utilisateur). Le compte à rebours continue en arrière-plan si l'écran est verrouillé ; l'annulation est toujours possible tant qu'aucun appel n'a abouti.

### 4.9.4 Bouton d'urgence

Bouton « SOS » visible dans l'écran d'enregistrement et de navigation, déclenché par pression maintenue 2 s (évite les appuis accidentels) puis choix : « Appeler les secours » (composeur avec le numéro local), « Alerter mes contacts » (envoi de la position), « Les deux ». L'écran affiche en grand : **coordonnées** (latitude/longitude en degrés décimaux, MGRS/UTM et, si dispo, nom du lieu ou de la route, altitude, numéro du chemin ou du balisage) à communiquer, prêt à lire à voix haute et à copier ; plus la fiche médicale.

### 4.9.5 Numéros d'urgence par pays

| Zone | Numéros |
|---|---|
| Union européenne | 112 (tous pays) |
| France | 112, 15 (SAMU), 17 (police), 18 (pompiers), 114 (SMS pour sourds et malentendants), secours en montagne via 112 (PGHM/CRS) |
| Suisse | 144 (santé), 117 (police), 118 (pompiers), 1414 (Rega, secours aérien), 112 |
| Italie | 112, 118 (santé), secours en montagne 118/112 |
| Espagne | 112 |
| Royaume-Uni | 999 ou 112 ; Mountain Rescue via 999 |
| États-Unis/Canada | 911 |
| Australie | 000 |
| Reste du monde | 112 reconnu par la plupart des réseaux GSM ; sinon table par pays [STACK_EMERGENCY_NUMBERS_DB] |

Détermination du pays par la position GNSS (frontières, pas par la langue de l'appareil) avec repli sur le MCC du réseau ; si on est à moins de 5 km d'une frontière, afficher les deux pays. La table est embarquée dans l'app (hors ligne), revue chaque trimestre, versionnée et testée.

### 4.9.6 Mode hors réseau

- **SOS satellite natif** quand disponible (iPhone récents « Urgence SOS par satellite », certains Android) : le bouton affiche un guide pas-à-pas ouvrant la fonction native du système (l'app ne peut pas remplacer ce mécanisme) ; vérifier l'état de la couverture mobile pour afficher « Aucun réseau : utilise le SOS satellite » avec instructions (se mettre à ciel dégagé).
- **Préparation de message** : l'app rédige un SMS précompté contenant coordonnées, altitude, heure, nature du problème (choix rapides : blessure, perdu, épuisement, météo) et nombre de personnes ; envoi automatique dès qu'un signal revient (surveillance de couverture périodique, essai toutes les 60 s) ; possibilité d'envoyer par SMS qui passe parfois avec très peu de signal.
- Compatibilité balises/communicateurs satellite (Garmin inReach, ZOLEO, Spot) via leur lien de suivi : champ « lien de suivi externe » partagé avec les contacts ; intégration avancée voir Partie 8.
- Si la dernière position connue date de plus de 10 min, l'app l'affiche avec son âge et le rayon d'incertitude estimé (vitesse moyenne × temps).

### 4.9.7 Avertissements météo et lumière

- Alertes météo avant et pendant la sortie : orages (probabilité > 40 % ou alerte officielle), froid (ressenti < 0 °C ou < 5 °C en altitude sous pluie), canicule (> 32 °C ou alerte), vent (rafales > 60 km/h en crête, > 40 km/h à vélo), neige/verglas, brouillard en altitude. Seuils paramétrés par activité, avec recommandations (« Rentre avant 15 h », « Reporte »). Les alertes officielles (Météo-France vigilance, MeteoSwiss, etc.) sont affichées avec leur source et leur validité.
- Pendant une sortie avec connexion : rafraîchissement toutes les 30 min ; foudre à proximité (via données d'impacts si disponibles) : notification « Orage à moins de 10 km, redescends des crêtes ».
- **Coucher du soleil** : calculé localement par l'algorithme NOAA/Meeus à partir de la position et de la date ; afficher heures de lever/coucher, fin de crépuscule civil (+~30 min).

### 4.9.8 Alertes de risque : lumière restante

Avant et pendant une sortie : `marge = coucher_soleil − (maintenant + temps_restant_estimé)`. Alerte orange si `marge < 60 min` (« Tu risques d'arriver à la nuit tombée »), rouge si `marge < 15 min` ou `< 0` sans frontale cochée. Exemple : il est 17 h 10, coucher à 19 h 02, il reste 14 km et 700 m D+ (estimation 3 h 20) → arrivée 20 h 30, marge −88 min → alerte rouge avec propositions : raccourcir (échappatoire la plus proche à 2,1 km), faire demi-tour, sortir la frontale, prévenir un contact (« modifier l'heure de retour »). Autres règles : temps de repli insuffisant avec batterie < 15 % ; météo dégradée prévue avant l'arrivée ; sortie très supérieure aux dernières distances (> 2× le plus long récent, voir Partie 5).

### 4.9.9 Fiche médicale d'urgence

Données facultatives : nom, groupe sanguin, allergies, médicaments, pathologies, contact d'urgence, date de naissance, langues parlées, don d'organes. Stockée **chiffrée** sur l'appareil et accessible depuis l'écran verrouillé via bouton « Informations médicales » (comme sur les systèmes iOS/Android) ; partage au contact uniquement avec choix explicite par sortie. Rappel à l'utilisateur de remplir la fiche système native également. Jamais envoyée à des tiers, jamais utilisée pour de la publicité ni du coaching sans consentement séparé (voir Partie 5 et Partie 8 sur la conformité santé).

### 4.9.10 Limites légales, journalisation, vie privée

- Mentions obligatoires, affichées à l'activation et dans l'aide : l'app **n'est pas un service d'urgence** ; elle ne garantit ni la détection, ni la transmission, ni le délai de réaction ; elle dépend de la batterie, du GNSS, du réseau et des autorisations ; elle ne remplace ni l'expérience, ni le matériel de sécurité, ni un appel au 112 ; les itinéraires et estimations sont indicatifs ; l'utilisateur reste responsable de sa décision (météo, niveau, matériel). Les textes sont validés par un juriste ([STACK_LEGAL]) avant lancement.
- Journalisation : journal d'événements de sécurité (`SafetyEvent {type, ts, position, état, décision utilisateur, délai}`) stocké localement et côté serveur pour la sortie suivie, conservé 30 jours (sauf alerte réelle : conservation prolongée si l'utilisateur le demande ou obligation légale), avec accès/suppression par l'utilisateur (RGPD, voir Partie 8). Les journaux servent à l'amélioration des seuils uniquement sous forme agrégée et anonyme.
- Autorisations : localisation en arrière-plan, notifications critiques, exemption d'optimisation batterie ; flux de demande expliqué avec les raisons ; si refus, afficher exactement ce qui ne fonctionnera pas.
- Essais obligatoires : « tester la sécurité » (simule une alerte vers un contact, sans appeler les secours).

## 4.10 Confidentialité de la carte

- **Zones de masquage** : l'utilisateur définit jusqu'à 5 zones (domicile, travail...) avec rayon de 200 m, 500 m ou 1 km ; la première utilisation du suivi propose de créer une zone autour du lieu de départ le plus fréquent. Les points du tracé dans la zone sont retirés des versions **partagées** (flux, lien, heatmap) mais conservés dans l'historique privé ; recalcul des statistiques publiques (distance, durée) sur le tracé visible, avec précision affichée.
- **Flou de début/fin** : option par défaut ON pour partage public : retrait des 200 m (réglable 100 à 1 000 m) au début et à la fin ; aléatoire stable (même décalage pour toute l'activité) pour éviter de recouper par moyennage.
- **Heatmap communautaire** : ne contient que des activités dont le propriétaire l'a autorisé (opt-in explicite, défaut OFF pour les mineurs et pour les zones masquées) ; agrégation en cellules de 30 m sur 12 mois ; **seuils d'anonymat** : une cellule n'est affichée que si ≥ 10 utilisateurs distincts et ≥ 20 passages l'ont traversée ; bruit de Laplace léger sur les comptes ; retrait de la carte dans les segments proches de zones de masquage (k-anonymat sur voisinages) ; mise à jour toutes les 24 h, jamais en temps réel ; opt-out avec effacement des contributions sous 30 jours.
- **Partage fin** : pour chaque activité, trois niveaux (privé, amis, public) + « lien secret » ; réglages par défaut à `amis` pour les nouveaux comptes, `privé` pour les mineurs (voir Partie 7) ; choix distinct pour la carte, la fiche, les photos, la fréquence cardiaque (voir Partie 3) et la position en direct.
- Aucune exposition d'adresses précises, ni de métadonnées (EXIF, noms de fichier) sur les contenus partagés ; audit automatisé : aucune activité publique ne doit commencer ou finir à moins de 150 m d'une zone de masquage.

## 4.11 Performance et batterie

- **Rendu** : cible 60 fps en pan/zoom sur appareil milieu de gamme (2020) ; jamais plus de 5 000 features visibles non clusterisées ; clustering des POI aux faibles zooms ; couches limitées à 6 ; styles précompilés ; pas de requête réseau bloquant le thread UI.
- **Cache de tuiles** : cache disque LRU 300 Mo (réglable) pour la navigation en ligne, séparé des packs hors ligne ; cache mémoire de 64 tuiles ; en-têtes HTTP `Cache-Control: public, max-age=86400` + ETag ; pré-chargement du corridor devant la position pendant la navigation.
- **Gros tracés** : simplification par **Ramer-Douglas-Peucker** avec tolérance dépendant du zoom : `ε = 2^(−z) × 156 543 × cos(lat) × 1,5 px` (en mètres), calcul par niveau de détail (LOD) en pré-calcul serveur pour 4 niveaux (ε ≈ 100, 25, 6, 1 m) stockés dans la table de géométries ; affichage progressif ; tracé complet seulement en zoom ≥ 15 ou dans la fenêtre visible. Pour la distance et le D+ affichés, toujours utiliser la géométrie complète. Le profil d'altitude est ré-échantillonné à 600 points maximum pour l'affichage. Exemple : un tracé de 200 000 points (ultra 100 miles) doit descendre sous 3 000 points en vue d'ensemble (< 40 ms de calcul).
- **Mémoire** : pas plus de 250 Mo de mémoire résidente en navigation sur 6 h ; flux incrémentiel de lecture GPX ; libérer les couches hors écran ; surveillance de fuite pendant les tests de 8 h.
- **Démarrage rapide** : carte interactive en < 1,5 s (démarrage à chaud) et < 3 s (à froid) avec dernier viewport restauré ; initialisation du moteur carto différée après le premier écran ; fixe GPS initial visible en < 5 s en extérieur grâce aux données d'assistance et à la dernière position.
- **Batterie** : fréquence GNSS adaptative, regroupement des écritures (flush toutes les 10 s), capteurs à la demande, luminosité réduite et rafraîchissement 30 fps en navigation, pas d'animations décoratives. Budget : cf. 4.6.4. Mesurer et publier en interne un tableau de consommation par scénario à chaque version majeure.

## 4.12 Tests et critères d'acceptation

### 4.12.1 Jeux de données

Constituer un corpus versionné `fixtures/tracks/` d'au moins 120 tracés réels anonymisés (consentement ou tracés synthétiques créés à partir de tracés publics) : 20 courses route, 20 trails, 20 vélos route, 15 gravel, 15 VTT, 20 randos de journée, 10 itinérances multi-jours ; avec GPS bruité (canyon, forêt dense), pauses, arrêts, tunnels, pertes de signal, altitudes manquantes, un tracé de plus de 200 000 points, un GPX malformé, un tracé traversant le 180e méridien ou un fuseau horaire, une frontière nationale. Associer des « vérités terrain » : distance officielle, D+ de référence (MNT RGE ALTI), temps réels.

### 4.12.2 Cas limites obligatoires

- Frontières : itinéraire à cheval sur deux pays (numéros d'urgence, couches de risque, unités, langue, pack hors ligne unique ou multiples) ;
- Sentiers non cartographiés : ligne droite signalée, pas de routage faux, avertissement ;
- Zones sans élévation (mer, trous SRTM, polaire) : repli sur Copernicus ou valeur « inconnue », jamais 0 m silencieux ;
- Antiméridien et pôles : géométrie correctement découpée ;
- Heure : changement d'heure, fuseau, coucher du soleil polaire (jour/nuit continus) ;
- Boucles qui se croisent ou repassent au même point (suivi du tracé), tracé retour identique à l'aller ;
- GPS dégradé (précision > 50 m), saut de position, démarrage sans fix ;
- Stockage plein, batterie < 5 %, mode avion, DST, abonnement qui expire en cours de sortie.

### 4.12.3 Liste d'acceptation (40 cas minimum)

1. Le fond topo s'affiche en < 2 s en 4G, avec l'attribution OSM visible en permanence.
2. L'écran Sources et licences liste toutes les données utilisées (OSM, IGN, Copernicus, MNT) avec liens.
3. Le client ne contient aucune clé d'un fournisseur de tuiles commercial ; toutes les URL passent par `tiles.[DOMAINE]`.
4. Une panne simulée du fournisseur primaire déclenche la bascule vers le secours après 3 erreurs, sans plantage.
5. Activer/désactiver une couche prend moins de 150 ms et ne recharge pas le style.
6. Une couche externe périmée affiche le badge « donnée périmée » ; l'absence de donnée de chasse n'affiche jamais « pas de chasse ».
7. La couche de danger d'avalanche affiche niveau, altitude, exposition, source et heure d'émission, ou rien hors zone couverte.
8. Un téléchargement hors ligne de corridor 40 km × 4 km pèse 25-45 Mo et l'estimation affichée est exacte à ±20 %.
9. Le téléchargement reprend après coupure réseau sans repartir de zéro et passe la vérification du hash.
10. En gratuit, un 2e pack est refusé côté serveur, même avec un client modifié, avec message d'upgrade clair.
11. À l'expiration de l'abonnement, les packs excédentaires sont verrouillés (non supprimés) pour 60 jours.
12. En mode avion, la navigation d'un itinéraire enregistré fonctionne 2 h sans écran d'erreur bloquant.
13. Hors de la zone téléchargée, un fond gris explicite s'affiche et l'enregistrement n'est pas interrompu.
14. La mise à jour différentielle d'un pack ne télécharge que les blocs modifiés (≤ 20 % de la taille pour une mise à jour mensuelle type).
15. Poser 10 points et en déplacer un recalcule les deux segments adjacents en < 800 ms (4G).
16. Annuler et rétablir restaurent exactement l'état précédent (test sur 50 opérations aléatoires).
17. Le profil course route ne propose jamais d'autoroute, et le profil vélo route n'emprunte pas d'escalier ni de sentier T3.
18. Avec « éviter les escaliers », aucun tronçon `highway=steps` n'apparaît dans les itinéraires de marche.
19. Une boucle de 10 km est générée à 10 km ±10 % en moins de 6 s, avec plus de 85 % de tracé sans retour sur ses pas, ou un message d'écart explicite.
20. Un aller-retour avec « retour différent » partage au plus 40 % de son tracé.
21. Un import de GPX de 150 000 points réussit en moins de 5 s ; un fichier avec entités XML externes est rejeté.
22. L'export GPX relu par un outil tiers conserve distance et D+ à ±1 %.
23. La restauration d'une version précédente de l'itinéraire est possible parmi les 30 dernières (5 en gratuit).
24. Le temps estimé d'une rando de test (12 km, 900 m D+) est dans la fourchette attendue et l'erreur médiane du corpus est < 8 %.
25. Avec 30 min de données dans un bin de pente, la prédiction personnalisée s'en approche (poids n/(n+60)) ; sans données, le libellé « estimation générique » apparaît.
26. Le D+ affiché pour un tracé bruité ne dépasse pas la référence MNT de plus de 5 %.
27. Un passage à pente > 30 % sur 80 m est détecté et expliqué dans la fiche.
28. Le résumé en une phrase n'emploie jamais « facile » sans données de pente, de surface et de cotation, et cite l'absence d'eau > 15 km.
29. La recherche avec filtre « poussette » ne renvoie aucun itinéraire avec escalier ou pente > 8 %.
30. Le filtre « accessible en transport » ne renvoie que des itinéraires à ≤ 600 m d'un arrêt au départ et à l'arrivée.
31. Un itinéraire avec une seule note de 5 ne dépasse pas, en classement, un itinéraire noté 4,5 par 40 utilisateurs.
32. Deux tracés d'une même rando (Jaccard ≥ 0,85) sont fusionnés en un canonique avec variantes.
33. Un tracé avec vitesse moyenne irréaliste ou saut de 600 m en 3 s est mis en quarantaine et invisible en découverte.
34. Un signalement « arbre tombé » expire après 14 jours sans confirmation et disparaît après 2 infirmations.
35. Une activité publique ne commence jamais à moins de 150 m d'une zone de masquage ; la heatmap n'affiche aucune cellule avec moins de 10 utilisateurs.
36. Une alerte de déviation à 60 m en vélo s'affiche en < 5 s sans interaction ; aucune alerte à l'arrêt ni avec précision GPS > 50 m.
37. En vélo à plus de 8 km/h, les écrans d'édition et de saisie sont verrouillés.
38. L'écran éteint en mode économie consomme ≤ 6 % de batterie/h (mesure sur 2 appareils de référence) et les alertes de sécurité réveillent l'écran.
39. Une sortie sans réponse à l'heure de retour prévue déclenche, côté serveur, l'alerte aux contacts à +45 min ±2 min, même téléphone éteint.
40. Un lien de position en direct expire à l'heure prévue, est révocable instantanément et affiche l'âge de la dernière position.
41. Une chute simulée (impact > 3 g + immobilité 5 s) ouvre l'écran de confirmation, et sans réponse envoie l'alerte après 30 s ; « Je vais bien » l'annule.
42. Sur 50 h d'activité de test sans chute, moins d'un faux positif ; les secousses de vélo sur pavés ne déclenchent rien.
43. Le bouton SOS exige 2 s de pression et affiche coordonnées, numéro d'urgence du pays (déterminé par GNSS) et fiche médicale, hors ligne.
44. Près d'une frontière (< 5 km), deux jeux de numéros s'affichent ; le 112 est toujours accessible.
45. L'alerte de lumière se déclenche rouge dans l'exemple 17 h 10 / coucher 19 h 02 / arrivée estimée 20 h 30.
46. La fiche médicale est lisible depuis l'écran verrouillé et chiffrée sur l'appareil ; elle n'est partagée qu'avec choix explicite.
47. Un tracé de 200 000 points descend sous 3 000 points en vue d'ensemble en < 40 ms, sans changer la distance affichée.
48. Pan/zoom à 60 fps sur appareil de référence 2020 avec 4 couches actives ; mémoire < 250 Mo après 6 h de navigation.
49. Démarrage à froid de la carte en < 3 s ; fix GPS initial en < 5 s en extérieur.
50. Les droits (satellite complet, heatmap complète, routage hors ligne) sont refusés par le serveur sans entitlement valide, quel que soit l'état du client.

### 4.12.4 Qualité continue

Suite d'intégration exécutée à chaque modification de profils de routage ou de styles (rendu comparé par captures de référence, tolérance 0,5 %) ; revue manuelle d'un échantillon de 30 itinéraires chaque trimestre par un randonneur et un cycliste expérimentés ; tableau de bord des erreurs d'estimation de temps, des fausses alertes de déviation, des faux positifs de chute et des coûts de tuiles par MAU ; toute régression d'un critère de la section 4.9 bloque la mise en production.
