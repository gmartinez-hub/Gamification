# 01 — CODEX PROMPT / Unified Release Patch v2

## Objetivo

Implementar un patch único + deploy + QA que ajuste el release actual con estas decisiones:

```txt
1. Spawn orgánico de mundos/cuerpos:
   - no aparecer en cámara;
   - no spawnear en la cara;
   - aparecer fuera del viewport;
   - entrar al navegar;
   - sentirse descubierto, no instanciado.

2. Companion-only HUD:
   - sacar HUD fijo por defecto;
   - sacar clickeables de stage;
   - sacar botones visibles de stage/velocidad como UI principal;
   - toda comunicación pasa por companion al clickearlo;
   - conservar sólo insignia mínima de gemas arriba a la izquierda.

3. Stage world profiles:
   - cuerpos/planetas definidos y vivos por stage;
   - aparición progresiva según gemas y navegación;
   - no un único planeta definido con el resto grisado.

4. Gameplay:
   - sectores desbloqueables;
   - turbo con F y capacidad según stage/gemas;
   - autoaim con rango, % éxito, desvío/miss;
   - sensación de gravedad cero con rotación o campo de orientación.
```

## No aprobar si

```txt
- aparece un planeta/cuerpo nuevo en medio de la cámara de golpe;
- aparecen mundos sobre la nave;
- los cuerpos se teletransportan a la vista;
- el HUD grande sigue visible durante gameplay;
- siguen visibles stageButton/speedButton como controles principales;
- se puede cambiar de stage clickeando botón;
- no hay companion tutorial;
- no hay insignia mínima de gemas;
- los planetas secundarios siguen todos grisados/fondo;
- no hay mundos definidos por stage;
- F no acelera;
- autoaim pega desde cualquier distancia.
```

## Commit sugerido

```txt
Implement organic world reveal companion HUD and unlockable turbo aim
```
