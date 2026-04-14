# toto-fx-svelte

Svelte 4/5 integration for the [toto-fx](https://github.com/a-funk/toto-fx) animation engine.

> **Community Preview** — This package is untested and uncompiled. The API surface is designed but has not been validated against a running Svelte application. Use at your own risk, and please report issues.

## Install

```bash
npm install toto-fx toto-fx-svelte
```

## Quick Start

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { initTotoFX } from 'toto-fx-svelte';
  import thudPlugin from 'toto-fx/plugins/thud';

  initTotoFX({ plugins: [thudPlugin] });
</script>

<slot />
```

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import { totoAction } from 'toto-fx-svelte';
</script>

<div use:totoAction={{ style: 'thud', variant: 'anime-slam' }}>Click me</div>
```

## API

| Export | Type | Description |
|--------|------|-------------|
| `initTotoFX(opts)` | Function | Initialize engine + optional dotgrid in Svelte context |
| `getTotoFX()` | Function | Returns `{ engine, dotgrid }` from context |
| `totoAction` | Action | `use:totoAction` — one-shot animation on click |
| `totoPersist` | Action | `use:totoPersist` — persistent animation lifecycle |
| `totoDotgridEffect` | Action | `use:totoDotgridEffect` — dotgrid effect on click |
| `createAnimationStore(cat, key)` | Function | Readable store tracking `isActive` state |
| `TotoFXDotgrid` | Component | Renders a dotgrid background |
