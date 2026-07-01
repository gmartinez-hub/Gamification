# Asset Usage / Synthetic Bodies — Mandatory Pass

## Objetivo

Asegurar que Iteration 4 no sólo genere mundo procedural, sino que use explícitamente las texturas y assets ya disponibles que todavía no están bien aprovechados.

No generar texturas nuevas.

## Regla

Antes de implementar el mundo procedural, hacer un inventario rápido de assets disponibles en:

```txt
assets/runtime/three-textures/
assets/runtime/manifest.json
gravedad_zero_unlock_asset_pack_v1/
gravedad_zero_mission_01_completion_pack_v1/
gravedad_zero_astronaut_projectiles_pack_v1/
gravedad_zero_aim_assist_fx_contracts_pack_v1/
gravedad_zero_robot_companion_hud_pack_v1/
nave_three_audio_pack_v2_refined/
```

Identificar texturas que hoy están cargadas pero poco usadas o sólo usadas como FX/UI, y reutilizarlas como materiales o detalles de cuerpos Three.

## Uso requerido

Crear por lo menos estas familias nuevas de cuerpos:

```txt
1. Planetas / lunas adicionales
2. Cuerpos sintéticos
3. Nodos de gravedad
4. Fragmentos de reliquia
5. Gates orbitales rotos
6. Núcleos tecnológicos
7. Debris wrappeado
```

## Cuerpos naturales

Usar texturas tipo:

```txt
ocean-color
ocean-world-bright
gas-giant
network-planet
dark-crater
asteroid-crater
asteroid-surface-neon
asteroid-surface-plates
asteroid-surface-wide
```

Como:

```txt
planet_far
planet_mid
moon
asteroid_body
crater_body
```

## Cuerpos sintéticos

Usar texturas de packs de reliquia/holograma/aim/projectiles como detalles o materiales de cuerpos:

```txt
relic_core_body
hologram_sphere
gravity_node
signal_orb
broken_gate
tech_core
energy_crystal_cluster
orbital_relic_fragment
```

Ejemplos de construcción Three:

```js
// Synthetic orb
SphereGeometry + material using hologram/relic texture
+ subtle emissive
+ one or two TorusGeometry rings
+ 3–6 small orbiting shards

// Broken gate
TorusGeometry partial/segmented
+ relic/energy material
+ LineSegments
+ small debris children

// Gravity node
IcosahedronGeometry or TetrahedronGeometry
+ additive inner glow
+ orbiting Points
+ slow pulsing scale
```

## Composición visual

No usar estos assets como nebulosas de fondo.

Usarlos como cuerpos navegables:

```txt
con profundidad
con rotación
con translación
con drift/orbit
con wrap
con chunk ownership
```

## Cantidades objetivo

Por zona visible/chunk grid:

```txt
planetas/lunas grandes: 4–8 visibles
cuerpos sintéticos medianos: 8–16 visibles
fragmentos/debris: 60–120 con pooling o instancing
nodos de gravedad / landmarks: 1–3 por región
```

## Stage affinity

Variar por stage:

```txt
Stage 1 → cuerpos más limpios, cyan/magenta suave
Stage 2 → más estructuras fracturadas / órbitas rotas
Stage 3 → cuerpos sintéticos inestables / núcleos más intensos
Final Zone → relic bodies alineados hacia nave
```

## Acceptance Criteria

No aprobar si:

```txt
el mundo sólo tiene los mismos planetas actuales
las texturas nuevas siguen sin usarse
los assets se usan sólo como overlays
los cuerpos parecen stickers planos
no hay translación visible
no hay objetos sintéticos wrappeados
```
