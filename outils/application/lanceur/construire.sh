#!/bin/sh
# Construit l'application Windows portable à partir de la page produite par
# outils/build.js, et l'archive prête à distribuer :
#   sh outils/application/lanceur/construire.sh
# Résultat : Blonay PDF.exe ici, et BlonayPDF-windows.zip à la racine du dépôt
# (le même que publie GitHub Actions sur la page Releases).
set -e
cd "$(dirname "$0")"
[ -f blonay-pdf.html ] || { echo "blonay-pdf.html manquant : lancez d'abord node outils/build.js"; exit 1; }
gzip -9 -c blonay-pdf.html > blonay-pdf.html.gz
gofmt -l . | grep . && { echo "code à reformater"; exit 1; } || true
GOOS=windows go vet .
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -H windowsgui" -o "Blonay PDF.exe" .
# icône et informations du fichier, sans quoi Windows affiche un exécutable anonyme
node ../poser-icone.js "Blonay PDF.exe" ../icon.ico
ls -la "Blonay PDF.exe"

# Le dossier portable : l'exécutable, le fichier HTML de secours, le LISEZ-MOI.
RACINE=$(cd ../../.. && pwd)
rm -rf "$RACINE/dist" && mkdir -p "$RACINE/dist/Blonay PDF"
cp "Blonay PDF.exe" "$RACINE/dist/Blonay PDF/"
cp ../../blonay-pdf-hors-ligne.html "$RACINE/dist/Blonay PDF/Blonay PDF (si les .exe sont bloques).html"
cp LISEZ-MOI.txt "$RACINE/dist/Blonay PDF/LISEZ-MOI.txt"
rm -f "$RACINE/BlonayPDF-windows.zip"
(cd "$RACINE/dist" && zip -q -r ../BlonayPDF-windows.zip "Blonay PDF")
ls -la "$RACINE/BlonayPDF-windows.zip"
