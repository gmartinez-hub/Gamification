# GRAVEDAD ZERO — QA único Iteration 3

QA sobre un único deploy integrado.

## Resultado esperado

- Stage 1 se completa.
- Stage 2 arranca con objetivos nuevos sin demora.
- Autoaim se siente cinematográfico.
- Companion flota sin piso.
- Nave tiene sonido de motor.
- Mundo se siente más grande.
- No hay errores de consola.

---

## 0. Sanity

- [ ] Deploy carga.
- [ ] No hay pantalla negra.
- [ ] No hay errores rojos en consola.
- [ ] Menú aparece.
- [ ] Iniciar misión funciona.
- [ ] WASD/flechas funcionan.

---

## 1. Audio nave

- [ ] Primer click/keydown habilita audio.
- [ ] Nave tiene idle bajo.
- [ ] Al mover nave aparece move loop.
- [ ] El loop no se reinicia cada frame.
- [ ] Crossfade idle/move funciona.
- [ ] Boost/transición suma intensidad.
- [ ] Al dejar de mover vuelve a idle.
- [ ] No hay saturación.

Falla si:
- [ ] Nave sigue muda.
- [ ] Sólo suenan botones/misiones.
- [ ] Loop se corta/reinicia.

---

## 2. Companion

- [ ] Robot aparece arriba/derecha.
- [ ] No tiene sombra/piso.
- [ ] Flota con bob suave.
- [ ] Tiene glow/aura.
- [ ] Tiene partículas/anillo orbital.
- [ ] Reacciona al pointer/click.
- [ ] Panel abre/cierra.
- [ ] Sonido de click funciona.
- [ ] Counters correctos.
- [ ] No tapa gameplay.

Falla si:
- [ ] Parece apoyado.
- [ ] Parece sticker plano.
- [ ] Pierde panel de misiones.

---

## 3. Mundo

- [ ] Hay más planetas de fondo.
- [ ] Hay objetos medianos con parallax.
- [ ] Hay debris/asteroides decorativos.
- [ ] Hay foreground sutil.
- [ ] Objetos wrappean.
- [ ] No se nota borde del mundo.
- [ ] Cada stage varía.
- [ ] Targets siguen legibles.
- [ ] FPS estable.

Falla si:
- [ ] Mundo sigue vacío/chico.
- [ ] Decoración tapa objetivos.
- [ ] FPS cae fuerte.

---

## 4. Autoaim cinematográfico

Astronauta:
- [ ] Se entiende target candidato.
- [ ] Click no exige pixel-perfect.
- [ ] Reticle aparece en target correcto.
- [ ] Hay slow motion visual.
- [ ] Astronauta rota/flota hacia target.
- [ ] Streaks/line alineados.
- [ ] Fire cue coincide con disparo.
- [ ] Hay recoil/reacción.
- [ ] Hay impacto claro.
- [ ] Sale de slow motion.

Nave:
- [ ] Nave rota/tiltea hacia target.
- [ ] Disparo se siente pesado.
- [ ] Hay recoil.
- [ ] Impacto fuerte.
- [ ] No parece sólo línea estática.

Falla si:
- [ ] Sólo aparece reticle.
- [ ] Actor no rota/tiltea.
- [ ] Click es pixel-perfect.
- [ ] No se percibe slow motion.

---

## 5. Stage 1 completo

- [ ] Mission 01 inicia.
- [ ] Aparecen 3 asteroides chicos.
- [ ] Se rompe asteroide 1.
- [ ] Counter 1/3.
- [ ] Se rompe asteroide 2.
- [ ] Counter 2/3.
- [ ] Se rompe asteroide 3.
- [ ] Counter 3/3.
- [ ] Aparece obstáculo grande rápido.
- [ ] Cambia a modo nave.
- [ ] Nave destruye obstáculo.
- [ ] Aparece reliquia.
- [ ] Companion pide tocar reliquia.
- [ ] Astronauta toca reliquia.
- [ ] Hay energy transfer.
- [ ] Reliquia desaparece/colapsa.
- [ ] STAGE UNLOCKED.
- [ ] Transición a Stage 2.

Falla si:
- [ ] Reliquia queda fija para siempre.
- [ ] Stage cambia sin reliquia.
- [ ] Obstáculo tarda demasiado.

---

## 6. Stage 2 regeneration

- [ ] Stage 2 arranca.
- [ ] HUD cambia a Mission 02 / Stage 2.
- [ ] Aparecen 3 asteroides chicos nuevos.
- [ ] Hay 2 obstáculos grandes preparados/activos según fase.
- [ ] Counters reseteados.
- [ ] Companion actualiza.
- [ ] No quedan targets destruidos de Stage 1.
- [ ] No hay delay largo sin objetivos.

Falla si:
- [ ] Stage 2 queda vacío.
- [ ] Asteroides tardan mucho.
- [ ] Counter queda con valores de Stage 1.

---

## 7. Regresiones

- [ ] Stage button no rompe misión.
- [ ] Escape abre pausa.
- [ ] Menú oculto no bloquea clicks.
- [ ] Robot no roba clicks fuera de su zona.
- [ ] Astronauta puede volver a nave.
- [ ] Nave puede moverse.
- [ ] No hay loops de audio duplicados.
- [ ] No se duplican objetos al reiniciar.
- [ ] No hay leaks obvios al cambiar stage.

## Veredicto

Aprobar sólo si:

```txt
Stage 1 completo + Stage 2 regenerado + autoaim cinematográfico + companion flotante + audio nave + mundo expandido
```
