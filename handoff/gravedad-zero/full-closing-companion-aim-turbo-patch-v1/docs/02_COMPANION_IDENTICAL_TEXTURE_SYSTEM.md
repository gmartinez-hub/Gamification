# 02 — Companion Identical Texture System

## Objetivo

El companion debe ser idéntico al original.

## Assets de referencia

```txt
assets/companion/reference/companion_original_reference.png
assets/companion/reference/companion_front_reference_crop.png
assets/companion/reference/companion_side_reference_crop.png
assets/companion/reference/companion_face_closeup_reference_crop.png
```

## Assets de implementación

```txt
assets/companion/textures/companion_front_albedo_2048.png
assets/companion/textures/companion_front_emissive_2048.png
assets/companion/textures/companion_face_idle_2048.png
assets/companion/textures/companion_face_talk_2048.png
assets/companion/textures/companion_face_alert_2048.png
assets/companion/textures/companion_face_success_2048.png
assets/companion/textures/companion_face_blink_2048.png
assets/companion/textures/companion_face_atlas_5x1_1024.png
assets/companion/textures/companion_side_panel_albedo_1024.png
assets/companion/textures/companion_side_panel_emissive_1024.png
assets/companion/textures/companion_top_albedo_1024.png
assets/companion/textures/companion_gem_badges_4x1_512.png
```

## Implementación recomendada

Reemplazar la cara procedural de tubos/torus por:

```txt
robotHudModel
  bodyShell: SphereGeometry / ellipsoid, material blanco perlado
  faceDecalPlane: PlaneGeometry o Sprite con companion_face_*_2048
  faceEmissive: mismo plano con emissive map, additive bajo o MeshBasicMaterial bajo
  sidePanels: dos planos o decals laterales
  antennae: geometría 3D simple
```

## Material

```js
const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4f6ff,
  roughness: 0.46,
  metalness: 0.04,
  emissive: 0x111629,
  emissiveIntensity: 0.035
});
```

## Estados

```txt
idle: default
talk: panel abierto / tutorial
alert: target fuera de rango / peligro
success: gema / stage clear
blink: micro idle cada 4–7s
```

## Aceptación

```txt
[ ] De frente se reconoce como el original.
[ ] No parece otro bot.
[ ] Lentes, ojos, boca y antenas tienen proporción de referencia.
[ ] No hay glow cyan dominante.
[ ] Sin sombra/base extraña.
```
