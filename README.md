# [TotoFX](https://toto.tech/playground)

An animation engine that survives DOM replacement.

TotoFX is a layers-based approach to animating that treats animation as a **state reconciliation problem**, not a DOM lifecycle. TotoFX base library includes 4 channels: physics, dotgrid, 
Fluid-simulation backgrounds, animation plugin system, and theme engine that stack independently. Zero dependencies. Framework-agnostic.

Built on techniques and architectural inspiration from [pretext](https://github.com/chenglou/pretext) by Cheng Lou.

If your app uses htmx, morphdom, idiomorph, Turbo, LiveView, or any server-driven approach that *replaces* DOM nodes, animations die on every swap. Most animation libraries assume you control the DOM. You create an element, animate it, remove it. But that isn't always the case when the server is rendering html. 

TotoFX solves this. You declare that a key should be animating — the engine finds the element, starts the animation, and watches for DOM changes. When the DOM gets replaced, the engine detects the mutation, resolves the new element, and resumes at the correct phase. No flicker, no restart, no manual bookkeeping. The same mental model as React's reconciler, but for animations and framework-agnostic.


**[Try it in the playground](https://toto.tech/playground)** — create a random animation, build your own, or explore the 'Advanced' tab for near-infinite flexibility.

[Deeper Reading](https://github.com/a-funk/toto-fx/blob/main/docs/fx-api.md)

## Animation Persistence Across DOM Replacement

Most animation libraries bind animations to DOM elements. When the DOM is replaced (via htmx, Turbo, morphdom, etc.), animations are lost.

toto-fx binds animations to **identity**, not elements.

---

## ❌ Before: animation breaks on DOM update

```js
import { animate } from "motion"

const el = document.querySelector("#card-42")

animate(el, {
  scale: [1, 1.05, 1]
})

// Later: DOM is replaced
container.innerHTML = newHTML

// ❌ animation is gone
```

## ✅ After: animations survive DOM replacement

toto-fx attaches animation to a **semantic key**, not a DOM node.

```js
import { engine } from "toto-fx"

// Bind animation to an identity instead of an element
engine.set("persist", "card-42")

// Later: DOM is completely replaced (htmx / Turbo / morphdom / etc.)
morphdom(container, updatedHTML)

// ✨ Animation continues seamlessly
```

```
engine.set("persist", "card-42")     // bind animation to a semantic key
        │
        ▼
   ┌──────────┐
   │ Registry │  category → style → variant lookup
   └────┬─────┘
        ▼
   ┌───────────┐
   │ Resolver  │  key → DOM element
   └────┬──────┘
        ▼
   ┌──────────────────────┐
   │ Element swap detected│  MutationObserver sees DOM change
   └────┬─────────────────┘
        ▼
   ┌──────────────────┐
   │ Animation resumed│  phase-correct, no restart
   └──────────────────┘
```

### Roadmap
Apply TotoFX to video editing tools.

Graph-based views. 

## Features

- **State-driven**: set animation state, engine handles rendering
- **Fluid simulation**: dotgrid background with Semi-Lagrangian advection and Laplacian diffusion
- **59+ animations**: action (including destroy), enter, and persist categories with tunable physics parameters
- **DOM-agnostic**: works with any framework or no framework
- **Morph-aware**: integrates with idiomorph/morphdom to preserve animations across DOM replacement
- **Plugin system**: add custom animation categories and FX layers
- **Theme engine**: 6 built-in themes, custom theme support, CSS variable injection
- **Layout animation**: smooth container resize on element add/remove
- **Phase continuity**: persistent animations survive DOM replacement with seamless visual continuity
- **Refresh coordination**: debounced, animation-aware refresh with transaction support
- **Unified canvas pipeline**: particles, speed lines, and custom draw callbacks render to a single canvas with one clear per frame. One RAF loop, one frame budget, adaptive quality degradation
- **Two-tool plugin model**: `spawnParticles` for fire-and-forget physics particles, `registerFxDraw` for custom per-frame rendering — everything else is engine-managed


## Install

```bash
npm install toto-fx
```

## Getting Started

A complete working page. Copy this into an HTML file and open it in a browser. Clicking a card plays an anime-slam with particles, screen shake, and a dotgrid ripple across the fluid simulation background:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #1a1a2e; margin: 0; font-family: system-ui, sans-serif; }
    #bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    .cards { position: relative; z-index: 1; display: flex; gap: 12px; padding: 40px; flex-wrap: wrap; }
    .card {
      padding: 20px 24px;
      border: 1px solid #3a3a5a;
      border-radius: 10px;
      background: rgba(30, 30, 55, 0.9);
      color: #e0e0e0;
      cursor: pointer;
      width: 200px;
    }
  </style>
</head>
<body>
  <div id="bg"></div>
  <div class="cards">
    <div class="card" data-id="task-1">
      Buy milk
      <div class="fx-shadow"></div>
      <div class="fx-burst"></div>
      <div class="fx-badge"></div>
      <div class="fx-strike"></div>
    </div>
    <div class="card" data-id="task-2">
      Write tests
      <div class="fx-shadow"></div>
      <div class="fx-burst"></div>
      <div class="fx-badge"></div>
      <div class="fx-strike"></div>
    </div>
    <div class="card" data-id="task-3">
      Ship feature
      <div class="fx-shadow"></div>
      <div class="fx-burst"></div>
      <div class="fx-badge"></div>
      <div class="fx-strike"></div>
    </div>
  </div>

  <script src="dist/toto-fx.min.js"></script>
  <script src="dist/plugins/thud.min.js"></script>
  <script>
    // 1. Create the engine
    var engine = TotoFX.createEngine({
      resolveElement: function (key) {
        return document.querySelector('[data-id="' + key + '"]');
      },
      debug: true, // recommended during development — logs warnings for common mistakes
    });

    // 2. Install the thud plugin
    engine.use(TotoFXThud);

    // 3. Set up the dotgrid fluid simulation background
    var grid = TotoFX.createDotgrid({
      container: '#bg',
      baseOpacity: 0.15,
      baseColor: [100, 100, 160],
    });
    grid.init();

    // 4. Wire FX to dotgrid (without this, FX.doDotgridRipple etc. silently do nothing)
    TotoFX.FX.setDotgrid(grid);

    // 5. Start the engine
    engine.init();

    // 6. Play anime-slam on click, with a dotgrid ripple at the card's position
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('click', function () {
        engine.play('action', card, {
          params: { style: 'thud', variant: 'anime-slam' },
        });

        var rect = card.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        TotoFX.FX.doDotgridRipple(cx, cy, { radius: 200, push: 10, density: 0.6 });
      });
    });
  </script>
</body>
</html>
```

> **Tip:** Always enable `debug: true` during development. Without it, mistakes like misspelled variants, missing plugins, or wrong argument types fail silently. Debug mode logs warnings to the console so you can catch issues immediately.

> **Sub-elements:** Many animations look for child elements inside each card to render shadows, impact bursts, done badges, and strikethrough effects. Add these four divs inside each card element:
>
> | Class | Used by | Purpose |
> |-------|---------|---------|
> | `.fx-shadow` | Thud lift/fall animations | Drop shadow that scales during lift and spreads on impact |
> | `.fx-burst` | Impact animations | Radial glow burst on landing |
> | `.fx-badge` | Completion animations | "Done" badge popup |
> | `.fx-strike` | Completion animations | Strikethrough line across the card |
>
> These are **optional** — animations still play without them, but the visual effects will be incomplete (no shadow during lifts, no burst on impact, etc.). The selectors are configurable via `FX.configure({ selectors: { shadow: '.my-shadow', ... } })`.

### ESM equivalent

```javascript
import { createEngine, createDotgrid, FX } from 'toto-fx';
import { thudPlugin } from 'toto-fx/plugins/thud';

const engine = createEngine({
  resolveElement: (key) => document.querySelector(`[data-id="${key}"]`),
});

engine.use(thudPlugin);

const grid = createDotgrid({ container: '#bg', baseOpacity: 0.15 });
grid.init();
FX.setDotgrid(grid);

engine.init();

// One-shot animation (takes a DOM element)
const card = document.querySelector('[data-id="task-1"]');
engine.play('action', card, {
  params: { style: 'thud', variant: 'anime-slam' },
});

// Persistent animation (takes a key string — engine resolves the element)
engine.set('persist', 'task-1', { style: 'ambient', variant: 'glow' });

// Clear it later
engine.clear('persist', 'task-1');
```

## Core Concepts

### State Store

Each engine instance has its own isolated state store. Multiple engines on the same page (e.g., a main content area and a modal) won't collide — each gets independent state, observers, and reconciliation:

```javascript
var mainEngine = TotoFX.createEngine({ root: document.getElementById('main') });
var modalEngine = TotoFX.createEngine({ root: document.getElementById('modal') });

// Same key, different engines — no collision
mainEngine.set('persist', 'item-1', { style: 'ambient', variant: 'glow' });
modalEngine.set('persist', 'item-1', { style: 'rich', variant: 'snake-border' });
```

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

The reconciler has error boundaries: if a plugin's `play()` function throws, the error is logged (in debug mode) and reconciliation continues for the remaining entries. One broken plugin won't kill all animations.

The DOM observer also watches for `data-anim-id` attribute changes, catching morph engines that patch elements in-place (e.g., idiomorph) rather than replacing them entirely.

### Animation Handle (`ANIM_KEY`)

When the reconciler starts a persistent animation, it stores a tracking handle on the element using a Symbol key (`ANIM_KEY`). This handle contains:

- `_fxVersion` — the state version when this animation was applied
- `_fxCategory` — which category owns this animation
- `_fxStyle` — the style name

The reconciler uses `_fxVersion` to avoid re-applying animations unnecessarily. On each reconciliation pass, it compares the handle's version to the state's version — if they match, the element is skipped. If they differ (or no handle exists), the reconciler calls `stop()` on the old animation then `play()` for the new state.

**For category authors:** If your `play()` function sets `el[ANIM_KEY]`, the reconciler will track versions automatically. If you don't set it, `play()` will be called on every DOM mutation (harmless for idempotent CSS class operations, but wasteful). For persistent animations, setting the handle is recommended:

```javascript
import { ANIM_KEY } from 'toto-fx';

engine.registerCategory('glow', {
  play: (el, params) => {
    el.classList.add('glowing');
    el[ANIM_KEY] = { type: 'css', category: 'glow' };
  },
  stop: (el) => {
    el.classList.remove('glowing');
  },
});
```

The reconciler augments your handle with `_fxVersion`, `_fxCategory`, and `_fxStyle` after `play()` returns — you don't need to set those yourself.

### When `play()` Is Called

Your `play()` function is called in these situations:

1. **`engine.set(category, key)`** — immediate reconciliation for that key
2. **DOM mutation** — when `MutationObserver` detects structural changes, the reconciler runs a full pass over all persistent state and calls `play()` on any element that needs it
3. **`engine.reconcile()`** — manual reconciliation trigger
4. **Tab becomes visible** — re-reconciles on `visibilitychange`

The `params.elapsed` value tells you how many milliseconds have passed since the animation state was first set. On the initial `set()` call, `elapsed` will be near zero. On subsequent calls (after DOM mutations), `elapsed` will be the time since the original `set()`. Use this for **phase continuity** — setting a negative `animation-delay` on CSS animations so they resume at the right point rather than restarting from the beginning.

### When `stop()` Is Called

Your `stop()` function is called in these situations:

1. **`engine.clear(category, key)`** — user explicitly clears the animation state
2. **Reconciler re-application** — before calling `play()` with updated state (e.g., version changed)
3. **DOM element removed** — cleanup via `MutationObserver` (category stop fires if the animation handle was set)

The `stop` callback should be the inverse of `play` — remove classes, clear inline styles, cancel timers. Without `stop`, `engine.clear()` removes internal state but leaves the visual effect on the element.

### Engine Events

The engine emits lifecycle events you can subscribe to for debugging, progress tracking, or coordinating with external systems:

```javascript
engine.on('animationStart', function (e) {
  console.log(e.type + ' ' + e.category + '/' + e.key + ' started');
});

engine.on('animationEnd', function (e) {
  console.log(e.category + '/' + e.key + ' ended');
});

engine.on('reconcile', function (e) {
  console.log(e.persistentCount + ' persistent, ' + e.transientCount + ' transient');
});
```

Three events are available:

| Event | Data | Fires when |
|-------|------|------------|
| `animationStart` | `{ type, category, key, element }` | `set()` or `play()` starts an animation |
| `animationEnd` | `{ type, category, key, element }` | `clear()` or `onDone()` ends an animation |
| `reconcile` | `{ persistentCount, transientCount }` | A reconciliation pass completes |

Listener errors are caught internally and never break the engine. Unsubscribe with `engine.off(event, fn)`.

For full documentation with use cases, see [docs/engine-events.md](docs/engine-events.md).

### Accessibility

The engine supports `prefers-reduced-motion` via the `reducedMotion` config option:

```javascript
var engine = TotoFX.createEngine({
  reducedMotion: 'respect', // default: 'ignore'
});
```

When set to `'respect'`, the engine checks the user's system preference and passes `reducedMotion: true` to every plugin `play()` call. Plugins should skip particles, screen shake, and flashes when this flag is set, falling back to simpler alternatives like opacity fades.

For plugin author guidelines and implementation details, see [docs/accessibility.md](docs/accessibility.md).

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
| `reducedMotion` | `boolean` | `true` when the user prefers reduced motion and the engine is configured with `reducedMotion: 'respect'`. Plugins should skip particles, shake, and flash when this is `true`. |

### register() vs registerCategory()

**`engine.register(category, style, variants)`** is the standard way to add animations. It stores a map of variant plugin objects and auto-creates the dispatch logic so `engine.play()`, `engine.set()`, and `engine.clear()` all work immediately. All built-in plugins use this.

```javascript
// Register variants under a category and style
engine.register('action', 'thud', {
  'anime-slam': { name: 'anime-slam', play: (el, ctx) => { ... }, cleanup: (el) => { ... } },
  'meteor':     { name: 'meteor',     play: (el, ctx) => { ... }, cleanup: (el) => { ... } },
});

// Now these just work:
engine.play('action', el, { params: { style: 'thud', variant: 'anime-slam' } });
engine.set('persist', 'item-1', { style: 'ambient', variant: 'glow' });
engine.clear('persist', 'item-1');
```

Multiple `register()` calls for the same category are fine -- for example, the thud and cute plugins both register under `'action'`. The engine dispatches by looking up `category → style → variant` at call time.

**`engine.registerCategory(name, descriptor)`** is for custom one-off categories where you write your own `play` function directly. You don't need this for built-in plugins.

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

### [Plugins](https://github.com/a-funk/toto-fx/blob/main/docs/plugin-guide.md)

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

Each plugin exposes a global. Load the core first, then plugins, then install them with `engine.use()`:

```html
<script src="dist/toto-fx.min.js"></script>
<script src="dist/plugins/thud.min.js"></script>
<script src="dist/plugins/cute.min.js"></script>
<script src="dist/plugins/death.min.js"></script>
<script src="dist/plugins/creation.min.js"></script>
<script src="dist/plugins/in-progress.min.js"></script>
<script>
  var engine = TotoFX.createEngine({ ... });

  engine.use(TotoFXThud);
  engine.use(TotoFXCute);
  engine.use(TotoFXDeath);
  engine.use(TotoFXCreation);
  engine.use(TotoFXInProgress);

  engine.init();
</script>
```

Plugin globals reference:

| Plugin | ESM import path | IIFE global |
|--------|----------------|-------------|
| Thud (action) | `toto-fx/plugins/thud` | `TotoFXThud` |
| Cute (action) | `toto-fx/plugins/cute` | `TotoFXCute` |
| Destroy (action) | `toto-fx/plugins/death` | `TotoFXDeath` |
| Creation (enter) | `toto-fx/plugins/creation` | `TotoFXCreation` |
| In-Progress (persist) | `toto-fx/plugins/in-progress` | `TotoFXInProgress` |

### Quickstart with built-in plugins

Load a plugin, install it, play animations. `engine.use()` calls `engine.register()` internally, which wires up the category, style, and variant dispatch automatically.

```html
<script src="dist/toto-fx.min.js"></script>
<script src="dist/plugins/thud.min.js"></script>
<script src="dist/plugins/in-progress.min.js"></script>
<script>
  var engine = TotoFX.createEngine({
    resolveElement: function (key) {
      return document.querySelector('[data-id="' + key + '"]');
    },
  });

  engine.use(TotoFXThud);
  engine.use(TotoFXInProgress);
  engine.init();

  // One-shot animation (takes an element)
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('click', function () {
      engine.play('action', card, {
        params: { style: 'thud', variant: 'anime-slam' },
      });
    });
  });

  // Persistent animation (takes a key string — engine resolves the element)
  engine.set('persist', 'task-1', { style: 'ambient', variant: 'glow' });

  // Clear it later
  engine.clear('persist', 'task-1');
