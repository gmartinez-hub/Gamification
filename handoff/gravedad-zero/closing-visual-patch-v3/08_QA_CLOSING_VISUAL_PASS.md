# 08 — QA Closing Visual Pass

## Veredicto

```txt
[ ] APROBADO
[ ] HOTFIX NECESARIO
[ ] RECHAZADO
```

---

# 1. Companion 3D

- [ ] No tiene sombra.
- [ ] No tiene base/piso oval.
- [ ] No tiene halo.
- [ ] No tiene anillo orbital.
- [ ] No tiene partículas permanentes.
- [ ] Está armado con primitivas Three o equivalente 3D.
- [ ] Se ve 3D, no sticker plano.
- [ ] Está camera-anchored top-right.
- [ ] Click/panel funcionan.
- [ ] Audio companion funciona.

Falla automática si aparece `robot_shadow.png` visible o cualquier sombra/base bajo el robot.

---

# 2. HUD

- [ ] No hay texto truncado.
- [ ] No aparece “3 SEÑALES MENORES”.
- [ ] No aparece “OBSTÁCULO MAYOR”.
- [ ] Se ven FRAGMENTOS.
- [ ] Se ven NÚCLEOS.
- [ ] Se ve GEMAS 0/3, 1/3, 2/3 o 3/3.
- [ ] Layout legible en viewport normal.

---

# 3. Autoaim Zero-G Orientation

- [ ] Al seleccionar target, el actor rota hacia el target.
- [ ] Usa direcciones/sprites como base, pero rota group al ángulo exacto.
- [ ] Rotación tiene inercia.
- [ ] Hay overshoot/corrección leve.
- [ ] Hay slow motion.
- [ ] Hay spray/thruster durante rotación.
- [ ] Dispara después de que la orientación sea legible.
- [ ] Hay recoil opuesto al disparo.
- [ ] Hay hit stop en impacto.

Falla automática si sólo aparece reticle/línea/proyectil sin rotación física del actor.

---

# 4. Mundo / visual hierarchy

- [ ] Menos debris chico que en captura anterior.
- [ ] Menos triangulitos random.
- [ ] Los cuerpos sintéticos parecen objetos, no decals.
- [ ] Hay 3–5 landmarks claros por zona.
- [ ] Los planetas/lunas grandes funcionan.
- [ ] Nave/astronauta/targets siguen siendo protagonistas.
- [ ] No se agregaron nebulosas pesadas.
- [ ] No se ve vacío.
- [ ] No se ve saturado.

---

# 5. Asset usage

- [ ] Revisó three_space_assets_bundle_v2.
- [ ] Revisó three_space_assets_v1.
- [ ] Revisó unlock/mission/projectile/aim packs.
- [ ] Usó materiales de planeta con normal/emissive.
- [ ] Usó aim assets para orientación zero-g.
- [ ] Usó projectile assets para disparo/impacto.
- [ ] Usó robot pack sólo para panel/audio/referencia, no sombra.
- [ ] No generó assets nuevos innecesarios.

---

# 6. Audio

- [ ] Aim click.
- [ ] Aim lock.
- [ ] Slow motion enter.
- [ ] Zero-g rotate whoosh.
- [ ] Fire cue.
- [ ] Recoil/impact.
- [ ] Slow motion exit.
- [ ] Robot click.
- [ ] Nave idle/move/boost sin duplicar loops.

---

# 7. QA evidence required

Entregar:

```txt
URL deploy:
commit SHA:
archivos modificados:
captura companion 3D sin sombra:
captura HUD legible:
captura mundo con menos ruido:
video/captura aim rotando hacia target:
bugs conocidos:
```

No marcar aprobado sin evidencia visual.
