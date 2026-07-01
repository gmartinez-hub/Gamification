# Gravedad Zero — Mission 01 Handoff

Esta carpeta consolida las definiciones, assets y briefs para que Codex integre la primera misión jugable sin pisar el mapping actual de nave/stages.

## Estado del repo esperado

El runtime ya tiene:
- nave con `stage1`, `stage2`, `stage3`;
- stage transition existente;
- astronauta en escena;
- modo nave / modo astronauta;
- vistas direccionales del astronauta;
- asteroides/mundo orbital;
- FX base.

## Objetivo de esta entrega

Implementar `Mission 01` como vertical slice:

```txt
Stage 1
↓
astronauta rompe 3 asteroides chicos
↓
aparece 1 obstáculo grande
↓
la nave destruye el obstáculo grande
↓
aparece reliquia/holograma
↓
astronauta toca reliquia
↓
STAGE UNLOCKED
↓
nave pasa a Stage 2 usando el mapping existente
```

## Packs incluidos

Los ZIPs están en `packages/`:

```txt
gravedad_zero_mission_01_completion_pack_v1.zip
gravedad_zero_astronaut_projectiles_pack_v1.zip
gravedad_zero_unlock_asset_pack_v1.zip
nave_three_audio_pack_v2_refined.zip
```

## Orden recomendado de integración

1. Leer `docs/CODEX_MASTER_IMPLEMENTATION_BRIEF.md`.
2. Descomprimir los packs en una rama de trabajo.
3. Integrar primero lógica mínima de Mission 01.
4. Integrar HUD.
5. Integrar astronaut tool pulse y ship heavy shot.
6. Integrar reliquia/holograma.
7. Integrar audio.
8. QA con `docs/QA_MISSION_01_CHECKLIST.md`.

## Restricción fuerte

No cambiar el mapping existente de stages/vistas de nave. El cambio de stage debe llamar al sistema existente.
