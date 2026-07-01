# Codex Brief — Aim Assist + Slow Motion

Implementar target assist cinematográfico:

1. Si el usuario clickea target válido, entrar en aim sequence.
2. Mostrar reticle y click pulse.
3. Activar slow-motion breve.
4. Orientar actor hacia target con efecto cero gravedad.
5. En `fire_release`, disparar tool pulse o heavy shot.
6. Resolver impacto.
7. Salir de slow-motion.

Usar:
- `config/aimAssistRules.json`
- `config/audioCueMap.aimAssist.json`
- `config/assetManifest.aimAssist.json`

No generar nuevas animaciones todavía.
Usar placeholders:
- astronaut tool pulse → `wave`
- relic touch → `thumbs_up`
- ship fire → recoil + FX Three

Criterio de done:
- el disparo se siente intencional;
- el sonido cae en el cue exacto;
- no se requieren 9 filas de disparo para cerrar Mission 01.
