import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('content-addressed runtime textures are immutable in the browser cache for one year', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const runtimeRule = config.headers?.find(rule => rule.source === '/assets/runtime/(.*)/textures/(.*)');
  const cacheHeader = runtimeRule?.headers?.find(header => header.key.toLowerCase() === 'cache-control');

  assert.equal(cacheHeader?.value, 'public, max-age=31536000, immutable');
  assert.equal(config.headers?.some(rule=>rule.source==='/assets/runtime/(.*)'),false,'stable GLB names must revalidate across releases');
});
