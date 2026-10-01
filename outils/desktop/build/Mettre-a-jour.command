#!/bin/sh
# Blonay PDF — mise à jour de la version Mac.
#
# Remplace les fichiers de l'application par ceux du zip, et ne touche jamais au
# dossier « data » : vos tampons, votre signature, vos récents et le travail mis
# de côté sont conservés. Rien n'est téléchargé : c'est vous qui apportez le zip.
#
#   ./Mettre-a-jour.command                    cherche le zip à côté
#   ./Mettre-a-jour.command ~/BlonayPDF.zip    prend celui-là
#
# Lancé par l'application elle-même (BLONAY_MAJ_AUTO=1), il attend qu'elle se
# ferme, remplace, puis la rouvre.

set -e
DOSSIER=$(cd "$(dirname "$0")" && pwd)
cd "$DOSSIER"

echo
echo "  Blonay PDF — mise à jour"
echo "  ------------------------"
echo

# ---- Trouver le zip -------------------------------------------------------
ZIP="$1"
if [ -z "$ZIP" ]; then
  for candidat in "$DOSSIER"/BlonayPDF-mac*.zip "$DOSSIER"/maj/BlonayPDF-mac*.zip \
                  "$DOSSIER"/BlonayPDF*.zip "$DOSSIER"/maj/BlonayPDF*.zip; do
    [ -f "$candidat" ] && ZIP="$candidat" && break
  done
fi
if [ ! -f "$ZIP" ]; then
  echo "  Aucun zip trouvé."
  echo "  Posez BlonayPDF-mac.zip à côté de ce fichier, ou glissez-le sur cette fenêtre."
  echo
  [ -z "$BLONAY_MAJ_AUTO" ] && { printf "  Appuyez sur Entrée pour fermer… "; read -r _; }
  exit 1
fi
echo "  Archive : $(basename "$ZIP")"

# ---- Attendre que l'application soit fermée -------------------------------
# macOS ne verrouille pas un fichier en cours d'exécution comme Windows, mais
# remplacer un paquet sous les pieds d'une application ouverte la fait planter
# au prochain fichier qu'elle voudra lire.
ESSAIS=0
while pgrep -x "BlonayPDF" >/dev/null 2>&1; do
  if [ -z "$BLONAY_MAJ_AUTO" ]; then
    echo
    echo "  Blonay PDF est encore ouverte. Fermez-la, puis relancez cette mise à jour."
    echo
    printf "  Appuyez sur Entrée pour fermer… "; read -r _
    exit 1
  fi
  ESSAIS=$((ESSAIS + 1))
  if [ "$ESSAIS" -ge 30 ]; then
    echo "  L'application ne s'est pas fermée. Mise à jour abandonnée."
    exit 1
  fi
  sleep 2
done

# ---- Vérifier la signature de l'éditeur ----------------------------------
# Ce zip arrive d'un dossier où tout le monde écrit. Il n'est exécuté que s'il est
# signé par l'éditeur, et c'est une COPIE, posée dans un dossier à soi, qui est
# vérifiée puis ouverte : un zip remplacé entre la vérification et l'ouverture ne
# passerait pas. La vérification est faite par l'application DÉJÀ installée (en mode
# Node), qui porte la clé publique de l'éditeur ; la nouvelle version n'a pas voix
# au chapitre.
TEMP=$(mktemp -d "${TMPDIR:-/tmp}/blonaypdf-maj-XXXXXX")
trap 'rm -rf "$TEMP"' EXIT
cp "$ZIP" "$TEMP/maj.zip"
[ -f "$ZIP.signature.json" ] && cp "$ZIP.signature.json" "$TEMP/maj.zip.signature.json"
echo "  Vérification de la signature de l'éditeur…"
APPLI="$DOSSIER/BlonayPDF.app/Contents"
if ! ELECTRON_RUN_AS_NODE=1 "$APPLI/MacOS/BlonayPDF" "$APPLI/Resources/app.asar/verifier-maj.js" "$TEMP/maj.zip"; then
  echo
  echo "  Cette archive n'est pas signée par l'éditeur, ou a été modifiée :"
  echo "  elle n'est PAS installée, et rien n'a été touché. Pour une vraie mise à jour,"
  echo "  reprenez « BlonayPDF-mac.zip » ET son fichier « .signature.json » depuis la"
  echo "  page de téléchargement de l'éditeur."
  echo
  [ -z "$BLONAY_MAJ_AUTO" ] && { printf "  Appuyez sur Entrée pour fermer… "; read -r _; }
  exit 1
fi
ZIP="$TEMP/maj.zip"
echo "  Signature vérifiée."

# ---- Remplacer ------------------------------------------------------------
SOURCE_TEMP="$TEMP/ouvert"
mkdir -p "$SOURCE_TEMP"
echo "  Décompression…"
if ! ditto -x -k "$ZIP" "$SOURCE_TEMP" 2>/dev/null; then
  unzip -q -o "$ZIP" -d "$SOURCE_TEMP"
fi

# Le zip peut contenir le paquet à sa racine, ou dans un dossier.
SOURCE="$SOURCE_TEMP"
if [ ! -d "$SOURCE_TEMP/BlonayPDF.app" ]; then
  for d in "$SOURCE_TEMP"/*; do
    [ -d "$d/BlonayPDF.app" ] && SOURCE="$d" && break
  done
fi
if [ ! -d "$SOURCE/BlonayPDF.app" ]; then
  echo "  BlonayPDF.app est introuvable dans l'archive. Rien n'a été modifié."
  exit 1
fi

echo "  Remplacement de l'application…"
rm -rf "$DOSSIER/BlonayPDF.app.ancienne"
[ -d "$DOSSIER/BlonayPDF.app" ] && mv "$DOSSIER/BlonayPDF.app" "$DOSSIER/BlonayPDF.app.ancienne"
# ditto préserve les liens symboliques et les droits du paquet : un cp ordinaire
# casserait la structure des frameworks et l'application refuserait de s'ouvrir.
ditto "$SOURCE/BlonayPDF.app" "$DOSSIER/BlonayPDF.app"
rm -rf "$DOSSIER/BlonayPDF.app.ancienne"

# Les fichiers voisins (LISEZMOI, script de mise à jour) suivent aussi, mais
# jamais « data », ni quoi que ce soit que la personne aurait posé là.
for f in "$SOURCE"/*; do
  nom=$(basename "$f")
  case "$nom" in
    BlonayPDF.app|data) continue ;;
  esac
  [ -f "$f" ] && cp -f "$f" "$DOSSIER/$nom"
done
[ -f "$DOSSIER/Mettre-a-jour.command" ] && chmod +x "$DOSSIER/Mettre-a-jour.command"

# Le sceau de quarantaine remis par le téléchargement empêcherait l'ouverture.
xattr -dr com.apple.quarantine "$DOSSIER/BlonayPDF.app" 2>/dev/null || true

echo
echo "  Mise à jour terminée. Le dossier « data » n'a pas été touché."
echo "  BLONAY-MAJ: OK"
echo

if [ -n "$BLONAY_MAJ_AUTO" ]; then
  echo "  Redémarrage de l'application…"
  open "$DOSSIER/BlonayPDF.app" >/dev/null 2>&1 || true
  exit 0
fi
printf "  Appuyez sur Entrée pour fermer… "; read -r _
exit 0
