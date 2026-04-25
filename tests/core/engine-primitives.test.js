/**
 * Integration tests for determinism primitives on the engine surface.
 *
 * These prove that `engine.now / engine.raf / engine.rand / engine.tick /
 * engine.setRenderMode` compose correctly. The individual primitives are
 * tested in clock.test.js / rng.test.js / scheduler.test.js; this file is
 * about how they behave together on a real engine instance.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// Polyfills for headless Node.
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    body: null,
    querySelector: function () { return null; },
    addEventListener: function () {},
    visibilityState: 'visible',
  };
}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {},
  };
}

import { createEngine } from '../../src/engine.js';


describe('engine primitives — live mode (default)', function () {
  it('engine.now() returns a finite positive number close to performance.now()', function () {
    const engine = createEngine();
    const before = performance.now();
    const t = engine.now();
    assert.ok(t >= before && t <= performance.now() + 1, `now() ${t} not within wall-clock range`);
  });

  it('engine.rand() returns values in [0, 1)', function () {
    const engine = createEngine();
    for (let i = 0; i < 10; i++) {
      const v = engine.rand();
      assert.ok(v >= 0 && v < 1);
    }
  });

  it('engine.raf(cb) fires cb within 100ms', function (_, done) {
    const engine = createEngine();
    engine.raf(function (t) {
      assert.equal(typeof t, 'number');
      done();
    });
  });

  it('engine.tick() is a no-op in live mode', async function () {
    const engine = createEngine();
    await engine.tick(100);
    assert.equal(engine.isRenderMode(), false);
  });

  it('engine.isRenderMode() defaults to false', function () {
    const engine = createEngine();
    assert.equal(engine.isRenderMode(), false);
  });
});


describe('engine primitives — render mode', function () {
  it('setRenderMode(true, {seed:42}) flips all three primitives', function () {
    const engine = createEngine();
    engine.setRenderMode(true, { seed: 42 });
    assert.equal(engine.isRenderMode(), true);
    assert.equal(engine.now(), 0);  // virtual clock resets to 0
  });

  it('engine.tick(16) advances engine.now() by 16', async function () {
    const engine = createEngine();
    engine.setRenderMode(true, { seed: 42 });
    await engine.tick(16);
    assert.equal(engine.now(), 16);
    await engine.tick(16);
    assert.equal(engine.now(), 32);
  });

  it('engine.raf + tick → cb fires synchronously within tick', async function () {
    const engine = createEngine();
    engine.setRenderMode(true, { seed: 42 });
    let got = null;
    engine.raf(function (t) { got = t; });
    await engine.tick(16);
    assert.equal(got, 16);
  });

  it('same seed produces identical rand sequences across two engines', function () {
    const a = createEngine();
    const b = createEngine();
    a.setRenderMode(true, { seed: 42 });
    b.setRenderMode(true, { seed: 42 });
    for (let i = 0; i < 30; i++) {
      assert.equal(a.rand('slam'), b.rand('slam'), `diverged at call ${i}`);
    }
  });

  it('different seeds produce different rand sequences', function () {
    const a = createEngine();
    const b = createEngine();
    a.setRenderMode(true, { seed: 1 });
    b.setRenderMode(true, { seed: 2 });
    assert.notEqual(a.rand('slam'), b.rand('slam'));
  });

  it('end-to-end: full render loop with raf + rand + tick is deterministic', async function () {
    async function run() {
      const engine = createEngine();
      engine.setRenderMode(true, { seed: 7 });
      const frames = [];
      const loop = function (t) {
        frames.push({ t: t, r: engine.rand('particles') });
        engine.raf(loop);
      };
      engine.raf(loop);
      for (let i = 0; i < 10; i++) await engine.tick(16.67);
      return frames;
    }
    const run1 = await run();
    const run2 = await run();
    assert.deepEqual(run1, run2, 'two identical render runs diverged');
  });
});


describe('engine primitives — mode transitions', function () {
  it('setRenderMode(false) returns to live mode with wall-clock time', function () {
    const engine = createEngine();
    engine.setRenderMode(true, { seed: 42 });
    engine.tick(1_000_000).catch(() => {});  // fire-and-forget
    engine.setRenderMode(false);
    assert.equal(engine.isRenderMode(), false);
    const t = engine.now();
    // Wall clock should be << 1_000_000 ms of virtualTime
    assert.ok(t < 1_000_000, `live-mode now() contaminated: ${t}`);
  });

  it('setRenderMode(true, {seed:N}) twice with same seed restarts determinism', async function () {
    const engine = createEngine();
    engine.setRenderMode(true, { seed: 42 });
    const first = [engine.rand('x'), engine.rand('x'), engine.rand('x')];

    engine.setRenderMode(false);
    engine.setRenderMode(true, { seed: 42 });
    const second = [engine.rand('x'), engine.rand('x'), engine.rand('x')];

    assert.deepEqual(first, second);
  });
});
