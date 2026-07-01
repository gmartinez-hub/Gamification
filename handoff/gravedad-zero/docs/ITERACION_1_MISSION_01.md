# Iteración 1 — Gameplay / Mission 01

## Objetivo

Cerrar una vertical slice jugable de Gravedad Zero.

## Loop

```txt
Stage 1
→ astronauta rompe 3 asteroides chicos
→ aparece 1 obstáculo grande
→ nave destruye obstáculo grande
→ aparece reliquia/holograma
→ astronauta toca reliquia
→ STAGE UNLOCKED
→ nave pasa a Stage 2 usando transición existente
```

## Packs

```txt
gravedad_zero_mission_01_completion_pack_v1.zip
gravedad_zero_astronaut_projectiles_pack_v1.zip
gravedad_zero_unlock_asset_pack_v1.zip
gravedad_zero_aim_assist_fx_contracts_pack_v1.zip
nave_three_audio_pack_v2_refined.zip
```

## Reglas

- No cambiar el mapping existente de nave/stages.
- No convertir el juego en shooter genérico.
- No producir todavía 9 animaciones de disparo.
- Usar movimiento 2.5D existente + auto-target + FX Three.
- HUD textual en HTML/CSS.
- Audio sincronizado por eventos.

## Aim Assist

```txt
click target válido
→ target lock
→ slow motion
→ orientación zero gravity
→ fire cue
→ impacto
→ exit slow motion
```

Targets válidos:

```txt
astronaut_phase       → small_asteroid
large_obstacle_phase  → large_obstacle
relic_phase           → relic
```

## Criterio de done

- Mission 01 se completa sin botón manual de stage.
- El fire cue coincide con sonido y visual.
- La nave pasa a Stage 2 con la transición actual.
