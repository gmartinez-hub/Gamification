# Gravedad Zero — un viaje, pieza por pieza

Primera versión jugable low-poly en Three.js: un astronauta explora tres balizas con su companion y recupera gemas para construir **una nave por módulos**. Nave, astronauta y companion son modelos nuevos creados por código. El entorno aprovecha texturas y audio del repositorio.

## Ejecutar localmente

Desde la raíz del repositorio, con Python 3 disponible:

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

También se puede iniciar el mismo servidor con `npm run dev` si tenés Node.js y npm. No hace falta `npm install`.

Abrí [el juego](http://127.0.0.1:8787/). Los módulos y recursos necesitan un servidor HTTP; abrir el HTML directamente desde el disco no alcanza.

## Explorar y construir

Empezás con la cabina. Seleccioná **Astronauta**, seguí la señal de la baliza activa y acercate para recuperar su gema. Las tres se recogen en orden:

1. La primera incorpora el hábitat/cuerpo de la nave.
2. La segunda incorpora el módulo de propulsión.
3. La tercera completa la expedición y anuncia la activación del núcleo; no añade un cuarto módulo.

Podés alternar entre astronauta y nave, inspeccionar el ensamblaje y reiniciar al completar la expedición. El progreso dura esta sesión: recargar la página lo reinicia.

| Acción | Control |
|---|---|
| Mover el personaje seleccionado | WASD o flechas, respecto de la cámara |
| Navegar a un punto | Clic o toque sobre el mapa |
| Recuperar la gema activa | E o botón de acción, cerca de la baliza y con el astronauta |
| Impulso | Mantener Shift |
| Acercar/alejar | Rueda o botones + / − |
| Girar cámara | Botón ↻ |
| Ver el modelo ensamblado | Botón «Inspeccionar nave» |
| Pausar/continuar | Esc o botón de pausa |
| Activar/desactivar audio | Botón de sonido; comienza desactivado |

## Alcance de esta versión

Esta entrega cubre exploración, recogida secuencial y ensamblaje animado. El combate, apuntado asistido, secuencias de reliquia y sistema anterior de zonas siguen en el prototipo anterior y quedan pendientes de migración. Los personajes usan piezas rígidas articuladas; todavía no hay un rig con deformación de malla ni exportador GLB.

- [Versión low-poly](http://127.0.0.1:8787/): entrada por defecto, `index.html` y `src/lowpoly/`.
- [Prototipo anterior](http://127.0.0.1:8787/legacy.html): `legacy.html` conserva la entrada HTML anterior y carga `src/main.js`.
- [Laboratorio de fondos](http://127.0.0.1:8787/background-lab/): se mantiene sin cambios.
- [Inventario de modelos, recursos y próxima migración](docs/lowpoly-assets.md).

## Pruebas y publicación

Con Node.js disponible:

```bash
npm test
```

Las pruebas cubren la progresión y el contrato de ensamblaje de la nave. La presentación, navegación, controles táctiles y audio también requieren verificación en navegador.

El proyecto es estático y utiliza Three.js local desde `vendor/`, sin dependencias externas durante la ejecución. Puede alojarse en un servidor web estático conservando las rutas del repositorio. Esta entrega no configura ni realiza un despliegue.
