# Verificación — Gravedad Zero V3

Fecha: 2026-09-16. Entrada `index.html`; original conservado en `legacy.html`. Pruebas locales con el código V3; el enlace de Vercel se comprueba además al entregar.

## Reglas y simulación

`npm test`: **59 pruebas aprobadas**. Cubren:

- Tres sectores, orden de acciones, armas correctas, fallos recuperables y módulos exclusivamente después del corredor.
- Generación reproducible y recorridos completos de peligros separados de las interacciones obligatorias.
- Deriva, aceleración, frenado, reversa sin giro automático, inercia angular y estabilidad con distintos pasos de tiempo.
- Guía con frenado anticipado; salida y retorno alrededor del casco; cuerpo y casco del astronauta protegidos.
- Puerto rotado y cable con tensión desde 22 m y límite de 26 m; nave anclada durante EVA.
- Colisión relativa entre fotogramas, normal del lado de entrada, separación y restitución sin perder velocidad tangencial ni exceder límites.
- Escalas visibles de nave/astronauta/companion, cabina, acople, motores apagados en deriva y conservación de transformaciones.
- Cielo distante con escala angular estable; peligros que continúan con movimiento reducido; orden y límites de fotogramas en atlas.

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

## Límites

Móvil emulado; no se verificó aún en teléfono físico, Safari iOS o Android real, ni se garantiza una tasa de cuadros en esos equipos. El disparo continúa asistido y la cabina no es un interior caminable. El cable no resuelve enredos; las colisiones usan esferas y la cámara no colisiona con decoración. La nave se ancla durante EVA. La gravedad cero se expresa mediante inercia y propulsores; no hay atracción planetaria. No hay guardado persistente, exportación GLB ni proyecto Godot. Se mantiene geometría low poly con materiales y recursos reutilizados.