</script>
```
### Write your own plugin in 60s
```javascript
  const myPlugin = {
    name: 'pulse',
    category: 'persist',
    style: 'custom',

    params: {
      scale: { type: 'range', min: 1.0, max: 1.5, default: 1.1, step: 0.05 },
    },

    play(el, ctx) {
      const p = FX.resolveParams(this.params, ctx.params);
      el.style.animation = `pulse ${400 / ctx.speed}ms ease-in-out infinite`;
      el.__pulseStyle = document.createElement('style');
      el.__pulseStyle.textContent = `
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(${p.scale}) } }
      `;
      document.head.appendChild(el.__pulseStyle);
      // persistent animations don't call onDone
    },

    cleanup(el) {
      el.style.animation = '';
      if (el.__pulseStyle) { el.__pulseStyle.remove(); el.__pulseStyle = null; }
    },
  };

  engine.use({ categories: { persist: { play: myPlugin.play } } });
```

**IIFE / script tag:** Register a custom variant under an existing category:

```html
<script src="toto-fx.min.js"></script>
<script>
  var engine = TotoFX.createEngine({ helpers: TotoFX.FX });

  var myVariant = {
    name: 'sparkle-burst',
    play: function (el, ctx) {
      var FX = ctx.helpers;
      var rect = el.getBoundingClientRect();
      FX.spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, {
        count: 40, spread: 10, chars: ['*', '+', '\u2726'],
      });
      if (ctx.onDone) ctx.onDone();
    },
    cleanup: function (el) { /* reset styles if needed */ },
  };

  engine.register('action', 'custom', { 'sparkle-burst': myVariant });
