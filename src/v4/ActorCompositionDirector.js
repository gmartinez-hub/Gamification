import { COMPOSITION_RECOVERY } from "./compositionProfiles.js";

export class ActorCompositionDirector {
  constructor({ astronautGroup, state }) {
    this.astronautGroup = astronautGroup;
    this.state = state;
    this.baseAstronautScale = null;
  }

  update() {
    if (!this.astronautGroup) return;
    if (!this.baseAstronautScale) this.baseAstronautScale = this.astronautGroup.scale.clone();
    const multiplier = this.state.controlMode === "astronaut"
      ? COMPOSITION_RECOVERY.actorAstronautScale
      : COMPOSITION_RECOVERY.actorAstronautScaleInShipMode;
    this.astronautGroup.scale.set(
      this.baseAstronautScale.x * multiplier,
      this.baseAstronautScale.y * multiplier,
      this.baseAstronautScale.z || 1,
    );
  }
}
