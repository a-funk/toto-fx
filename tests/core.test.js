/**
 * TotoFX Core Engine — Unit Tests
 *
 * Covers: StateStore, createEngine, AnimationRegistry, createSettings.
 * Runs with Node's built-in test runner: `node --test tests/core.test.js`
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// ── Polyfills for Node (no DOM) ─────────────────────────────────

if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

// Minimal localStorage mock
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

// Minimal document stub so createEngine() doesn't throw on import
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    body: null,
    querySelector: function () { return null; },
    addEventListener: function () {},
    visibilityState: 'visible',
  };
}

// ── Imports ─────────────────────────────────────────────────────

import { StateStore } from '../src/state-store.js';
import { createEngine } from '../src/engine.js';
import { AnimationRegistry, createSettings, DEFAULT_SETTINGS } from '../src/registry.js';


// ================================================================
// 1. StateStore
// ================================================================

describe('StateStore', function () {

  beforeEach(function () {
    StateStore._persistent.clear();
    StateStore._transient.clear();
    StateStore._elementCache.clear();
    StateStore._version = 0;
  });

  // ── set / getPersistent ─────────────────────────────────────

  it('set() creates a persistent entry', function () {
    StateStore.set('inProgress', 'item-1', { style: 'ambient', variant: 'glow' });
    var entry = StateStore.getPersistent('item-1');
    assert.ok(entry, 'entry should exist');
    assert.equal(entry.category, 'inProgress');
    assert.equal(entry.style, 'ambient');
    assert.equal(entry.variant, 'glow');
  });

  it('set() defaults style and variant to "default"', function () {
    StateStore.set('action', 'item-2', {});
    var entry = StateStore.getPersistent('item-2');
    assert.equal(entry.style, 'default');
    assert.equal(entry.variant, 'default');
  });

  it('set() records startedAt timestamp', function () {
    var before = performance.now();
    StateStore.set('action', 'item-3', {});
    var entry = StateStore.getPersistent('item-3');
    assert.ok(entry.startedAt >= before, 'startedAt should be >= time before set');
  });

  it('set() increments version monotonically', function () {
    StateStore.set('action', 'a', {});
    var v1 = StateStore._version;
    StateStore.set('action', 'b', {});
    var v2 = StateStore._version;
    assert.ok(v2 > v1, 'version should increase on each set()');
  });

  it('set() stores groupId from state', function () {
    StateStore.set('action', 'item-g', { groupId: 'list-42' });
    var entry = StateStore.getPersistent('item-g');
    assert.equal(entry.groupId, 'list-42');
  });

  // ── clear ───────────────────────────────────────────────────

  it('clear() removes the entry for the correct category', function () {
    StateStore.set('inProgress', 'item-4', {});
    StateStore.clear('inProgress', 'item-4');
    assert.equal(StateStore.getPersistent('item-4'), undefined);
  });

  it('clear() does NOT remove entry if category does not match', function () {
    StateStore.set('inProgress', 'item-5', {});
    StateStore.clear('action', 'item-5');
    assert.ok(StateStore.getPersistent('item-5'), 'entry should still exist');
  });

  it('clear() is a no-op for non-existent keys', function () {
    StateStore.clear('action', 'ghost-key');
    // No throw, no side effects
    assert.equal(StateStore._persistent.size, 0);
  });

  // ── isActive ────────────────────────────────────────────────

  it('isActive() returns true when entry exists with matching category', function () {
    StateStore.set('persist', 'item-6', {});
    assert.equal(StateStore.isActive('persist', 'item-6'), true);
  });

  it('isActive() returns false for wrong category', function () {
    StateStore.set('persist', 'item-7', {});
    assert.equal(StateStore.isActive('action', 'item-7'), false);
  });

  it('isActive() returns false for missing key', function () {
    assert.equal(StateStore.isActive('persist', 'missing'), false);
  });

  // ── getActiveKeys ───────────────────────────────────────────

  it('getActiveKeys() returns keys for the requested category', function () {
    StateStore.set('action', 'a1', {});
    StateStore.set('action', 'a2', {});
    StateStore.set('persist', 'p1', {});
    var actionKeys = StateStore.getActiveKeys('action');
    assert.deepEqual([...actionKeys].sort(), ['a1', 'a2']);
  });

  it('getActiveKeys() returns empty set for unknown category', function () {
    var keys = StateStore.getActiveKeys('nonexistent');
    assert.equal(keys.size, 0);
  });

  // ── setTransient / clearTransient ───────────────────────────

  it('setTransient() creates a transient entry', function () {
    StateStore.setTransient('action', 'tx-1', { groupId: 'g1' });
    assert.ok(StateStore._transient.has('tx-1'));
    assert.equal(StateStore._transient.get('tx-1').category, 'action');
    assert.equal(StateStore._transient.get('tx-1').groupId, 'g1');
  });

  it('clearTransient() removes the transient entry', function () {
    StateStore.setTransient('action', 'tx-2', {});
    StateStore.clearTransient('tx-2');
    assert.ok(!StateStore._transient.has('tx-2'));
  });

  it('setTransient() stores onDone callback', function () {
    var called = false;
    var cb = function () { called = true; };
    StateStore.setTransient('action', 'tx-3', { onDone: cb });
    var entry = StateStore._transient.get('tx-3');
    assert.equal(typeof entry.onDone, 'function');
    entry.onDone();
    assert.ok(called);
  });

  // ── isGroupAnimating ────────────────────────────────────────

  it('isGroupAnimating() returns true when a transient has matching groupId', function () {
    StateStore.setTransient('action', 'tx-g1', { groupId: 'list-9' });
    assert.equal(StateStore.isGroupAnimating('list-9'), true);
  });

  it('isGroupAnimating() returns false when no transient has matching groupId', function () {
    StateStore.setTransient('action', 'tx-g2', { groupId: 'list-10' });
    assert.equal(StateStore.isGroupAnimating('list-99'), false);
  });

  it('isGroupAnimating() returns false for empty/null groupId', function () {
    assert.equal(StateStore.isGroupAnimating(''), false);
    assert.equal(StateStore.isGroupAnimating(null), false);
    assert.equal(StateStore.isGroupAnimating(undefined), false);
  });

  // ── hasAnyTransient ─────────────────────────────────────────

  it('hasAnyTransient() returns false when no transients exist', function () {
    assert.equal(StateStore.hasAnyTransient(), false);
  });

  it('hasAnyTransient() returns true when transients exist', function () {
    StateStore.setTransient('action', 'tx-h1', {});
    assert.equal(StateStore.hasAnyTransient(), true);
  });

  // ── gc ──────────────────────────────────────────────────────

  it('gc() removes old persistent entries whose elements are absent', function () {
    // Manually insert an entry with a very old startedAt
    StateStore._persistent.set('old-item', {
      category: 'action',
      style: 'default',
      variant: 'default',
      params: {},
      startedAt: performance.now() - 120000, // 2 minutes ago
      groupId: '',
      version: 1,
    });
    var resolver = function () { return null; }; // element not found
    StateStore.gc(resolver, 60000, 30000);
    assert.equal(StateStore._persistent.has('old-item'), false);
  });

  it('gc() keeps recent persistent entries even without elements', function () {
    StateStore.set('action', 'new-item', {});
    var resolver = function () { return null; };
    StateStore.gc(resolver, 60000, 30000);
    assert.ok(StateStore._persistent.has('new-item'), 'recent entry should survive gc');
  });

  it('gc() removes old transient entries', function () {
    StateStore._transient.set('old-tx', {
      category: 'action',
      groupId: '',
      startedAt: performance.now() - 60000, // 1 minute ago
      onDone: null,
      element: null,
    });
    var resolver = function () { return null; };
    StateStore.gc(resolver, 60000, 30000);
    assert.equal(StateStore._transient.has('old-tx'), false);
  });

  it('gc() keeps recent transient entries', function () {
    StateStore.setTransient('action', 'fresh-tx', {});
    var resolver = function () { return null; };
    StateStore.gc(resolver, 60000, 30000);
    assert.ok(StateStore._transient.has('fresh-tx'), 'recent transient should survive gc');
  });

  it('gc() keeps persistent entries whose elements are found', function () {
    StateStore._persistent.set('has-el', {
      category: 'action',
      style: 'default',
      variant: 'default',
      params: {},
      startedAt: performance.now() - 120000,
      groupId: '',
      version: 1,
    });
    var fakeEl = { isConnected: true };
    var resolver = function (key) { return key === 'has-el' ? fakeEl : null; };
    StateStore.gc(resolver, 60000, 30000);
    assert.ok(StateStore._persistent.has('has-el'), 'entry with element should survive gc');
  });

  // ── invalidateCache ─────────────────────────────────────────

  it('invalidateCache() clears the element cache', function () {
    StateStore._elementCache.set('x', 'fake-ref');
    StateStore.invalidateCache();
    assert.equal(StateStore._elementCache.size, 0);
  });
});


// ================================================================
// 2. createEngine
// ================================================================

describe('createEngine', function () {

  it('creates an engine with version string', function () {
    var engine = createEngine();
    assert.ok(engine.version, 'engine should have a version');
    assert.equal(typeof engine.version, 'string');
  });

  it('is not initialized by default', function () {
    var engine = createEngine();
    assert.equal(engine._initialized, false);
  });

  // ── Category registration ───────────────────────────────────

  it('registerCategory() stores a category descriptor', function () {
    var engine = createEngine();
    var desc = { start: function () {}, stop: function () {} };
    engine.registerCategory('testCat', desc);
    assert.equal(engine.getCategory('testCat'), desc);
  });

  it('getCategory() returns null for unregistered categories', function () {
    var engine = createEngine();
    assert.equal(engine.getCategory('nope'), null);
  });

  it('getCategoryNames() returns registered names', function () {
    var engine = createEngine();
    engine.registerCategory('alpha', { start: function () {} });
    engine.registerCategory('beta', { start: function () {} });
    var names = engine.getCategoryNames();
    assert.ok(names.includes('alpha'));
    assert.ok(names.includes('beta'));
    assert.equal(names.length, 2);
  });

  // ── Delegation to StateStore ────────────────────────────────

  it('set() delegates to StateStore', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    engine._state._persistent.clear();
    engine.set('persist', 'k1', { style: 'ambient', variant: 'glow' });
    assert.ok(engine._state.isActive('persist', 'k1'));
  });

  it('clear() delegates to StateStore', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    engine._state._persistent.clear();
    engine.set('persist', 'k2', {});
    engine.clear('persist', 'k2');
    assert.equal(engine._state.isActive('persist', 'k2'), false);
  });

  it('isActive() delegates to StateStore', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    engine._state._persistent.clear();
    engine.set('action', 'k3', {});
    assert.equal(engine.isActive('action', 'k3'), true);
    assert.equal(engine.isActive('persist', 'k3'), false);
  });

  it('getActiveKeys() delegates to StateStore', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    engine._state._persistent.clear();
    engine.set('action', 'k4', {});
    engine.set('action', 'k5', {});
    var keys = engine.getActiveKeys('action');
    assert.ok(keys.has('k4'));
    assert.ok(keys.has('k5'));
    assert.equal(keys.size, 2);
  });

  // ── Plugin system ───────────────────────────────────────────

  it('use() with declarative plugin installs categories', function () {
    var engine = createEngine();
    var plugin = {
      name: 'test-plugin',
      categories: {
        sparkle: { start: function () {}, stop: function () {} },
      },
    };
    engine.use(plugin);
    assert.ok(engine.getCategory('sparkle'));
  });

  it('use() with install function calls it', function () {
    var engine = createEngine();
    var installed = false;
    var plugin = {
      install: function (eng) {
        installed = true;
        eng.registerCategory('manual', { start: function () {} });
      },
    };
    engine.use(plugin);
    assert.ok(installed, 'install() should have been called');
    assert.ok(engine.getCategory('manual'));
  });

  it('use() with declarative plugin installs fx layers', function () {
    var engine = createEngine();
    var fxFunc = function () {};
    var plugin = {
      name: 'fx-plugin',
      fx: { glow: fxFunc },
    };
    engine.use(plugin);
    assert.equal(engine.getFX('glow'), fxFunc);
  });

  it('use() ignores null plugin', function () {
    var engine = createEngine();
    engine.use(null);
    // No throw
    assert.equal(engine.getCategoryNames().length, 0);
  });

  // ── configure ───────────────────────────────────────────────

  it('configure() updates resolveElement', function () {
    var engine = createEngine();
    var custom = function () { return 'custom'; };
    engine.configure({ resolveElement: custom });
    assert.equal(engine._config.resolveElement, custom);
  });

  it('configure() sets variantLookup', function () {
    var engine = createEngine();
    var lookup = function () { return null; };
    engine.configure({ variantLookup: lookup });
    assert.equal(engine._variantLookup, lookup);
  });

  // ── destroy ─────────────────────────────────────────────────

  it('destroy() resets initialized flag', function () {
    var engine = createEngine();
    engine._initialized = true;
    engine.destroy();
    assert.equal(engine._initialized, false);
  });

  // ── isAnimating (transient queries) ─────────────────────────

  it('isAnimating() without groupId checks any transient', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    engine._state._transient.clear();
    assert.equal(engine.isAnimating(), false);
    engine._state.setTransient('action', 'x', { groupId: 'g' });
    assert.equal(engine.isAnimating(), true);
  });

  it('isAnimating(groupId) checks specific group', function () {
    var engine = createEngine({ resolveElement: function () { return null; } });
    engine._state._transient.clear();
    engine._state.setTransient('action', 'x', { groupId: 'g1' });
    assert.equal(engine.isAnimating('g1'), true);
    assert.equal(engine.isAnimating('g2'), false);
  });

  // ── register (variant storage) ──────────────────────────────

  it('register() stores variant definitions', function () {
    var engine = createEngine();
    var variants = { slam: function () {} };
    engine.register('action', 'thud', variants);
    assert.ok(engine._variantRegistry);
    assert.ok(engine._variantRegistry.action);
    assert.equal(engine._variantRegistry.action.thud, variants);
  });
});


// ================================================================
// 3. AnimationRegistry
// ================================================================

describe('AnimationRegistry', function () {

  beforeEach(function () {
    AnimationRegistry._categories = {};
  });

  it('registerCategory() stores variants under category and style', function () {
    var slam = function () {};
    AnimationRegistry.registerCategory('action', 'thud', { slam: slam });
    assert.equal(AnimationRegistry.getAnimation('action', 'thud', 'slam'), slam);
  });

  it('registerCategory() merges variants into existing style', function () {
    var slam = function () {};
    var crush = function () {};
    AnimationRegistry.registerCategory('action', 'thud', { slam: slam });
    AnimationRegistry.registerCategory('action', 'thud', { crush: crush });
    assert.equal(AnimationRegistry.getAnimation('action', 'thud', 'slam'), slam);
    assert.equal(AnimationRegistry.getAnimation('action', 'thud', 'crush'), crush);
  });

  it('getStyles() returns style names for a category', function () {
    AnimationRegistry.registerCategory('action', 'thud', { a: function () {} });
    AnimationRegistry.registerCategory('action', 'cute', { b: function () {} });
    var styles = AnimationRegistry.getStyles('action');
    assert.deepEqual(styles.sort(), ['cute', 'thud']);
  });

  it('getStyles() returns empty array for unknown category', function () {
    assert.deepEqual(AnimationRegistry.getStyles('ghost'), []);
  });

  it('getVariants() returns variant names', function () {
    AnimationRegistry.registerCategory('destroy', 'death', {
      shredder: function () {},
      dissolve: function () {},
    });
    var variants = AnimationRegistry.getVariants('destroy', 'death');
    assert.deepEqual(variants.sort(), ['dissolve', 'shredder']);
  });

  it('getVariants() returns empty array for unknown style', function () {
    assert.deepEqual(AnimationRegistry.getVariants('action', 'nope'), []);
  });

  it('getAnimation() returns null for missing variant', function () {
    AnimationRegistry.registerCategory('action', 'thud', { slam: function () {} });
    assert.equal(AnimationRegistry.getAnimation('action', 'thud', 'missing'), null);
  });

  it('getAnimation() returns null for missing category', function () {
    assert.equal(AnimationRegistry.getAnimation('missing', 'thud', 'slam'), null);
  });

  it('getParams() returns param descriptors from plugin object', function () {
    var pluginObj = function () {};
    pluginObj.params = { intensity: { min: 0, max: 10, default: 5 } };
    AnimationRegistry.registerCategory('action', 'thud', { slam: pluginObj });
    var params = AnimationRegistry.getParams('action', 'thud', 'slam');
    assert.deepEqual(params, { intensity: { min: 0, max: 10, default: 5 } });
  });

  it('getParams() returns empty object when animation has no params', function () {
    AnimationRegistry.registerCategory('action', 'thud', { slam: function () {} });
    var params = AnimationRegistry.getParams('action', 'thud', 'slam');
    assert.deepEqual(params, {});
  });

  it('getParams() returns empty object for missing animation', function () {
    assert.deepEqual(AnimationRegistry.getParams('x', 'y', 'z'), {});
  });

  it('invoke() calls play method on plugin objects', function () {
    var received = null;
    var pluginObj = {
      play: function (el, opts) { received = { el: el, opts: opts }; },
    };
    var fakeEl = {};
    AnimationRegistry.invoke(pluginObj, fakeEl, { intensity: 7, speed: 2 });
    assert.ok(received);
    assert.equal(received.el, fakeEl);
    assert.equal(received.opts.intensity, 7);
    assert.equal(received.opts.speed, 2);
  });

  it('invoke() calls legacy function directly', function () {
    var received = null;
    var legacyFn = function (el, opts) { received = { el: el, opts: opts }; };
    var fakeEl = {};
    AnimationRegistry.invoke(legacyFn, fakeEl, { intensity: 3 });
    assert.ok(received);
    assert.equal(received.el, fakeEl);
    assert.equal(received.opts.intensity, 3);
  });
});


// ================================================================
// 4. createSettings
// ================================================================

describe('createSettings', function () {

  beforeEach(function () {
    globalThis.localStorage.clear();
  });

  it('creates a settings instance with default key', function () {
    var settings = createSettings();
    assert.equal(settings.storageKey, 'toto_fx_settings');
  });

  it('creates a settings instance with custom key', function () {
    var settings = createSettings({ storageKey: 'my_custom_key' });
    assert.equal(settings.storageKey, 'my_custom_key');
  });

  it('load() returns defaults when localStorage is empty', function () {
    var settings = createSettings();
    var loaded = settings.load();
    assert.equal(loaded.theme, DEFAULT_SETTINGS.theme);
    assert.equal(loaded.animations.action.style, DEFAULT_SETTINGS.animations.action.style);
  });

  it('save() + load() roundtrips modified settings', function () {
    var settings = createSettings();
    var data = settings.load();
    data.theme = 'neon';
    data.animations.action.style = 'cute';
    settings.save(data);
    settings.invalidate();
    var reloaded = settings.load();
    assert.equal(reloaded.theme, 'neon');
    assert.equal(reloaded.animations.action.style, 'cute');
  });

  it('save() stores as diff-based format (v7)', function () {
    var settings = createSettings({ storageKey: 'diff_test' });
    var data = settings.load();
    data.theme = 'dark';
    settings.save(data);
    var raw = JSON.parse(localStorage.getItem('diff_test'));
    assert.equal(raw._version, 7);
    assert.ok(raw.overrides !== undefined);
    assert.equal(raw.overrides.theme, 'dark');
  });

  it('save() omits unchanged values from diff', function () {
    var settings = createSettings({ storageKey: 'omit_test' });
    var data = settings.load();
    // Save without modifying
    settings.save(data);
    var raw = JSON.parse(localStorage.getItem('omit_test'));
    assert.deepEqual(raw.overrides, {});
  });

  it('reset() removes saved settings', function () {
    var settings = createSettings({ storageKey: 'reset_test' });
    settings.save({ theme: 'dark' });
    settings.reset();
    assert.equal(localStorage.getItem('reset_test'), null);
  });

  it('invalidate() causes next load() to re-read from storage', function () {
    var settings = createSettings({ storageKey: 'inv_test' });
    var first = settings.load();

    // Directly modify localStorage behind settings' back
    localStorage.setItem('inv_test', JSON.stringify({
      _version: 7,
      overrides: { theme: 'brutalist' },
    }));

    // Without invalidate, should return cached value
    var cached = settings.load();
    assert.equal(cached.theme, DEFAULT_SETTINGS.theme);

    // After invalidate, should re-read
    settings.invalidate();
    var fresh = settings.load();
    assert.equal(fresh.theme, 'brutalist');
  });

  it('load() handles corrupt localStorage gracefully', function () {
    localStorage.setItem('toto_fx_settings', '{not valid json!!!');
    var settings = createSettings();
    var loaded = settings.load();
    assert.equal(loaded.theme, DEFAULT_SETTINGS.theme);
  });

  it('load() discards very old versions', function () {
    localStorage.setItem('toto_fx_settings', JSON.stringify({ _version: 1, theme: 'old' }));
    var settings = createSettings();
    var loaded = settings.load();
    assert.equal(loaded.theme, DEFAULT_SETTINGS.theme);
  });

  it('defaults property exposes the default settings', function () {
    var settings = createSettings();
    assert.equal(settings.defaults, DEFAULT_SETTINGS);
  });

  it('flattenDotgrid() merges grid + physics + visual into flat object', function () {
    var settings = createSettings();
    var loaded = settings.load();
    var flat = settings.flattenDotgrid(loaded);
    assert.equal(flat.dotSize, loaded.dotgrid.grid.dotSize);
    assert.equal(flat.densityDecay, loaded.dotgrid.physics.densityDecay);
    assert.equal(flat.glowEnabled, loaded.dotgrid.visual.glowEnabled);
  });

  it('createSettings with custom defaults uses them', function () {
    var custom = {
      _version: 2,
      theme: 'custom-default',
      animations: { action: { style: 'custom' } },
    };
    var settings = createSettings({ defaults: custom });
    var loaded = settings.load();
    assert.equal(loaded.theme, 'custom-default');
    assert.equal(loaded.animations.action.style, 'custom');
  });
});
