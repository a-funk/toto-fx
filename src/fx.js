/**
 * @module fx
 * @description FX — animation effects toolkit for TotoFX.
 *
 * Particles, screen effects, physics-based card animations, and canvas
 * rendering helpers. Used by all built-in plugins (thud, death, cute,
 * creation) and available for custom animations.
 *
 * ## Setup
 *
 *   import { FX, configure } from 'toto-fx';
 *   // or: const FX = TotoFX.FX;  (IIFE)
 *
 *   // Optional: wire dotgrid for grid-based effects
 *   FX.setDotgrid(myDotgridInstance);
 *
 *   // Optional: customize selectors, theme, mobile behavior
 *   configure({ selectors: { shadow: '.my-shadow' }, theme: myTheme });
 *
 * ## API Overview
 *
 * ### Particles
 *   spawnParticles(cx, cy, opts)  — ASCII particle burst (count, colors, chars, speed, gravity)
 *   spawnSmoke(cx, cy, count)     — smoke puff effect
 *   spawnFireTrail(x, y, angle)   — directional fire particles
 *   pushParticles(arr)            — add pre-built particles to the render loop
 *
 * ### Screen Effects
 *   doScreenShake(heavy?)         — shake the viewport (light or heavy)
 *   doImpactFlash(whiteOut?)      — full-screen flash (white or black)
 *   flashColor(color, durationMs) — colored overlay flash
 *   startSpeedLines(cx, cy, dir, ms) — anime-style radial speed lines
 *   stopSpeedLines()              — stop speed lines
 *
 * ### Dotgrid Effects (requires FX.setDotgrid() first)
 *   doDotgridRipple(cx, cy, opts) — radial push wave
 *   doDotgridCrater(cx, cy, r, d) — impact crater with cracks
 *   doDotgridNuclear(cx, cy)      — mushroom cloud blast
 *   doDotgridScorch(x1,y1,x2,y2,w) — directional scorch line
 *
 * ### Card Animation Physics
 *   liftCard(el, shadow, cx, cy, peakZ, dur, rotX, rotY, onDone) — lift to peak
 *   gravityFall(el, shadow, peakZ, rotX, rotY, dur, exp, cx, cy, onImpact) — fall with gravity
 *   standardImpact(el, shadow, burst, cx, cy) — impact flash + particles + shake
 *   completeAndRemove(el, badge, strike, delay, onDone) — badge → strike → fade → remove
 *   removeCard(el, fadeDelay, onDone) — fade out and remove
 *   destroyCard(el) — immediately hide element
 *   prepareCard(el) — promote to animation stage, return dimensions
 *   promoteCard(el) — create fixed overlay clone for physics animations
 *   cleanupCard(el) — reset all animation styles
 *   finalize(el, opts) — clean up and call opts.onDone()
 *
 * ### Element Helpers
 *   getSubElements(el) — find shadow/burst/badge/strike child elements
 *   getItemRect(el)    — bounding rect with center coordinates
 *   intensityScale(n)  — map intensity 1-10 to scale factor 0.3-1.0
 *   speedScale(ms)     — divide duration by current context speed
 *   pCount(n)          — scale particle count for mobile/tablet
 *   resolveParams(descriptors, overrides) — merge param defaults with user overrides
 *
 * ### Canvas
 *   getFxCanvas()      — full-viewport particle canvas element
 *   getFxCtx()         — 2D context for the particle canvas
 *   getCanvas()        — particle canvas (creates if needed)
 *   getSpeedCanvas()   — speed lines canvas (creates if needed)
 *   drawAsciiChar(ctx, ch, x, y, color, size, alpha, rotation) — render one character
 *   drawChar(ctx, ch, x, y, color, size, alpha, rotation) — optimized character draw
 *
 * ### Animation Lifecycle
 *   registerAnimation(el, rafId) — track an in-flight animation
 *   setAnimationCleanup(el, fn)  — register cleanup function for cancellation
 *   cancelAnimation(el)          — cancel and clean up an animation
 *   deregisterAnimation(el)      — remove tracking without cleanup
 *
 * ### Context
 *   setContext(opts)   — set speed, FX toggles, particle style for next animation
 *   clearContext()     — reset to defaults (call after each animation)
 *
 * ### State
 *   isIdle()              — true if no animations rendering
 *   getAdaptiveQuality()  — current quality level (1.0 or 0.5)
 *   isMobile / isTablet   — device detection flags
 *   fxEnabled(key)        — check if an FX layer is active in current context
 *   fxConfig              — current FX toggle state
 *
 * @example
 * // Spawn particles at a click point
 * import { FX } from 'toto-fx';
 *
 * el.addEventListener('click', (e) => {
 *   FX.spawnParticles(e.clientX, e.clientY, {
 *     count: 20,
 *     colors: [[255, 100, 50], [255, 200, 0]],
 *     chars: ['*', '+', '#'],
 *     speed: 4,
 *     gravity: 0.15,
 *   });
 *   FX.doScreenShake();
 * });
 *
 * @example
 * // Full lift-slam-impact sequence
 * import { FX } from 'toto-fx';
 *
 * const sub = FX.getSubElements(el);
 * const pos = FX.getItemRect(el);
 * FX.liftCard(el, sub.shadow, pos.cx, pos.cy, 450, 350, -6, 2, () => {
 *   FX.gravityFall(el, sub.shadow, 450, -6, 2, 200, 3, pos.cx, pos.cy, () => {
 *     FX.standardImpact(el, sub.shadow, sub.burst, pos.cx, pos.cy);
 *     FX.finalize(el, { onDone });
 *   });
 * });
 *
 * @see {@link file://docs/fx-api.md} for full parameter documentation.
 */

// ── Optional Dotgrid integration ────────────────────────────────
// Dotgrid is an optional dependency. If available, FX functions delegate
// to it for grid-based effects (ripple, crater, nuclear, scorch).
// If not loaded, dotgrid functions become no-ops.
let _Dotgrid = null;

/**
 * Set the Dotgrid module reference for grid-based effects.
 * Call this if you are using the dotgrid module alongside FX.
 *
 * @param {Object} dotgridModule - The Dotgrid module with ripple/crater/nuclear/scorch methods.
 */
export function setDotgrid(dotgridModule) {
  _Dotgrid = dotgridModule;
}

function _hasDotgrid() {
  return _Dotgrid !== null && typeof _Dotgrid !== 'undefined';
}

// ── Configuration ─────────────────────────────────────────────────
// All Toto-specific globals are replaced by a configuration system.
// Call configure() to set defaults before using any FX functions.

/**
 * @typedef {Object} FXConfig
 * @property {Object} [mobile] - Mobile device overrides.
 * @property {number} [mobile.particleScale=0.3] - Particle count multiplier on mobile.
 * @property {number} [mobile.maxParticles=20] - Max particles per spawn on mobile.
 * @property {number} [mobile.maxParticlesTotal=40] - Max total particles on mobile.
 * @property {boolean} [mobile.shadow=false] - Whether to render shadows on mobile.
 * @property {Object} [tablet] - Tablet device overrides.
 * @property {number} [tablet.particleScale=0.6] - Particle count multiplier on tablet.
 * @property {number} [tablet.maxParticles=40] - Max particles per spawn on tablet.
 * @property {number} [tablet.maxParticlesTotal=200] - Max total particles on tablet.
 * @property {boolean} [tablet.shadow=true] - Whether to render shadows on tablet.
 * @property {boolean} [tablet.skipBlur=true] - Skip animated blur on tablet.
 * @property {Object} [selectors] - DOM selector overrides for card sub-elements.
 * @property {string} [selectors.shadow='.fx-shadow'] - Shadow element selector.
 * @property {string} [selectors.burst='.fx-burst'] - Burst element selector.
 * @property {string} [selectors.badge='.fx-badge'] - Badge element selector.
 * @property {string} [selectors.strike='.fx-strike'] - Strikethrough element selector.
 * @property {string} [selectors.appShell=null] - App shell element selector for screen shake (null = document.body).
 * @property {string} [selectors.flashOverlay='#fx-flash-overlay'] - Flash overlay selector.
 * @property {Object} [theme] - Theme provider for colors and characters.
 * @property {Function} [theme.color] - (key: string) => string|null - Get a theme color.
 * @property {Function} [theme.chars] - (key: string) => string[] - Get character set by category.
 * @property {Function} [theme.particleColor] - (key: string) => number[]|string - Get particle color.
 * @property {Object} [theme.active] - Active theme object with palette and colorScheme.
 * @property {Object} [classes] - CSS class names used during animation.
 * @property {string} [classes.animating='animating'] - Class added during animation.
 * @property {string} [classes.visible='anim-visible'] - Class for visible animated card.
 * @property {string} [classes.destroyed='anim-destroyed'] - Class for destroyed card.
 * @property {string} [classes.done='fx-done'] - Class for completed item.
 * @property {string} [classes.placeholder='todo-item-placeholder'] - Class for layout placeholder.
 * @property {string} [classes.stage='animation-stage'] - Class for animation stage wrapper.
 * @property {string} [classes.shaking='shaking'] - Class for light screen shake.
 * @property {string} [classes.shakingHeavy='shaking-heavy'] - Class for heavy screen shake.
 */

/** @type {Object} Mobile defaults */
let _mobileDefaults = {
  particleScale: 0.3,
  maxParticles: 20,
  maxParticlesTotal: 40,
  shadow: false,
};

/** @type {Object} Tablet defaults */
let _tabletDefaults = {
  particleScale: 0.6,
  maxParticles: 40,
  maxParticlesTotal: 200,
  shadow: true,
  skipBlur: true,
};

/** @type {Object} DOM selectors (configurable) */
let _selectors = {
  shadow: '.fx-shadow',
  burst: '.fx-burst',
  badge: '.fx-badge',
  strike: '.fx-strike',
  appShell: null,
  flashOverlay: '#fx-flash-overlay',
};

