/**
 * @module registry
 * @description Animation Registry, Settings, and Context for TotoFX.
 *
 * The Registry stores animation variants by category → style → variant.
 * Settings provides localStorage-backed persistence with diff-based storage.
 * Context builds animation execution context from settings.
 */

// ── AnimationRegistry ─────────────────────────────────────────

/**
 * Central registry where animation modules register their styles and variants.
 * Each animation category (e.g. 'action', 'destroy') contains styles
 * (e.g. 'thud', 'cute', 'death'), each of which contains named variant functions.
 *
 * @namespace AnimationRegistry
 */
export const AnimationRegistry = {
  /** @type {Object<string, Object<string, Object<string, AnimationFunction>>>} */
  _categories: {},

  /**
   * Register a set of animation variants under a category and style.
   *
   * @param {string} category - Animation category (e.g. 'action', 'destroy', 'enter', 'persist').
   * @param {string} style - Style group name (e.g. 'thud', 'cute', 'death').
   * @param {Object<string, AnimationFunction>} variants - Map of variant name to animation function.
   */
  registerCategory: function (category, style, variants) {
    if (!this._categories[category]) this._categories[category] = {};
    this._categories[category][style] = Object.assign(
      this._categories[category][style] || {}, variants
    );
  },

  /**
   * Get all registered style names for a category.
   * @param {string} category
   * @returns {string[]}
   */
  getStyles: function (category) {
    return Object.keys(this._categories[category] || {});
  },

  /**
   * Get all variant names for a given category and style.
   * @param {string} category
   * @param {string} style
   * @returns {string[]}
   */
  getVariants: function (category, style) {
    const s = (this._categories[category] || {})[style];
    return s ? Object.keys(s) : [];
  },

  /**
   * Retrieve a specific animation function by category, style, and variant.
   * @param {string} category
   * @param {string} style
   * @param {string} variant
   * @returns {Object|Function|null}
   */
  getAnimation: function (category, style, variant) {
    const s = (this._categories[category] || {})[style];
    return s ? s[variant] || null : null;
  },

  /**
   * Get the tunable parameter descriptors for a specific animation variant.
   * @param {string} category
   * @param {string} style
   * @param {string} variant
   * @returns {Object<string, Object>}
   */
  getParams: function (category, style, variant) {
    const fn = this.getAnimation(category, style, variant);
    return fn ? (fn.params || {}) : {};
  },

  /**
   * Invoke an animation. Handles both plugin objects ({play, cleanup, params})
   * and legacy functions (fn(el, options)).
   *
   * @param {Object|Function} anim - Plugin object or legacy function.
   * @param {HTMLElement} el - Target element.
   * @param {Object} opts - Animation options.
   * @param {Object} [helpers] - Optional FX helpers to inject into context.
   */
  invoke: function (anim, el, opts, helpers) {
    if (anim && typeof anim.play === 'function') {
      anim.play(el, {
        intensity: opts.intensity || 5,
        speed: opts.speed || 1,
        fx: opts.fx || {},
        params: opts.params || {},
        onDone: opts.onDone || function () {},
        elapsed: opts.elapsed || 0,
        originY: opts.originY,
        helpers: helpers || null,
      });
    } else if (typeof anim === 'function') {
      anim(el, opts);
    }
  },
};

// ── AnimationSettings ─────────────────────────────────────────

/**
 * Default settings. Consumers can override via createSettings({ defaults: ... }).
 */
