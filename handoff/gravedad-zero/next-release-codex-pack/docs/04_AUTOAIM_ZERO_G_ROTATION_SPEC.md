# 04 — Autoaim Zero-G Rotation Spec

## Problema actual

La animación de disparo mejoró, pero:

```txt
- aparece un spray raro;
- la rotación del modelo todavía no se percibe suficientemente;
- hay líneas/artefactos que no gustan;
- el autoaim se siente más FX que orientación física.
```

## Visual positivo

Usar:

```txt
visual-references/02_autoaim_concept_clean.png
```

## Visual negativo

Usar:

```txt
visual-references/04_current_bad_line_artifacts.png
```

No repetir ese tipo de líneas.

## Dirección

El autoaim debe sentirse así:

```txt
click target
→ lock limpio
→ slow motion corto
→ nave/astronauta rota físicamente hacia el target
→ micro corrección en gravedad cero
→ disparo
→ recoil
→ impacto
```

## Eliminar o reducir

```txt
- spray grande tipo pluma;
- abanico multicolor pegado al astronauta;
- líneas diagonales sueltas;
- wireframe/cage;
- puntos excesivos;
- overlays caóticos.
```

## Reemplazar por

```txt
- reticle circular limpio alrededor del target;
- dotted trajectory muy sutil o arco corto;
- time dilation aura suave;
- rotation cue en forma de arco cerca de la nave/astronauta;
- thruster burst pequeño, no spray gigante;
- muzzle flash breve;
- recoil visible.
```

## Rotación real del modelo

Debe ser evidente.

Regla técnica:

```js
targetAngle = atan2(target.y - actor.y, target.x - actor.x)
baseDirection = nearestDirection(targetAngle)
desiredGroupRotation = normalizeAngle(targetAngle - baseDirectionAngle)
```

Luego:

```js
angularVelocity += shortestAngle(currentRotation, desiredGroupRotation) * stiffness * dt
angularVelocity *= damping
currentRotation += angularVelocity * dt
actorGroup.rotation.z = currentRotation + recoilRoll
```

## Ajustes sugeridos

```txt
orientationDuration: 0.45–0.65s
fireTime: después de que la rotación se vea, no instantáneo
stiffness: 16–22
damping: 0.80–0.88
maxAngularVelocity: 5–7 rad/s
overshoot: leve, visible
```

## Para que se perciba más

```txt
- aumentar duración antes del disparo 0.12–0.20s;
- aumentar rotación visual mínima;
- para nave, inclinar todo shipGroup;
- para astronauta, rotar astronautGroup y no sólo sprite;
- hacer que el tether reaccione;
- reducir FX que tapan la rotación.
```

## QA autoaim

Aprobar sólo si:

```txt
- sin spray raro;
- sin líneas de wireframe;
- el modelo rota antes de disparar;
- la rotación se nota en nave y astronauta;
- el disparo ocurre después de un pequeño lock;
- el impacto sigue claro.
```
