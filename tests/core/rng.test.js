/**
 * Tests for core/rng.js — seeded per-namespace PRNG pool.
 *
 * Load-bearing property: given the same seed, same namespace, same Nth call,
 * rand() returns the same value every time. This is the whole point.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createRngPool } from '../../src/core/rng.js';


describe('createRngPool', function () {
  describe('live mode (default)', function () {
    it('reports mode "live" on creation', function () {
      const rng = createRngPool();
      assert.equal(rng.getMode(), 'live');
    });

    it('rand() returns values in [0, 1)', function () {
      const rng = createRngPool();
      for (let i = 0; i < 100; i++) {
        const v = rng.rand();
        assert.ok(v >= 0 && v < 1, `value out of range: ${v}`);
      }
    });

    it('rand() returns different values across successive calls (prob. > 1 - 2^-96)', function () {
      const rng = createRngPool();
      const a = rng.rand();
      const b = rng.rand();
      const c = rng.rand();
      assert.notEqual(a, b);
      assert.notEqual(b, c);
    });

    it('namespace is ignored in live mode — calls with different namespaces still use Math.random', function () {
      const rng = createRngPool();
      // Can't prove ignored directly; just confirm no throw + values are valid floats.
      const v1 = rng.rand('a');
      const v2 = rng.rand('b');
      assert.ok(v1 >= 0 && v1 < 1);
      assert.ok(v2 >= 0 && v2 < 1);
    });
  });

  describe('render mode determinism', function () {
    it('same seed + same namespace + same call count → identical sequence', function () {
      const a = createRngPool(42);
      const b = createRngPool(42);
      a.setMode('render');
      b.setMode('render');
      for (let i = 0; i < 50; i++) {
        assert.equal(a.rand('slam-0'), b.rand('slam-0'), `diverged at call ${i}`);
      }
    });

    it('same seed + same namespace produces the same sequence across setMode reruns', function () {
      const rng = createRngPool(42);
      rng.setMode('render');
      const run1 = [];
      for (let i = 0; i < 20; i++) run1.push(rng.rand('slam-0'));

      rng.setMode('live');      // reset the "run"
      rng.setMode('render');    // render mode clears pool → re-seeds on next access
      const run2 = [];
      for (let i = 0; i < 20; i++) run2.push(rng.rand('slam-0'));

      assert.deepEqual(run1, run2);
    });

    it('different seeds produce different sequences for the same namespace', function () {
      const a = createRngPool(1);
      const b = createRngPool(2);
      a.setMode('render');
      b.setMode('render');
      const va = a.rand('x');
      const vb = b.rand('x');
      assert.notEqual(va, vb);
    });

    it('different namespaces are independent — advancing one does not shift the other', function () {
      const rng = createRngPool(42);
      rng.setMode('render');
      // Record namespace "a"'s first value
      const a_first_seen_alone = rng.rand('a');
      rng.reset();

      // Now: advance namespace "b" 20 times first, then read "a"'s first value
      for (let i = 0; i < 20; i++) rng.rand('b');
      const a_first_seen_after_b = rng.rand('a');

      assert.equal(a_first_seen_alone, a_first_seen_after_b);
    });

    it('default namespace "__global__" is stable', function () {
      const rng = createRngPool(42);
      rng.setMode('render');
      const v1 = rng.rand();
      rng.reset();
      const v2 = rng.rand();
      assert.equal(v1, v2);
    });
  });

  describe('uniformity sanity', function () {
    it('10k draws from a single namespace have mean ≈ 0.5 (±0.02)', function () {
      const rng = createRngPool(12345);
      rng.setMode('render');
      let sum = 0;
      const N = 10_000;
      for (let i = 0; i < N; i++) sum += rng.rand('u');
      const mean = sum / N;
      assert.ok(Math.abs(mean - 0.5) < 0.02, `mean ${mean} outside [0.48, 0.52]`);
    });

    it('10k draws: no duplicates in first 1000 (mulberry32 has > 1000 period in practice)', function () {
      const rng = createRngPool(12345);
      rng.setMode('render');
      const seen = new Set();
      for (let i = 0; i < 1000; i++) {
        const v = rng.rand('u');
        assert.ok(!seen.has(v), `duplicate at call ${i}: ${v}`);
        seen.add(v);
      }
    });
  });

  describe('setSeed and reset', function () {
    it('setSeed(n) changes the sequence', function () {
      const rng = createRngPool(1);
      rng.setMode('render');
      const v1 = rng.rand('x');
      rng.setSeed(999);
      const v2 = rng.rand('x');
      assert.notEqual(v1, v2);
    });

    it('reset() makes the namespace re-seed from the current globalSeed', function () {
      const rng = createRngPool(42);
      rng.setMode('render');
      const v_first = rng.rand('x');
      for (let i = 0; i < 10; i++) rng.rand('x');
      rng.reset();
      const v_after_reset = rng.rand('x');
      assert.equal(v_first, v_after_reset);
    });
  });

  describe('mode transitions', function () {
    it('invalid mode throws TypeError', function () {
      const rng = createRngPool();
      assert.throws(() => rng.setMode('shuffle'), TypeError);
    });

    it('render → live → render gives the same initial sequence (clears pool each time)', function () {
      const rng = createRngPool(42);
      rng.setMode('render');
      const a = rng.rand('x');
      rng.setMode('live');
      rng.setMode('render');
      const b = rng.rand('x');
      assert.equal(a, b);
    });
  });
});
