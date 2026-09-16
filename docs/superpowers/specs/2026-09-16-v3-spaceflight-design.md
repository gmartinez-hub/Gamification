# Gravedad Zero — definición de la versión 3

Estado: propuesta aprobada por el usuario. Base: `6cd617a` y póster aprobado. Se implementa la opción recomendada: gravedad cero con inercia y frenado asistido; atracción de cuerpos queda fuera de esta versión.

## Prioridad

Mantener la primera persona que funcionó y el recorrido completo de tres sectores. Corregir primero proporciones, vuelo y lectura de peligros. Después mejorar la representación de materiales, iluminación, profundidad y biomas tomando el póster como dirección artística. Seguir con geometría estilizada y presupuesto compatible con computadora y móvil.

## 1. Escala física coherente

Medición real de mallas visibles, excluyendo módulos todavía ocultos y plumas de propulsión:

| Elemento | Versión actual (ancho × alto × largo) | Propuesta |
|---|---|---|
| Astronauta con casco | 1,05 × 1,91 × 0,93 m | Mantener altura de aproximadamente 1,9 m |
| Cabina inicial | 1,87 × 1,40 × 2,47 m | Cabina de aproximadamente 6,2 m de largo y 3,5 m de alto |
| Cabina + hábitat | 2,11 × 1,61 × 4,33 m | Aproximadamente 10,8 m de largo |
| Nave completa | 4,30 × 1,61 × 5,81 m | Aproximadamente 14,5–15 m de largo y 4 m de alto |
| Companion | 0,99 × 0,96 × 0,76 m | Aproximadamente 0,7 m de ancho |

La escala propuesta de nave es ×2,5 y companion ×0,7. Las alas necesitan reducir su extensión relativa para acercarse a la silueta del póster. La nave inicial debe parecer habitable y poder contener un asiento/piloto.

La escala se define en una única especificación compartida: dimensiones por etapa, esclusa, punto de amarre, ojo de cabina, salida del cañón y volúmenes de colisión. Esos puntos acompañan la rotación del casco. También se recalculan encuadres, distancias de interacción, posiciones iniciales, zona de abordaje y ancho del corredor.

## 2. Movimiento con masa

Actualmente la nave alcanza 95% de su velocidad en unos 0,5 s y pierde 95% en unos 0,43 s al soltar. A 8 m/s sólo deriva unos 1,14 m. El casco gira para seguir la velocidad, de modo que retroceder o desplazarse de lado cambia también el rumbo visual.

Propuesta inicial ajustable mediante pruebas:

- Nave: crucero 8 m/s, impulso 12 m/s, aceleración máxima cercana a 3 m/s² y frenado activo cercano a 6 m/s².
- Astronauta: crucero 3,6 m/s, impulso 5,8 m/s, aceleración cercana a 4 m/s² y frenado activo cercano a 7 m/s².
- Al soltar, conservar deriva perceptible. Añadir control explícito «Estabilizar» en teclado y móvil. Los valores son asistencia de juego, no una simulación orbital exacta.
- Limitar velocidad y aceleración de giro de la nave; retroceso y desplazamiento lateral conservan la proa y usan propulsores de maniobra.
- Primera persona: avanzar sigue la dirección mirada, también en profundidad vertical; subir/bajar siguen disponibles. Horizonte estable, sin imponer giros completos ni cabeceo de cámara artificial.
- Encender motores según empuje o frenado real, no por el mero hecho de seguir moviéndose. EVA con rodillas flexionadas, brazos estabilizando y mochila activa; eliminar la lectura de caminata en el vacío.
- La guía y el regreso frenan antes de llegar. El abordaje ocurre físicamente en la esclusa a baja velocidad, no mediante un salto ni parada instantánea.

## 3. Significado de «gravedad» — opción A aprobada

A. **Gravedad cero e inercia.** Un impulso produce desplazamiento persistente; el frenado usa propulsores, y el cable transmite tensión. Es la base recomendada para probar peso y flotación sin volver difícil la orientación.

B. **Atracción de cuerpos.** Campos gravitatorios curvan la trayectoria y requieren compensar. Debe quedar claro qué cuerpo atrae y dónde; un planeta que es sólo fondo no debe introducir fuerzas invisibles arbitrarias.

C. **Combinación.** Inercia como base y zonas puntuales de atracción suave. Añade identidad mecánica a ciertos sectores y exige enseñar la influencia con partículas/señalización.

Se adopta A en esta versión. B y C quedan como alternativas futuras y no introducen fuerzas en el juego actual.

Para todas las opciones: cable con holgura visual y tensión progresiva al acercarse al límite, amortiguación de tirones y límite final de seguridad. Mantener longitud máxima legible y recogerlo al abordar. No incluir enredos en esta iteración.

