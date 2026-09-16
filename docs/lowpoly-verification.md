# Verificación — Gravedad Zero V3

Fecha: 2026-09-16. Entrada `index.html`; original conservado en `legacy.html`. Pruebas locales con el código V3; el enlace de Vercel se comprueba además al entregar.

## Reglas y simulación

`npm test`: **77 pruebas aprobadas**. Cubren:

- Tres sectores, orden de acciones, armas correctas, fallos recuperables y módulos exclusivamente después del corredor.
- Generación reproducible y recorridos completos de peligros separados de las interacciones obligatorias.
- Deriva, aceleración, frenado, reversa sin giro automático, inercia angular y estabilidad con distintos pasos de tiempo.
- Guía con frenado anticipado; salida y retorno alrededor del casco; cuerpo y casco del astronauta protegidos.
- Puerto rotado y cable con tensión desde 22 m y límite de 26 m; nave anclada durante EVA.
- Colisión relativa entre fotogramas, normal del lado de entrada, separación y restitución sin perder velocidad tangencial ni exceder límites.
- Escalas visibles de nave/astronauta/companion, cabina, acople, motores apagados en deriva y conservación de transformaciones.
- Cielo distante con escala angular estable; peligros que continúan con movimiento reducido; orden y límites de fotogramas en atlas.
- Selección de la acción móvil según fase, actor, alcance, guía, escaneo, recarga, disparo, regreso y transiciones; bloqueo y reinicio al completar.
- Liberación táctil cuando falta el evento Pointer terminal, conservación del segundo dedo, teclado y mouse, y limpieza al ocultar o abandonar la página.

Simulación adicional de 30 semillas × 3 sectores: baliza, tres objetivos EVA, abordaje, núcleos, acercamiento de nave a la gema, recogida, retorno y corredor sin rutas bloqueadas.

`node --check src/lowpoly/main.js` y `git diff --check`: sin errores.

## Chrome en macOS

Playwright y agent-browser, botones/teclado/touch reales y telemetría de solo lectura; sin saltar fases ni mutar el estado de la misión.

- Escritorio 1440×900: expedición completa, disparos acertados/fallidos, cabina, abordajes, tres gemas, progresión 33→67→100%, final y reinicio con nueva semilla.
- Móvil emulado 390×844: mismo recorrido completo con taps. El cable se recoge al abordar y el crecimiento ocurre al salir del corredor.
- Touch simultáneo de avance y subida. Soltar/cancelar deja deriva y libera los controles; mantener Estabilizar llega a velocidad cero.
- Horizontal 844×390: ocho controles de acción y movimiento dentro de la pantalla y alcanzables por hit-test.
- Nave: empuje de dos segundos produjo aproximadamente 5,8 m/s; al soltar conservó unos 5,5 m/s y empuje cero; Q la detuvo. Reversa conservó rumbo; avance con inclinación cambió altura.
- Pausa congela posición; diálogo conserva Tab/Escape; salir de inspección conserva rumbo del piloto.
- Peligro real alcanzado por teclado: aviso anticipado; integridad 100→85 y respuesta física que sigue durante la inmunidad; cable máximo 20,13 m. Mantener Q contra la trayectoria sostiene el contacto y puede quitar otros 15 puntos después de aproximadamente dos segundos. No hay una regla de daño único por pasada.
- Mapas reutilizados, relieves, nebulosa y atlas cargan sin errores de shader. Efectos con pool limitado, oclusión por geometría, expiración y cuadros independientes.
- Audio opcional: manifiesto y 14 WAV HTTP 200. No se midió salida acústica física.
- Recorridos completos sin errores de página, consola o HTTP.

## Correcciones de integración

Se preserva el rumbo al cancelar guía y al salir de inspección; frenar no cancela el escaneo. El cruce parte de la posición real de entrada y orienta suavemente hacia el corredor. La llegada al bioma cambia de escena bajo un velo breve, antes del montaje. Los instrumentos de cabina quedaron delante del borde sólido para evitar que éste los ocultara. La inmunidad afecta al daño, no a la separación física de las rocas.

