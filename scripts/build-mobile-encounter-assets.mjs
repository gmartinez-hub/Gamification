// Preserve the complete encounter GLBs while producing a bounded mobile texture set.
// The copied GLBs keep their original relative texture URIs, so the mobile directory
// is a drop-in asset root and geometry, hierarchy, rigs, and animations stay byte-exact.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire((process.env.GLTF_TOOLS || '/tmp/gz-mobile-assets-toolchain') + '/package.json');
const sharp = require('sharp');
sharp.cache(false);

const source = new URL('../assets/runtime/encounter-models/', import.meta.url);
const destination = new URL('../assets/runtime/encounter-models-mobile/', import.meta.url);
const files = ['bike.glb', 'bike-rider.glb', 'alien.glb', 'alien-ship.glb'];
const maxTextureDimension = 2048;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function glbJson(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) {
    throw new Error('Expected a glTF 2.0 GLB');
  }
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB JSON chunk is missing');
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
}

function safeTextureURL(uri, base) {
  if (!uri || /^(?:[a-z]+:|\/)/i.test(uri) || uri.split('/').includes('..')) {
    throw new Error(`Unsafe encounter texture URI: ${uri}`);
  }
  return new URL(uri, base);
}

await rm(destination, { recursive: true, force: true });
await mkdir(new URL('textures/', destination), { recursive: true });

const models = [];
const references = new Map();
for (const file of files) {
  const bytes = await readFile(new URL(file, source));
  const json = glbJson(bytes);
  await writeFile(new URL(file, destination), bytes);
  const images = (json.images || []).map(image => {
    if (!image.uri) throw new Error(`${file} contains a non-external image`);
    safeTextureURL(image.uri, source);
    references.set(image.uri, references.get(image.uri) || new Set());
    references.get(image.uri).add(file);
    return image.uri;
  });
  models.push({
    file,
    bytes: bytes.length,
    sourceHash: hash(bytes),
    outputHash: hash(bytes),
    byteExact: true,
    images,
  });
}

const textures = [];
for (const [uri, usedBy] of [...references].sort(([a], [b]) => a.localeCompare(b))) {
  const inputURL = safeTextureURL(uri, source);
  const outputURL = safeTextureURL(uri, destination);
  const input = await readFile(inputURL);
  const metadata = await sharp(input, { failOn: 'error' }).metadata();
  if (!metadata.width || !metadata.height || !['jpeg', 'png'].includes(metadata.format)) {
    throw new Error(`Unsupported encounter texture: ${uri}`);
  }
  const resized = Math.max(metadata.width, metadata.height) > maxTextureDimension;
  let output = input;
  if (resized) {
    let pipeline = sharp(input, { failOn: 'error' }).resize({
      width: maxTextureDimension,
      height: maxTextureDimension,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
    pipeline = metadata.format === 'png'
      ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
      : pipeline.jpeg({ quality: 95, chromaSubsampling: '4:4:4', mozjpeg: true, progressive: true });
    output = await pipeline.toBuffer();
  }
  await mkdir(new URL('./', outputURL), { recursive: true });
  await writeFile(outputURL, output);
  const result = await sharp(output, { failOn: 'error' }).metadata();
  textures.push({
    uri,
    usedBy: [...usedBy].sort(),
    format: result.format,
    source: { width: metadata.width, height: metadata.height, bytes: input.length, hash: hash(input) },
    output: { width: result.width, height: result.height, bytes: output.length, hash: hash(output) },
    resized,
  });
}

const manifest = {
  version: 1,
  description: 'Mobile encounter package with byte-exact GLBs and high-quality textures bounded to 2048 px.',
  sourceDirectory: 'encounter-models',
  maxTextureDimension,
  encoder: { name: 'sharp', version: sharp.versions.sharp, jpegQuality: 95, jpegChromaSubsampling: '4:4:4' },
  models,
  textures,
};
await writeFile(new URL('manifest.json', destination), JSON.stringify(manifest, null, 2) + '\n');

const sourceBytes = textures.reduce((sum, texture) => sum + texture.source.bytes, 0);
const outputBytes = textures.reduce((sum, texture) => sum + texture.output.bytes, 0);
console.log({
  models: models.length,
  textures: textures.length,
  maxTextureDimension,
  textureSourceMiB: (sourceBytes / 1048576).toFixed(2),
  textureOutputMiB: (outputBytes / 1048576).toFixed(2),
});
