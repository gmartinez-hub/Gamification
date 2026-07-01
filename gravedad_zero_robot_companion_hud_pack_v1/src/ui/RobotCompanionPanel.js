// src/ui/RobotCompanionPanel.js
// HTML/CSS panel wrapper. Text should remain HTML, not Three, for legibility.

export class RobotCompanionPanel {
  constructor(root) {
    this.root = root;
  }

  show({ message, counters } = {}) {
    this.root.hidden = false;
    const msg = this.root.querySelector("[data-robot-message]");
    if (msg && message) msg.textContent = message;

    if (counters) this.updateCounters(counters);
  }

  hide() {
    this.root.hidden = true;
  }

  updateCounters(counters) {
    for (const [key, value] of Object.entries(counters)) {
      const el = this.root.querySelector(`[data-counter="${key}"]`);
      if (el) el.textContent = `${value.current}/${value.total}`;
    }
  }
}
