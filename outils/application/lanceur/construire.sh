#!/bin/sh
# Construit l'application Windows à partir de la page produite par outils/build.js.
#   sh outils/application/lanceur/construire.sh
set -e
cd "$(dirname "$0")"
[ -f blonay-pdf.html ] || { echo "blonay-pdf.html manquant : lancez d'abord node outils/build.js"; exit 1; }
gzip -9 -c blonay-pdf.html > blonay-pdf.html.gz
gofmt -l . | grep . && { echo "code à reformater"; exit 1; } || true
go vet .
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -H windowsgui" -o "Blonay PDF.exe" .
# icône et informations du fichier, sans quoi Windows affiche un exécutable anonyme
node ../poser-icone.js "Blonay PDF.exe" ../icon.ico
ls -la "Blonay PDF.exe"
