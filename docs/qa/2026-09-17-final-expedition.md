# Final expedition — implementation and verification

The game remains plain Three.js. The approved source models and image bytes are retained on both desktop and touch profiles. Runtime adaptations handle materials, poses, contacts, emitters and effects; the original Downloads are unchanged.

## Delivered behavior

- Three manually explored sectors with separated regions and depth. Every sector requires a beacon scan and three EVA targets; ship cores increase 1/2/3. Optional dangerous and breakable rocks never advance the mission. Varied controlled trajectories and gradual replenishment stay outside the camera and away from the player.
- Original Aether Shard and Aethercore projectile. One 28cm relic size in the world and on the anatomical left palm; right hand keeps the weapon. The same projectile source uses uniform EVA/ship scales.
- Source-measured exposed engine outlets, stage-dependent occlusion, jetpack/companion propulsion, body lean, braking and world-space trails. Existing sprites and robot sounds support brief visible subtitles.
- Slow moments for explosions and collection; physical EVA return, boarding/cable retraction, travel/loading, arrival and module docking. No permanent corridor ring. The third gem completes the expedition.
- The original complete cabin panel and dominant window, with short approach, sit/pilot and stand; first/third-person views and both pilot arms. This follows the user's explicit simplification from free walking. Human scale and view composition take precedence over a literal 3.8m window.
- Analog touch joystick, optional arrows, look/height/brake, contextual nearby actions and visible view control. Partial progress persists and restores from a safe aboard state.
- Stage/view resources load progressively. Failed initial loads have a retry action; later cabin/sector loads retry at bounded intervals. Context loss keeps a visible recovery action and saved progress.

## Evidence

The internal ignored QA directory is `.superpowers/sdd/2026-09-17-final-expedition/`. Its reports include exact served-file hashes and distinguish checks before/after individual fixes.

| Check | Result / coverage |
|---|---|
| Complete Chrome and WebKit runs | 9 EVA targets, 6 ship cores, 3 gems, physical returns and final completion. Optional kills did not advance progression. WebKit run: 28 shots, 18 hits, 10 misses; two-miss assistance observed; zero JS/console/network errors. |
| Input | Keyboard release, analog partial/full deflection, touch end/cancel, menu and visible view toggle exercised. |
| Protection | Deliberate hazard overlap did not damage during aim/fire; the same collision damaged after the action. |
| Recovery | Partial checkpoint, initial network failure/retry, failed cabin download during saved resume and physical return, pause during rising, sit/stand/exit/return all checked in Chrome. |
| Graphics recovery | Real WebGL context loss → manual reload, and loss → restore → automatic reload both reached READY. Duplicate recovery events leave one button, above the pause UI. |
| Source fidelity | Sampled imported asteroid meshes retain 205,612 triangles in each sector; no mobile fracture proxies. Exterior face positions/UVs are retained in prepared debris. |
| Memory preparation | Same emulated touch profile, CDP sampled every 75ms: observed JavaScript startup peak fell from 457,008,680 to 69,134,468 bytes (84.9%) after typed-buffer/numeric-edge preparation. Geometry is unchanged. At five seconds after ready, observed JS heap was 19,396,952 bytes. |
| Frame samples | WebKit/macOS HUD samples were 48.8 during a scan, 57.3/58.1 after docking and 56.4 at completion. These are point samples, not an average or a 60-FPS certification. |

The extended flow harness adds diagnostic access only to the HTTP response. It relocates actors between encounters to shorten testing; actual interaction, scans, fire, misses/hits, destruction, return, load and assembly functions use the normal game clock. It does not overwrite phase, outcomes or progression. This validates mechanics, not a full manual exploration duration or subjective pacing.

## Visual defects caught during QA

Initial captures revealed radial stretched/shaded debris caps, oversized collection/docking chunks, a sideways pickup palm and an open edge above the cabin panel. Corrections preserve source exterior geometry and mapping, give cut interiors coherent matte mineral shading, use compact energy motes, orient the left wrist from the actual finger plane, and reuse the cabin's closure surfaces. Follow-up captures are kept beside the earlier failing evidence.

The design spec's older baseline note about mobile fracture proxies no longer describes this release. Both profiles now use the source fracture exterior. Existing shadow-map budgets still differ (1024 touch, 2048 desktop); geometry, maps, resolution policy and effect systems are shared. There is no dynamic resolution downgrade.

## Limits

Browser QA ran on this Mac in Chrome/Metal and Playwright WebKit, with desktop and touch-sized viewports. It is not physical iPhone 16 testing. Sampled JS heap excludes total process, decoded-image and GPU memory; sampling may miss transient peaks. Localhost load times are not public-network load promises. Large original texture downloads still depend on network conditions. No claim of a literal match to a concept-art image or guaranteed 60 FPS is made.

## Final checks

