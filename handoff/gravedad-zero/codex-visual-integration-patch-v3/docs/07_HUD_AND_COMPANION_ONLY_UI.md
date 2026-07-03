# 07 — HUD and Companion-only UI

## Estado deseado

Durante gameplay:

```txt
- NO mission-hud grande.
- NO stage button visible.
- NO speed button visible.
- SÍ gemBadge mínimo arriba a la izquierda.
- SÍ companion clickeable.
- Toda explicación vía companion panel.
```

## Debug

Si Codex necesita conservar controles:

```txt
permitir sólo con ?debugHud=1
```

Producción:

```txt
display: none
pointer-events: none
```

## QA

```txt
[ ] No hay botones stage/speed en prod.
[ ] No hay HUD grande.
[ ] Gem badge visible y discreto.
[ ] Companion abre tutorial.
```
