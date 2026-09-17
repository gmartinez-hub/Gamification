import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const runtime = new URL('../assets/runtime/', import.meta.url);
const source = new URL('encounter-models/', runtime);
const mobile = new URL('encounter-models-mobile/', runtime);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function glbJson(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
}

function imageSize(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { format: 'png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'expected PNG or JPEG texture');
  let offset = 2;
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 8 < bytes.length) {
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = bytes.readUInt16BE(offset);
    if (startOfFrame.has(marker)) {
      return { format: 'jpeg', height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    assert(length >= 2, 'invalid JPEG segment');
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

test('mobile encounter package preserves complete GLBs and caps every referenced texture at 2048 px', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', mobile)));
  assert.equal(manifest.maxTextureDimension, 2048);
  assert.deepEqual(manifest.models.map(model => model.file), ['bike.glb', 'bike-rider.glb', 'alien.glb', 'alien-ship.glb']);
  assert.equal(manifest.textures.length, 9);
  const textureRecords = new Map(manifest.textures.map(texture => [texture.uri, texture]));

  for (const model of manifest.models) {
    const original = readFileSync(new URL(model.file, source));
    const variant = readFileSync(new URL(model.file, mobile));
    assert.deepEqual(variant, original, `${model.file} must preserve all GLB bytes`);
    assert.equal(model.byteExact, true);
    assert.equal(model.sourceHash, hash(original));
    assert.equal(model.outputHash, hash(variant));
    const json = glbJson(variant);
    assert.deepEqual((json.images || []).map(image => image.uri), model.images);

    for (const image of json.images || []) {
      const sourceBytes = readFileSync(new URL(image.uri, source));
      const outputBytes = readFileSync(new URL(image.uri, mobile));
      const sourceSize = imageSize(sourceBytes);
      const outputSize = imageSize(outputBytes);
      const record = textureRecords.get(image.uri);
      assert(record, `manifest is missing ${image.uri}`);
      assert(Math.max(outputSize.width, outputSize.height) <= manifest.maxTextureDimension);
      if (Math.max(sourceSize.width, sourceSize.height) > manifest.maxTextureDimension) {
        assert.equal(Math.max(outputSize.width, outputSize.height), manifest.maxTextureDimension);
        assert.notEqual(hash(outputBytes), hash(sourceBytes));
      }
      assert.equal(record.format, outputSize.format);
      assert.deepEqual(record.source, { width: sourceSize.width, height: sourceSize.height, bytes: sourceBytes.length, hash: hash(sourceBytes) });
      assert.deepEqual(record.output, { width: outputSize.width, height: outputSize.height, bytes: outputBytes.length, hash: hash(outputBytes) });
    }
  }
});
