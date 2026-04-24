/**
 * @module in-progress
 * @description Persist animations -- 10 persistent loop animation variants.
 *
 * Each variant is a plugin with:
 *   - play(el, ctx): Start the persistent animation. Never calls ctx.onDone().
 *   - cleanup(el): Stop and fully restore the element.
 *   - params: Tunable parameter descriptors.
 *
 * Two style groups:
 *   - ambient (CSS-first, 5): glow, pulse, colored-border, shimmer, breathing
 *   - rich (RAF-based, 5): snake-border, particle-orbit, corner-accents, heartbeat, progress-bar
 *
 * Usage (ESM):
 *   import { inProgressPlugin } from 'toto-fx/plugins/in-progress';
 *   engine.use(inProgressPlugin);
 *
 * Usage (individual variants):
 *   import { glowPlugin, snakeBorderPlugin } from 'toto-fx/plugins/in-progress';
 */

// ── Determinism primitives (wired by install() in render mode) ─
//
// Defaults are raw browser APIs — live-mode behavior is identical to
// pre-migration code. When `install(engine)` receives an engine with
// `engine.raf` etc., these are rebound to route through the engine's
// scheduler, making the shared ticker render-mode-aware.

let _rafFn = (cb) => requestAnimationFrame(cb);
let _cancelRafFn = (token) => cancelAnimationFrame(token);

// ── Inject CSS keyframes ──────────────────────────────────────

let _styleInjected = false;

function _injectStyles() {
  if (_styleInjected) return;
  if (typeof document === 'undefined') return;
  _styleInjected = true;

  const styleEl = document.createElement('style');
  styleEl.id = 'tfx-persist-css';
  styleEl.textContent = [
    /* glow */
    '@keyframes tfx-persist-glow{0%,100%{box-shadow:0 0 8px 2px var(--tfx-persist-color,var(--accent,#C45A3C))}50%{box-shadow:0 0 20px 6px var(--tfx-persist-color,var(--accent,#C45A3C))}}',
    '.tfx-persist-glow{animation:tfx-persist-glow var(--tfx-persist-speed,2s) ease-in-out infinite;transition-property:background,border-color;will-change:box-shadow;contain:layout style}',

    /* pulse */
    '@keyframes tfx-persist-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}',
    '.tfx-persist-pulse{animation:tfx-persist-pulse var(--tfx-persist-speed,2s) ease-in-out infinite}',

    /* colored-border — exclude border-color from transitions so animation wins */
    '@keyframes tfx-persist-border{0%{border-color:var(--tfx-persist-c1,#C45A3C)}33%{border-color:var(--tfx-persist-c2,#6aab8e)}66%{border-color:var(--tfx-persist-c3,#6da3b8)}100%{border-color:var(--tfx-persist-c1,#C45A3C)}}',
    '.tfx-persist-colored-border{animation:tfx-persist-border var(--tfx-persist-speed,3s) linear infinite;border:2px solid var(--tfx-persist-c1,#C45A3C);transition-property:background,box-shadow}',

    /* shimmer */
    '@keyframes tfx-persist-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}',
    '.tfx-persist-shimmer{position:relative;overflow:hidden}',
    '.tfx-persist-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%);background-size:200% 100%;animation:tfx-persist-shimmer var(--tfx-persist-speed,2s) linear infinite;pointer-events:none;z-index:1}',

    /* breathing */
    '@keyframes tfx-persist-breathing{0%,100%{opacity:var(--tfx-persist-opacity-max,1)}50%{opacity:var(--tfx-persist-opacity-min,0.85)}}',
    '.tfx-persist-breathing{animation:tfx-persist-breathing var(--tfx-persist-speed,2.5s) ease-in-out infinite}',

    /* fade-out utility */
    '.tfx-persist-fading{transition:opacity 150ms ease-out,box-shadow 150ms ease-out,border-color 150ms ease-out,transform 150ms ease-out}',
  ].join('\n');
  document.head.appendChild(styleEl);
}

// ── Helpers ────────────────────────────────────────────────────

function getSpeedVar(speed) {
  const base = 2;
  return (base / speed) + 's';
}

// ══════════════════════════════════════════════════════════════
//  SHARED RAF LOOP
// ══════════════════════════════════════════════════════════════