/** @type {Object} CSS class names (configurable) */
let _classes = {
  animating: 'animating',
  visible: 'anim-visible',
  destroyed: 'anim-destroyed',
  done: 'fx-done',
  placeholder: 'fx-placeholder',
  stage: 'animation-stage',
  shaking: 'shaking',
  shakingHeavy: 'shaking-heavy',
};

/**
 * Default no-op theme provider. Users should supply a real theme via configure().
 * Falls back to sensible defaults for colors and characters.
 */
let _theme = {
  color: function (_key) { return null; },
  chars: function (key) {
    var defaults = {
      particles: ['*', '+', '.', '~', '^'],
      smoke: ['.', ':', '~', '"'],
      fire: ['*', '^', '~', '.'],
    };
    return defaults[key] || ['*', '+', '.'];
  },
  particleColor: function (_key) { return [255, 200, 50]; },
  active: null,
};

/**
 * Configure FX defaults. Call before using any FX functions to customize
 * behavior for your application. All options are optional — only provide
 * the ones you want to override.
 *
 * @param {FXConfig} opts - Configuration options.
 */
export function configure(opts) {
  if (!opts) return;

  if (opts.mobile) {
    if (opts.mobile.particleScale !== undefined) _mobileDefaults.particleScale = opts.mobile.particleScale;
    if (opts.mobile.maxParticles !== undefined) _mobileDefaults.maxParticles = opts.mobile.maxParticles;
    if (opts.mobile.maxParticlesTotal !== undefined) _mobileDefaults.maxParticlesTotal = opts.mobile.maxParticlesTotal;
    if (opts.mobile.shadow !== undefined) _mobileDefaults.shadow = opts.mobile.shadow;
  }

  if (opts.tablet) {
    if (opts.tablet.particleScale !== undefined) _tabletDefaults.particleScale = opts.tablet.particleScale;
    if (opts.tablet.maxParticles !== undefined) _tabletDefaults.maxParticles = opts.tablet.maxParticles;
    if (opts.tablet.maxParticlesTotal !== undefined) _tabletDefaults.maxParticlesTotal = opts.tablet.maxParticlesTotal;
    if (opts.tablet.shadow !== undefined) _tabletDefaults.shadow = opts.tablet.shadow;
    if (opts.tablet.skipBlur !== undefined) _tabletDefaults.skipBlur = opts.tablet.skipBlur;
  }

  if (opts.selectors) {
    Object.assign(_selectors, opts.selectors);
  }

  if (opts.classes) {
    Object.assign(_classes, opts.classes);
  }

  if (opts.theme) {
    if (opts.theme.color) _theme.color = opts.theme.color;
    if (opts.theme.chars) _theme.chars = opts.theme.chars;
    if (opts.theme.particleColor) _theme.particleColor = opts.theme.particleColor;
    if (opts.theme.active !== undefined) _theme.active = opts.theme.active;
  }

  if (opts.autoWarmup === false) _autoWarmup = false;
}

// ── Device Detection ──────────────────────────────────────────────

/**
 * Whether the current device is mobile (detected via user agent and viewport width).
 * Used to scale down particle counts, disable shadows, and skip expensive paint effects.
 * @type {boolean}
 */
export const isMobile = typeof navigator !== 'undefined'
  && (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    || (typeof window !== 'undefined' && window.innerWidth <= 768 && 'ontouchstart' in window));

/**
 * Whether the current device is a tablet (iPad, Android tablet, etc.).
 * iPadOS 13+ reports as desktop in user agent, so we detect via touch + screen size.
 * Tablets get intermediate performance settings between mobile and desktop.
 * @type {boolean}
 */
export const isTablet = typeof window !== 'undefined' && !isMobile && ('ontouchstart' in window) &&
  (window.innerWidth >= 768 && window.innerWidth <= 1366 ||
   window.innerHeight >= 768 && window.innerHeight <= 1366);

// ── FX Config (effect toggles) ───────────────────────────────────

/**
 * Default FX toggles — used only as fallback when no per-animation context is set.
 * In v2, per-category fx overrides are the primary source via _ctx.fxOverrides.
 *
 * @type {{speedLines: boolean, flash: boolean, shake: boolean, dotgrid: boolean, cardSquash: boolean}}
 */
export const fxConfig = {
  speedLines: true,
  flash: true,
  shake: true,
  dotgrid: !isMobile,
  cardSquash: true,
};

// ── Runtime Context ──────────────────────────────────────────────
// Allows per-call speed and fx overrides without changing every
// animation function signature. Set via setContext(), cleared
// via clearContext() or automatically when the animation ends.
let _ctx = {
  speed: 1,
  fxOverrides: null,
  completion: null,
  dotgridOverride: null,
  disableFlash: false,
  particleStyle: null,
};

/**
 * Speed-divide helper: scales a duration by the current speed context.
 * `speed > 1` = faster (shorter durations), `speed < 1` = slower.
 *
 * @param {number} ms - Base duration in milliseconds.
 * @returns {number} Scaled duration (`ms / speed`).
 */
export function speedScale(ms) {
  return ms / (_ctx.speed || 1);
}

/**
 * Check if an FX layer is enabled. Reads from per-animation context first,
 * then falls back to fxConfig defaults.
 *
 * @param {string} key - Short FX key (e.g. 'shake', 'flash', 'dotgrid').
 * @returns {boolean}
 */
export function fxEnabled(key) {
  // Accessibility: global flash disable overrides everything
  if (key === 'flash' && _ctx.disableFlash) return false;
  // Per-call overrides from context take precedence
  if (_ctx.fxOverrides && key in _ctx.fxOverrides) return !!_ctx.fxOverrides[key];
  // Fallback to global defaults
  return fxConfig[key] !== false;
}

// ── Unified RAF Loop ─────────────────────────────────────────────
// Single requestAnimationFrame drives all active subsystems (particles,
// speed lines) to avoid 2+ RAF callbacks per frame during animations.
let _masterRAF = null;
let _masterSubs = { particles: false, speedLines: false };

// Frame budget monitor: track consecutive slow frames
let _lastFrameTime = 0;
let _frameBudgetExceeded = 0;

// Adaptive quality — degrades automatically under sustained frame drops
let _adaptiveQuality = 1.0;
let _adaptiveParticleScale = 1.0;
let _adaptiveSkipSpeedLines = false;

function _monitorFrame(now) {
  if (_lastFrameTime > 0) {
    const delta = now - _lastFrameTime;
    if (delta > 20) {
      _frameBudgetExceeded++;
      if (_frameBudgetExceeded >= 3 && _adaptiveQuality > 0.5) {
        _adaptiveQuality = 0.5;
        _adaptiveParticleScale = 0.5;
        _adaptiveSkipSpeedLines = true;
      }
    } else {
      if (_frameBudgetExceeded > 0) _frameBudgetExceeded--;
      if (_frameBudgetExceeded === 0 && _adaptiveQuality < 1.0) {
        _adaptiveQuality = 1.0;
        _adaptiveParticleScale = 1.0;
        _adaptiveSkipSpeedLines = false;
      }
    }
  }
  _lastFrameTime = now;
}

function _masterTick(now) {
  _monitorFrame(now);
  let anyActive = false;

  if (_masterSubs.particles) {
    _tickParticlesInner(now);
    if (particles.length > 0) anyActive = true;
    else _masterSubs.particles = false;
  }

  if (_masterSubs.speedLines) {
    if (!_adaptiveSkipSpeedLines) {
      _tickSpeedLinesInner(now);
    } else {
      const t = (_speedLinesDuration > 0) ? Math.min((now - _speedLinesStart) / _speedLinesDuration, 1) : 1;
      if (t >= 1) _finishSpeedLines();
    }
    if (_speedLinesActive) anyActive = true;
    else _masterSubs.speedLines = false;
  }

  if (anyActive) _masterRAF = requestAnimationFrame(_masterTick);
  else { _masterRAF = null; _lastFrameTime = 0; }
}

function _ensureMasterTick() {
  if (!_masterRAF) _masterRAF = requestAnimationFrame(_masterTick);
}

// ── Particle Canvas ──────────────────────────────────────────────
let canvas = null;
let ctx = null;
let particles = [];
let particleRAF = null;

/**
 * Get or create the particle canvas. Lazily creates a full-viewport
 * fixed-position canvas for rendering ASCII particles.
 *
 * @returns {HTMLCanvasElement} The particle canvas element.
 */
export function getCanvas() {
  if (canvas) return canvas;
  canvas = document.getElementById('animation-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'animation-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;';
    document.body.appendChild(canvas);
  }
  ctx = canvas.getContext('2d');
  resizeCanvas();
  return canvas;
}

function resizeCanvas() {
  if (!canvas) return;
  // Cap DPR at 1.5x — particle effects don't benefit from 2x resolution
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  // CSS display size MUST match viewport, not buffer. Without this,
  // the canvas renders at buffer dimensions (1.5x viewport), pushing
  // particles off their intended viewport positions.
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', resizeCanvas);
}

// ── Speed Lines Canvas ───────────────────────────────────────────
let speedCanvas = null;
let speedCtx = null;
let speedLinesRAF = null;

// Speed lines state — hoisted for unified RAF access
let _speedLinesActive = false;
let _speedLinesStart = 0;
let _speedLinesDuration = 0;
let _speedLinesCx = 0;
let _speedLinesCy = 0;
let _speedLinesDirection = 'outward';
let _speedLinesMaxR = 0;
let _speedLinesRGB = '255,255,255';

const radialLineCount = isMobile ? 20 : isTablet ? 30 : 50;
const radialLines = [];
for (let i = 0; i < radialLineCount; i++) {
  let angle;
  if (isMobile) {
    // Bias toward vertical (top/bottom) for portrait screens.
    // Concentrate angles near PI/2 (down) and 3PI/2 (up) with +-45deg spread.
    const base = Math.random() < 0.5 ? (Math.PI / 2) : (3 * Math.PI / 2);
    angle = base + (Math.random() - 0.5) * (Math.PI / 2);
  } else {
    angle = Math.random() * Math.PI * 2;
  }
  radialLines.push({
    angle: angle,
    speed: 0.6 + Math.random() * 0.8,
    opacity: 0.15 + Math.random() * 0.45,
    width: 0.8 + Math.random() * 1.5,
  });
}

