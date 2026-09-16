# Gravedad Zero — un viaje, pieza por pieza

Expedición jugable low poly en Three.js: exploración en tres dimensiones, escaneo, combate con astronauta y nave, regreso por cable y construcción de **una nave por módulos**. Tres sectores combinan un recorrido diseñado con posiciones procedurales reproducibles. Nave, astronauta y companion son modelos nuevos; el entorno reutiliza texturas y audio del repositorio.

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

El astronauta vuela en XYZ y permanece unido por un cable de **26 m**. La nave se mantiene quieta durante la salida. Para explorar más lejos, regresá, mové la nave y volvé a salir. El botón **Guiar** desplaza al personaje hacia el objetivo; el jugador decide cuándo escanear, disparar y recoger. El movimiento manual cancela la guía.

El disparo es asistido: seleccionás un objetivo, ves la probabilidad y activás una secuencia de fijación y proyectil. Acercarte y frenar mejoran el acierto. El resultado se decide al disparar; la animación no simula una colisión física del proyectil. Los fallos se pueden reintentar después de la recuperación del arma.

Las rocas rojas son peligros: cada impacto quita **25 puntos de integridad**, con **2 segundos de protección** entre impactos. Al llegar a cero se recupera la integridad; si estás fuera, empieza un regreso de emergencia a la nave. Conservás los objetivos completados. Los asteroides y planetas de fondo son decorativos.

## Controles

| Acción | Computadora |
|---|---|
| Avanzar, retroceder y desplazarse a los costados | WASD o flechas, respecto de la cámara |
| Subir / bajar | Espacio / C |
| Impulso | Mantener Shift |
| Mirar alrededor | Arrastrar sobre el espacio |
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

En móvil, usá la cruceta para moverte, **ALT** para subir o bajar y el botón de impulso; pueden combinarse con varios dedos. Arrastrá sobre el espacio para mirar. Las acciones, el cambio de vista y el regreso a la nave también tienen botones. La cámara exterior acompaña al actor; visor y cabina son vistas experimentales para evaluar la jugabilidad.

## Semilla y alcance

La ruta conserva su estructura y cambia posiciones dentro de volúmenes seguros. La semilla controla balizas, asteroides, peligros y la ubicación de la gema junto a un núcleo. Podés repetir una distribución con [una URL con semilla](http://127.0.0.1:8787/?seed=620), por ejemplo `?seed=620`; la semilla actual aparece como **RUTA** en pantalla. **Nueva expedición** genera otra semilla y actualiza la URL.

El progreso dura esta sesión y se reinicia al recargar. El objetivo de esta versión es probar mecánicas y diseño del nivel: mantiene geometría low poly, cable sin enredos, cámaras experimentales y disparos asistidos. No incluye arte final, guardado persistente, exportador GLB ni proyecto Godot. Los personajes usan piezas rígidas articuladas.

- [Juego actual](http://127.0.0.1:8787/): `index.html` y `src/lowpoly/`.
- [Prototipo anterior](http://127.0.0.1:8787/legacy.html): conserva su entrada y `src/main.js`.
- [Laboratorio de fondos](http://127.0.0.1:8787/background-lab/): herramienta independiente.
- [Modelos, recursos y contratos](docs/lowpoly-assets.md).

## Pruebas y publicación

```bash
npm test
```

Las pruebas cubren reglas de misión, generación, vuelo, cable, regreso, combate y contratos de los modelos. La presentación, las cámaras, los controles táctiles y el audio requieren además verificación en navegador. Consultá el [registro de verificación](docs/lowpoly-verification.md) para conocer lo comprobado y sus límites.

El proyecto es estático y puede alojarse en un servidor web conservando sus rutas. Esta entrega no configura ni realiza un despliegue.
