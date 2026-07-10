import { REGIONS, ROUTES, GRAVITY_FIELDS, V4_TUNING } from "./config.js";
import { clamp } from "./utils.js";

export class HolographicMap {
  constructor({ state, mission01, onEvent }) {
    this.state = state;
    this.mission01 = mission01;
    this.onEvent = onEvent;
    this.open = false;
    this.firstOpened = false;
    this.build();
    this.bind();
  }

  build() {
    this.root = document.createElement("div");
    this.root.className = "v4-map";
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="v4-map-frame">
        <header><span>MAPA HOLOGRÁFICO</span><small>M · CERRAR</small></header>
        <canvas width="960" height="620"></canvas>
        <footer>Las señales no escaneadas permanecen ocultas · No hay viaje rápido</footer>
      </div>`;
    document.body.appendChild(this.root);
    this.canvas = this.root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.hint = document.createElement("button");
    this.hint.type = "button";
    this.hint.className = "v4-map-hint";
    this.hint.textContent = "M · MAPA";
    document.body.appendChild(this.hint);
    this.hint.addEventListener("click", () => this.toggle());
  }

  bind() {
    window.addEventListener("keydown", (event) => {
      if (event.key?.toLowerCase() !== V4_TUNING.mapKey || event.repeat) return;
      event.preventDefault();
      this.toggle();
    });
  }

  toggle(force) {
    this.open = typeof force === "boolean" ? force : !this.open;
    this.root.hidden = !this.open;
    document.body.classList.toggle("v4-map-open", this.open);
    if (this.open && !this.firstOpened) {
      this.firstOpened = true;
      this.onEvent?.("map_first");
    }
    this.onEvent?.(this.open ? "map_open" : "map_close", { silent: true });
    this.draw();
  }

  worldBounds() {
    const xs = REGIONS.map((r) => r.center.x);
    const ys = REGIONS.map((r) => r.center.y);
    return { minX: Math.min(...xs) - 45, maxX: Math.max(...xs) + 45, minY: Math.min(...ys) - 38, maxY: Math.max(...ys) + 38 };
  }

  project(point) {
    const b = this.worldBounds();
    const pad = 72;
    return {
      x: pad + ((point.x - b.minX) / (b.maxX - b.minX)) * (this.canvas.width - pad * 2),
      y: this.canvas.height - pad - ((point.y - b.minY) / (b.maxY - b.minY)) * (this.canvas.height - pad * 2),
    };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.62);
    gradient.addColorStop(0, "rgba(19,35,74,.94)"); gradient.addColorStop(1, "rgba(3,7,23,.98)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(92,232,255,.10)"; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const unlocked = clamp(Math.max(this.mission01.gems, this.mission01.currentStageIndex), 0, 3);
    for (const route of ROUTES) {
      const a = this.project(REGIONS[route.from].center); const b = this.project(REGIONS[route.to].center);
      const open = this.mission01.gems >= route.unlockGem;
      ctx.strokeStyle = open ? "rgba(92,232,255,.64)" : "rgba(173,92,255,.20)";
      ctx.setLineDash(open ? [10, 8] : [3, 12]); ctx.lineWidth = open ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    }

    GRAVITY_FIELDS.forEach((field) => {
      if (field.stage > unlocked) return;
      const p = this.project(field); const radius = 12 + field.radius * 0.42;
      ctx.strokeStyle = field.type === "repel" || field.type === "pulse" ? "rgba(239,79,255,.25)" : "rgba(76,231,255,.22)";
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.stroke();
    });

    REGIONS.forEach((region, index) => {
      if (index > unlocked + 1) return;
      const p = this.project(region.center);
      const discovered = index <= unlocked;
      ctx.beginPath(); ctx.arc(p.x, p.y, discovered ? 23 : 16, 0, Math.PI * 2);
      ctx.fillStyle = discovered ? "rgba(35,217,255,.18)" : "rgba(142,73,255,.10)"; ctx.fill();
      ctx.strokeStyle = discovered ? region.light.primary : "rgba(170,92,255,.35)"; ctx.lineWidth = discovered ? 3 : 2; ctx.stroke();
      ctx.fillStyle = discovered ? "#f5f7ff" : "rgba(230,220,255,.45)";
      ctx.font = "600 15px system-ui"; ctx.textAlign = "center"; ctx.fillText(discovered ? region.name : "REGIÓN BLOQUEADA", p.x, p.y + 44);
      if (discovered) {
        const l = this.project(region.landmark); ctx.fillStyle = region.light.secondary;
        ctx.beginPath(); ctx.moveTo(l.x, l.y - 8); ctx.lineTo(l.x + 8, l.y); ctx.lineTo(l.x, l.y + 8); ctx.lineTo(l.x - 8, l.y); ctx.closePath(); ctx.fill();
      }
    });

    const player = this.project(this.state.worldOffset);
    ctx.save(); ctx.translate(player.x, player.y); ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#5ce9ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 10); ctx.lineTo(0, 6); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  update() { if (this.open) this.draw(); }
}
