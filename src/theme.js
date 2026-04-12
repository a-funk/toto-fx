/**
 * @module theme
 * @description Theme Manager -- loads and manages app-wide themes.
 *
 * Themes control the entire app appearance via CSS custom property overrides
 * (palette, typography, elevation) AND animation visuals (particle colors,
 * character sets, effect settings).
 *
 * The warm theme is inlined for instant availability.
 * Other built-in themes are fetched on demand from a configurable base URL.
 * Custom themes are stored in localStorage.
 *
 * Server-side injection: The active theme CSS can optionally be injected by
 * the server via a style element (configurable ID). This eliminates flash of
 * default theme on load.
 *
 * `_applyToDOM()` injects CSS variables via a `<style>` element,
 * with live preview support (apply on hover, revert on cancel).
 */

/**
 * Default ASCII character sets used by animation effects when a theme
 * does not provide its own character overrides.
 *
 * @type {Object<string, string[]>}
 */
export const DEFAULT_CHARS = {
  particles: ['#', '*', '+', '=', '~', '^', '@'],
  smoke: ['\u2591', '\u2592', '~', '\u2248', '\u2601'],
  confetti: ['*', '+', '\u2726', '\u2605', '\u2666', '\u2665'],
  fire: ['*', '\u2726', '\u2668', '#', '+'],
  debris: ['\u2591', '\u2592', '\u2593', '#', '*', '\u256C', '\u256A', '^'],
  shatter: ['\u2571', '\u2572', '\u2502', '\u2500', '\u2573', '\u256B', '/'],
  blast: ['\u2588', '\u2593', '\u2592', '\u256C', '\u256A', '\u256B', '#', '@', '\u2726'],
  hearts: ['\u2665', '\u2764'],
  sparkle: ['\u2726', '\u2727', '*', '+', '\u00b7'],
};

/**
 * Built-in theme IDs.
 * @type {string[]}
 */
export const BUILTIN_THEMES = ['warm', 'cyber', 'midnight', 'mono', 'cute', 'spring'];

// CSS value sanitization -- mirrors server-side checks
/** @type {RegExp} Matches dangerous CSS patterns (url(), expression(), javascript:, etc.) */
const _DANGEROUS_RE = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding|<|>|\\[0-9a-fA-F]|;|}/i;
/** @type {RegExp} Validates CSS custom property names (alphanumeric + hyphens) */
const _SAFE_VAR_NAME_RE = /^[a-zA-Z][a-zA-Z0-9-]*$/;

/**
 * Check if a CSS value is safe for injection into a style element.
 * Rejects values containing `url()`, `expression()`, `javascript:`, etc.
 *
 * @param {string} value - The CSS value to validate.
 * @returns {boolean} True if the value is safe to inject.
 */
function _isSafeCssValue(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  return !_DANGEROUS_RE.test(value);
}

/**
 * Check if a name is safe for use as a CSS custom property name (after `--` prefix).
 *
 * @param {string} name - The variable name to validate.
 * @returns {boolean} True if the name contains only safe characters.
 */
function _isSafeVarName(name) {
  return typeof name === 'string' && _SAFE_VAR_NAME_RE.test(name.trim());
}

/**
 * The default warm theme -- inlined so it is available immediately without a network fetch.
 * Defines palette, typography, elevation, and animation-specific settings.
 *
 * @type {Object}
 */
