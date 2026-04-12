# TotoFX

State-Driven Rendering Architecture (SDRA) animation engine for web UIs. Fluid-simulation backgrounds, 59+ animation variants, plugin system, and theme engine. Zero dependencies.

The animation engine behind [Toto](https://toto.tech) — the interaction layer between you, your agents, and your world model.

Built on techniques from [pretext](https://github.com/chenglou/pretext) by Cheng Lou -- Semi-Lagrangian fluid simulation applied to UI rendering.

## Features

- **State-driven**: set animation state, engine handles rendering
- **Fluid simulation**: dotgrid background with Semi-Lagrangian advection and Laplacian diffusion
- **59+ animations**: action, destroy, enter, and persist categories with tunable physics parameters
- **DOM-agnostic**: works with any framework or no framework
- **Morph-aware**: integrates with idiomorph/morphdom to preserve animations across DOM replacement
- **Plugin system**: add custom animation categories and FX layers
- **Theme engine**: 6 built-in themes, custom theme support, CSS variable injection
- **Layout animation**: smooth container resize on element add/remove
- **Phase continuity**: persistent animations survive DOM replacement with seamless visual continuity
- **Refresh coordination**: debounced, animation-aware refresh with transaction support

## Install

```bash
npm install toto-fx
```

## Getting Started

A complete working page. Copy this into an HTML file and open it in a browser:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .item { padding: 16px; margin: 8px; border: 1px solid #ccc; }
    .highlight-active { background: #ffffcc; transition: background 0.3s; }
  </style>
</head>
<body>
  <div class="item" data-id="task-1">Buy milk</div>
  <div class="item" data-id="task-2">Write tests</div>
  <button onclick="highlight('task-1')">Highlight first</button>
  <button onclick="highlight('task-2')">Highlight second</button>

  <script src="dist/toto-fx.min.js"></script>
  <script>
    var engine = TotoFX.createEngine({
      resolveElement: function (key) {
        return document.querySelector('[data-id="' + key + '"]');
      },
    });

    engine.registerCategory('highlight', {
      play: function (el, params) {
        el.classList.add('highlight-active');
        setTimeout(function () {
          el.classList.remove('highlight-active');
          params.onDone();  // REQUIRED: tells engine the animation finished
        }, 1000);
      },
    });

    engine.init();

    function highlight(key) {
      engine.play('highlight', engine.resolveElement(key));
    }
  </script>
</body>
</html>
```

### ESM equivalent

```javascript
import { createEngine } from 'toto-fx';

const engine = createEngine({
  resolveElement: (key) => document.querySelector(`[data-id="${key}"]`),
});

engine.registerCategory('highlight', {
  play: (el, params) => {
    el.classList.add('highlight-active');
    setTimeout(() => {
      el.classList.remove('highlight-active');
      params.onDone();  // REQUIRED: tells engine the animation finished
    }, 1000);
  },
});

engine.init();

// Persistent animation (survives DOM mutations)
engine.set('highlight', 'task-1');

// One-shot animation
engine.play('highlight', document.querySelector('[data-id="task-2"]'));
```

## Core Concepts

### State Store

The engine maintains two types of animation state:

- **Persistent**: long-running animations (glows, pulses) that survive DOM mutations. Set with `engine.set()`, cleared with `engine.clear()`.
- **Transient**: one-shot animations (completions, deletions) that play once. Managed internally when you call `engine.play()`.

Keys are opaque strings. The engine doesn't care what they represent.

**`set()` takes a key, `play()` takes an element.** These look parallel but the second argument is different:

```javascript
engine.set('persist', 'item-42');                    // key string — engine resolves the element
engine.play('action', document.getElementById('el')); // DOM element — you provide it directly
```

`set()` uses the key to find and track the element via `resolveElement`. `play()` takes an element directly because one-shot animations don't need persistent tracking. If you pass a string to `play()` or an element to `set()`, it will silently fail.

### Element Resolver

The engine needs to map string keys to DOM elements. You provide a resolver function:

```javascript
// By data attribute
resolveElement: (key) => document.querySelector(`[data-id="${key}"]`)

// By DOM id
resolveElement: (key) => document.getElementById(key)

// From a framework's ref map
resolveElement: (key) => refs.get(key)?.current
```

Categories can also provide their own resolvers, overriding the default.

### Reconciler

When the DOM changes (detected via MutationObserver), the reconciler:

1. Resolves all persistent state keys to current DOM elements
2. Diffs state vs. reality (what's running, what needs starting/stopping)
3. Applies changes with phase offset for visual continuity
4. Periodically garbage-collects orphaned state

### Categories

Animation categories are the top-level animation types. Register them with a `play` function.

**Your play function MUST call `params.onDone()` when the animation finishes.** Without this, the engine can't track transient animation completion -- animations will appear stuck and scheduling breaks down.

```javascript
engine.registerCategory('pulse', {
  // Optional: custom resolver for this category
  resolve: (key) => document.querySelector(`[data-pulse="${key}"]`),

  // Required: how to play the animation
  play: (el, params) => {
    el.classList.add('pulsing');

    if (params.elapsed) {
      // Phase continuity: skip ahead if re-applying after DOM change
      el.style.animationDelay = '-' + params.elapsed + 'ms';
    }

    el.addEventListener('animationend', () => {
      el.classList.remove('pulsing');
      params.onDone();  // REQUIRED
    }, { once: true });
  },

  // Optional: cleanup for persistent animations (called on engine.clear())
  stop: (el) => {
    el.classList.remove('pulsing');
    el.style.animationDelay = '';
  },
});
```

**The `params` object** passed to `play` contains:

| Property | Type | Description |
|----------|------|-------------|
| `onDone` | `Function` | **Must call** when animation finishes |
| `elapsed` | `number` | ms since animation started (for phase continuity on DOM re-render) |
| `style` | `string` | Animation style name (e.g. 'thud') |
| `variant` | `string` | Animation variant name (e.g. 'anime-slam') |
| `params` | `Object` | Additional variant-specific parameters |
| `key` | `string` | Element key |
| `groupId` | `string` | Group ID for coordinated refresh |
| `styleOverride` | `Object` | Style/variant override from play() caller |

### register() vs registerCategory()

These serve different purposes:

**`engine.registerCategory(name, descriptor)`** registers a top-level animation category (like `action`, `destroy`, `enter`, `persist`). You provide a `play` function directly. Use this for custom one-off animations.

```javascript
// Custom category with a play function
engine.registerCategory('flash', {
  play: (el, params) => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.opacity = '1';
      params.onDone();
    }, 200);
  },
});
```

**`engine.register(category, style, variants)`** registers variant functions within an existing category. A style groups related variants under a category -- for example, `'thud'` style with `'anime-slam'` and `'meteor'` variants under the `'action'` category. The built-in plugins use `register()`.

```javascript
// Register variants under a category and style
engine.register('action', 'thud', {
  'anime-slam': { name: 'anime-slam', play: (el, params) => { ... } },
  'meteor':     { name: 'meteor',     play: (el, params) => { ... } },
});
```

### Plugins

Plugins bundle categories, variants, and FX layers for reuse. Two patterns:

**Install pattern** (used by built-in plugins):

```javascript
import { thudPlugin } from 'toto-fx/plugins/thud';

engine.use(thudPlugin);
// Registers 'action' category with 'thud' style and 10 animation variants
```

**Object pattern** (for custom plugins):

```javascript
const ShakePlugin = {
  name: 'shake',
  fx: {
    shake: {
      trigger: (el, opts) => {
        el.classList.add('shaking');
        setTimeout(() => el.classList.remove('shaking'), 450);
      },
    },
  },
};

engine.use(ShakePlugin);
engine.getFX('shake').trigger(element, { heavy: true });
```

## Loading Plugins

### ESM imports

```javascript
import { thudPlugin } from 'toto-fx/plugins/thud';
import { cutePlugin } from 'toto-fx/plugins/cute';
import { deathPlugin } from 'toto-fx/plugins/death';
import { creationPlugin } from 'toto-fx/plugins/creation';
import { inProgressPlugin } from 'toto-fx/plugins/in-progress';

engine.use(thudPlugin);
engine.use(cutePlugin);
engine.use(deathPlugin);
engine.use(creationPlugin);
engine.use(inProgressPlugin);
```

### IIFE / script tags

Each plugin exposes a global with an `install` function. Load the core first, then plugins:

```html
<script src="dist/toto-fx.min.js"></script>
<script src="dist/plugins/thud.min.js"></script>
<script src="dist/plugins/cute.min.js"></script>
<script src="dist/plugins/death.min.js"></script>
<script src="dist/plugins/creation.min.js"></script>
<script src="dist/plugins/in-progress.min.js"></script>
<script>
  var engine = TotoFX.createEngine({ ... });

  // Install plugins via their globals
  TotoFXThud.install(engine);
  TotoFXCute.install(engine);
  TotoFXDeath.install(engine);
  TotoFXCreation.install(engine);
  TotoFXInProgress.install(engine);

  engine.init();
</script>
```

Plugin globals reference:

| Plugin | ESM import path | IIFE global |
|--------|----------------|-------------|
| Thud (action) | `toto-fx/plugins/thud` | `TotoFXThud` |
| Cute (action) | `toto-fx/plugins/cute` | `TotoFXCute` |
| Death (destroy) | `toto-fx/plugins/death` | `TotoFXDeath` |
| Creation (enter) | `toto-fx/plugins/creation` | `TotoFXCreation` |
| In-Progress (persist) | `toto-fx/plugins/in-progress` | `TotoFXInProgress` |

### Quickstart with built-in plugins

The most common use case: load everything, play an anime-slam on click.

```html
<script src="dist/toto-fx.min.js"></script>
<script src="dist/plugins/thud.min.js"></script>
<script>
  var engine = TotoFX.createEngine({
    resolveElement: function (key) {
      return document.querySelector('[data-id="' + key + '"]');
    },
  });

  // Install the thud plugin (adds 'action' category with 10 slam variants)
  TotoFXThud.install(engine);
  engine.init();

  // Play anime-slam on any element
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('click', function () {
      engine.play('action', card, {
        params: { style: 'thud', variant: 'anime-slam' },
      });
    });
  });