/**
 * Shared RAF loop for all rich persist variants.
 * Consolidates per-item RAF loops into one scheduler tick.
 *
 * @namespace InProgressTicker
 */
export const InProgressTicker = {
  _items: new Map(),
  _raf: null,

  register: function(el, tickFn, state) {
    this._items.set(el, { tickFn: tickFn, state: state });
    if (!this._raf) this._start();
  },

  unregister: function(el) {
    this._items.delete(el);
    if (this._items.size === 0 && this._raf) {
      _cancelRafFn(this._raf);
      this._raf = null;
    }
  },

  _start: function() {
    const self = this;
    function tick() {
      self._items.forEach(function(entry) {
        entry.tickFn(entry.state);
      });
      if (self._items.size > 0) {
        self._raf = _rafFn(tick);
      } else {
        self._raf = null;
      }
    }
    self._raf = _rafFn(tick);
  },
};

// ══════════════════════════════════════════════════════════════
//  RAF TICK FUNCTIONS (shared across play/cleanup)
// ══════════════════════════════════════════════════════════════

function snakeBorderTick(s) {
  s.progress += 0.008 * s.speed;
  if (s.progress > 1) s.progress -= 1;

  const rect = s.el.getBoundingClientRect();
  const w = rect.width + 4;
  const h = rect.height + 4;
  const perimeter = 2 * (w + h);

  for (let j = 0; j < s.dots.length; j++) {
    const p = (s.progress + j / s.dotCount) % 1;
    const dist = p * perimeter;
    let x = 0, y = 0;

    if (dist < w) {
      x = dist; y = 0;
    } else if (dist < w + h) {
      x = w; y = dist - w;
    } else if (dist < 2 * w + h) {
      x = w - (dist - w - h); y = h;
    } else {
      x = 0; y = h - (dist - 2 * w - h);
    }
    s.dots[j].style.left = (x - s.dotSize / 2) + 'px';
    s.dots[j].style.top = (y - s.dotSize / 2) + 'px';
  }
}

function particleOrbitTick(s) {
  s.angle += 0.015 * s.speed;

  const rect = s.el.getBoundingClientRect();
  const w = rect.width + 16;
  const h = rect.height + 16;
  const perimeter = 2 * (w + h);

  for (let j = 0; j < s.particles.length; j++) {
    const pData = s.particles[j];
    const progress = ((s.angle + pData.phase) / (Math.PI * 2)) % 1;
    const dist = progress * perimeter;
    let x = 0, y = 0;

    if (dist < w) {
      x = dist; y = 0;
    } else if (dist < w + h) {
      x = w; y = dist - w;
    } else if (dist < 2 * w + h) {
      x = w - (dist - w - h); y = h;
    } else {
      x = 0; y = h - (dist - 2 * w - h);
    }

    // Slight wobble perpendicular to path
    const wobble = Math.sin(s.angle * 3 + pData.phase * 2) * pData.orbitRadius;
    let normalX = 0, normalY = 0;
    if (dist < w) { normalY = -1; }
    else if (dist < w + h) { normalX = 1; }
    else if (dist < 2 * w + h) { normalY = 1; }
    else { normalX = -1; }

    pData.el.style.left = (x + normalX * wobble - s.size / 2) + 'px';
    pData.el.style.top = (y + normalY * wobble - s.size / 2) + 'px';
    pData.el.style.opacity = String(0.5 + Math.sin(s.angle * 2 + pData.phase) * 0.3);
  }
}

function cornerAccentsTick(s) {
  s.t += 0.03 * s.speed;

  for (let j = 0; j < s.cornerEls.length; j++) {
    const phase = j * Math.PI * 0.5;
    const sc = 1 + Math.sin(s.t + phase) * 0.15;
    const o = 0.6 + Math.sin(s.t * 1.3 + phase) * 0.4;
    s.cornerEls[j].style.transform = 'rotate(' + s.corners[j].rot + 'deg) scale(' + sc + ')';
    s.cornerEls[j].style.opacity = String(o);
  }
}

