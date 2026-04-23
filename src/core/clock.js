/**
 * @module core/clock
 * @description Engine-owned virtual clock.
 *
 * Live mode: `now()` forwards to `performance.now()` — zero overhead,
 * identical to raw browser timing.
 *
 * Render mode: `now()` returns an internal `virtualTime` (ms) that is
 * advanced only by explicit `advance(dtMs)` calls. This is the foundation
 * for frame-exact deterministic rendering — pair with a scheduler that
 * drains its rAF queue on `tick`, and two renders with the same inputs
 * produce bit-identical outputs.
 *
 * The clock knows nothing about the scheduler or RNG. The engine composes
 * all three; this module has a single responsibility.
 */

const LIVE = 'live';
const RENDER = 'render';

/**
 * Create a new clock instance.
 *
 * @returns {{
 *   now: () => number,
 *   advance: (dtMs: number) => void,
 *   reset: () => void,
 *   setMode: (mode: 'live' | 'render') => void,
 *   getMode: () => 'live' | 'render'
 * }}
 */
export function createClock() {
  let mode = LIVE;
  let virtualTime = 0;

  return {
    /** Current time in ms. `performance.now()` in live mode, virtual in render mode. */
    now() {
      return mode === LIVE ? performance.now() : virtualTime;
    },

    /**
     * Advance the virtual clock by `dtMs` milliseconds.
     * No-op in live mode (the real clock advances itself).
     * Negative `dtMs` is rejected — time travel is not supported.
     */
    advance(dtMs) {
      if (mode !== RENDER) return;
      if (typeof dtMs !== 'number' || dtMs < 0 || !Number.isFinite(dtMs)) {
        throw new RangeError('clock.advance: dtMs must be a finite non-negative number');
      }
      virtualTime += dtMs;
    },

    /** Reset the virtual clock to 0. Does not change mode. */
    reset() {
      virtualTime = 0;
    },

    /**
     * Switch modes. Render mode resets virtualTime to 0 so each render
     * run starts from a known origin.
     */
    setMode(newMode) {
      if (newMode !== LIVE && newMode !== RENDER) {
        throw new TypeError(`clock.setMode: invalid mode "${newMode}" (expected "live" or "render")`);
      }
      mode = newMode;
      if (newMode === RENDER) virtualTime = 0;
    },

    getMode() { return mode; },
  };
}
