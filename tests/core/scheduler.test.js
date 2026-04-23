/**
 * Tests for core/scheduler.js — engine-owned frame scheduler.
 *
 * Two invariants worth their weight in gold:
 *   1. Render mode fires callbacks with the advanced clock time.
 *   2. Callbacks scheduled during a tick go to the NEXT tick, not the current one.
 *      (Prevents infinite rAF chains from locking up the render loop.)
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// Polyfill rAF + perf for Node test env.
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

import { createClock } from '../../src/core/clock.js';
import { createScheduler } from '../../src/core/scheduler.js';


describe('createScheduler', function () {
  describe('live mode (default)', function () {
    it('reports mode "live" on creation', function () {
      const clock = createClock();
      const sched = createScheduler(clock);
      assert.equal(sched.getMode(), 'live');
    });

    it('schedule(cb) fires cb within 100ms', function (_, done) {
      const clock = createClock();
      const sched = createScheduler(clock);
      const start = performance.now();
      sched.schedule(function (t) {
        const elapsed = performance.now() - start;
        assert.ok(elapsed < 100, `live rAF took ${elapsed}ms`);
        assert.equal(typeof t, 'number');
        done();
      });
    });

    it('cancel(token) prevents cb from firing', function (_, done) {
      const clock = createClock();
      const sched = createScheduler(clock);
      let fired = false;
      const token = sched.schedule(() => { fired = true; });
      sched.cancel(token);
      setTimeout(function () {
        assert.equal(fired, false);
        done();
      }, 50);
    });

    it('tick() is a no-op in live mode', async function () {
      const clock = createClock();
      const sched = createScheduler(clock);
      await sched.tick(100);
      // no callbacks, clock unchanged from wall time
      assert.equal(sched._pendingCount(), 0);
    });
  });

  describe('render mode', function () {
    function setupRender(seed = 0) {
      const clock = createClock();
      const sched = createScheduler(clock);
      clock.setMode('render');
      sched.setMode('render');
      return { clock, sched };
    }

    it('setMode("render") switches modes atomically', function () {
      const { sched } = setupRender();
      assert.equal(sched.getMode(), 'render');
    });

    it('schedule + tick → cb called with advanced clock time', async function () {
      const { clock, sched } = setupRender();
      let received = -1;
      sched.schedule(function (t) { received = t; });
      await sched.tick(16.67);
      assert.equal(received, 16.67);
      assert.equal(clock.now(), 16.67);
    });

    it('schedule without tick does NOT fire cb', function () {
      const { sched } = setupRender();
      let fired = false;
      sched.schedule(() => { fired = true; });
      // No tick
      assert.equal(fired, false);
      assert.equal(sched._pendingCount(), 1);
    });

    it('multiple callbacks fire in FIFO order within one tick', async function () {
      const { sched } = setupRender();
      const order = [];
      sched.schedule(() => order.push('a'));
      sched.schedule(() => order.push('b'));
      sched.schedule(() => order.push('c'));
      await sched.tick(16.67);
      assert.deepEqual(order, ['a', 'b', 'c']);
    });

    it('cancel(token) removes cb from pending', async function () {
      const { sched } = setupRender();
      let firedA = false;
      let firedB = false;
      const tokenA = sched.schedule(() => { firedA = true; });
      sched.schedule(() => { firedB = true; });
      sched.cancel(tokenA);
      await sched.tick(16.67);
      assert.equal(firedA, false);
      assert.equal(firedB, true);
    });

    it('REENTRANCY: cb scheduled during tick fires in NEXT tick, not current', async function () {
      const { sched } = setupRender();
      let firstFireCount = 0;
      let nextFireCount = 0;
      sched.schedule(function () {
        firstFireCount++;
        // Self-reschedule during the tick
        sched.schedule(function () {
          nextFireCount++;
        });
      });
      await sched.tick(16.67);
      assert.equal(firstFireCount, 1);
      assert.equal(nextFireCount, 0, 'nested cb fired in same tick — infinite loop risk');
      assert.equal(sched._pendingCount(), 1);

      await sched.tick(16.67);
      assert.equal(nextFireCount, 1);
    });

    it('throwing cb does not prevent subsequent cbs from firing', async function () {
      const { sched } = setupRender();
      // Silence expected error log during this test
      const origErr = console.error;
      console.error = () => {};
      try {
        let bFired = false;
        sched.schedule(() => { throw new Error('boom'); });
        sched.schedule(() => { bFired = true; });
        await sched.tick(16.67);
        assert.equal(bFired, true);
      } finally {
        console.error = origErr;
      }
    });

    it('multiple ticks accumulate clock time', async function () {
      const { clock, sched } = setupRender();
      const times = [];
      const loop = function (t) {
        times.push(t);
        sched.schedule(loop);  // chain for next tick
      };
      sched.schedule(loop);
      await sched.tick(16.67);
      await sched.tick(16.67);
      await sched.tick(16.67);
      assert.deepEqual(times, [16.67, 33.34, 50.010000000000005]);
      assert.ok(Math.abs(clock.now() - 50.01) < 0.0001);
    });
  });

  describe('mode transitions', function () {
    it('invalid mode throws TypeError', function () {
      const clock = createClock();
      const sched = createScheduler(clock);
      assert.throws(() => sched.setMode('paused'), TypeError);
    });

    it('render → live clears pending callbacks', function () {
      const clock = createClock();
      const sched = createScheduler(clock);
      clock.setMode('render');
      sched.setMode('render');
      sched.schedule(() => {});
      sched.schedule(() => {});
      assert.equal(sched._pendingCount(), 2);
      sched.setMode('live');
      assert.equal(sched._pendingCount(), 0);
    });
  });

  describe('determinism', function () {
    it('two separate scheduler runs with identical ticks produce identical cb arguments', async function () {
      async function run() {
        const clock = createClock();
        const sched = createScheduler(clock);
        clock.setMode('render');
        sched.setMode('render');
        const times = [];
        const loop = function (t) {
          times.push(t);
          sched.schedule(loop);
        };
        sched.schedule(loop);
        for (let i = 0; i < 20; i++) await sched.tick(16.67);
        return times;
      }
      const run1 = await run();
      const run2 = await run();
      assert.deepEqual(run1, run2);
    });
  });
});
