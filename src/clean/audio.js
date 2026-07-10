export class AudioDirector {
  constructor() {
    this.context = null;
    this.master = null;
    this.music = null;
    this.fx = null;
    this.engine = null;
    this.gravity = null;
    this.biomeLayers = [];
    this.settings = { master: 0.72, music: 0.20, fx: 0.58 };
    this.started = false;
    this.unlock = this.unlock.bind(this);
    window.addEventListener("pointerdown", this.unlock, { passive: true });
    window.addEventListener("keydown", this.unlock);
  }

  unlock() {
    if (this.started) {
      this.context?.resume?.();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    this.context = ctx;
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.fx = ctx.createGain();
    this.master.gain.value = this.settings.master;
    this.music.gain.value = this.settings.music;
    this.fx.gain.value = this.settings.fx;
    this.music.connect(this.master);
    this.fx.connect(this.master);
    this.master.connect(ctx.destination);
    this.engine = this.createEngine();
    this.gravity = this.createGravity();
    this.biomeLayers = [0, 1, 2, 3].map((index) => this.createBiome(index));
    this.started = true;
    window.removeEventListener("pointerdown", this.unlock);
    window.removeEventListener("keydown", this.unlock);
  }

  noise(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let value = 0;
    for (let index = 0; index < length; index += 1) {
      value = value * 0.988 + (Math.random() * 2 - 1) * 0.085;
      data[index] = value * 0.34;
    }
    return buffer;
  }

  createBiome(index) {
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = index === 0 ? 0.55 : 0;
    gain.connect(this.music);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noise(26 + index * 7);
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = [720, 520, 340, 610][index];
    noise.connect(filter);
    filter.connect(gain);
    noise.start();

    const oscillator = ctx.createOscillator();
    oscillator.type = index === 2 ? "triangle" : "sine";
    oscillator.frequency.value = [48, 62, 38, 76][index];
    const oscillatorGain = ctx.createGain();
    oscillatorGain.gain.value = [0.045, 0.038, 0.050, 0.040][index];
    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(gain);
    oscillator.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = [0.027, 0.041, 0.021, 0.034][index];
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.13;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    return { gain, noise, filter, oscillator };
  }

  createEngine() {
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.fx);
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = "sawtooth";
    b.type = "sine";
    a.frequency.value = 42;
    b.frequency.value = 88;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 260;
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain);
    a.start();
    b.start();
    return { gain, a, b, filter };
  }

  createGravity() {
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.fx);
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 31;
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 0.19;
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.value = 6;
    wobble.connect(wobbleGain);
    wobbleGain.connect(oscillator.frequency);
    oscillator.connect(gain);
    oscillator.start();
    wobble.start();
    return { gain, oscillator };
  }

  setParam(param, value, smoothing = 0.12) {
    if (!this.started) return;
    try {
      param.setTargetAtTime(value, this.context.currentTime, smoothing);
    } catch {
      param.value = value;
    }
  }

  applySettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (!this.started) return;
    this.setParam(this.master.gain, this.settings.master);
    this.setParam(this.music.gain, this.settings.music);
    this.setParam(this.fx.gain, this.settings.fx);
  }

  update({ region, speed, gravity, turbo, mapOpen }) {
    if (!this.started) return;
    this.biomeLayers.forEach((layer, index) => {
      this.setParam(layer.gain.gain, index === region ? 0.55 : 0.001, 2.5);
    });
    const effectiveSpeed = Math.min(1, speed + turbo * 0.5);
    this.setParam(this.engine.gain.gain, mapOpen ? 0.004 : 0.018 + effectiveSpeed * 0.15);
    this.setParam(this.engine.a.frequency, 40 + effectiveSpeed * 98);
    this.setParam(this.engine.b.frequency, 82 + effectiveSpeed * 170);
    this.setParam(this.engine.filter.frequency, 230 + effectiveSpeed * 980);
    this.setParam(this.gravity.gain.gain, mapOpen ? 0.004 : gravity * 0.24);
    this.setParam(this.gravity.oscillator.frequency, 28 + gravity * 70);
  }

  oneShot(frequency = 420, duration = 0.18, type = "sine", gain = 0.08, sweep = 0.72) {
    if (!this.started) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const amp = ctx.createGain();
    oscillator.type = type;
    const start = frequency * (1 + (Math.random() - 0.5) * 0.06);
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(36, start * sweep), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(amp);
    amp.connect(this.fx);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  event(name) {
    const events = {
      companion: [720, 0.10, "sine", 0.045, 1.12],
      scan: [520, 0.24, "triangle", 0.07, 1.45],
      stabilize: [145, 0.46, "sine", 0.10, 1.55],
      turbo: [110, 0.50, "sawtooth", 0.10, 1.75],
      hit: [118, 0.25, "sawtooth", 0.12, 0.42],
      fire: [640, 0.20, "triangle", 0.10, 0.52],
      gem: [520, 0.70, "sine", 0.12, 1.72],
      route: [680, 0.55, "triangle", 0.10, 1.45],
      mapOpen: [380, 0.20, "triangle", 0.06, 1.42],
      mapClose: [260, 0.16, "triangle", 0.05, 0.72],
      warning: [86, 0.52, "square", 0.09, 0.52],
      success: [720, 0.45, "sine", 0.09, 1.62],
      score: [520, 0.80, "triangle", 0.11, 1.92],
    };
    this.oneShot(...(events[name] || [320, 0.14, "sine", 0.05, 0.82]));
  }
}
