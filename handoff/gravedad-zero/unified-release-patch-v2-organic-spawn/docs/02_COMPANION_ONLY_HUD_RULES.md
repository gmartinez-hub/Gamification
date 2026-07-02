# 02 — Companion-only HUD Rules

## Decisión

La UI debe ser más diegética y menos “paneles encima del juego”.

## Sacar / ocultar durante gameplay

```txt
- mission-hud grande fijo.
- stageButton visible.
- speedButton visible como botón de UI.
- stageLabel si funciona como control.
- cualquier clickable para saltar stage.
```

Pueden existir internamente para debug, pero no visibles en producción.

## Comunicación principal

Todo se comunica vía companion al clickearlo:

```txt
- historia inicial;
- objetivo actual;
- progreso;
- gemas;
- turbo disponible;
- próxima zona;
- fuera de rango;
- % de éxito de disparo;
- desbloqueos.
```

## Insignia mínima

Arriba a la izquierda sólo mostrar insignia de progreso cuando corresponda.

Ejemplo:

```txt
◆◇◇
```

o:

```txt
GEMAS 1/3
```

Reglas:

```txt
- mínima;
- no clickeable;
- no panel grande;
- no tapa el juego;
- aparece desde Gema 1 o puede mostrar 0/3 muy sutil al iniciar misión;
- al conseguir gema hace micro animación/pulso.
```

## Turbo sin botón visible

El turbo se usa con:

```txt
F = mantener turbo
```

El estado se ve en companion:

```txt
TURBO BLOQUEADO
TURBO x2
TURBO x3
WARP PULSE
```

Opcional: indicador mínimo cerca de la insignia, pero no botón clickeable.

## Stage sin botón visible

El cambio de sector no se hace clickeando un botón.

Se hace por:

```txt
- obtener gema;
- desbloquear sector;
- navegar hacia zona;
- entrar en zona;
- activar misión.
```

## QA

```txt
[ ] No hay HUD grande fijo durante gameplay.
[ ] No hay stageButton visible.
[ ] No hay speedButton visible como botón.
[ ] No se puede saltar stage con click de UI.
[ ] Companion informa objetivo/progreso.
[ ] Insignia de gemas existe y no molesta.
```
