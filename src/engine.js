/**
 * @module engine
 * @description TotoFX engine facade -- composes StateStore, DOMObserver,
 * Reconciler, RefreshCoordinator, and LayoutAnimator into the unified
 * TotoFX API.
 *
 * This is the main engine object. In IIFE builds it's exposed as
 * window.TotoFX. In ESM builds it's the default export.
 */

import { createStateStore } from './state-store.js';
import { createDOMObserver } from './dom-observer.js';
import { createReconciler, ANIM_KEY } from './reconciler.js';
import { createRefreshCoordinator } from './refresh-coordinator.js';
import { createLayoutAnimator } from './layout-animator.js';
import { createClock } from './core/clock.js';
import { createRngPool } from './core/rng.js';
import { createScheduler } from './core/scheduler.js';
import { configurePrimitives as _configureFXPrimitives } from './fx.js';
import { configurePrimitives as _configureStateStorePrimitives } from './state-store.js';
import { configurePrimitives as _configureReconcilerPrimitives } from './reconciler.js';
import { configurePrimitives as _configureDomObserverPrimitives } from './dom-observer.js';
import { configurePrimitives as _configureRefreshCoordinatorPrimitives } from './refresh-coordinator.js';

/**
 * Create a TotoFX engine instance.
 *
 * @param {import('./types.js').TotoFXConfig} [userConfig] - Engine configuration
 * @returns {Object} TotoFX engine instance
 */
