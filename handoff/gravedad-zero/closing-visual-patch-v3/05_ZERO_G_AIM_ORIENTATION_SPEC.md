# 05 — Zero-G Aim Orientation Spec

## Problema

El disparo puede tener FX lindos, pero falta que el cuerpo rote hacia el punto elegido. La sensación buscada es cuerpo flotando en gravedad cero.

## Principio

Usar sprites/direcciones existentes como frame base, pero el group debe rotar físicamente hacia el ángulo exacto del aim.

```txt
direcciones = frame visual base
group rotation = orientación física real
```

## Cálculo

```js
const aimVector = targetPosition.clone().sub(actorPosition)
const targetAngle = Math.atan2(aimVector.y, aimVector.x)
```

Elegir frame base más cercano:

```txt
right
up_right
up
up_left
left
down_left
down
down_right
```

Luego rotar group hacia `targetAngle`.

## Movimiento con inercia

No snap instantáneo.

Usar:

```js
const deltaAngle = shortestAngle(currentAngle, targetAngle)

angularVelocity += deltaAngle * stiffness * dt
angularVelocity *= damping
currentAngle += angularVelocity * dt

actorGroup.rotation.z = currentAngle + recoilRoll
```

Valores iniciales sugeridos:

```txt
stiffness: 18–28
damping: 0.78–0.88
maxAngularVelocity: 6–10 rad/s
orientationDuration: 0.28–0.42s
overshoot: leve
```

## Secuencia

```txt
0.00 click / target selected
0.04 aim ping
0.08 slow motion begins
0.10 actor starts rotating
0.14 zero-g spray appears
0.26 actor nearly aligned
0.34 fire release
0.40 recoil
0.44 impact + hit stop
0.58 slow motion exits
0.70 actor eases back
```

## Astronauta

```txt
rotate astronautGroup.z
select nearest astronaut direction
tether curves/reacts
backpack/tool spray opposite rotation
small lateral drift
recoil opposite shot vector
```

## Nave

```txt
rotate/tilt shipGroup.z
select nearest ship direction if applicable
thruster spray opposite turn
camera compression/drift
heavy recoil opposite shot vector
```

## VFX

Usar assets:

```txt
zero_g_rotation_streaks_overlay.png
time_dilation_field.png
slow_motion_vignette_overlay.png
aim_transition_ring_atlas_4x4.png
fire_release_flash.png
astronaut_tool_muzzle_flash.png
ship_heavy_charge_atlas_4x4.png
ship_heavy_projectile_trail.png
```

## Audio

Usar:

```txt
aim_click_ping_01.wav
aim_lock_confirm_02.wav
slow_motion_enter_03.wav
zero_g_rotate_whoosh_04.wav
fire_release_snap_05.wav
astronaut_tool_fire_cue_06.wav
ship_heavy_fire_cue_07.wav
slow_motion_exit_snap_09.wav
```

## QA

No aprobar si:

```txt
el actor no rota hacia el target
la rotación es instantánea
sólo hay reticle/línea
no hay spray/thruster
no hay recoil
no hay hit stop
```
