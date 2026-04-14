/**
 * @module preset
 * @description Animation preset schema -- validation, normalization, conversion, and sharing.
 *
 * A preset is a portable, shareable snapshot of animation + dotgrid + theme configuration.
 * Presets unify sandbox snapshots, AnimationSettings, and FX panel pills into one format.
 *
 * Settings keys use the toto-fx open-source vocabulary:
 *   action (completion), destroy (deletion — routed as action/destroy style),
 *   enter (creation), persist (inProgress), container (list), containerExit (listExit)
 *
 * Minimal valid preset:
 *   `{ "$schema": "toto-preset-v1", "id": "x", "name": "X", "action": { "style": "thud" } }`
 * Full preset: all fields populated (shared presets are always promoted to full).
 */

const SCHEMA_VERSION = 'toto-preset-v1';

/** Default localStorage key for user presets */
const DEFAULT_PRESETS_KEY = 'toto_fx_presets';

/** Maximum number of user presets that can be stored */
const MAX_USER_PRESETS = 100;

// ── Helpers ─────────────────────────────────────────────────

function _cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function _merge(target, source) {
  var result = _cloneDeep(target || {});
  if (!source) return result;
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (source[k] !== null && typeof source[k] === 'object' && !Array.isArray(source[k]) &&
        result[k] !== null && typeof result[k] === 'object' && !Array.isArray(result[k])) {
      result[k] = _merge(result[k], source[k]);
    } else {
      result[k] = _cloneDeep(source[k]);
    }
  }
  return result;
}

function _clamp(v, min, max) {
  if (v === undefined || v === null) return undefined;
  return Math.max(min, Math.min(max, v));
}

function _sanitizeStr(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>&"]/g, '').substring(0, 500);
}

function _sanitizeId(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[^a-z0-9_-]/gi, '-').toLowerCase().substring(0, 64);
}

function _isValidTag(tag) {
  return typeof tag === 'string' && /^[a-z0-9-]{1,30}$/.test(tag);
}

function _generateId(name) {
  var base = _sanitizeId(name);
  return base + '-' + Date.now().toString(36);
}

// ── Validation ──────────────────────────────────────────────

/**
 * Validate a preset object against the schema.
 * @param {Object} obj - The preset to validate.
 * @returns {{ valid: boolean, errors: string[], normalized: Object|null }}
 */
function validate(obj) {
  var errors = [];
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Preset must be an object'], normalized: null };
  }
  if (obj.$schema && obj.$schema !== SCHEMA_VERSION) {
    errors.push('Unknown schema: ' + obj.$schema + ' (expected ' + SCHEMA_VERSION + ')');
  }
  if (!obj.id || typeof obj.id !== 'string') errors.push('Missing or invalid "id"');
  if (!obj.name || typeof obj.name !== 'string') errors.push('Missing or invalid "name"');
  if (!obj.action && !obj.destroy && !obj.persist && !obj.enter) errors.push('At least one of "action", "destroy", "persist", or "enter" is required');

  // Sanitize strings
  if (obj.name && obj.name.length > 100) errors.push('Name too long (max 100 chars)');
  if (obj.meta && obj.meta.description && obj.meta.description.length > 500) errors.push('Description too long (max 500 chars)');

  // Numeric clamping checks
  if (obj.action) {
    if (obj.action.intensity !== undefined) {
      if (typeof obj.action.intensity !== 'number' || obj.action.intensity < 1 || obj.action.intensity > 10) {
        errors.push('action.intensity must be 1-10');
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors: errors, normalized: null };
  }

  return { valid: true, errors: [], normalized: normalize(obj) };
}

// ── Normalization ───────────────────────────────────────────

/**
 * Fill in defaults for missing optional fields.
 * @param {Object} obj - A valid preset object.
 * @returns {Object} Normalized preset with all fields.
 */
