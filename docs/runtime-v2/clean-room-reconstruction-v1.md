# Gravedad Zero — Clean-Room Reconstruction Contract V1

Status: **APPROVED PRINCIPLE**

## Intent

Runtime V2 is a reconstruction from product/visual/behavioral contracts, not a refactor or copy of the legacy runtime.

The existing repository is **evidence**, not an implementation dependency.

## Legacy evidence classes

Every legacy observation must be classified before it can influence V2:

1. **CANONICAL_SEMANTIC_REFERENCE**
   - A behavior/outcome that is approved to preserve.
   - Example: cockpit board standing -> explicit Sit; existing seat/stand motion is evidence that this interaction works.

2. **MEASURED_REFERENCE**
   - A numeric/proportional observation that may seed the new spec after validation.
   - Example: astronaut reference height ~1.90 m.

3. **VISUAL_REFERENCE**
   - Asset silhouette, composition, material language, camera framing or animation feel to preserve.

4. **LEGACY_IMPLEMENTATION_ONLY**
   - A technique/constant/data structure that happened to implement the old game.
   - It is not copied merely because it exists.

5. **ANTI_PATTERN**
   - A known legacy behavior V2 must explicitly avoid.
   - Example: global WORLD_MIN/WORLD_MAX navigation clamp.

## Hard rules

- V2 MUST NOT import code from legacy `src/`.
- V2 MUST NOT depend on legacy modules at runtime.
- Codex MUST NOT be instructed to “reuse implementation from X file” as a shortcut.
- A legacy function may be read to understand observable behavior, measurements or asset provenance, then the new implementation is designed independently.
- Numeric constants from legacy code are **not canonical by default**. They require provenance and semantic validation.
- Tests in V2 assert approved outcomes, invariants and measurements — never source-code equivalence.
- Old hacks that compensated for bad source scale, old camera framing, world bounds or staging must not be perpetuated unless the resulting behavior is explicitly approved.
- Assets may be reused after intake/optimization; source code architecture is not reused by default.

## Spec-writing rule

Implementation-facing contracts describe:

- intent,
- state,
- inputs,
- outputs,
- invariants,
- persistence,
- world semantics,
- representation,
- camera/UI,
- performance,
- failure behavior,
- acceptance tests.

They do **not** prescribe legacy file names/functions as the solution.

Legacy file paths may appear only inside an **Evidence / Provenance** subsection.

## Reconstruction gate

Before V2 coding starts, every feature in the vertical slice must have:
- approved semantic contract,
- semantic acceptance tests,
- asset provenance,
- scale profile where spatially relevant,
- legacy evidence classified,
- known legacy anti-patterns listed.

If any behavior is only known because “the old code does it”, it is not frozen.