export const DEFAULT_SETTINGS = {
  _version: 2,
  theme: 'mono',
  display: {
    cardOpacity: 0.3,
    fxOpacity: 1,
    bulkAnimations: false,
    disableFlash: false,
    cardPadding: 8,
    cardMaxHeight: 0,
    cardMinHeight: 44,
    cardBorderRadius: 14,
    cardFontSize: 14,
    layout: {
      gridColumns: 'auto',
      gridMinColumnWidth: 340,
      defaultListSpan: 1,
      defaultCardColumns: 1,
      cardGap: 10,
      listGap: 16,
    },
  },
  animations: {
    action: {
      style: 'thud', variant: 'anime-slam', intensity: 5, speed: 1,
      fx: { shake: true, speedLines: true, dotgrid: true, flash: true, cardSquash: true },
      params: { liftDur: 140, particles: 60, spread: 11, particleSize: 10 },
      behavior: { showStrikethrough: false, showBadge: false, badgeText: 'done',
        badgeDuration: 500, badgeColor: 'var(--green)', cardHideDelay: 550 },
    },
    destroy: {
      style: 'death', variant: 'shredder', intensity: 5, speed: 1,
      fx: { shake: false, speedLines: false, dotgrid: false, flash: false, cardSquash: false },
      params: {}, behavior: null,
    },
    enter: { style: 'subtle', variant: 'typewriter', intensity: 5, speed: 1, fx: {}, params: {} },
    persist: { style: 'ambient', variant: 'glow', intensity: 5, speed: 1, color: '', fx: {}, params: {} },
    container: { style: 'pulse', variant: 'dotgrid-ripple', intensity: 5, speed: 1, fx: { dotgrid: true }, params: {} },
    containerExit: {
      style: 'thud', variant: 'anime-slam', intensity: 5, speed: 1,
      fx: { shake: true, speedLines: true, dotgrid: true, flash: false, cardSquash: true },
      params: {},
    },
  },
  dotgrid: {
    grid: { dotSize: 28, fontSize: 16, baseChar: '\u00b7', baseOpacity: 0.44, palette: 'default' },
    physics: { densityDecay: 0.959, velDecay: 0.92, diffusionRate: 0.23, displacementScale: 2 },
    visual: {
      opacityMin: 0.75, opacityMax: 1, densityMultiplier: 2.5, glowEnabled: false,
      glowRadius: 8, glowIntensity: 0.6, resetOnAnimation: false,
    },
    binding: {
      enabled: true, effect: 'ripple', params: {
        ripple: { radius: 500, push: 14, density: 0.6, color: 'var(--accent)' },
        vortex: { radius: 300, speed: 1.5, pull: 0.3, density: 0.5, direction: 'cw', color: 'var(--accent)' },
        crater: { radius: 160, depth: 1, cracks: 6, crackLength: 220, color: '' },
        nuclear: { blastRadius: 280, color: 'var(--accent)' },
        scorch: { width: 40, length: 300, color: '' },
      },
    },
  },
  particleColors: {
    impact: [[196, 90, 60], [200, 120, 50]],
    smoke: [[120, 120, 110]],
    fire: [[196, 90, 60], [200, 140, 60]],
    debris: [[180, 160, 140]],
    confetti: [[196, 90, 60], [58, 125, 92], [201, 168, 76], [155, 133, 196]],
    hearts: [[196, 90, 60]],
    sparkle: [[201, 168, 76], [196, 90, 60]],
  },
  particleChars: {
    particles: ['#', '*', '+', '=', '~', '^'],
    smoke: ['\u2591', '\u2592', '~', '\u2248'],
    confetti: ['*', '+', '\u2726', '\u2605'],
    fire: ['*', '\u2726', '\u2668', '#'],
    debris: ['\u2591', '\u2592', '\u2593', '#', '^'],
    shatter: ['\u2571', '\u2572', '\u2502', '\u2500', '\u2573'],
    blast: ['\u2588', '\u2593', '\u2592', '#', '@'],
    hearts: ['\u2665'],
    sparkle: ['\u2726', '\u2727', '*'],
  },
  mobile: {
    particleScale: 0.3,
    maxParticles: 20,
    maxParticlesTotal: 40,
    shadow: false,
    dotgrid: {
      dotSize: 28,
      simRate: 0.5,
      velDecayScale: 0.92,
      densityDecayScale: 0.97,
      maxRadiusFraction: 0.65,
    },
  },
};

/**
 * Create an AnimationSettings store with configurable storage key and defaults.
 *
 * @param {Object} [opts]
 * @param {string} [opts.storageKey='toto_fx_settings'] - localStorage key
 * @param {Object} [opts.defaults] - Override default settings
 * @returns {Object} AnimationSettings instance
 */