/**
 * Get or create the speed lines canvas. Lazily creates a full-viewport
 * fixed-position canvas for rendering radial anime-style speed lines.
 *
 * @returns {HTMLCanvasElement} The speed lines canvas element.
 */
export function getSpeedCanvas() {
  if (speedCanvas) return speedCanvas;
  speedCanvas = document.getElementById('speed-lines-canvas');
  if (!speedCanvas) {
    speedCanvas = document.createElement('canvas');
    speedCanvas.id = 'speed-lines-canvas';
    speedCanvas.style.cssText = 'position:fixed;inset:0;z-index:9996;pointer-events:none;opacity:0;';
    document.body.appendChild(speedCanvas);
  }
  speedCtx = speedCanvas.getContext('2d');
  resizeSpeedCanvas();
  return speedCanvas;
}

function resizeSpeedCanvas() {
  if (!speedCanvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  speedCanvas.width = window.innerWidth * dpr;
  speedCanvas.height = window.innerHeight * dpr;
  speedCanvas.style.width = window.innerWidth + 'px';
  speedCanvas.style.height = window.innerHeight + 'px';
  if (speedCtx) speedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', resizeSpeedCanvas);
}

function _getSpeedLineRGB() {
  // Use theme ink color on light themes, white on dark themes
  const theme = _theme.active;
  if (theme && theme.colorScheme === 'light' && theme.palette && theme.palette.ink) {
    const hex = theme.palette.ink;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  }
  return '255,255,255';
}

// Inner speed lines tick — called by master tick, no self-scheduling
function _tickSpeedLinesInner(now) {
  if (!_speedLinesActive) return;
  // Health check: re-acquire speed canvas if detached
  if (!speedCanvas || !document.contains(speedCanvas)) {
    speedCanvas = null; speedCtx = null;
    getSpeedCanvas();
  }
  if (!speedCtx) return;
  const t = Math.min((now - _speedLinesStart) / _speedLinesDuration, 1);
  // Clear full buffer (not transformed coordinates) to prevent DPR artifacts
  speedCtx.save();
  speedCtx.setTransform(1, 0, 0, 1, 0, 0);
  speedCtx.clearRect(0, 0, speedCanvas.width, speedCanvas.height);
  speedCtx.restore();

  const cx = _speedLinesCx;
  const cy = _speedLinesCy;
  const direction = _speedLinesDirection;
  const maxR = _speedLinesMaxR;
  const rgb = _speedLinesRGB;

  for (let i = 0; i < radialLines.length; i++) {
    const ln = radialLines[i];
    const lineLen = maxR * 0.15 * ln.speed;
    let hd, td;
    if (direction === 'outward') {
      hd = t * maxR * ln.speed;
      td = Math.max(0, hd - lineLen);
    } else {
      hd = (1 - t) * maxR * ln.speed;
      td = hd + lineLen;
    }
    const c = Math.cos(ln.angle);
    const s = Math.sin(ln.angle);
    const x1 = cx + c * td;
    const y1 = cy + s * td;
    const x2 = cx + c * hd;
    const y2 = cy + s * hd;
    const fade = direction === 'outward' ? Math.sin(t * Math.PI) : 0.5 + 0.5 * t;
    const alpha = ln.opacity * fade;
    speedCtx.beginPath();
    speedCtx.moveTo(x1, y1);
    speedCtx.lineTo(x2, y2);
    speedCtx.strokeStyle = 'rgba(' + rgb + ',' + alpha + ')';
    speedCtx.lineWidth = ln.width;
    speedCtx.stroke();
  }

  if (t >= 1) _finishSpeedLines();
}

function _finishSpeedLines() {
  _speedLinesActive = false;
  if (speedCtx && speedCanvas) {
    speedCtx.save();
    speedCtx.setTransform(1, 0, 0, 1, 0, 0);
    speedCtx.clearRect(0, 0, speedCanvas.width, speedCanvas.height);
    speedCtx.restore();
    speedCanvas.style.opacity = '0';
  }
}

/**
 * Render radial anime-style speed lines emanating from or converging to a center point.
 * Uses a dedicated full-viewport canvas layer. Automatically cleans up after the duration.
 *
 * @param {number} cx - Center x coordinate in viewport pixels.
 * @param {number} cy - Center y coordinate in viewport pixels.
 * @param {'outward'|'inward'} direction - Whether lines radiate outward or converge inward.
 * @param {number} durationMs - Animation duration in milliseconds.
 */
export function startSpeedLines(cx, cy, direction, durationMs) {
  if (!fxEnabled('speedLines')) return;
  getSpeedCanvas();
  // Cancel any previous speed line animation
  _speedLinesActive = true;
  _speedLinesStart = performance.now();
  _speedLinesDuration = durationMs;
  _speedLinesCx = cx;
  _speedLinesCy = cy;
  _speedLinesDirection = direction;
  _speedLinesMaxR = Math.max(speedCanvas.width, speedCanvas.height);
  _speedLinesRGB = _getSpeedLineRGB();
  speedCanvas.style.opacity = '1';
  // Register with master tick
  _masterSubs.speedLines = true;
  _ensureMasterTick();
}

/**
 * Immediately stop and clear the speed lines animation.
 */
export function stopSpeedLines() {
  _speedLinesActive = false;
  _masterSubs.speedLines = false;
  if (speedCtx && speedCanvas) {
    speedCtx.save();
    speedCtx.setTransform(1, 0, 0, 1, 0, 0);
    speedCtx.clearRect(0, 0, speedCanvas.width, speedCanvas.height);
    speedCtx.restore();
    speedCanvas.style.opacity = '0';
  }
}

// ── Particle System ──────────────────────────────────────────────

/**
 * Spawn themed ASCII particles from a center point. Particles are rendered
 * on a shared full-viewport canvas with physics (gravity, drag, velocity decay).
 * Particle count is automatically halved on mobile for performance.
 *
 * @param {number} cx - Center x coordinate in viewport pixels.
 * @param {number} cy - Center y coordinate in viewport pixels.
 * @param {Object} opts - Particle options.
 * @param {number} [opts.count=30] - Number of particles to spawn.
 * @param {number} [opts.spread=8] - Maximum velocity magnitude.
 * @param {number} [opts.gravity=0.15] - Downward acceleration per frame.
 * @param {number[]|string} [opts.color] - RGB tuple `[r,g,b]` or CSS color string.
 * @param {number} [opts.life=80] - Base lifetime in frames.
 * @param {number[]} [opts.size=[2,6]] - `[min, max]` font size range.
 * @param {string[]} [opts.chars] - Character set. Defaults to theme particles.
 * @param {number} [opts.upBias=0] - Initial upward velocity bias.
 * @param {number} [opts.originSpread=10] - Random spread around the origin point.
 * @param {number} [opts.drag=0.98] - Velocity decay multiplier per frame.
 * @param {number} [opts.minVel=1] - Minimum initial velocity.
 */
export function spawnParticles(cx, cy, opts) {
  // Defer particles until after impact flash clears so they're visible on spawn
  const remaining = _flashClearTime - Date.now();
  if (remaining > 0) {
    setTimeout(function() { spawnParticles(cx, cy, opts); }, remaining);
    return;
  }
  getCanvas();
  let count = opts.count || 30;
  if (isMobile) count = Math.min(Math.ceil(count * _mobileDefaults.particleScale), _mobileDefaults.maxParticles);
  else if (isTablet) count = Math.min(Math.ceil(count * _tabletDefaults.particleScale), _tabletDefaults.maxParticles);
  const spread = opts.spread || 8;
  const gravity = opts.gravity !== undefined ? opts.gravity : 0.15;
  const color = opts.color || _theme.particleColor('impact');
  const life = opts.life || 80;
  const sizeRange = opts.size || [2, 6];
  const glyphs = (_ctx.particleStyle && _ctx.particleStyle !== 'default')
    ? _theme.chars(_ctx.particleStyle)
    : (opts.chars || _theme.chars('particles'));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vel = (opts.minVel || 1) + Math.random() * spread;
    particles.push({
      x: cx + (Math.random() - 0.5) * (opts.originSpread || 10),
      y: cy + (Math.random() - 0.5) * (opts.originSpread || 10),
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel - (opts.upBias || 0),
      life: life + Math.random() * 30,
      maxLife: life + 30,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      color: color,
      gravity: gravity,
      char: glyphs[Math.floor(Math.random() * glyphs.length)],
      drag: opts.drag || 0.98,
    });
  }
  if (!particleRAF) _tickParticles();
}

