# 09 — Implementation Order

## No hacer todo desordenado

Implementar en este orden:

## 1. Visual lock companion

- Rehacer companion para parecerse a referencia 01.
- Eliminar líneas raras.
- Eliminar sombra/base/halo.
- Agregar panel tutorial.

QA parcial:
```txt
captura companion
click companion
panel tutorial
```

## 2. Autoaim cleanup

- Sacar spray raro.
- Eliminar líneas artefacto.
- Reforzar rotación real.
- Ajustar timing para que se vea la orientación.
- Mantener disparo prolijo.

QA parcial:
```txt
video/captura autoaim astronauta
video/captura autoaim nave
```

## 3. Speed system

- Agregar botón velocidad.
- Agregar SPEED_MODES.
- Agregar STAGE_TUNING.
- Aplicar a world speed/parallax/audio.
- No romper control.

QA parcial:
```txt
x1/x2/x3 visible y diferente
Stage 1/2/3 diferente
```

## 4. Procedural world scale

- Recalibrar chunks/regions.
- Más planetas/lunas/cuerpos.
- Usar assets existentes.
- Validar 3 minutos por dirección.
- Reducir debris random.

QA parcial:
```txt
norte/sur/este/oeste con cronómetro
capturas cada minuto
```

## 5. Integración final

- Revisar HUD.
- Revisar companion tutorial según estado.
- Revisar audio.
- Revisar performance.
- Deploy.

## Entregable final de Codex

```txt
URL deploy
commit SHA
archivos modificados
capturas:
  companion
  autoaim
  mundo grande
  velocidad x1/x2/x3
QA completado
bugs conocidos
```
