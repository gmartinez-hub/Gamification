# Gravedad Zero — especificación maestra de cierre

**Estado: borrador controlado para decisiones y preparación; no acredita implementación.**
**Fecha:** 2026-09-17. **Rama documental:** `docs/gz-closeout-spec`.
**Base remota observada:** `main` → `ce1c5a7f025c1e522414cf87b73ef15331df29b7`.
**Entrada de continuidad:** [Leer primero](gz-closeout-start-here.md).
**Contrato de rendimiento:** [PERF y recuperación local](gz-closeout-performance.md).

## 0. Autoridad, alcance y separación de cambios

Esta especificación consolida las instrucciones del usuario, no convierte propuestas anteriores del asistente en decisiones aprobadas. Una duda registrada aquí no significa una funcionalidad descartada. Debe resolverse antes de implementar su comportamiento irreversible.

- **C — Confirmado:** requisito del usuario que la entrega debe cubrir.
- **P — Propuesta:** diseño recomendado para revisión; no implementación autorizada por silencio.
- **D — Decisión de producto abierta:** requiere respuesta del usuario.
- **V — Verificación técnica:** resolver mediante archivos, modelos, código o medición; no trasladar al usuario preguntas que la inspección puede contestar.

**C-01. UI renovada completa.** El usuario rechazó limitar la intervención a retoques: menú principal, hangar, inventario/equipo, bitácora/mapa, HUD, pausa, ajustes, cargas, errores y cierres deben tener diseño visual coherente y usabilidad revisada en escritorio y táctil. No sustituir este alcance por cambiar etiquetas.

**C-02. Cuatro assets nuevos:** aliado verde, celda de energía, torreta y hangar. El usuario confirma que los modelos están en Descargas. Son cuatro aunque un mensaje los denominara «tres». Las imágenes de Figma son referencias, no prueba de jerarquía, UV, rig o integración.

**C-03. Personalización con piezas existentes:** reconfiguración estructural de nave, repetición de módulos medios, torretas sobre nave/moto/Nóma, inspección y giro. No añadir jets, otro companion ni un conector como requisito de generación.

**C-04. Recuperar y cerrar rendimiento pendiente**, incluyendo los nuevos recursos y configuraciones. No degradar visualmente para declarar éxito.

**C-05. Cámaras y aim:** conservar primera/tercera persona y funciones actuales; corregir la interacción de mirada, apuntado, desplazamiento y cambios de cámara. No convertir todas las cámaras en un control orbital.

**C-06. Delta mínimo significa minimizar trabajo repetido y cambios ajenos al objetivo, no reducir funcionalidades.** Reutilizar Three.js, balística, controles, carga, efectos, audio y guardado existentes donde sean válidos; generalizar lo que hoy está fijado a tres módulos. No migrar de motor ni rehacer todo el repositorio por conveniencia.

### Paquetes dentro de la misma entrega

| Paquete | Cambios permitidos | Lo que no puede justificar |
|---|---|---|
| PERF | LOD, selección visual, gestión de recursos, carga escalonada, sombras acordadas, animación visual y transición de cabina acordada | Cambiar cantidades, daño, apariciones, objetivos, dificultad o interfaz por rendimiento |
| EXPERIENCIA | Renovación completa de UI, hangar, equipamiento, nueva narrativa y personalización confirmada | Recortar combate del aliado o montaje en moto/Nóma por dificultad técnica |
| AIM/CÁMARAS | Dirección de aim coherente, control por contexto, transiciones y encuadres verificados | Usar desplazamiento obligatorio para apuntar; modificar silenciosamente daño, autoacierto o cadencia |

La frase heredada «no hago otra reforma de UI dentro de este paquete» pertenece a PERF. **No prohíbe la reforma de UI del producto, ahora expresamente exigida.** Tampoco la congelación del gameplay en PERF cancela las nuevas funciones de EXPERIENCIA: cada cambio de reglas debe ser explícito, trazable y acordado.

## 1. Estado comprobado y recuperación antes de tocar runtime

El remoto observado conserva `main` en `ce1c5a7`; `codex/final-expedition` apunta a `6495074330d80236e2f1ae0c06f453d378306f30`. No interpretar que el nombre de esa rama contiene todo el trabajo local posterior.

El export más reciente aportado, `Pasted text(6).txt`, termina con escrituras locales sobre:

- `scripts/build-performance-lods.mjs` (creado y ejecutado).
- `src/lowpoly/sector-world.js`.
- `src/lowpoly/asset-actors.js`.
- `src/lowpoly/bike-actor.js`.
- `src/lowpoly/main.js`.

