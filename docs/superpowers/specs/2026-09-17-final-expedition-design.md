# Gravedad Zero — cierre de alcance para una única entrega

**Aprobación de implementación:** el usuario respondió «Dale» al cierre conjunto y confirmó que incluye jetpack y fuego de nave. Todas las propuestas de la sección 5 se adoptan para esta entrega. La decisión posterior de no exigir una torreta modelada prevalece. El texto restante conserva el diagnóstico previo como línea base; sus etiquetas de pendiente se refieren al momento de auditoría, no a autorizaciones nuevas.

17 de septiembre de 2026. Base auditada: `1d6668e482473ff070fff6d5ec324e9d20e8adfd`, rama `codex/low-poly-modular-world`.

Este documento cruza los pedidos de la conversación, el código activo, los assets locales, las referencias visuales y las auditorías anteriores. Es una revisión de diseño: no acredita implementación, calidad final ni rendimiento. No se modificó el juego, no se editaron modelos y no se publicó una versión durante esta revisión.


> **Corrección de cabina — 17/09, posterior a la aprobación inicial:** usar la cabina completa de la referencia `ChatGPT Image Sep 17, 2026 at 02_26_27 AM.png`. El ventanal debe dominar la vista como la referencia, nunca un visor miniatura. El usuario aclaró después que no exige una abertura literal de 3,80 m: prioriza proporción visual con controles humanos, conservando el exterior. Verificar escala de ventana, cuerpo, mandos y cámara conjuntamente. El usuario simplificó expresamente la circulación: basta acercarse al puesto, sentarse/pilotear y pararse. Esto sustituye las exigencias de caminabilidad libre y colisiones de circulación que permanezcan descritas debajo. No autoriza rediseñar el casco exterior sin mostrar la necesidad concreta.

## 1. Resultado de la auditoría

Los frentes generales estaban nombrados, pero varios requisitos podían desaparecer dentro de etiquetas demasiado amplias. Se corrige eso con entregables y condiciones de aceptación explícitos:

- «Piloto/manos» no cubría tercera persona interior ni caminar por la cabina.
- «Nuevos assets» no certificaba que la gema y el proyectil estuvieran cargados: todavía no lo están.
- «Rocas con texturas» no resuelve variedad de silueta, desplazamiento, distribución, roles o reposición.
- «Fuego mejorado» no garantiza un emisor por cada tobera real, respuesta al empuje, salidas tapadas apagadas ni estelas independientes del actor.
- «Momento de gema» no incluye automáticamente regreso físico, abordaje, cable, carga, llegada y acople: esa cadena aún no existe completa.
- La suspensión en explosiones Y gemas estaba pedida; un documento posterior volvió a abrir la posibilidad de dejarla solo en gemas. Esa reducción no fue aprobada y no se aplica.
- «Companion» no se considera cerrado con un bip y un mensaje que queda escondido en el menú.
- «Carga por stages» no cubre todavía texturas del mundo, efectos, audio, liberación de recursos y errores de carga.
- La igualdad de las mallas intactas en móvil no equivale a igualdad de toda la imagen: sombras y geometría visible de restos tienen diferencias actualmente.
- El cañón activo sigue siendo procedural. El usuario aclaró que esta versión no requiere editar la nave para mostrar una torreta: alcanza con salida coherente y proporcional del proyectil, partículas y presentación del disparo. No tratar una torreta nueva como bloqueo ni como entregable pendiente.

Una entrega significa una sola publicación final. Las pruebas internas y correcciones forman parte de esa entrega; no justifican publicar paquetes incompletos.

## 2. Decisiones confirmadas

### Universo, progresión y exploración

