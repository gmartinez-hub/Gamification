# 01 — CODEX PROMPT / Next Release

## Contexto

El último deploy mejoró algunas cosas, pero no está aprobado.

Problemas actuales:

```txt
- Companion se está deformando y se aleja de la referencia aprobada.
- Autoaim tiene un spray raro y la rotación del modelo todavía no se percibe suficientemente.
- Aparecen líneas extrañas/wireframe en el espacio que no gustan.
- El mapa sigue sintiéndose chico.
- Lo procedural existe parcialmente, pero no se siente como navegación libre real.
- No aparecen suficientes nuevos planetas/cuerpos.
- No se están usando con fuerza los assets especiales Three ya preparados.
- Falta sensación de velocidad y progresión por stage.
- El companion no explica suficientemente qué hacer ni funciona como tutorial.
```

## Source of truth visual

Usar:

```txt
visual-references/01_companion_reference_correct.png
```

para el companion final.

Usar:

```txt
visual-references/02_autoaim_concept_clean.png
```

para dirección de autoaim.

Usar:

```txt
visual-references/03_world_scale_more_planets_concept.png
```

para dirección de mundo grande/vivo.

Usar:

```txt
visual-references/04_current_bad_line_artifacts.png
```

como referencia negativa: no debe aparecer nada parecido.

---

# Objetivo del release

Implementar un release completo con:

```txt
1. Companion visual lock
2. Companion tutorial/objetivos al click
3. Autoaim zero-g con rotación real
4. Eliminación de spray raro/líneas extrañas
5. Mundo procedural más grande
6. Más planetas/cuerpos usando assets existentes
7. Velocidad por stage
8. Botón de subir velocidad
9. Música/audio más intensa según velocidad
10. QA con evidencia
```

---

# Reglas de no regresión

No aprobar si:

```txt
- el companion no se parece a la referencia 01;
- el companion tiene sombra/piso/base;
- el autoaim no rota el modelo;
- el spray raro sigue apareciendo;
- aparecen líneas finas azules/wireframes no intencionales;
- el mapa no dura varios minutos por dirección;
- no aparecen planetas/cuerpos nuevos;
- no hay control de velocidad;
- la velocidad no progresa por stage;
- el companion no explica objetivo/tutorial al clickearlo;
- hay errores de consola.
```

## Commit sugerido

```txt
Implement Gravedad Zero next release polish, speed, tutorial and procedural scale
```
