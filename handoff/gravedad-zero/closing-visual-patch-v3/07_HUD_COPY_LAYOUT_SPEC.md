# 07 — HUD Copy Layout Spec

## Problema

La captura muestra texto truncado:

```txt
RECUPERÁ 3 FRAGMENTOS DE SEÑAL / ROM...
```

Eso no puede quedar.

## Solución

Usar layout stackeado por counters.

### Stage 1

```txt
GRAVEDAD ZERO
RUMBO NORTE / CAMPO INESTABLE

SECTOR 01

FRAGMENTOS 0/3
NÚCLEOS 0/1
GEMAS 0/3
```

### Stage 2

```txt
GRAVEDAD ZERO
RUMBO ESTE / ÓRBITA FRACTURADA

SECTOR 02

FRAGMENTOS 0/3
NÚCLEOS 0/2
GEMAS 1/3
```

### Stage 3

```txt
GRAVEDAD ZERO
RUMBO OESTE / UMBRAL DESCONOCIDO

SECTOR 03

FRAGMENTOS 0/3
NÚCLEOS 0/3
GEMAS 2/3
```

### Final

```txt
GRAVEDAD ZERO
RUTA FINAL

SEÑAL FINAL ADQUIRIDA
RUTA ESTABILIZADA
MISSION COMPLETE
```

## Reglas

```txt
no truncar objetivos
no usar una línea larga con slash
no usar “OBSTÁCULO MAYOR”
no usar “SEÑALES MENORES”
usar FRAGMENTOS / NÚCLEOS / GEMAS
```

## Layout

```txt
max-width suficiente
line-height cómodo
font-size pequeño pero legible
badges para counters
```

## QA

Aprobar sólo si:

```txt
todo se lee en 1440x1024
todo se lee en laptop menor
no hay ellipsis en objetivos principales
```
