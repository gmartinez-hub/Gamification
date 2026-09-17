# Gravedad Zero — leer primero

## Qué es esta entrega

Rama `docs/gz-closeout-spec`, sólo documentación, sobre la base remota observada `ce1c5a7f025c1e522414cf87b73ef15331df29b7`. No es una versión jugable nueva ni incluye los GLB de Descargas. No reemplazar el worktree con optimización pendiente por esta rama.

1. [Spec maestra](2026-09-17-gravedad-zero-closeout.md): canon, alcance, UI completa, hangar, ensamblado, torretas, narrativa, cámaras, decisiones y aceptación.
2. [Rendimiento](gz-closeout-performance.md): contrato exacto, trabajo local a rescatar y medición ampliada.

## Correcciones de alcance que prevalecen

- **La UI se renueva de verdad.** «Sin reforma de UI» sólo restringía el paquete aislado de performance; no restringe el producto nuevo.
- **Cuatro modelos nuevos ya generados**, según el usuario: aliado verde, celda de energía, torreta y hangar. Buscar sus archivos reales en `$HOME/Downloads`. No pedir regenerarlos ni adivinar nombres/rigs.
- **La nave es configurable:** frontal+final, frontal+medio+final y frontal+medio+medio+final, además de formas iniciales. Desbloqueo de piezas, sector y ensamblado son estados distintos. No imponer dos medios/seis torretas como techo global.
- **Torretas en nave, moto y Nóma** y colocación sobre superficies compatibles forman parte del alcance; no degradarlas a «opcional si resulta fácil» ni a dos casilleros prefijados.
- **No nuevos jets, otro companion ni conector Meshy.** Se reutilizan los modelos, el arma, el proyectil y las juntas existentes.
- **Hangar es escena 3D con carga por etapas.** Si es caminable, cómo se accede, flota vs diseños guardados y dejar/llevar la moto siguen como decisiones D; no inferir respuestas.
- **Cámaras y aim por contexto:** preservar todas las perspectivas/funciones actuales, transición de cabina y precisión; giro del hangar separado del pilotaje.

## Primera intervención local

1. Leer AGENTS.md aplicables e identificar repo, worktree, rama/HEAD, cambios sin commit y remotos. Preservar cualquier trabajo antes de integrar documentos. No reset/clean ni checkout destructivo.
2. Recuperar `scripts/build-performance-lods.mjs` y los cambios locales registrados en mundo, actores, moto y main. El export termina ahí, sin cierre posterior. No repetir desde cero lo que exista.
3. Identificar los cuatro modelos en Descargas por contenido y referencias de FigJam. Generar inventario local y comprobar materiales, dimensiones, anclas y rigs; fuentes intactas. No subir el export completo ni archivos ajenos.
4. Consultar las decisiones D-01 a D-07 en la spec. Resolver por inspección lo técnico V. Preguntar sólo lo de producto que no esté respondido; no declarar la spec «cerrada» mientras haya una decisión que afecte al alcance.
5. Leer por sección para ejecutar cada tramo; conservar los contratos globales. No devolver otra propuesta general ni repetir el resumen entero de la conversación. Reportar IDs, evidencia y bloqueo concreto.

## Orden de integración propuesto

Recuperación/perfilado e inventario de assets → contrato de estado y decisiones → derivación Blender/LOD y carga común → ensamblado/torretas/guardado → UI/hangar/cámaras/aim → narrativa/transiciones → QA conjunto/performance/preview.

Cada tramo lleva pruebas y comparación visual antes de considerarlo validado. Separar commits de rendimiento de cambios funcionales para detectar regresiones, sin dividir la entrega final en recortes. La implementación de reglas abiertas espera resolución, no una suposición del ejecutor.

## Qué no debe perderse al resumir

Originales completos cerca/en objetivos/inspección/cinemáticas; mapas y wrapping sin degradar; alta densidad visual de efectos importantes; física completa; no cambio de gameplay por dispositivo; enemigo conserva trigger; presupuesto interno cercano a 720p sin borrosidad dinámica adicional. Referencias: MacBook Air M1 e iPhone 16; objetivos previamente acordados 60 FPS en Mac y 45 estables en iPhone con piso de 30 durante efectos intensos, pendientes de medición real.

## Evidencia final

Una tabla por requisitos C/UI/CAM/QA: implementado, validado con prueba/captura/medición o bloqueado por D/V. Una pantalla vacía o un asset sin integración no cumple el requisito. No publicar ni promover esta rama documental como si contuviera el cierre del juego.