// Inner particle tick — called by master tick loop, no self-scheduling
function _tickParticlesInner(_now) {
  // Health check: re-acquire canvas if detached from DOM (e.g., full page swap)
  if (!canvas || !document.contains(canvas)) {
    canvas = null; ctx = null;
    getCanvas();
  }
  if (!ctx) return;
  // Clear full buffer (identity transform) to prevent DPR-scaled artifacts
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Adaptive quality: cull particles when frame budget is exceeded
  if (_adaptiveParticleScale < 1.0 && particles.length > 30) {
    // Remove every other particle to halve the count
    const kept = [];
    for (let k = 0; k < particles.length; k++) {
      if (k % 2 === 0) kept.push(particles[k]);
    }
    particles.length = 0;
    for (let k = 0; k < kept.length; k++) particles.push(kept[k]);
  }

  // Pass 1: physics, compaction, bucket by font size
  let alive = 0;
  const buckets = {};
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= p.drag; p.vy *= p.drag; p.life--;
    if (p.life <= 0) continue;
    const idx = alive;
    particles[alive++] = p;
    const alpha = Math.min(1, p.life / (p.maxLife * 0.2));
    p._alpha = alpha;
    const fontSize = Math.round(p.size * (0.7 + alpha * 0.3) * 3.5);
    p._fontSize = fontSize;
    if (!buckets[fontSize]) buckets[fontSize] = [];
    buckets[fontSize].push(idx);
  }
  particles.length = alive;

  // Pass 2: render by font-size bucket (minimizes ctx.font changes)
  const sizes = Object.keys(buckets);
  for (let s = 0; s < sizes.length; s++) {
    ctx.font = sizes[s] + 'px monospace';
    const indices = buckets[sizes[s]];
    for (let j = 0; j < indices.length; j++) {
      const p = particles[indices[j]];
      const alpha = p._alpha;
      const c = p.color;
      if (Array.isArray(c)) {
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = c;
      }
      ctx.fillText(p.char || '*', p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

// Legacy entry point — starts particles via the unified master tick
function _tickParticles() {
  _masterSubs.particles = true;
  _ensureMasterTick();
}

/**
 * Push raw particle objects directly into the particle array.
 * Use this for custom particle effects (mushroom cloud, confetti, etc.)
 * that need more control than {@link spawnParticles} provides.
 * Caps total particle count at 500 to prevent memory growth during rapid animations.
 *
 * @param {Array<{x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, color: number[]|string, gravity: number, drag: number, char: string}>} arr - Array of particle objects to push.
 */
const MAX_PARTICLES = 500;
export function pushParticles(arr) {
  getCanvas();
  const cap = isMobile ? _mobileDefaults.maxParticlesTotal : isTablet ? _tabletDefaults.maxParticlesTotal : MAX_PARTICLES;
  for (let i = 0; i < arr.length; i++) particles.push(arr[i]);
  if (particles.length > cap) particles.splice(0, particles.length - cap);
  if (!particleRAF) _tickParticles();
}

/**
 * Spawn smoke particles that rise slowly and fade. Uses theme-aware
 * characters and colors.
 *
 * @param {number} cx - Center x coordinate in viewport pixels.
 * @param {number} cy - Center y coordinate in viewport pixels.
 * @param {number} count - Number of smoke particles. Halved on mobile.
 */
export function spawnSmoke(cx, cy, count) {
  getCanvas();
  if (isMobile) count = Math.min(Math.ceil(count * _mobileDefaults.particleScale), _mobileDefaults.maxParticles);
  else if (isTablet) count = Math.min(Math.ceil(count * _tabletDefaults.particleScale), _tabletDefaults.maxParticles);
  const glyphs = _theme.chars('smoke');
  const color = _theme.particleColor('smoke');
  for (let i = 0; i < count; i++) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 40, y: cy + Math.random() * 10,
      vx: (Math.random() - 0.5) * 0.5, vy: -(0.3 + Math.random() * 0.8),
      life: 90 + Math.random() * 50, maxLife: 140,
      size: 8 + Math.random() * 15, color: color, gravity: -0.01, drag: 0.99,
      char: glyphs[Math.floor(Math.random() * glyphs.length)],
    });
  }
  if (!particleRAF) _tickParticles();
}

/**
 * Spawn a short burst of fire trail particles behind a moving object.
 * Used by meteor-style animations for the re-entry trail effect.
 *
 * @param {number} x - Origin x coordinate in viewport pixels.
 * @param {number} y - Origin y coordinate in viewport pixels.
 * @param {number} angle - Direction of travel in radians (particles emit opposite).
 */
export function spawnFireTrail(x, y, angle) {
  getCanvas();
  const glyphs = _theme.chars('fire');
  const color = _theme.particleColor('fire');
  for (let i = 0; i < 4; i++) {
    const spread = (Math.random() - 0.5) * 0.8;
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle + Math.PI + spread) * (1 + Math.random() * 2),
      vy: Math.sin(angle + Math.PI + spread) * (1 + Math.random() * 2),
      life: 20 + Math.random() * 15, maxLife: 35,
      size: 2 + Math.random() * 4, color: color, gravity: -0.02, drag: 0.96,
      char: glyphs[Math.floor(Math.random() * glyphs.length)],
    });
  }
  if (!particleRAF) _tickParticles();
}

// ── Screen Effects ───────────────────────────────────────────────

let _defaultFlashDuration = 33;
let _flashClearTime = 0; // timestamp when current flash finishes (for particle deferral)
let _flashEl = null;     // cached reference to flash overlay element
let _flashTimer = null;  // cancellation handle for in-flight flash cleanup

/**
 * Flash the screen with an arbitrary color. Uses a flash overlay element
 * (found by configured selector). Respects the `flash` FX toggle.
 *
 * @param {string} color - CSS color for the flash (e.g. 'rgba(255, 200, 50, 0.6)').
 * @param {number} durationMs - Fade-out duration in milliseconds.
 */
export function flashColor(color, durationMs) {
  if (!fxEnabled('flash')) return;
  if (!_flashEl) _flashEl = document.querySelector(_selectors.flashOverlay);
  if (!_flashEl) return;
  if (_flashTimer) { clearTimeout(_flashTimer); _flashTimer = null; }
  _flashEl.style.transition = 'none';
  _flashEl.style.background = color;
  _flashEl.style.opacity = '1';
  requestAnimationFrame(function () {
    _flashEl.style.transition = 'opacity ' + durationMs + 'ms ease-out';
    _flashEl.style.opacity = '0';
    _flashTimer = setTimeout(function () {
      _flashEl.style.background = '';
      _flashTimer = null;
    }, durationMs + 20);
  });
}

/**
 * Trigger an anime-style impact flash — single-frame hold, then fast fade.
 * Uses black for light themes, white for dark themes.
 *
 * @param {boolean} whiteOut - If true, white flash (dark themes). Otherwise black.
 */
export function doImpactFlash(whiteOut) {
  if (!fxEnabled('flash')) return;
  if (!_flashEl) _flashEl = document.querySelector(_selectors.flashOverlay);
  if (!_flashEl) return;

  // Cancel any in-flight flash to prevent style conflicts
  if (_flashTimer) { clearTimeout(_flashTimer); _flashTimer = null; }

  const themeFlashDur = _theme.color('flashDuration');
  const flashDur = themeFlashDur
    ? parseInt(themeFlashDur, 10) || _defaultFlashDuration
    : _defaultFlashDuration;
  const fadeDur = Math.max(flashDur, 16);

  _flashClearTime = Date.now() + 16 + fadeDur;
  _flashEl.style.transition = 'none';
  _flashEl.style.background = whiteOut ? '#fff' : '#000';
  _flashEl.style.opacity = '1';

  requestAnimationFrame(function () {
    _flashEl.style.transition = 'opacity ' + fadeDur + 'ms ease-out';
    _flashEl.style.opacity = '0';
    _flashTimer = setTimeout(function () {
      _flashEl.style.background = '';
      _flashTimer = null;
    }, fadeDur + 20);
  });
}

/**
 * Trigger a screen shake effect by adding a CSS class to the app shell element.
 * Respects the `shake` FX toggle.
 *
 * @param {boolean} heavy - If true, applies a heavier shake (550ms, larger amplitude)
 *   vs. a light shake (450ms).
 */
export function doScreenShake(heavy) {
  if (!fxEnabled('shake')) return;
  const el = document.querySelector(_selectors.appShell) || document.body;
  const cls = heavy ? _classes.shakingHeavy : _classes.shaking;
  el.classList.remove(_classes.shaking, _classes.shakingHeavy);
  requestAnimationFrame(function () {
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, heavy ? 550 : 450);
  });
}

// ── Dotgrid Integration ──────────────────────────────────────────
let _dotgridOverrideFired = false;

function _fireDotgridOverride(cx, cy) {
  if (_dotgridOverrideFired) return;
  _dotgridOverrideFired = true;
  if (!_hasDotgrid()) return;
  const ov = _ctx.dotgridOverride;
  if (!ov || !ov.effect) return;
  const p = ov.params || {};
  switch (ov.effect) {
    case 'ripple':
      _Dotgrid.ripple(cx, cy, p);
      break;
    case 'vortex':
      _Dotgrid.vortex(cx, cy, p);
      break;
    case 'crater':
      _Dotgrid.crater(cx, cy, p.radius || 160, p.depth || 1.0, p);
      break;
    case 'nuclear':
      _Dotgrid.nuclear(cx, cy, p);
      break;
    case 'scorch': {
      const halfLen = (p.length || 300) / 2;
      _Dotgrid.scorch(cx - halfLen, cy, cx + halfLen, cy, p);
      break;
    }
    case 'none':
      break;
  }
}

/**
 * Trigger a dotgrid ripple effect. Respects `dotgrid` FX toggle and
 * dotgrid override context.
 *
 * @param {number} cx - Center x coordinate in viewport pixels.
 * @param {number} cy - Center y coordinate in viewport pixels.
 * @param {Object} [opts] - Options passed through to Dotgrid.ripple.
 */
export function doDotgridRipple(cx, cy, opts) {
  if (!fxEnabled('dotgrid')) return;
  if (_ctx.dotgridOverride) {
    _fireDotgridOverride(cx, cy);
    return;
  }
  if (_hasDotgrid()) _Dotgrid.ripple(cx, cy, opts);
}

/**
 * Trigger a dotgrid crater effect.
 *
 * @param {number} cx - Center x coordinate in viewport pixels.
 * @param {number} cy - Center y coordinate in viewport pixels.
 * @param {number} radius - Crater radius in pixels.
 * @param {number} depth - Crater depth multiplier.
 * @param {Object} [opts] - Options passed through to Dotgrid.crater.
 */
export function doDotgridCrater(cx, cy, radius, depth, opts) {
  if (!fxEnabled('dotgrid')) return;
  if (_ctx.dotgridOverride) {
    _fireDotgridOverride(cx, cy);
    return;
  }
  if (_hasDotgrid()) _Dotgrid.crater(cx, cy, radius, depth, opts);
}

