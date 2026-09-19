# Asset Measurement Evidence V1

> Raw GLB authoring measurements from the legacy repository. These are evidence, **not automatic V2 world dimensions**.

Canonical human anchor for V2: **1.90 m**.

| Asset | Raw X | Raw Y | Raw Z | Longest | Triangles |
|---|---:|---:|---:|---:|---:|
| character.player | 0.973 | 1.899 | 0.988 | 1.899 | 215,082 |
| cockpit.integrated | 2.040 | 1.300 | 2.569 | 2.569 | 348,936 |
| ship.front | 1.896 | 1.797 | 1.815 | 1.896 | 643,450 |
| ship.middle | 1.588 | 1.899 | 1.288 | 1.899 | 609,962 |
| ship.final | 1.825 | 1.899 | 1.845 | 1.899 | 1,061,624 |
| vehicle.bike | 1.395 | 1.299 | 3.000 | 3.000 | 461,528 |
| enemy.alienShip | 0.549 | 0.291 | 1.000 | 1.000 | 374,024 |
| hangar.serviceBay | 1.899 | 0.861 | 1.791 | 1.899 | 537,935 |
| weapon.turret | 1.897 | 1.152 | 0.870 | 1.897 | 179,546 |
| character.ally | 1.530 | 1.899 | 0.617 | 1.899 | 113,438 |
| companion.noma | 1.898 | 1.174 | 1.355 | 1.898 | 148,474 |
| deployable.beacon | 1.279 | 1.898 | 1.020 | 1.898 | 124,940 |
| resource.energyCell | 1.180 | 1.899 | 1.180 | 1.899 | 251,287 |
| artifact.gem | 0.739 | 1.899 | 0.613 | 1.899 | 50,542 |

## Key evidence

- Astronaut raw Y height: **1.899**; scale-to-1.90 factor: **1.001**.
- Legacy player-ship composition spacing: **4.125 m/module**; three-module nominal length: **12.375 m**. Evidence only.
- Legacy alien-ship declared runtime length: **25.734 m**. Evidence only.
- No portal-ring GLB was found in main.
- No mothership GLB was found in main.
- Closeout/raw assets must not be interpreted as world scale merely from GLB bounds.

## Next

1. Approve ScaleProfiles, not raw bounds.
2. Run cockpit raw-vs-runtime envelope proof.
3. Define Hangar semantic dimensions from largest supported ship composition and first-person clearance.
4. Define ring aperture from largest travelling setup.
5. Produce/measure mothership asset when available.
