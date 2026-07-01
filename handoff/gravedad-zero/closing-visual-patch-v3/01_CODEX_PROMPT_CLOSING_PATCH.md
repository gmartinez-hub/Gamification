# 01 — CODEX PROMPT / Closing Visual Patch v3

## Contexto

El último deploy muestra avances: más elementos en el mundo, planetas grandes, HUD de gemas y algunos detalles de disparo. Pero todavía no está aprobado visualmente.

Problemas detectados en captura:

```txt
- companion sigue teniendo sombra/base;
- companion parece sprite plano;
- HUD trunca objetivo largo;
- mundo tiene ruido visual de debris/triángulos/sprays;
- cuerpos sintéticos no siempre se leen como objetos Three;
- autoaim suma detalles, pero el modelo no rota físicamente hacia el aim;
- falta jerarquía premium.
```

## Objetivo del patch

Hacer un hotfix/cierre visual y de interacción.

No agregar otra mega feature. Cerrar calidad.

---

# A. Companion 3D real

Reemplazar el companion sprite como cuerpo principal por un companion armado con primitivas Three.

Debe ser camera-anchored, top-right, clickable.

Construcción mínima:

```txt
robotGroup
  bodySphere/headSphere blanco
  glassesLeft TorusGeometry violeta
  glassesRight TorusGeometry violeta
  eyes closed curve/LineSegments
  mouth curve pequeña
  sideDots/spheres
  antennaLeft CylinderGeometry + tip sphere
  antennaRight CylinderGeometry + tip sphere
  subtle internal glow
```

Eliminar completamente:

```txt
robot_shadow.png
shadow sprite
floor/base oval
orbit ring
halo
permanent particles
```

El robot puede conservar personalidad del diseño actual, pero debe sentirse 3D.

Usar sprite PNG sólo como referencia visual u opcional para face texture, no como cuerpo plano principal.

---

# B. Zero-G Aim Orientation

El modelo debe rotar apuntando al aim.

No alcanza con cambiar dirección/sprite ni con mostrar reticle/línea.

Implementar:

```txt
calcular angle actor → target
elegir sprite/dirección base más cercana
rotar actorGroup.z hacia el ángulo exacto
usar damped spring / inertia
overshoot leve
corrección suave
spray/thruster durante rotación
slow motion
fire cuando la orientación sea legible
recoil opuesto al disparo
hit stop en impacto
ease back a idle
```

Aplicar a astronauta y nave.

---

# C. World Visual Hierarchy

Reducir ruido visual.

```txt
- bajar 40–60% debris chico visible;
- eliminar triangulitos random si no pertenecen a un objeto;
- bajar opacidad de decorativos secundarios;
- mantener planetas grandes;
- crear 3–5 landmarks sintéticos claros por zona;
- hacer cuerpos sintéticos como core + ring + shards orbitando;
- no agregar más nebulosas.
```

---

# D. HUD

No truncar textos.

Cambiar objetivo largo por layout stackeado:

```txt
MISSION 01
CAMPO INESTABLE

FRAGMENTOS 0/3
NÚCLEOS 0/1
GEMAS 0/3
```

Para stage 2/3 ajustar núcleos:

```txt
NÚCLEOS 0/2
NÚCLEOS 0/3
```

---

# E. Asset Usage

Antes de tocar mundo, revisar assets existentes.

Priorizar:

```txt
three_space_assets_bundle_v2
three_space_assets_v1
unlock asset pack
mission completion pack
astronaut projectiles pack
aim assist pack
robot companion audio/panel assets
nave audio pack
```

Usar assets como:

```txt
planet materials
moon materials
synthetic body materials
gravity nodes
relic fragments
broken gates
thruster sprays
final shockwave
aim rotation streaks
```

No usarlos como stickers planos ni overlays random.

---

# F. QA evidence

Al final entregar:

```txt
URL deploy
commit SHA
resumen de archivos modificados
captura companion 3D sin sombra
captura HUD legible
captura mundo con menos ruido
video/captura aim rotando hacia target
checklist QA completado
bugs conocidos
```

## Commit sugerido

```txt
Polish Gravedad Zero visual hierarchy and zero-g aim orientation
```
