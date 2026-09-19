# Gravedad Zero — Visual Proof Pack V1

Status: **EXECUTION GATE — no product inference**

Purpose: close the remaining geometry/camera evidence required before Implementation Contract Freeze.

## Evidence-only rule

The proof harness may inspect and render legacy assets/behavior to establish facts. It is **not** V2 runtime code and must not be copied into the clean runtime.

Every proof result is classified only as:
- PASS
- FAIL -> THREE_FIX
- FAIL -> BLENDER_FIX
- FAIL -> BOTH
- INCONCLUSIVE -> MORE EVIDENCE

A FAIL never authorizes scope reduction.

## CP-001 — Cockpit full-source proof

Required shots:
1. source shell + standing astronaut, side
2. source shell + standing astronaut, rear/three-quarter
3. source shell + standing astronaut, top
4. source shell + legacy rear-clip plane shown as evidence

Must prove:
- 1.90 m astronaut fits the uncut source shell,
- standing head/body do not intersect shell,
- the historical clip plane explains the shallow/rear-cut problem,
- seated/standing framing can be authored without inventing a replacement cockpit.

No approval of new Blender geometry until these shots are reviewed.

## HG-001 — Hangar spatial proof

Required shots:
1. front/open-face orthographic/perspective
2. rear
3. left/right structural views
4. first-person candidate A from a measured floor point
5. first-person candidate B from a second measured floor point
6. long-ship staging overview

Must prove:
- orbital open face is real/usable,
- first-person eye can exist above actual floor with visible architecture,
- boarding path can be formed from geometry/support pieces,
- standard ship has large clearance,
- long ship may extend toward open face,
- no sealed-room assumption.

## PORTAL-001 — Transit formation proof

No formation is silently selected.

Render candidates:
- A: single-file
- B: staggered convoy
- C: side-by-side

Use current procedural aperture only as evidence:
- event horizon 6.8 m
- visual disc 15.6 m

For each candidate record:
- asset scale unchanged?
- collision/visual aperture fit?
- camera readability?
- all selected setup can be represented?
- required aperture if current opening fails?

Final formation/aperture remains a product/cinematic choice after review.

## BIKE-001 — Back-derived Boosted Bike proof

Use current Bike + current rider pose as legacy evidence and add a non-destructive Back candidate.

Required shots:
- left profile
- rear three-quarter
- top
- rider close-up
- first-person direction check
- third-person chase framing

Candidate seed from measurement only:
- Back raw scale ~0.535x
- add-on envelope ~0.976 × 0.987 × 1.016 m

Must classify:
- rider clearance
- actual attachment/contact silhouette
- FP obstruction
- TP framing
- collision envelope
- central PrimaryBoostExhaust integration

Only all-PASS or bounded-support-geometry result allows production.

## BOSS-001 — Mothership

Blocked on authored GLB.

Do not fake a dimension. Once GLB exists, run:
- alien-ship relative scale shots
- boss establishing
- combat range
- gem/core readability
- launcher/readable sockets
- LOD/collider envelope

## Freeze rule

Implementation Contract Freeze remains blocked until:
- CP-001 reviewed
- HG-001 reviewed
- PORTAL-001 formation/aperture reviewed
- BIKE-001 reviewed or explicitly deferred outside first runtime slice
- BOSS-001 has a production/measurement plan with no invented dimensions
