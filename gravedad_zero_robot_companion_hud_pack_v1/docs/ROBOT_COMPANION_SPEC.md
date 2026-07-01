# Robot Companion Spec — Gravedad Zero

## Rol

El robot es companion del HUD y menú. Funciona como:
- indicador de estado;
- guía contextual;
- acceso rápido a objetivos;
- feedback emocional de la misión.

## Posición recomendada

En gameplay:
```txt
HUD top-right
```

En menú:
```txt
lado derecho, tamaño grande
```

## Comportamiento

Cuando el jugador lo clickea:
```txt
abre/cierra cuadro de texto
muestra qué falta para completar la misión
reproduce un sfx suave
hace pulse/bob
```

## Estados

```txt
idle
ready
alert
hint
stage_clear
```

## Mensajes

```txt
FALTAN 3 ASTEROIDES
OBSTÁCULO MAYOR DETECTADO
SEÑAL LIBERADA
TOCÁ LA RELIQUIA
STAGE UNLOCKED
```

## Implementación recomendada

- Robot en Three como sprite/billboard o PlaneGeometry con alpha.
- Texto y panel en HTML/CSS para legibilidad.
- Glows/sparkles en Three.
- Click detection puede ser raycaster en Three o botón HTML overlay.
