import {
  createContext,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import {
  createEngine,
  createDotgrid,
  type TotoFXEngine,
  type TotoFXConfig,
  type AnimationPlugin,
  type DotgridConfig,
  type DotgridInstance,
} from 'toto-fx';

// ── Context ────────────────────────────────────────────────────

export interface TotoFXContextValue {
  engine: TotoFXEngine;
  dotgrid: DotgridInstance | null;
}

export const TotoFXContext = createContext<TotoFXContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

export interface TotoFXProviderProps {
  /** Animation plugins to register via engine.use() */
  plugins?: AnimationPlugin[];
  /** Dotgrid effect plugins to register via grid.use() */
  dotgridPlugins?: any[];
  /** Config passed to createEngine(). resolveElement is auto-set to use data-toto-key attributes. */
  engineConfig?: Partial<TotoFXConfig>;
  /** Config passed to createDotgrid(). If provided, creates and manages a dotgrid instance. */
  dotgridConfig?: Partial<DotgridConfig>;
  children: ReactNode;
}

/**
 * Context provider that creates and manages a shared toto-fx engine
 * and an optional dotgrid instance.
 *
 * @example
 * ```tsx
 * <TotoFXProvider
 *   plugins={[thudPlugin, cutePlugin]}
 *   dotgridPlugins={[ripplePlugin, heartPlugin]}
 *   dotgridConfig={{ container: '#bg', baseOpacity: 0.15 }}
 *   engineConfig={{ debug: true }}
 * >
 *   {children}
 * </TotoFXProvider>
 * ```
 */
export function TotoFXProvider({
  plugins,
  dotgridPlugins,
  engineConfig,
  dotgridConfig,
  children,
}: TotoFXProviderProps) {
  // Imperative singletons stored in refs — not state — because they
  // are mutable objects that should never trigger re-renders.
  const engineRef = useRef<TotoFXEngine | null>(null);
  const dotgridRef = useRef<DotgridInstance | null>(null);
  const contextRef = useRef<TotoFXContextValue | null>(null);

  // Lazily create the engine and dotgrid on first render so the
  // context value is available synchronously for child hooks.
  if (engineRef.current === null) {
    const engine = createEngine({
      ...engineConfig,
      resolveElement:
        engineConfig?.resolveElement ??
        ((key: string) =>
          document.querySelector<HTMLElement>(
            `[data-toto-key="${key}"]`,
          )),
    });

    // Register animation plugins
    if (plugins) {
      for (const plugin of plugins) {
        engine.use(plugin);
      }
    }

    engineRef.current = engine;

    // Create dotgrid if config is provided
    if (dotgridConfig) {
      const grid = createDotgrid(dotgridConfig as DotgridConfig);

      if (dotgridPlugins) {
        for (const plugin of dotgridPlugins) {
          grid.use(plugin);
        }
      }

      dotgridRef.current = grid;

      // Wire dotgrid into the engine so engine.dotgridEffect() works
      engine.setDotgrid(grid);
    }

    contextRef.current = {
      engine: engineRef.current,
      dotgrid: dotgridRef.current,
    };
  }

  // Lifecycle: init on mount, destroy on unmount.
  useEffect(() => {
    const engine = engineRef.current!;
    const grid = dotgridRef.current;

    engine.init();
    if (grid) grid.init();

    return () => {
      engine.destroy();
      if (grid) grid.destroy();
    };
  }, []);

  return (
    <TotoFXContext.Provider value={contextRef.current!}>
      {children}
    </TotoFXContext.Provider>
  );
}