## 4. Asteroides peligrosos

Distinguir tres comportamientos:

- Rocas ambientales: profundidad y movimiento aparente; no interfieren con las acciones.
- Objetivos de disparo: desplazamiento lento y legible; vínculo con la progresión de misión.
- Peligros: atraviesan zonas concretas con trayectorias independientes del jugador, visibles con anticipación.

Los peligros actuales apenas oscilan 0,3 m. Proponer recorridos suaves de varios metros, velocidades iniciales de 1–3 m/s, giro sobre su eje y formas angulares/vetas cálidas. Sin persecución ni generación encima del jugador. Validar toda la trayectoria contra zonas protegidas de salida, baliza, gema, retorno y corredor; una posición inicial segura no basta.

Calcular riesgo con movimiento relativo: advertencia direccional cuando habrá un cruce cercano, impacto coherente con velocidad/tamaño y un intervalo de protección. Usar colisión barrida para impedir que una roca rápida atraviese al jugador entre frames. La nave requiere varios volúmenes ligados a sus módulos, evitando una esfera gigante que dañe espacios vacíos.

El ajuste de movimiento reducido afecta temblores, destellos y partículas; no debe congelar los peligros ni cambiar las reglas.

## 5. Planetas y sensación de viaje

El planeta actual está muy cerca del volumen jugable, lo que produce demasiado paralaje y permite aproximarse de forma poco creíble.

Separar una capa celeste lejana de la geometría cercana. El planeta conserva una escala aparente grande, como en el póster, con rotación lenta y nubes algo independientes. Las estrellas se desplazan muy poco. Rocas cercanas y puntos de referencia proporcionan el movimiento aparente que comunica velocidad.

El tránsito entre sectores presenta otra composición celeste con continuidad de iluminación. El planeta no atraviesa el mapa como si fuera un asteroide. Esta solución visual no representa por sí sola una simulación de órbita.

## 6. Biomas con identidad

| Sector | Composición visual | Comportamiento del recorrido |
|---|---|---|
| Nereida | Océano azul enorme, contraluz ámbar, islas de roca y balizas cian; escena más próxima al póster | Espacio amplio, peligros lentos y previsibles; aprender vuelo y frenado |
| Vesper | Luna fracturada, cinturones diagonales, roca oscura, cian y violeta | Cruces transversales y más cambios de altura; leer ventanas para pasar |
| Umbra | Planeta oscuro con borde cálido, siluetas más angulares, cobre y magenta; mayor contraste de vacío/roca | Coordinar el movimiento de una nave completa y tres núcleos; mayor exigencia de anticipación |

Conservar el número y orden de acciones ya acordados. La diferencia de dificultad proviene del espacio y del movimiento, no solamente del color.

## 7. Acercamiento al póster

- Siluetas y proporciones primero: nave longitudinal habitable, conexiones mecánicas claras, astronauta pequeño frente al casco, companion ligero.
- Marfil, grafito, teal y cobre como familias de materiales. Paneles y sellos legibles, ventanas hundidas, visor oscuro reflectante, detalles concentrados cerca del jugador.
- Sol lateral cálido, relleno planetario frío y sombras que mantengan detalle. Emisión controlada de motores, balizas y gema.
- Islas rocosas de varias escalas y distribución compuesta de primer plano, plano medio y fondo. Mantener zonas despejadas para leer objetivos.
- Cabina con elementos 3D próximos (marco, tablero y referencias del cañón) y HUD más despejado durante primera persona.
- Materiales y luces adaptados al presupuesto de móvil; efectos adicionales en computadora sin cambiar mecánicas.

El póster es una referencia de dirección visual: no corresponde prometer una equivalencia de render o rendimiento sin medirla en el juego.

## 8. Orden de implementación y aceptación

1. Especificación compartida de escala y puntos físicos; comparar astronauta al lado de cabina y nave completa.
2. Vuelo con inercia, giro, frenado, guía y cable; probar primera/tercera persona con las mismas reglas.
3. Peligros en movimiento, colisiones y avisos; garantizar trayectorias seguras y recorridos posibles con diferentes semillas.
4. Capas celestes, composición de biomas, rocas, materiales e iluminación del póster.
5. Integración del recorrido completo, inspección, acople y HUD; revisión en computadora y móvil emulado, luego teléfono real.

Criterios: ningún astronauta mayor que el habitáculo, ninguna rotación de 180° al retroceder, deriva perceptible al soltar y parada controlada al frenar, cable y esclusa unidos al casco aunque gire, peligros esquivables/consistentes a distintas tasas de cuadro, planeta que no cambia drásticamente de tamaño al recorrer un sector, tres biomas reconocibles por forma y comportamiento, recorrido completo sin bloqueos.