- Three.js conserva el juego; Blender se usa para preparar o adaptar assets y animaciones donde corresponda.
- Se conservan los diseños actuales aprobados de nave, astronauta, arma, companion y baliza. La dirección es realismo moderado, superficies detalladas y la atmósfera del atlas, no volver al prototipo poligonal.
- Gema nueva Aether Shard y proyectil Aethercore. Mismo proyectil para ambas armas, con escalas uniformes diferentes.
- Tres sectores: Nereida, Vesper y Umbra. Escanear → 3 objetivos EVA por sector → 1 / 2 / 3 núcleos de nave → gema. Totales obligatorios 4 / 5 / 6.
- Exploración manual, descubrimiento, separación espacial y acciones cercanas. Mantener la asistencia de tiro y la regla existente de fallos; no sustituirlas por combate totalmente automático ni puntería libre sin aprobación.
- Los peligros se destruyen o esquivan y nunca aportan progreso. Los fragmentos son visuales, derivan y se disipan.
- Trayectorias controladas, variadas y continuas; no agregar atracción planetaria como requisito implícito.
- Reposición gradual de peligros y rompibles ambientales, lejos del jugador y fuera de cámara. Los objetivos obligatorios no reaparecen durante el sector.
- Protección temporal durante apuntado/disparo, escaneo y toda la secuencia posterior a la gema. Protección incluye no interrumpir/desplazar al actor de manera que cancele esas acciones.
- Recoger la gema inicia regreso físico, abordaje, recogida del cable, viaje/carga, llegada y acople cuando corresponde. El corredor no permanece suspendido en el mapa. La tercera gema no crea un cuarto módulo.
- Se aceptaron los siete recubrimientos minerales/tecnológicos mostrados. Son siete materiales sobre una malla, no siete modelos diferentes.

### Cabina y controles: respuestas de esta revisión

- **Cabina con acercamiento al puesto, sentarse, pilotear y pararse**, con piloto y vistas en primera y tercera persona. Esta simplificación fue solicitada explícitamente por el usuario el 17/09 después de ver la escala del interior. No hace falta navegación libre por la cabina; hábitat y propulsión siguen siendo exteriores.
- Apoyo estable de **botas magnéticas** en el puesto. La nave **se estabiliza al levantarse**. Fuera de la cabina se conserva la inercia espacial.
- Companion con **sonidos expresivos de robot y subtítulos breves**. No se requiere locución hablada.
- Móvil: **joystick analógico principal y flechas disponibles en ajustes**. Mantener arrastre para mirar, altura, estabilización, acción contextual y acceso visible a visor/cámara.
- **Disparo de nave sin nueva torreta:** salida desde un punto coherente del casco, escala proporcional, carga, partículas, estela e impacto. No exigir remodelar la nave para visualizar el cañón en esta versión. Las anclas y efectos de motores/toberas siguen incluidos por separado.

### Presentación y calidad

- Respuesta corporal a aceleración lateral/vertical, frenado y pequeñas oscilaciones; nave y astronauta no permanecen rígidos.
- Fuego potente desde cada salida real expuesta de nave, jetpack y companion. Motores tapados por acoples dejan de emitir. Las partículas emitidas quedan en el espacio.
- Explosiones y recogida con sensación de ingravidez, dilatación temporal, cámara y sonido coordinados.
- Mantener fidelidad de modelos y superficies en móvil. No adoptar nuevas reducciones visibles de resolución, mapas, geometría o efectos sin explicarlas y acordarlas.
- La fidelidad tiene prioridad sobre un límite arbitrario de triángulos. Medir 60 FPS como referencia de rendimiento; no prometerlo sin medición ni usarlo para recortar silenciosamente.
- Se conserva el presupuesto de resolución aproximadamente 720p previamente acordado. El código actual limita ambos perfiles mediante lado corto 720 y largo 1280; no implica resolución nativa ni un recorte cinematográfico fijo. No subir a 4K ni agregar bandas negras por inferencia.

## 3. Inventario de entrega y aceptación

