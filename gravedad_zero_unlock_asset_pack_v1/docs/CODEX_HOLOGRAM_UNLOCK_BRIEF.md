# Codex Brief — Gravedad Zero Hologram Unlock Event v1

## Objetivo

Implementar un evento especial de desbloqueo de stage.

El jugador no cambia de stage por menú. Cambia cuando:
1. el astronauta rompe 3 asteroides chicos,
2. la nave destruye los obstáculos grandes del stage,
3. aparece una reliquia holográfica,
4. el astronauta toca la reliquia,
5. la energía viaja a la nave,
6. se avanza al siguiente stage usando el mapeo de stages/vistas ya existente.

## Reglas por stage

- Stage 1: 3 asteroides chicos + 1 obstáculo grande.
- Stage 2: 3 asteroides chicos + 2 obstáculos grandes.
- Stage 3: 3 asteroides chicos + 3 obstáculos grandes.

Los obstáculos grandes no tienen que ser siempre asteroides:
- Stage 1: asteroide grande con núcleo violeta.
- Stage 2: mini planeta artificial / núcleo mecánico.
- Stage 3: estructura orbital / planeta artificial oscuro.

## Holograma

- Forma: gema / holograma.
- Tono: sci-fi elegante, reliquia del espacio.
- Tamaño: 150% del astronauta.
- Color por ahora: mismo color en todos los stages.
- Interacción: astronauta lo toca.
- Resultado: stage upgrade de nave ya existente.

## Estados sugeridos

```js
hidden_inside_large_obstacle
reveal
wow_expansion
idle_collectible
astronaut_touch
energy_transfer_to_ship
stage_unlock
```

## Timing sugerido

- Ruptura obstáculo grande: 0.8s.
- Reveal reliquia: 1.4s.
- Wow expansion: 0.65s.
- Idle collectible: hasta contacto.
- Touch/absorción: 0.8s.
- Stage transition: 1.2s.

## Implementación visual recomendada

No resolver como una sola imagen estática.

Usar:
- core de reliquia como Sprite/Plane transparente o mesh procedural;
- 2 anillos holográficos con additive blending;
- glow sprite;
- scanline overlay;
- particles atlas;
- shockwave y flash en stage unlock.

## Assets incluidos en este pack

```txt
assets/hologram/relic_hologram_greenscreen.png
assets/hologram/relic_hologram_alpha_full.png
assets/hologram/relic_hologram_alpha_cropped.png
assets/hologram/relic_orbit_ring_01.png
assets/hologram/relic_orbit_ring_02.png
assets/hologram/relic_aura_glow.png
assets/hologram/relic_scanlines_overlay.png
assets/hologram/relic_particles_atlas_4x4.png
assets/vfx/stage_unlock_shockwave_ring.png
assets/vfx/stage_unlock_flash_glow.png
assets/vfx/special_asteroid_core_cracks_overlay.png
```

## Nota

No tocar el sistema de stages/vistas de nave. Este evento sólo debe llamar al cambio de stage ya mapeado.
