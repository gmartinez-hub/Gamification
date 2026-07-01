# 06 — World Visual Hierarchy Spec

## Problema

El mundo ganó objetos, pero hay ruido visual: muchos debris/triángulos/sprays sin jerarquía. Se ve más lleno, pero no más premium.

## Objetivo

Reducir ruido y crear landmarks claros.

## Jerarquía

Orden de lectura:

```txt
1. Nave / astronauta / targets
2. Planeta grande o landmark principal
3. Cuerpos sintéticos importantes
4. Debris/asteroides medianos
5. Polvo/estrellas/fx secundarios
```

## Cambios

```txt
reducir 40–60% debris pequeño
bajar opacidad decorativa secundaria
eliminar triangulitos sueltos que no pertenezcan a un objeto
evitar sprays decorativos random
mantener fondo oscuro
no agregar nebulosas
```

## Landmarks por región

Cada zona visible debería tener pocos objetos memorables, no muchas piezas pequeñas.

Familias:

```txt
planet_or_moon_large
mechanical_moon
synthetic_core
gravity_node
broken_gate
relic_fragment_cluster
wreck_module
```

## Recetas de objetos

### Synthetic Core

```txt
SphereGeometry con material/emissive
TorusGeometry fino o segmented ring
3–6 shards orbitando
pulsing scale sutil
slow rotation
```

### Gravity Node

```txt
IcosahedronGeometry o TetrahedronGeometry
LineSegments
Points orbitando
hum cercano
pulse cada varios segundos
```

### Broken Gate

```txt
TorusGeometry parcial/segmentos
fragmentos modulares alrededor
rotación lenta
debris hijo con órbita
```

### Mechanical Moon

```txt
SphereGeometry con textura planet_mech/darkcrater
normal map
emissive bajo
drift lateral visible
```

## Cantidad visible

Sugerido:

```txt
planetas/lunas grandes: 2–4 visibles
landmarks sintéticos: 3–5 visibles
debris medianos: 12–24 visibles
debris chicos: 30–60 max con pooling/instancing
```

No llenar cada sector con 120 piezas visibles si eso rompe lectura.

## QA

Aprobar sólo si:

```txt
el mundo se ve más claro que antes
hay menos ruido
hay landmarks reconocibles
los targets siguen legibles
la nave sigue siendo protagonista
```