- `npm test`: **182 passed, 0 failed, 0 skipped** after the final runtime changes; all 28 JavaScript modules passed `node --check`. `git diff --check` is clean.
- Independent review of root integration and compact fracture preparation found one P2: a pending exit could run after a failed download or pause. The fix checks readiness and revalidates the action epoch, seed, actor and guards; eight regressions execute the actual production functions. Review resolved with no remaining actionable P0/P1/P2 in its covered changes.
- Final WebKit pickup captures verify the same 28cm relic, left palm upward and +14cm center offset in first/third person and portrait; right weapon hand unchanged. Cabin FP/TP seated/standing and retained roof were checked with the real GLB.
- Publication target is the existing `https://gamification-murex.vercel.app/`; the production alias is updated only after these checks. Deployment identity and public smoke results are preserved in the local release evidence.

## User playtest follow-up

The final preview exposed three small usability issues, followed by an EVA projectile visibility report. The correction stays limited to these areas:

- Cabin cameras now frame the pilot from a close shoulder view and point the standing first-person eye at the actual window. Seated first-person framing is retained. Look inside the cabin is relative to the ship instead of reusing its flight pitch. Desktop and portrait captures cover entering, sitting, rising, standing and camera cycling with the original models.
- Discovered mission rocks have a subtle cyan/gold rim pulse, retaining source geometry, maps and mineral shading. Labels explicitly distinguish progression targets from optional rocks and stay within the portrait viewport. New mission discoveries take selection priority without interrupting a shot or overriding ordinary manual selection. Exploration distances and progression counts are unchanged.
- Activating audio from settings closes the paused menu before unlocking playback. The compact sound control remains visible, reports successful activation and permits retry. Safari's playback audio session is requested on enabled unlock where supported. Real-page Chromium and WebKit checks measured nonzero output for direct/menu activation and mute/reactivation, without page/network errors. This does not certify physical speaker output on an iPhone.
- EVA projectile presentation keeps the original projectile and scale, adds a compact glow and stronger trail, and replaces the large muzzle fragments that obscured the shot with small sparks. The actual scene was inspected against the planet background. Flight, accuracy, damage and ship effects remain unchanged; before/after evidence is in `projectile-eva-after-qa/`.

Visual reports and source hashes are stored under `cabin-portrait-camera-qa/`, `objective-cue-qa/` and `audio-recovery-qa/` in the ignored QA directory. The preview URL is immutable; the corrected public release uses the stable production domain.

Final follow-up checks: `npm test` **197 passed, 0 failed, 0 skipped**; all five changed JavaScript modules passed syntax checks, and `git diff --check` is clean. Focused independent review found no new actionable P1/P2 in selection, surface-material ownership or audio activation. Public release evidence is recorded after promotion.

## Readability and movement polish

After that playtest, the user approved more visible projectiles, narrative wording and more movement with a little extra navigational risk:

- EVA projectile length increases from 24 to 36 cm; ship projectile from 1.35 to 1.6875 m. Both retain their original mesh, maps, uniform proportions and orientation. Travel lasts .8 s / 1.1 s respectively, with a larger EVA glow and more legible shared trail. Lock, accuracy, miss assistance, damage and cooldown rules are retained; each shot occupies controls for .25 / .2 s longer.
- Shared mission wording now applies across Nereida, Vesper and Umbra without “counts”, “does not count” or optional-rock announcements. Nearby rock labels name the object and appropriate weapon, while cyan/gold cues, distance, progress and controls remain. Nóma speaks on relevant discoveries and milestones instead of commenting on every secondary rock. Gem text correctly says recovered before boarding.
- Hazard nominal trajectory speed increases from 1.25 to 1.5 m/s, with ±4% seeded variation. Motion planes, periods and axial spin vary independently by seed and role. Existing distant formations rotate 2–2.86 times faster. Damage formulas are unchanged, so faster relative impacts can modestly increase actual damage within the existing cap. Population counts, safe envelopes, respawn exclusions, progression and action protection are unchanged. A separate random stream preserves saved layout positions/radii/phases exactly.

Validation: **200 tests pass**; seven changed modules pass syntax checks and the diff is clean. Regression coverage includes saved-layout compatibility across 12 layouts, bounded trajectories, seeded/reduced-motion spins and full-suite weapon timing. Independent review found no actionable issue in projectile timing/resource ownership. Isolated Chrome/Metal desktop and touch portrait captures exercise the actual EVA and cabin firing paths at several travel times, plus live target movement; zero page/console/network errors. Deterministic sampled shots missed, correctly; hit/assistance behavior is covered by the combat suite. Runtime setup only positions actors near an existing rock and pauses after the desired frame; it does not replace combat outcomes or rendering. Evidence is in ignored `readability-polish-qa/`. Physical iPhone and guaranteed-FPS limitations above still apply.
