# Dotgrid: Fluid-Backed ASCII Simulation

Dotgrid is a real-time fluid simulation that renders through a grid of ASCII characters. Instead of pixels or WebGL shaders, density and velocity fields drive character selection, opacity, color, and displacement across a full-viewport canvas of text glyphs.

The result: physics-based visual effects expressed entirely through typography.

## Origins

The simulation architecture draws from [Cheng Lou's pretext fluid-smoke demos](https://github.com/somnai-dreams/pretext-demos) (March 2026), which demonstrated that Semi-Lagrangian advection and Laplacian diffusion -- techniques borrowed from computational fluid dynamics -- could drive character-based rendering at interactive framerates. Dotgrid adapts these ideas into a standalone effects engine with five composable field injectors, mobile-aware performance scaling, and a palette system that maps fluid density to character brightness via a pre-computed lookup table.

## Quick Start

```js
import { createDotgrid } from 'toto-fx/dotgrid';

const grid = createDotgrid({
  container: document.getElementById('bg'),
  dotSize: 28,
  palette: 'katakana',
  glowEnabled: true,
});

grid.init();
grid.ripple(400, 300, { radius: 500, color: '#C45A3C' });
```

Or use the pre-created singleton:

```js
import { Dotgrid } from 'toto-fx/dotgrid';

Dotgrid.configure({ container: '#bg' });
Dotgrid.init();
Dotgrid.vortex(window.innerWidth / 2, window.innerHeight / 2, {
  radius: 300, speed: 2.0, direction: 'ccw',
});
```

## How It Works

The simulation pipeline runs six stages per frame inside a single `requestAnimationFrame` loop. Effects do not manipulate the DOM or canvas directly -- they inject density and velocity into typed arrays, and the render loop translates field state into visual output.

### 1. Grid Initialization

On `init()`, the engine:
- Resolves the container element (DOM node or CSS selector)
- Creates or finds a `<canvas>` inside the container
- Builds the character brightness palette (see [Palette Presets](#palette-presets))
- Calls `build()` to allocate fields and draw the initial grid

`build()` computes grid dimensions from viewport size plus a configurable bleed margin (extra cells beyond the viewport edges so effects don't clip), then allocates the simulation fields:

| Field | Type | Purpose |
|-------|------|---------|
| `density` | `Float32Array` | Fluid density per cell (0.0 - 1.0) |
| `tempDen` | `Float32Array` | Scratch buffer for advection/diffusion swaps |
| `velX`, `velY` | `Float32Array` | Velocity field components per cell |
| `colorR`, `colorG`, `colorB` | `Uint8Array` | Per-cell RGB color (injected by effects) |
| `activeA`, `activeB` | `Uint8Array` | Double-buffered bitmask tracking active cells |

All fields are flat arrays indexed as `row * gridCols + col`. A 1920x1080 viewport at `dotSize: 28` produces roughly a 72x42 grid (~3,024 cells) -- small enough that the entire simulation runs on the main thread without jank.

### 2. Semi-Lagrangian Advection

Each simulation step begins by advecting density through the velocity field. For every cell, the algorithm traces backward through the velocity vector to find where the density "came from," then samples the source via bilinear interpolation:

```
sourceX = col - velX[i]         // backtrack through velocity
sourceY = row - velY[i]
density[i] = bilinear_sample(density, sourceX, sourceY)
```

The bilinear interpolation samples the four nearest cells and weights by fractional position. Source coordinates are clamped to grid bounds so the simulation never reads out of range.

This is the Semi-Lagrangian method: unconditionally stable regardless of velocity magnitude, because it traces backward from the destination rather than forward from the source. Large velocities stretch and smear density rather than creating numerical explosions.

### 3. Laplacian Diffusion

After advection, density spreads to neighboring cells via a 4-neighbor Laplacian blend:

```
average = (density[left] + density[right] + density[up] + density[down]) / 4
density[i] = density[i] * (1 - diffusionRate) + average * diffusionRate
```

The default `diffusionRate` of 0.08 produces a gentle spread. Edge cells (grid boundary) receive only decay, not diffusion, to avoid boundary artifacts. The diffusion operates within the active bounding box plus a 3-cell margin (`BBOX_MARGIN`) so spreading density expands naturally beyond the initial injection zone.

### 4. Decay

Velocity and density decay simultaneously in a single merged pass:

```
velX[i] *= velDecay       // default 0.92
velY[i] *= velDecay
density[i] *= densityDecay  // default 0.985
```

Values below 0.005 are snapped to zero, preventing the simulation from running indefinitely on near-zero residue. This is the self-healing mechanism: every effect decays automatically, no cleanup code required. Overlapping effects compose in the field and decay together.

On mobile and tablet, decay rates are scaled more aggressively (`velDecayScale`, `densityDecayScale`) so the simulation settles faster and frees CPU sooner.

### 5. Character Lookup (Brightness LUT)

During palette construction, each character is rendered to an offscreen 28x28 canvas and its alpha coverage is measured as a brightness score (sum of alpha pixels / max possible alpha). Characters are sorted by brightness and used to build a 256-entry lookup table:

```
charLUT[quantizedDensity] = bestMatchingCharacter
```

At render time, the density value is quantized to 0-255 and the LUT returns the appropriate character in O(1). This replaces a per-cell binary search that would otherwise run for every active cell every frame.

The LUT construction uses binary search with a +/-2 neighbor refinement to handle non-uniform brightness distributions in the palette.

### 6. Canvas Rendering

The render pass operates only within the active bounding box:

1. **Clear** the bbox region (plus displacement margin) on the canvas
2. **Redraw base characters** for inactive cells within the cleared region (`baseChar` at `baseOpacity`)
3. **Overdraw active cells** with their effect-driven character, opacity, color, and displacement

For each active cell (density > 0.02 or velocity magnitude > 0.02):
- **Character**: looked up from `charLUT` based on quantized density
- **Opacity**: linearly interpolated between `opacityMin` and `opacityMax` based on density
- **Color**: read from per-cell `colorR/G/B` arrays (injected by the effect)
- **Position**: cell center offset by `velX/velY * displacementScale * dotSize`
- **Glow** (optional): canvas `shadowBlur` + `shadowColor` driven by cell density and color

All rendering uses `ctx.fillText()` -- zero DOM writes per frame. The canvas composites naturally via `globalAlpha` and fill style changes.

When no cells have energy, the render loop cancels its `requestAnimationFrame` and the simulation goes idle until the next effect injection.

## Effects API

Effects are field injectors. Each one writes density, velocity, and color into the typed arrays within a spatial region, then calls `startSim()` to ensure the render loop is running. Because effects write to shared fields, overlapping effects compose naturally -- a ripple fired into an active vortex produces interference patterns without any special-case code.

### `ripple(cx, cy, opts)`

Radial velocity burst. Pushes dots outward from a center point with intensity that falls off linearly with distance.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cx`, `cy` | number | -- | Center position in viewport pixels |
| `opts.radius` | number | 500 | Maximum radius in pixels |
| `opts.push` | number | 14 | Outward velocity strength |
| `opts.density` | number | 0.6 | Density injection strength (0-1) |
| `opts.color` | string | `'#C45A3C'` | CSS color for the ripple |

```js
// Gentle ripple
grid.ripple(200, 200, { radius: 200, push: 6, density: 0.3, color: '#4A90D9' });

// Explosion-scale burst
grid.ripple(cx, cy, { radius: 800, push: 20, density: 0.9, color: '#FF4400' });
```

The velocity injection formula: for each cell within radius, compute the normalized direction vector from center, then `vel += direction * intensity * push / dotSize`. Intensity is `1 - distance/radius`.

### `vortex(cx, cy, opts)`

Rotational pull. Injects tangential velocity (perpendicular to the radial direction) plus optional inward pull toward the center. Produces spiral patterns.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cx`, `cy` | number | -- | Center position in viewport pixels |
| `opts.radius` | number | 300 | Vortex radius in pixels |
| `opts.speed` | number | 1.5 | Tangential velocity multiplier |
| `opts.pull` | number | 0.3 | Inward pull strength toward center |
| `opts.direction` | `'cw'` or `'ccw'` | `'cw'` | Rotation direction |
| `opts.density` | number | 0.5 | Density injection strength (0-1) |
| `opts.color` | string | `'#C45A3C'` | CSS color for the vortex |

```js
// Clockwise whirlpool
grid.vortex(400, 400, { radius: 250, speed: 2.5, pull: 0.6, direction: 'cw' });

// Counter-clockwise with high density
grid.vortex(600, 300, { speed: 1.0, pull: 0.1, direction: 'ccw', density: 0.8 });
```

The tangential velocity is computed as the 90-degree rotation of the radial unit vector: `velX += (-ny * dir) * intensity * speed`, `velY += (nx * dir) * intensity * speed`.

### `crater(cx, cy, radius, depth, opts)`

Impact depression with crack lines. Creates a shaped crater with three radial color zones (fire center, orange mid-ring, warm brown outer) plus randomized crack lines that radiate outward with angular jitter.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cx`, `cy` | number | -- | Impact center in viewport pixels |
| `radius` | number | -- | Crater radius in pixels |
| `depth` | number | -- | Density injection multiplier |
| `opts.cracks` | number | 6 | Number of radiating crack lines |
| `opts.crackLength` | number | `radius * 1.4` | Crack line length in pixels |

```js
// Standard impact
grid.crater(500, 400, 120, 1.2);

// Deep impact with many cracks
grid.crater(500, 400, 200, 2.0, { cracks: 12, crackLength: 350 });
```

Density injection uses squared intensity (`intensity * intensity * depth`) for a sharper falloff toward edges. Crack lines walk outward from the crater rim with per-step angular perturbation (`+/- 0.4 radians`), creating organic-looking fracture patterns.

### `nuclear(cx, cy, opts)`

Mushroom cloud with four distinct components:
1. **Ground zero** -- bright fire core at the impact point
2. **Stem** -- vertical column of smoke rising from ground zero
3. **Cap** -- elliptical cloud at the top of the stem
4. **Shockwave ring** -- expanding velocity ring at 70% of blast radius

All four components scale proportionally with `blastRadius`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cx`, `cy` | number | -- | Ground zero in viewport pixels |
| `opts.blastRadius` | number | 280 | Overall blast radius in pixels |
| `opts.color` | string | `'#C45A3C'` | CSS color for the shockwave ring |

```js
grid.nuclear(window.innerWidth / 2, window.innerHeight * 0.6, {
  blastRadius: 350,
  color: '#FF6633',
});
```

The shockwave ring injects velocity along the radial direction, so it expands outward through the advection step -- the ring literally propagates through the fluid simulation rather than being statically drawn.

### `scorch(x1, y1, x2, y2, widthOrOpts)`

Directional burn trail from point A to point B. Creates a linear density injection with a dark core and lighter edges. Useful for directional effects like swipe gestures or trail animations.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `x1`, `y1` | number | -- | Trail start in viewport pixels |
| `x2`, `y2` | number | -- | Trail end in viewport pixels |
| `widthOrOpts` | number or object | 40 | Trail width in px, or `{ width, color }` |

```js
// Simple burn trail
grid.scorch(100, 300, 700, 300, 50);

// Colored directional scorch
grid.scorch(100, 100, 800, 500, { width: 60, color: '#8B0000' });
```

The trail uses perpendicular distance from the line segment to compute intensity. Cells within 30% of the width from the center line get the core color; the rest get the edge color.

## Configuration

Pass any of these to `createDotgrid(config)` or `instance.configure(config)`:

### Grid Layout

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dotSize` | number | 28 | Grid cell size in CSS pixels |
| `fontSize` | number | 14 | Font size for character rendering |
| `baseChar` | string | `'\u00b7'` | Character shown in idle cells (middle dot) |
| `baseOpacity` | number | 0.2 | Opacity of idle base characters |
| `container` | Element or string | null | Container element or CSS selector |
| `canvas` | Element or string | null | Canvas element (auto-created if null) |

### Physics

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `densityDecay` | number | 0.985 | Density multiplier per frame (closer to 1 = slower fade) |
| `velDecay` | number | 0.92 | Velocity multiplier per frame |
| `diffusionRate` | number | 0.08 | Laplacian diffusion blend rate (0 = none, 1 = full average) |
| `displacementScale` | number | 0.6 | How far velocity displaces characters from cell center |
| `densityMultiplier` | number | 1.0 | Global multiplier on all density injection |

### Visual

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `opacityMin` | number | 0.25 | Minimum opacity for active cells |
| `opacityMax` | number | 1.0 | Maximum opacity for active cells |
| `glowEnabled` | boolean | false | Enable canvas shadow glow behind active characters |
| `glowRadius` | number | 8 | Shadow blur radius in pixels |
| `glowIntensity` | number | 0.6 | Glow opacity multiplier |
| `palette` | string | `'default'` | Character palette preset name |
| `baseColor` | [r,g,b] or string | null | Base dot color (auto-detects from CSS `--ink-muted`) |

### Mobile / Tablet

Device-specific overrides applied automatically based on viewport width and touch capability:

| Parameter | Default (mobile) | Default (tablet) | Description |
|-----------|-------------------|-------------------|-------------|
| `breakpoint` | 768 | -- | Width threshold for mobile detection |
| `bleed` | 10 | 20 | Grid bleed beyond viewport (desktop: 40) |
| `dotSize` | 28 | 32 | Cell size override |
| `simRate` | 0.5 | 0.75 | Fraction of frames that run simulation |
| `velDecayScale` | 0.92 | 0.95 | Multiplied with `velDecay` for faster settling |
| `densityDecayScale` | 0.97 | 0.98 | Multiplied with `densityDecay` for faster fade |
| `maxRadiusFraction` | 0.65 | 0.75 | Clamps effect radius to this fraction of viewport width |

```js
createDotgrid({
  container: '#bg',
  mobile: { simRate: 0.33, dotSize: 36 },  // aggressive mobile savings
  tablet: { simRate: 0.5, dotSize: 32 },
});
```

## Performance

Dotgrid is designed to run as a decorative background without competing with foreground UI for frame budget. The key optimizations:

**Canvas rendering (zero DOM writes).** Every frame writes exclusively through `ctx.fillText()` and `ctx.clearRect()`. No DOM nodes are created, moved, or styled during animation. This eliminates layout thrashing entirely.

**Bounding-box simulation.** The simulation only processes cells within an active bounding box that expands when effects fire and shrinks as edges decay below threshold. A ripple in the corner of a 3,000-cell grid might only simulate 200 cells. When no cells are active, the render loop cancels entirely.

**Character LUT.** A 256-entry lookup table maps quantized density to characters in O(1). Built once during palette construction, it replaces a per-cell binary search that would otherwise run thousands of times per frame.

**Typed array bitmask.** Active cell tracking uses double-buffered `Uint8Array` bitmasks instead of per-frame `Set` allocation. Swap is a pointer reassignment, clear is a loop over the bbox region.

**Merged decay.** Velocity decay and density decay run in a single loop instead of two separate passes over the same cells.

**Frame skipping.** On mobile (`simRate: 0.5`), the fluid simulation runs every other frame while rendering still runs every frame. The visual difference is minimal -- the simulation at 30fps is perceptually smooth -- but CPU cost drops by half. On tablet (`simRate: 0.75`), sim runs 3 of every 4 frames.

**DPR capping.** Device pixel ratio is capped at 1.5 on mobile and tablet (2.0 on desktop). Since dotgrid renders text at 14px, the difference between 2x and 1.5x DPR is invisible, but the pixel buffer is 44% smaller.

**Pre-measured character widths.** All character widths are measured once via `ctx.measureText()` after palette construction, avoiding per-frame measurement overhead.

**Pause/resume.** The `pause(autoResumeMs)` method keeps the RAF loop alive but skips all simulation and rendering. Used during completion animations to yield frame budget to higher-priority visual work, then auto-resumes.

## Palette Presets

Six built-in palettes control which characters appear as density increases:

| Name | Characters | Style |
|------|-----------|-------|
| `default` | `\u00b7 \u2219 \u00b0 + = * # % @ \u2591\u2592\u2593\u2588 \u2571\u2572 \u2726 \u221E ...` | Full range -- dots to blocks to box drawing to symbols |
| `dense` | `# % & @ \u2588 \u2593 \u2592 \u2591 \u25A0 \u25AA \u25CF \u25C9` | Heavy, high-contrast characters |
| `light` | `\u00b7 \u2219 \u00b0 \u02da \u2218 \u25e6 . , ' \`` | Subtle, airy, minimal |
| `box` | `\u2554 \u2551 \u2550 \u2557 \u256C \u2560 \u2500 \u2502 \u253C \u250C ...` | Box-drawing characters only |
| `katakana` | `\u30A2 \u30A4 \u30A6 \u30A8 \u30AA \u30AB \u30AD \u30AF \u30B1 \u30B3 \u30B5 \u30B7 \u30B9 \u30BB \u30BD \u30BF \u30C1 \u30C4 \u30C6 \u30C8` | Japanese katakana (Matrix-style) |
| `numeric` | `0 1 2 3 4 5 6 7 8 9` | Digits only |

Each character in the palette is rendered to an offscreen canvas and scored by alpha coverage to determine its brightness. The palette is sorted by brightness, so as density increases, heavier characters appear. Custom palettes can be passed as a character array to `buildPalette()`.

## Lifecycle

```
createDotgrid(config)  -->  init()  -->  [effects]  -->  destroy()
                                  |          |
                            build()    startSim()
                                  |          |
                           allocate     RAF loop
                            fields      (auto-stops
                                         when idle)
```

- `init()` -- resolve container, create canvas, build palette, build grid
- `configure(opts)` -- update config live (triggers rebuild/redraw as needed)
- `reset()` -- clear all fields, redraw base grid
- `pause(ms)` / `resume()` -- suspend/restore simulation
- `isIdle()` -- returns `true` when simulation has fully settled
- `destroy()` -- cancel RAF, release state

The simulation is self-managing: effects start it, decay stops it. No manual tick or frame management required.
