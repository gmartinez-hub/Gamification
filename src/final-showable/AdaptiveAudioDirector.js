const BASE = "/assets/runtime/final-showable/audio";

export class AdaptiveAudioDirector {
  constructor() {
    this.enabled = true;
    this.currentStage = -1;
    this.ambient = null;
    this.engine = null;
    this.sfx = new Map();
    this.userUnlocked = false;
    const unlock = () => {
      this.userUnlocked = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }

  makeLoop(file, volume) {
    const audio = new Audio(`${BASE}/${file}`);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    return audio;
  }

  setStage(stageIndex, file) {
    if (!this.enabled || stageIndex === this.currentStage) return;
    this.currentStage = stageIndex;
    const next = this.makeLoop(file, 0);
    if (this.userUnlocked) next.play().catch(() => {});
    const previous = this.ambient;
    this.ambient = next;
    const start = performance.now();
    const duration = 1800;
    const fade = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      next.volume = 0.17 * t;
      if (previous) previous.volume = 0.17 * (1 - t);
      if (t < 1) requestAnimationFrame(fade);
      else previous?.pause();
    };
    fade();
  }

  updateEngine({ speed = 0, turbo = 0, gravity = 0 }) {
    const file = gravity > 0.18
      ? "engine_gravity_stress_10s.wav"
      : turbo > 0.1
        ? "engine_boost_8s.wav"
        : speed > 0.15
          ? "engine_cruise_12s.wav"
          : "engine_idle_12s.wav";
    if (this.engine?.dataset?.file === file) {
      this.engine.volume += ((0.08 + Math.min(0.09, speed * 0.08)) - this.engine.volume) * 0.08;
      return;
    }
    this.engine?.pause();
    const next = this.makeLoop(file, 0.10);
    next.dataset.file = file;
    this.engine = next;
    if (this.userUnlocked) next.play().catch(() => {});
  }

  play(name, volume = 0.22) {
    if (!this.enabled || !this.userUnlocked) return;
    const audio = new Audio(`${BASE}/${name}.wav`);
    audio.volume = volume;
    audio.play().catch(() => {});
  }
}
