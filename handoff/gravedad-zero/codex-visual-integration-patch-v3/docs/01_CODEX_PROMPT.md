# 01 — CODEX PROMPT

## Contexto

Repo: `gmartinez-hub/Gamification`

El estado actual ya tiene:

```txt
- gemBadge mínimo;
- HUD grande y controles ocultos por CSS;
- STAGE_WORLD_PROFILES;
- ORGANIC_SPAWN_BANDS;
- spawn offscreen/reveal orgánico;
- autoaim con rango, % éxito y missPoint;
- TURBO_UNLOCKS;
- companion 3D procedural;
```

Pero todavía falta subir e integrar assets nuevos y cerrar calidad visual.

## Objetivo del patch

Implementar un único patch + deploy:

```txt
1. Copiar assets nuevos de este pack al repo.
2. Cargar nuevas texturas planetarias en `worldTextures`.
3. Mapear esas texturas a `STAGE_WORLD_PROFILES`.
4. Reemplazar/elevar VFX de autoaim/disparo/impacto con assets nuevos.
5. Conectar turbo `F` con flame/propulsión visible.
6. Ajustar companion para parecerse más al original: menos detalle, colores correctos, expresión simple.
7. Mantener HUD minimalista: gem badge + companion panel.
8. QA con evidencia.
```

## No aprobar si

```txt
- no se copian los assets nuevos;
- los planetas siguen usando sólo las texturas viejas;
- sólo hay un planeta definido y el resto está grisado;
- los cuerpos aparecen dentro de cámara de golpe;
- el spray/halo de baja calidad sigue visible al andar o disparar;
- el autoaim no tiene VFX premium;
- el turbo no tiene fuego/propulsión clara;
- el companion sigue con colores incorrectos o se ve como otro personaje;
- vuelve el HUD grande o botones visibles;
- no hay deploy ni QA.
```

## Commit sugerido

```txt
Integrate Gravedad Zero premium textures companion and shot FX
```