function normalize(obj) {
  var preset = {
    $schema: SCHEMA_VERSION,
    id: _sanitizeId(obj.id),
    name: _sanitizeStr(obj.name),
    version: obj.version || 1,
    author: _sanitizeStr(obj.author || ''),
    action: obj.action ? _cloneDeep(obj.action) : null,
    destroy: obj.destroy ? _cloneDeep(obj.destroy) : null,
    persist: obj.persist ? _cloneDeep(obj.persist) : null,
    enter: obj.enter ? _cloneDeep(obj.enter) : null,
    fxConfig: obj.fxConfig ? _cloneDeep(obj.fxConfig) : null,
    dotgrid: obj.dotgrid ? _cloneDeep(obj.dotgrid) : null,
    theme: obj.theme || null,
    meta: {
      created: (obj.meta && obj.meta.created) || new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: (obj.meta && Array.isArray(obj.meta.tags)) ? obj.meta.tags.filter(_isValidTag) : [],
      description: _sanitizeStr((obj.meta && obj.meta.description) || ''),
      source: (obj.meta && obj.meta.source) || 'user',
    },
  };

  // Clamp numeric values
  if (preset.action) {
    preset.action.intensity = _clamp(preset.action.intensity, 1, 10);
    preset.action.speed = _clamp(preset.action.speed, 0.25, 4);
  }
  if (preset.destroy) {
    preset.destroy.intensity = _clamp(preset.destroy.intensity, 1, 10);
    preset.destroy.speed = _clamp(preset.destroy.speed, 0.25, 4);
  }
  if (preset.persist) {
    preset.persist.intensity = _clamp(preset.persist.intensity, 1, 10);
    preset.persist.speed = _clamp(preset.persist.speed, 0.25, 4);
  }
  if (preset.enter) {
    preset.enter.intensity = _clamp(preset.enter.intensity, 1, 10);
    preset.enter.speed = _clamp(preset.enter.speed, 0.25, 4);
  }
  if (preset.dotgrid && preset.dotgrid.config) {
    var dc = preset.dotgrid.config;
    dc.dotSize = _clamp(dc.dotSize, 16, 48);
    dc.fontSize = _clamp(dc.fontSize, 10, 32);
    dc.baseOpacity = _clamp(dc.baseOpacity, 0.05, 1.0);
    dc.densityDecay = _clamp(dc.densityDecay, 0.9, 0.999);
    dc.velDecay = _clamp(dc.velDecay, 0.8, 0.99);
    dc.diffusionRate = _clamp(dc.diffusionRate, 0.0, 0.5);
    dc.displacementScale = _clamp(dc.displacementScale, 0.0, 2.0);
    dc.opacityMin = _clamp(dc.opacityMin, 0.0, 1.0);
    dc.opacityMax = _clamp(dc.opacityMax, 0.0, 1.0);
    dc.densityMultiplier = _clamp(dc.densityMultiplier, 0.1, 3.0);
    dc.glowRadius = _clamp(dc.glowRadius, 2, 20);
    dc.glowIntensity = _clamp(dc.glowIntensity, 0.1, 1.0);
  }

  return preset;
}

// ── Promotion ───────────────────────────────────────────────

/**
 * Promote a partial preset to full by filling from current settings.
 * Used before sharing -- shared presets must be complete.
 * @param {Object} partial - The partial preset.
 * @param {Object} currentSettings - Current animation settings result.
 * @returns {Object} Full preset with all fields populated.
 */
function promote(partial, currentSettings) {
  var full = fromAnimationSettings(currentSettings);
  // Override with values from the partial
  if (partial.id) full.id = partial.id;
  if (partial.name) full.name = partial.name;
  if (partial.author) full.author = partial.author;
  if (partial.action) full.action = _cloneDeep(partial.action);
  if (partial.destroy) full.destroy = _cloneDeep(partial.destroy);
  if (partial.persist) full.persist = _cloneDeep(partial.persist);
  if (partial.enter) full.enter = _cloneDeep(partial.enter);
  if (partial.fxConfig) full.fxConfig = _cloneDeep(partial.fxConfig);
  if (partial.dotgrid) full.dotgrid = _cloneDeep(partial.dotgrid);
  if (partial.theme) full.theme = partial.theme;
  if (partial.meta) {
    if (partial.meta.tags) full.meta.tags = partial.meta.tags;
    if (partial.meta.description) full.meta.description = partial.meta.description;
  }
  return normalize(full);
}

// ── Conversion: Settings -> Preset ───────────────────────────

/**
 * Convert animation settings to a full preset object.
 * @param {Object} s - Animation settings object.
 * @param {string} [name] - Optional preset name.
 * @returns {Object} Full preset.
 */
function fromAnimationSettings(s, name) {
  return normalize({
    $schema: SCHEMA_VERSION,
    id: _generateId(name || 'custom'),
    name: name || 'Custom Preset',
    author: '',
    action: s.action ? _cloneDeep(s.action) : null,
    destroy: s.destroy ? _cloneDeep(s.destroy) : null,
    persist: s.persist ? _cloneDeep(s.persist) : null,
    enter: s.enter ? _cloneDeep(s.enter) : null,
    fxConfig: s.fxConfig ? _cloneDeep(s.fxConfig) : null,
    dotgrid: {
      config: s.dotgridConfig ? _cloneDeep(s.dotgridConfig) : null,
      binding: null,
    },
    theme: s.theme || null,
    meta: {
      source: 'settings',
      tags: [],
      description: '',
    },
  });
}

// ── Conversion: Preset -> Settings ───────────────────────────

/**
 * Apply a preset to animation settings format. Missing fields inherit from defaults.
 * @param {Object} preset - The preset to apply.
 * @param {Object} [defaults] - Defaults to merge with.
 * @returns {Object} Settings object ready for saving.
 */
