const safeSet = (param, value, time, smoothing = 0.08) => {
  try { param.setTargetAtTime(value, time, smoothing); } catch { param.value = value; }
};

export class AudioDirector {
  constructor() {
    this.context = null;
    this.master = null;
    this.music = null;
    this.ambience = null;
    this.effects = null;
    this.engine = null;
    this.gravity = null;
    this.layers = [];
    this.started = false;
    this.lastVariant = new Map();
    this.bindUnlock();
  }

  bindUnlock() {
    const unlock = () => { this.ensure(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
  }

  ensure() {
    if (this.started) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    const ctx = this.context;
    this.master = ctx.createGain(); this.master.gain.value = 0.72; this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = 0.20; this.music.connect(this.master);
    this.ambience = ctx.createGain(); this.ambience.gain.value = 0.22; this.ambience.connect(this.master);
    this.effects = ctx.createGain(); this.effects.gain.value = 0.58; this.effects.connect(this.master);
    this.engine = this.createEngine();
    this.gravity = this.createGravityBed();
    this.layers = [0,1,2,3].map((index) => this.createBiomeLayer(index));
    this.started = true;
  }

  noiseBuffer(seconds = 18) {
    const ctx = this.context; const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate); const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i += 1) { previous = previous * 0.985 + (Math.random() * 2 - 1) * 0.12; data[i] = previous * 0.42; }
    return buffer;
  }

  createBiomeLayer(index) {
    const ctx = this.context; const gain = ctx.createGain(); gain.gain.value = index === 0 ? 0.55 : 0; gain.connect(this.music);
    const noise = ctx.createBufferSource(); noise.buffer = this.noiseBuffer(20 + index * 3); noise.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = [750,520,360,620][index]; filter.Q.value = 0.7;
    noise.connect(filter); filter.connect(gain); noise.start();
    const osc = ctx.createOscillator(); osc.type = index === 2 ? "sawtooth" : "sine"; osc.frequency.value = [54,68,42,82][index];
    const oscGain = ctx.createGain(); oscGain.gain.value = [0.05,0.045,0.055,0.04][index]; osc.connect(oscGain); oscGain.connect(gain); osc.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = [0.031,0.043,0.027,0.038][index];
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.15; lfo.connect(lfoGain); lfoGain.connect(gain.gain); lfo.start();
    return { gain, noise, filter, osc };
  }

  createEngine() {
    const ctx = this.context; const out = ctx.createGain(); out.gain.value = 0; out.connect(this.ambience);
    const oscA = ctx.createOscillator(); oscA.type = "sawtooth"; oscA.frequency.value = 46;
    const oscB = ctx.createOscillator(); oscB.type = "sine"; oscB.frequency.value = 92;
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 280;
    oscA.connect(filter); oscB.connect(filter); filter.connect(out); oscA.start(); oscB.start();
    return { out, oscA, oscB, filter };
  }

  createGravityBed() {
    const ctx = this.context; const out = ctx.createGain(); out.gain.value = 0; out.connect(this.ambience);
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 34;
    const wobble = ctx.createOscillator(); wobble.frequency.value = 0.23;
    const wobbleGain = ctx.createGain(); wobbleGain.gain.value = 7; wobble.connect(wobbleGain); wobbleGain.connect(osc.frequency);
    osc.connect(out); osc.start(); wobble.start(); return { out, osc };
  }

  oneShot({ frequency = 440, duration = 0.18, type = "sine", gain = 0.12, detune = 0 }) {
    if (!this.started) return;
    const ctx = this.context; const now = ctx.currentTime;
    const osc = ctx.createOscillator(); const amp = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency * (1 + (Math.random() - 0.5) * 0.05), now); osc.detune.value = detune;
    amp.gain.setValueAtTime(0.0001, now); amp.gain.exponentialRampToValueAtTime(gain, now + 0.012); amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp); amp.connect(this.effects); osc.start(now); osc.stop(now + duration + 0.03);
  }

  event(name, intensity = 1) {
    if (!this.started) return;
    const table = {
      companion_bleep: { frequency: 720, duration: 0.10, type: "sine", gain: 0.055 },
      map_open: { frequency: 380, duration: 0.22, type: "triangle", gain: 0.07 },
      map_close: { frequency: 260, duration: 0.16, type: "triangle", gain: 0.06 },
      stabilizer_used: { frequency: 145, duration: 0.48, type: "sine", gain: 0.12 },
      gravity_first: { frequency: 78, duration: 0.65, type: "sine", gain: 0.10 },
      damage_first: { frequency: 118, duration: 0.26, type: "sawtooth", gain: 0.13 },
      gem_ready: { frequency: 520, duration: 0.72, type: "sine", gain: 0.12 },
      route_unlocked: { frequency: 640, duration: 0.52, type: "triangle", gain: 0.10 },
    };
    const spec = table[name] || { frequency: 320, duration: 0.14, type: "sine", gain: 0.05 };
    this.oneShot({ ...spec, gain: spec.gain * Math.min(1.4, Math.max(0.6, intensity / 4)) });
  }

  update({ regionIndex, speed, gravity, mapOpen, aimActive, shield }) {
    if (!this.started) return;
    const ctx = this.context; const now = ctx.currentTime;
    this.layers.forEach((layer, index) => safeSet(layer.gain.gain, index === regionIndex ? 0.58 : 0.001, now, 2.2));
    const engineGain = mapOpen ? 0.005 : Math.min(0.19, 0.015 + speed * 0.13);
    safeSet(this.engine.out.gain, engineGain, now, 0.10);
    safeSet(this.engine.oscA.frequency, 42 + speed * 86, now, 0.08);
    safeSet(this.engine.oscB.frequency, 84 + speed * 154, now, 0.08);
    safeSet(this.engine.filter.frequency, 240 + speed * 980, now, 0.12);
    safeSet(this.gravity.out.gain, mapOpen ? 0.008 : gravity * 0.18, now, 0.15);
    safeSet(this.gravity.osc.frequency, 28 + gravity * 58, now, 0.12);
    safeSet(this.music.gain, mapOpen ? 0.12 : aimActive ? 0.14 : 0.20, now, 0.35);
    safeSet(this.ambience.gain, shield < 25 ? 0.17 : 0.22, now, 0.35);
  }
}
