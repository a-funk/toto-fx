/**
 * TotoFX — State-Driven Rendering Architecture (SDRA) animation engine.
 *
 * @packageDocumentation
 */

// ── Engine ──────────────────────────────────────────────────

export interface TotoFXConfig {
  /** Root element for DOM observation. Default: document.body */
  root?: HTMLElement;
  /** Default element resolver: maps opaque string keys to DOM elements */
  resolveElement?: ElementResolver;
  /** Refresh callback: called when a group needs content update */
  onRefresh?: (groupId: string) => void | Promise<void>;
  /** Container resolver for layout animation */
  containerResolver?: (groupId: string) => HTMLElement | null;
  /** Layout animation duration in ms. Default: 300 */
  layoutDuration?: number;
  /** Enable debug mode with console warnings. Default: false */
  debug?: boolean;
  /** Layout animation CSS easing. Default: 'ease-out' */
  layoutEasing?: string;
  /** Refresh coordinator debounce window in ms. Default: 100 */
  debounceMs?: number;
  /** When 'respect', checks prefers-reduced-motion and passes ctx.reducedMotion to plugins. Default: 'ignore' */
  reducedMotion?: 'respect' | 'ignore';
}

export type ElementResolver = (key: string) => HTMLElement | null;

export interface CategoryDescriptor {
  /** Optional: custom resolver for this category */
  resolve?: ElementResolver;
  /** How to play the animation on an element */
  play: (el: HTMLElement, params: CategoryPlayParams) => void;
}

export interface CategoryPlayParams {
  onDone?: () => void;
  elapsed?: number;
  style?: string;
  variant?: string;
  params?: Record<string, any>;
  key?: string;
  groupId?: string;
  styleOverride?: { style?: string; variant?: string };
  /** true when user prefers reduced motion and engine is configured with reducedMotion: 'respect' */
  reducedMotion?: boolean;
}

export interface PlayOptions {
  onDone?: () => void;
  styleOverride?: { style?: string; variant?: string };
  params?: Record<string, any>;
}

export interface AnimationPlugin {
  name?: string;
  install?: (engine: TotoFXEngine, config?: any) => void;
  categories?: Record<string, CategoryDescriptor>;
  fx?: Record<string, FXLayer>;
}

export interface FXLayer {
  apply?: (el: HTMLElement, opts?: any) => void;
  trigger?: (el: HTMLElement, opts?: any) => void;
  params?: Record<string, ParamDescriptor>;
}

export interface ParamDescriptor {
  label: string;
  type: 'range' | 'select' | 'toggle' | 'color';
  min?: number;
  max?: number;
  default?: any;
  step?: number;
  unit?: string;
  group?: string;
  options?: Array<{ value: string; label: string }>;
}

export type EngineEvent = 'animationStart' | 'animationEnd' | 'reconcile';

export interface AnimationEventData {
  type: 'persistent' | 'transient';
  category: string;
  key: string;
  element: HTMLElement | null;
}

export interface ReconcileEventData {
  persistentCount: number;
  transientCount: number;
}

export interface TotoFXEngine {
  version: string;

  // Configuration
  configure(opts: Partial<TotoFXConfig> & {
    variantLookup?: (category: string, style: string, variant: string) => any;
    stopHandler?: (el: HTMLElement) => void;
    fxContextManager?: { set(ctx: any): void; clear(): void };
  }): void;

  // Events
  on(event: 'animationStart' | 'animationEnd', fn: (data: AnimationEventData) => void): void;
  on(event: 'reconcile', fn: (data: ReconcileEventData) => void): void;
  off(event: EngineEvent, fn: Function): void;

  // Lifecycle
  init(): void;
  destroy(): void;
  reconcile(): void;
  refreshSettings(): void;

  // Persistent animations
  set(category: string, key: string, params?: {
    style?: string;
    variant?: string;
    groupId?: string;
    params?: Record<string, any>;
  }): void;
  clear(category: string, key: string): void;
  isActive(category: string, key: string): boolean;
  getActiveKeys(category: string): Set<string>;

