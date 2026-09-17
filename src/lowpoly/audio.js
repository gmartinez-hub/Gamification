const SHIP = '../../nave_three_audio_pack_v2_refined/';
const AIM = '../../gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/';
const MISSION = '../../gravedad_zero_mission_01_completion_pack_v1/assets/audio/';
const ROBOT = '../../gravedad_zero_robot_companion_hud_pack_v1/assets/audio/';
const RUNTIME = '../../assets/runtime/gravedad-zero/audio/';

const FILES = {
  click: SHIP + 'ui_mission_click_refined_01.wav',
  attach: SHIP + 'ship_module_attach_refined_04.wav',
  idle: SHIP + 'engine_idle_clean_loop_05.wav',
  move: SHIP + 'engine_move_clean_loop_06.wav',
  boost: SHIP + 'engine_boost_clean_loop_07.wav',
  warp: SHIP + 'motion_warp_jump_refined_10.wav',
  shield: SHIP + 'combat_shield_hit_refined_11.wav',
  sparkle: SHIP + 'reward_unlock_sparkle_refined_13.wav',
  space: SHIP + 'ambient_space_low_loop_14.wav',
  target: AIM + 'aim_lock_confirm_02.wav',
  evaFire: AIM + 'astronaut_tool_fire_cue_06.wav',
  shipFire: AIM + 'ship_heavy_fire_cue_07.wav',
  focus: AIM + 'aim_focus_low_loop_10.wav',
  airlock: MISSION + 'astronaut_exit_airlock_02.wav',
  smallHit: MISSION + 'small_asteroid_hit_03.wav',
  smallBreak: MISSION + 'small_asteroid_break_04.wav',
  largeHit: MISSION + 'large_obstacle_hit_06.wav',
  largeBreak: MISSION + 'large_obstacle_break_07.wav',
  reveal: MISSION + 'relic_reveal_08.wav',
  burst: MISSION + 'relic_expansion_burst_09.wav',
  relic: MISSION + 'relic_idle_clean_loop_10.wav',
  touch: MISSION + 'astronaut_touch_relic_11.wav',
  transfer: MISSION + 'energy_transfer_to_ship_12.wav',
  complete: MISSION + 'stage_unlocked_arcade_13.wav',
  hint: ROBOT + 'robot_open_hint_01.wav',
  hintClose: ROBOT + 'robot_close_hint_02.wav',
  warning: ROBOT + 'robot_alert_ping_03.wav',
  stageClear: ROBOT + 'robot_stage_clear_chime_04.wav',
  item: ROBOT + 'robot_item_update_05.wav',
  ramp: RUNTIME + 'turbo_engine_ramp.wav',
  passby: RUNTIME + 'target_orbit_passby.wav',
  beacon: RUNTIME + 'sector_beacon_far_ping.wav',
  stabilize: RUNTIME + 'zero_g_lock_stabilize.wav',
};

