# Aim Assist + Slow Motion — Gravedad Zero

## Decisión
Usar **auto-target con mouse/click** cuando haya un objeto clickeable.

No exigir apunte libre ni producir ahora 9 filas completas de disparo. El personaje/nave se orienta en cero gravedad con una micro transición en cámara lenta y dispara desde un ángulo controlado.

## Secuencia
```txt
click target
→ click pulse
→ target lock
→ slow motion / time dilation
→ actor gira en cero gravedad hacia target
→ fire cue
→ projectile / tool pulse / heavy shot
→ impact
→ exit slow motion
```

## Targets válidos
```txt
astronaut_phase       → small_asteroid
large_obstacle_phase  → large_obstacle
relic_phase           → relic
```

## 2.5D vs Three
Mantener en 2.5D:
- astronauta;
- nave;
- idle/move/facing;
- placeholders de acción.

Resolver en Three:
- target lock;
- reticle;
- slow-motion field;
- rotation streaks;
- projectile/beam;
- muzzle flash;
- impacts;
- partículas;
- cámara/zoom/shake.

## Audio
Sincronizar por eventos, no por frames.

Cue principal:
```txt
pointer_click_target → aim_click_ping
target_acquired → aim_lock_confirm
enter_slow_motion → slow_motion_enter
zero_g_orient_to_target → zero_g_rotate_whoosh
fire_release → fire_release_snap
astronaut_tool_pulse_release → astronaut_tool_fire_cue
ship_heavy_shot_release → ship_heavy_fire_cue
exit_slow_motion → slow_motion_exit_snap
```

## QA posterior
Después del QA visual evaluar si hacen falta:
- astronaut_shoot_4dir;
- astronaut_shoot_8dir;
- astronaut_touch_relic;
- ship_fire_overlay_by_direction.
