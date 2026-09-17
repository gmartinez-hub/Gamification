# Gravedad Zero — rendimiento, carga y recuperación local

**Estado:** contrato de calidad y continuidad; no resultados nuevos de medición.
**Spec principal:** [cierre completo](2026-09-17-gravedad-zero-closeout.md).
**Base remota observada:** `ce1c5a7f025c1e522414cf87b73ef15331df29b7`.

## PERF-00. Alcance de este paquete

La congelación de UI/gameplay que aparece debajo rige el diff de optimización aislado. La renovación completa de UI, hangar, aim y personalización sigue siendo obligatoria en la entrega de producto. No usar PERF para cancelarla ni usar el rediseño para esconder degradaciones visuales.

Los objetivos confirmados en el export más reciente fueron 60 FPS en la MacBook Air M1 y 45 estables en iPhone 16 con piso de 30 durante efectos intensos. Son objetivos de aceptación a comprobar, no FPS ya alcanzados. Identificar Safari/Chrome reales utilizados; un perfil de iPhone ejecutado en la Mac no acredita rendimiento del teléfono.

## PERF-01. Contrato aportado por el usuario — texto preservado

> Modelos: los originales completos siguen disponibles. Los LOD se activan sólo por distancia/tamaño en pantalla. Objetivos, elementos cercanos, cinemáticas y momentos de impacto fuerzan máxima calidad.
>
> Texturas: no bajo resolución ni elimino mapas. Mantengo anisotropía, materiales y wrapping.
>
> Partículas y fuego: no reduzco el diseño visual. Optimizo reutilizando partículas, instancias y materiales; durante explosiones, propulsores y apariciones se conserva la densidad alta.
>
> Sombras: personajes, vehículos, nave y objetos cercanos proyectan sombras. Rocas lejanas y decoración sólo las reciben. Es un ahorro importante con poca diferencia visible.
>
> Movimiento lejano: física, daño y colisiones siguen actualizándose normalmente. Solamente las animaciones visuales de objetos muy lejanos pueden actualizarse con menor frecuencia.
>
> Proyectiles: simplifico el modelo durante el vuelo, pero aumento su lectura con tamaño aparente, núcleo luminoso, estela y partículas. El impacto mantiene calidad completa.
>
> Enemigos: siguen cargándose al explotar el asteroide que los activa. El primer encuentro puede precargarse parcialmente durante la explosión para que la aparición no se trabe.
>
> Nave: el balanceo es visual y no modifica el aim, las colisiones ni la dirección real del disparo.
>
> Cabina: arreglo únicamente la transición de cámara al sentarse y levantarse. No cambio su escala, controles ni funcionamiento.
>
> Gameplay: no cambio cantidades, progresión, daño, apariciones, objetivos ni dificultad.
>
> Interfaz: no hago otra reforma de UI dentro de este paquete.
>
> Carga inicial: moto, astronauta y escenario inmediato cargan primero; nave, enemigos y variantes distantes entran por etapas.
>
> Validación: mediría el peor caso real: tercer stage, nave completa, enemigos, asteroides, disparos, fuego y partículas simultáneas. No daría por válida la optimización solamente porque el comienzo llegue a 60 FPS.
>
> Dispositivos: tomo como referencias esta MacBook Air M1 y el iPhone 16.
>
> Resolución: mantengo el encuadre cinematográfico y el techo interno cercano a 720p que ya habíamos definido; no aplicaría una reducción dinámica adicional que vuelva borrosa la imagen.

## PERF-02. Qué trabajo hay que recuperar

El final del export `Pasted text(6).txt` registra creación/ejecución de `scripts/build-performance-lods.mjs` y modificaciones de `sector-world.js`, `asset-actors.js`, `bike-actor.js` y `main.js` dentro del worktree local `final-expedition`. No registra QA/cierre/publicación posterior de ese conjunto. No asumir que ya está versionado ni regenerarlo antes de buscarlo localmente.

