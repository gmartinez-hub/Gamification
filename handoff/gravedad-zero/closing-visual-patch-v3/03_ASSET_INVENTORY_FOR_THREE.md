# 03 — Asset Inventory for Three

## Packs principales

Estos son los packs que deben revisarse antes de implementar.

---

# 1. three_space_assets_bundle_v2.zip

Uso principal: materiales reales para planetas/asteroides en Three.

Archivos relevantes:

```txt
planet_ocean_albedo.png
planet_ocean_emissive.png
planet_ocean_normal.png
planet_darkcrater_albedo.png
planet_darkcrater_emissive.png
planet_darkcrater_normal.png
asteroid_mech_albedo_tile.png
asteroid_mech_emissive_tile.png
asteroid_mech_normal_tile.png
space_nebula_starfield_panorama.png
```

Usar:

```txt
SphereGeometry planetas/lunas
IcosahedronGeometry asteroides
MeshStandardMaterial con normal/emissive
InstancedMesh para debris
```

No usar `space_nebula_starfield_panorama` para agregar más nebulosa pesada. Mantener fondo oscuro actual.

---

# 2. three_space_assets_v1.zip

Uso principal: variantes livianas de planetas.

Archivos relevantes:

```txt
planet_darkmoon_albedo.png
planet_darkmoon_emissive.png
planet_darkmoon_normal.png
planet_mech_albedo.png
planet_mech_emissive.png
planet_mech_normal.png
planet_ocean_albedo.png
planet_ocean_emissive.png
planet_ocean_normal.png
createProceduralAsteroid.js
three_planet_material_example.js
```

Usar:

```txt
planetas lejanos
lunas mecánicas
planetas con glow sutil
asteroides procedurales
```

---

# 3. gravedad_zero_unlock_asset_pack_v1.zip

Uso principal: reliquia, holograma, stage unlock, efectos de señal.

Archivos relevantes:

```txt
assets/hologram/relic_aura_glow.png
assets/hologram/relic_hologram_alpha_cropped.png
assets/hologram/relic_orbit_ring_01.png
assets/hologram/relic_orbit_ring_02.png
assets/hologram/relic_particles_atlas_4x4.png
assets/hologram/relic_scanlines_overlay.png
assets/vfx/special_asteroid_core_cracks_overlay.png
assets/vfx/stage_unlock_flash_glow.png
assets/vfx/stage_unlock_shockwave_ring.png
```

Usar:

```txt
reliquia
fragmentos de señal
gravity nodes
synthetic cores
final sequence
shockwave limpia
```

No usar orbit rings para el companion.

---

# 4. gravedad_zero_mission_01_completion_pack_v1.zip

Uso principal: targets, reliquia, stage clear y audio de misión.

Assets visuales:

```txt
assets/vfx/asteroids/large_obstacle_break_burst_atlas_4x4.png
assets/vfx/asteroids/large_obstacle_core_cracks_overlay.png
assets/vfx/asteroids/large_obstacle_spawn_aura.png
assets/vfx/asteroids/small_asteroid_break_burst_atlas_4x4.png
assets/vfx/asteroids/small_asteroid_hit_flash.png
assets/vfx/stage_unlock/energy_transfer_beam_vertical.png
assets/vfx/stage_unlock/hud_mission_frame_overlay.png
assets/vfx/stage_unlock/stage_unlock_flash_glow.png
assets/vfx/stage_unlock/stage_unlock_shockwave_atlas_4x4.png
```

Audio:

```txt
mission_start_arcade_01.wav
small_asteroid_hit_03.wav
small_asteroid_break_04.wav
large_obstacle_spawn_05.wav
large_obstacle_hit_06.wav
large_obstacle_break_07.wav
relic_reveal_08.wav
relic_expansion_burst_09.wav
relic_idle_clean_loop_10.wav
astronaut_touch_relic_11.wav
energy_transfer_to_ship_12.wav
stage_unlocked_arcade_13.wav
```

---

# 5. gravedad_zero_astronaut_projectiles_pack_v1.zip

Uso principal: proyectiles astronauta/nave.

Archivos relevantes:

```txt
assets/vfx/astronaut/astronaut_tool_beam.png
assets/vfx/astronaut/astronaut_tool_beam_atlas_4x4.png
assets/vfx/astronaut/astronaut_tool_impact_atlas_4x4.png
assets/vfx/astronaut/astronaut_tool_muzzle_flash.png
assets/vfx/astronaut/astronaut_tool_particles_atlas_4x4.png
assets/vfx/projectiles/generic_energy_hit_atlas_4x4.png
assets/vfx/projectiles/generic_energy_particles_atlas_4x4.png
assets/vfx/projectiles/generic_target_lock_glow.png
assets/vfx/ship/ship_heavy_charge_atlas_4x4.png
assets/vfx/ship/ship_heavy_impact_atlas_4x4.png
assets/vfx/ship/ship_heavy_projectile_core.png
assets/vfx/ship/ship_heavy_projectile_trail.png
config/astronautActionMap.json
config/astronautDirectionMap.json
```

Usar para:

```txt
muzzle
impact
projectile trail
target lock
heavy shot
recoil visual
```

---

