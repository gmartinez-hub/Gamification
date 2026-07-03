# 04 — Companion Visual Fix

## Problema

El companion actual está técnicamente 3D, pero todavía se aleja del original por colores, exceso de glow y expresión reconstruida con demasiadas piezas.

## Objetivo

Hacerlo más parecido al original:

```txt
simple
geométrico
cute
blanco/lavanda
lentes violeta/magenta
ojos simples
boca pequeña
sin halo/spray
sin sombra/base
```

## Cambios recomendados

### Colores

```txt
body: #F3F5FF / #E9ECFF
face: #F8F5FF
lens outer: violeta profundo + magenta, no cyan dominante
eyes: violeta oscuro
mouth: gris azulado suave
antenna stems: violeta → magenta
antenna tips: naranja cálido
side lights: magenta suave
```

### Simplificar expresión

```txt
- Reducir boca: que no parezca labios.
- Ojos más simples, arcos más limpios.
- Lentes más finos y menos brillantes.
- Bajar glow cyan.
- Mantener el cuerpo esférico/ellipsoid.
```

### Opción de máxima fidelidad

Si la cara geométrica sigue deformando:

```txt
- mantener cuerpo 3D;
- crear un face decal/sprite frontal simple para ojos+lentes+boca;
- antenas y cuerpo sí quedan 3D;
- usar la referencia como color/forma source of truth.
```

## QA

```txt
[ ] Se parece al original, no a una mascota nueva.
[ ] Colores más suaves y fieles.
[ ] Boca chica/simple.
[ ] Ojos/lentes limpios.
[ ] No hay halo/spray alrededor del companion.
[ ] No hay sombra/base.
```
