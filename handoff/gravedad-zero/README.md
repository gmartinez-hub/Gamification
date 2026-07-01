# Gravedad Zero — Handoff Codex v2

Esta carpeta consolida las dos iteraciones acordadas para que Codex las integre sin mezclar conceptos ni pisar el runtime actual.

## Rama sugerida

```txt
feature/gravedad-zero-handoff-packs
```

## Importante

Esta carpeta es material de handoff. No debería mergearse a producción tal cual si sólo contiene ZIPs e instrucciones.

Codex debería usarla como input, descomprimir los packs y luego integrar en una branch propia de implementación.

## Iteraciones

### Iteración 1 — Gameplay / Mission 01

Objetivo: cerrar una vertical slice jugable.

Packs:

```txt
gravedad_zero_mission_01_completion_pack_v1.zip
gravedad_zero_astronaut_projectiles_pack_v1.zip
gravedad_zero_unlock_asset_pack_v1.zip
gravedad_zero_aim_assist_fx_contracts_pack_v1.zip
nave_three_audio_pack_v2_refined.zip
```

### Iteración 2 — Menú + Robot Companion HUD

Objetivo: sumar capa de presentación, guía e indicadores.

Pack:

```txt
gravedad_zero_robot_companion_hud_pack_v1.zip
```

## Orden recomendado

1. Implementar Mission 01.
2. Validar que el loop se pueda completar.
3. Integrar Aim Assist.
4. Integrar Robot Companion HUD y menú.
5. QA visual/audio.