Las rutas del registro sitúan ese trabajo en `.worktrees/final-expedition`. El export no incluye cierre de QA o publicación posterior de esas escrituras. No demuestra que esos archivos sigan intactos hoy: verificar localmente. Los ensayos `/tmp/test-lod.cjs` son antecedentes, no reemplazo del script versionable.

**V-01.** En Codex local: identificar repo, worktree, rama, HEAD, diferencias sin commit, archivos no rastreados y commits no publicados; respetar AGENTS.md aplicables. Comparar contra el SHA remoto antes de elegir base. Preservar el trabajo de rendimiento con una copia/commit de seguridad adecuado, sin `reset --hard`, `clean`, checkout destructivo ni rebase automático.

**V-02.** Incorporar esta documentación sin sustituir la carpeta de trabajo por una rama antigua. La rama documental es un punto de lectura, no una orden de desechar el estado local y empezar desde cero.

**V-03.** Reproducir primero la versión que se medirá y registrar versión, navegador, dispositivo, viewport y condiciones. Una publicación READY, una prueba Node o una simulación de iPhone no equivalen a QA físico ni a FPS medidos en iPhone 16.

## 2. Canon y adquisición de assets

**Referencia visual:** [tablero de modelos y blueprint](https://www.figma.com/board/T5no25utykpwFR7eG2lBEZ). Usar las imágenes agrupadas de los modelos canónicos, no las reinterpretaciones de naves/personajes en pósters exploratorios. Los diagramas anteriores no prevalecen sobre correcciones posteriores del usuario.

Canon: astronauta humanoide realista, traje y equipo blanco hueso con desgaste, franjas rojas, juntas oscuras y visor dorado; nave en esa familia. Nóma es el robot redondo existente. El aliado es verde humanoide, no una segunda versión de Nóma. Enemigo y nave hostil conservan su propia paleta. No rediseñar mallas o texturas para uniformarlos arbitrariamente.

| Familia | Recursos que se conservan |
|---|---|
| Nave | Cápsula/frontal, hábitat/medio, propulsión/final, interior de cabina, uniones y animación de acople existentes |
| Transporte y armas | Moto con sus jets existentes, pistola y proyectil existentes, torreta nueva |
| Personajes/apoyo | Astronauta, Nóma, aliado verde, baliza, celda de energía |
| Amenazas/entorno | Alien hostil, nave hostil, asteroides y recubrimientos, gemas, fondos, audio y efectos existentes |
| Mantenimiento | Hangar generado y ampliaciones arquitectónicas necesarias en Blender |

**V-04. Inventario local de Descargas.** Examinar únicamente los candidatos 3D y sus paquetes asociados en `$HOME/Downloads`; identificar por contenido/render y referencia, no sólo fecha o nombre. No asumir nombres de archivo. Registrar para cada candidato: ruta local, hash, formato, dependencias, dimensiones, ejes, mallas, triángulos, materiales/mapas y resoluciones, esqueleto y clips. Si varios candidatos coinciden, presentar miniaturas para elegir. No subir otros archivos de Descargas.

**C-07. Fuentes intactas.** No modificar ni sobrescribir los originales. Producir copias de trabajo y derivados de runtime con trazabilidad. Rutas locales y evidencia privada permanecen locales; al repo público sólo pasan artefactos autorizados, sin credenciales ni export completo de conversación.

**V-05.** No se han inspeccionado en esta revisión los cuatro GLB finales. No declarar que el hangar está separado, la torreta articulada o el aliado riggeado hasta comprobarlos.

### Entrega Blender por recurso

| Recurso | Trabajo requerido | Aceptación en el juego |
|---|---|---|
| Aliado verde | Conservar diseño; escala humanoide comparable al astronauta; preparar/reutilizar rig y pesos correctamente; agarre de la pistola existente; reposo flotante, desplazamiento, apuntado, disparo/reacción y gesto narrativo; localizar emisores existentes | No reemplaza a Nóma; no queda sólo de adorno para evitar rigging; manos y arma coherentes, clips sin deformaciones, muzzle real y apoyo de combate probado |
| Torreta | Separar base y partes móviles cuando sea necesario; pivotes, eje y boca definidos; conservar materiales; derivación compacta de la misma familia para moto/Nóma con adaptación de montaje | Puede colocarse, orientarse, retirarse y disparar en los huéspedes previstos; no tapar ojo/asiento/escotilla/tobera; proyectiles salen del arma real |
| Celda | Preservar cuerpo canónico, identificar emisión y partes; diferenciar prop funcional de representación de inventario; derivar cartucho sólo si geometría/texturas lo permiten | Carga de equipamiento visualmente clara y distinta de gemas; ninguna pieza fabricada aparece dentro de una roca sin justificación narrativa aprobada |
| Hangar | Inspeccionar qué quedó unido; conservar bahía generada; completar paredes, techo, sustento exterior y zonas visibles; detectar moto/armas/cajas fundidas como decorado; preparar sectores de carga, cámaras y áreas de servicio | Nave corta y larga caben sin miniaturizarlas; giros y vistas inferiores utilizables; no aparecen vehículos canónicos duplicados por confundir decorado con objetos funcionales |
| Módulos de nave | Reutilizar uniones; comprobar frontal–final y medio–medio además de combinaciones actuales; anclas y colisiones por pieza | Longitud calculada desde uniones; no estirar mallas ni inventar otro conector; animación adaptada a configuración |

Convenciones de nombres nuevas, unidades y ejes se fijan a partir de los GLB observados y de las convenciones del runtime. Documentar adaptadores; no renombrar recursos existentes globalmente sin necesidad. La ampliación del hangar se construye en Blender; la interacción y carga son del juego. No exigir otro shot de Meshy salvo que la inspección muestre una carencia concreta.

## 3. Estados separados y personalización estructural

**C-08.** Separar: progreso de sector/gemas; tipos de piezas desbloqueados; unidades adquiridas; composición actualmente equipada; ubicación de vehículos; y, si se aprueba, diseños guardados o flota física. No usar `stage === número de módulos` para todo.

**C-09. Configuraciones de aceptación:** frontal solo en el inicio existente; frontal+medio; frontal+final; frontal+medio+final; frontal+medio+medio+final. Las primeras dos siguen las condiciones de vuelo existentes. Estas configuraciones no establecen un máximo de dos medios: el máximo/obtención de unidades es D-05.

Los tres stages continúan como hitos/tipos de piezas de la expedición, no tres naves excluyentes. Tras desbloquear propulsión, una nave compacta frontal+final no pierde progreso por omitir el hábitat. No supeditar el final a una cantidad rígida de piezas instaladas sin una decisión explícita.

**C-10.** Cada ejemplar de módulo conserva identidad e instalaciones. Retirar o reubicar un medio conserva sus torretas; no las duplica. Un diseño guardado no crea unidades físicas gratis. Guardado, cámara, colisiones, puerta, cable, nozzles expuestos y disparos se recalculan según ensamblado real.

**C-11.** Torreta colocable por el jugador en superficies compatibles de cada módulo, moto y Nóma. No reducir silenciosamente a dos coordenadas prefijadas. Separar capacidad de posición. La base debe apoyar; no atravesar piezas, bloquear controles/accesos ni interrumpir propulsión. Mostrar motivo cuando una posición no es válida. Posición y orientación se guardan en coordenadas del huésped concreto.

Las dos torretas por módulo tratadas previamente son una referencia de capacidad a cerrar en D-05, no seis como techo global. Probar más módulos y sus montajes. Una torreta compacta no es un diseño nuevo ni otro jet. Compartir el recurso gráfico no equivale a entregar otra unidad al jugador.

**P-01. Edición transaccional:** selección → vista previa → mover/orientar → validar contacto/obstrucción/capacidad/coste → confirmar o cancelar. Confirmar guarda compra/descuento/instalación juntos; cancelar deja estado anterior. Cerrar durante cambios ofrece conservar/cancelar explícitamente. No perder una compra por fallo de carga o actualizar una segunda copia del inventario.

## 4. Hangar como escena y carga por etapas

**C-12.** Diseñar el hangar como escena 3D autónoma con ciclo de carga y liberación, no sólo como un panel superpuesto al combate. Tener escena propia no decide todavía si es caminable ni dónde existe narrativamente (D-01).

**P-02. Gestor de recursos compartido:** distinguir descargado, decodificado, preparado para GPU y visible. Un archivo descargado no está necesariamente listo para mostrarse. Compartir geometrías/texturas entre copias cuando corresponda; mantener transformaciones, rigs y datos de juego independientes. Elegir APIs compatibles con el Three vendorizado, sin actualizar motor por defecto.

| Etapa | Trabajo prioritario | Qué no debe suceder |
|---|---|---|
| Entrada al juego | UI utilizable, moto, astronauta, Nóma y entorno inmediato según aparición real | Cargar el hangar completo y todo el catálogo antes de empezar la moto |
| Solicitud de hangar | Preservar estado; preparar zona de servicio y vehículo seleccionado con materiales completos; transición coordinada | Resetear sector, borrar enemigos o otorgar inmunidad por una decisión de acceso no aprobada |
| Hangar disponible | Editar nave actual; mostrar carga y piezas; preparar recursos de inspección | Bloquear todos los controles mientras se descarga un recurso secundario |
| Selección de otro diseño/vehículo | Priorizar ese modelo; preparar geometría, mapas y shaders; señal de preparación honesta | Cobrar/confirmar equipo no disponible; mostrar modelo borroso como calidad final |
| Bahías adicionales | Cargar según visibilidad y decisión D-02; máxima calidad al inspeccionar | Ocultar permanentemente las otras naves en móvil para compensar rendimiento sin aprobación |
| Preparación del destino | Precargar por presupuesto lo que el siguiente sector necesita; prioridad a la interacción activa | Cargar todos los sectores, todos los LOD y todos los enemigos en GPU a la vez |
| Salida/cruce | Comprobar readiness del destino; transferir estado/configuración; liberar lo que dejó de usarse | Doble consumo de gema/carga, cabina negra, recursos compartidos destruidos o carga infinita |

**C-13.** Precarga no equivale a desbloqueo. Preparar el hábitat o propulsión no los entrega al jugador. Inspeccionar diseños futuros no debe revelar contenido narrativo sin decidirlo.

**C-14.** Mantener el trigger de carga/aparición de enemigos acordado para PERF: asteroide que activa encuentro y preparación parcial durante explosión. La idea del hangar no autoriza adelantar todos los enemigos. Cualquier cambio de ese contrato requiere decisión explícita.

**P-03.** Un renderer/contexto y gestión de recursos común, sin visores WebGL independientes en cada tarjeta. Miniaturas derivadas de los assets reales y vista 3D de selección. No renderizar dos niveles completos permanentemente para suavizar un fundido. Evitar picos por solapar hangar, sector saliente y destino.

Ocultar una escena no libera sus texturas; liberar requiere conocer quién sigue usando el recurso. Preservar estado lógico separado del estado gráfico. Al volver al sector, no reiniciar objetivos, enemigos, inventario o transporte por haber descargado mallas. Decidir simulación/pausa y acceso seguro en D-01: esto no se infiere del cargador.

Solicitudes duplicadas deben unificarse; cambiar de selección reprioriza/cancela lo innecesario y una respuesta tardía nunca reemplaza la selección nueva. Reintento tras error de red, salida durante carga, pestaña suspendida y contexto gráfico perdido forman parte de la aceptación.

### Varias naves y moto: capacidad técnica no es decisión de producto

**D-02. Varias naves** puede significar tres cosas distintas, todas registradas: (a) varios diseños de la misma nave; (b) varias naves propias físicamente construidas con inventarios separados; (c) otras naves ambientales en bahías. No decidir una en nombre del usuario. Mostrar la nave enemiga tampoco autoriza pilotarla ni inventar un sistema de captura. No se ha pedido multijugador.

**D-03. Moto estacionada:** distinguir dejarla físicamente en una bahía, quitarla del manifiesto de salida o transportarla dentro de la nave sin renderizarla. Resolver persistencia, disponibilidad en otro sector, retorno al hangar y recuperación antes de crear el botón. No teletransportar ni duplicar la moto por cambiar de escena.

**P-04.** Si se aprueba la opción de llevar/dejar moto, interfaz con ubicación y estado explícitos, vista de su plaza y confirmación de salida sin ella. El diseño de misión debe permitir terminar/recuperarse sin quedar bloqueado. No imponer esta propuesta como regla final.

## 5. Storytelling y mapa de escenas

**C-15. Elementos a integrar:** inicio en moto con Nóma, encuentro con la nave, baliza con utilidad real, extracción y reacción hostil, gemas de avance, carga de equipamiento, aliado verde, personalización y cierre de viaje. Conservar identidad visual y las tres regiones conocidas.

**P-05. Arco narrativo para aprobación D-06:** una expedición dispersa intenta reconstruir su ruta; una señal ajena convierte la recuperación en colaboración. Nóma interpreta nuestros sistemas; el aliado conoce la región. La nave muestra nuestras decisiones, no premios que se materializan sin explicación.

| Escena | Relato/objetivo propuesto | Uso de assets y resultado |
|---|---|---|
| Inicio / Nereida | La cabina sigue transmitiendo. «Primero encontremos nuestra nave.» | Astronauta en moto y Nóma; control entregado sin tutorial interminable |
| Nave y baliza | Sincronización revela regiones de búsqueda y una señal desconocida | La baliza cambia información visible; no sólo barra de escaneo |
| Extracción y encuentro | La fractura revela la actividad de la expedición | Pulso, entrada hostil y proyectiles minerales; no cambiar triggers por narración |
| Primer equipo/hangar | Material recuperado permite preparar la siguiente salida | Celda, torreta, montaje y nave real; feedback audiovisual de compra |
| Vesper / aliado | La transmisión tiene un emisor reconocible; ayuda mutua | Aliado verde, arma y apoyo; no otro robot ni otra nave |
| Ensamblado | Se adquieren piezas y se elige una configuración | Uniones existentes y animación adaptada; no forzar un medio sólo para mostrar stage |
| Umbra / salida | Usar la nave elegida y la ayuda de la tripulación para abrir la ruta | Combate, última gema y anomalía; la nave final tiene tiempo de juego |
| Final | Respuesta a la señal, resumen de la expedición | Nave realmente equipada, tripulación, inspección y compartir opcional |

**P-06. Roles:** baliza = orientación/enlace; celda = carga para equipo; gemas = progreso de ruta. Precios, obtención, duplicados y balance son D-05. No agregar otra moneda sin aprobación. El equipo básico debe evitar bloqueos por una compra; precisar esa regla antes de cerrar economía.

**D-04. Momento de salida:** el sistema heredado recoge gema y vuelve/aborda/cruza automáticamente. La propuesta nueva de elegir salir después de obtenerla no está confirmada. No combinar ambas secuencias ni cambiarla dentro de PERF. Tras decidir, conservar toda la cadena: gema, reacción, regreso/abordaje, cable, preparación, cruce, llegada y acople correspondiente, guardado y recuperación de error.

**C-16. Anomalía de salto:** producir con geometría/materiales/efectos y reutilización, no exigir otro GLB Meshy. No simular física astrofísica por inferencia. Mantener coherencia de cámara, audio, carga, skip y preferencia de vista. Omitir una cinemática no duplica ni salta los eventos de progreso.

## 6. UI visual completa y estados que deben diseñarse

**C-17.** La entrega de UI no se acredita con un diagrama de flujo ni un póster generado. Deben revisarse pantallas y recorridos en el runtime con los modelos canónicos. No usar naves triangulares, otra moto u otro Nóma porque aparezcan en un concept poster.

**P-07. Dirección:** instrumentación de expedición, superficies sobrias, contraste legible y luces contenidas; el hangar y la nave protagonizan. Tipografía de interfaz legible; no convertir textos extensos en textura dentro del canvas. Paleta y diseño final se validan, no se toma una imagen anterior como design system definitivo.

| ID | Superficie obligatoria | Contenido/estados de aceptación |
|---|---|---|
| UI-01 | Entrada/menú principal | Nueva expedición, continuar, hangar, bitácora, ajustes; continuar sólo con partida válida; estado real y carga/errores |
| UI-02 | Hangar/ensamblado | Composición real, piezas adquiridas/instaladas/bloqueadas, separar desbloqueo de montaje; nave corta/normal/larga; rotación, zoom, centrar, vista inferior |
| UI-03 | Colocación de torreta | Selección, contacto válido/inválido con explicación, orientar/mover, confirmar/cancelar, coste/capacidad; sin luchar contra la cámara |
| UI-04 | Vehículos y otras naves | Inspección y gestión según D-02; no afirmar «flota» si sólo son presets; preservar configuración por objeto |
| UI-05 | Moto, Nóma y tripulación | Montaje de torreta en huéspedes confirmados, personaje verde sólo tras incorporación; estados y arma existentes; llevar/dejar según D-03 |
| UI-06 | Inventario y carga | Gemas separadas de carga; disponible, equipado, guardado, preparación y error; no imagen genérica que invente otro objeto |
| UI-07 | Mapa/bitácora | Sector, ruta descubierta, señal, objetivo, piezas desbloqueadas, registros; no revelar objetivos por cargar sus archivos |
| UI-08 | HUD de partida | Objetivo inmediato, salud/contexto, mira y acción pertinente; moto/astronauta/nave en primera y tercera persona; no esconder disparo o visor |
| UI-09 | Pausa/ajustes/ayuda | Audio y mezcla, controles/sensibilidad, vista y accesibilidad, reanudar/volver, confirmación de reinicio; foco/teclado/touch correctos |
| UI-10 | Preparación/transiciones | Progreso verdadero por fase; fallo, reintento y cancelar donde sea seguro; estado persistido; no spinner perpetuo |
| UI-11 | Sector completo/final | Recompensas reales, nave equipada, siguiente decisión según D-04, reinicio sin borrar accidentalmente inventario/bitácora; compartir voluntario |

Escritorio y móvil vertical/horizontal deben mantener funciones equivalentes. No ocultar funciones aprobadas por tamaño de pantalla. Paneles extensos colapsables; centro de juego libre. Contraste y estados no dependen sólo del color. Subtítulos legibles, sonido opcional, reducción de movimiento, safe areas, pausa real y foco visible. No lanzar disparos al tocar UI ni retener inputs al perder foco/cambiar de app.

Inspección, colocación y pilotaje tienen propiedad exclusiva de input. Una miniatura de inventario no necesita otro renderizador. La navegación de menús no espera todas las bahías ni todos los assets de futuros sectores.

## 7. Cámaras y aim: contratos por contexto

**C-18.** Fuente lógica de aim estable, separada de balanceo visual e inercia de cámara. El disparo se ve salir de la boca real, apunta al objetivo determinado y respeta obstáculos; no se usa una traslación para corregir una segunda orientación oculta. Una torreta no dispara a través de su huésped para alcanzar una mira incompatible.

| ID | Contexto | Mejora concreta / condición |
|---|---|---|
| CAM-01 | Astronauta, primera persona | Mirada y aim coherentes sin mover el cuerpo por flechas para corregir; manos/arma y alcance legibles; evitar clipping; mantener escala |
| CAM-02 | Astronauta, tercera persona | Cámara, punto de mira y muzzle convergen en el objetivo con oclusión comprobada; el cuerpo no tapa permanentemente la mira |
| CAM-03 | Moto, primera/tercera | Encuadre de manos/manillar y entorno; giro/aim vs empuje diferenciados; cambiar de vista no dispara ni altera rumbo por accidente |
| CAM-04 | Nave exterior | Encadre según composición y proporción de pantalla; navegación/aim estable, balanceo sólo visual; no cortar proa o cola de nave larga |
| CAM-05 | Cabina, entrar/sentarse/pararse/salir | Mantener vista anterior segura hasta asiento/asset listos; transición continua; conservar funcionalidad/escala/control actuales; no añadir circulación libre por inferencia |
| CAM-06 | Hangar inspección | Orbitar 360°, zoom, centrar, enfocar módulo, vista inferior; límites por paredes/suelo; giro automático se detiene al editar |
| CAM-07 | Hangar colocación | Mover/orientar pieza sin orbitar accidentalmente; poder consultar otro ángulo y continuar la edición; cancelar restaura estado |
| CAM-08 | Explosión/gema/aliado/acople/salto | Encuadre legible para objeto y composición reales; no asumir nave siempre de tres piezas; skip/reduced motion/restauración de control coherentes |

**Base de encuadre:** dimensiones y anclas reales, configuración activa, relación de aspecto, espacio de UI, contexto de interacción y accesibilidad. No cambiar escala de modelos para arreglar cámara. Duraciones/FOV/distancias se calibran visualmente y se registran; no cifras inventadas como hechos.

El export previo propuso transición de cabina 0,35–0,5 s, balanceo lateral 8–12° e inclinación 3–6°. Son referencias del paquete acordado, no permiso para hacer oscilar el aim ni para inventar una nueva física. Respetar reducción de movimiento y comprobar mareo/legibilidad.

**P-08. Input de pilotaje:** mouse/gesto de mirada gobierna referencia de aim; teclado/joystick gobierna desplazamiento. Definir explícitamente mirar libre vs dirigir vehículo. El modo de captura del mouse, fallback sin pointer lock y combinación táctil de apuntar/disparar son D-07; no imponerlos sin revisar la experiencia existente.

**Pruebas AIM:** apuntar quieto sin teclas de movimiento; desplazarse lateral/vertical disparando al mismo punto; blanco móvil; obstáculo delante del arma; cambio de vista con input sostenido; montar/desmontar; perder foco; touch simultáneo sin tener que usar tres dedos para acciones básicas. Mantener trayectoria, daños y cadencia que funcionan salvo cambio de producto aprobado.

## 8. Persistencia y memoria no son el mismo inventario

**C-19.** Descargar una malla no borra la propiedad ni la ubicación del objeto. Guardar sector, gemas, carga, unidades, configuración, colocaciones, personajes incorporados y estados de transporte acordados. Separar IDs de tipo e instancia.

**V-06.** El checkpoint heredado requiere migración para esos estados; revisar sus límites de longitud/arrays/versiones antes de extender. Hacer copia del guardado anterior y migración validada. Si una versión no puede leerse, ofrecer recuperación explícita, no reiniciar silenciosamente.

Guardar confirmaciones de compra/montaje como unidad lógica. Cortar red, cerrar pestaña en instalación o durante salto, abandonar vista previa y recargar no duplica gemas, módulos ni torretas. Un conflicto de unidades entre diseños/flota se resuelve según D-02, nunca creando equipo gratuito.

Para ships de bahía o skins derivados: no atribuir derechos de propiedad/captura/uso a que el modelo esté descargado. La lista de recursos gráficos y el inventario del jugador son sistemas separados.

## 9. Rendimiento y aceptación conjunta

Aplican todos los requisitos del [anexo PERF](gz-closeout-performance.md). La arquitectura de hangar debe respetarlos; no financiar varias naves reduciendo de forma oculta las texturas de la seleccionada.

**C-20.** Medir dos peores casos distintos: combate con configuración máxima aprobada y hangar con población/cámaras máximas aprobadas; además picos de entrada/salida, primera aparición y cambio rápido de selección. Instanciar reduce trabajo repetido/draw calls cuando aplica; no elimina los triángulos de cada nave visible.

**C-21.** Registrar también configuración frontal+dos medios+final con torretas y posible número mayor aprobado, no sólo el stage 3 antiguo. Varias bahías visibles requieren ensayo propio. Sin límite acordado y medido de población simultánea no se puede certificar un «peor caso» universal.

**C-22.** Máxima calidad de originales en elementos cercanos, objetivos, inspección y cinemáticas; LOD sólo por distancia/tamaño. Carga anticipada con presupuestos separados de red, CPU y GPU. No usar cambio de nivel como pretexto para congelar entrada, repetir shaders o retener todos los recursos indefinidamente.

## 10. Registro de decisiones — resolver sin recortar

| ID | Decisión del usuario todavía abierta | Propuesta explícita / por qué importa |
|---|---|---|
| D-01 | ¿Hangar físico al que llegar, escena de mantenimiento accesible desde menú en estado seguro, o ambas? ¿Se recorre a pie? | Diseñar entrada/salida/pausa, ubicación persistente, acceso durante combate, carga y cámara. No asumir teletransporte ni mapa caminable nuevo. |
| D-02 | ¿Otras naves = configuraciones guardadas, flota propia real, ambientación, o combinación? ¿Cuántas visibles juntas y cuáles? | Presets reutilizan equipo al activarse; flota requiere posesión e inventario por unidad. La visibilidad no concede pilotaje de la enemiga. |
| D-03 | ¿La moto puede quedar en una bahía al salir? ¿Viaja con la nave o se recupera al volver? | Registrar ubicación y manifiesto; impedir bloqueo de misiones sin moto. |
| D-04 | ¿Gema inicia automáticamente la cadena de regreso/cruce o habilita elegir partir? | Mantener el comportamiento actual hasta resolver, sin descartar la propuesta de salida voluntaria. |
| D-05 | ¿Cómo se obtiene otro módulo medio/torreta? ¿Capacidades, precios y límite de ensamblado/población? | Confirmar economía y balance; no fijar dos medios o seis torretas como límite global. |
| D-06 | Cerrar motivo del viaje, aparición/rol del aliado, continuidad del hangar y texto de final | El arco recuperar–conectar–salir juntos es propuesta; la incorporación del aliado y nueva narrativa sí están en alcance. |
| D-07 | Captura de mouse / aim táctil y gesto de disparo | Presentar prueba de control sin tocar reglas de combate; conservar alternativa accesible y ambas perspectivas. |

Estas decisiones no paralizan V-01 a V-06, inventario de assets, recuperación de PERF y prototipos visuales de revisión; sí bloquean dar por final el comportamiento dependiente. Registrar respuesta y fecha en la decisión, no inventar un valor por defecto para «cerrar».

## 11. Recorridos de aceptación del cierre

| Prueba | Evidencia requerida |
|---|---|
| QA-01 Recuperación | Informe del worktree/diff y baseline correcto; no pérdida del LOD local |
| QA-02 Assets | Los cuatro modelos reales cargan con mapas completos, escala/rig/montajes; fuentes intactas |
| QA-03 UI | Capturas y navegación real escritorio/táctil de UI-01 a UI-11; no sólo poster/diagrama |
| QA-04 Ensamblado | Todas las composiciones C-09, mismo tamaño de piezas, colisiones/acoples/cámara/anclas válidos; persiste tras recarga |
| QA-05 Torretas | Montar y mover en nave/moto/Nóma, posiciones válidas/invalidas, disparo real y guardado; sin slots fijos impuestos |
| QA-06 Hangar | Entrada, inspección, carga secundaria, cambios de selección, salida y retorno; no fuga ni pérdida de estado |
| QA-07 Flota/moto | Cubrir exactamente D-02/D-03 aprobados, incluyendo cambio de nave y salida sin moto cuando corresponda |
| QA-08 Aim/cabina | CAM-01 a CAM-08, tiro estático/móvil, asiento/pararse con carga lenta, cambios de vista/reanudación |
| QA-09 Historia | Tres sectores, baliza útil, aliado y apoyo, carga vs gemas, secuencia de cruce y cierre según decisiones |
| QA-10 Rendimiento | Arranque frío/caliente, primer enemigo, combate máximo, hangar máximo, transiciones repetidas y térmica en dispositivos reales |
| QA-11 Fallos | Red interrumpida, doble clic, cancelar, respuesta tardía, refresh, app suspendida, guardado viejo o corrupto; no progreso duplicado/perdido |
| QA-12 Publicación | SHA y artefactos reales, smoke de URL de prueba, assets permitidos/licencias y rollback; no promover rama documental |

No declarar «completo» porque existan paneles vacíos, mocks o anclas sin acción. Un modelo preparado a la espera de integración y una función bloqueada por decisión se reportan como tales, no como recortes aprobados. Preservar todos los requisitos no sustituidos de specs previas, aplicando sus correcciones posteriores (balística actual, no restaurar el RNG antiguo; cabina actual sin imponer caminabilidad libre).

## 12. Mapa de trabajo para Codex y evidencia

Leer por tramo; no volver a resumir decenas de miles de líneas para cada cambio. Las rutas siguientes orientan la inspección, no autorizan reescritura general:

| Tramo | Base existente / área | Resultado verificable |
|---|---|---|
| Recuperación PERF | Script local `build-performance-lods.mjs`, `sector-world.js`, `asset-actors.js`, `bike-actor.js`, `main.js` | Diff rescatado, LOD probado sin tocar reglas/UI |
| Assets Blender | `scripts/build-encounter-models.mjs`, cargadores y manifiestos actuales | Inventario de fuentes, derivados y pruebas por cada nuevo asset |
| Composición | `asset-actors.js`, `spatial.js`, `thruster-anchors.js`, `vehicles.js`, `flight.js` | Composiciones arbitradas por datos, anclas y tests de identidad/contacto |
| Hangar/recursos | `asset-loading.js`, punto de integración `main.js`, escena de hangar separada sólo donde haga falta | Carga escalonada, propiedad y liberación de recursos probadas |
| Equipamiento/guardado | `checkpoint.js`, `ballistics.js`, `shot-visuals.js`, actores | Estado persistente, torretas funcionales, no duplicación |
| UI/cámaras | `index.html`, `src/lowpoly/styles.css`, `controls.js`, `main.js`, `cabin-controller.js`, presentación | Rediseño completo, input por modo, recorridos y capturas |
| Relato/transiciones | `expedition.js`, `presentation-clock.js`, audio y mundo | Eventos narrativos y de progreso idempotentes; no texto contradictorio |

En cada tramo: reproducir/capturar baseline pertinente; escribir pruebas de comportamiento que fallen antes del cambio; implementar el requisito; ejecutar pruebas y revisión visual; registrar evidencia y commit acotado. No convertir el baseline de rendimiento en una promesa de FPS futura. `npm test` existe y ejecuta `node --test tests/*.test.mjs`; no inventar un build Vite inexistente.

Actualizar un registro breve por IDs: confirmado, implementado sin validar, validado con evidencia, bloqueado por D/V. No usar un porcentaje global sin denominador. Leer instrucciones de repo y la versión vendorizada antes de elegir APIs.

### Fuentes de esta especificación

- Instrucciones directas del usuario y correcciones posteriores en la conversación de diseño, 17/09/2026.
- Export `Pasted text(6).txt`: diagnóstico de geometría, aprobación del contrato PERF y últimas escrituras locales. No se incorpora el export privado al repositorio.
- Remoto observado `main` en `ce1c5a7f025c1e522414cf87b73ef15331df29b7`; documentación histórica `docs/superpowers/specs/2026-09-17-final-expedition-design.md` y `2026-09-17-bike-alien.md` sólo con su precedencia y correcciones.
- [FigJam canónico](https://www.figma.com/board/T5no25utykpwFR7eG2lBEZ): familias de imágenes; no inspección de los binarios en Descargas.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): preparación de shaders/texturas, comprobar compatibilidad local.
- [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html): órbita y giro automático para inspección, no reemplazo del pilotaje.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html): reutilización de geometría/material y transformación independiente, no coste nulo por copia.

**Estado de entrega de este documento:** especificación consolidada y decisiones visibles. No se han implementado cambios de juego, ejecutado Blender, importado los cuatro assets ni medido nuevos FPS desde esta conversación.
