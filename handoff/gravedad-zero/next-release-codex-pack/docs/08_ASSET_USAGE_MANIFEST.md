# 08 — Asset Usage Manifest

## Objetivo

Reforzar que Codex use assets existentes y no invente nuevos.

## Packs a revisar

```txt
three_space_assets_bundle_v2.zip
three_space_assets_v1.zip
gravedad_zero_unlock_asset_pack_v1.zip
gravedad_zero_mission_01_completion_pack_v1.zip
gravedad_zero_astronaut_projectiles_pack_v1.zip
gravedad_zero_aim_assist_fx_contracts_pack_v1.zip
gravedad_zero_robot_companion_hud_pack_v1.zip
nave_three_audio_pack_v2_refined.zip
```

## Planetas / lunas

Usar:

```txt
planet_ocean_albedo / ocean-color
planet_darkcrater
planet_mech
planet_darkmoon
gas-giant
network-planet
dark-crater
asteroid-crater
```

Como:

```txt
large planets
distant moons
mechanical moons
region landmarks
```

## Cuerpos sintéticos

Usar:

```txt
relic_hologram_alpha_cropped
relic_aura_glow
relic_scanlines_overlay
relic_orbit_ring_01/02
target_lock_reticle
time_dilation_field
generic_target_lock_glow
```

Como:

```txt
synthetic core
gravity node
broken gate
signal body
relic fragment cluster
mission zone landmark
```

No usar orbit rings para companion.

## Autoaim

Usar:

```txt
target_lock_reticle
aim_transition_ring_atlas
click_pulse_atlas
time_dilation_field
slow_motion_vignette
zero_g_rotation_streaks
fire_release_flash
```

Pero evitar:

```txt
líneas largas diagonales
wireframe cages
spray tipo pluma
overlays caóticos
```

## Companion

Usar el pack sólo para:

```txt
audio
paneles
referencia visual
posibles decals limpios
```

No usar:

```txt
robot_shadow.png
```

## Assets incluidos en este zip

Este zip no duplica los packs pesados si ya están en repo/workspace. Incluye referencias visuales y manifiesto para que Codex busque los assets existentes.

Si los packs no están en repo, copiarlos antes de implementar.
