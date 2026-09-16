# Modelos y recursos de la expedición low poly

La escena actual se construye en `src/lowpoly/` y se abre desde `index.html`. Nave, astronauta y companion tienen geometría propia y no cargan los sprites antiguos de esos personajes. `legacy.html` conserva el prototipo anterior para consultar y comparar.

## Geometría y presentación

| Elemento | Fuente | Construcción |
|---|---|---|
| Nave modular | `models.js` → `createShip()` | Cabina, hábitat y propulsión como grupos acumulativos con montaje animado |
| Astronauta | `models.js` → `createAstronaut()` | Casco, traje, extremidades y mochila con piezas rígidas articuladas |
| Companion | `models.js` → `createCompanion()` | Cuerpo facetado, ojo ámbar, aletas y propulsor, con flotación procedural |
| Objetivos y peligros | `sector-world.js` | Rocas facetadas con minerales y marcas; asteroides pequeños, núcleos grandes y peligros identificados por separado |
| Baliza, gema y corredor | `sector-world.js` | Mallas, cristal, anillos y luces que responden a la fase de la misión |
| Planetas, estrellas y asteroides ambientales | `sector-world.js` | Esferas, puntos, cinturón instanciado y shader de atmósfera; paletas para los tres biomas |
| Cable, selección y efectos de disparo | `main.js` | Línea entre astronauta y nave, retícula, proyectil y destello de impacto |

Los modelos se generan con geometrías de Three.js y principalmente `MeshStandardMaterial`. El astronauta usa jerarquías y pivotes, sin `SkinnedMesh` ni pesos de vértices. No se requiere Blender para ejecutar o modificar esta versión.

La nave es un único objeto compuesto. Recoger la gema habilita el corredor; el siguiente módulo se incorpora al terminar el cruce y llegar al nuevo sector. El tercer cruce completa la expedición sin añadir un cuarto módulo. El astronauta se oculta al abordar físicamente; su cable también desaparece. La vista de visor oculta el modelo del astronauta, y la de cabina oculta la nave para permitir la vista cercana. La cabina todavía no es un interior 3D modelado.

## Recursos existentes reutilizados

Se usan archivos locales del repositorio; el juego no descarga recursos de servicios externos.

| Ruta | Uso actual |
|---|---|
| `assets/runtime/three-textures/ocean-world-bright-color.png` | Planeta oceánico del primer bioma |
| `assets/runtime/three-textures/dark-crater-color.png` | Luna lejana y planetas de los biomas posteriores |
| `assets/runtime/three-textures/asteroid-surface-wide-color.png` | Superficie de asteroides ambientales, objetivos y peligros |
| `nave_three_audio_pack_v2_refined/AudioManager.js` | Reproductor existente, con archivos relativos al manifiesto |
| `nave_three_audio_pack_v2_refined/audio_manifest.json` y sus WAV | Audio de interfaz, escaneo, recompensa, acoplamiento y movimiento |
| `vendor/three.module.js` y `vendor/three.core.js` | Three.js local compartido por los módulos |

Los materiales conservan un color base si una textura no carga. El audio comienza silenciado y se inicializa al activarlo. Los otros atlas, sprites, fondos y packs siguen en el repositorio, pero no todos se utilizan en la expedición actual. Baliza, gema y corredor son geometría nueva.

## Contratos para continuar el trabajo

| Módulo | Responsabilidad y contrato |
|---|---|
| `models.js` | Fábricas con `{ group, update }`; `update(time, { moving, boost })` anima piezas. La nave añade `setStage(1..3, animate = true)` |
| `expedition.js` | Reglas puras y distribución: `createExpedition(seed)` devuelve estado estable y acciones de escaneo, daño, gema y tránsito; exporta azar independiente, probabilidad y alcance de las armas |
| `flight.js` | Posiciones XYZ, velocidad, límite del cable, despliegue y regreso físico; la nave queda inmóvil durante EVA |
| `controls.js` | Teclado, arrastre y controles táctiles; entrega ejes de movimiento y cambios de orientación a la aplicación |
| `combat.js` | Valida actor y alcance, decide acierto al disparar y reproduce tiempos de fijación, viaje y recuperación |
| `sector-world.js` | `createSectorWorld(scene)` con `load(layout)`, `sync(state, time)`, objetivos, peligros, baliza, gema, corredor y liberación de recursos |
| `main.js` | Integra reglas, controles, cámara, interacción, interfaz, audio, integridad y transiciones |

Las coordenadas usan Y hacia arriba y el frente de los personajes hacia −Z. La generación trabaja con posiciones XYZ simples dentro de volúmenes diseñados. Usa flujos aleatorios separados para distribución, peligros y combate; los detalles visuales tienen su propio generador. Una URL con `?seed=620` permite repetir la distribución. El movimiento visual de los objetos es acotado y no modifica el layout original.

El cable limita la distancia a 26 m sin resolver enredos o colisiones de la cuerda. Los peligros usan proximidad, quitan 25 puntos de integridad y aplican 2 segundos de protección entre impactos; el rescate conserva la misión. El disparo es asistido y su proyectil representa un resultado ya decidido. Estas decisiones permiten evaluar el recorrido antes de añadir simulaciones más complejas.

Para sustituir un protagonista por un GLB, conservá escala, orientación, pivotes, uniones de módulos y las fábricas anteriores. Sus clips se pueden adaptar a `update` y `setStage`. Texturas más detalladas no reemplazan el trabajo de silueta y proporciones.

## Alcance y futura migración

Esta entrega prioriza mecánicas y nivel en low poly para computadora y móvil. No incluye arte final, guardado persistente, exportador GLB ni proyecto Godot. La verificación en un dispositivo móvil físico se registra aparte de la emulación de navegador.

Una exportación futura necesita mallas, materiales compatibles y animaciones convertidas a clips: las funciones JavaScript no se convierten automáticamente en animaciones. Conviene validar primero una pieza exportada. El shader de atmósfera y la lógica de controles, cámara, misión, vuelo, combate y audio requerirían adaptación al motor de destino. GLB transporta recursos compatibles, no la aplicación completa.
