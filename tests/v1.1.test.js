/**
 * TotoFX v1.1 — New Feature Tests
 *
 * Covers: isolated StateStore, Symbol key (ANIM_KEY), reconciler error
 * boundaries, reconciler phase offset, lifecycle events, reducedMotion,
 * configurable debounce.
 *
 * Runs with Node's built-in test runner: `node --test tests/v1.1.test.js`
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// ── Polyfills for Node (no DOM) ─────────────────────────────────

if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

function createLocalStorageMock() {
  var store = {};
  return {
    getItem: function (key) { return store[key] !== undefined ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; },
    clear: function () { store = {}; },
  };
}
globalThis.localStorage = createLocalStorageMock();

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    body: null,
    querySelector: function () { return null; },
    addEventListener: function () {},
    visibilityState: 'visible',
  };
}

// ── Imports ─────────────────────────────────────────────────────

import { createStateStore, StateStore } from '../src/state-store.js';
import { createEngine } from '../src/engine.js';
import { createReconciler, ANIM_KEY } from '../src/reconciler.js';


// ================================================================
// 1. Isolated StateStore (factory)
// ================================================================

describe('createStateStore (factory)', function () {

  it('creates independent instances', function () {
    var store1 = createStateStore();
    var store2 = createStateStore();
    store1.set('action', 'item-a', {});
    assert.ok(store1.isActive('action', 'item-a'));
    assert.equal(store2.isActive('action', 'item-a'), false, 'store2 should be independent');
  });

  it('version counters are independent', function () {
    var store1 = createStateStore();
    var store2 = createStateStore();
    store1.set('action', 'a', {});
    store1.set('action', 'b', {});
    store1.set('action', 'c', {});
    assert.equal(store1._version, 3);
    assert.equal(store2._version, 0, 'store2 version should be untouched');
  });

  it('engine instances have isolated stores', function () {
    var engine1 = createEngine({ resolveElement: function () { return null; } });
    var engine2 = createEngine({ resolveElement: function () { return null; } });
    engine1.set('persist', 'k1', {});
    assert.ok(engine1.isActive('persist', 'k1'));
    assert.equal(engine2.isActive('persist', 'k1'), false, 'engine2 should have separate state');
  });

  it('backwards-compat singleton still works', function () {
    StateStore._persistent.clear();
    StateStore.set('action', 'compat-key', {});
    assert.ok(StateStore.isActive('action', 'compat-key'));
    StateStore._persistent.clear();
  });
});


// ================================================================
// 2. ANIM_KEY (Symbol)
// ================================================================

describe('ANIM_KEY', function () {

  it('is a Symbol', function () {
    assert.equal(typeof ANIM_KEY, 'symbol');
  });

  it('can be used as a property key on objects', function () {
    var el = {};
    el[ANIM_KEY] = { _fxVersion: 1 };
    assert.equal(el[ANIM_KEY]._fxVersion, 1);
    assert.equal(el.__totoAnimation, undefined, 'should not pollute string keys');
  });

  it('does not appear in Object.keys()', function () {
    var el = { visible: true };
    el[ANIM_KEY] = { handle: 'test' };
    assert.ok(!Object.keys(el).includes(String(ANIM_KEY)));
  });
});


// ================================================================
// 3. Reconciler — error boundaries
// ================================================================

describe('Reconciler error boundaries', function () {

  it('continues processing after a plugin throws', function () {
    var store = createStateStore();
    var categories = {};
    var started = [];

    categories['broken'] = {
      play: function () { throw new Error('plugin exploded'); },
    };
    categories['working'] = {
      play: function (el, params) {
        started.push(params.key);
        el[ANIM_KEY] = { _fxVersion: 0 };
      },
    };

    // Set up two persistent entries: first broken, then working
    store.set('broken', 'key-broken', {});
    store.set('working', 'key-working', {});

    // Fake elements
    var elBroken = { isConnected: true, dataset: {} };
    var elWorking = { isConnected: true, dataset: {} };

    var reconciler = createReconciler(store, {
      resolveElement: function (key) {
        if (key === 'key-broken') return elBroken;
        if (key === 'key-working') return elWorking;
        return null;
      },
      debug: true,
    }, categories, {});

    // Should not throw
    reconciler.reconcile();

    // The working plugin should have been reached despite the broken one
    assert.ok(started.includes('key-working'), 'working plugin should still fire');
  });
});


// ================================================================
// 4. Reconciler — phase offset
// ================================================================

describe('Reconciler phase offset', function () {

  it('passes elapsed > 0 on re-reconciliation of existing state', function () {
    var store = createStateStore();
    var categories = {};
    var receivedElapsed = null;

    categories['persist'] = {
      play: function (el, params) {
        receivedElapsed = params.elapsed;
        el[ANIM_KEY] = { _fxVersion: 0 };
      },
    };

    // Set state and backdate startedAt
    store.set('persist', 'key-1', {});
    var entry = store.getPersistent('key-1');
    entry.startedAt = performance.now() - 500; // 500ms ago

    var el = { isConnected: true, dataset: {} };

    var reconciler = createReconciler(store, {
      resolveElement: function () { return el; },
    }, categories, {});

    reconciler.reconcile();

    assert.ok(receivedElapsed !== null, 'play should have been called');
    assert.ok(receivedElapsed >= 490, 'elapsed should be ~500ms, got ' + receivedElapsed);
  });

  it('skips elements whose version matches', function () {
    var store = createStateStore();
    var categories = {};
    var callCount = 0;

    categories['persist'] = {
      play: function (el, params) {
        callCount++;
        el[ANIM_KEY] = { _fxVersion: store._version };
      },
    };

    store.set('persist', 'key-v', {});
    var el = { isConnected: true, dataset: {} };

    var reconciler = createReconciler(store, {
      resolveElement: function () { return el; },
    }, categories, {});

    reconciler.reconcile();
    assert.equal(callCount, 1);

    // Reconcile again without changing version — should skip
    reconciler.reconcile();
    assert.equal(callCount, 1, 'should not re-play when version matches');
  });

  it('re-plays when element changes (simulated DOM replacement)', function () {
    var store = createStateStore();
    var categories = {};
    var callCount = 0;

    categories['persist'] = {
      play: function (el, params) {
        callCount++;
        el[ANIM_KEY] = { _fxVersion: store._version };
      },
    };

    store.set('persist', 'key-r', {});
    var el1 = { isConnected: true, dataset: {} };
    var el2 = { isConnected: true, dataset: {} }; // new element (DOM replacement)
    var currentEl = el1;

    var reconciler = createReconciler(store, {
      resolveElement: function () { return currentEl; },
    }, categories, {});

    reconciler.reconcile();
    assert.equal(callCount, 1);

    // Simulate DOM replacement: resolver now returns a different element
    store.invalidateCache();
    currentEl = el2;
    reconciler.reconcile();
    assert.equal(callCount, 2, 'should re-play on new element');
  });
});


// ================================================================
// 5. Lifecycle events
// ================================================================

describe('Engine lifecycle events', function () {

  it('emits animationStart on set()', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    var received = null;
    engine.on('animationStart', function (data) { received = data; });
    engine.set('persist', 'ev-1', {});
    assert.ok(received);
    assert.equal(received.type, 'persistent');
    assert.equal(received.category, 'persist');
    assert.equal(received.key, 'ev-1');
  });

  it('emits animationEnd on clear()', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    var received = null;
    engine.set('persist', 'ev-2', {});
    engine.on('animationEnd', function (data) { received = data; });
    engine.clear('persist', 'ev-2');
    assert.ok(received);
    assert.equal(received.type, 'persistent');
    assert.equal(received.key, 'ev-2');
  });

  it('emits reconcile event', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    var received = null;
    engine.on('reconcile', function (data) { received = data; });
    engine.reconcile();
    assert.ok(received);
    assert.equal(typeof received.persistentCount, 'number');
    assert.equal(typeof received.transientCount, 'number');
  });

  it('off() removes listener', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    var count = 0;
    var fn = function () { count++; };
    engine.on('reconcile', fn);
    engine.reconcile();
    assert.equal(count, 1);
    engine.off('reconcile', fn);
    engine.reconcile();
    assert.equal(count, 1, 'should not fire after off()');
  });

  it('listener errors do not break the engine', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    engine.on('reconcile', function () { throw new Error('bad listener'); });
    // Should not throw
    engine.reconcile();
  });
});


// ================================================================
// 6. reducedMotion
// ================================================================

describe('reducedMotion', function () {

  it('defaults to ignore', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    assert.equal(engine._config.reducedMotion, 'ignore');
  });

  it('can be set to respect', function () {
    var engine = createEngine({
      resolveElement: function () { return null; },
      reducedMotion: 'respect',
    });
    assert.equal(engine._config.reducedMotion, 'respect');
  });

  it('passes reducedMotion to play() context', function () {
    var receivedCtx = null;
    var fakeEl = { nodeType: 1, isConnected: true, dataset: { animId: 'rm-1' } };
    var engine = createEngine({
      resolveElement: function () { return fakeEl; },
      // In Node there's no matchMedia, so reducedMotion will be false regardless
    });
    engine.registerCategory('test', {
      play: function (el, params) {
        receivedCtx = params;
      },
    });
    engine.play('test', fakeEl, {});
    assert.ok(receivedCtx);
    assert.equal(typeof receivedCtx.reducedMotion, 'boolean');
  });
});


// ================================================================
// 7. Configurable debounce
// ================================================================

describe('Configurable debounce', function () {

  it('engine accepts debounceMs option', function () {
    var engine = createEngine({
      resolveElement: function () { return null; },
      debounceMs: 250,
    });
    // Access the internal refresh coordinator's debounce value
    assert.equal(engine._refresh._DEBOUNCE_MS, 250);
  });

  it('defaults to 100ms when not specified', function () {
    var engine = createEngine({
      resolveElement: function () { return null; },
    });
    assert.equal(engine._refresh._DEBOUNCE_MS, 100);
  });
});