  // One-shot animations
  play(category: string, el: HTMLElement, opts?: PlayOptions): void;
  transition(key: string, toCategory: string, opts?: PlayOptions): void;

  // Element resolution
  resolveElement(key: string): HTMLElement | null;

  // Queries
  isAnimating(groupId?: string): boolean;

  // Layout animation
  animatedRefresh(groupId: string, swapFn: (groupId: string) => void | Promise<void>): void;
  captureLayout(groupId: string): any;
  animateAfterSwap(groupId: string, snapshot: any): void;

  // Refresh coordination
  scheduleRefresh(groupId: string): void;
  scheduleImmediateRefresh(groupId: string): void;
  beginTransaction(): void;
  commitTransaction(): void;

  // Registration
  registerCategory(name: string, descriptor: CategoryDescriptor): void;
  getCategory(name: string): CategoryDescriptor | null;
  getCategoryNames(): string[];
  use(plugin: AnimationPlugin, config?: any): void;
  register(category: string, style: string, variants: Record<string, any>): void;
  registerFX(name: string, layer: FXLayer): void;
  getFX(name: string): FXLayer | null;

  // Internals (exposed for advanced use)
  _state: typeof StateStore;
  _config: any;
  _categories: Record<string, CategoryDescriptor>;
}

export function createEngine(config?: TotoFXConfig): TotoFXEngine;

// ── State Store ─────────────────────────────────────────────

export interface PersistentEntry {
  category: string;
  style: string;
  variant: string;
  params: Record<string, any>;
  startedAt: number;
  groupId: string;
  version: number;
}

export interface TransientEntry {
  category: string;
  groupId: string;
  startedAt: number;
  onDone: (() => void) | null;
  element: HTMLElement | null;
}

export interface StateStoreInstance {
  _persistent: Map<string, PersistentEntry>;
  _transient: Map<string, TransientEntry>;
  _version: number;

  set(category: string, key: string, state: any): void;
  clear(category: string, key: string): void;
  setTransient(category: string, key: string, opts: any): void;
  clearTransient(key: string): void;
  isActive(category: string, key: string): boolean;
  getActiveKeys(category: string): Set<string>;
  isGroupAnimating(groupId: string): boolean;
  hasAnyTransient(): boolean;
  resolveElement(key: string, resolver: ElementResolver): HTMLElement | null;
  invalidateCache(): void;
  getPersistent(key: string): PersistentEntry | undefined;
  gc(resolver: ElementResolver, persistentMaxAge?: number, transientMaxAge?: number): void;
}

/** Create an isolated StateStore instance. Each engine gets its own. */
export function createStateStore(): StateStoreInstance;

/** @deprecated Use createStateStore() for isolated instances. */
export declare const StateStore: StateStoreInstance;

// ── DOM Observer ────────────────────────────────────────────

export interface DOMObserverInstance {
  init(root: HTMLElement, onChange: () => void, opts?: { cleanupHandler?: ((el: HTMLElement) => void) | null }): void;
  destroy(): void;
}

/** Create an isolated DOMObserver instance. */
export function createDOMObserver(store?: StateStoreInstance): DOMObserverInstance;

/** @deprecated Use createDOMObserver() for isolated instances. */
export declare const DOMObserver: DOMObserverInstance;

// ── Animation Key ──────────────────────────────────────────

/** Symbol used to store animation handles on DOM elements. Replaces the old __totoAnimation string key. */
export declare const ANIM_KEY: unique symbol;

// ── Registry & Settings ─────────────────────────────────────

export declare const AnimationRegistry: {
  _categories: Record<string, Record<string, Record<string, any>>>;
  registerCategory(category: string, style: string, variants: Record<string, any>): void;
  getStyles(category: string): string[];
  getVariants(category: string, style: string): string[];
  getAnimation(category: string, style: string, variant: string): any;
  getParams(category: string, style: string, variant: string): Record<string, ParamDescriptor>;
  invoke(anim: any, el: HTMLElement, opts: any, helpers?: any): void;
};