/**
 * Trigger a dotgrid nuclear mushroom cloud effect.
 *
 * @param {number} cx - Center x coordinate in viewport pixels.
 * @param {number} cy - Center y coordinate in viewport pixels.
 */
export function doDotgridNuclear(cx, cy) {
  if (!fxEnabled('dotgrid')) return;
  if (_ctx.dotgridOverride) {
    _fireDotgridOverride(cx, cy);
    return;
  }
  if (_hasDotgrid()) _Dotgrid.nuclear(cx, cy);
}

/**
 * Trigger a dotgrid scorch trail effect.
 *
 * @param {number} x1 - Start x coordinate in viewport pixels.
 * @param {number} y1 - Start y coordinate in viewport pixels.
 * @param {number} x2 - End x coordinate in viewport pixels.
 * @param {number} y2 - End y coordinate in viewport pixels.
 * @param {number} width - Trail width in pixels.
 */
export function doDotgridScorch(x1, y1, x2, y2, width) {
  if (!fxEnabled('dotgrid')) return;
  if (_ctx.dotgridOverride) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    _fireDotgridOverride(midX, midY);
    return;
  }
  if (_hasDotgrid()) _Dotgrid.scorch(x1, y1, x2, y2, width);
}

// ── Card Helpers ─────────────────────────────────────────────────

/**
 * Extract animation-related sub-elements from an item card.
 * Uses configurable selectors set via configure().
 *
 * @param {HTMLElement} el - The item DOM element.
 * @returns {{shadow: HTMLElement|null, burst: HTMLElement|null, badge: HTMLElement|null, strike: HTMLElement|null}}
 *   Object containing the shadow overlay, impact burst, done badge, and strikethrough elements.
 */
export function getSubElements(el) {
  return {
    shadow: el.querySelector(_selectors.shadow),
    burst: el.querySelector(_selectors.burst),
    badge: el.querySelector(_selectors.badge),
    strike: el.querySelector(_selectors.strike),
  };
}

/**
 * Get the center coordinates and bounding rect of an item element.
 *
 * @param {HTMLElement} el - The item DOM element.
 * @returns {{cx: number, cy: number, rect: DOMRect}} Center x/y and the full bounding rect.
 */
export function getItemRect(el) {
  const rect = el.getBoundingClientRect();
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, rect: rect };
}

/**
 * Convert a 1-10 intensity value to a 0.3-1.0 scale factor for particle counts, sizes, etc.
 *
 * @param {number} intensity - User-configured intensity (1-10).
 * @returns {number} Scale factor in the range [0.3, 1.0].
 */
export function intensityScale(intensity) {
  return 0.3 + (intensity / 10) * 0.7;
}

// ── Card Promotion & Animation Pipeline ──────────────────────────

/**
 * Promote a card element from its nested DOM position to a body-level wrapper
 * with CSS perspective for 3D transforms. Creates a fixed-position stage on
 * `<body>` and a placeholder to maintain layout space in the original location.
 *
 * @param {HTMLElement} card - The card element to promote. After promotion,
 *   `card._animStage` and `card._animPlaceholder` are set for cleanup.
 * @returns {HTMLElement} The placeholder element maintaining layout space.
 */
export function promoteCard(card) {
  const rect = card.getBoundingClientRect();

  // Create a placeholder to maintain layout space
  const placeholder = document.createElement('div');
  placeholder.className = _classes.placeholder;
  placeholder.style.cssText = 'height:' + rect.height + 'px;margin-bottom:10px;opacity:0;pointer-events:none;';
  card.parentNode.insertBefore(placeholder, card);

  // Create body-level perspective wrapper
  const wrapper = document.createElement('div');
  wrapper.className = _classes.stage;
  wrapper.style.cssText = 'position:fixed;inset:0;z-index:9997;pointer-events:none;perspective:1200px;perspective-origin:' + rect.left + 'px ' + (rect.top + rect.height / 2) + 'px;';
  document.body.appendChild(wrapper);

  // Move card into wrapper, positioned at its original screen location.
  // Batch all style writes into single cssText to avoid per-property reflow.
  // Kills transitions, clears base transform (translateZ(0)) so it doesn't
  // interact with the perspective wrapper.
  card.style.cssText += ';transition:none;transform:none;position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;margin:0;pointer-events:none;';
  wrapper.appendChild(card);

  // Store references for cleanup
  card._animStage = wrapper;
  card._animPlaceholder = placeholder;
  return placeholder;
}

/**
 * Lift a card upward using CSS 3D transforms with perspective. Promotes the card
 * to a body-level wrapper, applies a smooth translateZ + rotation transition,
 * and triggers outward speed lines. Handles card visibility based on the
 * completion context's `cardHideDelay` setting.
 *
 * @param {HTMLElement} card - The card element to lift.
 * @param {HTMLElement|null} shadow - The card's shadow sub-element.
 * @param {number} cx - Center x coordinate in viewport pixels (for speed lines).
 * @param {number} cy - Center y coordinate in viewport pixels (for speed lines).
 * @param {number} peakZ - Maximum translateZ height in pixels.
 * @param {number} liftDuration - Base lift duration in milliseconds (speed-scaled).
 * @param {number} rotX - X-axis rotation in degrees at peak.
 * @param {number} rotY - Y-axis rotation in degrees at peak.
 * @param {Function} onDone - Callback fired after the lift transition completes.
 */
export function liftCard(card, shadow, cx, cy, peakZ, liftDuration, rotX, rotY, onDone) {
  // Pause dotgrid during lift+fall to free frame budget for canvas effects.
  // Auto-resume after lift+fall duration so the impact ripple can play.
  if (_hasDotgrid() && _Dotgrid.pause) {
    const totalAnimDur = speedScale(liftDuration) + 500; // lift + estimated fall + buffer
    _Dotgrid.pause(totalAnimDur);
  }

  // Promote card to body-level for unclipped 3D transforms
  promoteCard(card);

  card.classList.add(_classes.animating);

  // Card hide timing from completion context
  const hideDelay = (_ctx.completion && _ctx.completion.cardHideDelay !== undefined)
    ? _ctx.completion.cardHideDelay : -1;
  if (hideDelay === 0) {
    // Instant hide — card disappears immediately, animation plays without it
    card.style.opacity = '1';
    destroyCard(card);
  } else if (hideDelay > 0) {
    // Delayed hide — card visible initially, destroyed after delay
    card.classList.add(_classes.visible);
    card.style.opacity = '1';
    setTimeout(function () { destroyCard(card); }, speedScale(hideDelay));
  } else {
    // Default (-1): card stays visible throughout thud animation
    card.classList.add(_classes.visible);
    card.style.opacity = '1';
  }

  // Ensure fully opaque background during animation (mobile can show through)
  card.style.background = 'var(--surface)';

  // Set initial position, then start transition on next frame
  card.style.transform = 'translateZ(0)';

  const glowColor = _theme.color('glow') || 'rgba(196,90,60,0.15)';
  const dur = speedScale(liftDuration);

  requestAnimationFrame(function () {
    let liftTransition = 'transform ' + dur + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
    if (!isMobile) liftTransition += ', box-shadow ' + dur + 'ms ease';
    card.style.transition = liftTransition;
    card.style.transform = 'translateZ(' + peakZ + 'px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    if (!isMobile) card.style.boxShadow = '0 40px 100px ' + glowColor + ', 0 0 60px ' + glowColor;

    if (shadow) {
      let shadowTransition = 'opacity ' + dur + 'ms ease, transform ' + dur + 'ms ease';
      // Skip filter: blur() transitions on mobile AND tablet — paint killer on iPad
      if (!isMobile && !isTablet) shadowTransition += ', filter ' + dur + 'ms ease';
      shadow.style.transition = shadowTransition;
      const shadowScale = Math.min(peakZ / 300, 1.5);
      shadow.style.opacity = String(0.6 + shadowScale * 0.15);
      shadow.style.transform = 'translateY(' + (20 + shadowScale * 25) + 'px) scaleX(' + (1 + shadowScale * 0.15) + ') scaleY(' + (1 + shadowScale * 0.2) + ')';
      // Skip animated blur on mobile and tablet — static blur is OK on tablet
      if (!isMobile && !isTablet) shadow.style.filter = 'blur(' + (16 + shadowScale * 16) + 'px)';
      else if (isTablet) shadow.style.filter = 'blur(14px)';
    }

    startSpeedLines(cx, cy, 'outward', dur);
    setTimeout(onDone, dur + 40);
  });
}

/**
 * Animate a card falling from its lifted position to ground level using
 * a power-curve easing function (`t^easeExp`). Triggers inward speed lines
 * during the fall. Uses requestAnimationFrame for smooth per-frame interpolation.
 *
 * @param {HTMLElement} card - The card element (already lifted via liftCard).
 * @param {HTMLElement|null} shadow - The card's shadow sub-element.
 * @param {number} peakZ - The starting translateZ height (from liftCard).
 * @param {number} rotX - Starting X-axis rotation in degrees.
 * @param {number} rotY - Starting Y-axis rotation in degrees.
 * @param {number} fallDuration - Base fall duration in milliseconds (speed-scaled).
 * @param {number} easeExp - Power curve exponent (higher = more aggressive acceleration).
 * @param {number} cx - Center x coordinate for speed lines.
 * @param {number} cy - Center y coordinate for speed lines.
 * @param {Function} onImpact - Callback fired when the card reaches ground level.
 */
