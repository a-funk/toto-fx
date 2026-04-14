# toto-fx-vue

Vue 3 integration for the [toto-fx](https://github.com/a-funk/toto-fx) animation engine.

> **Community Preview** — This package is untested and uncompiled. The API surface is designed but has not been validated against a running Vue application. Use at your own risk, and please report issues.

## Install

```bash
npm install toto-fx toto-fx-vue
```

## Quick Start

```ts
// main.ts
import { createApp } from 'vue';
import { TotoFXPlugin } from 'toto-fx-vue';
import thudPlugin from 'toto-fx/plugins/thud';

const app = createApp(App);
app.use(TotoFXPlugin, { plugins: [thudPlugin] });
app.mount('#app');
```

```vue
<!-- Component.vue -->
<template>
  <div v-toto-action="{ style: 'thud', variant: 'anime-slam' }">Click me</div>
</template>
```

## API

| Export | Type | Description |
|--------|------|-------------|
| `TotoFXPlugin` | Plugin | Vue plugin — creates engine + optional dotgrid |
| `useTotoFX()` | Composable | Returns `{ engine, dotgrid }` |
| `usePlay(category)` | Composable | Returns `(element, opts?) => void` |
| `usePersist(category, key)` | Composable | Returns `{ isActive, set, clear, toggle }` |
| `useDotgridEffect()` | Composable | Returns `(name, args) => void` |
| `v-toto-action` | Directive | One-shot animation on click |
| `v-toto-persist` | Directive | Persistent animation lifecycle |
| `TotoFXDotgrid` | Component | Renders a dotgrid background |
