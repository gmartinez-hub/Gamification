# 06 — Speed System and Stage Progression Spec

## Objetivo

Dar sensación de velocidad y progresión sin volver injugable el juego.

Debe haber:

```txt
1. Velocidad base cómoda.
2. Progresión automática por stage.
3. Botón/control para subir velocidad.
4. Feedback visual y sonoro de mayor velocidad.
5. El mapa grande debe aprovechar esta velocidad.
```

## Control de velocidad

Agregar botón visible:

```txt
VELOCIDAD x1
VELOCIDAD x2
VELOCIDAD x3
```

o:

```txt
MODO CRUCERO
MODO IMPULSO
MODO WARP CORTO
```

Recomendación de UI:

```txt
Botón pequeño cerca de controles inferiores o HUD:
Velocidad x1.0 / x1.5 / x2.0
```

Atajos opcionales:

```txt
Shift = boost momentáneo
V = cambiar velocidad
```

## No confundir velocidad con caos

Aumentar velocidad debe afectar:

```txt
worldMoveSpeed
parallaxSpeed
ship engine intensity
speed lines
star streaks
travel rumble
camera compression
planet drift apparent
```

Pero no debe:

```txt
romper el control
tapar targets
hacer imposible el autoaim
generar ruido visual excesivo
```

## Stage tuning

Crear config centralizada:

```js
const STAGE_TUNING = [
  {
    stage: 0,
    label: "Stage 1",
    shipMaxSpeed: 1.00,
    acceleration: 1.00,
    worldMoveSpeed: 1.00,
    parallaxSpeed: 1.00,
    targetSpeed: 1.00,
    debrisSpeed: 1.00,
    spawnDensity: 1.00,
    audioIntensity: 0.85,
    speedLines: 0.75
  },
  {
    stage: 1,
    label: "Stage 2",
    shipMaxSpeed: 1.12,
    acceleration: 1.10,
    worldMoveSpeed: 1.16,
    parallaxSpeed: 1.14,
    targetSpeed: 1.10,
    debrisSpeed: 1.12,
    spawnDensity: 1.06,
    audioIntensity: 1.00,
    speedLines: 1.00
  },
  {
    stage: 2,
    label: "Stage 3",
    shipMaxSpeed: 1.26,
    acceleration: 1.18,
    worldMoveSpeed: 1.34,
    parallaxSpeed: 1.30,
    targetSpeed: 1.18,
    debrisSpeed: 1.24,
    spawnDensity: 1.10,
    audioIntensity: 1.14,
    speedLines: 1.28
  },
  {
    stage: 3,
    label: "Final",
    shipMaxSpeed: 1.34,
    acceleration: 1.22,
    worldMoveSpeed: 1.46,
    parallaxSpeed: 1.38,
    targetSpeed: 1.10,
    debrisSpeed: 1.20,
    spawnDensity: 1.02,
    audioIntensity: 1.22,
    speedLines: 1.45
  }
]
```

## User speed multiplier

Crear:

```js
const SPEED_MODES = [
  { label: "x1", multiplier: 1.0, audio: 1.0, streaks: 1.0 },
  { label: "x2", multiplier: 1.45, audio: 1.15, streaks: 1.25 },
  { label: "x3", multiplier: 1.85, audio: 1.30, streaks: 1.55 }
]
```

No usar x3 como velocidad literal si rompe gameplay. Es etiqueta de sensación.

## Fórmula

```js
effectiveWorldSpeed =
  baseWorldMoveSpeed *
  currentStageTuning.worldMoveSpeed *
  currentSpeedMode.multiplier
```

## Transiciones

No cambiar de golpe.

```js
currentSpeedMultiplier = lerp(currentSpeedMultiplier, targetSpeedMultiplier, 1 - pow(0.001, dt))
currentStageTuning = lerpTuning(currentStageTuning, targetStageTuning, 0.04)
```

## Feedback visual de velocidad

Al subir velocidad:

```txt
- engine glow más fuerte;
- streaks más visibles;
- estrellas se estiran muy sutilmente;
- cámara comprime apenas;
- planetas/parallax se sienten más vivos;
- pequeño texto: VELOCIDAD x2;
- companion dice tip.
```

## QA velocidad

Aprobar sólo si:

```txt
- hay botón visible;
- se puede cambiar velocidad;
- la velocidad se siente diferente;
- Stage 2 > Stage 1;
- Stage 3 > Stage 2;
- Final se siente más intenso;
- no se vuelve injugable;
- autoaim sigue legible;
- audio acompaña.
```
