# Gravedad Zero V2 + Visual Pack 3.0 baseline

- Base branch: `feat/v2-procedural-universe`
- Base commit: `17caec847e6fa15c8866bbab840dc8d133f38463`
- Production baseline: `3ff3ec565f04456ee248f217591f0e26c84283b0`
- Visual QA target: remote Vercel preview

## What the recent patches achieved

- V2 owns world composition and enforces hero, medium, landmark and safe-zone budgets.
- Region progression follows physical world coordinates and unlocked gems.
- Target discovery gates autoaim targetability.
- Ambient meteors have pooled respawn, stage density, collision, shield damage and push.
- Aim has inertial alignment, travel-time projectiles and distinct hit/miss outcomes.
- The companion uses a single curved Three shell and the approved face textures.
- Vite builds an allowlisted runtime artifact without historical handoffs and QA captures.

## Visual Pack 3.0 gaps at baseline

- Turbo still instantiates the old flame strip, three 8-direction atlas layers, clean wake/core and motion particles.
- Ship sprites have no derived normal, roughness, emissive, cockpit or depth material rig.
- Astronaut movement uses directional sprites, but has no depth/visor/shield/scan rig.
- The relic is still a five-sprite stack instead of a faceted Three object.
- Projectiles include two beam planes in addition to the projectile core and trail.
- Shield state is visible in the HUD but has no player-bound impact ripple.
- Biome response changes the world but not the player material lighting response.

## Acceptance inherited from recent patches

- Preserve stage mapping, silhouettes, proportions and white/black/cyan/magenta identity.
- Do not restore parallel world systems or overlapping hero bodies.
- Keep the companion free of halo, ring, floor and shadow.
- Keep turbo subtle and socketed; no spray cloud or multiple trail stacks.
- Keep shot travel time and astronaut/ship aim rotation; no continuous beam as the primary shot.
- Keep relic available until touched, then transfer energy, unlock the stage and destroy it.
- Do not return to Stage 1 after final completion.

## Visual Pack 3.0 gate

- Derived maps must preserve source alpha silhouettes exactly.
- Runtime may have one directional propulsion stack only.
- Runtime may have one visible player albedo sprite per actor only.
- No material or geometry creation in per-frame update paths.
- Preview must pass remote fidelity, composition, interaction and smoke checks before merge.
