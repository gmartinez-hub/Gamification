# GRAVEDAD ZERO — Next Release Codex Pack

Este paquete es el source of truth para el próximo release.

## Objetivo del release

Cerrar la versión jugable con foco en:

1. Companion correcto, fiel a la referencia aprobada.
2. Companion tutorial: explica objetivos al clickearlo.
3. Autoaim sin spray raro y con rotación real del modelo hacia el objetivo.
4. Mundo realmente grande/procedural: navegación libre de varios minutos por dirección.
5. Más planetas, lunas y cuerpos sintéticos usando assets Three existentes.
6. Sensación de velocidad: botón de velocidad, progresión por stage, audio/música más intensa.
7. QA duro con evidencia.

## Leer en este orden

```txt
docs/01_CODEX_PROMPT_NEXT_RELEASE.md
docs/02_RELEASE_REQUIREMENTS.md
docs/03_COMPANION_VISUAL_AND_TUTORIAL_SPEC.md
docs/04_AUTOAIM_ZERO_G_ROTATION_SPEC.md
docs/05_PROCEDURAL_WORLD_AND_PLANETS_SPEC.md
docs/06_SPEED_SYSTEM_STAGE_PROGRESSION_SPEC.md
docs/07_AUDIO_AND_MUSIC_SPEED_SPEC.md
docs/08_ASSET_USAGE_MANIFEST.md
docs/09_IMPLEMENTATION_ORDER.md
docs/10_QA_NEXT_RELEASE.md
```

## Referencias visuales incluidas

```txt
visual-references/01_companion_reference_correct.png
visual-references/02_autoaim_concept_clean.png
visual-references/03_world_scale_more_planets_concept.png
visual-references/04_current_bad_line_artifacts.png
visual-references/05_current_latest_gameplay_reference.png
visual-references/06_current_latest_companion_closeup.png
```

## Regla importante

No inventar otra dirección visual. Corregir lo actual.

- El companion debe verse como `01_companion_reference_correct.png`.
- El autoaim debe evitar el spray raro y las líneas tipo wireframe.
- El mundo debe parecerse más a `03_world_scale_more_planets_concept.png`.
- La velocidad debe sentirse progresiva y controlable.