// [sample, gain] layers, cooldown seconds, optional ambience duck seconds.
const CUES = {
  ui: { layers: [['click', .22]], cooldown: .09 },
  target: { layers: [['target', .23]], cooldown: .35 },
  scan: { layers: [['beacon', .22]], cooldown: .9, duck: .8 },
  evaExit: { layers: [['airlock', .26]], cooldown: .7 },
  return: { layers: [['transfer', .25]], cooldown: .7, duck: 1 },
  evaFire: { layers: [['evaFire', .28]], cooldown: .11 },
  shipFire: { layers: [['shipFire', .32]], cooldown: .15 },
  smallHit: { layers: [['smallHit', .22]], cooldown: .07 },
  smallBreak: { layers: [['smallBreak', .28]], cooldown: .1 },
  largeHit: { layers: [['largeHit', .26]], cooldown: .1 },
  largeBreak: { layers: [['largeBreak', .34]], cooldown: .2, duck: .65 },
  gemReveal: { layers: [['reveal', .26], ['burst', .12]], cooldown: 1.2, duck: 1.3 },
  gemCollect: { layers: [['touch', .27], ['sparkle', .16]], cooldown: 1, duck: 1.1 },
  transit: { layers: [['warp', .3], ['passby', .1]], cooldown: 1.4, duck: 1.3 },
  moduleAttach: { layers: [['attach', .34]], cooldown: .7, duck: 1 },
  warning: { layers: [['warning', .23]], cooldown: 1.8, duck: .6 },
  damage: { layers: [['shield', .32]], cooldown: .3, duck: .5 },
  rescue: { layers: [['stabilize', .25]], cooldown: 1.4, duck: 1.2 },
  complete: { layers: [['complete', .3], ['stageClear', .15]], cooldown: 2, duck: 1.8 },
  companionHint: { layers: [['hint', .16]], cooldown: 1.2, duck: .4 },
};
const LOOP_NAMES = ['space', 'idle', 'move', 'boost', 'focus', 'relic'];
const BIOMES = {
  nereida: { rate: 1, space: .085, focus: .012, relic: 0 },
  vesper: { rate: .89, space: .09, focus: .022, relic: .009 },
  umbra: { rate: .78, space: .10, focus: .028, relic: .022 },
};
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
const ignore = operation => { try { const result = operation(); result?.catch?.(() => {}); } catch { /* Audio cannot interrupt play. */ } };

/**
 * Gesture-owned local Web Audio mixer. Construction, update and settings never
 * create/resume browser audio. Call unlock() directly from an enabled gesture,
 * including a resume gesture after pausing or browser audio interruption.
 *
 * play(event, {volume = 1, rate = 1, variant}) returns whether a voice started.
 * companionHint variants: 'close', 'item'; default is the open hint cue.
 * update accepts thrust as a normalized number or a {x,y,z} vector, plus
 * optional aiming/relic booleans for sustained focus / visible gem ambience.
 */
