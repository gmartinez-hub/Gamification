import * as THREE from "three";
import "./styles.css";
import { AudioDirector } from "./audio.js";
import { UI } from "./ui.js";
import { COLORS, REGIONS, ROUTES, WORLD, STAGE_NAMES, EVENT_DEFS, COMPANION } from "./config.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const normalize = (x, y) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};
const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

class Game {
  constructor() {
    this.ui = new UI();
    this.audio = new AudioDirector();
    this.clock = new THREE.Clock();
    this.loader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.keys = new Set();
    this.settings = { master: .72, music: .20, fx: .58, camera: 1, reduceMotion: false, flashes: true, bloom: true, quality: "high" };
    this.manifest = null;
    this.state = {
      worldPosition: new THREE.Vector2(0, 0),
      velocity: new THREE.Vector2(),
      desired: new THREE.Vector2(),
      mode: "ship",
      stage: 0,
      unlockedStage: 0,
      gems: 0,
      shield: 100,
      lastDamageAt: -Infinity,
      startedAt: 0,
      missionStarted: false,
      discoveredRegions: new Set([0]),
      secondary: new Set(),
      slingshots: 0,
      shots: 0,
      hits: 0,
      destroyed: 0,
      damageReceived: 0,
      finalComplete: false,
    };
    this.mission = {
      stage: 0,
      phase: "fragments",
      smallDestroyed: 0,
      coreHp: 0,
      gemReady: false,
      completedStages: new Set(),
      finalNodes: new Set(),
    };
    this.cameraState = { mode: "exploration", until: 0, baseZoom: 1 };
    this.aim = { active: false, target: null, progress: 0, fired: false };
    this.scanner = { active: false, progress: 0, target: null };
    this.stabilizer = { remaining: 0, cooldown: 0 };
    this.turbo = { active: false, pulse: 0 };
    this.event = { id: null, startedAt: 0, endsAt: 0, nextAt: 18, cursor: [0, 0, 0, 0] };
    this.help = { lastProgressAt: 0, signature: "", sent: false };
    this.bonus = { id: null, until: 0 };
    this.stats = { regions: new Set([0]) };
    this.messageSeen = new Set();
    this.init();
  }

