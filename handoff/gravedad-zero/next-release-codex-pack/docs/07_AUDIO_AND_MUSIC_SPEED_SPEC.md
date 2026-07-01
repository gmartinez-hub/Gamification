# 07 — Audio and Music Speed Spec

## Objetivo

La velocidad debe sentirse también por audio.

## Assets existentes

Usar primero:

```txt
nave_three_audio_pack_v2_refined/
  ambient_space_low_loop_14.wav
  engine_idle_clean_loop_05.wav
  engine_move_clean_loop_06.wav
  engine_boost_clean_loop_07.wav
  motion_speed_whoosh_refined_09.wav
  motion_warp_jump_refined_10.wav
  reward_unlock_sparkle_refined_13.wav
  ui_hover_sonar_02.wav
  ui_mission_accept_refined_03.wav
```

Aim pack:

```txt
slow_motion_enter_03.wav
zero_g_rotate_whoosh_04.wav
fire_release_snap_05.wav
slow_motion_exit_snap_09.wav
aim_focus_low_loop_10.wav
```

## Música / intensidad

Si no hay música larga, crear sensación de música/intensidad con capas:

```txt
ambient loop
engine loop
low rumble loop
boost loop
speed whoosh one-shots
aim focus loop
reward chimes
```

## Audio por velocidad

### Velocidad x1

```txt
engine idle/move suave
ambient bajo
pocos streak whooshes
```

### Velocidad x2

```txt
engine move más presente
boost layer leve
low rumble sube
whoosh cada tanto
```

### Velocidad x3

```txt
boost layer más presente
speed whoosh más frecuente pero cooldown
low rumble más notorio
streaks más energéticos
```

## Audio por stage

```txt
Stage 1 → calma/control
Stage 2 → move loop más presente
Stage 3 → boost/whoosh más agresivo
Final → ducking + low rumble + resolve
```

## Reglas técnicas

```txt
No reiniciar loops por frame.
No duplicar loops al cambiar stage/velocidad.
Crossfade entre intensidades.
Mantener cooldown para whoosh.
No saturar.
```

## Companion audio

Al clickear companion:

```txt
robot_open_hint
robot_close_hint
robot_alert_ping
robot_item_update
robot_stage_clear
```

## QA audio

```txt
- botón velocidad cambia audio;
- stage cambia intensidad;
- no hay loops duplicados;
- no satura;
- autoaim slow motion tiene sonido limpio;
- companion tutorial tiene click/ping.
```
