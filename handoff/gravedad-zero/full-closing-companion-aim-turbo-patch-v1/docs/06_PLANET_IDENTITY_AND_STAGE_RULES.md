# 06 — Planet Identity and Stage Rules

## Problema

Los planetas parecen cambiar de color al cambiar stage.

## Regla

```txt
Un planeta/cuerpo descubierto conserva identidad.
```

## Implementación

Al crear:

```js
object.userData.spawnStage = state.stageIndex;
object.userData.materialLocked = true;
object.userData.textureProfile = selectedProfileName;
```

Durante update:

```txt
No recalcular material por currentWorldProfile.
No ocultar/recolorear cuerpos ya descubiertos.
```

El stage sólo habilita:
- nuevos pools de cuerpos;
- landmarks nuevos;
- más densidad;
- nuevos targets.

## Aceptación

```txt
[ ] El planeta celeste no se vuelve mecánico/magenta.
[ ] Los nuevos planetas aparecen al viajar.
[ ] Universo se expande, no muta.
```