</script>
```

## Built-in Animation Variants

59 animations across 3 categories. The **category**, **style**, and **variant** are the three values you pass to `play()` or `set()`:

```javascript
engine.play(category, el, { params: { style: style, variant: variant } });
engine.set(category, key, { style: style, variant: variant });
```

### Quick reference

| Category | Style | Variants |
|----------|-------|----------|
| `action` | `thud` | `anime-slam`, `low-bounce`, `stratosphere`, `orbit-slam`, `crater`, `deep-crater`, `meteor`, `detonation`, `nuclear`, `shatter` |
| `action` | `cute` | `confetti`, `flowers`, `sparkle`, `shooting-star`, `butterflies`, `rainbow`, `fireworks`, `hearts`, `cat`, `dog`, `snowfall`, `ocean`, `fireflies` |
| `action` | `destroy` | `explode`, `incinerate`, `shredder`, `guillotine`, `heartbeat`, `sniper`, `eaten`, `lightning`, `steamroller`, `piranhas`, `woodchipper` |
| `enter` | `subtle` | `fade-in`, `slide-in`, `unfold`, `typewriter`, `rise` |
| `enter` | `dramatic` | `slam-down`, `scale-bounce`, `materialize`, `portal`, `glitch-in` |
| `enter` | `fun` | `confetti-drop`, `sparkle-trail`, `butterfly-carry`, `bounce-in`, `grow` |
| `persist` | `ambient` | `glow`, `pulse`, `colored-border`, `shimmer`, `breathing` |
| `persist` | `rich` | `snake-border`, `particle-orbit`, `corner-accents`, `heartbeat`, `progress-bar` |

### Action (completion and destruction)

**Thud** (10 variants): anime-slam, low-bounce, stratosphere, orbit-slam, crater, deep-crater, meteor, detonation, nuclear, shatter

**Cute** (13 variants): confetti, flowers, sparkle, shooting-star, butterflies, rainbow, fireworks, hearts, cat, dog, snowfall, ocean, fireflies

**Destroy** (11 variants): explode, incinerate, shredder, guillotine, heartbeat, sniper, eaten, lightning, steamroller, piranhas, woodchipper

### Enter (creation)

**Subtle** (5): fade-in, slide-in, unfold, typewriter, rise

**Dramatic** (5): slam-down, scale-bounce, materialize, portal, glitch-in

**Fun** (5): confetti-drop, sparkle-trail, butterfly-carry, bounce-in, grow

### Persist (in-progress)

**Ambient** (5): glow, pulse, colored-border, shimmer, breathing

**Rich** (5): snake-border, particle-orbit, corner-accents, heartbeat, progress-bar

### Variant options

Every built-in variant has tunable parameters. Pass them via `opts.params`:

```javascript
engine.play('action', el, {
  params: {
    style: 'thud',
    variant: 'anime-slam',
    // Variant-specific tuning:
    peakZ: 450,        // lift height (px)
    liftDur: 350,      // lift duration (ms)
    fallDur: 200,      // fall duration (ms)
    fallExp: 3,        // fall easing curve
    particles: 40,     // particle count
    spread: 8,         // particle spread
    particleSize: 6,   // particle size
    gravity: 0.15,     // gravity strength
  },
});
```

All variants define their params with `{ min, max, default, step, unit, group }`. You can inspect them at runtime:

```javascript
// Works in both ESM and IIFE — query the engine directly
const styles = engine.getStyles('action');                       // ['thud', 'cute', 'destroy']
const variants = engine.getVariants('action', 'thud');           // ['anime-slam', 'low-bounce', ...]
const params = engine.getParams('action', 'thud', 'anime-slam');
// → { peakZ: { min: 100, max: 1000, default: 450, ... }, liftDur: { ... }, ... }
```

The full parameter manifest is in `src/animations-manifest.json`.

### A note on the params shape

The `play` callback receives a `params` object that contains a `.params` sub-property for variant-specific values:

```javascript
engine.registerCategory('action', {
  play: function (el, params) {
    params.onDone;           // completion callback
    params.style;            // 'thud'
    params.variant;          // 'anime-slam'
    params.params;           // { peakZ: 450, liftDur: 350, ... }
    params.params.peakZ;     // 450
  },
});
```

Yes, `params.params` reads awkwardly. The outer `params` is the engine's execution context (onDone, style, variant, key, groupId). The inner `.params` is the variant-specific tuning values. We chose this over a flat merge to avoid key collisions between engine fields and variant params.

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
grid.ripple(400, 300, { radius: 200, push: 10, density: 0.6, color: '#C45A3C' });
grid.vortex(400, 300, { radius: 150, speed: 2, pull: 0.3, direction: 'cw' });
grid.crater(400, 300, 100, 1, { cracks: 6, crackLength: 220 });
grid.nuclear(400, 300, { blastRadius: 250, color: '#C45A3C' });
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
FX.doDotgridRipple(400, 300, { radius: 200, push: 10, density: 0.6 });
FX.doDotgridCrater(400, 300, 100, 1, { cracks: 6 });
FX.doDotgridNuclear(400, 300, { blastRadius: 250 });
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
  color: [255, 100, 50],                // [r,g,b] or CSS string
  chars: ['*', '+', '#'],               // ASCII characters
  spread: 8,           // max velocity magnitude
  gravity: 0.15,       // downward pull per frame
  life: 80,            // lifetime in frames
  upBias: 3,           // initial upward velocity bias
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
FX.doDotgridRipple(cx, cy, { radius: 200, push: 10, density: 0.6 });
FX.doDotgridCrater(cx, cy, 100, 1, { cracks: 6 });
FX.doDotgridNuclear(cx, cy, { blastRadius: 250 });
FX.doDotgridScorch(x1, y1, x2, y2, 40);
FX.resetDotgrid();                          // clear all fluid sim state

// Card animation helpers (physics-based)
FX.liftCard(el, shadow, cx, cy, peakZ, duration, rotX, rotY, onDone);
FX.gravityFall(el, shadow, peakZ, rotX, rotY, duration, easeExp, cx, cy, onImpact);
FX.standardImpact(el, shadow, burst, cx, cy);

// Element helpers
const pos = FX.getItemRect(el);         // { cx, cy, rect: DOMRect }
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
| `debug` | `boolean` | `true` | Enable console warnings for common mistakes (wrong arg types, unregistered categories, detached elements). Pass `false` to silence in production. |
| `layoutEasing` | `string` | `'ease-out'` | Layout animation CSS easing |
| `debounceMs` | `number` | `100` | Refresh coordinator debounce window (ms). Lower = more responsive, higher = fewer DOM swaps during rapid state changes. |
| `reducedMotion` | `'respect' \| 'ignore'` | `'ignore'` | When `'respect'`, checks `prefers-reduced-motion` media query and passes `reducedMotion: true` to all `play()` contexts. Plugins can use this to skip particles, screen shake, and other non-essential effects. |

### Engine Methods

#### State Management

| Method | Description |
|--------|-------------|
| `engine.set(category, key, params?)` | Set persistent animation state |
| `engine.clear(category, key?)` | Clear persistent animation state. Omit `key` to clear all active animations in the category. |
| `engine.clearAll()` | Clear everything — all persistent animations, all transient state, and reset the dotgrid (requires `engine.setDotgrid(grid)`). |
| `engine.setDotgrid(grid)` | Set the dotgrid instance so `clearAll()` can reset it. |
| `engine.isActive(category, key)` | Check if key has active persistent animation |
| `engine.getActiveKeys(category)` | Get all active keys for a category |
| `engine.play(category, el, opts?)` | Play a one-shot animation (takes a DOM element) |
| `engine.transition(key, toCategory, opts?)` | Transition from persistent to one-shot |
| `engine.resolveElement(key)` | Resolve a key string to a DOM element using the configured resolver |

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

#### Events

| Method | Description |
|--------|-------------|
| `engine.on(event, fn)` | Subscribe to a lifecycle event. Events: `'animationStart'`, `'animationEnd'`, `'reconcile'`. |
| `engine.off(event, fn)` | Unsubscribe from a lifecycle event. |

Event data shapes:

- **`animationStart`** / **`animationEnd`**: `{ type: 'persistent'|'transient', category, key, element }`
- **`reconcile`**: `{ persistentCount, transientCount }`

Listener errors are caught internally and never break the engine.

```javascript
engine.on('animationStart', (e) => {
  console.log(`${e.type} animation started: ${e.category}/${e.key}`);
});

