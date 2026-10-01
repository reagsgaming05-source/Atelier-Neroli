#!/bin/sh
# Aktum PDF - ouvre l'outil dans une fenetre d'application.
# Rien n'est installe : ce fichier demarre le navigateur deja present.
DIR=$(cd "$(dirname "$0")" && pwd)
PAGE="$DIR/aktum-pdf.html"
if [ ! -f "$PAGE" ]; then
  echo "aktum-pdf.html est introuvable a cote de ce fichier."
  exit 1
fi
URL="file://$PAGE"
for NAV in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
           "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "$HOME/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
  if [ -x "$NAV" ]; then
    "$NAV" --app="$URL" >/dev/null 2>&1 &
    exit 0
  fi
done
open "$PAGE"
