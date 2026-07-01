# Qué necesitamos para cerrar

## 1. No seguir agregando features grandes

La demo ya tiene suficientes ideas. Ahora necesita cierre visual y de interacción.

Prioridad:

```txt
1. Companion 3D sin sombra.
2. Autoaim con orientación física del modelo.
3. Limpieza de ruido visual.
4. HUD legible.
5. Asset usage real y ordenado.
6. QA con evidencia.
```

---

# 2. Companion

Necesitamos eliminar la lectura de sprite plano.

No alcanza con quitar el halo/anillo. El companion actual todavía tiene sombra y parece apoyado.

Requerimiento:

```txt
Reemplazar el sprite principal por un robot armado con primitivas Three.
```

Usar:

```txt
SphereGeometry body/head
TorusGeometry anteojos/lentes
LineSegments/Curve para ojos y boca
CylinderGeometry antenas
SphereGeometry puntas de antena
PointLight o glow interno sutil
```

No usar:

```txt
robot_shadow.png
shadow mesh
floor/base oval
orbit ring
halo
partículas permanentes
```

---

# 3. Autoaim

Necesitamos que el modelo rote físicamente hacia donde apunta el aim.

No sirve:

```txt
click → reticle → línea → disparo
```

Debe ser:

```txt
click → target seleccionado → cuerpo rota en baja gravedad → spray/thruster → fire → recoil → hit stop
```

Usar las direcciones existentes como frame base, pero rotar el group hacia el ángulo exacto.

---

# 4. Mundo

Necesitamos menos objetos sueltos y más landmarks.

La captura muestra muchas piezas chicas sin jerarquía. Reducir ruido y hacer que los cuerpos sintéticos parezcan objetos diseñados.

Regla:

```txt
menos debris random
más cuerpos claros
más planetas/lunas grandes
más synthetic landmarks
menos triangulitos/sprays sueltos
```

---

# 5. HUD

Necesitamos eliminar truncado.

No usar objetivo largo en una línea.

Usar counters stackeados:

```txt
MISSION 01
CAMPO INESTABLE

FRAGMENTOS 0/3
NÚCLEOS 0/1
GEMAS 0/3
```

---

# 6. Assets

Necesitamos que Codex revise y use assets Three existentes.

No generar nuevos assets.

Usar:

```txt
three_space_assets_bundle_v2.zip
three_space_assets_v1.zip
gravedad_zero_unlock_asset_pack_v1.zip
gravedad_zero_mission_01_completion_pack_v1.zip
gravedad_zero_astronaut_projectiles_pack_v1.zip
gravedad_zero_aim_assist_fx_contracts_pack_v1.zip
gravedad_zero_robot_companion_hud_pack_v1.zip
nave_three_audio_pack_v2_refined.zip
```

También considerar PNG sueltos de planetas, asteroides, módulos, propulsores y energía si están disponibles en el workspace.

---

# 7. QA

Necesitamos evidencia al finalizar:

```txt
URL deploy
commit SHA
archivos modificados
captura companion 3D sin sombra
captura HUD legible
captura mundo con menos ruido
captura/video aim rotando hacia target
captura/video final o stage clear
bugs conocidos
```
