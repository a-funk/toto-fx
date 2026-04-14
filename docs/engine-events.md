# Engine Events

TotoFX engines emit lifecycle events you can subscribe to for logging, debugging, coordination, and UI feedback.

## Subscribing

```javascript
engine.on('animationStart', function (e) {
  console.log(e.category + '/' + e.key + ' started');
});

// Unsubscribe
function handler(e) { /* ... */ }
engine.on('animationEnd', handler);
engine.off('animationEnd', handler);
```

Listener errors are caught internally — a broken listener will never crash the engine or interrupt other animations.

## Events

### `animationStart`

Fires when an animation begins playing, whether persistent or transient.

```javascript
engine.on('animationStart', function (e) {
  // e.type      — 'persistent' or 'transient'
  // e.category  — 'action', 'enter', 'persist', etc.
  // e.key       — element key string
  // e.element   — the DOM element being animated
});
```

**When it fires:**
- `engine.set()` — fires after the persistent animation starts on the resolved element
- `engine.play()` — fires after the one-shot animation begins

### `animationEnd`

Fires when an animation stops, either because it completed naturally or was cleared.

```javascript
engine.on('animationEnd', function (e) {
  // Same shape as animationStart:
  // e.type, e.category, e.key, e.element
});
```

**When it fires:**
- Persistent: `engine.clear()` clears the animation state and fires this event
- Transient: the plugin calls `onDone()`, engine cleans up and fires this event

### `reconcile`

Fires after a reconciliation pass completes — when the engine has diffed animation state against the DOM and applied any needed changes.

```javascript
engine.on('reconcile', function (e) {
  // e.persistentCount  — number of active persistent animations
  // e.transientCount   — number of active transient animations
});
```

**When it fires:**
- After `engine.init()` runs its first reconciliation
- After DOM mutations are detected by the MutationObserver
- After `engine.reconcile()` is called manually
- After `engine.set()` or `engine.clear()` triggers re-reconciliation

## Use Cases

### Debug logging

```javascript
if (isDev) {
  engine.on('animationStart', function (e) {
    console.log('[anim]', e.type, e.category, e.key);
  });
  engine.on('animationEnd', function (e) {
    console.log('[anim] done', e.category, e.key);
  });
}
```

### Waiting for all animations to finish

```javascript
function onAllDone(callback) {
  function check(e) {
    if (!engine.isAnimating()) {
      engine.off('animationEnd', check);
      callback();
    }
  }
  engine.on('animationEnd', check);
}

// Usage: wait for all destroy animations, then refresh the list
onAllDone(function () {
  fetchAndReplaceList();
});
```

### Animation counters / progress UI

```javascript
var activeCount = 0;

engine.on('animationStart', function () { activeCount++; });
engine.on('animationEnd', function () { activeCount--; });
engine.on('reconcile', function (e) {
  document.getElementById('anim-count').textContent =
    e.persistentCount + ' persistent, ' + e.transientCount + ' transient';
});
```

### Coordinating with external systems

```javascript
// Disable pointer events while action animations play
engine.on('animationStart', function (e) {
  if (e.category === 'action') {
    e.element.style.pointerEvents = 'none';
  }
});

engine.on('animationEnd', function (e) {
  if (e.category === 'action') {
    e.element.style.pointerEvents = '';
  }
});
```

## Event Data Reference

| Event | Property | Type | Description |
|-------|----------|------|-------------|
| `animationStart` / `animationEnd` | `type` | `'persistent' \| 'transient'` | Whether this is a long-running or one-shot animation |
| | `category` | `string` | Animation category (`'action'`, `'enter'`, `'persist'`) |
| | `key` | `string` | Element identity key |
| | `element` | `HTMLElement` | The DOM element being animated |
| `reconcile` | `persistentCount` | `number` | Active persistent animation count after reconciliation |
| | `transientCount` | `number` | Active transient animation count after reconciliation |
