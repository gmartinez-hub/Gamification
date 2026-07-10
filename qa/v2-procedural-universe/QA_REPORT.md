# Gravedad Zero V2 QA report

## Build under review

- Branch: `feat/v2-procedural-universe`
- Baseline: `3ff3ec565f04456ee248f217591f0e26c84283b0`
- Baseline commit: `4942739`
- Visual QA owner: Gabriel

## Automated technical checks

- `node --check src/main.js`: pass
- `npm run typecheck`: pass
- `npm test`: pass, 4 files / 6 tests
- `npm run build`: pass
- Runtime artifact excludes `handoff/`, QA captures and historical packs: pass
- Dependency audit: 0 vulnerabilities

## Implemented release assertions

- maximum two hero bodies;
- maximum four medium bodies;
- maximum two landmarks;
- maximum six debris clusters;
- gameplay safe zone exclusion;
- hero texture uniqueness;
- hero overlap budget;
- medium/hero overlap rejection;
- mission completion cannot return to Stage 1.

## Manual preview QA

Pending user review on the Vercel preview.

Priority checks:

- world composition in Stage 1/2/3/Final;
- physical navigation between unlocked regions;
- target discovery before targeting;
- ambient and mission meteor collisions;
- shield damage, invulnerability and recovery;
- minor/major/final aim timing;
- companion face curvature and state fidelity;
- turbo subtlety;
- production-scale asset loading.

## Known non-blocking item

- The built runtime artifact is approximately 143 MB because the legacy manifest still references all stage, astronaut and animation variants. Handoffs and historical packs are no longer part of the public artifact.