engine.on('reconcile', (e) => {
  console.log(`Reconciled: ${e.persistentCount} persistent, ${e.transientCount} transient`);
});
```

#### Queries

| Method | Description |
|--------|-------------|
| `engine.isAnimating(groupId?)` | Check if transient animations are in flight |
| `engine.getStyles(category)` | List registered style names for a category |
| `engine.getVariants(category, style)` | List registered variant names for a category and style |
| `engine.getParams(category, style, variant)` | Get tunable parameter descriptors for a variant |

```javascript
// Discover what's available at runtime (works in both ESM and IIFE):
engine.getStyles('action');                        // ['thud', 'cute', 'destroy']
engine.getVariants('action', 'thud');              // ['anime-slam', 'low-bounce', ...]
engine.getParams('action', 'thud', 'anime-slam');  // { peakZ: { min: 100, max: 1000, ... }, ... }
```

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
import { createStateStore } from 'toto-fx';  // isolated state store factory
import { createDOMObserver } from 'toto-fx'; // isolated DOM observer factory
import { ANIM_KEY } from 'toto-fx';          // Symbol key for animation handles on elements
import { createReconciler } from 'toto-fx';
import { createRefreshCoordinator } from 'toto-fx';
import { createLayoutAnimator } from 'toto-fx';
import { FX } from 'toto-fx';               // particle systems, physics
import { createDotgrid } from 'toto-fx';     // fluid simulation
import { AnimationRegistry } from 'toto-fx'; // variant store
import { AnimationSettings } from 'toto-fx'; // localStorage persistence
import { PresetSchema } from 'toto-fx';      // preset validation

// Backwards-compatible singletons (deprecated -- prefer factory functions)
import { StateStore } from 'toto-fx';
import { DOMObserver } from 'toto-fx';
```

