# 06 — Turbo FX

## Objetivo

Que al mantener `F` se sienta aceleración real.

## Asset nuevo

```txt
assets/runtime/gravedad-zero/vfx/vfx_turbo_flame_strip.png
assets/runtime/gravedad-zero/vfx/vfx_speed_streaks_strip.png
```

## Cambios

Cuando `speedState.turboActive === true`:

```txt
- mostrar flame/energy jet desde motores;
- aumentar engine glow;
- aumentar speed streaks;
- subir parallax;
- audio boost;
- pequeño camera compression/shake controlado.
```

## Intensidad por gemas

```txt
0 gemas: turbo limitado, flame chico.
1 gema: Turbo x2, flame medio.
2 gemas: Turbo x3, flame más largo.
3 gemas: Warp Pulse, burst cinematográfico.
```

## QA

```txt
[ ] F activa turbo.
[ ] Turbo se ve, no sólo se siente.
[ ] Hay fuego/energía detrás de nave.
[ ] No tapa la nave.
[ ] No parece spray barato.
[ ] Cambia según gemas.
```