function toAnimationSettings(preset, defaults) {
  var d = defaults || {};
  var s = _cloneDeep(d);

  if (preset.action) s.action = _merge(s.action, preset.action);
  if (preset.destroy) s.destroy = _merge(s.destroy, preset.destroy);
  if (preset.persist) s.persist = _merge(s.persist, preset.persist);
  if (preset.enter) s.enter = _merge(s.enter, preset.enter);
  if (preset.fxConfig) s.fxConfig = _merge(s.fxConfig, preset.fxConfig);
  if (preset.dotgrid && preset.dotgrid.config) s.dotgridConfig = _merge(s.dotgridConfig, preset.dotgrid.config);
  if (preset.theme) s.theme = preset.theme;

  return s;
}

// ── URL Sharing ─────────────────────────────────────────────

/**
 * Encode a preset for URL sharing.
 * @param {Object} preset - The preset to encode.
 * @returns {string} URL hash value (without the #preset= prefix).
 */
function encodeForUrl(preset) {
  var json = JSON.stringify(preset);
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Decode a preset from a URL hash value.
 * @param {string} encoded - The base64-encoded preset string.
 * @returns {{ valid: boolean, preset: Object|null, error: string|null }}
 */
function decodeFromUrl(encoded) {
  try {
    var json = decodeURIComponent(escape(atob(encoded)));
    if (json.length > 4096) {
      return { valid: false, preset: null, error: 'Preset too large (max 4KB)' };
    }
    var obj = JSON.parse(json);
    var result = validate(obj);
    if (!result.valid) {
      return { valid: false, preset: null, error: result.errors.join(', ') };
    }
    return { valid: true, preset: result.normalized, error: null };
  } catch (e) {
    return { valid: false, preset: null, error: 'Invalid preset data: ' + e.message };
  }
}

/**
 * Build a full share URL for a preset.
 * Uses window.location if available, otherwise returns just the hash fragment.
 * @param {Object} preset - The preset to share.
 * @returns {string} Full URL with #preset= hash, or hash fragment in non-browser environments.
 */
function buildShareUrl(preset) {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin + window.location.pathname + '#preset=' + encodeForUrl(preset);
  }
  return '#preset=' + encodeForUrl(preset);
}

// ── User Presets (localStorage) ─────────────────────────────

/**
 * Create a user presets store backed by localStorage.
 * @param {Object} [config] - Configuration options.
 * @param {string} [config.storageKey] - localStorage key (default: 'toto_fx_presets').
 * @param {number} [config.maxPresets] - Maximum number of presets (default: 100).
 * @returns {Object} User presets API: { getAll, save, remove }
 */
function createUserPresetsStore(config) {
  var cfg = config || {};
  var key = cfg.storageKey || DEFAULT_PRESETS_KEY;
  var maxPresets = cfg.maxPresets || MAX_USER_PRESETS;

  /**
   * Get all user-saved presets from localStorage.
   * @returns {Object[]} Array of preset objects.
   */
  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  }

  /**
   * Save a preset to the user's localStorage collection.
   * @param {Object} preset - The preset to save.
   * @returns {boolean} True if saved successfully.
   */
  function save(preset) {
    var presets = getAll();
    // Replace if same ID exists
    var idx = -1;
    for (var i = 0; i < presets.length; i++) {
      if (presets[i].id === preset.id) { idx = i; break; }
    }
    if (idx >= 0) {
      presets[idx] = preset;
    } else {
      if (presets.length >= maxPresets) return false;
      presets.push(preset);
    }
    localStorage.setItem(key, JSON.stringify(presets));
    return true;
  }

  /**
   * Delete a user preset by ID.
   * @param {string} id - The preset ID to delete.
   */
  function remove(id) {
    var presets = getAll().filter(function(p) { return p.id !== id; });
    localStorage.setItem(key, JSON.stringify(presets));
  }

  return { getAll: getAll, save: save, remove: remove };
}

// Default user presets store instance
var _defaultStore = null;

/**
 * Get all user-saved presets from localStorage (uses default store).
 * @returns {Object[]} Array of preset objects.
 */
function getUserPresets() {
  if (!_defaultStore) _defaultStore = createUserPresetsStore();
  return _defaultStore.getAll();
}

/**
 * Save a preset to the user's localStorage collection (uses default store).
 * @param {Object} preset - The preset to save.
 * @returns {boolean} True if saved successfully.
 */
function saveUserPreset(preset) {
  if (!_defaultStore) _defaultStore = createUserPresetsStore();
  return _defaultStore.save(preset);
}

/**
 * Delete a user preset by ID (uses default store).
 * @param {string} id - The preset ID to delete.
 */
function deleteUserPreset(id) {
  if (!_defaultStore) _defaultStore = createUserPresetsStore();
  return _defaultStore.remove(id);
}

// ── Public API ──────────────────────────────────────────────

export const PresetSchema = {
  SCHEMA_VERSION,
  validate,
  normalize,
  promote,
  fromAnimationSettings,
  toAnimationSettings,
  encodeForUrl,
  decodeFromUrl,
  buildShareUrl,
  getUserPresets,
  saveUserPreset,
  deleteUserPreset,
  createUserPresetsStore,
};
