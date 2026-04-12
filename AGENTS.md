# AGENTS.md

Context for AI coding agents working on this codebase.

## What This Is

TotoFX is a standalone animation engine for web UIs. It was extracted from [Toto](https://toto.up.railway.app) (a task management app) and open-sourced as an independent library. The engine uses a State-Driven Rendering Architecture (SDRA) — you set animation state, the engine reconciles it against the DOM.

The dotgrid fluid simulation background is built on techniques from [pretext](https://github.com/chenglou/pretext) by Cheng Lou (Semi-Lagrangian advection applied to text rendering).

## Architecture

```
src/
  index.js              Main ESM entry point (re-exports everything)
  engine.js             Core engine: createEngine() factory, state management,
                        category registration, plugin system, reconciliation
  state-store.js        Persistent + transient animation state (Map-based)
  dom-observer.js       MutationObserver wrapper, coalesces to 1x/frame
  reconciler.js         State-to-DOM sync with phase continuity
  refresh-coordinator.js Debounced, animation-aware content refresh
  layout-animator.js    Smooth container height transitions
  registry.js           AnimationRegistry (variant store), AnimationSettings
                        (localStorage persistence), AnimationContext (context builder)
  fx.js                 FX utilities: particles, physics (lift/fall/impact),
                        screen effects (shake/flash), canvas rendering, dotgrid wiring
  dotgrid.js            Semi-Lagrangian fluid simulation on canvas. 5 effects:
                        ripple, vortex, crater, nuclear, scorch
  theme.js              Theme manager: 6 built-in themes, custom themes, CSS vars
  preset.js             Preset schema: validation, normalization, sharing
  defaults.js           Production default configuration
  plugin-loader.js      Dynamic script loading for IIFE plugin discovery
  types.js              JSDoc type definitions (no runtime code)

  plugins/
    thud.js             10 action variants (slam, crater, meteor, nuclear, ...)
    death.js            11 destroy variants (explode, shredder, piranhas, ...)
    cute.js             13 action variants (confetti, fireworks, hearts, ...)
    creation.js         15 enter variants (fade-in, portal, glitch-in, ...)
    in-progress.js      10 persist variants (glow, pulse, snake-border, ...)
    examples/
      vortex-spiral.js  Example plugin demonstrating the full plugin contract

  themes/               6 built-in theme JSON files + schema
  animations-manifest.json  Full variant metadata with tunable param descriptors
```

## Key Concepts

**Categories** are the top-level animation types: `action`, `destroy`, `enter`, `persist`, `container`, `containerExit`. Each has a `play(el, params)` function. Register with `engine.registerCategory()`.

**Variants** are specific animations within a category. The `thud` style has `anime-slam`, `meteor`, `nuclear`, etc. Register with `engine.register(category, style, variants)` or via plugins.

**Persistent vs Transient**: `engine.set()` creates persistent state (survives DOM mutations). `engine.play()` fires a one-shot transient animation. The reconciler handles re-applying persistent animations when the DOM changes.

**FX + Dotgrid wiring**: If using both, call `FX.setDotgrid(dotgridInstance)` after creating both. Without this, FX dotgrid helpers silently no-op.

**Plugin contract**: `{ name, category, style, meta, params, play(el, ctx), cleanup(el) }`. Plugins register via `engine.use(plugin)` or `install(registry)`. The `ctx` object contains `intensity`, `speed`, `params`, `onDone`, `helpers` (FX reference).

## Build

```bash
npm install
npm run build    # Produces dist/ with ESM + IIFE bundles
npm test         # 72 tests via node:test
```

Build outputs:
- `dist/toto-fx.esm.js` — Full ESM bundle (~74KB)
- `dist/toto-fx.min.js` — Full IIFE bundle (exposes `window.TotoFX`)
- `dist/core.esm.js` — Engine only (~12KB)
- `dist/fx.min.js` — FX utilities IIFE (`window.TotoFXUtils`)
- `dist/dotgrid.min.js` — Dotgrid IIFE (`window.TotoFXDotgrid`)
- `dist/plugins/*.min.js` — Individual plugin IIFEs (`window.TotoFXThud`, etc.)

## Code Style

- `const`/`let` throughout (no `var`)
- ES2020 target (esbuild transpiles)
- JSDoc for type annotations
- No external runtime dependencies
- Plugins use `const fx = ctx.helpers || FX` pattern for DI
- All localStorage keys prefixed `toto_fx_*`
- All CSS classes prefixed `fx-*` or `tfx-*`
- DOM element marker property: `el.__totoAnimation`

## Animation Categories

| Category | Old Name (Toto internal) | Purpose |
|----------|--------------------------|---------|
| `action` | completion | Task completed, item acted on |
| `destroy` | deletion | Item removed/deleted |
| `enter` | creation | New item appears |
| `persist` | inProgress | Long-running state indicator |
| `container` | list | Container-level animation |
| `containerExit` | listExit | Container removal |

If you see any references to the old names (`completion`, `deletion`, `creation`, `inProgress`, `list`, `listExit`) in source code, that's a bug — fix it.

## Testing

```bash
node --experimental-vm-modules --test tests/core.test.js
```

Tests use Node's built-in test runner with polyfills for `performance`, `localStorage`, and `document`. Tests cover StateStore, createEngine, AnimationRegistry, and createSettings. FX, dotgrid, and plugins are not tested yet (DOM-dependent).

## Common Tasks

**Adding a new animation variant**: Create a plugin object following the contract in `src/plugins/examples/vortex-spiral.js`. Register it with `engine.use()` or `AnimationRegistry.registerCategory()`.

**Adding a new theme**: Create a JSON file in `src/themes/` following `theme-schema.json`. Add the theme ID to `BUILTIN_THEMES` in `src/theme.js`.

**Modifying the engine**: Core is in `src/engine.js`. The `createEngine()` factory returns the full API. State lives in `src/state-store.js`. DOM observation in `src/dom-observer.js`. Reconciliation in `src/reconciler.js`.

**FX utilities**: All in `src/fx.js`. To add a new effect, export the function and add it to the `FX` convenience object at the bottom of the file.

## Do Not

- Reference Toto-specific DOM selectors (`.todo-*`, `data-item-id`, `data-list`, `.app-shell`)
- Hardcode localStorage keys without the `toto_fx_` prefix
- Use `var` declarations (project uses `const`/`let`)
- Add external runtime dependencies
- Reference `window.__TOTO_DEFAULTS__` or `window.TotoFX` in source (ESM imports only)
- Use old category names (completion/deletion/creation/inProgress)

## Docs

- `docs/fx-api.md` — FX utilities API reference
- `docs/dotgrid.md` — Fluid simulation deep-dive
- `docs/plugin-guide.md` — Plugin authoring guide
- `README.md` — Getting started, API reference, examples

## License

Dual MIT / Apache 2.0.
