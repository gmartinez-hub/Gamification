# Iteración 2 — Menú + Robot Companion HUD

## Objetivo

Sumar presentación, menú, companion e indicadores.

## Pack

```txt
gravedad_zero_robot_companion_hud_pack_v1.zip
```

## Menú

Negro, simple, letras blancas, acentos mínimos cyan/magenta.

Pantallas:

```txt
title_menu
mission_briefing
stage_status
controls
pause
stage_unlocked
mission_complete
```

Copy base:

```txt
GRAVEDAD ZERO
RUTA DESCONOCIDA
TOMA EL CONTROL

INICIAR MISIÓN
CONTROLES
```

Mission briefing:

```txt
MISSION 01
CAMPO INESTABLE

3 ASTEROIDES CHICOS
1 OBSTÁCULO MAYOR
ACTIVA LA RELIQUIA
```

## Robot Companion

Rol:

```txt
companion
indicador de estado
ayuda contextual
contador de objetivos
feedback de stage unlock
```

Implementación:

```txt
robot → Three Sprite / PlaneGeometry con PNG alpha
texto y panel → HTML/CSS
```

Posición gameplay:

```txt
HUD top-right
```

Comportamiento:

```txt
click robot
→ abre/cierra panel
→ muestra qué falta completar
→ reproduce sfx
→ pulse/bob
```

Estados:

```txt
boot → idle
mission_start → ready
small_asteroids_active → ready
large_obstacle_active → alert
relic_reveal → hint
stage_unlocked → stage_clear
```

Mensajes:

```txt
FALTAN {smallAsteroidsRemaining} ASTEROIDES
OBSTÁCULO MAYOR DETECTADO
SEÑAL LIBERADA. TOCÁ LA RELIQUIA
STAGE UNLOCKED
```

## Criterio de done

- El robot se ve vivo pero no tapa gameplay.
- El panel es legible.
- El texto queda en HTML/CSS.
- El robot cambia de estado según Mission 01.
