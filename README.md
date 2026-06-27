# Nave Gamification Prototype

Prototipo web estático para validar la dirección visual de la experiencia de gamification: nave 2.5D sobre un entorno espacial procedural en Three.js.

## Cómo correrlo local

Desde la carpeta del repo:

```bash
python3 -m http.server 8787
```

Luego abrir:

```text
http://127.0.0.1:8787/
```

Si el server está levantado desde `/Users/gabrielmartinez`, abrir:

```text
http://127.0.0.1:8787/Gamification/
```

## Vistas útiles

- Nave + fondo: `/?v=space-v3`
- Solo fondo: `/?v=space-v3&ship=0`

## Export

El proyecto es estático. Se puede publicar directo en GitHub Pages, Vercel o cualquier servidor web. También se puede capturar como imagen, GIF o video desde navegador.

## Estructura

```text
assets/             Assets visuales versionados
src/main.js         Escena Three.js
vendor/             Three.js vendorizado para no depender de instalaciones locales
index.html          Entrada web
styles.css          Estilos base
```
