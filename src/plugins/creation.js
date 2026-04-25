/**
 * @module creation
 * @description Creation (Enter) Animations — 15 entrance animation variants.
 *
 * Plays when a new element appears (e.g. SSE event, manual add, DOM mutation).
 * Each variant is a plugin object with: { name, category, style, meta, params, requires, play, cleanup }
 *
 * All variants support tunable `.params` for design studio tooling.
 * Creation animations are one-shot entrance effects — they reveal the element
 * and clean up after completion. The element starts hidden (opacity 0) and
 * ends fully visible (opacity 1, all transforms cleared).
 *
 * 3 style groups x 5 variants each:
 *   subtle:   fade-in (DEFAULT), slide-in, unfold, typewriter, rise
 *   dramatic: slam-down, scale-bounce, materialize, portal, glitch-in
 *   fun:      confetti-drop, sparkle-trail, butterfly-carry, bounce-in, grow
 *
 * @example
 * // ESM usage with engine
 * import { createEngine } from 'toto-fx';
 * import { creationPlugin } from 'toto-fx/plugins/creation';
 *
 * const engine = createEngine({ ... });
 * engine.use(creationPlugin);
 *
 * @example
 * // Direct registry usage
 * import { AnimationRegistry } from 'toto-fx';
 * import { install, fadeIn, slamDown, confettiDrop } from 'toto-fx/plugins/creation';
 *
 * install(AnimationRegistry);
 */

import { FX } from '../fx.js';

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Scale a base duration by the speed multiplier.
 * Higher speed = shorter duration.
 * @param {number} ms - Base duration in milliseconds.
 * @param {number} speed - Speed multiplier (1 = normal).
 * @returns {number}
 */
function sd(ms, speed) { return ms / (speed || 1); }

/**
 * Map intensity (1-10) to a normalized 0-1 scale.
 * @param {number} intensity
 * @returns {number}
 */
function intensityNorm(intensity) {
  return Math.max(0, Math.min(1, ((intensity || 5) - 1) / 9));
}

/**
 * Linear interpolation.
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * Pick a random element from an array.
 * @param {Array} arr
 * @returns {*}
 */
function pick(arr) { return arr[Math.floor(ctx.rand() * arr.length)]; }

/**
 * Random number in range [a, b).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function randRange(a, b) { return a + ctx.rand() * (b - a); }

/**
 * Resolve the text element inside a target element.
 * Uses data-text attribute, .text class, or falls back to the element itself.
 * @param {HTMLElement} el
 * @returns {HTMLElement}
 */
function resolveTextEl(el) {
  return el.querySelector('[data-text]') || el.querySelector('.text') || el;
}

/**
 * Finish a creation animation — restore element to normal state and fire callback.
 * @param {HTMLElement} el
 * @param {Function} [onDone]
 */
function creationDone(el, onDone) {
  el.style.transform = '';
  el.style.opacity = '1';
  el.style.overflow = '';
  el.style.maxHeight = '';
  el.style.clipPath = '';
  el.style.filter = '';
  if (onDone) onDone();
}

/**
 * Standard cleanup for creation plugins — reset to visible state.
 * @param {HTMLElement} el
 */
function creationCleanup(el) {
  el.style.transform = '';
  el.style.opacity = '1';
  el.style.overflow = '';
  el.style.maxHeight = '';
  el.style.clipPath = '';
  el.style.filter = '';
}

// ── Character sets ──────────────────────────────────────────────
const SPARKLE_CHARS = ['\u2726', '\u2727', '\u2605', '\u2606', '*', '+', '\u2728'];
const CONFETTI_CHARS = ['\u2665', '\u2605', '\u2726', '\u266A', '\u273F', '\u2740', '\u2606', '\u266B', '\u2734'];
const BUTTERFLY_CHARS = ['\u2767', '\u273F', '*', '\u2726', '~'];
const GLITCH_CHARS = ['#', '@', '%', '&', '!', '$', '^', '~', '*', '+', '/', '\\', '{', '}'];
const PORTAL_CHARS = ['\u2726', '\u2727', '*', '+', '\u00B7', '\u2605'];

// ── Color palettes ─────────────────────────────────────────────
const PASTEL = ['#e8b4b8', '#e8d0b4', '#e8e4b4', '#b4e8c9', '#b4dae8', '#d0b4e8', '#e8b4cb'];
const RAINBOW = ['#cf6e5e', '#d99a7c', '#c9a84c', '#6aab8e', '#6da3b8', '#9b85c4', '#d4728c'];
const BUTTERFLY_COLORS = ['#d4728c', '#9b85c4', '#6da3b8', '#c9a84c', '#e8b4cb'];


// ═══════════════════════════════════════════════════════════════════
//  SUBTLE GROUP
// ═══════════════════════════════════════════════════════════════════

