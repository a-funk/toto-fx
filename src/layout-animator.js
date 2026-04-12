/**
 * @module layout-animator
 * @description Manages container height animations during item addition/removal.
 *
 * Prevents instant reflow that kills sibling CSS animations (e.g.,
 * in-progress glows dying when a morph engine syncs style attributes
 * during an uncontrolled container shrink).
 *
 * The flow for a refresh (item removal):
 *   1. Capture container's current height
 *   2. Lock height (explicit px) to prevent reflow during morph
 *   3. Execute the morph swap (items morphed/removed inside locked container)
 *   4. Reconcile immediately (re-apply any killed CSS animations)
 *   5. Measure new natural height
 *   6. Animate from old height to new height (300ms ease-out)
 *   7. Release lock (remove explicit height)
 *
 * The containerResolver function is pluggable -- the consuming app provides
 * it to map a groupId to a DOM container element.
 */

/**
 * Create a LayoutAnimator instance.
 *
 * @param {Object} [opts] - Options
 * @param {Function} [opts.containerResolver] - Maps groupId to container element.
 *   Signature: (groupId: string) => HTMLElement|null.
 *   Default: looks up element by id "item-list-{groupId}".
 * @param {number} [opts.duration] - Transition duration in ms (default 300)
 * @param {string} [opts.easing] - CSS easing function (default 'ease-out')
 * @returns {Object} LayoutAnimator instance
 */
export function createLayoutAnimator(opts) {
  opts = opts || {};

  const containerResolver = opts.containerResolver || function (groupId) {
    return document.getElementById(groupId);
  };

  const LayoutAnimator = {
    /** @type {number} Duration of height transition in ms */
    _DURATION_MS: opts.duration || 300,
    /** @type {string} Easing function */
    _EASING: opts.easing || 'ease-out',
    /** @type {Map<string, {animating: boolean, currentHeight: number}>} Per-container state */
    _active: new Map(),
    /** @type {number} Safety timeout to release lock if transitionend never fires */
    _SAFETY_TIMEOUT_MS: (opts.duration || 300) + 200,

    /**
     * Capture the current height of a container before a morph swap.
     * @param {string} groupId
     * @returns {{container: HTMLElement, oldHeight: number}|null}
     */
    capture: function (groupId) {
      const container = containerResolver(groupId);
      if (!container) return null;

      const state = this._active.get(groupId);
      let oldHeight;
      if (state && state.animating) {
        oldHeight = container.getBoundingClientRect().height;
      } else {
        oldHeight = container.getBoundingClientRect().height;
      }

      return { container: container, oldHeight: oldHeight };
    },

    /**
     * Lock a container at its captured height to prevent reflow during morph.
     * @param {{container: HTMLElement, oldHeight: number}} snapshot
     */
    lock: function (snapshot) {
      if (!snapshot || !snapshot.container) return;
      const c = snapshot.container;
      c.style.transition = 'none';
      c.style.height = snapshot.oldHeight + 'px';
      c.style.overflow = 'hidden';
      c.classList.add('fx-height-locked');
    },

    /**
     * After the morph swap and reconciliation, animate from the old height
     * to the new natural height, then release the lock.
     * @param {string} groupId
     * @param {{container: HTMLElement, oldHeight: number}} snapshot
     */
    animateToNewHeight: function (groupId, snapshot) {
      if (!snapshot || !snapshot.container) return;
      const c = snapshot.container;
      const oldHeight = snapshot.oldHeight;

      // Measure new natural height
      c.style.transition = 'none';
      c.style.height = 'auto';
      const newHeight = c.getBoundingClientRect().height;

      // Skip animation if heights are the same (or very close)
      if (Math.abs(oldHeight - newHeight) < 1) {
        this._releaseLock(groupId, c);
        return;
      }

      // Set to old height, then animate to new
      c.style.height = oldHeight + 'px';

      this._active.set(groupId, { animating: true, currentHeight: oldHeight });

      const self = this;

      // Force layout read before setting transition
      void c.offsetHeight;

      c.style.transition = 'height ' + this._DURATION_MS + 'ms ' + this._EASING;
      c.style.height = newHeight + 'px';

      let cleaned = false;
      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        self._releaseLock(groupId, c);
      }

      c.addEventListener('transitionend', function handler(evt) {
        if (evt.propertyName !== 'height' || evt.target !== c) return;
        c.removeEventListener('transitionend', handler);
        cleanup();
      });

      // Safety: release lock even if transitionend doesn't fire
      setTimeout(cleanup, this._SAFETY_TIMEOUT_MS);
    },

    /**
     * Capture and lock in one step.
     * @param {string} groupId
     * @returns {{container: HTMLElement, oldHeight: number}|null}
     */
    captureAndLock: function (groupId) {
      const snapshot = this.capture(groupId);
      if (snapshot) this.lock(snapshot);
      return snapshot;
    },

    /**
     * Release the height lock on a container.
     * @param {string} groupId
     * @param {HTMLElement} container
     * @private
     */
    _releaseLock: function (groupId, container) {
      this._active.delete(groupId);
      container.style.height = '';
      container.style.overflow = '';
      container.style.transition = '';
      container.classList.remove('fx-height-locked');
    },
  };

  return LayoutAnimator;
}