| Frente | Base comprobada | Qué debe entrar junto en la próxima entrega | Cómo se acredita |
|---|---|---|---|
| Gema nueva | GLB en Descargas, 50.542 triángulos; un material opaco | Sustituir gema procedural; conservar montura y forma; tratamiento diferenciado cristal/metal; aparición en último núcleo realmente destruido; alcance y recogida hacia mano móvil | Primer plano y secuencia en los tres biomas; destrucción de núcleos en órdenes distintos |
| Proyectil nuevo | GLB en Descargas, 86.758 triángulos | Una geometría compartida, punta/eje/pivote correctos, dos escalas uniformes, estela proporcional y disparos sincronizados | Tiro EVA y nave, acierto/fallo, ambas vistas; boca del arma EVA / ancla de salida de nave |
| Arma EVA | Nova Pulse Gun ya integrada; FP con brazo derecho | Encuadre móvil/horizontal sin recorte indebido; agarre, apuntado, retroceso e inercia; brazo de alcance cuando corresponde | Visor quieto/en movimiento, tiro/escaneo/gema; manos sin interpenetración visible |
| Salida de disparo de nave | Cañón procedural activo; torreta nueva no requerida | Punto de salida coherente sobre nave, proyectil proporcional, carga, partículas, estela, retroceso y dirección correctos; sin exigir edición del casco | Disparo desde las vistas y los tres stages, sin nacer en el centro o atravesar el casco |
| Astronauta | Rig de 52 huesos, 11 clips | Adaptar mezclas y contactos; inclinación, arranque, corrección lateral/vertical, freno, escaneo, alcance; botas y manos en primeros planos | Clips exportados en Three.js, no solo render de Blender; mantener escala ~1,90 m |
| Nave modular | Tres módulos exteriores detallados | Acoples consistentes; respuesta de casco al empuje; frenado y reposo; anclas de puerta/cable/motores/cañón y colisiones coherentes | Tres stages; avance/reversa/lateral/altura; no girar la proa por mera traslación |
| Propulsión | Plasma y motas existentes; emisores incompletos | Registro por tobera expuesta, núcleo/penacho/turbulencia/luz, potencia normalizada, RCS, turbo, apagado y estelas mundiales | Todos los modelos y stages, empuje/freno/deriva; ninguna llama desde dentro del casco o motor tapado |
| Cabina transitable | Entorno visual pequeño ligado a cámara; sin asiento ni locomoción | Normalizar y encajar dentro de cápsula, asiento, paso de pie, acceso funcional, colisiones locales; sentarse/levantarse/caminar; guardar arma; piloto con manos/pies en contacto | Ciclo EVA→entrada→interior→asiento→pilotaje→levantarse→salida; ambas vistas y formatos móviles |
| Cámaras | FP y tercera persona exterior | Agregar tercera persona interior, mirada coherente por modo, evitar techo/paredes/casco, restaurar preferencia después de cinemáticas; mantener visor accesible | Cambios de modo durante juego, pausa, retorno y acople sin atravesar geometría |
| Baliza | Modelo Sentinel Tripod integrado | Descubrimiento cercano, barrido adherido a superficie, inicio/progreso/cancelación/fin, companion y audio; protección temporal | Escaneo cerca de peligros; sin daño, desplazamiento incapacitante ni interrupción por colisión |
| Rocas y materiales | Dos variantes Molten Heart casi iguales; 218 elementos ambientales procedurales | Familias visibles por silueta/composición/tamaño, varios recubrimientos por bioma; reemplazar las grandes formas que desentonan; roles independientes del aspecto | Galería + recorrido real; variedad dentro de cada sector; no aprobar solo por cantidad de polígonos |
| Poblaciones y trayectorias | Objetivos casi fijos y peligros sinusoidales | Separar decoración, rompibles opcionales, peligros, EVA y núcleos; órbitas/cruces/deriva; respawn gradual seguro; movimiento fuera de la zona inicial | Varias semillas, mapa completo, ventanas para actuar y volver; no aparición encima/delante del jugador |
| Diseño de nivel | Objetivos agrupados dentro de rangos de disparo | Zonas separadas, profundidad, puntos de referencia y descubrimiento; acercamiento voluntario, ruta no resuelta por botón | No completar objetivos desde el punto inicial; cable de 26 m compatible con posicionamiento de nave |
| Combate | RNG y tercer intento acertado tras dos fallos por actor/objetivo | Conservar regla; adquisición suave cercana, línea de visión, estabilidad, orientación del modelo, carga/lanzamiento/impacto/recuperación; fallo legible | Blanco móvil, oclusión, cambio de objetivo/arma, tiro inválido, peligros opcionales sin progreso |
| Explosiones | Fractura en 24 piezas y ralentización local | Fisuras, destello, fragmentos con velocidad heredada, polvo y residuos; suspensión coordinada y retorno a tiempo normal | Secuencias pequeñas/grandes y eventos solapados; nada de escombros peligrosos |
| Atmósfera y biomas | Capa celeste, planetas y polvo casi estático | Profundidad y movimiento cercano/medio/lejos, composición propia, materiales diversos, reflejos/luz coherentes; Vesper legible | Vistas jugables comparables de Nereida/Vesper/Umbra, visor/cabina/exterior, vertical/horizontal |
| Gemas y transición | Recogida cambia fase; regreso y corredor requieren acciones | Mano recoge joya, suspensión, retorno físico protegido, abordaje/cable, transición de carga y destino preparado, acople | Cadena entera sin nuevos clics obligatorios tras recoger; sin corredor permanente |
| Final | Tres módulos y final de expedición | Tercera gema con cierre coherente, nave completa, inspección y nueva expedición; no prometer otro módulo | Final/recarga/reinicio sin duplicar gemas o módulos |
| Companion | Flotación simple, texto oculto, sin fuego | Seguimiento inercial, mirada, alertas/reacciones, propulsión, subtítulos legibles y sonidos; presencia coherente en cabina | Sin tapar mira ni atravesar casco; texto sin abrir menú, incluso sin audio |
| Audio | 50 WAV en inventario; 33 referencias activas | Reutilizar motores, maniobras, carga/tiro/fallo, fractura, escaneo, gema, slow-motion, viaje/acople; mezclas/prioridades y pausa | Sincronización en secuencia real, activación por gesto, silencio/pausa/reanudación |
| UI y entrada | Touch fiable, HUD reducido, visor directo | Joystick + flechas opcionales, acciones contextuales, poca ocupación, modos interiores claros; conservar liberación táctil y bloqueo de selección de texto | Multitouch/cancelación/cambio de orientación/app, teclado y mouse; ningún control atascado |
| Carga y memoria | Meshopt y módulos siguientes diferidos | Recursos por stage/vista, precarga y preparación de destino, texturas/audio/efectos, propiedad/liberación compartida, reintento y recuperación | Inicio frío/caliente, red lenta/error, varios ciclos de sector, contexto perdido, sin pantalla negra indefinida |
| Guardado y rescate | Checkpoint sector/gema; rescate conserva progreso | Mantener recuperación, extender guardado parcial si se aprueba el perfil de abajo; transacciones idempotentes en gema/acople/final | Recargar durante escaneo/combate/gema/viaje/acople sin duplicaciones o bloqueo |

