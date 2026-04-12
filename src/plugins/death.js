/**
 * @module death
 * @description Death Animations -- 11 deletion animation variants.
 *
 * ESM plugin for toto-fx. Each variant is a plugin object with a `.play()`
 * method and tunable `.params`. Register via the `install()` export or
 * import individual variants.
 *
 * Variants: explode, incinerate, shredder, guillotine, heartbeat,
 *           sniper, eaten, lightning, steamroller, piranhas, woodchipper
 */

import { FX } from '../fx.js';

// ── Character sets ──────────────────────────────────────────────
const EXPLOSION_CHARS = ['#', '@', '*', '%', '!', '&', 'X', 'W', 'M', '+', '=', '/', '\\', '<', '>', '{', '}', '^', '~'];
const FIRE_CHARS = ['^', '~', '*', '#', '@', '%', '&', 'W', 'M', 'N', '/', '\\', '|', '{', '}'];
const BLADE_CHARS = ['/', '\\', '|', '-', '=', '+', '#', '*', 'X'];
const SPARK_CHARS = ['*', '+', 'x', '.', ':', ';', "'"];
const BLOOD_CHARS = ['#', '@', '%', '&', '*', '=', '+', ':', ';', '~', 'x', 'X', '$'];

// ── Helpers ─────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * Get the root container element for overlay positioning.
 * @returns {HTMLElement}
 * @private
 */
function getApp() {
  return document.body;
}

/**
 * Strip framework-specific binding attributes from a cloned node tree.
 * Prevents cloned DOM from triggering framework event handlers.
 * Strips: hx-*, x-*, v-*, ng-*, data-action, wire:* prefixed attributes.
 *
 * @param {HTMLElement} node - The root node to strip.
 * @returns {HTMLElement} The same node (mutated in place).
 * @private
 */
function stripBindings(node) {
  const prefixes = ['hx-', 'x-', 'v-', 'ng-', 'wire:', 'data-action'];
  const strip = function(el) {
    const attrs = Array.from(el.attributes || []);
    for (let i = 0; i < attrs.length; i++) {
      const name = attrs[i].name;
      for (let j = 0; j < prefixes.length; j++) {
        if (name.startsWith(prefixes[j])) { el.removeAttribute(name); break; }
      }
    }
  };
  strip(node);
  const children = node.querySelectorAll('*');
  for (let i = 0; i < children.length; i++) strip(children[i]);
  return node;
}

/**
 * Extract the task title text from an element.
 *
 * @param {HTMLElement} el - The item element.
 * @returns {string} The text content, or empty string if not found.
 * @private
 */
function getTaskText(el) {
  const t = el.querySelector('[data-text]') || el.querySelector('.text') || el;
  return t ? t.textContent : '';
}

// ═══════════════════════════════════════════════════════════════
//  EXPLODE -- directional ASCII fragment explosion
// ═══════════════════════════════════════════════════════════════
export const explodePlugin = {
  name: 'explode',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Explode', description: 'Directional ASCII fragment explosion with smoke puffs', tags: ['explosion', 'fragments', 'particles'] },
  params: {
    fragmentCount: { label: 'Fragment Count', type: 'range', min: 10, max: 150, default: 60, step: 5, unit: '', group: 'particles' },
    smokeCount: { label: 'Smoke Puffs', type: 'range', min: 5, max: 60, default: 25, step: 5, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 40, default: 14, step: 1, unit: '', group: 'particles' },
    gravity: { label: 'Gravity', type: 'range', min: 100, max: 1200, default: 600, step: 50, unit: 'px/s\u00B2', group: 'physics' },
    minSpeed: { label: 'Min Speed', type: 'range', min: 50, max: 500, default: 200, step: 10, unit: 'px/s', group: 'motion' },
    speedRange: { label: 'Speed Range', type: 'range', min: 100, max: 1000, default: 500, step: 25, unit: 'px/s', group: 'motion' },
    duration: { label: 'Duration', type: 'range', min: 500, max: 3000, default: 1500, step: 100, unit: 'ms', group: 'timing' },
    flashDuration: { label: 'Flash Duration', type: 'range', min: 50, max: 500, default: 250, step: 25, unit: 'ms', group: 'timing' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(explodePlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const cx = pos.cx, cy = pos.cy;
    const fxCtx = FX.getFxCtx();

    // Extract text from the item for fragment characters
    const cardText = (el.textContent || el.innerText || '').replace(/\s+/g, '').split('');
    const fragChars = cardText.length >= 3 ? cardText : EXPLOSION_CHARS;

    FX.destroyCard(el);
    FX.doScreenShake(false);
    FX.flashColor('rgba(255, 200, 50, 0.6)', p.flashDuration);

    // Dotgrid: nuclear blast at explosion center
    const intensity = ctx.intensity / 10;
    if (FX.doDotgridNuclear) {
      FX.doDotgridNuclear(cx, cy);
    }
    if (FX.doDotgridCrater) {
      FX.doDotgridCrater(cx, cy, lerp(60, 180, intensity), lerp(1.0, 2.5, intensity), {
        cracks: 8, crackLength: lerp(80, 240, intensity), healDelay: 3000
      });
    }

    const fragments = [];
    const fragCount = FX.pCount(p.fragmentCount);
    for (let i = 0; i < fragCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = p.minSpeed + Math.random() * p.speedRange;
      fragments.push({
        x: cx + (Math.random() - 0.5) * pos.rect.width * 0.6,
        y: cy + (Math.random() - 0.5) * pos.rect.height * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100 - Math.random() * 200,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 15,
        alpha: 1,
        char: fragChars[Math.floor(Math.random() * fragChars.length)],
        size: (8 + Math.random() * 20) * p.particleSize / 14,
        isHot: Math.random() > 0.4,
      });
    }

    const smokes = [];
    const smokeScale = p.particleSize / 14;
    for (let i = 0; i < FX.pCount(p.smokeCount); i++) {
      smokes.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 40,
        vy: -15 - Math.random() * 30,
        alpha: 0.3 + Math.random() * 0.3,
        size: (12 + Math.random() * 16) * smokeScale,
        char: ['~', '.', ':', '*'][Math.floor(Math.random() * 4)],
        growRate: 3 + Math.random() * 5,
      });
    }

    const startTime = performance.now();
    const duration = p.duration;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      const dt = 1 / 60;
      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      let lastFont = '';

      smokes.forEach(function(s) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.size += s.growRate * dt;
        s.alpha *= 0.97;
        if (s.alpha < 0.01) return;
        fxCtx.save();
        fxCtx.translate(s.x, s.y);
        const font = s.size + 'px monospace';
        if (font !== lastFont) { fxCtx.font = font; lastFont = font; }
        fxCtx.fillStyle = 'rgba(80, 70, 60, ' + s.alpha + ')';
        fxCtx.fillText(s.char, 0, 0);
        fxCtx.restore();
      });

      fragments.forEach(function(f) {
        f.vy += p.gravity * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rotation += f.rotSpeed * dt;
        f.alpha *= 0.985;
        f.vx *= 0.99;
        if (f.alpha < 0.01) return;

        const color = f.isHot
          ? 'rgba(' + (200 + Math.floor(Math.random() * 55)) + ',' + Math.floor(80 + Math.random() * 80) + ',' + Math.floor(Math.random() * 30) + ',' + f.alpha + ')'
          : 'rgba(' + (180 + Math.floor(Math.random() * 50)) + ',' + (180 + Math.floor(Math.random() * 50)) + ',' + (180 + Math.floor(Math.random() * 50)) + ',' + f.alpha + ')';

        fxCtx.save();
        fxCtx.translate(f.x, f.y);
        fxCtx.rotate(f.rotation);
        const font = 'bold ' + f.size + 'px monospace';
        if (font !== lastFont) { fxCtx.font = font; lastFont = font; }
        fxCtx.fillStyle = color;
        if (FX.shouldShadow() && f.isHot && f.alpha > 0.3) {
          fxCtx.shadowColor = 'rgba(255, 100, 0, 0.6)';
          fxCtx.shadowBlur = 8;
          fxCtx.fillText(f.char, 0, 0);
          fxCtx.shadowBlur = 0;
        } else {
          fxCtx.fillText(f.char, 0, 0);
        }
        fxCtx.restore();
      });

      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    // Explode destroys card via FX.destroyCard -- no injected DOM to remove
  },
};

