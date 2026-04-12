# TotoFX Plugin Authoring Guide

## Overview

A TotoFX plugin is a plain object that teaches the engine a new animation. Plugins have two formats:

**Declarative** -- an object with `name`, `category`, `style`, `meta`, `params`, `play()`, and `cleanup()`:

```js
export var myPlugin = {
  name: 'bounce',
  category: 'action',
  style: 'elastic',
  meta: { label: 'Bounce', description: 'Elastic bounce effect', tags: ['bounce'] },
  params: { /* ... */ },
  play: function (el, ctx) { /* ... */ },
  cleanup: function (el) { /* ... */ },
};
```

**Install function** -- a plugin with an `install(engine, config)` method for full engine access:

```js
export var myPlugin = {
  install: function (engine, config) {
    engine.registerCategory('action', { play: myPlayFn });
    engine.registerFX('glow', myFXLayer);
  }
};
```

Both formats are loaded the same way: `engine.use(myPlugin)`.

## Plugin Interface

The full contract for a declarative plugin:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | yes | Unique variant name (e.g. `'bounce'`, `'spiral'`) |
| `category` | `string` | yes | Category slot: `'action'`, `'ambient'`, `'transition'`, etc. |
| `style` | `string` | yes | Style group within the category (e.g. `'thud'`, `'elastic'`) |
| `meta` | `object` | no | `{ label, description, tags[] }` for UI and discovery |
| `params` | `object` | no | Parameter descriptors (see below) |
| `requires` | `string[]` | no | Declared dependencies, e.g. `['FX']` |
| `play(el, ctx)` | `function` | yes | Run the animation on `el` using execution context `ctx` |
| `cleanup(el)` | `function` | yes | Reset `el` to its pre-animation state |

## The Execution Context (`ctx`)

The `ctx` object passed to `play(el, ctx)` contains:

```js
{
  params: {},        // Merged user overrides on top of your param defaults
  speed: 1,          // Global speed multiplier (>1 = faster)
  intensity: 5,      // 1-10 intensity scale
  onDone: Function,  // MUST be called when animation completes
  elapsed: 0,        // ms since animation started (for phase continuity on reconnect)
  style: 'elastic',  // Resolved style name
  variant: 'bounce', // Resolved variant name
  key: 'item-42',    // Element key (data-anim-id)
  groupId: 'list-7', // Group/list ID
  helpers: FX,       // The FX utility object (when available)
  styleOverride: null // Style/variant override from caller
}
```

Always read `ctx.params` for tunable values (they reflect user overrides merged with your defaults). Always call `ctx.onDone()` when the animation finishes -- the engine uses it to clean up transient state and flush deferred refreshes.

## Parameter Descriptors

Define tunable parameters so the sandbox UI auto-generates controls:

```js
params: {
  height: {
    label: 'Bounce Height',
    type: 'range',
    min: 50,
    max: 500,
    default: 200,
    step: 10,
    unit: 'px',
    group: 'motion'
  },
  duration: {
    label: 'Duration',
    type: 'range',
    min: 100,
    max: 2000,
    default: 600,
    step: 50,
    unit: 'ms',
    group: 'timing'
  },
  bounces: {
    label: 'Bounce Count',
    type: 'range',
    min: 1,
    max: 6,
    default: 3,
    step: 1,
    unit: '',
    group: 'motion'
  },
}
```

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Human-readable name for the UI slider |
| `type` | `string` | `'range'` (more types may be added) |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `default` | `number` | Default value when no override is set |
| `step` | `number` | Slider step increment |
| `unit` | `string` | Display unit: `'px'`, `'ms'`, `'x'`, `''` |
| `group` | `string` | Logical group: `'motion'`, `'timing'`, `'physics'`, `'particles'` |

Use `FX.resolveParams(descriptors, ctx.params)` to merge overrides with defaults. Parameters with `unit: 'ms'` are automatically scaled by the current speed context.

## Complete Worked Example

A custom "bounce" animation from scratch:

```js
import { FX } from 'toto-fx/fx';

export var bouncePlugin = {
  name: 'bounce',
  category: 'action',
  style: 'elastic',

  meta: {
    label: 'Bounce',
    description: 'Elastic bounce with configurable height and count',
    tags: ['bounce', 'elastic', 'fun'],
  },

  params: {
    height:   { label: 'Height',   type: 'range', min: 50,  max: 500,  default: 200, step: 10, unit: 'px', group: 'motion' },
    duration: { label: 'Duration', type: 'range', min: 200, max: 2000, default: 600, step: 50, unit: 'ms', group: 'timing' },
    bounces:  { label: 'Bounces',  type: 'range', min: 1,   max: 6,    default: 3,   step: 1,  unit: '',   group: 'motion' },
  },

  play: function (el, ctx) {
    var p = FX.resolveParams(bouncePlugin.params, ctx.params);
    var height = p.height;
    var duration = p.duration;
    var bounces = p.bounces;

    el.style.willChange = 'transform';
    el.style.transformOrigin = 'center bottom';

    var startTime = performance.now();

    function tick(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);

      // Damped sine wave for bounce
      var decay = Math.pow(1 - progress, 2);
      var wave = Math.abs(Math.sin(progress * Math.PI * bounces));
      var y = -height * decay * wave;

      el.style.transform = 'translateY(' + y + 'px)';

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Reset and signal done
        el.style.transform = '';
        el.style.willChange = '';
        if (ctx.onDone) ctx.onDone();
      }
    }

    requestAnimationFrame(tick);
  },

  cleanup: function (el) {
    el.style.transform = '';
    el.style.willChange = '';
    el.style.transformOrigin = '';
  },
};

// Install function for AnimationRegistry integration
export function install(registry) {
  registry.registerCategory('action', 'elastic', {
    'bounce': bouncePlugin,
  });
}

export default bouncePlugin;
```

