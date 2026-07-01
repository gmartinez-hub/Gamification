# GRAVEDAD ZERO — Closing Visual Patch v3

Este patch es para cerrar la dirección visual después del último deploy/captura.

## Qué corrige

1. Companion sigue con sombra y se lee como sprite plano.
2. El mundo ganó elementos, pero hay ruido visual y poca jerarquía.
3. El HUD corta texto.
4. El autoaim tiene detalles bonitos, pero falta orientación física del modelo hacia el aim.
5. Los assets Three existentes no están siendo explotados con intención.
6. Falta un cierre QA más duro, visual y jugable.

## Source of truth

Usar este patch como source of truth para el próximo hotfix/cierre.

```txt
handoff/gravedad-zero/closing-visual-patch-v3/
```

Leer en este orden:

```txt
01_CODEX_PROMPT_CLOSING_PATCH.md
02_WHAT_WE_NEED.md
03_ASSET_INVENTORY_FOR_THREE.md
04_THREE_COMPANION_PRIMITIVE_SPEC.md
05_ZERO_G_AIM_ORIENTATION_SPEC.md
06_WORLD_VISUAL_HIERARCHY_SPEC.md
07_HUD_COPY_LAYOUT_SPEC.md
08_QA_CLOSING_VISUAL_PASS.md
```

## Objetivo

No agregar otra mega feature. Cerrar calidad:

```txt
menos ruido
más jerarquía
companion 3D real
autoaim con rotación zero gravity
HUD legible
assets usados como cuerpos/FX con intención
QA visual fuerte
```
