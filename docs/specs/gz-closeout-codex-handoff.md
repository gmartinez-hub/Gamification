# Gravedad Zero — handoff mínimo para Codex

Usar este archivo como entrada. No volver a reconstruir el contexto desde la conversación.

## Orden de lectura

1. `docs/specs/gz-closeout-start-here.md`
2. `docs/specs/2026-09-17-gravedad-zero-closeout.md`
3. `docs/specs/gz-closeout-performance.md`

La spec funcional está cerrada. Las decisiones D-01 a D-07 ya fueron respondidas por el usuario.

## Primera acción: preservar, no reempezar

Antes de editar:

- leer los `AGENTS.md` aplicables;
- identificar repo, worktree, rama, HEAD, cambios sin commit/untracked y remotos;
- inspeccionar `.worktrees/final-expedition` y rescatar el trabajo de performance pendiente;
- preservar `scripts/build-performance-lods.mjs` y los cambios locales registrados en `sector-world.js`, `asset-actors.js`, `bike-actor.js` y `main.js`;
- no ejecutar `reset --hard`, `clean`, checkout destructivo ni rebase automático;
- comparar cualquier base de trabajo con `main@ce1c5a7`.

## Assets nuevos locales

Los cuatro assets nuevos están en `$HOME/Downloads`:

- alien aliado verde;
- celda de energía;
- torreta modular;
- hangar.

Identificarlos por contenido y referencias del FigJam, no por nombre supuesto. Mantener originales intactos. Inventariar hash, formato, dimensiones/ejes, mallas/triángulos, materiales/mapas, rig y clips. Crear derivados de runtime sólo después de esa inspección.

## Contratos que no se recortan

- UI completa nueva: menú, hangar, inventario/equipo, bitácora/mapa, HUD, pausa, ajustes, carga/error/final.
- Hangar: escena 3D de mantenimiento, no transición; ensamblar, gastar carga, colocar/mover torretas y guardar 2–3 configuraciones.
- Nave modular: soportar como mínimo frontal+final, frontal+medio+final y frontal+medio+medio+final, sin hardcodear stage = cantidad de módulos.
- Torretas: al menos 2 por módulo de nave, 1 en moto, 1 en Nóma; colocación sobre superficies compatibles.
- Moto: viaja siempre entre sectores y mantiene equipamiento.
- Economía: asteroides/enemigos → carga; carga → torretas/módulos medios; gemas → progreso de ruta.
- Aliado verde: aparece en Vesper, se suma a la tripulación, usa la pistola existente y tiene movimiento/combate.
- Nóma: también debe tener estados de movimiento/reacción/defensa; no quedar estático.
- Torretas: nave = apoyo automático + salva manual; Nóma = defensa automática; moto = disparo sincronizado con jugador.
- Transición: gema → regreso/abordaje automático → jugador decide partir → anomalía/agujero negro 3D → nuevo mapa → primer acople automático del módulo nuevo.
- Aim PC: mouse = aim/cámara; clic = disparo; WASD/flechas = movimiento.
- Aim touch: joystick izquierdo = movimiento; zona derecha = aim/disparo con el mismo pulgar sin tercer dedo obligatorio.
- Primera/tercera persona se conservan.
- No nuevos jets, otro companion, conector Meshy ni munición nueva por defecto.

## Performance

Recuperar el paquete pendiente antes de rehacerlo. Mantener el contrato del anexo: originales completos cerca/objetivos/cinemáticas/inspección; LOD por tamaño/distancia; mapas/texturas completos; efectos importantes densos; física/damage completos; sombras selectivas; proyectil simplificado en vuelo con lectura aumentada; carga escalonada.

Validar al menos:

1. combate con frontal+2 medios+final, 2 torretas por módulo, torreta de moto, torreta de Nóma, aliado animado, enemigos, asteroides, disparos, fuego y partículas;
2. hangar con nave hero en máxima calidad, moto/tripulación y cambio rápido entre 2–3 presets;
3. entradas/salidas repetidas, primera aparición y cambio de sector.

Referencias: MacBook Air M1 e iPhone 16. Objetivos previos: 60 FPS Mac; 45 estables iPhone con piso de 30 en efectos intensos. Medir: no afirmar por simulación.

## Orden de implementación

1. Recuperación del worktree + baseline/perfilado.
2. Inventario de los cuatro GLB y handoff Blender/rigging/LOD.
3. Estado/persistencia de piezas, carga, presets y montaje.
4. Ensamblado modular + torretas funcionales.
5. UI completa + hangar + cámaras + aim.
6. Aliado/Nóma animados y narrativa.
7. Anomalía de salto y transición.
8. QA funcional + performance + preview.
9. Sólo después, decisión de promoción a producción con SHA/rollback.

No resumir de nuevo toda la historia antes de trabajar. Reportar sólo: evidencia encontrada, implementación realizada, prueba ejecutada, bloqueo técnico V concreto.
