# Stage 1 Asset/View Map

Este mapa define como usar el atlas antes de tocar de nuevo el runtime.

## Vistas runtime disponibles

| Vista | Archivo | Lectura visual | Uso recomendado |
| --- | --- | --- | --- |
| `front_left_iso` | `assets/runtime/stage1/front_left_iso.png` | frente/cabina, diagonal hacia izquierda | diagonal abajo-izquierda |
| `front_right_iso` | `assets/runtime/stage1/front_right_iso.png` | frente/cabina, diagonal hacia derecha | diagonal abajo-derecha |
| `rear_left_iso` | `assets/runtime/stage1/rear_left_iso.png` | parte trasera, diagonal hacia izquierda | diagonal arriba-izquierda |
| `rear_right_iso` | `assets/runtime/stage1/rear_right_iso.png` | parte trasera, diagonal hacia derecha | diagonal arriba-derecha |
| `side` | `assets/runtime/stage1/side.png` | perfil lateral, nariz hacia izquierda | izquierda directa; derecha espejada |
| `top` | `assets/runtime/stage1/top.png` | vista superior, nariz hacia izquierda | estado tecnico/QA; no usar para movimiento principal salvo modo top-down |

## Mapeo de input

| Input | Vista base | Espejo X | Motivo |
| --- | --- | --- | --- |
| `ArrowUp` / `W` | `rear_right_iso` | no | ascenso / se aleja del usuario |
| `ArrowUp + ArrowLeft` | `rear_left_iso` | no | ascenso hacia izquierda |
| `ArrowUp + ArrowRight` | `rear_right_iso` | no | ascenso hacia derecha |
| `ArrowDown` / `S` | `front_right_iso` | no | descenso / vuelve hacia el usuario |
| `ArrowDown + ArrowLeft` | `front_left_iso` | no | descenso hacia izquierda |
| `ArrowDown + ArrowRight` | `front_right_iso` | no | descenso hacia derecha |
| `ArrowLeft` / `A` | `side` | no | desplazamiento lateral izquierda |
| `ArrowRight` / `D` | `side` | si | desplazamiento lateral derecha sin asset extra |

## Regla reusable para todos los stages

Para cada modelo/stage se necesita, como maximo:

| Familia | Asset minimo | Puede espejar |
| --- | --- | --- |
| Frente diagonal | `front_left_iso` o `front_right_iso` | si |
| Trasera diagonal | `rear_left_iso` o `rear_right_iso` | si |
| Lateral puro | `side` | si |
| Superior | `top` | opcional, no obligatorio para movimiento 2.5D |

Si existe la pareja izquierda/derecha generada, se usa la pareja real. Si falta una mitad, se usa espejo horizontal.

## Estado actual del atlas

| Componente | Vistas detectadas en atlas |
| --- | --- |
| `stage_1_cockpit` | `front_left_iso`, `front_right_iso`, `rear_left_iso`, `rear_right_iso`, `side`, `top` |
| `stage_2_pod_body` | `front_left_iso`, `front_right_iso`, `rear_left_iso`, `rear_right_iso`, `side`, `top` |
| `stage_3_full` | `front_left_iso`, `front_right_iso`, `rear_left_iso`, `rear_right_iso`, `front_iso`, `rear_iso`, `side`, `top` |
| `module_body` | `front_left_iso`, `front_right_iso`, `rear_left_iso`, `rear_right_iso`, `side`, `top` |
| `module_wings` | `front_left_iso`, `front_right_iso`, `rear_left_iso`, `rear_right_iso`, `side`, `top` |

## Decision para runtime

El runtime no debe hardcodear comandos contra archivos. Debe usar:

`input -> directionResolver -> viewKey -> stageViewMap -> texture + flipX`

Asi el mismo sistema sirve para stage 1, stage 2, stage 3 y modulos.