## 4. Cabina: qué implica realmente

`cabina-integrada` contiene 10 mallas, 12 nodos y cero animaciones. Incluye tablero, vidrio alfa, envolvente curva, piso visual y cierre. No incluye asiento, puerta funcional, personaje ni colisiones. Su altura máxima piso–techo es 1,235 unidades frente al astronauta de 1,899 m; no está normalizada para caminar.

La integración actual añade la cabina a la cámara y oculta al astronauta abordado. Caminar requiere un interior situado en el espacio local de la nave, independiente de la cámara. El cuerpo ocupa un lugar real en ese interior. Colisionadores de suelo, paredes y consola son diferentes de las envolventes exteriores que hoy expulsan al astronauta del casco.

Estados propuestos: pilotando → estabilizando → levantándose → caminando en cabina → sentándose o saliendo a EVA. La cámara puede cambiar entre primera y tercera persona sin cambiar de actor ni teletransportarlo. Al volver del exterior debe recuperarse la continuidad hasta el asiento. La secuencia de gema puede conducir automáticamente esos mismos estados.

La pose `Pilot` existe pero no está activada ni adaptada a estos mandos. Hacen falta sentarse/levantarse, caminar con botas magnéticas, ajustar manos/pies y guardar el arma. No se requiere otro astronauta. Los modelos exteriores se conservan; el encaje de superficies y circulación se valida antes de cerrar la escala interior. Si exige alterar el casco aprobado, se presenta ese cambio concreto antes de editarlo.

No se diseñan habitaciones del hábitat ni sala de motores: el usuario eligió solo cabina. El concepto anterior de escalera/escotilla hacia hábitat no obliga a construir ese recorrido.

## 5. Perfil propuesto que aún requiere aprobación conjunta

Las respuestas anteriores no aprueban automáticamente cada número o recomendación de la tabla previa. Se propone cerrar estos puntos juntos, permitiendo cambiar filas:

