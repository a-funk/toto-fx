# Accessibility

TotoFX supports the `prefers-reduced-motion` media query, allowing animations to gracefully degrade for users who have requested reduced motion in their operating system settings.

## Enabling Reduced Motion Support

Pass `reducedMotion: 'respect'` when creating the engine:

```javascript
var engine = TotoFX.createEngine({
  resolveElement: function (key) {
    return document.querySelector('[data-id="' + key + '"]');
  },
  reducedMotion: 'respect',
});
```

When enabled, the engine checks the user's system preference via `window.matchMedia('(prefers-reduced-motion: reduce)')`. If the user prefers reduced motion, every `play()` context will include `reducedMotion: true`.

The default is `'ignore'` — animations play at full intensity regardless of the system setting.

## How It Works

The engine doesn't automatically skip or modify animations. Instead, it passes a `reducedMotion` flag to every plugin's `play()` function, letting each plugin decide how to adapt.

```
Engine config: reducedMotion: 'respect'
        │
        ▼
System preference: prefers-reduced-motion: reduce
        │
        ▼
ctx.reducedMotion = true  →  passed to every play() call
        │
        ▼
Plugin decides: skip particles, use simpler fade, shorten duration, etc.
```

This design gives plugin authors full control. A confetti animation might skip all particles and show a simple opacity pulse instead. A glow animation might reduce its intensity but keep running. A portal entrance might fade in instead of the full circular reveal.

## For Plugin Authors

Check `ctx.reducedMotion` at the top of your `play()` function and provide a simplified alternative:

```javascript
var myPlugin = {
  name: 'burst',
  category: 'action',
  style: 'custom',

  play: function (el, ctx) {
    if (ctx.reducedMotion) {
      // Reduced: simple opacity blink, no particles or shake
      el.style.transition = 'opacity 150ms ease';
      el.style.opacity = '0.5';
      setTimeout(function () {
        el.style.opacity = '1';
        el.style.transition = '';
        ctx.onDone();
      }, 200);
      return;
    }

    // Full animation: particles, screen shake, the works
    var rect = FX.getItemRect(el);
    FX.spawnParticles(rect.cx, rect.cy, { count: 40, spread: 8 });
    FX.doScreenShake();
    // ... rest of animation ...
    ctx.onDone();
  },

  cleanup: function (el) {
    el.style.opacity = '';
    el.style.transition = '';
  },
};
```

### What to Skip

When `ctx.reducedMotion` is `true`, plugins should skip:

| Effect | Why |
|--------|-----|
| Particles | Rapid motion across the screen |
| Screen shake | Disorienting vestibular trigger |
| Impact flashes | Sudden brightness changes |
| Rapid scale/rotation | Fast transform changes |
| Complex multi-phase sequences | Prolonged motion |

### What to Keep (simplified)

| Effect | Reduced alternative |
|--------|-------------------|
| Card entrance | Simple opacity fade-in |
| Completion | Subtle background color flash |
| Persistent glow | Reduce intensity, slow the pulse |
| Destroy/removal | Fade out over 200-300ms |

### Rules

1. **Always call `ctx.onDone()`** — even in the reduced motion path. The engine needs this to clean up state.
2. **Keep the reduced path short** — 200-400ms is enough. The user requested less motion, not a longer wait.
3. **Don't query the media query yourself** — use `ctx.reducedMotion`. The engine handles the query once and passes the result consistently. This also makes testing easier since you can set the flag directly in test contexts.

## Built-in Plugin Behavior

All built-in plugins check `ctx.reducedMotion` and provide simplified alternatives:

| Plugin | Full | Reduced |
|--------|------|---------|
| Thud (anime-slam, meteor, etc.) | Lift, fall, particles, shake, dotgrid effects | Subtle scale pulse |
| Cute (confetti, sparkle, etc.) | Particle bursts with physics | Soft opacity blink |
| Destroy (explode, lightning, etc.) | Complex canvas-rendered destruction | Fade out |
| Creation (slam-down, portal, etc.) | Physics-based entrances | Opacity fade-in |
| In-Progress (glow, particle-orbit, etc.) | Continuous animated effects | Reduced-intensity CSS glow |

## Testing

To test reduced motion behavior without changing your OS settings, pass `reducedMotion: 'respect'` and override the media query in your test:

```javascript
// Force reduced motion in tests
var engine = TotoFX.createEngine({
  reducedMotion: 'respect',
});

// Or test plugin play() directly with the flag:
myPlugin.play(el, {
  reducedMotion: true,
  onDone: function () { console.log('done'); },
  params: {},
});
```

In Chrome DevTools, you can also emulate `prefers-reduced-motion: reduce` under the Rendering tab without changing system settings.
