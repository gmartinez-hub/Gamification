# Verificación — expedición low poly

Fecha: 2026-09-16. Entrada: `index.html`; versión original conservada en `legacy.html`.

## Pruebas de reglas

`npm test`: 27 pruebas aprobadas. Cubren:

- Orden de escaneo, tres objetivos pequeños y 1/2/3 núcleos grandes por sector; cada arma tiene su rol.
- Gema sin crecimiento inmediato; módulo solamente después del corredor; final tras el tercer sector.
- Layouts reproducibles, independencia de semillas, alcance y separación segura en 100 semillas × 3 sectores.
- Disparo fuera de alcance/arma incorrecta rechazado; impacto después de preparación y viaje; fallo recuperable y reinicio.
- Vuelo XYZ, cable de 26 m, retorno físico, nave anclada durante EVA, freno, límites de mundo y consistencia entre frecuencias de actualización.
- Crecimiento acumulativo de módulos, acople animado y conservación de transformaciones externas de navegación.

`git diff --check` sin errores. `node --check src/lowpoly/main.js` aprobado. Los tests del primer prototipo de recogida inmediata se sustituyeron por reglas de expedición: aquella progresión ya no participa del juego.

## Navegador

Chrome real en macOS, controlado mediante Playwright y agent-browser. Sin manipular el estado del juego: acciones por botones/teclado/touch, observación mediante HUD y telemetría de solo lectura.

- Escritorio 1440×900: recorrido completo de tres sectores, escaneo, disparos acertados/fallidos con ambos actores, retorno con cable aún visible durante aproximación, abordaje, gema, corredores, crecimiento 33→67→100%, final y nueva expedición.
- Verificación independiente de controles: vuelo horizontal/vertical, pausa exacta, arrastre de cámara, visor, ayuda que pausa y conserva Tab/Escape nativos.
- Móvil emulado 390×844: recorrido completo de tres sectores con taps reales, fallos recuperables, regreso/abordaje, gemas, módulos, final y reinicio; controles visibles, dos dedos simultáneos (avance+subida), cancelación táctil y freno posterior.
- Horizontal emulado 844×390: controles accesibles, sin solapamiento entre misión y avance (67,56 px de separación tras corrección).
- Impacto real contra un peligro mediante teclado: integridad 100→75; regreso y cable recogido. El impulso del impacto pasa por la simulación para respetar los límites.
- Nueva expedición genera una semilla en URL; recargar conserva la semilla normalizada.
- Audio opcional: manifiesto y los 14 WAV respondieron HTTP 200; activar/silenciar funciona en interfaz. No se midió salida acústica física.
- Recorridos completos de escritorio/móvil y revisión de entradas sin errores de consola, página o HTTP.

## Revisión y correcciones

Revisión independiente de integración resolvió cuatro defectos: guía cancelada tras despliegue automático, semilla numérica URL interpretada como texto, nave oculta durante cámara exterior forzada y cámara recorriendo el salto entre sectores durante el acople. Se verificó que cámara, visibilidad y HUD usan la misma condición de visor; el cambio de bioma ocurre tras un velo breve y el módulo empieza a acoplarse después de revelar el encuadre. La inspección oculta los anillos del corredor para que no crucen el modelo de la nave.

## Límites de la evidencia

Es una propuesta jugable para estabilizar mecánicas. No se verificó en un teléfono físico, Safari iOS ni Android real; no hay compromiso de FPS en esos equipos. Las vistas de visor/cabina son experimentales y el apuntado sigue siendo asistido. El cable no se enreda; las colisiones usan esferas; la cámara no tiene colisión con geometría. No hay guardado, exportación GLB ni port a Godot. La calidad visual es deliberadamente low poly. No se publicó un despliegue.