# 6. gravedad_zero_aim_assist_fx_contracts_pack_v1.zip

Uso principal: autoaim, slow motion y rotación zero-g.

Visual:

```txt
assets/vfx/aim_assist/aim_assist_line.png
assets/vfx/aim_assist/aim_transition_ring_atlas_4x4.png
assets/vfx/aim_assist/click_pulse_atlas_4x4.png
assets/vfx/aim_assist/focus_warp_atlas_4x4.png
assets/vfx/aim_assist/slow_motion_vignette_overlay.png
assets/vfx/aim_assist/target_lock_reticle.png
assets/vfx/aim_assist/target_lock_reticle_atlas_4x4.png
assets/vfx/aim_assist/time_dilation_field.png
assets/vfx/aim_assist/zero_g_rotation_streaks_overlay.png
assets/vfx/projectiles/fire_release_flash.png
```

Audio:

```txt
aim_click_ping_01.wav
aim_lock_confirm_02.wav
slow_motion_enter_03.wav
zero_g_rotate_whoosh_04.wav
fire_release_snap_05.wav
astronaut_tool_fire_cue_06.wav
ship_heavy_fire_cue_07.wav
invalid_target_blip_08.wav
slow_motion_exit_snap_09.wav
aim_focus_low_loop_10.wav
```

Usar especialmente:

```txt
zero_g_rotate_whoosh_04.wav
zero_g_rotation_streaks_overlay.png
time_dilation_field.png
slow_motion_vignette_overlay.png
```

---

# 7. gravedad_zero_robot_companion_hud_pack_v1.zip

Uso principal: panel/click/audio de companion.

Usar:

```txt
assets/audio/robot_open_hint_01.wav
assets/audio/robot_close_hint_02.wav
assets/audio/robot_alert_ping_03.wav
assets/audio/robot_stage_clear_chime_04.wav
assets/audio/robot_item_update_05.wav
assets/ui/hud/companion_status_panel_frame.png
assets/ui/hud/mission_items_counter_frame.png
assets/ui/hud/robot_speech_bubble_frame.png
```

No usar como cuerpo principal:

```txt
robot_idle.png
robot_ready.png
robot_alert.png
robot_hint.png
robot_stage_clear.png
```

Pueden usarse sólo como referencia de personalidad o textura puntual.

Prohibido:

```txt
robot_shadow.png
```

---

# 8. nave_three_audio_pack_v2_refined.zip

Uso principal: audio de nave / UI / ambiente.

Archivos:

```txt
ambient_space_low_loop_14.wav
engine_idle_clean_loop_05.wav
engine_move_clean_loop_06.wav
engine_boost_clean_loop_07.wav
motion_liftoff_ignition_08.wav
motion_speed_whoosh_refined_09.wav
motion_warp_jump_refined_10.wav
reward_unlock_sparkle_refined_13.wav
ui_hover_sonar_02.wav
ui_mission_accept_refined_03.wav
ui_mission_click_refined_01.wav
ship_module_attach_refined_04.wav
combat_shield_hit_refined_11.wav
combat_warning_laser_blip_12.wav
```

Usar para:

```txt
navegación
boost
rumbo detectado
stage route unlock
reward/gema
UI click
```

---

# PNG sueltos útiles si están disponibles

Planetas/superficies:

```txt
mapa_de_planeta_futurista_con_tecnología.png
mapa_de_relieve_de_un_planeta.png
mapa_global_cibernético_iluminado.png
mapa_mundial_sci_fi_con_tecnología_integrada.png
mapa_planetario_con_detalles_mecánicos.png
mapa_planetario_con_estructuras_alienígenas.png
mapa_planetario_futurista_nocturno.png
planeta_gigante_de_tormentas_y_auroras.png
superficie_alienígena_con_tecnología_futurista.png
superficie_lunar_futurista_con_tecnología.png
superficie_rocosa_con_paneles_industriales.png
superficie_sci_fi_con_paneles_y_cráteres.png
```

Asteroides/debris:

```txt
asteroide_futurista_con_detalles_mecánicos.png
asteroide_mecánico_futurista_con_detalles_tecnológ.png
asteroides_flotantes_con_detalles_tecnológicos.png
asteroides_futuristas_con_estelas_brillantes.png
asteroides_futuristas_en_fondo_verde.png
rocas_futuristas_flotantes_en_el_estudio.png
```

Módulos/estructuras:

```txt
componentes_espaciales_modulares_futuristas.png
componentes_modulares_de_nave_futurista.png
elementos_flotantes_de_nave_espacial.png
módulo_de_nave_espacial_futurista.png
módulo_futurista_de_carga_en_detalle.png
módulos_de_nave_espacial_futurista.png
partes_de_nave_modular_futurista.png
```

FX:

```txt
efectos_de_propulsión_futurista_en_3x3.png
efectos_de_propulsión_futuristas_en_cuadrícula.png
efectos_de_propulsores_en_matriz.png
líneas_de_velocidad_futuristas_brillantes.png
estela_de_luces_neón_flotantes.png
secuencia_de_estelas_de_energía_neón.png
explosiones_de_energía_en_secuencia.png
energía_cósmica_en_secuencia_de_impactos.png
secuencia_de_portales_de_energía.png
```
