# Codex Brief — Astronaut + Projectile FX

## Objetivo

Agregar una capa de disparos/herramientas sin convertir el juego en shooter genérico.

## Tipos de disparo

### 1. Astronauta: Tool Pulse

Uso:
- romper asteroides chicos.

Tono:
- herramienta / pulso de extracción.
- rayo corto, elegante, cyan/violeta.
- no bala agresiva.

Implementación:
- muzzle flash en mano/herramienta.
- beam corto entre astronauta y asteroide.
- hit atlas en asteroide.
- particles atlas al romper.

### 2. Nave: Heavy Shot

Uso:
- romper obstáculo grande.

Tono:
- disparo pesado / carga de energía.
- breve carga, proyectil o haz grueso, impacto fuerte.

Implementación:
- charge atlas cerca de nave.
- projectile core + trail.
- impact atlas sobre obstáculo grande.
- llamar al reveal de reliquia cuando el objetivo grande muere.

## Módulos sugeridos

```txt
src/fx/ProjectileSystem.js
src/astronaut/AstronautActionMap.js
```

## Importante

- No modificar el mapping de stages/vistas de la nave.
- No bloquear Mission 01 esperando animaciones nuevas del astronauta.
- Usar placeholders existentes: `wave` para tool pulse y `thumbs_up` para touch relic.