## HUD móvil compacto — revisión del 16 de septiembre

Se reemplazan los paneles superpuestos por sector, objetivo breve, integridad y cable arriba; un botón contextual y controles de vuelo abajo. Gemas, construcción, Nóma, ayuda, cámara y sonido quedan en un menú que pausa la simulación. La acción de combate muestra la probabilidad de acierto y permite cambiar de objetivo.

Verificación en Chrome con emulación táctil:

- Tamaños 320×568, 390×650, 393×696, 390×844, 740×390 y 844×390, exterior y primera persona: controles visibles de al menos 44 px, dentro del viewport, sin solapamientos y alcanzables por hit-test.
- Áreas seguras simuladas: inferior de 34 px en vertical; laterales de 47 px e inferior de 21 px en horizontal. Botón secundario de combate y menú con desplazamiento incluidos.
- Menú congela vuelo y guía; cerrar o Escape los restaura. Ayuda conserva pausa y navegación con Tab. Cambio de cámara, inspección, regreso a exploración y nueva expedición accesibles desde móvil.
- Expedición de tres sectores con 66 pasos usando sólo el botón contextual, cambio de objetivo y menú móviles: disparos, cable recogido al abordar, tres gemas, módulos 33→67→100%, inspección y reinicio. Sin errores de página, consola ni HTTP.
- Escritorio 1440×900: sin cambios de presentación; comprobados deriva, freno, reversa, ascenso con inclinación, pausa, ayuda e inspección. Sin errores JavaScript.

Corrección táctil posterior al reporte en iPhone:

- WebKit 26.5 de macOS confirmó que flechas y opciones computaban `-webkit-user-select: text`; con la corrección computan `none`. Los controles desactivan además el callout de iOS y el hover sólo se aplica a dispositivos con puntero fino y hover. Texto de ayuda y enlaces conservan selección; el diálogo conserva desplazamiento.
- Cinco regresiones de cancelación fallaron antes de añadir el respaldo por `touchend`/`touchcancel`; las siete pruebas de controles pasan. El respaldo compara los targets de los contactos activos sin asumir que Touch.identifier coincide con pointerId. No corta pulsaciones por tiempo.
- Chrome: dos dedos mantenidos durante más de cinco segundos, liberación independiente, soltar fuera del botón, cancelación nativa sin evento Pointer terminal y `pagehide`; sin controles activos residuales.
- WebKit con viewport táctil: siete flujos de menú, pausa, ayuda, cámara e inspección; toque real libera empuje y estado visual; guía, escaneo y disparo completos, ocho texturas cargadas, sin errores de página ni HTTP. No se reprodujo el menú nativo de selección de un iPhone físico.

Acceso directo a cámara: añadido botón visible junto al menú, sin aumentar la altura de la franja superior. Chrome y WebKit verifican Visor↔Exterior con astronauta, Cabina↔Exterior a bordo, salida de inspección y taps sin abrir el menú ni pausar. Tamaños 320×568, 390×650, 740×390 y 844×390; controles de al menos 44 px, sin superposición con sector o estado. Se conservan las restricciones de cámara durante montaje, tránsito y final. Sin errores de página ni HTTP.

## Límites de las pruebas

Las pruebas automatizadas usan móvil emulado; no incluyen mediciones de rendimiento en Safari iOS o Android real ni garantizan una tasa de cuadros en esos equipos. El disparo continúa asistido y la cabina no es un interior caminable. El cable no resuelve enredos; las colisiones usan esferas y la cámara no colisiona con decoración. La nave se ancla durante EVA. La gravedad cero se expresa mediante inercia y propulsores; no hay atracción planetaria. No hay guardado persistente, exportación GLB ni proyecto Godot. Se mantiene geometría low poly con materiales y recursos reutilizados.
