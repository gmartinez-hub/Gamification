# Gravedad Zero — Runtime V2 Contract Pack

Status: **pre-implementation contract staging**  
Branch: `docs/gz-runtime-v2-spec`

This folder translates the approved product and technical decisions from the Gravedad Zero FigJam atlas into implementation-facing contracts.

## Source of truth order

1. **Factual asset atlas**: what assets actually exist.
2. **FigJam canonical sections 20–34**: approved product/experience decisions and production intent.
3. **This contract pack**: executable wording, IDs, semantic tests, verification gates.
4. **Runtime code**: must implement the contracts; code does not redefine them.

If code or an older note conflicts with a newer approved contract, the newer contract wins. If a contract is ambiguous, implementation must stop and resolve it rather than infer a behavior.

## Status vocabulary

- **APPROVED** — product/architecture behavior is frozen.
- **PROPOSED** — design direction exists but needs explicit approval.
- **MEASURE** — final number must come from a reproducible benchmark.
- **PRODUCE** — asset/audio/VFX/Blender work, not a product ambiguity.
- **VERIFY** — evidence required before declaring a capability done.

## Non-negotiable scope rule

A performance failure does **not** authorize deleting a capability. First adjust LOD, representation tier, residency, streaming, texture tier, VFX tier, instancing, pooling, update frequency, cell budget, shadows or other technical cost. Any product-scope reduction requires an explicit contract change.

## Documents

- [contracts-v1.md](./contracts-v1.md) — canonical functional/technical contracts.
- [semantic-tests-v1.md](./semantic-tests-v1.md) — semantic acceptance scenarios.
- [asset-manifest-contract-v1.md](./asset-manifest-contract-v1.md) — source/runtime asset boundaries and semantic keys.
- [blender-production-audit-v1.md](./blender-production-audit-v1.md) — operational Blender/asset review.
- [perf-verification-v1.md](./perf-verification-v1.md) — perf lab, telemetry and verification gates.
- [spatial-experience-audit-v1.md](./spatial-experience-audit-v1.md) — cockpit/hangar/portal spatial evidence and camera constraints.
- [clean-room-reconstruction-v1.md](./clean-room-reconstruction-v1.md) — clean-room rebuild rules and legacy-evidence classification.
- [scale-spatial-semantics-audit-v1.md](./scale-spatial-semantics-audit-v1.md) — canonical scale hierarchy and ScaleProfile audit.
- [ship-composition-movement-contract-v1.md](./ship-composition-movement-contract-v1.md) — ship grammar, movement, Boost and Bike failure semantics.
- [party-damage-death-presentation-v1.md](./party-damage-death-presentation-v1.md) — ally/Nóma/player damage, downed and death presentation.
- [campaign-progression-contract-v1.md](./campaign-progression-contract-v1.md) — prologue, World 1/2/3 progression, ally rescue, incursions and final boss canon.
- [semantic-audit-pass-1.md](./semantic-audit-pass-1.md) — contradiction log and resolved pass-1 blockers.
- [semantic-audit-pass-2.md](./semantic-audit-pass-2.md) — core semantic freeze result and evidence gates before implementation freeze.
- [evidence/asset-measurements-v1.md](./evidence/asset-measurements-v1.md) — generated raw bounds, legacy semantic-scale evidence and first cockpit/Hangar/ring findings.

## Repository strategy

This branch is documentation staging in the current repository only. The new runtime repository should receive this folder unchanged at bootstrap, then implementation begins from these contracts. The legacy runtime remains a reference bank for proven movement, ballistics, rigs, assets, effects and tests; it is not the architecture contract for V2.
