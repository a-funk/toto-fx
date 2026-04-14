# toto-fx-react

React integration for the [toto-fx](https://github.com/a-funk/toto-fx) animation engine.

> **Community Preview** — This package is untested and uncompiled. The API surface is designed but has not been validated against a running React application. Use at your own risk, and please report issues.

## Install

```bash
npm install toto-fx toto-fx-react
```

## Quick Start

```tsx
import { TotoFXProvider, usePlay, useAnimationRef } from 'toto-fx-react';
import thudPlugin from 'toto-fx/plugins/thud';

function App() {
  return (
    <TotoFXProvider plugins={[thudPlugin]}>
      <Card />
    </TotoFXProvider>
  );
}

function Card() {
  const [ref, play] = useAnimationRef('action');
  return (
    <div ref={ref} onClick={() => play({ style: 'thud', variant: 'anime-slam' })}>
      Click me
    </div>
  );
}
```

## API

| Export | Type | Description |
|--------|------|-------------|
| `TotoFXProvider` | Component | Context provider — creates engine + optional dotgrid |
| `useTotoFX()` | Hook | Returns `{ engine, dotgrid }` |
| `usePlay(category)` | Hook | Returns `(element, opts?) => void` |
| `usePersist(category, key)` | Hook | Returns `{ isActive, set, clear, toggle }` |
| `useAnimationRef(category)` | Hook | Returns `[ref, playFn]` |
| `useDotgridEffect()` | Hook | Returns `(name, args) => void` |
| `useEngineEvent(event, fn)` | Hook | Subscribe to engine events with auto-cleanup |
| `TotoFXDotgrid` | Component | Renders a dotgrid background |
