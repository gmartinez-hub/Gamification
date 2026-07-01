# Prompt maestro para Codex

Integrar el handoff de Gravedad Zero en dos iteraciones.

## Iteración 1

Primero cerrar Mission 01 como vertical slice jugable:

```txt
Stage 1
→ astronauta rompe 3 asteroides chicos
→ nave rompe 1 obstáculo grande
→ aparece reliquia
→ astronauta toca reliquia
→ STAGE UNLOCKED
→ pasar a Stage 2 usando transición existente.
```

Integrar:
- Mission 01 pack
- Astronaut + Projectiles pack
- Unlock / Relic pack
- Aim Assist pack
- Audio refined pack

Reglas:
- No cambiar mapping existente de nave/stages.
- No generar todavía 9 animaciones de disparo.
- Usar sprites/vistas actuales + FX Three.
- Audio por eventos.
- HUD en HTML/CSS.

## Iteración 2

Después integrar Robot Companion HUD:

- robot arriba/derecha en gameplay;
- clickeable;
- panel HTML/CSS con objetivos pendientes;
- estados visuales según misión;
- menú negro simple con letras blancas.

Robot en Three como Sprite/billboard, no modelo 3D real todavía.
