#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
HANDOFF_DIR="$ROOT_DIR/handoff/gravedad-zero-mission-01"
PACKAGES_DIR="$HANDOFF_DIR/packages"

echo "Unpacking Gravedad Zero handoff packs into repo root: $ROOT_DIR"

for pack in \
  gravedad_zero_mission_01_completion_pack_v1.zip \
  gravedad_zero_astronaut_projectiles_pack_v1.zip \
  gravedad_zero_unlock_asset_pack_v1.zip \
  nave_three_audio_pack_v2_refined.zip
do
  if [ ! -f "$PACKAGES_DIR/$pack" ]; then
    echo "Missing package: $pack"
    exit 1
  fi
  echo "Unpacking $pack"
  unzip -o "$PACKAGES_DIR/$pack" -d "$ROOT_DIR"
done

echo "Done. Review git diff before committing."
