import { COMPANION_MESSAGES, REGIONS, V4_TUNING } from "./config.js";
import { nearestRegionIndex, parseShieldPercent } from "./utils.js";

export class CompanionDirector {
  constructor({ state, mission01, robotCompanion, dom, updateRobotPanel, audioEvent }) {
    this.state = state;
    this.mission01 = mission01;
    this.robotCompanion = robotCompanion;
    this.dom = dom;
    this.updateRobotPanel = updateRobotPanel;
    this.audioEvent = audioEvent;
    this.queue = [];
    this.current = null;
    this.currentUntil = 0;
    this.lastNormalAt = -Infinity;
    this.seen = new Set();
    this.previousShield = parseShieldPercent(dom.shieldHud);
    this.previousRegion = nearestRegionIndex(state.worldOffset, REGIONS);
    this.previousRelic = mission01.relicState;
    this.previousGems = mission01.gems;
    this.build();
  }

  build() {
    this.root = document.createElement("div");
    this.root.className = "v4-companion-toast";
    this.root.hidden = true;
    this.root.innerHTML = `<img alt="Companion"/><div><strong></strong><span></span></div>`;
    document.body.appendChild(this.root);
    this.face = this.root.querySelector("img");
    this.title = this.root.querySelector("strong");
    this.detail = this.root.querySelector("span");
  }

  emit(key, options = {}) {
    const message = COMPANION_MESSAGES[key];
    if (!message) return;
    if (options.once !== false && this.seen.has(key)) return;
    if (options.once !== false) this.seen.add(key);
    this.queue.push({ key, ...message, at: performance.now() / 1000 });
    this.queue.sort((a, b) => b.priority - a.priority || a.at - b.at);
  }

  show(message, now) {
    this.current = message;
    this.currentUntil = now + (message.priority >= 7 ? 5.5 : 4.2);
    this.root.hidden = false;
    this.root.dataset.face = message.face;
    this.face.src = `/assets/runtime/v4/companion/face_${message.face}.png`;
    this.title.textContent = message.text;
    this.detail.textContent = message.detail;
    this.robotCompanion.message = message.text;
    this.robotCompanion.faceState = ["success", "alert", "talk", "blink", "idle"].includes(message.face) ? message.face : "alert";
    this.robotCompanion.pulse = 1;
    this.robotCompanion.focus = "v4";
    this.robotCompanion.focusTimer = 4.5;
    if (message.priority >= 7) this.robotCompanion.panelOpen = true;
    this.updateRobotPanel?.();
    this.audioEvent?.("companion_bleep", message.priority);
    if (message.priority < 7) this.lastNormalAt = now;
  }

  observe({ elapsed, gravity, scanning }) {
    const shield = parseShieldPercent(this.dom.shieldHud);
    if (shield < this.previousShield - 0.5) this.emit("damage_first");
    if (shield <= 25) this.emit("shield_low");
    this.previousShield = shield;

    if (gravity?.magnitude > 0.055) this.emit("gravity_first");
    if (scanning) this.emit("scan_first");

    const region = nearestRegionIndex(this.state.worldOffset, REGIONS);
    if (region !== this.previousRegion) {
      this.previousRegion = region;
      if (region === 1) this.emit("region_mechanical");
      if (region === 2) this.emit("region_synthetic");
      if (region === 3) this.emit("region_relic");
    }

    if (this.mission01.relicState === "collectible" && this.previousRelic !== "collectible") this.emit("gem_ready", { once: false });
    this.previousRelic = this.mission01.relicState;
    if (this.mission01.gems > this.previousGems) this.emit("route_unlocked", { once: false });
    this.previousGems = this.mission01.gems;

    if (this.current && elapsed >= this.currentUntil) {
      this.current = null; this.root.hidden = true;
    }
    if (!this.current && this.queue.length) {
      const next = this.queue[0];
      if (next.priority >= 7 || elapsed - this.lastNormalAt >= V4_TUNING.companionNormalCooldown) {
        this.queue.shift(); this.show(next, elapsed);
      }
    }
  }
}
