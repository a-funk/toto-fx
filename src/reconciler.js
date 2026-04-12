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

import { StateStore } from './state-store.js';

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
 * @param {Object} config - Engine configuration
 * @param {Function} config.resolveElement - Default element resolver
 * @param {Object} categories - Category registry (name -> descriptor)
 * @param {Object} [opts] - Options
 * @param {Function} [opts.lookupVariant] - Variant lookup function (category, style, variant) -> variant object
 * @param {Function} [opts.stopElement] - Stop animation on element function
 * @param {Object} [opts.tickerRef] - Reference to InProgressTicker for phase offset
 * @returns {Object} Reconciler instance
 */
export function createReconciler(config, categories, opts) {
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
      StateStore._persistent.forEach(function (state, key) {
        entries.push({ key: key, state: state });
      });

      if (entries.length === 0) return;

      for (let i = 0; i < entries.length; i++) {
        const key = entries[i].key;
        const state = entries[i].state;
        // Use category-specific resolver if registered, else default
        const catDescriptor = categories[state.category];
        const resolver = (catDescriptor && catDescriptor.resolve) || defaultResolver;
        const el = StateStore.resolveElement(key, resolver);

        if (!el || !el.isConnected) continue;

        // Check if handle exists and matches current state version
        if (el.__totoAnimation && el.__totoAnimation._fxVersion === state.version) {
          continue;
        }

        // Element needs animation -- either new element or version changed
        if (el.__totoAnimation) {
          this._stopElement(el);
        }

        // Start animation with phase offset
        this._startElement(key, el, state);
      }

      // Run GC periodically (not every reconciliation)
      this._gcCounter = (this._gcCounter || 0) + 1;
      if (this._gcCounter >= 30) {
        this._gcCounter = 0;
        StateStore.gc(defaultResolver);
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
      const elapsed = performance.now() - state.startedAt;

      // Check if this category has a registered play function
      const catDescriptor = categories[state.category];
      if (catDescriptor && catDescriptor.play) {
        catDescriptor.play(el, {
          elapsed: elapsed,
          style: state.style,
          variant: state.variant,
          params: state.params,
          key: key,
        });

        // Augment the handle with engine metadata for version tracking
        if (el.__totoAnimation) {
          el.__totoAnimation._fxVersion = state.version;
          el.__totoAnimation._fxCategory = state.category;
          el.__totoAnimation._fxStyle = state.style;
        }
        return;
      }

      // Fallback: use variant lookup for categories with start/stop objects
      if (!opts.lookupVariant) return;
      const variant = opts.lookupVariant(state.category, state.style, state.variant);
      if (!variant || !variant.start) return;

      const handle = variant.start(el, state.params);

      // Apply phase offset if element was replaced
      if (elapsed > 0 && handle) {
        applyPhaseOffset(el, handle, elapsed, opts.tickerRef || null);
      }

      // Store unified handle
      el.__totoAnimation = {
        handle: handle,
        variant: state.variant,
        _fxVersion: state.version,
        _fxCategory: state.category,
        _fxStyle: state.style,
      };
    },

    /**
     * Stop animation on an element.
     * @param {HTMLElement} el
     * @private
     */
    _stopElement: function (el) {
      if (opts.stopElement) {
        opts.stopElement(el);
      }
    },
  };

  return Reconciler;
}
