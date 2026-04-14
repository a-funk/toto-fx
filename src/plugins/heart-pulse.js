/**
 * @module heart-pulse
 * @description Heart Pulse animation plugin for toto-fx.
 *
 * Triggers a heart-shaped dotgrid fluid effect centered on the element,
 * with repeating beats that pulse outward through the simulation.
 * The card element itself does a subtle scale throb to match.
 *
 * @example
 * import { createEngine } from 'toto-fx';
 * import { heartPulsePlugin } from 'toto-fx/plugins/heart-pulse';
 *
 * const engine = createEngine({ ... });
 * engine.use(heartPulsePlugin);
 * engine.play('action', element, { style: 'love', variant: 'heart-pulse' });
 *
 * @example (IIFE)
 * <script src="toto-fx.min.js"></script>
 * <script src="plugins/heart-pulse.min.js"></script>
 * <script>
 *   engine.use(TotoFXHeartPulse);
 *   engine.play('action', element, { style: 'love' });
 * </script>
 */

import { FX } from '../fx.js';

// ── Heart Pulse Variant ────────────────────────────────────────

export const heartPulseVariant = {
  name: 'heart-pulse',
  category: 'action',
  style: 'love',

  meta: {
    label: 'Heart Pulse',
    description: 'Heart-shaped dotgrid effect with pulsing fluid beats',
    tags: ['heart', 'love', 'pulse', 'dotgrid'],
  },

  params: {
    radius:        { label: 'Heart Radius',    type: 'range', min: 80,  max: 400,  default: 200,  step: 10,  unit: 'px',  group: 'shape' },
    pulses:        { label: 'Pulses',          type: 'range', min: 1,   max: 6,    default: 3,    step: 1,   unit: '',    group: 'timing' },
    pulseInterval: { label: 'Pulse Interval',  type: 'range', min: 200, max: 800,  default: 450,  step: 50,  unit: 'ms',  group: 'timing' },
    density:       { label: 'Density',         type: 'range', min: 0.2, max: 1.0,  default: 0.8,  step: 0.1, unit: '',    group: 'intensity' },
    push:          { label: 'Push Strength',   type: 'range', min: 2,   max: 16,   default: 8,    step: 1,   unit: '',    group: 'intensity' },
    cardPulse:     { label: 'Card Pulse',      type: 'range', min: 0,   max: 1.0,  default: 0.06, step: 0.01, unit: '',   group: 'motion' },
  },

  requires: ['FX'],

  play: function (el, ctx) {
    var p = FX.resolveParams ? FX.resolveParams(heartPulseVariant.params, ctx.params) : (ctx.params || {});
    var radius = p.radius || 200;
    var pulses = p.pulses !== undefined ? p.pulses : 3;
    var pulseInterval = p.pulseInterval || 450;
    var cardPulse = p.cardPulse !== undefined ? p.cardPulse : 0.06;
    var scale = FX.intensityScale ? FX.intensityScale(ctx.intensity || 5) : 1;

    // Get element center
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    // Trigger dotgrid heart effect via engine context (IIFE-safe)
    var heartOpts = {
      radius: Math.round(radius * scale),
      pulses: pulses,
      pulseInterval: pulseInterval,
      density: p.density || 0.8,
      push: p.push || 8,
    };
    if (ctx.dotgridEffect) {
      ctx.dotgridEffect('heart', { cx: cx, cy: cy, opts: heartOpts });
    } else if (FX.doDotgridEffect) {
      FX.doDotgridEffect('heart', { cx: cx, cy: cy, opts: heartOpts });
    }

    // Card scale throb — subtle pulse matching the heartbeat
    if (cardPulse > 0) {
      el.style.willChange = 'transform';
      var beatCount = 0;

      function throb() {
        if (beatCount >= pulses) {
          el.style.transform = '';
          el.style.willChange = '';
          if (ctx.onDone) ctx.onDone();
          return;
        }
        var strength = 1 - beatCount * 0.15;
        var peakScale = 1 + cardPulse * strength;
        el.style.transition = 'transform 120ms ease-out';
        el.style.transform = 'scale(' + peakScale + ')';

        setTimeout(function () {
          el.style.transition = 'transform 250ms ease-in';
          el.style.transform = 'scale(1)';
        }, 130);

        beatCount++;
        if (beatCount < pulses) {
          setTimeout(throb, pulseInterval);
        } else {
          setTimeout(function () {
            el.style.transform = '';
            el.style.transition = '';
            el.style.willChange = '';
            if (ctx.onDone) ctx.onDone();
          }, 300);
        }
      }

      throb();
    } else {
      // No card animation — just fire onDone after dotgrid finishes
      var totalDuration = (pulses - 1) * pulseInterval + 600;
      setTimeout(function () {
        if (ctx.onDone) ctx.onDone();
      }, totalDuration);
    }
  },

  cleanup: function (el) {
    el.style.transform = '';
    el.style.transition = '';
    el.style.willChange = '';
  },
};

// ── Plugin registration ────────────────────────────────────────

var variants = {
  'heart-pulse': heartPulseVariant,
};

/**
 * Install the heart-pulse plugin into an engine or registry.
 * @param {Object} registry - Engine or AnimationRegistry instance
 */
export function install(registry) {
  if (typeof registry.register === 'function') {
    registry.register('action', 'love', variants);
  } else if (typeof registry.registerCategory === 'function') {
    registry.registerCategory('action', 'love', variants);
  }
}

export var heartPulsePlugin = {
  name: 'heart-pulse',
  install: install,
};

export default heartPulsePlugin;
