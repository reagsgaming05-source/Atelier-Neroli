# Sakina — سَكِينَة

Application musulmane **gratuite, sans publicité, sans compte et sans pistage**, utilisable hors-ligne.
C'est une application web progressive (PWA) : elle s'installe sur l'écran d'accueil d'Android comme d'iPhone, sans passer par un store.

## Fonctionnalités

| | |
|---|---|
| **Horaires de prière** | Calcul astronomique local (bibliothèque [Adhan](https://github.com/batoulapps/adhan-js)), 19 méthodes dont UOIF 12°, 15°, 18°, Ligue islamique mondiale, Umm al-Qura, Maroc, Algérie, Tunisie, Diyanet, ISNA… Asr majoritaire ou hanafite, règles pour hautes latitudes, ajustements à la minute, tableau du mois, imsak, milieu et dernier tiers de la nuit. |
| **Alertes** | Notifications quand l'application est ouverte, et export **agenda (.ics)** des 30 prochains jours avec une alarme à chaque prière : fiable même application fermée. |
| **Qibla** | Boussole (Android et iPhone), angle depuis le nord et distance jusqu'à la Ka‘ba. |
| **Coran** | 114 sourates en écriture uthmanie (police Amiri Quran), traductions Hamidullah et Rachid Maach, translittération, récitation verset par verset (7 récitateurs), marque-pages, reprise de lecture, recherche dans la traduction, navigation par juz’, versets de prosternation. |
| **Histoires en séries** | Les prophètes et les grands récits du Coran (Adam, Nûh, Ibrâhîm, Yûsuf, Mûsâ, Maryam, ‘Îsâ, les Gens de la Caverne…) en mini-séries illustrées et racontées : un épisode par passage du Coran, des scènes animées, une narration enregistrée par une voix neuronale française (la même sur tous les téléphones, écoutable hors-ligne ; à défaut, la voix du téléphone), les versets clés en arabe et en français avec leur récitation. Récits de la Sunna tirés de Ṣaḥīḥ al-Bukhārī et Muslim, en épisode illustré et en texte exact. Aucune illustration ne représente de prophète ni de personne : seulement des lieux, des objets et des symboles. |
| **Apprendre** | Les 40 hadiths d'an-Nawawī et 40 hadiths qudsi (arabe + français), guides pas à pas (piliers, ablutions, ghusl, tayammum, prière, prières surérogatoires, vendredi), quiz (Coran, noms d'Allah, prophètes, Sunna). |
| **Pratiquer** | « Ma journée » : bonnes actions du jour avec leur hadith, cochées automatiquement quand on prie, lit ses adhkar ou sa portion de Coran, série de jours réguliers. Plan de lecture du Coran (khatm) en 7 jours à 1 an, sur les 604 pages du mushaf de Médine. Mode mémorisation (texte flouté, répétition des versets). Compteur de prières et de jeûnes à rattraper. Hadith du jour. |
| **Adhkar** | Matin, soir, après la prière, sommeil, réveil, quotidien, détresse, istikhara, invocations coraniques (Rabbana) — avec compteurs, sources et vertus. |
| **Tasbih** | Compteur avec objectifs (33/99/100…), enchaînement automatique 33-33-34, vibration. |
| **Calendrier hégirien** | Calendrier Umm al-Qura, décalage réglable, Ramadan, Aïd, ‘Arafat, ‘Achoura, jours blancs. |
| **Et aussi** | 99 noms d'Allah, calcul de la zakat, suivi personnel des prières, verset du jour, thème clair/sombre. |

Toutes les données (position, réglages, marque-pages, suivi) restent sur l'appareil.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires (horaires, qibla, calendrier, zakat, agenda, khatm, objectifs, quiz, contenus)
npm run build      # version de production dans dist/
```

Les données du Coran et des villes sont déjà générées dans `public/data/` et `src/data/`. Pour les régénérer depuis les sources :

```bash
npm run data
```

### Vérifier les adhkar contre la source

Les textes arabes des adhkar sont comparés automatiquement à Hisn al-Muslim et au texte coranique :

```bash
curl -sLo /tmp/hisn.json https://raw.githubusercontent.com/rn0x/hisn_almuslim_json/main/hisn_almuslim.json
curl -sLo /tmp/quran-ar.json https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-qurankhaledhosn.json
HISN_JSON=/tmp/hisn.json QURAN_AR_JSON=/tmp/quran-ar.json npx vitest run tests/adhkar.test.ts
```

### Mise en scène des histoires

Chaque épisode est tourné comme un court film (`src/components/Stage.tsx`, `src/lib/direction.ts`) :

- **Un découpage image par image** (`src/data/storyboards/`, guide : `docs/storyboard-guide.md`). Chaque scène est racontée sur 1 à 5 images qui changent à la phrase ou à la proposition où le texte les évoque : ce qui est à l'écran est ce qui est dit, au moment où on le dit, et les images se suivent (les objets restent, l'heure et la météo évoluent dans l'ordre). Des tests vérifient que chaque scène a son découpage et que d'une image à l'autre quelque chose se prolonge.
- **Une caméra continue** : elle glisse d'un cadrage à l'autre, vers l'objet dont parle la phrase, sans s'arrêter, y compris d'une scène à l'autre ; une nouvelle image se fond dans la précédente.
- **Trois plans de profondeur** (ciel, paysage, silhouettes au premier plan) qui défilent à des vitesses différentes, et de l'**atmosphère** (poussière dorée, lucioles, braises, brume, nuages, rayons de lumière, oiseaux…).
- **Des images qui évoluent** : l'eau du déluge monte, l'arche avance, le soleil se lève ou se couche, la coque se construit.
- Un titre d'épisode, des sous-titres qui s'illuminent au rythme de la voix, un grain de pellicule.
- Aucune personne n'est jamais dessinée : des lieux, des objets, des animaux, de la lumière.

### Narration des histoires

La narration est enregistrée d'avance par une voix neuronale française libre et gratuite ([Kokoro-82M](https://github.com/thewh1teagle/kokoro-onnx), voix `ff_siwis`) : un fichier MP3 par épisode dans `public/data/narration/`, avec dans `index.json` le passage où chaque texte est lu. Le lecteur retrouve chaque texte par son empreinte : une scène modifiée depuis l'enregistrement est simplement laissée à lire en silence, sans changer de voix au milieu d'un épisode.

Le workflow `narration.yml` réenregistre automatiquement, sur GitHub, les épisodes modifiés dès que les scripts changent, et dépose dans `docs/voix/` un court extrait d'autres voix françaises libres (Piper) pour comparer. En local :

```bash
pip install kokoro-onnx soundfile        # et ffmpeg
node scripts/narration/export.mjs        # liste les textes à lire
python3 scripts/narration/build.py --engine kokoro \
  --model kokoro-v1.0.onnx --voices voices-v1.0.bin --voice ff_siwis
```

Sous la voix, des **sons de nature** (vent, mer, eau, pluie, orage, feu, grillons, oiseaux, grotte) sont synthétisés en direct par le navigateur (`src/lib/ambience.ts`, Web Audio) : rien à télécharger, aucun instrument de musique. Chaque scène a les siens selon son ciel, son lieu et ses objets ; un bouton « Ambiance » permet de les couper.

Les noms arabes sont réécrits pour la voix seulement (`LEXICON` dans `export.mjs`), afin d'être bien prononcés en français.

## Mise en ligne gratuite (GitHub Pages)

1. Dans le dépôt GitHub : **Settings → Pages → Source : GitHub Actions**.
2. Fusionner sur `main` : le workflow `deploy.yml` teste, construit et publie l'application sur `https://<compte>.github.io/<dépôt>/`.
3. Ouvrir ce lien sur le téléphone puis « Ajouter à l'écran d'accueil » (Safari : bouton Partager ; Chrome : menu ⋮ → Installer).

N'importe quel hébergement statique convient aussi (Netlify, Cloudflare Pages…). Pour un sous-dossier, construire avec `BASE=/sous-dossier/ npm run build`.

## Architecture

```
src/
  lib/        logique sans interface : prière, hégire, qibla, zakat, agenda, notifications, stockage
  data/       sourates, adhkar, 99 noms, métadonnées du Coran
  views/      un écran par fichier (Accueil, Prières, Coran, Qibla, Adhkar…)
  components/ éléments réutilisables
public/data/  texte du Coran par sourate et liste des villes (mis en cache à la demande)
scripts/      génération des données
tests/        tests Vitest
```

Preact + TypeScript + Vite, service worker Workbox (vite-plugin-pwa). Aucune dépendance serveur.

## Limites connues

- Une application web ne peut pas se réveiller seule à heure fixe une fois fermée : d'où l'export agenda pour des alertes fiables. Des notifications « push » nécessiteraient un serveur.
- La récitation audio est diffusée depuis everyayah.com et demande une connexion. La narration des histoires est mise en cache épisode par épisode, après une première écoute.
- Le début des mois hégiriens dépend de l'observation du croissant : le calendrier est une estimation, ajustable de ±2 jours.

## Sources et licences

- Texte coranique : [Tanzil.net](https://tanzil.net) (CC BY 3.0, reproduit sans modification), encodage de Khaled Hosny pour Amiri Quran, via [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api).
- Traductions : Muhammad Hamidullah (Tanzil.net), Rachid Maach ([QuranEnc.com](https://quranenc.com)) — usage non commercial.
- Adhkar : *Hisn al-Muslim* de Sa‘id al-Qahtani.
- Hadiths (40 an-Nawawī, qudsi, Ṣaḥīḥ al-Bukhārī, Ṣaḥīḥ Muslim) : [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api).
- Narration : Kokoro-82M (Apache 2.0), voix `ff_siwis` entraînée sur le corpus SIWIS (CC BY 4.0).
- Horaires : [Adhan](https://github.com/batoulapps/adhan-js) (MIT). Villes : simplemaps.com (CC BY 4.0) via `city-timezones`. Police : Amiri Quran (SIL OFL).
- Code de l'application : licence MIT.
