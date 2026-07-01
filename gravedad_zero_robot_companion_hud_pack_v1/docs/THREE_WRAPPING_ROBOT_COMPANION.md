# Three Wrapping — Robot Companion

## Sí, se puede wrappear en Three

Implementación recomendada:

```txt
THREE.Sprite o PlaneGeometry
transparent PNG
orthographic UI scene o HUD layer
bob animation
subtle rotation
glow sprite detrás
shadow sprite debajo
```

## No usar todavía

No convertir a modelo 3D real/GLB en esta etapa.

## Efectos posibles

```txt
bob suave
scale pulse al click
lookAt pointer
antenna glow
state swap
sparkles en stage_clear
magenta pulse en alert
```

## Arquitectura

```txt
RobotCompanionController
- setState(state)
- updateCounters(counters)
- toggleHintPanel()
- say(message)
- pulse()
- attachToHud()
- update(delta)
```

## Integración con HUD

El robot vive en Three, pero el texto vive en HTML/CSS:

```txt
robot sprite → Three
speech bubble / text → HTML
mission counters → HTML
```
