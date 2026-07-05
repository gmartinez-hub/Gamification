# 05 — Orbits, Chase Targets and Scale

## Problema

Targets cerca, mapa chico, asteroides quietos.

## Solución

### Map scale

Después de gema:

```txt
Gema adquirida -> sector desbloqueado -> beacon lejano -> viaje -> entrar en zona -> misión empieza
```

No arrancar siguiente stage automáticamente pegado al jugador.

### Target spawn

Targets alrededor de la zona activa:

```txt
zone center + orbital radius + phase
```

No alrededor de `state.worldOffset` inmediato.

### Motion profiles

```js
const TARGET_MOTION_PROFILES = [
  {
    name: "intro_drift",
    orbitSpeed: [0.22, 0.38],
    orbitRadius: [0.08, 0.18],
    driftSpeed: [0.02, 0.05],
    chaseRequired: false,
    predictionLead: 0.10
  },
  {
    name: "fractured_orbit",
    orbitSpeed: [0.42, 0.72],
    orbitRadius: [0.18, 0.36],
    driftSpeed: [0.06, 0.12],
    chaseRequired: true,
    predictionLead: 0.18
  },
  {
    name: "unstable_core",
    orbitSpeed: [0.72, 1.12],
    orbitRadius: [0.26, 0.52],
    driftSpeed: [0.10, 0.20],
    chaseRequired: true,
    predictionLead: 0.26
  }
];
```

### Stage behavior

```txt
Stage 1: enseña.
Stage 2: perseguir.
Stage 3: anticipar y estabilizar.
Final: espectáculo, menos targets chicos.
```

## Aceptación

```txt
[ ] Targets no aparecen cerca.
[ ] Stage 2 obliga a perseguir.
[ ] Stage 3 obliga a anticipar.
[ ] Aim usa velocidad del target.
```
