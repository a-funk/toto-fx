/**
 * @module dom-observer
 * @description Unified MutationObserver for animation cleanup and reconciliation.
 *
 * On DOM mutation:
 *   1. Cleanup removed nodes (stop animations, clear handles)
 *   2. Schedule reconciliation via rAF (coalesced: one per frame)
 *
 * The observer filters out irrelevant mutations (animation infrastructure:
 * canvases, promoted card wrappers, particle overlays) to avoid
 * unnecessary reconciliation during animation playback.
 */

import { ANIM_KEY } from './reconciler.js';

// ── Determinism primitives ──────────────────────────────────────
// Bracket-access avoids literal "requestAnimationFrame(" / "cancelAnimationFrame("
// substrings in the defaults so future replace_all migrations of those
// patterns can't self-recurse.
let _raf = (cb) => globalThis['requestAnimationFrame'](cb);
let _cancelRaf = (token) => globalThis['cancelAnimationFrame'](token);

/** @param {{ raf?: (cb: Function) => any, cancelRaf?: (token: any) => void }} primitives */
export function configurePrimitives(primitives) {
  if (!primitives) return;
  if (primitives.raf) _raf = primitives.raf;
  if (primitives.cancelRaf) _cancelRaf = primitives.cancelRaf;
}

/**
 * Create an isolated DOMObserver instance.
 * Each engine gets its own observer -- no cross-engine interference.
 * @param {Object} [store] - StateStore instance for persistent-size check optimization
 * @returns {Object} DOMObserver instance
 */
export function createDOMObserver(store) {
  return _createObserver(store);
}

function _createObserver(store) {
  return {
  /** @type {MutationObserver|null} */
  _observer: null,
  /** @type {number|null} */
  _pendingRAF: null,
  /** @type {Function|null} */
  _reconcileFn: null,
  /** @type {boolean} */
  _initialized: false,
  /** @type {Function|null} Callback to stop an animation on a removed element */
  _cleanupHandler: null,

  /**
   * Initialize the observer on a root element.
   * @param {HTMLElement} root - Root element to observe
   * @param {Function} reconcileFn - Called on rAF after mutations
   * @param {Object} [opts] - Options
   * @param {Function} [opts.cleanupHandler] - Called to stop animation on a removed element.
   *   Signature: (element: HTMLElement) => void
   */
  init: function (root, reconcileFn, opts) {
    if (this._initialized) return;
    this._initialized = true;
    this._reconcileFn = reconcileFn;
    this._cleanupHandler = (opts && opts.cleanupHandler) || null;
    const self = this;

    this._observer = new MutationObserver(function (mutations) {
      // Skip if no persistent state -- nothing to reconcile
      if (store._persistent.size === 0) return;

      // Check if any mutation involves structural changes in RELEVANT containers
      // or attribute changes on tracked elements. Ignore mutations inside animation
      // infrastructure (canvases, promoted card wrappers, particle overlays) --
      // these fire hundreds of times per second during completion animations and
      // are not relevant to state reconciliation.
      let hasRelevant = false;
      for (let i = 0; i < mutations.length; i++) {
        // Attribute mutations on tracked elements trigger reconciliation.
        // This catches morph engines that patch in-place (e.g., idiomorph)
        // rather than replacing nodes entirely.
        if (mutations[i].type === 'attributes') {
          hasRelevant = true;
          break;
        }
        if (mutations[i].addedNodes.length === 0 && mutations[i].removedNodes.length === 0) continue;
        const target = mutations[i].target;
        // Skip mutations inside animation-stage wrappers (promoted cards)
        if (target.classList && target.classList.contains('animation-stage')) continue;
        // Skip mutations on canvas elements
        if (target.tagName === 'CANVAS') continue;
        // Skip mutations inside animation canvas containers
        if (target.id === 'animation-canvas' || target.id === 'speed-lines-canvas' || target.id === 'impact-flash-overlay') continue;
        // Skip mutations on body-level animation overlays
        if (target === document.body) {
          let dominated = false;
          for (let j = 0; j < mutations[i].addedNodes.length; j++) {
            const n = mutations[i].addedNodes[j];
            if (n.nodeType === 1 && (n.classList.contains('animation-stage') || n.tagName === 'CANVAS' || n.id === 'animation-canvas')) {
              dominated = true;
              break;
            }
          }
          if (dominated) continue;
        }
        hasRelevant = true;
        break;
      }
      if (!hasRelevant) return;

      // Cleanup handles on removed elements (synchronous, before reconciliation)
      for (let i = 0; i < mutations.length; i++) {
        const removed = mutations[i].removedNodes;
        for (let j = 0; j < removed.length; j++) {
          self._cleanupRemovedTree(removed[j]);
        }
      }

      // Coalesce: one rAF per frame
      if (self._pendingRAF) return;
      self._pendingRAF = _raf(function () {
        self._pendingRAF = null;
        // Invalidate element cache since DOM changed
        store.invalidateCache();
        if (self._reconcileFn) self._reconcileFn();
      });
    });

    this._observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-anim-id'],
    });
  },

  /**
   * Cleanup animation handles on a removed DOM tree.
   * @param {Node} node
   * @private
   */
  _cleanupRemovedTree: function (node) {
    if (node.nodeType !== 1) return;

    if (node[ANIM_KEY]) this._cleanupElement(node);

    const desc = node.querySelectorAll ? node.querySelectorAll('*') : [];
    for (let i = 0; i < desc.length; i++) {
      if (desc[i][ANIM_KEY]) this._cleanupElement(desc[i]);
    }
  },

  /**
   * Cleanup an element with an animation handle.
   * @param {HTMLElement} el
   * @private
   */
  _cleanupElement: function (el) {
    if (!el[ANIM_KEY]) return;

    if (this._cleanupHandler) {
      this._cleanupHandler(el);
    }

    delete el[ANIM_KEY];
  },

  /**
   * Disconnect the observer.
   */
  destroy: function () {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._pendingRAF) {
      _cancelRaf(this._pendingRAF);
      this._pendingRAF = null;
    }
    this._initialized = false;
  },
  };
}

/** @deprecated Use createDOMObserver() for isolated instances. Kept for backwards compatibility. */
export const DOMObserver = createDOMObserver();
