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
      <div class="gz-map-shell">
        <div class="gz-map-head">
          <strong id="gzMapTitle">MAPA</strong>
          <span>[M] CERRAR · [TAB] BIOMA / RUTA</span>
        </div>
        <canvas id="gzMapCanvas" width="1200" height="720"></canvas>
        <div id="gzMapFooter"></div>
      </div>`;
    document.body.appendChild(this.root);
    this.canvas = this.root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.title = this.root.querySelector("#gzMapTitle");
    this.footer = this.root.querySelector("#gzMapFooter");
    this.installStyles();
  }

  installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #gzFinalMap{position:fixed;inset:0;z-index:9998;background:rgba(2,4,14,.82);backdrop-filter:blur(8px);padding:4vh 4vw;font-family:Inter,system-ui,sans-serif;color:#eef7ff}
      #gzFinalMap[hidden]{display:none!important}
      .gz-map-shell{height:92vh;border:1px solid rgba(105,224,255,.34);border-radius:22px;background:linear-gradient(180deg,rgba(10,17,43,.96),rgba(5,8,23,.96));box-shadow:0 0 80px rgba(122,72,255,.18);overflow:hidden}
      .gz-map-head,.gz-map-shell #gzMapFooter{display:flex;justify-content:space-between;padding:18px 24px;letter-spacing:.08em;font-size:12px}
      #gzMapCanvas{display:block;width:100%;height:calc(92vh - 108px);background:radial-gradient(circle at 50% 45%,rgba(50,70,160,.14),transparent 45%)}
    `;
    document.head.appendChild(style);
  }

  toggle() {
    this.open = !this.open;
    this.root.hidden = !this.open;
    this.onAudio?.(this.open ? "map_open" : "map_close");
    if (this.open) this.draw();
  }

  toggleMode() {
    if (!this.open) return;
    this.mode = this.mode === "BIOME" ? "ROUTE" : "BIOME";
    this.draw();
  }

  draw() {
    const state = this.getState();
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#050817";
    ctx.fillRect(0, 0, w, h);
    if (this.mode === "ROUTE") return this.drawRoute(state);

    const scenario = this.scenarios[state.worldStageIndex];
    this.title.textContent = scenario.name;
    const b = scenario.bounds;
    const sx = w / Math.max(1, b.maxX - b.minX);
    const sy = h / Math.max(1, b.maxY - b.minY);
    const point = (x,y) => ({ x:(x-b.minX)*sx, y:h-(y-b.minY)*sy });

    ctx.strokeStyle = "rgba(94,220,255,.18)";
    ctx.lineWidth = 1;
    for (let x=0;x<w;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for (let y=0;y<h;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}

    for (const field of scenario.gravity || []) {
      const p=point(field.x,field.y);
      const r=field.radius*((sx+sy)*0.5);
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
      ctx.strokeStyle="rgba(191,92,255,.23)";ctx.lineWidth=3;ctx.stroke();
    }

    for (const lm of scenario.landmarks || []) {
      const p=point(lm.x,lm.y);
      ctx.beginPath();ctx.arc(p.x,p.y,lm.primary?14:9,0,Math.PI*2);
      ctx.fillStyle=lm.primary?"#7feaff":"#c86cff";ctx.fill();
      ctx.fillStyle="#eaf7ff";ctx.font="16px system-ui";ctx.fillText(lm.name,p.x+20,p.y+5);
    }

    for (const gate of [scenario.backGate, scenario.gate].filter(Boolean)) {
      const p=point(gate.x,gate.y);
      ctx.strokeStyle="#f3f6ff";ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#f3f6ff";ctx.font="14px system-ui";ctx.fillText(gate.name,p.x+28,p.y+5);
    }

    const ship=point(state.worldX,state.worldY);
    ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(-Math.PI/2);
    ctx.fillStyle="#ffffff";ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-14,-11);ctx.lineTo(-8,0);ctx.lineTo(-14,11);ctx.closePath();ctx.fill();ctx.restore();

    this.footer.textContent = `${state.discoveredSecondaries}/${scenario.landmarks.filter(x=>x.secondary).length} SECUNDARIOS · GEMA ${Math.min(3,state.gems)}/3 · NAVE STAGE ${Math.min(3,state.shipStage+1)}`;
  }

  drawRoute(state) {
    const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;
    this.title.textContent="RUTA GLOBAL";
    const y=h/2;
    const start=150,end=w-150,step=(end-start)/(this.scenarios.length-1);
    ctx.lineWidth=8;ctx.strokeStyle="rgba(95,213,255,.25)";
    ctx.beginPath();ctx.moveTo(start,y);ctx.lineTo(end,y);ctx.stroke();
    this.scenarios.forEach((scenario,i)=>{
      const x=start+i*step;
      const unlocked=i<=state.highestUnlockedStage;
      ctx.beginPath();ctx.arc(x,y,unlocked?34:24,0,Math.PI*2);
      ctx.fillStyle=unlocked?(i===state.worldStageIndex?"#ffffff":"#7feaff"):"rgba(255,255,255,.16)";
      ctx.fill();
      ctx.fillStyle=unlocked?"#eef7ff":"rgba(238,247,255,.35)";
      ctx.textAlign="center";ctx.font="18px system-ui";ctx.fillText(scenario.name,x,y+70);
    });
    ctx.textAlign="left";
    this.footer.textContent="LOS GATES PERMITEN VOLVER A BIOMAS YA DESBLOQUEADOS. LA NAVE NO INVOLUCIONA.";
  }
}