| Decisión | Propuesta concreta |
|---|---|
| Ritmo y densidad | Espacios abiertos alternados con agrupaciones y cruces; objetivo inicial 4–6 min por sector, sin temporizador ni derrota por demora. Ajustar distancias jugando, no conservar 30/70 m por inercia del código. |
| Rocas no peligrosas próximas | Contacto suave sin daño. Decoración lejana fuera del volumen transitable. |
| Armas contra peligros | Ambas armas; resistencia por tamaño. No cambia el actor obligatorio de los objetivos de misión. |
| Adquisición y tiros móviles | Adquirir solo descubierto/cercano/visible. Nueva regla propuesta para oclusión: si un obstáculo bloquea la línea antes o durante el vuelo, presentar intento interrumpido, sin contabilizar acierto/fallo de misión ni incrementar o consumir la racha/ayuda. El siguiente intento válido conserva el tercer acierto garantizado tras dos fallos. Esto amplía el contrato actual y requiere aprobación, no se presenta como una regla ya existente. |
| Guía | Pistas y referencias cercanas, sin ruta automática a objetos todavía no descubiertos. Mantener retorno asistido y la cadena automática de gema. |
| Fuego y energía | Núcleo blanco/cian, filamentos azul/violeta; variantes por actor/bioma, polvo y residuos de roca más cálidos. |
| Intensidad | Partículas ambientales persistentes y contenidas; picos fuertes en motores y eventos. Sin saturar permanentemente la vista con aros. |
| Cámara | Inclinación/oscilación corporal sin mover sola la puntería; suspensión breve en destrucciones y más marcada en gema; respetar movimiento reducido. |
| Cinemática | Cámaras que muestren modelos y acoples, opción de omitir presentación; esperar recursos necesarios aunque se omita. Restaurar vista preferida. |
| Riesgo dentro de cabina | Al levantarse la nave frena activamente y se estabiliza; recorrerla no añade inmunidad permanente. Se mantienen rescate y las protecciones de acciones/cinemáticas acordadas. |
| Companion en cabina | Posición de acompañamiento a un lado del piloto, sin bloquear paso/ventana/cámara; subtítulos visibles. |
| Guardado | Conservar escaneo y objetivos completados, semilla, gemas/módulos y preferencias; restaurar desde estado seguro sin reproducir premios. |
| Tercera gema | Secuencia de cierre con nave completa, inspección y nueva expedición; sin otro módulo ni cuarto sector. |

## 6. Ediciones de assets que se deben comunicar antes de ejecutarlas

Este es el aviso concreto de intervenciones propuestas. Aprobar el paquete debe incluirlas; no autoriza rediseños adicionales imprevistos.

1. **Cabina:** escala/encaje, asiento, espacio de paso, acceso, puntos de contacto y geometría interior necesaria. Conservar el tablero elegido y la identidad de materiales.
2. **Astronauta:** animaciones/poses/contactos para caminar, sentarse, pilotar, alcanzar y disparar; preparar ambos brazos desde la malla existente. Conservar diseño, proporciones, detalles y rig útil.
3. **Gema:** máscara o separación de cristal y montura para materiales distintos; orientación/ancla. Conservar diseño y proporciones.
4. **Proyectil:** preparación de eje, origen y escala; no cambiar diseño ni fabricar dos variantes deformadas.
5. **Nave/jetpack/companion/baliza:** anclas y emisores sobre superficies reales; cambios locales de piezas/pivotes solo si son necesarios para movimiento funcional. El disparo de nave no requiere modelar una torreta ni modificar el casco; se resuelve con ancla, proyectil y efectos proporcionales.
6. **Rocas:** variantes de composición/silueta y materiales a partir de fuentes existentes. Un cambio sustantivo de modelo o una nueva compra/generación pagada se presenta antes; no es requisito comprar más assets para empezar.

Las correcciones de cámara, luz, efectos, textura triplanar, interfaces y comportamiento se hacen en el runtime. No todo necesita una edición en Blender.

## 7. Límites reales de recursos y fidelidad

- La nueva gema y el nuevo proyectil ya existen; no requieren nuevos créditos ni rigs propios.
- El cañón de nave activo es procedural. Sentinel Tripod es la baliza; Nova Pulse Gun es la herramienta EVA. No falta un asset obligatorio de torreta: el usuario aprobó resolver el disparo desde la nave con proporción y efectos.
- Hay referencia conceptual del corredor, pero no GLB nuevo localizado. La transición automática aprobada puede construirse con capas, profundidad, rocas, luz y efectos existentes; no se bloquea por un corredor físico permanente.
- Los sprites seleccionados tienen restricciones reales: algunas tiras no tienen retícula uniforme; algunas incluyen gemas/aros pintados o negro sin alfa. Adaptar esos recursos forma parte de producción. No se pegan tal cual como sustituto de volumen.
- La calidad de rocas requiere silueta y material además de polígonos; siete recubrimientos no multiplican las siluetas. La variedad en pantalla se comprueba con escenas reales.
- En móvil, las mallas intactas y mapas conservan calidad fuente, pero hay sombras de 1024 frente a 2048 y geometría de restos distinta. No llamarlo igualdad total. Evaluar la imagen y el costo de cada perfil; no revertir a ciegas protecciones contra picos de memoria.
- La caché de imágenes compartidas y la carga simultánea de 33 audios necesitan control de residencia/concurrencia. Compartir recursos no prueba que se liberen.

