# Menu + HUD Flow with Robot Companion

## Title Menu

```txt
GRAVEDAD ZERO
RUTA DESCONOCIDA
TOMA EL CONTROL

INICIAR MISIÓN
CONTROLES
```

Robot:
```txt
state: idle
```

## Mission Briefing

```txt
MISSION 01
CAMPO INESTABLE

3 ASTEROIDES CHICOS
1 OBSTÁCULO MAYOR
ACTIVA LA RELIQUIA
```

Robot:
```txt
state: ready
```

## Gameplay HUD

Robot top-right.

Collapsed:
```txt
robot icon + small status ring
```

Expanded:
```txt
FALTAN 2 ASTEROIDES
OBSTÁCULO: 0/1
RELIQUIA: 0/1
```

## Stage Clear

```txt
STAGE UNLOCKED
NUEVA RUTA ABIERTA
```

Robot:
```txt
state: stage_clear
```
