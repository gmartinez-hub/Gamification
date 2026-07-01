#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
PACKS_DIR="$ROOT_DIR/handoff/gravedad-zero/packs"

echo "Unpacking Gravedad Zero packs from: $PACKS_DIR"
echo "Repo root: $ROOT_DIR"

for pack in \
  gravedad_zero_mission_01_completion_pack_v1.zip \
  gravedad_zero_astronaut_projectiles_pack_v1.zip \
  gravedad_zero_unlock_asset_pack_v1.zip \
  gravedad_zero_aim_assist_fx_contracts_pack_v1.zip \
  gravedad_zero_robot_companion_hud_pack_v1.zip \
  nave_three_audio_pack_v2_refined.zip
do
  if [ -f "$PACKS_DIR/$pack" ]; then
    echo "Unpacking $pack"
    unzip -o "$PACKS_DIR/$pack" -d "$ROOT_DIR"
  else
    echo "Missing $pack"
  fi
done

echo "Done. Review git diff before committing."
