#!/bin/sh
# Récupère depuis npm les trois bibliothèques que outils/build.js embarque
# dans les versions hors ligne, sous outils/libs/<nom>-<version>/ :
#   sh outils/recuperer-libs.sh
# Elles ne sont pas suivies par git (voir .gitignore) : ce script les remet.
set -e
cd "$(dirname "$0")"
mkdir -p libs && cd libs
for paquet in pdfjs-dist@3.11.174 @cantoo/pdf-lib@2.11.0 jszip@3.10.1; do
  nom=$(echo "$paquet" | sed 's|^@||; s|/|-|; s|@.*||')
  version=${paquet##*@}
  dossier="$nom-$version"
  [ -f "$dossier/package.json" ] && { echo "$dossier : déjà là"; continue; }
  archive=$(npm pack "$paquet" --silent)
  rm -rf "$dossier" && mkdir -p "$dossier"
  tar -xzf "$archive" -C "$dossier" --strip-components=1
  echo "$dossier : récupéré"
done
