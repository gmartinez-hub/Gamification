# 03 — Aim 8s Slow Motion and Three Projectiles

## Problema

El aim actual se siente como líneas que salen de la nave.

## Nuevo sistema

State machine:

```txt
IDLE
LOCK
STABILIZE
ORIENT
FIRE
PROJECTILE_TRAVEL
IMPACT
RECOVER
```

## Duraciones

```js
const AIM_TIMINGS = {
  normal: {
    lock: 0.35,
    stabilize: 0.45,
    orient: 0.40,
    projectileTravel: 0.45,
    recover: 0.30
  },
  major: {
    lock: 0.85,
    stabilize: 1.30,
    orient: 1.40,
    charge: 1.20,
    projectileTravel: 1.40,
    impactHold: 0.85,
    recover: 0.90
  },
  cinematic: {
    totalMax: 8.0
  }
};
```

No usar 8s para todo. Usarlo para:
- núcleo grande;
- reliquia;
- unlock/final;
- modo debug `?aimCinematic=1`.

## Projectile Three

Reemplazar línea por:

```txt
ProjectileGroup
  coreSprite / mesh
  trailSprite
  pointLight opcional
  travelProgress
  from
  to / predictedPoint
```

Assets:

```txt
assets/aim_fx/projectile_ship_energy_bolt_1024x256.png
assets/aim_fx/projectile_astronaut_tool_bolt_768x192.png
assets/aim_fx/projectile_long_trail_1024x256.png
assets/aim_fx/projectile_short_trail_768x192.png
assets/aim_fx/muzzle_charge_atlas_4x1_1024.png
assets/aim_fx/impact_ring_atlas_4x1_1024.png
assets/aim_fx/miss_spark_512.png
```

## Target prediction

Para targets móviles:

```js
predictedPoint = targetPoint + targetVelocity * predictionLead;
```

Success baja por:
- distancia;
- velocidad del target;
- mala orientación;
- baja estabilidad.

## Visual

- campo de estabilización cerca del actor;
- retícula limpia sobre target;
- proyectil viaja;
- impacto con ring;
- miss viaja a missPoint.

## Aceptación

```txt
[ ] No se ve como una línea instantánea.
[ ] El proyectil viaja en cámara lenta.
[ ] La nave/astronauta se orienta con inercia.
[ ] Hay impacto legible.
[ ] Miss/desvío se entiende.
```
