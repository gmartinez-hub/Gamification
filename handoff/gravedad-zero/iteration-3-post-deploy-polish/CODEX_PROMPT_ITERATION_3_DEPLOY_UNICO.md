# GRAVEDAD ZERO — Iteration 3 / Post-deploy polish

## Objetivo

Hacer **un solo deploy integrado** que corrija la integración actual y deje una versión lista para QA único.

No generar assets nuevos. Usar texturas, audios y packs ya subidos.

## Problemas detectados

- La nave no tiene audio de motor/movimiento conectado.
- El autoaim existe pero no se siente como animación de zero gravity.
- El companion tiene sombra/piso y no parece flotar.
- Stage 2 tarda o queda vacío porque no hay regeneración real por stage.
- El mundo sigue sintiéndose chico.
- Hay assets/texturas ya subidos que no se usan como sistema vivo.

---

# Deploy único requerido

El patch debe incluir todo esto junto:

1. Stage regeneration.
2. Autoaim cinematográfico.
3. Companion flotante/wrappeado sin piso.
4. Mundo expandido con objetos flotantes wrappeados.
5. Audio real de nave.
6. QA integrado sin dividir deploys.

---

# 1. Stage regeneration obligatorio

Implementar:

```js
startMissionForStage(stageIndex)
resetStageMission(stageIndex)
spawnStageTargets(stageIndex)
clearPreviousStageTargets()
activateStageTargets(stageIndex)
```

Reglas:

```txt
Stage 1 → 3 small asteroids + 1 large obstacle
Stage 2 → 3 small asteroids + 2 large obstacles
Stage 3 → 3 small asteroids + 3 large obstacles
```

Después de `finishStageTransition()` ejecutar:

```js
startMissionForStage(state.stageIndex)
```

No dejar Stage 2 vacío.

Debe:
- limpiar/desactivar targets viejos;
- resetear counters;
- resetear relic;
- resetear `unlockStarted`, `relicTouched`, `relicState`;
- activar companion status;
- actualizar HUD;
- no duplicar objetos indefinidamente.

Copy:

```txt
MISSION 01 / CAMPO INESTABLE / 3 SEÑALES MENORES / 1 OBSTÁCULO MAYOR
MISSION 02 / ÓRBITA FRACTURADA / 3 SEÑALES MENORES / 2 OBSTÁCULOS MAYORES
MISSION 03 / NÚCLEO DESCONOCIDO / 3 SEÑALES MENORES / 3 OBSTÁCULOS MAYORES
```

---

# 2. Autoaim cinematográfico / zero gravity

No alcanza con reticle + disparo. Debe sentirse como micro animación:

```txt
click cerca de target válido
→ snap al target más cercano
→ target lock visible
→ slow motion / time dilation
→ actor gira/flota hacia target
→ fire cue
→ recoil
→ beam/proyectil
→ impacto
→ hit stop breve
→ salida de slow motion
```

Targeting:
- Mantener targets válidos por fase.
- Permitir snap al target más cercano si el click está cerca.
- Aumentar hit radius de asteroides chicos.
- Mostrar target candidato antes del click.
- Si hay un único objetivo activo, hacerlo evidente.

Actor orientation:
- Si shooter es astronauta: rotar/tiltear `astronautGroup` hacia target con easing.
- Si shooter es nave: rotar/tiltear `shipGroup` hacia target con easing.
- Volver suavemente a idle.
- Agregar recoil en fire release.
- Agregar hit stop mínimo en impacto.

Usar assets existentes:
```txt
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/target_lock_reticle.png
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/click_pulse_atlas_4x4.png
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/slow_motion_vignette_overlay.png
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/time_dilation_field.png
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/zero_g_rotation_streaks_overlay.png
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/aim_assist_line.png
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/projectiles/fire_release_flash.png
```

Timing:
```txt
0.00 click pulse
0.04 target lock
0.08 slow motion enter
0.12 actor orientation begins
0.32 fire release
0.42 recoil
0.48 impact
0.52 hit stop
0.60 exit slow motion
0.78 end
```

Obligatorio:
- streaks alineados al ángulo actor-target;
- guide line visible;
- reticle con pulso;
- recoil;
- hit stop;
- sensación de baja gravedad.

---

# 3. Companion flotante / sin piso

Eliminar o desactivar `robotShadow`. El companion no debe parecer apoyado.

Reemplazar por:
- glow orbital;
- aura circular;
- partículas pequeñas;
- bob vertical;
- tilt fake 3D;
- rotación suave;
- reacción al pointer;
- pulse por estado.

