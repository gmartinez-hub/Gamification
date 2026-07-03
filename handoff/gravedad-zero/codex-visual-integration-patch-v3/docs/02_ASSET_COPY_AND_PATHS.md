# 02 — Asset Copy and Paths

## Copiar assets al repo

Copiar desde este pack:

```txt
assets/planets/*.png
assets/vfx/*.png
```

A:

```txt
assets/runtime/gravedad-zero/planets/
assets/runtime/gravedad-zero/vfx/
```

## Assets planetarios incluidos

```txt
planet_ocean_prime_albedo.png
planet_dark_crater_albedo.png
planet_nebula_core_albedo.png
planet_mechanical_moon_albedo.png
planet_aurora_gas_albedo.png
planet_deep_dark_emissive_overlay.png
```

## VFX incluidos

```txt
vfx_turbo_flame_strip.png
vfx_speed_streaks_strip.png
vfx_impact_ring_strip.png
vfx_gem_pickup_burst_strip.png
```

## Nota

Los VFX tienen fondo negro. Usarlos con:

```js
blending: THREE.AdditiveBlending,
transparent: true,
depthWrite: false
```

Si hace falta mejorar recorte, usar `alphaTest` bajo o generar máscara desde luminancia.
