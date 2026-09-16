# Modelos y recursos de la expedición low poly

La escena V3 se construye en `src/lowpoly/` y se abre desde `index.html`. Nave, astronauta y companion tienen geometría propia y no cargan los sprites antiguos de esos personajes. `legacy.html` conserva el prototipo anterior para consultar y comparar. La dirección visual toma del póster las proporciones, la paleta, la luz cálida y la profundidad del entorno, manteniendo geometría low poly.

## Geometría y presentación

| Elemento | Fuente | Construcción |
|---|---|---|
| Nave modular | `models.js` → `createShip()` | Cabina, hábitat y propulsión como grupos acumulativos con montaje animado |
| Cabina en primera persona | `models.js` → `createCockpit()` | Marcos, consola y elementos 3D colocados como hijos de la cámara |
| Astronauta | `models.js` → `createAstronaut()` | Casco, traje, extremidades y mochila con piezas rígidas articuladas |
| Companion | `models.js` → `createCompanion()` | Cuerpo facetado, ojo ámbar, aletas y propulsor, con flotación procedural |
| Objetivos y peligros | `sector-world.js` | Rocas facetadas con minerales y marcas; asteroides pequeños, núcleos grandes y peligros identificados por separado |
| Baliza, gema y corredor | `sector-world.js` | Mallas, cristal, anillos y luces que responden a la fase de la misión |
| Planetas y estrellas | `sector-world.js` | Escena celeste independiente, atmósfera, nubes y anillos; rotación lenta y paralaje reducido |
| Polvo y asteroides ambientales | `sector-world.js` | Puntos y formaciones instanciadas en el espacio próximo, con siluetas distintas por bioma |
| Cable, selección y proyectil | `main.js` | Línea entre astronauta y nave, retícula y proyectil 3D |
| Escaneo, recogida e impactos | `effects.js` | Atlas existentes sobre sprites 3D, con oclusión y un pool de cuatro efectos |
| Reflejos y brillo | `effects.js` | `createEffects(scene)` devuelve `burst(position, kind, time)`, `update(time, camera, { reducedMotion })` y `dispose`. Atlas con UV independientes y fuente compartida; sprites ocultos mientras cargan |
| `presentation.js` | Entorno de reflexión generado localmente, composición del cielo y mundo, y brillo moderado a resolución reducida |

Los modelos se generan con geometrías de Three.js y principalmente `MeshStandardMaterial`. El astronauta usa jerarquías y pivotes, sin `SkinnedMesh` ni pesos de vértices. No se requiere Blender para ejecutar o modificar esta versión.

La nave es un único objeto compuesto. Recoger la gema habilita el corredor; el siguiente módulo se incorpora al terminar el cruce y llegar al nuevo sector. El tercer cruce completa la expedición sin añadir un cuarto módulo. El astronauta se oculta al abordar físicamente; su cable también desaparece. La vista de visor oculta el modelo del astronauta. La vista de cabina oculta el exterior de la nave y muestra el interior 3D unido a la cámara; no es un habitáculo que se pueda recorrer a pie.

| Modelo visible | Dimensión aproximada |
|---|---|
| Cabina inicial | 6,18 m de longitud |
| Cabina y hábitat | 10,96 m de longitud |
| Nave completa | 14,53 m de longitud |
| Astronauta | 1,93 m de altura |
| Companion | 0,7 m de ancho |

Los grupos raíz conservan escala unitaria. La ampliación de la nave se aplica a su grupo visual, para que posición, orientación, cámaras y colisiones compartan metros de mundo. El astronauta tiene una pose flotante de extremidades articuladas. La llama de los motores responde al empuje y al frenado; avanzar por inercia no mantiene los motores encendidos.

Nereida combina planeta oceánico, nubes y formaciones aplanadas; Vesper incorpora anillos planetarios, fragmentos alargados y un cinturón diagonal; Umbra usa formaciones más verticales y una iluminación cobriza. Los planetas giran lentamente en una escena separada, cuya traslación de cámara es el 1,5 % de la del mundo. El polvo y las rocas próximas aportan las referencias de velocidad.

