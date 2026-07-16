const FIELD_COPY = {
  attract: { label: "POZO", color: "#69e8ff" },
  repel: { label: "REPULSIÓN", color: "#ff7bdc" },
  current: { label: "CORRIENTE", color: "#79a8ff" },
  tangential: { label: "ÓRBITA", color: "#ad78ff" },
  pulse: { label: "PULSO", color: "#ff6fcf" },
  unstable: { label: "ANOMALÍA", color: "#ffad67" },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function colorWithAlpha(color, alpha) {
  const value = String(color || "#7feaff").replace("#", "");
  const expanded = value.length === 3
    ? value.split("").map((character) => character + character).join("")
    : value.padEnd(6, "f").slice(0, 6);
  const number = Number.parseInt(expanded, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

export class HolographicMap {
  constructor({ scenarios = [], getState, onAudio }) {
    this.scenarios = scenarios;
    this.getState = getState;
    this.onAudio = onAudio;
    this.open = false;
    this.mode = "BIOME";
    this.lastFocusedElement = null;

    this.root = document.createElement("div");
    this.root.id = "gzFinalMap";
    this.root.hidden = true;
    this.root.setAttribute("aria-hidden", "true");
    this.root.innerHTML = `
      <section class="gz-map-shell" role="dialog" aria-modal="true" aria-labelledby="gzMapTitle" tabindex="-1">
        <header class="gz-map-head">
          <div class="gz-map-identity">
            <span class="gz-map-kicker">CARTOGRAFÍA DE NAVE · SOLO REFERENCIA</span>
            <div class="gz-map-title-row">
              <strong id="gzMapTitle">MAPA TÁCTICO</strong>
              <span id="gzMapSectorTag" class="gz-map-sector-tag">SECTOR ACTIVO</span>
            </div>
          </div>
          <div class="gz-map-modes" role="group" aria-label="Vista del mapa">
            <button type="button" data-map-mode="BIOME" aria-pressed="true">SECTOR</button>
            <button type="button" data-map-mode="ROUTE" aria-pressed="false">RUTA</button>
          </div>
          <button class="gz-map-close" type="button" aria-label="Cerrar mapa">
            <span>CERRAR</span><kbd>M</kbd>
          </button>
        </header>
        <div class="gz-map-viewport">
          <canvas id="gzMapCanvas" role="img" aria-label="Mapa informativo del sector actual"></canvas>
          <span class="gz-map-corner gz-map-corner-nw" aria-hidden="true"></span>
          <span class="gz-map-corner gz-map-corner-ne" aria-hidden="true"></span>
          <span class="gz-map-corner gz-map-corner-sw" aria-hidden="true"></span>
          <span class="gz-map-corner gz-map-corner-se" aria-hidden="true"></span>
          <span class="gz-map-axis gz-map-axis-x" aria-hidden="true"></span>
          <span class="gz-map-axis gz-map-axis-y" aria-hidden="true"></span>
        </div>
        <footer class="gz-map-footer">
          <div id="gzMapLegend" class="gz-map-legend" aria-label="Leyenda">
            <span><i class="is-player"></i><b data-map-legend="player">POSICIÓN</b></span>
            <span><i class="is-landmark"></i><b data-map-legend="landmark">LANDMARK</b></span>
            <span><i class="is-gravity"></i><b data-map-legend="gravity">CAMPO GRAVITATORIO</b></span>
            <span><i class="is-gate"></i><b data-map-legend="gate">GATE</b></span>
          </div>
          <div class="gz-map-readout" aria-live="polite">
            <span id="gzMapReadout">SINCRONIZANDO CARTOGRAFÍA</span>
            <strong id="gzMapAdvisory">VIAJE RÁPIDO DESHABILITADO</strong>
          </div>
        </footer>
      </section>`;
    document.body.appendChild(this.root);

    this.canvas = this.root.querySelector("#gzMapCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.shell = this.root.querySelector(".gz-map-shell");
    this.title = this.root.querySelector("#gzMapTitle");
    this.sectorTag = this.root.querySelector("#gzMapSectorTag");
    this.readout = this.root.querySelector("#gzMapReadout");
    this.advisory = this.root.querySelector("#gzMapAdvisory");
    this.legend = this.root.querySelector("#gzMapLegend");
    this.closeButton = this.root.querySelector(".gz-map-close");
    this.modeButtons = [...this.root.querySelectorAll("[data-map-mode]")];

    this.modeButtons.forEach((button) => {
      button.addEventListener("click", () => this.setMode(button.dataset.mapMode));
    });
    this.closeButton.addEventListener("click", () => this.toggle(false));
    this.root.addEventListener("pointerdown", (event) => {
      if (event.target === this.root) this.toggle(false);
    });

    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "gz-map-trigger";
    this.trigger.innerHTML = `<kbd>M</kbd><span>MAPA</span>`;
    this.trigger.setAttribute("aria-label", "Abrir mapa táctico");
    this.trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle();
    });
    document.body.appendChild(this.trigger);
  }

  toggle(force) {
    const nextOpen = typeof force === "boolean" ? force : !this.open;
    if (nextOpen === this.open) {
      if (nextOpen) this.draw();
      return;
    }

    this.open = nextOpen;
    this.root.hidden = !nextOpen;
    this.root.setAttribute("aria-hidden", String(!nextOpen));
    this.trigger.hidden = nextOpen;
    document.body.classList.toggle("gz-map-open", nextOpen);
    this.onAudio?.(nextOpen ? "map_open" : "map_close");

    if (nextOpen) {
      this.lastFocusedElement = document.activeElement;
      this.draw();
      window.requestAnimationFrame(() => {
        this.draw();
        this.closeButton?.focus({ preventScroll: true });
      });
      return;
    }

    if (this.lastFocusedElement instanceof HTMLElement && document.contains(this.lastFocusedElement)) {
      this.lastFocusedElement.focus({ preventScroll: true });
    }
  }

  setMode(mode) {
    const nextMode = mode === "ROUTE" ? "ROUTE" : "BIOME";
    if (!this.open || this.mode === nextMode) return;
    this.mode = nextMode;
    this.syncModeControls();
    this.onAudio?.("map_mode");
    this.draw();
  }

  toggleMode() {
    if (!this.open) return;
    this.mode = this.mode === "BIOME" ? "ROUTE" : "BIOME";
    this.syncModeControls();
    this.onAudio?.("map_mode");
    this.draw();
  }

  syncModeControls() {
    this.modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mapMode === this.mode));
    });
  }

  prepareCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(280, Math.round(rect.width));
    const height = Math.max(240, Math.round(rect.height));
    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const physicalWidth = Math.round(width * pixelRatio);
    const physicalHeight = Math.round(height * pixelRatio);

    if (this.canvas.width !== physicalWidth || this.canvas.height !== physicalHeight) {
      this.canvas.width = physicalWidth;
      this.canvas.height = physicalHeight;
    }
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return { width, height };
  }

  draw() {
    if (!this.open || !this.ctx) return;
    const state = this.getState?.() || {};
    const { width, height } = this.prepareCanvas();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    this.drawBackdrop(ctx, width, height);
    if (this.mode === "ROUTE") {
      this.drawRoute(state, width, height);
      return;
    }
    this.drawBiome(state, width, height);
  }

  drawBackdrop(ctx, width, height) {
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, "#050b1a");
    wash.addColorStop(0.48, "#07091a");
    wash.addColorStop(1, "#03050e");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    const cyanGlow = ctx.createRadialGradient(width * 0.18, height * 0.22, 0, width * 0.18, height * 0.22, width * 0.7);
    cyanGlow.addColorStop(0, "rgba(57, 224, 255, .075)");
    cyanGlow.addColorStop(1, "rgba(57, 224, 255, 0)");
    ctx.fillStyle = cyanGlow;
    ctx.fillRect(0, 0, width, height);

    const violetGlow = ctx.createRadialGradient(width * 0.82, height * 0.74, 0, width * 0.82, height * 0.74, width * 0.62);
    violetGlow.addColorStop(0, "rgba(155, 88, 255, .09)");
    violetGlow.addColorStop(1, "rgba(155, 88, 255, 0)");
    ctx.fillStyle = violetGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    for (let index = 0; index < 72; index += 1) {
      const x = (index * 197.31 + 41) % width;
      const y = (index * index * 17.19 + 29) % height;
      const radius = index % 13 === 0 ? 1.15 : 0.55;
      ctx.fillStyle = `rgba(204, 235, 255, ${0.08 + (index % 7) * 0.015})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBiome(state, width, height) {
    const scenarioIndex = clamp(Number(state.worldStageIndex) || 0, 0, Math.max(0, this.scenarios.length - 1));
    const scenario = this.scenarios[scenarioIndex];
    if (!scenario) return;

    const accent = scenario.accent || "#72eaff";
    const narrow = width < 620;
    const bounds = scenario.bounds;
    const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
    const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
    const padding = {
      left: narrow ? 28 : 68,
      right: narrow ? 28 : 68,
      top: narrow ? 38 : 58,
      bottom: narrow ? 44 : 62,
    };
    const availableWidth = Math.max(1, width - padding.left - padding.right);
    const availableHeight = Math.max(1, height - padding.top - padding.bottom);
    const scale = Math.min(availableWidth / worldWidth, availableHeight / worldHeight);
    const mapWidth = worldWidth * scale;
    const mapHeight = worldHeight * scale;
    const left = (width - mapWidth) * 0.5;
    const top = (height - mapHeight) * 0.5;
    const right = left + mapWidth;
    const bottom = top + mapHeight;
    const point = (x, y) => ({
      x: left + (x - bounds.minX) * scale,
      y: bottom - (y - bounds.minY) * scale,
    });

    this.title.textContent = scenario.name;
    this.sectorTag.textContent = `SECTOR ${scenarioIndex + 1} / ${this.scenarios.length}`;
    this.canvas.setAttribute(
      "aria-label",
      `Mapa informativo de ${scenario.name}. Muestra posición, landmarks, campos gravitatorios y gates.`,
    );

    this.drawSectorGrid(this.ctx, { left, top, right, bottom, accent, narrow });

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(left, top, mapWidth, mapHeight);
    this.ctx.clip();
    for (const field of scenario.gravityFields || []) {
      this.drawGravityField(this.ctx, field, point(field.x, field.y), field.radius * scale, narrow);
    }
    this.ctx.restore();

    for (const body of scenario.secondaryBodies || []) {
      this.drawCelestialBody(this.ctx, point(body.x, body.y), Math.max(4, body.radius * 10), accent, true);
    }

    if (scenario.hero) {
      const heroPoint = point(scenario.hero.x, scenario.hero.y);
      const heroRadius = clamp(scenario.hero.scale * scale * 0.34, narrow ? 13 : 18, narrow ? 28 : 42);
      this.drawCelestialBody(this.ctx, heroPoint, heroRadius, accent, false);
      this.drawMicroLabel(this.ctx, "CUERPO PRINCIPAL", heroPoint.x, heroPoint.y + heroRadius + 13, accent, "center");
    }

    const occupiedLabels = [];
    for (const gate of [scenario.backGate, scenario.gate].filter(Boolean)) {
      this.drawGate(this.ctx, gate, point(gate.x, gate.y), accent, gate === scenario.backGate, occupiedLabels, width, height, narrow);
    }

    const discoveredIds = new Set(Array.isArray(state.discoveredLandmarkIds) ? state.discoveredLandmarkIds : []);
    for (const landmark of scenario.landmarks || []) {
      const known = landmark.role === "primary" || discoveredIds.has(landmark.id);
      this.drawLandmark(
        this.ctx,
        landmark,
        point(landmark.x, landmark.y),
        known,
        accent,
        occupiedLabels,
        width,
        height,
        narrow,
      );
    }

    const rawShip = point(Number(state.worldX) || 0, Number(state.worldY) || 0);
    const ship = {
      x: clamp(rawShip.x, left + 12, right - 12),
      y: clamp(rawShip.y, top + 12, bottom - 12),
    };
    this.drawShip(this.ctx, ship, narrow);

    const secondary = (scenario.landmarks || []).filter((landmark) => landmark.role === "secondary");
    const discoveredCount = secondary.filter((landmark) => discoveredIds.has(landmark.id)).length;
    const gemCount = clamp(Number(state.gems) || 0, 0, 3);
    this.readout.textContent = `${discoveredCount}/${secondary.length} LANDMARKS SECUNDARIOS · ${gemCount}/3 GEMAS`;
    this.advisory.textContent = "REFERENCIA TÁCTICA · VIAJÁ POR LOS GATES DEL MUNDO";
    this.setLegend([
      ["player", "POSICIÓN"],
      ["landmark", "LANDMARK"],
      ["gravity", "CAMPO GRAVITATORIO"],
      ["gate", "GATE"],
    ]);
  }

  drawSectorGrid(ctx, { left, top, right, bottom, accent, narrow }) {
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(accent, 0.12);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    const columns = narrow ? 4 : 8;
    const rows = narrow ? 5 : 6;
    for (let column = 1; column < columns; column += 1) {
      const x = left + ((right - left) * column) / columns;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    for (let row = 1; row < rows; row += 1) {
      const y = top + ((bottom - top) * row) / rows;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = colorWithAlpha(accent, 0.35);
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, bottom - top - 1);

    ctx.fillStyle = colorWithAlpha(accent, 0.54);
    ctx.font = `700 ${narrow ? 8 : 9}px Arial, sans-serif`;
    ctx.letterSpacing = "0.12em";
    ctx.fillText("N", left + 8, top - 11);
    ctx.fillText("E", right + 10, top + 12);
    ctx.fillText("S", left + 8, bottom + 19);
    ctx.restore();
  }

  drawGravityField(ctx, field, center, radius, narrow) {
    const spec = FIELD_COPY[field.type] || FIELD_COPY.unstable;
    const safeRadius = Math.max(18, radius);
    const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, safeRadius);
    gradient.addColorStop(0, colorWithAlpha(spec.color, 0.09));
    gradient.addColorStop(0.62, colorWithAlpha(spec.color, 0.035));
    gradient.addColorStop(1, colorWithAlpha(spec.color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center.x, center.y, safeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(spec.color, 0.30);
    ctx.lineWidth = 1.25;
    ctx.setLineDash(field.type === "unstable" ? [2, 7] : [7, 8]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, safeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (field.type === "pulse" || field.type === "unstable") {
      ctx.strokeStyle = colorWithAlpha(spec.color, 0.18);
      ctx.beginPath();
      ctx.arc(center.x, center.y, safeRadius * 0.64, 0, Math.PI * 2);
      ctx.stroke();
    } else if (field.type === "tangential") {
      ctx.strokeStyle = colorWithAlpha(spec.color, 0.42);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, safeRadius * 0.68, -0.25, Math.PI * 1.24);
      ctx.stroke();
      const arrowAngle = Math.PI * 1.24;
      const arrowX = center.x + Math.cos(arrowAngle) * safeRadius * 0.68;
      const arrowY = center.y + Math.sin(arrowAngle) * safeRadius * 0.68;
      this.drawArrowHead(ctx, arrowX, arrowY, arrowAngle + Math.PI * 0.5, spec.color, 5);
    } else if (field.type === "current") {
      const direction = field.direction || { x: 0, y: 1 };
      const length = Math.min(safeRadius * 0.86, narrow ? 48 : 72);
      const endX = center.x + direction.x * length;
      const endY = center.y - direction.y * length;
      ctx.strokeStyle = colorWithAlpha(spec.color, 0.46);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center.x - direction.x * length * 0.4, center.y + direction.y * length * 0.4);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      this.drawArrowHead(ctx, endX, endY, Math.atan2(endY - center.y, endX - center.x), spec.color, 5);
    } else {
      ctx.strokeStyle = colorWithAlpha(spec.color, 0.48);
      ctx.lineWidth = 1.5;
      for (let index = 0; index < 4; index += 1) {
        const angle = (Math.PI * 2 * index) / 4 + Math.PI * 0.25;
        const outward = field.type === "repel";
        const startRadius = safeRadius * (outward ? 0.22 : 0.68);
        const endRadius = safeRadius * (outward ? 0.62 : 0.28);
        const startX = center.x + Math.cos(angle) * startRadius;
        const startY = center.y + Math.sin(angle) * startRadius;
        const endX = center.x + Math.cos(angle) * endRadius;
        const endY = center.y + Math.sin(angle) * endRadius;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        this.drawArrowHead(ctx, endX, endY, angle + (outward ? 0 : Math.PI), spec.color, 4);
      }
    }

    this.drawMicroLabel(ctx, spec.label, center.x, center.y + 3, spec.color, "center");
    ctx.restore();
  }

  drawArrowHead(ctx, x, y, angle, color, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = colorWithAlpha(color, 0.72);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.62);
    ctx.lineTo(-size, size * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawCelestialBody(ctx, center, radius, accent, secondary) {
    ctx.save();
    const gradient = ctx.createRadialGradient(
      center.x - radius * 0.34,
      center.y - radius * 0.35,
      radius * 0.08,
      center.x,
      center.y,
      radius,
    );
    gradient.addColorStop(0, secondary ? "rgba(207, 232, 245, .38)" : colorWithAlpha(accent, 0.56));
    gradient.addColorStop(0.48, secondary ? "rgba(83, 104, 127, .24)" : colorWithAlpha(accent, 0.20));
    gradient.addColorStop(1, "rgba(5, 8, 18, .9)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = secondary ? "rgba(189, 218, 235, .18)" : colorWithAlpha(accent, 0.48);
    ctx.lineWidth = secondary ? 1 : 1.5;
    ctx.stroke();
    ctx.strokeStyle = secondary ? "rgba(189, 218, 235, .10)" : colorWithAlpha(accent, 0.18);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radius * 1.32, radius * 0.34, -0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawGate(ctx, gate, center, accent, isBackGate, occupied, width, height, narrow) {
    const color = isBackGate ? "#9baec2" : accent;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(Math.PI * 0.25);
    ctx.strokeStyle = colorWithAlpha(color, 0.84);
    ctx.lineWidth = narrow ? 1.6 : 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.strokeStyle = colorWithAlpha(color, 0.22);
    ctx.strokeRect(-13, -13, 26, 26);
    ctx.restore();

    this.drawCallout(ctx, {
      anchor: center,
      eyebrow: isBackGate ? "RETORNO" : "SALIDA DE SECTOR",
      label: gate.name,
      color,
      occupied,
      width,
      height,
      narrow,
    });
  }

  drawLandmark(ctx, landmark, center, known, accent, occupied, width, height, narrow) {
    const primary = landmark.role === "primary";
    const color = primary ? accent : known ? "#d383ff" : "#8392a3";
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.shadowColor = known ? color : "transparent";
    ctx.shadowBlur = known ? 12 : 0;
    ctx.strokeStyle = colorWithAlpha(color, known ? 0.88 : 0.42);
    ctx.fillStyle = colorWithAlpha(color, known ? 0.18 : 0.05);
    ctx.lineWidth = primary ? 2 : 1.5;
    if (primary) {
      ctx.rotate(Math.PI * 0.25);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.rotate(-Math.PI * 0.25);
    } else {
      if (!known) ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, known ? 7 : 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = known ? "#f4fbff" : colorWithAlpha(color, 0.58);
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawCallout(ctx, {
      anchor: center,
      eyebrow: primary ? "OBJETIVO DE SECTOR" : known ? "LANDMARK SINCRONIZADO" : "SEÑAL SECUNDARIA",
      label: known ? landmark.name : "NO IDENTIFICADA",
      color,
      occupied,
      width,
      height,
      narrow,
    });
  }

  drawCallout(ctx, { anchor, eyebrow, label, color, occupied, width, height, narrow }) {
    const labelFont = narrow ? 9 : 11;
    const eyebrowFont = narrow ? 7 : 8;
    ctx.save();
    ctx.font = `800 ${labelFont}px Arial, sans-serif`;
    const measuredWidth = Math.max(ctx.measureText(label).width, ctx.measureText(eyebrow).width * 0.82);
    const boxWidth = clamp(measuredWidth + (narrow ? 16 : 22), narrow ? 92 : 118, narrow ? 154 : 210);
    const boxHeight = narrow ? 34 : 40;
    const gap = narrow ? 12 : 17;
    const candidates = [
      { x: anchor.x + gap, y: anchor.y - boxHeight * 0.5 },
      { x: anchor.x - gap - boxWidth, y: anchor.y - boxHeight * 0.5 },
      { x: anchor.x - boxWidth * 0.5, y: anchor.y - gap - boxHeight },
      { x: anchor.x - boxWidth * 0.5, y: anchor.y + gap },
    ];
    const margin = narrow ? 8 : 14;
    let box = candidates.find((candidate) => {
      const padded = { x: candidate.x - 4, y: candidate.y - 4, width: boxWidth + 8, height: boxHeight + 8 };
      const inside = padded.x >= margin && padded.y >= margin && padded.x + padded.width <= width - margin && padded.y + padded.height <= height - margin;
      const clear = occupied.every((other) =>
        padded.x + padded.width < other.x ||
        padded.x > other.x + other.width ||
        padded.y + padded.height < other.y ||
        padded.y > other.y + other.height
      );
      return inside && clear;
    });
    if (!box) {
      box = {
        x: clamp(anchor.x + gap, margin, width - boxWidth - margin),
        y: clamp(anchor.y - boxHeight * 0.5, margin, height - boxHeight - margin),
      };
    }
    occupied.push({ x: box.x - 5, y: box.y - 5, width: boxWidth + 10, height: boxHeight + 10 });

    const lineEndX = box.x > anchor.x ? box.x : box.x + boxWidth;
    const lineEndY = box.y + boxHeight * 0.5;
    ctx.strokeStyle = colorWithAlpha(color, 0.42);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.stroke();

    roundedRect(ctx, box.x, box.y, boxWidth, boxHeight, narrow ? 5 : 7);
    ctx.fillStyle = "rgba(3, 8, 19, .84)";
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha(color, 0.30);
    ctx.stroke();
    ctx.fillStyle = colorWithAlpha(color, 0.82);
    ctx.font = `800 ${eyebrowFont}px Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(eyebrow, box.x + (narrow ? 8 : 10), box.y + (narrow ? 12 : 14), boxWidth - 14);
    ctx.fillStyle = "rgba(242, 248, 255, .94)";
    ctx.font = `800 ${labelFont}px Arial, sans-serif`;
    ctx.fillText(label, box.x + (narrow ? 8 : 10), box.y + (narrow ? 26 : 30), boxWidth - 14);
    ctx.restore();
  }

  drawShip(ctx, center, narrow) {
    const radius = narrow ? 11 : 14;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.shadowColor = "#79efff";
    ctx.shadowBlur = narrow ? 12 : 18;
    ctx.strokeStyle = "rgba(121, 239, 255, .58)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f8fdff";
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.82);
    ctx.lineTo(-radius * 0.48, radius * 0.55);
    ctx.lineTo(0, radius * 0.30);
    ctx.lineTo(radius * 0.48, radius * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    this.drawMicroLabel(ctx, "TU POSICIÓN", center.x, center.y + radius + (narrow ? 10 : 13), "#79efff", "center");
  }

  drawMicroLabel(ctx, label, x, y, color, align = "left") {
    ctx.save();
    ctx.font = "800 7px Arial, sans-serif";
    ctx.textAlign = align;
    ctx.fillStyle = colorWithAlpha(color, 0.70);
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  drawRoute(state, width, height) {
    const ctx = this.ctx;
    const currentIndex = clamp(Number(state.worldStageIndex) || 0, 0, Math.max(0, this.scenarios.length - 1));
    const highestUnlocked = clamp(Number(state.highestUnlockedStage) || 0, 0, Math.max(0, this.scenarios.length - 1));
    const vertical = width < 660;
    const positions = [];

    this.title.textContent = "RUTA DE PROGRESIÓN";
    this.sectorTag.textContent = `SECTOR ACTIVO ${currentIndex + 1}`;
    this.canvas.setAttribute(
      "aria-label",
      "Ruta informativa de sectores. No permite viaje rápido; los sectores se recorren mediante gates dentro del mundo.",
    );

    if (vertical) {
      const top = 54;
      const bottom = height - 54;
      const step = this.scenarios.length > 1 ? (bottom - top) / (this.scenarios.length - 1) : 0;
      this.scenarios.forEach((_, index) => positions.push({ x: width * 0.31, y: top + step * index }));
    } else {
      const left = 88;
      const right = width - 88;
      const step = this.scenarios.length > 1 ? (right - left) / (this.scenarios.length - 1) : 0;
      this.scenarios.forEach((_, index) => positions.push({ x: left + step * index, y: height * 0.49 }));
    }

    for (let index = 0; index < positions.length - 1; index += 1) {
      const start = positions[index];
      const end = positions[index + 1];
      const available = index + 1 <= highestUnlocked;
      ctx.save();
      ctx.strokeStyle = available ? "rgba(103, 228, 255, .48)" : "rgba(157, 175, 194, .14)";
      ctx.lineWidth = available ? 3 : 2;
      ctx.setLineDash(available ? [] : [3, 9]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }

    this.scenarios.forEach((scenario, index) => {
      const position = positions[index];
      const unlocked = index <= highestUnlocked;
      const current = index === currentIndex;
      const accent = scenario.accent || "#7feaff";
      const radius = current ? (vertical ? 17 : 22) : vertical ? 13 : 17;

      ctx.save();
      if (current) {
        const halo = ctx.createRadialGradient(position.x, position.y, radius * 0.2, position.x, position.y, radius * 2.8);
        halo.addColorStop(0, colorWithAlpha(accent, 0.30));
        halo.addColorStop(1, colorWithAlpha(accent, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(position.x, position.y, radius * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = unlocked ? colorWithAlpha(accent, current ? 0.34 : 0.14) : "rgba(130, 145, 160, .055)";
      ctx.strokeStyle = unlocked ? colorWithAlpha(accent, current ? 0.92 : 0.48) : "rgba(157, 175, 194, .22)";
      ctx.lineWidth = current ? 2.5 : 1.25;
      ctx.beginPath();
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = unlocked ? "#f4fbff" : "rgba(210, 220, 230, .32)";
      ctx.font = `900 ${vertical ? 10 : 12}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1).padStart(2, "0"), position.x, position.y + 0.5);

      const labelX = vertical ? position.x + 34 : position.x;
      const labelY = vertical ? position.y - 7 : position.y + radius + 27;
      ctx.textAlign = vertical ? "left" : "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = unlocked ? "rgba(241, 248, 255, .94)" : "rgba(210, 220, 230, .36)";
      ctx.font = `800 ${vertical ? 10 : 11}px Arial, sans-serif`;
      ctx.fillText(scenario.name, labelX, labelY, vertical ? width - labelX - 16 : 190);
      ctx.fillStyle = current
        ? colorWithAlpha(accent, 0.88)
        : unlocked
          ? "rgba(158, 220, 235, .62)"
          : "rgba(180, 192, 204, .28)";
      ctx.font = `800 ${vertical ? 7 : 8}px Arial, sans-serif`;
      ctx.fillText(
        current ? "SECTOR ACTIVO" : unlocked ? "REGISTRADO" : "SIN CARTOGRAFIAR",
        labelX,
        labelY + (vertical ? 13 : 15),
      );
      ctx.restore();
    });

    this.readout.textContent = `${highestUnlocked + 1}/${this.scenarios.length} SECTORES REGISTRADOS · POSICIÓN ${currentIndex + 1}`;
    this.advisory.textContent = "SIN VIAJE RÁPIDO · CRUZÁ LOS GATES PARA CAMBIAR DE SECTOR";
    this.setLegend([
      ["player", "SECTOR ACTIVO"],
      ["landmark", "REGISTRADO"],
      ["gravity", "CONEXIÓN"],
      ["gate", "BLOQUEADO"],
    ]);
  }

  setLegend(items) {
    for (const [key, label] of items) {
      const element = this.legend.querySelector(`[data-map-legend="${key}"]`);
      if (element) element.textContent = label;
    }
    this.legend.dataset.mode = this.mode.toLowerCase();
  }
}
