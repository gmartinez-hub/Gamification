# ScaleProfile Validation V1

Overall: **PASS**

This validates evidence linkage only. It does not approve semantic dimensions that are still VERIFY / MEASURED_REFERENCE / PRODUCE_MEASURE.

| Check | Result | Evidence |
|---|---|---|
| RAW_EXISTS:character.player | PASS | measured |
| RAW_MATCH:character.player | PASS | {"expected":[0.972569,1.89899,0.988409],"actual":[0.972569,1.89899,0.988409],"tolerance":0.006} |
| RAW_EXISTS:cockpit.integrated | PASS | measured |
| RAW_MATCH:cockpit.integrated | PASS | {"expected":[2.04,1.3,2.569153],"actual":[2.04,1.3,2.569153],"tolerance":0.006} |
| RAW_EXISTS:ship.front | PASS | measured |
| RAW_MATCH:ship.front | PASS | {"expected":[1.895572,1.796526,1.814597],"actual":[1.895572,1.796526,1.814597],"tolerance":0.006} |
| RAW_EXISTS:ship.middle | PASS | measured |
| RAW_MATCH:ship.middle | PASS | {"expected":[1.588412,1.899496,1.288278],"actual":[1.588412,1.899496,1.288278],"tolerance":0.006} |
| RAW_EXISTS:ship.final | PASS | measured |
| RAW_MATCH:ship.final | PASS | {"expected":[1.824724,1.89893,1.845239],"actual":[1.824724,1.89893,1.845239],"tolerance":0.006} |
| RAW_EXISTS:vehicle.bike | PASS | measured |
| RAW_MATCH:vehicle.bike | PASS | {"expected":[1.395172,1.298996,2.999908],"actual":[1.395172,1.298996,2.999908],"tolerance":0.006} |
| RAW_EXISTS:enemy.alienShip | PASS | measured |
| RAW_MATCH:enemy.alienShip | PASS | {"expected":[0.548798,0.290573,1],"actual":[0.548798,0.290573,1],"tolerance":0.006} |
| RAW_EXISTS:hangar.serviceBay | PASS | measured |
| RAW_MATCH:hangar.serviceBay | PASS | {"expected":[1.899311,0.860787,1.790811],"actual":[1.899311,0.860787,1.790811],"tolerance":0.006} |
| RAW_EXISTS:weapon.turret | PASS | measured |
| RAW_MATCH:weapon.turret | PASS | {"expected":[1.897091,1.152382,0.869767],"actual":[1.897091,1.152382,0.869767],"tolerance":0.006} |
| RAW_EXISTS:character.ally | PASS | measured |
| RAW_MATCH:character.ally | PASS | {"expected":[1.53026,1.89927,0.61684],"actual":[1.530256,1.899266,0.616836],"tolerance":0.006} |
| RAW_EXISTS:companion.noma | PASS | measured |
| RAW_MATCH:companion.noma | PASS | {"expected":[1.898,1.174,1.355],"actual":[1.898319,1.174277,1.354647],"tolerance":0.006} |
| HUMAN_ANCHOR_1_90 | PASS | {"rawHeight":1.89899,"semanticHeight":1.9} |
| RING_EXPLICITLY_UNMEASURED | PASS | {"status":"VERIFY","assetStatus":"NO_GLB_IN_MAIN","measuredReference":{"legacyProceduralEventHorizonDiameter":6.8,"legacyVisualDiscOuterDiameter":15.6},"semanticConstraint":"aperture must fit selected travelling setup without hidden per-shot ship scaling","provenance":["jump-anomaly legacy procedural evidence"]} |
| MOTHERSHIP_EXPLICITLY_UNMEASURED | PASS | {"status":"PRODUCE_MEASURE","assetStatus":"NO_GLB_IN_MAIN","semanticConstraint":"must read dramatically larger than alien ship in boss establishing and combat cameras","provenance":["approved boss visual canon"]} |
| NO_FALSE_APPROVAL:ship.front | PASS | {"status":"MEASURED_REFERENCE"} |
| NO_FALSE_APPROVAL:ship.middle | PASS | {"status":"MEASURED_REFERENCE"} |
| NO_FALSE_APPROVAL:ship.final | PASS | {"status":"MEASURED_REFERENCE"} |
| NO_FALSE_APPROVAL:enemy.alienShip | PASS | {"status":"MEASURED_REFERENCE"} |
| NO_FALSE_APPROVAL:hangar.serviceBay | PASS | {"status":"VERIFY"} |
| NO_FALSE_APPROVAL:cockpit.integrated | PASS | {"status":"VERIFY"} |

Failed checks: **0**.
