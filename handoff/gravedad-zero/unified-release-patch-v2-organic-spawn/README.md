# GRAVEDAD ZERO — Unified Release Patch v2 / Organic Spawn + Companion-only HUD

Este paquete reemplaza al anterior como source of truth.

## Cambio clave de esta versión

Los mundos/planetas/cuerpos nuevos NO deben aparecer de golpe en cámara ni spawnear en la cara del jugador.

Deben:

```txt
spawnear fuera del viewport
entrar orgánicamente por navegación/parallax
ser descubiertos al viajar
quedar ligados al stage/sector/gemas
```

## Otra decisión clave

Eliminar HUD/clickables por defecto:

```txt
- No HUD grande fijo arriba a la izquierda.
- No botones visibles de stage.
- No stageButton clickable como control principal.
- No speedButton visible como botón UI principal.
- La comunicación de misión, stage, turbo, tutorial y objetivo ocurre vía companion al clickearlo.
- Sólo queda una insignia mínima arriba a la izquierda cuando hay gemas/progreso.
```

## Leer en orden

```txt
docs/01_CODEX_PROMPT_UNIFIED_RELEASE_V2.md
docs/02_COMPANION_ONLY_HUD_RULES.md
docs/03_ORGANIC_PROCEDURAL_SPAWN_RULES.md
docs/04_STAGE_WORLD_PROFILES_AND_PROGRESSIVE_VIVID_BODIES.md
docs/05_GAMEPLAY_UNLOCKS_TURBO_AND_AIM.md
docs/06_IMPLEMENTATION_ORDER.md
docs/07_QA_V2_ORGANIC_SPAWN.md
```
