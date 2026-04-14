/**
 * @module cute
 * @description Cute animation plugins for toto-fx -- 13 action animation variants.
 *
 * Each plugin follows the toto-fx plugin contract:
 * `{ name, category, style, meta, params, requires, play(el, ctx), cleanup(el) }`
 *
 * All variants use the FX canvas for custom particle rendering and
 * support tunable `.params` for design studio tooling.
 *
 * Plugins: confetti, flowers, sparkle, shootingstar, butterflies,
 *          rainbow, fireworks, hearts, cat, dog, snowfall, ocean, fireflies
 *
 * @example
 * import { cutePlugin } from 'toto-fx/plugins/cute.js';
 * engine.use(cutePlugin);
 *
 * @example
 * import { install } from 'toto-fx/plugins/cute.js';
 * install(registry);
 */

import { FX } from '../fx.js';


// ── Helpers ─────────────────────────────────────────────────────

/**
 * Get the app shell container element (or body as fallback).
 * @returns {HTMLElement}
 * @private
 */
function getApp() {
  return document.body;
}

/**
 * Pick a random element from an array.
 * @param {Array} arr - Source array.
 * @returns {*} A random element.
 * @private
 */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Generate a random number in the range [a, b).
 * @param {number} a - Range start.
 * @param {number} b - Range end.
 * @returns {number}
 * @private
 */
function randRange(a, b) { return a + Math.random() * (b - a); }

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Interpolation factor (0-1).
 * @returns {number}
 * @private
 */
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * Build a legacy opts object from plugin context for compatibility
 * with FX.finalize(el, opts) and FX.resolveParams() calls.
 * @param {Object} pctx - Plugin context {intensity, speed, fx, params, onDone, helpers}
 * @returns {Object} Legacy opts format
 * @private
 */
function buildOpts(pctx) {
  return {
    intensity: pctx.intensity,
    speed: pctx.speed,
    fx: pctx.fx,
    params: pctx.params,
    onDone: pctx.onDone
  };
}

/**
 * Standard cleanup: reset el styles and remove injected canvas/DOM.
 * @param {HTMLElement} el - The animated element
 * @private
 */
function standardCleanup(el) {
  el.style.transform = '';
  el.style.opacity = '';
  el.style.display = '';
  el.style.boxShadow = '';
  el.style.borderColor = '';
}

// ── ASCII character sets ──────────────────────────────────────
const CONFETTI_CHARS = ['\u2665', '\u2605', '\u2726', '\u266A', '\u273F', '\u2740', '\u2606', '\u266B', '\u2734', '\u2727'];
const FLOWER_CHARS = ['\u273F', '\u2740', '\u273E', '\u2741', '\u2698', '\u2743'];
const SPARKLE_CHARS = ['\u2726', '\u2727', '\u2605', '\u2606', '\u00B7', '*', '\u2728', '+'];
const STAR_CHARS = ['\u2605', '\u2606', '\u00B7', '\u2726', '~', '*'];
const HEART_CHARS = ['\u2665', '\u2661', '\u2764', '\u2765'];
const FIREWORK_CHARS = ['\u2605', '\u2726', '*', '+', '\u2727', '\u00B7', '\u2606', '\u273F'];

// ── Realistic flower character sets ──────────────────────────
const REAL_LEAF_CHARS = ['\u2663', '\u2767', '\u2571', '\u2572'];
const GROUND_CHARS = ['\u2593', '\u2591', '~'];

// ── Color palettes ──────────────────────────────────────────
const RAINBOW = ['#cf6e5e', '#d99a7c', '#c9a84c', '#6aab8e', '#6da3b8', '#9b85c4', '#d4728c'];
const PASTEL = ['#e8b4b8', '#e8d0b4', '#e8e4b4', '#b4e8c9', '#b4dae8', '#d0b4e8', '#e8b4cb'];
const ROYGBIV = ['#cf4040', '#d98040', '#c9c040', '#40a860', '#4080cf', '#5530a0', '#8030a0'];

// ── Impressionist flower palettes (Monet / Morisot) ──────────
const MONET_PINKS = ['#e8a0b0', '#d48898', '#f0c0cc', '#c87888', '#dca0b0', '#e8b8c4'];
const MONET_LAVENDERS = ['#b8a0d0', '#a890c0', '#c8b0d8', '#9880b0', '#d0c0e0', '#c0a8d0'];
const MONET_YELLOWS = ['#e8d490', '#d8c478', '#f0e0a8', '#c8b468', '#e0cc88', '#f0dca0'];
const MONET_WHITES = ['#f0e8e0', '#e8e0d8', '#f8f0e8', '#e0d8d0', '#f0e8e4'];
const MONET_GREENS = ['#7aaa7a', '#6a9a6a', '#88b888', '#5a8a5a', '#98c098', '#78a078'];
const MONET_STEM_GREENS = ['#6a9a68', '#5a8a58', '#78a878', '#508050', '#88b088'];
const MONET_FLOWER_PALETTES = [MONET_PINKS, MONET_LAVENDERS, MONET_YELLOWS, MONET_WHITES];

// ── Earthy ground colors ──────────────────────────────────────
const GROUND_GREENS = ['#5a8a58', '#4a7a48', '#6a9a68', '#3d6d3b', '#78a878'];
const GROUND_BROWNS = ['#8a7a60', '#7a6a50', '#6a5a40', '#9a8a70', '#a09080'];

// ── Flower species definitions ──────────────────────────────
const FLOWER_SPECIES = [
  { name: 'rose', outerChar: '\u2740', innerChar: '\u273F', pistilChar: '*',
    palettes: [MONET_PINKS], headSize: [22, 28], petalLayers: 3 },
  { name: 'lavender', outerChar: '\u273F', innerChar: '\u273E', pistilChar: '\u2726',
    palettes: [MONET_LAVENDERS], headSize: [20, 26], petalLayers: 2 },
  { name: 'daisy', outerChar: '\u2743', innerChar: '\u2741', pistilChar: '*',
    palettes: [MONET_WHITES, MONET_YELLOWS], headSize: [20, 24], petalLayers: 2 },
  { name: 'sunflower', outerChar: '\u2740', innerChar: '\u2698', pistilChar: '*',
    palettes: [MONET_YELLOWS], headSize: [24, 28], petalLayers: 3 },
  { name: 'tulip', outerChar: '\u2741', innerChar: '\u273F', pistilChar: '\u2726',
    palettes: [MONET_PINKS, ['#cf4040', '#d06060', '#e08080', '#c03030', '#e8a0a0']],
    headSize: [18, 24], petalLayers: 2 },
  { name: 'bluebell', outerChar: '\u273E', innerChar: '\u2741', pistilChar: '\u00B7',
    palettes: [['#7090d0', '#6080c0', '#80a0e0', '#5070b0', '#90b0e8', '#a0c0f0']],
    headSize: [16, 22], petalLayers: 2 },
  { name: 'poppy', outerChar: '\u2740', innerChar: '\u273F', pistilChar: '*',
    palettes: [['#e04040', '#d03030', '#e86060', '#c02020', '#f08080']],
    headSize: [22, 26], petalLayers: 3 },
  { name: 'wisteria', outerChar: '\u273F', innerChar: '\u273E', pistilChar: '\u00B7',
    palettes: [['#c0a0e0', '#b090d0', '#d0b0f0', '#a080c0', '#e0c8f8']],
    headSize: [14, 20], petalLayers: 2 },
];

// ── Cat ASCII art ──────────────────────────────────────────
const CAT_FACES = ['=^.^=', '=^..^=', '=^-^=', '=^o.o^=', '=^~^='];
const CAT_CHARS = ['\u273F', '\u2665', '*', '~', '\u00B7', '\u2726', '\u2605'];
const CAT_COLORS = ['#e8b4b8', '#d4728c', '#c97088', '#d99a7c', '#f0c0cc', '#e0a0b0', '#c8a090'];
const CAT_FUR_COLORS = ['#8a7060', '#a08878', '#705848', '#c0a890', '#5a4a3a', '#b09880'];

// ── Dog ASCII art ──────────────────────────────────────────
const DOG_FACES = ['U^ェ^U', 'U・ω・U', 'U^.^U', 'Uo.oU'];
const DOG_TAIL_FRAMES = ['/', '|', '\\', '|'];
const DOG_CHARS = ['\u2665', '\u2605', '*', '\u2726', '\u273F', '\u00B7', '~'];
const DOG_COLORS = ['#c9a84c', '#d99a7c', '#cf6e5e', '#e8d0b4', '#d4a850', '#b08840', '#e0c080'];
const DOG_FUR_COLORS = ['#c0a070', '#a08050', '#8a6a40', '#d0b880', '#e0c898', '#706040'];

// ── Snowfall characters ──────────────────────────────────────
const SNOW_CHARS = ['*', '\u2726', '\u00B7', '+', '\u2605', '\u2727', '\u273F'];
const SNOW_COLORS = ['#e8e4e0', '#d0ccc8', '#f0ece8', '#c8c4c0', '#e0dcd8', '#f8f4f0', '#d8d4d0'];
const ICE_COLORS = ['#b4dae8', '#a0cce0', '#c8e4f0', '#90c0d8', '#d0e8f4'];

// ── Ocean characters ──────────────────────────────────────────
const WAVE_CHARS = ['~', '\u2248', '\u223C', '\u2307', '-', '_'];
const FISH_CHARS = ['><>', '<><', '><))\'>', '<\'((><'];
const BUBBLE_CHARS = ['o', 'O', '\u00B0', '\u00B7'];
const OCEAN_COLORS = ['#4080c0', '#3070b0', '#5090d0', '#2060a0', '#6da3b8', '#80b8d0'];
const OCEAN_FOAM = ['#e8e4e0', '#f0ece8', '#d8d4d0', '#f8f4f0'];
const OCEAN_DEEP = ['#2050a0', '#1840a0', '#3060b0', '#103080'];

// ── Firefly characters ──────────────────────────────────────
const FIREFLY_CHARS = ['*', '\u00B7', '\u2726', '\u2727', '+'];
const FIREFLY_GLOW = ['#c9a84c', '#d4a850', '#e8d490', '#f0e0a8', '#d8c478'];
const NIGHT_GREENS = ['#3a5a3a', '#2a4a2a', '#4a6a4a', '#1a3a1a', '#5a7a5a'];
const NIGHT_BLUES = ['#2a3a5a', '#1a2a4a', '#3a4a6a', '#0a1a3a'];


