#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const main = read("src/main.js");
const scenarios = read("src/world/ScenarioDefinitions.ts");
const worldTuning = read("src/config/WorldTuning.ts");
const progressionRules = read("src/missions/ProgressionRules.ts");
const manifest = JSON.parse(read("assets/runtime/manifest.json"));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

for (const rejected of [
  "src/clean",
  "CompleteV4Controller",
  "HybridWorldDirector",
  "LegacyWorldGate",
  "FinalShowableRuntime",
]) {
  assert(!main.includes(rejected), `Rejected runtime dependency found: ${rejected}`);
}

assert(count(main, /requestAnimationFrame\(animate\)/g) === 1, "Expected exactly one requestAnimationFrame(animate).");
assert(count(main, /setAnimationLoop\(/g) === 0, "A second animation-loop API is present.");
assert(count(main, /const camera = new THREE\.(?:Orthographic|Perspective)Camera/g) === 1, "Expected one authoritative main camera.");
assert(count(main, /const backgroundCamera = new THREE\.(?:Orthographic|Perspective)Camera/g) === 1, "Expected one render-only background camera.");
assert(count(main, /new THREE\.(?:Orthographic|Perspective)Camera/g) === 2, "Unexpected additional camera constructor found.");
assert(count(main, /renderer\.render\(/g) === 2, "Expected one background render and one main-scene render in the single loop.");
assert(!main.includes("v2Runtime.mission"), "Parallel mission authority is still active.");
assert(main.includes("const FIXED_AUTHORED_WORLD = true"), "Fixed authored world authority is not enabled.");
assert(main.includes('authoredStageGroup.name = "AUTHORED_FIXED_STAGE"'), "Missing the fixed authored stage group.");
assert(main.includes("if (FIXED_AUTHORED_WORLD) {\n    ambientMeteorLayer.group.visible = false;"), "Ambient meteor writer is still active in fixed-world mode.");
assert(main.includes("if (FIXED_AUTHORED_WORLD) {\n    orbitalWorld.group.visible = false;"), "Orbital procedural writer is still active in fixed-world mode.");
assert(count(main, /function setWorldOffset\(/g) === 1, "World teleport authority must be centralized.");
assert(count(main, /function moveWorldOffset\(/g) === 1, "World movement authority must be centralized.");
assert(count(main, /state\.worldOffset\.set\(/g) === 2, "World position writes escaped the two authoritative helpers.");
assert(count(main, /state\.worldOffset\.x =/g) === 1, "World X movement must have one writer.");
assert(count(main, /state\.worldOffset\.y =/g) === 1, "World Y movement must have one writer.");
assert(worldTuning.includes("maxHeroVisible: 1"), "Expected one dominant hero planet.");
assert(progressionRules.includes("FIRST_VISIT_CORRIDOR_SECONDS = 30"), "Forward corridor must last 30 seconds.");
assert(progressionRules.includes("RETURN_CORRIDOR_SECONDS = 6.5"), "Return corridor must last 6.5 seconds.");
assert(main.includes('qaRoute === "reset"'), "Missing ?qa=reset progress reset.");
assert(main.includes('mission01.state = "completed_region"'), "Mission completion does not wait at the world gate.");

for (const integration of [
  "new GravityFieldSystem(SCENARIOS)",
  "scenarioGravity.apply(",
  "authoredScenarioLandmarks",
  "SCENARIOS.flatMap(",
  "scenarioScanTargetId",
  "COMPANION / ESCÁNER",
  "new HolographicMap(",
  "requestWorldTravel(stageIndex)",
  "gravedad-zero-full-progress-v1",
  'loadTexture("assets/runtime/final-showable/textures/beacon.png")',
  'loadTexture("assets/runtime/final-showable/textures/orbital_ruins.png")',
  'loadTexture("assets/runtime/final-showable/textures/gate.png")',
]) {
  assert(main.includes(integration), `Missing recovered integration anchor: ${integration}`);
}

for (const scenario of ["oceanic", "mechanical", "dark_crater", "relic_core"]) {
  assert(scenarios.includes(`id: "${scenario}"`), `Missing authored scenario: ${scenario}`);
}
for (const prohibited of ["aquatic fauna", "whales", "fish", "jellyfish", "coral", "underwater scenery"]) {
  assert(scenarios.includes(`"${prohibited}"`), `Oceanic prohibition is missing: ${prohibited}`);
}

assert(manifest.astronaut?.float?.path === "assets/runtime/astronaut/float.png", "Original astronaut manifest anchor changed.");
assert(main.includes('from "./visual/VisualPackRig.js"'), "Original ship/astronaut visual rigs are not integrated.");
assert(main.includes("assets/runtime/gravedad-zero/companion/companion_front_albedo_2048.png"), "Original companion asset anchor changed.");

for (const file of [
  "src/world/ScenarioDefinitions.ts",
  "src/world/GravityFieldSystem.ts",
  "tests/ScenarioDefinitions.test.ts",
  "tests/GravityFieldSystem.test.ts",
  "src/ui/HolographicMap.js",
  "assets/runtime/final-showable/textures/beacon.png",
  "assets/runtime/final-showable/textures/orbital_ruins.png",
  "assets/runtime/final-showable/textures/broken_ring.png",
  "assets/runtime/final-showable/textures/scanner_array.png",
  "assets/runtime/final-showable/textures/synthetic_rift.png",
  "assets/runtime/final-showable/textures/gravity_tower.png",
  "assets/runtime/final-showable/textures/relic_portal.png",
  "assets/runtime/final-showable/textures/gravity_node.png",
  "assets/runtime/final-showable/textures/gate.png",
  "assets/runtime/final-showable/textures/gem.png",
  "assets/runtime/final-showable/audio/gem_materialize.wav",
  "assets/runtime/final-showable/audio/gate_open.wav",
  "assets/runtime/final-showable/audio/interstage_exit.wav",
  manifest.astronaut?.float?.path,
]) {
  assert(file && fs.existsSync(path.join(root, file)), `Missing required recovery file: ${file || "undefined"}`);
}

if (errors.length) {
  console.error("\nFINAL SHOWABLE RECOVERY VERIFY FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("FINAL SHOWABLE RECOVERY VERIFY PASS");
console.log("- one authoritative runtime, world movement API and animation loop");
console.log("- one main camera plus one render-only background camera");
console.log("- original ship, astronaut and companion asset anchors preserved");
console.log("- four authored scenarios, discovery and gravity integrated");
console.log("- full-screen travel map, persistence, authored gates and landmark textures integrated");
