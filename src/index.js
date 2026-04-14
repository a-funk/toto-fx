/**
 * @module toto-fx
 * @description State-driven animation engine for web UIs.
 *
 * Manages persistent animations across DOM mutations with automatic
 * reconciliation. Framework-agnostic: works with any DOM manipulation
 * library (htmx, React, Vue, vanilla JS).
 *
 * @example
 * // ESM import
 * import { createEngine } from 'toto-fx';
 *
 * const engine = createEngine({
 *   resolveElement: (key) => document.querySelector(`[data-id="${key}"]`),
 * });
 *
 * engine.registerCategory('highlight', {
 *   play: (el, params) => {
 *     el.classList.add('highlight');
 *     setTimeout(() => {
 *       el.classList.remove('highlight');
 *       if (params.onDone) params.onDone();
 *     }, 1000);
 *   },
 * });
 *
 * engine.init();
 * engine.set('highlight', 'item-1');
 *
 * @example
 * // IIFE / script tag (uses window.TotoFX)
 * <script src="toto-fx.min.js"></script>
 * <script>
 *   var engine = TotoFX.createEngine({ ... });
 *   engine.init();
 * </script>
 */

// Core engine
export { createEngine } from './engine.js';
export { createStateStore, StateStore } from './state-store.js';
export { createDOMObserver, DOMObserver } from './dom-observer.js';
export { createReconciler, ANIM_KEY } from './reconciler.js';
export { createRefreshCoordinator } from './refresh-coordinator.js';
export { createLayoutAnimator } from './layout-animator.js';

// Registry & settings
export { AnimationRegistry, AnimationSettings, AnimationContext, createSettings, DEFAULT_SETTINGS } from './registry.js';

// Presets & themes
export { PresetSchema } from './preset.js';
export { createThemeManager, ThemeManager, BUILTIN_THEMES, DEFAULT_CHARS, WARM_THEME } from './theme.js';

// FX utilities (particles, physics, effects)
export { FX, configure as configureFX } from './fx.js';

// Dotgrid fluid simulation
export { createDotgrid, Dotgrid, DOTGRID_DEFAULTS, PALETTE_PRESETS } from './dotgrid.js';

// Defaults
export { DEFAULTS } from './defaults.js';

// Plugin loader (for IIFE/script-tag usage)
export { PluginLoader } from './plugin-loader.js';
