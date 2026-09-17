# Modelos Meshy · integración jugable

Alcance autorizado: entregar un enlace público con cápsula/hábitat/propulsión, astronauta riggeado y herramienta, cabina cerrada, baliza, companion y dos rocas. Conservar vuelo inercial, cable, tres biomas, escaneo, combate asistido, gemas, tránsito, audio y controles táctiles existentes.

## Contratos
- Los GLB de runtime son copias; las fuentes de Descargas no se modifican.
- Nave: eje longitudinal de origen +Y convertido a -Z. Escala visual 2,5; centros de módulos z=-3,5 / +0,575 / +4,75. Juntas calculadas con planos de contacto de la revisión anterior.
- Astronauta: ~1,899 m con traje. Rig 52 huesos; AimWeapon/RelaxWeapon conservan agarre. +Z original convertido a -Z del juego. Proyectil desde WeaponMuzzle real.
- Cabina: ojo original (0;0,10;1,30), FOV57. Vidrio por alfa; interior envolvente. Entorno visual, no modo de caminar.
- Escena: cada entidad conserva ID/posición/radio de la simulación. Los cambios de superficie no cambian reglas ni colocación procedural.
- Modelo de referencia visual prioritario; resolución interna limitada a 1280×720 manteniendo proporción de pantalla. No se promete 60FPS sin medir.

## Secuencia de entrega
1. Integrar modelos/anclas, juntas, primeras personas y propulsión.
2. Adaptar baliza, materiales por bioma, gema y rotura cerrada de rocas.
3. Pruebas Node, revisión visual real, recorrido completo de tres sectores con entradas normales, controles táctiles y persistencia.
4. Publicar repositorio/artefacto autorizado y verificar URL sin sesión.

El estudio visual y la galería no equivalen al juego. La aceptación se hace en src/lowpoly/main.js y su despliegue.