</script>
```

## Built-in Animation Variants

59 animations across 4 categories:

### Action (completion)

**Thud** (10 variants): anime-slam, low-bounce, stratosphere, orbit-slam, crater, deep-crater, meteor, detonation, nuclear, shatter

**Cute** (13 variants): confetti, flowers, sparkle, shooting-star, butterflies, rainbow, fireworks, hearts, cat, dog, snowfall, ocean, fireflies

### Destroy (deletion)

**Death** (11 variants): explode, incinerate, shredder, guillotine, heartbeat, sniper, eaten, lightning, steamroller, piranhas, woodchipper

### Enter (creation)

**Subtle** (5): fade-in, slide-in, unfold, typewriter, rise

**Dramatic** (5): slam-down, scale-bounce, materialize, portal, glitch-in

**Fun** (5): confetti-drop, sparkle-trail, butterfly-carry, bounce-in, grow

### Persist (in-progress)

**Ambient** (5): glow, pulse, colored-border, shimmer, breathing

**Rich** (5): snake-border, particle-orbit, corner-accents, heartbeat, progress-bar

## Dotgrid Fluid Simulation

The dotgrid system renders a full-viewport ASCII character grid driven by Semi-Lagrangian fluid simulation. Canvas-based (zero DOM writes per frame).

```javascript
import { createDotgrid } from 'toto-fx';

