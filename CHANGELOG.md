# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-04-15

### Unified Particle Pipeline

Three separate canvases (`animation-canvas`, `speed-lines-canvas`, `fx-canvas`) merged into a single unified canvas. One canvas, one RAF loop, one clear per frame.

#### Changed

- **Single canvas** — All rendering (particles, speed lines, FX draw callbacks) draws to `fx-canvas`. `animation-canvas` and `speed-lines-canvas` are no longer created.
- **Single master tick** — `_tickFxDraw` brought into `_masterTick`. All subsystems driven by one RAF loop with unified frame budget monitoring.
- **spawnParticles as FX draw callback** — The particle pool is now a registered FX draw callback. Batch rendering preserved (font-bucket pass). `spawnParticles()` API unchanged.
- **creation.js migrated** — 6 creation variants (materialize, portal, confetti-drop, sparkle-trail, butterfly-carry, grow) converted from direct RAF + `getFxCtx()` to `registerFxDraw()`. Fixes latent bug where interrupted creation animations would wipe the entire FX canvas.
- **Cute alpha values bumped** — 43 manual alpha multipliers across 8 cute variants raised proportionally. Flower petals, butterflies, bees, cats, dogs, snowfall, ocean, fireflies are all more visible, especially on light themes.

#### Deprecated

- `getCanvas()` — Returns the unified canvas with a debug warning. Use `getFxCanvas()` instead.
- `getSpeedCanvas()` — Returns the unified canvas. Speed lines render to the main canvas.

#### Added

- `configure({ debug: true })` — Enables debug mode in the FX module.
- **Debug alpha warning** — `drawChar()` warns (once per char+size) when alpha is below 0.1 in debug mode.
- **Debug budget warning** — Master tick warns when total entity count exceeds device-tier cap (500/200/40) in debug mode.

---

## [0.2.0] - 2026-04-14

### Breaking Changes

- **Destroy category merged into action** — `engine.play('destroy', ...)` is now `engine.play('action', el, { params: { style: 'destroy', ... } })`. All one-shot animations are under a unified `action` category with styles: `thud`, `cute`, `destroy`.
- **Debug default is `false`** — Console warnings are opt-in. Pass `debug: true` to enable during development.
- **Symbol-based animation keys** — DOM animation handles use `ANIM_KEY` symbol instead of string property `__totoAnimation`.

### Added

#### Dotgrid Plugin System
- `grid.use(plugin)` — register dotgrid effect plugins, mirroring `engine.use(plugin)`
- `grid.registerEffect(name, effect)` — register a named effect with a `run(gridCtx, args)` function
- `grid.runEffect(name, args)` — dispatch effects by name (plugin registry + built-in fallback)
- `grid.getEffectNames()` — list all available effects
- Grid context object — plugins receive getters for density/velocity/color Float32Arrays, grid dimensions, config, and helpers (`v2g`, `expandBbox`, `startSim`, `parseColor`)
- 6 standalone dotgrid effect plugins: `ripple` (1.8KB), `vortex` (2.0KB), `crater` (2.5KB), `nuclear` (2.3KB), `scorch` (1.8KB), `heart` (2.6KB) — zero bundled dependencies each
- `grid.step()` — one-shot physics + draw for frame-by-frame rendering (Remotion, tests)

#### Engine API
- `engine.getStyles(category)` — list registered style names
- `engine.getVariants(category, style)` — list registered variant names
- `engine.getParams(category, style, variant)` — get tunable parameter descriptors
- `engine.clear(category)` — omit key to batch-clear all animations in a category
- `engine.clearAll()` — clear all persistent + transient animations + reset dotgrid
- `engine.setDotgrid(grid)` — wire dotgrid instance for `clearAll()` integration
- `engine.dotgridEffect(name, args)` — dispatch dotgrid effects through the engine (IIFE-safe)
- `ctx.dotgridEffect` — injected into animation plugin `play(el, ctx)` context, solving the IIFE bundling problem where plugins can't access the page's dotgrid instance

#### FX Layer
- `FX.doDotgridEffect(name, args)` — generic dispatcher for any registered dotgrid effect
- `FX.doDotgridHeart(cx, cy, opts)` — heart effect wrapper
- `FX.resetDotgrid()` — clear all fluid sim state
- Override switch replaced with `runEffect` dispatch — new dotgrid effects work automatically

#### Engine Core
- Isolated state stores — each `createEngine()` creates its own state, observer, and reconciler
- Engine events — `engine.on('animationStart' | 'animationEnd' | 'reconcile', fn)`
- Reduced motion support — `reducedMotion: 'respect'` config option
- Error boundaries — plugin `play()` errors no longer crash the reconciler
- Category `stop()` callback for cleanup on `clear()`

#### Documentation
- Migration guide: `docs/migration-v1.1.md`
- Engine events reference: `docs/engine-events.md`
- Accessibility guide: `docs/accessibility.md`
- Variant cheatsheet: `docs/variant-cheatsheet.md` (all 59 animations)
- README expanded with engine flow diagram, full API reference, getting started examples

#### Framework Integrations (Community Preview)
- `toto-fx-react` — Provider, hooks (`usePlay`, `usePersist`, `useAnimationRef`, `useDotgridEffect`, `useEngineEvent`), `TotoFXDotgrid` component
- `toto-fx-vue` — Plugin, composables, directives (`v-toto-action`, `v-toto-persist`), `TotoFXDotgrid` SFC
- `toto-fx-svelte` — Context, actions (`use:totoAction`, `use:totoPersist`, `use:totoDotgridEffect`), animation store, `TotoFXDotgrid` component

> Framework integrations are untested and uncompiled. Treat as community preview.

### Changed

- Built-in dotgrid effects remain as direct methods (`grid.ripple()`, etc.) alongside the plugin system — both paths work
- `FX.doDotgridRipple/Crater/Nuclear/Scorch` wrappers now delegate through `doDotgridEffect` internally
- Backward-compat `grid.ripple()`, `grid.crater()`, etc. delegate to `runEffect()` internally

### Deprecated

- `StateStore` singleton — use `createStateStore()` or just `createEngine()`
- `DOMObserver` singleton — use `createDOMObserver()` or just `createEngine()`

### Bundle Sizes

| Bundle | Size |
|--------|------|
| `toto-fx.min.js` (full IIFE) | 80.0KB |
| `toto-fx.esm.js` (full ESM) | 79.5KB |
| `core.esm.js` (engine only) | 15.4KB |
| `dotgrid.min.js` | 19.6KB |
| `dotgrid-plugins/ripple.min.js` | 1.8KB |
| `dotgrid-plugins/vortex.min.js` | 2.0KB |
| `dotgrid-plugins/crater.min.js` | 2.5KB |
| `dotgrid-plugins/nuclear.min.js` | 2.3KB |
| `dotgrid-plugins/scorch.min.js` | 1.8KB |
| `dotgrid-plugins/heart.min.js` | 2.6KB |

## [0.1.1] - 2026-03-30

Initial public release.