export interface AnimationSettingsInstance {
  readonly storageKey: string;
  readonly defaults: any;
  load(): any;
  save(settings: any): void;
  reset(): void;
  invalidate(): void;
  flattenDotgrid(settings: any): any;
}

export declare const AnimationSettings: AnimationSettingsInstance;

export function createSettings(opts?: {
  storageKey?: string;
  defaults?: any;
}): AnimationSettingsInstance;

export declare const DEFAULT_SETTINGS: any;

export declare const AnimationContext: {
  fromSettings(settings: any, category: string, overrides?: any): any;
};

// ── FX Utilities ────────────────────────────────────────────

export declare const FX: {
  getItemRect(el: HTMLElement): { cx: number; cy: number; left: number; top: number; width: number; height: number };
  liftCard(el: HTMLElement, shadow: HTMLElement | null, cx: number, cy: number, peakZ: number, dur: number, rotX: number, rotY: number, onDone?: () => void): void;
  gravityFall(el: HTMLElement, shadow: HTMLElement | null, peakZ: number, rotX: number, rotY: number, dur: number, exp: number, cx: number, cy: number, onDone?: () => void): void;
  standardImpact(el: HTMLElement, shadow: HTMLElement | null, burst: HTMLElement | null, cx: number, cy: number): void;
  spawnParticles(cx: number, cy: number, opts?: any): void;
  spawnSmoke(cx: number, cy: number, count?: number): void;
  spawnFireTrail(x: number, y: number, angle: number): void;
  pushParticles(arr: any[]): void;
  doScreenShake(heavy?: boolean): void;
  doImpactFlash(whiteOut?: boolean): void;
  flashColor(color: string, durationMs?: number): void;
  startSpeedLines(cx: number, cy: number, direction: number, durationMs: number): void;
  stopSpeedLines(): void;
  doDotgridRipple(cx: number, cy: number, opts?: any): void;
  doDotgridCrater(cx: number, cy: number, radius: number, depth: number, opts?: any): void;
  doDotgridNuclear(cx: number, cy: number): void;
  doDotgridScorch(x1: number, y1: number, x2: number, y2: number, width: number): void;
  getSubElements(el: HTMLElement): { shadow: HTMLElement | null; burst: HTMLElement | null; badge: HTMLElement | null; strike: HTMLElement | null };
  resolveParams(descriptors: Record<string, ParamDescriptor>, overrides?: Record<string, any>): Record<string, any>;
  intensityScale(intensity: number): number;
  speedScale(ms: number): number;
  promoteCard(card: HTMLElement): void;
  completeAndRemove(card: HTMLElement, badge: HTMLElement | null, strike: HTMLElement | null, delayBase: number, onDone?: () => void): void;
  cleanupCard(card: HTMLElement): void;
  removeCard(card: HTMLElement, fadeDelay: number, onDone?: () => void): void;
  prepareCard(el: HTMLElement): { cx: number; cy: number; left: number; top: number; width: number; height: number };
  finalize(el: HTMLElement, opts?: { onDone?: () => void }): void;
  destroyCard(el: HTMLElement): void;
  registerAnimation(el: HTMLElement, rafId: number): void;
  setAnimationCleanup(el: HTMLElement, cleanupFn: () => void): void;
  cancelAnimation(el: HTMLElement): void;
  deregisterAnimation(el: HTMLElement): void;
  setContext(ctx: any): void;
  clearContext(): void;
  isIdle(): boolean;
  getAdaptiveQuality(): string;
  warmup(): void;
  setDotgrid(module: any): void;
  configure(opts: any): void;
  getFxCanvas(): HTMLCanvasElement | null;
  getFxCtx(): CanvasRenderingContext2D | null;
  registerFxDraw(id: string, drawFn: (ctx: CanvasRenderingContext2D, now: number) => void): void;
  deregisterFxDraw(id: string): void;
  nextFxDrawId(prefix?: string): string;
  drawAsciiChar(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, color: string, size: number, alpha: number, rotation?: number): void;
  drawChar(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, color: string, size: number, alpha: number, rotation?: number): void;
  tickFrame(): void;
  shouldShadow(): boolean;
  pCount(n: number): number;
  isMobile: boolean;
  isTablet: boolean;
  fxConfig: Record<string, boolean>;
  fxEnabled(key: string): boolean;
};