Procedimiento de sólo lectura inicial: localizar repo/worktrees; leer AGENTS.md aplicables; inspeccionar `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git worktree list --porcelain`, diff y archivos no rastreados; comparar referencias remotas. Preservar cambios y fuentes antes de cualquier operación de integración. Si un script temporal ya no existe, no equivale a pérdida del trabajo del repo.

El diagnóstico previo reportó 6.703.080 triángulos/cuadro en vista Mac y 4.608.148 en perfil iPhone; 21 asteroides activos/rompibles con 205.612 triángulos por fuente; nave completa de tres partes de 2.315.036 triángulos; proyectil de 86.758. Son cifras del registro anterior, útiles para encontrar el problema, no mediciones actuales ni evidencia de que la GPU sea el único cuello de botella en la nueva escena.

No extrapolar linealmente reducción de triángulos a FPS. Bloom puede tener coste de píxeles aunque use poca geometría. Medir CPU, GPU, memoria, transferencias y preparación, no únicamente draw calls o polígonos.

## PERF-03. Inventario técnico antes y después

Registrar por original y derivado: hash, triángulos/vértices, materiales/primitivas, dimensiones, texturas con dimensiones/canales/wrap/aniso/colorspace, buffers, skins/clips, tamaños en bytes y LOD. Estimar memoria de geometría/texturas con su formato y mipmaps; no confundir peso de JPEG o GLB con memoria GPU.

**Verificación de compatibilidad obligatoria:** el baseline publicado incorporó `encounter-models-mobile` con texturas reducidas. La nueva instrucción exige no bajar resolución ni eliminar mapas. Identificar originales en Descargas y referencias efectivamente usadas por cada perfil; presentar cualquier divergencia de calidad. No llamar al derivado reducido «original completo», ni cambiar resoluciones silenciosamente para cumplir una cifra de memoria.

Los nuevos cuatro assets deben entrar al mismo inventario. La geometría de hangar necesita división por zonas/visibilidad y materiales compartidos donde sea posible sin modificar su apariencia; no renderizar todo un edificio oculto como una única malla inseparable por conveniencia del importador.

## PERF-04. Carga como planificación de recursos

Separar cuatro trabajos: transferencia, decodificación/preparación CPU, asignación/subida GPU y preparación de shaders/materiales. Priorizar interacción visible y recurso seleccionado antes que precarga especulativa.

1. **Arranque:** recursos que se ven y usan desde la moto; no catálogo completo del hangar.
2. **Nave por descubrir:** preparar con anticipación suficiente para no mostrar una nave ausente al llegar; conservar calidad cercana completa. Readiness no puede limitarse a fetch terminado.
3. **Entrada al hangar:** estado lógico guardado; zona y nave activas listas; resto por capas. La política de pausa/acceso depende de D-01, no la decide el cargador.
4. **Hangar en uso:** preparar módulos/diseños próximos con presupuesto medido. La selección del usuario cambia prioridades. Una carga secundaria no congela colocación/orbitado.
5. **Destino:** descargar/preparar lo necesario del siguiente sector cuando hay presupuesto. No retener simultáneamente todos los niveles en GPU ni cargar enemigos fuera del contrato PERF-01.
6. **Cambio de escena:** conservar recursos compartidos y liberar sólo lo no usado; no dejar dos escenarios completos procesándose indefinidamente ni borrar estado para ahorrar memoria.

Adoptar un gestor único de propietarios/referencias y solicitudes en curso. Reutilizar el cargador existente y sus protecciones donde sea válido. Registrar tiempo y memoria de los picos, no sólo del estado estable. Apagar visibilidad no libera recursos; liberar un material compartido indiscriminadamente puede provocar recarga o fallos visuales.

El hangar puede amortizar preparación de assets mientras se personaliza, pero no garantiza por sí mismo carga sin pausas ni memoria ilimitada. El acceso inmediato al siguiente sector debe tener una salida honesta cuando el destino aún no está preparado: señal de progreso y recuperación, sin spinner infinito ni omitir requisitos.

Comprobar compatibilidad de APIs con la versión local antes de usar `compileAsync`/`initTexture`. Compilar para la iluminación/materiales que efectivamente se usarán. Evitar carga/compilación de todo el catálogo en un único frame.

