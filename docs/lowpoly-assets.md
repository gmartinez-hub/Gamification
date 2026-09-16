# Modelos y recursos de la versión low-poly

La nueva escena se construye en `src/lowpoly/` y se abre desde `index.html`. Su nave, astronauta y companion tienen geometría propia; no cargan los sprites antiguos de esos personajes. Los recursos y la entrada del prototipo anterior se conservan para comparar y continuar migrando funciones.

## Geometría nueva

| Elemento | Fuente | Construcción |
|---|---|---|
| Nave modular | `src/lowpoly/models.js` → `createShip()` | Cabina, hábitat/cuerpo y propulsión como grupos acumulativos con puntos de unión y montaje animado |
| Astronauta | `src/lowpoly/models.js` → `createAstronaut()` | Casco, traje, extremidades y mochila; piezas rígidas que rotan alrededor de articulaciones |
| Companion | `src/lowpoly/models.js` → `createCompanion()` | Cuerpo facetado, ojo ámbar, aletas y propulsor; flotación y movimiento procedural |
| Planetas y asteroides | `src/lowpoly/environment.js` | Esferas y geometrías facetadas; cinturón de asteroides instanciado |
| Balizas, gemas, plataforma y rutas | `src/lowpoly/environment.js` | Mallas, anillos y líneas; cada baliza refleja si está inactiva, activa o completada |
| Estrellas y atmósfera | `src/lowpoly/environment.js` | Puntos y un shader de borde para la atmósfera del planeta |

Los modelos se generan al cargar la página con primitivas y geometrías de Three.js, principalmente `MeshStandardMaterial`. El astronauta utiliza jerarquías y pivotes, sin `SkinnedMesh`, esqueleto de deformación ni pesos de vértices. No se requiere Blender para ejecutar o modificar esta versión.

La nave permanece como un único objeto compuesto. Una gema añade el cuerpo; dos gemas añaden la propulsión; tres completan la misión. La activación final del núcleo es un estado de progreso y un mensaje, no un cuarto módulo ni una transformación visual independiente.

## Recursos existentes reutilizados

Las siguientes rutas ya estaban en el repositorio antes de esta versión. Se usan los archivos locales; no se descargan recursos externos durante el juego.

| Ruta original | Uso actual |
|---|---|
| `assets/runtime/three-textures/ocean-world-bright-color.png` | Color del planeta oceánico |
| `assets/runtime/three-textures/dark-crater-color.png` | Superficie de la luna lejana |
| `assets/runtime/three-textures/asteroid-surface-wide-color.png` | Superficie de rocas, asteroides y bases rocosas |
| `nave_three_audio_pack_v2_refined/AudioManager.js` | Reproductor de audio existente, con resolución de archivos relativa al manifiesto |
| `nave_three_audio_pack_v2_refined/audio_manifest.json` | Identificadores, archivos, bucles y volúmenes del pack de audio |
| `nave_three_audio_pack_v2_refined/*.wav` | Sonidos existentes de interfaz, recogida, acoplamiento y motor, según los eventos de la nueva escena |
| `vendor/three.module.js` | Three.js local compartido por los módulos nuevos |

`environment.js` carga las tres texturas sobre materiales que ya tienen color, de modo que la escena conserva sus superficies si una textura no carga. El audio comienza silenciado y se inicializa cuando el usuario lo activa; los WAV se buscan junto a su manifiesto.

Los otros atlas, sprites, fondos y packs permanecen disponibles, pero su presencia en el repositorio no implica que la nueva escena los utilice.

## Contratos para mejorar los modelos

Las fábricas de modelos devuelven `{ group, update }`. `update(time, { moving, boost })` anima sus piezas. La nave también devuelve `setStage(1..3, animate = true)` para mostrar y ensamblar sus módulos. Las coordenadas usan Y hacia arriba y el frente de los personajes hacia −Z.

El entorno devuelve `{ beacons, update, setProgress }`; la progresión devuelve `{ state, collect, reset }`. La aplicación coordina navegación, cámara, interfaz y audio en `src/lowpoly/main.js`. Mantener estos límites permite mejorar la geometría sin volver a implementar la misión.

Para incorporar modelos GLB más detallados, el siguiente paso es cargar sus jerarquías dentro de las mismas fábricas, conservar escala, orientación, pivotes y uniones, y adaptar sus clips a `update` y `setStage`. Mejorar texturas no reemplaza el trabajo de silueta, proporciones y geometría.

## Exportación y futura integración con Godot

Todavía no se implementó un exportador GLB ni un proyecto Godot. Una exportación futura debe incluir las mallas reales, materiales compatibles y las animaciones que se hayan convertido en clips; las funciones JavaScript que animan piezas no se exportan automáticamente como animaciones.

Conviene validar pronto una pieza o módulo exportado antes de convertir todo el conjunto. La atmósfera usa un shader personalizado que requerirá adaptación. Controles, progresión, cámara, interacción, audio y cualquier física futura también deben implementarse en el motor de destino: GLB transporta recursos compatibles, no la lógica de la aplicación.

El prototipo anterior sigue accesible desde `legacy.html`, con su código en `src/main.js`; `background-lab/` conserva su funcionamiento independiente. Combate, apuntado, reliquia y zonas anteriores todavía no forman parte de la nueva misión de exploración.