## Using FX Utilities

Import the `FX` object for particle spawning, screen effects, card helpers, and more:

```js
import { FX } from 'toto-fx/fx';

// Inside play():
var rect = FX.getItemRect(el);        // { cx, cy, width, height, top, left }
var sub = FX.getSubElements(el);       // { shadow, burst, badge, strike }
var scale = FX.intensityScale(ctx.intensity); // 0.5 - 2.0 multiplier

// Particles
FX.spawnParticles(rect.cx, rect.cy, {
  count: Math.round(30 * scale),
  spread: 8,
  gravity: 0.15,
  color: [255, 200, 50],
  life: 60,
  size: [2, 6],
  upBias: 3,
  chars: ['*', '+', '\u2726'],
});

// Screen effects
FX.doScreenShake(false);               // false = light, true = heavy
FX.doImpactFlash();                    // Black flash + color inversion
FX.flashColor([255, 0, 0], 200);       // Custom color flash

// Dotgrid effects (requires dotgrid module)
FX.doDotgridRipple(rect.cx, rect.cy, { radius: 200, push: 8, density: 0.4 });

// Card lifecycle (for action animations that remove elements)
FX.liftCard(el, sub.shadow, rect.cx, rect.cy, 450, 350, -6, 2, function () {
  FX.gravityFall(el, sub.shadow, 450, -6, 2, 200, 3, rect.cx, rect.cy, function () {
    FX.standardImpact(el, sub.shadow, sub.burst, rect.cx, rect.cy);
    FX.completeAndRemove(el, sub.badge, sub.strike, 300, ctx.onDone);
  });
});
```

Use `ctx.helpers || FX` as the reference if you want to support dependency injection in tests:

```js
play: function (el, ctx) {
  var _FX = ctx.helpers || FX;
  _FX.spawnParticles(cx, cy, { count: 20 });
}
```

## Registration

### `engine.use()` -- install a plugin on an engine instance

```js
import { createEngine } from 'toto-fx';
import { bouncePlugin } from './plugins/bounce.js';

var engine = createEngine({ root: document.body });
engine.use(bouncePlugin);
```

`use()` supports three shapes:

1. **Legacy install function**: plugin has `install(engine, config)` -- engine calls it.
2. **Declarative categories**: plugin has `categories: { action: descriptor }` -- engine registers each.
3. **Declarative FX layers**: plugin has `fx: { glow: layer }` -- engine registers each.

### `AnimationRegistry.registerCategory()` -- register into a shared registry

For plugins distributed as standalone files (IIFE builds), export an `install` function:

```js
export function install(registry) {
  registry.registerCategory('action', 'elastic', {
    'bounce': bouncePlugin,
  });
}
```

The registry call signature is `registerCategory(category, style, variants)` where `variants` is a `{ name: pluginObject }` map.

## Testing Your Plugin

Test plugins in isolation by calling `play()` directly with a mock context:

```js
import { bouncePlugin } from './bounce.js';

// Create a real DOM element
var el = document.createElement('div');
el.style.width = '200px';
el.style.height = '50px';
document.body.appendChild(el);

// Mock context
var done = false;
var ctx = {
  params: { height: 100, duration: 300, bounces: 2 },
  speed: 1,
  intensity: 5,
  onDone: function () { done = true; },
};

bouncePlugin.play(el, ctx);

// After duration elapses, verify:
setTimeout(function () {
  console.assert(done, 'onDone was called');
  console.assert(el.style.transform === '', 'transform was cleaned up');
  console.assert(el.style.willChange === '', 'willChange was cleaned up');
}, 400);

// Test cleanup independently
el.style.transform = 'translateY(-100px)';
bouncePlugin.cleanup(el);
console.assert(el.style.transform === '', 'cleanup resets transform');
```

For tests that use FX utilities, pass a mock via `ctx.helpers`:

```js
var mockFX = {
  resolveParams: function (descs, overrides) {
    var result = {};
    for (var k in descs) result[k] = overrides[k] !== undefined ? overrides[k] : descs[k].default;
    return result;
  },
  spawnParticles: function () { /* no-op */ },
  getItemRect: function () { return { cx: 100, cy: 100, width: 200, height: 50 }; },
};

myPlugin.play(el, { params: {}, helpers: mockFX, onDone: function () {} });
```

## Best Practices

1. **Always call `onDone`** -- the engine tracks transient state and defers list refreshes until your animation signals completion. Forgetting this leaks state.

2. **Clean up styles in `cleanup()`** -- reset every CSS property your `play()` touches. The engine calls `cleanup()` when animations are interrupted or elements are recycled.

3. **Respect speed scaling** -- divide durations by `ctx.speed`, or use `FX.resolveParams()` which auto-scales `unit: 'ms'` params.

4. **Handle `prefers-reduced-motion`** -- check the media query and skip or simplify:
   ```js
   var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (reduced) {
     // Skip particles, use opacity fade instead of physics
     el.style.opacity = '0';
     setTimeout(function () { ctx.onDone(); }, 200);
     return;
   }
   ```

5. **Use `will-change` sparingly** -- set it at animation start, clear it on completion. Never leave it on permanently.

6. **Use `requestAnimationFrame` for frame loops** -- never `setInterval`. Always check elapsed time against a start timestamp rather than counting frames.

7. **Scale effects by intensity** -- use `FX.intensityScale(ctx.intensity)` to multiply particle counts, shake magnitude, and effect radii.

8. **Declare dependencies** -- if your plugin requires FX, set `requires: ['FX']` so the engine can warn when dependencies are missing.

9. **Keep `cleanup()` idempotent** -- it may be called multiple times or on elements that never played. Reset styles unconditionally without side effects.
