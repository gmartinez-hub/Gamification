#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const main = read("src/main.js");
const scenarios = read("src/world/ScenarioDefinitions.ts");
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

for (const integration of [
  "new GravityFieldSystem(SCENARIOS)",
  "scenarioGravity.apply(",
  "authoredOceanicLandmarks",
  'createAuthoredOceanicLandmark("fractured_beacon"',
  'createAuthoredOceanicLandmark("orbital_ruins"',
  "scenarioScanTargetId",
  "COMPANION / ESCÁNER",
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
console.log("- one authoritative runtime and animation loop");
console.log("- one main camera plus one render-only background camera");
console.log("- original ship, astronaut and companion asset anchors preserved");
console.log("- four authored scenarios, Oceanic discovery and gravity integrated");