// ═══════════════════════════════════════════════════════════════════
//  1. CONFETTI BURST
// ═══════════════════════════════════════════════════════════════════
export const confettiPlugin = {
  name: 'confetti',
  category: 'action',
  style: 'cute',
  meta: { label: 'Confetti', description: 'Rainbow confetti characters explode outward with rotation, drift, and gravity', tags: ['burst', 'celebration', 'particles'] },
  params: {
    minParticles: { label: 'Min Particles', type: 'range', min: 5, max: 60, default: 15, step: 5, unit: '', group: 'particles' },
    maxParticles: { label: 'Max Particles', type: 'range', min: 40, max: 250, default: 120, step: 10, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 10, step: 1, unit: '', group: 'particles' },
    minDuration: { label: 'Min Duration', type: 'range', min: 500, max: 2500, default: 1500, step: 100, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 2000, max: 6000, default: 3500, step: 250, unit: 'ms', group: 'timing' },
    gravity: { label: 'Gravity', type: 'range', min: 50, max: 400, default: 180, step: 10, unit: 'px/s\u00B2', group: 'physics' },
    burstLift: { label: 'Burst Lift', type: 'range', min: 20, max: 250, default: 100, step: 10, unit: 'px/s', group: 'motion' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(confettiPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-confetti');
    const particles = [];
    const particleCount = FX.pCount(Math.floor(lerp(pm.minParticles, pm.maxParticles, intensity)));
    const effectDuration = lerp(pm.minDuration, pm.maxDuration, intensity);
    const dotRadius = lerp(120, 400, intensity);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = lerp(100, 200, intensity) + Math.random() * lerp(150, 400, intensity);
      particles.push({
        x: center.cx + randRange(-center.w * 0.3, center.w * 0.3),
        y: center.cy + randRange(-center.h * 0.3, center.h * 0.3),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - pm.burstLift,
        char: pick(CONFETTI_CHARS), color: pick(RAINBOW),
        size: (lerp(8, 14, intensity) + Math.random() * lerp(6, 16, intensity)) * pm.particleSize / 10,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10, drift: (Math.random() - 0.5) * 60,
        life: 0, maxLife: lerp(800, 1400, intensity) + Math.random() * 800, delay: Math.random() * 100
      });
    }

    const startTime = performance.now();
    FX.doDotgridRipple(center.cx, center.cy, { color: '#d4728c', radius: dotRadius, duration: effectDuration * 0.6 });
    FX.doImpactFlash(false);
    FX.doScreenShake(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 300) {
        const t = elapsed / 300;
        el.style.transform = 'scale(' + (1 + t * 0.08) + ')';
        el.style.boxShadow = '0 0 ' + (t * 30) + 'px rgba(212, 114, 140, ' + (t * 0.2) + ')';
      } else if (elapsed < 700) {
        const t2 = (elapsed - 300) / 400;
        el.style.transform = 'scale(' + (1.08 - t2 * t2 * 0.3) + ')';
        el.style.opacity = String(1 - t2 * t2);
        el.style.boxShadow = '';
      }

      const dt = 0.016;
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      particles.forEach(function (p) {
        if (elapsed < p.delay) return;
        p.life += 16;
        if (p.life >= p.maxLife) return;
        const lr = p.life / p.maxLife;
        p.vy += pm.gravity * dt;
        p.vx += p.drift * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;
        const a = 1 - Math.pow(lr, 1.5);
        FX.drawChar(fxCtx, p.char, p.x, p.y, p.color, p.size * (1 + (1 - lr) * 0.3), a, p.rotation);
      });

      if (elapsed >= effectDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        el.style.boxShadow = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  2. FLOWER GARDEN
// ═══════════════════════════════════════════════════════════════════
export const flowersPlugin = {
  name: 'flowers',
  category: 'action',
  style: 'cute',
  meta: { label: 'Flower Garden', description: 'Lush garden with 8 flower species, butterflies, bees, and impressionist palettes', tags: ['garden', 'nature', 'monet'] },
  params: {
    minDuration: { label: 'Min Duration', type: 'range', min: 1500, max: 5000, default: 3200, step: 200, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 4000, max: 10000, default: 6500, step: 500, unit: 'ms', group: 'timing' },
    minFlowers: { label: 'Min Flowers', type: 'range', min: 1, max: 10, default: 3, step: 1, unit: '', group: 'particles' },
    maxFlowers: { label: 'Max Flowers', type: 'range', min: 8, max: 40, default: 20, step: 2, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 10, step: 1, unit: '', group: 'particles' },
    maxStemHeight: { label: 'Max Stem Height', type: 'range', min: 50, max: 200, default: 110, step: 10, unit: 'px', group: 'visual' },
    swaySpeed: { label: 'Sway Speed', type: 'range', min: 0.2, max: 3.0, default: 1.0, step: 0.1, unit: '', group: 'motion' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(flowersPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-flowers');
    const startTime = performance.now();
    const totalDuration = lerp(pm.minDuration, pm.maxDuration, intensity);
    const isHighIntensity = intensity >= 0.8;
    const isMedIntensity = intensity >= 0.5;

    const flowerCount = Math.floor(lerp(pm.minFlowers, pm.maxFlowers, intensity));
    const flowers = [];
    const gardenWidth = center.w + lerp(20, 80, intensity);
    const gardenLeft = center.rect.left - lerp(10, 40, intensity);

    for (let i = 0; i < flowerCount; i++) {
      const species = FLOWER_SPECIES[i % FLOWER_SPECIES.length];
      const palette = pick(species.palettes);
      const baseX = gardenLeft + ((i + 0.5) / flowerCount) * gardenWidth;
      const stemHeight = lerp(35, pm.maxStemHeight, intensity) + Math.random() * lerp(15, 50, intensity);
      const headSizeBase = lerp(species.headSize[0], species.headSize[1], intensity);

      const flower = {
        species: species, baseX: baseX + randRange(-15, 15), baseY: center.rect.bottom,
        stemHeight: stemHeight, stemColor: pick(MONET_STEM_GREENS), petalColors: palette,
        growDelay: i * lerp(120, 30, intensity) + Math.random() * lerp(200, 60, intensity),
        curvature: (Math.random() - 0.5) * lerp(10, 25, intensity),
        swayPhase: Math.random() * Math.PI * 2, swaySpeed: pm.swaySpeed + Math.random() * 1.5,
        headSize: headSizeBase, leaves: [],
        hasThorns: species.name === 'rose' && intensity > 0.4,
        _topX: undefined, _topY: undefined, _bloomT: 0
      };

      const leafCount = Math.floor(lerp(1, 5, intensity)) + (Math.random() > 0.4 ? 1 : 0);
      for (let j = 0; j < leafCount; j++) {
        const side = (j % 2 === 0) ? -1 : 1;
        flower.leaves.push({
          heightRatio: 0.12 + (j / leafCount) * 0.55, side: side,
          char: pick(REAL_LEAF_CHARS),
          offset: lerp(6, 14, intensity) + Math.random() * 5,
          size: (lerp(6, 12, intensity) + Math.random() * 4) * pm.particleSize / 10,
          angle: side * (0.3 + Math.random() * 0.4),
          hasVein: isHighIntensity && Math.random() > 0.5
        });
      }
      flowers.push(flower);
    }

    const psz = pm.particleSize / 10;

    // Garden butterflies
    const gardenButterflies = [];
    if (isMedIntensity) {
      const bflyCount = Math.floor(lerp(0, 6, intensity));
      const bflyColors = ['#e8b4b8', '#b4dae8', '#d0b4e8', '#e8e4b4', '#b4e8c9', '#e8b4cb'];
      for (let bi = 0; bi < bflyCount; bi++) {
        gardenButterflies.push({
          x: gardenLeft + Math.random() * gardenWidth,
          y: center.rect.bottom - lerp(30, 80, intensity) - Math.random() * 40,
          vx: (Math.random() - 0.5) * 20, vy: -5 - Math.random() * 15,
          flapPhase: Math.random() * Math.PI * 2, flapSpeed: 6 + Math.random() * 4,
          color: pick(bflyColors), size: lerp(6, 12, intensity) * psz,
          delay: 1800 + Math.random() * 2000, curvePhase: Math.random() * Math.PI * 2
        });
      }
    }

    // Garden bees
    const gardenBees = [];
    if (isMedIntensity) {
      const beeCount = Math.floor(lerp(0, 4, intensity));
      for (let bei = 0; bei < beeCount; bei++) {
        gardenBees.push({
          x: gardenLeft + Math.random() * gardenWidth,
          y: center.rect.bottom - 50 - Math.random() * 40,
          targetFlower: Math.floor(Math.random() * flowerCount),
          orbitPhase: Math.random() * Math.PI * 2, orbitSpeed: 2 + Math.random() * 3,
          orbitRadius: 12 + Math.random() * 15, buzzPhase: Math.random() * Math.PI * 2,
          delay: 2200 + Math.random() * 2000, size: lerp(5, 9, intensity) * psz
        });
      }
    }

    // Pollen
    const pollenParticles = [];
    if (isHighIntensity) {
      const pollenCount = FX.pCount(Math.floor(lerp(0, 35, intensity)));
      for (let pi = 0; pi < pollenCount; pi++) {
        pollenParticles.push({
          x: gardenLeft + Math.random() * gardenWidth,
          y: center.rect.bottom - Math.random() * lerp(40, 120, intensity),
          vx: (Math.random() - 0.5) * 15, vy: -(5 + Math.random() * 15),
          size: (2 + Math.random() * 3) * psz,
          color: pick(MONET_YELLOWS.concat(['#f0e8e0', '#e8dcc0'])),
          phase: Math.random() * Math.PI * 2, life: 0, delay: 1200 + Math.random() * 2500
        });
      }
    }

    // Breeze / dandelion puffs
    const breezeParticles = [];
    if (isMedIntensity) {
      const breezeCount = FX.pCount(Math.floor(lerp(0, 10, intensity)));
      for (let bri = 0; bri < breezeCount; bri++) {
        breezeParticles.push({
          x: gardenLeft - 30 + Math.random() * 30,
          y: center.rect.bottom - 30 - Math.random() * 80,
          vx: 15 + Math.random() * 25, vy: -2 + (Math.random() - 0.5) * 8,
          char: pick(['*', '\u00B7', ',', '\'']), size: (3 + Math.random() * 3) * psz,
          phase: Math.random() * Math.PI * 2, delay: 800 + Math.random() * 3000,
          color: pick(['#e8dcc0', '#f0e8e0', '#d0c8b0'])
        });
      }
    }

    const dotRadius = lerp(120, 400, intensity);
    FX.doDotgridRipple(center.cx, center.rect.bottom, { color: '#6aab8e', radius: dotRadius, duration: totalDuration * 0.7 });
    FX.doImpactFlash(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 800) {
        const t = elapsed / 800;
        el.style.opacity = String(1 - t * 0.85);
        el.style.transform = 'scale(' + (1 - t * 0.02) + ')';
      } else {
        el.style.opacity = '0.15';
      }

      const breezeWind = Math.sin(elapsed * 0.0008) * 2;

      // Multi-layer ground / soil
      const groundY = center.rect.bottom + 2;
      const groundWidth2 = gardenWidth + 40;
      const groundLeft2 = gardenLeft - 20;
      const groundDensity = Math.floor(lerp(10, 40, intensity));
      const groundAlpha = Math.min(elapsed / 600, 1) * lerp(0.3, 0.8, intensity);

      for (let layer = 0; layer < Math.floor(lerp(1, 3, intensity)); layer++) {
        const layerY = groundY + layer * lerp(6, 10, intensity);
        const layerAlpha = groundAlpha * (1 - layer * 0.25);
        for (let g = 0; g < groundDensity; g++) {
          const gx = groundLeft2 + (g / groundDensity) * groundWidth2 + randRange(-3, 3);
          const soilChars = layer === 0 ? GROUND_CHARS : ['\u2591', '\u2592', '\u00B7', '~'];
          FX.drawChar(fxCtx, pick(soilChars), gx, layerY + randRange(-2, 4),
            layer === 0 ? (Math.random() > 0.4 ? pick(GROUND_GREENS) : pick(GROUND_BROWNS)) : pick(GROUND_BROWNS),
            lerp(7, 13, intensity), layerAlpha * (layer === 0 ? 1 : 0.6), 0);
        }
      }

      // Grass tufts and ground cover
      if (isMedIntensity) {
        const tufts = Math.floor(lerp(5, 25, intensity));
        for (let gi = 0; gi < tufts; gi++) {
          const gxi = groundLeft2 + (gi / tufts) * groundWidth2;
          const grassSway = Math.sin(elapsed * 0.002 + gi * 0.5) * 0.15;
          FX.drawChar(fxCtx, pick([',', '\'', '`', '"', ';', '|']), gxi + randRange(-4, 4),
            groundY - lerp(3, 8, intensity) + randRange(-2, 2),
            pick(MONET_GREENS), lerp(4, 8, intensity), groundAlpha * lerp(0.3, 0.7, intensity),
            grassSway + breezeWind * 0.05);
          if (isHighIntensity && Math.random() > 0.85) {
            FX.drawChar(fxCtx, pick(['\u273F', '\u00B7', '\u00B7']),
              gxi + randRange(-6, 6), groundY - lerp(6, 12, intensity),
              pick(MONET_PINKS.concat(MONET_YELLOWS)), 4, groundAlpha * 0.5 * lerp(0.3, 0.7, intensity), 0);
          }
        }
      }

      // Pebbles in soil
      if (isHighIntensity) {
        const pebbleCount = Math.floor(lerp(0, 8, intensity));
        for (let pb = 0; pb < pebbleCount; pb++) {
          FX.drawChar(fxCtx, pick(['o', '\u00B7', 'O']),
            groundLeft2 + (pb / pebbleCount) * groundWidth2 + randRange(-5, 5),
            groundY + randRange(2, 14),
            pick(['#9a8a70', '#8a7a60', '#a09080', '#706858']),
            lerp(3, 6, intensity), groundAlpha * 0.35, 0);
        }
      }

      // Flowers with sequential growth
      flowers.forEach(function (f) {
        if (elapsed < f.growDelay) return;
        const flowerElapsed = elapsed - f.growDelay;
        const stemPhase = 800 * lerp(1.2, 0.6, intensity);
        const stemT = Math.min(flowerElapsed / stemPhase, 1);
        const easeStem = 1 - Math.pow(1 - stemT, 3);
        const currentHeight = f.stemHeight * easeStem;
        const sway = (Math.sin(f.swayPhase + elapsed * 0.001 * f.swaySpeed) * 3 + breezeWind) * easeStem;
        const stemTopY = f.baseY - currentHeight;
        const stemTopX = f.baseX + f.curvature * easeStem + sway;
        const cpX = f.baseX + f.curvature * 0.6 + sway * 0.4;
        const cpY = f.baseY - currentHeight * 0.5;
        f._topX = stemTopX;
        f._topY = stemTopY;
        f._bloomT = stemT > 0.6 ? (stemT - 0.6) / 0.4 : 0;

        if (stemT > 0) {
          const stemSegments = Math.floor(lerp(5, 12, intensity));
          const stemAlpha = Math.min(stemT * 2.5, 1) * lerp(0.5, 0.85, intensity);
          for (let s = 0; s <= stemSegments; s++) {
            const st = s / stemSegments;
            if (st > easeStem) break;
            const sx = f.baseX * (1 - st) * (1 - st) + cpX * 2 * st * (1 - st) + stemTopX * st * st;
            const sy = f.baseY * (1 - st) * (1 - st) + cpY * 2 * st * (1 - st) + stemTopY * st * st;
            let stemChar = '\u2502';
            if (s > 0) {
              const prevT = (s - 1) / stemSegments;
              const prevX = f.baseX * (1 - prevT) * (1 - prevT) + cpX * 2 * prevT * (1 - prevT) + stemTopX * prevT * prevT;
              const dx = sx - prevX;
              if (dx > 1.5) stemChar = '\u2572';
              else if (dx < -1.5) stemChar = '\u2571';
            }
            FX.drawChar(fxCtx, stemChar, sx, sy, f.stemColor, lerp(10, 16, intensity), stemAlpha, 0);
            if (f.hasThorns && s > 1 && s < stemSegments - 1 && s % 2 === 0) {
              const thornSide = (s % 4 === 0) ? 1 : -1;
              FX.drawChar(fxCtx, thornSide > 0 ? '>' : '<', sx + thornSide * 5, sy,
                f.stemColor, 5, stemAlpha * 0.5, thornSide * 0.3);
            }
          }
          fxCtx.save();
          fxCtx.strokeStyle = f.stemColor;
          fxCtx.lineWidth = lerp(1, 2, intensity);
          fxCtx.globalAlpha = Math.min(stemT * 2.5, 1) * lerp(0.5, 0.85, intensity) * 0.4;
          fxCtx.beginPath();
          fxCtx.moveTo(f.baseX, f.baseY);
          fxCtx.quadraticCurveTo(cpX, cpY, stemTopX, stemTopY);
          fxCtx.stroke();
          fxCtx.restore();
        }

        // Leaves
        if (stemT > 0.3) {
          const leafBaseT = (stemT - 0.3) / 0.7;
          f.leaves.forEach(function (leaf, li) {
            const leafT = Math.max(0, Math.min((leafBaseT - li * 0.12) / 0.35, 1));
            if (leafT <= 0) return;
            const easeLeaf = 1 - Math.pow(1 - leafT, 2);
            const lt = leaf.heightRatio;
            const lx = f.baseX * (1 - lt) * (1 - lt) + cpX * 2 * lt * (1 - lt) + stemTopX * lt * lt;
            const ly = f.baseY * (1 - lt) * (1 - lt) + cpY * 2 * lt * (1 - lt) + stemTopY * lt * lt;
            const leafAlpha = easeLeaf * lerp(0.4, 0.75, intensity);
            const leafSize = leaf.size * easeLeaf;
            const leafSway = Math.sin(elapsed * 0.002 + leaf.heightRatio * 3) * 0.1 + breezeWind * 0.02;
            const lox = lx + leaf.side * leaf.offset * easeLeaf;
            const loy = ly - 2;
            FX.drawChar(fxCtx, leaf.char, lox, loy, pick(MONET_GREENS), leafSize, leafAlpha, leaf.angle + leafSway);
            if (leaf.hasVein) {
              FX.drawChar(fxCtx, '-', lox + leaf.side * 2, loy,
                pick(MONET_STEM_GREENS), leafSize * 0.3, leafAlpha * 0.3, leaf.angle + leafSway);
            }
            if (intensity > 0.4) {
              FX.drawChar(fxCtx, pick(['\u2663', '\u00B7']), lox + leaf.side * 3, loy + 2,
                pick(MONET_GREENS), leafSize * 0.6, leafAlpha * 0.5, leaf.angle * 0.5);
            }
            if (intensity > 0.7) {
              FX.drawChar(fxCtx, pick(['\u2663', '\u2767']), lox + leaf.side * 5, loy - 1,
                pick(MONET_GREENS), leafSize * 0.45, leafAlpha * 0.35, leaf.angle * 0.3 + 0.1);
            }
          });
        }

        // Flower bloom
        if (stemT > 0.6) {
          const bloomBaseT = (stemT - 0.6) / 0.4;
          const budT = Math.min(bloomBaseT / 0.3, 1);
          const openT = Math.max(0, Math.min((bloomBaseT - 0.3) / 0.4, 1));
          const fullT = Math.max(0, Math.min((bloomBaseT - 0.7) / 0.3, 1));
          const breathe = 1 + 0.05 * Math.sin(elapsed * 0.002 + f.swayPhase);
          const hSize = f.headSize * lerp(0.8, 1.0, intensity);

          if (budT > 0 && openT < 1) {
            const budAlpha = budT * (1 - openT) * 0.5;
            FX.drawChar(fxCtx, '*', stemTopX, stemTopY, pick(f.petalColors), hSize * 0.3 * budT, budAlpha, 0);
            if (budT > 0.5) {
              for (let si = 0; si < 3; si++) {
                const sa = (si / 3) * Math.PI * 2 + Math.PI / 2;
                FX.drawChar(fxCtx, pick(['\u2663', ',']), stemTopX + Math.cos(sa) * 4,
                  stemTopY + Math.sin(sa) * 4, pick(MONET_GREENS), 5, budAlpha * 0.6, sa * 0.5);
              }
            }
          }

          if (openT > 0) {
            const oe = 1 - Math.pow(1 - openT, 2);
            const outerSize = hSize * oe * breathe;
            const outerAlpha = openT * lerp(0.35, 0.65, intensity);
            const outerPetalCount = f.species.petalLayers + Math.floor(lerp(0, 2, intensity));
            for (let op = 0; op < outerPetalCount; op++) {
              const opAngle = (op / outerPetalCount) * Math.PI * 2 + elapsed * 0.0003;
              const spread = outerSize * 0.25 * oe;
              FX.drawChar(fxCtx, f.species.outerChar,
                stemTopX + Math.cos(opAngle) * spread, stemTopY + Math.sin(opAngle) * spread,
                f.petalColors[op % f.petalColors.length], outerSize, outerAlpha, opAngle * 0.3);
            }

            if (openT > 0.3) {
              const innerT = (openT - 0.3) / 0.7;
              const innerSize = hSize * 0.75 * innerT * breathe;
              const innerAlpha = innerT * lerp(0.4, 0.7, intensity);
              const innerPetalCount = 2 + f.species.petalLayers + Math.floor(lerp(0, 2, intensity));
              for (let ip = 0; ip < innerPetalCount; ip++) {
                const ipAngle = (ip / innerPetalCount) * Math.PI * 2 + Math.PI / 6;
                const ipSpread = innerSize * 0.15 * innerT;
                FX.drawChar(fxCtx, f.species.innerChar,
                  stemTopX + Math.cos(ipAngle) * ipSpread, stemTopY + Math.sin(ipAngle) * ipSpread,
                  f.petalColors[(ip + 2) % f.petalColors.length], innerSize * 0.85, innerAlpha, ipAngle * 0.2);
              }
            }

            if (openT > 0.5) {
              const hazeT = (openT - 0.5) / 0.5;
              const hazeCount = Math.floor(lerp(1, 3, intensity));
              for (let h = 0; h < hazeCount; h++) {
                FX.drawChar(fxCtx, f.species.outerChar, stemTopX + randRange(-2, 2), stemTopY + randRange(-2, 2),
                  f.petalColors[Math.floor(Math.random() * f.petalColors.length)],
                  hSize * lerp(0.4, 0.65, intensity) * hazeT * breathe,
                  hazeT * lerp(0.12, 0.22, intensity), randRange(-0.15, 0.15));
              }
            }

            if (fullT > 0) {
              FX.drawChar(fxCtx, f.species.pistilChar, stemTopX, stemTopY,
                pick(['#c9a84c', '#d8c478', '#e8d490', '#b0a040']),
                lerp(4, 9, intensity) * fullT, fullT * 0.8, 0);
              if (fullT > 0.5) {
                const sparkAlpha = (fullT - 0.5) * 0.4 * (Math.sin(elapsed * 0.004 + f.swayPhase) * 0.5 + 0.5);
                FX.drawChar(fxCtx, '\u00B7', stemTopX + randRange(-1, 1), stemTopY - 2, '#f0e8e0', 3, sparkAlpha, 0);
              }
              if (isHighIntensity && fullT > 0.8 && Math.random() > 0.92) {
                FX.drawChar(fxCtx, pick([',', '\'']),
                  stemTopX + randRange(-8, 8) + breezeWind * 3, stemTopY + randRange(5, 20),
                  pick(f.petalColors), 4, 0.3, randRange(-0.5, 0.5));
              }
            }

            if (openT > 0.4 && FX.shouldShadow()) {
              fxCtx.save();
              fxCtx.shadowColor = f.petalColors[0];
              fxCtx.shadowBlur = lerp(4, 14, intensity) * openT;
              FX.drawChar(fxCtx, f.species.outerChar, stemTopX, stemTopY,
                f.petalColors[0], hSize * 0.5 * openT * breathe, openT * 0.1, 0);
              fxCtx.restore();
            }
          }
        }
      });

      // Garden butterflies
      gardenButterflies.forEach(function (b) {
        if (elapsed < b.delay) return;
        const bLife = elapsed - b.delay;
        const lr = Math.min(bLife / (totalDuration - b.delay), 1);
        b.x += (b.vx + Math.sin(b.curvePhase + bLife * 0.001) * 25 * 0.3 + breezeWind * 0.5) * 0.016;
        b.y += (b.vy + Math.sin(bLife * 0.002) * 5) * 0.016;
        const flap = Math.sin(b.flapPhase + bLife * 0.01 * b.flapSpeed);
        const alpha = lr > 0.8 ? 1 - (lr - 0.8) / 0.2 : Math.min(bLife / 300, 1);
        if (flap > 0) {
          FX.drawChar(fxCtx, '\u2572', b.x - 4, b.y, b.color, b.size, alpha * 0.7, 0);
          FX.drawChar(fxCtx, '\u2571', b.x + 4, b.y, b.color, b.size, alpha * 0.7, 0);
        } else {
          FX.drawChar(fxCtx, '\u2571', b.x - 3, b.y, b.color, b.size * 0.7, alpha * 0.7, 0);
          FX.drawChar(fxCtx, '\u2572', b.x + 3, b.y, b.color, b.size * 0.7, alpha * 0.7, 0);
        }
        FX.drawChar(fxCtx, '\u00B7', b.x, b.y, b.color, 4, alpha * 0.5, 0);
      });

      // Garden bees
      gardenBees.forEach(function (bee) {
        if (elapsed < bee.delay) return;
        const bLife = elapsed - bee.delay;
        const lr = Math.min(bLife / (totalDuration - bee.delay), 1);
        const alpha = lr > 0.8 ? 1 - (lr - 0.8) / 0.2 : Math.min(bLife / 300, 1);
        const tf = flowers[bee.targetFlower];
        let tx, ty;
        if (tf && tf._topX !== undefined && tf._bloomT > 0.5) {
          tx = tf._topX + Math.cos(bee.orbitPhase + bLife * 0.003 * bee.orbitSpeed) * bee.orbitRadius;
          ty = tf._topY + Math.sin(bee.orbitPhase + bLife * 0.003 * bee.orbitSpeed) * bee.orbitRadius * 0.6;
        } else {
          tx = bee.x + Math.sin(bLife * 0.002) * 20;
          ty = bee.y + Math.cos(bLife * 0.003) * 10;
        }
        const buzzX = Math.sin(bee.buzzPhase + bLife * 0.05) * 1.5;
        const buzzY = Math.cos(bee.buzzPhase + bLife * 0.07) * 1;
        FX.drawChar(fxCtx, '=', tx + buzzX - 3, ty + buzzY, '#c9a84c', bee.size * 0.8, alpha * 0.6, 0);
        FX.drawChar(fxCtx, '*', tx + buzzX, ty + buzzY, '#3d3530', bee.size * 0.6, alpha * 0.7, 0);
        FX.drawChar(fxCtx, '=', tx + buzzX + 3, ty + buzzY, '#c9a84c', bee.size * 0.8, alpha * 0.6, 0);
        if (Math.sin(bLife * 0.03) > 0) {
          FX.drawChar(fxCtx, '\u00B7', tx + buzzX, ty + buzzY - 4, '#e8e4e0', 4, alpha * 0.4, 0);
        }
      });

      // Pollen
      if (isHighIntensity) {
        const pdt = 0.016;
        pollenParticles.forEach(function (p) {
          if (elapsed < p.delay) return;
          p.life = elapsed - p.delay;
          const lr = Math.min(p.life / (totalDuration - p.delay), 1);
          p.x += (p.vx + Math.sin(p.phase + p.life * 0.002) * 8 + breezeWind) * pdt;
          p.y += p.vy * pdt;
          const alpha = lr > 0.7 ? (1 - (lr - 0.7) / 0.3) : Math.min(p.life / 400, 1);
          FX.drawChar(fxCtx, '\u00B7', p.x, p.y, p.color, p.size, alpha * 0.6, 0);
        });
      }

      // Breeze / dandelion puffs
      breezeParticles.forEach(function (bp) {
        if (elapsed < bp.delay) return;
        const bpLife = elapsed - bp.delay;
        const lr = Math.min(bpLife / (totalDuration - bp.delay), 1);
        bp.x += bp.vx * 0.016;
        bp.y += (bp.vy + Math.sin(bp.phase + bpLife * 0.001) * 4) * 0.016;
        const alpha = lr > 0.7 ? (1 - (lr - 0.7) / 0.3) * 0.4 : Math.min(bpLife / 500, 0.4);
        FX.drawChar(fxCtx, bp.char, bp.x, bp.y, bp.color, bp.size, alpha, bpLife * 0.001);
      });

      // Dappled light specks
      if (elapsed > 600 && elapsed < totalDuration - 600) {
        const speckCount = Math.floor(lerp(2, 8, intensity));
        for (let si2 = 0; si2 < speckCount; si2++) {
          const sparkle = Math.sin(elapsed * 0.003 + si2 * 2.1) * 0.5 + 0.5;
          if (sparkle > 0.55) {
            FX.drawChar(fxCtx, '\u00B7',
              center.cx + randRange(-gardenWidth * 0.55, gardenWidth * 0.55),
              center.rect.bottom - randRange(10, 90),
              pick(MONET_YELLOWS), lerp(2, 4, intensity), sparkle * lerp(0.15, 0.4, intensity), 0);
          }
        }
      }

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  3. SPARKLE SHOWER
// ═══════════════════════════════════════════════════════════════════
export const sparklePlugin = {
  name: 'sparkle',
  category: 'action',
  style: 'cute',
  meta: { label: 'Sparkle Shower', description: 'Twinkling sparkle characters rise upward with blinking and glow', tags: ['sparkle', 'twinkle', 'gold'] },
  params: {
    // sparkle has no user params currently — placeholder for sandbox visibility
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-sparkle');
    const startTime = performance.now();
    const totalDuration = lerp(1800, 3800, intensity);
    const particles = [];
    const particleCount = FX.pCount(Math.floor(lerp(20, 150, intensity)));
    const dotRadius = lerp(150, 400, intensity);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: center.rect.left + Math.random() * center.w,
        y: center.rect.top + Math.random() * center.h,
        vx: (Math.random() - 0.5) * 80, vy: -(60 + Math.random() * 200),
        char: pick(SPARKLE_CHARS),
        color: pick(['#c9a84c', '#d4a850', '#e0d0a0', '#e8dcc0', '#d8c890']),
        size: lerp(6, 10, intensity) + Math.random() * lerp(6, 16, intensity), life: 0,
        maxLife: lerp(600, 1200, intensity) + Math.random() * 1200, delay: Math.random() * 400,
        blinkPhase: Math.random() * Math.PI * 2, blinkSpeed: 4 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 30
      });
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#c9a84c', radius: dotRadius, duration: totalDuration * 0.7 });
    FX.doImpactFlash(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 600) {
        const t = elapsed / 600;
        el.style.opacity = String(1 - t);
        el.style.transform = 'scale(' + (1 + t * 0.02) + ')';
      } else {
        el.style.opacity = '0';
      }

      const dt = 0.016;
      particles.forEach(function (p) {
        if (elapsed < p.delay) return;
        p.life += 16;
        if (p.life >= p.maxLife) return;
        const lr = p.life / p.maxLife;
        p.vy *= 0.995;
        p.x += (p.vx + p.drift) * dt;
        p.y += p.vy * dt;
        p.vx *= 0.99;
        const blink = Math.sin(p.blinkPhase + p.life * 0.01 * p.blinkSpeed);
        const twinkle = blink > 0 ? 1 : 0.2;
        const alpha = (1 - Math.pow(lr, 2)) * twinkle;
        if (alpha > 0.01) {
          const ch = blink > 0.5 ? p.char : (blink > 0 ? '\u00B7' : '');
          if (ch) {
            FX.drawChar(fxCtx, ch, p.x, p.y, p.color, p.size * (1 - lr * 0.3), alpha, 0);
            if (FX.shouldShadow() && blink > 0.7) {
              fxCtx.save();
              fxCtx.shadowColor = p.color;
              fxCtx.shadowBlur = 12;
              FX.drawChar(fxCtx, ch, p.x, p.y, p.color, p.size * (1 - lr * 0.3), alpha * 0.5, 0);
              fxCtx.restore();
            }
          }
        }
      });

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  4. SHOOTING STAR
// ═══════════════════════════════════════════════════════════════════
export const shootingstarPlugin = {
  name: 'shootingstar',
  category: 'action',
  style: 'cute',
  meta: { label: 'Shooting Star', description: 'Card launches across the screen as a shooting star with sparkle trail', tags: ['star', 'flight', 'trail'] },
  params: {
    minDuration: { label: 'Min Duration', type: 'range', min: 800, max: 2500, default: 1600, step: 100, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 2000, max: 5000, default: 3000, step: 250, unit: 'ms', group: 'timing' },
    flightDistanceX: { label: 'Flight Distance X', type: 'range', min: 100, max: 800, default: 400, step: 25, unit: 'px', group: 'motion' },
    flightDistanceY: { label: 'Flight Distance Y', type: 'range', min: 200, max: 1000, default: 600, step: 25, unit: 'px', group: 'motion' },
    rotationDeg: { label: 'Rotation', type: 'range', min: 0, max: 45, default: 15, step: 5, unit: 'deg', group: 'motion' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(shootingstarPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-shootingstar');
    const startTime = performance.now();
    const totalDuration = lerp(pm.minDuration, pm.maxDuration, intensity);
    const trailParticles = [];
    const dotRadius = lerp(180, 450, intensity);

    FX.doDotgridRipple(center.cx, center.cy, { color: '#c9a84c', radius: dotRadius, duration: totalDuration * 0.8 });

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 400) {
        const t = elapsed / 400;
        el.style.transform = 'scale(' + (1 + t * 0.05) + ') translateY(' + (t * 3) + 'px)';
        el.style.boxShadow = '0 0 ' + (t * 20) + 'px rgba(201, 168, 76, ' + (t * 0.3) + ')';
        if (Math.random() > 0.5) {
          trailParticles.push({
            x: center.cx + randRange(-center.w * 0.4, center.w * 0.4),
            y: center.cy + randRange(-center.h * 0.3, center.h * 0.3),
            vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
            char: pick(SPARKLE_CHARS), color: pick(['#c9a84c', '#d4a850', '#f0e8e0']),
            size: lerp(4, 8, intensity) + Math.random() * 8, life: 0, maxLife: 300, alpha: 0.8
          });
        }
      } else {
        const lt = Math.min((elapsed - 400) / 800, 1);
        const ease = lt * lt * lt;
        el.style.transform = 'translate(' + (ease * pm.flightDistanceX) + 'px, ' + (-ease * pm.flightDistanceY) + 'px) scale(' + Math.max(1.05 - ease * 1.1, 0) + ') rotate(' + (ease * pm.rotationDeg) + 'deg)';
        el.style.opacity = String(Math.max(1 - ease * 1.5, 0));
        el.style.boxShadow = '';
        if (lt < 0.3) FX.doScreenShake(false);
        if (lt < 0.8) {
          const cx = center.cx + ease * pm.flightDistanceX;
          const cy = center.cy - ease * pm.flightDistanceY;
          const trailCount = FX.pCount(Math.floor(lerp(1, 5, intensity)));
          for (let ti = 0; ti < trailCount; ti++) {
            trailParticles.push({
              x: cx + randRange(-10, 10), y: cy + randRange(-5, 15),
              vx: randRange(-80, -20), vy: randRange(20, 80),
              char: pick(STAR_CHARS), color: pick(['#c9a84c', '#d4a850', '#e8dcc0', '#d4728c', '#9b85c4']),
              size: lerp(6, 10, intensity) + Math.random() * 12, life: 0,
              maxLife: lerp(400, 800, intensity) + Math.random() * 400, alpha: 0.9
            });
          }
        }
      }

      const dt = 0.016;
      for (let i = 0; i < trailParticles.length; i++) {
        const p = trailParticles[i];
        p.life += 16;
        if (p.life >= p.maxLife) continue;
        const lr = p.life / p.maxLife;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        FX.drawChar(fxCtx, p.char, p.x, p.y, p.color, p.size * (1 - lr * 0.5), p.alpha * (1 - Math.pow(lr, 1.5)), 0);
      }

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        el.style.boxShadow = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  5. BUTTERFLY RELEASE
// ═══════════════════════════════════════════════════════════════════
export const butterfliesPlugin = {
  name: 'butterflies',
  category: 'action',
  style: 'cute',
  meta: { label: 'Butterfly Release', description: 'Butterflies emerge from the card and flutter upward with wing flapping', tags: ['butterfly', 'nature', 'flutter'] },
  params: {
    minDuration: { label: 'Min Duration', type: 'range', min: 1000, max: 3500, default: 2200, step: 200, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 3000, max: 7000, default: 4500, step: 250, unit: 'ms', group: 'timing' },
    minCount: { label: 'Min Butterflies', type: 'range', min: 1, max: 8, default: 3, step: 1, unit: '', group: 'particles' },
    maxCount: { label: 'Max Butterflies', type: 'range', min: 6, max: 30, default: 14, step: 2, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 12, step: 1, unit: '', group: 'particles' },
    flySpeed: { label: 'Fly Speed', type: 'range', min: 15, max: 100, default: 40, step: 5, unit: 'px/s', group: 'motion' },
    flapSpeed: { label: 'Flap Speed', type: 'range', min: 2, max: 15, default: 6, step: 1, unit: '', group: 'motion' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(butterfliesPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-butterflies');
    const startTime = performance.now();
    const totalDuration = lerp(pm.minDuration, pm.maxDuration, intensity);
    const butterflies = [];
    const bColors = ['#e8b4b8', '#b4dae8', '#d0b4e8', '#e8e4b4', '#b4e8c9', '#e8b4cb', '#c8b6e0', '#a8d0e0'];
    const bCount = FX.pCount(Math.floor(lerp(pm.minCount, pm.maxCount, intensity)));
    const dotRadius = lerp(120, 300, intensity);

    for (let i = 0; i < bCount; i++) {
      const bAngle = (Math.random() - 0.5) * Math.PI * 0.8 - Math.PI / 2;
      butterflies.push({
        x: center.cx + randRange(-center.w * 0.3, center.w * 0.3),
        y: center.cy + randRange(-center.h * 0.2, center.h * 0.2),
        targetAngle: bAngle, speed: pm.flySpeed + Math.random() * 60,
        flapPhase: Math.random() * Math.PI * 2, flapSpeed: pm.flapSpeed + Math.random() * 4,
        color: bColors[i % bColors.length], size: (lerp(10, 16, intensity) + Math.random() * 6) * pm.particleSize / 12,
        delay: 200 + i * lerp(160, 80, intensity), curveAmp: 30 + Math.random() * 50,
        curveFreq: 0.8 + Math.random() * 1.2, curvePhase: Math.random() * Math.PI * 2, life: 0
      });
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#d0b4e8', radius: dotRadius, duration: totalDuration * 0.7 });
    FX.doImpactFlash(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 600) {
        const t = elapsed / 600;
        el.style.opacity = String(1 - t);
        el.style.transform = 'scale(' + (1 - t * 0.05) + ')';
      }

      butterflies.forEach(function (b) {
        if (elapsed < b.delay) return;
        b.life = elapsed - b.delay;
        const lr = Math.min(b.life / (totalDuration - b.delay), 1);
        const curve = Math.sin(b.curvePhase + b.life * 0.001 * b.curveFreq) * b.curveAmp;
        b.x += (Math.cos(b.targetAngle) * b.speed + curve * 0.3) * 0.016;
        b.y += (Math.sin(b.targetAngle) * b.speed) * 0.016;
        const flap = Math.sin(b.flapPhase + b.life * 0.01 * b.flapSpeed);
        const alpha = lr > 0.7 ? 1 - (lr - 0.7) / 0.3 : Math.min(b.life / 200, 1);
        if (flap > 0) {
          FX.drawChar(fxCtx, '\u2572', b.x - 5, b.y, b.color, b.size, alpha, 0);
          FX.drawChar(fxCtx, '\u2571', b.x + 5, b.y, b.color, b.size, alpha, 0);
        } else {
          FX.drawChar(fxCtx, '\u2571', b.x - 4, b.y, b.color, b.size * 0.8, alpha, 0);
          FX.drawChar(fxCtx, '\u2572', b.x + 4, b.y, b.color, b.size * 0.8, alpha, 0);
        }
        FX.drawChar(fxCtx, '\u00B7', b.x, b.y, b.color, 6, alpha, 0);
        if (b.life > 100 && Math.random() > 0.7) {
          FX.drawChar(fxCtx, '\u00B7', b.x + randRange(-3, 3), b.y + randRange(5, 15), b.color, 4, alpha * 0.3, 0);
        }
      });

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  6. RAINBOW BRIDGE
// ═══════════════════════════════════════════════════════════════════
export const rainbowPlugin = {
  name: 'rainbow',
  category: 'action',
  style: 'cute',
  meta: { label: 'Rainbow Bridge', description: 'Card rides across a ROYGBIV rainbow arc with sparkle trail', tags: ['rainbow', 'arc', 'colorful'] },
  params: {
    // rainbow has no user params currently — placeholder for sandbox visibility
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-rainbow');
    const startTime = performance.now();
    const totalDuration = lerp(2000, 4000, intensity);
    const acx = center.cx, acy = center.cy + 100, ar = lerp(200, 400, intensity);
    const blockChars = ['\u2593', '\u2592', '\u2591'];

    FX.doDotgridRipple(center.cx, center.cy, { color: '#c9a84c', radius: ar, duration: totalDuration * 0.8 });

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      const bT = Math.min(elapsed / 1500, 1);
      const bE = 1 - Math.pow(1 - bT, 2);
      const drawnAngle = Math.PI + (0 - Math.PI) * bE;

      const bandCount = Math.floor(lerp(4, 7, intensity));
      for (let band = 0; band < bandCount; band++) {
        const r = ar - band * lerp(8, 14, intensity);
        const steps = Math.floor(lerp(40, 100, intensity) * bE);
        for (let s = 0; s <= steps; s++) {
          const sAngle = Math.PI + (drawnAngle - Math.PI) * (s / steps);
          if (sAngle < Math.min(Math.PI, drawnAngle) || sAngle > Math.max(Math.PI, drawnAngle)) continue;
          FX.drawChar(fxCtx, blockChars[band % 3], acx + Math.cos(sAngle) * r, acy + Math.sin(sAngle) * r,
            ROYGBIV[band % ROYGBIV.length], lerp(10, 16, intensity),
            lerp(0.4, 0.7, intensity) * Math.min(s / 80 * 5, 1, (1 - s / 80) * 5), 0);
        }
      }

      if (elapsed > 800) {
        const sT = Math.min((elapsed - 800) / 1700, 1);
        const sE = sT * sT;
        const ca = Math.PI + (0 - Math.PI) * sE;
        const cx2 = acx + Math.cos(ca) * ar - center.cx;
        const cy2 = acy + Math.sin(ca) * ar - center.cy;
        el.style.transform = 'translate(' + cx2 + 'px, ' + cy2 + 'px) scale(' + Math.max(1 - sT * 0.8, 0.1) + ') rotate(' + (sE * 360) + 'deg)';
        el.style.opacity = String(Math.max(1 - sT * 1.3, 0));
        if (sT < 0.9 && Math.random() > 0.5) {
          FX.drawChar(fxCtx, pick(SPARKLE_CHARS), center.cx + cx2 + randRange(-10, 10), center.cy + cy2 + randRange(-10, 10),
            pick(ROYGBIV), 8 + Math.random() * 6, 0.5, Math.random() * Math.PI);
        }
      } else {
        const pt = elapsed / 800;
        el.style.transform = 'scale(' + (1 + Math.sin(pt * Math.PI * 3) * 0.02) + ')';
        el.style.boxShadow = '0 0 ' + (pt * 15) + 'px rgba(201, 168, 76, ' + (pt * 0.15) + ')';
      }

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        el.style.boxShadow = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  7. FIREWORKS
// ═══════════════════════════════════════════════════════════════════
export const fireworksPlugin = {
  name: 'fireworks',
  category: 'action',
  style: 'cute',
  meta: { label: 'Fireworks', description: 'Card launches upward then bursts into multi-pattern firework explosions', tags: ['fireworks', 'burst', 'celebration'] },
  params: {
    minDuration: { label: 'Min Duration', type: 'range', min: 1500, max: 4000, default: 2500, step: 250, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 3000, max: 7000, default: 4500, step: 250, unit: 'ms', group: 'timing' },
    maxBursts: { label: 'Max Bursts', type: 'range', min: 1, max: 10, default: 5, step: 1, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 10, step: 1, unit: '', group: 'particles' },
    launchDelay: { label: 'Launch Delay', type: 'range', min: 200, max: 1500, default: 800, step: 50, unit: 'ms', group: 'timing' },
    gravity: { label: 'Gravity', type: 'range', min: 20, max: 150, default: 60, step: 10, unit: 'px/s\u00B2', group: 'physics' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(fireworksPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-fireworks');
    const startTime = performance.now();
    const totalDuration = lerp(pm.minDuration, pm.maxDuration, intensity);
    const burstCount = Math.floor(lerp(1, pm.maxBursts, intensity));
    const bursts = [];
    for (let i = 0; i < burstCount; i++) {
      bursts.push({
        x: center.cx + randRange(-150, 150),
        y: randRange(50, window.innerHeight * 0.3),
        delay: pm.launchDelay + i * lerp(400, 200, intensity),
        pattern: ['circle', 'star', 'willow'][i % 3],
        color: pick(RAINBOW),
        triggered: false,
        particles: null
      });
    }

    function createBurst(bx, by, pattern, color) {
      const ps = [];
      const count = FX.pCount(Math.floor(lerp(15, 50, intensity)));
      for (let i = 0; i < count; i++) {
        const bAngle = (i / count) * Math.PI * 2;
        let speed;
        if (pattern === 'circle') speed = lerp(60, 140, intensity) + Math.random() * 60;
        else if (pattern === 'star') speed = (i % 3 === 0) ? lerp(80, 160, intensity) + Math.random() * 40 : lerp(40, 80, intensity) + Math.random() * 40;
        else speed = lerp(30, 70, intensity) + Math.random() * 100;
        ps.push({
          x: bx, y: by, vx: Math.cos(bAngle) * speed, vy: Math.sin(bAngle) * speed - 30,
          char: pick(FIREWORK_CHARS), color: color, size: (lerp(8, 12, intensity) + Math.random() * 8) * pm.particleSize / 10, life: 0,
          maxLife: pattern === 'willow' ? lerp(1000, 1800, intensity) : lerp(700, 1200, intensity) + Math.random() * 500,
          gravity: pattern === 'willow' ? pm.gravity * 2 : pm.gravity, drag: pattern === 'willow' ? 0.96 : 0.98
        });
      }
      return ps;
    }

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 800) {
        const t = elapsed / 800;
        const e = t * t;
        el.style.transform = 'translateY(' + (-e * (center.cy - 80)) + 'px) scale(' + Math.max(1 - e * 0.7, 0.2) + ')';
        el.style.opacity = String(Math.max(1 - e * 1.2, 0));
        const ry = center.cy - e * (center.cy - 80);
        for (let ti = 0; ti < FX.pCount(3); ti++) {
          FX.drawChar(fxCtx, pick(['*', '+', '\u00B7', '^']), center.cx + randRange(-8, 8), ry + 20 + randRange(0, 30),
            pick(['#c9a84c', '#d4728c', '#d4a850']), 8 + Math.random() * 10, 0.5 + Math.random() * 0.3, Math.random() * Math.PI);
        }
      } else {
        el.style.opacity = '0';
      }

      bursts.forEach(function (bp) {
        if (elapsed > bp.delay && !bp.triggered) {
          bp.triggered = true;
          bp.particles = createBurst(bp.x, bp.y, bp.pattern, bp.color);
          FX.doImpactFlash(false);
          FX.doScreenShake(false);
          FX.doDotgridRipple(bp.x, bp.y, { color: bp.color, radius: lerp(120, 250, intensity), duration: 1000 });
        }
        if (bp.particles) {
          const dt = 0.016;
          for (let pi = 0; pi < bp.particles.length; pi++) {
            const p = bp.particles[pi];
            p.life += 16;
            if (p.life >= p.maxLife) continue;
            const lr = p.life / p.maxLife;
            p.vy += p.gravity * dt;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const a = 1 - Math.pow(lr, 1.5);
            FX.drawChar(fxCtx, p.char, p.x, p.y, p.color, p.size * (1 - lr * 0.4), a, 0);
            if (FX.shouldShadow() && a > 0.3) {
              fxCtx.save();
              fxCtx.shadowColor = p.color;
              fxCtx.shadowBlur = 6;
              FX.drawChar(fxCtx, p.char, p.x, p.y, p.color, p.size * (1 - lr * 0.4), a * 0.3, 0);
              fxCtx.restore();
            }
          }
        }
      });

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  8. HEART EXPLOSION
// ═══════════════════════════════════════════════════════════════════
export const heartsPlugin = {
  name: 'hearts',
  category: 'action',
  style: 'cute',
  meta: { label: 'Heart Explosion', description: 'Hearts burst outward with pulsing, splitting, and glow effects', tags: ['hearts', 'love', 'burst'] },
  params: {
    minDuration: { label: 'Min Duration', type: 'range', min: 1000, max: 3500, default: 2000, step: 200, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 2500, max: 6000, default: 4000, step: 250, unit: 'ms', group: 'timing' },
    minHearts: { label: 'Min Hearts', type: 'range', min: 3, max: 30, default: 10, step: 1, unit: '', group: 'particles' },
    maxHearts: { label: 'Max Hearts', type: 'range', min: 20, max: 150, default: 70, step: 5, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 12, step: 1, unit: '', group: 'particles' },
    gravity: { label: 'Gravity', type: 'range', min: 30, max: 250, default: 100, step: 10, unit: 'px/s\u00B2', group: 'physics' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(heartsPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-hearts');
    const startTime = performance.now();
    const totalDuration = lerp(pm.minDuration, pm.maxDuration, intensity);
    const hearts = [];
    const hColors = ['#d4728c', '#c97088', '#cf6e5e', '#d99a7c', '#c44068', '#d07080', '#e0a0b0', '#b06070'];
    const heartCount = FX.pCount(Math.floor(lerp(pm.minHearts, pm.maxHearts, intensity)));
    const dotRadius = lerp(150, 350, intensity);

    for (let i = 0; i < heartCount; i++) {
      const hAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const speed = lerp(80, 150, intensity) + Math.random() * lerp(100, 280, intensity);
      hearts.push({
        x: center.cx + randRange(-20, 20), y: center.cy,
        vx: Math.cos(hAngle) * speed, vy: Math.sin(hAngle) * speed,
        char: pick(HEART_CHARS), color: pick(hColors),
        size: (lerp(10, 14, intensity) + Math.random() * lerp(8, 18, intensity)) * pm.particleSize / 12, life: 0,
        maxLife: lerp(800, 1400, intensity) + Math.random() * 800,
        delay: Math.random() * 200, rotation: (Math.random() - 0.5) * 0.5,
        rotSpeed: (Math.random() - 0.5) * 3,
        canSplit: Math.random() > 0.6 && i < 15, hasSplit: false,
        splitTime: 400 + Math.random() * 300
      });
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#d4728c', radius: dotRadius, duration: totalDuration * 0.7 });
    FX.doImpactFlash(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 200) {
        const t = elapsed / 200;
        el.style.borderColor = 'rgba(212, 114, 140, ' + (t * 0.4) + ')';
        el.style.boxShadow = '0 0 ' + (t * 20) + 'px rgba(212, 114, 140, ' + (t * 0.2) + ')';
      } else if (elapsed < 600) {
        const t2 = (elapsed - 200) / 400;
        el.style.transform = 'scale(' + (1.05 - t2 * 0.25) + ')';
        el.style.opacity = String(1 - t2);
        el.style.boxShadow = '';
      } else {
        el.style.opacity = '0';
      }

      const dt = 0.016;
      const newH = [];
      hearts.forEach(function (h) {
        if (elapsed < h.delay) return;
        h.life += 16;
        if (h.life >= h.maxLife) return;
        const lr = h.life / h.maxLife;
        h.vy += pm.gravity * dt;
        h.vx *= 0.99;
        h.vy *= 0.99;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.rotation += h.rotSpeed * dt;
        if (h.canSplit && !h.hasSplit && h.life > h.splitTime) {
          h.hasSplit = true;
          for (let j = 0; j < 3; j++) {
            const a = (Math.random() - 0.5) * Math.PI;
            newH.push({
              x: h.x, y: h.y, vx: Math.cos(a) * 60 + h.vx * 0.3,
              vy: Math.sin(a) * 60 + h.vy * 0.3 - 30, char: pick(['\u2661', '\u2665']),
              color: pick(hColors), size: h.size * 0.5, life: 0, maxLife: 600 + Math.random() * 400,
              delay: 0, rotation: Math.random(), rotSpeed: (Math.random() - 0.5) * 5,
              canSplit: false, hasSplit: false, splitTime: 9999
            });
          }
          h.size *= 0.6;
        }
        const alpha = 1 - Math.pow(lr, 1.8);
        const pulse = 1 + 0.1 * Math.sin(h.life * 0.015);
        FX.drawChar(fxCtx, h.char, h.x, h.y, h.color, h.size * pulse, alpha, h.rotation);
        if (FX.shouldShadow() && alpha > 0.3) {
          fxCtx.save();
          fxCtx.shadowColor = h.color;
          fxCtx.shadowBlur = 8;
          FX.drawChar(fxCtx, h.char, h.x, h.y, h.color, h.size * pulse, alpha * 0.3, h.rotation);
          fxCtx.restore();
        }
      });
      for (let ni = 0; ni < newH.length; ni++) {
        hearts.push(newH[ni]);
      }

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        el.style.borderColor = '';
        el.style.boxShadow = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  9. CAT — Cute ASCII cats with purring, pawing, and charm
// ═══════════════════════════════════════════════════════════════════
export const catPlugin = {
  name: 'cat',
  category: 'action',
  style: 'cute',
  meta: { label: 'Cat', description: 'Cute ASCII cats with purring, paw prints, and floating charm particles', tags: ['cat', 'animal', 'cute'] },
  params: {
    minDuration: { label: 'Min Duration', type: 'range', min: 1500, max: 4000, default: 2500, step: 250, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 3500, max: 8000, default: 5000, step: 250, unit: 'ms', group: 'timing' },
    minCatSize: { label: 'Min Cat Size', type: 'range', min: 6, max: 18, default: 12, step: 1, unit: 'px', group: 'visual' },
    maxCatSize: { label: 'Max Cat Size', type: 'range', min: 14, max: 30, default: 18, step: 1, unit: 'px', group: 'visual' },
    particleGravity: { label: 'Particle Gravity', type: 'range', min: 20, max: 150, default: 60, step: 10, unit: 'px/s\u00B2', group: 'physics' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 10, step: 1, unit: '', group: 'particles' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(catPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-cat');
    const startTime = performance.now();
    const totalDuration = lerp(pm.minDuration, pm.maxDuration, intensity);

    const catColor = pick(CAT_FUR_COLORS);
    const catSize = lerp(pm.minCatSize, pm.maxCatSize, intensity);

    // Floating cat face particles
    const catParticles = [];
    const particleCount = FX.pCount(Math.floor(lerp(8, 50, intensity)));
    for (let i = 0; i < particleCount; i++) {
      const cAngle = Math.random() * Math.PI * 2;
      const cSpeed = lerp(40, 100, intensity) + Math.random() * lerp(60, 150, intensity);
      catParticles.push({
        x: center.cx + randRange(-center.w * 0.3, center.w * 0.3),
        y: center.cy + randRange(-center.h * 0.2, center.h * 0.2),
        vx: Math.cos(cAngle) * cSpeed, vy: Math.sin(cAngle) * cSpeed - 40,
        char: pick(CAT_CHARS), color: pick(CAT_COLORS),
        size: (lerp(6, 10, intensity) + Math.random() * lerp(6, 14, intensity)) * pm.particleSize / 10,
        rotation: (Math.random() - 0.5) * 0.5, rotSpeed: (Math.random() - 0.5) * 3,
        life: 0, maxLife: lerp(800, 1600, intensity) + Math.random() * 800,
        delay: Math.random() * 200
      });
    }

    // Paw print trail
    const pawPrints = [];
    const pawCount = FX.pCount(Math.floor(lerp(3, 10, intensity)));
    for (let pi = 0; pi < pawCount; pi++) {
      const px = center.cx + randRange(-center.w * 0.5, center.w * 0.5);
      const py = center.cy + randRange(-center.h * 0.3, center.h * 0.5);
      pawPrints.push({
        x: px, y: py, delay: 400 + pi * lerp(200, 80, intensity),
        size: lerp(6, 12, intensity) * pm.particleSize / 10, alpha: 0
      });
    }

    // Purr lines
    const purrLines = [];
    const purrCount = FX.pCount(Math.floor(lerp(3, 12, intensity)));
    for (let pli = 0; pli < purrCount; pli++) {
      purrLines.push({
        x: center.cx + randRange(-20, 20),
        y: center.cy + randRange(-10, 10),
        vx: (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 30),
        delay: 600 + pli * lerp(150, 60, intensity),
        size: lerp(8, 14, intensity) * pm.particleSize / 10, life: 0
      });
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#d4728c', radius: lerp(120, 300, intensity), duration: totalDuration * 0.6 });
    FX.doImpactFlash(false);
    FX.doScreenShake(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      // Card shrink with cat appearing
      if (elapsed < 400) {
        const t = elapsed / 400;
        el.style.transform = 'scale(' + (1 + t * 0.05) + ')';
        el.style.boxShadow = '0 0 ' + (t * 20) + 'px rgba(212, 114, 140, ' + (t * 0.15) + ')';
      } else if (elapsed < 900) {
        const t2 = (elapsed - 400) / 500;
        el.style.transform = 'scale(' + (1.05 - t2 * t2 * 0.25) + ')';
        el.style.opacity = String(1 - t2 * t2);
        el.style.boxShadow = '';
      }

      // Draw main cat ASCII art in center
      if (elapsed > 200 && elapsed < totalDuration - 800) {
        const catAlpha = elapsed < 600 ? (elapsed - 200) / 400 : (elapsed > totalDuration - 1200 ? (totalDuration - 800 - elapsed) / 400 : 1);
        if (catAlpha > 0) {
          const breathe = 1 + 0.03 * Math.sin(elapsed * 0.004);
          const catFace = CAT_FACES[Math.floor((elapsed / 600) % CAT_FACES.length)];
          FX.drawChar(fxCtx, catFace, center.cx, center.cy - 10, catColor, catSize * breathe, catAlpha * 0.8, 0);

          // Purr text
          if (elapsed > 800) {
            const purrAlpha = Math.sin(elapsed * 0.003) * 0.3 + 0.3;
            FX.drawChar(fxCtx, 'p u r r r', center.cx, center.cy + catSize + 5,
              pick(CAT_COLORS), catSize * 0.4, purrAlpha * catAlpha, 0);
          }
        }
      }

      // Paw prints appearing sequentially
      pawPrints.forEach(function (pp) {
        if (elapsed < pp.delay) return;
        const ppLife = elapsed - pp.delay;
        const fadeIn = Math.min(ppLife / 200, 1);
        const fadeOut = ppLife > 1000 ? Math.max(1 - (ppLife - 1000) / 800, 0) : 1;
        pp.alpha = fadeIn * fadeOut * lerp(0.3, 0.6, intensity);
        if (pp.alpha > 0.01) {
          FX.drawChar(fxCtx, '@', pp.x, pp.y + 3, pick(CAT_FUR_COLORS), pp.size * 0.7, pp.alpha, 0);
          for (let t = 0; t < 3; t++) {
            const ta = (-0.3 + t * 0.3);
            FX.drawChar(fxCtx, '\u00B7', pp.x + Math.cos(ta - Math.PI / 2) * pp.size * 0.5,
              pp.y + Math.sin(ta - Math.PI / 2) * pp.size * 0.4,
              pick(CAT_FUR_COLORS), pp.size * 0.35, pp.alpha * 0.8, 0);
          }
        }
      });

      // Purr lines (~~~ floating outward)
      purrLines.forEach(function (pl) {
        if (elapsed < pl.delay) return;
        pl.life = elapsed - pl.delay;
        const lr = Math.min(pl.life / 1200, 1);
        const alpha = lr > 0.6 ? (1 - (lr - 0.6) / 0.4) : Math.min(pl.life / 200, 1);
        const plx = pl.x + pl.vx * lr;
        if (alpha > 0.01) {
          FX.drawChar(fxCtx, '~', plx, pl.y, pick(CAT_COLORS), pl.size * (0.8 + lr * 0.3), alpha * 0.4, 0);
          FX.drawChar(fxCtx, '~', plx + pl.size * 0.8, pl.y, pick(CAT_COLORS), pl.size * (0.6 + lr * 0.2), alpha * 0.3, 0);
        }
      });

      // Floating cat-themed particles
      const dt = 0.016;
      catParticles.forEach(function (p) {
        if (elapsed < p.delay) return;
        p.life += 16;
        if (p.life >= p.maxLife) return;
        const lr = p.life / p.maxLife;
        p.vy += pm.particleGravity * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;
        const a = 1 - Math.pow(lr, 1.5);
        FX.drawChar(fxCtx, p.char, p.x, p.y, p.color, p.size * (1 + (1 - lr) * 0.2), a, p.rotation);
      });

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        el.style.boxShadow = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  10. DOG — Happy tail-wagging ASCII dogs
// ═══════════════════════════════════════════════════════════════════
export const dogPlugin = {
  name: 'dog',
  category: 'action',
  style: 'cute',
  meta: { label: 'Dog', description: 'Happy tail-wagging ASCII dogs with barking, bones, and bouncing ears', tags: ['dog', 'animal', 'cute'] },
  params: {
    minDuration: { label: 'Min Duration', type: 'range', min: 1500, max: 4000, default: 2500, step: 250, unit: 'ms', group: 'timing' },
    maxDuration: { label: 'Max Duration', type: 'range', min: 3500, max: 8000, default: 5000, step: 250, unit: 'ms', group: 'timing' },
    minDogSize: { label: 'Min Dog Size', type: 'range', min: 6, max: 18, default: 12, step: 1, unit: 'px', group: 'visual' },
    maxDogSize: { label: 'Max Dog Size', type: 'range', min: 14, max: 30, default: 18, step: 1, unit: 'px', group: 'visual' },
    particleGravity: { label: 'Particle Gravity', type: 'range', min: 20, max: 200, default: 80, step: 10, unit: 'px/s\u00B2', group: 'physics' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 10, step: 1, unit: '', group: 'particles' },
    tailSpeed: { label: 'Tail Wag Speed', type: 'range', min: 0.005, max: 0.04, default: 0.015, step: 0.001, unit: '', group: 'motion' },
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const pm = FX.resolveParams(dogPlugin.params, pctx.params);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-dog');
    const startTime = performance.now();
    const totalDuration = lerp(pm.minDuration, pm.maxDuration, intensity);

    const dogColor = pick(DOG_FUR_COLORS);
    const dogSize = lerp(pm.minDogSize, pm.maxDogSize, intensity);

    // Floating dog-themed particles
    const dogParticles = [];
    const particleCount = FX.pCount(Math.floor(lerp(10, 60, intensity)));
    const boneChars = ['_', '=', 'o'];
    for (let i = 0; i < particleCount; i++) {
      const dAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const dSpeed = lerp(60, 140, intensity) + Math.random() * lerp(80, 200, intensity);
      const isBone = Math.random() > 0.6;
      dogParticles.push({
        x: center.cx + randRange(-center.w * 0.3, center.w * 0.3),
        y: center.cy + randRange(-center.h * 0.2, center.h * 0.2),
        vx: Math.cos(dAngle) * dSpeed, vy: Math.sin(dAngle) * dSpeed - 50,
        char: isBone ? pick(boneChars) : pick(DOG_CHARS),
        color: isBone ? pick(DOG_FUR_COLORS) : pick(DOG_COLORS),
        size: (lerp(6, 10, intensity) + Math.random() * lerp(6, 14, intensity)) * pm.particleSize / 10,
        rotation: (Math.random() - 0.5) * 0.5, rotSpeed: (Math.random() - 0.5) * 4,
        life: 0, maxLife: lerp(800, 1500, intensity) + Math.random() * 800,
        delay: Math.random() * 200, isBone: isBone
      });
    }

    // Tail wag particles
    const tailParticles = [];
    const tailCount = FX.pCount(Math.floor(lerp(4, 15, intensity)));
    for (let ti = 0; ti < tailCount; ti++) {
      tailParticles.push({
        baseX: center.cx + lerp(15, 25, intensity),
        baseY: center.cy + 5,
        phase: ti * 0.4, length: lerp(8, 16, intensity),
        delay: 300 + ti * lerp(100, 40, intensity)
      });
    }

    // Bark text bubbles
    const barks = [];
    const barkTexts = ['WOOF!', 'ARF!', 'YAP!', 'BARK!', '*pant*', '*wag*'];
    const barkCount = Math.floor(lerp(1, 5, intensity));
    for (let bki = 0; bki < barkCount; bki++) {
      barks.push({
        x: center.cx + randRange(-40, 40),
        y: center.cy - 25 - Math.random() * 30,
        text: pick(barkTexts),
        delay: 500 + bki * lerp(400, 150, intensity),
        size: lerp(6, 10, intensity) * pm.particleSize / 10, life: 0
      });
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#c9a84c', radius: lerp(120, 350, intensity), duration: totalDuration * 0.6 });
    FX.doImpactFlash(false);
    FX.doScreenShake(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      if (elapsed < 300) {
        const t = elapsed / 300;
        el.style.transform = 'scale(' + (1 + t * 0.08) + ')';
        el.style.boxShadow = '0 0 ' + (t * 25) + 'px rgba(201, 168, 76, ' + (t * 0.2) + ')';
      } else if (elapsed < 800) {
        const t2 = (elapsed - 300) / 500;
        el.style.transform = 'scale(' + (1.08 - t2 * t2 * 0.3) + ')';
        el.style.opacity = String(1 - t2 * t2);
        el.style.boxShadow = '';
      }

      // Draw main dog face in center
      if (elapsed > 150 && elapsed < totalDuration - 800) {
        const dogAlpha = elapsed < 500 ? (elapsed - 150) / 350 : (elapsed > totalDuration - 1200 ? (totalDuration - 800 - elapsed) / 400 : 1);
        if (dogAlpha > 0) {
          const bounce = Math.abs(Math.sin(elapsed * 0.006)) * 3;
          const dogFace = DOG_FACES[Math.floor((elapsed / 500) % DOG_FACES.length)];
          FX.drawChar(fxCtx, dogFace, center.cx, center.cy - 8 - bounce, dogColor, dogSize, dogAlpha * 0.8, 0);

          // Tail wagging
          const tailAngle = Math.sin(elapsed * pm.tailSpeed) * 0.6;
          const tailChar = DOG_TAIL_FRAMES[Math.floor((elapsed / 80) % DOG_TAIL_FRAMES.length)];
          FX.drawChar(fxCtx, tailChar, center.cx + 25, center.cy - bounce,
            dogColor, dogSize * 0.7, dogAlpha * 0.6, tailAngle);

          // Tongue (panting)
          if (Math.sin(elapsed * 0.005) > 0) {
            FX.drawChar(fxCtx, 'P', center.cx + 2, center.cy + dogSize * 0.4 - bounce,
              '#cf6e5e', dogSize * 0.35, dogAlpha * 0.5, 0.1);
          }

          // Happy bouncing ears
          const earBounce = Math.sin(elapsed * 0.008) * 2;
          FX.drawChar(fxCtx, '/', center.cx - dogSize * 0.5, center.cy - dogSize * 0.5 - bounce + earBounce,
            dogColor, dogSize * 0.5, dogAlpha * 0.5, -0.3);
          FX.drawChar(fxCtx, '\\', center.cx + dogSize * 0.5, center.cy - dogSize * 0.5 - bounce + earBounce,
            dogColor, dogSize * 0.5, dogAlpha * 0.5, 0.3);
        }
      }

      // Bark text bubbles
      barks.forEach(function (bk) {
        if (elapsed < bk.delay) return;
        bk.life = elapsed - bk.delay;
        const lr = Math.min(bk.life / 1000, 1);
        const alpha = lr > 0.6 ? (1 - (lr - 0.6) / 0.4) : Math.min(bk.life / 150, 1);
        if (alpha > 0.01) {
          FX.drawChar(fxCtx, bk.text, bk.x, bk.y - bk.life * 0.03,
            pick(DOG_COLORS), bk.size, alpha * 0.7, 0);
        }
      });

      // Tail wag motion lines
      tailParticles.forEach(function (tp) {
        if (elapsed < tp.delay) return;
        const tLife = elapsed - tp.delay;
        const lr = Math.min(tLife / 800, 1);
        const alpha = lr > 0.5 ? (1 - (lr - 0.5) / 0.5) : Math.min(tLife / 100, 1);
        const swish = Math.sin(tp.phase + elapsed * 0.012) * tp.length;
        if (alpha > 0.01) {
          FX.drawChar(fxCtx, '~', center.cx + 30 + swish, center.cy + (tp.phase * 3) - 5,
            pick(['#c9a84c', '#d99a7c']), lerp(6, 10, intensity), alpha * 0.35, swish * 0.02);
        }
      });

      // Floating particles
      const dt = 0.016;
      dogParticles.forEach(function (p) {
        if (elapsed < p.delay) return;
        p.life += 16;
        if (p.life >= p.maxLife) return;
        const lr = p.life / p.maxLife;
        p.vy += pm.particleGravity * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;
        const a = 1 - Math.pow(lr, 1.5);
        if (p.isBone) {
          FX.drawChar(fxCtx, 'o', p.x - p.size * 0.3, p.y, p.color, p.size * 0.5, a, p.rotation);
          FX.drawChar(fxCtx, '=', p.x, p.y, p.color, p.size * 0.4, a, p.rotation);
          FX.drawChar(fxCtx, 'o', p.x + p.size * 0.3, p.y, p.color, p.size * 0.5, a, p.rotation);
        } else {
          FX.drawChar(fxCtx, p.char, p.x, p.y, p.color, p.size * (1 + (1 - lr) * 0.2), a, p.rotation);
        }
      });

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        el.style.boxShadow = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  11. SNOWFALL — Gentle snowflakes drifting down
// ═══════════════════════════════════════════════════════════════════
export const snowfallPlugin = {
  name: 'snowfall',
  category: 'action',
  style: 'cute',
  meta: { label: 'Snowfall', description: 'Gentle snowflakes drift down with ice crystals and snow accumulation', tags: ['snow', 'winter', 'gentle'] },
  params: {
    // snowfall has no user params currently — placeholder for sandbox visibility
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-snowfall');
    const startTime = performance.now();
    const totalDuration = lerp(2500, 5000, intensity);

    const snowflakes = [];
    const flakeCount = FX.pCount(Math.floor(lerp(15, 120, intensity)));
    for (let i = 0; i < flakeCount; i++) {
      snowflakes.push({
        x: randRange(0, window.innerWidth),
        y: randRange(-100, -20),
        vx: (Math.random() - 0.5) * 30,
        vy: lerp(30, 80, intensity) + Math.random() * lerp(30, 60, intensity),
        char: pick(SNOW_CHARS),
        color: pick(SNOW_COLORS),
        size: lerp(4, 8, intensity) + Math.random() * lerp(4, 12, intensity),
        phase: Math.random() * Math.PI * 2,
        driftSpeed: 0.5 + Math.random() * 2,
        driftAmp: 15 + Math.random() * 30,
        delay: Math.random() * lerp(1500, 500, intensity),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2
      });
    }

    // Ice crystal accents
    const crystals = [];
    if (intensity > 0.5) {
      const crystalCount = FX.pCount(Math.floor(lerp(0, 8, intensity)));
      for (let ci = 0; ci < crystalCount; ci++) {
        crystals.push({
          x: center.cx + randRange(-center.w * 0.6, center.w * 0.6),
          y: center.cy + randRange(-center.h * 0.4, center.h * 0.4),
          delay: 800 + Math.random() * 1500,
          size: lerp(10, 20, intensity), life: 0
        });
      }
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#b4dae8', radius: lerp(150, 400, intensity), duration: totalDuration * 0.7 });
    FX.doImpactFlash(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      // Card freeze and fade
      if (elapsed < 600) {
        const t = elapsed / 600;
        el.style.opacity = String(1 - t * 0.9);
        el.style.transform = 'scale(' + (1 + t * 0.01) + ')';
      } else {
        el.style.opacity = '0.1';
      }

      // Falling snowflakes
      const dt = 0.016;
      snowflakes.forEach(function (sf) {
        if (elapsed < sf.delay) return;
        const sfLife = elapsed - sf.delay;
        const drift = Math.sin(sf.phase + sfLife * 0.001 * sf.driftSpeed) * sf.driftAmp;
        sf.x += (sf.vx + drift * 0.05) * dt;
        sf.y += sf.vy * dt;
        sf.rotation += sf.rotSpeed * dt;

        const alpha = sfLife < 300 ? sfLife / 300 : (sf.y > window.innerHeight - 50 ? Math.max(1 - (sf.y - (window.innerHeight - 50)) / 50, 0) : 1);
        const globalFade = elapsed > totalDuration - 800 ? (totalDuration - elapsed) / 800 : 1;

        if (alpha > 0.01 && sf.y < window.innerHeight + 20) {
          FX.drawChar(fxCtx, sf.char, sf.x, sf.y, sf.color, sf.size, alpha * globalFade * lerp(0.4, 0.8, intensity), sf.rotation);
          // Glow on larger flakes
          if (FX.shouldShadow() && sf.size > 10) {
            fxCtx.save();
            fxCtx.shadowColor = '#b4dae8';
            fxCtx.shadowBlur = 8;
            FX.drawChar(fxCtx, sf.char, sf.x, sf.y, sf.color, sf.size, alpha * globalFade * 0.2, sf.rotation);
            fxCtx.restore();
          }
        }
      });

      // Ice crystals
      crystals.forEach(function (cr) {
        if (elapsed < cr.delay) return;
        cr.life = elapsed - cr.delay;
        const lr = Math.min(cr.life / 1500, 1);
        const alpha = lr > 0.7 ? (1 - (lr - 0.7) / 0.3) : Math.min(cr.life / 400, 1);
        if (alpha > 0.01) {
          const spin = cr.life * 0.0005;
          // Draw 6-pointed crystal
          for (let arm = 0; arm < 6; arm++) {
            const crAngle = (arm / 6) * Math.PI * 2 + spin;
            const len = cr.size * lr;
            FX.drawChar(fxCtx, '-', cr.x + Math.cos(crAngle) * len * 0.5,
              cr.y + Math.sin(crAngle) * len * 0.5,
              pick(ICE_COLORS), cr.size * 0.4, alpha * 0.5, crAngle);
            FX.drawChar(fxCtx, '*', cr.x + Math.cos(crAngle) * len,
              cr.y + Math.sin(crAngle) * len,
              pick(ICE_COLORS), cr.size * 0.3, alpha * 0.4, 0);
          }
          FX.drawChar(fxCtx, '*', cr.x, cr.y, pick(ICE_COLORS), cr.size * 0.5, alpha * 0.6, spin);
        }
      });

      // Ground snow accumulation
      if (elapsed > 1000) {
        const accT = Math.min((elapsed - 1000) / 2000, 1);
        const accAlpha = accT * lerp(0.2, 0.5, intensity);
        const accWidth = center.w + 60;
        const accLeft = center.rect.left - 30;
        const accDensity = Math.floor(lerp(5, 20, intensity));
        const globalFade2 = elapsed > totalDuration - 800 ? (totalDuration - elapsed) / 800 : 1;
        for (let gi = 0; gi < accDensity; gi++) {
          const gxi = accLeft + (gi / accDensity) * accWidth;
          FX.drawChar(fxCtx, pick(['\u2591', '\u2592', '*', '\u00B7']), gxi + randRange(-4, 4),
            center.rect.bottom + randRange(-2, 6),
            pick(SNOW_COLORS), lerp(6, 12, intensity), accAlpha * globalFade2, 0);
        }
      }

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  12. OCEAN — Waves, fish, and bubbles
// ═══════════════════════════════════════════════════════════════════
export const oceanPlugin = {
  name: 'ocean',
  category: 'action',
  style: 'cute',
  meta: { label: 'Ocean', description: 'Waves, swimming fish, rising bubbles, and swaying seaweed', tags: ['ocean', 'water', 'fish'] },
  params: {
    // ocean has no user params currently — placeholder for sandbox visibility
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-ocean');
    const startTime = performance.now();
    const totalDuration = lerp(2500, 5000, intensity);

    // Wave rows
    const waveRows = Math.floor(lerp(3, 8, intensity));
    const waveDensity = Math.floor(lerp(15, 40, intensity));

    // Fish swimming across
    const fish = [];
    const fishCount = FX.pCount(Math.floor(lerp(2, 10, intensity)));
    for (let i = 0; i < fishCount; i++) {
      const goingRight = Math.random() > 0.5;
      fish.push({
        x: goingRight ? -50 - Math.random() * 100 : window.innerWidth + 50 + Math.random() * 100,
        y: center.cy + randRange(-center.h * 0.3, center.h * 0.5),
        vx: (goingRight ? 1 : -1) * (lerp(40, 100, intensity) + Math.random() * 60),
        char: goingRight ? pick(['><>', '><))\'>' ]) : pick(['<><', '<\'((><']),
        color: pick(OCEAN_COLORS.concat(['#c9a84c', '#cf6e5e', '#6aab8e'])),
        size: lerp(8, 14, intensity) + Math.random() * 6,
        delay: 400 + Math.random() * 2000,
        wigglePhase: Math.random() * Math.PI * 2,
        wiggleAmp: 3 + Math.random() * 8
      });
    }

    // Bubbles rising
    const bubbles = [];
    const bubbleCount = FX.pCount(Math.floor(lerp(8, 40, intensity)));
    for (let bi = 0; bi < bubbleCount; bi++) {
      bubbles.push({
        x: center.cx + randRange(-center.w * 0.5, center.w * 0.5),
        y: center.rect.bottom + 20 + Math.random() * 40,
        vy: -(lerp(20, 60, intensity) + Math.random() * 40),
        char: pick(BUBBLE_CHARS),
        size: lerp(4, 8, intensity) + Math.random() * 6,
        color: pick(OCEAN_FOAM),
        delay: Math.random() * lerp(2000, 800, intensity),
        phase: Math.random() * Math.PI * 2,
        wobbleAmp: 5 + Math.random() * 15
      });
    }

    // Seaweed at bottom
    const seaweeds = [];
    const seaweedCount = FX.pCount(Math.floor(lerp(2, 8, intensity)));
    for (let si = 0; si < seaweedCount; si++) {
      seaweeds.push({
        baseX: center.rect.left + ((si + 0.5) / seaweedCount) * center.w,
        baseY: center.rect.bottom + 10,
        height: lerp(20, 50, intensity) + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        segments: Math.floor(lerp(3, 7, intensity))
      });
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#4080c0', radius: lerp(150, 400, intensity), duration: totalDuration * 0.7 });
    FX.doImpactFlash(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      // Card sinks into water
      if (elapsed < 800) {
        const t = elapsed / 800;
        el.style.transform = 'translateY(' + (t * 40) + 'px) scale(' + (1 - t * 0.1) + ')';
        el.style.opacity = String(1 - t);
      }

      const globalFade = elapsed > totalDuration - 800 ? (totalDuration - elapsed) / 800 : 1;

      // Wave rows
      const waveAlpha = Math.min(elapsed / 600, 1) * lerp(0.3, 0.7, intensity);
      for (let row = 0; row < waveRows; row++) {
        const rowY = center.cy - center.h * 0.3 + (row / waveRows) * center.h * 1.0;
        const rowPhase = elapsed * 0.002 + row * 0.8;
        const rowColor = row < waveRows * 0.3 ? pick(OCEAN_COLORS) : pick(OCEAN_DEEP);
        for (let w = 0; w < waveDensity; w++) {
          const wx = center.rect.left - 20 + (w / waveDensity) * (center.w + 40);
          const waveY = rowY + Math.sin(rowPhase + w * 0.3) * lerp(3, 8, intensity);
          FX.drawChar(fxCtx, pick(WAVE_CHARS), wx, waveY, rowColor,
            lerp(8, 14, intensity), waveAlpha * globalFade * (0.4 + row * 0.08), 0);
        }
        // Foam on top waves
        if (row === 0) {
          const foamCount = Math.floor(waveDensity * 0.3);
          for (let fi = 0; fi < foamCount; fi++) {
            const fx = center.rect.left + (fi / foamCount) * center.w;
            const fy = rowY + Math.sin(rowPhase + fi * 0.5) * 5 - 5;
            FX.drawChar(fxCtx, pick(['.', '\u00B7', ',']), fx, fy, pick(OCEAN_FOAM),
              lerp(4, 8, intensity), waveAlpha * globalFade * 0.4, 0);
          }
        }
      }

      // Fish
      const dt = 0.016;
      fish.forEach(function (f) {
        if (elapsed < f.delay) return;
        f.x += f.vx * dt;
        const wiggle = Math.sin(f.wigglePhase + elapsed * 0.005) * f.wiggleAmp;
        const fAlpha = Math.min((elapsed - f.delay) / 300, 1) * globalFade;
        if (fAlpha > 0.01) {
          FX.drawChar(fxCtx, f.char, f.x, f.y + wiggle, f.color, f.size, fAlpha * lerp(0.4, 0.7, intensity), 0);
        }
      });

      // Bubbles
      bubbles.forEach(function (b) {
        if (elapsed < b.delay) return;
        const bLife = elapsed - b.delay;
        b.y += b.vy * dt;
        const wobble = Math.sin(b.phase + bLife * 0.003) * b.wobbleAmp;
        const alpha = Math.min(bLife / 200, 1) * (b.y < center.rect.top - 30 ? 0 : 1) * globalFade;
        if (alpha > 0.01 && b.y > center.rect.top - 50) {
          FX.drawChar(fxCtx, b.char, b.x + wobble, b.y, b.color, b.size, alpha * lerp(0.3, 0.6, intensity), 0);
        }
      });

      // Seaweed
      const seaweedAlpha = Math.min(elapsed / 800, 1) * lerp(0.3, 0.6, intensity) * globalFade;
      seaweeds.forEach(function (sw) {
        for (let s = 0; s < sw.segments; s++) {
          const segT = s / sw.segments;
          const sway = Math.sin(sw.phase + elapsed * 0.002 + s * 0.5) * (8 + s * 2);
          const sx = sw.baseX + sway;
          const sy = sw.baseY - segT * sw.height;
          const segChar = s === sw.segments - 1 ? pick(['\u2663', '\u273F']) : pick(['\u2502', '\u2571', '\u2572']);
          FX.drawChar(fxCtx, segChar, sx, sy,
            pick(MONET_GREENS.concat(['#4a7a48', '#3d6d3b'])),
            lerp(8, 14, intensity), seaweedAlpha * (0.5 + segT * 0.3), sway * 0.02);
        }
      });

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  13. FIREFLIES — Warm summer night with glowing fireflies
// ═══════════════════════════════════════════════════════════════════
export const firefliesPlugin = {
  name: 'fireflies',
  category: 'action',
  style: 'cute',
  meta: { label: 'Fireflies', description: 'Warm summer night with pulsing firefly glow, foliage silhouettes, and star twinkles', tags: ['fireflies', 'night', 'glow'] },
  params: {
    // fireflies has no user params currently — placeholder for sandbox visibility
  },
  requires: ['FX'],
  play: function(el, pctx) {
    const opts = buildOpts(pctx);
    const intensity = FX.intensityScale(pctx.intensity || 5);
    const center = FX.prepareCard(el);
    const _drawId = FX.nextFxDrawId('cute-fireflies');
    const startTime = performance.now();
    const totalDuration = lerp(2800, 5500, intensity);

    // Fireflies with glow pulsing
    const fireflies = [];
    const fireflyCount = FX.pCount(Math.floor(lerp(5, 35, intensity)));
    for (let i = 0; i < fireflyCount; i++) {
      fireflies.push({
        x: center.cx + randRange(-center.w * 0.8, center.w * 0.8),
        y: center.cy + randRange(-center.h * 0.6, center.h * 0.6),
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        glowPhase: Math.random() * Math.PI * 2,
        glowSpeed: 1 + Math.random() * 3,
        size: lerp(4, 8, intensity) + Math.random() * 4,
        color: pick(FIREFLY_GLOW),
        delay: Math.random() * lerp(1500, 500, intensity),
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.5 + Math.random() * 1.5,
        driftAmpX: 20 + Math.random() * 40,
        driftAmpY: 10 + Math.random() * 25
      });
    }

    // Night foliage silhouettes at edges
    const foliage = [];
    const foliageCount = FX.pCount(Math.floor(lerp(5, 20, intensity)));
    for (let fi = 0; fi < foliageCount; fi++) {
      const fSide = Math.random() > 0.5 ? -1 : 1;
      foliage.push({
        x: center.cx + fSide * (center.w * 0.4 + Math.random() * center.w * 0.3),
        y: center.rect.bottom - Math.random() * center.h * 0.5,
        char: pick(['\u2663', '\u2767', '\u273F', '|', '/', '\\']),
        size: lerp(8, 16, intensity) + Math.random() * 8,
        color: pick(NIGHT_GREENS),
        swayPhase: Math.random() * Math.PI * 2
      });
    }

    // Gentle star twinkles in background
    const bgStars = [];
    const starCount = FX.pCount(Math.floor(lerp(5, 25, intensity)));
    for (let si = 0; si < starCount; si++) {
      bgStars.push({
        x: randRange(center.rect.left - 80, center.rect.right + 80),
        y: randRange(center.rect.top - 60, center.cy),
        char: pick(['.', '\u00B7', '*', '+']),
        size: 2 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 3
      });
    }

    FX.doDotgridRipple(center.cx, center.cy, { color: '#c9a84c', radius: lerp(120, 300, intensity), duration: totalDuration * 0.7 });
    FX.doImpactFlash(false);

    FX.registerFxDraw(_drawId, function(fxCtx, now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      // Card dims and fades like a light going out
      if (elapsed < 800) {
        const t = elapsed / 800;
        el.style.opacity = String(1 - t * 0.9);
        el.style.transform = 'scale(' + (1 - t * 0.02) + ')';
      } else {
        el.style.opacity = '0.1';
      }

      const globalFade = elapsed > totalDuration - 1000 ? (totalDuration - elapsed) / 1000 : 1;

      // Night sky gradient feel — subtle dark overlay chars
      if (elapsed > 300) {
        const nightAlpha = Math.min((elapsed - 300) / 800, 1) * 0.15 * globalFade;
        for (let ni = 0; ni < 5; ni++) {
          FX.drawChar(fxCtx, '\u2591',
            center.cx + randRange(-center.w * 0.6, center.w * 0.6),
            center.cy + randRange(-center.h * 0.5, center.h * 0.5),
            pick(NIGHT_BLUES), lerp(12, 20, intensity), nightAlpha, 0);
        }
      }

      // Background stars
      bgStars.forEach(function (star) {
        const twinkle = Math.sin(star.phase + elapsed * 0.002 * star.speed) * 0.5 + 0.5;
        FX.drawChar(fxCtx, star.char, star.x, star.y, '#e8e4e0',
          star.size, twinkle * lerp(0.15, 0.35, intensity) * globalFade, 0);
      });

      // Night foliage
      foliage.forEach(function (f) {
        const sway = Math.sin(f.swayPhase + elapsed * 0.001) * 3;
        FX.drawChar(fxCtx, f.char, f.x + sway, f.y, f.color,
          f.size, lerp(0.2, 0.4, intensity) * globalFade, sway * 0.02);
      });

      // Fireflies with pulsing glow
      fireflies.forEach(function (ff) {
        if (elapsed < ff.delay) return;
        const ffLife = elapsed - ff.delay;

        // Drift in gentle figure-8 / wandering paths
        const driftX = Math.sin(ff.driftPhase + ffLife * 0.001 * ff.driftSpeed) * ff.driftAmpX;
        const driftY = Math.cos(ff.driftPhase * 1.3 + ffLife * 0.001 * ff.driftSpeed * 0.7) * ff.driftAmpY;
        const ffx = ff.x + driftX;
        const ffy = ff.y + driftY;

        // Glow pulse — slow breathe between bright and dim
        const glow = Math.sin(ff.glowPhase + ffLife * 0.002 * ff.glowSpeed);
        const glowAlpha = glow > 0 ? glow * glow : 0;
        const fadeIn = Math.min(ffLife / 500, 1);
        const alpha = fadeIn * globalFade;

        if (alpha > 0.01) {
          // Dim body always visible
          FX.drawChar(fxCtx, '\u00B7', ffx, ffy, ff.color, ff.size * 0.6, alpha * 0.3, 0);

          // Bright glow pulse
          if (glowAlpha > 0.05) {
            FX.drawChar(fxCtx, pick(FIREFLY_CHARS), ffx, ffy, ff.color,
              ff.size * (0.8 + glowAlpha * 0.4), alpha * glowAlpha * lerp(0.5, 0.9, intensity), 0);

            // Glow halo
            if (FX.shouldShadow()) {
              fxCtx.save();
              fxCtx.shadowColor = ff.color;
              fxCtx.shadowBlur = lerp(6, 16, intensity) * glowAlpha;
              FX.drawChar(fxCtx, '*', ffx, ffy, ff.color,
                ff.size * 0.4, alpha * glowAlpha * 0.3, 0);
              fxCtx.restore();
            }
          }

          // Trail dots
          if (ffLife > 200 && glowAlpha > 0.3) {
            const trailX = ffx - driftX * 0.1;
            const trailY = ffy - driftY * 0.1;
            FX.drawChar(fxCtx, '\u00B7', trailX, trailY, ff.color,
              ff.size * 0.3, alpha * glowAlpha * 0.15, 0);
          }
        }
      });

      // Occasional cricket chirp visual
      if (elapsed > 600 && Math.random() > 0.97) {
        const chirpX = center.cx + randRange(-center.w * 0.5, center.w * 0.5);
        const chirpY = center.rect.bottom - randRange(5, 20);
        FX.drawChar(fxCtx, pick([',', '\'', '`']), chirpX, chirpY,
          pick(NIGHT_GREENS), 4, 0.3 * globalFade, 0);
      }

      if (elapsed >= totalDuration) {
        FX.deregisterFxDraw(_drawId);
        el.style.transform = '';
        FX.finalize(el, opts);
      }
    });
  },
  cleanup: function(el) {
    standardCleanup(el);
  }
};


// ═══════════════════════════════════════════════════════════════════
//  Plugin registration
// ═══════════════════════════════════════════════════════════════════

/**
 * All 13 cute animation variant plugins.
 * @type {Array<Object>}
 */
export const variants = {
  confetti: confettiPlugin,
  flowers: flowersPlugin,
  sparkle: sparklePlugin,
  shootingstar: shootingstarPlugin,
  butterflies: butterfliesPlugin,
  rainbow: rainbowPlugin,
  fireworks: fireworksPlugin,
  hearts: heartsPlugin,
  cat: catPlugin,
  dog: dogPlugin,
  snowfall: snowfallPlugin,
  ocean: oceanPlugin,
  fireflies: firefliesPlugin,
};

/**
 * Install all cute variants into an AnimationRegistry instance.
 *
 * @param {Object} registry - An AnimationRegistry (or compatible object with registerCategory).
 */
export function install(registry) {
  if (typeof registry.register === 'function') {
    registry.register('action', 'cute', variants);
  } else if (typeof registry.registerCategory === 'function') {
    registry.registerCategory('action', 'cute', variants);
  }
}

/**
 * Plugin descriptor for engine.use() integration.
 */
export const cutePlugin = {
  name: 'cute',
  install: install,
};

export default cutePlugin;
