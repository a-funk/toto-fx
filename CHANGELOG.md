# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] — 2026-04-17

### Fixed

- **Git installs now produce a working `dist/`.** Consumers installing via `github:a-funk/toto-fx#semver:^0.3` (or any git URL) were getting only `src/` and `types/` — no `dist/` (build output, never committed) and no `build.js` (excluded from the `files` allowlist). Since `main: "dist/toto-fx.min.js"`, `require('toto-fx')` failed in consumers and there was no way to build the package from the installed copy.

### Changed

- Added `prepare` lifecycle script that runs `node build.js`. npm fires `prepare` automatically after installing a git dependency — it clones, installs devDependencies, runs `prepare`, producing `dist/` before the consumer's own install completes.
- Added `build.js` to the `files` allowlist (ships to both git and npm-registry installs; 5.8KB, install/build-time only).

### No consumer impact

The v0.3.0 public API is unchanged. This release only affects the install path for git-dependency consumers.

---

## [0.3.0] — 2026-04-15

### Unified Particle Pipeline

One canvas. One RAF loop. One clear per frame.

toto-fx previously shipped three stacked canvases (`animation-canvas`, `speed-lines-canvas`, `fx-canvas`) driven by two independent RAF loops. The split was an artefact of the library's origin — `spawnParticles` (fire-and-forget physics) and `registerFxDraw` (per-frame callbacks) grew up on different pipelines, with different opacity models, different budgets, and no shared frame cadence. Cute animations ended up visibly dimmer than destruction animations for no reason a user could inspect.

0.3.0 collapses all of it onto a single compositor. Both authoring APIs are preserved and backward-compatible; `spawnParticles` is now a thin wrapper that registers its own FX draw callback internally.

#### The shape of the change

| Before | After |
|---|---|
| 3 canvases (`animation-canvas` / `speed-lines-canvas` / `fx-canvas`) | 1 canvas (`fx-canvas`) |
| 2 independent RAF loops | 1 master tick |
| 2 particle budgets (one uncapped) | 1 unified budget per device tier |
| Silent alpha multipliers (`* 0.3`) | Warned in debug, bumped in content |

#### Changed

- **Single canvas.** All rendering — particles, speed lines, FX draw callbacks — draws to `fx-canvas`. `animation-canvas` and `speed-lines-canvas` are no longer created.
- **Single master tick.** `_tickFxDraw` is folded into `_masterTick`; every subsystem runs under one RAF loop with unified frame-budget monitoring.
- **`spawnParticles` → FX draw callback.** The particle pool is now a registered draw callback. Batch rendering (font-bucket pass) is preserved. Public API is unchanged.
- **`creation.js` migrated.** Six creation variants — `materialize`, `portal`, `confetti-drop`, `sparkle-trail`, `butterfly-carry`, `grow` — moved from direct RAF + `getFxCtx()` to `registerFxDraw()`. Fixes a latent bug where an interrupted creation animation would wipe the entire FX canvas.
- **Cute alpha values raised.** 43 manual alpha multipliers across 8 cute variants bumped proportionally. Flower petals, butterflies, bees, cats, dogs, snowfall, ocean, and fireflies are now visible on light themes.

#### Added

- **`configure({ debug: true })`** — enable debug mode for the FX module.
- **Debug alpha warning.** `drawChar()` warns (once per char × size) when alpha drops below 0.1 — catches new silent-multiplier regressions before they ship.
- **Debug budget warning.** The master tick warns when total entity count exceeds the device-tier cap (500 desktop / 200 tablet / 40 mobile).

#### Deprecated

| Function | Replacement | Behavior |
|---|---|---|
| `getCanvas()` | `getFxCanvas()` | Returns the unified canvas; logs a debug warning |
| `getSpeedCanvas()` | `getFxCanvas()` | Returns the unified canvas; speed lines render to main |

No runtime removal — existing callers keep working.

#### Bundle Sizes

| Bundle | Size |
|---|---|
| `toto-fx.min.js` (full IIFE) | 79.1KB |
| `toto-fx.esm.js` (full ESM) | 78.6KB |
| `core.esm.js` (engine only) | 15.5KB |
| `fx.min.js` | 22.2KB |
| `dotgrid.min.js` | 19.6KB |
| `plugins/thud.min.js` | 52.8KB |
| `plugins/cute.min.js` | 68.6KB |
| `plugins/death.min.js` | 69.1KB |
| `plugins/creation.min.js` | 44.3KB |
| `plugins/in-progress.min.js` | 15.9KB |

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
