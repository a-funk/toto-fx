/**
 * Spiral Vortex — example plugin for the TotoFX animation system.
 *
 * A one-shot animation that spins an element into a shrinking spiral
 * before disappearing. Demonstrates the plugin contract: name, category,
 * style, meta, params, play(), and cleanup().
 *
 * Usage (ESM):
 *   import { createEngine } from 'toto-fx';
 *   import { vortexSpiralPlugin } from 'toto-fx/plugins/examples/vortex-spiral';
 *
 *   const engine = createEngine({ ... });
 *   engine.use(vortexSpiralPlugin);
 *   engine.play('action', element);
 *
 * Usage (IIFE):
 *   <script src="toto-fx.min.js"></script>
 *   <script src="plugins/examples/vortex-spiral.js"></script>
 */

import { FX } from '../../fx.js';

export const vortexSpiralPlugin = {
  name: 'spiral',
  category: 'action',
  style: 'vortex',

  meta: {
    label: 'Spiral',
    description: 'Spins the element into a shrinking vortex',
    tags: ['spin', 'vortex', 'physics'],
  },

  params: {
    rotations: { label: 'Rotations', type: 'range', min: 1, max: 5, default: 2, step: 0.5, unit: 'x', group: 'motion' },
    duration: { label: 'Duration', type: 'range', min: 300, max: 2000, default: 800, step: 50, unit: 'ms', group: 'timing' },
    shrink: { label: 'Shrink Factor', type: 'range', min: 0, max: 0.5, default: 0.1, step: 0.05, unit: '', group: 'motion' },
  },

  play: function (el, ctx) {
    const p = ctx.params || {};
    const rotations = p.rotations || 2;
    const duration = p.duration || 800;
    const shrink = p.shrink !== undefined ? p.shrink : 0.1;
    const speed = ctx.speed || 1;

    const scaledDur = duration / speed;

    // Dotgrid vortex effect (if dotgrid is available)
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (FX && FX.doDotgridRipple) {
      FX.doDotgridRipple(cx, cy, { radius: 200, push: 8, density: 0.4 });
    }

    // Animate: spin + shrink + fade
    el.style.transition = 'none';
    el.style.transformOrigin = 'center center';
    el.style.willChange = 'transform, opacity';

    const startTime = performance.now();
    const totalDeg = rotations * 360;

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / scaledDur, 1);

      // Ease-in curve for acceleration
      const eased = progress * progress;

      const deg = eased * totalDeg;
      const scale = 1 - eased * (1 - shrink);
      const opacity = 1 - eased;

      el.style.transform = 'rotate(' + deg + 'deg) scale(' + scale + ')';
      el.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.style.transform = '';
        el.style.opacity = '0';
        el.style.willChange = '';
        el.style.display = 'none';
        if (ctx.onDone) ctx.onDone();
      }
    }

    requestAnimationFrame(tick);
  },

  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '1';
    el.style.willChange = '';
    el.style.transformOrigin = '';
    el.style.display = '';
  },
};

/**
 * Install function for AnimationRegistry integration.
 * @param {Object} registry - AnimationRegistry instance
 */
export function install(registry) {
  registry.registerCategory('action', 'vortex', {
    'spiral': vortexSpiralPlugin,
  });
}

export default vortexSpiralPlugin;
