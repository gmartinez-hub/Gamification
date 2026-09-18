import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ignoreURL = new URL('../.vercelignore', import.meta.url);

test('Vercel excludes duplicate authoring payloads but keeps runtime model packages', async () => {
  const ignored = new Set(
    (await readFile(ignoreURL, 'utf8'))
      .split(/\r?\n/u)
      .map(line => line.trim())
      .filter(Boolean),
  );

  assert.ok(ignored.has('handoff/'));
  assert.ok(ignored.has('assets/runtime/models/'));
  assert.ok(ignored.has('gravedad_zero_unlock_asset_pack_v1/'));

  for (const runtimeDirectory of [
    'assets/runtime/streamed-models/',
    'assets/runtime/performance-lods/',
    'assets/runtime/encounter-models/',
    'assets/runtime/encounter-models-mobile/',
    'assets/runtime/mission-models/',
    'assets/runtime/closeout-models/',
  ]) {
    assert.ok(!ignored.has(runtimeDirectory), `${runtimeDirectory} must ship`);
  }
});
