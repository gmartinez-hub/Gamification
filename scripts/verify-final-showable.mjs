#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const main = fs.readFileSync(path.join(root, "src", "main.js"), "utf8");
const errors = [];

function assert(condition, message) { if (!condition) errors.push(message); }

assert(main.includes('FinalShowableRuntime'), "FinalShowableRuntime is not integrated.");
assert((main.match(/requestAnimationFrame\(animate\)/g) || []).length === 1, "There must be exactly one requestAnimationFrame(animate).");
assert(!main.includes('from "./clean/'), "src/clean must not be imported.");
assert(!main.includes("CompleteV4Controller"), "CompleteV4Controller must not be integrated.");
assert(!main.includes("HybridWorldDirector"), "HybridWorldDirector must not be integrated.");
assert(!main.includes("LegacyWorldGate"), "LegacyWorldGate must not be integrated.");

const requiredFiles = [
  "src/final-showable/FinalShowableRuntime.js",
  "src/final-showable/scenarios.js",
  "src/final-showable/GravityFieldSystem.js",
  "src/final-showable/CameraDirector.js",
  "src/final-showable/AdaptiveAudioDirector.js",
  "src/final-showable/HolographicMap.js",
  "src/final-showable/InterstageDirector.js",
  "assets/runtime/final-showable/textures/gate.png",
  "assets/runtime/final-showable/textures/gem.png",
  "assets/runtime/final-showable/audio/ambient_oceanic_45s.wav",
  "assets/runtime/final-showable/audio/ambient_mechanical_45s.wav",
  "assets/runtime/final-showable/audio/ambient_dark_crater_45s.wav",
  "assets/runtime/final-showable/audio/ambient_relic_core_45s.wav",
];
for (const file of requiredFiles) assert(fs.existsSync(path.join(root, file)), `Missing ${file}`);

if (errors.length) {
  console.error("\\nFINAL SHOWABLE VERIFY FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("FINAL SHOWABLE VERIFY PASS");
