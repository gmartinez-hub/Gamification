# Gravedad Zero — finish delta sobre producción 3ac11bf

**Base obligatoria:** `3ac11bf6a34202683b3374c614e4a1e145f6a296`  
**Objetivo:** terminar el closeout sin reabrir decisiones de producto ni perder la optimización ya recuperada.  
**No es una reescritura:** corregir únicamente lo que quedó parcial y continuar performance sobre la versión publicada.

## 0. Estado comprobado

Producción y `main` apuntan a `3ac11bf`. El bundle contiene código y archivos de los cuatro assets nuevos, pero la experiencia visible no completa la spec aprobada.

Assets nuevos presentes en `assets/runtime/closeout-models/`:
- green ally: 11.39 MB / 113,438 triángulos / rig + 6 clips.
- energy cell: 15.82 MB / 251,287 triángulos.
- modular turret: 14.14 MB / 179,546 triángulos.
- orbital service bay: 26.16 MB / 537,935 triángulos.

El commit `3ac11bf` sólo reduce el payload de deploy mediante `.vercelignore`; no modifica render loop, FPS, gameplay ni carga inicial.

## 1. Qué quedó parcial y debe terminarse

### UI
El HTML de producción todavía conserva los paneles legacy de misión, ensamblado, telemetría, companion y action deck, y agrega encima `entryDialog` + `hangarDialog`. Esto no cumple "UI nueva completa".

**Requisito:** terminar la migración visual/UX del runtime. Reutilizar el DOM cuando convenga, pero la experiencia final no debe parecer el HUD viejo con dos dialogs agregados.

### Aim PC/touch
`controls.js` todavía requiere `pointerdown` + arrastre para producir `lookX/lookY`.

**Requisito aprobado:**
- PC: mouse controla aim/cámara directamente; clic dispara; WASD/flechas desplazan.
- Touch: joystick izquierdo mueve; zona derecha apunta y permite disparar con el mismo pulgar, sin tercer dedo obligatorio.
- Conservar primera/tercera persona, aim assist suave, daño/cadencia/balística actual.
- Implementar propiedad de input por contexto: gameplay, hangar, dialogs y pausa no compiten.

### Torreta visual
La compra/placement existe en estado, pero `main.js` no usa `createTurretClone()` para colocar las torretas reales sobre nave/moto/Nóma. El disparo de soporte nace de `ship.muzzle` o de la posición del companion, no del muzzle visual de cada torreta.

**Requisito:** cada unidad instalada debe tener una instancia visual real, transform local persistida en su host y muzzle real. El hangar debe editar esa posición/orientación sobre superficies compatibles. No reemplazar por slots fijos invisibles.

### Hangar
El hangar existe como escena 3D, pero hoy `loadCloseoutAssets()` descarga los cuatro modelos juntos y luego muestra el dialog.

**Requisito:** terminar el hangar como escena de mantenimiento:
- nave seleccionada 3D;
- cámara orbital 360°, zoom, centrar y vista inferior;
- 2–3 configuraciones guardadas;
- ensamblado frontal/final, frontal/medio/final, frontal/medio/medio/final;
- torretas visibles y movibles;
- moto y tripulación;
- celda/carga;
- confirmar/cancelar transaccional;
- presets no duplican piezas.

### Alien aliado + Nóma
El green ally ya tiene clips `AllyIdle/Aim/Fire/Move/Narrative/React`. Nóma ya dispone de seguimiento corporal, pero ambos deben cerrar sus estados visuales de movimiento/combate.

**Requisito:** no pueden quedar estáticos. Movimiento, follow/reposition, orientación, reacción, disparo/defensa y regreso a formación deben verse. Nóma armado usa el muzzle de su torreta real.

### Salto
La anomalía ya existe como efecto 3D, pero debe verificarse el flujo completo aprobado:

`gema → regreso/abordaje automático → jugador decide partir → anomalía/agujero negro → destino preparado → nuevo sector → primer acople automático del módulo nuevo`.

El hangar nunca es transición de sector.

## 2. Performance: por qué 328 MB no resolvió la lentitud

Reducir el paquete de Vercel evita almacenar/subir duplicados. No elimina automáticamente los recursos runtime que el navegador sí necesita ni reduce triángulos por frame.

### 2.1 Arranque bloqueante actual
Antes de mostrar `entryDialog`, `main.js` espera:
- actor assets iniciales;
- moto high + bike-medium;
- world assets;
- biome/world preparation.

Sólo los GLB principales de este camino representan aproximadamente 49 MB antes de contar otros recursos. El menú nuevo llega tarde porque se crea después de preparar el mundo.

**P0 performance:** convertir el bootstrap a **menu-first**.
1. Renderizar/activar el menú DOM inmediatamente.
2. No esperar al mundo 3D para permitir elegir Nueva/Continuar/Ajustes.
3. Al pulsar Nueva/Continuar, iniciar el mínimo playable.
4. Mostrar progreso verdadero por etapas.
5. Precalentar shaders/texturas relevantes sin bloquear todo el menú.

