# Gravedad Zero V2 + Visual Pack 3.0 QA report

## Build under review

- Branch: `feat/v2-procedural-universe-visual-pack-3`
- V2 base: `17caec847e6fa15c8866bbab840dc8d133f38463`
- Production base: `3ff3ec565f04456ee248f217591f0e26c84283b0`
- Visual QA: remote Vercel preview only

## Effectiveness of recent patches before Visual Pack 3.0

| Area | Effective completion | Evidence |
| --- | ---: | --- |
| World authority and composition | 85% | Single V2 composition authority, safe zone, hero/medium/landmark budgets and overlap rejection. |
| Physical region and stage navigation | 80% | Coordinates and gems gate regions; stage applies on mission-zone entry. Full route still needs remote playtime validation. |
| Meteor population and gameplay | 82% | Stage profiles spawn 16/30/46/22 pooled ambient meteors with collision, damage, push and respawn. |
| Companion | 84% | Single curved shell and exact approved textures; no halo, floor, ring or shadow. Remote fidelity remains the gate. |
| Zero-g autoaim | 82% | Inertial alignment, shooter rotation, slow motion, travel time and hit/miss outcomes. |
| Projectiles | 68% | Real travel existed, but two beam planes made the shot read like a miniature rocket. |
| Turbo | 42% | Old flame, 8-dir atlas, clean wake/core and particles coexisted despite progressively lower opacity. |
| Premium materials and actor depth | 25% | World materials existed; ship and astronaut remained flat albedo sprites. |
| Release hygiene | 78% | Vite, tests, CI and allowlisted assets landed; runtime artifact is still large. |

Prior-patch weighted effectiveness: **approximately 72%**.

## Visual Pack 3.0 candidate

- 36 active ship/astronaut sprites processed into normal, roughness, emissive, cockpit and depth maps.
- Source alpha preserved exactly for 36/36 sprites.
- Ship and astronaut use physical material planes with derived maps and separate restrained overlays.
- Ship motion rig adds bounded roll/pitch without changing directional silhouettes.
- One directional propulsion system owns normal, turbo and warp states.
- Removed three legacy 8-dir atlases, legacy turbo flame and legacy impact strip from the runtime tree.
- Relic sprite stack replaced by a faceted Three relic with inner core, differential shells and pooled points.
- Shield ripple is connected to both ambient and mission-target collision damage.
- Scanner response is connected to discovery scanning state.
- Biome lighting updates actor rim/key response without recoloring base albedo.
- Projectiles keep core, short trail and travel time; the two continuous mini-beam planes were removed.
- Hit uses the neutral V3 ring; miss uses the V3 spark atlas.
- Companion assets were not duplicated because the Pack 3.0 files match the current approved files byte-for-byte.

Candidate estimated completion before visual QA: **approximately 87%**.

## Automated technical checks

- `node --check src/main.js`: pass
- `npm run typecheck`: pass
- `npm test`: pass, 4 files / 6 tests
- `npm run build`: pass
- Derived alpha preservation: pass, 36/36
- Legacy turbo/impact files absent from `dist`: pass
- Historical handoffs absent from `dist`: pass

## Remote QA checklist

- [ ] Title screen and first actionable state load without page errors.
- [ ] Stage 1/2/3 silhouettes match their current directional PNGs.
- [ ] Ship cockpit, emissive and depth layers remain registered during all nine directions.
- [ ] Astronaut visor and depth remain registered during movement, idle and aim.
- [ ] Companion matches approved reference and has no halo/ring/floor/shadow.
- [ ] Normal movement and turbo show one socketed propulsion stack with no spray cloud.
- [ ] Aim rotates ship and astronaut before firing.
- [ ] Minor, major and final projectiles read as energy shots, not rockets or continuous beams.
- [ ] Hit and miss are visually distinct.
- [ ] Discovery scanner appears only while scanning.
- [ ] Meteor collisions trigger shield ripple, damage and push.
- [ ] Relic remains until touched, transfers energy, unlocks stage and disappears.
- [ ] World composition stays within V2 budgets in Stage 1/2/3/Final.
- [ ] Physical navigation and stage changes preserve existing mapping.
- [ ] Final completion never returns to Stage 1.
- [ ] Desktop frame rate remains above the 45 FPS minimum during turbo/combat.
- [ ] No material, texture or object growth across repeated shots and stage changes.

## Known risks before preview

- The production artifact remains approximately 149 MB because the legacy manifest still allowlists all stage and astronaut animation variants.
- The main JS chunk is approximately 667 kB before gzip and Vite reports a chunk-size warning.
- Visual registration and performance cannot be approved from build checks; they require the remote screenshot/telemetry pass.
