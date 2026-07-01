// AudioManager.js — suggested integration for Nave Gamification
// Plain Web Audio API. No dependencies.

export class AudioManager {
  constructor({ manifestUrl = './assets/audio/audio_manifest.json' } = {}) {
    this.manifestUrl = manifestUrl;
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.items = new Map();
    this.engineSources = new Map();
    this.engineGains = new Map();
    this.currentEngineState = null;
    this.muted = false;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
  }

  async preloadManifest(url = this.manifestUrl) {
    await this.init();
    const manifest = await fetch(url).then((r) => r.json());

    for (const item of manifest.assets) {
      this.items.set(item.id, item);
      const response = await fetch(`./assets/audio/${item.file}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(item.id, audioBuffer);
    }
  }

  playOneShot(id, options = {}) {
    if (!this.ctx || !this.buffers.has(id)) return null;

    const item = this.items.get(id) || {};
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = this.buffers.get(id);
    source.loop = false;

    const volume = options.volume ?? item.volume ?? 0.5;
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.master);
    source.start();

    return source;
  }

  setEngineState(state, { fadeMs = 320 } = {}) {
    if (!this.ctx) return;

    const map = {
      idle: 'engine_idle',
      move: 'engine_move',
      boost: 'engine_boost',
    };

    const targetId = map[state];
    if (!targetId || !this.buffers.has(targetId)) return;

    const now = this.ctx.currentTime;
    const fade = fadeMs / 1000;

    for (const [id, gain] of this.engineGains.entries()) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(id === targetId ? (this.items.get(id)?.volume ?? 0.25) : 0, now + fade);
    }

    if (!this.engineSources.has(targetId)) {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = this.buffers.get(targetId);
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.master);
      source.start();

      this.engineSources.set(targetId, source);
      this.engineGains.set(targetId, gain);

      gain.gain.linearRampToValueAtTime(this.items.get(targetId)?.volume ?? 0.25, now + fade);
    }

    this.currentEngineState = state;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : 1;
    }
  }
}
