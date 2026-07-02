# 04 — Stage World Profiles and Progressive Vivid Bodies

## Objetivo

Que los mundos definidos/luminosos aparezcan paulatinamente según stage y navegación.

## Regla

No basta con fondo grisado. Cada stage debe tener cuerpos visibles y definidos.

## Profiles

```txt
Stage 1:
- mundo celeste/ocean limpio.
- pocos cuerpos.
- introducción.

Stage 2:
- network planets.
- lunas mecánicas.
- gates orbitales.
- más violeta/cyan.

Stage 3:
- dark crater.
- planetas con grietas magenta.
- núcleos sintéticos.
- más densidad.

Final:
- reliquia/portal.
- cuerpos alineados.
- energía blanca/cyan.
```

## Vivid Bodies

Crear categoría `vividBody`.

Un vivid body:

```txt
- spawnea fuera de cámara;
- tiene textura definida;
- no es gris opaco;
- tiene opacity alta;
- entra orgánicamente al navegar;
- rota;
- tiene drift;
- se percibe como cuerpo del mundo, no decoración plana.
```

## Composición

En un viewport ideal:

```txt
1 cuerpo protagonista o semi-protagonista definido;
1–2 cuerpos medianos definidos;
fondos más sutiles;
debris moderado;
targets legibles.
```

## Progressive fill

La pantalla puede llenarse progresivamente con el stage:

```txt
Stage 1: 35–45% densidad visual
Stage 2: 50–65%
Stage 3: 65–80%
Final: 70–85% pero más cinematográfico, menos debris random
```

## Importante

Que se llene no significa ruido.

Priorizar:

```txt
landmarks
planetas legibles
cuerpos sintéticos claros
profundidad
```

sobre:

```txt
debris chico
puntos
líneas raras
spray
```

## QA

```txt
[ ] Stage 1 tiene estética limpia.
[ ] Stage 2 cambia visualmente.
[ ] Stage 3 cambia visualmente.
[ ] Final cambia visualmente.
[ ] Hay cuerpos definidos nuevos al navegar.
[ ] Entran desde afuera de cámara.
[ ] No aparecen de golpe.
[ ] No son todos grises.
```
