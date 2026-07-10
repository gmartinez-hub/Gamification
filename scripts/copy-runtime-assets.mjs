import { cp, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const destinationRoot = path.join(root, "dist");
const paths = new Set(["assets/runtime/manifest.json"]);
const runtimePattern = /assets\/runtime\/[A-Za-z0-9_./ -]+\.(?:png|gif|jpe?g|wav|json)/g;

function collect(value) {
  if (typeof value === "string") {
    if (value.startsWith("assets/runtime/")) paths.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(collect);
    return;
  }
  if (value && typeof value === "object") Object.values(value).forEach(collect);
}

const [mainSource, catalogSource, manifestSource] = await Promise.all([
  readFile(path.join(root, "src", "main.js"), "utf8"),
  readFile(path.join(root, "src", "assets", "AssetCatalog.ts"), "utf8"),
  readFile(path.join(root, "assets", "runtime", "manifest.json"), "utf8"),
]);

for (const source of [mainSource, catalogSource]) {
  for (const match of source.matchAll(runtimePattern)) paths.add(match[0]);
}
collect(JSON.parse(manifestSource));

const audioDirectory = path.join(root, "assets", "runtime", "v2", "audio");
for (const file of await readdir(audioDirectory)) {
  if (file.endsWith(".wav")) paths.add(`assets/runtime/v2/audio/${file}`);
}

for (const relativePath of paths) {
  const source = path.join(root, relativePath);
  const destination = path.join(destinationRoot, relativePath);
  await stat(source);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { force: true });
}

console.log(`Copied ${paths.size} allowlisted runtime assets`);
