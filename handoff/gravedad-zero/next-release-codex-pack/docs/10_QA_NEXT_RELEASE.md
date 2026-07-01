# 10 — QA Next Release

## Veredicto

```txt
[ ] APROBADO
[ ] HOTFIX NECESARIO
[ ] RECHAZADO
```

---

# 1. Companion visual

- [ ] Se parece a `visual-references/01_companion_reference_correct.png`.
- [ ] No se deforma.
- [ ] No tiene sombra/base/piso.
- [ ] No tiene halo circular.
- [ ] No tiene líneas raras.
- [ ] Se ve 3D/volumétrico.
- [ ] Está arriba a la derecha.
- [ ] No parece sticker plano.

Falla automática si parece otra mascota distinta.

---

# 2. Companion tutorial

- [ ] Al clickear abre panel.
- [ ] Explica objetivo actual.
- [ ] Explica qué hacer.
- [ ] Cambia según fragmentos/núcleos/reliquia/rumbo/final.
- [ ] Explica control de velocidad.
- [ ] No tapa targets importantes.
- [ ] Tiene audio click/ping.

---

# 3. Autoaim

- [ ] Sin spray raro tipo pluma.
- [ ] Sin líneas/wireframes extraños.
- [ ] Reticle limpio.
- [ ] Slow motion corto.
- [ ] Astronauta rota hacia target.
- [ ] Nave rota hacia target.
- [ ] Rotación se nota antes del disparo.
- [ ] Recoil visible.
- [ ] Impacto claro.
- [ ] El disparo sigue prolijo.

Falla automática si el modelo no rota.

---

# 4. Mundo procedural grande

Validar con cronómetro:

```txt
[ ] 3 min norte
[ ] 3 min sur
[ ] 3 min este
[ ] 3 min oeste
```

Durante cada dirección:

- [ ] No se corta.
- [ ] No se repite obvio.
- [ ] No queda vacío.
- [ ] Aparecen planetas/cuerpos nuevos.
- [ ] Hay landmarks.
- [ ] Hay profundidad/parallax.
- [ ] Targets siguen legibles.
- [ ] No hay saturación de debris.

---

# 5. Planetas / assets

- [ ] Hay más planetas/lunas que antes.
- [ ] Hay cuerpos sintéticos.
- [ ] Hay mechanical moons / gravity nodes / broken gates o equivalentes.
- [ ] Se usan texturas existentes.
- [ ] No son stickers planos.
- [ ] Tienen rotación.
- [ ] Tienen translación/drift.
- [ ] No se agregaron nebulosas pesadas.

---

# 6. Velocidad

- [ ] Hay botón/control de velocidad.
- [ ] x1/x2/x3 o equivalente funciona.
- [ ] x2 se siente más rápido que x1.
- [ ] x3 se siente más rápido que x2.
- [ ] Stage 2 se siente más intenso que Stage 1.
- [ ] Stage 3 se siente más intenso que Stage 2.
- [ ] Final se siente cinematográfico.
- [ ] La nave sigue siendo controlable.
- [ ] Autoaim sigue siendo legible.
- [ ] No hay jank al cambiar velocidad.

---

# 7. Audio / música velocidad

- [ ] x1/x2/x3 cambia intensidad sonora.
- [ ] Engine loops no se duplican.
- [ ] Boost/whoosh acompaña velocidad.
- [ ] Stage 3 tiene más energía que Stage 1.
- [ ] Final tiene low rumble/resolve.
- [ ] Companion tutorial tiene audio.
- [ ] No satura.

---

# 8. Performance

- [ ] No errores de consola.
- [ ] FPS estable.
- [ ] No leaks de chunks.
- [ ] No objetos invisibles acumulados.
- [ ] No audio loops duplicados.
- [ ] Vercel deploy OK.

---

# Evidencia requerida

Codex debe entregar:

```txt
URL deploy:
commit SHA:
archivos modificados:
captura companion:
captura companion panel tutorial:
video/captura autoaim rotando:
captura mundo con más planetas:
captura velocidad x1:
captura velocidad x2/x3:
resultado 3 min por dirección:
bugs conocidos:
```
