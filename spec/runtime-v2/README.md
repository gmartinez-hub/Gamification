# Runtime V2 executable semantic oracle

This folder is a **contract oracle**, not runtime implementation.

Rules:
- the clean V2 runtime must not import these modules in production;
- tests encode approved semantic outcomes only;
- no legacy gameplay module is imported;
- numeric tuning values are excluded unless explicitly approved as product/economy data;
- a failing contract test reopens the exact implementation/contract mismatch; it does not authorize scope reduction.

Current executable coverage:
- ship grammar / mandatory Front / Middle×N
- qualitative movement hierarchy
- Boost availability/resource semantics
- physical-item no-clone invariant
- player-death companion-recovery priority
- Bike/ship destruction recovery
- portal Party Check + actor continuity
- Boosted Bike unlock prerequisites / 1,500 Cell price