export function gravityFall(card, shadow, peakZ, rotX, rotY, fallDuration, easeExp, cx, cy, onImpact) {
  card.style.transition = 'none';
  if (shadow) shadow.style.transition = 'none';

  const dur = speedScale(fallDuration);
  startSpeedLines(cx, cy, 'inward', dur);

  const start = performance.now();
  const glowColor = _theme.color('glow') || 'rgba(196,90,60,0.15)';
  let _fallFrame = 0;

  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const eased = Math.pow(t, easeExp);
    const z = peakZ * (1 - eased);
    card.style.transform = 'translateZ(' + z + 'px) rotateX(' + (rotX * (1 - eased)) + 'deg) rotateY(' + (rotY * (1 - eased)) + 'deg)';

    const si = z / peakZ;
    if (shadow) {
      shadow.style.opacity = String(si * 0.8);
      shadow.style.transform = 'translateY(' + (si * 45) + 'px) scaleX(' + (1 + si * 0.2) + ') scaleY(' + (1 + si * 0.3) + ')';
    }

    // Paint-heavy properties: throttle to every 3rd frame on desktop,
    // skip entirely on mobile/tablet. Reduces paint invalidations ~66%.
    if (!isMobile && !isTablet && (_fallFrame % 3 === 0 || t >= 1)) {
      if (shadow) shadow.style.filter = 'blur(' + (14 + si * 18) + 'px)';
      const gi = si * 0.2;
      card.style.boxShadow = '0 ' + (si * 40) + 'px ' + (si * 100) + 'px rgba(0,0,0,' + gi + '), 0 0 ' + (si * 60) + 'px ' + glowColor;
    }
    _fallFrame++;

    if (t < 1) requestAnimationFrame(step);
    else { stopSpeedLines(); onImpact(); }
  }
  requestAnimationFrame(step);
}

/**
 * Play the standard impact sequence: card squash, shadow spread, burst glow,
 * impact flash, screen shake, and dotgrid ripple. Followed by a recovery
 * transition that restores the card to normal scale.
 *
 * @param {HTMLElement} card - The card element.
 * @param {HTMLElement|null} shadow - The card's shadow sub-element.
 * @param {HTMLElement|null} burst - The card's impact burst sub-element.
 * @param {number} cx - Impact center x coordinate in viewport pixels.
 * @param {number} cy - Impact center y coordinate in viewport pixels.
 */
export function standardImpact(card, shadow, burst, cx, cy) {
  const glowColor = _theme.color('glow') || 'rgba(196,90,60,0.15)';

  // Write phase 1: set squash (no transition, instant)
  card.style.transition = 'none';
  card.style.transform = fxEnabled('cardSquash') ? 'translateZ(0) scaleY(0.92)' : 'translateZ(0)';
  // On mobile, skip box-shadow (triggers paint, not GPU-compositable)
  if (!isMobile) {
    card.style.boxShadow = '0 0 40px ' + glowColor + ', 0 0 80px ' + glowColor;
  }

  if (shadow) {
    shadow.style.transition = 'none';
    shadow.style.opacity = '1';
    shadow.style.transform = 'translateY(2px) scaleX(1.4) scaleY(0.4)';
    // Static blur on tablet, animated blur only on desktop
    if (isTablet) shadow.style.filter = 'blur(14px)';
    else if (!isMobile) shadow.style.filter = 'blur(14px)';
  }

  if (burst) {
    burst.style.transition = 'none';
    burst.style.opacity = '1';
    burst.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, ' + glowColor + ' 40%, transparent 70%)';
  }

  doImpactFlash(false);
  doScreenShake(false);
  // Resume dotgrid before ripple so the effect plays
  if (_hasDotgrid() && _Dotgrid.resume) _Dotgrid.resume();
  doDotgridRipple(cx, cy);

  // Write phase 2: recovery transitions — next frame
  requestAnimationFrame(function () {
    if (isMobile) {
      // Mobile: only animate GPU-friendly transform + opacity
      card.style.transition = fxEnabled('cardSquash')
        ? 'transform 0.18s cubic-bezier(0.25,1,0.5,1)'
        : 'none';
      card.style.transform = 'translateZ(0) scaleY(1)';
    } else if (isTablet) {
      // Tablet: animate transform but skip box-shadow transitions
      card.style.transition = fxEnabled('cardSquash')
        ? 'transform 0.18s cubic-bezier(0.25,1,0.5,1)'
        : 'none';
      card.style.transform = 'translateZ(0) scaleY(1)';
      card.style.boxShadow = '';
    } else {
      card.style.transition = fxEnabled('cardSquash')
        ? 'transform 0.18s cubic-bezier(0.25,1,0.5,1), box-shadow 0.3s ease-out'
        : 'box-shadow 0.3s ease-out';
      card.style.transform = 'translateZ(0) scaleY(1)';
      card.style.boxShadow = '0 0 15px ' + glowColor;
    }

    if (shadow) {
      shadow.style.transition = (isMobile || isTablet) ? 'opacity 0.3s ease-out' : 'all 0.3s ease-out';
      shadow.style.opacity = '0';
      if (!isMobile) shadow.style.transform = 'translateY(0) scaleX(1) scaleY(1)';
    }
    if (burst) {
      burst.style.transition = 'opacity 0.2s ease-out';
      burst.style.opacity = '0';
    }
  });
}

/**
 * Animate the completion sequence: strikethrough, done badge popup, badge fade,
 * then card exit (fade + shrink + placeholder collapse). Respects completion
 * context options from the animation context.
 *
 * Completion context options (set via setContext):
 * - `showStrikethrough` {boolean} (default `true`) — animate strikethrough line
 * - `showBadge` {boolean} (default `true`) — show the "done" badge popup
 * - `badgeText` {string} (default `'done'`) — text shown in badge
 * - `badgeDuration` {number} (default `500`) — how long badge stays visible (ms)
 * - `badgeColor` {string} (default `'var(--green)'`) — badge/strike CSS color
 * - `cardHideDelay` {number} (default `-1`) — when to hide the card:
 *   `-1` = auto (animation decides), `0` = instant, `>0` = delayed ms
 *
 * @param {HTMLElement} card - The card element.
 * @param {HTMLElement|null} badge - The done badge sub-element.
 * @param {HTMLElement|null} strike - The strikethrough sub-element.
 * @param {number} delayBase - Base delay in ms before starting the completion sequence (speed-scaled).
 * @param {Function} [onDone] - Callback fired after full cleanup.
 */
export function completeAndRemove(card, badge, strike, delayBase, onDone) {
  const d = speedScale(delayBase);
  const c = _ctx.completion || {};
  const showStrike = c.showStrikethrough !== false;
  const showBadge = c.showBadge !== false;
  const badgeText = c.badgeText || 'done';
  const badgeDur = c.badgeDuration !== undefined ? c.badgeDuration : 500;
  const badgeColor = c.badgeColor || 'var(--green)';

  // Update badge text if customized
  if (badge && badgeText !== 'done') badge.textContent = badgeText;

  // Strikethrough
  if (showStrike) {
    setTimeout(function () {
      card.classList.add(_classes.done);
      card.style.boxShadow = '';
      if (strike) {
        strike.style.transition = 'width ' + speedScale(250) + 'ms cubic-bezier(0.22,1,0.36,1)';
        strike.style.width = '100%';
        strike.style.background = badgeColor;
      }
    }, d);
  } else {
    setTimeout(function () {
      card.style.boxShadow = '';
    }, d);
  }

  // Done badge popup
  if (showBadge) {
    setTimeout(function () {
      if (badge) {
        badge.style.color = badgeColor;
        badge.style.transition = 'transform ' + speedScale(200) + 'ms cubic-bezier(0.22,1,0.36,1), opacity ' + speedScale(200) + 'ms ease';
        badge.style.transform = 'translate(-50%,-50%) scale(1)';
        badge.style.opacity = '1';
      }
    }, d + speedScale(150));

    // Badge fade
    setTimeout(function () {
      if (badge) {
        badge.style.transition = 'opacity ' + speedScale(200) + 'ms ease';
        badge.style.opacity = '0';
      }
    }, d + speedScale(150 + badgeDur));
  }

  // Card exit timing: after badge fades (or immediately if no badge/strike)
  const exitDelay = showBadge ? d + speedScale(150 + badgeDur + 200) : (showStrike ? d + speedScale(350) : d + speedScale(100));

  setTimeout(function () {
    card.classList.remove(_classes.visible);
    card.style.transition = 'opacity ' + speedScale(300) + 'ms ease, transform ' + speedScale(350) + 'ms ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-8px) scale(0.96)';

    const ph = card._animPlaceholder;
    if (ph) {
      ph.style.transition = 'height ' + speedScale(350) + 'ms ease, margin-bottom ' + speedScale(350) + 'ms ease';
      ph.style.height = '0px';
      ph.style.marginBottom = '0px';
    }

    setTimeout(function () {
      if (card._animStage) { card._animStage.remove(); card._animStage = null; }
      if (card._animPlaceholder) { card._animPlaceholder.remove(); card._animPlaceholder = null; }
      card.classList.remove(_classes.animating);
      if (onDone) onDone();
    }, speedScale(400));
  }, exitDelay);
}

/**
 * Clean up a card after animation: hide it, detach from DOM, remove the
 * animation stage wrapper and placeholder, reset CSS classes and inline styles.
 *
 * @param {HTMLElement} card - The card element to clean up.
 */
export function cleanupCard(card) {
  // Hide card before any cleanup to prevent flash on reflow
  card.style.display = 'none';
  // Detach card from DOM before resetting styles to prevent flash
  const parentBeforeClean = card.parentNode;
  if (parentBeforeClean) parentBeforeClean.removeChild(card);

  // Clean up animation stage and placeholder
  if (card._animStage) {
    card._animStage.remove();
    card._animStage = null;
  }
  if (card._animPlaceholder) {
    card._animPlaceholder.remove();
    card._animPlaceholder = null;
  }
  card.classList.remove(_classes.animating);
  card.classList.remove(_classes.destroyed);
  card.classList.remove(_classes.visible);
  card.style.cssText = '';
}

/**
 * Remove a card with a simple fade-out and placeholder collapse.
 * Used by deletion animations that don't need strikethrough/badge effects.
 *
 * @param {HTMLElement} card - The card element to remove.
 * @param {number} fadeDelay - Delay in ms before starting the fade (speed-scaled).
 * @param {Function} [onDone] - Callback fired after full cleanup.
 */
