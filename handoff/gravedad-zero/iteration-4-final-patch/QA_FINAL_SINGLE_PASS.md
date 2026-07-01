# QA FINAL SINGLE PASS — Iteration 4 v2

## Veredicto

```txt
[ ] APROBADO
[ ] HOTFIX NECESARIO
[ ] RECHAZADO
```

---

# 1. Asset usage

- [ ] Codex auditó assets existentes.
- [ ] Hay planetas/lunas adicionales.
- [ ] Hay cuerpos sintéticos.
- [ ] Se usan texturas existentes poco aprovechadas.
- [ ] Los assets no se usan como nebulosas nuevas.
- [ ] Los cuerpos son objetos navegables.
- [ ] Tienen rotación y translación.
- [ ] Tienen depth/parallax/wrap.
- [ ] No parecen stickers planos.

Falla si:
- [ ] El mundo sólo tiene los mismos planetas actuales.
- [ ] No aparecen cuerpos sintéticos.
- [ ] Las texturas siguen sin usarse.

---

# 2. Wording premium

- [ ] No aparece “3 SEÑALES MENORES”.
- [ ] No aparece “OBSTÁCULO MAYOR”.
- [ ] Usa FRAGMENTOS.
- [ ] Usa NÚCLEOS.
- [ ] Usa GEMAS.
- [ ] Usa RUMBO/SECTOR.

---

# 3. Navegación libre procedural

Validar:

```txt
3 minutos norte
3 minutos sur
3 minutos este
3 minutos oeste
diagonales
```

- [ ] Mundo no se corta.
- [ ] No se nota repetición obvia.
- [ ] No se siente escena chica.
- [ ] Chunks se reciclan sin pops graves.
- [ ] No queda vacío.

---

# 4. Mission zones / stages

- [ ] Stage 1 Zone funciona.
- [ ] Stage 2 Zone se revela después de gema 1.
- [ ] Stage 3 Zone se revela después de gema 2.
- [ ] Final Zone se activa después de gema 3.
- [ ] No vuelve a Stage 1 después del final.

---

# 5. HUD gemas

- [ ] GEMAS 0/3.
- [ ] GEMAS 1/3.
- [ ] GEMAS 2/3.
- [ ] GEMAS 3/3.
- [ ] SEÑAL FINAL ADQUIRIDA.

---

# 6. Companion limpio

- [ ] Sin halo circular.
- [ ] Sin anillo orbital.
- [ ] Sin partículas permanentes.
- [ ] Sin sombra/piso.
- [ ] Bob/micro tilt.
- [ ] Panel/counters funcionan.

---

# 7. Autoaim zero gravity

- [ ] Cámara lenta clara.
- [ ] Actor rota hacia target.
- [ ] Spray/jet lateral.
- [ ] Recoil.
- [ ] Hit stop.
- [ ] Impacto claro.
- [ ] No es sólo reticle/línea.

---

# 8. Audio

- [ ] Nave idle/move/boost.
- [ ] Rumbo detectado tiene ping.
- [ ] Mission zone enter suena.
- [ ] Gem acquired suena.
- [ ] Autoaim tiene spray/thruster.
- [ ] Final tiene sonido propio.
- [ ] No se duplican loops.

---

# 9. Final

- [ ] Slow motion.
- [ ] Core collapse.
- [ ] Flash cyan/blanco.
- [ ] Shockwave limpia.
- [ ] Partículas en espiral.
- [ ] Beams hacia nave.
- [ ] Nave glow.
- [ ] MISSION COMPLETE.

---

# 10. Performance

- [ ] FPS estable.
- [ ] No errores consola.
- [ ] No chunks duplicados.
- [ ] No targets invisibles acumulados.
- [ ] Vercel deploy OK.
