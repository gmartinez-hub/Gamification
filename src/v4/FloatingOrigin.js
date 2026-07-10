import { V4_TUNING } from "./config.js";

export class FloatingOrigin {
  constructor() {
    this.origin = { x: 0, y: 0 };
    this.player = { x: 0, y: 0 };
  }

  update(playerWorld) {
    this.player.x = playerWorld.x;
    this.player.y = playerWorld.y;
    if (Math.hypot(playerWorld.x - this.origin.x, playerWorld.y - this.origin.y) > 48) {
      this.origin.x = Math.round(playerWorld.x / 32) * 32;
      this.origin.y = Math.round(playerWorld.y / 32) * 32;
    }
  }

  toRender(global, anchor = { x: 0, y: 0 }) {
    return {
      x: anchor.x + (global.x - this.player.x) * V4_TUNING.worldToScreen,
      y: anchor.y + (global.y - this.player.y) * V4_TUNING.worldToScreen,
    };
  }
}