export function removeCard(card, fadeDelay, onDone) {
  setTimeout(function () {
    // Fade the card
    card.style.transition = 'opacity ' + speedScale(250) + 'ms ease-out';
    card.style.opacity = '0';

    setTimeout(function () {
      // Collapse placeholder
      if (card._animPlaceholder) {
        card._animPlaceholder.style.transition = 'height ' + speedScale(300) + 'ms ease, margin-bottom ' + speedScale(300) + 'ms ease';
        card._animPlaceholder.style.height = '0px';
        card._animPlaceholder.style.marginBottom = '0px';
      }

      setTimeout(function () {
        cleanupCard(card);
        if (onDone) onDone();
      }, speedScale(350));
    }, speedScale(250));
  }, speedScale(fadeDelay));
}

// ── FX Canvas (for custom rendering) ─────────────────────────────
/** @type {HTMLCanvasElement|null} */
let fxCanvas = null;
/** @type {CanvasRenderingContext2D|null} */
let fxCtx = null;

/**
 * Get or create the full-viewport FX canvas (z-index 9999, pointer-events: none).
 * Used by animations for custom particle/effect rendering.
 *
 * @returns {HTMLCanvasElement} The FX canvas element.
 */
export function getFxCanvas() {
  // Health check: re-acquire if cached ref was detached from DOM
  if (fxCanvas && !document.contains(fxCanvas)) { fxCanvas = null; fxCtx = null; }
  if (fxCanvas) return fxCanvas;
  fxCanvas = document.getElementById('fx-canvas');
  if (!fxCanvas) {
    fxCanvas = document.createElement('canvas');
    fxCanvas.id = 'fx-canvas';
    fxCanvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
    document.body.appendChild(fxCanvas);
  }
  fxCtx = fxCanvas.getContext('2d');
  _resizeFxCanvas();
  return fxCanvas;
}

/**
 * Get the 2D rendering context of the FX canvas. Creates the canvas if needed.
 *
 * @returns {CanvasRenderingContext2D} The 2D context.
 */
export function getFxCtx() {
  getFxCanvas();
  return fxCtx;
}

function _resizeFxCanvas() {
  if (!fxCanvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  fxCanvas.width = window.innerWidth * dpr;
  fxCanvas.height = window.innerHeight * dpr;
  fxCanvas.style.width = window.innerWidth + 'px';
  fxCanvas.style.height = window.innerHeight + 'px';
  if (fxCtx) fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', _resizeFxCanvas);
}

// ── Drawing Helpers ──────────────────────────────────────────────

/**
 * Draw a single ASCII character on a canvas with optional rotation.
 * Uses `ctx.save()/restore()` for transform isolation.
 *
 * @param {CanvasRenderingContext2D} targetCtx - The canvas context to draw on.
 * @param {string} ch - The character to draw.
 * @param {number} x - X coordinate in canvas pixels.
 * @param {number} y - Y coordinate in canvas pixels.
 * @param {string} color - CSS fill color.
 * @param {number} size - Font size in pixels.
 * @param {number} alpha - Opacity (0-1). Currently unused (color should include alpha).
 * @param {number} rotation - Rotation angle in radians.
 */
export function drawAsciiChar(targetCtx, ch, x, y, color, size, alpha, rotation) {
  targetCtx.save();
  targetCtx.translate(x, y);
  if (rotation) targetCtx.rotate(rotation);
  targetCtx.font = size + 'px monospace';
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';
  targetCtx.fillStyle = color;
  targetCtx.fillText(ch, 0, 0);
  targetCtx.restore();
}

/**
 * High-performance character drawing — avoids `ctx.save()/restore()` per call.
 * Only sets font when size changes between calls, uses manual translate+rotate
 * undo instead of save/restore. Call {@link resetDrawFont} at the start of
 * each new frame sequence.
 *
 * @param {CanvasRenderingContext2D} targetCtx - The canvas context to draw on.
 * @param {string} ch - The character to draw.
 * @param {number} x - X coordinate in canvas pixels.
 * @param {number} y - Y coordinate in canvas pixels.
 * @param {string} color - CSS fill color.
 * @param {number} size - Font size in pixels.
 * @param {number} alpha - Opacity (0-1), set via `globalAlpha`.
 * @param {number} rotation - Rotation angle in radians. 0 for no rotation.
 */
let _lastDrawFont = '';
export function drawChar(targetCtx, ch, x, y, color, size, alpha, rotation) {
  const font = size + 'px monospace';
  if (font !== _lastDrawFont) { targetCtx.font = font; _lastDrawFont = font; }
  targetCtx.globalAlpha = alpha;
  targetCtx.fillStyle = color;
  if (rotation) {
    targetCtx.translate(x, y);
    targetCtx.rotate(rotation);
    targetCtx.fillText(ch, 0, 0);
    targetCtx.rotate(-rotation);
    targetCtx.translate(-x, -y);
  } else {
    targetCtx.fillText(ch, x, y);
  }
}

/**
 * Reset the cached font state for {@link drawChar}.
 * Call this at the start of each new frame sequence to ensure
 * the first `drawChar` call sets the font correctly.
 */
export function resetDrawFont() { _lastDrawFont = ''; }

// ── Shared Helpers ───────────────────────────────────────────────

// Performance: throttled shadow rendering.
// shadowBlur is extremely expensive (GPU blur filter per draw call).
// On desktop, only apply every 3rd frame. On mobile, never.
let _frameCount = 0;

/**
 * Increment the internal frame counter. Must be called once per animation frame
 * by any animation that uses {@link shouldShadow}.
 */
export function tickFrame() { _frameCount++; }

/**
 * Check whether canvas shadow effects should be rendered this frame.
 * Returns false on mobile (never) and true every 3rd frame on desktop
 * to avoid the expensive GPU blur filter.
 *
 * @returns {boolean} True if shadows should be rendered this frame.
 */
export function shouldShadow() { return !isMobile && !isTablet && (_frameCount % 3 === 0); }

/**
 * Scale a particle count for the current device tier.
 * Mobile: aggressive reduction. Tablet: 60% of desktop. Desktop: full count.
 *
 * @param {number} n - The desktop particle count.
 * @returns {number} The scaled count.
 */
export function pCount(n) {
  if (isMobile) return Math.min(Math.ceil(n * _mobileDefaults.particleScale), _mobileDefaults.maxParticles);
  if (isTablet) return Math.min(Math.ceil(n * _tabletDefaults.particleScale), _tabletDefaults.maxParticles);
  return n;
}

/**
 * Prepare a card for animation: cancel any existing animation on the element,
 * promote it to a body-level wrapper, mark it as animating, and capture its
 * bounding rect. Handles card hide timing from the completion context.
 *
 * @param {HTMLElement} el - The card element to prepare.
 * @returns {{cx: number, cy: number, rect: DOMRect, w: number, h: number}}
 *   Center coordinates and dimensions of the card after promotion.
 */
export function prepareCard(el) {
  // Cancel any running animation on this element
  cancelAnimation(el);

  promoteCard(el);
  el.classList.add(_classes.animating);
  el.style.opacity = '1';
  el.style.background = 'var(--surface)';
  // Capture rect AFTER promotion so coordinates match the card's
  // actual fixed-position rendering — avoids any offset from
  // reparenting, scroll position, or ancestor transforms.
  const rect = el.getBoundingClientRect();

  // Card hide timing from completion context
  const hideDelay = (_ctx.completion && _ctx.completion.cardHideDelay !== undefined)
    ? _ctx.completion.cardHideDelay : -1;
  if (hideDelay === 0) {
    destroyCard(el);
  } else if (hideDelay > 0) {
    setTimeout(function () { destroyCard(el); }, speedScale(hideDelay));
  }

  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, rect: rect, w: rect.width, h: rect.height };
}

/**
 * Finalize an animation: collapse the placeholder and clean up. The card is
 * already visually destroyed by the animation — this collapses its placeholder
 * height, then removes everything. Card stays hidden (display:none) to prevent flash.
 *
 * @param {HTMLElement} el - The card element to finalize.
 * @param {Object} opts - Animation options (must contain `onDone` callback).
 * @param {Function} [opts.onDone] - Callback fired after cleanup completes.
 */
export function finalize(el, opts) {
  el.style.visibility = 'hidden';
  el.style.opacity = '0';
  el.style.display = 'none';
  const ph = el._animPlaceholder;
  if (ph) {
    ph.style.transition = 'height ' + speedScale(250) + 'ms ease, margin-bottom ' + speedScale(250) + 'ms ease';
    ph.style.height = '0';
    ph.style.marginBottom = '0';
  }
  setTimeout(function () {
    deregisterAnimation(el);
    cleanupCard(el);
    el.style.display = 'none';
    if (opts.onDone) opts.onDone();
  }, speedScale(280));
}

/**
 * Hide a card instantly for death/destruction animations. Adds the
 * destroyed class and sets opacity/visibility to hidden.
 *
 * @param {HTMLElement} el - The card element to destroy visually.
 */
export function destroyCard(el) {
  el.classList.add(_classes.destroyed);
  el.style.opacity = '0';
  el.style.visibility = 'hidden';
}

// ── Animation Cancellation System ────────────────────────────────

/** @type {Map<HTMLElement, {rafIds: Set<number>, cleanup: Function|null}>} */
const _activeAnimations = new Map();

/**
 * Register a requestAnimationFrame ID for an element's running animation.
 * Used by the cancellation system to cancel all frames when a new animation
 * starts on the same element.
 *
 * @param {HTMLElement} el - The animated element.
 * @param {number} rafId - The requestAnimationFrame handle.
 */
export function registerAnimation(el, rafId) {
  if (!_activeAnimations.has(el)) {
    _activeAnimations.set(el, { rafIds: new Set(), cleanup: null });
  }
  _activeAnimations.get(el).rafIds.add(rafId);
}

/**
 * Set a cleanup function for an element's animation. Called when the animation
 * is cancelled via {@link cancelAnimation}.
 *
 * @param {HTMLElement} el - The animated element.
 * @param {Function} cleanupFn - Cleanup function to call on cancellation.
 */
