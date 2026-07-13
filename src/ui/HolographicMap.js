export class HolographicMap {
  constructor({ scenarios, getState, onAudio }) {
    this.scenarios = scenarios;
    this.getState = getState;
    this.onAudio = onAudio;
    this.open = false;
    this.mode = "BIOME";

    this.root = document.createElement("div");
    this.root.id = "gzFinalMap";
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="gz-map-shell" role="dialog" aria-modal="true" aria-label="Mapa holográfico">
        <div class="gz-map-head">
          <div><span class="gz-map-kicker">NAVEGACIÓN HOLOGRÁFICA</span><strong id="gzMapTitle">MAPA</strong></div>
          <span>[TAB] BIOMA / RUTA · [M] CERRAR</span>
        </div>
        <canvas id="gzMapCanvas" width="1440" height="820"></canvas>
        <div id="gzMapFooter"></div>
      </div>`;
    document.body.appendChild(this.root);
    this.canvas = this.root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.title = this.root.querySelector("#gzMapTitle");
    this.footer = this.root.querySelector("#gzMapFooter");

    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "gz-map-trigger";
    this.trigger.textContent = "M · MAPA";
    this.trigger.setAttribute("aria-label", "Abrir mapa holográfico");
    this.trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle();
    });
    document.body.appendChild(this.trigger);
    this.installStyles();
  }

  installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #gzFinalMap{position:fixed;inset:0;z-index:9998;background:rgba(2,4,14,.88);backdrop-filter:blur(10px);padding:3vh 3vw;font-family:Inter,system-ui,sans-serif;color:#eef7ff}
      #gzFinalMap[hidden]{display:none!important}
      .gz-map-shell{height:94vh;border:1px solid rgba(105,224,255,.42);border-radius:22px;background:linear-gradient(180deg,rgba(10,17,43,.97),rgba(5,8,23,.98));box-shadow:0 0 90px rgba(122,72,255,.22);overflow:hidden}
      .gz-map-head,.gz-map-shell #gzMapFooter{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;letter-spacing:.08em;font-size:12px;color:rgba(232,244,255,.72)}
      .gz-map-head>div{display:grid;gap:4px}.gz-map-head strong{font-size:18px;color:#f4fbff}.gz-map-kicker{font-size:10px;color:#64e8ff}
      #gzMapCanvas{display:block;width:100%;height:calc(94vh - 112px);background:radial-gradient(circle at 50% 45%,rgba(50,70,160,.16),transparent 48%)}
      .gz-map-trigger{position:fixed;right:24px;bottom:24px;z-index:260;border:1px solid rgba(101,229,255,.42);border-radius:999px;padding:10px 14px;background:rgba(5,10,26,.82);color:#dffaff;font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:0 0 24px rgba(74,218,255,.12)}
      .gz-map-trigger:hover{border-color:rgba(204,116,255,.75);color:#fff}
      @media(max-width:720px){#gzFinalMap{padding:0}.gz-map-shell{height:100vh;border-radius:0}.gz-map-head{padding:14px}.gz-map-head>span{display:none}#gzMapCanvas{height:calc(100vh - 105px)}.gz-map-shell #gzMapFooter{padding:12px 14px;font-size:10px}.gz-map-trigger{right:14px;bottom:14px}}
    `;
    document.head.appendChild(style);
  }

  toggle(force) {
    this.open = typeof force === "boolean" ? force : !this.open;
    this.root.hidden = !this.open;
    this.trigger.hidden = this.open;
    this.onAudio?.(this.open ? "map_open" : "map_close");
    if (this.open) this.draw();
  }

  toggleMode() {
    if (!this.open) return;
    this.mode = this.mode === "BIOME" ? "ROUTE" : "BIOME";
    this.draw();
  }

  draw() {
    if (!this.open || !this.ctx) return;
    const state = this.getState();
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#050817";
    ctx.fillRect(0, 0, w, h);
    if (this.mode === "ROUTE") {
      this.drawRoute(state);
      return;
    }

    const scenario = this.scenarios[state.worldStageIndex];
    if (!scenario) return;
    this.title.textContent = scenario.name;
    const bounds = scenario.bounds;
    const pad = 74;
    const sx = (w - pad * 2) / Math.max(1, bounds.maxX - bounds.minX);
    const sy = (h - pad * 2) / Math.max(1, bounds.maxY - bounds.minY);
    const point = (x, y) => ({ x: pad + (x - bounds.minX) * sx, y: h - pad - (y - bounds.minY) * sy });

    ctx.strokeStyle = "rgba(94,220,255,.13)";
    ctx.lineWidth = 1;
    for (let x = pad; x <= w - pad; x += 80) { ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke(); }
    for (let y = pad; y <= h - pad; y += 80) { ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }

    for (const field of scenario.gravityFields || []) {
      const p = point(field.x, field.y);
      const r = field.radius * ((sx + sy) * 0.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(191,92,255,.22)"; ctx.lineWidth = 3; ctx.stroke();
    }

    for (const landmark of scenario.landmarks || []) {
      const p = point(landmark.x, landmark.y);
      const discovered = landmark.role === "primary" || state.discoveredLandmarkIds.includes(landmark.id);
      ctx.beginPath(); ctx.arc(p.x, p.y, landmark.role === "primary" ? 15 : 10, 0, Math.PI * 2);
      ctx.fillStyle = discovered ? (landmark.role === "primary" ? "#7feaff" : "#c86cff") : "rgba(255,255,255,.18)";
      ctx.fill();
      ctx.fillStyle = discovered ? "#eaf7ff" : "rgba(234,247,255,.38)";
      ctx.font = "600 17px system-ui";
      ctx.fillText(discovered ? landmark.name : "SEÑAL SIN IDENTIFICAR", p.x + 22, p.y + 6);
    }

    for (const gate of [scenario.backGate, scenario.gate].filter(Boolean)) {
      const p = point(gate.x, gate.y);
      ctx.strokeStyle = "#f3f6ff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y, 19, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#f3f6ff"; ctx.font = "600 14px system-ui"; ctx.fillText(gate.name, p.x + 28, p.y + 5);
    }

    const ship = point(state.worldX, state.worldY);
    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = "#79efff"; ctx.shadowBlur = 18; ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-15, -12); ctx.lineTo(-8, 0); ctx.lineTo(-15, 12); ctx.closePath(); ctx.fill(); ctx.restore();

    const discoveredCount = scenario.landmarks.filter((landmark) => landmark.role === "secondary" && state.discoveredLandmarkIds.includes(landmark.id)).length;
    const secondaryCount = scenario.landmarks.filter((landmark) => landmark.role === "secondary").length;
    this.footer.textContent = `${discoveredCount}/${secondaryCount} SECUNDARIOS · GEMAS ${Math.min(3, state.gems)}/3 · NAVE STAGE ${Math.min(3, state.shipStage + 1)}`;
  }

  drawRoute(state) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.title.textContent = "RUTA GLOBAL";
    const y = h / 2;
    const start = 170;
    const end = w - 170;
    const step = (end - start) / (this.scenarios.length - 1);
    ctx.lineWidth = 8; ctx.strokeStyle = "rgba(95,213,255,.25)";
    ctx.beginPath(); ctx.moveTo(start, y); ctx.lineTo(end, y); ctx.stroke();
    this.scenarios.forEach((scenario, index) => {
      const x = start + index * step;
      const unlocked = index <= state.highestUnlockedStage;
      ctx.beginPath(); ctx.arc(x, y, unlocked ? 34 : 24, 0, Math.PI * 2);
      ctx.fillStyle = unlocked ? (index === state.worldStageIndex ? "#ffffff" : "#7feaff") : "rgba(255,255,255,.16)";
      ctx.fill();
      ctx.fillStyle = unlocked ? "#eef7ff" : "rgba(238,247,255,.35)";
      ctx.textAlign = "center"; ctx.font = "600 18px system-ui"; ctx.fillText(scenario.name, x, y + 70);
    });
    ctx.textAlign = "left";
    this.footer.textContent = "LOS GATES CONECTAN BIOMAS DESBLOQUEADOS · LA EVOLUCIÓN DE LA NAVE PERSISTE";
  }
}
