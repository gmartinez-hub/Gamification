# 03 — Organic Procedural Spawn Rules

## Problema

Queremos que aparezcan más mundos/cuerpos definidos, pero no deben aparecer de golpe en cámara ni en la cara del jugador.

## Regla central

```txt
Todo cuerpo procedural nuevo debe nacer fuera del viewport visible.
```

Luego debe entrar por:

```txt
- navegación del jugador;
- parallax;
- drift;
- aproximación a una región/sector;
- transición gradual de opacidad/escala.
```

## No hacer

```txt
No spawn en el centro.
No spawn encima de la nave.
No spawn al lado del companion.
No spawn a menos de un margen seguro del viewport.
No aparecer con opacity 1 instantáneo.
No teletransportar planetas dentro de cámara.
```

## Spawn bands

Definir bandas de spawn alrededor del viewport.

Ejemplo conceptual:

```js
const ORGANIC_SPAWN_BANDS = {
  offscreenNear: {
    minViewportMargin: 1.15,
    maxViewportMargin: 1.75,
    useFor: ["secondaryBodies", "debris", "smallSynthetic"]
  },
  offscreenFar: {
    minViewportMargin: 1.75,
    maxViewportMargin: 2.80,
    useFor: ["heroBodies", "vividBodies", "landmarks"]
  }
}
```

## Margen seguro

Para cada objeto nuevo:

```txt
screenDistanceFromCenter debe ser mayor al borde visible + margen.
```

Ejemplo:

```js
function isOutsideViewportWithMargin(point, radius, margin = 0.35) {
  return (
    point.x < -viewport.aspect - radius - margin ||
    point.x > viewport.aspect + radius + margin ||
    point.y < -1 - radius - margin ||
    point.y > 1 + radius + margin
  )
}
```

## Reveal orgánico

Cuando un cuerpo entra:

```txt
- opacity entra de 0 a targetOpacity en 1.2–2.4s;
- escala entra de 0.92 a 1;
- rotación ya viene activa;
- drift/parallax lo trae hacia la escena;
- no hay pop.
```

## Vivid body reveal

Los planetas/cuerpos definidos deben aparecer como descubrimiento:

```txt
1. primero se ve borde/glow parcial entrando desde fuera;
2. luego se ve textura definida;
3. después queda como landmark navegable;
4. si el jugador se aleja, sale naturalmente por borde.
```

## Región y navegación

El stage profile debe decidir qué puede aparecer, pero la navegación decide cuándo se ve.

```txt
Stage desbloquea pool.
Navegación revela cuerpos.
```

## QA

```txt
[ ] Ningún planeta aparece de golpe dentro de cámara.
[ ] Ningún cuerpo aparece encima de la nave.
[ ] Al avanzar, los cuerpos entran desde bordes.
[ ] Hay fade/scale-in orgánico.
[ ] Los landmarks se descubren viajando.
[ ] No hay pop-in brusco.
```
