# Animation Variant Cheatsheet

59 animations across 3 categories. Every variant listed with what it looks like and how to trigger it.

**[Try them all in the playground](https://toto.tech/playground)** — click any variant to preview it live.

---

## Action (one-shot completion effects)

Play with: `engine.play('action', el, { params: { style, variant } })`

### Thud style — 10 variants

| Variant | Description |
|---------|-------------|
| `anime-slam` | Lifts the card up, rotates slightly, then gravity-slams it down with an impact burst and particles. |
| `low-bounce` | Gentle low-height lift with a quick bounce on impact. |
| `stratosphere` | Launches the card to extreme height with an extra-heavy glow on landing. |
| `orbit-slam` | Lifts the card, orbits it 360 degrees at the peak, then slams it down. |
| `crater` | Lift-and-fall with a dotgrid crater radiating from the impact point. |
| `deep-crater` | Heavy crater impact with fire particles and a card-sink effect. |
| `meteor` | Card descends at an angle with a fire trail, leaving a scorch mark on the dotgrid. |
| `detonation` | Initial impact followed by a delayed secondary explosion with blast particles and smoke. |
| `nuclear` | White-out screen flash with a mushroom cloud particle system. |
| `shatter` | Card shatters into ASCII fragments that scatter with physics. |

```javascript
engine.play('action', el, { params: { style: 'thud', variant: 'anime-slam' } });
```

### Cute style — 13 variants

| Variant | Description |
|---------|-------------|
| `confetti` | Rainbow confetti characters explode outward with rotation, drift, and gravity. |
| `flowers` | Lush garden burst with multiple flower species, butterflies, and bees. |
| `sparkle` | Twinkling sparkle characters rise upward with blinking and glow. |
| `shooting-star` | Card launches across the screen as a shooting star with a sparkle trail. |
| `butterflies` | Butterflies emerge from the card and flutter upward with wing-flapping animation. |
| `rainbow` | Card rides across a ROYGBIV rainbow arc with a sparkle trail. |
| `fireworks` | Card launches upward then bursts into multi-pattern firework explosions. |
| `hearts` | Hearts burst outward with pulsing, splitting, and glow effects. |
| `cat` | ASCII cats appear with purring, paw prints, and floating charm particles. |
| `dog` | Happy tail-wagging ASCII dogs with barking, bones, and bouncing ears. |
| `snowfall` | Gentle snowflakes drift down with ice crystals and snow accumulation. |
| `ocean` | Waves, swimming fish, rising bubbles, and swaying seaweed. |
| `fireflies` | Warm summer night with pulsing firefly glow, foliage silhouettes, and star twinkles. |

```javascript
engine.play('action', el, { params: { style: 'cute', variant: 'confetti' } });
```

---

### Destroy style — 11 variants

| Variant | Description |
|---------|-------------|
| `explode` | Directional ASCII fragment explosion with smoke puffs. |
| `incinerate` | Fast burn from bottom to top with ASCII flame characters. |
| `shredder` | Sword slashes cut the card into strips that tumble and fall. |
| `guillotine` | Blade drops and cuts the card in two; halves tumble apart. |
| `heartbeat` | Accelerating pulse with an ECG spike trace, then flatline. |
| `sniper` | Crosshair locks on target, then fires — card falls over. |
| `eaten` | ASCII jaws approach and chomp the card with crumbs falling. |
| `lightning` | Thick ASCII lightning bolt strikes the card with swirling energy. |
| `steamroller` | ASCII roller drives across and crushes the card flat. |
| `piranhas` | ASCII fish swarm bites at the card edges. |
| `woodchipper` | Card feeds into a chipper machine; ASCII chunks spray out. |

```javascript
engine.play('action', el, { params: { style: 'destroy', variant: 'explode' } });
```

---

## Enter (one-shot creation effects)

Play with: `engine.play('enter', el, { params: { style, variant } })`

### Subtle style — 5 variants

| Variant | Description |
|---------|-------------|
| `fade-in` | Simple opacity fade from invisible to fully visible. |
| `slide-in` | Slides in from the right edge. |
| `unfold` | Unfolds from zero height, revealing content top-down. |
| `typewriter` | Text appears character by character like a typewriter. |
| `rise` | Rises up from below with a slight fade. |

```javascript
engine.play('enter', el, { params: { style: 'subtle', variant: 'fade-in' } });
```

### Dramatic style — 5 variants

| Variant | Description |
|---------|-------------|
| `slam-down` | Drops from above with a heavy impact, like slamming a card onto a desk. |
| `scale-bounce` | Scales up from center with an elastic bounce overshoot. |
| `materialize` | Pixelates and glitches into existence like digital materialization. |
| `portal` | Circular reveal expanding from the center with a particle ring. |
| `glitch-in` | RGB split and offset glitch effect entrance. |

```javascript
engine.play('enter', el, { params: { style: 'dramatic', variant: 'portal' } });
```

### Fun style — 5 variants

| Variant | Description |
|---------|-------------|
| `confetti-drop` | Card drops in with confetti particles celebrating the arrival. |
| `sparkle-trail` | Card fades in with trailing sparkle particles. |
| `butterfly-carry` | Tiny butterflies carry the card in from the side. |
| `bounce-in` | Bouncy spring physics entrance — drops in and bounces to rest. |
| `grow` | Grows from a seed dot in the center, like a plant sprouting. |

```javascript
engine.play('enter', el, { params: { style: 'fun', variant: 'bounce-in' } });
```

---

## Persist (toggle-able in-progress effects)

Start with: `engine.set('persist', key, { style, variant })`
Stop with: `engine.clear('persist', key)`

### Ambient style — 5 variants

| Variant | Description |
|---------|-------------|
| `glow` | Pulsing box-shadow glow around the card. |
| `pulse` | Subtle repeating scale pulse. |
| `colored-border` | Border color cycles through an animated gradient. |
| `shimmer` | Sliding highlight overlay moves across the card surface. |
| `breathing` | Gentle opacity fade in and out, like breathing. |

```javascript
engine.set('persist', 'task-1', { style: 'ambient', variant: 'glow' });
engine.clear('persist', 'task-1');  // stop
```

### Rich style — 5 variants

| Variant | Description |
|---------|-------------|
| `snake-border` | Dots orbit along the card border in a continuous loop. |
| `particle-orbit` | Particles orbit the card with a slight wobble. |
| `corner-accents` | Animated L-shaped accents pulse at each corner. |
| `heartbeat` | Double-beat scale pulse pattern, like a heartbeat. |
| `progress-bar` | Indeterminate sliding progress indicator along the bottom edge. |

```javascript
engine.set('persist', 'task-1', { style: 'rich', variant: 'particle-orbit' });
engine.clear('persist', 'task-1');  // stop
```