Mantener:
- panel HTML;
- click sound;
- counters de misión;
- posición top-right.

No convertir a GLB/FBX. Usar Three fake 3D:

```txt
robotSprite
robotGlow
robotOrbitRing
robotParticles
THREE.Sprite
THREE.TorusGeometry
THREE.Points
THREE.Group rotation
```

Estados:
```txt
idle        → cyan suave, flota lento
ready       → cyan más activo, pulse leve
alert       → magenta, pulse rápido
hint        → cyan/magenta alternado
stage_clear → expansión de aura + sparkle
```

---

# 4. Mundo más grande / objetos flotantes wrappeados

Crear sistema de objetos orbitales:

```js
createOrbitalObject()
createPlanetLayer()
createDebrisField()
createCrystalCluster()
updateOrbitalObjects()
wrapOrbitalObject()
```

Puede estar dentro de `src/main.js` o modularizado, pero separado conceptualmente.

Usar texturas existentes:

```txt
assets/runtime/three-textures/ocean-color.png
assets/runtime/three-textures/ocean-world-bright-color.png
assets/runtime/three-textures/gas-giant-color.png
assets/runtime/three-textures/network-planet-dark-color.png
assets/runtime/three-textures/dark-crater-color.png
assets/runtime/three-textures/asteroid-surface-neon-close-color.png
assets/runtime/three-textures/asteroid-surface-plates-color.png
assets/runtime/three-textures/asteroid-surface-wide-color.png
assets/runtime/three-textures/nebula-wide-background.png
assets/runtime/three-textures/nebula-flow-background.png
assets/runtime/three-textures/nebula-magenta-cyan-background.png
gravedad_zero_unlock_asset_pack_v1/assets/hologram/
gravedad_zero_mission_01_completion_pack_v1/assets/hologram/
gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/projectiles/
gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/
```

Objetos:
```txt
planet_far_large
planet_mid
asteroid_debris_cluster
orbital_ring_fragment
space_wreck_piece
energy_crystal
relic_fragment
nebula_billboard
foreground_debris
```

Three recomendado:
- `InstancedMesh` para asteroides/debris.
- `Sprite` o `PlaneGeometry` para assets 2.5D.
- `TorusGeometry` para anillos orbitales.
- `Points` para polvo/partículas.
- `MeshStandardMaterial` para rocas/planetas.

Capas:
```txt
far background: planetas enormes lentos
mid background: planetas/restos orbitales
gameplay layer: targets interactivos
foreground: debris sutil rápido
```

Reglas:
- no saturar;
- mantener targets legibles;
- no tapar HUD;
- variar por stage;
- wrap horizontal/vertical;
- parallax por depth.

---

# 5. Audio real de nave

Usar:

```txt
nave_three_audio_pack_v2_refined/engine_idle_clean_loop_05.wav
nave_three_audio_pack_v2_refined/engine_move_clean_loop_06.wav
nave_three_audio_pack_v2_refined/engine_boost_clean_loop_07.wav
nave_three_audio_pack_v2_refined/motion_speed_whoosh_refined_09.wav
nave_three_audio_pack_v2_refined/motion_warp_jump_refined_10.wav
```

Implementar:

```js
ShipEngineAudio
ensureShipAudio()
updateShipEngineAudio(shipVelocity, transition)
```

Reglas:
- iniciar audio sólo después de primer gesto;
- no reiniciar loops por frame;
- crossfade idle/move/boost;
- idle bajo cuando nave quieta;
- move cuando `shipVelocity.length() > 0.08`;
- boost con velocidad alta o transición;
- warp/whoosh en stage transition;
- si browser bloquea audio, no romper runtime.

Volúmenes:
```txt
idle: 0.05 - 0.10
move: 0.00 - 0.18
boost: 0.00 - 0.22
whoosh/warp one-shot: 0.25 - 0.35
```

---

# Archivos esperados

Probable:
```txt
src/main.js
styles.css
index.html
```

Opcional si modulariza:
```txt
src/world/OrbitalObjectSystem.js
src/audio/ShipEngineAudio.js
src/aim/CinematicAimAssist.js
src/ui/RobotCompanion3D.js
```

---

# No hacer

- No generar assets nuevos.
- No convertir robot a 3D real.
- No reemplazar todo el runtime.
- No dejar Stage 2 para otro deploy.
- No dividir en varios deploys salvo compile failure.
- No considerar aprobado si sólo compila.

Commit sugerido:
```txt
Polish Gravedad Zero mission loop and cinematic aim
```
