# 04 — Three Companion Primitive Spec

## Problema

El companion actual se ve plano y sigue teniendo sombra/base. En HUD espacial eso se lee como objeto apoyado en un piso.

## Decisión

Crear companion con primitivas Three.

## Estructura

```js
const robotHudGroup = new THREE.Group()
camera.add(robotHudGroup)
```

Posición:

```txt
anchored top-right
relative to camera/viewport
no world chunks
no wrap
no depth conflict with planets
```

Modelo:

```txt
body: SphereGeometry
face/front: small flattened sphere/plane, same color family
glasses: 2 x TorusGeometry
eyes: Curve/LineSegments or thin torus segments
mouth: Curve/LineSegments
antenna stems: CylinderGeometry
antenna tips: small SphereGeometry with emissive
side dots/ears: small SphereGeometry
internal glow: small transparent sprite or point light
```

## Movimiento

```txt
bob suave
tilt Y/X hacia pointer
rotation Z mínima en estado alert/route
scale pulse al cambiar estado
```

## Interacción

```txt
click abre/cierra panel
hover pulse suave
robot audio cues siguen funcionando
```

## Prohibiciones

```txt
no robot_shadow.png
no shadow sprite
no oval base
no floor
no halo
no orbit ring
no permanent particles
no chunk ownership
no world wrap
```

## QA

Aprobar sólo si en captura:

```txt
el robot parece 3D
no tiene sombra
no parece apoyado
no parece sticker plano
está integrado al HUD/cámara
```
