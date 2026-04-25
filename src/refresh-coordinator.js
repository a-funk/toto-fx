/**
 * @module refresh-coordinator
 * @description Manages refresh coalescing and animation-aware deferral.
 *
 * The RefreshCoordinator debounces refresh requests, defers them while
 * animations are in flight, and supports transactions (group multiple
 * state changes, defer all refreshes until commit).
 *
 * The refresh callback is provided by the consuming application (e.g.,
 * the consuming app wires it to its DOM swap/morph logic). The coordinator only manages
 * WHEN the refresh fires, not WHAT it does.
 *
 * NOTE: The setTimeout-based debounce is intentionally left on the
 * browser timer — it is not a per-frame operation, and P0's scheduler
 * is rAF-only. Render mode does not use debounced refreshes, so no
 * behavioral conflict. Migration to a virtual-time debounce is P2+.
 */

// ── Determinism primitives ──────────────────────────────────────
let _raf = (cb) => globalThis['requestAnimationFrame'](cb);

/** @param {{ raf?: (cb: Function) => any }} primitives */
export function configurePrimitives(primitives) {
  if (primitives && primitives.raf) _raf = primitives.raf;
}

/**
 * Create a RefreshCoordinator bound to a LayoutAnimator and Reconciler.
 *
 * @param {Object} store - StateStore instance
 * @param {Object} deps - Dependencies
 * @param {Object} deps.layoutAnimator - LayoutAnimator instance for height animation
 * @param {Object} deps.reconciler - Reconciler instance for post-swap reconciliation
 * @returns {Object} RefreshCoordinator instance
 */
export function createRefreshCoordinator(store, deps) {
  const RefreshCoordinator = {
    /** @type {Map<string, number>} groupId -> setTimeout handle */
    _pending: new Map(),
    /** @type {number} Debounce window in ms */
    _DEBOUNCE_MS: (deps && deps.debounceMs) || 100,
    /** @type {Map<string, Function>} groupId -> deferred refresh callback */
    _deferred: new Map(),
    /** @type {Function|null} The refresh callback (provided by consuming app) */
    _onRefresh: null,
    /** @type {boolean} Whether we're in a transaction */
    _inTransaction: false,
    /** @type {Array} Queued operations during transaction */
    _txQueue: [],

    /**
     * Configure the refresh callback.
     * @param {Function} fn - Called with (groupId) to trigger a refresh
     */
    configure: function (fn) {
      this._onRefresh = fn;
    },

    /**
     * Schedule a debounced refresh for a group.
     * Defers if a transient animation is in flight for this group.
     * @param {string} groupId
     */
    schedule: function (groupId) {
      if (this._inTransaction) {
        this._txQueue.push({ type: 'schedule', groupId: groupId });
        return;
      }

      if (this._pending.has(groupId)) {
        clearTimeout(this._pending.get(groupId));
      }

      const self = this;
      const timeoutId = setTimeout(function () {
        self._pending.delete(groupId);

        // Defer if transient animation is in flight
        if (store.isGroupAnimating(groupId)) {
          self._deferred.set(groupId, function () {
            self.scheduleImmediate(groupId);
          });
          return;
        }

        self._doRefresh(groupId);
      }, this._DEBOUNCE_MS);

      this._pending.set(groupId, timeoutId);
    },

    /**
     * Immediate refresh, bypassing debounce.
     * @param {string} groupId
     */
    scheduleImmediate: function (groupId) {
      if (this._pending.has(groupId)) {
        clearTimeout(this._pending.get(groupId));
        this._pending.delete(groupId);
      }
      this._doRefresh(groupId);
    },

    /**
     * Cancel pending refresh for a group.
     * @param {string} groupId
     */
    cancel: function (groupId) {
      if (this._pending.has(groupId)) {
        clearTimeout(this._pending.get(groupId));
        this._pending.delete(groupId);
      }
    },

    /**
     * Execute a deferred refresh (called when animation completes).
     * @param {string} groupId
     */
    flushDeferred: function (groupId) {
      const fn = this._deferred.get(groupId);
      if (fn) {
        this._deferred.delete(groupId);
        fn();
      }
    },

    /**
     * Begin a transaction: defer all refreshes until commit.
     */
    beginTransaction: function () {
      this._inTransaction = true;
      this._txQueue = [];
    },

    /**
     * Commit a transaction: flush all queued refreshes.
     */
    commitTransaction: function () {
      this._inTransaction = false;
      const queue = this._txQueue.splice(0);
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].type === 'schedule') {
          this.schedule(queue[i].groupId);
        }
      }
    },

    /**
     * Execute the refresh callback with layout animation.
     * @param {string} groupId
     * @private
     */
    _doRefresh: function (groupId) {
      if (!this._onRefresh) return;

      const layoutAnimator = deps.layoutAnimator;
      const reconciler = deps.reconciler;

      // Capture + lock container height before the morph swap
      const snapshot = layoutAnimator ? layoutAnimator.captureAndLock(groupId) : null;

      // Execute the actual swap
      const result = this._onRefresh(groupId);

      // After swap: reconcile + animate height
      const afterSwap = function () {
        store.invalidateCache();
        if (reconciler) reconciler.reconcile();

        if (snapshot && layoutAnimator) {
          layoutAnimator.animateToNewHeight(groupId, snapshot);
        }
      };

      if (result && typeof result.then === 'function') {
        result.then(afterSwap);
      } else {
        _raf(afterSwap);
      }
    },
  };

  return RefreshCoordinator;
}