export function configureFX(opts: any): void;

// ── Dotgrid ─────────────────────────────────────────────────

export interface DotgridInstance {
  configure(config: any): void;
  reset(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  isIdle(): boolean;
  ripple(cx: number, cy: number, opts?: { radius?: number; push?: number; density?: number; color?: string }): void;
  vortex(cx: number, cy: number, opts?: { radius?: number; speed?: number; pull?: number; density?: number; direction?: 'cw' | 'ccw'; color?: string }): void;
  crater(cx: number, cy: number, radius: number, depth: number, opts?: { cracks?: number; crackLength?: number; color?: string }): void;
  nuclear(cx: number, cy: number, opts?: { blastRadius?: number; color?: string }): void;
  scorch(cx: number, cy: number, opts?: { width?: number; length?: number; color?: string }): void;
}

export interface DotgridConfig {
  container?: HTMLElement | string;
  canvas?: HTMLElement | string;
  dotSize?: number;
  fontSize?: number;
  baseChar?: string;
  baseOpacity?: number;
  palette?: string;
  densityDecay?: number;
  velDecay?: number;
  diffusionRate?: number;
  displacementScale?: number;
  mobile?: any;
  tablet?: any;
}

export function createDotgrid(config?: DotgridConfig): DotgridInstance;
export declare const Dotgrid: DotgridInstance;
export declare const DOTGRID_DEFAULTS: any;
export declare const PALETTE_PRESETS: Record<string, any>;

// ── Theme Manager ───────────────────────────────────────────

export interface ThemeManagerConfig {
  storageKey?: string;
  themeBaseUrl?: string;
  styleElementId?: string;
  serverStyleElementId?: string;
  getActiveThemeId?: () => string | null;
  onThemeChange?: (themeId: string) => void;
  settingsProvider?: any;
}

export interface ThemeManagerInstance {
  loadTheme(themeId: string): Promise<any>;
  getTheme(id: string): any;
  getActive(): string;
  applyTheme(theme: any, preview?: boolean): void;
  setActive(themeId: string): void;
  createCustom(def: any): void;
  particleColor(type: string): [number, number, number];
  chars(type: string): string[];
}

export function createThemeManager(config?: ThemeManagerConfig): ThemeManagerInstance;
export declare const ThemeManager: ThemeManagerInstance;
export declare const BUILTIN_THEMES: string[];
export declare const DEFAULT_CHARS: Record<string, string[]>;
export declare const WARM_THEME: any;

// ── Preset Schema ───────────────────────────────────────────

export declare const PresetSchema: {
  validate(obj: any): { valid: boolean; errors: string[]; normalized: any };
  normalize(obj: any): any;
  toJSON(preset: any): string;
  fromJSON(json: string): any;
};

// ── Defaults ────────────────────────────────────────────────

export declare const DEFAULTS: any;

// ── Plugin Loader ───────────────────────────────────────────

export declare const PluginLoader: {
  load(builtins?: string[], opts?: { manifestUrl?: string; onReady?: () => void }): Promise<void>;
  isReady(): boolean;
  getLoaded(): string[];
  getFailed(): string[];
  getStats(): { loaded: number; failed: number; total: number };
};

// ── Sub-modules ─────────────────────────────────────────────

export function createReconciler(store: StateStoreInstance, config: any, categories: any, opts?: any): any;
export function createRefreshCoordinator(store: StateStoreInstance, deps?: any): any;
export function createLayoutAnimator(opts?: any): any;
