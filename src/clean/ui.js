import { REGIONS, ROUTES } from "./config.js";

export class UI {
  constructor() {
    document.body.innerHTML = `
      <canvas id="gz-scene"></canvas>
      <div class="gz-hud">
        <div class="gz-top-left">
          <div class="gz-gems"><span>◇◇◇</span> GEMAS <strong>0/3</strong></div>
          <div class="gz-mission"><small>OBJETIVO ACTUAL</small><strong></strong><span></span></div>
        </div>
        <div class="gz-route" hidden><span class="gz-route-arrow">▲</span><div><strong>RUMBO</strong><small></small></div></div>
        <div class="gz-companion">
          <img src="/assets/runtime/gravedad-zero/companion/companion_face_idle_2048.png" alt="Companion">
          <div class="gz-companion-message" hidden><strong></strong><span></span></div>
        </div>
        <div class="gz-bottom-left">
          <strong class="gz-region"></strong>
          <div class="gz-shield">ESCUDO <span><i></i></span><b>100%</b></div>
          <div class="gz-bonus" hidden></div>
        </div>
        <div class="gz-controls">
          <span><kbd>E</kbd> SCAN</span><span><kbd>SPACE</kbd> ESTABILIZAR</span><span><kbd>F</kbd> TURBO</span><span><kbd>M</kbd> MAPA</span><span><kbd>TAB</kbd> EVA</span>
        </div>
        <div class="gz-gravity" hidden><i></i></div>
        <div class="gz-scanner-state" hidden></div>
        <div class="gz-event" hidden><small>EVENTO AMBIENTAL</small><strong></strong><span></span></div>
        <button class="gz-map-button">M · MAPA</button>
        <button class="gz-settings-button" aria-label="Ajustes">☰</button>
      </div>
      <div class="gz-map" hidden>
        <div class="gz-map-card">
          <header><strong>MAPA HOLOGRÁFICO</strong><span>M · CERRAR</span></header>
          <canvas width="960" height="620"></canvas>
          <footer>Sin viaje rápido · Sólo elementos descubiertos</footer>
        </div>
      </div>
      <div class="gz-settings" hidden>
        <div class="gz-settings-card">
          <header><strong>AJUSTES</strong><button data-close>×</button></header>
          <label>VOLUMEN GENERAL <input data-setting="master" type="range" min="0" max="1" step=".01" value=".72"></label>
          <label>MÚSICA <input data-setting="music" type="range" min="0" max=".5" step=".01" value=".20"></label>
          <label>FX <input data-setting="fx" type="range" min="0" max="1" step=".01" value=".58"></label>
          <label>INTENSIDAD DE CÁMARA <input data-setting="camera" type="range" min="0" max="1.4" step=".05" value="1"></label>
          <label class="toggle"><input data-setting="reduceMotion" type="checkbox"> REDUCIR MOVIMIENTO</label>
          <label class="toggle"><input data-setting="flashes" type="checkbox" checked> FLASHES</label>
          <label class="toggle"><input data-setting="bloom" type="checkbox" checked> BLOOM</label>
          <label>CALIDAD <select data-setting="quality"><option value="high">ALTA</option><option value="medium">MEDIA</option><option value="low">BAJA</option></select></label>
          <button data-action="fullscreen">PANTALLA COMPLETA</button>
        </div>
      </div>
      <div class="gz-score" hidden>
        <div class="gz-score-card">
          <small>GRAVEDAD ZERO</small><h2>MISIÓN COMPLETADA</h2>
          <div class="gz-grade"></div><dl></dl>
          <button data-restart>REINICIAR</button>
        </div>
      </div>
    `;
    this.canvas = document.querySelector("#gz-scene");
    this.gems = document.querySelector(".gz-gems strong");
    this.missionTitle = document.querySelector(".gz-mission strong");
    this.missionDetail = document.querySelector(".gz-mission span");
    this.region = document.querySelector(".gz-region");
    this.shieldBar = document.querySelector(".gz-shield i");
    this.shieldText = document.querySelector(".gz-shield b");
    this.route = document.querySelector(".gz-route");
    this.routeArrow = document.querySelector(".gz-route-arrow");
    this.routeText = document.querySelector(".gz-route small");
    this.companion = document.querySelector(".gz-companion-message");
    this.companionTitle = this.companion.querySelector("strong");
    this.companionDetail = this.companion.querySelector("span");
    this.gravity = document.querySelector(".gz-gravity");
    this.gravityArrow = this.gravity.querySelector("i");
    this.scanner = document.querySelector(".gz-scanner-state");
    this.event = document.querySelector(".gz-event");
    this.eventTitle = this.event.querySelector("strong");
    this.eventDetail = this.event.querySelector("span");
    this.bonus = document.querySelector(".gz-bonus");
    this.map = document.querySelector(".gz-map");
    this.mapCanvas = this.map.querySelector("canvas");
    this.mapContext = this.mapCanvas.getContext("2d");
    this.settings = document.querySelector(".gz-settings");
    this.score = document.querySelector(".gz-score");
    this.messageUntil = 0;
    this.messagePriority = -1;
    this.mapOpen = false;
    this.settingsOpen = false;
    this.bind();
  }