## Recursos existentes reutilizados

Se usan archivos locales del repositorio; el juego no descarga recursos de servicios externos.

| Ruta | Uso actual |
|---|---|
| `gravedad-zero/planets/planet_ocean_prime_albedo.png` | `lowpoly-textures/ocean.jpg`: planeta oceánico y máscara de nubes derivada del mismo mapa |
| `gravedad-zero/planets/planet_dark_crater_albedo.png` | `lowpoly-textures/moon.jpg`: lunas y planetas posteriores |
| `three-textures/dark-crater-normal.png` | `lowpoly-textures/moon-normal.png`: relieve normal suave, en espacio lineal |
| `three-textures/asteroid-surface-plates-color.png` | `lowpoly-textures/rock.jpg`: variación mineral y relieve de roca |
| `three-textures/nebula-wide-background.png` | `lowpoly-textures/nebula.jpg`: domo lejano, matizado por bioma |
| `gravedad-zero/aim-fx/impact_ring_atlas_4x1_1024.png` | `lowpoly-textures/scan-atlas.png`: escaneo y recogida de gema |
| `gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/{ship,astronaut}/*_impact_atlas_4x4.png` | `lowpoly-textures/{ship,eva}-impact.png`: explosiones de objetivos |
| `nave_three_audio_pack_v2_refined/AudioManager.js` | Reproductor existente, con archivos relativos al manifiesto |
| `nave_three_audio_pack_v2_refined/audio_manifest.json` y sus WAV | Audio de interfaz, escaneo, recompensa, acoplamiento y movimiento |
| `vendor/three.module.js` y `vendor/three.core.js` | Three.js local compartido por los módulos |

Las rutas abreviadas de planetas, mapas y resultados parten de `assets/runtime/`; el pack de proyectiles parte de la raíz. Los originales se conservan. Los albedos se recomprimieron como JPEG de calidad 84, sin metadatos, manteniendo 1774 px en planetas y cielo y 1024 px en roca. El normal se conserva como PNG de 1024 px y los atlas se reducen a 1024 px. No se reutilizan las caras ni los sprites de los protagonistas anteriores.

Los materiales conservan un color base si una textura no carga. El audio comienza silenciado y se inicializa al activarlo. Los otros atlas, sprites, fondos y packs siguen en el repositorio, pero no todos se utilizan en la expedición actual. Baliza, gema y corredor son geometría nueva.

## Contratos para continuar el trabajo

| Módulo | Responsabilidad y contrato |
|---|---|
| `models.js` | Fábricas con `{ group, update }`; nave y astronauta aceptan `update(time, { moving, boost, thrust, braking })`. `thrust` admite el vector de aceleración mundial; `moving` conserva compatibilidad. La nave añade `setStage(1..3, animate = true)`. `createCockpit()` acepta `update(time, { speed, braking })` |
| `spatial.js` | Escala visual, anclajes locales para escotilla, salida EVA, cable, ojos y arma; `shipPoint()` los transforma al mundo. Define esferas de colisión por módulo y radio de encuadre |
| `expedition.js` | Reglas puras y distribución: `createExpedition(seed)` devuelve estado estable y acciones de escaneo, daño, gema y tránsito; exporta azar independiente, probabilidad y alcance de las armas |
| `flight.js` | Posiciones XYZ, velocidad, empuje, orientación con inercia, guía y frenado. `update(dt, direction, boost, options)` admite `brake`, `hold`, `navigationTarget`, `arrivalRadius`, `lookYaw` y `lookPitch`. Expone `arrived`, `shipQuaternion`, anclajes y tensión. `updateHeading()` orienta sin trasladar; `applyImpact(normal, depth, obstacleVelocity)` separa y responde a contactos. `reset({ aboard })` y `setStage()` preparan sectores |
| `controls.js` | Teclado, arrastre y controles táctiles; entrega ejes, mirada, impulso y `brake` mediante Q o `[data-move="brake"]` |
| `combat.js` | Valida actor y alcance, decide acierto al disparar y reproduce tiempos de fijación, viaje y recuperación |
| `hazards.js` | Funciones puras de trayectoria y velocidad (`sampleHazard`), colisión durante el recorrido entre dos fotogramas (`sweptSphereHit` / `sweptSphereContact`) y aproximación relativa para avisos (`closestApproach`) |
| `sector-world.js` | `createSectorWorld(scene)` con `load(layout)`, `sync(state, time, { reducedMotion })`, objetivos, peligros, baliza, gema y corredor. Expone `skyScene`, `skyCamera`, `updateSky(camera)` y `lighting`; libera recursos al cambiar de sector |
| `effects.js` | `createEffects(scene)` devuelve `burst(position, kind, time)`, `update(time, camera, { reducedMotion })` y `dispose`. Atlas con UV independientes y fuente compartida; sprites ocultos mientras cargan |
| `presentation.js` | `createPresentation(renderer)` devuelve `render`, `resize` y `dispose`; compone escena celeste, mundo y brillo. `createReflectionEnvironment(renderer)` genera el mapa de reflejos sin archivos externos |
| `main.js` | Integra reglas, controles, cámara, interacción, interfaz, audio, integridad y transiciones |

