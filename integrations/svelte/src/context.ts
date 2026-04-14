import { setContext, getContext } from 'svelte';
import {
  createEngine,
  createDotgrid,
  type TotoFXEngine,
  type TotoFXConfig,
  type AnimationPlugin,
  type DotgridConfig,
  type DotgridInstance,
} from 'toto-fx';

const TOTO_FX_KEY = Symbol('toto-fx');

export interface TotoFXContext {
  engine: TotoFXEngine;
  dotgrid: DotgridInstance | null;
}

export interface InitTotoFXOptions {
  /** Animation plugins to register via engine.use() */
  plugins?: AnimationPlugin[];
  /** Dotgrid effect plugins to register via grid.use() */
  dotgridPlugins?: any[];
  /** Config passed to createEngine() */
  engineConfig?: Partial<TotoFXConfig>;
  /** Config passed to createDotgrid(). If provided, creates and manages a dotgrid instance. */
  dotgridConfig?: Partial<DotgridConfig>;
}

/**
 * Initialize a toto-fx engine and optional dotgrid in Svelte context.
 * Call this in a layout/root component's `<script>` block.
 *
 * Creates the engine and dotgrid, registers plugins, calls init(),
 * and sets Svelte context so any child component can call getTotoFX().
 *
 * @returns `{ engine, dotgrid, destroy }` for manual teardown if needed.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { initTotoFX } from 'toto-fx-svelte';
 *   import { thudPlugin } from 'toto-fx/plugins/thud';
 *   import { ripplePlugin } from 'toto-fx/plugins/ripple';
 *
 *   const { engine, dotgrid, destroy } = initTotoFX({
 *     plugins: [thudPlugin],
 *     dotgridPlugins: [ripplePlugin],
 *     engineConfig: { debug: true },
 *     dotgridConfig: { container: '#bg' },
 *   });
 * </script>
 * ```
 */
export function initTotoFX(options: InitTotoFXOptions = {}): TotoFXContext & { destroy: () => void } {
  const { plugins, dotgridPlugins, engineConfig, dotgridConfig } = options;

  const engine = createEngine({
    ...engineConfig,
    resolveElement:
      engineConfig?.resolveElement ??
      ((key: string) =>
        document.querySelector<HTMLElement>(`[data-toto-key="${key}"]`)),
  });

  if (plugins) {
    for (const plugin of plugins) {
      engine.use(plugin);
    }
  }

  let dotgrid: DotgridInstance | null = null;

  if (dotgridConfig) {
    dotgrid = createDotgrid(dotgridConfig as DotgridConfig);

    if (dotgridPlugins) {
      for (const plugin of dotgridPlugins) {
        (dotgrid as any).use(plugin);
      }
    }

    (engine as any).setDotgrid(dotgrid);
  }

  engine.init();
  if (dotgrid) (dotgrid as any).init();

  const ctx: TotoFXContext = { engine, dotgrid };

  setContext(TOTO_FX_KEY, ctx);

  function destroy() {
    engine.destroy();
    if (dotgrid) dotgrid.destroy();
  }

  return { engine, dotgrid, destroy };
}

/**
 * Retrieve the toto-fx engine and dotgrid from Svelte context.
 * Must be called inside a component that is a descendant of one
 * that called `initTotoFX()`.
 *
 * @throws If context has not been initialized.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { getTotoFX } from 'toto-fx-svelte';
 *   const { engine, dotgrid } = getTotoFX();
 * </script>
 * ```
 */
export function getTotoFX(): TotoFXContext {
  const ctx = getContext<TotoFXContext | undefined>(TOTO_FX_KEY);
  if (!ctx) {
    throw new Error(
      'getTotoFX(): no toto-fx context found. ' +
      'Did you call initTotoFX() in a parent component?'
    );
  }
  return ctx;
}
