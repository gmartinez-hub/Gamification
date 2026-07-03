# 05 — Autoaim and Shot FX

## Problema

El sistema de puntería ya está bien encaminado, pero visualmente todavía aparecen líneas/halo/spray de baja calidad.

## Objetivo

Mantener la lógica actual:

```txt
- rango;
- % éxito;
- willHit;
- missPoint;
```

Pero mejorar el lenguaje visual.

## Assets nuevos

```txt
assets/runtime/gravedad-zero/vfx/vfx_impact_ring_strip.png
assets/runtime/gravedad-zero/vfx/vfx_speed_streaks_strip.png
assets/runtime/gravedad-zero/vfx/vfx_gem_pickup_burst_strip.png
```

## Cambios

### Autoaim

Reemplazar lo que se lea como spray/halo barato por:

```txt
- reticle limpio;
- campo de orientación cerca del actor;
- arco corto de orientación;
- línea de trayectoria elegante;
- feedback de % éxito cerca del companion o mini-label.
```

### Disparo

Acierto:

```txt
- beam/trail limpio;
- impacto con `vfx_impact_ring_strip`;
- micro shockwave;
- fragmentos sutiles.
```

Desvío/miss:

```txt
- trail curvo u offset hacia `missPoint`;
- fade limpio;
- sin explosión grande;
- companion informa DESVÍO.
```

Gem pickup:

```txt
- usar `vfx_gem_pickup_burst_strip`;
- no línea dura de color;
- burst corto + sparkle premium.
```

## Reglas

```txt
No usar líneas diagonales random.
No usar wireframe/cages visibles si parecen bug.
No usar spray grande.
El campo de orientación va cerca del actor, no encima del target.
```

## QA

```txt
[ ] Al disparar no aparece halo/spray de mala calidad.
[ ] Las líneas/trails se ven premium.
[ ] Impacto usa ring/pulse.
[ ] Miss/desvío se entiende.
[ ] Gem pickup se ve mejor.
```