// ── 1. fade-in (DEFAULT) ───────────────────────────────────────
export const fadeIn = {
  name: 'fade-in',
  category: 'enter',
  style: 'subtle',
  meta: {
    label: 'Fade In',
    description: 'Simple opacity fade from 0 to 1',
    tags: ['fade', 'subtle', 'default', 'entrance'],
  },
  params: {
    duration: { label: 'Duration', type: 'range', min: 100, max: 1500, default: 400, step: 50, unit: 'ms', group: 'timing' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const duration = sd(p.duration, speed);
    const startTime = ctx.now();
    el.style.opacity = '0';

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      el.style.opacity = String(eased);
      if (t < 1) {
        ctx.raf(frame);
      } else {
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};

// ── 2. slide-in ────────────────────────────────────────────────
export const slideIn = {
  name: 'slide-in',
  category: 'enter',
  style: 'subtle',
  meta: {
    label: 'Slide In',
    description: 'Slides in from the right edge',
    tags: ['slide', 'subtle', 'entrance', 'motion'],
  },
  params: {
    duration:    { label: 'Duration',     type: 'range', min: 150, max: 1200, default: 450, step: 50,  unit: 'ms', group: 'timing' },
    minDistance: { label: 'Min Distance', type: 'range', min: 20,  max: 200,  default: 60,  step: 10,  unit: 'px', group: 'motion' },
    maxDistance: { label: 'Max Distance', type: 'range', min: 100, max: 600,  default: 300, step: 20,  unit: 'px', group: 'motion' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const distance = lerp(p.minDistance, p.maxDistance, inorm);
    const startTime = ctx.now();
    el.style.opacity = '0';
    el.style.transform = 'translateX(' + distance + 'px)';

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out quart
      const eased = 1 - Math.pow(1 - t, 4);
      el.style.opacity = String(Math.min(t * 2, 1));
      el.style.transform = 'translateX(' + (distance * (1 - eased)) + 'px)';
      if (t < 1) {
        ctx.raf(frame);
      } else {
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};

// ── 3. unfold ──────────────────────────────────────────────────
export const unfold = {
  name: 'unfold',
  category: 'enter',
  style: 'subtle',
  meta: {
    label: 'Unfold',
    description: 'Unfolds from zero height, revealing content top-down',
    tags: ['unfold', 'subtle', 'entrance', 'reveal'],
  },
  params: {
    duration: { label: 'Duration', type: 'range', min: 150, max: 1200, default: 500, step: 50, unit: 'ms', group: 'timing' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const duration = sd(p.duration, speed);
    const startTime = ctx.now();
    const targetHeight = el.scrollHeight;
    el.style.overflow = 'hidden';
    el.style.maxHeight = '0px';
    el.style.opacity = '1';

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      el.style.maxHeight = (targetHeight * eased) + 'px';
      if (t < 1) {
        ctx.raf(frame);
      } else {
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};

// ── 4. typewriter ──────────────────────────────────────────────
export const typewriter = {
  name: 'typewriter',
  category: 'enter',
  style: 'subtle',
  meta: {
    label: 'Typewriter',
    description: 'Text appears character by character like a typewriter',
    tags: ['typewriter', 'subtle', 'entrance', 'text'],
  },
  params: {
    minCharDelay: { label: 'Min Char Delay', type: 'range', min: 10,  max: 80,  default: 20,  step: 5,  unit: 'ms', group: 'timing' },
    maxCharDelay: { label: 'Max Char Delay', type: 'range', min: 30,  max: 200, default: 80,  step: 5,  unit: 'ms', group: 'timing' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const charDelay = sd(lerp(p.maxCharDelay, p.minCharDelay, inorm), speed);

    // Find the text content element inside the target
    const textEl = resolveTextEl(el);
    const fullText = textEl.textContent || '';
    const totalChars = fullText.length;
    if (totalChars === 0) {
      creationDone(el, ctx.onDone);
      return;
    }

    el.style.opacity = '1';
    textEl.textContent = '';
    let charIndex = 0;
    const startTime = ctx.now();

    function frame(now) {
      const elapsed = now - startTime;
      const targetIndex = Math.min(Math.floor(elapsed / charDelay), totalChars);
      if (targetIndex > charIndex) {
        textEl.textContent = fullText.substring(0, targetIndex);
        charIndex = targetIndex;
      }
      if (charIndex < totalChars) {
        ctx.raf(frame);
      } else {
        textEl.textContent = fullText;
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};

// ── 5. rise ────────────────────────────────────────────────────
export const rise = {
  name: 'rise',
  category: 'enter',
  style: 'subtle',
  meta: {
    label: 'Rise',
    description: 'Rises up from below with a slight fade',
    tags: ['rise', 'subtle', 'entrance', 'motion'],
  },
  params: {
    duration:    { label: 'Duration',     type: 'range', min: 150, max: 1200, default: 500, step: 50,  unit: 'ms', group: 'timing' },
    minDistance: { label: 'Min Distance', type: 'range', min: 10,  max: 80,   default: 20,  step: 5,   unit: 'px', group: 'motion' },
    maxDistance: { label: 'Max Distance', type: 'range', min: 30,  max: 200,  default: 80,  step: 10,  unit: 'px', group: 'motion' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const distance = lerp(p.minDistance, p.maxDistance, inorm);
    const startTime = ctx.now();
    el.style.opacity = '0';
    el.style.transform = 'translateY(' + distance + 'px)';

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out quint
      const eased = 1 - Math.pow(1 - t, 5);
      el.style.opacity = String(eased);
      el.style.transform = 'translateY(' + (distance * (1 - eased)) + 'px)';
      if (t < 1) {
        ctx.raf(frame);
      } else {
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};


// ═══════════════════════════════════════════════════════════════════
//  DRAMATIC GROUP
// ═══════════════════════════════════════════════════════════════════

// ── 6. slam-down ───────────────────────────────────────────────
export const slamDown = {
  name: 'slam-down',
  category: 'enter',
  style: 'dramatic',
  meta: {
    label: 'Slam Down',
    description: 'Drops from above with impact — like a card slammed onto a desk',
    tags: ['slam', 'dramatic', 'entrance', 'impact', 'physics'],
  },
  params: {
    fallDur:   { label: 'Fall Duration', type: 'range', min: 100, max: 800,  default: 300, step: 25,   unit: 'ms', group: 'timing' },
    bounceDur: { label: 'Bounce Dur',    type: 'range', min: 100, max: 800,  default: 400, step: 25,   unit: 'ms', group: 'timing' },
    fallExp:   { label: 'Fall Curve',    type: 'range', min: 1.5, max: 5,    default: 2.5, step: 0.1,  group: 'physics' },
    minHeight: { label: 'Min Height',    type: 'range', min: 50,  max: 300,  default: 100, step: 10,   unit: 'px', group: 'motion' },
    maxHeight: { label: 'Max Height',    type: 'range', min: 200, max: 1000, default: 500, step: 20,   unit: 'px', group: 'motion' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const fallDur = sd(p.fallDur, speed);
    const startTime = ctx.now();
    const rect = el.getBoundingClientRect();

    // If originY is provided (e.g. from an input element), compute fall
    // distance from that Y to the element's final position. Otherwise use intensity.
    const originY = ctx.params && ctx.params.originY;
    const height = (originY != null)
      ? Math.max(rect.top - originY, 30)
      : lerp(p.minHeight, p.maxHeight, inorm);

    el.style.opacity = '0';
    el.style.transform = 'translateY(-' + height + 'px) scaleX(0.95)';

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / fallDur, 1);
      // Gravity easing (accelerating fall)
      const eased = Math.pow(t, p.fallExp);
      const y = -height * (1 - eased);
      el.style.opacity = String(Math.min(t * 3, 1));
      el.style.transform = 'translateY(' + y + 'px) scaleX(' + lerp(0.95, 1, eased) + ')';

      if (t >= 1) {
        // Impact effects
        el.style.transform = 'scaleY(0.95) scaleX(1.02)';
        if (fx && typeof fx.doScreenShake === 'function') {
          fx.doScreenShake(false);
          if (inorm > 0.5 && typeof fx.doImpactFlash === 'function') {
            fx.doImpactFlash(false);
          }
        }
        // Bounce recovery
        const bounceStart = ctx.now();
        const bounceDur = sd(p.bounceDur, speed);
        function bounceFrame(now2) {
          const bt = Math.min((now2 - bounceStart) / bounceDur, 1);
          // Damped spring
          const spring = Math.exp(-bt * 4) * Math.cos(bt * Math.PI * 2) * lerp(0.02, 0.06, inorm);
          el.style.transform = 'scaleY(' + (1 + spring) + ') scaleX(' + (1 - spring * 0.5) + ')';
          if (bt < 1) {
            ctx.raf(bounceFrame);
          } else {
            creationDone(el, ctx.onDone);
          }
        }
        ctx.raf(bounceFrame);
      } else {
        ctx.raf(frame);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};

// ── 7. scale-bounce ────────────────────────────────────────────
export const scaleBounce = {
  name: 'scale-bounce',
  category: 'enter',
  style: 'dramatic',
  meta: {
    label: 'Scale Bounce',
    description: 'Scales up from center with elastic bounce',
    tags: ['scale', 'bounce', 'dramatic', 'entrance', 'elastic'],
  },
  params: {
    duration:   { label: 'Duration',      type: 'range', min: 200, max: 1500, default: 600,  step: 50,  unit: 'ms', group: 'timing' },
    minElastic: { label: 'Min Elasticity', type: 'range', min: 0.5, max: 2,   default: 0.8,  step: 0.1, group: 'physics' },
    maxElastic: { label: 'Max Elasticity', type: 'range', min: 1,   max: 4,   default: 2,    step: 0.1, group: 'physics' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const startTime = ctx.now();
    el.style.opacity = '0';
    el.style.transform = 'scale(0)';

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Elastic ease-out
      const elasticity = lerp(p.minElastic, p.maxElastic, inorm);
      let eased;
      if (t === 1) {
        eased = 1;
      } else {
        eased = Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / (0.3 * elasticity)) + 1;
      }
      el.style.opacity = String(Math.min(t * 4, 1));
      el.style.transform = 'scale(' + eased + ')';

      if (t < 1) {
        ctx.raf(frame);
      } else {
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};

// ── 8. materialize ─────────────────────────────────────────────
export const materialize = {
  name: 'materialize',
  category: 'enter',
  style: 'dramatic',
  meta: {
    label: 'Materialize',
    description: 'Pixelates/glitches into existence like digital materialization',
    tags: ['materialize', 'dramatic', 'entrance', 'glitch', 'canvas'],
  },
  params: {
    duration: { label: 'Duration',      type: 'range', min: 300, max: 2000, default: 800,  step: 50, unit: 'ms', group: 'timing' },
    minFrags: { label: 'Min Fragments', type: 'range', min: 5,   max: 30,  default: 10,   step: 1,  group: 'particles' },
    maxFrags: { label: 'Max Fragments', type: 'range', min: 15,  max: 80,  default: 40,   step: 5,  group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startTime = ctx.now();

    const fragCount = fx.pCount(Math.round(lerp(p.minFrags, p.maxFrags, inorm)));
    const frags = [];
    for (let i = 0; i < fragCount; i++) {
      frags.push({
        x: cx + randRange(-rect.width * 0.8, rect.width * 0.8),
        y: cy + randRange(-rect.height * 0.8, rect.height * 0.8),
        targetX: cx + randRange(-rect.width * 0.4, rect.width * 0.4),
        targetY: cy + randRange(-rect.height * 0.4, rect.height * 0.4),
        char: pick(GLITCH_CHARS),
        size: lerp(6, 14, inorm) + ctx.rand() * 6,
        color: pick(RAINBOW),
        delay: ctx.rand() * duration * 0.5,
        phase: ctx.rand() * Math.PI * 2,
      });
    }

    el.style.opacity = '0';
    const _drawId = fx.nextFxDrawId('materialize');

    fx.registerFxDraw(_drawId, function (fxCtx, now) {
      fx.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      fx.resetDrawFont();

      // Card fades in during second half
      if (t > 0.4) {
        const cardT = (t - 0.4) / 0.6;
        el.style.opacity = String(cardT);
        if (t < 0.85 && ctx.rand() > 0.7) {
          const glitchX = (ctx.rand() - 0.5) * lerp(4, 12, inorm);
          el.style.transform = 'translateX(' + glitchX + 'px)';
        } else {
          el.style.transform = '';
        }
      }

      // Glitch fragments converge toward center then fade
      frags.forEach(function (f) {
        if (elapsed < f.delay) return;
        const ft = Math.min((elapsed - f.delay) / (duration * 0.7), 1);
        const moveT = Math.min(ft * 2, 1);
        const ffx = lerp(f.x, f.targetX, moveT);
        const ffy = lerp(f.y, f.targetY, moveT);
        const rgbOff = lerp(6, 2, ft) * (Math.sin(f.phase + elapsed * 0.01) > 0 ? 1 : -1);
        let alpha = ft > 0.7 ? (1 - (ft - 0.7) / 0.3) : Math.min(ft * 3, 1);
        alpha *= lerp(0.5, 0.9, inorm);
        if (alpha > 0.01) {
          fx.drawChar(fxCtx, f.char, ffx + rgbOff, ffy, 'rgba(255,50,50,0.5)', f.size, alpha * 0.4, 0);
          fx.drawChar(fxCtx, f.char, ffx - rgbOff, ffy, 'rgba(50,50,255,0.5)', f.size, alpha * 0.4, 0);
          fx.drawChar(fxCtx, f.char, ffx, ffy, f.color, f.size, alpha, 0);
        }
      });

      if (t >= 1) {
        fx.deregisterFxDraw(_drawId);
        creationDone(el, ctx.onDone);
      }
    });
  },
  cleanup: function (el) {
    creationCleanup(el);
  },
};

// ── 9. portal ──────────────────────────────────────────────────
export const portal = {
  name: 'portal',
  category: 'enter',
  style: 'dramatic',
  meta: {
    label: 'Portal',
    description: 'Circular reveal from center point with particle ring',
    tags: ['portal', 'dramatic', 'entrance', 'reveal', 'canvas'],
  },
  params: {
    duration:     { label: 'Duration',       type: 'range', min: 300, max: 1500, default: 700,  step: 50,  unit: 'ms', group: 'timing' },
    minRingParts: { label: 'Min Ring Parts', type: 'range', min: 5,   max: 20,  default: 8,    step: 1,   group: 'particles' },
    maxRingParts: { label: 'Max Ring Parts', type: 'range', min: 12,  max: 50,  default: 24,   step: 2,   group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy) + 10;
    const startTime = ctx.now();

    const absCx = rect.left + cx;
    const absCy = rect.top + cy;
    const ringCount = fx.pCount(Math.round(lerp(p.minRingParts, p.maxRingParts, inorm)));
    const ringParts = [];
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      ringParts.push({
        angle: angle,
        char: pick(PORTAL_CHARS),
        size: lerp(6, 12, inorm) + ctx.rand() * 4,
        color: pick(RAINBOW),
        speed: 0.8 + ctx.rand() * 0.4,
      });
    }

    el.style.opacity = '1';
    el.style.clipPath = 'circle(0% at 50% 50%)';
    const _drawId = fx.nextFxDrawId('portal');

    fx.registerFxDraw(_drawId, function (fxCtx, now) {
      fx.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      fx.resetDrawFont();

      // Expand clip circle
      const eased = 1 - Math.pow(1 - t, 3);
      const radiusPct = eased * 100;
      el.style.clipPath = 'circle(' + radiusPct + '% at 50% 50%)';

      // Portal ring particles orbiting around the expanding edge
      const ringRadius = eased * maxRadius;
      let ringAlpha = t < 0.8 ? Math.min(t * 3, 1) : (1 - (t - 0.8) / 0.2);
      ringAlpha *= lerp(0.4, 0.8, inorm);
      ringParts.forEach(function (rp) {
        const a = rp.angle + elapsed * 0.003 * rp.speed;
        const rx = absCx + Math.cos(a) * ringRadius;
        const ry = absCy + Math.sin(a) * ringRadius;
        if (ringAlpha > 0.01) {
          fx.drawChar(fxCtx, rp.char, rx, ry, rp.color, rp.size, ringAlpha, a);
        }
      });

      if (t >= 1) {
        fx.deregisterFxDraw(_drawId);
        creationDone(el, ctx.onDone);
      }
    });
  },
  cleanup: function (el) {
    creationCleanup(el);
  },
};

// ── 10. glitch-in ──────────────────────────────────────────────
export const glitchIn = {
  name: 'glitch-in',
  category: 'enter',
  style: 'dramatic',
  meta: {
    label: 'Glitch In',
    description: 'RGB split/offset glitch effect entrance',
    tags: ['glitch', 'dramatic', 'entrance', 'rgb', 'digital'],
  },
  params: {
    duration:  { label: 'Duration',       type: 'range', min: 300, max: 2000, default: 700,  step: 50,  unit: 'ms', group: 'timing' },
    minGlitch: { label: 'Min Glitch Amt', type: 'range', min: 2,   max: 20,  default: 5,    step: 1,   unit: 'px', group: 'visual' },
    maxGlitch: { label: 'Max Glitch Amt', type: 'range', min: 10,  max: 60,  default: 30,   step: 2,   unit: 'px', group: 'visual' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const startTime = ctx.now();
    const glitchIntensity = lerp(p.minGlitch, p.maxGlitch, inorm);

    el.style.opacity = '0';

    // Precompute glitch keyframes — random snap-on/off moments
    const glitchFrames = [];
    const numGlitches = Math.round(lerp(4, 12, inorm));
    for (let i = 0; i < numGlitches; i++) {
      glitchFrames.push({
        time: ctx.rand() * 0.7,  // normalized time 0-0.7
        durPct: 0.02 + ctx.rand() * 0.06,
        offsetX: (ctx.rand() - 0.5) * glitchIntensity,
        skewX: (ctx.rand() - 0.5) * lerp(2, 8, inorm),
      });
    }
    glitchFrames.sort(function (a, b) { return a.time - b.time; });

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Base visibility increases over time
      const baseAlpha = Math.min(t * 2.5, 1);

      // Check if we're in a glitch frame
      let inGlitch = false;
      let gOffsetX = 0;
      let gSkew = 0;
      for (let i = 0; i < glitchFrames.length; i++) {
        const gf = glitchFrames[i];
        if (t >= gf.time && t <= gf.time + gf.durPct) {
          inGlitch = true;
          gOffsetX = gf.offsetX * (1 - t);
          gSkew = gf.skewX * (1 - t);
          break;
        }
      }

      if (inGlitch) {
        el.style.opacity = String(baseAlpha * (0.6 + ctx.rand() * 0.4));
        el.style.transform = 'translateX(' + gOffsetX + 'px) skewX(' + gSkew + 'deg)';
        el.style.filter = 'hue-rotate(' + Math.round((ctx.rand() - 0.5) * 60) + 'deg)';
      } else {
        el.style.opacity = String(baseAlpha);
        el.style.transform = '';
        el.style.filter = '';
      }

      if (t < 1) {
        ctx.raf(frame);
      } else {
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};


// ═══════════════════════════════════════════════════════════════════
//  FUN GROUP
// ═══════════════════════════════════════════════════════════════════

// ── 11. confetti-drop ──────────────────────────────────────────
export const confettiDrop = {
  name: 'confetti-drop',
  category: 'enter',
  style: 'fun',
  meta: {
    label: 'Confetti Drop',
    description: 'Item drops in with confetti particles celebrating the new task',
    tags: ['confetti', 'fun', 'entrance', 'celebration', 'canvas'],
  },
  params: {
    dropDur:     { label: 'Drop Duration',    type: 'range', min: 150, max: 800,  default: 350, step: 25,  unit: 'ms', group: 'timing' },
    confettiDur: { label: 'Confetti Dur',     type: 'range', min: 400, max: 2000, default: 800, step: 50,  unit: 'ms', group: 'timing' },
    minConfetti: { label: 'Min Confetti',     type: 'range', min: 5,   max: 20,   default: 8,   step: 1,   group: 'particles' },
    maxConfetti: { label: 'Max Confetti',     type: 'range', min: 15,  max: 60,   default: 30,  step: 5,   group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const dropDur = sd(p.dropDur, speed);
    const confettiDur = sd(p.confettiDur, speed);
    const totalDuration = dropDur + confettiDur;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startTime = ctx.now();

    const confettiCount = fx.pCount(Math.round(lerp(p.minConfetti, p.maxConfetti, inorm)));
    const confetti = [];
    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: cx + randRange(-rect.width * 0.6, rect.width * 0.6),
        y: cy - 20 - ctx.rand() * 60,
        vx: (ctx.rand() - 0.5) * lerp(2, 6, inorm),
        vy: -(1 + ctx.rand() * lerp(2, 5, inorm)),
        gravity: 0.08 + ctx.rand() * 0.06,
        char: pick(CONFETTI_CHARS),
        color: pick(RAINBOW),
        size: lerp(6, 12, inorm) + ctx.rand() * 4,
        rotation: ctx.rand() * Math.PI * 2,
        rotSpeed: (ctx.rand() - 0.5) * 0.15,
        delay: ctx.rand() * dropDur * 0.3,
      });
    }

    el.style.opacity = '0';
    el.style.transform = 'translateY(-60px) scale(0.9)';
    const _drawId = fx.nextFxDrawId('confetti-drop');

    fx.registerFxDraw(_drawId, function (fxCtx, now) {
      fx.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / totalDuration, 1);
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      fx.resetDrawFont();

      // Card drops in
      const dropT = Math.min(elapsed / dropDur, 1);
      const dropEased = 1 - Math.pow(1 - dropT, 3);
      el.style.opacity = String(Math.min(dropT * 2, 1));
      if (dropT < 1) {
        el.style.transform = 'translateY(' + (-60 * (1 - dropEased)) + 'px) scale(' + lerp(0.9, 1, dropEased) + ')';
      } else {
        el.style.transform = '';
      }

      // Confetti particles
      confetti.forEach(function (c) {
        if (elapsed < c.delay) return;
        const ct = elapsed - c.delay;
        c.vy += c.gravity;
        c.x += c.vx;
        c.y += c.vy;
        c.rotation += c.rotSpeed;
        let alpha = ct < 200 ? ct / 200 : 1;
        const fadeOut = elapsed > totalDuration - 400 ? (totalDuration - elapsed) / 400 : 1;
        alpha *= fadeOut;
        if (alpha > 0.01 && c.y < window.innerHeight + 20) {
          fx.drawChar(fxCtx, c.char, c.x, c.y, c.color, c.size, alpha * lerp(0.5, 0.9, inorm), c.rotation);
        }
      });

      if (t >= 1) {
        fx.deregisterFxDraw(_drawId);
        creationDone(el, ctx.onDone);
      }
    });
  },
  cleanup: function (el) {
    creationCleanup(el);
  },
};

// ── 12. sparkle-trail ──────────────────────────────────────────
export const sparkleTrail = {
  name: 'sparkle-trail',
  category: 'enter',
  style: 'fun',
  meta: {
    label: 'Sparkle Trail',
    description: 'Item fades in with trailing sparkle particles',
    tags: ['sparkle', 'fun', 'entrance', 'particles', 'canvas'],
  },
  params: {
    duration: { label: 'Duration',    type: 'range', min: 300, max: 2000, default: 800,  step: 50,  unit: 'ms', group: 'timing' },
    minRate:  { label: 'Min Rate',    type: 'range', min: 5,   max: 30,   default: 10,   step: 1,   unit: '/s', group: 'particles' },
    maxRate:  { label: 'Max Rate',    type: 'range', min: 15,  max: 80,   default: 40,   step: 5,   unit: '/s', group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const rect = el.getBoundingClientRect();
    const startTime = ctx.now();

    // Sparkles spawn continuously as element fades in
    let sparkles = [];
    const sparkleRate = lerp(p.minRate, p.maxRate, inorm);
    let lastSpawn = 0;

    el.style.opacity = '0';
    const _drawId = fx.nextFxDrawId('sparkle-trail');

    fx.registerFxDraw(_drawId, function (fxCtx, now) {
      fx.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      fx.resetDrawFont();

      // Element fades in
      const eased = 1 - Math.pow(1 - t, 3);
      el.style.opacity = String(eased);

      // Spawn new sparkles
      if (t < 0.8 && elapsed - lastSpawn > (1000 / sparkleRate)) {
        lastSpawn = elapsed;
        sparkles.push({
          x: rect.left + ctx.rand() * rect.width,
          y: rect.top + ctx.rand() * rect.height,
          vx: (ctx.rand() - 0.5) * 2,
          vy: -(0.5 + ctx.rand() * 2),
          char: pick(SPARKLE_CHARS),
          color: pick(PASTEL.concat(RAINBOW)),
          size: lerp(4, 10, inorm) + ctx.rand() * 4,
          life: 0,
          maxLife: 300 + ctx.rand() * 400,
          rotation: ctx.rand() * Math.PI * 2,
          rotSpeed: (ctx.rand() - 0.5) * 0.1,
        });
      }

      // Animate sparkles
      sparkles.forEach(function (s) {
        s.life += 16;
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.rotSpeed;
        const lr = s.life / s.maxLife;
        const alpha = lr > 0.6 ? (1 - (lr - 0.6) / 0.4) : Math.min(s.life / 100, 1);
        const pulse = 0.7 + Math.sin(s.life * 0.02) * 0.3;
        if (alpha > 0.01 && lr < 1) {
          fx.drawChar(fxCtx, s.char, s.x, s.y, s.color, s.size * pulse, alpha * lerp(0.4, 0.8, inorm), s.rotation);
          if (fx.shouldShadow()) {
            fxCtx.save();
            fxCtx.shadowColor = s.color;
            fxCtx.shadowBlur = 6;
            fx.drawChar(fxCtx, '*', s.x, s.y, s.color, s.size * 0.3, alpha * 0.2, 0);
            fxCtx.restore();
          }
        }
      });

      // Prune dead sparkles
      sparkles = sparkles.filter(function (s) { return s.life < s.maxLife; });

      if (t >= 1 && sparkles.length === 0) {
        fx.deregisterFxDraw(_drawId);
        creationDone(el, ctx.onDone);
      }
    });
  },
  cleanup: function (el) {
    creationCleanup(el);
  },
};

// ── 13. butterfly-carry ────────────────────────────────────────
export const butterflyCarry = {
  name: 'butterfly-carry',
  category: 'enter',
  style: 'fun',
  meta: {
    label: 'Butterfly Carry',
    description: 'Tiny butterflies carry the item in from the side',
    tags: ['butterfly', 'fun', 'entrance', 'whimsical', 'canvas'],
  },
  params: {
    duration:       { label: 'Duration',        type: 'range', min: 500, max: 3000, default: 1200, step: 100, unit: 'ms', group: 'timing' },
    minButterflies: { label: 'Min Butterflies', type: 'range', min: 2,   max: 8,   default: 3,    step: 1,   group: 'particles' },
    maxButterflies: { label: 'Max Butterflies', type: 'range', min: 5,   max: 20,  default: 8,    step: 1,   group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startTime = ctx.now();

    const bflyCount = fx.pCount(Math.round(lerp(p.minButterflies, p.maxButterflies, inorm)));
    const butterflies = [];
    for (let i = 0; i < bflyCount; i++) {
      const fromLeft = ctx.rand() > 0.5;
      butterflies.push({
        startX: fromLeft ? rect.left - 40 - ctx.rand() * 60 : rect.right + 40 + ctx.rand() * 60,
        startY: cy + randRange(-rect.height * 0.3, rect.height * 0.3),
        targetX: rect.left + ctx.rand() * rect.width,
        targetY: rect.top + ctx.rand() * rect.height,
        color: pick(BUTTERFLY_COLORS),
        size: lerp(8, 16, inorm) + ctx.rand() * 4,
        wingPhase: ctx.rand() * Math.PI * 2,
        wingSpeed: 0.015 + ctx.rand() * 0.01,
        delay: ctx.rand() * duration * 0.2,
        departDelay: duration * 0.6 + ctx.rand() * duration * 0.2,
        departX: (ctx.rand() > 0.5 ? 1 : -1) * (rect.width + 100 + ctx.rand() * 100),
        departY: -(50 + ctx.rand() * 100),
      });
    }

    el.style.opacity = '0';
    el.style.transform = 'translateX(-30px)';
    const _drawId = fx.nextFxDrawId('butterfly-carry');

    fx.registerFxDraw(_drawId, function (fxCtx, now) {
      fx.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      fx.resetDrawFont();

      // Element slides in gently as butterflies arrive
      const cardT = Math.min(elapsed / (duration * 0.5), 1);
      const cardEased = 1 - Math.pow(1 - cardT, 3);
      el.style.opacity = String(cardEased);
      el.style.transform = 'translateX(' + (-30 * (1 - cardEased)) + 'px)';

      // Butterflies
      butterflies.forEach(function (bf) {
        if (elapsed < bf.delay) return;
        const bfElapsed = elapsed - bf.delay;
        const arriveT = Math.min(bfElapsed / (duration * 0.4), 1);
        const arriveEased = 1 - Math.pow(1 - arriveT, 2);

        let bx, by;
        if (elapsed > bf.departDelay) {
          const depT = Math.min((elapsed - bf.departDelay) / (duration * 0.3), 1);
          const depEased = depT * depT;
          bx = lerp(bf.targetX, bf.targetX + bf.departX, depEased);
          by = lerp(bf.targetY, bf.targetY + bf.departY, depEased);
        } else {
          bx = lerp(bf.startX, bf.targetX, arriveEased);
          by = lerp(bf.startY, bf.targetY, arriveEased);
        }

        by += Math.sin(bfElapsed * 0.005) * 8;
        bx += Math.cos(bfElapsed * 0.003) * 5;

        const wingAngle = Math.sin(bf.wingPhase + bfElapsed * bf.wingSpeed) * 0.4;
        let alpha = 1;
        if (elapsed > bf.departDelay) {
          alpha = 1 - Math.min((elapsed - bf.departDelay) / (duration * 0.3), 1);
        }
        alpha *= lerp(0.5, 0.9, inorm);

        if (alpha > 0.01) {
          fx.drawChar(fxCtx, '\u00B7', bx, by, bf.color, bf.size * 0.4, alpha, 0);
          fx.drawChar(fxCtx, pick(BUTTERFLY_CHARS), bx - bf.size * 0.3, by - 2,
            bf.color, bf.size * (0.6 + wingAngle * 0.3), alpha * 0.8, -wingAngle);
          fx.drawChar(fxCtx, pick(BUTTERFLY_CHARS), bx + bf.size * 0.3, by - 2,
            bf.color, bf.size * (0.6 - wingAngle * 0.3), alpha * 0.8, wingAngle);
        }
      });

      if (t >= 1) {
        fx.deregisterFxDraw(_drawId);
        creationDone(el, ctx.onDone);
      }
    });
  },
  cleanup: function (el) {
    creationCleanup(el);
  },
};

// ── 14. bounce-in ──────────────────────────────────────────────
export const bounceIn = {
  name: 'bounce-in',
  category: 'enter',
  style: 'fun',
  meta: {
    label: 'Bounce In',
    description: 'Bouncy spring physics entrance — drops in and bounces',
    tags: ['bounce', 'fun', 'entrance', 'physics', 'spring'],
  },
  params: {
    duration:   { label: 'Duration',    type: 'range', min: 300, max: 2000, default: 800,  step: 50,  unit: 'ms', group: 'timing' },
    minDrop:    { label: 'Min Drop',    type: 'range', min: 20,  max: 100,  default: 40,   step: 5,   unit: 'px', group: 'motion' },
    maxDrop:    { label: 'Max Drop',    type: 'range', min: 50,  max: 400,  default: 150,  step: 10,  unit: 'px', group: 'motion' },
    minBounces: { label: 'Min Bounces', type: 'range', min: 1,   max: 4,    default: 2,    step: 1,   group: 'physics' },
    maxBounces: { label: 'Max Bounces', type: 'range', min: 3,   max: 8,    default: 5,    step: 1,   group: 'physics' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const dropHeight = lerp(p.minDrop, p.maxDrop, inorm);
    const bounces = Math.round(lerp(p.minBounces, p.maxBounces, inorm));
    const startTime = ctx.now();

    el.style.opacity = '0';
    el.style.transform = 'translateY(-' + dropHeight + 'px)';

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Damped bouncing
      let y;
      if (t < 0.3) {
        // Initial drop
        const dropT = t / 0.3;
        y = -dropHeight * (1 - dropT * dropT);
      } else {
        // Bouncing phase
        const bounceT = (t - 0.3) / 0.7;
        const decay = Math.exp(-bounceT * lerp(3, 6, inorm));
        y = -decay * dropHeight * 0.3 * Math.abs(Math.cos(bounceT * Math.PI * bounces));
      }

      el.style.opacity = String(Math.min(t * 4, 1));
      el.style.transform = 'translateY(' + y + 'px)';

      // Squash on bounce contact
      if (t > 0.3) {
        const bounceT2 = (t - 0.3) / 0.7;
        const cosVal = Math.cos(bounceT2 * Math.PI * bounces);
        const decay2 = Math.exp(-bounceT2 * 4);
        if (Math.abs(cosVal) < 0.15 && decay2 > 0.05) {
          const squash = 1 + decay2 * 0.05;
          el.style.transform = 'translateY(' + y + 'px) scaleY(' + (1 / squash) + ') scaleX(' + squash + ')';
        }
      }

      if (t < 1) {
        ctx.raf(frame);
      } else {
        creationDone(el, ctx.onDone);
      }
    }
    ctx.raf(frame);
  },
  cleanup: creationCleanup,
};

// ── 15. grow ───────────────────────────────────────────────────
export const grow = {
  name: 'grow',
  category: 'enter',
  style: 'fun',
  meta: {
    label: 'Grow',
    description: 'Grows from a seed/dot in the center — like a plant sprouting',
    tags: ['grow', 'fun', 'entrance', 'organic', 'canvas'],
  },
  params: {
    duration:   { label: 'Duration',    type: 'range', min: 400, max: 2500, default: 1000, step: 50,  unit: 'ms', group: 'timing' },
    minSprouts: { label: 'Min Sprouts', type: 'range', min: 3,   max: 10,  default: 5,    step: 1,   group: 'particles' },
    maxSprouts: { label: 'Max Sprouts', type: 'range', min: 8,   max: 30,  default: 15,   step: 1,   group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(this.params, ctx.params);
    const speed = ctx.speed || 1;
    const inorm = intensityNorm(ctx.intensity);
    const duration = sd(p.duration, speed);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startTime = ctx.now();

    // Seed dot that becomes the element
    const seedSize = lerp(4, 8, inorm);

    // Sprout particles
    const sproutCount = fx.pCount(Math.round(lerp(p.minSprouts, p.maxSprouts, inorm)));
    const sprouts = [];
    for (let i = 0; i < sproutCount; i++) {
      const angle = (i / sproutCount) * Math.PI * 2 + (ctx.rand() - 0.5) * 0.5;
      sprouts.push({
        angle: angle,
        distance: lerp(10, 40, inorm) + ctx.rand() * 20,
        char: pick(['\u273F', '\u2740', '\u273E', '*', '\u2726', '\u00B7']),
        color: pick(['#6aab8e', '#c9a84c', '#6da3b8', '#d4728c', '#9b85c4']),
        size: lerp(4, 10, inorm) + ctx.rand() * 4,
        delay: duration * 0.2 + ctx.rand() * duration * 0.3,
        life: 0,
        maxLife: 400 + ctx.rand() * 300,
      });
    }

    el.style.opacity = '0';
    el.style.transform = 'scale(0)';
    const _drawId = fx.nextFxDrawId('grow');

    fx.registerFxDraw(_drawId, function (fxCtx, now) {
      fx.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      fx.resetDrawFont();

      // Seed phase (first 20%)
      if (t < 0.2) {
        const seedT = t / 0.2;
        const seedAlpha = Math.min(seedT * 3, 1);
        const pulse = 1 + Math.sin(elapsed * 0.02) * 0.2;
        fx.drawChar(fxCtx, '\u00B7', cx, cy, 'var(--ink)', seedSize * pulse, seedAlpha, 0);
      }

      // Growth phase (20-100%)
      if (t >= 0.2) {
        const growT = (t - 0.2) / 0.8;
        let growEased;
        if (growT < 0.6) {
          growEased = Math.pow(growT / 0.6, 0.5) * 1.05;
        } else {
          growEased = 1.05 - 0.05 * ((growT - 0.6) / 0.4);
        }
        el.style.opacity = String(Math.min(growT * 2.5, 1));
        el.style.transform = 'scale(' + Math.min(growEased, 1.05) + ')';
      }

      // Sprout particles bloom outward
      sprouts.forEach(function (sp) {
        if (elapsed < sp.delay) return;
        sp.life += 16;
        const lr = sp.life / sp.maxLife;
        if (lr >= 1) return;
        const spT = Math.min(sp.life / 200, 1);
        const spDist = sp.distance * spT;
        const sx = cx + Math.cos(sp.angle) * spDist;
        const sy = cy + Math.sin(sp.angle) * spDist;
        let alpha = lr > 0.6 ? (1 - (lr - 0.6) / 0.4) : Math.min(sp.life / 100, 1);
        alpha *= lerp(0.4, 0.8, inorm);
        if (alpha > 0.01) {
          fx.drawChar(fxCtx, sp.char, sx, sy, sp.color, sp.size * (0.5 + spT * 0.5), alpha, sp.angle);
        }
      });

      if (t >= 1) {
        fx.deregisterFxDraw(_drawId);
        creationDone(el, ctx.onDone);
      }
    });
  },
  cleanup: function (el) {
    creationCleanup(el);
  },
};


// ═══════════════════════════════════════════════════════════════════
//  Variant maps (grouped by style tier)
// ═══════════════════════════════════════════════════════════════════

export const subtleVariants = {
  'fade-in': fadeIn,
  'slide-in': slideIn,
  'unfold': unfold,
  'typewriter': typewriter,
  'rise': rise,
};

export const dramaticVariants = {
  'slam-down': slamDown,
  'scale-bounce': scaleBounce,
  'materialize': materialize,
  'portal': portal,
  'glitch-in': glitchIn,
};

export const funVariants = {
  'confetti-drop': confettiDrop,
  'sparkle-trail': sparkleTrail,
  'butterfly-carry': butterflyCarry,
  'bounce-in': bounceIn,
  'grow': grow,
};

/**
 * All 15 creation/enter variants as plugin objects.
 */
export const allVariants = [
  // subtle
  fadeIn,
  slideIn,
  unfold,
  typewriter,
  rise,
  // dramatic
  slamDown,
  scaleBounce,
  materialize,
  portal,
  glitchIn,
  // fun
  confettiDrop,
  sparkleTrail,
  butterflyCarry,
  bounceIn,
  grow,
];


// ═══════════════════════════════════════════════════════════════════
//  Plugin install function (for AnimationRegistry)
// ═══════════════════════════════════════════════════════════════════

/**
 * Install all creation/enter animation variants into a registry.
 *
 * @param {Object} registry - An AnimationRegistry instance with
 *   registerCategory(category, style, variants) method.
 */
export function install(registry) {
  if (typeof registry.register === 'function') {
    registry.register('enter', 'subtle', subtleVariants);
    registry.register('enter', 'dramatic', dramaticVariants);
    registry.register('enter', 'fun', funVariants);
  } else if (typeof registry.registerCategory === 'function') {
    registry.registerCategory('enter', 'subtle', subtleVariants);
    registry.registerCategory('enter', 'dramatic', dramaticVariants);
    registry.registerCategory('enter', 'fun', funVariants);
  }
}


// ═══════════════════════════════════════════════════════════════════
//  Plugin object (for engine.use())
// ═══════════════════════════════════════════════════════════════════

/**
 * Creation plugin object for use with TotoFX engine.
 *
 * @example
 * import { createEngine } from 'toto-fx';
 * import { creationPlugin } from 'toto-fx/plugins/creation';
 *
 * const engine = createEngine({ ... });
 * engine.use(creationPlugin);
 *
 * @type {import('../types.js').AnimationPlugin}
 */
export const creationPlugin = {
  name: 'creation',
  install: install,
};

export default creationPlugin;
