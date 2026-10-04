#!/bin/sh
# Downloads the globe textures into web/public/textures.
# They are not committed: ~2.5 MB of binaries for three files.
# Run once before `pnpm dev` in web/, and on any fresh CI or deploy build.
set -eu
DIR="$(dirname "$0")/../web/public/textures"
mkdir -p "$DIR"
BASE="https://unpkg.com/three-globe@2.45.3/example/img"
for f in earth-blue-marble.jpg earth-night.jpg earth-topology.png; do
  if [ -s "$DIR/$f" ]; then
    echo "уже есть: $f"
    continue
  fi
  echo "качаю $f"
  curl -fsSL --retry 3 -o "$DIR/$f" "$BASE/$f"
done
file "$DIR"/* 2>/dev/null || true
