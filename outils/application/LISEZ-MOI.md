# Application de bureau

Deux façons d'obtenir une fenêtre d'application, sans onglet ni barre d'adresse.

## Lanceur en un seul fichier (livré)

`lanceur/` contient un petit programme Go qui embarque l'outil complet, le
dépose dans le dossier de l'utilisateur au premier lancement, puis l'affiche
avec le moteur déjà présent sur le poste, sans aucune interface de navigateur
et dans un espace séparé de la navigation habituelle.

L'exécutable pèse 2,5 Mo. Construction :

```sh
gzip -9 -c ../blonay-pdf-hors-ligne.html > lanceur/blonay-pdf.html.gz
cd lanceur
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath \
  -ldflags="-s -w -H windowsgui" -o "Blonay PDF.exe" .
```

L'icône et les informations du fichier sont ensuite posées avec `resedit`
(paquet npm), à partir de `icon.ico`.

### Ouverture d'un document

Quand l'application est le programme par défaut des PDF, Windows la lance
avec le chemin du fichier double-cliqué. Une page `file://` n'a pas le droit
de lire un fichier voisin (`fetch` est refusé), mais elle peut le charger
comme script. Le lanceur dépose donc le document, encodé, dans un fichier
`ouverture-<aléa>.js` à côté de la page, et ouvre la page avec
`#ouvrir=<ce nom>`. La page (`ouvrirAuLancement` dans `source.html`) n'accepte
qu'un nom de cette forme exacte, jamais un chemin ni une adresse, charge le
script, ouvre le document à la place de l'exemple et nettoie l'adresse. La
version hors ligne autorise pour cela `file:` dans `script-src`.

Le lanceur attend deux minutes, puis vide et supprime le fichier d'ouverture ;
les restes d'un lancement interrompu sont nettoyés au lancement suivant. Un
document reçu ouvre toujours sa propre fenêtre, même si une fenêtre de
l'application est déjà ouverte ; sans document, un second lancement ramène la
fenêtre existante.

### Impression directe

Le moteur d'affichage est lancé avec `--kiosk-printing` : `window.print()`
part directement à l'imprimante par défaut de Windows, sans fenêtre d'aperçu
du navigateur. Comme le navigateur ne pose plus de question, c'est la page
qui annonce la taille de chaque feuille (`@page … { size }` nommée par
feuille dans `imprimerEnImages`) : c'est ce qui décide du papier et de
l'orientation, y compris pour un livret à l'italienne. Le lanceur le signale
à la page par `#impression=directe`, et le dialogue d'impression adapte ses
textes (imprimante par défaut, recto verso à régler dans Windows).

Ces réglages ne s'appliquent qu'au démarrage d'un processus : si Edge ou
Chrome tournait déjà avec son profil habituel, il les ignorerait. Le moteur
tourne donc avec son propre profil, `profil/` dans le dossier de
l'application (`--user-data-dir`), ce qui les rend fiables et tient l'outil à
l'écart de la navigation habituelle.

### Pare-feu

Le moteur d'affichage est démarré avec ses fonctions de découverte réseau
désactivées (`--media-router=0`, `--disable-features=MediaRouter,…`). Un
profil neuf ferait sinon démarrer la découverte de périphériques locaux, qui
ouvre un port d'écoute et déclenche la demande d'autorisation du pare-feu
Windows. Avec un profil propre, ces réglages sont justement ceux du processus
lancé : rien n'écoute, le pare-feu n'a rien à signaler.

### Avertissement de Windows

L'exécutable n'est pas signé. Un fichier venu d'internet porte une marque qui
déclenche « Windows a protégé votre ordinateur » au premier lancement. Cocher
« Débloquer » dans les propriétés de l'archive avant de la décompresser retire
cette marque, et l'avertissement n'apparaît pas. Le supprimer définitivement
demanderait un certificat de signature de code.

## Application autonome Electron

`electron/` contient la fenêtre d'application : `main.js` et `package.json`.
Elle embarque son propre moteur d'affichage, ne dépend d'aucun navigateur
installé et bloque toute requête réseau au niveau du programme, en plus des
règles de sécurité de la page.

L'exécutable obtenu pèse 180 Mo, soit une centaine de mégaoctets compressés,
ce qui dépasse ce qu'un fil de discussion accepte en pièce jointe.
Construction :

```sh
curl -LO https://github.com/electron/electron/releases/download/v33.4.11/electron-v33.4.11-win32-x64.zip
unzip -q electron-v33.4.11-win32-x64.zip -d win
rm win/resources/default_app.asar
mkdir -p win/resources/app
cp electron/main.js electron/package.json ../blonay-pdf-hors-ligne.html win/resources/app/
mv win/resources/app/blonay-pdf-hors-ligne.html win/resources/app/index.html
# icône et nom du fichier posés avec resedit, puis electron.exe renommé
```

Vérifiée sur la version Linux du même Electron, dans un affichage virtuel :
démarrage, titre de fenêtre, absence de barre de menu, affichage du document,
export d'un PDF sur le disque, refus de toute sortie réseau, et confirmation
avant fermeture quand des modifications n'ont pas été exportées.
