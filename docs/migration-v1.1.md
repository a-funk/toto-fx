# Migrating from v1.0 to v1.1

This guide covers the breaking and notable changes in TotoFX v1.1. Most code will work without changes, but the destroy category rename requires updating `play()` calls.

## Breaking Changes

### Destroy category merged into action

**The `'destroy'` category no longer exists.** All destroy animations are now variants under the `'action'` category with `style: 'destroy'`.

Before (v1.0):
```javascript
engine.play('destroy', el, {
  params: { variant: 'explode' },
});
```

After (v1.1):
```javascript
engine.play('action', el, {
  params: { style: 'destroy', variant: 'explode' },
});
```

This change unifies all one-shot animations under a single `'action'` category. The three action styles are now:
- `'thud'` — impact/completion animations (anime-slam, meteor, etc.)
- `'cute'` — playful animations (confetti, sparkle, etc.)
- `'destroy'` — destruction animations (explode, lightning, etc.)

**The plugin is still called `deathPlugin` / `TotoFXDeath`.** Only the category changed — the plugin name, import path, and IIFE global are unchanged:

```javascript
// ESM — unchanged
import { deathPlugin } from 'toto-fx/plugins/death';
engine.use(deathPlugin);

// IIFE — unchanged
engine.use(TotoFXDeath);
```

### What to search for

Find and update all calls matching these patterns:

```
engine.play('destroy',    →  engine.play('action', el, { params: { style: 'destroy', ... } })
engine.set('destroy',     →  (destroy animations are one-shot, this shouldn't exist)
```

## Notable Changes (Non-Breaking)

### Isolated state stores

Each `createEngine()` call now creates its own isolated state store. In v1.0, all engines shared a global singleton `StateStore`, which could cause collisions when running multiple engines on the same page.

**No code changes needed** — this is transparent if you use `createEngine()`. The old `StateStore` singleton export still works but is deprecated.

```javascript
// v1.1: each engine is fully isolated
var mainEngine = TotoFX.createEngine({ root: document.getElementById('main') });
var modalEngine = TotoFX.createEngine({ root: document.getElementById('modal') });

// These won't collide — each has its own state, observer, and reconciler
mainEngine.set('persist', 'item-1', { style: 'ambient', variant: 'glow' });
modalEngine.set('persist', 'item-1', { style: 'rich', variant: 'snake-border' });
```

### Engine events

New `engine.on()` and `engine.off()` methods for subscribing to animation lifecycle events. See [docs/engine-events.md](engine-events.md) for full documentation.

```javascript
engine.on('animationStart', function (e) {
  console.log(e.category + '/' + e.key + ' started');
});
```

### Reduced motion support

New `reducedMotion: 'respect'` config option. When enabled, the engine passes `ctx.reducedMotion: true` to all plugin `play()` functions when the user's OS has `prefers-reduced-motion: reduce` set. See [docs/accessibility.md](accessibility.md) for details.

```javascript
var engine = TotoFX.createEngine({
  reducedMotion: 'respect',
});
```

### Symbol-based animation key

Animation tracking handles on DOM elements now use a Symbol (`ANIM_KEY`) instead of a string property. This prevents accidental collisions with other code that might set properties on DOM elements.

**No changes needed** unless you were reading `el['__totoAnimation']` directly — use the exported `ANIM_KEY` symbol instead:

```javascript
import { ANIM_KEY } from 'toto-fx';

var handle = el[ANIM_KEY];
// handle._fxVersion, handle._fxCategory, handle._fxStyle
```

### Category stop() callback

Categories registered with `registerCategory()` can now include an optional `stop()` function that's called when `engine.clear()` is invoked or when animation state changes. This allows cleanup of CSS classes, inline styles, and timers.

```javascript
engine.registerCategory('highlight', {
  play: function (el, params) {
    el.classList.add('highlighted');
  },
  stop: function (el) {
    el.classList.remove('highlighted');
  },
});
```

### Error boundaries in reconciler

Plugin `play()` errors no longer crash the engine. If a plugin throws during reconciliation, the error is logged (when `debug: true`) and reconciliation continues for remaining entries.

### Debug mode

New `debug: true` config option that enables console warnings for common mistakes — wrong argument types to `play()`/`set()`, unregistered categories, detached elements, and plugin errors.

```javascript
var engine = TotoFX.createEngine({
  debug: true,
});
```

## Deprecated Exports

These still work in v1.1 but will be removed in a future version:

| Export | Replacement |
|--------|-------------|
| `StateStore` (singleton) | `createStateStore()` or just use `createEngine()` |
| `DOMObserver` (singleton) | `createDOMObserver()` or just use `createEngine()` |

You only need the factory functions if you're building a custom engine composition. For normal usage, `createEngine()` handles everything internally.

## Quick Migration Checklist

- [ ] Search for `engine.play('destroy',` and update to `engine.play('action', el, { params: { style: 'destroy', ... } })`
- [ ] Search for any direct reads of `el['__totoAnimation']` and switch to `el[ANIM_KEY]`
- [ ] Consider adding `debug: true` for development builds
- [ ] Consider adding `reducedMotion: 'respect'` for accessibility
- [ ] Review any code that imports `StateStore` or `DOMObserver` directly — switch to `createEngine()` if possible
