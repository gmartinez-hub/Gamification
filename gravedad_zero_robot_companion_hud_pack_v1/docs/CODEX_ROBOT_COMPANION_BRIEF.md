# Codex Brief — Robot Companion + HUD

## Objetivo

Agregar un companion clickeable al HUD y al menú.

## Reglas

- El robot debe estar arriba/derecha durante gameplay.
- Al clickearlo, debe abrir un cuadro de texto con lo que falta.
- Debe cambiar de estado según Mission 01.
- No debe tapar gameplay ni controles.

## Estados por misión

```txt
boot → idle
mission_start → ready
small_asteroids_active → ready
large_obstacle_active → alert
relic_reveal → hint
stage_unlocked → stage_clear
```

## Mensajes dinámicos

```txt
FALTAN {smallAsteroidsRemaining} ASTEROIDES
OBSTÁCULO MAYOR DETECTADO
SEÑAL LIBERADA. TOCÁ LA RELIQUIA
STAGE UNLOCKED
```

## Assets/config

Usar:
```txt
config/robotCompanionStates.json
config/robotCompanionHudEvents.json
config/audioCueMap.robotCompanion.json
config/menuFlow.robotCompanion.json
```

## Implementación

- Robot como Sprite/Plane en Three.
- Panel/copy como HTML/CSS.
- Glows/sparkles como sprites additivos.
- Audio por eventos.

## Criterio de done

- El robot se ve vivo aunque sea sprite.
- Al clickearlo muestra objetivos pendientes.
- Cambia visualmente cuando hay alerta o stage clear.
- No depende de generar un modelo 3D.
