export class CameraDirector {
  constructor({ camera }) {
    this.camera = camera;
    this.mode = "EXPLORATION";
    this.timer = 0;
    this.lookAhead = { x: 0, y: 0 };
    this.impulse = 0;
    this.base = { x: camera.position.x, y: camera.position.y, zoom: camera.zoom || 1 };
  }

  cue(mode, duration = 1.5, intensity = 1) {
    this.mode = mode;
    this.timer = Math.max(this.timer, duration);
    this.impulse = Math.max(this.impulse, intensity);
  }

  update({ rawDelta, velocity, transitionActive, gravityMagnitude = 0 }) {
    this.timer = Math.max(0, this.timer - rawDelta);
    if (this.timer <= 0 && !transitionActive) this.mode = "EXPLORATION";

    const vx = velocity?.x || 0;
    const vy = velocity?.y || 0;
    this.lookAhead.x += (vx * 0.11 - this.lookAhead.x) * (1 - Math.pow(0.002, rawDelta));
    this.lookAhead.y += (vy * 0.09 - this.lookAhead.y) * (1 - Math.pow(0.002, rawDelta));

    const transitionZoom = transitionActive ? 0.92 : 1;
    const gravityZoom = 1 - Math.min(0.045, gravityMagnitude * 0.08);
    const targetZoom = this.base.zoom * transitionZoom * gravityZoom;

    this.camera.position.x += (this.base.x + this.lookAhead.x - this.camera.position.x) * 0.08;
    this.camera.position.y += (this.base.y + this.lookAhead.y - this.camera.position.y) * 0.08;
    if (typeof this.camera.zoom === "number") {
      this.camera.zoom += (targetZoom - this.camera.zoom) * 0.08;
      this.camera.updateProjectionMatrix?.();
    }
    this.impulse *= Math.pow(0.08, rawDelta);
  }
}