## PERF-05. LOD y presentación

- Fuente completa disponible; niveles derivados a partir de ella, no sustitución permanente.
- Selección por distancia/tamaño con histéresis para evitar cambios intermitentes; fijar máxima calidad en objetivos/primer plano/inspección/cinemática/impacto.
- No reducir mapas para resolver el coste geométrico.
- Preservar silueta, UV, anclas y animación. Los LOD del aliado necesitan pesos/skinning coherentes si se usan.
- No reducir cantidades, daño, colisiones, velocidad, poblaciones o frecuencia de simulación física por dispositivo.
- Proyectil visual de vuelo separado de la simulación balística: núcleo, estela y partículas legibles; impacto completo.
- Partículas/pools e instancias se dimensionan al peor conjunto de torretas y eventos; no suprimir silenciosamente un impacto/gema por saturación del pool.
- Instancias comparten geometría/material; aun así cada copia visible implica rasterización/geometría. Optimizar también composición y selección, no prometer coste nulo por nave repetida.
- Balanceo visual no contamina transformaciones lógicas de aim, hull ni colisión; primera persona y muzzle deben mantener coherencia visual de disparo.

## PERF-06. Protocolo de medición

Guardar para cada ejecución: SHA + estado local/diff, hashes de assets, semilla, configuración de nave/torretas, población, resolución interna real, viewport, dispositivo/GPU, navegador/versión, condiciones de red/caché y duración. No declarar validación física a partir de emulación.

Medir arranque frío y caliente; tiempo hasta control y hasta texturas/materiales completos; tiempos de cuadro mediana/p95/p99 y caídas; CPU/GPU cuando se puedan observar; draw calls, triángulos, texturas/geometrías activas, estimaciones de memoria y costes de GC/preparación. Distinguir estimaciones de telemetría real; `renderer.info` no es medición exacta de VRAM ni suma automática de todas las pasadas si se reinicia.

| Escenario | Qué debe estar presente |
|---|---|
| P-TEST-01 | Inicio real en moto, astronauta, Nóma y entorno, red fría |
| P-TEST-02 | Primera llegada a nave, primer disparo y primer enemigo en su trigger normal |
| P-TEST-03 | Stage 3 de referencia con nave completa, enemigos, asteroides, disparos, propulsores y explosiones simultáneos |
| P-TEST-04 | Configuración frontal+dos medios+final y torretas, más máxima composición que se apruebe; no sólo el stage fijo anterior |
| P-TEST-05 | Hangar con nave seleccionada en máxima calidad, moto y población adicional que se apruebe; orbitar y editar repetidamente |
| P-TEST-06 | Hangar → sector → hangar, abrir/cancelar modelos y vistas, saltos, recarga; no crecimiento persistente de recursos sin explicación |
| P-TEST-07 | Transición de cabina con carga lenta, cambio de app/orientación, primer shader nuevo y recuperación de errores |
| P-TEST-08 | Sesión prolongada en M1 e iPhone 16 reales para observar estabilidad térmica; comparar mismos eventos, no sólo FPS iniciales |

Realizar capturas comparables antes/después con resolución y cámara iguales: casco, texturas del traje, asteroide próximo, fuego, impacto, hangar y transición. Evidencia visual y mecánica además de métricas. El entorno de hangar admite más naves sólo con un presupuesto probado; no resolverlo quitándolas sin decisión del usuario.

## PERF-07. Criterio de cierre y bloqueos

Cumplir objetivos acordados y contratos visuales en las condiciones medidas. Si se incumplen, reportar escena y causa observada, proponer palanca compatible y repetir; no bajar umbrales ni calidad sin aprobación. Sin iPhone físico disponible, ese tramo se declara no verificado; no se sustituye por «WebKit pasó».

Una optimización independiente puede validarse antes de la nueva UI para proteger la atribución del resultado, pero la aceptación final vuelve a medir la experiencia completa. Sólo después decidir publicación con SHA y rollback explícitos; esta rama documental no se promueve como nueva versión jugable.
