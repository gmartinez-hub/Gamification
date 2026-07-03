# GRAVEDAD ZERO — Codex Visual Integration Patch v3

Este paquete es el source of truth para el próximo patch de Codex.

## Objetivo

Integrar assets nuevos y cerrar visualmente:

1. Planetas/cuerpos nuevos más definidos.
2. Stage world profiles con texturas reales nuevas.
3. Spawn orgánico: nada aparece dentro de cámara.
4. Autoaim y disparos con VFX más premium.
5. Turbo con `F` y fuego/propulsión visible.
6. Companion más fiel al original: simple, geométrico, colores correctos.
7. HUD limpio: sin HUD grande ni botones visibles; sólo gem badge + companion al click.
8. Deploy único + QA con evidencia.

## Leer en orden

```txt
docs/01_CODEX_PROMPT.md
docs/02_ASSET_COPY_AND_PATHS.md
docs/03_WORLD_TEXTURE_INTEGRATION.md
docs/04_COMPANION_VISUAL_FIX.md
docs/05_AUTOAIM_AND_SHOT_FX.md
docs/06_TURBO_FX.md
docs/07_HUD_AND_COMPANION_ONLY_UI.md
docs/08_QA_CHECKLIST.md
```

## Assets incluidos

```txt
assets/planets/
assets/vfx/
```

## Regla principal

No tocar toda la arquitectura de nuevo. La base jugable ya está. Este patch debe ser de **integración visual + QA**.
