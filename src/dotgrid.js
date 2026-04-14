/**
 * @module dotgrid
 * @description Dotgrid — Fluid-backed ASCII dot background.
 *
 * Full-viewport grid of dots driven by a lightweight fluid simulation.
 * Effects inject density + velocity into Float32Array fields.
 * A single RAF render loop maps field state to character brightness,
 * opacity, color, and displacement per dot — rendered to a canvas via fillText.
 *
 * Architecture inspired by somnai-dreams/pretext-demos fluid-smoke:
 *   - Semi-Lagrangian advection (backtracking + bilinear interpolation)
 *   - 4-neighbor Laplacian diffusion with aspect ratio correction
 *   - Character brightness palette via canvas pixel analysis
 *   - Binary search for density to character mapping
 *   - Canvas-based text rendering (zero DOM writes per frame)
 *
 * Effects are field injectors (~20-30 lines each), not direct DOM mutators.
 * Overlapping effects compose naturally in the field.
 * Healing is automatic via decay — no manual multi-stage reset code.
 *
 * Performance optimizations:
 *   - Canvas rendering: zero DOM writes per frame (fillText + globalAlpha)
 *   - Bounding-box simulation: only simulate/render cells within active bbox
 *   - Character lookup table: 256-entry LUT replaces per-cell binary search
 *   - Typed array bitmask: Uint8Array swap replaces per-frame Set allocation
 *   - Merged decay passes: velocity + density decay in single loop
 *   - Pre-measured character widths for centered text placement
 *
 * @example
 * import { createDotgrid, DOTGRID_DEFAULTS } from 'toto-fx/dotgrid';
 *
 * // Factory — full control
 * const grid = createDotgrid({
 *   container: document.getElementById('bg'),
 *   dotSize: 32,
 *   palette: 'katakana',
 * });
 * grid.init();
 * grid.ripple(400, 300, { radius: 500, color: '#C45A3C' });
 *
 * @example
 * // Singleton convenience
 * import { Dotgrid } from 'toto-fx/dotgrid';
 *
 * Dotgrid.configure({ container: document.getElementById('bg') });
 * Dotgrid.init();
 * Dotgrid.ripple(400, 300);
 */

// ── Default configuration ──────────────────────────────────────

/**
 * Sensible defaults for dotgrid configuration.
 * Pass overrides to `createDotgrid(config)` or `instance.configure(config)`.
 * @type {DotgridConfig}
 */
export const DOTGRID_DEFAULTS = {
  // Grid layout
  dotSize: 28,
  fontSize: 14,
  baseChar: '\u00b7',
  baseOpacity: 0.2,

  // Fluid simulation
  densityDecay: 0.985,
  velDecay: 0.92,
  diffusionRate: 0.08,
  displacementScale: 0.6,

  // Rendering
  opacityMin: 0.25,
  opacityMax: 1.0,
  densityMultiplier: 1.0,
  glowEnabled: false,
  glowRadius: 8,
  glowIntensity: 0.6,
  palette: 'default',

  // Base dot color — [r, g, b] tuple or null to auto-detect from CSS --ink-muted
  baseColor: null,

  // Container element or selector (resolved during init)
  container: null,

  // Canvas element — if null, one is created inside the container
  canvas: null,

  // Mobile performance config
  mobile: {
    breakpoint: 768,
    bleed: 10,
    dotSize: 28,
    simRate: 0.5,
    velDecayScale: 0.92,
    densityDecayScale: 0.97,
    maxRadiusFraction: 0.65,
  },

  // Tablet performance config
  tablet: {
    bleed: 20,
    dotSize: 32,
    simRate: 0.75,
    velDecayScale: 0.95,
    densityDecayScale: 0.98,
    maxRadiusFraction: 0.75,
  },

  // Desktop bleed
  desktopBleed: 40,
};

// ── Palette presets ────────────────────────────────────────────

export const PALETTE_PRESETS = {
  'default': [
    '\u00b7', '\u2219', '\u00b0', '\u02da', '\u2218', '\u25e6',
    '.', ',', '`', "'", ':', ';', '-', '~', '^',
    '+', '=', '*', '!', '/', '\\', '|',
    '#', '%', '&', '@',
    '\u2591', '\u2592', '\u2593', '\u2588',
    '\u2571', '\u2572', '\u2573', '\u2500', '\u2502', '\u253C',
    '\u256C', '\u256A', '\u256B', '\u2726', '\u2727',
    '\u2668', '\u2601', '\u221E', '\u25CB', '\u25CE',
  ],
  'dense': ['#', '%', '&', '@', '\u2588', '\u2593', '\u2592', '\u2591', '\u25A0', '\u25AA', '\u25CF', '\u25C9'],
  'light': ['\u00b7', '\u2219', '\u00b0', '\u02da', '\u2218', '\u25e6', '.', ',', "'", '`'],
  'box': ['\u2554', '\u2551', '\u2550', '\u2557', '\u255A', '\u255D', '\u256C', '\u2560', '\u2563', '\u2566', '\u2569', '\u2500', '\u2502', '\u253C', '\u250C', '\u2510', '\u2514', '\u2518'],
  'katakana': ['\u30A2', '\u30A4', '\u30A6', '\u30A8', '\u30AA', '\u30AB', '\u30AD', '\u30AF', '\u30B1', '\u30B3', '\u30B5', '\u30B7', '\u30B9', '\u30BB', '\u30BD', '\u30BF', '\u30C1', '\u30C4', '\u30C6', '\u30C8'],
  'numeric': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
};

// ── Factory ────────────────────────────────────────────────────

/**
 * Create a new dotgrid instance with independent state.
 *
 * @param {Partial<DotgridConfig>} [userConfig] - Configuration overrides.
 * @returns {DotgridInstance} The dotgrid API.
 */