## TypeScript

Type definitions ship at `types/index.d.ts` and are referenced in `package.json`. TypeScript and IDE autocompletion works automatically after `npm install toto-fx`.

## Examples

- [examples/index.html](examples/index.html) — Minimal getting-started page with three cards and the thud plugin

### Three.js compatibility demos

TotoFX's 2D FX layer composites cleanly over a Three.js WebGL scene via the body/overlay pattern — see [examples/threejs-meteor/](examples/threejs-meteor/) for the blueprint. Every demo below is a single HTML file with no build step; open any folder's `index.html` over a static server.

- [examples/threejs-meteor/](examples/threejs-meteor/) — **Blueprint.** Meteor falls from 3D space, hand-wired `FX.*` helpers fire on impact (dotgrid ripple, speed lines, flash, shake, particles) while WebGL handles the 3D shockwave, debris, and scorch decals.
- [examples/threejs-anime-slam/](examples/threejs-anime-slam/) — **Katana × bamboo.** Click-and-drag the katana to slice through bamboo stalks; each cut splits the stalk at the blade's intersection height. Anime impact frame (black flash → white burst) fires on every contact.
- [examples/threejs-nuke/](examples/threejs-nuke/) — **Nuke drop.** Missile falls on a grid of buildings; detonation radially launches buildings outward with physics while TotoFX runs `doDotgridNuclear`, white-out flash, heavy shake, mushroom-cloud particles.
- [examples/threejs-explode/](examples/threejs-explode/) — **Red barrel.** Explosive barrel detonates into shrapnel, 3D fireball, scorch decal; FX tuned to the `destroy/explode` variant (orange flash, cracks, debris glyphs).
- [examples/threejs-sniper/](examples/threejs-sniper/) — **Long-range shot.** FPS scope view with reticle + vignette and natural breath sway; `raycast` from center of camera picks the target. Hits fire pinpoint FX (inward speed lines, small ripple, red flash), misses dust.
- [examples/threejs-hearts/](examples/threejs-hearts/) — **Heart burst.** 3D extruded heart pulses at center; clicking scatters a cloud of floating 3D hearts upward while `cute/hearts` character FX overlay (pink ripple, ♥/♡ particles).
- [examples/threejs-fireworks/](examples/threejs-fireworks/) — **Click-to-launch.** Mortar ascends from the ground to where you clicked in the sky, detonates into a 3D particle burst; TotoFX matches with colored flash, gentle ripple, and palette-tinted character particles.
- [examples/threejs-clicker/](examples/threejs-clicker/) — **Game.** A speed-clicker where every click fires a tier-appropriate TotoFX variant. Tiers escalate `cute/sparkle` → `thud/anime-slam` → `thud/crater` → `thud/meteor` → `destroy/explode` → INSANITY (black anime-flash every 10 clicks past 100). 10s / 30s / 60s modes with per-duration best-score persistence in `localStorage`. Uses a ghost-card technique so `destroy` variants can fire without removing the real clickable card.