// ═══════════════════════════════════════════════════════════════
//  INCINERATE -- fast burn from bottom with ASCII flame chars
// ═══════════════════════════════════════════════════════════════
export const incineratePlugin = {
  name: 'incinerate',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Incinerate', description: 'Fast burn from bottom to top with ASCII flame characters', tags: ['fire', 'burn', 'flames'] },
  params: {
    burnDuration: { label: 'Burn Duration', type: 'range', min: 300, max: 2000, default: 700, step: 50, unit: 'ms', group: 'timing' },
    flameSpawnRate: { label: 'Flame Density', type: 'range', min: 1, max: 10, default: 4, step: 1, unit: '', group: 'particles' },
    flameSpread: { label: 'Flame Spread', type: 'range', min: 20, max: 200, default: 80, step: 10, unit: 'px', group: 'motion' },
    flameRiseSpeed: { label: 'Rise Speed', type: 'range', min: 30, max: 300, default: 150, step: 10, unit: 'px/s', group: 'motion' },
    flameMinSize: { label: 'Min Flame Size', type: 'range', min: 4, max: 20, default: 8, step: 1, unit: 'px', group: 'visual' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(incineratePlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const fxCtx = FX.getFxCtx();
    const startTime = performance.now();
    const duration = p.burnDuration;

    // Dotgrid: scorch trail along the burn path (bottom to top of card)
    const intensity = ctx.intensity / 10;
    if (FX.doDotgridScorch) {
      FX.doDotgridScorch(pos.cx, rect.bottom, pos.cx, rect.top, lerp(40, 100, intensity));
    }

    const flames = [];
    function spawnFlame(progress) {
      const burnLine = rect.bottom - progress * rect.height;
      const count = isMobile ? 2 : p.flameSpawnRate;
      for (let j = 0; j < count; j++) {
        flames.push({
          x: rect.left + Math.random() * rect.width,
          y: burnLine + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * p.flameSpread,
          vy: -60 - Math.random() * p.flameRiseSpeed,
          size: p.flameMinSize + Math.random() * 18,
          alpha: 0.8 + Math.random() * 0.2,
          life: 0.3 + Math.random() * 0.5,
          born: performance.now(),
          char: FIRE_CHARS[Math.floor(Math.random() * FIRE_CHARS.length)],
          phase: Math.random(),
        });
      }
    }

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      el.style.clipPath = 'inset(0 0 ' + (t * 100) + '% 0)';
      if (!isMobile) {
        el.style.boxShadow = '0 0 30px rgba(255, 100, 0, ' + (0.8 * (1 - t)) + '), 0 0 60px rgba(255, 0, 0, ' + (0.4 * (1 - t)) + ')';
      }

      spawnFlame(t);
      if (t > 0.2) spawnFlame(t);
      if (!isMobile && t > 0.5) spawnFlame(t);

      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

      // Fire glow band at burn edge
      const glowY = rect.top + rect.height * (1 - t);
      if (!isMobile) {
        const grad = fxCtx.createLinearGradient(rect.left, glowY - 20, rect.left, glowY + 10);
        grad.addColorStop(0, 'rgba(255, 220, 0, ' + (0.4 * (1 - t)) + ')');
        grad.addColorStop(0.3, 'rgba(255, 100, 0, ' + (0.6 * (1 - t)) + ')');
        grad.addColorStop(0.7, 'rgba(255, 30, 0, ' + (0.4 * (1 - t)) + ')');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        fxCtx.fillStyle = grad;
        fxCtx.fillRect(rect.left - 20, glowY - 20, rect.width + 40, 35);
      }

      // Draw flame chars
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      flames.forEach(function(f) {
        const age = (now - f.born) / 1000;
        if (age > f.life) return;
        f.x += f.vx / 60;
        f.y += f.vy / 60;
        f.vy -= 20 / 60;
        f.vx += (Math.random() - 0.5) * 15;
        const lifeFrac = age / f.life;
        const alpha = f.alpha * (1 - lifeFrac);

        const colorT = lifeFrac + f.phase * 0.3;
        let color;
        if (colorT < 0.2) color = 'rgba(255, 255, 200, ' + alpha + ')';
        else if (colorT < 0.4) color = 'rgba(255, 220, 50, ' + alpha + ')';
        else if (colorT < 0.6) color = 'rgba(255, 140, 0, ' + alpha + ')';
        else if (colorT < 0.8) color = 'rgba(255, 50, 0, ' + alpha + ')';
        else color = 'rgba(120, 20, 0, ' + (alpha * 0.6) + ')';

        fxCtx.save();
        fxCtx.translate(f.x, f.y);
        fxCtx.rotate((Math.random() - 0.5) * 0.5);
        fxCtx.font = 'bold ' + (f.size * (1 - lifeFrac * 0.3)) + 'px monospace';
        fxCtx.fillStyle = color;
        if (FX.shouldShadow() && lifeFrac < 0.5) {
          fxCtx.shadowColor = 'rgba(255, ' + (150 - lifeFrac * 200) + ', 0, 0.5)';
          fxCtx.shadowBlur = 6;
          fxCtx.fillText(f.char, 0, 0);
          fxCtx.shadowBlur = 0;
        } else {
          fxCtx.fillText(f.char, 0, 0);
        }
        fxCtx.restore();
      });

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        el.style.clipPath = '';
        el.style.boxShadow = '';
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.clipPath = '';
    el.style.boxShadow = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  SHREDDER -- sword slashes cut card into strips that fall apart
// ═══════════════════════════════════════════════════════════════
export const shredderPlugin = {
  name: 'shredder',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Shredder', description: 'Sword slashes cut card into strips that tumble and fall', tags: ['slash', 'cut', 'strips'] },
  params: {
    stripCount: { label: 'Strip Count', type: 'range', min: 3, max: 16, default: 8, step: 1, unit: '', group: 'visual' },
    slashDuration: { label: 'Slash Speed', type: 'range', min: 10, max: 120, default: 40, step: 5, unit: 'ms', group: 'timing' },
    slashGap: { label: 'Slash Gap', type: 'range', min: 10, max: 100, default: 30, step: 5, unit: 'ms', group: 'timing' },
    fallDuration: { label: 'Fall Duration', type: 'range', min: 400, max: 2500, default: 1000, step: 100, unit: 'ms', group: 'timing' },
    sparkCount: { label: 'Spark Count', type: 'range', min: 0, max: 8, default: 3, step: 1, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 10, step: 1, unit: '', group: 'particles' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(shredderPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const fxCtx = FX.getFxCtx();
    const stripCount = p.stripCount;
    const stripH = rect.height / stripCount;
    const startTime = performance.now();

    const slashDuration = p.slashDuration;
    const slashGap = p.slashGap;
    const totalSlashTime = stripCount * (slashDuration + slashGap);
    const fallDuration = p.fallDuration;

    // Dotgrid: scorch line across the card (horizontal slash path)
    const intensity = ctx.intensity / 10;
    if (FX.doDotgridScorch) {
      FX.doDotgridScorch(rect.left - 30, pos.cy, rect.right + 30, pos.cy, lerp(30, 80, intensity));
    }

    const slashes = [];
    for (let i = 0; i < stripCount - 1; i++) {
      slashes.push({
        y: rect.top + stripH * (i + 1),
        startTime: i * (slashDuration + slashGap),
        fromLeft: i % 2 === 0,
      });
    }

    let slashPhaseComplete = false;
    let container = null;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      // Slash phase
      if (elapsed < totalSlashTime) {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

        slashes.forEach(function(s) {
          const slashElapsed = elapsed - s.startTime;
          if (slashElapsed < 0) return;
          const st = Math.min(slashElapsed / slashDuration, 1);

          const startX = s.fromLeft ? rect.left - 30 : rect.right + 30;
          const endX = s.fromLeft ? rect.right + 30 : rect.left - 30;
          const currentX = startX + (endX - startX) * st;

          // Blade trail chars
          const trailLen = isMobile ? 4 : 8;
          for (let ti = 0; ti < trailLen; ti++) {
            const trailT = Math.max(st - ti * 0.04, 0);
            const tx = startX + (endX - startX) * trailT;
            const alpha = (1 - ti / trailLen) * (st < 1 ? 1 : Math.max(1 - (slashElapsed - slashDuration) / 100, 0));
            const char = BLADE_CHARS[Math.floor(Math.random() * BLADE_CHARS.length)];
            FX.drawAsciiChar(fxCtx, char, tx, s.y, 'rgba(220, 220, 240, ' + (alpha * 0.8) + ')', 10 + Math.random() * 6, 1, s.fromLeft ? -0.2 : 0.2);
          }

          // Sparks at cutting tip
          if (st < 1) {
            for (let si = 0; si < (isMobile ? 1 : p.sparkCount); si++) {
              const sparkChar = SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)];
              FX.drawAsciiChar(fxCtx, sparkChar,
                currentX + (Math.random() - 0.5) * 10,
                s.y + (Math.random() - 0.5) * 10,
                'rgba(255, 220, 100, ' + (0.6 + Math.random() * 0.3) + ')',
                (6 + Math.random() * 8) * p.particleSize / 10, 1, Math.random() * Math.PI);
            }
          }

          // Slash line
          fxCtx.beginPath();
          fxCtx.moveTo(s.fromLeft ? rect.left - 30 : currentX, s.y);
          fxCtx.lineTo(currentX, s.y);
          fxCtx.strokeStyle = 'rgba(255, 255, 255, ' + (st < 1 ? 0.9 : Math.max(1 - (slashElapsed - slashDuration) / 100, 0)) + ')';
          fxCtx.lineWidth = 1.5;
          if (FX.shouldShadow()) {
            fxCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            fxCtx.shadowBlur = 6;
            fxCtx.stroke();
            fxCtx.shadowBlur = 0;
          } else {
            fxCtx.stroke();
          }
        });

        requestAnimationFrame(frame);
        return;
      }

      // Create strips
      if (!slashPhaseComplete) {
        slashPhaseComplete = true;
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        el.style.visibility = 'hidden';

        container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;z-index:9999;pointer-events:none;overflow:visible;';

        for (let i = 0; i < stripCount; i++) {
          const strip = document.createElement('div');
          strip.style.cssText = 'position:absolute;left:0;top:' + (i * stripH) + 'px;width:' + rect.width + 'px;height:' + (stripH + 1) + 'px;background:var(--surface);border:1px solid var(--border);overflow:hidden;will-change:transform,opacity;';
          const inner = stripBindings(el.cloneNode(true));
          inner.style.cssText = 'position:absolute;left:0;top:' + (-i * stripH) + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;margin:0;display:flex;align-items:flex-start;background:var(--surface);pointer-events:none;visibility:visible;';
          inner.classList.remove('animating');
          strip.appendChild(inner);
          container.appendChild(strip);
        }
        document.body.appendChild(container);
      }

      // Fall phase
      const fallElapsed = elapsed - totalSlashTime;
      const ft = Math.min(fallElapsed / fallDuration, 1);

      const strips = container.children;
      for (let i = 0; i < strips.length; i++) {
        const fallTime = Math.max(fallElapsed - i * 30, 0);
        const vy = fallTime * 20;
        const wobble = Math.sin(fallTime * 0.008 + i) * (3 + i * 2);
        const rotate = (i % 2 === 0 ? 1 : -1) * Math.min(fallTime * 0.02, 15);
        strips[i].style.transform = 'translateY(' + (vy * (1 / 60) * fallTime * 0.02) + 'px) translateX(' + wobble + 'px) rotate(' + rotate + 'deg)';
        strips[i].style.opacity = String(Math.max(1 - fallTime / (fallDuration * 0.8), 0));
      }

      if (ft < 1) {
        requestAnimationFrame(frame);
      } else {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        container.remove();
        el.style.visibility = '';
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.visibility = '';
    // Remove any leftover strip containers
    const containers = document.querySelectorAll('div[style*="z-index:9999"]');
    containers.forEach(function(c) { if (c.parentNode) c.remove(); });
  },
};

// ═══════════════════════════════════════════════════════════════
//  GUILLOTINE -- blade drops, cuts card in two, halves fall apart
// ═══════════════════════════════════════════════════════════════
export const guillotinePlugin = {
  name: 'guillotine',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Guillotine', description: 'Blade drops and cuts card in two, halves tumble apart', tags: ['blade', 'cut', 'halves'] },
  params: {
    bladeDropDuration: { label: 'Blade Drop Speed', type: 'range', min: 80, max: 600, default: 200, step: 20, unit: 'ms', group: 'timing' },
    fallDuration: { label: 'Fall Duration', type: 'range', min: 400, max: 2500, default: 1000, step: 100, unit: 'ms', group: 'timing' },
    cutPosition: { label: 'Cut Position', type: 'range', min: 0.2, max: 0.8, default: 0.5, step: 0.05, unit: '', group: 'visual' },
    gravity: { label: 'Gravity', type: 'range', min: 200, max: 1200, default: 600, step: 50, unit: 'px/s\u00B2', group: 'physics' },
    bloodCount: { label: 'Blood Splatter', type: 'range', min: 5, max: 60, default: 30, step: 5, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 12, step: 1, unit: '', group: 'particles' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(guillotinePlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const fxCtx = FX.getFxCtx();
    const startTime = performance.now();
    const bladeDropDuration = p.bladeDropDuration;
    const fallDuration = p.fallDuration;
    const cutY = rect.top + rect.height * p.cutPosition;

    el.style.visibility = 'hidden';

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;z-index:9999;pointer-events:none;overflow:visible;';

    const halves = [];
    for (let i = 0; i < 2; i++) {
      const isTop = i === 0;
      const half = document.createElement('div');
      half.style.cssText = 'position:absolute;left:0;top:' + (isTop ? 0 : rect.height / 2) + 'px;width:' + rect.width + 'px;height:' + (rect.height / 2) + 'px;overflow:hidden;transform-origin:' + (isTop ? 'center bottom' : 'center top') + ';will-change:transform,opacity;';
      const inner = stripBindings(el.cloneNode(true));
      inner.style.cssText = 'position:absolute;left:0;top:' + (isTop ? 0 : -rect.height / 2) + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;margin:0;display:flex;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);pointer-events:none;visibility:visible;';
      inner.classList.remove('animating');
      half.appendChild(inner);
      container.appendChild(half);
      halves.push({ el: half, isTop: isTop, vy: 0, y: 0, rot: 0 });
    }
    document.body.appendChild(container);

    const bloodChars = [];
    let impactDone = false;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;

      // Blade drops
      if (elapsed < bladeDropDuration) {
        const bt = elapsed / bladeDropDuration;
        const bladeY = -60 + (cutY + 60) * (bt * bt);

        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

        const bladeWidth = rect.width + 40;
        const charSize = 14;
        const charCount = Math.ceil(bladeWidth / (charSize * 0.6));
        for (let i = 0; i < charCount; i++) {
          const bx = rect.left - 20 + i * (bladeWidth / charCount);
          const char = BLADE_CHARS[i % BLADE_CHARS.length];
          FX.drawAsciiChar(fxCtx, char, bx, bladeY, 'rgba(200, 200, 230, 0.9)', charSize, 1, 0);
        }

        // Motion trail
        if (!isMobile) {
          for (let row = 1; row < 4; row++) {
            const trailAlpha = 0.15 / row;
            for (let i = 0; i < charCount; i += 2) {
              const bx = rect.left - 20 + i * (bladeWidth / charCount);
              FX.drawAsciiChar(fxCtx, '|', bx, bladeY - row * 15, 'rgba(180, 180, 210, ' + trailAlpha + ')', charSize - 2, 1, 0);
            }
          }
        }

        requestAnimationFrame(frame);
        return;
      }

      // Impact
      if (!impactDone) {
        impactDone = true;
        FX.doScreenShake(false);
        FX.flashColor('rgba(255, 255, 255, 0.4)', 200);

        // Dotgrid: crater at the guillotine chop point
        const intensity = ctx.intensity / 10;
        if (FX.doDotgridCrater) {
          FX.doDotgridCrater(pos.cx, cutY, lerp(50, 140, intensity), lerp(1.0, 2.0, intensity), {
            cracks: 5, crackLength: lerp(60, 160, intensity), healDelay: 2500
          });
        }

        for (let i = 0; i < FX.pCount(p.bloodCount); i++) {
          bloodChars.push({
            x: rect.left + Math.random() * rect.width,
            y: cutY + (Math.random() - 0.5) * 12,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 40 + 20,
            char: BLOOD_CHARS[Math.floor(Math.random() * BLOOD_CHARS.length)],
            size: (6 + Math.random() * 12) * p.particleSize / 12,
            alpha: 0.5 + Math.random() * 0.4,
            rotation: (Math.random() - 0.5) * 2,
          });
        }
      }

      // Halves fall
      const fallElapsed = elapsed - bladeDropDuration;
      const ft = Math.min(fallElapsed / fallDuration, 1);

      halves.forEach(function(h) {
        h.vy += p.gravity * (1 / 60);
        h.y += h.vy * (1 / 60);
        const dir = h.isTop ? -1 : 1;
        h.rot += dir * 2;
        h.el.style.transform = 'translateY(' + h.y + 'px) rotate(' + h.rot + 'deg)';
        h.el.style.opacity = String(Math.max(1 - ft * 1.2, 0));
      });

      // Draw blood chars
      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
      bloodChars.forEach(function(b) {
        b.x += b.vx / 60;
        b.y += b.vy / 60;
        b.vy += 100 / 60;
        b.alpha *= 0.99;
        if (b.alpha < 0.01) return;
        FX.drawAsciiChar(fxCtx, b.char, b.x, b.y,
          'rgba(' + (140 + Math.floor(Math.random() * 40)) + ', 0, ' + Math.floor(Math.random() * 15) + ', ' + b.alpha + ')',
          b.size, 1, b.rotation);
      });

      if (ft < 1) {
        requestAnimationFrame(frame);
      } else {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        container.remove();
        el.style.visibility = '';
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.visibility = '';
    // Remove any leftover half containers
    const containers = document.querySelectorAll('div[style*="z-index:9999"]');
    containers.forEach(function(c) { if (c.parentNode) c.remove(); });
  },
};

// ═══════════════════════════════════════════════════════════════
//  HEARTBEAT -- accelerating pulse -> ECG spike -> flatline
// ═══════════════════════════════════════════════════════════════
export const heartbeatPlugin = {
  name: 'heartbeat',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Heartbeat', description: 'Accelerating pulse with ECG spike trace then flatline', tags: ['pulse', 'ecg', 'medical'] },
  params: {
    duration: { label: 'Duration', type: 'range', min: 2000, max: 6000, default: 3800, step: 100, unit: 'ms', group: 'timing' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(heartbeatPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const cx = pos.cx, cy = pos.cy;
    const fxCtx = FX.getFxCtx();
    const startTime = performance.now();
    const duration = p.duration;
    let heartbeatDotgridFired = false;

    function ecgWave(t) {
      if (t < 0.1) return 0;
      if (t < 0.15) return ((t - 0.1) / 0.05) * -3;
      if (t < 0.2) return ((0.2 - t) / 0.05) * -3;
      if (t < 0.3) return 0;
      if (t < 0.35) return ((t - 0.3) / 0.05) * 4;
      if (t < 0.4) return 4 - ((t - 0.35) / 0.05) * 20;
      if (t < 0.45) return -16 + ((t - 0.4) / 0.05) * 20;
      if (t < 0.5) return 4 - ((t - 0.45) / 0.05) * 4;
      if (t < 0.7) return 0;
      if (t < 0.8) return ((t - 0.7) / 0.1) * -2;
      if (t < 0.9) return ((0.9 - t) / 0.1) * -2;
      return 0;
    }

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
      fxCtx.font = '14px monospace';
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';

      // Phase 1: Accelerating heartbeat pulse (0-1200ms)
      if (elapsed < 1200) {
        const freq = 1.5 + elapsed / 200;
        const beatPhase = (elapsed / 1000) * freq * Math.PI * 2;
        const beat1 = Math.max(0, Math.sin(beatPhase * 2));
        const beat2 = Math.max(0, Math.sin(beatPhase * 2 - 1.2));
        const pulse = Math.max(beat1, beat2 * 0.6);

        const glowIntensity = pulse * (0.4 + elapsed / 1200 * 0.6);
        if (!isMobile) {
          el.style.boxShadow = '0 0 ' + (10 + pulse * 25) + 'px rgba(255, 50, 50, ' + (glowIntensity * 0.5) + '), inset 0 0 ' + (pulse * 15) + 'px rgba(255, 50, 50, ' + (glowIntensity * 0.15) + ')';
        }
        el.style.borderColor = 'rgba(255, 50, 50, ' + (0.1 + glowIntensity * 0.4) + ')';

        // Heart ring
        const ringRadius = pulse * (30 - elapsed / 1200 * 15);
        const charCount = Math.floor(ringRadius * 1.5);
        for (let i = 0; i < charCount; i++) {
          const angle = (i / charCount) * Math.PI * 2;
          const rx = cx + Math.cos(angle) * ringRadius;
          const ry = cy + Math.sin(angle) * ringRadius * 0.6;
          const char = pulse > 0.5 ? '\u2665' : '\u00B7';
          const alpha = pulse * (1 - elapsed / 1400);
          fxCtx.fillStyle = 'rgba(255, ' + (50 + Math.floor(pulse * 30)) + ', ' + (50 + Math.floor(pulse * 20)) + ', ' + (alpha * 0.6) + ')';
          fxCtx.fillText(char, rx, ry);
        }
      }

      // Phase 2: ECG spike trace (1000-1800ms)
      if (elapsed >= 1000 && elapsed < 1800) {
        const spikeT = (elapsed - 1000) / 800;

        const traceWidth = rect.width + 60;
        const traceLeft = rect.left - 30;
        const traceY = cy;
        const currentX = traceLeft + spikeT * traceWidth;
        const step = isMobile ? 5 : 3;

        for (let x = traceLeft; x < currentX; x += step) {
          const localT = (x - traceLeft) / traceWidth;
          const yOff = ecgWave(localT) * 3;
          const age = spikeT - localT;
          const alpha = Math.max(0.1, 1 - age * 2);

          const nextYOff = ecgWave(localT + 0.01) * 3;
          const slope = nextYOff - yOff;
          let char;
          if (Math.abs(slope) < 0.5) char = '\u2500';
          else if (slope > 2) char = '\u2571';
          else if (slope < -2) char = '\u2572';
          else if (slope > 0) char = '\u25B4';
          else char = '\u25BE';

          fxCtx.fillStyle = 'rgba(255, 50, 50, ' + alpha + ')';
          if (FX.shouldShadow() && age < 0.05) {
            fxCtx.shadowColor = 'rgba(255, 50, 50, 0.8)';
            fxCtx.shadowBlur = 8;
            fxCtx.fillText(char, x, traceY + yOff);
            fxCtx.shadowBlur = 0;
          } else {
            fxCtx.fillText(char, x, traceY + yOff);
          }
        }

        // Trace head
        fxCtx.fillStyle = 'rgba(255, 100, 100, 1)';
        if (FX.shouldShadow()) {
          fxCtx.shadowColor = 'rgba(255, 50, 50, 0.9)';
          fxCtx.shadowBlur = 12;
          fxCtx.fillText('\u2588', currentX, traceY + ecgWave(spikeT) * 3);
          fxCtx.shadowBlur = 0;
        } else {
          fxCtx.fillText('\u2588', currentX, traceY + ecgWave(spikeT) * 3);
        }

        const fadeT = Math.max(0, (spikeT - 0.5) * 2);
        el.style.opacity = String(1 - fadeT * 0.5);
        el.style.boxShadow = '0 0 ' + (20 - spikeT * 15) + 'px rgba(255, 50, 50, ' + (0.4 * (1 - spikeT)) + ')';
      }

      // Phase 3: Flatline sweep + NO SIGNAL (1800ms+)
      if (elapsed >= 1800) {
        // Dotgrid: crater pulse at flatline moment (fires once)
        if (!heartbeatDotgridFired) {
          heartbeatDotgridFired = true;
          const intensity = ctx.intensity / 10;
          if (FX.doDotgridCrater) {
            FX.doDotgridCrater(cx, cy, lerp(40, 120, intensity), lerp(0.8, 1.5, intensity), {
              cracks: 4, crackLength: lerp(50, 120, intensity), healDelay: 3500
            });
          }
        }
        const flatElapsed = elapsed - 1800;
        const sweepDuration = 1200;
        const sweepT = Math.min(flatElapsed / sweepDuration, 1);

        el.style.opacity = String(Math.max(0.5 - sweepT * 0.6, 0));
        el.style.boxShadow = '';
        el.style.borderColor = '';

        const sweepWidth = rect.width + 80;
        const sweepLeft = rect.left - 40;
        const flatY = cy;
        const currentSweepX = sweepLeft + sweepT * sweepWidth;
        const fadeOut = elapsed > duration * 0.85
          ? Math.max(0, 1 - (elapsed - duration * 0.85) / (duration * 0.15))
          : 1;

        const charSpacing = isMobile ? 12 : 8;
        for (let x = sweepLeft; x < currentSweepX; x += charSpacing) {
          const distFromHead = currentSweepX - x;
          const alpha = distFromHead < 20
            ? fadeOut
            : Math.exp(-(distFromHead - 20) * 0.015) * fadeOut;

          const char = distFromHead < 20 ? '\u2500' : '\u254C';
          fxCtx.fillStyle = 'rgba(255, 50, 50, ' + alpha + ')';
          if (FX.shouldShadow() && distFromHead < 15) {
            fxCtx.shadowColor = 'rgba(255, 50, 50, 0.6)';
            fxCtx.shadowBlur = 6;
            fxCtx.fillText(char, x, flatY);
            fxCtx.shadowBlur = 0;
          } else {
            fxCtx.fillText(char, x, flatY);
          }
        }

        // Sweep head
        if (sweepT < 1) {
          fxCtx.fillStyle = 'rgba(255, 100, 100, ' + fadeOut + ')';
          if (FX.shouldShadow()) {
            fxCtx.shadowColor = 'rgba(255, 50, 50, 0.9)';
            fxCtx.shadowBlur = 10;
            fxCtx.fillText('\u2588', currentSweepX, flatY);
            fxCtx.shadowBlur = 0;
          } else {
            fxCtx.fillText('\u2588', currentSweepX, flatY);
          }
        }

        // NO SIGNAL text
        if (sweepT > 0.3) {
          const noSigText = '\u2500\u2500 NO SIGNAL \u2500\u2500';
          const textAlpha = Math.min(1, (sweepT - 0.3) / 0.2) * fadeOut;
          const textX = cx - (noSigText.length * 4.5);
          const textY = flatY - 25;

          fxCtx.font = 'bold 14px monospace';
          fxCtx.textAlign = 'left';
          const useShadow = FX.shouldShadow();
          for (let i = 0; i < noSigText.length; i++) {
            if (noSigText[i] === ' ') continue;
            const charBlink = Math.sin(now * 0.006 + i * 0.3) > -0.3 ? 1 : 0.3;
            fxCtx.fillStyle = 'rgba(255, 50, 50, ' + (textAlpha * charBlink) + ')';
            if (useShadow) {
              fxCtx.shadowColor = 'rgba(255, 50, 50, ' + (0.4 * charBlink) + ')';
              fxCtx.shadowBlur = 4;
            }
            fxCtx.fillText(noSigText[i], textX + i * 9, textY);
          }
          if (useShadow) fxCtx.shadowBlur = 0;
          fxCtx.textAlign = 'center';
          fxCtx.font = '14px monospace';
        }
      }

      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        el.style.boxShadow = '';
        el.style.borderColor = '';
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.boxShadow = '';
    el.style.borderColor = '';
    el.style.opacity = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  SNIPER -- crosshair lock-on -> bang -> card falls over
// ═══════════════════════════════════════════════════════════════
export const sniperPlugin = {
  name: 'sniper',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Sniper', description: 'Crosshair locks on target then bang, card falls over', tags: ['crosshair', 'gun', 'shot'] },
  params: {
    lockOnDuration: { label: 'Lock-on Time', type: 'range', min: 300, max: 2000, default: 800, step: 50, unit: 'ms', group: 'timing' },
    bangDuration: { label: 'Bang Duration', type: 'range', min: 30, max: 200, default: 80, step: 10, unit: 'ms', group: 'timing' },
    afterDuration: { label: 'After Duration', type: 'range', min: 500, max: 3000, default: 1200, step: 100, unit: 'ms', group: 'timing' },
    crosshairRadius: { label: 'Crosshair Size', type: 'range', min: 15, max: 60, default: 30, step: 5, unit: 'px', group: 'visual' },
    crosshairWobble: { label: 'Crosshair Wobble', type: 'range', min: 2, max: 20, default: 8, step: 1, unit: 'px', group: 'motion' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const p = FX.resolveParams(sniperPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const cx = pos.cx, cy = pos.cy;
    const fxCtx = FX.getFxCtx();
    const startTime = performance.now();
    const lockOnDuration = p.lockOnDuration;
    const bangDuration = p.bangDuration;
    const afterDuration = p.afterDuration;
    const totalDuration = lockOnDuration + bangDuration + afterDuration;

    // Start crosshair from click position if available, otherwise random offset
    let crossX = (ctx.clickX != null) ? ctx.clickX : cx + (Math.random() - 0.5) * 100;
    let crossY = (ctx.clickY != null) ? ctx.clickY : cy + (Math.random() - 0.5) * 60;
    let bangFired = false;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

      if (elapsed < lockOnDuration) {
        // Crosshair tracks toward target
        const t = elapsed / lockOnDuration;
        const ease = t * t;
        const wobble = (1 - ease) * p.crosshairWobble;
        crossX += (cx - crossX) * 0.06 + (Math.random() - 0.5) * wobble;
        crossY += (cy - crossY) * 0.06 + (Math.random() - 0.5) * wobble;

        // Crosshair circle
        const radius = p.crosshairRadius - ease * 10;
        fxCtx.strokeStyle = 'rgba(255, 50, 50, ' + (0.4 + ease * 0.5) + ')';
        fxCtx.lineWidth = 1.5;
        fxCtx.beginPath();
        fxCtx.arc(crossX, crossY, radius, 0, Math.PI * 2);
        fxCtx.stroke();

        fxCtx.font = '12px monospace';
        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';
        fxCtx.fillStyle = 'rgba(255, 50, 50, ' + (0.5 + ease * 0.4) + ')';
        for (let i = 1; i <= 3; i++) {
          fxCtx.fillText('|', crossX, crossY - radius - i * 10);
          fxCtx.fillText('|', crossX, crossY + radius + i * 10);
          fxCtx.fillText('\u2500', crossX - radius - i * 12, crossY);
          fxCtx.fillText('\u2500', crossX + radius + i * 12, crossY);
        }
        fxCtx.fillStyle = 'rgba(255, 50, 50, ' + ease + ')';
        fxCtx.fillText('+', crossX, crossY);

        // Scope tint
        fxCtx.fillStyle = 'rgba(255, 0, 0, ' + (0.02 + ease * 0.03) + ')';
        fxCtx.fillRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

        requestAnimationFrame(frame);
      } else if (elapsed < lockOnDuration + bangDuration) {
        // BANG
        if (!bangFired) {
          bangFired = true;
          FX.flashColor('rgba(0, 0, 0, 1)', 60);
          FX.doScreenShake(true);
          setTimeout(function() { FX.flashColor('rgba(255, 255, 255, 0.8)', 200); }, 50);

          // Dotgrid: crater at bullet impact point
          const intensity = ctx.intensity / 10;
          if (FX.doDotgridCrater) {
            FX.doDotgridCrater(crossX, crossY, lerp(40, 120, intensity), lerp(1.0, 2.0, intensity), {
              cracks: 6, crackLength: lerp(50, 150, intensity), healDelay: 3000
            });
          }
        }
        requestAnimationFrame(frame);
      } else {
        // Card falls over
        const afterT = (elapsed - lockOnDuration - bangDuration) / afterDuration;
        const fallT = Math.min(afterT * 1.5, 1);
        const fallEase = fallT * fallT;
        el.style.transform = 'rotateX(' + (fallEase * 80) + 'deg) translateY(' + (fallEase * 100) + 'px)';
        el.style.opacity = String(Math.max(1 - fallT * 1.3, 0));

        // Blood ASCII at impact point
        if (afterT < 0.8) {
          const bloodAlpha = 1 - afterT * 1.2;
          const holeRadius = 5 + afterT * 30;
          for (let i = 0; i < FX.pCount(20); i++) {
            const angle = (i / 20) * Math.PI * 2;
            const char = BLOOD_CHARS[Math.floor(Math.random() * BLOOD_CHARS.length)];
            const bx = crossX + Math.cos(angle) * holeRadius + (Math.random() - 0.5) * 8;
            const by = crossY + Math.sin(angle) * holeRadius + (Math.random() - 0.5) * 8;
            FX.drawAsciiChar(fxCtx, char, bx, by,
              'rgba(' + (140 + Math.floor(Math.random() * 60)) + ', 0, 0, ' + (bloodAlpha * (0.4 + Math.random() * 0.4)) + ')',
              8 + Math.random() * 10, 1, Math.random() * Math.PI);
          }
          for (let i = 0; i < FX.pCount(8); i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = holeRadius + 20 + Math.random() * 60 * afterT;
            const char = BLOOD_CHARS[Math.floor(Math.random() * BLOOD_CHARS.length)];
            FX.drawAsciiChar(fxCtx, char, crossX + Math.cos(angle) * dist, crossY + Math.sin(angle) * dist,
              'rgba(160, 0, 0, ' + (bloodAlpha * 0.3) + ')', 6 + Math.random() * 8, 1, Math.random());
          }
        }

        if (afterT < 1) {
          requestAnimationFrame(frame);
        } else {
          fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
          el.style.transform = '';
          FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
        }
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.transform = '';
    el.style.opacity = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  EATEN -- ASCII jaws chomp rhythmically, crumbs fall
// ═══════════════════════════════════════════════════════════════
export const eatenPlugin = {
  name: 'eaten',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Eaten', description: 'ASCII jaws approach and chomp card with crumbs falling', tags: ['jaws', 'chomp', 'teeth'] },
  params: {
    approachDuration: { label: 'Approach Speed', type: 'range', min: 100, max: 800, default: 350, step: 25, unit: 'ms', group: 'timing' },
    chewCount: { label: 'Chew Cycles', type: 'range', min: 2, max: 8, default: 4, step: 1, unit: '', group: 'timing' },
    chewCycleDuration: { label: 'Chew Speed', type: 'range', min: 150, max: 800, default: 400, step: 25, unit: 'ms', group: 'timing' },
    swallowDuration: { label: 'Swallow Duration', type: 'range', min: 100, max: 600, default: 300, step: 25, unit: 'ms', group: 'timing' },
    burpDuration: { label: 'Burp Duration', type: 'range', min: 200, max: 1000, default: 500, step: 50, unit: 'ms', group: 'timing' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(eatenPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const cx = pos.cx, cy = pos.cy;
    const fxCtx = FX.getFxCtx();
    const startTime = performance.now();
    const app = getApp();
    const shakeEnabled = FX.fxEnabled('shake');

    const approachDuration = p.approachDuration;
    const chewCount = p.chewCount;
    const chewCycleDuration = p.chewCycleDuration;
    const chewTotalDuration = chewCycleDuration * chewCount;
    const swallowDuration = p.swallowDuration;
    const burpDuration = p.burpDuration;
    const totalDuration = approachDuration + chewTotalDuration + swallowDuration + burpDuration;

    let eatenDotgridFired = false;
    const teethCount = Math.ceil(rect.width / 14);
    const taskText = getTaskText(el);
    const taskLetters = taskText.split('').filter(function(c) { return c !== ' '; });

    const stuckLetters = [];
    const crumbs = [];
    const CRUMB_CHARS = ['.', ',', ';', ':', "'", '*', '~', '%', '#', '+'];
    const FOOD_COLORS = [
      [160, 100, 40], [180, 120, 50], [200, 150, 60], [140, 160, 50],
      [100, 140, 40], [210, 170, 50], [180, 80, 40], [160, 140, 60],
    ];

    function foodColor(alpha) {
      const c = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
      return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + alpha + ')';
    }

    function spawnCrumbs(x, y, count) {
      for (let i = 0; i < count; i++) {
        const c = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
        crumbs.push({
          x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 80, vy: 20 + Math.random() * 60,
          char: CRUMB_CHARS[Math.floor(Math.random() * CRUMB_CHARS.length)],
          size: 7 + Math.random() * 8,
          r: c[0], g: c[1], b: c[2],
          alpha: 0.8 + Math.random() * 0.2,
          gravity: 80 + Math.random() * 60, life: 1.0, decay: 0.3 + Math.random() * 0.4,
        });
      }
    }

    function stickLetter(chewNum) {
      const available = taskLetters.filter(function(_, i) { return !stuckLetters.some(function(s) { return s.srcIdx === i; }); });
      const addCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < addCount && available.length > 0; i++) {
        const pickIdx = Math.floor(Math.random() * available.length);
        const char = available[pickIdx];
        const srcIdx = taskLetters.indexOf(char);
        available.splice(pickIdx, 1);
        const toothIdx = Math.floor(Math.random() * (teethCount - 1));
        const tx = rect.left + ((toothIdx + 0.5) / teethCount) * rect.width + 6;
        stuckLetters.push({
          char: char, srcIdx: srcIdx, toothIdx: toothIdx, x: tx,
          offsetY: (Math.random() - 0.5) * 6, size: 7 + Math.random() * 4,
          mangleLevel: chewNum, rotation: (Math.random() - 0.5) * 0.6,
        });
      }
    }

    function drawTeeth(topY, botY, jawGap, alpha) {
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      for (let i = 0; i < teethCount; i++) {
        const tx = rect.left + (i / teethCount) * rect.width + 6;
        const toothWobble = Math.sin(i * 0.8) * 1.5;
        fxCtx.fillStyle = 'rgba(240, 240, 250, ' + alpha + ')';
        fxCtx.font = (i % 3 === 0) ? 'bold 24px monospace' : 'bold 18px monospace';
        fxCtx.fillText((i % 3 === 0) ? '\u2BC6' : '\u25BE', tx, topY + toothWobble);
        fxCtx.font = (i % 3 === 1) ? 'bold 24px monospace' : 'bold 18px monospace';
        fxCtx.fillText((i % 3 === 1) ? '\u2BC5' : '\u25B4', tx, botY - toothWobble);
      }
      fxCtx.font = '12px monospace';
      fxCtx.fillStyle = 'rgba(200, 80, 100, ' + (alpha * 0.8) + ')';
      for (let x = rect.left; x < rect.right; x += 8) {
        fxCtx.fillText('\u2500', x, topY - 12);
        fxCtx.fillText('\u2500', x, botY + 12);
      }
    }

    function drawStuckLetters() {
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      stuckLetters.forEach(function(s) {
        let displayChar = s.char;
        if (s.mangleLevel >= 3) displayChar = CRUMB_CHARS[Math.floor(Math.random() * CRUMB_CHARS.length)];
        else if (s.mangleLevel >= 2) displayChar = Math.random() > 0.5 ? s.char.toLowerCase() : s.char;
        fxCtx.save();
        fxCtx.translate(s.x, cy + s.offsetY);
        fxCtx.rotate(s.rotation * (1 + s.mangleLevel * 0.3));
        fxCtx.font = 'bold ' + (s.size + 3) + 'px monospace';
        fxCtx.fillStyle = foodColor(0.9);
        fxCtx.fillText(displayChar, 0, 0);
        fxCtx.restore();
      });
    }

    function drawCrumbs(dt) {
      crumbs.forEach(function(c) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += c.gravity * dt;
        c.life -= c.decay * dt;
        if (c.life > 0) {
          fxCtx.font = c.size + 'px monospace';
          fxCtx.fillStyle = 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + (c.alpha * Math.max(c.life, 0)) + ')';
          fxCtx.textAlign = 'center';
          fxCtx.fillText(c.char, c.x, c.y);
        }
      });
    }

    let lastNow = startTime;
    let lastChewIdx = -1;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

      // Phase 1: Jaws approach
      if (elapsed < approachDuration) {
        const t = elapsed / approachDuration;
        const ease = t * t;
        const topY = rect.top - 70 + ease * 60;
        const botY = rect.bottom + 70 - ease * 60;
        drawTeeth(topY, botY, rect.height + 140 - ease * 120, ease);
        requestAnimationFrame(frame);

      // Phase 2: Chewing
      } else if (elapsed < approachDuration + chewTotalDuration) {
        const chewElapsed = elapsed - approachDuration;
        const chewIdx = Math.floor(chewElapsed / chewCycleDuration);
        const chewPhase = (chewElapsed % chewCycleDuration) / chewCycleDuration;

        const closeOpen = chewPhase < 0.5
          ? Math.sin(chewPhase * Math.PI)
          : Math.sin(chewPhase * Math.PI) * 0.6;

        const maxGap = rect.height * 0.8;
        const minGap = 4;
        const baseGap = maxGap - (chewIdx / chewCount) * (maxGap - minGap) * 0.7;
        const jawGap = baseGap * (1 - closeOpen * 0.9) + minGap;
        const topY = cy - jawGap / 2;
        const botY = cy + jawGap / 2;

        if (chewIdx !== lastChewIdx) {
          lastChewIdx = chewIdx;
          stickLetter(chewIdx);
          FX.doScreenShake(false);
          FX.flashColor('rgba(200, 180, 100, 0.1)', 120);
        }

        const consumeProgress = (chewIdx + closeOpen) / chewCount;
        const clipTop = consumeProgress * 50;
        const clipBot = consumeProgress * 50;
        el.style.clipPath = 'inset(' + clipTop + '% 0 ' + clipBot + '% 0)';

        drawTeeth(topY, botY, jawGap, 0.9);
        drawStuckLetters();

        if (closeOpen > 0.8 && Math.random() > 0.4) {
          const side = Math.random() > 0.5 ? rect.left - 5 : rect.right + 5;
          spawnCrumbs(side, cy, 2 + Math.floor(Math.random() * 2));
        }
        if (Math.random() > 0.6) spawnCrumbs(rect.left + Math.random() * rect.width, botY + 5, 1);

        drawCrumbs(dt);

        if (shakeEnabled && closeOpen > 0.7) {
          app.style.transform = 'translate(' + ((Math.random() - 0.5) * 2) + 'px, ' + ((Math.random() - 0.5) * 2) + 'px)';
        }
        requestAnimationFrame(frame);

      // Phase 3: Swallow
      } else if (elapsed < approachDuration + chewTotalDuration + swallowDuration) {
        const t = (elapsed - approachDuration - chewTotalDuration) / swallowDuration;

        // Dotgrid: crater at the chomp point (fires once at swallow start)
        if (!eatenDotgridFired) {
          eatenDotgridFired = true;
          const intensity = ctx.intensity / 10;
          if (FX.doDotgridCrater) {
            FX.doDotgridCrater(cx, cy, lerp(40, 110, intensity), lerp(0.8, 1.8, intensity), {
              cracks: 5, crackLength: lerp(50, 130, intensity), healDelay: 2500
            });
          }
        }

        el.style.clipPath = 'inset(50% 0 50% 0)';
        FX.destroyCard(el);
        if (shakeEnabled) app.style.transform = '';

        const gulpBounce = Math.sin(t * Math.PI * 2) * 3 * (1 - t);
        drawTeeth(cy - 4 + gulpBounce, cy + 4 - gulpBounce, 8, 0.85 - t * 0.3);

        stuckLetters.forEach(function(s) {
          fxCtx.font = 'bold ' + ((s.size + 3) * (1 - t)) + 'px monospace';
          fxCtx.fillStyle = foodColor(0.8 * (1 - t));
          fxCtx.textAlign = 'center';
          fxCtx.fillText(s.char, s.x, cy + s.offsetY * (1 - t));
        });

        drawCrumbs(dt);
        requestAnimationFrame(frame);

      // Phase 4: Burp + retreat
      } else {
        const t = (elapsed - approachDuration - chewTotalDuration - swallowDuration) / burpDuration;

        const retreatY = t * t * 90;
        const alpha = Math.max(1 - t * 1.5, 0);
        if (alpha > 0.01) {
          drawTeeth(cy - 4 - retreatY, cy + 4 + retreatY, 8 + retreatY * 2, alpha * 0.7);
        }

        // Burp cloud
        if (t > 0.15 && t < 0.85) {
          const burpT = (t - 0.15) / 0.7;
          const burpChars = ['~', '"', '*', 'o', 'O', '.', '#', '%'];
          fxCtx.textAlign = 'center';
          for (let i = 0; i < FX.pCount(10); i++) {
            const spread = 30 + burpT * 40;
            const bx = cx + (Math.random() - 0.5) * spread;
            const by = cy - 15 - burpT * 50 + (Math.random() - 0.5) * 20;
            const bSize = 10 + burpT * 8;
            fxCtx.font = bSize + 'px monospace';
            fxCtx.fillStyle = Math.random() > 0.5
              ? 'rgba(100, 160, 60, ' + ((1 - burpT) * 0.6) + ')'
              : 'rgba(160, 140, 60, ' + ((1 - burpT) * 0.55) + ')';
            fxCtx.fillText(burpChars[Math.floor(Math.random() * burpChars.length)], bx, by);
          }
        }

        drawCrumbs(dt * 0.3);

        if (t >= 1) {
          fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
          el.style.clipPath = '';
          if (shakeEnabled) app.style.transform = '';
          FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
        } else {
          requestAnimationFrame(frame);
        }
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.clipPath = '';
    const app = getApp();
    app.style.transform = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  LIGHTNING -- Van Gogh-style thick ASCII bolt + swirling energy
// ═══════════════════════════════════════════════════════════════
export const lightningPlugin = {
  name: 'lightning',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Lightning', description: 'Van Gogh-style thick ASCII bolt with swirling energy', tags: ['bolt', 'electric', 'vangogh'] },
  params: {
    buildupDuration: { label: 'Buildup Duration', type: 'range', min: 200, max: 1200, default: 500, step: 50, unit: 'ms', group: 'timing' },
    crackDuration:   { label: 'Crack Duration',   type: 'range', min: 50,  max: 300,  default: 120, step: 10, unit: 'ms', group: 'timing' },
    scatterDuration: { label: 'Scatter Duration',  type: 'range', min: 600, max: 3000, default: 1400, step: 100, unit: 'ms', group: 'timing' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(lightningPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const cx = pos.cx, cy = pos.cy;
    const fxCtx = FX.getFxCtx();
    const startTime = performance.now();
    const W = fxCtx.canvas.width, H = fxCtx.canvas.height;

    const buildupDuration = p.buildupDuration;
    const crackDuration = p.crackDuration;
    const impactDuration = 100;
    const afterimageDuration = 300;
    const scatterDuration = p.scatterDuration;
    const totalDuration = buildupDuration + crackDuration + impactDuration + afterimageDuration + scatterDuration;

    const VG_YELLOW = [255, 230, 80];
    const VG_WHITE = [240, 245, 255];
    const VG_BLUE = [60, 100, 220];
    const VG_DEEPBLUE = [25, 40, 120];
    const VG_PURPLE = [120, 60, 200];
    const VG_CYAN = [100, 200, 255];

    const BOLT_CORE_CHARS = ['\u2588', '\u2593', '\u2592', '\u2503', '\u2502', '#', 'X', 'W'];
    const BOLT_GLOW_CHARS = ['\u2591', '\u00B7', '*', '+', '~', ':', ';'];
    const BOLT_EDGE_CHARS = ['/', '\\', '|', '\u2572', '\u2571', '\u2573'];

    // Generate main bolt path
    const mainBolt = [];
    let bx = cx + (Math.random() - 0.5) * 60;
    let by = -20;
    while (by < cy + 5) {
      const jag = (Math.random() - 0.5) * 70;
      const stepY = 10 + Math.random() * 18;
      mainBolt.push({ x: bx + jag, y: by + stepY });
      bx += jag;
      by += stepY;
    }

    // Branch bolts
    const branches = [];
    const branchCount = isMobile ? 2 : (3 + Math.floor(Math.random() * 3));
    for (let b = 0; b < branchCount; b++) {
      const forkIdx = 2 + Math.floor(Math.random() * (mainBolt.length - 4));
      const forkPt = mainBolt[forkIdx];
      const dir = Math.random() > 0.5 ? 1 : -1;
      const branch = [{ x: forkPt.x, y: forkPt.y }];
      let bbx = forkPt.x, bby = forkPt.y;
      const branchLen = 3 + Math.floor(Math.random() * 5);
      for (let s = 0; s < branchLen; s++) {
        bbx += dir * (15 + Math.random() * 25);
        bby += 8 + Math.random() * 15;
        branch.push({ x: bbx, y: bby });
      }
      branches.push({ points: branch, forkIdx: forkIdx });
    }

    function drawBoltSegment(x1, y1, x2, y2, alpha, widthScale) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(Math.ceil(len / (isMobile ? 12 : 8)), 2);
      const perpX = -dy / len, perpY = dx / len;
      const coreWidth = (isMobile ? 1.5 : 2.5) * widthScale;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = x1 + dx * t, py = y1 + dy * t;
        for (let w = -Math.floor(coreWidth); w <= Math.floor(coreWidth); w++) {
          const charX = px + perpX * w * 7 + (Math.random() - 0.5) * 2;
          const charY = py + perpY * w * 7 + (Math.random() - 0.5) * 2;
          const distFromCenter = Math.abs(w) / coreWidth;

          if (distFromCenter < 0.3) {
            const ch = BOLT_CORE_CHARS[Math.floor(Math.random() * 3)];
            fxCtx.font = 'bold ' + (12 + Math.random() * 4) + 'px monospace';
            fxCtx.fillStyle = 'rgba(' + (VG_WHITE[0] * 0.6 + VG_YELLOW[0] * 0.4) + ', ' + (VG_WHITE[1] * 0.6 + VG_YELLOW[1] * 0.4) + ', ' + (VG_WHITE[2] * 0.6 + VG_YELLOW[2] * 0.4) + ', ' + alpha + ')';
            fxCtx.fillText(ch, charX, charY);
          } else if (distFromCenter < 0.7) {
            const ch = BOLT_EDGE_CHARS[Math.floor(Math.random() * BOLT_EDGE_CHARS.length)];
            fxCtx.font = 'bold ' + (10 + Math.random() * 4) + 'px monospace';
            const blend = Math.random();
            fxCtx.fillStyle = 'rgba(' + (VG_BLUE[0] * blend + VG_PURPLE[0] * (1 - blend)) + ', ' + (VG_BLUE[1] * blend + VG_PURPLE[1] * (1 - blend)) + ', ' + (VG_BLUE[2] * blend + VG_PURPLE[2] * (1 - blend)) + ', ' + (alpha * 0.8) + ')';
            fxCtx.fillText(ch, charX, charY);
          } else {
            const ch = BOLT_GLOW_CHARS[Math.floor(Math.random() * BOLT_GLOW_CHARS.length)];
            fxCtx.font = (8 + Math.random() * 4) + 'px monospace';
            fxCtx.fillStyle = 'rgba(' + (VG_CYAN[0] * 0.5 + VG_BLUE[0] * 0.5) + ', ' + (VG_CYAN[1] * 0.5 + VG_BLUE[1] * 0.5) + ', ' + (VG_CYAN[2] * 0.5 + VG_BLUE[2] * 0.5) + ', ' + (alpha * 0.4) + ')';
            fxCtx.fillText(ch, charX, charY);
          }
        }
      }
    }

    function drawFullBolt(progress, alpha, widthScale) {
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      const mainShow = Math.floor(progress * mainBolt.length);
      for (let i = 0; i < mainShow - 1; i++) {
        drawBoltSegment(mainBolt[i].x, mainBolt[i].y, mainBolt[i + 1].x, mainBolt[i + 1].y, alpha, widthScale);
      }
      branches.forEach(function(br) {
        if (mainShow > br.forkIdx + 2) {
          const brProgress = Math.min((mainShow - br.forkIdx) / br.points.length, 1);
          const brShow = Math.floor(brProgress * br.points.length);
          for (let i = 0; i < brShow - 1; i++) {
            drawBoltSegment(br.points[i].x, br.points[i].y, br.points[i + 1].x, br.points[i + 1].y, alpha * 0.7, widthScale * 0.6);
          }
        }
      });
    }

    // Van Gogh swirls
    const swirls = [];
    const SWIRL_CHARS = ['@', 'O', 'o', 'S', '~', '\u2248', '*', '.', ';'];
    const swirlCount = isMobile ? 30 : 60;
    for (let i = 0; i < swirlCount; i++) {
      swirls.push({
        cx: cx + (Math.random() - 0.5) * W * 0.8,
        cy: cy * 0.5 + (Math.random() - 0.5) * H * 0.4,
        angle: Math.random() * Math.PI * 2,
        dist: 10 + Math.random() * 30,
        speed: 2 + Math.random() * 4,
        char: SWIRL_CHARS[Math.floor(Math.random() * SWIRL_CHARS.length)],
        size: 8 + Math.random() * 14,
        colorIdx: Math.floor(Math.random() * 4),
      });
    }

    // Scatter chars from card text
    const scatterChars = [];
    const cardText = getTaskText(el);
    for (let i = 0; i < cardText.length; i++) {
      if (cardText[i] === ' ') continue;
      scatterChars.push({
        char: cardText[i],
        x: rect.left + 40 + (i % 30) * 10,
        y: rect.top + 20 + Math.floor(i / 30) * 18,
        vx: (Math.random() - 0.5) * 500,
        vy: -150 - Math.random() * 350,
        rotation: 0, rotSpeed: (Math.random() - 0.5) * 25,
        alpha: 1, jitter: 5 + Math.random() * 12,
        burning: Math.random() > 0.5,
      });
    }

    let struck = false;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      fxCtx.clearRect(0, 0, W, H);

      // Phase 1: Buildup
      if (elapsed < buildupDuration) {
        const t = elapsed / buildupDuration;
        fxCtx.fillStyle = 'rgba(10, 10, 30, ' + (t * 0.3) + ')';
        fxCtx.fillRect(0, 0, W, H);

        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';
        const swirlShow = Math.floor(t * swirls.length);
        const colors = [VG_BLUE, VG_PURPLE, VG_YELLOW, VG_DEEPBLUE];
        for (let i = 0; i < swirlShow; i++) {
          const s = swirls[i];
          const a = s.angle + now * 0.001 * s.speed;
          const sx = s.cx + Math.cos(a) * s.dist;
          const sy = s.cy + Math.sin(a) * s.dist;
          const c = colors[s.colorIdx];
          fxCtx.font = s.size + 'px monospace';
          fxCtx.fillStyle = 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + (t * 0.25) + ')';
          fxCtx.fillText(s.char, sx, sy);
        }

        if (Math.random() > 0.6) el.style.opacity = String(0.5 + Math.random() * 0.5);
        if (t > 0.85 && Math.random() > 0.6) FX.flashColor('rgba(255, 255, 255, 0.15)', 40);
        requestAnimationFrame(frame);

      // Phase 2: Crack
      } else if (elapsed < buildupDuration + crackDuration) {
        const t = (elapsed - buildupDuration) / crackDuration;
        el.style.opacity = '1';
        fxCtx.fillStyle = 'rgba(10, 10, 30, 0.25)';
        fxCtx.fillRect(0, 0, W, H);

        const colors = [VG_BLUE, VG_PURPLE, VG_YELLOW, VG_DEEPBLUE];
        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';
        swirls.forEach(function(s) {
          const a = s.angle + now * 0.002 * s.speed;
          const c = colors[s.colorIdx];
          fxCtx.font = s.size + 'px monospace';
          fxCtx.fillStyle = 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', 0.3)';
          fxCtx.fillText(s.char, s.cx + Math.cos(a) * s.dist, s.cy + Math.sin(a) * s.dist);
        });

        const ease = t * t * (3 - 2 * t);
        drawFullBolt(ease, 1.0, 1.0);
        requestAnimationFrame(frame);

      // Phase 3: Impact
      } else if (elapsed < buildupDuration + crackDuration + impactDuration) {
        if (!struck) {
          struck = true;
          FX.flashColor('rgba(0, 0, 0, 1)', 25);
          setTimeout(function() { FX.flashColor('rgba(255, 250, 200, 0.95)', 120); }, 25);
          setTimeout(function() { FX.flashColor('rgba(' + VG_BLUE[0] + ', ' + VG_BLUE[1] + ', ' + VG_BLUE[2] + ', 0.4)', 200); }, 80);
          FX.doScreenShake(true);
          FX.destroyCard(el);

          // Dotgrid: nuclear blast at lightning strike point
          const intensity = ctx.intensity / 10;
          if (FX.doDotgridNuclear) {
            FX.doDotgridNuclear(cx, cy);
          }
          if (FX.doDotgridCrater) {
            FX.doDotgridCrater(cx, cy, lerp(50, 160, intensity), lerp(1.2, 2.5, intensity), {
              cracks: 6, crackLength: lerp(70, 200, intensity), healDelay: 3000
            });
          }
        }
        drawFullBolt(1.0, 1.0, 1.2);
        requestAnimationFrame(frame);

      // Phase 4: Afterimage
      } else if (elapsed < buildupDuration + crackDuration + impactDuration + afterimageDuration) {
        const phaseStart = buildupDuration + crackDuration + impactDuration;
        const t = (elapsed - phaseStart) / afterimageDuration;
        const flickerOn = Math.sin(t * Math.PI * 6) > 0;
        if (flickerOn) drawFullBolt(1.0, (1 - t) * 0.7, 0.8 - t * 0.3);
        requestAnimationFrame(frame);

      // Phase 5: Scatter
      } else {
        const phaseStart = buildupDuration + crackDuration + impactDuration + afterimageDuration;
        const t = (elapsed - phaseStart) / scatterDuration;
        const dt = 1 / 60;

        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';

        scatterChars.forEach(function(c) {
          c.vy += 400 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.rotation += c.rotSpeed * dt;
          c.alpha *= 0.985;
          if (c.alpha < 0.01) return;

          const jIntensity = c.jitter * Math.max(1 - t * 1.5, 0);
          const jx = Math.sin(now * 0.05 + c.jitter) * jIntensity;
          const jy = Math.cos(now * 0.07 + c.jitter) * jIntensity;

          fxCtx.save();
          fxCtx.translate(c.x + jx, c.y + jy);
          fxCtx.rotate(c.rotation);
          fxCtx.font = 'bold 13px monospace';
          if (c.burning) {
            const flicker = Math.random();
            const br = flicker > 0.5 ? VG_YELLOW : [255, 160, 40];
            fxCtx.fillStyle = 'rgba(' + br[0] + ', ' + br[1] + ', ' + br[2] + ', ' + c.alpha + ')';
          } else {
            const ec = Math.random() > 0.6 ? VG_CYAN : VG_WHITE;
            fxCtx.fillStyle = 'rgba(' + ec[0] + ', ' + ec[1] + ', ' + ec[2] + ', ' + c.alpha + ')';
          }
          fxCtx.fillText(c.char, 0, 0);
          fxCtx.restore();
        });

        if (t >= 1) {
          fxCtx.clearRect(0, 0, W, H);
          FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
        } else {
          requestAnimationFrame(frame);
        }
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.opacity = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  STEAMROLLER -- ASCII roller crushes card flat
// ═══════════════════════════════════════════════════════════════
export const steamrollerPlugin = {
  name: 'steamroller',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Steamroller', description: 'ASCII roller drives across and crushes card flat', tags: ['roller', 'crush', 'vehicle'] },
  params: {
    totalDuration: { label: 'Total Duration', type: 'range', min: 800, max: 4000, default: 1900, step: 100, unit: 'ms', group: 'timing' },
    dustLaunchSpeed: { label: 'Dust Launch Speed', type: 'range', min: 10, max: 120, default: 40, step: 5, unit: 'px/s', group: 'particles' },
    dustSpawnRate: { label: 'Dust Spawn Rate', type: 'range', min: 3, max: 20, default: 8, step: 1, unit: 'px', group: 'particles' },
    crackSpawnRate: { label: 'Crack Spawn Rate', type: 'range', min: 10, max: 60, default: 25, step: 5, unit: 'px', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 20, default: 8, step: 1, unit: '', group: 'particles' },
    dustGravity: { label: 'Dust Gravity', type: 'range', min: 20, max: 200, default: 60, step: 10, unit: 'px/s\u00B2', group: 'physics' },
    shakeIntensity: { label: 'Shake Intensity', type: 'range', min: 0.5, max: 5, default: 1.5, step: 0.25, unit: 'px', group: 'motion' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(steamrollerPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const cx = pos.cx, cy = pos.cy;
    const fxCtx = FX.getFxCtx();
    const app = getApp();
    const startTime = performance.now();
    const goRight = Math.random() > 0.5;
    const totalDuration = p.totalDuration;

    const dustParticles = [];
    const DUST_CHARS = ['.', ':', ';', "'", ',', '`', '*', '+', '~', '%'];
    const CRACK_CHARS = ['/', '\\', '|', '-', '=', '#', 'x', 'X'];
    const cracks = [];
    let dustAccum = 0, crackAccum = 0, prevRollerX = null;

    function spawnDust(x, y, count) {
      for (let i = 0; i < count; i++) {
        dustParticles.push({
          x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 10,
          vx: (goRight ? -1 : 1) * (20 + Math.random() * 60) + (Math.random() - 0.5) * 30,
          vy: -p.dustLaunchSpeed - Math.random() * (p.dustLaunchSpeed * 2),
          char: DUST_CHARS[Math.floor(Math.random() * DUST_CHARS.length)],
          size: (5 + Math.random() * 7) * p.particleSize / 8, alpha: 0.4 + Math.random() * 0.4,
          gravity: p.dustGravity + Math.random() * 40, life: 1.0, decay: 0.6 + Math.random() * 0.6,
        });
      }
    }

    const ROLLER_DRUM = ['|@@@@@@@@@@|', '|@@@@@@@@@@|', '|@@@@@@@@@@|'];
    const ROLLER_CAB_R = ['  .---.', '  |___|', '__|   |'];
    const ROLLER_CAB_L = ['.---.', '|___|', '|   |__'];
    const exhaustPuffs = [];
    const PUFF_CHARS = ['"', '~', '*', '`', '.', ':'];
    let exhaustAccum = 0;

    const edgeStart = goRight ? rect.left : rect.right;
    const offscreenStart = goRight ? rect.left - 180 : rect.right + 180;
    const offscreenEnd = goRight ? rect.right + 180 : rect.left - 180;
    const cardEdgeNear = goRight ? rect.left - 20 : rect.right + 20;
    const cardEdgeFar = goRight ? rect.right + 20 : rect.left - 20;

    function getRollerX(t) {
      if (t <= 0.10) {
        const prog = t / 0.10;
        return offscreenStart + (cardEdgeNear - offscreenStart) * (prog * prog * prog);
      } else if (t <= 0.80) {
        const prog = (t - 0.10) / 0.70;
        return cardEdgeNear + (cardEdgeFar - cardEdgeNear) * prog;
      } else if (t <= 0.95) {
        const prog = (t - 0.80) / 0.15;
        return cardEdgeFar + (offscreenEnd - cardEdgeFar) * (1 - (1 - prog) * (1 - prog) * (1 - prog));
      }
      return offscreenEnd;
    }

    // Dotgrid: scorch trail along the roller's crush path
    const intensity = ctx.intensity / 10;
    if (FX.doDotgridScorch) {
      const scorchY = rect.bottom - 3;
      FX.doDotgridScorch(rect.left - 20, scorchY, rect.right + 20, scorchY, lerp(30, 80, intensity));
    }

    const crushedTopPct = 100 - (6 / rect.height) * 100;
    let lastNow = startTime, flashFired = false, totalPixelsTraveled = 0;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      const t = Math.min(elapsed / totalDuration, 1);

      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

      const rollerX = getRollerX(t);
      if (prevRollerX !== null) totalPixelsTraveled += Math.abs(rollerX - prevRollerX);

      // Card crushing
      if (t >= 0.10 && t <= 0.95) {
        const rollerOnCard = Math.max(0, Math.min(1,
          goRight ? (rollerX - rect.left) / rect.width : (rect.right - rollerX) / rect.width
        ));

        if (t <= 0.80) {
          if (goRight) {
            const splitPct = rollerOnCard * 100;
            el.style.clipPath = 'polygon(0% ' + crushedTopPct + '%,' + splitPct + '% ' + crushedTopPct + '%,' + splitPct + '% 0%,100% 0%,100% 100%,0% 100%)';
          } else {
            const splitPct = (1 - rollerOnCard) * 100;
            el.style.clipPath = 'polygon(0% 0%,' + splitPct + '% 0%,' + splitPct + '% ' + crushedTopPct + '%,100% ' + crushedTopPct + '%,100% 100%,0% 100%)';
          }
          if (FX.fxEnabled('shake')) {
            const rx = Math.sin(now * 0.013) * p.shakeIntensity;
            const ry = Math.sin(now * 0.017 + 1.5) * (p.shakeIntensity * 0.5);
            app.style.transform = 'translate(' + rx + 'px, ' + ry + 'px)';
          }
          if (!flashFired && rollerOnCard > 0.01) {
            flashFired = true;
            FX.flashColor('rgba(200, 200, 220, 0.15)', 150);
          }

          const pixelsThisFrame = prevRollerX !== null ? Math.abs(rollerX - prevRollerX) : 0;
          dustAccum += pixelsThisFrame;
          while (dustAccum >= p.dustSpawnRate) {
            dustAccum -= p.dustSpawnRate;
            spawnDust(rollerX, rect.bottom - 5 + (Math.random() - 0.5) * rect.height * 0.3, 1);
          }
          crackAccum += pixelsThisFrame;
          while (crackAccum >= p.crackSpawnRate) {
            crackAccum -= p.crackSpawnRate;
            const crackX = goRight
              ? rect.left + Math.random() * Math.max(rollerX - rect.left, 1)
              : rollerX + Math.random() * Math.max(rect.right - rollerX, 1);
            cracks.push({
              x: crackX, y: rect.bottom - 2 + (Math.random() - 0.5) * 6,
              char: CRACK_CHARS[Math.floor(Math.random() * CRACK_CHARS.length)],
              size: 6 + Math.random() * 5, alpha: 0.3 + Math.random() * 0.2,
            });
          }
        } else {
          el.style.clipPath = 'polygon(0% ' + crushedTopPct + '%,100% ' + crushedTopPct + '%,100% 100%,0% 100%)';
          if (FX.fxEnabled('shake')) app.style.transform = '';
        }
      }

      if (t > 0.95) {
        const fadeT = (t - 0.95) / 0.05;
        el.style.opacity = String(Math.max(1 - fadeT * 2, 0));
        if (FX.fxEnabled('shake')) app.style.transform = '';
      }

      prevRollerX = rollerX;

      if (t >= 1) {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        if (FX.fxEnabled('shake')) app.style.transform = '';
        el.style.clipPath = '';
        el.style.transform = '';
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
        return;
      }

      // Draw ASCII roller + effects
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';

      fxCtx.font = 'bold 14px monospace';
      ROLLER_DRUM.forEach(function(line, i) {
        fxCtx.fillStyle = 'rgba(180, 180, 200, 0.9)';
        fxCtx.fillText(line, rollerX, rect.bottom - 20 + i * 14);
      });

      const spinPhase = totalPixelsTraveled / 15;
      const spinChars = ['/', '-', '\\', '|'];
      fxCtx.font = '10px monospace';
      fxCtx.fillStyle = 'rgba(140, 140, 160, 0.5)';
      for (let i = 0; i < 5; i++) {
        const sx = rollerX - 30 + i * 15;
        fxCtx.fillText(spinChars[Math.floor(spinPhase + i) % 4], sx, rect.bottom - 20);
      }

      const cabLines = goRight ? ROLLER_CAB_R : ROLLER_CAB_L;
      const cabOffsetX = goRight ? 55 : -55;
      fxCtx.font = 'bold 12px monospace';
      cabLines.forEach(function(line, i) {
        fxCtx.fillStyle = 'rgba(200, 180, 60, ' + (0.8 - i * 0.1) + ')';
        fxCtx.fillText(line, rollerX + cabOffsetX, rect.bottom - 46 + i * 14);
      });

      fxCtx.font = '10px monospace';
      fxCtx.fillStyle = 'rgba(150, 150, 170, 0.7)';
      fxCtx.fillText('==||==', rollerX + (goRight ? 25 : -25), rect.bottom - 6);

      // Exhaust puffs
      if (t >= 0.10 && t <= 0.80) {
        exhaustAccum += dt;
        while (exhaustAccum >= 0.08) {
          exhaustAccum -= 0.08;
          exhaustPuffs.push({
            x: rollerX + cabOffsetX + (goRight ? 10 : -10) + (Math.random() - 0.5) * 6,
            y: rect.bottom - 58, vx: (Math.random() - 0.5) * 8, vy: -15 - Math.random() * 20,
            char: PUFF_CHARS[Math.floor(Math.random() * PUFF_CHARS.length)],
            size: 6 + Math.random() * 5, alpha: 0.3, life: 1.0, decay: 0.8,
          });
        }
      }
      exhaustPuffs.forEach(function(ep) {
        ep.x += ep.vx * dt;
        ep.y += ep.vy * dt;
        ep.size += dt * 3;
        ep.life -= ep.decay * dt;
        if (ep.life > 0) {
          fxCtx.font = ep.size + 'px monospace';
          fxCtx.fillStyle = 'rgba(160, 160, 180, ' + (ep.alpha * Math.max(ep.life, 0)) + ')';
          fxCtx.fillText(ep.char, ep.x, ep.y);
        }
      });

      // Ground line
      fxCtx.font = '8px monospace';
      fxCtx.fillStyle = 'rgba(100, 100, 120, 0.3)';
      for (let x = rect.left - 20; x < rect.right + 20; x += 6) {
        fxCtx.fillText('_', x, rect.bottom + 4);
      }

      // Cracks
      cracks.forEach(function(c) {
        fxCtx.font = c.size + 'px monospace';
        fxCtx.fillStyle = 'rgba(200, 200, 215, ' + c.alpha + ')';
        fxCtx.fillText(c.char, c.x, c.y);
      });

      // Dust
      dustParticles.forEach(function(dp) {
        dp.x += dp.vx * dt;
        dp.y += dp.vy * dt;
        dp.vy += dp.gravity * dt;
        dp.life -= dp.decay * dt;
        if (dp.life > 0) {
          fxCtx.font = dp.size + 'px monospace';
          fxCtx.fillStyle = 'rgba(180, 180, 200, ' + (dp.alpha * Math.max(dp.life, 0)) + ')';
          fxCtx.fillText(dp.char, dp.x, dp.y);
        }
      });

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.clipPath = '';
    el.style.transform = '';
    el.style.opacity = '';
    const app = getApp();
    app.style.transform = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  PIRANHAS -- ASCII fish swarm, bite card edges, blood splatter
// ═══════════════════════════════════════════════════════════════
export const piranhasPlugin = {
  name: 'piranhas',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Piranhas', description: 'ASCII fish swarm bites card edges with blood splatter', tags: ['fish', 'swarm', 'bite'] },
  params: {
    swarmInDuration: { label: 'Swarm-in Time', type: 'range', min: 100, max: 800, default: 300, step: 50, unit: 'ms', group: 'timing' },
    frenzyDuration: { label: 'Frenzy Duration', type: 'range', min: 600, max: 3500, default: 1500, step: 100, unit: 'ms', group: 'timing' },
    disperseDuration: { label: 'Disperse Time', type: 'range', min: 150, max: 1000, default: 400, step: 50, unit: 'ms', group: 'timing' },
    fishCount: { label: 'Fish Count', type: 'range', min: 5, max: 60, default: 30, step: 1, unit: '', group: 'particles' },
    particleSize: { label: 'Particle Size', type: 'range', min: 2, max: 30, default: 12, step: 1, unit: '', group: 'particles' },
    fishSpeed: { label: 'Fish Speed', type: 'range', min: 150, max: 800, default: 400, step: 25, unit: 'px/s', group: 'motion' },
    biteSpeed: { label: 'Bite Speed', type: 'range', min: 10, max: 80, default: 35, step: 1, unit: '', group: 'physics' },
    edgeSegments: { label: 'Edge Segments', type: 'range', min: 6, max: 24, default: 12, step: 1, unit: '', group: 'visual' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(piranhasPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const cx = pos.cx, cy = pos.cy;
    const fxCtx = FX.getFxCtx();
    const app = getApp();
    const startTime = performance.now();

    const swarmInDuration = p.swarmInDuration;
    const frenzyDuration = p.frenzyDuration;
    const disperseDuration = p.disperseDuration;
    const totalDuration = swarmInDuration + frenzyDuration + disperseDuration;

    const FISH_R = ['><>', '><}', '>o>', '>*>', '>{>', '>=>'];
    const FISH_L = ['<><', '{><', '<o<', '<*<', '<{<', '<=<'];
    const BLOOD_ASCII = ['\u2022', '\u00B7', '\u2219', '\u2591', '\u2592', '#', '%', '*', 'x', ';'];

    const EDGE_SEGMENTS = p.edgeSegments;
    const biteDepth = {
      top: new Array(EDGE_SEGMENTS).fill(0),
      right: new Array(EDGE_SEGMENTS).fill(0),
      bottom: new Array(EDGE_SEGMENTS).fill(0),
      left: new Array(EDGE_SEGMENTS).fill(0),
    };

    const fishCount = isMobile ? Math.max(5, Math.round(p.fishCount / 2)) : p.fishCount;
    const fish = [];
    for (let i = 0; i < fishCount; i++) {
      const angle = (i / fishCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 150 + Math.random() * 200;
      fish.push({
        x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
        homeAngle: angle, speed: p.fishSpeed + Math.random() * 300,
        size: (10 + Math.random() * 5) * p.particleSize / 12,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleFreq: 0.008 + Math.random() * 0.006,
        alpha: 0.8 + Math.random() * 0.2,
        facingRight: Math.cos(angle) < 0,
        biteTimer: 0,
        edgeSide: Math.floor(Math.random() * 4),
        edgePos: Math.random(),
      });
    }

    const bloodDrops = [];
    const debris = [];
    let piranhasDotgridTimer = 0;
    let piranhasDotgridCount = 0;

    function buildClipPath() {
      const pts = [];
      const s = EDGE_SEGMENTS;
      for (let i = 0; i <= s; i++) {
        const x = (i / s) * 100;
        const depth = i < s ? biteDepth.top[i] : biteDepth.top[s - 1];
        pts.push(x + '% ' + depth + '%');
      }
      for (let i = 0; i <= s; i++) {
        const y = (i / s) * 100;
        const depth = i < s ? biteDepth.right[i] : biteDepth.right[s - 1];
        pts.push((100 - depth) + '% ' + y + '%');
      }
      for (let i = s; i >= 0; i--) {
        const x = (i / s) * 100;
        const depth = i < s ? biteDepth.bottom[i] : biteDepth.bottom[s - 1];
        pts.push(x + '% ' + (100 - depth) + '%');
      }
      for (let i = s; i >= 0; i--) {
        const y = (i / s) * 100;
        const depth = i < s ? biteDepth.left[i] : biteDepth.left[s - 1];
        pts.push(depth + '% ' + y + '%');
      }
      return 'polygon(' + pts.join(', ') + ')';
    }

    function edgePosition(side, segIdx) {
      const t = (segIdx + 0.5) / EDGE_SEGMENTS;
      switch (side) {
        case 0: return { x: rect.left + t * rect.width, y: rect.top };
        case 1: return { x: rect.right, y: rect.top + t * rect.height };
        case 2: return { x: rect.left + t * rect.width, y: rect.bottom };
        case 3: return { x: rect.left, y: rect.top + t * rect.height };
      }
    }

    function spawnBlood(x, y, count) {
      for (let i = 0; i < count; i++) {
        bloodDrops.push({
          x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 60,
          char: BLOOD_ASCII[Math.floor(Math.random() * BLOOD_ASCII.length)],
          size: 6 + Math.random() * 10, alpha: 0.7 + Math.random() * 0.3,
          gravity: 80 + Math.random() * 40, life: 1.0, decay: 0.2 + Math.random() * 0.3,
        });
      }
    }

    let lastNow = startTime;

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);

      // Phase 1: Swarm in
      if (elapsed < swarmInDuration) {
        const t = elapsed / swarmInDuration;
        const ease = t * t * (3 - 2 * t);

        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';
        fish.forEach(function(f) {
          const target = edgePosition(f.edgeSide, Math.floor(f.edgePos * EDGE_SEGMENTS));
          const startX = cx + Math.cos(f.homeAngle) * 250;
          const startY = cy + Math.sin(f.homeAngle) * 250;
          f.x = startX + (target.x - startX) * ease;
          f.y = startY + (target.y - startY) * ease;
          const wobX = Math.sin(now * f.wobbleFreq + f.wobblePhase) * 4;
          const wobY = Math.cos(now * f.wobbleFreq * 1.3 + f.wobblePhase) * 3;
          const heading = (target.x - f.x) >= 0;
          const charSet = heading ? FISH_R : FISH_L;
          fxCtx.font = 'bold ' + f.size + 'px monospace';
          fxCtx.fillStyle = 'rgba(255, 140, 40, ' + (f.alpha * ease) + ')';
          fxCtx.fillText(charSet[Math.floor(Math.random() * charSet.length)], f.x + wobX, f.y + wobY);
        });
        requestAnimationFrame(frame);

      // Phase 2: Feeding frenzy
      } else if (elapsed < swarmInDuration + frenzyDuration) {
        const frenzyElapsed = elapsed - swarmInDuration;
        const t = frenzyElapsed / frenzyDuration;
        const maxDepthVal = 15 + t * 40;

        if (FX.fxEnabled('shake') && Math.random() > 0.6) {
          const intensity = 1 + t * 3;
          app.style.transform = 'translate(' + ((Math.random() - 0.5) * intensity) + 'px, ' + ((Math.random() - 0.5) * intensity) + 'px)';
        }

        el.style.opacity = String(Math.max(1 - t * 1.2, 0));

        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';
        const sides = ['top', 'right', 'bottom', 'left'];

        fish.forEach(function(f, fi) {
          const segIdx = Math.floor(f.edgePos * EDGE_SEGMENTS) % EDGE_SEGMENTS;
          const sideKey = sides[f.edgeSide];
          const target = edgePosition(f.edgeSide, segIdx);

          f.biteTimer += dt;
          const bitePhase = Math.sin(f.biteTimer * (4 + fi % 3));
          const isBiting = bitePhase > 0.7;

          const orbitR = isBiting ? 2 : (15 + Math.sin(now * 0.003 + fi) * 8);
          const orbitAngle = now * 0.004 + fi * 0.7;
          f.x = target.x + Math.cos(orbitAngle) * orbitR;
          f.y = target.y + Math.sin(orbitAngle) * orbitR;

          if (isBiting && biteDepth[sideKey][segIdx] < maxDepthVal) {
            const bitePower = (0.8 + Math.random() * 0.5) * dt * p.biteSpeed;
            biteDepth[sideKey][segIdx] = Math.min(biteDepth[sideKey][segIdx] + bitePower, maxDepthVal);
            if (segIdx > 0) biteDepth[sideKey][segIdx - 1] = Math.min(biteDepth[sideKey][segIdx - 1] + bitePower * 0.3, maxDepthVal);
            if (segIdx < EDGE_SEGMENTS - 1) biteDepth[sideKey][segIdx + 1] = Math.min(biteDepth[sideKey][segIdx + 1] + bitePower * 0.3, maxDepthVal);
            if (Math.random() > 0.5) spawnBlood(target.x, target.y, 2 + Math.floor(Math.random() * 3));
            if (Math.random() > 0.95) { f.edgeSide = Math.floor(Math.random() * 4); f.edgePos = Math.random(); }
          }

          const wobX = Math.sin(now * f.wobbleFreq + f.wobblePhase) * 3;
          const wobY = Math.cos(now * f.wobbleFreq * 1.3 + f.wobblePhase) * 2;
          const heading = (cx - f.x) >= 0;
          const charSet = heading ? FISH_R : FISH_L;
          const charIdx = isBiting ? (Math.floor(now * 0.02) % charSet.length) : 0;
          const r = isBiting ? 255 : 255;
          const g = isBiting ? 80 : 150;
          const b = isBiting ? 30 : 50;
          fxCtx.font = 'bold ' + f.size + 'px monospace';
          fxCtx.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + f.alpha + ')';
          fxCtx.fillText(charSet[charIdx], f.x + wobX, f.y + wobY);
        });

        el.style.clipPath = buildClipPath();

        bloodDrops.forEach(function(b) {
          b.x += b.vx * dt; b.y += b.vy * dt; b.vy += b.gravity * dt; b.life -= b.decay * dt;
          if (b.life > 0) {
            fxCtx.font = b.size + 'px monospace';
            fxCtx.fillStyle = 'rgba(180, 0, 20, ' + (b.alpha * Math.max(b.life, 0)) + ')';
            fxCtx.fillText(b.char, b.x, b.y);
          }
        });

        // Dotgrid: small craters at bite points during frenzy
        piranhasDotgridTimer += dt;
        if (piranhasDotgridTimer > 0.4 && piranhasDotgridCount < 5) {
          piranhasDotgridTimer = 0;
          piranhasDotgridCount++;
          const intensity = ctx.intensity / 10;
          const biteEdge = Math.floor(Math.random() * 4);
          const biteSeg = Math.floor(Math.random() * EDGE_SEGMENTS);
          const bitePos = edgePosition(biteEdge, biteSeg);
          if (FX.doDotgridCrater) {
            FX.doDotgridCrater(bitePos.x, bitePos.y, lerp(25, 60, intensity), lerp(0.5, 1.2, intensity), {
              cracks: 3, crackLength: lerp(20, 50, intensity), healDelay: 2000
            });
          }
        }

        if (t > 0.3 && t < 0.35) FX.flashColor('rgba(180, 0, 20, 0.15)', 200);
        if (t > 0.6 && t < 0.65) FX.flashColor('rgba(180, 0, 20, 0.1)', 150);
        requestAnimationFrame(frame);

      // Phase 3: Disperse
      } else if (elapsed < totalDuration) {
        const disperseElapsed = elapsed - swarmInDuration - frenzyDuration;
        const t = disperseElapsed / disperseDuration;

        FX.destroyCard(el);
        if (FX.fxEnabled('shake')) app.style.transform = '';

        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';

        fish.forEach(function(f) {
          const fleeAngle = Math.atan2(f.y - cy, f.x - cx);
          f.x += Math.cos(fleeAngle) * f.speed * dt * 1.5;
          f.y += Math.sin(fleeAngle) * f.speed * dt * 1.5;
          const fadeAlpha = f.alpha * (1 - t);
          if (fadeAlpha > 0.01) {
            const charSet = Math.cos(fleeAngle) >= 0 ? FISH_R : FISH_L;
            fxCtx.font = 'bold ' + f.size + 'px monospace';
            fxCtx.fillStyle = 'rgba(255, 150, 50, ' + fadeAlpha + ')';
            fxCtx.fillText(charSet[0], f.x, f.y);
          }
        });

        bloodDrops.forEach(function(b) {
          b.x += b.vx * dt * 0.5; b.y += b.vy * dt * 0.5; b.vy += b.gravity * dt * 0.3;
          b.life -= (b.decay * 1.5) * dt;
          if (b.life > 0) {
            fxCtx.font = b.size + 'px monospace';
            fxCtx.fillStyle = 'rgba(120, 0, 15, ' + (b.alpha * Math.max(b.life, 0) * (1 - t * 0.8)) + ')';
            fxCtx.fillText(b.char, b.x, b.y);
          }
        });

        requestAnimationFrame(frame);
      } else {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        if (FX.fxEnabled('shake')) app.style.transform = '';
        el.style.clipPath = '';
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.clipPath = '';
    el.style.opacity = '';
    const app = getApp();
    app.style.transform = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  WOODCHIPPER -- card feeds to edge, ASCII chunks spray out
// ═══════════════════════════════════════════════════════════════
export const woodchipperPlugin = {
  name: 'woodchipper',
  category: 'destroy',
  style: 'death',
  meta: { label: 'Woodchipper', description: 'Card feeds into chipper machine, ASCII chunks spray out', tags: ['chipper', 'spray', 'machine'] },
  params: {
    feedDuration: { label: 'Feed Duration', type: 'range', min: 300, max: 3000, default: 1000, step: 50, unit: 'ms', group: 'timing' },
    afterDuration: { label: 'After Duration', type: 'range', min: 200, max: 2000, default: 800, step: 50, unit: 'ms', group: 'timing' },
    sprayCount: { label: 'Spray Count', type: 'range', min: 1, max: 8, default: 3, step: 1, unit: '', group: 'particles' },
    chunkSize: { label: 'Chunk Size', type: 'range', min: 4, max: 20, default: 9, step: 1, unit: 'px', group: 'visual' },
    spraySpeed: { label: 'Spray Speed', type: 'range', min: 50, max: 600, default: 250, step: 10, unit: 'px/s', group: 'physics' },
    gravity: { label: 'Gravity', type: 'range', min: 100, max: 800, default: 400, step: 10, unit: 'px/s\u00B2', group: 'physics' },
  },
  requires: ['FX'],
  play: function(el, ctx) {
    const isMobile = FX.isMobile;
    const p = FX.resolveParams(woodchipperPlugin.params, ctx.params);
    const pos = FX.prepareCard(el);
    const rect = pos.rect;
    const cy = pos.cy;
    const fxCtx = FX.getFxCtx();
    const app = getApp();
    const startTime = performance.now();
    const feedDuration = p.feedDuration;
    const afterDuration = p.afterDuration;
    const totalDuration = feedDuration + afterDuration;

    // Dotgrid: scorch trail from card to chipper + crater at feed point
    const intensity = ctx.intensity / 10;
    const chipperX = (typeof window !== 'undefined' ? window.innerWidth : 1920) - 10;
    if (FX.doDotgridScorch) {
      FX.doDotgridScorch(rect.right, cy, chipperX, cy, lerp(30, 70, intensity));
    }
    if (FX.doDotgridCrater) {
      FX.doDotgridCrater(chipperX - 40, cy, lerp(40, 100, intensity), lerp(0.8, 1.5, intensity), {
        cracks: 5, crackLength: lerp(40, 100, intensity), healDelay: 2500
      });
    }

    const chunks = [];
    const CHUNK_CHARS = ['#', '@', '%', '*', '&', 'X', 'W', '\u2588', '\u2593', '\u2592', '\u2591'];

    function frame(now) {
      FX.tickFrame();
      const elapsed = now - startTime;
      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
      const viewW = (typeof window !== 'undefined' ? window.innerWidth : 1920);
      const viewH = (typeof window !== 'undefined' ? window.innerHeight : 1080);

      if (elapsed < feedDuration) {
        const t = elapsed / feedDuration;

        // Slide card to right edge
        const slideX = t * (viewW - rect.left + 50);
        el.style.transform = 'translateX(' + slideX + 'px)';
        const clipRight = Math.max(0, t * 120 - 20);
        el.style.clipPath = 'inset(0 ' + clipRight + '% 0 0)';

        // Chipper machine
        const chipperX = viewW - 10;
        fxCtx.font = 'bold 20px monospace';
        fxCtx.textAlign = 'right';
        fxCtx.textBaseline = 'middle';
        fxCtx.fillStyle = 'rgba(150, 150, 160, 0.7)';
        fxCtx.fillText('[\u2588\u2588\u2588\u2588]', chipperX, cy - 15);
        fxCtx.fillText('[\u2588\u2588\u2588\u2588]', chipperX, cy + 15);
        const grindOffset = Math.sin(now * 0.03) * 3;
        fxCtx.fillText('\u256B\u256B\u256B\u256B\u256B\u256B', chipperX - 50, cy + grindOffset);

        // Spray chunks
        if (t > 0.1 && Math.random() > 0.3) {
          const sprayCount = isMobile ? Math.max(1, p.sprayCount - 1) : p.sprayCount;
          for (let i = 0; i < sprayCount; i++) {
            chunks.push({
              x: viewW - 80, y: cy + (Math.random() - 0.5) * 20,
              vx: -(p.spraySpeed * 0.8) - Math.random() * (p.spraySpeed * 1.2), vy: -(p.spraySpeed * 0.6) - Math.random() * (p.spraySpeed * 0.8),
              char: CHUNK_CHARS[Math.floor(Math.random() * CHUNK_CHARS.length)],
              size: p.chunkSize - 3 + Math.random() * (p.chunkSize + 3), alpha: 0.7 + Math.random() * 0.3,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 15,
              colorR: 150 + Math.floor(Math.random() * 100),
              colorG: 150 + Math.floor(Math.random() * 100),
              colorB: 150 + Math.floor(Math.random() * 100),
            });
          }
        }

        if (Math.random() > 0.7 && FX.fxEnabled('shake')) {
          app.style.transform = 'translate(' + ((Math.random() - 0.5) * 2) + 'px, ' + ((Math.random() - 0.5) * 2) + 'px)';
        }
      } else {
        FX.destroyCard(el);
        if (FX.fxEnabled('shake')) app.style.transform = '';
      }

      // Draw chunks
      const dt = 1 / 60;
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';
      chunks.forEach(function(c) {
        c.vy += p.gravity * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rotation += c.rotSpeed * dt;
        c.alpha *= 0.995;
        if (c.alpha < 0.01 || c.y > viewH + 50) return;
        fxCtx.save();
        fxCtx.translate(c.x, c.y);
        fxCtx.rotate(c.rotation);
        fxCtx.font = c.size + 'px monospace';
        fxCtx.fillStyle = 'rgba(' + c.colorR + ', ' + c.colorG + ', ' + c.colorB + ', ' + c.alpha + ')';
        fxCtx.fillText(c.char, 0, 0);
        fxCtx.restore();
      });

      if (elapsed < totalDuration) {
        requestAnimationFrame(frame);
      } else {
        fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
        el.style.transform = '';
        el.style.clipPath = '';
        if (FX.fxEnabled('shake')) app.style.transform = '';
        FX.finalize(el, { intensity: ctx.intensity, speed: ctx.speed, fx: ctx.fx, onDone: ctx.onDone, params: ctx.params });
      }
    }
    requestAnimationFrame(frame);
  },
  cleanup: function(el) {
    el.style.transform = '';
    el.style.clipPath = '';
    const app = getApp();
    app.style.transform = '';
  },
};

// ═══════════════════════════════════════════════════════════════
//  Plugin registration
// ═══════════════════════════════════════════════════════════════

const allVariants = {
  explode: explodePlugin,
  incinerate: incineratePlugin,
  shredder: shredderPlugin,
  guillotine: guillotinePlugin,
  heartbeat: heartbeatPlugin,
  sniper: sniperPlugin,
  eaten: eatenPlugin,
  lightning: lightningPlugin,
  steamroller: steamrollerPlugin,
  piranhas: piranhasPlugin,
  woodchipper: woodchipperPlugin,
};

/**
 * Install all death animation variants into a registry.
 *
 * @param {Object} registry - An AnimationRegistry instance with registerCategory().
 */
export function install(registry) {
  registry.registerCategory('destroy', 'death', allVariants);
}

export const deathPlugin = {
  name: 'death',
  install: install,
};

export default deathPlugin;