Las coordenadas usan Y hacia arriba y el frente de los personajes hacia −Z. `lookYaw` sigue el giro de Three alrededor de Y; `lookPitch` positivo mira hacia arriba. La nave limita aceleración y velocidad angular y conserva su rumbo al desplazarse de costado o hacia atrás. Durante EVA queda anclada en posición y orientación. La gravedad cero se representa con deriva y frenado activo; esta versión no aplica atracción planetaria.

La generación trabaja con posiciones XYZ simples dentro de volúmenes diseñados. Usa flujos aleatorios separados para distribución, peligros y combate; los detalles visuales tienen su propio generador. Una URL con `?seed=620` permite repetir la distribución. `biomeId` selecciona el entorno. Los peligros incluyen eje, amplitud, período y fase de una trayectoria acotada; cada registro del mundo publica posición anterior, posición actual y velocidad. La opción de movimiento reducido disminuye efectos cosméticos y conserva el desplazamiento de los peligros.

El cable conecta el puerto físico con el cuerpo del astronauta, comienza a tensarse a 22 m y limita la distancia a 26 m. No resuelve enredos ni colisiones de la cuerda. La guía EVA y el regreso usan rutas alrededor del casco; la resolución de colisiones contempla el cuerpo y el casco del astronauta para evitar atravesar la nave.

Los peligros tienen velocidades máximas de 1,15–1,60 m/s en Nereida, 1,55–2,00 m/s en Vesper y 1,95–2,40 m/s en Umbra. Sus trayectorias protegen baliza, gema, objetivos y corredor. Las colisiones comprueban el recorrido relativo entre fotogramas con esferas. El contacto separa los cuerpos y refleja la componente entrante de velocidad relativa con restitución 0,15, conservando la componente tangencial; después se reaplican límites del mundo, casco y cable.

El daño depende de la velocidad relativa, entre 15 y 38 puntos, con 2 segundos de protección entre pérdidas de integridad. Esta protección es independiente de la respuesta física al contacto. El rescate conserva la misión. El disparo es asistido y su proyectil representa un resultado decidido al activar el arma.

Para sustituir un protagonista por un GLB, conservá escala, orientación, pivotes, uniones de módulos, anclajes de `spatial.js` y las fábricas anteriores. Sus clips se pueden adaptar a `update` y `setStage`. Texturas más detalladas no reemplazan el trabajo de silueta y proporciones.

## Alcance y futura migración

Esta entrega prioriza mecánicas y nivel en low poly para computadora y móvil. No incluye arte final, guardado persistente, exportador GLB ni proyecto Godot. La verificación en un dispositivo móvil físico se registra aparte de la emulación de navegador.

Una exportación futura necesita mallas, materiales compatibles y animaciones convertidas a clips: las funciones JavaScript no se convierten automáticamente en animaciones. Conviene validar primero una pieza exportada. El shader de atmósfera y la lógica de controles, cámara, misión, vuelo, combate y audio requerirían adaptación al motor de destino. GLB transporta recursos compatibles, no la aplicación completa.
