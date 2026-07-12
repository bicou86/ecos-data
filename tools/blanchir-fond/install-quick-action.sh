#!/bin/bash
# Installe l'Action rapide « Blanchir le fond (ECOS) ».
# 100% Photoshop : aucune dépendance Python (comme tools/combine-uniform).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/Blanchir-fond-ECOS.workflow"
DST="$HOME/Library/Services/Blanchir-fond-ECOS.workflow"
rm -rf "$DST"; cp -R "$SRC" "$DST"; touch "$DST"
# Auto-réparation du chemin : réécrit le workflow copié vers l'emplacement réel du repo ($DIR),
# pour qu'un déplacement du dossier ne casse plus l'Action rapide (il suffit de relancer ce script).
/usr/bin/sed -i '' -E "s|/Users/[^<]*/tools/blanchir-fond/blanchir-fond.jsx|$DIR/blanchir-fond.jsx|g" "$DST/Contents/document.wflow"
/System/Library/CoreServices/pbs -update 2>/dev/null || true
echo "✓ Action rapide installée : $DST"
echo "  Finder > sélectionner ≥ 1 image > clic droit > Actions rapides > « Blanchir le fond (ECOS) »"
echo "  (sinon : Réglages Système > Clavier > Raccourcis > Services pour l'activer)"