const grid = createDotgrid({
  container: '#my-container',
  dotSize: 28,
  fontSize: 16,
  baseChar: '\u00b7',
  baseOpacity: 0.2,           // base dot opacity (0.0 - 1.0)
  baseColor: [180, 180, 180], // [r, g, b] or null to auto-detect from CSS --ink-muted
  densityDecay: 0.985,
  velDecay: 0.92,
});

grid.init();  // REQUIRED: starts the render loop

// Trigger effects
grid.ripple(400, 300, { radius: 200, push: 10 });
grid.vortex(400, 300, { radius: 150, speed: 2 });
grid.crater(400, 300, 100, 1);
grid.nuclear(400, 300, { blastRadius: 250 });
grid.scorch(400, 300, { width: 40, length: 200 });

// Cleanup
grid.destroy();
```

### Wiring FX + Dotgrid

If you use both the FX utilities (particles, screen shake, etc.) and dotgrid, you need to connect them. Without this call, FX functions that target the dotgrid (like `FX.doDotgridCrater`, `FX.doDotgridNuclear`) silently do nothing.

```javascript
import { FX, createDotgrid } from 'toto-fx';

const grid = createDotgrid({
  container: '#my-container',
  baseOpacity: 0.2,
  baseColor: [180, 180, 180],
});
grid.init();

// Wire FX to the dotgrid instance
FX.setDotgrid(grid);

