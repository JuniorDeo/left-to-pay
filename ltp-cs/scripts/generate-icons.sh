#!/usr/bin/env zsh
# Génère les icônes PNG (72,96,128,144,152,192,384,512) à partir de
# public/sac-dargent.png et les place dans public/icons
# Usage:
#   1) Placez votre image source : ltp-cs/public/sac-dargent.png
#   2) Rendre le script exécutable: chmod +x scripts/generate-icons.sh
#   3) Exécuter: ./scripts/generate-icons.sh

set -euo pipefail

SRC="/Users/freddy/left-to-pay/ltp-cs/public/sac-dargent.png"
ICON_DIR="/Users/freddy/left-to-pay/ltp-cs/public/icons"

if [ ! -f "$SRC" ]; then
  echo "Erreur: fichier source non trouvé : $SRC"
  echo "Placez votre sac-dargent.png dans le dossier public du projet puis relancez le script."
  exit 1
fi

mkdir -p "$ICON_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${ICON_DIR}/backup-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo "Sauvegarde des icônes existantes vers: $BACKUP_DIR"
cp "$ICON_DIR"/*.png "$BACKUP_DIR" 2>/dev/null || true

# Détecte ImageMagick (magick ou convert)
if command -v magick >/dev/null 2>&1; then
  IM_CMD="magick"
elif command -v convert >/dev/null 2>&1; then
  IM_CMD="convert"
else
  echo "ImageMagick n'est pas installé (magick/convert introuvable)."
  echo "Installez-le via Homebrew: brew install imagemagick    puis relancez le script"
  exit 2
fi

SIZES=(72 96 128 144 152 192 384 512)

echo "Utilisation de la commande ImageMagick: $IM_CMD"

for s in "${SIZES[@]}"; do
  OUT="$ICON_DIR/icon-${s}x${s}.png"
  echo "Génération: $OUT"
  # Redimensionne, centre, et étend la toile à une image carrée de la bonne taille.
  # Conserve la transparence par défaut. Pour aplatir sur fond blanc, ajouter: -background white -flatten
  if [ "$IM_CMD" = "magick" ]; then
    magick "$SRC" -resize ${s}x${s} -background none -gravity center -extent ${s}x${s} "$OUT"
  else
    convert "$SRC" -resize ${s}x${s} -background none -gravity center -extent ${s}x${s} "$OUT"
  fi
done

echo "Icônes générées dans: $ICON_DIR"
echo "Vérifiez / mettez à jour le fichier public/manifest.webmanifest si nécessaire."

echo "Optionnel: optimiser avec optipng (lossless) ou pngquant (lossy):"
echo "  brew install optipng pngquant"
echo "  optipng -o7 $ICON_DIR/icon-*.png"
echo "  # ou (avec réduction 'lossy')"
echo "  pngquant --force --ext .png --quality=65-90 $ICON_DIR/icon-*.png"

exit 0