export function createDotgrid(userConfig) {
  'use strict';

  // ── Constants ────────────────────────────────────────────────
  /** @type {number} Minimum density value for a cell to be considered active */
  var DENSITY_THRESHOLD = 0.02;
  /** @type {number} Extra grid cells around the active bounding box for diffusion/advection spread */
  var BBOX_MARGIN = 3;

  // ── Configuration ────────────────────────────────────────────
  var config = {
    dotSize: DOTGRID_DEFAULTS.dotSize,
    fontSize: DOTGRID_DEFAULTS.fontSize,
    baseChar: DOTGRID_DEFAULTS.baseChar,
    baseOpacity: DOTGRID_DEFAULTS.baseOpacity,
    densityDecay: DOTGRID_DEFAULTS.densityDecay,
    velDecay: DOTGRID_DEFAULTS.velDecay,
    diffusionRate: DOTGRID_DEFAULTS.diffusionRate,
    displacementScale: DOTGRID_DEFAULTS.displacementScale,
    opacityMin: DOTGRID_DEFAULTS.opacityMin,
    opacityMax: DOTGRID_DEFAULTS.opacityMax,
    densityMultiplier: DOTGRID_DEFAULTS.densityMultiplier,
    glowEnabled: DOTGRID_DEFAULTS.glowEnabled,
    glowRadius: DOTGRID_DEFAULTS.glowRadius,
    glowIntensity: DOTGRID_DEFAULTS.glowIntensity,
    palette: DOTGRID_DEFAULTS.palette,
  };

  // ── Device detection ──────────────────────────────────────────
  var mobileBreakpoint = DOTGRID_DEFAULTS.mobile.breakpoint;
  var MOBILE_BLEED = DOTGRID_DEFAULTS.mobile.bleed;
  var TABLET_BLEED = DOTGRID_DEFAULTS.tablet.bleed;
  var DESKTOP_BLEED = DOTGRID_DEFAULTS.desktopBleed;
  var _isMobile = typeof window !== 'undefined' && window.innerWidth <= mobileBreakpoint;
  var _isTablet = typeof window !== 'undefined' && !_isMobile && ('ontouchstart' in window) &&
    (window.innerWidth >= 768 && window.innerWidth <= 1366 ||
     window.innerHeight >= 768 && window.innerHeight <= 1366);
  var _simFrameCount = 0;

  // ── Mobile config ────────────────────────────────────────────
  var mobileConfig = {
    dotSize: DOTGRID_DEFAULTS.mobile.dotSize,
    simRate: DOTGRID_DEFAULTS.mobile.simRate,
    velDecayScale: DOTGRID_DEFAULTS.mobile.velDecayScale,
    densityDecayScale: DOTGRID_DEFAULTS.mobile.densityDecayScale,
    maxRadiusFraction: DOTGRID_DEFAULTS.mobile.maxRadiusFraction,
  };

  // ── Tablet config ────────────────────────────────────────────
  var tabletConfig = {
    dotSize: DOTGRID_DEFAULTS.tablet.dotSize,
    simRate: DOTGRID_DEFAULTS.tablet.simRate,
    velDecayScale: DOTGRID_DEFAULTS.tablet.velDecayScale,
    densityDecayScale: DOTGRID_DEFAULTS.tablet.densityDecayScale,
    maxRadiusFraction: DOTGRID_DEFAULTS.tablet.maxRadiusFraction,
  };

  // ── Instance options (container, canvas, baseColor) ──────────
  var _userContainer = null;
  var _userCanvas = null;
  var _userBaseColor = null;

  // Apply user config at creation time
  if (userConfig) {
    _applyUserConfig(userConfig);
  }

  /** @type {number} Current bleed value (updated in build()) */
  var bleed = DESKTOP_BLEED;

  // ── Pause state ──────────────────────────────────────────────
  var _paused = false;
  var _pauseResumeTimer = null;

  // ── Grid state ───────────────────────────────────────────────
  var gridCols = 0, gridRows = 0;
  var containerEl = null;
  var canvasEl = null;
  var ctx = null;
  var canvasDpr = 1;
  var built = false;

  // ── Fluid fields (initialized in build()) ────────────────────
  var density, tempDen, velX, velY;
  var colorR, colorG, colorB;       // Uint8Array RGB per cell
  var simRunning = false;
  var rafId = null;

  // ── Active cell bitmask (replaces Set) ───────────────────────
  var activeA, activeB;              // Uint8Array bitmasks
  var activeCur, activePrev;         // pointers to current/previous

  // ── Bounding box for active region ───────────────────────────
  var bbox = { minC: 0, maxC: 0, minR: 0, maxR: 0, active: false };

  // ── Character brightness palette ─────────────────────────────
  var palette = [];  // sorted by brightness: [{ char, brightness }]
  var charLUT = null; // 256-entry density -> character lookup table

  // ── Pre-measured character widths for centered placement ─────
  var charWidths = {};

  // ── Cached base color for base dots ──────────────────────────
  var _baseColor = null;

  // ── Internal: apply user config to local state ───────────────
  function _applyUserConfig(opts) {
    if (!opts) return;

    for (var key in opts) {
      if (opts.hasOwnProperty(key) && config.hasOwnProperty(key)) {
        config[key] = opts[key];
      }
    }

    if (opts.container !== undefined) _userContainer = opts.container;
    if (opts.canvas !== undefined) _userCanvas = opts.canvas;
    if (opts.baseColor !== undefined) _userBaseColor = opts.baseColor;

    // Merge mobile config
    if (opts.mobile) {
      for (var mk in opts.mobile) {
        if (opts.mobile.hasOwnProperty(mk) && mobileConfig.hasOwnProperty(mk)) {
          mobileConfig[mk] = opts.mobile[mk];
        }
      }
      if (opts.mobile.breakpoint !== undefined) mobileBreakpoint = opts.mobile.breakpoint;
      if (opts.mobile.bleed !== undefined) MOBILE_BLEED = opts.mobile.bleed;
    }

    // Merge tablet config
    if (opts.tablet) {
      for (var tk in opts.tablet) {
        if (opts.tablet.hasOwnProperty(tk) && tabletConfig.hasOwnProperty(tk)) {
          tabletConfig[tk] = opts.tablet[tk];
        }
      }
      if (opts.tablet.bleed !== undefined) TABLET_BLEED = opts.tablet.bleed;
    }

    if (opts.desktopBleed !== undefined) DESKTOP_BLEED = opts.desktopBleed;
  }

  // ── Palette building ─────────────────────────────────────────

  /**
   * Build the character brightness palette by rendering each character to a canvas
   * and measuring its alpha coverage. Results are sorted by brightness and used
   * to build a 256-entry lookup table for fast density-to-character mapping.
   *
   * @param {string[]} [chars] - Optional custom character set. Defaults to the preset
   *   matching `config.palette`.
   */
  function buildPalette(chars) {
    var charSet = chars || PALETTE_PRESETS[config.palette] || PALETTE_PRESETS['default'];
    var cvs = document.createElement('canvas');
    cvs.width = cvs.height = 28;
    var pctx = cvs.getContext('2d', { willReadFrequently: true });
    palette = [];

    var font = config.fontSize + 'px monospace';
    for (var i = 0; i < charSet.length; i++) {
      var ch = charSet[i];
      pctx.clearRect(0, 0, 28, 28);
      pctx.font = font;
      pctx.fillStyle = '#fff';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText(ch, 14, 14);

      var data = pctx.getImageData(0, 0, 28, 28).data;
      var sum = 0;
      for (var j = 3; j < data.length; j += 4) sum += data[j];
      var brightness = sum / (255 * 784);

      if (brightness > 0.001) {
        palette.push({ char: ch, brightness: brightness });
      }
    }

    // Normalize to max
    var maxB = 0;
    for (var k = 0; k < palette.length; k++) {
      if (palette[k].brightness > maxB) maxB = palette[k].brightness;
    }
    if (maxB > 0) {
      for (var k = 0; k < palette.length; k++) palette[k].brightness /= maxB;
    }

    // Sort ascending by brightness
    palette.sort(function (a, b) { return a.brightness - b.brightness; });

    // Build character lookup table
    buildCharLUT();
  }

  /**
   * Build a 256-entry lookup table mapping quantized density (0-255) to
   * the best-matching character from the palette. Replaces per-cell binary
   * search during rendering for O(1) character lookup.
   * @private
   */
  function buildCharLUT() {
    charLUT = new Array(256);
    for (var q = 0; q < 256; q++) {
      var targetB = q / 255;
      if (palette.length === 0) { charLUT[q] = config.baseChar; continue; }
      var lo = 0, hi = palette.length - 1;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (palette[mid].brightness < targetB) lo = mid + 1;
        else hi = mid;
      }
      var best = palette[lo];
      var bestDiff = Math.abs(best.brightness - targetB);
      for (var n = Math.max(0, lo - 2); n < Math.min(palette.length, lo + 3); n++) {
        var diff = Math.abs(palette[n].brightness - targetB);
        if (diff < bestDiff) { best = palette[n]; bestDiff = diff; }
      }
      charLUT[q] = best.char;
    }
  }

  // ── Color parsing ────────────────────────────────────────────

  /**
   * Parse a CSS color string into an [r, g, b] tuple. Handles hex (#RGB, #RRGGBB),
   * rgb()/rgba() functions, and CSS custom properties via var().
   *
   * @param {string} cssColor - The CSS color string to parse.
   * @returns {number[]} An [r, g, b] tuple (0-255). Falls back to [196, 90, 60] on parse failure.
   * @private
   */
  function parseColor(cssColor) {
    if (!cssColor) return [196, 90, 60];

    // CSS variables -> read computed style
    if (cssColor.indexOf('var(') === 0) {
      var varMatch = cssColor.match(/var\(([^)]+)\)/);
      if (varMatch && typeof document !== 'undefined') {
        var computed = getComputedStyle(document.documentElement)
          .getPropertyValue(varMatch[1]).trim();
        if (computed) return parseColor(computed);
      }
      return [196, 90, 60];
    }

    // rgba/rgb
    var rgbMatch = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];

    // hex
    if (cssColor.charAt(0) === '#') {
      var hex = cssColor.substring(1);
      if (hex.length === 3) {
        return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
      }
      if (hex.length >= 6) {
        return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
      }
    }

    return [196, 90, 60];
  }

  /**
   * Resolve the base color for non-active dots.
   * Uses the explicitly configured baseColor, or falls back to CSS --ink-muted,
   * or a neutral gray if neither is available.
   * @private
   */
  function resolveBaseColor() {
    if (_userBaseColor) {
      if (Array.isArray(_userBaseColor)) {
        _baseColor = _userBaseColor;
      } else {
        _baseColor = parseColor(_userBaseColor);
      }
      return;
    }

    if (typeof document !== 'undefined') {
      var computed = getComputedStyle(document.documentElement)
        .getPropertyValue('--ink-muted').trim();
      if (computed) {
        _baseColor = parseColor(computed);
        return;
      }
    }

    _baseColor = [128, 128, 128];
  }

  // ── Bounding box management ──────────────────────────────────

  /**
   * Expand the active bounding box to include the specified grid cell range.
   * Creates the bbox if it doesn't exist yet.
   *
   * @param {number} col0 - Minimum column index.
   * @param {number} col1 - Maximum column index.
   * @param {number} row0 - Minimum row index.
   * @param {number} row1 - Maximum row index.
   * @private
   */
  function expandBbox(col0, col1, row0, row1) {
    if (!bbox.active) {
      bbox.minC = col0;
      bbox.maxC = col1;
      bbox.minR = row0;
      bbox.maxR = row1;
      bbox.active = true;
    } else {
      if (col0 < bbox.minC) bbox.minC = col0;
      if (col1 > bbox.maxC) bbox.maxC = col1;
      if (row0 < bbox.minR) bbox.minR = row0;
      if (row1 > bbox.maxR) bbox.maxR = row1;
    }
  }

  function clampBbox() {
    if (bbox.minC < 0) bbox.minC = 0;
    if (bbox.minR < 0) bbox.minR = 0;
    if (bbox.maxC >= gridCols) bbox.maxC = gridCols - 1;
    if (bbox.maxR >= gridRows) bbox.maxR = gridRows - 1;
  }

  // Shrink bbox edges inward if edge cells are below threshold
  function shrinkBbox() {
    if (!bbox.active) return;
    var changed = true;
    while (changed) {
      changed = false;
      if (bbox.minR > bbox.maxR || bbox.minC > bbox.maxC) {
        bbox.active = false;
        var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
          : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
        drawBaseGrid(dotSz);
        return;
      }
      // Check top edge
      var topEmpty = true;
      for (var c = bbox.minC; c <= bbox.maxC; c++) {
        var idx = bbox.minR * gridCols + c;
        if (density[idx] > DENSITY_THRESHOLD || Math.abs(velX[idx]) + Math.abs(velY[idx]) > 0.02) {
          topEmpty = false; break;
        }
      }
      if (topEmpty) { bbox.minR++; changed = true; }

      // Check bottom edge
      var botEmpty = true;
      for (var c = bbox.minC; c <= bbox.maxC; c++) {
        var idx = bbox.maxR * gridCols + c;
        if (density[idx] > DENSITY_THRESHOLD || Math.abs(velX[idx]) + Math.abs(velY[idx]) > 0.02) {
          botEmpty = false; break;
        }
      }
      if (botEmpty) { bbox.maxR--; changed = true; }

      // Check left edge
      var leftEmpty = true;
      for (var r = bbox.minR; r <= bbox.maxR; r++) {
        var idx = r * gridCols + bbox.minC;
        if (density[idx] > DENSITY_THRESHOLD || Math.abs(velX[idx]) + Math.abs(velY[idx]) > 0.02) {
          leftEmpty = false; break;
        }
      }
      if (leftEmpty) { bbox.minC++; changed = true; }

      // Check right edge
      var rightEmpty = true;
      for (var r = bbox.minR; r <= bbox.maxR; r++) {
        var idx = r * gridCols + bbox.maxC;
        if (density[idx] > DENSITY_THRESHOLD || Math.abs(velX[idx]) + Math.abs(velY[idx]) > 0.02) {
          rightEmpty = false; break;
        }
      }
      if (rightEmpty) { bbox.maxC--; changed = true; }
    }
  }

  // ── Character measurement ────────────────────────────────────

  /**
   * Pre-measure character widths using canvas measureText for centered placement.
   * Called after building the palette and setting up the canvas context.
   * @private
   */
  function measureCharWidths() {
    if (!ctx) return;
    charWidths = {};
    var font = config.fontSize + 'px monospace';
    ctx.font = font;
    // Measure base char
    charWidths[config.baseChar] = ctx.measureText(config.baseChar).width;
    // Measure all palette chars
    for (var i = 0; i < palette.length; i++) {
      var ch = palette[i].char;
      if (!charWidths[ch]) {
        charWidths[ch] = ctx.measureText(ch).width;
      }
    }
    // Measure all LUT chars
    if (charLUT) {
      for (var q = 0; q < 256; q++) {
        var ch = charLUT[q];
        if (!charWidths[ch]) {
          charWidths[ch] = ctx.measureText(ch).width;
        }
      }
    }
  }

  // ── Initialization ───────────────────────────────────────────

  /**
   * Initialize the dotgrid: resolve the container element, create or find
   * the canvas, build the character palette, and construct the grid.
   * Sets up a resize handler for responsive rebuilding.
   */
  function init() {
    // Resolve container element
    if (_userContainer) {
      if (typeof _userContainer === 'string') {
        containerEl = document.querySelector(_userContainer);
      } else {
        containerEl = _userContainer;
      }
    }

    // Resolve or create canvas element
    if (_userCanvas) {
      if (typeof _userCanvas === 'string') {
        canvasEl = document.querySelector(_userCanvas);
      } else {
        canvasEl = _userCanvas;
      }
    } else if (containerEl) {
      // Look for an existing canvas inside the container
      canvasEl = containerEl.querySelector('canvas');
      if (!canvasEl) {
        // Create one
        canvasEl = document.createElement('canvas');
        canvasEl.style.position = 'absolute';
        canvasEl.style.pointerEvents = 'none';
        canvasEl.style.zIndex = '0';
        containerEl.appendChild(canvasEl);
      }
    }

    if (!canvasEl) return;

    buildPalette();
    build();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    });
  }

  // ── Grid building ────────────────────────────────────────────

  /**
   * (Re)build the dotgrid canvas and fluid simulation arrays.
   * Sets up the canvas element at the correct size and DPR,
   * initializes all Float32Array/Uint8Array fields for the fluid sim.
   * Stops any running simulation before rebuilding.
   */
  function build() {
    if (!canvasEl) return;
    _isMobile = typeof window !== 'undefined' && window.innerWidth <= mobileBreakpoint;
    _isTablet = typeof window !== 'undefined' && !_isMobile && ('ontouchstart' in window) &&
      (window.innerWidth >= 768 && window.innerWidth <= 1366 ||
       window.innerHeight >= 768 && window.innerHeight <= 1366);
    bleed = _isMobile ? MOBILE_BLEED : _isTablet ? TABLET_BLEED : DESKTOP_BLEED;
    var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
      : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
    var w = window.innerWidth + bleed * 2;
    var h = window.innerHeight + bleed * 2;
    gridCols = Math.ceil(w / dotSz);
    gridRows = Math.ceil(h / dotSz);
    var total = gridCols * gridRows;

    // Stop any running sim
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; simRunning = false; }

    // Set up canvas with DPR scaling
    // Cap DPR on tablets to reduce pixel buffer size
    canvasDpr = Math.min(window.devicePixelRatio || 1, _isTablet ? 1.5 : 2);
    // On mobile, cap DPR more aggressively — dotgrid is decorative background
    if (_isMobile) canvasDpr = Math.min(canvasDpr, 1.5);

    var cssW = gridCols * dotSz;
    var cssH = gridRows * dotSz;
    canvasEl.width = cssW * canvasDpr;
    canvasEl.height = cssH * canvasDpr;
    canvasEl.style.width = cssW + 'px';
    canvasEl.style.height = cssH + 'px';
    canvasEl.style.inset = '-' + bleed + 'px';

    ctx = canvasEl.getContext('2d', { alpha: true });
    ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);

    // Initialize fluid fields
    density = new Float32Array(total);
    tempDen = new Float32Array(total);
    velX = new Float32Array(total);
    velY = new Float32Array(total);
    colorR = new Uint8Array(total);
    colorG = new Uint8Array(total);
    colorB = new Uint8Array(total);

    // Initialize active cell bitmasks
    activeA = new Uint8Array(total);
    activeB = new Uint8Array(total);
    activeCur = activeA;
    activePrev = activeB;

    // Reset bounding box
    bbox.active = false;

    // Resolve base color
    resolveBaseColor();

    // Pre-measure character widths
    measureCharWidths();

    // Draw initial base state (all base chars at baseOpacity)
    drawBaseGrid(dotSz);

    built = true;
  }

  // ── Base grid rendering ──────────────────────────────────────

  /**
   * Draw the static base grid — all cells showing baseChar at baseOpacity.
   * Called once after build() and after simulation exhausts to restore base.
   * @param {number} dotSz - The dot size in CSS pixels.
   * @private
   */
  function drawBaseGrid(dotSz) {
    if (!ctx) return;
    var font = config.fontSize + 'px monospace';
    ctx.clearRect(0, 0, gridCols * dotSz, gridRows * dotSz);

    var bc = _baseColor || [128, 128, 128];
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(' + bc[0] + ',' + bc[1] + ',' + bc[2] + ',' + config.baseOpacity + ')';

    // Draw all base chars in a single pass
    for (var r = 0; r < gridRows; r++) {
      var cy = r * dotSz + dotSz * 0.5;
      for (var c = 0; c < gridCols; c++) {
        var cx = c * dotSz + dotSz * 0.5;
        ctx.fillText(config.baseChar, cx, cy);
      }
    }
  }

  // ── Coordinate conversion ────────────────────────────────────

  /**
   * Convert viewport pixel coordinates to fractional grid coordinates.
   * Accounts for the bleed offset between the grid and the viewport edge.
   *
   * @param {number} vx - Viewport x coordinate in pixels.
   * @param {number} vy - Viewport y coordinate in pixels.
   * @returns {{col: number, row: number}} Fractional grid position.
   * @private
   */
  function v2g(vx, vy) {
    var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
      : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
    return { col: (vx + bleed) / dotSz, row: (vy + bleed) / dotSz };
  }

  // ── Fluid simulation step ────────────────────────────────────

  /**
   * Execute one step of the fluid simulation within the active bounding box.
   * Performs semi-Lagrangian advection, 4-neighbor Laplacian diffusion, and
   * combined velocity + density decay. No-op if the bbox is inactive.
   * @private
   */
  function simStep() {
    if (!bbox.active) return;

    var tmp;
    // Compute simulation bounds with margin for diffusion/advection spread
    var simMinR = Math.max(0, bbox.minR - BBOX_MARGIN);
    var simMaxR = Math.min(gridRows - 1, bbox.maxR + BBOX_MARGIN);
    var simMinC = Math.max(0, bbox.minC - BBOX_MARGIN);
    var simMaxC = Math.min(gridCols - 1, bbox.maxC + BBOX_MARGIN);

    // 1. Advection — semi-Lagrangian backtracking (within bbox + margin)
    // Clear tempDen within sim bounds first
    for (var r = simMinR; r <= simMaxR; r++) {
      for (var c = simMinC; c <= simMaxC; c++) {
        tempDen[r * gridCols + c] = 0;
      }
    }
    for (var r = simMinR; r <= simMaxR; r++) {
      for (var c = simMinC; c <= simMaxC; c++) {
        var i = r * gridCols + c;
        // Backtrack position through velocity field, clamp to grid bounds
        var sx = Math.max(0, Math.min(gridCols - 1.001, c - velX[i]));
        var sy = Math.max(0, Math.min(gridRows - 1.001, r - velY[i]));
        // Bilinear interpolation
        var x0 = sx | 0, y0 = sy | 0;
        var x1 = Math.min(x0 + 1, gridCols - 1);
        var y1 = Math.min(y0 + 1, gridRows - 1);
        var fx = sx - x0, fy = sy - y0;
        tempDen[i] =
          density[y0 * gridCols + x0] * (1 - fx) * (1 - fy) +
          density[y0 * gridCols + x1] * fx * (1 - fy) +
          density[y1 * gridCols + x0] * (1 - fx) * fy +
          density[y1 * gridCols + x1] * fx * fy;
      }
    }
    // Swap density/tempDen within sim bounds
    for (var r = simMinR; r <= simMaxR; r++) {
      for (var c = simMinC; c <= simMaxC; c++) {
        var i = r * gridCols + c;
        var t = density[i];
        density[i] = tempDen[i];
        tempDen[i] = t;
      }
    }

    // 2. Diffusion — 4-neighbor Laplacian blend (within bbox + margin)
    var keep = 1 - config.diffusionRate;
    // Interior cells (need all 4 neighbors)
    var diffMinR = Math.max(1, simMinR);
    var diffMaxR = Math.min(gridRows - 2, simMaxR);
    var diffMinC = Math.max(1, simMinC);
    var diffMaxC = Math.min(gridCols - 2, simMaxC);
    for (var r = diffMinR; r <= diffMaxR; r++) {
      for (var c = diffMinC; c <= diffMaxC; c++) {
        var i = r * gridCols + c;
        var avg = (density[i - 1] + density[i + 1] +
                   density[i - gridCols] + density[i + gridCols]) * 0.25;
        tempDen[i] = density[i] * keep + avg * config.diffusionRate;
      }
    }
    // Edge cells within sim bounds: just decay
    for (var c = simMinC; c <= simMaxC; c++) {
      if (simMinR === 0) tempDen[c] = density[c] * keep;
      if (simMaxR === gridRows - 1) {
        var ei = (gridRows - 1) * gridCols + c;
        tempDen[ei] = density[ei] * keep;
      }
    }
    for (var r = simMinR; r <= simMaxR; r++) {
      if (simMinC === 0) {
        var li = r * gridCols;
        tempDen[li] = density[li] * keep;
      }
      if (simMaxC === gridCols - 1) {
        var ri = r * gridCols + gridCols - 1;
        tempDen[ri] = density[ri] * keep;
      }
    }
    // Swap back within sim bounds
    for (var r = simMinR; r <= simMaxR; r++) {
      for (var c = simMinC; c <= simMaxC; c++) {
        var i = r * gridCols + c;
        var t = density[i];
        density[i] = tempDen[i];
        tempDen[i] = t;
      }
    }

    // 3+4. Combined velocity + density decay (single pass within bbox + margin)
    // Mobile/tablet: faster decay so the sim stops sooner (fewer expensive frames)
    var vd = _isMobile ? config.velDecay * mobileConfig.velDecayScale
      : _isTablet ? config.velDecay * tabletConfig.velDecayScale : config.velDecay;
    var dd = _isMobile ? config.densityDecay * mobileConfig.densityDecayScale
      : _isTablet ? config.densityDecay * tabletConfig.densityDecayScale : config.densityDecay;
    for (var r = simMinR; r <= simMaxR; r++) {
      for (var c = simMinC; c <= simMaxC; c++) {
        var i = r * gridCols + c;
        velX[i] *= vd;
        velY[i] *= vd;
        density[i] *= dd;
        if (density[i] < 0.005) density[i] = 0;
        if (Math.abs(velX[i]) < 0.005) velX[i] = 0;
        if (Math.abs(velY[i]) < 0.005) velY[i] = 0;
      }
    }

    // Expand bbox by margin to account for spreading
    bbox.minC = simMinC;
    bbox.maxC = simMaxC;
    bbox.minR = simMinR;
    bbox.maxR = simMaxR;
  }

  // ── Render loop ──────────────────────────────────────────────

  function render() {
    // When paused (during completion animations), skip sim + render
    // but keep the RAF loop alive so we resume seamlessly
    if (_paused) {
      rafId = requestAnimationFrame(render);
      return;
    }

    // Mobile/tablet: run fluid sim at reduced rate to lower CPU load.
    // simRate controls how often sim runs (0.5 = every other frame, 0.75 = 3 of 4, 1 = every frame).
    // Rendering still happens every frame so animation stays smooth.
    var activeSimRate = _isMobile ? mobileConfig.simRate : _isTablet ? tabletConfig.simRate : 1;
    if (activeSimRate < 1) {
      _simFrameCount++;
      var simInterval = Math.round(1 / activeSimRate);
      if (_simFrameCount % simInterval === 0) simStep();
    } else {
      simStep();
    }

    // If bbox not active, simulation is idle — stop
    if (!bbox.active) {
      simRunning = false;
      rafId = null;
      return;
    }

    // Swap active bitmasks
    var tmp = activePrev;
    activePrev = activeCur;
    activeCur = tmp;
    // Clear current bitmask within bbox
    for (var r = bbox.minR; r <= bbox.maxR; r++) {
      var rowStart = r * gridCols + bbox.minC;
      var rowEnd = r * gridCols + bbox.maxC;
      for (var idx = rowStart; idx <= rowEnd; idx++) {
        activeCur[idx] = 0;
      }
    }

    var hasEnergy = false;
    var oRange = config.opacityMax - config.opacityMin;
    var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
      : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
    var dScale = dotSz * config.displacementScale;
    var glowOn = config.glowEnabled;
    var glowR = config.glowRadius;
    var glowI = config.glowIntensity;

    var font = config.fontSize + 'px monospace';
    var bc = _baseColor || [128, 128, 128];

    // Compute base char cell range first (bbox + margin for displacement),
    // then clear the FULL cell boundaries. This prevents base chars from being
    // drawn outside the cleared area — fillText with source-over compositing
    // would accumulate opacity over frames, making edge dots progressively darker.
    var clearMargin = Math.ceil(dScale) + 2;
    var baseCMinC = Math.max(0, Math.floor((bbox.minC * dotSz - clearMargin) / dotSz));
    var baseCMaxC = Math.min(gridCols - 1, Math.ceil(((bbox.maxC + 1) * dotSz + clearMargin) / dotSz));
    var baseCMinR = Math.max(0, Math.floor((bbox.minR * dotSz - clearMargin) / dotSz));
    var baseCMaxR = Math.min(gridRows - 1, Math.ceil(((bbox.maxR + 1) * dotSz + clearMargin) / dotSz));

    var clearX = baseCMinC * dotSz;
    var clearY = baseCMinR * dotSz;
    var clearW = (baseCMaxC + 1) * dotSz - clearX;
    var clearH = (baseCMaxR + 1) * dotSz - clearY;
    ctx.clearRect(clearX, clearY, clearW, clearH);

    // Redraw base chars within the cleared region (so inactive cells show base)
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(' + bc[0] + ',' + bc[1] + ',' + bc[2] + ',' + config.baseOpacity + ')';

    // Only draw base chars for cells that are NOT active in the simulation.
    // Active cells get their own character, opacity, color, and displacement
    // in the effect overdraw pass below — drawing a base char underneath
    // creates a visible static ghost behind the displaced effect character.
    for (var r = baseCMinR; r <= baseCMaxR; r++) {
      var cy = r * dotSz + dotSz * 0.5;
      for (var c = baseCMinC; c <= baseCMaxC; c++) {
        var bi = r * gridCols + c;
        if (bi >= 0 && bi < density.length) {
          var bd = density[bi];
          var bv = Math.abs(velX[bi]) + Math.abs(velY[bi]);
          if (bd > DENSITY_THRESHOLD || bv > 0.02) continue; // skip — effect pass will draw this cell
        }
        ctx.fillText(config.baseChar, c * dotSz + dotSz * 0.5, cy);
      }
    }

    // Now overdraw active cells with their effect characters
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Track whether glow was enabled for any cell (to reset shadowBlur)
    var glowWasSet = false;

    for (var r = bbox.minR; r <= bbox.maxR; r++) {
      for (var c = bbox.minC; c <= bbox.maxC; c++) {
        var i = r * gridCols + c;
        var d = density[i];
        var vMag = Math.abs(velX[i]) + Math.abs(velY[i]);

        if (d > DENSITY_THRESHOLD || vMag > 0.02) {
          hasEnergy = true;
          activeCur[i] = 1;

          // Character from LUT
          var charIdx = (d * 255) | 0;
          if (charIdx > 255) charIdx = 255;
          var ch = charLUT[charIdx];

          // Opacity
          var rawOpacity = config.opacityMin + d * oRange;
          if (rawOpacity > config.opacityMax) rawOpacity = config.opacityMax;

          // Color from per-cell RGB
          var cr = colorR[i], cg = colorG[i], cb = colorB[i];
          if (cr || cg || cb) {
            ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + rawOpacity.toFixed(2) + ')';
          } else {
            ctx.fillStyle = 'rgba(' + bc[0] + ',' + bc[1] + ',' + bc[2] + ',' + rawOpacity.toFixed(2) + ')';
          }

          // Glow via canvas shadow
          if (glowOn && (cr || cg || cb)) {
            var glowA = glowI * d;
            ctx.shadowBlur = glowR;
            ctx.shadowColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + glowA.toFixed(2) + ')';
            glowWasSet = true;
          } else if (glowWasSet) {
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            glowWasSet = false;
          }

          // Position: cell center + velocity displacement
          var dx = (velX[i] * dScale) | 0;
          var dy = (velY[i] * dScale) | 0;
          var px = c * dotSz + dotSz * 0.5 + dx;
          var py = r * dotSz + dotSz * 0.5 + dy;

          ctx.fillText(ch, px, py);
        }
      }
    }

    // Clear any lingering shadow state
    if (glowWasSet) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    // Reset cells that dropped below threshold — they're already drawn
    // as base chars above, so we just need to clean up field state
    for (var r = bbox.minR; r <= bbox.maxR; r++) {
      for (var c = bbox.minC; c <= bbox.maxC; c++) {
        var idx = r * gridCols + c;
        if (activePrev[idx] && !activeCur[idx]) {
          // Clear field residue
          colorR[idx] = 0; colorG[idx] = 0; colorB[idx] = 0;
        }
      }
    }

    if (hasEnergy) {
      // Shrink bbox to fit actual active area
      shrinkBbox();
      rafId = requestAnimationFrame(render);
    } else {
      // Simulation exhausted — full cleanup
      simRunning = false;
      rafId = null;
      for (var r = bbox.minR; r <= bbox.maxR; r++) {
        for (var c = bbox.minC; c <= bbox.maxC; c++) {
          var idx = r * gridCols + c;
          if (activeCur[idx]) {
            activeCur[idx] = 0;
          }
        }
      }
      // Redraw the bbox region as base grid (already done above, but ensure clean)
      var restoreX = bbox.minC * dotSz;
      var restoreY = bbox.minR * dotSz;
      var restoreW = (bbox.maxC - bbox.minC + 1) * dotSz;
      var restoreH = (bbox.maxR - bbox.minR + 1) * dotSz;
      ctx.clearRect(restoreX, restoreY, restoreW, restoreH);
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(' + bc[0] + ',' + bc[1] + ',' + bc[2] + ',' + config.baseOpacity + ')';
      for (var r = bbox.minR; r <= bbox.maxR; r++) {
        var cy = r * dotSz + dotSz * 0.5;
        for (var c = bbox.minC; c <= bbox.maxC; c++) {
          ctx.fillText(config.baseChar, c * dotSz + dotSz * 0.5, cy);
        }
      }
      bbox.active = false;
    }
  }

  /**
   * Start the simulation render loop if not already running.
   * Called by effect functions after injecting density/velocity into the fields.
   * @private
   */
  function startSim() {
    if (!simRunning) {
      simRunning = true;
      rafId = requestAnimationFrame(render);
    }
  }

  // ── Effects ──────────────────────────────────────────────────

  /**
   * Ripple effect — radial velocity burst + density ring emanating from a center point.
   * Injects outward velocity and density into the fluid field in a circular pattern.
   *
   * @param {number} cx - Center x coordinate in viewport pixels.
   * @param {number} cy - Center y coordinate in viewport pixels.
   * @param {Object} [opts] - Effect options.
   * @param {number} [opts.radius=500] - Maximum radius in pixels.
   * @param {number} [opts.push=14] - Outward velocity strength.
   * @param {number} [opts.density=0.6] - Density injection strength (0-1).
   * @param {string} [opts.color='#C45A3C'] - CSS color for the ripple dots.
   */
  function ripple(cx, cy, opts) {
    if (!built || !canvasEl) return;
    var dotSz = config.dotSize;
    var dm = config.densityMultiplier;
    var maxRadius = (opts && opts.radius) || 500;
    // On mobile/tablet, clamp radius to viewport so we don't activate the entire grid
    if (_isMobile) maxRadius = Math.min(maxRadius, window.innerWidth * mobileConfig.maxRadiusFraction);
    else if (_isTablet) maxRadius = Math.min(maxRadius, window.innerWidth * tabletConfig.maxRadiusFraction);
    var pushStr = (opts && opts.push) || 14;
    var densStr = (opts && opts.density) || 0.6;
    var color = parseColor((opts && opts.color) || '#C45A3C');
    var gridR = maxRadius / dotSz;
    var g = v2g(cx, cy);

    var c0 = Math.max(0, (g.col - gridR) | 0);
    var c1 = Math.min(gridCols - 1, (g.col + gridR + 1) | 0);
    var r0 = Math.max(0, (g.row - gridR) | 0);
    var r1 = Math.min(gridRows - 1, (g.row + gridR + 1) | 0);

    expandBbox(c0, c1, r0, r1);

    for (var rr = r0; rr <= r1; rr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var dx = cc - g.col, dy = rr - g.row;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > gridR || dist < 0.1) continue;
        var intensity = 1 - dist / gridR;
        var idx = rr * gridCols + cc;
        var nx = dx / dist, ny = dy / dist;

        density[idx] = Math.min(1, density[idx] + intensity * densStr * dm);
        velX[idx] += nx * intensity * pushStr / dotSz;
        velY[idx] += ny * intensity * pushStr / dotSz;
        colorR[idx] = color[0]; colorG[idx] = color[1]; colorB[idx] = color[2];
      }
    }
    startSim();
  }

  /**
   * Vortex effect — rotational velocity injection that makes dots spiral around a center point.
   * Injects tangential velocity (perpendicular to radial) plus optional inward pull.
   *
   * @param {number} cx - Center x coordinate in viewport pixels.
   * @param {number} cy - Center y coordinate in viewport pixels.
   * @param {Object} [opts] - Effect options.
   * @param {number} [opts.radius=300] - Vortex radius in pixels.
   * @param {number} [opts.speed=1.5] - Tangential velocity multiplier.
   * @param {number} [opts.pull=0.3] - Inward pull strength toward center.
   * @param {'cw'|'ccw'} [opts.direction='cw'] - Rotation direction (clockwise or counter-clockwise).
   * @param {number} [opts.density=0.5] - Density injection strength (0-1).
   * @param {string} [opts.color='#C45A3C'] - CSS color for the vortex dots.
   */
  function vortex(cx, cy, opts) {
    if (!built || !canvasEl) return;
    var dotSz = config.dotSize;
    var dm = config.densityMultiplier;
    var radius = (opts && opts.radius) || 300;
    if (_isMobile) radius = Math.min(radius, window.innerWidth * mobileConfig.maxRadiusFraction);
    else if (_isTablet) radius = Math.min(radius, window.innerWidth * tabletConfig.maxRadiusFraction);
    var speed = (opts && opts.speed) || 1.5;
    var pull = (opts && opts.pull) || 0.3;
    var cw = !((opts && opts.direction) === 'ccw');
    var densStr = (opts && opts.density) || 0.5;
    var color = parseColor((opts && opts.color) || '#C45A3C');
    var gridR = radius / dotSz;
    var dir = cw ? 1 : -1;
    var g = v2g(cx, cy);

    var c0 = Math.max(0, (g.col - gridR) | 0);
    var c1 = Math.min(gridCols - 1, (g.col + gridR + 1) | 0);
    var r0 = Math.max(0, (g.row - gridR) | 0);
    var r1 = Math.min(gridRows - 1, (g.row + gridR + 1) | 0);

    expandBbox(c0, c1, r0, r1);

    for (var rr = r0; rr <= r1; rr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var dx = cc - g.col, dy = rr - g.row;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > gridR || dist < 0.5) continue;
        var intensity = 1 - dist / gridR;
        var idx = rr * gridCols + cc;
        var nx = dx / dist, ny = dy / dist;

        // Tangential velocity (perpendicular to radial)
        velX[idx] += (-ny * dir) * intensity * speed;
        velY[idx] += (nx * dir) * intensity * speed;
        // Inward pull
        velX[idx] -= nx * intensity * pull;
        velY[idx] -= ny * intensity * pull;

        density[idx] = Math.min(1, density[idx] + intensity * densStr * dm);
        colorR[idx] = color[0]; colorG[idx] = color[1]; colorB[idx] = color[2];
      }
    }
    startSim();
  }

  /**
   * Crater effect — shaped density injection with radial color zones and crack lines.
   * Creates a circular crater body with fire (center), orange (mid), and brown (outer)
   * zones, plus randomized crack lines radiating outward.
   *
   * @param {number} cx - Center x coordinate in viewport pixels.
   * @param {number} cy - Center y coordinate in viewport pixels.
   * @param {number} radius - Crater radius in pixels.
   * @param {number} depth - Density injection multiplier (higher = more intense).
   * @param {Object} [opts] - Effect options.
   * @param {number} [opts.cracks=6] - Number of crack lines radiating from the crater.
   * @param {number} [opts.crackLength] - Length of crack lines in pixels. Defaults to `radius * 1.4`.
   */
  function crater(cx, cy, radius, depth, opts) {
    if (!built || !canvasEl) return;
    if (_isMobile) radius = Math.min(radius, window.innerWidth * mobileConfig.maxRadiusFraction);
    else if (_isTablet) radius = Math.min(radius, window.innerWidth * tabletConfig.maxRadiusFraction);
    var dotSz = config.dotSize;
    var dm = config.densityMultiplier;
    var crackCount = (opts && opts.cracks !== undefined) ? opts.cracks : 6;
    var crackLenPx = (opts && opts.crackLength) || radius * 1.4;
    var crackLen = crackLenPx / dotSz;
    var gridR = radius / dotSz;
    var g = v2g(cx, cy);

    // Zone colors: fire center -> orange -> warm brown
    var fireCol = [255, 220, 80];
    var midCol = [255, 130, 50];
    var outerCol = [200, 150, 100];
    var crackCol = [255, 120, 60];

    var c0 = Math.max(0, (g.col - gridR * 1.6) | 0);
    var c1 = Math.min(gridCols - 1, (g.col + gridR * 1.6 + 1) | 0);
    var r0 = Math.max(0, (g.row - gridR * 1.6) | 0);
    var r1 = Math.min(gridRows - 1, (g.row + gridR * 1.6 + 1) | 0);

    // Expand bbox to cover crater body + crack lines
    var crackExtent = Math.ceil(crackLen + gridR * 0.3);
    var bboxC0 = Math.max(0, (g.col - crackExtent) | 0);
    var bboxC1 = Math.min(gridCols - 1, (g.col + crackExtent + 1) | 0);
    var bboxR0 = Math.max(0, (g.row - crackExtent) | 0);
    var bboxR1 = Math.min(gridRows - 1, (g.row + crackExtent + 1) | 0);
    expandBbox(bboxC0, bboxC1, bboxR0, bboxR1);

    // Main crater body
    for (var rr = r0; rr <= r1; rr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var dx = cc - g.col, dy = rr - g.row;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > gridR) continue;
        var intensity = 1 - dist / gridR;
        var idx = rr * gridCols + cc;

        density[idx] = Math.min(1, density[idx] + intensity * intensity * depth * dm);

        // Outward push
        if (dist > 0.5) {
          var nx = dx / dist, ny = dy / dist;
          velX[idx] += nx * intensity * 2;
          velY[idx] += ny * intensity * 2;
        }

        // Zone color
        var col = intensity > 0.65 ? fireCol : intensity > 0.35 ? midCol : outerCol;
        colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
      }
    }

    // Crack lines
    for (var ci = 0; ci < crackCount; ci++) {
      var angle = (ci / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var len = crackLen * (0.5 + Math.random() * 0.5);
      var curAngle = angle;
      var steps = Math.floor(len);
      for (var s = 0; s < steps; s++) {
        curAngle += (Math.random() - 0.5) * 0.4;
        var crCol = g.col + Math.cos(curAngle) * (gridR * 0.3 + s);
        var crRow = g.row + Math.sin(curAngle) * (gridR * 0.3 + s);
        var ci2 = Math.round(crRow) * gridCols + Math.round(crCol);
        if (ci2 >= 0 && ci2 < density.length) {
          var crIntensity = 1 - s / steps;
          density[ci2] = Math.min(1, density[ci2] + crIntensity * 0.6 * dm);
          colorR[ci2] = crackCol[0]; colorG[ci2] = crackCol[1]; colorB[ci2] = crackCol[2];
          velX[ci2] += Math.cos(curAngle + Math.PI / 2) * crIntensity * 0.5;
          velY[ci2] += Math.sin(curAngle + Math.PI / 2) * crIntensity * 0.5;
        }
      }
    }
    startSim();
  }

  /**
   * Nuclear effect — mushroom cloud with stem, cap, and shockwave ring.
   * Injects shaped density for a ground-zero fire core, vertical smoke stem,
   * elliptical cap, and expanding ring at 70% of the blast radius.
   *
   * @param {number} cx - Center x coordinate in viewport pixels (ground zero).
   * @param {number} cy - Center y coordinate in viewport pixels (ground zero).
   * @param {Object} [opts] - Effect options.
   * @param {number} [opts.blastRadius=280] - Overall blast radius in pixels.
   * @param {string} [opts.color='#C45A3C'] - CSS color for the shockwave ring.
   */
  function nuclear(cx, cy, opts) {
    if (!built || !canvasEl) return;
    var dotSz = config.dotSize;
    var dm = config.densityMultiplier;
    var rawBlastR = (opts && opts.blastRadius) || 280;
    if (_isMobile) rawBlastR = Math.min(rawBlastR, window.innerWidth * mobileConfig.maxRadiusFraction);
    else if (_isTablet) rawBlastR = Math.min(rawBlastR, window.innerWidth * tabletConfig.maxRadiusFraction);
    var blastR = rawBlastR / dotSz;
    var g = v2g(cx, cy);

    var fireCol = [255, 240, 180];
    var stemCol = [255, 150, 50];
    var smokeCol = [200, 180, 150];
    var ringCol = parseColor((opts && opts.color) || '#C45A3C');

    // Scale mushroom cloud proportionally with blast radius
    var s = blastR / (280 / dotSz); // scale factor relative to default 280px blast
    var stemW = (35 / dotSz) * s, stemH = (140 / dotSz) * s;
    var capW = (100 / dotSz) * s, capH = (60 / dotSz) * s;
    var gzR = (60 / dotSz) * s;
    var ringW = (30 / dotSz) * Math.max(1, s * 0.6);
    var ringVel = 1.5 * Math.max(1, s * 0.7);
    var capRow = g.row - stemH - capH * 0.3;

    // Compute full extent of the nuclear effect for bbox
    var extentC0 = Math.max(0, Math.floor(g.col - blastR - capW));
    var extentC1 = Math.min(gridCols - 1, Math.ceil(g.col + blastR + capW));
    var extentR0 = Math.max(0, Math.floor(capRow - capH - 3));
    var extentR1 = Math.min(gridRows - 1, Math.ceil(g.row + blastR + 3));
    expandBbox(extentC0, extentC1, extentR0, extentR1);

    for (var rr = extentR0; rr <= extentR1; rr++) {
      for (var cc = extentC0; cc <= extentC1; cc++) {
        var dx = cc - g.col, dy = rr - g.row;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var relY = rr - g.row;
        var absDx = Math.abs(dx);

        if (dist > blastR && Math.abs(relY) > stemH + capH + 3) continue;

        var idx = rr * gridCols + cc;
        var inGZ = dist < gzR;
        var inStem = absDx < stemW && relY < 0 && relY > -stemH;
        var capDist = Math.sqrt(dx * dx / (capW * capW) + (rr - capRow) * (rr - capRow) / (capH * capH));
        var inCap = capDist < 1.0;
        var ringDist = Math.abs(dist - blastR * 0.7);
        var onRing = ringDist < ringW && dist > gzR;

        if (inGZ) {
          density[idx] = Math.min(1, density[idx] + 0.95 * dm);
          colorR[idx] = fireCol[0]; colorG[idx] = fireCol[1]; colorB[idx] = fireCol[2];
        } else if (inStem) {
          var t = Math.abs(relY) / stemH;
          density[idx] = Math.min(1, density[idx] + 0.7 * (1 - t * 0.5) * dm);
          var col = t < 0.4 ? stemCol : smokeCol;
          colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
        } else if (inCap) {
          density[idx] = Math.min(1, density[idx] + 0.8 * (1 - capDist) * dm);
          var col = capDist < 0.4 ? fireCol : smokeCol;
          colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
        } else if (onRing) {
          var ri = 1 - ringDist / ringW;
          density[idx] = Math.min(1, density[idx] + ri * 0.7 * dm);
          velX[idx] += (dx / (dist || 1)) * ri * ringVel;
          velY[idx] += (dy / (dist || 1)) * ri * ringVel;
          colorR[idx] = ringCol[0]; colorG[idx] = ringCol[1]; colorB[idx] = ringCol[2];
        }
      }
    }
    startSim();
  }

  /**
   * Scorch effect — linear density injection along a trail from point A to point B.
   * Creates a burn trail with a dark core and lighter edges.
   *
   * @param {number} x1 - Start x coordinate in viewport pixels.
   * @param {number} y1 - Start y coordinate in viewport pixels.
   * @param {number} x2 - End x coordinate in viewport pixels.
   * @param {number} y2 - End y coordinate in viewport pixels.
   * @param {number|Object} [widthOrOpts=40] - Trail width in pixels, or an options object.
   * @param {number} [widthOrOpts.width=40] - Trail width in pixels.
   * @param {string} [widthOrOpts.color] - CSS color for the scorch trail.
   */
  function scorch(x1, y1, x2, y2, widthOrOpts) {
    if (!built || !canvasEl) return;
    var dotSz = config.dotSize;
    var dm = config.densityMultiplier;
    var widthPx = typeof widthOrOpts === 'number' ? widthOrOpts :
      (widthOrOpts && widthOrOpts.width) || 40;
    var color = (typeof widthOrOpts === 'object' && widthOrOpts.color) ?
      parseColor(widthOrOpts.color) : null;
    var width = widthPx / dotSz;
    var g1 = v2g(x1, y1), g2 = v2g(x2, y2);

    var tdx = g2.col - g1.col, tdy = g2.row - g1.row;
    var tLen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tLen < 0.1) return;
    var nx = tdx / tLen, ny = tdy / tLen;

    var coreCol = color || [100, 50, 15];
    var edgeCol = color ? [Math.min(255, color[0] + 50), Math.min(255, color[1] + 30), color[2]] : [220, 120, 40];

    // Compute bbox for scorch line
    var minCol = Math.max(0, Math.floor(Math.min(g1.col, g2.col) - width - 1));
    var maxCol = Math.min(gridCols - 1, Math.ceil(Math.max(g1.col, g2.col) + width + 1));
    var minRow = Math.max(0, Math.floor(Math.min(g1.row, g2.row) - width - 1));
    var maxRow = Math.min(gridRows - 1, Math.ceil(Math.max(g1.row, g2.row) + width + 1));
    expandBbox(minCol, maxCol, minRow, maxRow);

    for (var rr = minRow; rr <= maxRow; rr++) {
      for (var cc = minCol; cc <= maxCol; cc++) {
        var relX = cc - g1.col, relY = rr - g1.row;
        var along = relX * nx + relY * ny;
        var perp = Math.abs(relX * (-ny) + relY * nx);
        if (along < -1 || along > tLen + 1 || perp > width) continue;

        var perpI = 1 - perp / width;
        var idx = rr * gridCols + cc;
        density[idx] = Math.min(1, density[idx] + perpI * 0.7 * dm);

        var col = perp < width * 0.3 ? coreCol : edgeCol;
        colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
      }
    }
    startSim();
  }

  /**
   * Heart effect — heart-shaped density injection with pulsing velocity.
   * Uses the implicit heart equation (x²+y²-1)³ - x²y³ = 0 to define the shape,
   * then injects repeated beats with outward velocity to create a pulsing/throbbing
   * fluid simulation within the heart outline.
   *
   * @param {number} cx - Center x coordinate in viewport pixels.
   * @param {number} cy - Center y coordinate in viewport pixels.
   * @param {Object} [opts] - Effect options.
   * @param {number} [opts.radius=200] - Heart radius in pixels (center to widest edge).
   * @param {number} [opts.density=0.8] - Density injection strength (0-1).
   * @param {number} [opts.push=8] - Outward velocity push per beat.
   * @param {number} [opts.pulses=3] - Number of heartbeat pulses.
   * @param {number} [opts.pulseInterval=450] - Milliseconds between beats.
   * @param {string} [opts.color='#E8456B'] - CSS color for the heart edge.
   * @param {string} [opts.coreColor='#FF8DA1'] - CSS color for the heart core.
   */
  function heart(cx, cy, opts) {
    if (!built || !canvasEl) return;
    var dotSz = config.dotSize;
    var dm = config.densityMultiplier;
    var radius = (opts && opts.radius) || 200;
    if (_isMobile) radius = Math.min(radius, window.innerWidth * mobileConfig.maxRadiusFraction);
    else if (_isTablet) radius = Math.min(radius, window.innerWidth * tabletConfig.maxRadiusFraction);
    var densStr = (opts && opts.density) || 0.8;
    var pushStr = (opts && opts.push) || 8;
    var pulses = (opts && opts.pulses !== undefined) ? opts.pulses : 3;
    var pulseInterval = (opts && opts.pulseInterval) || 450;
    var edgeColor = parseColor((opts && opts.color) || '#E8456B');
    var coreCol = parseColor((opts && opts.coreColor) || '#FF8DA1');

    var g = v2g(cx, cy);
    // Implicit heart fits in ~[-1.2, 1.2] x [-1, 1.2]
    // Scale so the heart fills the given radius (center to widest edge)
    var hs = (radius / 1.2) / dotSz;  // grid cells per heart-unit

    var c0 = Math.max(0, Math.floor(g.col - 1.3 * hs - 1));
    var c1 = Math.min(gridCols - 1, Math.ceil(g.col + 1.3 * hs + 1));
    var r0 = Math.max(0, Math.floor(g.row - 1.3 * hs - 1));
    var r1 = Math.min(gridRows - 1, Math.ceil(g.row + 1.3 * hs + 1));

    function injectBeat(strength) {
      expandBbox(c0, c1, r0, r1);
      for (var rr = r0; rr <= r1; rr++) {
        for (var cc = c0; cc <= c1; cc++) {
          var hx = (cc - g.col) / hs;
          var hy = (g.row - rr) / hs;  // flip y for screen coords (point at bottom)

          // Implicit heart: (x² + y² - 1)³ - x² · y³ < 0 means inside
          var x2 = hx * hx;
          var y2 = hy * hy;
          var y3 = y2 * hy;
          var sum = x2 + y2 - 1;
          var f = sum * sum * sum - x2 * y3;

          if (f > 0.15) continue;  // well outside

          var idx = rr * gridCols + cc;
          var dist = Math.sqrt(x2 + y2);

          if (f <= 0) {
            // Inside the heart
            var depth = Math.min(1, Math.pow(Math.abs(f), 0.3));

            density[idx] = Math.min(1, density[idx] + depth * densStr * strength * dm);

            // Outward pulse velocity from center
            if (dist > 0.1) {
              var nx = hx / dist, ny = -hy / dist;  // flip ny back to screen space
              velX[idx] += nx * depth * pushStr * strength / dotSz;
              velY[idx] += ny * depth * pushStr * strength / dotSz;
            }

            // Color: brighter core, deeper edge
            var col = depth > 0.6 ? coreCol : edgeColor;
            colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
          } else {
            // Soft glow beyond edge (0 < f <= 0.15)
            var edge = 1 - f / 0.15;
            density[idx] = Math.min(1, density[idx] + edge * 0.3 * strength * dm);
            colorR[idx] = edgeColor[0]; colorG[idx] = edgeColor[1]; colorB[idx] = edgeColor[2];
          }
        }
      }
      startSim();
    }

    // First beat
    injectBeat(1.0);

    // Subsequent beats with decreasing intensity
    for (var p = 1; p < pulses; p++) {
      (function (str, delay) {
        setTimeout(function () { injectBeat(str); }, delay);
      })(1.0 - p * 0.15, p * pulseInterval);
    }
  }

  // ── Configuration API ────────────────────────────────────────

  /**
   * Update dotgrid configuration. Supports partial updates — only provided keys
   * are changed. Automatically triggers a grid rebuild if `dotSize` changes,
   * a palette rebuild if `palette` changes, and live canvas updates for `fontSize`,
   * `baseOpacity`, etc.
   *
   * @param {Partial<DotgridConfig>} opts - Configuration overrides.
   *
   * @example
   * grid.configure({ dotSize: 32, glowEnabled: true, palette: 'katakana' });
   */
  function configure(opts) {
    if (!opts) return;
    var needRebuild = false;
    var needPalette = false;

    _applyUserConfig(opts);

    if (opts.dotSize !== undefined) needRebuild = true;
    if (opts.palette !== undefined) needPalette = true;

    // baseChar change — redraw base grid if no rebuild needed
    if (opts.baseChar !== undefined && !needRebuild && built) {
      var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
        : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
      drawBaseGrid(dotSz);
    }

    // fontSize change — re-measure chars and redraw
    if (opts.fontSize !== undefined && !needRebuild && built) {
      measureCharWidths();
      var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
        : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
      drawBaseGrid(dotSz);
    }

    // baseOpacity change — redraw base grid
    if (opts.baseOpacity !== undefined && !needRebuild && built) {
      var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
        : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
      drawBaseGrid(dotSz);
    }

    // baseColor change — re-resolve and redraw
    if (opts.baseColor !== undefined && !needRebuild && built) {
      resolveBaseColor();
      var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
        : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
      drawBaseGrid(dotSz);
    }

    if (needPalette) buildPalette();
    if (needRebuild && built) build();
  }

  /**
   * Get a shallow copy of the current configuration.
   *
   * @returns {DotgridConfig} A copy of the current config object.
   */
  function getConfig() {
    var copy = {};
    for (var key in config) {
      if (config.hasOwnProperty(key)) copy[key] = config[key];
    }
    return copy;
  }

  /**
   * Reset the entire fluid simulation — clears all density, velocity, and color
   * fields and redraws the base grid. Useful when switching themes or clearing state.
   */
  function reset() {
    if (!built) return;
    density.fill(0);
    tempDen.fill(0);
    velX.fill(0);
    velY.fill(0);
    colorR.fill(0);
    colorG.fill(0);
    colorB.fill(0);
    activeA.fill(0);
    activeB.fill(0);
    bbox.active = false;

    // Re-resolve base color (theme may have changed)
    resolveBaseColor();

    // Redraw base grid
    var dotSz = _isMobile ? Math.min(config.dotSize, mobileConfig.dotSize)
      : _isTablet ? Math.max(config.dotSize, tabletConfig.dotSize) : config.dotSize;
    drawBaseGrid(dotSz);
  }

  /**
   * Pause the dotgrid simulation and rendering. The RAF loop stays alive
   * but skips all work. Used during completion animations to free up
   * frame budget for other visual work.
   *
   * @param {number} [autoResumeMs=0] - If > 0, auto-resume after this many ms.
   */
  function pause(autoResumeMs) {
    _paused = true;
    if (_pauseResumeTimer) { clearTimeout(_pauseResumeTimer); _pauseResumeTimer = null; }
    if (autoResumeMs > 0) {
      _pauseResumeTimer = setTimeout(function () { _paused = false; _pauseResumeTimer = null; }, autoResumeMs);
    }
  }

  /**
   * Resume the dotgrid simulation and rendering after a pause.
   */
  function resume() {
    _paused = false;
    if (_pauseResumeTimer) { clearTimeout(_pauseResumeTimer); _pauseResumeTimer = null; }
  }

  /** @returns {boolean} True when the fluid simulation has fully settled (no active cells). */
  function isIdle() {
    return !bbox.active;
  }

  /**
   * Destroy the dotgrid instance — stop the simulation, remove the canvas
   * if it was auto-created, and remove the resize listener.
   */
  function destroy() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    simRunning = false;
    _paused = false;
    if (_pauseResumeTimer) { clearTimeout(_pauseResumeTimer); _pauseResumeTimer = null; }
    built = false;
  }

  // ── Public API ───────────────────────────────────────────────

  return {
    init: init,
    build: build,
    ripple: ripple,
    crater: crater,
    nuclear: nuclear,
    scorch: scorch,
    vortex: vortex,
    heart: heart,
    configure: configure,
    getConfig: getConfig,
    reset: reset,
    pause: pause,
    resume: resume,
    isIdle: isIdle,
    destroy: destroy,
  };
}

// ── Singleton convenience ──────────────────────────────────────

/**
 * Pre-created singleton instance. Configure with `Dotgrid.configure(config)`
 * then call `Dotgrid.init()` to start.
 *
 * @example
 * import { Dotgrid } from 'toto-fx/dotgrid';
 *
 * Dotgrid.configure({
 *   container: '#dotgrid-bg',
 *   baseColor: [128, 128, 128],
 * });
 * Dotgrid.init();
 * Dotgrid.ripple(400, 300, { radius: 500, color: '#C45A3C' });
 */
export const Dotgrid = createDotgrid();
