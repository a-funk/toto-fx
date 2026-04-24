/**
 * @module reconciler
 * @description State-to-DOM synchronization with phase continuity.
 *
 * The reconciler iterates all persistent state entries, resolves them to
 * DOM elements via pluggable resolvers, and starts/stops/skips animations
 * based on version tracking. This is the core of the SDRA pipeline:
 *
 *   Resolve -> Diff -> Apply -> GC
 *
 * Phase continuity: when a DOM element is replaced (e.g., by a morph swap),
 * the reconciler re-starts the animation with a phase offset so the visual
 * continuity is preserved.
 */

/** @type {symbol} Key used to store animation handles on DOM elements. */
export const ANIM_KEY = Symbol('totoAnimation');

// ── Determinism primitives ──────────────────────────────────────
let _now = () => globalThis['performance']['now']();

/** @param {{ now?: () => number }} primitives */
export function configurePrimitives(primitives) {
  if (primitives && primitives.now) _now = primitives.now;
}

/**
 * Apply phase offset to maintain visual continuity after element replacement.
 *
 * For CSS animations, sets a negative animation-delay to skip ahead.
 * For RAF-based animations, fast-forwards the tick function.
 *
 * @param {HTMLElement} el
 * @param {Object} handle - Animation handle from variant.start()
 * @param {number} elapsed - ms since animation originally started
 * @param {Object} [tickerRef] - Optional reference to an InProgressTicker-like object
 */
function applyPhaseOffset(el, handle, elapsed, tickerRef) {
  if (!handle) return;
  if (handle.type === 'css') {
    el.style.animationDelay = '-' + elapsed + 'ms';
  } else if (handle.type === 'raf' && tickerRef) {
    const tickerEntry = tickerRef._items && tickerRef._items.get(el);
    if (tickerEntry && tickerEntry.tickFn && tickerEntry.state) {
      const FRAME_MS = 16.667;
      const frames = Math.min(Math.floor(elapsed / FRAME_MS), 3600);
      for (let f = 0; f < frames; f++) {
        tickerEntry.tickFn(tickerEntry.state);
      }
    }
  }
}

/**
 * Create a Reconciler bound to a configuration object and category registry.
 *
 * @param {Object} store - StateStore instance
 * @param {Object} config - Engine configuration
 * @param {Function} config.resolveElement - Default element resolver
 * @param {Object} categories - Category registry (name -> descriptor)
 * @param {Object} [opts] - Options
 * @param {Function} [opts.lookupVariant] - Variant lookup function (category, style, variant) -> variant object
 * @param {Function} [opts.stopElement] - Stop animation on element function
 * @param {Object} [opts.tickerRef] - Reference to InProgressTicker for phase offset
 * @returns {Object} Reconciler instance
 */
export function createReconciler(store, config, categories, opts) {
  opts = opts || {};

  const Reconciler = {
    /** @type {number} Counter for GC frequency */
    _gcCounter: 0,

    /**
     * Run reconciliation. Iterates all persistent state entries,
     * resolves elements, starts/stops/skips as needed.
     */
    reconcile: function () {
      const defaultResolver = config.resolveElement;
      const entries = [];
      store._persistent.forEach(function (state, key) {
        entries.push({ key: key, state: state });
      });

      if (entries.length === 0) return;

      for (let i = 0; i < entries.length; i++) {
        const key = entries[i].key;
        const state = entries[i].state;
        // Use category-specific resolver if registered, else default
        const catDescriptor = categories[state.category];
        const resolver = (catDescriptor && catDescriptor.resolve) || defaultResolver;
        const el = store.resolveElement(key, resolver);

        if (!el || !el.isConnected) continue;

        // Check if handle exists and matches current state version
        if (el[ANIM_KEY] && el[ANIM_KEY]._fxVersion === state.version) {
          continue;
        }

        // Element needs animation -- either new element or version changed
        if (el[ANIM_KEY]) {
          this._stopElement(el);
        }

        // Start animation with phase offset -- wrapped in try/catch so one
        // broken plugin doesn't kill reconciliation for remaining entries.
        try {
          this._startElement(key, el, state);
        } catch (err) {
          if (config.debug && typeof console !== 'undefined') {
            console.error('[TotoFX] _startElement failed for key "' + key + '":', err);
          }
        }
      }

      // Run GC periodically (not every reconciliation)
      this._gcCounter = (this._gcCounter || 0) + 1;
      if (this._gcCounter >= 30) {
        this._gcCounter = 0;
        store.gc(defaultResolver);
      }
    },

    /**
     * Start a persistent animation on an element with phase continuity.
     * @param {string} key
     * @param {HTMLElement} el
     * @param {Object} state
     * @private
     */
    _startElement: function (key, el, state) {
      const elapsed = _now() - state.startedAt;

      // Check if this category has a registered play function
      const catDescriptor = categories[state.category];
      if (catDescriptor && catDescriptor.play) {
        catDescriptor.play(el, {
          elapsed: elapsed,
          style: state.style,
          variant: state.variant,
          params: state.params,
          key: key,
          reducedMotion: opts.isReducedMotion ? opts.isReducedMotion() : false,
        });

        // Augment the handle with engine metadata for version tracking
        if (el[ANIM_KEY]) {
          el[ANIM_KEY]._fxVersion = state.version;
          el[ANIM_KEY]._fxCategory = state.category;
          el[ANIM_KEY]._fxStyle = state.style;
        }
        return;
      }

      // Fallback: use variant lookup for categories without a category descriptor
      if (!opts.lookupVariant) return;
      const variant = opts.lookupVariant(state.category, state.style, state.variant);
      if (!variant) return;

      if (typeof variant.play === 'function') {
        variant.play(el, {
          elapsed: elapsed,
          style: state.style,
          variant: state.variant,
          params: state.params,
          key: key,
          reducedMotion: opts.isReducedMotion ? opts.isReducedMotion() : false,
        });
      } else if (typeof variant.start === 'function') {
        // Legacy compat: some third-party variants may use start()
        const handle = variant.start(el, state.params);
        if (elapsed > 0 && handle) {
          applyPhaseOffset(el, handle, elapsed, opts.tickerRef || null);
        }
      }

      // Store unified handle (may already have been set by variant.play())
      if (!el[ANIM_KEY]) {
        el[ANIM_KEY] = {};
      }
      el[ANIM_KEY]._fxVersion = state.version;
      el[ANIM_KEY]._fxCategory = state.category;
      el[ANIM_KEY]._fxStyle = state.style;
      el[ANIM_KEY]._fxVariant = state.variant;
    },

    /**
     * Stop animation on an element. Calls the category's stop() callback
     * if one is registered, then the global stop handler, then cleans up
     * the animation handle.
     * @param {HTMLElement} el
     * @private
     */
    _stopElement: function (el) {
      // Call category-specific stop to undo visual effects
      if (el[ANIM_KEY] && el[ANIM_KEY]._fxCategory) {
        var cat = categories[el[ANIM_KEY]._fxCategory];
        if (cat && cat.stop) {
          cat.stop(el);
        }
      }

      // Call global stop handler (for app-level cleanup like ticker removal)
      if (opts.stopElement) {
        opts.stopElement(el);
      }

      // Clean up the animation handle
      delete el[ANIM_KEY];
    },
  };

  return Reconciler;
}
