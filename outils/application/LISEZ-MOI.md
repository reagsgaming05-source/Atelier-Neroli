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
