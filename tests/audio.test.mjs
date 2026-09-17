import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createExpeditionAudio } from '../src/lowpoly/audio.js';

// Exercise the real mixer and real repository WAVs; only browser Web Audio
// nodes are simulated. The file transport substitutes for browser HTTP.
class Param {
  constructor(value = 1) { this.value = value; this.targets = []; }
  setValueAtTime(value) { this.value = value; this.targets.push(value); }
  setTargetAtTime(value) { this.value = value; this.targets.push(value); }
  linearRampToValueAtTime(value) { this.value = value; this.targets.push(value); }
  cancelScheduledValues() {}
}

function audioBoundary(t, { missing = '', failStart = false, decodeGate } = {}) {
  const contexts = [], names = new WeakMap(), loads = [];
  class Node {
    constructor() { this.connections = []; }
    connect(node) { this.connections.push(node); return node; }
    disconnect() { this.connections = []; }
  }
  class Context {
    constructor() {
      contexts.push(this); this.state = 'suspended'; this.currentTime = 0;
      this.sampleRate = 44100; this.destination = new Node(); this.sources = []; this.filters = [];
    }
    createGain() { const node = new Node(); node.gain = new Param(); return node; }
    createBiquadFilter() {
      const node = new Node(); node.frequency = new Param(22000); node.Q = new Param(1);
      this.filters.push(node); return node;
    }
    createDynamicsCompressor() {
      const node = new Node();
      for (const name of ['threshold', 'knee', 'ratio', 'attack', 'release']) node[name] = new Param();
      return node;
    }
    createBufferSource() {
      const node = new Node(); node.playbackRate = new Param();
      node.start = () => { if (failStart) throw new Error('Output unavailable'); node.started = true; };
      node.stop = () => { node.stopped = true; node.onended?.(); };
      this.sources.push(node); return node;
    }
    async decodeAudioData(bytes) {
      if (decodeGate) await decodeGate;
      const data = new DataView(bytes);
      assert.equal(data.getUint32(0), 0x52494646, 'load an actual RIFF WAV');
      return { duration: (bytes.byteLength - 44) / 88200, name: names.get(bytes) };
    }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  }
  t.mock.method(globalThis, 'fetch', async (url) => {
    const name = new URL(url).pathname.split('/').pop(); loads.push(name);
    if (name === missing) throw new Error('Missing individual WAV');
    const file = await readFile(new URL(url));
    const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    names.set(bytes, name);
    return { ok: true, arrayBuffer: async () => bytes };
  });
  const original = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  t.after(() => { if (original === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = original; });
  return { contexts, loads, active: () => contexts.flatMap(c => c.sources.filter(s => s.started && !s.stopped)) };
}

test('audio fetch and decode are queued instead of starting every sound together', async t => {
  const boundary=audioBoundary(t);
  const fetchAsset=globalThis.fetch;
  let active=0,maximum=0;
  t.mock.method(globalThis,'fetch',async (...args)=>{
    maximum=Math.max(maximum,++active);
    await new Promise(resolve=>setTimeout(resolve,2));
    const response=await fetchAsset(...args);
    active--; return response;
  });
  const audio=createExpeditionAudio();audio.setEnabled(true);
  await audio.unlock();
  assert(maximum<=3,'bounded audio requests leave decoding headroom for models');
  assert(boundary.loads.length>20,'all common mission cues remain available');
  assert.equal(audio.play('slowEnter'),true);
  audio.dispose();
});

test('factory stays silent and does not create browser audio before gesture unlock', async t => {
  const boundary = audioBoundary(t), audio = createExpeditionAudio();
  audio.setEnabled(true); audio.update({ actor: 'ship', thrust: 1, boost: true });
  assert.equal(audio.play('shipFire'), false);
  assert.equal(boundary.contexts.length, 0);
  assert.equal(boundary.loads.length, 0);
  assert.equal(await audio.unlock(), true);
  assert.equal(boundary.contexts.length, 1);
  audio.dispose();
});

test('one missing WAV does not prevent other effects or ambience after unlock', async t => {
  const boundary = audioBoundary(t, { missing: 'small_asteroid_hit_03.wav' });
  const audio = createExpeditionAudio(); audio.setEnabled(true);
  assert.equal(await audio.unlock(), true);
  assert.equal(audio.play('smallHit'), false);
  assert.equal(audio.play('smallBreak'), true);
  assert.ok(boundary.active().some(s => s.buffer.name === 'small_asteroid_break_04.wav'));
  assert.ok(boundary.active().some(s => s.loop && s.buffer.name === 'ambient_space_low_loop_14.wav'));
  audio.dispose();
});

test('pause, disable and concurrent gesture unlocks never duplicate loop ownership', async t => {
  const boundary = audioBoundary(t), audio = createExpeditionAudio(); audio.setEnabled(true);
  await Promise.all([audio.unlock(), audio.unlock()]);
  const count = boundary.active().filter(s => s.loop).length;
  assert.ok(count > 0 && count <= 6);
  await audio.unlock(); assert.equal(boundary.active().filter(s => s.loop).length, count);
  audio.setPaused(true);
  assert.equal(boundary.active().length, 0);
  assert.equal(audio.play('ui'), false);
  audio.setPaused(false); await audio.unlock();
  assert.equal(boundary.active().filter(s => s.loop).length, count);
  audio.setEnabled(false); assert.equal(boundary.active().length, 0);
  audio.setEnabled(true); await audio.unlock();
  assert.equal(boundary.active().filter(s => s.loop).length, count);
  audio.dispose(); assert.equal(boundary.active().length, 0);
  assert.equal(await audio.unlock(), false);
});

test('ship motor follows actual thrust and fades away in EVA and during coasting', async t => {
  const boundary = audioBoundary(t), audio = createExpeditionAudio(); audio.setEnabled(true); await audio.unlock();
  const motor = () => boundary.active().find(s => s.buffer.name === 'engine_move_clean_loop_06.wav');
  audio.update({ actor: 'ship', thrust: 1, boost: false, firstPerson: false });
  const powered = motor().connections[0].gain.value;
  assert.ok(powered > 0);
  audio.update({ actor: 'ship', thrust: 0, velocity: 999, boost: true });
  assert.equal(motor().connections[0].gain.value, 0, 'coasting is not engine thrust');
  audio.update({ actor: 'eva', thrust: 1, boost: true, firstPerson: true });
  assert.equal(motor().connections[0].gain.value, 0, 'EVA must not sound like the ship engine');
  assert.ok(boundary.contexts[0].filters.some(f => f.frequency.value < 16000));
  audio.dispose();
});

test('alert debounce and total voice limit prevent overlapping bursts from growing without bound', async t => {
  const boundary = audioBoundary(t), audio = createExpeditionAudio(); audio.setEnabled(true); await audio.unlock();
  assert.equal(audio.play('warning'), true); assert.equal(audio.play('warning'), false);
  assert.equal(audio.play('constructor'), false, 'unknown event names never enter playback');
  const events = ['ui', 'target', 'scan', 'evaFire', 'shipFire', 'smallHit', 'smallBreak', 'largeHit', 'largeBreak', 'damage', 'gemReveal'];
  for (const event of events) audio.play(event);
  assert.ok(boundary.active().filter(s => !s.loop).length <= 8);
  const newest = boundary.active().filter(s => !s.loop).at(-1);
  newest.onended(); assert.equal(newest.connections.length, 0, 'finished sources disconnect');
  boundary.contexts[0].currentTime += 3;
  assert.equal(audio.play('warning'), true);
  audio.dispose();
});

test('failed playback and browser resume failures do not escape into game code', async t => {
  const boundary = audioBoundary(t, { failStart: true }), audio = createExpeditionAudio();
  audio.setEnabled(true); await audio.unlock();
  assert.doesNotThrow(() => audio.update({ actor: 'ship', thrust: 1 }));
  assert.equal(audio.play('damage'), false);
  assert.equal(boundary.active().length, 0);
  audio.setPaused(true); audio.setPaused(false);
  boundary.contexts[0].resume = async () => { throw new Error('Browser blocked resume'); };
  assert.equal(await audio.unlock(), false);
  assert.doesNotThrow(() => audio.dispose());
});

test('volume controls remain independent and mission cues temporarily duck ambience', async t => {
  const boundary = audioBoundary(t), audio = createExpeditionAudio(); audio.setEnabled(true); await audio.unlock();
  audio.setVolumes({ effects: .4, ambience: .8 });
  const space = boundary.active().find(s => s.buffer.name === 'ambient_space_low_loop_14.wav');
  const ambientBus = space.connections[0].connections[0];
  assert.equal(ambientBus.gain.value, .8);
  assert.equal(audio.play('complete'), true);
  const cue = boundary.active().find(s => !s.loop);
  assert.equal(cue.connections[0].connections[0].gain.value, .4);
  assert.ok(ambientBus.gain.value < .4, 'important cue leaves room in ambience');
  boundary.contexts[0].currentTime = 3; audio.update({ biome: 'umbra' });
  assert.equal(ambientBus.gain.value, .8, 'duck releases after the cue');
  assert.ok(space.playbackRate.value < 1, 'biome changes the underlying ambience');
  audio.setVolumes({ effects: 0, ambience: 99 });
  assert.equal(cue.connections[0].connections[0].gain.value, 0);
  assert.equal(ambientBus.gain.value, 1);
  audio.dispose();
});

test('pause remains silent until a new gesture unlock and disposal cancels pending audio', async t => {
  let release;
  const decodeGate = new Promise(resolve => { release = resolve; });
  const boundary = audioBoundary(t, { decodeGate }), audio = createExpeditionAudio(); audio.setEnabled(true);
  const unlocking = audio.unlock();
  audio.setPaused(true); audio.setPaused(false); audio.update({ actor: 'ship', thrust: 1 });
  assert.equal(boundary.contexts[0].state, 'suspended', 'only unlock may resume a browser context');
  audio.dispose(); release();
  assert.equal(await unlocking, false);
  assert.equal(boundary.active().length, 0);
  assert.equal(boundary.contexts[0].state, 'closed');
});

test('a resume gesture during the first WAV load resumes audio without requiring another interaction', async t => {
  let release;
  const decodeGate = new Promise(resolve => { release = resolve; });
  const boundary = audioBoundary(t, { decodeGate }), audio = createExpeditionAudio(); audio.setEnabled(true);
  const firstUnlock = audio.unlock();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(boundary.loads.length > 0, 'initial WAV loading is still in progress');
  audio.setPaused(true); audio.setPaused(false);
  const resumed = audio.unlock();
  release();
  assert.equal(await resumed, true, 'the resume gesture owns its own browser resume');
  await firstUnlock;
  assert.equal(boundary.contexts[0].state, 'running');
  const loops = boundary.active().filter(source => source.loop);
  assert.equal(loops.length, 6);
  assert.equal(new Set(loops.map(source => source.buffer.name)).size, 6, 'concurrent loads cannot duplicate loops');
  assert.equal(new Set(boundary.loads).size, boundary.loads.length, 'resume reuses the original asset downloads');
  audio.dispose();
});

test('a partial browser audio graph failure is cleaned up and a later gesture can retry', async t => {
  const boundary = audioBoundary(t), audio = createExpeditionAudio(); audio.setEnabled(true);
  const createGain = globalThis.AudioContext.prototype.createGain;
  globalThis.AudioContext.prototype.createGain = () => { throw new Error('Device unavailable'); };
  assert.equal(await audio.unlock(), false);
  assert.equal(boundary.contexts[0].state, 'closed', 'failed context releases its output device');
  globalThis.AudioContext.prototype.createGain = createGain;
  assert.equal(await audio.unlock(), true);
  assert.ok(boundary.active().some(s => s.loop));
  audio.dispose();
});
test('a later gesture retries offline audio while concurrent unlocks share one retry',async t=>{
 const boundary=audioBoundary(t),fetchFile=globalThis.fetch;let offline=true,requests=0;
 t.mock.method(globalThis,'fetch',async(...args)=>{requests++;if(offline)throw Error('offline');return fetchFile(...args);});
 const audio=createExpeditionAudio();audio.setEnabled(true);assert.equal(await audio.unlock(),false);const failedRequests=requests;
 offline=false;assert.deepEqual(await Promise.all([audio.unlock(),audio.unlock()]),[true,true]);
 assert.equal(requests,failedRequests*2);assert.equal(audio.play('shipFire'),true);assert.equal(boundary.active().filter(s=>s.loop).length,6);audio.dispose();
});
test('audio retry requests only absent samples and preserves decoded cues',async t=>{
 const boundary=audioBoundary(t),fetchFile=globalThis.fetch;let missing=true;const requested=[];
 t.mock.method(globalThis,'fetch',async(url,...args)=>{const name=new URL(url).pathname.split('/').pop();requested.push(name);if(missing&&name==='small_asteroid_hit_03.wav')throw Error('temporary');return fetchFile(url,...args);});
 const audio=createExpeditionAudio();audio.setEnabled(true);assert.equal(await audio.unlock(),true);assert.equal(audio.play('smallHit'),false);assert.equal(audio.play('smallBreak'),true);
 const before=requested.length;missing=false;assert.equal(await audio.unlock(),true);assert.deepEqual(requested.slice(before),['small_asteroid_hit_03.wav']);assert.equal(audio.play('smallHit'),true);
 const allLoaded=requested.length;await audio.unlock();assert.equal(requested.length,allLoaded);assert.equal(boundary.active().filter(s=>s.loop).length,6);audio.dispose();
});
