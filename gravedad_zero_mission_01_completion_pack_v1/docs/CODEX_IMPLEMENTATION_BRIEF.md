# Codex Implementation Brief — Mission 01 Completion Pack

## Integrar sin romper lo existente

No reemplazar el sistema actual de stage views. Este pack sólo agrega:
- lógica de misión 01;
- estados de HUD;
- audio limpio;
- VFX de asteroides/reliquia;
- helper opcional para HologramRelic.

## Archivos sugeridos

Copiar:

```txt
assets/audio/
assets/vfx/
assets/hologram/
config/
src/audio/
src/mission/
src/vfx/
src/ui/
docs/
```

## Runtime mínimo esperado

1. Boot overlay: `GRAVEDAD ZERO / RUTA DESCONOCIDA / TOMA EL CONTROL`.
2. Primer click: desbloquea Web Audio.
3. `MISSION START`.
4. Astronauta sale.
5. Contador `OBSTÁCULOS MENORES 0/3`.
6. Al destruir 3 asteroides chicos: `NÚCLEO INESTABLE`.
7. Spawnea obstáculo grande.
8. La nave lo destruye.
9. Reveal de reliquia.
10. Astronauta toca reliquia.
11. Energía viaja a nave.
12. `STAGE UNLOCKED`.
13. Llamar a cambio de nave a stage 2.

## Debug recomendado

Agregar query param:

```txt
?debug=mission-01
```

Debe permitir probar:
- completar small asteroids,
- spawnear obstáculo grande,
- reveal relic,
- touch relic,
- stage unlock.

## Audio

Usar `assets/audio/audio_manifest.mission01.json`.
Inicializar audio sólo después de un gesto de usuario.

## VFX

Usar additive blending para:
- glows,
- shockwaves,
- particle atlas,
- energy transfer beam.

Usar NormalBlending para el core de reliquia si el alpha se ve mejor que con Additive.