function heartbeatTick(s) {
  s.t += 0.025 * s.speed;

  // Double-beat pattern: two quick pulses then a pause
  const cycle = s.t % (Math.PI * 2);
  let scale = 1;
  if (cycle < 0.6) {
    scale = 1 + Math.sin(cycle / 0.6 * Math.PI) * 0.03;
  } else if (cycle > 0.8 && cycle < 1.4) {
    scale = 1 + Math.sin((cycle - 0.8) / 0.6 * Math.PI) * 0.02;
  }

  s.el.style.transform = s.origTransform + ' scale(' + scale + ')';
}

function progressBarTick(s) {
  s.t += 0.012 * s.speed;

  // Indeterminate progress: slide back and forth
  const progress = (Math.sin(s.t) + 1) / 2;
  const width = 20 + Math.sin(s.t * 1.5) * 10;
  s.bar.style.width = width + '%';
  s.bar.style.left = (progress * (100 - width)) + '%';
  s.bar.style.opacity = String(0.6 + Math.sin(s.t * 2) * 0.2);
}

// ── Helper: simulate elapsed frames for RAF phase continuity ──

function _advanceRAFPhase(el, elapsed) {
  if (!elapsed || elapsed <= 0) return;
  const tickerEntry = InProgressTicker._items.get(el);
  if (tickerEntry && tickerEntry.tickFn && tickerEntry.state) {
    const FRAME_MS = 16.667;
    let framesToSimulate = Math.floor(elapsed / FRAME_MS);
    // Cap at 3600 frames (1 minute) to prevent runaway loops
    // on very long elapsed times. Beyond 1 minute of simulation,
    // the exact phase is imperceptible.
    if (framesToSimulate > 3600) framesToSimulate = 3600;
    for (let f = 0; f < framesToSimulate; f++) {
      tickerEntry.tickFn(tickerEntry.state);
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  CSS-FIRST (AMBIENT) PLUGINS
// ══════════════════════════════════════════════════════════════

// ── glow ───────────────────────────────────────────────────────

export const glowPlugin = {
  name: 'glow',
  category: 'persist',
  style: 'ambient',
  meta: { label: 'Glow', description: 'Pulsing box-shadow glow', tags: ['glow', 'css'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
    color: { label: 'Color', type: 'color', default: '', group: 'visual' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const color = (ctx.params && ctx.params.color) || '';
    const speed = ctx.speed || 1;

    if (color) el.style.setProperty('--tfx-persist-color', color);
    el.style.setProperty('--tfx-persist-speed', getSpeedVar(speed));
    // Use inline style for animation instead of CSS class. This survives
    // morphing -- the morph syncs class attributes with server HTML
    // (which doesn't include the animation class), but inline styles set
    // by JS are preserved because the server never sets inline animation styles.
    void el.offsetHeight;
    el.style.animation = 'tfx-persist-glow var(--tfx-persist-speed, 2s) ease-in-out infinite';
    el.style.willChange = 'box-shadow';
    el.style.contain = 'layout style';
    el.style.transitionProperty = 'background, border-color';

    // Phase continuity: resume from correct phase after DOM swap
    if (ctx.elapsed && ctx.elapsed > 0) {
      el.style.animationDelay = '-' + ctx.elapsed + 'ms';
    }

    el.__tfxAnimation = { type: 'css', variant: 'glow' };
  },

  cleanup: function (el) {
    el.style.animation = '';
    el.style.animationDelay = '';
    el.style.willChange = '';
    el.style.contain = '';
    el.style.transitionProperty = '';
    el.style.removeProperty('--tfx-persist-color');
    el.style.removeProperty('--tfx-persist-speed');
    delete el.__tfxAnimation;
  },
};

// ── pulse ──────────────────────────────────────────────────────

export const pulsePlugin = {
  name: 'pulse',
  category: 'persist',
  style: 'ambient',
  meta: { label: 'Pulse', description: 'Subtle scale pulse', tags: ['pulse', 'css'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    el.style.setProperty('--tfx-persist-speed', getSpeedVar(speed));
    void el.offsetHeight;
    el.classList.add('tfx-persist-pulse');

    if (ctx.elapsed && ctx.elapsed > 0) {
      el.style.animationDelay = '-' + ctx.elapsed + 'ms';
    }

    el.__tfxAnimation = { type: 'css', variant: 'pulse' };
  },

  cleanup: function (el) {
    el.classList.remove('tfx-persist-pulse');
    el.style.animationDelay = '';
    el.style.removeProperty('--tfx-persist-speed');
    delete el.__tfxAnimation;
  },
};

// ── colored-border ─────────────────────────────────────────────

export const coloredBorderPlugin = {
  name: 'colored-border',
  category: 'persist',
  style: 'ambient',
  meta: { label: 'Colored Border', description: 'Cycling border color animation', tags: ['border', 'css'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
    color: { label: 'Primary Color', type: 'color', default: '', group: 'visual' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    const color = (ctx.params && ctx.params.color) || '';

    el.style.setProperty('--tfx-persist-speed', (3 / speed) + 's');
    if (color) {
      el.style.setProperty('--tfx-persist-c1', color);
    }
    void el.offsetHeight;
    el.classList.add('tfx-persist-colored-border');

    if (ctx.elapsed && ctx.elapsed > 0) {
      el.style.animationDelay = '-' + ctx.elapsed + 'ms';
    }

    // Save original border so we can restore
    el.__tfxAnimation = { type: 'css', variant: 'colored-border', origBorder: el.style.border || '' };
  },

  cleanup: function (el) {
    const info = el.__tfxAnimation;
    el.classList.remove('tfx-persist-colored-border');
    el.style.animationDelay = '';
    el.style.removeProperty('--tfx-persist-speed');
    el.style.removeProperty('--tfx-persist-c1');
    el.style.removeProperty('--tfx-persist-c2');
    el.style.removeProperty('--tfx-persist-c3');
    if (info && info.origBorder) {
      el.style.border = info.origBorder;
    } else {
      el.style.border = '';
    }
    delete el.__tfxAnimation;
  },
};

// ── shimmer ────────────────────────────────────────────────────

export const shimmerPlugin = {
  name: 'shimmer',
  category: 'persist',
  style: 'ambient',
  meta: { label: 'Shimmer', description: 'Sliding highlight overlay', tags: ['shimmer', 'css'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    el.style.setProperty('--tfx-persist-speed', getSpeedVar(speed));
    void el.offsetHeight;
    el.classList.add('tfx-persist-shimmer');

    if (ctx.elapsed && ctx.elapsed > 0) {
      el.style.animationDelay = '-' + ctx.elapsed + 'ms';
    }

    el.__tfxAnimation = { type: 'css', variant: 'shimmer' };
  },

  cleanup: function (el) {
    el.classList.remove('tfx-persist-shimmer');
    el.style.animationDelay = '';
    el.style.removeProperty('--tfx-persist-speed');
    delete el.__tfxAnimation;
  },
};

// ── breathing ──────────────────────────────────────────────────

export const breathingPlugin = {
  name: 'breathing',
  category: 'persist',
  style: 'ambient',
  meta: { label: 'Breathing', description: 'Gentle opacity fade in/out', tags: ['breathing', 'css'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
    opacityMin: { label: 'Min Opacity', type: 'range', min: 0.5, max: 0.95, default: 0.85, step: 0.01, group: 'visual' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    const opMin = (ctx.params && ctx.params.opacityMin !== undefined) ? ctx.params.opacityMin : 0.85;

    el.style.setProperty('--tfx-persist-speed', (2.5 / speed) + 's');
    el.style.setProperty('--tfx-persist-opacity-min', String(opMin));
    el.style.setProperty('--tfx-persist-opacity-max', '1');
    void el.offsetHeight;
    el.classList.add('tfx-persist-breathing');

    if (ctx.elapsed && ctx.elapsed > 0) {
      el.style.animationDelay = '-' + ctx.elapsed + 'ms';
    }

    el.__tfxAnimation = { type: 'css', variant: 'breathing' };
  },

  cleanup: function (el) {
    el.classList.remove('tfx-persist-breathing');
    el.style.animationDelay = '';
    el.style.removeProperty('--tfx-persist-speed');
    el.style.removeProperty('--tfx-persist-opacity-min');
    el.style.removeProperty('--tfx-persist-opacity-max');
    delete el.__tfxAnimation;
  },
};

// ══════════════════════════════════════════════════════════════
//  RAF-BASED (RICH) PLUGINS
// ══════════════════════════════════════════════════════════════

// ── snake-border ─────────────────────────────────────────────

export const snakeBorderPlugin = {
  name: 'snake-border',
  category: 'persist',
  style: 'rich',
  meta: { label: 'Snake Border', description: 'Dots orbiting the card border', tags: ['snake', 'border', 'raf'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
    dotCount: { label: 'Dot Count', type: 'range', min: 1, max: 8, default: 3, step: 1, group: 'visual' },
    dotSize: { label: 'Dot Size', type: 'range', min: 2, max: 10, default: 4, step: 1, unit: 'px', group: 'visual' },
    color: { label: 'Color', type: 'color', default: '', group: 'visual' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    const params = ctx.params || {};
    const dotCount = params.dotCount || 3;
    const dotSize = params.dotSize || 4;
    const color = params.color || 'var(--accent, #C45A3C)';

    // Create container for dots
    const container = document.createElement('div');
    container.className = 'tfx-persist-snake-container';
    container.style.cssText = 'position:absolute;inset:-2px;pointer-events:none;z-index:2;overflow:visible;';
    el.style.position = el.style.position || 'relative';
    el.appendChild(container);

    const dots = [];
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;width:' + dotSize + 'px;height:' + dotSize + 'px;border-radius:50%;background:' + color + ';pointer-events:none;';
      container.appendChild(dot);
      dots.push(dot);
    }

    const state = { el: el, progress: 0, speed: speed, dots: dots, dotCount: dotCount, dotSize: dotSize };
    InProgressTicker.register(el, snakeBorderTick, state);

    el.__tfxAnimation = { type: 'raf', variant: 'snake-border', container: container };

    // Phase continuity for RAF variants
    _advanceRAFPhase(el, ctx.elapsed);
  },

  cleanup: function (el) {
    const info = el.__tfxAnimation;
    InProgressTicker.unregister(el);
    if (info && info.container && info.container.parentNode) {
      info.container.parentNode.removeChild(info.container);
    }
    delete el.__tfxAnimation;
  },
};

// ── particle-orbit ───────────────────────────────────────────

export const particleOrbitPlugin = {
  name: 'particle-orbit',
  category: 'persist',
  style: 'rich',
  meta: { label: 'Particle Orbit', description: 'Particles orbiting the card with wobble', tags: ['particle', 'orbit', 'raf'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
    count: { label: 'Particle Count', type: 'range', min: 2, max: 12, default: 6, step: 1, group: 'visual' },
    size: { label: 'Size', type: 'range', min: 1, max: 8, default: 3, step: 1, unit: 'px', group: 'visual' },
    color: { label: 'Color', type: 'color', default: '', group: 'visual' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    const params = ctx.params || {};
    const count = params.count || 6;
    const size = params.size || 3;
    const color = params.color || 'var(--accent, #C45A3C)';

    const container = document.createElement('div');
    container.className = 'tfx-persist-orbit-container';
    container.style.cssText = 'position:absolute;inset:-8px;pointer-events:none;z-index:2;overflow:visible;';
    el.style.position = el.style.position || 'relative';
    el.appendChild(container);

    const particles = [];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';pointer-events:none;opacity:0.7;';
      container.appendChild(p);
      particles.push({ el: p, phase: (i / count) * Math.PI * 2, orbitRadius: 4 + (ctx.rand ? ctx.rand() : Math.random()) * 4 });
    }

    const state = { el: el, angle: 0, speed: speed, particles: particles, size: size };
    InProgressTicker.register(el, particleOrbitTick, state);

    el.__tfxAnimation = { type: 'raf', variant: 'particle-orbit', container: container };

    _advanceRAFPhase(el, ctx.elapsed);
  },

  cleanup: function (el) {
    const info = el.__tfxAnimation;
    InProgressTicker.unregister(el);
    if (info && info.container && info.container.parentNode) {
      info.container.parentNode.removeChild(info.container);
    }
    delete el.__tfxAnimation;
  },
};

// ── corner-accents ───────────────────────────────────────────

export const cornerAccentsPlugin = {
  name: 'corner-accents',
  category: 'persist',
  style: 'rich',
  meta: { label: 'Corner Accents', description: 'Animated L-shaped accents at each corner', tags: ['corners', 'accents', 'raf'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
    accentSize: { label: 'Accent Size', type: 'range', min: 6, max: 24, default: 12, step: 1, unit: 'px', group: 'visual' },
    color: { label: 'Color', type: 'color', default: '', group: 'visual' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    const params = ctx.params || {};
    const accentSize = params.accentSize || 12;
    const color = params.color || 'var(--accent, #C45A3C)';

    const container = document.createElement('div');
    container.className = 'tfx-persist-corners-container';
    container.style.cssText = 'position:absolute;inset:-4px;pointer-events:none;z-index:2;';
    el.style.position = el.style.position || 'relative';
    el.appendChild(container);

    const corners = [
      { pos: 'top:0;left:0;', rot: 0 },
      { pos: 'top:0;right:0;', rot: 90 },
      { pos: 'bottom:0;right:0;', rot: 180 },
      { pos: 'bottom:0;left:0;', rot: 270 },
    ];

    const cornerEls = [];
    for (let i = 0; i < corners.length; i++) {
      const c = document.createElement('div');
      c.style.cssText = 'position:absolute;' + corners[i].pos + 'width:' + accentSize + 'px;height:' + accentSize + 'px;border-top:2px solid ' + color + ';border-left:2px solid ' + color + ';transform:rotate(' + corners[i].rot + 'deg);transform-origin:center;pointer-events:none;';
      container.appendChild(c);
      cornerEls.push(c);
    }

    const state = { t: 0, speed: speed, cornerEls: cornerEls, corners: corners };
    InProgressTicker.register(el, cornerAccentsTick, state);

    el.__tfxAnimation = { type: 'raf', variant: 'corner-accents', container: container };

    _advanceRAFPhase(el, ctx.elapsed);
  },

  cleanup: function (el) {
    const info = el.__tfxAnimation;
    InProgressTicker.unregister(el);
    if (info && info.container && info.container.parentNode) {
      info.container.parentNode.removeChild(info.container);
    }
    delete el.__tfxAnimation;
  },
};

// ── heartbeat ──────────────────────────────────────────────────

export const heartbeatPlugin = {
  name: 'heartbeat',
  category: 'persist',
  style: 'rich',
  meta: { label: 'Heartbeat', description: 'Double-beat scale pulse pattern', tags: ['heartbeat', 'pulse', 'raf'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
  },

  play: function (el, ctx) {
    const speed = ctx.speed || 1;
    const origTransform = el.style.transform || '';

    const state = { el: el, t: 0, speed: speed, origTransform: origTransform };
    InProgressTicker.register(el, heartbeatTick, state);

    el.__tfxAnimation = { type: 'raf', variant: 'heartbeat', origTransform: origTransform };

    _advanceRAFPhase(el, ctx.elapsed);
  },

  cleanup: function (el) {
    const info = el.__tfxAnimation;
    InProgressTicker.unregister(el);
    el.style.transform = (info && info.origTransform) || '';
    delete el.__tfxAnimation;
  },
};

// ── progress-bar ─────────────────────────────────────────────

export const progressBarPlugin = {
  name: 'progress-bar',
  category: 'persist',
  style: 'rich',
  meta: { label: 'Progress Bar', description: 'Indeterminate sliding progress indicator', tags: ['progress', 'bar', 'raf'] },
  params: {
    speed: { label: 'Speed', type: 'range', min: 0.2, max: 3, default: 1, step: 0.1, group: 'timing' },
    barHeight: { label: 'Bar Height', type: 'range', min: 1, max: 8, default: 3, step: 1, unit: 'px', group: 'visual' },
    position: { label: 'Position', type: 'select', options: ['top', 'bottom'], default: 'top', group: 'visual' },
    color: { label: 'Color', type: 'color', default: '', group: 'visual' },
  },

  play: function (el, ctx) {
    _injectStyles();
    const speed = ctx.speed || 1;
    const params = ctx.params || {};
    const barHeight = params.barHeight || 3;
    const position = params.position || 'top';
    const color = params.color || 'var(--accent, #C45A3C)';

    const bar = document.createElement('div');
    bar.className = 'tfx-persist-progress-bar';
    bar.style.cssText = 'position:absolute;left:0;' + position + ':0;height:' + barHeight + 'px;width:30%;background:' + color + ';border-radius:' + barHeight + 'px;pointer-events:none;z-index:2;opacity:0.8;';
    el.style.position = el.style.position || 'relative';
    el.style.overflow = el.style.overflow || 'hidden';
    el.appendChild(bar);

    const state = { t: 0, speed: speed, bar: bar };
    InProgressTicker.register(el, progressBarTick, state);

    el.__tfxAnimation = { type: 'raf', variant: 'progress-bar', bar: bar };

    _advanceRAFPhase(el, ctx.elapsed);
  },

  cleanup: function (el) {
    const info = el.__tfxAnimation;
    InProgressTicker.unregister(el);
    if (info && info.bar && info.bar.parentNode) {
      info.bar.parentNode.removeChild(info.bar);
    }
    delete el.__tfxAnimation;
  },
};

// ══════════════════════════════════════════════════════════════
//  PLUGIN COLLECTIONS
// ══════════════════════════════════════════════════════════════

/**
 * All 5 ambient (CSS-first) variants.
 */
export const ambientVariants = {
  'glow': glowPlugin,
  'pulse': pulsePlugin,
  'colored-border': coloredBorderPlugin,
  'shimmer': shimmerPlugin,
  'breathing': breathingPlugin,
};

/**
 * All 5 rich (RAF-based) variants.
 */
export const richVariants = {
  'snake-border': snakeBorderPlugin,
  'particle-orbit': particleOrbitPlugin,
  'corner-accents': cornerAccentsPlugin,
  'heartbeat': heartbeatPlugin,
  'progress-bar': progressBarPlugin,
};

/**
 * All 10 variants as an array.
 */
export const allPlugins = [
  glowPlugin, pulsePlugin, coloredBorderPlugin, shimmerPlugin, breathingPlugin,
  snakeBorderPlugin, particleOrbitPlugin, cornerAccentsPlugin, heartbeatPlugin, progressBarPlugin,
];

/**
 * Variant lookup by name (for cleanup by name).
 */
export const allVariantsByName = {};
allPlugins.forEach(function (p) {
  allVariantsByName[p.name] = p;
});

// ══════════════════════════════════════════════════════════════
//  INSTALL FUNCTION
// ══════════════════════════════════════════════════════════════

/**
 * Install all persist animation variants into a toto-fx engine or registry.
 *
 * Supports two targets:
 * - Engine instance (has engine.register): registers under 'persist' category
 * - AnimationRegistry (has registerCategory): registers ambient + rich style groups
 *
 * @param {Object} registry - A toto-fx engine instance or AnimationRegistry
 */
/**
 * Remove injected styles. Call during teardown to clean up.
 */
export function removeStyles() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('tfx-persist-css');
  if (el) el.remove();
  _styleInjected = false;
}

export function install(registry) {
  _injectStyles();

  // Wire determinism primitives if we were handed an engine. Safe no-op
  // if `registry` is an AnimationRegistry (no raf/rand methods) —
  // defaults stay as raw browser APIs.
  if (registry && typeof registry.raf === 'function') {
    _rafFn = registry.raf;
  }
  if (registry && typeof registry.cancelRaf === 'function') {
    _cancelRafFn = registry.cancelRaf;
  }

  if (registry && typeof registry.register === 'function') {
    // Engine instance -- use engine.register(category, style, variants)
    registry.register('persist', 'ambient', ambientVariants);
    registry.register('persist', 'rich', richVariants);
  } else if (registry && typeof registry.registerCategory === 'function') {
    // AnimationRegistry -- use registerCategory(category, style, variants)
    registry.registerCategory('persist', 'ambient', ambientVariants);
    registry.registerCategory('persist', 'rich', richVariants);
  }
}

// ══════════════════════════════════════════════════════════════
//  PLUGIN OBJECT (for engine.use())
// ══════════════════════════════════════════════════════════════

/**
 * Plugin object for engine.use(inProgressPlugin).
 *
 * @example
 * import { createEngine } from 'toto-fx';
 * import { inProgressPlugin } from 'toto-fx/plugins/in-progress';
 *
 * const engine = createEngine({ ... });
 * engine.use(inProgressPlugin);
 * engine.init();
 *
 * // Now 'persist' category is registered with 'ambient' and 'rich' styles.
 * // Set a persist animation:
 * engine.set('persist', 'item-1', { style: 'ambient', variant: 'glow' });
 *
 * @type {import('../types.js').AnimationPlugin}
 */
export const inProgressPlugin = {
  name: 'in-progress',
  install: install,
};

export default inProgressPlugin;