// Now FX dotgrid helpers work
FX.doDotgridRipple(400, 300, { radius: 200, push: 10 });
FX.doDotgridCrater(400, 300, 100, 1);
FX.doDotgridNuclear(400, 300);
FX.doDotgridScorch(300, 300, 500, 300, 40);
```

IIFE equivalent:

```html
<script src="dist/toto-fx.min.js"></script>
<script>
  var grid = TotoFX.createDotgrid({ container: '#bg' });
  grid.init();
  TotoFX.FX.setDotgrid(grid);
</script>
```

## configureFX vs FX.configure

They are the same function. `configureFX` is a re-export of `FX.configure` for convenience at the top-level import.

```javascript
// These are identical:
import { configureFX } from 'toto-fx';
configureFX({ mobile: { particleScale: 0.5 } });

import { FX } from 'toto-fx';
FX.configure({ mobile: { particleScale: 0.5 } });
```

## FX Quick Reference

The FX module provides particles, screen effects, and card animation helpers. Full API docs: [docs/fx-api.md](docs/fx-api.md).

```javascript
import { FX } from 'toto-fx';

// Particles
FX.spawnParticles(cx, cy, {
  count: 30,           // number of particles
  colors: [[255,100,50], [255,200,0]],  // [r,g,b] arrays
  chars: ['*', '+', '#'],               // ASCII characters
  speed: 4,            // initial velocity
  gravity: 0.15,       // downward pull
  spread: Math.PI * 2, // emission arc (radians)
});
FX.spawnSmoke(cx, cy, 10);              // smoke puff
FX.spawnFireTrail(x, y, angle);         // directional fire

// Screen effects
FX.doScreenShake();                     // light shake
FX.doScreenShake(true);                 // heavy shake
FX.doImpactFlash();                     // white flash
FX.doImpactFlash(true);                 // intense white-out
FX.flashColor('#ff0000', 300);          // colored flash

// Dotgrid effects (requires FX.setDotgrid(grid) first)
FX.doDotgridRipple(cx, cy, { radius: 200, push: 10 });
FX.doDotgridCrater(cx, cy, 100, 1);
FX.doDotgridNuclear(cx, cy);
FX.doDotgridScorch(x1, y1, x2, y2, 40);

// Card animation helpers (physics-based)
FX.liftCard(el, shadow, cx, cy, peakZ, duration, rotX, rotY, onDone);
FX.gravityFall(el, shadow, peakZ, rotX, rotY, duration, easeExp, cx, cy, onImpact);
FX.standardImpact(el, shadow, burst, cx, cy);

// Element helpers
const pos = FX.getItemRect(el);         // { cx, cy, left, top, width, height }
const sub = FX.getSubElements(el);      // { shadow, burst, badge, strike }
const scale = FX.intensityScale(5);     // 0.3-1.0 from intensity 1-10

// Cleanup
FX.finalize(el, { onDone: callback });  // reset styles + call onDone
FX.destroyCard(el);                     // hide element permanently
```

## Themes

6 built-in themes with CSS variable injection:

```javascript
import { createThemeManager } from 'toto-fx';

const themes = createThemeManager({
  themeBaseUrl: '/themes',  // where theme JSON files are served
});