## Further Reading

- [docs/variant-cheatsheet.md](docs/variant-cheatsheet.md) -- All 59 animation variants with descriptions
- [docs/fx-api.md](docs/fx-api.md) -- FX utilities API reference (all 50+ exports)
- [docs/dotgrid.md](docs/dotgrid.md) -- Dotgrid fluid simulation deep dive
- [docs/plugin-guide.md](docs/plugin-guide.md) -- Writing custom plugins
- [docs/engine-events.md](docs/engine-events.md) -- Engine lifecycle events (on/off API)
- [docs/accessibility.md](docs/accessibility.md) -- Reduced motion support and plugin guidelines
- [docs/migration-v1.1.md](docs/migration-v1.1.md) -- Migrating from v1.0 to v1.1

## Browser Support

ES2020+ (Chrome 80+, Firefox 78+, Safari 14+, Edge 80+).

Uses `WeakRef`, `MutationObserver`, `requestAnimationFrame`, `Map`, `Set`.

## Acknowledgments

TotoFX's dotgrid fluid simulation is built on rendering techniques from [pretext](https://github.com/chenglou/pretext) by Cheng Lou. The Semi-Lagrangian advection approach to text-based UI rendering was the direct inspiration for the engine's background system.

## Security Model

TotoFX includes a `PluginLoader` that dynamically loads JavaScript files via `<script>` tag injection. This is by design — it enables runtime plugin discovery for IIFE/CDN deployments. **You should understand the trust implications.**

