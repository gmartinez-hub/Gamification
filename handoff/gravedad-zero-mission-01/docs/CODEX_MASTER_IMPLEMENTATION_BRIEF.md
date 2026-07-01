# Codex Master Implementation Brief — Gravedad Zero Mission 01

## Contexto

El repo ya tiene nave con 3 stages, stage transition, astronauta, modo nave/astronauta, mundo orbital y asteroides.

Esta integración debe convertir el prototipo visual en una misión jugable mínima.

## No cambiar

- No cambiar el mapping actual de stages/vistas de nave.
- No reemplazar `stage1`, `stage2`, `stage3`.
- No convertir el juego en shooter genérico.
- No mencionar comercio, ventas, cobros, facturación, cliente ni negocio en la capa narrativa.
- No bloquear la integración esperando nuevas animaciones de astronauta.

## Narrativa

Nombre visible:

```txt
GRAVEDAD ZERO
```

Narrativa en español:

```txt
RUTA DESCONOCIDA
TOMA EL CONTROL
OBSTÁCULO DETECTADO
NÚCLEO INESTABLE
SEÑAL LIBERADA
RELIQUIA ACTIVADA
NUEVA RUTA ABIERTA
```

Microcopy arcade en inglés:

```txt
MISSION START
BOOST READY
SYSTEM ONLINE
STAGE UNLOCKED
```

## Mission 01

Reglas:

```txt
Stage actual: Stage 1
Asteroides chicos requeridos: 3
Actor que rompe asteroides chicos: astronauta
Obstáculo grande requerido: 1
Actor que rompe obstáculo grande: nave
Unlock: reliquia/holograma
Acción de unlock: astronauta toca reliquia
Resultado: nave pasa a Stage 2 usando transición existente
```

## Loop

1. Boot/HUD inicial: `GRAVEDAD ZERO / RUTA DESCONOCIDA / TOMA EL CONTROL`.
2. Primer gesto de usuario desbloquea Web Audio.
3. `MISSION START`.
4. Astronauta entra en fase activa.
5. Aparecen 3 asteroides chicos interactivos.
6. Astronauta usa `tool_pulse` para romperlos.
7. HUD muestra `OBSTÁCULOS MENORES 0/3`, `1/3`, `2/3`, `3/3`.
8. Al completar 3/3, mostrar `NÚCLEO INESTABLE`.
9. Spawnear 1 obstáculo grande.
10. Nave usa `heavy_shot` o impacto pesado para destruirlo.
11. Al romperse, revelar reliquia/holograma.
12. Reliquia hace reveal + wow expansion.
13. Reliquia queda flotando al 150% del astronauta.
14. Astronauta toca reliquia.
15. Energía viaja hacia la nave.
16. Mostrar `STAGE UNLOCKED`.
17. Llamar a stage transition existente para pasar a Stage 2.

## Astronauta

Usar lo existente:

```txt
idle_hover → idle
vistas direccionales → movimiento 2.5D
jetpack_boost → sensación de impulso/movimiento
wave → placeholder de tool_pulse
thumbs_up → placeholder de touch_relic
```

Mapping 9 direcciones:

```txt
idle       → front_right + idle_hover
up         → rear
down       → front
left       → side_left
right      → side_right
up_left    → rear_left
up_right   → rear_right
down_left  → front_left
down_right → front_right
```

Animaciones finales futuras, no blocker:

```txt
astronaut_tool_hit
astronaut_touch_relic
astronaut_energy_absorb
```

## Projectiles / herramientas

### Astronauta: Tool Pulse

- Uso: romper asteroides chicos.
- Tono: herramienta/pulso de extracción.
- No debe parecer arma militar.
- Visual: rayo corto cyan/violeta + muzzle flash + impacto local + partículas.

### Nave: Heavy Shot

- Uso: romper obstáculo grande.
- Debe sentirse más potente que el tool pulse.
- Visual: charge breve + projectile/trail + impacto grande + cracks + burst.

## Holograma / reliquia

Definición:

```txt
Forma: gema/holograma
Tono: sci-fi elegante + reliquia del espacio
Escala: 150% del astronauta
Color: mismo color por ahora
Interacción: astronauta la toca
Resultado: energía viaja a la nave y activa Stage 2
```

Estados mínimos:

```txt
hidden
reveal
wow_expansion
idle_collectible
astronaut_touch
energy_transfer_to_ship
stage_unlock
```

No usar como imagen plana. Componer en Three con:

```txt
core/relic
rings
glow
scanlines
particles
shockwave
energy beam
```

## Audio

Usar audios del pack Mission 01 y, si hace falta, complementarlos con `nave_three_audio_pack_v2_refined`.

Reglas:

- Inicializar Web Audio sólo después de gesto de usuario.
- Evitar white-noise/hiss fuerte.
- `relic_idle_loop` debe estar bajo, casi subliminal.
- `large_obstacle_break`, `relic_reveal`, `stage_unlocked` deben tener más jerarquía que impactos chicos.

## HUD

Preferido: HTML/CSS overlay, no Three.

Estados mínimos:

```txt
boot
mission_start
small_asteroids_active
small_asteroids_complete
large_obstacle_active
relic_reveal
relic_collectible
stage_unlocked
```

## Debug recomendado

Agregar query param:

```txt
?debug=mission-01
```

Controles debug sugeridos:

```txt
complete small asteroid
spawn large obstacle
destroy large obstacle
reveal relic
touch relic
stage unlock
```

## Criterio de done

Mission 01 está terminada cuando se puede completar sin usar el botón manual de stage.
