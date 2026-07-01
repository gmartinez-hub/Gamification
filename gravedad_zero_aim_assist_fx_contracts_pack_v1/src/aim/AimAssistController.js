// src/aim/AimAssistController.js
// Skeleton; integrate with existing Mission01Controller/ProjectileSystem.

export class AimAssistController {
  constructor({ audio, vfx, projectiles, mission, cameraFx }) {
    this.audio = audio;
    this.vfx = vfx;
    this.projectiles = projectiles;
    this.mission = mission;
    this.cameraFx = cameraFx;
    this.active = null;
  }

  canTarget(target, phase) {
    const type = target?.userData?.type || target?.userData?.targetType;
    if (!target || target.userData?.destroyed) return false;
    if (phase === "astronaut_phase") return type === "small_asteroid";
    if (phase === "large_obstacle_phase") return type === "large_obstacle";
    if (phase === "relic_phase") return type === "relic";
    return false;
  }

  start({ actor, target, action, phase }) {
    if (this.active) return false;
    if (!this.canTarget(target, phase)) {
      this.audio?.playOneShot?.("invalid_target_blip");
      return false;
    }

    this.active = { actor, target, action, phase, time: 0, duration: 0.78, fired: false };

    this.audio?.playOneShot?.("aim_click_ping");
    this.vfx?.playAtlas?.("clickPulseAtlas", target.position);
    this.audio?.playOneShot?.("aim_lock_confirm");
    this.vfx?.attach?.("targetLockReticleAtlas", target);
    this.audio?.playOneShot?.("slow_motion_enter");
    this.audio?.playLoop?.("aim_focus_low_loop");
    this.cameraFx?.enterAimSlowMotion?.();

    return true;
  }

  update(delta) {
    if (!this.active) return;
    const a = this.active;
    a.time += delta;

    if (a.time < 0.32) {
      this.orientActorToTarget(a.actor, a.target, a.time / 0.32);
    }

    if (!a.fired && a.time >= 0.32) {
      a.fired = true;
      this.fire(a);
    }

    if (a.time >= a.duration) this.finish();
  }

  orientActorToTarget(actor, target, progress) {
    actor.userData ??= {};
    actor.userData.aimTarget = target;
    actor.userData.aimProgress = progress;
    this.vfx?.show?.("zeroGRotationStreaks", actor.position);
  }

  fire(a) {
    this.audio?.playOneShot?.("fire_release_snap");
    this.vfx?.play?.("fireReleaseFlash", a.actor.position);

    if (a.action === "tool_pulse") {
      this.audio?.playOneShot?.("astronaut_tool_fire_cue");
      this.projectiles?.spawnAstronautToolPulse?.({
        from: a.actor.position,
        to: a.target.position,
        onComplete: () => this.mission?.onSmallAsteroidHit?.(a.target),
      });
    }

    if (a.action === "heavy_shot") {
      this.audio?.playOneShot?.("ship_heavy_fire_cue");
      this.projectiles?.spawnShipHeavyShot?.({
        from: a.actor.position,
        to: a.target.position,
        onImpact: () => this.mission?.onLargeObstacleHit?.(a.target),
      });
    }

    if (a.action === "touch_relic") {
      this.mission?.onAstronautTouchRelic?.(a.target);
    }
  }

  finish() {
    this.audio?.stopLoop?.("aim_focus_low_loop");
    this.audio?.playOneShot?.("slow_motion_exit_snap");
    this.cameraFx?.exitAimSlowMotion?.();
    this.vfx?.detach?.("targetLockReticleAtlas");
    this.active = null;
  }
}
