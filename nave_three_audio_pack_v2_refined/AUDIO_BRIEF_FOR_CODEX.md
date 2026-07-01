# Nave Three.js Audio Pack v2 — Refined

Pack de audio refinado para el prototipo Three.js de Nave Gamification.

## Criterio de sonido

- Inspiración: space opera cinematográfica clásica, sin copiar sonidos ni marcas específicas.
- Corrección respecto a v1: menos ruido blanco, más tono, más hum sintético controlado.
- Formato: WAV mono 44.1kHz.
- Producción: prototipo premium; se puede convertir luego a OGG/MP3.

## Ubicación sugerida

```txt
assets/audio/
```

No integrar directo en `main` si Codex está trabajando en paralelo. Recomendado: branch separado o integrar luego del merge activo.

## Estados de motor

```js
audio.setEngineState('idle');  // engine_idle_clean_loop_05.wav
audio.setEngineState('move');  // engine_move_clean_loop_06.wav
audio.setEngineState('boost'); // engine_boost_clean_loop_07.wav
```

Usar crossfade de 250–450ms entre loops.

## Eventos one-shot

```js
audio.playOneShot('ui_mission_click');
audio.playOneShot('ui_hover_sonar');
audio.playOneShot('ui_mission_accept');
audio.playOneShot('ship_module_attach');
audio.playOneShot('motion_liftoff');
audio.playOneShot('motion_speed_whoosh');
audio.playOneShot('motion_warp_jump');
audio.playOneShot('combat_shield_hit');
audio.playOneShot('combat_warning_laser_blip');
audio.playOneShot('reward_unlock_sparkle');
```

## Recomendación de implementación

Crear:

```txt
src/audio/AudioManager.js
assets/audio/audio_manifest.json
```

API mínima:

```js
await audio.init();
await audio.preloadManifest('/assets/audio/audio_manifest.json');

audio.playOneShot('ui_mission_click');
audio.setEngineState('idle' | 'move' | 'boost');
audio.setMuted(true | false);
```

## UX

Por políticas de navegador, inicializar audio después del primer gesto del usuario:

```js
window.addEventListener('pointerdown', () => audio.init(), { once: true });
```

## Volúmenes sugeridos

Usar los valores del `audio_manifest.json`.
La cama ambiental `ambient_space_low` debe ir muy baja: `0.06–0.10`.
