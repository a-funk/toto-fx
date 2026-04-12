# FX Utilities API Reference

The `fx` module is the shared animation infrastructure for TotoFX. It provides reusable building blocks -- particles, screen effects, card animation helpers, canvas management, and dotgrid integration -- that any animation style (thud, cute, death, etc.) can compose. Nothing in this module is style-specific.

**Import paths:**

```js
// Named imports (tree-shakeable)
import { spawnParticles, doScreenShake, liftCard } from 'toto-fx/fx';

// Namespace import
import { FX } from 'toto-fx/fx';
FX.spawnParticles(cx, cy, { count: 30 });
```

---

## Table of Contents

1. [Setup](#setup)
2. [Configuration](#configuration)
3. [Particle System](#particle-system)
4. [Screen Effects](#screen-effects)
5. [Speed Lines](#speed-lines)
6. [Dotgrid Effects](#dotgrid-effects)
7. [Card Animation Helpers](#card-animation-helpers)
8. [Element Helpers](#element-helpers)
9. [Canvas](#canvas)
10. [Drawing Helpers](#drawing-helpers)
11. [Animation Lifecycle](#animation-lifecycle)
12. [Context](#context)
13. [State and Query](#state-and-query)
14. [Warmup](#warmup)
15. [Param Resolution](#param-resolution)

---

## Setup

### `setDotgrid(dotgridModule)`

Wire the Dotgrid module into FX so grid-based effects (ripple, crater, nuclear, scorch) work. **This is required if you use dotgrid effects.** Without it, all `doDotgrid*` functions become silent no-ops.

This was the #1 confusion point in usability testing. FX and Dotgrid are separate modules -- FX does not auto-discover Dotgrid. You must explicitly connect them.

| Param | Type | Description |
|-------|------|-------------|
| `dotgridModule` | `Object` | The Dotgrid module with `ripple`, `crater`, `nuclear`, `scorch` methods |

```js
import { setDotgrid } from 'toto-fx/fx';
import * as Dotgrid from 'toto-fx/dotgrid';

// Do this once at app startup, before any animations run
setDotgrid(Dotgrid);
```

**What happens if you skip this:** All `doDotgridRipple`, `doDotgridCrater`, `doDotgridNuclear`, and `doDotgridScorch` calls silently do nothing. The rest of FX works fine without Dotgrid.

---

## Configuration

### `configure(opts)`

Set FX defaults before using any functions. All options are optional -- only provide the ones you want to override. Call once at app startup.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `opts` | `FXConfig` | -- | Configuration object (all fields optional) |

#### `FXConfig` shape

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `mobile` | `Object` | see below | Mobile device overrides |
| `mobile.particleScale` | `number` | `0.3` | Particle count multiplier on mobile |
| `mobile.maxParticles` | `number` | `20` | Max particles per spawn on mobile |
| `mobile.maxParticlesTotal` | `number` | `40` | Max total particles on mobile |
| `mobile.shadow` | `boolean` | `false` | Whether to render shadows on mobile |
| `tablet` | `Object` | see below | Tablet device overrides |
| `tablet.particleScale` | `number` | `0.6` | Particle count multiplier on tablet |
| `tablet.maxParticles` | `number` | `40` | Max particles per spawn on tablet |
| `tablet.maxParticlesTotal` | `number` | `200` | Max total particles on tablet |
| `tablet.shadow` | `boolean` | `true` | Whether to render shadows on tablet |
| `tablet.skipBlur` | `boolean` | `true` | Skip animated blur on tablet |
| `selectors` | `Object` | see below | DOM selector overrides |
| `selectors.shadow` | `string` | `'.fx-shadow'` | Shadow element selector |
| `selectors.burst` | `string` | `'.fx-burst'` | Impact burst element selector |
| `selectors.badge` | `string` | `'.fx-badge'` | Done badge element selector |
| `selectors.strike` | `string` | `'.fx-strike'` | Strikethrough element selector |
| `selectors.appShell` | `string\|null` | `null` | App shell selector for screen shake (`null` = `document.body`) |
| `selectors.flashOverlay` | `string` | `'#fx-flash-overlay'` | Flash overlay selector |
| `classes` | `Object` | see below | CSS class names used during animation |
| `classes.animating` | `string` | `'animating'` | Added during animation |
| `classes.visible` | `string` | `'anim-visible'` | For visible animated card |
| `classes.destroyed` | `string` | `'anim-destroyed'` | For destroyed card |
| `classes.done` | `string` | `'fx-done'` | For completed item |
| `classes.placeholder` | `string` | `'fx-placeholder'` | For layout placeholder |
| `classes.stage` | `string` | `'animation-stage'` | For animation stage wrapper |
| `classes.shaking` | `string` | `'shaking'` | For light screen shake |
| `classes.shakingHeavy` | `string` | `'shaking-heavy'` | For heavy screen shake |
| `theme` | `Object` | no-op provider | Theme provider for colors and characters |
| `theme.color` | `(key: string) => string\|null` | returns `null` | Get a theme color by key |
| `theme.chars` | `(key: string) => string[]` | default sets | Get character set by category (`'particles'`, `'smoke'`, `'fire'`) |
| `theme.particleColor` | `(key: string) => number[]\|string` | `[255, 200, 50]` | Get particle color by key |
| `theme.active` | `Object\|null` | `null` | Active theme object with `palette` and `colorScheme` |
| `autoWarmup` | `boolean` | `true` | Set `false` to disable automatic warmup on import |

```js
import { configure } from 'toto-fx/fx';

configure({
  mobile: { particleScale: 0.5, maxParticles: 25 },
  selectors: {
    shadow: '.card-shadow',
    burst: '.impact-burst',
    badge: '.done-badge',
    strike: '.strikethrough',
    appShell: '#app',
  },
  theme: myThemeProvider,
  autoWarmup: false,
});
```

---

## Particle System

### `spawnParticles(cx, cy, opts)`

Spawn themed ASCII particles from a center point. Particles render on a shared full-viewport canvas with physics (gravity, drag, velocity decay). Count is automatically scaled down on mobile and tablet.

If an impact flash is currently active, particle spawning is deferred until the flash clears so particles are visible on spawn.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cx` | `number` | -- | Center x coordinate (viewport px) |
| `cy` | `number` | -- | Center y coordinate (viewport px) |
| `opts.count` | `number` | `30` | Number of particles to spawn |
| `opts.spread` | `number` | `8` | Maximum velocity magnitude |
| `opts.gravity` | `number` | `0.15` | Downward acceleration per frame |
| `opts.color` | `number[]\|string` | theme default | RGB tuple `[r,g,b]` or CSS color string |
| `opts.life` | `number` | `80` | Base lifetime in frames |
| `opts.size` | `number[]` | `[2, 6]` | `[min, max]` font size range |
| `opts.chars` | `string[]` | theme particles | Character set for particles |
| `opts.upBias` | `number` | `0` | Initial upward velocity bias |
| `opts.originSpread` | `number` | `10` | Random spread around origin point (px) |
| `opts.drag` | `number` | `0.98` | Velocity decay multiplier per frame |
| `opts.minVel` | `number` | `1` | Minimum initial velocity |

```js
import { spawnParticles } from 'toto-fx/fx';

// Basic burst at center of element
spawnParticles(rect.cx, rect.cy, { count: 40, spread: 10 });

// Upward confetti with custom colors
spawnParticles(cx, cy, {
  count: 60, spread: 6, upBias: 4, gravity: 0.08,
  color: [100, 220, 100], chars: ['*', '+', '!'],
});
```

### `pushParticles(arr)`

Push raw particle objects directly into the particle array. Use this for custom effects (mushroom cloud, confetti, etc.) that need more control than `spawnParticles` provides. Total particle count is capped at 500 (40 on mobile, 200 on tablet).

| Param | Type | Description |
|-------|------|-------------|
| `arr` | `Particle[]` | Array of particle objects |

Each particle object has:

| Field | Type | Description |
|-------|------|-------------|
| `x`, `y` | `number` | Position (viewport px) |
| `vx`, `vy` | `number` | Velocity |
| `life` | `number` | Remaining lifetime (frames) |
| `maxLife` | `number` | Original lifetime (for alpha calc) |
| `size` | `number` | Font size multiplier |
| `color` | `number[]\|string` | `[r,g,b]` or CSS color |
| `gravity` | `number` | Per-frame downward acceleration |
| `drag` | `number` | Velocity decay per frame |
| `char` | `string` | Character to render |

```js
import { pushParticles } from 'toto-fx/fx';

const custom = [];
for (let i = 0; i < 20; i++) {
  custom.push({
    x: cx, y: cy, vx: Math.cos(i) * 3, vy: Math.sin(i) * 3,
    life: 60, maxLife: 60, size: 4, color: [255, 100, 50],
    gravity: 0.1, drag: 0.97, char: '*',
  });
}
pushParticles(custom);
```

### `spawnSmoke(cx, cy, count)`

Spawn smoke particles that rise slowly and fade. Uses theme-aware characters and colors.

| Param | Type | Description |
|-------|------|-------------|
| `cx` | `number` | Center x coordinate (viewport px) |
| `cy` | `number` | Center y coordinate (viewport px) |
| `count` | `number` | Number of smoke particles (halved on mobile) |

```js
import { spawnSmoke } from 'toto-fx/fx';

spawnSmoke(cx, cy, 20);
```

### `spawnFireTrail(x, y, angle)`

Spawn a short burst of 4 fire trail particles behind a moving object. Used by meteor-style animations for re-entry trail effects.

| Param | Type | Description |
|-------|------|-------------|
| `x` | `number` | Origin x (viewport px) |
| `y` | `number` | Origin y (viewport px) |
| `angle` | `number` | Direction of travel in radians (particles emit opposite) |

```js
import { spawnFireTrail } from 'toto-fx/fx';

// Trail behind a meteor moving at 45 degrees
spawnFireTrail(meteorX, meteorY, Math.PI / 4);
```

---

## Screen Effects

### `doScreenShake(heavy)`

Trigger a screen shake by adding a CSS class to the app shell element. Respects the `shake` FX toggle.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `heavy` | `boolean` | -- | `true` for heavy shake (550ms, larger amplitude), `false` for light (450ms) |

```js
import { doScreenShake } from 'toto-fx/fx';

doScreenShake(false); // light shake
doScreenShake(true);  // heavy shake
```

**Note:** You must define the CSS animations for the configured `shaking` and `shakingHeavy` classes. The FX module only adds/removes the class.

### `doImpactFlash(whiteOut)`

Trigger an anime-style impact flash -- a single-frame color hold, then fast fade. Uses black for light themes, white for dark themes.

| Param | Type | Description |
|-------|------|-------------|
| `whiteOut` | `boolean` | `true` for white flash (dark themes), `false` for black flash (light themes) |

```js
import { doImpactFlash } from 'toto-fx/fx';

doImpactFlash(false); // black flash (standard impact)
doImpactFlash(true);  // white flash (for dark themes)
```

**Requires:** A flash overlay element matching the `selectors.flashOverlay` selector (default: `#fx-flash-overlay`). Respects the `flash` FX toggle and `disableFlash` context flag.

### `flashColor(color, durationMs)`

Flash the screen with an arbitrary color. Uses the flash overlay element.

| Param | Type | Description |
|-------|------|-------------|
| `color` | `string` | CSS color for the flash (e.g. `'rgba(255, 200, 50, 0.6)'`) |
| `durationMs` | `number` | Fade-out duration in milliseconds |

```js
import { flashColor } from 'toto-fx/fx';

flashColor('rgba(255, 0, 0, 0.4)', 200); // red danger flash
flashColor('rgba(0, 255, 100, 0.3)', 150); // green success flash
```

---

## Speed Lines

### `startSpeedLines(cx, cy, direction, durationMs)`

Render radial anime-style speed lines emanating from or converging to a center point. Uses a dedicated full-viewport canvas layer. Automatically cleans up after the duration. Respects the `speedLines` FX toggle.

| Param | Type | Description |
|-------|------|-------------|
| `cx` | `number` | Center x coordinate (viewport px) |
| `cy` | `number` | Center y coordinate (viewport px) |
| `direction` | `'outward'\|'inward'` | Lines radiate outward or converge inward |
| `durationMs` | `number` | Animation duration in milliseconds |

```js
import { startSpeedLines } from 'toto-fx/fx';

startSpeedLines(cx, cy, 'outward', 350); // explosion effect
startSpeedLines(cx, cy, 'inward', 200);  // implosion effect
```

### `stopSpeedLines()`

Immediately stop and clear any active speed lines animation.

```js
import { stopSpeedLines } from 'toto-fx/fx';

stopSpeedLines();
```

---

## Dotgrid Effects

All dotgrid functions require `setDotgrid()` to be called first. They respect the `dotgrid` FX toggle (disabled on mobile by default) and will use the context's `dotgridOverride` if set.

### `doDotgridRipple(cx, cy, opts?)`

Trigger a dotgrid ripple effect centered at the given point.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cx` | `number` | -- | Center x (viewport px) |
| `cy` | `number` | -- | Center y (viewport px) |
| `opts` | `Object` | `undefined` | Options passed through to `Dotgrid.ripple` |

```js
import { doDotgridRipple } from 'toto-fx/fx';

doDotgridRipple(cx, cy);
doDotgridRipple(cx, cy, { strength: 2.0 });
```

### `doDotgridCrater(cx, cy, radius, depth, opts?)`

Trigger a dotgrid crater effect -- dots are displaced outward from the center.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cx` | `number` | -- | Center x (viewport px) |
| `cy` | `number` | -- | Center y (viewport px) |
| `radius` | `number` | -- | Crater radius in pixels |
| `depth` | `number` | -- | Crater depth multiplier |
| `opts` | `Object` | `undefined` | Options passed through to `Dotgrid.crater` |

```js
import { doDotgridCrater } from 'toto-fx/fx';

doDotgridCrater(cx, cy, 160, 1.0);
```

### `doDotgridNuclear(cx, cy)`

Trigger a dotgrid nuclear mushroom cloud effect -- large-scale displacement.

| Param | Type | Description |
|-------|------|-------------|
| `cx` | `number` | Center x (viewport px) |
| `cy` | `number` | Center y (viewport px) |

```js
import { doDotgridNuclear } from 'toto-fx/fx';

doDotgridNuclear(cx, cy);
```

### `doDotgridScorch(x1, y1, x2, y2, width)`

Trigger a dotgrid scorch trail effect between two points.

| Param | Type | Description |
|-------|------|-------------|
| `x1` | `number` | Start x (viewport px) |
| `y1` | `number` | Start y (viewport px) |
| `x2` | `number` | End x (viewport px) |
| `y2` | `number` | End y (viewport px) |
| `width` | `number` | Trail width in pixels |

```js
import { doDotgridScorch } from 'toto-fx/fx';

doDotgridScorch(100, 300, 500, 300, 40);
```

---

## Card Animation Helpers

These functions manage the full lifecycle of card animations: promoting a card out of the DOM flow, lifting it with 3D transforms, dropping it with gravity, playing impact effects, and cleaning up.

### `promoteCard(card)`

Promote a card from its nested DOM position to a body-level wrapper with CSS perspective for 3D transforms. Creates a fixed-position stage on `<body>` and a placeholder to maintain layout space in the original location.

After calling, `card._animStage` and `card._animPlaceholder` are set for cleanup.

| Param | Type | Description |
|-------|------|-------------|
| `card` | `HTMLElement` | The card element to promote |

**Returns:** `HTMLElement` -- the placeholder element maintaining layout space.

```js
import { promoteCard, cleanupCard } from 'toto-fx/fx';

const placeholder = promoteCard(card);
// card is now in a body-level fixed wrapper with perspective
// ... run animation ...
cleanupCard(card); // returns card to normal
```

### `prepareCard(el)`

All-in-one card preparation: cancels any existing animation, promotes the card, marks it as animating, captures its bounding rect, and handles card hide timing from the completion context.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The card element to prepare |

**Returns:** `{cx: number, cy: number, rect: DOMRect, w: number, h: number}` -- center coordinates and dimensions after promotion.

```js
import { prepareCard, finalize } from 'toto-fx/fx';

const pos = prepareCard(el);
// pos.cx, pos.cy = center of card
// pos.w, pos.h = card dimensions
// pos.rect = full DOMRect
```

### `liftCard(card, shadow, cx, cy, peakZ, liftDuration, rotX, rotY, onDone)`

Lift a card upward using CSS 3D transforms with perspective. Promotes the card to a body-level wrapper, applies a smooth translateZ + rotation transition, and triggers outward speed lines. Pauses dotgrid during lift to free frame budget.

| Param | Type | Description |
|-------|------|-------------|
| `card` | `HTMLElement` | The card element to lift |
| `shadow` | `HTMLElement\|null` | The card's shadow sub-element |
| `cx` | `number` | Center x for speed lines (viewport px) |
| `cy` | `number` | Center y for speed lines (viewport px) |
| `peakZ` | `number` | Maximum translateZ height (px) |
| `liftDuration` | `number` | Base lift duration (ms, speed-scaled) |
| `rotX` | `number` | X-axis rotation at peak (degrees) |
| `rotY` | `number` | Y-axis rotation at peak (degrees) |
| `onDone` | `Function` | Callback after lift transition completes |

```js
import { getSubElements, getItemRect, liftCard, gravityFall } from 'toto-fx/fx';

const sub = getSubElements(el);
const pos = getItemRect(el);
liftCard(el, sub.shadow, pos.cx, pos.cy, 450, 350, -6, 2, () => {
  // card is at peak -- start the fall
  gravityFall(el, sub.shadow, 450, -6, 2, 200, 3, pos.cx, pos.cy, onImpact);
});
```

### `gravityFall(card, shadow, peakZ, rotX, rotY, fallDuration, easeExp, cx, cy, onImpact)`

Animate a card falling from its lifted position to ground level using a power-curve easing (`t^easeExp`). Triggers inward speed lines during the fall. Uses requestAnimationFrame for smooth per-frame interpolation.

| Param | Type | Description |
|-------|------|-------------|
| `card` | `HTMLElement` | The card element (already lifted via `liftCard`) |
| `shadow` | `HTMLElement\|null` | The card's shadow sub-element |
| `peakZ` | `number` | Starting translateZ height (from `liftCard`) |
| `rotX` | `number` | Starting X-axis rotation (degrees) |
| `rotY` | `number` | Starting Y-axis rotation (degrees) |
| `fallDuration` | `number` | Base fall duration (ms, speed-scaled) |
| `easeExp` | `number` | Power curve exponent (higher = more aggressive acceleration) |
| `cx` | `number` | Center x for speed lines (viewport px) |
| `cy` | `number` | Center y for speed lines (viewport px) |
| `onImpact` | `Function` | Callback when card reaches ground level |

```js
gravityFall(el, sub.shadow, 450, -6, 2, 200, 3, pos.cx, pos.cy, () => {
  standardImpact(el, sub.shadow, sub.burst, pos.cx, pos.cy);
});
```

### `standardImpact(card, shadow, burst, cx, cy)`

Play the standard impact sequence: card squash, shadow spread, burst glow, impact flash, screen shake, and dotgrid ripple. Followed by a recovery transition that restores the card to normal scale.

| Param | Type | Description |
|-------|------|-------------|
| `card` | `HTMLElement` | The card element |
| `shadow` | `HTMLElement\|null` | The card's shadow sub-element |
| `burst` | `HTMLElement\|null` | The card's impact burst sub-element |
| `cx` | `number` | Impact center x (viewport px) |
| `cy` | `number` | Impact center y (viewport px) |

```js
import { standardImpact } from 'toto-fx/fx';

standardImpact(card, sub.shadow, sub.burst, pos.cx, pos.cy);
```

### `completeAndRemove(card, badge, strike, delayBase, onDone?)`

Animate the completion sequence: strikethrough, done badge popup, badge fade, then card exit (fade + shrink + placeholder collapse). Reads completion options from the animation context.

| Param | Type | Description |
|-------|------|-------------|
| `card` | `HTMLElement` | The card element |
| `badge` | `HTMLElement\|null` | The done badge sub-element |
| `strike` | `HTMLElement\|null` | The strikethrough sub-element |
| `delayBase` | `number` | Base delay before starting (ms, speed-scaled) |
| `onDone` | `Function\|undefined` | Callback after full cleanup |

**Completion context options** (set via `setContext({ completion: {...} })`):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showStrikethrough` | `boolean` | `true` | Animate strikethrough line |
| `showBadge` | `boolean` | `true` | Show the done badge popup |
| `badgeText` | `string` | `'done'` | Text shown in badge |
| `badgeDuration` | `number` | `500` | How long badge stays visible (ms) |
| `badgeColor` | `string` | `'var(--green)'` | Badge and strikethrough CSS color |
| `cardHideDelay` | `number` | `-1` | When to hide: `-1` = auto, `0` = instant, `>0` = delayed ms |

```js
import { completeAndRemove } from 'toto-fx/fx';

completeAndRemove(card, sub.badge, sub.strike, 300, () => {
  console.log('card removed');
});
```

### `removeCard(card, fadeDelay, onDone?)`

Remove a card with a simple fade-out and placeholder collapse. Used by deletion animations that don't need strikethrough/badge effects.

| Param | Type | Description |
|-------|------|-------------|
| `card` | `HTMLElement` | The card element |
| `fadeDelay` | `number` | Delay before fade starts (ms, speed-scaled) |
| `onDone` | `Function\|undefined` | Callback after full cleanup |

```js
import { removeCard } from 'toto-fx/fx';

removeCard(card, 100, () => { console.log('gone'); });
```

### `cleanupCard(card)`

Clean up a card after animation: hide it, detach from DOM, remove the animation stage wrapper and placeholder, reset CSS classes and inline styles.

| Param | Type | Description |
|-------|------|-------------|
| `card` | `HTMLElement` | The card element to clean up |

```js
import { cleanupCard } from 'toto-fx/fx';

cleanupCard(card);
```

### `destroyCard(el)`

Hide a card instantly for death/destruction animations. Adds the `destroyed` class and sets opacity/visibility to hidden. Does **not** remove from DOM.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The card element to destroy visually |

```js
import { destroyCard } from 'toto-fx/fx';

destroyCard(el); // card is now invisible
```

### `finalize(el, opts)`

Finalize an animation: collapse the placeholder and clean up. The card is already visually destroyed -- this collapses its placeholder height, then removes everything.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The card element to finalize |
| `opts` | `Object` | Must contain `onDone` callback |
| `opts.onDone` | `Function\|undefined` | Callback after cleanup completes |

```js
import { finalize } from 'toto-fx/fx';

finalize(el, { onDone: () => { console.log('animation complete'); } });
```

---

## Element Helpers

### `getSubElements(el)`

Extract animation-related sub-elements from an item card using configured selectors.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The item DOM element |

**Returns:** `{shadow: HTMLElement|null, burst: HTMLElement|null, badge: HTMLElement|null, strike: HTMLElement|null}`

```js
import { getSubElements } from 'toto-fx/fx';

const sub = getSubElements(card);
// sub.shadow, sub.burst, sub.badge, sub.strike
```

### `getItemRect(el)`

Get the center coordinates and bounding rect of an item element.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The item DOM element |

**Returns:** `{cx: number, cy: number, rect: DOMRect}`

```js
import { getItemRect } from 'toto-fx/fx';

const pos = getItemRect(card);
spawnParticles(pos.cx, pos.cy, { count: 30 });
```

### `intensityScale(intensity)`

Convert a 1-10 intensity value to a 0.3-1.0 scale factor for particle counts, sizes, etc.

| Param | Type | Description |
|-------|------|-------------|
| `intensity` | `number` | User-configured intensity (1-10) |

**Returns:** `number` in range `[0.3, 1.0]`.

```js
import { intensityScale, spawnParticles } from 'toto-fx/fx';

const scale = intensityScale(userIntensity); // 7 => 0.79
spawnParticles(cx, cy, { count: Math.round(40 * scale) });
```

### `speedScale(ms)`

Scale a duration by the current speed context. `speed > 1` = faster (shorter durations), `speed < 1` = slower.

| Param | Type | Description |
|-------|------|-------------|
| `ms` | `number` | Base duration in milliseconds |

**Returns:** `number` -- scaled duration (`ms / speed`).

```js
import { speedScale } from 'toto-fx/fx';

setTimeout(onDone, speedScale(300)); // respects 2x speed
```

### `pCount(n)`

Scale a particle count for the current device tier. Mobile: aggressive reduction. Tablet: 60%. Desktop: full count.

| Param | Type | Description |
|-------|------|-------------|
| `n` | `number` | Desktop particle count |

**Returns:** `number` -- the scaled count.

```js
import { pCount } from 'toto-fx/fx';

const count = pCount(50); // 15 on mobile, 30 on tablet, 50 on desktop
```

### `tickFrame()`

Increment the internal frame counter. Must be called once per animation frame by any animation that uses `shouldShadow()`.

```js
import { tickFrame, shouldShadow } from 'toto-fx/fx';

function render(now) {
  tickFrame();
  if (shouldShadow()) {
    ctx.shadowBlur = 10;
  }
  requestAnimationFrame(render);
}
```

### `shouldShadow()`

Check whether canvas shadow effects should be rendered this frame. Returns `false` on mobile/tablet (always), `true` every 3rd frame on desktop to throttle the expensive GPU blur.

**Returns:** `boolean`

```js
if (shouldShadow()) {
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
} else {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}
```

---

## Canvas

FX manages three canvas layers, all full-viewport, fixed-position, pointer-events:none:

| Canvas | z-index | Purpose | Getter |
|--------|---------|---------|--------|
| Particle canvas | 9998 | ASCII particle rendering | `getCanvas()` |
| Speed lines canvas | 9996 | Radial anime speed lines | `getSpeedCanvas()` |
| FX canvas | 9999 | Custom animation rendering | `getFxCanvas()` |

### `getCanvas()`

Get or create the particle canvas. Lazily creates a full-viewport fixed-position canvas (`#animation-canvas`).

**Returns:** `HTMLCanvasElement`

```js
import { getCanvas } from 'toto-fx/fx';

const canvas = getCanvas();
```

### `getSpeedCanvas()`

Get or create the speed lines canvas (`#speed-lines-canvas`).

**Returns:** `HTMLCanvasElement`

```js
import { getSpeedCanvas } from 'toto-fx/fx';

const canvas = getSpeedCanvas();
```

### `getFxCanvas()`

Get or create the FX canvas (`#fx-canvas`, z-index 9999). Used by animations for custom particle/effect rendering. Re-acquires the canvas if a previous reference was detached from the DOM.

**Returns:** `HTMLCanvasElement`

```js
import { getFxCanvas } from 'toto-fx/fx';

const canvas = getFxCanvas();
```

### `getFxCtx()`

Get the 2D rendering context of the FX canvas. Creates the canvas if needed.

**Returns:** `CanvasRenderingContext2D`

```js
import { getFxCtx } from 'toto-fx/fx';

const ctx = getFxCtx();
ctx.fillStyle = 'red';
ctx.fillRect(100, 100, 50, 50);
```

---

## Drawing Helpers

### `drawAsciiChar(targetCtx, ch, x, y, color, size, alpha, rotation)`

Draw a single ASCII character on a canvas with optional rotation. Uses `ctx.save()/restore()` for transform isolation. Safe but slightly slower than `drawChar`.

| Param | Type | Description |
|-------|------|-------------|
| `targetCtx` | `CanvasRenderingContext2D` | Canvas context to draw on |
| `ch` | `string` | Character to draw |
| `x` | `number` | X coordinate (canvas px) |
| `y` | `number` | Y coordinate (canvas px) |
| `color` | `string` | CSS fill color |
| `size` | `number` | Font size in pixels |
| `alpha` | `number` | Opacity (0-1). Note: currently unused; include alpha in `color` |
| `rotation` | `number` | Rotation angle in radians |

```js
import { drawAsciiChar, getFxCtx } from 'toto-fx/fx';

const ctx = getFxCtx();
drawAsciiChar(ctx, '*', 200, 300, 'rgba(255,200,50,0.8)', 24, 1, Math.PI / 4);
```

### `drawChar(targetCtx, ch, x, y, color, size, alpha, rotation)`

High-performance character drawing. Avoids `ctx.save()/restore()` per call. Only sets font when size changes. Uses manual translate+rotate undo instead of save/restore. Call `resetDrawFont()` at the start of each frame.

| Param | Type | Description |
|-------|------|-------------|
| `targetCtx` | `CanvasRenderingContext2D` | Canvas context to draw on |
| `ch` | `string` | Character to draw |
| `x` | `number` | X coordinate (canvas px) |
| `y` | `number` | Y coordinate (canvas px) |
| `color` | `string` | CSS fill color |
| `size` | `number` | Font size in pixels |
| `alpha` | `number` | Opacity (0-1), set via `globalAlpha` |
| `rotation` | `number` | Rotation angle in radians (0 for none) |

```js
import { drawChar, resetDrawFont, getFxCtx } from 'toto-fx/fx';

const ctx = getFxCtx();
resetDrawFont(); // call once per frame
for (const p of myParticles) {
  drawChar(ctx, p.char, p.x, p.y, p.color, p.size, p.alpha, p.rotation);
}
```

### `resetDrawFont()`

Reset the cached font state for `drawChar`. Call this at the start of each new frame to ensure the first `drawChar` call sets the font correctly.

```js
resetDrawFont();
```

---

## Animation Lifecycle

The animation lifecycle system tracks which elements have running animations, enabling safe cancellation when a new animation starts on the same element.

### `registerAnimation(el, rafId)`

Register a `requestAnimationFrame` ID for an element's running animation.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The animated element |
| `rafId` | `number` | The `requestAnimationFrame` handle |

```js
import { registerAnimation } from 'toto-fx/fx';

const id = requestAnimationFrame(tick);
registerAnimation(el, id);
```

### `setAnimationCleanup(el, cleanupFn)`

Set a cleanup function for an element's animation. Called when the animation is cancelled via `cancelAnimation`.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The animated element |
| `cleanupFn` | `Function` | Cleanup function to call on cancellation |

```js
import { registerAnimation, setAnimationCleanup } from 'toto-fx/fx';

registerAnimation(el, rafId);
setAnimationCleanup(el, () => {
  el.style.cssText = '';
  el.style.display = 'none';
});
```

### `cancelAnimation(el)`

Cancel all running animations on an element. Cancels all registered `requestAnimationFrame` handles and calls the cleanup function if set.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The element whose animation to cancel |

**Returns:** `boolean` -- `true` if an animation was cancelled, `false` if none was running.

```js
import { cancelAnimation } from 'toto-fx/fx';

if (cancelAnimation(el)) {
  console.log('previous animation was cancelled');
}
```

### `deregisterAnimation(el)`

Remove an element from the active animations registry **without** cancelling. Call this after an animation completes normally.

| Param | Type | Description |
|-------|------|-------------|
| `el` | `HTMLElement` | The element to deregister |

```js
import { deregisterAnimation } from 'toto-fx/fx';

// Animation finished normally
deregisterAnimation(el);
```

---

## Context

The runtime context configures per-animation behavior (speed, FX toggles, completion style, dotgrid overrides) without changing every function signature. Set before an animation starts, clear after it ends.

### `setContext(opts?)`

Set the runtime animation context. Called before each animation to configure speed, FX overrides, and completion behavior.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `opts.speed` | `number` | `1` | Speed multiplier (`>1` = faster, `<1` = slower) |
| `opts.fx` | `Object` | `null` | Per-call FX toggle overrides (e.g. `{shake: true, flash: false}`) |
| `opts.fxOverrides` | `Object` | `null` | Alias for `opts.fx` (takes precedence) |
| `opts.completion` | `Object` | `null` | Completion behavior (see `completeAndRemove`) |
| `opts.dotgridOverride` | `{effect, params}\|null` | `null` | Override all dotgrid calls to one effect |
| `opts.dotgridOverride.effect` | `string` | -- | `'ripple'`, `'vortex'`, `'crater'`, `'nuclear'`, `'scorch'`, or `'none'` |
| `opts.dotgridOverride.params` | `Object` | `{}` | Params for the override effect |
| `opts.disableFlash` | `boolean` | `false` | Accessibility: disable all flash effects |
| `opts.particleStyle` | `string` | `null` | Override particle character set (e.g. `'fire'`, `'smoke'`) |
| `opts.resetDotgrid` | `boolean` | `false` | Reset dotgrid state before animation |

```js
import { setContext, clearContext, spawnParticles, doScreenShake } from 'toto-fx/fx';

setContext({
  speed: 2,
  fx: { shake: true, flash: false, dotgrid: true },
  completion: { badgeText: 'NICE', badgeColor: 'gold' },
});

// ... run animation (all durations halved, flash disabled) ...

clearContext();
```

### `clearContext()`

Reset the runtime context to defaults (speed=1, no overrides). Call after each animation completes. Also stops orphaned speed lines.

```js
import { clearContext } from 'toto-fx/fx';

clearContext();
```

---

## State and Query

### `fxConfig`

Default FX toggles object. Used as fallback when no per-animation context overrides are set. This object is mutable -- settings UI can write to it directly.

```js
import { fxConfig } from 'toto-fx/fx';

// Read
console.log(fxConfig.speedLines); // true

// Write (e.g. from settings UI)
fxConfig.shake = false;
fxConfig.dotgrid = false;
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `speedLines` | `boolean` | `true` | Enable speed lines |
| `flash` | `boolean` | `true` | Enable impact flash |
| `shake` | `boolean` | `true` | Enable screen shake |
| `dotgrid` | `boolean` | `!isMobile` | Enable dotgrid effects (off on mobile) |
| `cardSquash` | `boolean` | `true` | Enable card squash on impact |

### `fxEnabled(key)`

Check if an FX layer is enabled. Reads from per-animation context first, then falls back to `fxConfig` defaults. Respects accessibility `disableFlash` override.

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | FX key: `'shake'`, `'flash'`, `'dotgrid'`, `'speedLines'`, `'cardSquash'` |

**Returns:** `boolean`

```js
import { fxEnabled } from 'toto-fx/fx';

if (fxEnabled('shake')) {
  doScreenShake(false);
}
```

### `isMobile`

`boolean` -- `true` if the current device is mobile (detected via user agent and viewport width <= 768px with touch). Read-only.

### `isTablet`

`boolean` -- `true` if the current device is a tablet (touch device, viewport 768-1366px, not mobile). Handles iPadOS 13+ desktop user agent. Read-only.

### `isIdle()`

Check whether the FX system is idle (no particles or speed lines active).

**Returns:** `boolean`

```js
import { isIdle } from 'toto-fx/fx';

if (isIdle()) {
  console.log('safe to tear down');
}
```

### `getAdaptiveQuality()`

Get the current adaptive quality level. Degrades automatically when the browser cannot maintain 60fps. Recovers when frame budget is met again.

**Returns:** `number` -- `1.0` (full quality) or `0.5` (degraded: particles culled, speed lines skipped).

```js
import { getAdaptiveQuality } from 'toto-fx/fx';

if (getAdaptiveQuality() < 1) {
  // reduce effect complexity
}
```

---

## Warmup

### `warmup()`

Warm up the animation pipeline during idle time to eliminate first-animation delay. Eagerly initializes canvas contexts and runs a silent off-screen phantom animation to warm JIT, compositor layers, and layout caches.

Automatically runs on import via `requestIdleCallback` (or `setTimeout(200)` fallback) unless disabled with `configure({ autoWarmup: false })`.

```js
import { warmup } from 'toto-fx/fx';

// Manual warmup (e.g. after lazy-loading the module)
warmup();
```

**What it warms:**
- Particle canvas and speed lines canvas creation + sizing
- `promoteCard` / `cleanupCard` layout path
- Impact flash overlay element caching
- Screen shake CSS class path

**Opt out:**

```js
import { configure } from 'toto-fx/fx';
configure({ autoWarmup: false }); // must call before the module's deferred init fires
```

---

## Param Resolution

### `resolveParams(descriptors, overrides?)`

Merge parameter descriptors with optional overrides. Duration parameters (unit: `'ms'`) are automatically scaled by the current speed context.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `descriptors` | `Object` | -- | Parameter descriptors: `{key: {default, unit?}}` |
| `overrides` | `Object` | `{}` | Override values keyed by parameter name |

**Returns:** `Object` -- resolved parameter values.

```js
import { resolveParams } from 'toto-fx/fx';

const params = resolveParams({
  liftHeight: { default: 450 },
  liftDuration: { default: 350, unit: 'ms' },
  particles: { default: 30 },
}, { liftHeight: 600 });

// With speed=2: { liftHeight: 600, liftDuration: 175, particles: 30 }
```

---

## Full Pipeline Example

A complete lift-fall-impact animation using the standard helpers:

```js
import {
  setContext, clearContext,
  getSubElements, getItemRect,
  liftCard, gravityFall, standardImpact,
  spawnParticles, completeAndRemove,
} from 'toto-fx/fx';

export function play(el, ctx) {
  setContext({
    speed: ctx.speed || 1,
    fx: ctx.fx,
    completion: ctx.completion,
  });

  const sub = getSubElements(el);
  const pos = getItemRect(el);

  liftCard(el, sub.shadow, pos.cx, pos.cy, 450, 350, -6, 2, () => {
    gravityFall(el, sub.shadow, 450, -6, 2, 200, 3, pos.cx, pos.cy, () => {
      standardImpact(el, sub.shadow, sub.burst, pos.cx, pos.cy);
      spawnParticles(pos.cx, pos.cy, { count: 40, spread: 10 });
      completeAndRemove(el, sub.badge, sub.strike, 300, () => {
        clearContext();
        if (ctx.onDone) ctx.onDone();
      });
    });
  });
}
```

---

## The `FX` Namespace Object

All exports are also available on the `FX` convenience object:

```js
import { FX } from 'toto-fx/fx';

FX.configure({ ... });
FX.setDotgrid(Dotgrid);
FX.spawnParticles(cx, cy, { count: 30 });
FX.doScreenShake(false);
FX.isIdle(); // true
FX.adaptiveQuality; // 1.0 (getter)
```

The `FX` object contains every function and constant documented on this page. Use it when passing the entire FX toolkit as a single reference to a plugin or subsystem.
