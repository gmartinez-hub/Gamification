import { V4_TUNING } from "./config.js";

export class AstronautRecovery {
  constructor({ state, astronautState, astronautGroup, aimAssist, enterShipMode }) {
    this.state = state;
    this.astronautState = astronautState;
    this.astronautGroup = astronautGroup;
    this.aimAssist = aimAssist;
    this.enterShipMode = enterShipMode;
    this.lastStage = null;
  }

  constrainInput(targetVelocity) {
    if (this.state.controlMode !== "astronaut") return;
    const dx = this.astronautState.position.x - this.state.position.x;
    const dy = this.astronautState.position.y - this.state.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance < V4_TUNING.astronautMaxDistance * 0.96) return;
    const nx = dx / Math.max(1e-6, distance);
    const ny = dy / Math.max(1e-6, distance);
    const outward = targetVelocity.x * nx + targetVelocity.y * ny;
    if (outward > 0) {
      targetVelocity.x -= nx * outward;
      targetVelocity.y -= ny * outward;
    }
  }

  update({ delta, stageIndex }) {
    if (this.lastStage === null) this.lastStage = stageIndex;
    if (stageIndex !== this.lastStage) {
      this.lastStage = stageIndex;
      this.astronautGroup.rotation.set(0, 0, 0);
      if (this.state.controlMode === "astronaut") this.enterShipMode?.();
    }

    const dx = this.astronautState.position.x - this.state.position.x;
    const dy = this.astronautState.position.y - this.state.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist > V4_TUNING.astronautMaxDistance) {
      const scale = V4_TUNING.astronautMaxDistance / Math.max(1e-6, dist);
      this.astronautState.position.x = this.state.position.x + dx * scale;
      this.astronautState.position.y = this.state.position.y + dy * scale;
    }

    if (!this.aimAssist.active) {
      const blend = 1 - Math.exp(-8.5 * delta);
      this.astronautGroup.rotation.x += (0 - this.astronautGroup.rotation.x) * blend;
      this.astronautGroup.rotation.y += (0 - this.astronautGroup.rotation.y) * blend;
      this.astronautGroup.rotation.z += (0 - this.astronautGroup.rotation.z) * blend;
    }
  }
}
