# Verificación de la primera versión low-poly

Fecha: 16 de septiembre de 2026. Base del repo: `3ff3ec565f04456ee248f217591f0e26c84283b0`.

## Pruebas automáticas

`npm test`: 10 pruebas aprobadas con Node.js 24.20.0.

- Nave acumulativa, reinicio y posición final del acople animado.
- Animación que conserva las transformaciones del controlador de navegación.
- Rechazo de etapas inválidas.
- Recogida secuencial, duplicados, identificadores inválidos, final y reinicio.
- Independencia del progreso entre instancias.

`git diff --check`: sin errores de espacios.

## Navegador

Verificación con Chrome local automatizado; una segunda sesión independiente realizó las pruebas de controles. Sin errores de consola, errores de página, peticiones fallidas o respuestas HTTP 400+ durante esos recorridos.

- Inicio, navegación a las tres balizas y recogida con botón o E.
- Contador 00 → 01 → 02 → 03; montaje 33% → 67% → 100%.
- Módulos nuevos se acoplan conservando la cabina.
- WASD y flechas; soltar teclas detiene el movimiento.
- Pausa con Escape bloquea movimiento; continuar lo reanuda.
- Ayuda pausa navegación y teclas; cerrarla permite continuar.
- Reinicio devuelve 00 gemas, 33%, una pieza y posición inicial del astronauta.
- El pack de 14 WAV responde HTTP 200; activar y silenciar actualiza el control. No se midió la salida audible ni la ganancia física del dispositivo.
- La entrada `legacy.html` carga su canvas y la interfaz original. Su HTML coincide con la entrada anterior.
- Inspección visual a 1280×633, 1440×900, 390×844 y 844×390. Se corrigieron el encuadre de inspección vertical y los solapamientos de interfaz en horizontal corto, además de una roca que atravesaba la plataforma.

## Límites

Las vistas móviles se emularon en Chrome; no reemplazan una prueba en teléfonos físicos o Safari. El recorrido nuevo es de exploración y ensamblaje. Combate, autoaim, reliquias y zonas siguen en el prototipo anterior. No hay persistencia, exportación GLB ni despliegue configurado en esta entrega.