  bind() {
    document.querySelector(".gz-map-button").addEventListener("click", () => this.toggleMap());
    document.querySelector(".gz-settings-button").addEventListener("click", () => this.toggleSettings());
    this.settings.querySelector("[data-close]").addEventListener("click", () => this.toggleSettings(false));
    this.score.querySelector("[data-restart]").addEventListener("click", () => location.reload());
    this.settings.querySelector("[data-action='fullscreen']").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.();
    });
  }

  toggleMap(force) {
    this.mapOpen = typeof force === "boolean" ? force : !this.mapOpen;
    this.map.hidden = !this.mapOpen;
    document.body.classList.toggle("gz-map-open", this.mapOpen);
  }

  toggleSettings(force) {
    this.settingsOpen = typeof force === "boolean" ? force : !this.settingsOpen;
    this.settings.hidden = !this.settingsOpen;
  }

  onSettings(callback) {
    this.settings.addEventListener("input", () => {
      const value = {};
      for (const input of this.settings.querySelectorAll("[data-setting]")) {
        value[input.dataset.setting] = input.type === "checkbox" ? input.checked : input.tagName === "SELECT" ? input.value : Number(input.value);
      }
      callback(value);
    });
  }

  setMission(title, detail) {
    this.missionTitle.textContent = title;
    this.missionDetail.textContent = detail;
  }

  setRegion(region) {
    this.region.textContent = region.name;
  }

  setGems(count) {
    this.gems.textContent = `${count}/3`;
  }

  setShield(value) {
    const safe = Math.max(0, Math.min(100, value));
    this.shieldBar.style.width = `${safe}%`;
    this.shieldText.textContent = `${Math.round(safe)}%`;
    document.body.classList.toggle("gz-shield-low", safe <= 25);
  }

  showMessage(title, detail, now, priority = 3, duration = 4.2) {
    if (!this.companion.hidden && priority < this.messagePriority && now < this.messageUntil) return;
    this.companion.hidden = false;
    this.companionTitle.textContent = title;
    this.companionDetail.textContent = detail;
    this.messagePriority = priority;
    this.messageUntil = now + duration;
  }

  updateMessages(now) {
    if (!this.companion.hidden && now >= this.messageUntil) {
      this.companion.hidden = true;
      this.messagePriority = -1;
    }
  }

  setRoute(angle, text, visible = true) {
    this.route.hidden = !visible;
    if (!visible) return;
    this.routeArrow.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
    this.routeText.textContent = text;
  }

  setGravity(sample, actorScreen) {
    const visible = sample.magnitude > 0.035;
    this.gravity.hidden = !visible;
    if (!visible) return;
    this.gravity.style.left = `${actorScreen.x}px`;
    this.gravity.style.top = `${actorScreen.y}px`;
    this.gravityArrow.style.transform = `rotate(${Math.atan2(sample.y, sample.x) + Math.PI / 2}rad)`;
    this.gravity.style.opacity = String(Math.min(1, 0.36 + sample.magnitude * 2.2));
  }

  setScanner(active, progress = 0) {
    this.scanner.hidden = !active;
    if (!active) return;
    this.scanner.style.setProperty("--scan-progress", String(progress));
  }

  showEvent(definition, visible) {
    this.event.hidden = !visible;
    if (!visible) {
      document.body.removeAttribute("data-gz-event");
      return;
    }
    document.body.dataset.gzEvent = definition.className;
    this.eventTitle.textContent = definition.title;
    this.eventDetail.textContent = definition.detail;
  }

  setBonus(label, remaining) {
    this.bonus.hidden = !label;
    this.bonus.textContent = label ? `${label} · ${Math.ceil(remaining)}s` : "";
  }

  drawMap({ state, discovered, unlocked }) {
    const ctx = this.mapContext;
    const w = this.mapCanvas.width;
    const h = this.mapCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.62);
    gradient.addColorStop(0, "rgba(19,35,74,.94)");
    gradient.addColorStop(1, "rgba(3,7,23,.98)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(92,232,255,.10)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const xs = REGIONS.map((r) => r.center.x);
    const ys = REGIONS.map((r) => r.center.y);
    const bounds = { minX: Math.min(...xs) - 300, maxX: Math.max(...xs) + 300, minY: Math.min(...ys) - 250, maxY: Math.max(...ys) + 250 };
    const project = (point) => ({
      x: 70 + ((point.x - bounds.minX) / (bounds.maxX - bounds.minX)) * (w - 140),
      y: h - 70 - ((point.y - bounds.minY) / (bounds.maxY - bounds.minY)) * (h - 140),
    });

    for (const route of ROUTES) {
      const a = project(REGIONS[route.from].center);
      const b = project(REGIONS[route.to].center);
      const open = unlocked >= route.to;
      ctx.strokeStyle = open ? "rgba(92,232,255,.68)" : "rgba(173,92,255,.22)";
      ctx.setLineDash(open ? [10, 8] : [3, 12]);
      ctx.lineWidth = open ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    REGIONS.forEach((region, index) => {
      if (index > unlocked + 1) return;
      const p = project(region.center);
      const known = discovered.has(index) || index <= unlocked;
      ctx.beginPath();
      ctx.arc(p.x, p.y, known ? 24 : 16, 0, Math.PI * 2);
      ctx.fillStyle = known ? "rgba(35,217,255,.18)" : "rgba(142,73,255,.10)";
      ctx.fill();
      ctx.strokeStyle = known ? (index === 2 ? "#ed59ff" : "#66eaff") : "rgba(170,92,255,.35)";
      ctx.lineWidth = known ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = known ? "#f5f7ff" : "rgba(230,220,255,.45)";
      ctx.font = "600 15px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(known ? region.name : "REGIÓN BLOQUEADA", p.x, p.y + 45);
    });

    const player = project(state.worldPosition);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#66eaff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  showScore(stats) {
    const grade = stats.grade;
    this.score.querySelector(".gz-grade").textContent = grade;
    this.score.querySelector("dl").innerHTML = `
      <div><dt>TIEMPO</dt><dd>${stats.time}</dd></div>
      <div><dt>PRECISIÓN</dt><dd>${stats.accuracy}%</dd></div>
      <div><dt>DAÑO RECIBIDO</dt><dd>${stats.damage}%</dd></div>
      <div><dt>OBJETIVOS</dt><dd>${stats.destroyed}</dd></div>
      <div><dt>SECUNDARIOS</dt><dd>${stats.secondary}/3</dd></div>
      <div><dt>SLINGSHOTS</dt><dd>${stats.slingshots}</dd></div>
      <div><dt>REGIONES</dt><dd>${stats.regions}/4</dd></div>`;
    this.score.hidden = false;
  }
}
