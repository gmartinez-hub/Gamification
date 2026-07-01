# 05 — Procedural World and Planets Spec

## Problema actual

El código tiene estructura procedural, pero la experiencia no se siente procedural.

El mapa sigue sintiéndose chico.

## Objetivo

Crear una sensación real de espacio navegable:

```txt
mínimo 3 minutos hacia norte
mínimo 3 minutos hacia sur
mínimo 3 minutos hacia este
mínimo 3 minutos hacia oeste
```

sin repetición obvia y sin que se sienta vacío.

## Dirección visual

Usar:

```txt
visual-references/03_world_scale_more_planets_concept.png
```

como referencia de “más vida y escala”.

## Estructura recomendada

No usar sólo random chunks.

Usar:

```txt
Directed Regions + Procedural Chunks
```

Regiones:

```txt
NORTH_REGION
SOUTH_REGION
EAST_REGION
WEST_REGION
FINAL_REGION
```

Cada región define:

```txt
palette
planet families
synthetic landmark families
density
debris profile
mission zone probability
audio intensity
speed feeling
```

Los chunks rellenan, pero las regiones dan identidad.

## Objetos visibles por viewport

Objetivo de composición:

```txt
1 planeta/luna grande o mediano
1 landmark sintético claro
2–4 cuerpos medianos
debris chico moderado
targets claramente legibles
```

Evitar:

```txt
40 debris chicos random
triángulos sueltos
sprays decorativos
líneas wireframe raras
```

## Más planetas y cuerpos

Crear más familias:

```txt
planet_ocean_large
planet_dark_giant
planet_gas_far
mechanical_moon
tech_moon
synthetic_core
gravity_node
broken_gate
relic_fragment_cluster
orbital_station_body
asteroid_belt_patch
```

## Assets existentes

Usar texturas existentes como materiales reales en geometrías Three:

```txt
SphereGeometry
IcosahedronGeometry
TetrahedronGeometry
TorusGeometry
InstancedMesh
Points sólo para polvo/estrellas, no como objeto principal
```

## Procedural runtime

Requerido:

```js
ProceduralWorldDirector
RegionConfig
ChunkManager
ObjectPool
ensureChunksAroundCamera()
releaseFarChunks()
spawnRegionChunk()
spawnLandmark()
spawnPlanet()
spawnSyntheticBody()
```

## Tamaño y duración

Ajustar escala para que el jugador no sienta wrap/repetición rápida.

Recomendación:

```txt
chunkSize: 96–144 world units
visibleRadius: 3
releaseRadius: 4
displayScale: calibrar para que cuerpos no desaparezcan
regionLength: equivalente a 3+ minutos de navegación normal
```

## QA mundo

Validar con cronómetro:

```txt
3 minutos norte
3 minutos sur
3 minutos este
3 minutos oeste
```

Durante cada trayecto:

```txt
- no se corta el mundo;
- aparecen cuerpos nuevos;
- aparece al menos 1 landmark grande por minuto;
- no se repite el mismo patrón obvio;
- no hay vacío prolongado;
- no hay saturación visual.
```
