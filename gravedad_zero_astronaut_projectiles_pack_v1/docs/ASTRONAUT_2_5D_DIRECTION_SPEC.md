# Astronaut 2.5D Direction Spec — Gravedad Zero

## Objetivo

Validar el movimiento del astronauta en 2.5D con 9 estados:

```txt
idle
up
down
left
right
up_left
up_right
down_left
down_right
```

## Lo que ya existe en repo

El runtime ya tiene vistas del astronauta:

```txt
front
front_left
front_right
side_left
side_right
rear
rear_left
rear_right
```

Para Mission 01, esto alcanza para tener lectura 2.5D direccional.

## Recomendación para vertical slice

No producir todavía 9 loops animados completos.

Usar:

```txt
idle_hover → idle
vistas direccionales estáticas → movimiento
procedural bob/tilt → sensación de flote
jetpack FX → impulso
```

## Mapping

```txt
idle      → front_right + idle_hover
up        → rear
down      → front
left      → side_left
right     → side_right
up_left   → rear_left
up_right  → rear_right
down_left → front_left
down_right→ front_right
```

## Acciones

Para cerrar la primera misión:

```txt
tool_pulse → placeholder wave + FX de herramienta
touch_relic → placeholder thumbs_up + FX de contacto
energy_absorb → idle_hover + FX de energía
```

## Animaciones finales recomendadas después del vertical slice

```txt
tool_hit
touch_relic
energy_absorb
```

Estas sí conviene generarlas después, cuando el timing real esté validado en juego.
