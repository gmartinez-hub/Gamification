# 01 — CODEX PROMPT FULL

Repo: `gmartinez-hub/Gamification`

Implementar un patch único con este source of truth:

```txt
handoff/gravedad-zero/full-closing-companion-aim-turbo-patch-v1/
```

## Objetivo

Cerrar estos problemas:

```txt
1. Companion sigue distinto al original.
2. Aim se siente como líneas que se disparan.
3. Disparo no viaja como proyectil Three.
4. Aim en gravedad zero no tiene peso/inercia.
5. Targets demasiado cerca.
6. Mapa chico.
7. Órbitas lentas.
8. Asteroides casi estáticos.
9. Turbo/aceleración se siente como pocas partículas/spray.
10. Planetas parecen cambiar de color por stage.
```

## Requerimientos clave

### Companion

- Debe ser idéntico al original, no inspirado.
- Usar `assets/companion/reference/companion_original_reference.png` como fuente de comparación.
- Reemplazar cara procedural por textura/decal/canvas usando los assets de `assets/companion/textures/`.
- Mantener cuerpo 3D simple.
- Sin halo raro, sin sombra/base.

### Aim

- Cambiar de click+línea a secuencia:
  `LOCK -> STABILIZE -> ORIENT -> FIRE -> PROJECTILE_TRAVEL -> IMPACT -> RECOVER`
- Para targets importantes permitir secuencia hasta 8s parametrizable.
- Para tiros normales usar versión corta.
- Disparo debe ser proyectil Three con travel time real.

### Turbo

- F activa efectos 3D por una de 8 direcciones.
- Usar atlases de `assets/turbo_8dir/`.
- No sumar jets si no hace falta, pero sí energía/compresión/wake 3D legible.
- No spray.

### Mundo/targets

- Targets lejos, orbitando en zona.
- Stage 2 obliga persecución.
- Stage 3 obliga anticipación.
- Planetas existentes no recolorean.

## Commit sugerido

```txt
Close Gravedad Zero companion aim turbo scale and orbit feel
```
