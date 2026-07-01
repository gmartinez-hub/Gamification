# 03 — Companion Visual and Tutorial Spec

## Problema actual

El companion del deploy actual está técnicamente en 3D, pero se deformó visualmente y se alejó de la referencia aprobada.

## Visual aprobado

Usar como referencia principal:

```txt
visual-references/01_companion_reference_correct.png
```

Debe verse:

```txt
- cuerpo esférico/ovalado suave;
- blanco/perlado;
- lentes circulares violetas/cyan;
- ojos cerrados simpáticos;
- boca simple limpia;
- antenas cortas con tips naranjas;
- side lights;
- iluminación suave;
- 3D/volumétrico;
- sin sombra debajo;
- sin piso/base;
- sin halo circular;
- sin líneas raras.
```

## Técnica recomendada

No usar un robot “procedural abstracto” de líneas.

Usar híbrido 2.5D/3D:

```txt
3D shell + face decal/clean face layer
```

Implementación sugerida:

```js
robotHudGroup
  bodyShell: SphereGeometry/Ellipsoid
  facePanel: curved decal or flat plane slightly in front
  eyeRings: TorusGeometry or clean ring sprites
  eyes: simple clean curves / decal
  mouth: clean tiny decal or 3 short lines
  antennaStems: CylinderGeometry
  antennaTips: SphereGeometry with emissive warm color
  sideLights: small emissive capsules/spheres
  internalGlow: very subtle
```

## Importante

Si las líneas de cara se ven raras, usar sprites/decal para la cara en vez de LineSegments.

No dibujar wireframe.
No dibujar construcción geométrica.
No dibujar líneas diagonales.

## Comportamiento

```txt
- camera anchored top-right;
- hover/click target area estable;
- bob suave;
- tilt 3D muy sutil;
- pulse de estado;
- click abre/cierra panel tutorial.
```

## Companion tutorial

Al clickear el companion debe explicar:

```txt
qué objetivo tengo ahora
qué falta
qué modo usar
cómo interactuar
hacia dónde ir si corresponde
```

Estados y copy:

### Estado inicial

```txt
COMPANION / SISTEMA ONLINE

Objetivo:
Iniciá la misión para recuperar las gemas de ruta.

Controles:
Mové la nave con WASD o flechas.
Clickeá objetivos marcados para activar autoaim.
```

### Fragmentos

```txt
COMPANION / FRAGMENTOS

Objetivo actual:
Recuperá 3 fragmentos de señal.

Qué hacer:
Usá el astronauta para destruir fragmentos pequeños.
Clickeá cerca del fragmento: el autoaim corrige la orientación.
```

### Núcleos

```txt
COMPANION / NÚCLEOS

Objetivo actual:
Rompé {required} núcleo(s) inestable(s).

Qué hacer:
Volvé a la nave y usá disparo pesado.
Los núcleos necesitan más impacto.
```

### Reliquia

```txt
COMPANION / RELIQUIA

Objetivo actual:
Activá la reliquia liberada.

Qué hacer:
Acercate con el astronauta y tocá la señal.
```

### Rumbo / zona

```txt
COMPANION / RUMBO

Nuevo sector detectado.
Seguí el indicador de rumbo hasta la próxima zona.
```

### Velocidad

```txt
COMPANION / VELOCIDAD

Podés aumentar velocidad con el control de velocidad.
Más velocidad acelera el viaje, pero reduce margen de reacción.
```

### Final

```txt
COMPANION / FINAL

Gemas 3/3.
Activá la señal final para estabilizar la ruta.
```

## UI del panel

Debe ser simple:

```txt
Título
Objetivo actual
Qué hacer
Tip breve
```

No texto eterno.

## QA companion

Aprobar sólo si:

```txt
- se parece a la referencia 01;
- no hay sombra/base;
- no hay líneas raras;
- no parece sticker plano;
- al clickearlo explica objetivo actual;
- el tutorial cambia según estado;
- el panel no tapa targets importantes.
```
