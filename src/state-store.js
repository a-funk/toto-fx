/**
 * @module state-store
 * @description Element-generic state store for managing persistent and transient
 * animation state. Keys are opaque strings -- the engine doesn't care what they
 * represent. GroupId supports group queries (e.g., "is anything in this list animating?").
 */

/**
 * @typedef {Object} PersistentEntry
 * @property {string} category
 * @property {string} style
 * @property {string} variant
 * @property {Object} params
 * @property {number} startedAt
 * @property {string} groupId
 * @property {number} version
 */

/**
 * @typedef {Object} TransientEntry
 * @property {string} category
 * @property {string} groupId
 * @property {number} startedAt
 * @property {Function|null} onDone
 * @property {HTMLElement|null} element
 */

export const StateStore = {
  /** @type {Map<string, PersistentEntry>} */
  _persistent: new Map(),

  /** @type {Map<string, TransientEntry>} */
  _transient: new Map(),

  /** @type {number} Monotonic version counter for stale detection */
  _version: 0,

  /** @type {Map<string, WeakRef>} Element cache */
  _elementCache: new Map(),

  /**
   * Set persistent animation state for a key.
   * @param {string} category
   * @param {string} key
   * @param {Object} state
   */
  set: function (category, key, state) {
    this._version++;
    this._persistent.set(key, {
      category: category,
      style: (state && state.style) || 'default',
      variant: (state && state.variant) || 'default',
      params: (state && state.params) || state || {},
      startedAt: performance.now(),
      groupId: (state && state.groupId) || '',
      version: this._version,
    });
  },

  /**
   * Clear persistent animation state for a key.
   * @param {string} category
   * @param {string} key
   */
  clear: function (category, key) {
    this._version++;
    const entry = this._persistent.get(key);
    if (entry && entry.category === category) {
      this._persistent.delete(key);
    }
  },

  /**
   * Set transient (one-shot) animation state.
   * @param {string} category
   * @param {string} key
   * @param {Object} opts
   */
  setTransient: function (category, key, opts) {
    this._transient.set(key, {
      category: category,
      groupId: (opts && opts.groupId) || '',
      startedAt: performance.now(),
      onDone: (opts && opts.onDone) || null,
      element: (opts && opts.element) || null,
    });
  },

  /**
   * Clear transient animation state.
   * @param {string} key
   */
  clearTransient: function (key) {
    this._transient.delete(key);
  },

  /**
   * Check if a key has persistent state in a given category.
   * @param {string} category
   * @param {string} key
   * @returns {boolean}
   */
  isActive: function (category, key) {
    const entry = this._persistent.get(key);
    return !!(entry && entry.category === category);
  },

  /**
   * Get all persistent keys for a category.
   * @param {string} category
   * @returns {Set<string>}
   */
  getActiveKeys: function (category) {
    const keys = new Set();
    this._persistent.forEach(function (state, key) {
      if (state.category === category) keys.add(key);
    });
    return keys;
  },

  /**
   * Check if any transient animation is active for a group.
   * @param {string} groupId
   * @returns {boolean}
   */
  isGroupAnimating: function (groupId) {
    if (!groupId) return false;
    let found = false;
    this._transient.forEach(function (state) {
      if (state.groupId === groupId) found = true;
    });
    return found;
  },

  /**
   * Check if any transient animation is active at all.
   * @returns {boolean}
   */
  hasAnyTransient: function () {
    return this._transient.size > 0;
  },

  /**
   * Resolve an element for a key using the configured resolver.
   * Uses WeakRef cache for performance.
   * @param {string} key
   * @param {Function} resolver
   * @returns {HTMLElement|null}
   */
  resolveElement: function (key, resolver) {
    const cached = this._elementCache.get(key);
    if (cached) {
      const el = cached.deref();
      if (el && el.isConnected) return el;
      this._elementCache.delete(key);
    }
    const el = resolver(key);
    if (el) this._elementCache.set(key, new WeakRef(el));
    return el;
  },

  /**
   * Invalidate the element cache (call before reconciliation).
   */
  invalidateCache: function () {
    this._elementCache.clear();
  },

  /**
   * Get persistent state for a key.
   * @param {string} key
   * @returns {PersistentEntry|undefined}
   */
  getPersistent: function (key) {
    return this._persistent.get(key);
  },

  /**
   * GC: remove entries whose elements have been absent too long.
   * @param {Function} resolver
   * @param {number} [persistentMaxAge] - ms before removing absent persistent entries (default 60000)
   * @param {number} [transientMaxAge] - ms before removing stale transient entries (default 30000)
   */
  gc: function (resolver, persistentMaxAge, transientMaxAge) {
    const now = performance.now();
    const pMax = persistentMaxAge || 60000;
    const tMax = transientMaxAge || 30000;

    // GC persistent entries without elements
    const toDelete = [];
    this._persistent.forEach(function (state, key) {
      const el = resolver(key);
      if (!el) {
        if (now - state.startedAt > pMax) toDelete.push(key);
      }
    });
    for (let i = 0; i < toDelete.length; i++) {
      this._persistent.delete(toDelete[i]);
    }

    // GC stale transient entries
    const stale = [];
    this._transient.forEach(function (state, key) {
      if (now - state.startedAt > tMax) stale.push(key);
    });
    for (let j = 0; j < stale.length; j++) {
      this._transient.delete(stale[j]);
    }
  },
};
