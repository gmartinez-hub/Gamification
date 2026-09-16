# Gravedad Zero — primera versión low-poly

## Objetivo y alcance aprobado
Crear una base jugable Three.js con una única nave que crece por módulos, astronauta y companion nuevos. Reutilizar texturas de planetas, audio y conceptos de progreso del repo. Mantener la implementación anterior accesible en legacy.html para continuar migrando sus sistemas. Esta entrega es una primera misión de exploración y ensamblaje; combate y autoaim permanecen en el prototipo anterior.

## Arquitectura
Web estática sin dependencias externas en ejecución. Three.js vendorizado. Módulos separados para modelos, entorno, progresión y aplicación. Coordenadas Y arriba, frente de modelos hacia -Z. Materiales estándar y partes identificables permiten mejorar geometrías sin reescribir el juego.

## Tareas y contratos
1. **Modelos**: src/lowpoly/models.js. Exportar createShip(), createAstronaut(), createCompanion(). Cada fábrica devuelve {group, update(time, options)}. Ship además setStage(1..3, animate=true), stages acumulativos cabina/cuerpo/propulsión. Astronauta ~1.8 unidades, nave completa ~6 unidades. Geometría nueva ivory/graphite/teal/copper, visor azul, companion ojo ámbar. Sin sprites viejos.
2. **Entorno**: src/lowpoly/environment.js. createEnvironment(scene) devuelve {beacons, update(time), setProgress(collectedCount)}. Beacons [{id, group, position:Vector3, gem:Group}] en XZ (-10,0), (5,-12), (14,2); altura de interacción 1.6. Planeta oceánico lejano, estrellas, asteroides, balizas físicas, ruta discontinua, plataforma central. Reusar texturas locales y soportar error de carga.
3. **Progresión**: src/lowpoly/progression.js + tests/progression.test.mjs. createProgression() devuelve state, collect(id), reset(). state {gems, stage, complete, activeBeacon}; collect secuencial sin duplicados, gems0→stage1, gems1→stage2, gems2→stage3, gems3→complete. Tests de orden, duplicación, final y reinicio antes de implementar.
4. **Integración**: index.html, src/lowpoly/main.js, src/lowpoly/styles.css. Nueva experiencia por defecto; legacy.html copia entrada anterior. Cámara 3/4, selección astronauta/nave, WASD/flechas y tocar para navegar, recolectar con E/botón, guía del companion, ensamblaje animado, pausa/sonido/reinicio, interfaz responsive. Audio existente tras gesto del usuario.
5. **Verificación**: pruebas de progresión y contrato de ensamblaje, recorrido completo en Chrome, capturas desktop y móvil, sin errores de consola ni recursos faltantes. README con ejecución, controles, reutilización, alcance y próximos pasos. Revisión independiente antes de entregar.

## Coordinación
Modelos, entorno y progresión tienen archivos separados. Integración consume contratos de arriba. No modificar src/main.js ni assets existentes. Nueva rama codex/low-poly-modular-world desde 3ff3ec5. Nuevo clon aislado; no worktree adicional necesario.

## Registro
- 2026-09-16: alcance confirmado por el usuario; interfaces revisadas. Las tres tareas independientes no comparten archivos. Integración usa exactamente sus firmas. La guía visual es el póster aprobado y la limitación de no reutilizar personajes/naves originales.
- Modelos, entorno, progresión e integración completos. 10 pruebas pasan y una revisión independiente no encontró defectos bloqueantes.
- Verificación en Chrome: misión completa, teclado, pausa, ayuda, audio, reinicio y entrada anterior. Evidencia y límites en docs/lowpoly-verification.md.
- Se corrigieron la intersección roca/plataforma, el encuadre vertical de inspección y los solapamientos de interfaz horizontal. El menú de misión queda inerte durante la inspección.
