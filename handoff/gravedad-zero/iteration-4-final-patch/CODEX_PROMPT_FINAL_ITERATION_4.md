# CODEX PROMPT — GRAVEDAD ZERO / Iteration 4 Final v2

## Objetivo

Implementar una sola versión/deploy que cierre la demo jugable completa y que además use explícitamente las texturas/assets existentes no aprovechados para crear nuevos planetas, lunas y cuerpos sintéticos wrappeados.

## Reglas globales

```txt
Un solo deploy.
Un solo QA posterior.
No dividir en varias iteraciones.
No agregar más nebulosas.
No generar assets nuevos salvo necesidad extrema.
Usar texturas y audios existentes.
Mantener fondo oscuro actual.
Priorizar mundo procedural Three, no fondo 2D.
No volver automáticamente a Stage 1 después del final.
```

---

# 1. Asset Usage Mandatory Pass

Antes de implementar el mundo procedural, hacer inventario de assets existentes:

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

Reutilizar texturas poco usadas como materiales/detalles de cuerpos Three.

Crear explícitamente:

```txt
planetas adicionales
lunas
cuerpos sintéticos
nodos de gravedad
fragmentos de reliquia
gates orbitales rotos
núcleos tecnológicos
debris wrappeado
```

No usar estas texturas como nebulosas. Usarlas como objetos navegables con profundidad.

---

# 2. Procedural Free Navigation

Implementar navegación libre procedural.

El jugador debe poder navegar:

```txt
norte
sur
este
oeste
diagonales
```

Objetivo:

```txt
aprox. 3 minutos de navegación por cada punto cardinal sin repetición evidente
```

Usar:

```js
ProceduralWorld
getChunkKey(chunkX, chunkY)
seededRandom(chunkX, chunkY, stageIndex)
ensureChunksAroundPlayer()
releaseFarChunks()
spawnChunkObjects()
updateChunkObjects()
wrapWorldObject()
```

Configuración sugerida:

```txt
chunkSize: 56–72 world units
visibleRadius: 2 o 3 chunks
active grid: 5x5 o 7x7 chunks
pooling/reuse
seed determinístico por chunk
```

---

# 3. World / Three Wrapped Bodies

Crear objetos usando geometría Three real o fake-3D, no stickers planos.

Tipos:

```txt
planet_far
planet_mid
moon
synthetic_core
signal_body
orbital_relic_fragment
broken_gate
tech_moon
gravity_node
debris_cluster
foreground_shards
```

Geometrías:

```txt
SphereGeometry
IcosahedronGeometry
TetrahedronGeometry
TorusGeometry
LineSegments
Points
InstancedMesh
MeshStandardMaterial
MeshBasicMaterial additive sólo para detalles
```

Cada cuerpo debe tener:

```txt
rotación
translación visible
órbita/drift
parallax
depth
wrap
stage affinity
chunk ownership
```

Los planetas no deben sólo rotar: deben trasladarse o tener drift visible.

Los cuerpos sintéticos deben aprovechar texturas existentes del repo/packs.

---

# 4. Mission Zones

Crear zonas:

```txt
Stage 1 Zone
Stage 2 Zone
Stage 3 Zone
Final Zone
```

Flow:

```txt
completar zona
→ capturar gema
→ HUD actualiza
→ companion indica rumbo
→ siguiente zona queda activa
```

---

# 5. Stage Flow + HUD

Flow completo:

```txt
Stage 1 → gema 1
Stage 2 → gema 2
Stage 3 → gema 3
Final → señal final / mission complete
```

Reglas:

```txt
Stage 1 → 3 fragmentos + 1 núcleo + reliquia
Stage 2 → 3 fragmentos + 2 núcleos + reliquia
Stage 3 → 3 fragmentos + 3 núcleos + reliquia final
```

HUD:

```txt
GEMAS 0/3
GEMAS 1/3
GEMAS 2/3
GEMAS 3/3
SEÑAL FINAL ADQUIRIDA
```

---

# 6. Wording Premium

No usar:

```txt
3 SEÑALES MENORES
OBSTÁCULO MAYOR
asteroides chicos
objetivos grandes
```

Usar:

```txt
RECUPERÁ 3 FRAGMENTOS DE SEÑAL
ROMPÉ 1/2/3 NÚCLEOS INESTABLES
ACTIVÁ LA RELIQUIA
GEMAS
RUMBO
SECTOR
```

Final:

```txt
SEÑAL FINAL ADQUIRIDA
RUTA ESTABILIZADA
MISSION COMPLETE
```

---

# 7. Companion Clean HUD Entity

El companion no forma parte del mundo procedural.

Debe ser camera-anchored.

Eliminar:

```txt
halo circular
anillo orbital
partículas permanentes alrededor
sombra/piso
```

Mantener:

```txt
sprite limpio
bob vertical suave
micro tilt
leve reacción al pointer
mini glow interno casi imperceptible
sonido al click
panel/counters
```

---

# 8. Zero Gravity Autoaim v2

El autoaim no está aprobado si sólo muestra reticle/línea.

Debe incluir:

```txt
cámara lenta clara
actor rota hacia target
spray/jet lateral
fire cue
recoil inverso
hit stop breve
impacto
salida slow motion
```

Astronauta:

```txt
astronautGroup.rotation.z
drift lateral
tether curve/reaction
orientation spray
```

Nave:

```txt
shipGroup.rotation.z / tilt
thruster spray
camera compression/drift
heavy shot
```

---

# 9. Audio Requirements

No dejar mundo procedural silencioso.

Implementar AudioEventMap para:

```txt
engine_idle
engine_move
engine_boost
speed_whoosh
long_travel_low_rumble
route_detected_ping
mission_zone_enter
fragment_collected
core_hit
core_destroyed
relic_reveal
gem_acquired
gem_counter_update
stage_route_unlocked
target_lock
slow_motion_enter
zero_g_orientation_spray
micro_thruster_burst
fire_release
recoil_hit
impact_hit_stop
slow_motion_exit
synthetic_body_near_hum
gravity_node_pulse
final_relic_touch
final_core_collapse
final_shockwave
final_energy_beam
final_signal_acquired
mission_complete_resolve
```

Usar assets existentes primero.
Usar WebAudio procedural para pings/sprays/hums si no hay WAV.

---

# 10. Final Sequence

Final elegante, no grotesco:

```txt
astronauta toca reliquia final
→ slow motion
→ core collapse
→ silencio/hit stop breve
→ flash cyan/blanco
→ shockwave limpia
→ partículas en espiral
→ beams hacia nave
→ nave glow
→ SEÑAL FINAL ADQUIRIDA
→ RUTA ESTABILIZADA
→ MISSION COMPLETE
```

Commit sugerido:

```txt
Implement Gravedad Zero procedural world and final demo flow
```