export function createSettings(opts) {
  opts = opts || {};
  const _KEY = opts.storageKey || 'toto_fx_settings';
  const _defaults = opts.defaults || DEFAULT_SETTINGS;
  let _cache = null;

  function _merge(defaults, saved) {
    const result = {};
    for (let key in defaults) {
      if (!defaults.hasOwnProperty(key)) continue;
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        result[key] = _merge(defaults[key], saved[key] || {});
      } else {
        result[key] = saved[key] !== undefined ? saved[key] : defaults[key];
      }
    }
    for (let key in saved) {
      if (!saved.hasOwnProperty(key)) continue;
      if (!(key in defaults)) {
        result[key] = saved[key];
      }
    }
    return result;
  }

  function _computeDiff(defaults, current) {
    const diff = {};
    for (let key in defaults) {
      if (!defaults.hasOwnProperty(key)) continue;
      if (key === '_version') continue;
      const dv = defaults[key];
      const cv = current[key];
      if (cv === undefined) continue;
      if (dv !== null && typeof dv === 'object' && !Array.isArray(dv)) {
        if (cv !== null && typeof cv === 'object' && !Array.isArray(cv)) {
          const sub = _computeDiff(dv, cv);
          if (Object.keys(sub).length > 0) diff[key] = sub;
        } else {
          diff[key] = cv;
        }
      } else if (Array.isArray(dv)) {
        if (JSON.stringify(dv) !== JSON.stringify(cv)) diff[key] = cv;
      } else {
        if (dv !== cv) diff[key] = cv;
      }
    }
    for (let key in current) {
      if (!current.hasOwnProperty(key)) continue;
      if (key === '_version') continue;
      if (!(key in defaults)) diff[key] = current[key];
    }
    return diff;
  }

  return {
    /** Get the storage key. */
    get storageKey() { return _KEY; },

    /** Get the defaults. */
    get defaults() { return _defaults; },

    /**
     * Load settings from localStorage, deep-merged with defaults.
     * @returns {Object}
     */
    load: function () {
      if (_cache) return _cache;
      try {
        const raw = localStorage.getItem(_KEY);
        if (!raw) { _cache = JSON.parse(JSON.stringify(_defaults)); return _cache; }
        const saved = JSON.parse(raw);

        // v7+ diff-based format
        if (saved._version >= 7 && saved.overrides !== undefined) {
          let base = JSON.parse(JSON.stringify(_defaults));
          if (saved.overrides && Object.keys(saved.overrides).length > 0) {
            base = _merge(base, saved.overrides);
          }
          _cache = base;
          return _cache;
        }

        // v6 legacy full-settings format: migrate to diff-based
        if (saved._version && saved._version >= 6 && saved.animations) {
          const migrated = _merge(JSON.parse(JSON.stringify(_defaults)), saved);
          this.save(migrated);
          return this.load();
        }

        // Anything older: discard
        localStorage.removeItem(_KEY);
        _cache = JSON.parse(JSON.stringify(_defaults));
        return _cache;
      } catch (e) {
        _cache = JSON.parse(JSON.stringify(_defaults));
        return _cache;
      }
    },

    /**
     * Persist settings as a diff against defaults.
     * @param {Object} settings
     */
    save: function (settings) {
      _cache = null;
      const overrides = _computeDiff(_defaults, settings);
      localStorage.setItem(_KEY, JSON.stringify({ _version: 7, overrides: overrides }));
    },

    /** Clear all saved settings. */
    reset: function () {
      _cache = null;
      localStorage.removeItem(_KEY);
    },

    /** Invalidate cache so next load() re-reads localStorage. */
    invalidate: function () {
      _cache = null;
    },

    /**
     * Flatten dotgrid config for Dotgrid.configure().
     * @param {Object} settings
     * @returns {Object}
     */
    flattenDotgrid: function (settings) {
      const dg = settings.dotgrid || settings;
      return Object.assign({}, dg.grid || {}, dg.physics || {}, dg.visual || {});
    },
  };
}

// ── Default Settings Instance ─────────────────────────────────

export const AnimationSettings = createSettings();

// ── AnimationContext ──────────────────────────────────────────

/**
 * Shared context builder. Produces identical animation contexts
 * from settings input regardless of caller.
 */
export const AnimationContext = {
  /**
   * Build animation context from settings for a given category.
   *
   * @param {Object} settings - From AnimationSettings.load()
   * @param {string} category - 'action', 'destroy', 'enter', 'persist', etc.
   * @param {Object} [overrides]
   * @returns {Object} Context for FX.setContext()
   */
  fromSettings: function (settings, category, overrides) {
    const anims = settings.animations || settings;
    const catSettings = anims[category] || {};
    const ctx = {
      speed: catSettings.speed || 1,
      fxOverrides: overrides && overrides.fx ? overrides.fx : catSettings.fx || {},
    };
    if (settings.display && settings.display.disableFlash) {
      ctx.disableFlash = true;
    }
    if (category === 'action' && catSettings.behavior) {
      ctx.completion = catSettings.behavior;
    }
    const binding = settings.dotgrid && settings.dotgrid.binding;
    if (binding && binding.enabled) {
      const effectParams = (binding.params && binding.params[binding.effect]) || {};
      ctx.dotgridOverride = { effect: binding.effect, params: effectParams };
    }
    if (catSettings.particleStyle) {
      ctx.particleStyle = catSettings.particleStyle;
    }
    if (overrides) {
      if (overrides.completion) ctx.completion = overrides.completion;
      if (overrides.dotgridOverride) ctx.dotgridOverride = overrides.dotgridOverride;
      if (overrides.params) ctx.params = overrides.params;
      if (overrides.particleStyle) ctx.particleStyle = overrides.particleStyle;
    }
    return ctx;
  },
};