export function setAnimationCleanup(el, cleanupFn) {
  const entry = _activeAnimations.get(el);
  if (entry) entry.cleanup = cleanupFn;
}

/**
 * Cancel all running animations on an element. Cancels all registered
 * requestAnimationFrame handles and calls the cleanup function if set.
 *
 * @param {HTMLElement} el - The element whose animation to cancel.
 * @returns {boolean} True if an animation was cancelled, false if none was running.
 */
export function cancelAnimation(el) {
  const entry = _activeAnimations.get(el);
  if (!entry) return false;
  entry.rafIds.forEach(function (id) { cancelAnimationFrame(id); });
  if (entry.cleanup) entry.cleanup();
  _activeAnimations.delete(el);
  return true;
}

/**
 * Remove an element from the active animations registry without cancelling.
 * Called after an animation completes normally.
 *
 * @param {HTMLElement} el - The element to deregister.
 */
export function deregisterAnimation(el) {
  _activeAnimations.delete(el);
}

// ── Context Management ───────────────────────────────────────────

/**
 * Set the runtime animation context. Called before each animation to configure
 * speed multiplier, per-call FX overrides, completion behavior, and dotgrid
 * override settings.
 *
 * @param {Object} [opts] - Context options.
 * @param {number} [opts.speed=1] - Speed multiplier (>1 = faster).
 * @param {Object} [opts.fx] - Per-call FX toggle overrides (e.g. `{shake: true, flash: false}`).
 * @param {Object} [opts.fxOverrides] - Alias for opts.fx (takes precedence).
 * @param {Object} [opts.completion] - Completion behavior overrides (badge text, colors, timing).
 * @param {{effect: string, params: Object}|null} [opts.dotgridOverride] - Override all dotgrid
 *   proxy calls to a single specified effect ('ripple', 'vortex', 'crater', 'nuclear', 'scorch', 'none').
 * @param {boolean} [opts.disableFlash=false] - Accessibility: disable all flash effects.
 * @param {string} [opts.particleStyle] - Override particle character set (e.g. 'fire', 'smoke').
 * @param {Function} [opts.onBeforeReset] - Called before dotgrid reset (for custom integrations).
 */
export function setContext(opts) {
  // Reset dotgrid if configured to prevent compound effects
  if (_hasDotgrid() && _Dotgrid.reset && opts && opts.resetDotgrid) {
    _Dotgrid.reset();
  }
  _ctx.speed = (opts && opts.speed) || 1;
  _ctx.fxOverrides = (opts && (opts.fxOverrides || opts.fx)) || null;
  _ctx.completion = (opts && opts.completion) || null;
  _ctx.dotgridOverride = (opts && opts.dotgridOverride) || null;
  _ctx.disableFlash = (opts && opts.disableFlash) || false;
  _ctx.particleStyle = (opts && opts.particleStyle) || null;
  _dotgridOverrideFired = false;
}

/**
 * Reset the runtime animation context to defaults (speed=1, no overrides).
 * Called after each animation completes.
 */
export function clearContext() {
  _ctx.speed = 1;
  _ctx.fxOverrides = null;
  _ctx.completion = null;
  _ctx.dotgridOverride = null;
  _ctx.disableFlash = false;
  _ctx.particleStyle = null;
  _dotgridOverrideFired = false;
  // Stop speed lines to prevent orphaned RAF loops
  _speedLinesActive = false;
}

// ── Query ────────────────────────────────────────────────────────

/**
 * Check whether the FX system is idle (no particles or speed lines active).
 *
 * @returns {boolean} True if no animations are currently rendering.
 */
export function isIdle() {
  return particles.length === 0 && !_speedLinesActive;
}

/**
 * Get the current adaptive quality level (0.5 or 1.0). Degrades automatically
 * when the browser can't maintain 60fps.
 *
 * @returns {number} Quality level (1.0 = full, 0.5 = degraded).
 */
export function getAdaptiveQuality() {
  return _adaptiveQuality;
}

// ── Warmup ───────────────────────────────────────────────────────

/**
 * Warm up the animation pipeline during idle time to eliminate first-animation delay.
 * Eagerly initializes canvas contexts and runs a silent off-screen phantom animation
 * to warm JIT, compositor layers, and layout caches.
 *
 * Call this after page load or during idle time. Automatically runs on import
 * if `requestIdleCallback` is available.
 */
export function warmup() {
  // Eagerly acquire canvas contexts
  getCanvas();
  getSpeedCanvas();

  // Silent phantom animation to warm the full pipeline
  const phantom = document.createElement('div');
  phantom.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:300px;height:50px;opacity:0;pointer-events:none;';
  // Add sub-elements that getSubElements() expects
  const shadowEl = document.createElement('div'); shadowEl.className = _selectors.shadow.replace('.', '');
  const burstEl = document.createElement('div'); burstEl.className = _selectors.burst.replace('.', '');
  phantom.appendChild(shadowEl);
  phantom.appendChild(burstEl);
  document.body.appendChild(phantom);

  // Run promoteCard + cleanupCard to warm layout/compositor paths
  try {
    promoteCard(phantom);
    cleanupCard(phantom);
  } catch (_e) { /* swallow — phantom may not have full structure */ }

  // Clean up
  if (phantom.parentNode) phantom.parentNode.removeChild(phantom);

  // Warm the impact flash overlay — cache ref + prime rAF path
  _flashEl = document.querySelector(_selectors.flashOverlay);
  if (_flashEl) {
    _flashEl.style.transition = 'none';
    _flashEl.style.background = '#000';
    _flashEl.style.opacity = '0';
    requestAnimationFrame(function() {
      _flashEl.style.transition = 'opacity 1ms ease-out';
      _flashEl.style.opacity = '0';
      requestAnimationFrame(function() {
        _flashEl.style.background = '';
        _flashEl.style.transition = '';
      });
    });
  }

  // Warm screen shake path
  const shakeTarget = document.querySelector(_selectors.appShell) || document.body;
  shakeTarget.classList.add(_classes.shaking);
  requestAnimationFrame(function() {
    shakeTarget.classList.remove(_classes.shaking);
  });
}

// ── Param Resolution ─────────────────────────────────────────────

/**
 * Merge parameter descriptors with optional overrides. Returns an object
 * with each param key mapped to its resolved value (override if present,
 * otherwise the descriptor's default). Duration parameters (unit: 'ms')
 * are automatically scaled by the current speed context.
 *
 * @param {Object} descriptors - Parameter descriptors. Each key maps to
 *   `{default: any, unit?: string}`. If `unit` is `'ms'`, the value is
 *   automatically speed-scaled.
 * @param {Object} [overrides] - Override values keyed by parameter name.
 * @returns {Object} Resolved parameter values.
 *
 * @example
 * const params = resolveParams({
 *   liftHeight: { default: 450 },
 *   liftDuration: { default: 350, unit: 'ms' },
 * }, { liftHeight: 600 });
 * // => { liftHeight: 600, liftDuration: 350 / speed }
 */
export function resolveParams(descriptors, overrides) {
  const result = {};
  const descs = descriptors || {};
  const over = overrides || {};
  for (const key in descs) {
    if (descs.hasOwnProperty(key)) {
      let val = over[key] !== undefined ? over[key] : descs[key].default;
      // Auto-scale ms params by current speed context
      if (descs[key].unit === 'ms') {
        val = speedScale(val);
      }
      result[key] = val;
    }
  }
  return result;
}

// ── Auto-warmup (opt-out via TotoFX.configure({ autoWarmup: false })) ──
// Eagerly acquires canvas contexts during idle time. Disable by calling
// configure({ autoWarmup: false }) before import side-effects fire.
let _autoWarmup = true;

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Defer to allow configure() to be called first
  setTimeout(function () {
    if (!_autoWarmup) return;
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(warmup);
    } else {
      setTimeout(warmup, 200);
    }
  }, 0);
}

// ── Convenience Export ───────────────────────────────────────────

/**
 * Convenience object containing all FX functions. Useful when you want to
 * pass the entire FX toolkit as a single reference.
 *
 * @example
 * import { FX } from 'toto-fx/fx';
 * FX.spawnParticles(cx, cy, { count: 30 });
 * FX.doScreenShake(false);
 */
export const FX = {
  // Configuration
  configure,
  setDotgrid,

  // FX config (mutable object — settings UI can write directly)
  fxConfig,
  fxEnabled,

  // Runtime context
  setContext,
  clearContext,
  speedScale,

  // Canvas access
  getCanvas,
  getSpeedCanvas,

  // Particle system
  spawnParticles,
  pushParticles,
  spawnSmoke,
  spawnFireTrail,

  // Speed lines
  startSpeedLines,
  stopSpeedLines,

  // Screen effects
  flashColor,
  doImpactFlash,
  doScreenShake,

  // Dotgrid effects
  doDotgridRipple,
  doDotgridCrater,
  doDotgridNuclear,
  doDotgridScorch,

  // Card helpers
  getSubElements,
  getItemRect,
  intensityScale,

  // Lift / fall / impact / remove pipeline
  liftCard,
  gravityFall,
  standardImpact,
  completeAndRemove,
  removeCard,
  cleanupCard,
  promoteCard,

  // Device detection
  isMobile,
  isTablet,

  // FX canvas
  getFxCanvas,
  getFxCtx,
  drawAsciiChar,

  // Shared helpers
  tickFrame,
  shouldShadow,
  pCount,
  prepareCard,
  destroyCard,
  finalize,
  drawChar,
  resetDrawFont,

  // Query
  isIdle,
  get adaptiveQuality() { return _adaptiveQuality; },
  getAdaptiveQuality,

  // Animation cancellation
  registerAnimation,
  setAnimationCleanup,
  cancelAnimation,
  deregisterAnimation,

  // Param resolution
  resolveParams,

  // Warmup
  warmup,
};

export default FX;
