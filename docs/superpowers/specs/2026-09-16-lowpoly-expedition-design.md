# Expedición low poly completa

Autorizada en conversación: continuar en Three.js low poly, computadora y móvil, astronauta vuelve físicamente a la nave y el cable desaparece al abordar.

## Experiencia

Tres sectores con recorrido dirigido y distribución procedural reproducible por semilla. Cada sector: salir de la nave → encontrar y escanear baliza → destruir tres asteroides con astronauta → volver y abordar → destruir 1/2/3 núcleos con nave → salir y recoger gema → volver y abordar → atravesar corredor. Al cruzar el corredor se acopla hábitat/propulsión y cambia el bioma. Tercer corredor termina expedición.

Vuelo con traslación XYZ y horizonte estable. Cable con longitud máxima y aviso de tensión; limita alejamiento sin física de enredos. Regreso asistido mueve al astronauta visiblemente hasta el punto de acceso antes de ocultarlo. Nave inmóvil con astronauta fuera. Cámara tercera persona persistente; vista alternativa de visor/cabina, seleccionable; órbita por arrastre. Objetivos seleccionables y disparo asistido con preparación, probabilidad visible, proyectil y resultado. Fallar no bloquea el progreso. Nave y astronauta tienen roles distintos. Peligros separados de decoración, daño con intervalo y rescate si integridad llega a cero (EVA regresa a la nave; pilotando se restablece integridad con maniobra vertical).

## Límites conscientes

Geometría low poly existente para protagonistas. Reutilizar texturas planetarias, roca y audio. No migración a Godot, texturas finales, cable que se enrede, multijugador ni guardado persistente. Geometría y reglas separadas para poder cambiar visual después. La ayuda incluye reglas, controles y semilla; nueva expedición cambia distribución. Sin disparos automáticos al orientar la cámara. Las vistas cercanas son una opción experimental para evaluar.

## Contratos

- `expedition.js`: estado y reglas puros; `createExpedition(seed)` devuelve `{state, scan(), hit(id, actor), collectGem(), enterCorridor(actor), finishTransit(), reset(seed)}`. Métodos devuelven booleano. Estado estable con `seed, sector` (0..2), `moduleStage` (1..3), `phase` (`scan|small|large|gem|return|transit|complete`), `gems`, `destroyed` (array ids), `layout`. `layout`: `beacon` posición XYZ, `small[]/large[]/hazards[]` con `{id,position:{x,y,z},radius}`, `gem`, `gate`, `exit` posiciones XYZ, `name`, `color`. En gem y return solo cambia fase, no módulo. `aimChance({distance, actor, sector, speed})` y `createRandom(seed)` exportados. Posiciones alcanzables: nave inicia (0,0,10), baliza y pequeños a <=24m de (2,0,10); grandes en z -25..-38; gema cerca del último núcleo; gate (0,0,-56), exit (0,0,-80).
- `flight.js`: `createFlight()` devuelve objeto con `actor` (`astronaut|ship`), `shipPosition`, `astronautPosition`, `velocity` (THREE.Vector3), `returning`, `tetherLength`, `tension`, `reset()`, `deploy()`, `returnToShip()`, `update(dt, direction, boost)`; inicia astronauta (2,0,10), nave (0,0,10). Nave solo controlable tras regreso; cable máximo 26m. Regreso aborda automáticamente al llegar. `position` getter devuelve posición activa. Límite mundo x ±50, y ±22, z -90..35. Dirección normalizada XYZ; freno amortiguado. Las pruebas pueden usar posiciones públicas para configurar escenarios.
- `controls.js`: `createControls(canvas, {onAction,onFire,onTarget,onView,onPause,onReturn,onDeploy,onNavigate,onInspect})` escucha teclas, arrastre y controles touch. Devuelve `{sample(), clear(), dispose()}`; sample `{x,y,z,boost,lookX,lookY}` (z positivo atrás); look consumido por frame. Botones touch `[data-move]` valores left,right,forward,back,up,down,boost. Root integra botones de acciones vía DOM, controles solo teclado/movimiento/arrastre.
- `sector-world.js`: `createSectorWorld(scene)` devuelve `{load(layout), sync(state,time), targets, beacon, gem, gate, hazards, dispose()}`. targets/hazards arrays `{id,object,position:THREE.Vector3,radius,kind:'small'|'large'|'hazard'}`. beacon/gem/gate THREE.Group. load reconstruye grupos de sector y libera recursos propios. sync oculta destruidos, activa por fase y anima con desplazamiento acotado sin mutar layout. Sin carga DOM al importar. Fondo separado de objetos jugables, planetas y asteroides ambientales instanciados, identidad de bioma.
- `main.js`: integra reglas, vuelo, escena, HUD, selección, apuntado, cámara, transiciones, sonido y pausa. Sin atajos de prueba que alteren estado en producción.

## Validación

Node: orden y roles de misión, semilla determinista y distribución segura, módulo solamente al finalizar corredor, cable y regreso físico, movimiento vertical y freno. Navegador: recorrido completo por controles normales, tiros fallidos recuperables, pausa, vistas y touch; capturas escritorio y móvil emulado. Móvil físico pendiente de usuario.
