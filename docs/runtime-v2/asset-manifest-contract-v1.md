# Gravedad Zero — Asset Manifest Contract V1

## Goals

- Runtime code never depends on fragile relative asset paths.
- Source assets and shipping artifacts are separate.
- One semantic asset key can resolve HERO/GAMEPLAY/FAR/collider/thumbnail/material variants.
- Asset lifecycle is measurable and disposable.

## Source/runtime split

### Source storage
May contain:

- Blender files.
- Meshy originals.
- High-poly GLBs.
- High-resolution source textures.
- Authoring renders/reference images.

Source files are **not** part of the production web deployment.

### Runtime artifacts
May contain:

- Optimized GLB/glTF.
- LOD variants.
- Collision proxies.
- KTX2/Basis/other approved runtime texture variants.
- Thumbnails.
- Metadata/socket descriptions.

Removing source files from the web repo improves repository/build/deploy hygiene and reduces accidental IP exposure. It does **not** itself increase FPS if those files were never loaded. Any asset delivered to the browser can be extracted by a determined user; source separation protects authoring materials, not client-delivered runtime bytes.

## Semantic-key rule

Gameplay code uses keys such as:

- `character.player`
- `companion.noma`
- `character.ally`
- `vehicle.bike`
- `ship.front`
- `ship.middle`
- `ship.propulsion`
- `weapon.turret`
- `deployable.beacon`
- `resource.energyCell`
- `artifact.gem`
- `portal.ring`
- `boss.mothership`

Never hardcode `../../assets/...glb` inside gameplay logic.

## Proposed manifest shape

```json
{
  "weapon.turret": {
    "kind": "equipment",
    "lod": {
      "hero": "cdn://weapon/turret.hero.<hash>.glb",
      "gameplay": "cdn://weapon/turret.gameplay.<hash>.glb",
      "far": "cdn://weapon/turret.far.<hash>.glb"
    },
    "collision": "cdn://weapon/turret.collider.<hash>.glb",
    "thumbnail": "cdn://weapon/turret.thumb.<hash>.webp",
    "sockets": ["muzzle"],
    "textureSet": "weapon.turret.runtime"
  }
}
```

Exact serialization is implementation detail; semantic fields are contract.

## Runtime asset states

- COLD — known by manifest, not resident.
- WARM — fetched/decoded or ready for fast instantiation.
- ACTIVE — instantiated/used by current representation.
- RELEASED — ref count zero and disposable resources released according to cache policy.

## LOD contract

Each relevant source may produce:

- HERO — close inspection/cinematic.
- GAMEPLAY — normal nearby gameplay.
- FAR — distant representation.

LOD must not alter logical damage, objective state, item identity or collision semantics. Collision proxy is separate from visual LOD.

## Texture contract

- Never upscale solely to match a tier.
- 2K only when close-up QA proves value.
- 1K common gameplay target.
- 512 allowed for FAR/secondary.
- Compression is evaluated per asset; it is not mandatory if quality/decode/compatibility regresses.

## Thumbnail contract

Inventory/map thumbnails are pre-rendered from the canonical asset at 256–512px. Menu grids must not require one live 3D renderer per card.

## Ship module metadata

Every modular ship unit must expose/resolve metadata for:

- module type,
- connection anchors,
- exposed/internal thruster behavior,
- compatible turret surface/mounting rules,
- `turretCapacity`,
- collision proxy,
- camera/inspection bounds.

Exact per-module `turretCapacity` is authored during production audit.

## Mothership metadata

Required:

- `BossCore`
- `GemSocket_*`
- `AsteroidLauncher_*`
- engine/thruster anchors
- collision proxy
- LOD set

## Validation

Asset CI/ingest must fail when:

- semantic key missing,
- referenced artifact missing,
- duplicate semantic key,
- invalid bounds/scale,
- required socket absent,
- collision proxy required but absent,
- unsupported texture reference,
- invalid LOD hierarchy.