await themes.loadTheme('cyber');  // neon cyberpunk
await themes.loadTheme('warm');   // earthy terracotta
// Also: midnight, mono, cute, spring
```

## API Reference

### `createEngine(config?)`

Create a new engine instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `HTMLElement` | `document.body` | Root element for DOM observation |
| `resolveElement` | `(key: string) => HTMLElement\|null` | `querySelector('[data-anim-id="..."]')` | Default element resolver |
| `onRefresh` | `(groupId: string) => void\|Promise` | `null` | Refresh callback for animation-aware updates |
| `containerResolver` | `(groupId: string) => HTMLElement\|null` | `getElementById('item-list-...')` | Container resolver for layout animation |
| `layoutDuration` | `number` | `300` | Layout animation duration (ms) |
| `layoutEasing` | `string` | `'ease-out'` | Layout animation CSS easing |

### Engine Methods

#### State Management

| Method | Description |
|--------|-------------|
| `engine.set(category, key, params?)` | Set persistent animation state |
| `engine.clear(category, key)` | Clear persistent animation state |
| `engine.isActive(category, key)` | Check if key has active persistent animation |
| `engine.getActiveKeys(category)` | Get all active keys for a category |
| `engine.play(category, el, opts?)` | Play a one-shot animation |
| `engine.transition(key, toCategory, opts?)` | Transition from persistent to one-shot |

#### Lifecycle

| Method | Description |
|--------|-------------|
| `engine.init()` | Start DOM observation and GC. Idempotent. |
| `engine.destroy()` | Disconnect observers, clear intervals |
| `engine.configure(opts)` | Update engine configuration |
| `engine.reconcile()` | Trigger manual state-to-DOM reconciliation |
| `engine.refreshSettings()` | Restart all persistent animations |

#### Registration

| Method | Description |
|--------|-------------|
| `engine.registerCategory(name, descriptor)` | Register a top-level animation category with a `play` function |
| `engine.register(category, style, variants)` | Register variant functions within an existing category |
| `engine.getCategory(name)` | Get a category descriptor |
| `engine.getCategoryNames()` | List all registered categories |
| `engine.use(plugin, config?)` | Install a plugin |
| `engine.registerFX(name, layer)` | Register an FX layer |
| `engine.getFX(name)` | Get a registered FX layer |

#### Queries

| Method | Description |
|--------|-------------|
| `engine.isAnimating(groupId?)` | Check if transient animations are in flight |

#### Layout Animation

| Method | Description |
|--------|-------------|
| `engine.animatedRefresh(groupId, swapFn)` | Height-animated refresh: capture, swap, reconcile, animate |
| `engine.captureLayout(groupId)` | Capture container height before external swap |
| `engine.animateAfterSwap(groupId, snapshot)` | Animate container height after external swap |

#### Refresh Coordination

| Method | Description |
|--------|-------------|
| `engine.scheduleRefresh(groupId)` | Schedule debounced refresh |
| `engine.scheduleImmediateRefresh(groupId)` | Immediate refresh, bypass debounce |
| `engine.beginTransaction()` | Defer refreshes until commit |
| `engine.commitTransaction()` | Flush all deferred refreshes |

## Dist Files

The build produces multiple bundles for different use cases:

| File | Size | Use case |
|------|------|----------|
| `dist/toto-fx.min.js` | 74KB | Full bundle, IIFE. Load via `<script>` tag, exposes `window.TotoFX`. |
| `dist/toto-fx.esm.js` | 74KB | Full bundle, ESM. `import { createEngine } from 'toto-fx'` |
| `dist/core.esm.js` | 12KB | Engine only (no FX, dotgrid, or plugins). For minimal setups. |
| `dist/fx.min.js` | 23KB | FX utilities only, IIFE. `window.TotoFXUtils` |
| `dist/dotgrid.min.js` | 18KB | Dotgrid only, IIFE. `window.TotoFXDotgrid` |
| `dist/plugins/*.min.js` | 16-71KB | Individual plugins, IIFE. `window.TotoFXThud`, etc. |

**Which one should I use?**
- Just getting started? Use `toto-fx.min.js` — it includes everything.
- Optimizing bundle size? Use `core.esm.js` + only the plugins you need.
- Only want the fluid simulation? Use `dotgrid.min.js` standalone.

## Individual Module Exports

For advanced use via ESM:

```javascript
import { StateStore } from 'toto-fx';
import { DOMObserver } from 'toto-fx';
import { createReconciler } from 'toto-fx';
import { createRefreshCoordinator } from 'toto-fx';
import { createLayoutAnimator } from 'toto-fx';
import { FX } from 'toto-fx';               // particle systems, physics
import { createDotgrid } from 'toto-fx';     // fluid simulation
import { AnimationRegistry } from 'toto-fx'; // variant store
import { AnimationSettings } from 'toto-fx'; // localStorage persistence
import { PresetSchema } from 'toto-fx';      // preset validation
```

## TypeScript

Type definitions ship at `types/index.d.ts` and are referenced in `package.json`. TypeScript and IDE autocompletion works automatically after `npm install toto-fx`.

## Further Reading

- [docs/fx-api.md](docs/fx-api.md) -- FX utilities API reference (all 50+ exports)
- [docs/dotgrid.md](docs/dotgrid.md) -- Dotgrid fluid simulation deep dive
- [docs/plugin-guide.md](docs/plugin-guide.md) -- Writing custom plugins

## Browser Support

ES2020+ (Chrome 80+, Firefox 78+, Safari 14+, Edge 80+).

Uses `WeakRef`, `MutationObserver`, `requestAnimationFrame`, `Map`, `Set`.

## Acknowledgments

TotoFX's dotgrid fluid simulation is built on rendering techniques from [pretext](https://github.com/chenglou/pretext) by Cheng Lou. The Semi-Lagrangian advection approach to text-based UI rendering was the direct inspiration for the engine's background system.

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE), at your option.
