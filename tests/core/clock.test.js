/**
 * Tests for core/clock.js — the engine-owned virtual clock.
 *
 * Live mode must be a transparent pass-through to performance.now().
 * Render mode must be deterministic: identical advance() calls → identical now() reads.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

import { createClock } from '../../src/core/clock.js';


describe('createClock', function () {
  describe('live mode (default)', function () {
    it('reports mode as "live" on creation', function () {
      const clock = createClock();
      assert.equal(clock.getMode(), 'live');
    });

    it('now() matches performance.now() within 5ms', function () {
      const clock = createClock();
      const before = performance.now();
      const t = clock.now();
      const after = performance.now();
      assert.ok(t >= before && t <= after + 1, `clock.now() ${t} not between performance.now() bounds [${before}, ${after}]`);
    });

    it('advance() is a no-op in live mode', function () {
      const clock = createClock();
      const t1 = clock.now();
      clock.advance(10_000);
      const t2 = clock.now();
      // t2 should reflect wall clock, not virtualTime. Allow 50ms of real elapsed.
      assert.ok(t2 - t1 < 50, `advance() leaked into live mode: t1=${t1}, t2=${t2}`);
    });

    it('reset() in live mode does not affect now()', function () {
      const clock = createClock();
      clock.reset();
      const t = clock.now();
      assert.ok(t > 0, 'live-mode now() should still return wall clock after reset');
    });
  });

  describe('render mode', function () {
    it('setMode("render") resets virtualTime to 0', function () {
      const clock = createClock();
      clock.setMode('render');
      assert.equal(clock.now(), 0);
    });

    it('advance(16) makes now() return 16', function () {
      const clock = createClock();
      clock.setMode('render');
      clock.advance(16);
      assert.equal(clock.now(), 16);
    });

    it('successive advances accumulate', function () {
      const clock = createClock();
      clock.setMode('render');
      clock.advance(10);
      clock.advance(5);
      clock.advance(1.5);
      assert.equal(clock.now(), 16.5);
    });

    it('reset() zeros the virtual clock without changing mode', function () {
      const clock = createClock();
      clock.setMode('render');
      clock.advance(100);
      clock.reset();
      assert.equal(clock.now(), 0);
      assert.equal(clock.getMode(), 'render');
    });

    it('negative advance throws RangeError', function () {
      const clock = createClock();
      clock.setMode('render');
      assert.throws(() => clock.advance(-1), RangeError);
    });

    it('NaN / Infinity advance throws RangeError', function () {
      const clock = createClock();
      clock.setMode('render');
      assert.throws(() => clock.advance(NaN), RangeError);
      assert.throws(() => clock.advance(Infinity), RangeError);
    });
  });

  describe('mode transitions', function () {
    it('invalid mode throws TypeError', function () {
      const clock = createClock();
      assert.throws(() => clock.setMode('frozen'), TypeError);
    });

    it('live → render → live returns to wall-clock time', function () {
      const clock = createClock();
      clock.setMode('render');
      clock.advance(1_000_000);  // virtualTime = 1_000_000
      clock.setMode('live');
      const t = clock.now();
      // Must NOT be 1_000_000 — we are back on wall clock
      assert.ok(t < 1_000_000, `live-mode now() contaminated by virtualTime: ${t}`);
    });

    it('render → live → render resets virtualTime to 0 again', function () {
      const clock = createClock();
      clock.setMode('render');
      clock.advance(500);
      clock.setMode('live');
      clock.setMode('render');
      assert.equal(clock.now(), 0);
    });
  });

  describe('determinism guarantee', function () {
    it('same advance sequence produces same now() readouts across two clocks', function () {
      const a = createClock();
      const b = createClock();
      a.setMode('render');
      b.setMode('render');
      const reads = [];
      for (const dt of [16.67, 16.67, 33.33, 8, 100, 0.5]) {
        a.advance(dt);
        b.advance(dt);
        reads.push([a.now(), b.now()]);
      }
      for (const [ta, tb] of reads) {
        assert.equal(ta, tb, `diverged: ${ta} !== ${tb}`);
      }
    });
  });
});
