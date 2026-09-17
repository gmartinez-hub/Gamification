# Gravedad Zero — un viaje, pieza por pieza

Expedición jugable en Three.js con modelos Meshy: nave de tres módulos, astronauta riggeado con herramienta, cabina envolvente, baliza, companion y asteroides. Tres biomas combinan un recorrido diseñado con posiciones procedurales reproducibles. Conserva vuelo inercial, cable, combate asistido, gemas, partículas, audio y guardado por sector.

Los modelos y mapas se descargan al iniciar; la primera carga pesa aproximadamente 200 MB. La fidelidad de los archivos elegidos se conserva. El render mantiene la proporción de pantalla con resolución interna máxima de 1280×720 y ajuste dinámico. [Integración y contratos](docs/meshy-integration.md).

## Ejecutar localmente

Con Node.js, npm y Python 3 disponibles, desde la raíz del repositorio:

```bash
npm run dev
```

Abrí [el juego](http://127.0.0.1:8787/). No hace falta `npm install`: Three.js está incluido en `vendor/`. También podés iniciar el servidor directamente:

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

El juego necesita un servidor HTTP y WebGL 2; abrir el HTML desde el disco no alcanza.

## Recorrido de la expedición

En cada sector:

1. Explorá con el astronauta y escaneá la baliza durante unos segundos, manteniéndote cerca.
2. Destruí **tres asteroides pequeños** con su arma.
3. Volvé físicamente al acceso de la nave. Al abordar, el astronauta y el cable desaparecen y se habilita el pilotaje.
4. Destruí los núcleos grandes con la nave: **uno en Nereida, dos en Vesper y tres en Umbra**.
5. Acercá la nave a la gema liberada, salí como astronauta y recogela.
6. Volvé a abordar y atravesá el corredor hacia el siguiente sector.

La gema habilita el corredor. El hábitat se incorpora al finalizar el primer cruce y la propulsión al finalizar el segundo. El tercer corredor completa la expedición; no añade un cuarto módulo.

El astronauta vuela en XYZ y permanece unido al puerto físico de la nave por un cable de **26 m**, que empieza a tensarse progresivamente desde los **22 m**. La nave conserva posición y orientación durante la salida. Para explorar más lejos, regresá, mové la nave y volvé a salir. La guía y el regreso buscan una ruta exterior alrededor del casco hasta la escotilla.

El botón **Guiar** desplaza al personaje hacia el objetivo y frena antes de llegar; el jugador decide cuándo escanear, disparar y recoger. El movimiento manual o el freno cancelan la guía. El escaneo y el apuntado aplican estabilización, sin detener instantáneamente una deriva.

## Vuelo y escala

La base es **gravedad cero con inercia**: al soltar el empuje seguís derivando, con una amortiguación leve para facilitar el control. Mantené **Q** o el botón táctil **Estabilizar** para activar los propulsores de frenado y detenerte. Cambiar de dirección requiere contrarrestar el movimiento previo. No hay atracción gravitacional de los planetas ni simulación orbital.

La nave tiene aceleración y giro limitados; su rumbo es independiente de la velocidad. Puede retroceder o desplazarse lateralmente sin dar media vuelta. Los motores responden al empuje y al frenado, y se apagan durante la deriva. La cámara de cabina acompaña la orientación física de la nave y conserva un horizonte sin alabeo.

| Modelo | Dimensión aproximada |
|---|---|
| Cabina inicial | 6,18 m de longitud |
| Cabina y hábitat | 10,96 m de longitud |
| Nave completa | 14,53 m de longitud |
| Astronauta | 1,93 m de altura |
| Companion | 0,7 m de altura |

La vista en primera persona de la nave incluye marcos, consola y elementos de una cabina 3D. El astronauta mantiene la vista de visor; avanzar desde esa vista sigue también la inclinación de la mirada. La inspección exterior permite revisar los módulos y sus proporciones.

El disparo es asistido: seleccionás un objetivo, ves la probabilidad y activás una secuencia de fijación y proyectil. Acercarte y frenar mejoran el acierto. El resultado se decide al disparar; la animación no simula una colisión física del proyectil. Los fallos se pueden reintentar después de la recuperación del arma.

## Peligros y biomas

Las rocas rojas son peligros móviles con trayectorias acotadas y reproducibles. Sus velocidades máximas varían según la semilla: aproximadamente **1,15–1,60 m/s en Nereida**, **1,55–2,00 m/s en Vesper** y **1,95–2,40 m/s en Umbra**. Las líneas de trayectoria y el aviso direccional ayudan a anticiparlas. La generación protege las zonas de interacción y el corredor.

Las colisiones comprueban el recorrido entre fotogramas de las esferas del jugador y del peligro. El contacto separa los cuerpos y produce un rebote leve, conservando el movimiento tangencial. Cada impacto quita **15–38 puntos de integridad**, según la velocidad relativa, y deja **2 segundos de protección contra nuevo daño**; esa protección no desactiva la respuesta física. Al llegar a cero se recupera la integridad; si estás fuera, empieza un regreso de emergencia a la nave. Conservás los objetivos completados. Los asteroides ambientales y planetas son decorativos.

| Bioma | Entorno |
|---|---|
| Nereida | Planeta oceánico, nubes, luz cálida y formaciones de roca con superficies aplanadas |
| Vesper | Planeta con anillos, fragmentos alargados, cinturón diagonal y luz violeta fría |
| Umbra | Planeta oscuro, formaciones más verticales y luz cobriza con acentos rosados |

Los planetas están en una escena celeste separada, con rotación lenta y muy poco paralaje. El polvo y las rocas próximas aportan referencias de velocidad y profundidad. Cada bioma cambia geometría, iluminación y composición, además de la paleta; no cambia la física de gravedad cero.

## Controles

| Acción | Computadora |
|---|---|
| Avanzar, retroceder y desplazarse a los costados | WASD o flechas; rumbo de la nave al pilotar, cámara al controlar al astronauta |
| Subir / bajar | Espacio / C |
| Impulso | Mantener Shift |
| Frenar / estabilizar | Mantener Q |
| Mirar u orientar la nave | Arrastrar sobre el espacio |
| Seleccionar objetivo | Clic sobre un objetivo o Tab con el foco en el mundo |
| Disparo asistido | F |
| Escanear / recoger gema | E, cerca del objeto y con el astronauta |
| Guiar al objetivo / detener guía | G |
| Volver y abordar / salir como astronauta | R / X |
| Alternar exterior y visor o cabina | V |
| Inspeccionar nave | I |
| Zoom | Rueda o botones + / − |
| Pausar / continuar | Esc o botón de pausa |
| Sonido | Botón ♪; comienza desactivado |

En móvil, usá la cruceta para moverte, **ALT** para subir o bajar y los botones de impulso y **Estabilizar**; pueden combinarse con varios dedos. Arrastrá sobre el espacio para mirar u orientar la nave. Un solo botón principal cambia entre guiar, escanear, disparar, abordar y recoger según el objetivo y la distancia; durante el combate aparece además **◎** para cambiar de objetivo. El disparo muestra su probabilidad de acierto.

Arriba quedan el objetivo, la integridad y el cable. El botón **Visor** permite entrar directamente en primera persona y cambia a **Exterior** para salir; cuando estás a bordo se llama **Cabina**. El menú **☰** pausa la partida y reúne el progreso de la nave, las gemas, la guía de Nóma, el sonido, la ayuda, la inspección y las opciones de cámara. Al cerrarlo continuás donde estabas. Los controles respetan las áreas seguras del teléfono y se adaptan a vertical y horizontal.

## Semilla y alcance

La ruta conserva su estructura y cambia posiciones dentro de volúmenes seguros. La semilla controla balizas, asteroides, peligros y la ubicación de la gema junto a un núcleo. Podés repetir una distribución con [una URL con semilla](http://127.0.0.1:8787/?seed=620), por ejemplo `?seed=620`; la semilla actual aparece como **RUTA** en pantalla. **Nueva expedición** genera otra semilla y actualiza la URL.

El progreso dura esta sesión y se reinicia al recargar. El objetivo de esta versión sigue siendo probar mecánicas y diseño del nivel: mantiene geometría low poly, cable sin enredos y disparos asistidos. La dirección visual se acerca al póster mediante proporciones, materiales, iluminación y composición; el póster no representa una captura del juego. No incluye arte final, guardado persistente, exportador GLB ni proyecto Godot. Los personajes usan piezas rígidas articuladas.

- [Juego actual](http://127.0.0.1:8787/): `index.html` y `src/lowpoly/`.
- [Prototipo anterior](http://127.0.0.1:8787/legacy.html): conserva su entrada y `src/main.js`.
- [Laboratorio de fondos](http://127.0.0.1:8787/background-lab/): herramienta independiente.
- [Modelos, recursos y contratos](docs/lowpoly-assets.md).

## Pruebas y publicación

```bash
npm test
```

Las pruebas cubren reglas de misión, generación, inercia y frenado, orientación, cable, regreso alrededor del casco, trayectorias de peligros, colisiones entre fotogramas, combate y contratos de los modelos. La presentación, las cámaras, los controles táctiles y el audio requieren además verificación en navegador. Consultá el [registro de verificación](docs/lowpoly-verification.md) para conocer lo comprobado y sus límites; la emulación móvil no sustituye las pruebas en un teléfono físico.

El proyecto es estático y puede alojarse en un servidor web conservando sus rutas.
