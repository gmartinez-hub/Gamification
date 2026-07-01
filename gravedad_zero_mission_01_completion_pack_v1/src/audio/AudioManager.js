// src/audio/AudioManager.js
// Web Audio helper for Gravedad Zero. No dependencies.

export class AudioManager {
  constructor({ manifestUrl = "./assets/audio/audio_manifest.mission01.json" } = {}) {
    this.manifestUrl = manifestUrl;
    this.ctx = null;
    this.master = null;
    this.items = new Map();
    this.buffers = new Map();
    this.loopSources = new Map();
    this.loopGains = new Map();
    this.muted = false;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
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
    const manifest = await fetch(url).then((response) => response.json());

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

    gain.gain.value = options.volume ?? item.volume ?? 0.5;
    source.connect(gain);
    gain.connect(this.master);
    source.start();

    return source;
  }

  playLoop(id, options = {}) {
    if (!this.ctx || !this.buffers.has(id)) return null;
    if (this.loopSources.has(id)) return this.loopSources.get(id);

    const item = this.items.get(id) || {};
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = this.buffers.get(id);
    source.loop = true;
    gain.gain.value = options.volume ?? item.volume ?? 0.2;

    source.connect(gain);
    gain.connect(this.master);
    source.start();

    this.loopSources.set(id, source);
    this.loopGains.set(id, gain);

    return source;
  }

  stopLoop(id, fadeMs = 250) {
    if (!this.ctx || !this.loopSources.has(id)) return;

    const source = this.loopSources.get(id);
    const gain = this.loopGains.get(id);
    const now = this.ctx.currentTime;
    const fade = fadeMs / 1000;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fade);

    setTimeout(() => {
      try { source.stop(); } catch (_) {}
      this.loopSources.delete(id);
      this.loopGains.delete(id);
    }, fadeMs + 40);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }
}
