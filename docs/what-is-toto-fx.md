# What is TotoFX?

TotoFX is a state-driven animation engine for web UIs. It manages the relationship between application state and visual effects — you declare what should be animated, and the engine handles when and how elements animate, even across DOM mutations, page navigations, and concurrent updates.

## The Core Problem

Web animations are typically imperative: "animate this element now." This breaks down when:

- The DOM is rebuilt by a framework (React re-render, htmx swap, Turbo frame)
- Multiple animations target the same element simultaneously
- Animations need to survive across page state changes
- You want persistent visual states (a glowing item, an orbiting particle effect) that automatically reattach when elements reappear

TotoFX solves this with a state-driven approach: instead of triggering animations directly on elements, you set animation state on keys. The engine reconciles that state against the DOM continuously, starting and stopping animations as elements appear, disappear, and change.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Your App (React, Vue, Svelte, htmx, etc.)  │
│                                             │
│  engine.set('persist', 'item-42', {         │
│    style: 'ambient', variant: 'glow'        │
│  });                                        │
└────────────────────┬────────────────────────┘
                     │
              ┌──────▼──────┐
              │ State Store  │  key → { category, style, variant, params }
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ DOM Observer │  watches for mutations via MutationObserver
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ Reconciler   │  matches state entries to DOM elements
              │              │  starts/stops animations on elements
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼───┐  ┌────▼───┐  ┌───▼────┐
    │ Plugin │  │ Plugin │  │ Plugin │  animation variants
    │ (thud) │  │ (cute) │  │ (glow) │  play(el, ctx) / cleanup(el)
    └────────┘  └────────┘  └────────┘
```

### Two Types of Animation

**Persistent** — long-running, state-based. A glowing border, orbiting particles, a pulsing highlight. Set with `engine.set(category, key, state)`, cleared with `engine.clear(category, key)`. Survives DOM rebuilds — if the element is removed and re-added, the animation reattaches automatically.

**Transient** — one-shot, element-based. An impact slam, a confetti burst, a destruction effect. Triggered with `engine.play(category, element, opts)`. Runs once, calls `onDone`, done.

### The Reconciler

The reconciler is the engine's core loop. When the DOM changes (or state changes), it:

1. Iterates all persistent state entries
2. Resolves each key to a DOM element via `resolveElement(key)`
3. If the element exists and isn't already animating → starts the animation
4. If the element disappeared → stops the animation, preserves the state for reattachment
5. If the state was cleared → stops the animation and cleans up

This runs automatically on every MutationObserver callback. No manual wiring needed.

## The Plugin System

TotoFX ships with 59 animation variants across 5 plugin bundles. But the plugin contract is simple enough that AI coding assistants can generate new ones from a prompt.

### Animation Plugin

A plugin is an object with `play()` and `cleanup()`:

```javascript
export const myEffect = {
  name: 'my-effect',
  category: 'action',
  style: 'custom',
  params: {
    duration: { type: 'range', min: 200, max: 2000, default: 800, unit: 'ms' },
    intensity: { type: 'range', min: 1, max: 10, default: 5 },
  },
  play: function (el, ctx) {
    // ctx.params — resolved parameters
    // ctx.onDone — call when animation completes
    // ctx.dotgridEffect — trigger dotgrid effects (IIFE-safe)
    // ctx.intensity, ctx.speed — global modifiers
  },
  cleanup: function (el) {
    // Restore element to pre-animation state
    el.style.transform = '';
    el.style.opacity = '';
  },
};
```

Register with `engine.use(plugin)`. The engine handles category registration, variant lookup, and lifecycle management.

### Dotgrid Effect Plugin

The dotgrid is a canvas-based fluid simulation that runs behind your UI. Effects inject density, velocity, and color into a grid of cells, and the simulation handles advection, diffusion, and decay.

A dotgrid plugin is even simpler:

```javascript
export const myDotgridEffect = {
  name: 'shockwave',
  run: function (g, args) {
    // g.density, g.velX, g.velY — Float32Array fields
    // g.colorR, g.colorG, g.colorB — Uint8Array color channels
    // g.gridCols, g.gridRows — grid dimensions
    // g.dotSize, g.densityMultiplier — config
    // g.v2g(vx, vy) — viewport pixels to grid coordinates
    // g.expandBbox(c0, c1, r0, r1) — mark active region
    // g.startSim() — kick the render loop
    // g.parseColor('#ff0000') — CSS color to [r, g, b]

    var cx = args.cx, cy = args.cy;
    var opts = args.opts || {};
    // ... inject into density/velocity/color fields ...
    g.startSim();
  },
};
```

Register with `grid.use(plugin)`. The grid provides a context object with getters for all internal state — your effect function receives everything it needs as arguments.

## The Dotgrid Fluid Simulation

The dotgrid is a real fluid simulation, not a particle system or CSS animation. It uses Semi-Lagrangian advection on Float32Arrays with an active-region bounding box for performance.

Each cell in the grid has:
- **Density** (Float32) — how "lit up" the cell is (0-1)
- **Velocity X/Y** (Float32) — flow direction and speed
- **Color R/G/B** (Uint8) — per-cell color

Each frame, the simulation:
1. **Advects** density along velocity (Semi-Lagrangian backtracing)
2. **Diffuses** density to neighbors
3. **Decays** density and velocity toward zero
4. **Renders** active cells as displaced, colored characters on canvas

Effects compose naturally — two overlapping ripples create real interference patterns because they're writing into the same velocity field.

### Frame-by-Frame Rendering

For non-realtime contexts (video rendering, testing), `grid.step()` runs one complete physics + draw cycle without starting the RAF loop. This enables deterministic frame-accurate output in tools like Remotion.

## Framework Agnostic

TotoFX operates on DOM elements directly. It doesn't know or care what framework built the DOM. The `resolveElement(key)` function is the only bridge — map your framework's component keys to DOM elements, and the engine handles the rest.

Framework integration packages (`toto-fx-react`, `toto-fx-vue`, `toto-fx-svelte`) provide idiomatic wrappers, but the core engine works with plain `<script>` tags and `document.querySelector`.

## Bundle Architecture

TotoFX is fully tree-shakeable. Load only what you need:

| Bundle | What it includes |
|--------|-----------------|
| `toto-fx.min.js` (80KB) | Everything — engine, FX, dotgrid, themes, registry |
| `core.esm.js` (15KB) | Engine only — state management, reconciler, no visual effects |
| `dotgrid.min.js` (20KB) | Fluid simulation only |
| `plugins/thud.min.js` (54KB) | 10 impact animation variants |
| `plugins/cute.min.js` (70KB) | 13 playful animation variants |
| `plugins/death.min.js` (70KB) | 10 destruction animation variants |
| `plugins/creation.min.js` (47KB) | 12 enter/creation animation variants |
| `plugins/in-progress.min.js` (16KB) | 14 persistent animation variants |
| `dotgrid-plugins/*.min.js` (2KB each) | Individual dotgrid effects |

Animation plugins bundle their own FX dependency (particles, physics helpers). Dotgrid plugins bundle nothing — they receive the grid context at runtime.