export function createEngine(userConfig) {
  userConfig = userConfig || {};

  // ── Per-engine state and observer ───────────────────────────
  const _store = createStateStore();
  const _domObserver = createDOMObserver(_store);

  // ── Determinism primitives ──────────────────────────────────
  // Live mode by default — zero-overhead pass-through to browser APIs.
  // Flip to render mode via engine.setRenderMode(true, { seed }).
  const _clock = createClock();
  const _rng = createRngPool(0);
  const _scheduler = createScheduler(_clock);

  // Bind engine-internal modules + fx.js to this engine's primitives.
  // Last engine to construct wins across these module-level singletons —
  // the multi-engine case is explicitly out of scope for v0.4.
  const _primBundle = {
    now: function () { return _clock.now(); },
    raf: function (cb) { return _scheduler.schedule(cb); },
    cancelRaf: function (token) { _scheduler.cancel(token); },
    rand: function () { return _rng.rand('fx'); },
  };
  _configureFXPrimitives(_primBundle);
  _configureStateStorePrimitives(_primBundle);
  _configureReconcilerPrimitives(_primBundle);
  _configureDomObserverPrimitives(_primBundle);
  _configureRefreshCoordinatorPrimitives(_primBundle);

  // ── Configuration ──────────────────────────────────────────

  var _dotgrid = null;
  var _helpers = userConfig.helpers || null;

  const _config = {
    root: userConfig.root || (typeof document !== 'undefined' ? document.body : null),
    resolveElement: userConfig.resolveElement || function (key) {
      return document.querySelector('[data-anim-id="' + key + '"]');
    },
    onRefresh: userConfig.onRefresh || null,
    debug: userConfig.debug !== undefined ? userConfig.debug : false,
    reducedMotion: userConfig.reducedMotion || 'ignore', // 'respect' | 'ignore'
  };

  // ── Reduced Motion ────────────────────────────────────────
  const _reducedMotionQuery = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function _isReducedMotion() {
    return _config.reducedMotion === 'respect' && _reducedMotionQuery && _reducedMotionQuery.matches;
  }

  function _warn(msg) {
    if (_config.debug && typeof console !== 'undefined') {
      console.warn('[TotoFX] ' + msg);
    }
  }

  // ── Event Emitter ─────────────────────────────────────────
  const _listeners = {};

  function _emit(event, data) {
    const fns = _listeners[event];
    if (!fns) return;
    for (let i = 0; i < fns.length; i++) {
      try { fns[i](data); } catch (e) { /* listener errors should not break the engine */ }
    }
  }

  // ── Category Registry ──────────────────────────────────────

  /** @type {Object<string, import('./types.js').CategoryDescriptor>} */
  const _categories = {};

  // ── Plugin / FX Storage ────────────────────────────────────

  const _plugins = [];
  const _fxLayers = {};

  // ── Create sub-modules ─────────────────────────────────────

  const _layoutAnimator = createLayoutAnimator({
    containerResolver: userConfig.containerResolver || undefined,
    duration: userConfig.layoutDuration || 300,
    easing: userConfig.layoutEasing || 'ease-out',
  });

  const _reconciler = createReconciler(_store, _config, _categories, {
    lookupVariant: function (category, style, variant) {
      // Delegate to a user-provided variant registry if available
      if (engine._variantLookup) {
        return engine._variantLookup(category, style, variant);
      }
      return null;
    },
    stopElement: function (el) {
      if (engine._stopHandler) {
        engine._stopHandler(el);
      }
    },
    isReducedMotion: _isReducedMotion,
    tickerRef: null,
  });

  const _refreshCoordinator = createRefreshCoordinator(_store, {
    layoutAnimator: _layoutAnimator,
    reconciler: _reconciler,
    debounceMs: userConfig.debounceMs,
  });

  if (_config.onRefresh) {
    _refreshCoordinator.configure(_config.onRefresh);
  }

  // ── Scoped FX Context ──────────────────────────────────────

  /**
   * Execute an animation function with a scoped FX context.
   * Sets the context before the animation starts and clears it when
   * the animation's onDone callback fires.
   *
   * @param {Object} ctxOpts - Context options
   * @param {Function} animFn - The animation function to call
   * @param {HTMLElement} el - The element to animate
   * @param {Object} animOpts - Options to pass to the animation function
   */
  function _withScopedContext(ctxOpts, animFn, el, animOpts) {
    const originalOnDone = animOpts.onDone;
    const scopedCtx = ctxOpts || { speed: 1, fxOverrides: null };

    // If there's a registered FX context manager, use it
    if (engine._fxContextManager) {
      engine._fxContextManager.set(scopedCtx);
    }

    animOpts.onDone = function () {
      if (engine._fxContextManager) {
        engine._fxContextManager.clear();
      }
      if (originalOnDone) originalOnDone();
    };

    animFn(el, animOpts);
  }

  // ── Engine API ─────────────────────────────────────────────

  const engine = {
    /** @type {string} */
    version: '0.1.0',

    /** @type {boolean} */
    _initialized: false,

    /** @type {number|null} */
    _gcInterval: null,

    /** @type {Function|null} Optional variant lookup: (category, style, variant) => object */
    _variantLookup: null,

    /** @type {Function|null} Optional stop handler: (element) => void */
    _stopHandler: null,

    /** @type {Object|null} Optional FX context manager: { set(ctx), clear() } */
    _fxContextManager: null,

    // ── Configuration ────────────────────────────────────────

    /**
     * Configure the engine. Can be called before or after init().
     *
     * @param {Object} opts
     * @param {Function} [opts.resolveElement] - Element resolver function
     * @param {HTMLElement} [opts.root] - Root element for DOM observation
     * @param {Function} [opts.onRefresh] - Refresh callback (groupId) => void|Promise
     * @param {Function} [opts.variantLookup] - Variant registry: (category, style, variant) => variant object
     * @param {Function} [opts.stopHandler] - Stop animation on element: (el) => void
     * @param {Object} [opts.fxContextManager] - FX context manager: { set(ctx), clear() }
     */
    configure: function (opts) {
      if (opts.resolveElement) _config.resolveElement = opts.resolveElement;
      if (opts.root) _config.root = opts.root;
      if (opts.debug !== undefined) _config.debug = opts.debug;
      if (opts.onRefresh) {
        _config.onRefresh = opts.onRefresh;
        _refreshCoordinator.configure(opts.onRefresh);
      }
      if (opts.variantLookup) this._variantLookup = opts.variantLookup;
      if (opts.stopHandler) this._stopHandler = opts.stopHandler;
      if (opts.fxContextManager) this._fxContextManager = opts.fxContextManager;
      if (opts.helpers) _helpers = opts.helpers;
    },

    // ── Events ───────────────────────────────────────────────

    /**
     * Subscribe to an engine lifecycle event.
     * Events: 'animationStart', 'animationEnd', 'reconcile'.
     * @param {string} event
     * @param {Function} fn
     */
    on: function (event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
    },

    /**
     * Unsubscribe from an engine lifecycle event.
     * @param {string} event
     * @param {Function} fn
     */
    off: function (event, fn) {
      const fns = _listeners[event];
      if (!fns) return;
      const idx = fns.indexOf(fn);
      if (idx !== -1) fns.splice(idx, 1);
    },

    // ── Determinism Primitives ───────────────────────────────
    //
    // In live mode (default), these pass through to `performance.now()`,
    // `requestAnimationFrame`, and `Math.random()`. Zero overhead.
    //
    // In render mode, they route through an engine-owned virtual clock,
    // a drainable frame scheduler, and a seeded per-namespace PRNG pool —
    // giving frame-exact, bit-identical output across renders when given
    // the same seed and tick sequence.
    //
    // Enter render mode with `engine.setRenderMode(true, { seed: 42 })`,
    // then drive frames with `engine.tick(dtMs)` in a loop.

    /** Current time in ms. `performance.now()` in live mode, virtual in render mode. */
    now: function () { return _clock.now(); },

    /**
     * Schedule a callback for the next frame. Returns a token for `cancelRaf`.
     * Live mode: wraps `requestAnimationFrame`.
     * Render mode: enqueues; fires on the next `tick()`.
     *
     * Callbacks scheduled *during* a tick fire on the **next** tick, never
     * the current one — prevents infinite rAF chains from stalling the
     * render loop.
     */
    raf: function (cb) { return _scheduler.schedule(cb); },

    /** Cancel a callback scheduled via `raf()`. Idempotent for unknown tokens. */
    cancelRaf: function (token) { _scheduler.cancel(token); },

    /**
     * Draw the next float in `[0, 1)`.
     * Live mode: `Math.random()` — namespace is ignored.
     * Render mode: per-namespace mulberry32 keyed by `hash(ns) ^ seed`, so
     * two animation instances get independent, reproducible sequences.
     *
     * @param {string} [namespace='__global__']
     */
    rand: function (namespace) { return _rng.rand(namespace); },

    /**
     * Advance the virtual clock by `dtMs` and fire every pending `raf()`
     * callback. No-op in live mode.
     *
     * @param {number} dtMs — milliseconds, e.g. 16.6667 for 60fps.
     * @returns {Promise<void>} resolves after a microtask, letting layout settle.
     */
    tick: function (dtMs) { return _scheduler.tick(dtMs); },

    /**
     * Switch between live and render mode.
     *
     * Render mode:
     *   - Clock starts at 0, advances only via `tick()`.
     *   - Scheduler queues callbacks; drained only via `tick()`.
     *   - RNG re-seeds all per-namespace generators from `opts.seed`.
     *   - Background GC interval is suspended.
     *
     * @param {boolean} on
     * @param {{ seed?: number }} [opts]
     */
    setRenderMode: function (on, opts) {
      opts = opts || {};
      const targetMode = on ? 'render' : 'live';
      if (on && typeof opts.seed === 'number') {
        _rng.setSeed(opts.seed);
      }
      _clock.setMode(targetMode);
      _rng.setMode(targetMode);
      _scheduler.setMode(targetMode);
      // Suspend the background GC interval during render — renders are
      // short-lived and GC just pollutes the frame trace.
      if (on && this._gcInterval) {
        clearInterval(this._gcInterval);
        this._gcInterval = null;
      }
    },

    /** True if the engine is currently in render mode. */
    isRenderMode: function () { return _clock.getMode() === 'render'; },

    /**
     * Initialize the engine. Call after configuration and plugin registration.
     * Idempotent -- safe to call multiple times.
     */
    init: function () {
      if (this._initialized) return;
      if (!_config.root) return;
      this._initialized = true;

      // Start DOM observation
      _domObserver.init(_config.root, function () {
        _reconciler.reconcile();
      }, {
        cleanupHandler: this._stopHandler || null,
      });

      // Start GC interval (60s) + visibilitychange
      const self = this;
      this._gcInterval = setInterval(function () {
        _store.gc(_config.resolveElement);
      }, 60000);

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') {
            _store.invalidateCache();
            _reconciler.reconcile();
          }
        });
      }
    },

    /**
     * Destroy the engine: disconnect observers, clear intervals.
     */
    destroy: function () {
      _domObserver.destroy();
      if (this._gcInterval) {
        clearInterval(this._gcInterval);
        this._gcInterval = null;
      }
      this._initialized = false;
    },

    // ── Persistent Animations ────────────────────────────────

    /**
     * Set persistent animation state for a key.
     * The reconciler will find the element and start the animation.
     *
     * @param {string} category - Animation category (e.g., 'persist')
     * @param {string} key - Opaque key (e.g., item ID)
     * @param {import('./types.js').PersistentAnimationParams} [params]
     */
    set: function (category, key, params) {
      if (_config.debug) {
        if (typeof key !== 'string') _warn('set() expects a string key, got ' + typeof key + '. Did you mean play()?');
        if (!_categories[category] && !_store._persistent.has(key)) _warn('Category "' + category + '" is not registered. Call register() or registerCategory() first.');
      }
      params = params || {};

      const state = {
        style: params.style,
        variant: params.variant,
        params: params,
        groupId: params.groupId || '',
      };

      _store.set(category, key, state);

      // Trigger immediate reconciliation for this key
      const catDescriptor = _categories[category];
      const resolver = (catDescriptor && catDescriptor.resolve) || _config.resolveElement;
      const el = _store.resolveElement(key, resolver);
      if (el && el.isConnected) {
        const entry = _store.getPersistent(key);
        if (entry) {
          _reconciler._startElement(key, el, entry);
        }
      }
      _emit('animationStart', { type: 'persistent', category: category, key: key, element: el });
    },

    /**
     * Clear persistent animation state. Pass a key to clear one animation,
     * or omit it to clear all active animations in the category.
     *
     * @param {string} category
     * @param {string} [key]
     */
    clear: function (category, key) {
      if (!key) {
        var keys = this.getActiveKeys(category);
        var self = this;
        keys.forEach(function (k) { self.clear(category, k); });
        return;
      }
      _store.clear(category, key);

      const catDescriptor = _categories[category];
      const resolver = (catDescriptor && catDescriptor.resolve) || _config.resolveElement;
      const el = _store.resolveElement(key, resolver);
      if (el) {
        if (el[ANIM_KEY]) {
          // Full stop: category stop + global handler + handle cleanup
          _reconciler._stopElement(el);
        } else if (catDescriptor && catDescriptor.stop) {
          // No animation handle (play didn't set one), but still
          // call category stop to undo visual effects
          catDescriptor.stop(el);
        }
      }
      _emit('animationEnd', { type: 'persistent', category: category, key: key, element: el });
    },

    /**
     * Clear everything — all persistent animations, all transient state,
     * and reset the dotgrid fluid simulation (if set via engine.setDotgrid()).
     */
    clearAll: function () {
      var self = this;
      // Stop all persistent animations
      this.getCategoryNames().forEach(function (cat) {
        self.clear(cat);
      });
      // Stop all in-flight transient animations
      _store._transient.forEach(function (entry) {
        if (entry.element && entry.element[ANIM_KEY]) {
          _reconciler._stopElement(entry.element);
        }
      });
      _store._transient.clear();
      if (_dotgrid && _dotgrid.reset) _dotgrid.reset();
    },

    /**
     * Set the dotgrid instance for clearAll() integration.
     * @param {Object} grid - A dotgrid instance with a reset() method.
     */
    setDotgrid: function (grid) {
      _dotgrid = grid;
    },

    /**
     * Dispatch a named dotgrid effect through the engine's dotgrid instance.
     * This is the IIFE-safe way for animation plugins to trigger dotgrid effects —
     * the engine holds the real dotgrid reference, avoiding the bundled-FX problem.
     *
     * @param {string} name - Effect name (e.g., 'heart', 'ripple')
     * @param {Object} args - Arguments object (e.g., { cx, cy, opts })
     * @returns {boolean} true if the effect was dispatched
     */
    dotgridEffect: function (name, args) {
      if (_dotgrid && typeof _dotgrid.runEffect === 'function') {
        return _dotgrid.runEffect(name, args);
      }
      return false;
    },

    /**
     * Check if a key has active persistent animation.
     * @param {string} category
     * @param {string} key
     * @returns {boolean}
     */
    isActive: function (category, key) {
      return _store.isActive(category, key);
    },

    /**
     * Get all active keys for a category.
     * @param {string} category
     * @returns {Set<string>}
     */
    getActiveKeys: function (category) {
      return _store.getActiveKeys(category);
    },

    // ── One-Shot Animations ──────────────────────────────────

    /**
     * Play a one-shot animation on an element.
     *
     * @param {string} category - Any registered category
     * @param {HTMLElement} el - The element to animate
     * @param {import('./types.js').PlayOptions} [opts]
     */
    play: function (category, el, opts) {
      if (_config.debug) {
        if (!el || typeof el.nodeType === 'undefined') _warn('play() expects a DOM element, got ' + typeof el + '. Did you mean set()?');
        else if (!el.isConnected) _warn('play() called on a detached element. Animation will not be visible.');
        if (!_categories[category]) _warn('Category "' + category + '" is not registered. Call register() or registerCategory() first.');
      }
      opts = opts || {};
      const key = el && el.dataset ? (el.dataset.animId || el.id || '') : '';
      const groupId = el && el.dataset ? (el.dataset.group || '') : '';

      // Register transient state
      if (key) {
        _store.setTransient(category, key, {
          groupId: groupId,
          element: el,
          onDone: opts.onDone,
        });
      }

      _emit('animationStart', { type: 'transient', category: category, key: key, element: el });

      const wrappedDone = function () {
        if (key) _store.clearTransient(key);
        if (groupId) _refreshCoordinator.flushDeferred(groupId);
        _emit('animationEnd', { type: 'transient', category: category, key: key, element: el });
        if (opts.onDone) opts.onDone();
      };

      // Use the category registry if available
      const catDescriptor = _categories[category];
      if (catDescriptor && catDescriptor.play) {
        catDescriptor.play(el, {
          onDone: wrappedDone,
          styleOverride: opts.styleOverride || null,
          params: opts.params || {},
          key: key,
          groupId: groupId,
          reducedMotion: _isReducedMotion(),
        });
        return;
      }
    },

    /**
     * Transition from persistent to one-shot animation.
     *
     * @param {string} key - Element key
     * @param {string} toCategory - Target category
     * @param {import('./types.js').PlayOptions} [opts]
     */
    transition: function (key, toCategory, opts) {
      opts = opts || {};
      const el = _store.resolveElement(key, _config.resolveElement);
      if (!el) return;

      // Clear any persistent state for this key
      const entry = _store.getPersistent(key);
      if (entry) {
        _store.clear(entry.category, key);
      }

      if (el[ANIM_KEY]) {
        _reconciler._stopElement(el);
      }
      this.play(toCategory, el, opts);
    },

    // ── Queries ──────────────────────────────────────────────

    /**
     * Check if any transient animation is active for a group.
     * @param {string} [groupId]
     * @returns {boolean}
     */
    isAnimating: function (groupId) {
      if (groupId) return _store.isGroupAnimating(groupId);
      return _store.hasAnyTransient();
    },

    // ── Reconciliation ───────────────────────────────────────

    /**
     * Trigger manual reconciliation.
     */
    reconcile: function () {
      _store.invalidateCache();
      _reconciler.reconcile();
      _emit('reconcile', { persistentCount: _store._persistent.size, transientCount: _store._transient.size });
    },

    // ── Layout Animation ─────────────────────────────────────

    /**
     * Perform an animated refresh: capture height, lock, swap, reconcile, animate.
     *
     * @param {string} groupId
     * @param {Function} swapFn - (groupId) => void|Promise
     */
    animatedRefresh: function (groupId, swapFn) {
      if (!groupId || !swapFn) return;

      const snapshot = _layoutAnimator.captureAndLock(groupId);
      const result = swapFn(groupId);

      const self = this;
      const afterSwap = function () {
        _scheduler.schedule(function () {
          _store.invalidateCache();
          _reconciler.reconcile();
          if (snapshot) {
            _layoutAnimator.animateToNewHeight(groupId, snapshot);
          }
        });
      };

      if (result && typeof result.then === 'function') {
        result.then(afterSwap);
      } else {
        _scheduler.schedule(afterSwap);
      }
    },

    /**
     * Capture container height before an external swap.
     * @param {string} groupId
     * @returns {Object|null}
     */
    captureLayout: function (groupId) {
      return _layoutAnimator.capture(groupId);
    },

    /**
     * Animate container height after an external swap.
     * @param {string} groupId
     * @param {Object} snapshot - From captureLayout()
     */
    animateAfterSwap: function (groupId, snapshot) {
      if (!snapshot) return;
      _store.invalidateCache();
      _reconciler.reconcile();
      _layoutAnimator.animateToNewHeight(groupId, snapshot);
    },

    // ── Settings ─────────────────────────────────────────────

    /**
     * Re-read settings and restart all persistent animations.
     */
    refreshSettings: function () {
      // Bump version on all persistent entries to force restart
      _store._persistent.forEach(function (state) {
        _store._version++;
        state.version = _store._version;
      });

      // Stop all current animations and reconcile
      const resolver = _config.resolveElement;
      _store._persistent.forEach(function (state, key) {
        const el = _store.resolveElement(key, resolver);
        if (el) {
          _reconciler._stopElement(el);
        }
      });

      _store.invalidateCache();
      _reconciler.reconcile();
    },

    // ── Refresh Coordination ─────────────────────────────────

    /**
     * Schedule a debounced refresh for a group.
     * @param {string} groupId
     */
    scheduleRefresh: function (groupId) {
      _refreshCoordinator.schedule(groupId);
    },

    /**
     * Schedule an immediate refresh for a group.
     * @param {string} groupId
     */
    scheduleImmediateRefresh: function (groupId) {
      _refreshCoordinator.scheduleImmediate(groupId);
    },

    /**
     * Begin a transaction: defer all refreshes until commit.
     */
    beginTransaction: function () {
      _refreshCoordinator.beginTransaction();
    },

    /**
     * Commit a transaction: flush all queued refreshes.
     */
    commitTransaction: function () {
      _refreshCoordinator.commitTransaction();
    },

    // ── Category Registration ────────────────────────────────

    /**
     * Register an animation category with the engine.
     *
     * @param {string} name - Category name
     * @param {import('./types.js').CategoryDescriptor} descriptor
     */
    registerCategory: function (name, descriptor) {
      if (!name || !descriptor) return;
      _categories[name] = descriptor;
    },

    /**
     * Get a registered category descriptor.
     * @param {string} name
     * @returns {import('./types.js').CategoryDescriptor|null}
     */
    getCategory: function (name) {
      return _categories[name] || null;
    },

    /**
     * Get all registered category names.
     * @returns {string[]}
     */
    getCategoryNames: function () {
      return Object.keys(_categories);
    },

    /**
     * List registered styles for a category.
     * @param {string} category
     * @returns {string[]}
     */
    getStyles: function (category) {
      var reg = this._variantRegistry;
      return reg && reg[category] ? Object.keys(reg[category]) : [];
    },

    /**
     * List registered variant names for a category and style.
     * @param {string} category
     * @param {string} style
     * @returns {string[]}
     */
    getVariants: function (category, style) {
      var reg = this._variantRegistry;
      var s = reg && reg[category] && reg[category][style];
      return s ? Object.keys(s) : [];
    },

    /**
     * Get tunable parameter descriptors for a specific variant.
     * @param {string} category
     * @param {string} style
     * @param {string} variant
     * @returns {Object}
     */
    getParams: function (category, style, variant) {
      var reg = this._variantRegistry;
      var s = reg && reg[category] && reg[category][style];
      var v = s && s[variant];
      return v ? (v.params || {}) : {};
    },

    // ── Plugin System ────────────────────────────────────────

    /**
     * Install a plugin. Supports two formats:
     *
     * 1. Legacy: plugin with install(engine) method
     * 2. Declarative: plugin with name, categories, and/or fx
     *
     * @param {import('./types.js').AnimationPlugin} plugin
     * @param {Object} [config] - Plugin-specific config
     */
    use: function (plugin, config) {
      if (!plugin) return;

      _plugins.push(plugin);

      // Legacy format
      if (typeof plugin.install === 'function') {
        plugin.install(this, config);
        return;
      }

      // Declarative format
      if (plugin.categories) {
        for (let catName in plugin.categories) {
          if (plugin.categories.hasOwnProperty(catName)) {
            this.registerCategory(catName, plugin.categories[catName]);
          }
        }
      }

      if (plugin.fx) {
        for (let fxName in plugin.fx) {
          if (plugin.fx.hasOwnProperty(fxName)) {
            this.registerFX(fxName, plugin.fx[fxName]);
          }
        }
      }
    },

    /**
     * Register animation variants under a category and style.
     *
     * Stores variants in the internal registry and auto-creates a category
     * dispatcher if one doesn't exist yet. The dispatcher reads the registry
     * dynamically, so multiple register() calls for the same category
     * (e.g. thud + cute both under 'action') work without merge logic.
     *
     * @param {string} category - e.g. 'action', 'enter', 'persist'
     * @param {string} style - e.g. 'thud', 'cute', 'destroy', 'dramatic'
     * @param {Object} variants - Map of variant name to plugin object with play() and cleanup()
     */
    register: function (category, style, variants) {
      if (!this._variantRegistry) this._variantRegistry = {};
      if (!this._variantRegistry[category]) this._variantRegistry[category] = {};
      this._variantRegistry[category][style] = variants;

      // Auto-create a category dispatcher if one doesn't exist yet.
      // The dispatcher looks up variants from _variantRegistry at call time,
      // so styles added by later register() calls are picked up automatically.
      if (!_categories[category]) {
        var self = this;
        _categories[category] = {
          play: function (el, ctx) {
            var s = (ctx.params && ctx.params.style) || ctx.style || '';
            var v = (ctx.params && ctx.params.variant) || ctx.variant || '';
            var reg = self._variantRegistry;
            var styleMap = reg && reg[category] && reg[category][s];
            var variantObj = styleMap && styleMap[v];
            if (!variantObj || typeof variantObj.play !== 'function') {
              if (_config.debug) {
                _warn('No variant "' + v + '" in ' + category + '/' + s +
                  '. Available styles: ' + (reg && reg[category] ? Object.keys(reg[category]).join(', ') : 'none'));
              }
              if (ctx.onDone) ctx.onDone();
              return;
            }
            // Stop any existing animation on this element before starting
            if (el[ANIM_KEY] && _categories[category] && typeof _categories[category].stop === 'function') {
              _categories[category].stop(el);
            }
            // Inject helpers so plugins can access FX utilities
            if (_helpers) ctx.helpers = _helpers;
            ctx.dotgridEffect = function (name, args) {
              if (_dotgrid && typeof _dotgrid.runEffect === 'function') {
                _dotgrid.runEffect(name, args);
              }
            };
            // Determinism primitives. Plugins that migrate in P1 will use
            // ctx.now / ctx.raf / ctx.rand instead of the raw browser APIs.
            // Each animation instance gets its own RNG namespace derived from
            // (category, style, variant, key) so particle sequences are stable
            // across render reruns even when multiple animations interleave.
            ctx.now = _clock.now;
            ctx.raf = _scheduler.schedule;
            ctx.cancelRaf = _scheduler.cancel;
            var _animRngNs = category + '/' + s + '/' + v + '/' + (ctx.key || '__');
            ctx.rand = function () { return _rng.rand(_animRngNs); };
            variantObj.play(el, ctx);
            el[ANIM_KEY] = {
              _fxCategory: category,
              _fxStyle: s,
              _fxVariant: v,
            };
          },
          stop: function (el) {
            var handle = el[ANIM_KEY];
            if (!handle) return;
            var reg = self._variantRegistry;
            var styleMap = reg && reg[category] && reg[category][handle._fxStyle];
            var variantObj = styleMap && styleMap[handle._fxVariant];
            if (variantObj && typeof variantObj.cleanup === 'function') {
              variantObj.cleanup(el);
            }
          },
        };
      }
    },

    /**
     * Register an FX layer.
     * @param {string} name
     * @param {import('./types.js').FXLayer} layer
     */
    registerFX: function (name, layer) {
      _fxLayers[name] = layer;
    },

    /**
     * Get a registered FX layer.
     * @param {string} name
     * @returns {import('./types.js').FXLayer|null}
     */
    getFX: function (name) {
      return _fxLayers[name] || null;
    },

    // ── Element Resolution ────────────────────────────────────

    /**
     * Resolve a key to a DOM element using the configured resolver.
     *
     * @param {string} key - Opaque key string.
     * @returns {HTMLElement|null} The resolved element, or null.
     */
    resolveElement: function (key) {
      return _config.resolveElement(key);
    },

    // ── Internals (exposed for advanced use / testing) ───────

    /** @internal */
    _state: _store,
    /** @internal */
    _observer: _domObserver,
    /** @internal */
    _reconciler: _reconciler,
    /** @internal */
    _refresh: _refreshCoordinator,
    /** @internal */
    _layout: _layoutAnimator,
    /** @internal */
    _config: _config,
    /** @internal */
    _categories: _categories,
    /** @internal */
    _withScopedContext: _withScopedContext,
  };

  return engine;
}