  async init() {
    try {
      this.manifest = await fetch("/assets/runtime/manifest.json").then((response) => {
        if (!response.ok) throw new Error(`Manifest ${response.status}`);
        return response.json();
      });
    } catch (error) {
      console.error("No se pudo cargar el manifest runtime", error);
      this.ui.setMission("ERROR DE ASSETS", "No se pudo cargar el manifest de runtime.");
      return;
    }

    this.setupRenderer();
    this.setupScene();
    this.setupActors();
    this.setupWorld();
    this.setupInput();
    this.setupUI();
    this.enterRegion(0, 0);
    this.state.missionStarted = true;
    this.state.startedAt = this.clock.elapsedTime;
    this.help.lastProgressAt = 0;
    this.companion("start", 4, true);
    this.animate();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.ui.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x020617, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-2, 2, 2, -2, -20, 20);
    this.camera.position.z = 5;
    this.camera.zoom = 1;
    this.scene.add(this.camera);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(1, height);
    const halfHeight = 1.8;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  texture(path) {
    const texture = this.loader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  sprite(path, opacity = 1) {
    const material = new THREE.SpriteMaterial({
      map: this.texture(path),
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    return new THREE.Sprite(material);
  }

  setupScene() {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - .5) * 12;
      positions[index * 3 + 1] = (Math.random() - .5) * 7;
      positions[index * 3 + 2] = -7 - Math.random() * 2;
      const color = new THREE.Color(index % 11 === 0 ? 0x925cff : index % 7 === 0 ? 0x66eaff : 0x8190c2);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: .012, vertexColors: true, transparent: true, opacity: .72, depthWrite: false });
    this.starfield = new THREE.Points(geometry, material);
    this.starfield.renderOrder = -100;
    this.scene.add(this.starfield);

    const nebula = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 4.5),
      new THREE.MeshBasicMaterial({
        map: this.texture("/assets/runtime/three-textures/nebula-magenta-cyan-background.png"),
        transparent: true,
        opacity: .32,
        depthWrite: false,
        depthTest: false,
      }),
    );
    nebula.position.z = -8;
    this.scene.add(nebula);
    this.nebula = nebula;

    this.worldGroup = new THREE.Group();
    this.worldGroup.name = "clean-world-authority";
    this.scene.add(this.worldGroup);
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);
  }

  setupActors() {
    this.shipGroup = new THREE.Group();
    this.shipGroup.position.set(0, -0.25, 0.5);
    this.scene.add(this.shipGroup);
    const first = this.manifest.directions.stage1.idle;
    this.shipSprite = this.sprite(`/${first.path}`);
    this.fitSprite(this.shipSprite, first.aspect, .48);
    this.shipGroup.add(this.shipSprite);

    this.shipGlow = new THREE.Mesh(
      new THREE.RingGeometry(.22, .245, 64),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.shipGlow.position.z = -.04;
    this.shipGroup.add(this.shipGlow);

    this.thruster = new THREE.Mesh(
      new THREE.PlaneGeometry(.10, .44),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.thruster.position.set(0, -.34, -.02);
    this.shipGroup.add(this.thruster);

    this.astronautGroup = new THREE.Group();
    this.astronautGroup.position.set(.48, .08, .65);
    this.scene.add(this.astronautGroup);
    const astronautEntry = this.manifest.astronaut?.views?.front || this.manifest.astronaut?.float;
    this.astronautSprite = this.sprite(`/${astronautEntry.path}`);
    this.fitSprite(this.astronautSprite, astronautEntry.aspect || 1, .22);
    this.astronautGroup.add(this.astronautSprite);

    const tetherGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.tether = new THREE.Line(
      tetherGeometry,
      new THREE.LineBasicMaterial({ color: 0x89d9f2, transparent: true, opacity: .42 }),
    );
    this.tether.position.z = .42;
    this.scene.add(this.tether);

    this.scannerRing = new THREE.Mesh(
      new THREE.RingGeometry(.30, .307, 96),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.scannerRing.position.z = .43;
    this.scene.add(this.scannerRing);

    this.projectiles = [];
  }

  fitSprite(sprite, aspect, maxSize) {
    if (aspect >= 1) sprite.scale.set(maxSize, maxSize / aspect, 1);
    else sprite.scale.set(maxSize * aspect, maxSize, 1);
  }

  createPlanet(region, secondary = false) {
    const spec = secondary ? region.secondary : region.hero;
    const root = new THREE.Group();
    root.userData.world = new THREE.Vector2(spec.x, spec.y);
    root.userData.region = region.id;
    root.userData.secondary = secondary;
    const planet = this.sprite(spec.texture, secondary ? .62 : .94);
    const size = spec.scale;
    planet.scale.set(size, size, 1);
    planet.position.z = -4.5;
    root.add(planet);
    if (!secondary) {
      const atmosphere = new THREE.Mesh(
        new THREE.RingGeometry(size * .49, size * .53, 96),
        new THREE.MeshBasicMaterial({
          color: region.id === "synthetic" ? COLORS.magenta : COLORS.cyan,
          transparent: true,
          opacity: .14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
        }),
      );
      atmosphere.position.z = -4.6;
      root.add(atmosphere);
    }
    root.visible = false;
    this.worldGroup.add(root);
    return root;
  }

  geometryMaterial(color, opacity = .9, additive = false) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }

  arc(root, radius, start, length, color, tube = .012) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 56, length), this.geometryMaterial(color, .78, true));
    mesh.rotation.z = start;
    root.add(mesh);
    return mesh;
  }

  createLandmark(region, spec = region.landmark) {
    const root = new THREE.Group();
    root.userData.world = new THREE.Vector2(spec.x, spec.y);
    root.userData.spec = spec;
    root.userData.region = region.id;
    root.userData.interacted = false;
    root.position.z = -.1;

    if (spec.kind === "beacon") {
      root.add(new THREE.Mesh(new THREE.OctahedronGeometry(.055, 1), this.geometryMaterial(COLORS.magenta, .95, true)));
      this.arc(root, .14, .2, Math.PI * 1.20, COLORS.cyan, .010);
      this.arc(root, .21, 2.9, Math.PI * .72, COLORS.white, .015);
      this.arc(root, .27, 5.2, Math.PI * .54, 0xa8b7c6, .012);
      for (let index = 0; index < 6; index += 1) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(.07 + (index % 2) * .025, .035, .012), this.geometryMaterial(index % 2 ? 0xdde6eb : 0x516072, .9));
        const angle = index * 1.02 + .3;
        panel.position.set(Math.cos(angle) * (.25 + (index % 2) * .05), Math.sin(angle) * (.22 + (index % 3) * .02), .01);
        panel.rotation.z = angle + .4;
        root.add(panel);
      }
    } else if (spec.kind === "ring") {
      root.add(new THREE.Mesh(new THREE.OctahedronGeometry(.048, 1), this.geometryMaterial(COLORS.cyan, .9, true)));
      this.arc(root, .23, .18, Math.PI * 1.12, COLORS.white, .018);
      this.arc(root, .23, 3.8, Math.PI * .44, COLORS.magenta, .012);
      for (let index = 0; index < 4; index += 1) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(.10, .045, .012), this.geometryMaterial(index % 2 ? 0xdde6eb : 0x526174, .88));
        const angle = index * 1.55 + .4;
        panel.position.set(Math.cos(angle) * .29, Math.sin(angle) * .25, 0);
        panel.rotation.z = angle;
        root.add(panel);
      }
    } else if (spec.kind === "rift") {
      for (let index = 0; index < 4; index += 1) this.arc(root, .10 + index * .045, index * 1.2, Math.PI * (.68 + index * .07), index % 2 ? COLORS.cyan : COLORS.magenta, .008);
      root.add(new THREE.Mesh(new THREE.OctahedronGeometry(.065, 1), this.geometryMaterial(COLORS.magenta, .95, true)));
    } else if (spec.kind === "portal") {
      for (let index = 0; index < 4; index += 1) {
        const ring = this.arc(root, .11 + index * .05, index * .72, Math.PI * (1.12 - index * .06), index === 1 ? COLORS.magenta : COLORS.white, .009);
        ring.rotation.x = .10 + index * .08;
      }
      root.add(new THREE.Mesh(new THREE.OctahedronGeometry(.072, 1), this.geometryMaterial(COLORS.cyan, .95, true)));
    } else if (spec.kind === "station") {
      root.add(new THREE.Mesh(new THREE.BoxGeometry(.28, .13, .02), this.geometryMaterial(COLORS.white, .88)));
      const left = new THREE.Mesh(new THREE.BoxGeometry(.16, .028, .01), this.geometryMaterial(0x56677a, .9));
      const right = left.clone();
      left.position.x = -.22;
      right.position.x = .22;
      root.add(left, right, new THREE.Mesh(new THREE.OctahedronGeometry(.04, 1), this.geometryMaterial(COLORS.cyan, .9, true)));
    } else {
      root.add(new THREE.Mesh(new THREE.OctahedronGeometry(.07, 1), this.geometryMaterial(COLORS.magenta, .95, true)));
      this.arc(root, .15, .2, Math.PI * 1.5, COLORS.cyan, .009);
    }
    root.scale.setScalar(spec.kind === "portal" ? 1.15 : .95);
    root.visible = false;
    this.worldGroup.add(root);
    return root;
  }

  setupWorld() {
    this.regionObjects = REGIONS.map((region) => ({
      region,
      hero: this.createPlanet(region, false),
      secondary: this.createPlanet(region, true),
      landmark: this.createLandmark(region),
      auxiliary: region.auxiliary ? this.createLandmark(region, region.auxiliary) : null,
      finalNodes: (region.finalNodes || []).map((node, index) => this.createLandmark(region, { ...node, kind: "node", name: `NODO ${String.fromCharCode(65 + index)}` })),
      meteors: [],
      targets: [],
      core: null,
      gem: null,
    }));
    this.asteroidPaths = [
      "/assets/runtime/space-animated/asteroid_core/01.png",
      "/assets/runtime/space-animated/asteroid_hollow/01.png",
      "/assets/runtime/space-animated/asteroid_ring/01.png",
      "/assets/runtime/space-animated/asteroid_blue/01.png",
      "/assets/runtime/space-animated/asteroid_magenta/01.png",
    ];
    REGIONS.forEach((region, index) => this.spawnRegion(index));
  }

  spawnRegion(index) {
    const entry = this.regionObjects[index];
    const region = entry.region;
    const meteorCount = [12, 18, 24, 10][index];
    for (let meteorIndex = 0; meteorIndex < meteorCount; meteorIndex += 1) {
      const angle = (meteorIndex / meteorCount) * Math.PI * 2 + index * .7;
      const radius = 170 + (meteorIndex % 5) * 78 + Math.random() * 70;
      const world = new THREE.Vector2(region.center.x + Math.cos(angle) * radius, region.center.y + Math.sin(angle) * radius);
      const sprite = this.sprite(this.asteroidPaths[(meteorIndex + index) % this.asteroidPaths.length], .74);
      const size = .08 + (meteorIndex % 3) * .022;
      sprite.scale.set(size, size, 1);
      sprite.position.z = -.5;
      sprite.userData = {
        type: "ambient",
        world,
        velocity: new THREE.Vector2((Math.random() - .5) * 8, (Math.random() - .5) * 8),
        radius: 18 + (meteorIndex % 3) * 5,
        damage: 3 + (meteorIndex % 3) * 2,
        lastHit: -Infinity,
      };
      sprite.visible = false;
      this.worldGroup.add(sprite);
      entry.meteors.push(sprite);
    }

    if (index < 3) {
      const count = region.mission.small;
      for (let targetIndex = 0; targetIndex < count; targetIndex += 1) {
        const angle = -Math.PI / 2 + targetIndex * (Math.PI * 2 / count) + index * .45;
        const radius = 160 + targetIndex * 42;
        const sprite = this.sprite(this.asteroidPaths[(targetIndex + index + 2) % this.asteroidPaths.length], .82);
        sprite.scale.set(.12, .12, 1);
        sprite.position.z = .05;
        sprite.userData = {
          type: "target-small",
          stage: index,
          world: new THREE.Vector2(region.center.x + Math.cos(angle) * radius, region.center.y + Math.sin(angle) * radius),
          origin: null,
          phase: angle,
          scanned: false,
          scan: 0,
          hp: index === 2 ? 2 : 1,
          radius: 25,
          destroyed: false,
        };
        sprite.userData.origin = sprite.userData.world.clone();
        sprite.visible = false;
        this.worldGroup.add(sprite);
        entry.targets.push(sprite);
      }
    }
  }

  setupInput() {
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab"].includes(event.key)) event.preventDefault();
      this.keys.add(event.key.toLowerCase());
      if (event.code === "Space" && !event.repeat) this.activateStabilizer();
      if (event.key.toLowerCase() === "m" && !event.repeat) {
        this.ui.toggleMap();
        this.audio.event(this.ui.mapOpen ? "mapOpen" : "mapClose");
      }
      if (event.key === "Tab" && !event.repeat) this.toggleMode();
      if (event.key === "Escape") {
        this.ui.toggleMap(false);
        this.ui.toggleSettings(false);
      }
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    this.ui.canvas.addEventListener("pointermove", (event) => this.setPointer(event));
    this.ui.canvas.addEventListener("pointerdown", (event) => {
      this.setPointer(event);
      this.tryAim();
    });
    this.ui.onSettings((settings) => {
      this.settings = { ...this.settings, ...settings };
      this.audio.applySettings(settings);
      document.body.classList.toggle("gz-reduce-motion", settings.reduceMotion);
      document.body.classList.toggle("gz-no-bloom", !settings.bloom);
      const ratio = settings.quality === "high" ? Math.min(devicePixelRatio, 2) : settings.quality === "medium" ? Math.min(devicePixelRatio, 1.35) : 1;
      this.renderer.setPixelRatio(ratio);
      this.resize();
    });
  }

  setupUI() {
    this.ui.setGems(0);
    this.ui.setShield(100);
    this.ui.setRegion(REGIONS[0]);
    this.ui.setMission("EXPLORÁ OCEANIC FRONTIER", "Localizá y escaneá tres fragmentos.");
  }

  setPointer(event) {
    const rect = this.ui.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  companion(key, priority = 3, once = false) {
    if (once && this.messageSeen.has(key)) return;
    if (once) this.messageSeen.add(key);
    const message = COMPANION[key];
    if (!message) return;
    this.ui.showMessage(message[0], message[1], this.clock.elapsedTime, priority, priority >= 7 ? 5.5 : 4.2);
    this.audio.event("companion");
  }

  regionIndexAt(position = this.state.worldPosition) {
    let best = 0;
    let bestDistance = Infinity;
    REGIONS.forEach((region, index) => {
      const d = distance(position, region.center);
      if (d < bestDistance) {
        best = index;
        bestDistance = d;
      }
    });
    return best;
  }

  enterRegion(index, elapsed) {
    if (index > this.state.unlockedStage) return;
    if (this.state.stage === index && this.state.discoveredRegions.has(index)) return;
    this.state.stage = index;
    this.state.discoveredRegions.add(index);
    this.stats.regions.add(index);
    this.ui.setRegion(REGIONS[index]);
    this.cameraCue(index === 3 ? "final" : "transition", index === 3 ? 6 : 4);
    if (!this.mission.completedStages.has(index) && index < 3) {
      this.mission.stage = index;
      this.mission.phase = "fragments";
      this.mission.smallDestroyed = 0;
      this.mission.coreHp = REGIONS[index].mission.coreHp;
      this.mission.gemReady = false;
      this.regionObjects[index].targets.forEach((target) => {
        target.userData.destroyed = false;
        target.userData.scanned = false;
        target.userData.scan = 0;
        target.userData.hp = index === 2 ? 2 : 1;
      });
      this.ui.setMission(`ESCANEÁ ${REGIONS[index].mission.small} FRAGMENTOS`, "Acercate y mantené E. Después destruí cada objetivo.");
      this.markProgress(elapsed);
    }
    if (index === 1) this.ui.showMessage("MECHANICAL NETWORK", "Las órbitas están fracturadas. Usá el slingshot.", elapsed, 5);
    if (index === 2) this.ui.showMessage("SYNTHETIC DARK ZONE", "Los vectores cambian. Estabilizá antes de apuntar.", elapsed, 5);
    if (index === 3) {
      this.companion("final", 8);
      this.ui.setMission("ESTABILIZÁ LOS TRES NODOS", "Acercate y mantené E sobre cada nodo.");
    }
    this.scheduleEvent(elapsed, index === 0 ? 18 : 10);
  }

  markProgress(elapsed) {
    this.help.lastProgressAt = elapsed;
    this.help.sent = false;
    this.help.signature = `${this.state.stage}:${this.mission.phase}:${this.mission.smallDestroyed}:${this.state.gems}:${this.mission.finalNodes.size}`;
  }

  cameraCue(mode, duration = 2.5) {
    this.cameraState.mode = mode;
    this.cameraState.until = this.clock.elapsedTime + duration;
  }

  toggleMode() {
    if (this.aim.active) return;
    this.state.mode = this.state.mode === "ship" ? "astronaut" : "ship";
    if (this.state.mode === "ship") {
      this.astronautGroup.position.set(.48, .08, .65);
      this.astronautGroup.rotation.set(0, 0, 0);
    }
  }

  activateStabilizer() {
    if (this.stabilizer.cooldown > 0 || this.stabilizer.remaining > 0) return;
    this.stabilizer.remaining = 2.5;
    this.stabilizer.cooldown = 8;
    this.audio.event("stabilize");
    this.companion("stabilize", 4, true);
  }

  directionKey(vector) {
    if (vector.length() < .08) return "idle";
    const angle = Math.atan2(vector.y, vector.x);
    if (angle >= -Math.PI / 8 && angle < Math.PI / 8) return "right";
    if (angle >= Math.PI / 8 && angle < 3 * Math.PI / 8) return "up_right";
    if (angle >= 3 * Math.PI / 8 && angle < 5 * Math.PI / 8) return "up";
    if (angle >= 5 * Math.PI / 8 && angle < 7 * Math.PI / 8) return "up_left";
    if (angle >= 7 * Math.PI / 8 || angle < -7 * Math.PI / 8) return "left";
    if (angle >= -7 * Math.PI / 8 && angle < -5 * Math.PI / 8) return "down_left";
    if (angle >= -5 * Math.PI / 8 && angle < -3 * Math.PI / 8) return "down";
    return "down_right";
  }

  updateShipAsset() {
    const stageName = STAGE_NAMES[Math.min(2, this.state.gems)];
    const key = this.directionKey(this.state.velocity);
    const entry = this.manifest.directions[stageName][key] || this.manifest.directions[stageName].idle;
    const url = `/${entry.path}`;
    if (this.shipSprite.userData.url !== url) {
      this.shipSprite.material.map = this.texture(url);
      this.shipSprite.material.needsUpdate = true;
      this.fitSprite(this.shipSprite, entry.aspect, this.state.gems === 2 ? .54 : .48);
      this.shipSprite.userData.url = url;
    }
  }

  inputVector() {
    const x = (this.keys.has("arrowright") || this.keys.has("d") ? 1 : 0) - (this.keys.has("arrowleft") || this.keys.has("a") ? 1 : 0);
    const y = (this.keys.has("arrowup") || this.keys.has("w") ? 1 : 0) - (this.keys.has("arrowdown") || this.keys.has("s") ? 1 : 0);
    const vector = new THREE.Vector2(x, y);
    if (vector.length() > 1) vector.normalize();
    if (this.ui.mapOpen || this.ui.settingsOpen || !this.ui.score.hidden) vector.set(0, 0);
    return vector;
  }

  sampleGravity(position, elapsed) {
    const fields = REGIONS[this.state.stage].gravity;
    let x = 0;
    let y = 0;
    let strongest = null;
    let strongestWeight = 0;
    for (const field of fields) {
      const dx = field.x - position.x;
      const dy = field.y - position.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist >= field.radius) continue;
      const falloff = Math.pow(1 - dist / field.radius, 1.35);
      const direction = normalize(dx, dy);
      let fx = 0;
      let fy = 0;
      if (field.type === "attract") { fx = direction.x; fy = direction.y; }
      if (field.type === "repel") { fx = -direction.x; fy = -direction.y; }
      if (field.type === "tangential") { fx = -direction.y; fy = direction.x; }
      if (field.type === "current") { fx = field.direction.x; fy = field.direction.y; }
      if (field.type === "pulse") {
        const pulse = .35 + Math.max(0, Math.sin(elapsed * Math.PI * 2 / field.period)) * .95;
        fx = -direction.x * pulse;
        fy = -direction.y * pulse;
      }
      if (field.type === "unstable") {
        const angle = elapsed * Math.PI * 2 / field.period;
        fx = Math.cos(angle) * .72 + direction.x * .28;
        fy = Math.sin(angle) * .72 + direction.y * .28;
      }
      const weight = field.strength * falloff;
      x += fx * weight;
      y += fy * weight;
      if (weight > strongestWeight) {
        strongestWeight = weight;
        strongest = field;
      }
    }
    const magnitude = Math.min(.45, Math.hypot(x, y) / 42);
    return { x: x / 42, y: y / 42, magnitude, field: strongest };
  }

  updateMovement(delta, elapsed) {
    this.state.desired.copy(this.inputVector());
    const blend = 1 - Math.exp(-delta * 7.5);
    this.state.velocity.lerp(this.state.desired, blend);

    this.turbo.active = this.keys.has("f") && this.state.mode === "ship" && !this.aim.active;
    this.turbo.pulse += ((this.turbo.active ? 1 : 0) - this.turbo.pulse) * (1 - Math.exp(-delta * 8));
    if (this.turbo.active && !this.messageSeen.has("turbo")) {
      this.companion("turbo", 3, true);
      this.audio.event("turbo");
    }

    const gravity = this.sampleGravity(this.state.worldPosition, elapsed);
    this.gravitySample = gravity;
    const gravityScale = this.stabilizer.remaining > 0 ? .24 : 1;
    this.state.velocity.x += gravity.x * delta * 2.2 * gravityScale;
    this.state.velocity.y += gravity.y * delta * 2.2 * gravityScale;

    if (this.event.id) {
      const definition = EVENT_DEFS[this.event.id];
      const time = elapsed - this.event.startedAt;
      if (definition.force) {
        this.state.velocity.x += definition.force.x / 42 * delta;
        this.state.velocity.y += definition.force.y / 42 * delta;
      }
      if (definition.rotatingForce) {
        const angle = time * .92;
        this.state.velocity.x += Math.cos(angle) * definition.rotatingForce / 42 * delta;
        this.state.velocity.y += Math.sin(angle) * definition.rotatingForce / 42 * delta;
      }
    }

    if (this.state.velocity.length() > 1.15) this.state.velocity.setLength(1.15);
    const multiplier = this.turbo.active ? WORLD.turboMultiplier : 1;
    const speed = WORLD.baseSpeed * multiplier;
    if (this.state.mode === "ship") {
      this.state.worldPosition.addScaledVector(this.state.velocity, delta * speed);
    } else {
      const localSpeed = .75 * multiplier;
      this.astronautGroup.position.x += this.state.velocity.x * delta * localSpeed;
      this.astronautGroup.position.y += this.state.velocity.y * delta * localSpeed;
      const fromShip = new THREE.Vector2(this.astronautGroup.position.x - this.shipGroup.position.x, this.astronautGroup.position.y - this.shipGroup.position.y);
      if (fromShip.length() > WORLD.maxAstronautDistanceScene) {
        fromShip.setLength(WORLD.maxAstronautDistanceScene);
        this.astronautGroup.position.x = this.shipGroup.position.x + fromShip.x;
        this.astronautGroup.position.y = this.shipGroup.position.y + fromShip.y;
      }
      this.astronautGroup.rotation.z = lerp(this.astronautGroup.rotation.z, this.state.velocity.length() > .05 ? -Math.atan2(this.state.velocity.x, this.state.velocity.y) * .12 : 0, blend);
    }

    this.stabilizer.remaining = Math.max(0, this.stabilizer.remaining - delta);
    this.stabilizer.cooldown = Math.max(0, this.stabilizer.cooldown - delta);
    this.updateShipAsset();
    this.shipGroup.rotation.z = lerp(this.shipGroup.rotation.z, -this.state.velocity.x * .09, blend);
    this.shipGlow.material.opacity = this.stabilizer.remaining > 0 ? .34 : 0;
    this.shipGlow.scale.setScalar(1 + Math.sin(elapsed * 5) * .08);
    this.thruster.material.opacity = .12 + this.turbo.pulse * .72;
    this.thruster.scale.y = .55 + this.turbo.pulse * 1.6;
    this.thruster.material.color.set(this.turbo.active ? COLORS.magenta : COLORS.cyan);
  }

  worldToScene(world) {
    return new THREE.Vector3(
      (world.x - this.state.worldPosition.x) / WORLD.unitsPerScene,
      (world.y - this.state.worldPosition.y) / WORLD.unitsPerScene,
      0,
    );
  }

  updateWorld(delta, elapsed) {
    const current = this.state.stage;
    const next = Math.min(3, current + 1);
    const route = ROUTES.find((item) => item.from === current && item.to === next);
    const nextAllowed = route && this.state.gems >= route.requiredGems;
    const nextDistance = nextAllowed ? distance(this.state.worldPosition, REGIONS[next].center) : Infinity;
    const currentDistance = distance(this.state.worldPosition, REGIONS[current].center);
    const transitionVisible = nextAllowed && nextDistance < 720 && Math.abs(nextDistance - currentDistance) < 420;

    this.regionObjects.forEach((entry, index) => {
      const active = index === current;
      const transition = index === next && transitionVisible;
      entry.hero.visible = active || transition;
      entry.secondary.visible = active;
      entry.landmark.visible = active && distance(this.state.worldPosition, entry.landmark.userData.world) < WORLD.landmarkVisibleRadius;
      if (entry.auxiliary) entry.auxiliary.visible = active && distance(this.state.worldPosition, entry.auxiliary.userData.world) < WORLD.landmarkVisibleRadius;
      entry.finalNodes.forEach((node) => {
        node.visible = active && index === 3 && distance(this.state.worldPosition, node.userData.world) < WORLD.landmarkVisibleRadius;
      });

      for (const object of [entry.hero, entry.secondary, entry.landmark, entry.auxiliary, ...entry.finalNodes].filter(Boolean)) {
        if (!object.visible) continue;
        object.position.copy(this.worldToScene(object.userData.world));
      }
      if (entry.hero.visible) {
        const alpha = active ? 1 : clamp(1 - nextDistance / 720, .12, .48);
        entry.hero.children[0].material.opacity = active ? .94 : alpha;
        entry.hero.rotation.z += (index % 2 ? -1 : 1) * delta * .002;
      }
      if (entry.secondary.visible) entry.secondary.rotation.z -= delta * .004;
      if (entry.landmark.visible) {
        entry.landmark.rotation.z += delta * (index % 2 ? -.06 : .06);
        entry.landmark.position.y += Math.sin(elapsed * .7 + index) * .025;
      }
      if (entry.auxiliary?.visible) entry.auxiliary.rotation.z += delta * .04;
      entry.finalNodes.forEach((node, nodeIndex) => {
        if (node.visible) node.rotation.z += delta * (nodeIndex % 2 ? -.08 : .08);
      });

      entry.meteors.forEach((meteor) => this.updateMeteor(meteor, active, delta, elapsed));
      entry.targets.forEach((target) => this.updateTarget(target, active, delta, elapsed));
      if (entry.core) this.updateCore(entry.core, active, delta, elapsed);
      if (entry.gem) this.updateGem(entry.gem, active, delta, elapsed);
    });

    const entered = this.regionIndexAt();
    if (entered !== this.state.stage && entered <= this.state.unlockedStage && distance(this.state.worldPosition, REGIONS[entered].center) < WORLD.regionEnterRadius) {
      this.enterRegion(entered, elapsed);
    }
  }

  updateMeteor(meteor, active, delta, elapsed) {
    meteor.visible = active && distance(this.state.worldPosition, meteor.userData.world) < WORLD.meteorVisibleRadius;
    if (!meteor.visible) return;
    meteor.userData.world.addScaledVector(meteor.userData.velocity, delta);
    const region = REGIONS[this.state.stage];
    const fromCenter = meteor.userData.world.clone().sub(new THREE.Vector2(region.center.x, region.center.y));
    if (fromCenter.length() > 610) {
      fromCenter.setLength(580);
      meteor.userData.world.copy(new THREE.Vector2(region.center.x, region.center.y).add(fromCenter.multiplyScalar(-1)));
    }
    meteor.position.copy(this.worldToScene(meteor.userData.world));
    meteor.rotation += delta * .18;
    const actorWorld = this.state.worldPosition;
    const collision = distance(actorWorld, meteor.userData.world) < meteor.userData.radius + 18;
    if (collision && elapsed - meteor.userData.lastHit > .8) {
      meteor.userData.lastHit = elapsed;
      this.damage(meteor.userData.damage, meteor.userData.world, elapsed);
    }
  }

  updateTarget(target, active, delta, elapsed) {
    const data = target.userData;
    target.visible = active && !data.destroyed && distance(this.state.worldPosition, data.world) < WORLD.meteorVisibleRadius;
    if (!target.visible) return;
    const speed = data.stage === 0 ? .20 : data.stage === 1 ? .46 : .72;
    const radius = data.stage === 0 ? 26 : data.stage === 1 ? 46 : 66;
    data.phase += delta * speed;
    data.world.x = data.origin.x + Math.cos(data.phase) * radius;
    data.world.y = data.origin.y + Math.sin(data.phase * 1.18) * radius * .58;
    if (data.stage >= 1) {
      const toPlayer = this.state.worldPosition.clone().sub(data.world);
      if (toPlayer.length() < 160) {
        const away = toPlayer.normalize().multiplyScalar(-delta * (data.stage === 1 ? 18 : 30));
        data.world.add(away);
      }
    }
    target.position.copy(this.worldToScene(data.world));
    target.rotation += delta * .16;
    target.material.opacity = data.scanned ? .94 : .38;
    if (data.scanned) target.material.color.set(data.hp <= 1 ? 0xffffff : 0xffa2f1);
  }

  createCore(stage) {
    const entry = this.regionObjects[stage];
    if (entry.core) return entry.core;
    const sprite = this.sprite("/assets/runtime/space-animated/asteroid_core/02.png", .95);
    sprite.scale.set(.23, .23, 1);
    sprite.position.z = .08;
    sprite.userData = {
      type: "target-core",
      stage,
      world: new THREE.Vector2(REGIONS[stage].landmark.x + 105, REGIONS[stage].landmark.y - 35),
      hp: REGIONS[stage].mission.coreHp,
      maxHp: REGIONS[stage].mission.coreHp,
      radius: 42,
      scanned: true,
      destroyed: false,
      phase: stage * .8,
    };
    this.worldGroup.add(sprite);
    entry.core = sprite;
    return sprite;
  }

  updateCore(core, active, delta, elapsed) {
    const data = core.userData;
    core.visible = active && !data.destroyed && distance(this.state.worldPosition, data.world) < WORLD.meteorVisibleRadius;
    if (!core.visible) return;
    data.phase += delta * (.25 + data.stage * .14);
    data.world.x += Math.cos(data.phase) * delta * (data.stage === 0 ? 2 : 5);
    data.world.y += Math.sin(data.phase * .87) * delta * (data.stage === 0 ? 2 : 5);
    if (data.stage >= 1 && distance(this.state.worldPosition, data.world) < 190) {
      const repel = this.state.worldPosition.clone().sub(data.world).normalize().multiplyScalar(delta * (data.stage === 1 ? 16 : 25));
      this.state.velocity.addScaledVector(repel, .015);
    }
    core.position.copy(this.worldToScene(data.world));
    core.rotation += delta * .25;
    const ratio = data.hp / data.maxHp;
    core.material.color.setRGB(1, .45 + ratio * .45, .72 + ratio * .28);
  }

  createGem(stage) {
    const entry = this.regionObjects[stage];
    if (entry.gem) return entry.gem;
    const root = new THREE.Group();
    root.userData.world = new THREE.Vector2(REGIONS[stage].landmark.x + 45, REGIONS[stage].landmark.y + 5);
    root.userData.stage = stage;
    root.userData.collected = false;
    const shell = new THREE.Mesh(
      new THREE.OctahedronGeometry(.095, 1),
      new THREE.MeshBasicMaterial({ color: stage === 1 ? 0xa86cff : stage === 2 ? 0xff58dc : 0x66eaff, transparent: true, opacity: .72, wireframe: false, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    shell.scale.y = 1.45;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(.045, 1), this.geometryMaterial(0xffffff, .95, true));
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(.14, .008, 8, 48), this.geometryMaterial(COLORS.cyan, .62, true));
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(.18, .006, 8, 48), this.geometryMaterial(COLORS.magenta, .52, true));
    ringA.rotation.x = .55;
    ringB.rotation.y = .75;
    root.add(shell, core, ringA, ringB);
    root.position.z = .15;
    root.visible = false;
    this.worldGroup.add(root);
    entry.gem = root;
    return root;
  }

  updateGem(gem, active, delta, elapsed) {
    gem.visible = active && !gem.userData.collected && distance(this.state.worldPosition, gem.userData.world) < WORLD.meteorVisibleRadius;
    if (!gem.visible) return;
    gem.position.copy(this.worldToScene(gem.userData.world));
    gem.position.y += Math.sin(elapsed * 1.8) * .04;
    gem.rotation.y += delta * .55;
    gem.rotation.z -= delta * .18;
    gem.children[2].rotation.z += delta * .75;
    gem.children[3].rotation.x -= delta * .55;
    gem.scale.setScalar(.92 + Math.sin(elapsed * 2.2) * .08);
  }

  damage(amount, sourceWorld, elapsed) {
    if (elapsed - this.state.lastDamageAt < .72) return;
    this.state.lastDamageAt = elapsed;
    this.state.shield = Math.max(0, this.state.shield - amount);
    this.state.damageReceived += amount;
    this.ui.setShield(this.state.shield);
    this.audio.event("hit");
    this.cameraCue("impact", .55);
    if (!this.messageSeen.has("damage")) this.companion("damage", 6, true);
    if (this.state.shield <= 25) this.companion("lowShield", 8, true);
    const away = this.state.worldPosition.clone().sub(sourceWorld).normalize();
    this.state.velocity.addScaledVector(away, .28);
    if (this.state.shield <= 0) this.emergencyRespawn(elapsed);
  }

  emergencyRespawn(elapsed) {
    const region = REGIONS[this.state.stage];
    this.state.worldPosition.set(region.center.x, region.center.y);
    this.state.velocity.set(0, 0);
    this.state.shield = 65;
    this.ui.setShield(this.state.shield);
    this.ui.showMessage("PULSO DE EMERGENCIA", "Volviste a la última baliza. El encuentro continúa.", elapsed, 9, 5.5);
  }

  scannerCandidate() {
    const entry = this.regionObjects[this.state.stage];
    const candidates = [
      ...entry.targets.filter((target) => !target.userData.destroyed && !target.userData.scanned),
      entry.landmark,
      entry.auxiliary,
      ...entry.finalNodes,
      entry.gem,
    ].filter(Boolean);
    return candidates
      .map((object) => ({ object, world: object.userData.world, d: distance(this.state.worldPosition, object.userData.world) }))
      .filter((item) => item.d <= WORLD.scanRadius)
      .sort((a, b) => a.d - b.d)[0]?.object || null;
  }

  updateScanner(delta, elapsed) {
    this.scanner.active = this.keys.has("e");
    const actor = this.state.mode === "ship" ? this.shipGroup : this.astronautGroup;
    this.scannerRing.position.copy(actor.position);
    this.scannerRing.material.opacity += ((this.scanner.active ? .30 : 0) - this.scannerRing.material.opacity) * (1 - Math.exp(-delta * 10));
    this.scannerRing.rotation.z += delta * 1.4;
    this.scannerRing.scale.setScalar(1 + Math.sin(elapsed * 3) * .05);

    if (!this.scanner.active) {
      this.scanner.target = null;
      this.scanner.progress = Math.max(0, this.scanner.progress - delta * .8);
      this.ui.setScanner(false);
      return;
    }

    const candidate = this.scannerCandidate();
    if (!candidate) {
      this.scanner.target = null;
      this.scanner.progress = Math.max(0, this.scanner.progress - delta * .5);
      this.ui.setScanner(true, this.scanner.progress);
      return;
    }

    if (candidate !== this.scanner.target) {
      this.scanner.target = candidate;
      this.scanner.progress = 0;
      this.companion("scan", 4, true);
      this.audio.event("scan");
    }
    const scanMultiplier = this.bonus.id === "scanner" && elapsed < this.bonus.until ? 2.2 : 1;
    this.scanner.progress = Math.min(1, this.scanner.progress + delta * .52 * scanMultiplier);
    this.ui.setScanner(true, this.scanner.progress);
    if (this.scanner.progress >= 1) {
      this.completeInteraction(candidate, elapsed);
      this.scanner.target = null;
      this.scanner.progress = 0;
    }
  }

  completeInteraction(object, elapsed) {
    const data = object.userData;
    if (data.type === "target-small") {
      data.scanned = true;
      object.material.opacity = .94;
      this.ui.showMessage("OBJETIVO IDENTIFICADO", "Hacé click para iniciar autoaim.", elapsed, 4);
      this.markProgress(elapsed);
      return;
    }
    if (data.stage !== undefined && object === this.regionObjects[data.stage].gem) {
      this.collectGem(data.stage, elapsed);
      return;
    }
    const spec = data.spec;
    if (!spec) return;
    if (spec.kind === "beacon") {
      this.bonus = { id: "recovery", until: elapsed + 12 };
      this.state.secondary.add("beacon");
      this.ui.showMessage("BALIZA ESTABILIZADA", "Checkpoint actualizado y recuperación mejorada.", elapsed, 6);
    } else if (spec.kind === "ring") {
      this.bonus = { id: "slingshot", until: elapsed + 12 };
      this.state.secondary.add("slingshot");
      this.ui.showMessage("ANILLO SINCRONIZADO", "El próximo slingshot tendrá impulso adicional.", elapsed, 6);
    } else if (spec.kind === "station") {
      this.bonus = { id: "scanner", until: elapsed + 18 };
      this.ui.showMessage("SCANNER AMPLIFICADO", "Las señales se revelan más rápido.", elapsed, 5);
    } else if (spec.kind === "rift") {
      this.bonus = { id: "stability", until: elapsed + 18 };
      this.state.secondary.add("rift");
      this.ui.showMessage("RIFT IDENTIFICADO", "Las señales falsas quedaron marcadas.", elapsed, 6);
    } else if (spec.kind === "node") {
      const region = this.regionObjects[3];
      const index = region.finalNodes.indexOf(object);
      if (index >= 0) {
        this.mission.finalNodes.add(index);
        object.children.forEach((child) => child.material?.color?.set?.(0xffffff));
        this.ui.showMessage(`NODO ${String.fromCharCode(65 + index)} ESTABILIZADO`, `${this.mission.finalNodes.size}/3 nodos activos.`, elapsed, 7);
        if (this.mission.finalNodes.size === 3) {
          this.ui.setMission("ACTIVÁ EL PORTAL", "Acercate al centro y mantené E.");
          this.markProgress(elapsed);
        }
      } else {
        this.bonus = { id: "stability", until: elapsed + 18 };
        this.ui.showMessage("NODO RECONFIGURADO", "La gravedad será más estable temporalmente.", elapsed, 6);
      }
    } else if (spec.kind === "portal") {
      if (this.state.gems >= 3 && this.mission.finalNodes.size >= 3) this.finishGame(elapsed);
      else this.ui.showMessage("PORTAL INESTABLE", "Necesitás tres gemas y tres nodos activos.", elapsed, 7);
    }
    data.interacted = true;
    this.audio.event("success");
    this.markProgress(elapsed);
  }

  tryAim() {
    if (this.aim.active || this.ui.mapOpen || this.ui.settingsOpen) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const entry = this.regionObjects[this.state.stage];
    const objects = [...entry.targets, entry.core].filter(Boolean).filter((object) => object.visible && !object.userData.destroyed && object.userData.scanned !== false);
    const hit = this.raycaster.intersectObjects(objects, false)[0];
    if (!hit) return;
    this.aim.active = true;
    this.aim.target = hit.object;
    this.aim.progress = 0;
    this.aim.fired = false;
    this.cameraCue("aim", 2);
    this.state.shots += 1;
  }

  updateAim(delta, elapsed) {
    if (!this.aim.active || !this.aim.target) return;
    const shooter = this.state.mode === "ship" ? this.shipGroup : this.astronautGroup;
    const target = this.aim.target;
    const dx = target.position.x - shooter.position.x;
    const dy = target.position.y - shooter.position.y;
    const desired = Math.atan2(dy, dx) - Math.PI / 2;
    shooter.rotation.z = lerp(shooter.rotation.z, desired, 1 - Math.exp(-delta * 5.5));
    this.aim.progress += delta;
    if (this.aim.progress >= .65 && !this.aim.fired) {
      this.aim.fired = true;
      this.fireProjectile(shooter, target, elapsed);
    }
    if (this.aim.progress > 1.5) {
      this.aim.active = false;
      this.aim.target = null;
      this.aim.fired = false;
      if (this.state.mode === "astronaut") this.astronautGroup.rotation.z = 0;
    }
  }

  fireProjectile(shooter, target, elapsed) {
    const geometry = new THREE.CircleGeometry(this.state.mode === "ship" ? .028 : .020, 20);
    const material = new THREE.MeshBasicMaterial({ color: this.state.mode === "ship" ? COLORS.magenta : COLORS.cyan, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(shooter.position);
    mesh.position.z = .75;
    const direction = target.position.clone().sub(mesh.position).normalize();
    mesh.userData = { velocity: direction.multiplyScalar(this.state.mode === "ship" ? 2.7 : 3.0), target, life: 1.4, sourceMode: this.state.mode };
    this.fxGroup.add(mesh);
    this.projectiles.push(mesh);
    this.audio.event("fire");
  }

  updateProjectiles(delta, elapsed) {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.position.addScaledVector(projectile.userData.velocity, delta);
      projectile.userData.life -= delta;
      const target = projectile.userData.target;
      if (target && target.visible && projectile.position.distanceTo(target.position) < .10) {
        this.hitTarget(target, projectile.userData.sourceMode, elapsed);
        this.fxGroup.remove(projectile);
        projectile.geometry.dispose();
        projectile.material.dispose();
        this.projectiles.splice(index, 1);
        continue;
      }
      if (projectile.userData.life <= 0) {
        this.fxGroup.remove(projectile);
        projectile.geometry.dispose();
        projectile.material.dispose();
        this.projectiles.splice(index, 1);
      }
    }
  }

  hitTarget(target, sourceMode, elapsed) {
    const data = target.userData;
    if (data.type === "target-small" && sourceMode !== "astronaut") {
      this.ui.showMessage("ARMA INCORRECTA", "Los fragmentos pequeños requieren la herramienta del astronauta.", elapsed, 5);
      return;
    }
    if (data.type === "target-core" && sourceMode !== "ship") {
      this.ui.showMessage("POTENCIA INSUFICIENTE", "Volvé a la nave para romper el núcleo.", elapsed, 5);
      return;
    }
    data.hp -= 1;
    this.state.hits += 1;
    this.audio.event("hit");
    if (data.hp > 0) return;
    data.destroyed = true;
    target.visible = false;
    this.state.destroyed += 1;
    if (data.type === "target-small") {
      this.mission.smallDestroyed += 1;
      const required = REGIONS[this.state.stage].mission.small;
      this.ui.setMission(`FRAGMENTOS ${this.mission.smallDestroyed}/${required}`, "Escaneá y destruí los restantes.");
      if (this.mission.smallDestroyed >= required) {
        this.mission.phase = "core";
        const core = this.createCore(this.state.stage);
        core.userData.scanned = true;
        this.companion("core", 7);
        this.ui.setMission("DESTRUÍ EL NÚCLEO", `Impactos restantes: ${core.userData.hp}`);
        this.cameraCue("landmark", 3.5);
      }
    } else if (data.type === "target-core") {
      this.mission.phase = "gem";
      this.mission.gemReady = true;
      this.createGem(this.state.stage);
      this.companion("gem", 7);
      this.ui.setMission("SINCRONIZÁ LA GEMA", "Acercate a la gema y mantené E.");
      this.cameraCue("gem", 4);
    }
    this.markProgress(elapsed);
  }

  collectGem(stage, elapsed) {
    const gem = this.regionObjects[stage].gem;
    if (!gem || gem.userData.collected) return;
    gem.userData.collected = true;
    gem.visible = false;
    this.state.gems = Math.min(3, this.state.gems + 1);
    this.state.unlockedStage = Math.max(this.state.unlockedStage, Math.min(3, stage + 1));
    this.mission.completedStages.add(stage);
    this.ui.setGems(this.state.gems);
    this.audio.event("gem");
    this.companion("route", 7);
    this.ui.setMission("VIAJÁ A LA SIGUIENTE REGIÓN", "Abrí el mapa con M y seguí el rumbo.");
    this.cameraCue("transition", 4.5);
    this.markProgress(elapsed);
  }

  updateRoute() {
    let targetRegion = this.state.stage;
    if (this.mission.completedStages.has(this.state.stage) && this.state.stage < 3) targetRegion = this.state.stage + 1;
    else if (this.state.stage === 3) targetRegion = 3;
    else targetRegion = this.state.stage;
    const target = this.mission.completedStages.has(this.state.stage) && this.state.stage < 3 ? REGIONS[targetRegion].center : REGIONS[this.state.stage].landmark;
    const dx = target.x - this.state.worldPosition.x;
    const dy = target.y - this.state.worldPosition.y;
    const d = Math.hypot(dx, dy);
    const visible = d > 90;
    this.ui.setRoute(Math.atan2(dy, dx), `${targetRegion === this.state.stage ? REGIONS[this.state.stage].landmark.name : REGIONS[targetRegion].name} · ${Math.round(d)} u`, visible);
  }

  scheduleEvent(elapsed, delay = null) {
    const intervals = [{ min: 18, max: 25 }, { min: 12, max: 20 }, { min: 8, max: 16 }, { min: 10, max: 14 }];
    const profile = intervals[this.state.stage];
    this.event.nextAt = elapsed + (delay ?? profile.min + Math.random() * (profile.max - profile.min));
  }

  triggerEvent(elapsed) {
    if (this.event.id || this.aim.active || this.ui.mapOpen || this.mission.phase === "gem") return;
    const region = REGIONS[this.state.stage];
    const list = region.environment;
    const cursor = this.event.cursor[this.state.stage] % list.length;
    this.event.cursor[this.state.stage] += 1;
    this.event.id = list[cursor];
    this.event.startedAt = elapsed;
    this.event.endsAt = elapsed + EVENT_DEFS[this.event.id].duration;
    const definition = EVENT_DEFS[this.event.id];
    this.ui.showEvent(definition, true);
    this.ui.showMessage(definition.title, definition.detail, elapsed, 5);
    this.audio.event("warning");
    this.cameraCue(definition.className === "pulse" ? "impact" : "pursuit", Math.min(4, definition.duration));
    if (definition.bonus) this.bonus = { id: definition.bonus, until: elapsed + definition.duration };
  }

  updateEvent(elapsed) {
    if (this.event.id && elapsed >= this.event.endsAt) {
      this.event.id = null;
      this.ui.showEvent(null, false);
      this.scheduleEvent(elapsed);
    }
    if (!this.event.id && elapsed >= this.event.nextAt) this.triggerEvent(elapsed);
  }

  updateHelp(elapsed) {
    const signature = `${this.state.stage}:${this.mission.phase}:${this.mission.smallDestroyed}:${this.state.gems}:${this.mission.finalNodes.size}`;
    if (signature !== this.help.signature) {
      this.help.signature = signature;
      this.help.lastProgressAt = elapsed;
      this.help.sent = false;
    }
    if (!this.help.sent && elapsed - this.help.lastProgressAt >= 35) {
      this.help.sent = true;
      this.companion("help", 5);
      document.body.classList.add("gz-route-help");
      window.setTimeout(() => document.body.classList.remove("gz-route-help"), 6500);
    }
  }

  updateLandmarkProximity(elapsed) {
    const entry = this.regionObjects[this.state.stage];
    const candidates = [entry.landmark, entry.auxiliary, ...entry.finalNodes, entry.gem].filter(Boolean);
    const nearest = candidates
      .map((object) => ({ object, d: distance(this.state.worldPosition, object.userData.world) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!nearest || nearest.d > WORLD.interactionRadius) return;
    if (this.keys.has("e")) this.completeInteraction(nearest.object, elapsed);
  }

  updateCamera(delta, elapsed) {
    let mode = this.cameraState.mode;
    if (elapsed > this.cameraState.until && !this.aim.active) mode = "exploration";
    if (this.aim.active) mode = "aim";
    const profiles = {
      exploration: { zoom: 1, tilt: 0 },
      transition: { zoom: .90, tilt: .006 },
      landmark: { zoom: 1.08, tilt: -.012 },
      pursuit: { zoom: 1.10, tilt: .018 },
      aim: { zoom: 1.15, tilt: .010 },
      impact: { zoom: 1.18, tilt: -.026 },
      gem: { zoom: 1.12, tilt: 0 },
      final: { zoom: 1.18, tilt: .015 },
    };
    const profile = profiles[mode] || profiles.exploration;
    const intensity = this.settings.reduceMotion ? .20 : this.settings.camera;
    const targetZoom = 1 + (profile.zoom - 1) * intensity;
    this.camera.zoom = lerp(this.camera.zoom, targetZoom, 1 - Math.exp(-delta * 5));
    this.camera.rotation.z = lerp(this.camera.rotation.z, profile.tilt * intensity, 1 - Math.exp(-delta * 4));
    this.camera.updateProjectionMatrix();
  }

  updateTether() {
    const points = this.tether.geometry.attributes.position;
    points.setXYZ(0, this.shipGroup.position.x, this.shipGroup.position.y, .42);
    points.setXYZ(1, this.astronautGroup.position.x, this.astronautGroup.position.y, .42);
    points.needsUpdate = true;
    const length = Math.hypot(this.astronautGroup.position.x - this.shipGroup.position.x, this.astronautGroup.position.y - this.shipGroup.position.y);
    this.tether.material.opacity = .22 + clamp(length / WORLD.maxAstronautDistanceScene, 0, 1) * .45;
  }

  actorScreenPoint() {
    const actor = this.state.mode === "ship" ? this.shipGroup.position : this.astronautGroup.position;
    const projected = actor.clone().project(this.camera);
    return {
      x: (projected.x * .5 + .5) * window.innerWidth,
      y: (-projected.y * .5 + .5) * window.innerHeight,
    };
  }

  updateHud(elapsed) {
    this.ui.updateMessages(elapsed);
    this.ui.setShield(this.state.shield);
    this.updateRoute();
    this.ui.setGravity(this.gravitySample || { magnitude: 0 }, this.actorScreenPoint());
    if (this.ui.mapOpen) this.ui.drawMap({ state: this.state, discovered: this.state.discoveredRegions, unlocked: this.state.unlockedStage });
    if (this.bonus.id && elapsed < this.bonus.until) {
      const labels = { scanner: "SCANNER +", recovery: "RECUPERACIÓN", slingshot: "IMPULSO ORBITAL", stability: "ESTABILIDAD" };
      this.ui.setBonus(labels[this.bonus.id] || this.bonus.id, this.bonus.until - elapsed);
    } else {
      this.ui.setBonus("", 0);
      this.bonus.id = null;
    }
  }

  recoverShield(delta, elapsed) {
    if (elapsed - this.state.lastDamageAt < 3) return;
    const rate = this.bonus.id === "recovery" && elapsed < this.bonus.until ? 4.2 : 2.1;
    this.state.shield = Math.min(100, this.state.shield + delta * rate);
  }

  finishGame(elapsed) {
    if (this.state.finalComplete) return;
    this.state.finalComplete = true;
    this.audio.event("score");
    const timeSeconds = elapsed - this.state.startedAt;
    const accuracy = this.state.shots ? this.state.hits / this.state.shots : 1;
    let points = 0;
    points += accuracy >= .85 ? 25 : accuracy >= .68 ? 18 : accuracy >= .5 ? 10 : 4;
    points += timeSeconds <= 720 ? 25 : timeSeconds <= 900 ? 18 : timeSeconds <= 1080 ? 10 : 5;
    points += this.state.damageReceived <= 20 ? 20 : this.state.damageReceived <= 45 ? 13 : this.state.damageReceived <= 70 ? 7 : 2;
    points += this.state.secondary.size >= 3 ? 20 : this.state.secondary.size * 6;
    points += this.stats.regions.size >= 4 ? 10 : this.stats.regions.size * 2;
    const grade = points >= 90 ? "S" : points >= 74 ? "A" : points >= 56 ? "B" : "C";
    this.ui.showScore({
      grade,
      time: formatTime(timeSeconds),
      accuracy: Math.round(accuracy * 100),
      damage: Math.round(this.state.damageReceived),
      destroyed: this.state.destroyed,
      secondary: this.state.secondary.size,
      slingshots: this.state.slingshots,
      regions: this.stats.regions.size,
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), .033);
    const elapsed = this.clock.elapsedTime;
    if (!this.state.missionStarted) return;

    this.updateMovement(delta, elapsed);
    this.updateWorld(delta, elapsed);
    this.updateScanner(delta, elapsed);
    this.updateLandmarkProximity(elapsed);
    this.updateAim(delta, elapsed);
    this.updateProjectiles(delta, elapsed);
    this.updateEvent(elapsed);
    this.updateHelp(elapsed);
    this.updateCamera(delta, elapsed);
    this.updateTether();
    this.recoverShield(delta, elapsed);
    this.updateHud(elapsed);

    const starDrift = this.state.velocity.clone().multiplyScalar(-delta * .025);
    this.starfield.position.x += starDrift.x;
    this.starfield.position.y += starDrift.y;
    this.nebula.position.x = this.state.worldPosition.x * -.00008;
    this.nebula.position.y = this.state.worldPosition.y * -.00005;
    this.audio.update({
      region: this.state.stage,
      speed: this.state.velocity.length(),
      gravity: this.gravitySample?.magnitude || 0,
      turbo: this.turbo.pulse,
      mapOpen: this.ui.mapOpen,
    });

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