### 2.2 Streaming del primer sector
No cargar geometría hero de rocas que todavía ocupan pocos píxeles sólo para obtener sus materiales.

Revisar el pipeline para poder:
- comenzar con LOD low/medium y mapas/materiales canónicos;
- traer high sólo cuando proximidad/tamaño/objetivo/cinemática lo requiera;
- conservar high original intacto;
- no bajar resolución de mapas.

No asumir implementación: medir red, decode, GPU upload y primer frame antes/después.

### 2.3 Hangar: 67.5 MB no deben entrar juntos
Actualmente abrir hangar llama `loadCloseoutAssets()` y carga ally + cell + turret + service bay juntos.

Cambiar a carga por recurso/prioridad:
1. service bay + nave seleccionada;
2. modelo seleccionado por la UI;
3. torreta/celda/crew sólo cuando su panel o encuadre lo necesita;
4. cancelar/repriorizar si el usuario cambia de selección;
5. mantener originales full para inspección.

Crear LOD runtime de:
- service bay para fondo/no selección;
- cell;
- turret;
- ally cuando no es hero/cercano.
El asset seleccionado en inspección fuerza high.

### 2.4 Sombras
Producción sigue haciendo:
`renderer.shadowMap.needsUpdate = frames % (mobileGPU ? 2 : 1) === 0`
=> desktop recalcula sombras cada frame.

Aplicar el contrato aprobado:
- personajes, vehículo activo, nave y objetos cercanos proyectan;
- roca/decoración lejana sólo recibe;
- shadow dirty update cuando actor/cámara/luz cambien perceptiblemente o a cadencia limitada;
- durante hero moments se permite actualización completa.

Medir, no inferir la frecuencia final.

### 2.5 Animación visual lejana
`sector-world` sigue actualizando matrices de decoración/ambient instances cada frame.

Aplicar throttling sólo visual por distancia:
- lógica/física/daño/colisión permanece normal;
- polvo/decoración/rotaciones lejanas pueden actualizar a menor frecuencia;
- reutilizar objetos temporales/vectores para reducir GC;
- medir CPU después del LOD GPU.

### 2.6 Postprocess
Conservar bloom y composición visual, pero perfilar por separado:
- scene render;
- shadow pass;
- glow quarter-res;
- final composite.

No reducir resolución dinámica: el techo ~720p y calidad aprobada se mantienen. Optimizar sólo si la medición muestra coste relevante después de geometría/sombras.

## 3. Orden para Codex — mínimo consumo de tokens

### Paso 1 — Baseline actual
Trabajar sobre `3ac11bf`, no sobre una rama vieja.
- medir cold start;
- tiempo hasta menú;
- tiempo hasta control;
- FPS/triángulos/draw calls en Nereida;
- primer encuentro;
- hangar;
- stage 3 máximo.

Registrar MacBook Air M1 y, cuando esté disponible físicamente, iPhone 16.

### Paso 2 — Performance P0 antes de agregar más peso visible
- menu-first;
- hangar staged loading;
- high-rock lazy path;
- shadow dirty/cadence;
- ambient visual throttling.

Comparar métricas. No degradar mapas/efectos/gameplay.

### Paso 3 — Completar lo visible que ya está cableado
- UI completa;
- direct aim PC + touch;
- torretas 3D reales en hosts;
- hangar editor real;
- ally/Nóma motion;
- anomaly flow.

### Paso 4 — Revalidar worst cases
**Combate:** frontal + dos medios + final, dos torretas por módulo, torreta en moto, torreta en Nóma, ally, hostiles, asteroides, fuego, partículas y disparos.

**Hangar:** service bay, nave hero high, cambio entre 2–3 presets, moto, celda/torreta/crew bajo demanda.

### Paso 5 — Preview antes de producción
No promover por pasar tests Node.
Entregar:
- URL preview;
- SHA;
- métricas antes/después;
- capturas desktop/mobile;
- checklist de spec;
- bloqueos reales.
Promover sólo después de QA visual del usuario.

## 4. No hacer

- No volver a comprimir/eliminar assets para "ganar FPS" sin medición.
- No borrar deployments históricos esperando mejorar runtime.
- No reducir resolución de texturas/maps.
- No bajar densidad de explosiones/fuego hero.
- No reescribir Three.js ni migrar motor.
- No reemplazar free placement de torreta por slots invisibles.
- No considerar tests de estado como prueba de integración visual.
- No declarar los nuevos assets "integrados" sólo porque sus GLB están deployados.
- No tocar daño, dificultad, cantidades de objetivos o spawn para compensar performance.

## 5. Criterio de cierre

La iteración cierra cuando:
1. menú aparece rápido y no espera la escena completa;
2. FPS mejora con métricas comparables;
3. UI ya no se siente como la versión vieja;
4. hangar muestra y edita la nave real;
5. torretas compradas existen visual y balísticamente;
6. green ally/celda/turret/hangar tienen función visible;
7. aim funciona sin doble corrección;
8. Nóma y ally se mueven/reaccionan;
9. salto por anomalía completa el stage;
10. preview pasa QA real antes de promoverse.
