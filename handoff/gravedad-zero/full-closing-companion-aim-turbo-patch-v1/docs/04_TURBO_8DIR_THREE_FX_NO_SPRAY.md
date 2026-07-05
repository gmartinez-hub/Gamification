# 04 — Turbo 8 Direction Three FX No Spray

## Objetivo

F debe sentirse como aceleración/energía 3D y no como spray.

## Assets

```txt
assets/turbo_8dir/speed_wake_8dir_atlas_4x2_512.png
assets/turbo_8dir/warp_compression_8dir_atlas_4x2_512.png
assets/turbo_8dir/directional_engine_glow_8dir_atlas_4x2_512.png
```

Orden de direcciones en atlas:

```txt
N, NE, E, SE, S, SW, W, NW
```

## Implementación

Crear:

```txt
turboFxGroup
  wakeSprite
  compressionSprite
  engineGlowSprite
```

Seleccionar frame según dirección actual de nave:

```js
const dirIndex = directionTo8WayIndex(state.direction);
frame.offset.set((dirIndex % 4) / 4, 1 - Math.floor(dirIndex / 4) / 2);
frame.repeat.set(1 / 4, 1 / 2);
```

## Reglas

- No partículas radiales.
- No nube detrás de la nave.
- Efecto siempre alineado a la dirección.
- Stage/gemas escalan intensidad, no cantidad de ruido.

## Aceptación

```txt
[ ] En las 8 direcciones se entiende el boost.
[ ] No parece spray.
[ ] No tapa la nave.
[ ] Al soltar F desaparece limpio.
```