export function createExpeditionAudio() {
  let context, master, filter, limiter, effects, ambience, motors;
  let enabled = false, paused = false, disposed = false, loading;
  let effectsVolume = .72, ambienceVolume = .6;
  let duckUntil = 0, focusUntil = 0, relicUntil = 0, wasBoosting = false;
  const buffers = new Map(), loops = new Map(), voices = new Set(), lastPlayed = new Map();
  const parameterTargets = new WeakMap();
  const abort = new AbortController();
  const state = { actor: 'ship', thrust: 0, boost: false, braking: false, biome: 'nereida', firstPerson: true };

  function active() { return !disposed && enabled && !paused && context?.state === 'running'; }

  function target(param, value, seconds = .065) {
    if (!param || parameterTargets.get(param) === value) return;
    ignore(() => {
      param.cancelScheduledValues(context.currentTime);
      if (seconds === 0) param.setValueAtTime(value, context.currentTime);
      else param.setTargetAtTime(value, context.currentTime, seconds);
      parameterTargets.set(param, value);
    });
  }

  function disconnectVoice(voice) {
    voice.source.onended = null;
    ignore(() => voice.source.disconnect()); ignore(() => voice.gain.disconnect());
    voices.delete(voice);
  }

  function stopVoice(voice) {
    voice.source.onended = null;
    ignore(() => voice.source.stop()); disconnectVoice(voice);
  }

  function stopAll() {
    for (const voice of voices) stopVoice(voice);
    for (const voice of loops.values()) stopVoice(voice);
    loops.clear(); lastPlayed.clear();
    duckUntil = focusUntil = relicUntil = 0; wasBoosting = false;
  }

  function silence() {
    target(master?.gain, 0, 0); stopAll();
    if (context && context.state !== 'closed') ignore(() => context.suspend());
  }

  function createGraph() {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      context = new AudioContext();
      effects = context.createGain(); ambience = context.createGain(); motors = context.createGain();
      master = context.createGain(); filter = context.createBiquadFilter(); limiter = context.createDynamicsCompressor();
      filter.type = 'lowpass'; filter.Q.value = .35;
      limiter.threshold.value = -8; limiter.knee.value = 12; limiter.ratio.value = 4;
      limiter.attack.value = .003; limiter.release.value = .18;
      master.gain.value = 0;
      effects.connect(filter); ambience.connect(filter); motors.connect(filter);
      filter.connect(limiter); limiter.connect(master); master.connect(context.destination);
      return true;
    } catch {
      for (const node of [effects, ambience, motors, filter, limiter, master]) ignore(() => node?.disconnect());
      if (context) ignore(() => context.close());
      context = master = filter = limiter = effects = ambience = motors = undefined;
      return false;
    }
  }

  async function load() {
    const owner = context;
    await Promise.allSettled(Object.entries(FILES).map(async ([id, path]) => {
      const response = await fetch(new URL(path, import.meta.url), { signal: abort.signal });
      if (!response.ok) return;
      const buffer = await owner.decodeAudioData(await response.arrayBuffer());
      if (disposed || owner !== context) return;
      // Only attenuate unexpected over-level files; never boost quiet ambience.
      let peak = 1;
      if (buffer.getChannelData) for (let c = 0; c < buffer.numberOfChannels; c++) {
        const samples = buffer.getChannelData(c);
        for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
      }
      buffers.set(id, { buffer, scale: 1 / peak });
    }));
  }

  function startVoice(id, volume, loop = false, rate = 1) {
    const sample = buffers.get(id);
    if (!sample || !active()) return null;
    let source, gain, voice;
    try {
      source = context.createBufferSource(); gain = context.createGain();
      source.buffer = sample.buffer; source.loop = loop; source.playbackRate.value = rate;
      gain.gain.value = volume * sample.scale;
      source.connect(gain); gain.connect(loop ? ['idle', 'move', 'boost'].includes(id) ? motors : ambience : effects);
      voice = { source, gain, scale: sample.scale };
      source.onended = () => {
        disconnectVoice(voice);
        if (loops.get(id) === voice) loops.delete(id);
      };
      source.start();
      if (loop) loops.set(id, voice); else voices.add(voice);
      return voice;
    } catch {
      if (voice) stopVoice(voice);
      else { ignore(() => source?.disconnect()); ignore(() => gain?.disconnect()); }
      return null;
    }
  }

  function ensureLoops() {
    if (!active()) return;
    for (const id of LOOP_NAMES) if (!loops.has(id)) startVoice(id, 0, true);
  }

  function loopGain(id, value, seconds = .075) {
    const voice = loops.get(id);
    if (voice) target(voice.gain.gain, value * voice.scale, seconds);
  }

  function mix() {
    if (!active()) return;
    const now = context.currentTime;
    const biome = BIOMES[state.biome?.biomeId || state.biome?.id || state.biome] || BIOMES.nereida;
    const eva = state.actor === 'eva' || state.actor === 'astronaut';
    const thrust = typeof state.thrust === 'number' ? clamp(state.thrust) : clamp(Math.hypot(state.thrust?.x || 0, state.thrust?.y || 0, state.thrust?.z || 0));
    const powered = thrust > .02;
    const boosting = state.boost && powered && !eva && !state.braking;
    const duck = now < duckUntil ? .32 : 1;
    target(master.gain, .8, .025);
    target(effects.gain, effectsVolume, .03);
    target(ambience.gain, ambienceVolume * duck, duck < 1 ? .035 : .22);
    target(motors.gain, effectsVolume * (duck < 1 ? .7 : 1), .06);
    target(filter.frequency, Math.min(context.sampleRate * .46, state.firstPerson ? eva ? 8500 : 11000 : 19000), .1);
    loopGain('space', biome.space * (eva ? 1.12 : .82));
    loopGain('idle', eva ? 0 : .048 * (1 - thrust * .5));
    loopGain('move', eva ? 0 : .14 * thrust * (boosting ? .45 : 1));
    loopGain('boost', boosting ? .19 * thrust : 0);
    loopGain('focus', biome.focus + (state.aiming || now < focusUntil ? .026 : 0) + (eva ? thrust * .038 + (state.braking ? .01 : 0) : 0));
    loopGain('relic', biome.relic + (state.relic || now < relicUntil ? .035 : 0));
    const space = loops.get('space'), engine = loops.get('move');
    if (space) target(space.source.playbackRate, biome.rate, .2);
    if (engine) target(engine.source.playbackRate, .88 + thrust * .18, .08);
    if (boosting && !wasBoosting && now - (lastPlayed.get('boostRamp') ?? -Infinity) > 1.5) {
      if (playLayers([['ramp', .13]], 1, 1)) lastPlayed.set('boostRamp', now);
    }
    wasBoosting = boosting;
  }

  function playLayers(layers, volume, rate) {
    let started = false;
    for (const [id, gain] of layers) {
      if (!buffers.has(id)) continue;
      // Oldest one-shots yield to new mission feedback; loops have separate ownership.
      while (voices.size >= 8) stopVoice(voices.values().next().value);
      started = !!startVoice(id, gain * volume, false, rate) || started;
    }
    return started;
  }

  function play(event, options = {}) {
    const cue = Object.hasOwn(CUES, event) ? CUES[event] : null;
    if (!cue || !active()) return false;
    const now = context.currentTime;
    if (now - (lastPlayed.get(event) ?? -Infinity) < cue.cooldown) return false;
    const volume = clamp(options?.volume ?? 1), rate = clamp(options?.rate ?? 1, .85, 1.15);
    if (!volume) return false;
    const layers = event === 'companionHint' && options?.variant === 'close' ? [['hintClose', .13]]
      : event === 'companionHint' && options?.variant === 'item' ? [['item', .14]] : cue.layers;
    if (!playLayers(layers, volume, rate)) return false;
    lastPlayed.set(event, now);
    if (cue.duck) duckUntil = Math.max(duckUntil, now + cue.duck);
    if (event === 'target' || event === 'scan') focusUntil = now + 1.3;
    if (event === 'gemReveal') relicUntil = now + 6;
    if (['gemCollect', 'transit', 'complete', 'rescue'].includes(event)) relicUntil = focusUntil = 0;
    mix(); return true;
  }

  function unlock() {
    if (disposed || !enabled || paused) return Promise.resolve(false);
    // Run context creation/resume synchronously before the first await so the
    // browser still associates it with the pointer or key activation.
    // Downloads are shared, but every gesture owns its resume: a menu may have
    // suspended the context while a previous unlock is still decoding WAVs.
    return (async () => {
      try {
        if (!context && !createGraph()) return false;
        if (context.state !== 'running') await context.resume();
        if (!loading) loading = load();
        await loading;
        if (!active() || !buffers.size) return false;
        ensureLoops(); mix(); return true;
      } catch { return false; }
    })();
  }

  function setEnabled(value) {
    if (disposed) return;
    enabled = !!value;
    if (!enabled) silence();
    else if (active()) { ensureLoops(); mix(); }
  }

  function setPaused(value) {
    if (disposed) return;
    paused = !!value;
    if (paused) silence();
    else if (active()) { ensureLoops(); mix(); }
  }

  function setVolumes({ effects: nextEffects = effectsVolume, ambience: nextAmbience = ambienceVolume } = {}) {
    effectsVolume = clamp(nextEffects); ambienceVolume = clamp(nextAmbience); mix();
  }

  function update(next = {}) {
    if (disposed) return;
    Object.assign(state, next); mix();
  }

  function dispose() {
    if (disposed) return;
    disposed = true; abort.abort(); stopAll(); buffers.clear();
    for (const node of [effects, ambience, motors, filter, limiter, master]) ignore(() => node?.disconnect());
    if (context) ignore(() => context.close());
  }

  return { unlock, setEnabled, setPaused, setVolumes, play, update, dispose };
}
