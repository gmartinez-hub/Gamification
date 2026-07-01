// src/ui/RobotCompanionController.js
// Skeleton for a Three-wrapped HUD companion.

export class RobotCompanionController {
  constructor({ THREE, scene, textures, audio, panel }) {
    this.THREE = THREE;
    this.scene = scene;
    this.textures = textures;
    this.audio = audio;
    this.panel = panel;
    this.state = "idle";
    this.time = 0;
    this.isPanelOpen = false;

    this.group = new THREE.Group();

    this.glow = this.makeSprite(textures.glowCyan, {
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow.scale.set(0.42, 0.42, 1);

    this.sprite = this.makeSprite(textures.robotIdle, {
      opacity: 1,
      depthWrite: false,
    });
    this.sprite.scale.set(0.34, 0.34, 1);

    this.shadow = this.makeSprite(textures.robotShadow, {
      opacity: 0.34,
      depthWrite: false,
    });
    this.shadow.position.set(0, -0.23, -0.01);
    this.shadow.scale.set(0.35, 0.16, 1);

    this.group.add(this.glow, this.shadow, this.sprite);
    this.group.position.set(0.88, 0.78, 0.2);
    this.scene.add(this.group);
  }

  makeSprite(texture, options = {}) {
    const material = new this.THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: options.opacity ?? 1,
      blending: options.blending ?? this.THREE.NormalBlending,
      depthWrite: options.depthWrite ?? false,
    });
    return new this.THREE.Sprite(material);
  }

  setState(state) {
    this.state = state;

    const map = {
      idle: this.textures.robotIdle,
      ready: this.textures.robotReady,
      alert: this.textures.robotAlert,
      hint: this.textures.robotHint,
      stage_clear: this.textures.robotStageClear,
    };

    if (map[state]) this.sprite.material.map = map[state];

    if (state === "alert") {
      this.glow.material.map = this.textures.glowMagenta;
      this.glow.material.opacity = 0.46;
      this.audio?.playOneShot?.("robot_alert_ping");
    } else if (state === "stage_clear") {
      this.glow.material.map = this.textures.glowMagenta;
      this.glow.material.opacity = 0.58;
      this.audio?.playOneShot?.("robot_stage_clear_chime");
    } else {
      this.glow.material.map = this.textures.glowCyan;
      this.glow.material.opacity = 0.28;
    }
  }

  togglePanel(message, counters) {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.audio?.playOneShot?.("robot_open_hint");
      this.panel?.show?.({ message, counters });
      this.pulse();
    } else {
      this.audio?.playOneShot?.("robot_close_hint");
      this.panel?.hide?.();
    }
  }

  updateCounters(counters) {
    this.audio?.playOneShot?.("robot_item_update");
    this.panel?.updateCounters?.(counters);
  }

  say(message) {
    this.panel?.show?.({ message });
  }

  pulse() {
    this.group.userData.pulseTime = 0.22;
  }

  update(delta) {
    this.time += delta;
    const bob = Math.sin(this.time * 2.2) * 0.012;
    const tilt = Math.sin(this.time * 1.35) * 0.035;
    this.group.position.y = 0.78 + bob;
    this.group.rotation.z = tilt;

    if (this.group.userData.pulseTime > 0) {
      this.group.userData.pulseTime -= delta;
      const p = Math.max(0, this.group.userData.pulseTime / 0.22);
      const s = 1 + Math.sin(p * Math.PI) * 0.08;
      this.sprite.scale.set(0.34 * s, 0.34 * s, 1);
    } else {
      this.sprite.scale.set(0.34, 0.34, 1);
    }
  }
}
