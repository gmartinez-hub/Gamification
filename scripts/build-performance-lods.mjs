import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire((process.env.GLTF_TOOLS || '/tmp/gz-mobile-assets-toolchain') + '/package.json');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { prune, simplify, weld } = require('@gltf-transform/functions');
const { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } = require('meshoptimizer');

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);

const runtime = new URL('../assets/runtime/', import.meta.url);
const destination = new URL('performance-lods/', runtime);
await mkdir(destination, { recursive: true });

const jobs = [
  { source: 'models/asteroide-marron.glb', output: 'asteroid-medium.glb', ratio: .18, error: .02 },
  { source: 'models/asteroide-marron.glb', output: 'asteroid-low.glb', ratio: .035, error: .035 },
  { source: 'encounter-models/bike.glb', output: 'bike-medium.glb', ratio: .28, error: .018 },
  { source: 'models/capsula.glb', output: 'capsula-medium.glb', ratio: .25, error: .015 },
  { source: 'models/habitat.glb', output: 'habitat-medium.glb', ratio: .25, error: .015 },
  { source: 'models/propulsion.glb', output: 'propulsion-medium.glb', ratio: .25, error: .015 },
  { source: 'encounter-models/alien.glb', output: 'alien-medium.glb', ratio: .30, error: .018 },
  { source: 'encounter-models/alien-ship.glb', output: 'alien-ship-medium.glb', ratio: .28, error: .018 },
  { source: 'mission-models/proyectil.glb', output: 'projectile-flight.glb', ratio: .06, error: .025 },
];

const triangles = document => document.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives())
  .reduce((sum, primitive) => sum + (primitive.getIndices()?.getCount() || primitive.getAttribute('POSITION').getCount()) / 3, 0);

const io = () => new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const manifest = [];
for (const job of jobs) {
  const sourceURL = new URL(job.source, runtime);
  const sourceBytes = await readFile(sourceURL);
  const document = await io().read(fileURLToPath(sourceURL));
  const sourceTriangles = triangles(document);
  await document.transform(
    weld({}),
    simplify({ simplifier: MeshoptSimplifier, ratio: job.ratio, error: job.error }),
  );
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) primitive.setMaterial(null);
  }
  for (const texture of document.getRoot().listTextures()) texture.dispose();
  for (const material of document.getRoot().listMaterials()) material.dispose();
  await document.transform(prune());
  const output = Buffer.from(await io().writeBinary(document));
  await writeFile(new URL(job.output, destination), output);
  manifest.push({
    file: job.output,
    source: job.source,
    ratio: job.ratio,
    error: job.error,
    sourceTriangles,
    triangles: triangles(document),
    sourceBytes: sourceBytes.length,
    bytes: output.length,
    geometryOnly: true,
  });
}

await writeFile(new URL('manifest.json', destination), JSON.stringify({
  version: 1,
  description: 'Screen-space runtime LOD geometry. Original materials and textures are rebound at runtime; hero source assets remain unchanged.',
  models: manifest,
}, null, 2) + '\n');

console.table(manifest.map(({ file, sourceTriangles, triangles, bytes }) => ({ file, sourceTriangles, triangles, KiB: Math.round(bytes / 1024) })));
