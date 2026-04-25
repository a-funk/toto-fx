/**
 * @module core/scheduler
 * @description Engine-owned frame scheduler.
 *
 * Live mode: `schedule(cb)` forwards to `requestAnimationFrame`. Cancel via
 * `cancel(token)`. `tick()` is a no-op — the browser's compositor drives
 * frames.
 *
 * Render mode: `schedule(cb)` enqueues the callback. `tick(dtMs)` advances
 * the clock and fires every pending callback with the new `clock.now()`,
 * in FIFO order. Callbacks scheduled *during* a tick fire on the **next**
 * tick, never the current one — this prevents infinite loops in
 * rAF-chained particle systems and keeps frame boundaries crisp.
 *
 * Pair with a clock instance; the scheduler does not own its own time.
 */

const LIVE = 'live';
const RENDER = 'render';

/**
 * Create a scheduler bound to a clock.
 *
 * @param {{ now: () => number, advance: (dt: number) => void, getMode: () => string }} clock
 * @returns {{
 *   schedule: (cb: (t: number) => void) => number,
 *   cancel: (token: number) => void,
 *   tick: (dtMs: number) => Promise<void>,
 *   setMode: (mode: 'live' | 'render') => void,
 *   getMode: () => 'live' | 'render',
 *   _pendingCount: () => number
 * }}
 */
export function createScheduler(clock) {
  let mode = LIVE;
  let nextToken = 1;
  /** Render mode: token → callback (per-frame rAF-style). */
  const pending = new Map();
  /** Live mode: token → rAF handle, so cancel() can unregister. */
  const liveHandles = new Map();

  /**
   * Render mode virtual-time timer wheel:
   *   token → { fireAt: virtualTimeMs, cb }
   * Drained during tick() when clock.now() >= fireAt.
   * setTimeout-semantics (fire once), not interval.
   */
  const timeouts = new Map();
  /** Live mode: setTimeout handles keyed by token. */
  const liveTimeouts = new Map();

  function cancelAllLive() {
    for (const [, handle] of liveHandles) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    }
    liveHandles.clear();
    for (const [, handle] of liveTimeouts) {
      if (typeof clearTimeout === 'function') clearTimeout(handle);
    }
    liveTimeouts.clear();
  }

  return {
    /**
     * Schedule `cb` to fire on the next frame.
     * Live mode: wraps `requestAnimationFrame`.
     * Render mode: enqueues; fires on next `tick()`.
     *
     * Returns a token usable with `cancel()`.
     */
    schedule(cb) {
      if (typeof cb !== 'function') {
        throw new TypeError('scheduler.schedule: cb must be a function');
      }
      const token = nextToken++;
      if (mode === LIVE) {
        const handle = requestAnimationFrame(function (t) {
          liveHandles.delete(token);
          cb(t);
        });
        liveHandles.set(token, handle);
      } else {
        pending.set(token, cb);
      }
      return token;
    },

    /** Cancel a scheduled callback. Idempotent for unknown tokens. */
    cancel(token) {
      if (mode === LIVE) {
        const handle = liveHandles.get(token);
        if (handle !== undefined) {
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
          liveHandles.delete(token);
        }
      } else {
        pending.delete(token);
      }
    },

    /**
     * Schedule `cb` to fire after `delayMs`. setTimeout-semantics — fires once.
     * Live mode: wraps `setTimeout`.
     * Render mode: queues with `fireAt = clock.now() + delayMs`; fires during
     * `tick()` as virtual time advances past fireAt.
     *
     * Returns a token usable with `clearTimeout()`.
     */
    setTimeout(cb, delayMs) {
      if (typeof cb !== 'function') {
        throw new TypeError('scheduler.setTimeout: cb must be a function');
      }
      const token = nextToken++;
      if (mode === LIVE) {
        const handle = globalThis['setTimeout'](function () {
          liveTimeouts.delete(token);
          cb();
        }, delayMs);
        liveTimeouts.set(token, handle);
      } else {
        timeouts.set(token, { fireAt: clock.now() + Math.max(0, delayMs), cb });
      }
      return token;
    },

    /** Cancel a setTimeout. Idempotent. */
    clearTimeout(token) {
      if (mode === LIVE) {
        const handle = liveTimeouts.get(token);
        if (handle !== undefined) {
          globalThis['clearTimeout'](handle);
          liveTimeouts.delete(token);
        }
      } else {
        timeouts.delete(token);
      }
    },

    /**
     * Advance the clock by `dtMs` and fire every pending callback with
     * the new `clock.now()`. No-op in live mode.
     *
     * Callbacks scheduled DURING a tick fire on the NEXT tick.
     *
     * Returns a promise that resolves after a microtask, giving any
     * DOM mutations in callbacks a chance to settle before the caller
     * (typically a render harness) captures a screenshot.
     */
    async tick(dtMs) {
      if (mode !== RENDER) return;
      clock.advance(dtMs);
      const t = clock.now();

      // Drain due setTimeouts first — they represent "should have happened
      // by now" events, conceptually earlier than this frame's rAF work.
      // Snapshot + delete fired entries BEFORE invoking so reentrant
      // setTimeout inside a cb goes to fresh queue, not current drain.
      const dueTimeouts = [];
      for (const [token, entry] of timeouts) {
        if (entry.fireAt <= t) dueTimeouts.push([token, entry.cb]);
      }
      for (const [token] of dueTimeouts) timeouts.delete(token);
      for (const [, cb] of dueTimeouts) {
        try { cb(); } catch (e) {
          if (typeof console !== 'undefined') {
            console.error('[scheduler] setTimeout callback threw:', e);
          }
        }
      }

      // Snapshot + clear pending rAF callbacks BEFORE firing so reentrant
      // schedule() goes to fresh pending, not the current drain.
      const due = Array.from(pending.values());
      pending.clear();
      for (const cb of due) {
        try {
          cb(t);
        } catch (e) {
          if (typeof console !== 'undefined') {
            console.error('[scheduler] scheduled callback threw:', e);
          }
        }
      }
      // Let microtasks + synchronous layout settle before resolving.
      await Promise.resolve();
    },

    setMode(newMode) {
      if (newMode !== LIVE && newMode !== RENDER) {
        throw new TypeError(`scheduler.setMode: invalid mode "${newMode}" (expected "live" or "render")`);
      }
      // Cancel everything pending in current mode before switching.
      if (mode === LIVE) cancelAllLive();
      else { pending.clear(); timeouts.clear(); }
      mode = newMode;
    },

    getMode() { return mode; },

    /** @internal — test hook. */
    _pendingCount() { return pending.size; },
  };
}
