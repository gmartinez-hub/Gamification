import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('frame loop drives world and ship LOD with hero inspection overrides', async () => {
  const source=await readFile(new URL('../src/lowpoly/main.js',import.meta.url),'utf8');
  assert.match(source,/world\.updateLOD\(camera,\{heroId:selectedId,forceHigh:heroQuality\}\)/);
  assert.match(source,/ship\.updateLOD\(camera\.position,\{forceHigh:heroQuality\}\)/);
});
