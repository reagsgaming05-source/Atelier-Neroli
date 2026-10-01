#!/bin/sh
# Construit l'application Windows portable à partir de la page produite par
# outils/build.js, et l'archive prête à distribuer :
#   sh outils/application/lanceur/construire.sh
# Résultat : Aktum PDF.exe ici, et AktumPDF-leger-windows.zip à la racine du dépôt
# (le même que publie GitHub Actions sur la page Releases).
set -e
cd "$(dirname "$0")"
[ -f aktum-pdf.html ] || { echo "aktum-pdf.html manquant : lancez d'abord node outils/build.js"; exit 1; }
gzip -9 -c aktum-pdf.html > aktum-pdf.html.gz
gofmt -l . | grep . && { echo "code à reformater"; exit 1; } || true
GOOS=windows go vet .
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -H windowsgui" -o "Aktum PDF.exe" .
# icône et informations du fichier, sans quoi Windows affiche un exécutable anonyme
node ../poser-icone.js "Aktum PDF.exe" ../icon.ico
ls -la "Aktum PDF.exe"

# Le dossier portable : l'exécutable, le fichier HTML de secours, le LISEZ-MOI.
RACINE=$(cd ../../.. && pwd)
rm -rf "$RACINE/dist" && mkdir -p "$RACINE/dist/Aktum PDF"
cp "Aktum PDF.exe" "$RACINE/dist/Aktum PDF/"
cp ../../aktum-pdf-hors-ligne.html "$RACINE/dist/Aktum PDF/Aktum PDF (si les .exe sont bloques).html"
cp LISEZ-MOI.txt "$RACINE/dist/Aktum PDF/LISEZ-MOI.txt"
rm -f "$RACINE/AktumPDF-leger-windows.zip"
(cd "$RACINE/dist" && zip -q -r ../AktumPDF-leger-windows.zip "Aktum PDF")
ls -la "$RACINE/AktumPDF-leger-windows.zip"