### What PluginLoader does

`PluginLoader.load(builtins, opts)` creates `<script src="...">` elements for each URL you pass it (via the `builtins` array or a manifest endpoint response). It does **not** validate, sanitize, or restrict these URLs. The caller controls what gets loaded.

### Who controls the inputs

- **`builtins` array**: You, the developer. These are URLs you pass directly in your code.
- **`opts.manifestUrl` response**: Whatever server responds to that URL. If you point the manifest at your own API, you control it. If the endpoint is compromised or MITM'd, an attacker could inject arbitrary script URLs.
- **`opts.validateUrl` callback**: Optional — you provide a function that gates each URL before injection.

### Recommendations

1. **Use a Content Security Policy.** CSP `script-src` is the browser-level control for which domains can serve executable scripts. At minimum, restrict to `'self'` and any specific CDN origins you use:
   ```
   Content-Security-Policy: script-src 'self' https://unpkg.com/toto-fx@1.0.0/;
   ```

2. **Use Subresource Integrity (SRI) for CDN-loaded scripts.** PluginLoader supports `{url, integrity}` objects — when integrity is provided, the browser verifies the script hash before execution:
   ```javascript
   PluginLoader.load([
     { url: 'https://cdn.example.com/plugin.js', integrity: 'sha384-...' },
   ]);
   ```

3. **Use `opts.validateUrl` for dynamic manifests.** If your manifest endpoint returns URLs you don't fully control, provide a validation callback:
   ```javascript
   PluginLoader.load([], {
     manifestUrl: '/api/plugins',
     validateUrl: (url) => url.startsWith('/') || url.startsWith('https://my-cdn.com/'),
   });
   ```

4. **For ESM usage, you don't need PluginLoader at all.** Import plugins directly — no dynamic script injection involved:
   ```javascript
   import { thudPlugin } from 'toto-fx/plugins/thud';
   engine.use(thudPlugin);
   ```

### What this means for the npm security flag

Automated scanners flag `document.createElement('script')` with variable `src` as a potential injection vector. This is architecturally identical to every CDN-based module loader, `importmap`, and module federation setup. The PluginLoader is a developer-facing utility — not an end-user-facing API. The security boundary is your CSP and the trust you place in the URLs you provide.

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE), at your option.