## 8. Aceptación de la única versión publicable

1. Recorrido jugable de los tres sectores con mínimos intactos, varios órdenes de destrucción y semillas diferentes. Explorar es necesario; un botón no revela/resuelve toda la misión.
2. Los cinco roles de roca funcionan; daños/armas/reposición/progreso no dependen accidentalmente del material. Recorridos accesibles con cable de 26 m y nave reposicionable.
3. Protección completa durante acciones y cadena de gema, incluyendo el cuadro de resolución; riesgo vuelve al vuelo normal.
4. Cabina: personaje de pie, paso, contactos sentado, armas guardadas, cámaras sin penetrar y ciclo EVA/interior/pilotaje funcional en PC y móvil.
5. Toda tobera expuesta visible emite correctamente y cada tapada se apaga, en los tres stages. Estelas permanecen en el espacio; cuerpo responde al empuje.
6. Nueva gema y proyectil aparecen realmente; escena de recogida/explosión/transición restaura tiempo, cámara y control correctamente después de pausa, solapamiento o cambio de vista.
7. Cada bioma se reconoce por composición, materiales, luz y movimiento; Vesper conserva lectura. Revisar primer plano, plano medio y fondo desde vistas reales, no solo una cámara de presentación.
8. Capturas y videos del motor: tres biomas, cabina interior y piloto, visor con arma/manos, motores por stage, disparo/fallo/fractura, gema, retorno y acople. Comparación con el atlas y con los modelos del usuario.
9. Inicio frío, segunda carga, red lenta, fallo de recurso, contexto perdido, recarga en etapas críticas y final. No duplicar gemas/módulos ni dejar pantallas de carga eternas.
10. Medir tiempos de carga, cuadros y picos de transición en Mac; verificar navegador móvil vertical/horizontal y Safari cuando esté disponible. Emulación no equivale a prueba en iPhone físico ni certifica 60 FPS.
11. Mantener modelos/texturas y comparar explícitamente efectos de móvil/PC. Cualquier cambio de fidelidad se informa antes de adoptarlo.
12. Pruebas pertinentes, revisión visual y de código, luego una publicación del conjunto y verificación del enlace público exacto.

Un póster nuevo puede aclarar una decisión de arte, pero no demuestra caminabilidad, encaje, animación ni calidad del runtime. En este cierre la evidencia principal será la cabina/modelos en el motor y las secuencias comparables del atlas; cualquier imagen conceptual se etiqueta como tal.

## 9. Evidencia de esta revisión

- Código activo: `src/lowpoly/{main,expedition,flight,combat,hazards,sector-world,asset-actors,asset-loading,destruction,checkpoint,mobile-actions,presentation,audio}.js`.
- Cabina: `output/gamification/modelos-integrados-v1/cabina/README.md`, construcción y GLB; referencia conceptual en `output/gamification/interior-capsula-v1/REFERENCIA.md`.
- Nuevos modelos: `/Users/gabo/Downloads/Meshy_AI_Aether_Shard_0917134541_texture.glb` y `/Users/gabo/Downloads/Meshy_AI_Aethercore_Torpedo_0917134749_texture.glb`.
- Referencias: `output/gamification/atlas-realismo-v1/`, galerías `revestimientos-revision-v1/` y `direccion-efectos-v1/`.
- Revisión mecánica: 67 pruebas existentes aprobadas y 216 simulaciones de retorno sin escribir archivos, todas abordaron dentro de 30 s. Esto verifica la base actual, no las funciones pendientes.
- Posiciones de la semilla inicial: EVA a 6,21–22,64 m de la baliza y núcleos a 37,05–45,61 m de la nave; todos dentro de alcances actuales 30/70 m. Evidencia de concentración, no solo apreciación visual.
- Fuentes rastreables: `main.js:69,148,220,430,511,568,592,799`; `expedition.js:65,79,92,188`; `combat.js:12,22`; `asset-actors.js:41,45,81,108`; `sector-world.js:600`; `destruction.js:75,91`; `checkpoint.js:38`.

Este registro prevalece sobre formulaciones anteriores que reducían el cierre a efectos locales o manos del piloto. Las propuestas de la sección 5 siguen identificadas como propuestas hasta recibir aprobación; las decisiones explícitas de la sección 2 no se vuelven a abrir.