export const WARM_THEME = {
  id: 'warm',
  name: 'Earthy Warmth',
  description: 'Warm terracotta and forest tones -- the default palette',
  author: 'TotoFX',
  version: '2.0.0',
  colorScheme: 'light',
  palette: {
    'bg': '#F5F0E8',
    'surface': '#FFFFFF',
    'ink': '#1A1714',
    'ink-secondary': '#6B5F52',
    'ink-muted': '#A89A8C',
    'ink-light': '#C4B8AA',
    'accent': '#C45A3C',
    'accent-hover': '#D4714F',
    'accent-subtle': 'rgba(196, 90, 60, 0.07)',
    'green': '#3A7D5C',
    'green-hover': '#4A9A70',
    'green-subtle': 'rgba(58, 125, 92, 0.07)',
    'red': '#B5403A',
    'red-hover': '#C95650',
    'red-subtle': 'rgba(181, 64, 58, 0.06)',
    'border': '#E0D9CE',
    'border-light': '#EBE6DD',
    'bg-tint-1': 'rgba(196, 90, 60, 0.04)',
    'bg-tint-2': 'rgba(58, 125, 92, 0.03)',
  },
  typography: {
    fontDisplay: "'Bricolage Grotesque', Georgia, serif",
    fontBody: "'Karla', system-ui, sans-serif",
  },
  elevation: {
    'shadow-xs': '0 1px 2px rgba(26, 23, 20, 0.04)',
    'shadow-sm': '0 1px 4px rgba(26, 23, 20, 0.06), 0 1px 2px rgba(26, 23, 20, 0.04)',
    'shadow-md': '0 4px 16px rgba(26, 23, 20, 0.07), 0 1px 4px rgba(26, 23, 20, 0.04)',
    'shadow-hover': '0 8px 24px rgba(26, 23, 20, 0.09), 0 2px 6px rgba(26, 23, 20, 0.04)',
  },
  animations: {
    colors: {
      flash: '#F5F0E8',
      glow: 'rgba(196, 90, 60, 0.3)',
      particles: {
        impact: [[196, 90, 60], [200, 120, 50]],
        smoke: [[120, 120, 110]],
        fire: [[196, 90, 60], [200, 140, 60]],
        debris: [[180, 160, 140]],
        confetti: [[196, 90, 60], [58, 125, 92], [201, 168, 76], [155, 133, 196]],
        hearts: [[196, 90, 60]],
        sparkle: [[201, 168, 76], [196, 90, 60]],
      },
    },
    chars: {
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
    effects: {
      flashOpacity: 0.6,
      glowIntensity: 0.3,
      particleTrails: false,
      impactRipple: true,
      screenTint: 'rgba(196, 90, 60, 0.05)',
      badgeAnimation: 'pop',
    },
  },
};

/**
 * @typedef {Object} ThemeManagerConfig
 * @property {string} [storageKey='toto_fx_themes'] - localStorage key for custom themes.
 * @property {string} [themeBaseUrl='/themes'] - Base URL for fetching built-in theme JSON files.
 * @property {string} [styleElementId='toto-theme'] - ID of the client-side injected style element.
 * @property {string} [serverStyleElementId='toto-theme-server'] - ID of the server-side injected style element (removed on first client apply).
 * @property {Function} [getActiveThemeId] - Function that returns the active theme ID from external state. Called during init.
 * @property {Function} [onThemeChange] - Callback invoked after a theme is applied: (themeId: string) => void.
 * @property {Object} [settingsProvider] - Optional external settings provider with `load()` and `particleColors`/`particleChars` support.
 */

/** Default configuration values */
const DEFAULT_CONFIG = {
  storageKey: 'toto_fx_themes',
  themeBaseUrl: '/themes',
  styleElementId: 'toto-fx-theme',
  serverStyleElementId: 'toto-fx-theme-server',
  getActiveThemeId: null,
  onThemeChange: null,
  settingsProvider: null,
};

/**
 * Create a configured theme manager instance.
 *
 * @param {ThemeManagerConfig} [config] - Configuration overrides.
 * @returns {Object} ThemeManager API.
 *
 * @example
 * import { createThemeManager } from 'toto-fx/theme';
 *
 * const themes = createThemeManager({
 *   themeBaseUrl: '/assets/themes',
 *   storageKey: 'my_app_themes',
 * });
 *
 * themes.init();
 * themes.setActive('cyber');
 */
export function createThemeManager(config) {
  var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});

  /** @type {Object} The currently active theme */
  var _active = WARM_THEME;
  /** @type {Object<string, Object>} All loaded themes keyed by ID */
  var _themes = { warm: WARM_THEME };
  /** @type {Object|null} Backup of the theme before a live preview started */
  var _previewBackup = null;

  // ── Init ──────────────────────────────────────────────────────

  /**
   * Initialize the theme manager: load custom themes from localStorage,
   * restore the active theme, and apply it to the DOM.
   */
  function init() {
    // Load custom themes from localStorage
    try {
      var raw = localStorage.getItem(cfg.storageKey);
      if (raw) {
        var customs = JSON.parse(raw);
        for (var i = 0; i < customs.length; i++) {
          var t = customs[i];
          if (t && t.id) _themes[t.id] = t;
        }
      }
    } catch (e) { /* ignore corrupt data */ }

    // Resolve active theme ID from external state or default to 'warm'
    var themeId = 'warm';
    if (typeof cfg.getActiveThemeId === 'function') {
      themeId = cfg.getActiveThemeId() || 'warm';
    }

    if (_themes[themeId]) {
      _active = _themes[themeId];
      _applyToDOM(_active);
    } else if (BUILTIN_THEMES.includes(themeId)) {
      // Fetch AND activate -- pass true so theme applies once loaded
      _fetchBuiltin(themeId, true);
      // Don't override server-side injection while fetching
      return;
    } else {
      _active = WARM_THEME;
      _applyToDOM(_active);
    }
  }

  // ── Animation color/char/effect accessors ─────────────────────

  /**
   * Get a named animation color from the active theme (e.g. 'flash', 'glow').
   * Falls back to the warm theme, then to white.
   *
   * @param {string} name - The color key (e.g. 'flash', 'glow').
   * @returns {string} A CSS color string.
   */
  function color(name) {
    var anim = _active.animations;
    var colors = anim && anim.colors;
    if (colors && colors[name]) return colors[name];
    return WARM_THEME.animations.colors[name] || '#ffffff';
  }

  /**
   * Get a random particle color RGB tuple for a given particle category.
   * Reads from settingsProvider.particleColors if available.
   * Falls back to warm theme values.
   *
   * @param {string} category - The particle category (e.g. 'impact', 'smoke', 'fire', 'debris', 'confetti').
   * @returns {number[]} An `[r, g, b]` tuple (0-255).
   */
  function particleColor(category) {
    // Read from settings provider (particle colors are independent of theme)
    if (cfg.settingsProvider) {
      var settings = typeof cfg.settingsProvider.load === 'function' ? cfg.settingsProvider.load() : cfg.settingsProvider;
      var pc = settings.particleColors;
      if (pc && pc[category] && pc[category].length > 0) {
        return pc[category][Math.floor(Math.random() * pc[category].length)];
      }
    }
    // Fallback to warm theme defaults
    var fallback = WARM_THEME.animations.colors.particles[category];
    if (fallback && fallback.length > 0) return fallback[Math.floor(Math.random() * fallback.length)];
    return [255, 255, 255];
  }

  /**
   * Get the ASCII character set for a given animation category.
   * Reads from settingsProvider.particleChars if available.
   * Falls back to DEFAULT_CHARS.
   *
   * @param {string} category - The character category (e.g. 'particles', 'smoke', 'fire', 'confetti', 'hearts').
   * @returns {string[]} Array of single-character strings.
   */
  function chars(category) {
    // Read from settings provider (particle chars are independent of theme)
    if (cfg.settingsProvider) {
      var settings = typeof cfg.settingsProvider.load === 'function' ? cfg.settingsProvider.load() : cfg.settingsProvider;
      var pc = settings.particleChars;
      if (pc && pc[category] && pc[category].length > 0) {
        return pc[category];
      }
    }
    return DEFAULT_CHARS[category] || DEFAULT_CHARS.particles;
  }

  /**
   * Get a named animation effect setting from the active theme.
   * Falls back to the warm theme's value.
   *
   * @param {string} name - The effect key (e.g. 'flashOpacity', 'glowIntensity', 'particleTrails', 'badgeAnimation').
   * @returns {*} The effect value (type depends on the specific effect).
   */
  function effect(name) {
    var anim = _active.animations;
    var fx = anim && anim.effects;
    return (fx && fx[name] !== undefined) ? fx[name] : WARM_THEME.animations.effects[name];
  }

  // ── Theme switching ───────────────────────────────────────────

  /**
   * Activate a theme by ID. If the theme is loaded, applies it immediately.
   * If it's a known built-in theme that hasn't been fetched yet, fetches and activates it.
   *
   * @param {string} themeId - The theme ID to activate.
   */
  function setActive(themeId) {
    if (_themes[themeId]) {
      _active = _themes[themeId];
      _applyToDOM(_active);
      if (typeof cfg.onThemeChange === 'function') cfg.onThemeChange(themeId);
      return;
    }
    if (BUILTIN_THEMES.includes(themeId)) {
      _fetchBuiltin(themeId, true);
    }
  }

  /**
   * Get all available themes (built-in + custom). Unfetched built-in themes
   * appear as stub objects with `_stub: true` and a "Loading..." description.
   *
   * @returns {Object[]} Array of all themes, built-ins first.
   */
  function getAll() {
    var result = [];
    for (var i = 0; i < BUILTIN_THEMES.length; i++) {
      var id = BUILTIN_THEMES[i];
      if (_themes[id]) {
        result.push(_themes[id]);
      } else {
        // Stub for unfetched built-in themes
        result.push({ id: id, name: id.charAt(0).toUpperCase() + id.slice(1), description: 'Loading...', _stub: true });
      }
    }
    // Add custom themes
    var allIds = Object.keys(_themes);
    for (var j = 0; j < allIds.length; j++) {
      var t = _themes[allIds[j]];
      if (!BUILTIN_THEMES.includes(t.id)) result.push(t);
    }
    return result;
  }

  /**
   * Validate, sanitize, and install a custom theme from a JSON object.
   * Requires `id`, `name`, and `palette` (with at least `bg`, `surface`, `ink`, `accent`).
   * All CSS values are checked against `_isSafeCssValue` to prevent injection.
   *
   * @param {Object} json - The theme definition object.
   * @throws {Error} If required fields are missing, palette is incomplete, ID collides
   *   with a built-in theme, or any CSS value fails sanitization.
   */
  function installCustomTheme(json) {
    if (!json || !json.id || !json.name || !json.palette) {
      throw new Error('Invalid theme: must have id, name, and palette');
    }
    // Require minimum palette fields
    var p = json.palette;
    if (!p.bg || !p.surface || !p.ink || !p.accent) {
      throw new Error('Palette must include at least: bg, surface, ink, accent');
    }
    if (BUILTIN_THEMES.includes(json.id)) {
      throw new Error('Cannot overwrite built-in theme id');
    }
    // Sanitize all CSS values
    if (json.palette) {
      var paletteKeys = Object.keys(json.palette);
      for (var i = 0; i < paletteKeys.length; i++) {
        var k = paletteKeys[i];
        if (!_isSafeVarName(k) || !_isSafeCssValue(json.palette[k])) {
          throw new Error('Unsafe CSS value in palette: ' + k);
        }
      }
    }
    if (json.cssOverrides) {
      var overrideKeys = Object.keys(json.cssOverrides);
      for (var i = 0; i < overrideKeys.length; i++) {
        var k = overrideKeys[i];
        if (!_isSafeVarName(k) || !_isSafeCssValue(json.cssOverrides[k])) {
          throw new Error('Unsafe CSS value in cssOverrides: ' + k);
        }
      }
    }
    if (json.typography) {
      var typoValues = Object.values(json.typography);
      for (var i = 0; i < typoValues.length; i++) {
        if (!_isSafeCssValue(typoValues[i])) {
          throw new Error('Unsafe CSS value in typography');
        }
      }
    }
    if (json.elevation) {
      var elevKeys = Object.keys(json.elevation);
      for (var i = 0; i < elevKeys.length; i++) {
        var k = elevKeys[i];
        if (!_isSafeVarName(k) || !_isSafeCssValue(json.elevation[k])) {
          throw new Error('Unsafe CSS value in elevation: ' + k);
        }
      }
    }
    _themes[json.id] = json;
    _persistCustom();
  }

  /**
   * Remove a custom theme by ID. Built-in themes cannot be removed.
   * If the removed theme was active, reverts to the warm theme.
   *
   * @param {string} themeId - The theme ID to remove.
   */
  function removeCustomTheme(themeId) {
    if (BUILTIN_THEMES.includes(themeId)) return;
    delete _themes[themeId];
    if (_active.id === themeId) {
      _active = WARM_THEME;
      _applyToDOM(WARM_THEME);
      if (typeof cfg.onThemeChange === 'function') cfg.onThemeChange('warm');
    }
    _persistCustom();
  }

  // ── Live preview ──────────────────────────────────────────────

  /**
   * Apply a theme to the DOM for live preview (e.g. on hover).
   * Saves the current theme as a backup for reverting via cancelPreview.
   *
   * @param {Object} theme - The theme to preview.
   */
  function previewTheme(theme) {
    if (!_previewBackup) {
      _previewBackup = _active;
    }
    _applyToDOM(theme);
  }

  /**
   * Revert the DOM to the theme that was active before previewTheme
   * was called. No-op if no preview is active.
   */
  function cancelPreview() {
    if (_previewBackup) {
      _applyToDOM(_previewBackup);
      _previewBackup = null;
    }
  }

  /**
   * Confirm the currently previewed theme as the permanent selection.
   * Clears the backup so that cancelPreview becomes a no-op.
   */
  function confirmPreview() {
    _previewBackup = null;
    // Already applied to DOM, just update state
  }

  // ── DOM injection ─────────────────────────────────────────────

  /**
   * Inject a theme's CSS custom properties into the DOM via a <style> element.
   * Handles palette, typography, elevation, cssOverrides, and color-scheme.
   * Removes server-side injected style on first client-side application.
   * Updates the <meta name="theme-color"> tag with the theme's accent color.
   *
   * @param {Object} theme - The theme to apply.
   * @private
   */
  function _applyToDOM(theme) {
    if (typeof document === 'undefined') return;

    var lines = [];

    // Palette -> CSS variables
    var palette = theme.palette || {};
    var paletteKeys = Object.keys(palette);
    for (var i = 0; i < paletteKeys.length; i++) {
      var name = paletteKeys[i];
      var value = palette[name];
      if (_isSafeVarName(name) && _isSafeCssValue(value)) {
        lines.push('--' + name + ':' + value);
      }
    }

    // Typography
    var typo = theme.typography || {};
    if (typo.fontDisplay && _isSafeCssValue(typo.fontDisplay)) {
      lines.push('--font-display:' + typo.fontDisplay);
    }
    if (typo.fontBody && _isSafeCssValue(typo.fontBody)) {
      lines.push('--font-body:' + typo.fontBody);
    }

    // Elevation
    var elev = theme.elevation || {};
    var elevKeys = Object.keys(elev);
    for (var i = 0; i < elevKeys.length; i++) {
      var name = elevKeys[i];
      var value = elev[name];
      if (_isSafeVarName(name) && _isSafeCssValue(value)) {
        lines.push('--' + name + ':' + value);
      }
    }

    // cssOverrides
    var overrides = theme.cssOverrides || {};
    var overrideKeys = Object.keys(overrides);
    for (var i = 0; i < overrideKeys.length; i++) {
      var name = overrideKeys[i];
      var value = overrides[name];
      if (_isSafeVarName(name) && _isSafeCssValue(value)) {
        lines.push('--' + name + ':' + value);
      }
    }

    // color-scheme
    if (theme.colorScheme === 'dark') {
      lines.push('color-scheme:dark');
    }

    // Inject or update the style element
    var styleEl = document.getElementById(cfg.styleElementId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = cfg.styleElementId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = lines.length > 0 ? ':root{' + lines.join(';') + '}' : '';

    // Remove server-side injected style (client-side takes over)
    if (cfg.serverStyleElementId) {
      var serverStyle = document.getElementById(cfg.serverStyleElementId);
      if (serverStyle) serverStyle.remove();
    }

    // Update theme-color meta tag
    var accent = palette.accent || '#C45A3C';
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', accent);
  }

  // ── Persistence ───────────────────────────────────────────────

  /**
   * Persist all custom (non-built-in) themes to localStorage.
   * @private
   */
  function _persistCustom() {
    var customs = [];
    var allIds = Object.keys(_themes);
    for (var i = 0; i < allIds.length; i++) {
      var t = _themes[allIds[i]];
      if (!BUILTIN_THEMES.includes(t.id)) customs.push(t);
    }
    localStorage.setItem(cfg.storageKey, JSON.stringify(customs));
  }

  /**
   * Fetch a built-in theme JSON file from the configured base URL and optionally activate it.
   *
   * @param {string} themeId - The built-in theme ID to fetch.
   * @param {boolean} [activate=false] - If true, apply the theme after fetching.
   * @private
   */
  function _fetchBuiltin(themeId, activate) {
    if (!BUILTIN_THEMES.includes(themeId)) return;
    var url = cfg.themeBaseUrl.replace(/\/$/, '') + '/' + themeId + '.json';
    fetch(url)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data) {
          _themes[themeId] = data;
          if (activate) {
            _active = data;
            _applyToDOM(data);
            if (typeof cfg.onThemeChange === 'function') cfg.onThemeChange(themeId);
          }
        }
      })
      .catch(function() {});
  }

  // ── Public API ────────────────────────────────────────────────

  return {
    /** Initialize the theme manager */
    init: init,

    /** The currently active theme object */
    get active() { return _active; },

    /** Animation color accessors */
    color: color,
    particleColor: particleColor,
    chars: chars,
    effect: effect,

    /** Theme switching */
    setActive: setActive,
    getAll: getAll,

    /** Custom theme management */
    installCustomTheme: installCustomTheme,
    removeCustomTheme: removeCustomTheme,

    /** Live preview */
    previewTheme: previewTheme,
    cancelPreview: cancelPreview,
    confirmPreview: confirmPreview,
  };
}

/**
 * Default ThemeManager instance with default configuration.
 * For most use cases, import this directly. Use `createThemeManager(config)`
 * for custom configurations.
 */
export const ThemeManager = createThemeManager();
