/**
 * @module plugins/thud
 * @description Thud Animations -- 10 action animation variants.
 *
 * Physics-based lift/fall with tunable params. Each variant is a plugin
 * object with a `.play()` method and `.params` descriptors.
 *
 * Uses FX shared module for lift/fall/impact/particles/effects.
 * Uses ThemeManager for colors/characters.
 *
 * Variants: anime-slam, low-bounce, stratosphere, orbit-slam, crater,
 *   deep-crater, meteor, detonation, nuclear, shatter
 *
 * @example
 * import { createEngine } from 'toto-fx';
 * import { thudPlugin } from 'toto-fx/plugins/thud';
 *
 * const engine = createEngine({ ... });
 * engine.use(thudPlugin);
 *
 * @example
 * // Cherry-pick a single variant
 * import { animeSlamPlugin } from 'toto-fx/plugins/thud';
 */

import { FX } from '../fx.js';
import { ThemeManager } from '../theme.js';

// ── 10 Thud Variant Plugins ────────────────────────────────────

/**
 * Anime Slam -- classic lift-and-slam animation.
 * Lifts the card with 3D perspective, drops it with gravity easing,
 * triggers standard impact effects (squash, burst, particles), then
 * completes with strikethrough and badge.
 */
export const animeSlamPlugin = {
  name: 'anime-slam',
  category: 'action',
  style: 'thud',
  meta: { label: 'Anime Slam', description: 'Classic lift-and-slam with gravity drop and impact burst', tags: ['slam', 'gravity', 'impact'] },
  params: {
    peakZ:        { label: 'Lift Height',     type: 'range', min: 100, max: 1000, default: 450,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',   type: 'range', min: 100, max: 1000, default: 350,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',   type: 'range', min: 50,  max: 500,  default: 200,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:      { label: 'Fall Curve',      type: 'range', min: 1,   max: 6,    default: 3,    step: 0.1,  group: 'physics' },
    particles:    { label: 'Particle Count',  type: 'range', min: 5,   max: 100,  default: 40,   step: 5,    group: 'particles' },
    spread:       { label: 'Particle Spread', type: 'range', min: 1,   max: 30,   default: 8,    step: 1,    group: 'particles' },
    particleSize: { label: 'Particle Size',   type: 'range', min: 1,   max: 20,   default: 6,    step: 1,    group: 'particles' },
    gravity:      { label: 'Gravity',         type: 'range', min: 0,   max: 1,    default: 0.15, step: 0.01, group: 'physics' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(animeSlamPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -6 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        fx.standardImpact(el, sub.shadow, sub.burst, cx, cy);
        const sz = p.particleSize / 6;
        fx.spawnParticles(cx, cy, {
          count: Math.round(p.particles * scale), spread: p.spread, gravity: p.gravity,
          color: ThemeManager.particleColor('impact'),
          life: 60, size: [2 * sz, 6 * sz], upBias: 3,
          chars: ThemeManager.chars('particles'),
        });
        fx.spawnParticles(cx, cy, {
          count: Math.round(12 * scale), spread: 5, gravity: 0.12,
          color: [255, 255, 255],
          life: 35, size: [1 * sz, 3 * sz], upBias: 2,
          chars: ['*', '+', '\u2726'],
        });
        fx.completeAndRemove(el, sub.badge, sub.strike, 300, ctx.onDone);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
  },
};

/**
 * Low Bounce -- gentle, low-height lift with a quick bounce impact.
 * Fewer particles and shorter durations than Anime Slam.
 */
export const lowBouncePlugin = {
  name: 'low-bounce',
  category: 'action',
  style: 'thud',
  meta: { label: 'Low Bounce', description: 'Gentle low-height lift with quick bounce impact', tags: ['gentle', 'bounce', 'low'] },
  params: {
    peakZ:        { label: 'Lift Height',     type: 'range', min: 50,  max: 500,  default: 150,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',   type: 'range', min: 50,  max: 600,  default: 200,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',   type: 'range', min: 30,  max: 400,  default: 120,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:      { label: 'Fall Curve',      type: 'range', min: 1,   max: 6,    default: 2.5,  step: 0.1,  group: 'physics' },
    particles:    { label: 'Particle Count',  type: 'range', min: 5,   max: 80,   default: 20,   step: 5,    group: 'particles' },
    spread:       { label: 'Particle Spread', type: 'range', min: 1,   max: 20,   default: 4,    step: 1,    group: 'particles' },
    particleSize: { label: 'Particle Size',   type: 'range', min: 1,   max: 20,   default: 4,    step: 1,    group: 'particles' },
    gravity:      { label: 'Gravity',         type: 'range', min: 0,   max: 1,    default: 0.12, step: 0.01, group: 'physics' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(lowBouncePlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -3 + ctx.rand() * 2, rotY = -2 + ctx.rand() * 4;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        fx.standardImpact(el, sub.shadow, sub.burst, cx, cy);
        const sz = p.particleSize / 4;
        fx.spawnParticles(cx, cy, {
          count: Math.round(p.particles * scale), spread: p.spread, gravity: p.gravity,
          color: ThemeManager.particleColor('impact'),
          life: 40, size: [1 * sz, 4 * sz], upBias: 1.5,
          chars: ThemeManager.chars('particles'),
        });
        fx.completeAndRemove(el, sub.badge, sub.strike, 200, ctx.onDone);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
  },
};

/**
 * Stratosphere -- massive height lift with extra-heavy impact.
 * Features glow effects, large dotgrid ripple, and abundant particles.
 */
export const stratospherePlugin = {
  name: 'stratosphere',
  category: 'action',
  style: 'thud',
  meta: { label: 'Stratosphere', description: 'Massive height lift with extra-heavy glow impact', tags: ['heavy', 'glow', 'stratosphere'] },
  params: {
    peakZ:        { label: 'Lift Height',     type: 'range', min: 200, max: 1200, default: 680,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',   type: 'range', min: 200, max: 1200, default: 500,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',   type: 'range', min: 100, max: 600,  default: 280,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:      { label: 'Fall Curve',      type: 'range', min: 1,   max: 6,    default: 3.5,  step: 0.1,  group: 'physics' },
    particles:    { label: 'Particle Count',  type: 'range', min: 10,  max: 150,  default: 60,   step: 5,    group: 'particles' },
    spread:       { label: 'Particle Spread', type: 'range', min: 1,   max: 30,   default: 12,   step: 1,    group: 'particles' },
    particleSize: { label: 'Particle Size',   type: 'range', min: 1,   max: 20,   default: 8,    step: 1,    group: 'particles' },
    gravity:      { label: 'Gravity',         type: 'range', min: 0,   max: 1,    default: 0.2,  step: 0.01, group: 'physics' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(stratospherePlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -8 + ctx.rand() * 4, rotY = -4 + ctx.rand() * 8;
    const scale = fx.intensityScale(ctx.intensity || 5);
    const glowColor = ThemeManager.color('glow') || 'rgba(196,90,60,0.15)';

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        // Extra-heavy impact
        el.style.transition = 'none';
        el.style.transform = fx.fxEnabled('cardSquash') ? 'translateZ(0) scaleY(0.88)' : 'translateZ(0)';
        if (!fx.isMobile) el.style.boxShadow = '0 0 60px ' + glowColor + ', 0 0 120px ' + glowColor;
        if (sub.shadow) {
          sub.shadow.style.transition = 'none';
          sub.shadow.style.opacity = '1';
          sub.shadow.style.transform = 'translateY(2px) scaleX(1.5) scaleY(0.3)';
          if (!fx.isMobile) sub.shadow.style.filter = 'blur(16px)';
        }
        if (sub.burst) {
          sub.burst.style.transition = 'none';
          sub.burst.style.opacity = '1';
          sub.burst.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, ' + glowColor + ' 40%, transparent 70%)';
        }
        fx.doImpactFlash(false);
        fx.doScreenShake(true);
        fx.doDotgridRipple(cx, cy, { radius: 650, push: 22, scale: 3.5 });

        ctx.raf(function () {
          let recoverTransition = fx.fxEnabled('cardSquash')
            ? 'transform 0.22s cubic-bezier(0.25,1,0.5,1)' : '';
          if (!fx.isMobile) recoverTransition += (recoverTransition ? ', ' : '') + 'box-shadow 0.4s ease-out';
          el.style.transition = recoverTransition;
          el.style.transform = 'translateZ(0) scaleY(1)';
          if (!fx.isMobile) el.style.boxShadow = '0 0 15px ' + glowColor;
          if (sub.shadow) {
            sub.shadow.style.transition = fx.isMobile ? 'opacity 0.4s ease-out, transform 0.4s ease-out' : 'all 0.4s ease-out';
            sub.shadow.style.opacity = '0';
            sub.shadow.style.transform = 'translateY(0) scaleX(1) scaleY(1)';
          }
          if (sub.burst) {
            sub.burst.style.transition = 'opacity 0.3s ease-out';
            sub.burst.style.opacity = '0';
          }
        });

        const sz = p.particleSize / 8;
        fx.spawnParticles(cx, cy, {
          count: Math.round(p.particles * scale), spread: p.spread, gravity: p.gravity,
          color: ThemeManager.particleColor('impact'),
          life: 75, size: [2 * sz, 8 * sz], upBias: 4,
          chars: ThemeManager.chars('particles'),
        });
        fx.spawnParticles(cx, cy, {
          count: Math.round(20 * scale), spread: 6, gravity: 0.1,
          color: [255, 255, 255],
          life: 40, size: [1 * sz, 4 * sz], upBias: 2.5,
          chars: ['*', '+', '\u2726', '\u2605'],
        });
        fx.completeAndRemove(el, sub.badge, sub.strike, 350, ctx.onDone);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transition = '';
    el.style.boxShadow = '';
  },
};

/**
 * Orbit and Slam -- lift, 360-degree Y-axis orbit at peak, then gravity fall.
 * The orbit phase smoothly interpolates rotation with vertical bobbing.
 */
export const orbitSlamPlugin = {
  name: 'orbit-slam',
  category: 'action',
  style: 'thud',
  meta: { label: 'Orbit Slam', description: 'Lift with 360-degree orbit at peak then gravity slam', tags: ['orbit', 'spin', 'slam'] },
  params: {
    peakZ:        { label: 'Lift Height',     type: 'range', min: 100, max: 1000, default: 500,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',   type: 'range', min: 100, max: 1000, default: 350,  step: 10,   unit: 'ms', group: 'timing' },
    orbitDur:     { label: 'Orbit Duration',  type: 'range', min: 100, max: 800,  default: 280,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',   type: 'range', min: 50,  max: 500,  default: 200,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:      { label: 'Fall Curve',      type: 'range', min: 1,   max: 6,    default: 3.5,  step: 0.1,  group: 'physics' },
    particles:    { label: 'Particle Count',  type: 'range', min: 5,   max: 120,  default: 50,   step: 5,    group: 'particles' },
    spread:       { label: 'Particle Spread', type: 'range', min: 1,   max: 25,   default: 9,    step: 1,    group: 'particles' },
    particleSize: { label: 'Particle Size',   type: 'range', min: 1,   max: 20,   default: 7,    step: 1,    group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(orbitSlamPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -5 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      // Orbit phase
      el.style.transition = 'none';
      if (sub.shadow) sub.shadow.style.transition = 'none';

      const orbitDur = p.orbitDur;
      const orbitStart = ctx.now();

      function orbitStep(now) {
        const t = Math.min((now - orbitStart) / orbitDur, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const rotYCur = rotY + 360 * eased;
        const rotXCur = rotX * (1 - eased * 0.5) + 8 * Math.sin(eased * Math.PI);
        const zBob = p.peakZ + 30 * Math.sin(eased * Math.PI);
        el.style.transform = 'translateZ(' + zBob + 'px) rotateX(' + rotXCur + 'deg) rotateY(' + rotYCur + 'deg)';

        if (sub.shadow) {
          const si = zBob / p.peakZ;
          sub.shadow.style.opacity = String(si * 0.7);
          sub.shadow.style.transform = 'translateY(' + (si * 48) + 'px) scaleX(' + (1 + si * 0.15) + ') scaleY(' + (1 + si * 0.2) + ')';
          if (!fx.isMobile) sub.shadow.style.filter = 'blur(' + (14 + si * 18) + 'px)';
        }

        if (t < 1) {
          ctx.raf(orbitStep);
        } else {
          fx.gravityFall(el, sub.shadow, p.peakZ, 0, 0, p.fallDur, p.fallExp, cx, cy, function () {
            fx.standardImpact(el, sub.shadow, sub.burst, cx, cy);
            fx.doScreenShake(true);
            const sz = p.particleSize / 7;
            fx.spawnParticles(cx, cy, {
              count: Math.round(p.particles * scale), spread: p.spread, gravity: 0.15,
              color: ThemeManager.particleColor('impact'),
              life: 65, size: [2 * sz, 7 * sz], upBias: 3,
              chars: ThemeManager.chars('particles'),
            });
            fx.completeAndRemove(el, sub.badge, sub.strike, 300, ctx.onDone);
          });
        }
      }
      ctx.raf(orbitStep);
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transition = '';
  },
};

/**
 * Crater Impact -- standard lift-and-fall with a dotgrid crater effect on impact.
 * Debris particles use the 'debris' theme category.
 */
export const craterPlugin = {
  name: 'crater',
  category: 'action',
  style: 'thud',
  meta: { label: 'Crater', description: 'Lift-and-fall with dotgrid crater on impact', tags: ['crater', 'debris', 'impact'] },
  params: {
    peakZ:        { label: 'Lift Height',    type: 'range', min: 100, max: 1000, default: 450,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',  type: 'range', min: 100, max: 1000, default: 370,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',  type: 'range', min: 50,  max: 500,  default: 210,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:      { label: 'Fall Curve',     type: 'range', min: 1,   max: 6,    default: 3,    step: 0.1,  group: 'physics' },
    particles:    { label: 'Particle Count', type: 'range', min: 5,   max: 120,  default: 45,   step: 5,    group: 'particles' },
    particleSize: { label: 'Particle Size',  type: 'range', min: 1,   max: 20,   default: 6,    step: 1,    group: 'particles' },
    craterRadius: { label: 'Crater Size',    type: 'range', min: 50,  max: 500,  default: 180,  step: 10,   unit: 'px', group: 'visual' },
    craterDepth:  { label: 'Crater Depth',   type: 'range', min: 0.1, max: 3,    default: 1.0,  step: 0.1,  group: 'visual' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(craterPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -6 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        fx.standardImpact(el, sub.shadow, sub.burst, cx, cy);
        fx.doDotgridCrater(cx, cy, p.craterRadius, p.craterDepth, { cracks: 7, crackLength: p.craterRadius * 1.3, healDelay: 3000 });
        const sz = p.particleSize / 6;
        fx.spawnParticles(cx, cy, {
          count: Math.round(p.particles * scale), spread: 7, gravity: 0.12,
          color: ThemeManager.particleColor('debris'),
          life: 70, size: [2 * sz, 6 * sz], upBias: 4,
          chars: ThemeManager.chars('debris'),
        });
        fx.completeAndRemove(el, sub.badge, sub.strike, 350, ctx.onDone);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
  },
};

/**
 * Deep Crater -- larger crater with more cracks, fire particles, heavy shake,
 * and a card-sinking effect where the card appears to drop into the crater.
 */
export const deepCraterPlugin = {
  name: 'deep-crater',
  category: 'action',
  style: 'thud',
  meta: { label: 'Deep Crater', description: 'Heavy crater with fire particles and card-sink effect', tags: ['crater', 'fire', 'heavy'] },
  params: {
    peakZ:        { label: 'Lift Height',     type: 'range', min: 200, max: 1200, default: 600,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',   type: 'range', min: 150, max: 1000, default: 450,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',   type: 'range', min: 50,  max: 600,  default: 250,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:      { label: 'Fall Curve',      type: 'range', min: 1,   max: 6,    default: 3,    step: 0.1,  group: 'physics' },
    particles:    { label: 'Debris Count',    type: 'range', min: 10,  max: 150,  default: 70,   step: 5,    group: 'particles' },
    spread:       { label: 'Debris Spread',   type: 'range', min: 1,   max: 25,   default: 10,   step: 1,    group: 'particles' },
    particleSize: { label: 'Particle Size',   type: 'range', min: 1,   max: 20,   default: 7,    step: 1,    group: 'particles' },
    craterRadius: { label: 'Crater Size',     type: 'range', min: 80,  max: 600,  default: 260,  step: 10,   unit: 'px', group: 'visual' },
    craterDepth:  { label: 'Crater Depth',    type: 'range', min: 0.1, max: 4,    default: 1.5,  step: 0.1,  group: 'visual' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(deepCraterPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -6 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        fx.standardImpact(el, sub.shadow, sub.burst, cx, cy);
        fx.doScreenShake(true);
        fx.doDotgridCrater(cx, cy, p.craterRadius, p.craterDepth, { cracks: 10, crackLength: p.craterRadius * 1.6, healDelay: 4000 });

        const sz = p.particleSize / 7;
        fx.spawnParticles(cx, cy, {
          count: Math.round(p.particles * scale), spread: p.spread, gravity: 0.12,
          color: ThemeManager.particleColor('debris'),
          life: 70, size: [2 * sz, 7 * sz], upBias: 4,
          chars: ThemeManager.chars('debris'),
        });
        fx.spawnParticles(cx, cy, {
          count: Math.round(30 * scale), spread: 3, gravity: 0.04,
          color: ThemeManager.particleColor('fire'),
          life: 90, size: [3 * sz, 9 * sz], upBias: 0.5, originSpread: 40,
          chars: ThemeManager.chars('fire'),
        });

        // Card sinks into crater
        setTimeout(function () {
          el.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
          el.style.transform = 'translateZ(-20px) scaleY(0.95) scaleX(0.98)';
          el.style.opacity = '0.5';
        }, 200);

        fx.completeAndRemove(el, sub.badge, sub.strike, 450, ctx.onDone);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transition = '';
  },
};

/**
 * Meteor Strike -- lift, then angled descent with fire trail particles,
 * inward speed lines, crater on impact, and scorch trail from entry to impact.
 */
export const meteorPlugin = {
  name: 'meteor',
  category: 'action',
  style: 'thud',
  meta: { label: 'Meteor Strike', description: 'Angled descent with fire trail and scorch crater', tags: ['meteor', 'fire', 'trail', 'crater'] },
  params: {
    peakZ:        { label: 'Lift Height',     type: 'range', min: 100, max: 1000, default: 450,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',   type: 'range', min: 100, max: 1000, default: 350,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',   type: 'range', min: 80,  max: 600,  default: 250,  step: 10,   unit: 'ms', group: 'timing' },
    lateralDrift: { label: 'Lateral Drift',   type: 'range', min: 20,  max: 200,  default: 80,   step: 5,    unit: 'px', group: 'motion' },
    particles:    { label: 'Debris Count',    type: 'range', min: 10,  max: 120,  default: 50,   step: 5,    group: 'particles' },
    particleSize: { label: 'Particle Size',   type: 'range', min: 1,   max: 20,   default: 7,    step: 1,    group: 'particles' },
    craterRadius: { label: 'Crater Size',     type: 'range', min: 50,  max: 500,  default: 200,  step: 10,   unit: 'px', group: 'visual' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(meteorPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -6 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      el.style.transition = 'none';
      if (sub.shadow) sub.shadow.style.transition = 'none';

      const fallAngle = -0.3 + ctx.rand() * 0.6;
      const lateralDrift = p.lateralDrift * Math.sign(fallAngle || 1);
      const fallDuration = p.fallDur;
      const start = ctx.now();
      let lastFireTime = 0;
      const trajStartX = cx, trajStartY = cy - 120;

      fx.startSpeedLines(cx, cy, 'inward', fallDuration);

      function step(now) {
        const t = Math.min((now - start) / fallDuration, 1);
        const eased = t * t * t;
        const z = p.peakZ * (1 - eased);
        const xOff = lateralDrift * eased;
        el.style.transform = 'translateZ(' + z + 'px) translateX(' + xOff + 'px) rotateX(' + (rotX * (1 - eased) - 12 * eased) + 'deg) rotateY(' + (rotY * (1 - eased)) + 'deg)';

        if (sub.shadow) {
          const si = z / p.peakZ;
          sub.shadow.style.opacity = String(si * 0.8);
          sub.shadow.style.transform = 'translateY(' + (si * 45) + 'px) translateX(' + (xOff * 0.5) + 'px) scaleX(' + (1 + si * 0.2) + ') scaleY(' + (1 + si * 0.3) + ')';
          if (!fx.isMobile) sub.shadow.style.filter = 'blur(' + (14 + si * 18) + 'px)';
        }

        if (now - lastFireTime > 30 && t < 0.9) {
          // Calculate position mathematically to avoid forced reflow
          const fireX = cx + xOff;
          const fireY = cy - pos.rect.height / 2;
          fx.spawnFireTrail(fireX, fireY, Math.PI / 2 + fallAngle);
          lastFireTime = now;
        }

        if (t < 1) {
          ctx.raf(step);
        } else {
          fx.stopSpeedLines();
          const impactX = cx + lateralDrift;
          fx.standardImpact(el, sub.shadow, sub.burst, impactX, cy);
          fx.doScreenShake(true);
          fx.doDotgridCrater(impactX, cy, p.craterRadius, 1.3, { cracks: 8, crackLength: p.craterRadius * 1.3, healDelay: 3500 });
          fx.doDotgridScorch(trajStartX - lateralDrift * 0.3, trajStartY, impactX, cy, 40);

          const sz = p.particleSize / 7;
          fx.spawnParticles(impactX - lateralDrift * 0.3, cy, {
            count: Math.round(p.particles * scale), spread: 8, gravity: 0.1,
            color: ThemeManager.particleColor('debris'),
            life: 70, size: [2 * sz, 7 * sz], upBias: 4, originSpread: 30,
            chars: ThemeManager.chars('debris'),
          });
          fx.spawnParticles(impactX, cy, {
            count: Math.round(25 * scale), spread: 4, gravity: 0.06,
            color: ThemeManager.particleColor('fire'),
            life: 55, size: [2 * sz, 5 * sz], upBias: 2, originSpread: 15,
            chars: ThemeManager.chars('fire'),
          });
          fx.completeAndRemove(el, sub.badge, sub.strike, 350, ctx.onDone);
        }
      }
      ctx.raf(step);
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transition = '';
  },
};

/**
 * Impact Detonation -- standard lift-and-fall with a delayed secondary explosion.
 * After impact, a timed detonation triggers flash, heavy shake, large ripple,
 * blast + fire particles, smoke cloud, then card vanishes.
 */
export const detonationPlugin = {
  name: 'detonation',
  category: 'action',
  style: 'thud',
  meta: { label: 'Detonation', description: 'Delayed secondary explosion with blast and smoke', tags: ['explosion', 'blast', 'smoke'] },
  params: {
    peakZ:        { label: 'Lift Height',      type: 'range', min: 100, max: 1000, default: 400,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:      { label: 'Lift Duration',    type: 'range', min: 100, max: 1000, default: 350,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:      { label: 'Fall Duration',    type: 'range', min: 50,  max: 500,  default: 200,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:      { label: 'Fall Curve',       type: 'range', min: 1,   max: 6,    default: 3,    step: 0.1,  group: 'physics' },
    detonDelay:   { label: 'Detonation Delay', type: 'range', min: 50,  max: 500,  default: 200,  step: 10,   unit: 'ms', group: 'timing' },
    particles:    { label: 'Blast Particles',  type: 'range', min: 10,  max: 150,  default: 70,   step: 5,    group: 'particles' },
    particleSize: { label: 'Particle Size',    type: 'range', min: 1,   max: 20,   default: 9,    step: 1,    group: 'particles' },
    rippleRadius: { label: 'Ripple Radius',    type: 'range', min: 200, max: 1000, default: 600,  step: 10,   unit: 'px', group: 'visual' },
    smokeCount:   { label: 'Smoke Amount',     type: 'range', min: 5,   max: 60,   default: 25,   step: 5,    group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(detonationPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -6 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        fx.standardImpact(el, sub.shadow, sub.burst, cx, cy);
        // Detonation after delay
        setTimeout(function () {
          fx.doImpactFlash(false);
          fx.doScreenShake(true);
          fx.doDotgridRipple(cx, cy, { radius: p.rippleRadius, push: 20, scale: 3 });

          const sz = p.particleSize / 9;
          fx.spawnParticles(cx, cy, {
            count: Math.round(p.particles * scale), spread: 12, gravity: 0.18,
            color: ThemeManager.particleColor('fire'),
            life: 70, size: [3 * sz, 9 * sz], upBias: 4, originSpread: 20,
            chars: ThemeManager.chars('blast'),
          });
          fx.spawnParticles(cx, cy, {
            count: Math.round(40 * scale), spread: 7, gravity: 0.15,
            color: ThemeManager.particleColor('impact'),
            life: 50, size: [2 * sz, 5 * sz], upBias: 2.5,
            chars: ThemeManager.chars('particles'),
          });
          fx.spawnSmoke(cx, cy, Math.round(p.smokeCount * scale));

          // Card explodes
          el.style.transition = 'none';
          el.style.opacity = '0';
          setTimeout(function () {
            fx.cleanupCard(el);
            if (ctx.onDone) ctx.onDone();
          }, 100);
        }, p.detonDelay);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transition = '';
  },
};

/**
 * Nuclear -- white-out impact flash, heavy shake, dotgrid nuclear mushroom cloud,
 * multi-layer particle system (base fire, stem, cap), and card instant vanish.
 * The most intense thud variant.
 */
export const nuclearPlugin = {
  name: 'nuclear',
  category: 'action',
  style: 'thud',
  meta: { label: 'Nuclear', description: 'White-out flash with mushroom cloud particle system', tags: ['nuclear', 'mushroom', 'intense'] },
  params: {
    peakZ:         { label: 'Lift Height',    type: 'range', min: 200, max: 1200, default: 500,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:       { label: 'Lift Duration',  type: 'range', min: 200, max: 1200, default: 400,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:       { label: 'Fall Duration',  type: 'range', min: 80,  max: 600,  default: 220,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:       { label: 'Fall Curve',     type: 'range', min: 1,   max: 6,    default: 3,    step: 0.1,  group: 'physics' },
    rippleRadius:  { label: 'Ripple Radius',  type: 'range', min: 300, max: 1200, default: 800,  step: 10,   unit: 'px', group: 'visual' },
    stemParticles: { label: 'Stem Particles', type: 'range', min: 5,   max: 60,   default: 25,   step: 5,    group: 'particles' },
    capParticles:  { label: 'Cap Particles',  type: 'range', min: 5,   max: 80,   default: 30,   step: 5,    group: 'particles' },
    particleSize:  { label: 'Particle Size',  type: 'range', min: 1,   max: 20,   default: 10,   step: 1,    group: 'particles' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(nuclearPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -6 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        // Impact -- everything goes white
        el.style.transition = 'none';
        el.style.transform = 'translateZ(0)';
        el.style.boxShadow = 'none';
        if (sub.shadow) { sub.shadow.style.transition = 'none'; sub.shadow.style.opacity = '0'; }
        if (sub.burst) { sub.burst.style.transition = 'none'; sub.burst.style.opacity = '0'; }

        fx.doImpactFlash(true);
        fx.doScreenShake(true);
        fx.doDotgridRipple(cx, cy, { radius: p.rippleRadius, speed: 0.8, push: 25, scale: 4 });
        fx.doDotgridNuclear(cx, cy);

        // Mushroom cloud particles via pushParticles
        const fireGlyphs = ThemeManager.chars('fire');
        const smokeGlyphs = ThemeManager.chars('smoke');
        const blastGlyphs = ThemeManager.chars('blast');

        setTimeout(function () {
          const batch = [];
          const sz = p.particleSize / 10;
          // Base fire
          for (let i = 0; i < Math.round(15 * scale); i++) {
            const angle = ctx.rand() * Math.PI * 2;
            batch.push({
              x: cx + (ctx.rand() - 0.5) * 30, y: cy,
              vx: Math.cos(angle) * (0.5 + ctx.rand()), vy: -(0.5 + ctx.rand() * 1.5),
              life: 55 + ctx.rand() * 25, maxLife: 80,
              size: (6 + ctx.rand() * 8) * sz,
              color: ThemeManager.particleColor('fire'),
              gravity: -0.01, drag: 0.98,
              char: fireGlyphs[Math.floor(ctx.rand() * fireGlyphs.length)],
            });
          }
          // Stem
          for (let j = 0; j < Math.round(p.stemParticles * scale); j++) {
            batch.push({
              x: cx + (ctx.rand() - 0.5) * 20, y: cy - ctx.rand() * 20,
              vx: (ctx.rand() - 0.5) * 0.4, vy: -(2.5 + ctx.rand() * 3.5),
              life: 100 + ctx.rand() * 35, maxLife: 135,
              size: (5 + ctx.rand() * 7) * sz,
              color: ThemeManager.particleColor('debris'),
              gravity: -0.025, drag: 0.985,
              char: smokeGlyphs[Math.floor(ctx.rand() * smokeGlyphs.length)],
            });
          }
          // Cap
          for (let k = 0; k < Math.round(p.capParticles * scale); k++) {
            const capAngle = ctx.rand() * Math.PI * 2;
            const vel = 0.8 + ctx.rand() * 2.5;
            batch.push({
              x: cx + (ctx.rand() - 0.5) * 30, y: cy - 80 - ctx.rand() * 30,
              vx: Math.cos(capAngle) * vel, vy: -(0.8 + ctx.rand() * 1.5),
              life: 80 + ctx.rand() * 50, maxLife: 130,
              size: (8 + ctx.rand() * 12) * sz,
              color: ThemeManager.particleColor('smoke'),
              gravity: -0.012, drag: 0.975,
              char: blastGlyphs[Math.floor(ctx.rand() * blastGlyphs.length)],
            });
          }
          fx.pushParticles(batch);
        }, 80);

        // Card disappears
        el.style.transition = 'opacity 0.15s';
        el.style.opacity = '0';
        setTimeout(function () {
          fx.cleanupCard(el);
          if (ctx.onDone) ctx.onDone();
        }, 350);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transition = '';
    el.style.boxShadow = '';
  },
};

/**
 * Shatter -- lift-and-fall, then card shatters into ASCII character fragments
 * that fly outward with physics. Uses theme-aware shatter characters and
 * dotgrid ripple. Card collapses its height after fragments disperse.
 */
export const shatterPlugin = {
  name: 'shatter',
  category: 'action',
  style: 'thud',
  meta: { label: 'Shatter', description: 'Card shatters into ASCII fragments with physics', tags: ['shatter', 'fragments', 'ascii'] },
  params: {
    peakZ:      { label: 'Lift Height',     type: 'range', min: 100, max: 1000, default: 400,  step: 10,   unit: 'px', group: 'motion' },
    liftDur:    { label: 'Lift Duration',   type: 'range', min: 100, max: 1000, default: 350,  step: 10,   unit: 'ms', group: 'timing' },
    fallDur:    { label: 'Fall Duration',   type: 'range', min: 50,  max: 500,  default: 200,  step: 10,   unit: 'ms', group: 'timing' },
    fallExp:    { label: 'Fall Curve',      type: 'range', min: 1,   max: 6,    default: 3,    step: 0.1,  group: 'physics' },
    fragCount:  { label: 'Fragment Count',  type: 'range', min: 5,   max: 40,   default: 15,   step: 1,    group: 'particles' },
    fragGravity:{ label: 'Frag Gravity',    type: 'range', min: 0.05,max: 1,    default: 0.25, step: 0.01, group: 'physics' },
    particles:    { label: 'Particle Count',  type: 'range', min: 5,   max: 80,   default: 25,   step: 5,    group: 'particles' },
    spread:       { label: 'Particle Spread', type: 'range', min: 1,   max: 20,   default: 5,    step: 1,    group: 'particles' },
    particleSize: { label: 'Particle Size',   type: 'range', min: 1,   max: 20,   default: 4,    step: 1,    group: 'particles' },
    gravity:      { label: 'Gravity',         type: 'range', min: 0,   max: 1,    default: 0.1,  step: 0.01, group: 'physics' },
  },
  requires: ['FX'],
  play: function (el, ctx) {
    const fx = ctx.helpers || FX;
    const p = fx.resolveParams(shatterPlugin.params, ctx.params);
    const sub = fx.getSubElements(el);
    const pos = fx.getItemRect(el);
    const cx = pos.cx, cy = pos.cy;
    const rotX = -6 + ctx.rand() * 3, rotY = -3 + ctx.rand() * 6;
    const scale = fx.intensityScale(ctx.intensity || 5);

    fx.liftCard(el, sub.shadow, cx, cy, p.peakZ, p.liftDur, rotX, rotY, function () {
      fx.gravityFall(el, sub.shadow, p.peakZ, rotX, rotY, p.fallDur, p.fallExp, cx, cy, function () {
        el.style.transition = 'none';
        el.style.transform = 'translateZ(0)';
        if (sub.shadow) { sub.shadow.style.transition = 'none'; sub.shadow.style.opacity = '0'; }

        fx.doImpactFlash(false);
        fx.doScreenShake(false);
        fx.doDotgridRipple(cx, cy);

        // Create ASCII shatter fragments
        const r = el.getBoundingClientRect();
        const fragCount = Math.round(p.fragCount * scale);
        const shatterGlyphs = ThemeManager.chars('shatter');
        el.style.opacity = '0';

        for (let i = 0; i < fragCount; i++) {
          const frag = document.createElement('span');
          const glyph = shatterGlyphs[Math.floor(ctx.rand() * shatterGlyphs.length)];
          const fontSize = 14 + Math.floor(ctx.rand() * 18);
          const fx = r.left + ctx.rand() * r.width;
          const fy = r.top + ctx.rand() * r.height;
          frag.textContent = glyph;
          frag.style.cssText = 'position:fixed;left:' + fx + 'px;top:' + fy + 'px;font-family:monospace;font-size:' + fontSize + 'px;color:var(--ink);pointer-events:none;z-index:200;will-change:transform,opacity;';
          frag.setAttribute('data-thud-frag', 'true');
          document.body.appendChild(frag);

          (function (f) {
            const vx = (ctx.rand() - 0.5) * 6;
            let vy = -(1 + ctx.rand() * 3);
            const vr = (ctx.rand() - 0.5) * 8;
            let posX = 0, posY = 0, rot = 0, opacity = 1;

            function animFrag() {
              vy += p.fragGravity;
              posX += vx; posY += vy; rot += vr; opacity -= 0.012;
              f.style.transform = 'translate(' + posX + 'px, ' + posY + 'px) rotate(' + rot + 'deg)';
              f.style.opacity = String(Math.max(0, opacity));
              if (opacity > 0 && posY < window.innerHeight) ctx.raf(animFrag);
              else f.remove();
            }
            ctx.raf(animFrag);
          })(frag);
        }

        const sz = p.particleSize / 4;
        fx.spawnParticles(cx, cy, {
          count: Math.round(p.particles * scale), spread: p.spread, gravity: p.gravity,
          color: ThemeManager.particleColor('impact'),
          life: 35, size: [1 * sz, 4 * sz], upBias: 1.5,
          chars: ThemeManager.chars('shatter'),
        });

        // Height collapse after fragments fly -- use cached rect height to avoid forced reflow
        const cachedHeight = r.height;
        setTimeout(function () {
          el.style.transition = 'max-height 0.35s ease, margin-bottom 0.35s ease, padding 0.35s ease';
          const h = cachedHeight;
          el.style.maxHeight = h + 'px';
          el.style.overflow = 'hidden';
          ctx.raf(function () {
            ctx.raf(function () {
              el.style.maxHeight = '0px';
              el.style.marginBottom = '0px';
              el.style.paddingTop = '0px';
              el.style.paddingBottom = '0px';
            });
          });
          setTimeout(function () {
            fx.cleanupCard(el);
            if (ctx.onDone) ctx.onDone();
          }, 400);
        }, 300);
      });
    });
  },
  cleanup: function (el) {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transition = '';
    el.style.maxHeight = '';
    el.style.overflow = '';
    el.style.marginBottom = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    // Remove any lingering shatter fragments
    if (typeof document !== 'undefined') {
      const frags = document.querySelectorAll('[data-thud-frag]');
      for (let i = 0; i < frags.length; i++) {
        frags[i].remove();
      }
    }
  },
};

// ── All variant plugins ────────────────────────────────────────

/**
 * All thud variant plugins as an array.
 * @type {Object[]}
 */
export const allVariants = [
  animeSlamPlugin,
  lowBouncePlugin,
  stratospherePlugin,
  orbitSlamPlugin,
  craterPlugin,
  deepCraterPlugin,
  meteorPlugin,
  detonationPlugin,
  nuclearPlugin,
  shatterPlugin,
];

/**
 * Map of variant name to variant plugin object.
 * @type {Object<string, Object>}
 */
export const variants = {};
for (let i = 0; i < allVariants.length; i++) {
  variants[allVariants[i].name] = allVariants[i];
}

// ── Plugin install ────────────────────────────────────────────

/**
 * Install thud variants into an engine or registry.
 *
 * Supports two patterns:
 * - Engine: `engine.use(thudPlugin)` -- calls engine.register('action', 'thud', variants)
 * - Registry: `install(registry)` -- calls registry.registerCategory('action', 'thud', variants)
 *
 * @param {Object} registry - An engine instance (with .register) or AnimationRegistry (with .registerCategory).
 * @param {Object} [config] - Optional plugin configuration (reserved for future use).
 */
export function install(registry, config) {
  if (typeof registry.register === 'function') {
    // Engine pattern: engine.register(category, style, variants)
    registry.register('action', 'thud', variants);
  } else if (typeof registry.registerCategory === 'function') {
    // Registry pattern: registry.registerCategory(category, style, variants)
    registry.registerCategory('action', 'thud', variants);
  }
}

/**
 * Thud plugin object for use with `engine.use(thudPlugin)`.
 *
 * @example
 * import { createEngine } from 'toto-fx';
 * import { thudPlugin } from 'toto-fx/plugins/thud';
 *
 * const engine = createEngine({ ... });
 * engine.use(thudPlugin);
 *
 * @type {import('../types.js').AnimationPlugin}
 */
export const thudPlugin = {
  name: 'thud',
  install: install,
};

export default thudPlugin;
