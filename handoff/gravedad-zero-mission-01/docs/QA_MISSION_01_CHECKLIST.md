# QA Mission 01 Checklist

## Loop

- [ ] Se inicia en Stage 1.
- [ ] Se ve `GRAVEDAD ZERO`.
- [ ] Se muestra `MISSION START`.
- [ ] Astronauta puede entrar a fase activa.
- [ ] Aparecen 3 asteroides chicos.
- [ ] Astronauta puede romper los 3 asteroides chicos.
- [ ] HUD cuenta 0/3, 1/3, 2/3, 3/3.
- [ ] Al completar 3/3 aparece `NÚCLEO INESTABLE`.
- [ ] Aparece 1 obstáculo grande.
- [ ] La nave rompe el obstáculo grande.
- [ ] Aparece reliquia/holograma.
- [ ] Reliquia hace wow expansion y queda al 150% del astronauta.
- [ ] Astronauta toca reliquia.
- [ ] Energía viaja hacia la nave.
- [ ] Aparece `STAGE UNLOCKED`.
- [ ] La nave cambia a Stage 2 usando el mapping existente.

## Astronauta

- [ ] Las 9 direcciones se leen bien.
- [ ] `front/rear` no están invertidas.
- [ ] `side_left/side_right` son consistentes.
- [ ] El tool pulse sale visualmente cerca de la mano/herramienta o centro del astronauta.
- [ ] `wave` como placeholder no rompe la lectura.
- [ ] `thumbs_up` como placeholder de touch relic no se ve absurdo.

## FX

- [ ] Tool pulse parece herramienta, no arma militar.
- [ ] Heavy shot de nave tiene más jerarquía que tool pulse.
- [ ] Impactos chicos no saturan.
- [ ] Ruptura grande justifica reveal de reliquia.
- [ ] Holograma no parece imagen plana.
- [ ] El wow moment de reliquia es el punto visual más importante.

## Audio

- [ ] No hay white-noise/hiss molesto.
- [ ] Impactos chicos son discretos.
- [ ] Ruptura grande tiene más peso.
- [ ] Reveal de reliquia tiene jerarquía.
- [ ] Loop de reliquia no molesta.
- [ ] `STAGE UNLOCKED` se siente recompensa.

## Performance

- [ ] No cae FPS al spawnear partículas.
- [ ] Los sprite atlases no quedan gigantes en pantalla.
- [ ] Additive blending no quema todo el frame.
- [ ] Mobile/desktop mantienen proporción legible.
