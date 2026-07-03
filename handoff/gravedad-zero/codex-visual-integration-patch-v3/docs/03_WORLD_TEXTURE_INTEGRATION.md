# 03 — World Texture Integration

## Problema actual

El repo ya tiene `STAGE_WORLD_PROFILES`, pero sigue usando mayormente texturas viejas. El resultado es que algunos cuerpos se ven definidos y muchos otros quedan opacos/grisados.

## Agregar a `worldTextures`

```js
const premiumWorldTextures = {
  oceanPrime: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_ocean_prime_albedo.png"),
  darkCraterPremium: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_dark_crater_albedo.png"),
  nebulaCore: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_nebula_core_albedo.png"),
  mechanicalMoonPremium: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_mechanical_moon_albedo.png"),
  auroraGas: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_aurora_gas_albedo.png"),
  deepDarkEmissiveOverlay: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_deep_dark_emissive_overlay.png"),
};
```

O integrarlos directamente dentro de `worldTextures`.

## Mapear por stage

### Stage 1

```txt
hero/vivid:
- oceanPrime

secondary:
- auroraGas
- oceanWorld actual
```

### Stage 2

```txt
hero/vivid:
- mechanicalMoonPremium

secondary:
- networkPlanet actual
- nebulaCore
```

### Stage 3

```txt
hero/vivid:
- darkCraterPremium
- deepDarkEmissiveOverlay como emissive/overlay donde aplique

secondary:
- craterWorld actual
- darkCrater actual
```

### Final

```txt
hero/vivid:
- nebulaCore
- deepDarkEmissiveOverlay
- relicCore/relicGlow existentes
```

## Ajuste de opacidad

Para `vividBody`:

```txt
target opacity: 0.82–0.95
emissiveIntensity: 0.18–0.42 según tipo
scale visible
fade-in orgánico
```

Para cuerpos de fondo:

```txt
opacity: 0.26–0.48
```

## Mantener spawn orgánico

No romper lo que ya existe:

```txt
- ORGANIC_SPAWN_BANDS
- placeProceduralBodyOffscreen()
- reveal/fade
```

Ningún planeta nuevo debe aparecer dentro de cámara de golpe.
