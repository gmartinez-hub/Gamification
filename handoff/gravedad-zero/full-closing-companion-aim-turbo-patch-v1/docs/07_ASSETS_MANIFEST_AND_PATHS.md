# 07 — Assets Manifest and Paths

## Copiar assets al repo

Destino recomendado:

```txt
assets/runtime/gravedad-zero/companion/
assets/runtime/gravedad-zero/aim-fx/
assets/runtime/gravedad-zero/turbo-8dir/
assets/runtime/gravedad-zero/audio/
```

## Companion

- Copiar todos los PNG de `assets/companion/textures/`.
- Conservar referencia original en docs o QA si no se quiere exponer en runtime.

## Aim FX

- Copiar todos los PNG de `assets/aim_fx/`.
- Usar `THREE.SpriteMaterial` con transparent y additive blending controlado.
- Para proyectiles largos, usar sprite/plane orientado hacia destino.

## Turbo

- Copiar atlases 8dir.
- Usar offsets/repeat en textura clonada por dirección.

## Audio opcional

```txt
assets/audio_optional/zero_g_lock_stabilize.wav
assets/audio_optional/target_orbit_passby.wav
assets/audio_optional/turbo_engine_ramp.wav
assets/audio_optional/sector_beacon_far_ping.wav
```

Integrar sólo si no rompen el mix actual.
