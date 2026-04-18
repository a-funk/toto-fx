/**
 * Audio engine — parallel to the animation engine, with a symmetric plugin
 * API. Each "sound pack" is a plain object exporting `oneshots` (fire-and-
 * forget voices) and `ambients` (sustained drones keyed by channel + variant
 * with automatic crossfading). Packs are swappable at runtime via
 * `setActivePack()`.
 *
 * Lifecycle:
 *   - `init()` creates the AudioContext lazily (must be called from a user
 *     gesture to comply with browser autoplay policy). Subsequent calls are
 *     idempotent and resume a suspended context.
 *   - `use(pack)` registers a pack; the first pack registered is auto-activated.
 *   - `fire(name, opts)` plays a one-shot from the active pack.
 *   - `setAmbient(channel, variant)` starts or crossfades a sustained drone;
 *     each channel holds one active variant at a time.
 *   - `clearAmbient(channel)` fades out a channel.
 *   - `stop()` suspends the context and clears all state.
 *
 * Pack shape:
 *   {
 *     name: string,
 *     oneshots: {
 *       [name]: (ctx, destGain, opts) => void   // attach voices, self-dispose
 *     },
 *     ambients: {
 *       [channel]: {
 *         [variant]: (ctx, destGain, opts) => ({ stop(fadeSec) })
 *       }
 *     },
 *     // optional shared helpers — usually referenced via closure inside the
 *     // pack's own factories rather than called from the engine.
 *     helpers: {}
 *   }
 */

/**
 * @typedef {Object} AudioEngineConfig
 * @property {number} [masterVolume=0.8]  Initial master volume (0-1).
 * @property {boolean} [enabled=true]     Initial enabled state.
 * @property {boolean} [debug=false]      Log warnings for common mistakes.
 */

/**
 * Create an audio engine instance.
 *
 * @param {AudioEngineConfig} [config]
 * @returns {AudioEngine}
 */
export function createAudioEngine(config = {}) {
  const _debug = !!config.debug;
  let _enabled = config.enabled !== false;
  let _masterVolume = config.masterVolume != null ? config.masterVolume : 0.8;

  let ctx = null;
  let masterGain = null;       // master GainNode, ties to enabled + masterVolume
  let oneshotBus = null;       // summing bus for one-shot voices
  let ambientBus = null;       // summing bus for ambient drones

  const packs = {};            // name → pack
  let activePackName = null;
  let activePack = null;

  // One active variant per channel. { [channel]: { variant, voice, startedAt } }
  const ambientChannels = {};

  function _now() { return ctx ? ctx.currentTime : 0; }

  function _warn(msg) { if (_debug) console.warn('[toto-fx audio] ' + msg); }

  function _ensureContext() {
    if (ctx) return ctx;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) { _warn('Web Audio API unavailable'); return null; }
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = _enabled ? _masterVolume : 0;
    masterGain.connect(ctx.destination);
    oneshotBus = ctx.createGain();
    oneshotBus.gain.value = 1;
    oneshotBus.connect(masterGain);
    ambientBus = ctx.createGain();
    ambientBus.gain.value = 1;
    ambientBus.connect(masterGain);
    return ctx;
  }

  function init() {
    _ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function start() { init(); }

  function stop() {
    if (!ctx) return;
    // Fade and clear every active ambient, then suspend.
    clearAll();
    try { ctx.suspend(); } catch {}
  }

  function use(pack) {
    if (!pack || typeof pack !== 'object' || !pack.name) {
      _warn('use(pack): pack must be an object with a .name');
      return;
    }
    packs[pack.name] = pack;
    if (!activePack) setActivePack(pack.name);
  }

  function setActivePack(name) {
    const next = packs[name];
    if (!next) { _warn('setActivePack: unknown pack "' + name + '"'); return; }
    // Stop any in-flight ambients; their voices were built by the outgoing
    // pack's factories and may not map to the new pack's shape.
    clearAll({ fade: 0.3 });
    activePackName = name;
    activePack = next;
  }

  function getActivePack() { return activePack; }

  function getContext() { return ctx; }
  function isReady() { return !!ctx && ctx.state === 'running'; }

  function setEnabled(on) {
    _enabled = !!on;
    if (!ctx || !masterGain) return;
    const t = _now();
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.linearRampToValueAtTime(_enabled ? _masterVolume : 0, t + 0.08);
  }

  function setMasterVolume(v) {
    _masterVolume = Math.max(0, Math.min(1, v));
    if (!ctx || !masterGain) return;
    const t = _now();
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.linearRampToValueAtTime(_enabled ? _masterVolume : 0, t + 0.06);
  }

  function fire(name, opts) {
    if (!_enabled) return;
    _ensureContext();
    if (!ctx || !activePack) return;
    const factory = activePack.oneshots && activePack.oneshots[name];
    if (!factory) { _warn('fire: no oneshot "' + name + '" in pack "' + activePackName + '"'); return; }
    try {
      factory(ctx, oneshotBus, opts || {});
    } catch (e) {
      _warn('oneshot "' + name + '" threw: ' + e.message);
    }
  }

  function setAmbient(channel, variant, opts) {
    if (!_enabled) return;
    _ensureContext();
    if (!ctx || !activePack) return;
    const fade = (opts && opts.fade != null) ? opts.fade : 0.4;
    const variantKey = String(variant);

    const active = ambientChannels[channel];
    if (active && active.variant === variantKey) return; // already playing

    const packAmb = activePack.ambients && activePack.ambients[channel];
    const factory = packAmb && packAmb[variantKey];
    if (!factory) { _warn('setAmbient: no ambient "' + channel + '/' + variantKey + '"'); return; }

    // Fade out the currently-active variant on this channel, if any.
    if (active && active.voice && typeof active.voice.stop === 'function') {
      try { active.voice.stop(fade); } catch (e) { _warn('ambient stop threw: ' + e.message); }
    }

    // Start the new variant; factory returns a voice handle with .stop(fadeSec).
    let voice = null;
    try {
      voice = factory(ctx, ambientBus, opts || {});
    } catch (e) {
      _warn('ambient factory "' + channel + '/' + variantKey + '" threw: ' + e.message);
      return;
    }
    ambientChannels[channel] = { variant: variantKey, voice, startedAt: _now() };
  }

  function clearAmbient(channel, opts) {
    const fade = (opts && opts.fade != null) ? opts.fade : 0.3;
    const active = ambientChannels[channel];
    if (!active) return;
    if (active.voice && typeof active.voice.stop === 'function') {
      try { active.voice.stop(fade); } catch (e) { _warn('ambient stop threw: ' + e.message); }
    }
    delete ambientChannels[channel];
  }

  function clearAll(opts) {
    const channels = Object.keys(ambientChannels);
    for (let i = 0; i < channels.length; i++) clearAmbient(channels[i], opts);
  }

  return {
    // lifecycle
    init, start, stop,
    // pack management
    use, setActivePack, getActivePack,
    // dispatch
    fire, setAmbient, clearAmbient, clearAll,
    // config
    setEnabled, setMasterVolume,
    // escape hatches
    getContext, isReady,
  };
}
