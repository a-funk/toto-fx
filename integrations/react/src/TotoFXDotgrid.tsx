import { useRef, useEffect, type CSSProperties } from 'react';
import {
  createDotgrid,
  type DotgridConfig,
  type DotgridInstance,
} from 'toto-fx';
import { useTotoFX } from './useTotoFX';

export interface TotoFXDotgridProps {
  /** CSS class name for the container div. */
  className?: string;
  /** Inline styles for the container div. */
  style?: CSSProperties;
  /** Dotgrid configuration. The `container` field is auto-set to the rendered div. */
  config?: Partial<Omit<DotgridConfig, 'container'>>;
  /** Dotgrid effect plugins to register via grid.use(). */
  plugins?: any[];
}

/**
 * Component that renders a dotgrid background into a container div.
 * Creates its own dotgrid instance, initializes on mount, destroys on
 * unmount, and registers with the provider's engine via `setDotgrid`.
 *
 * @example
 * ```tsx
 * <TotoFXDotgrid className="bg" config={{ baseOpacity: 0.15 }} />
 * ```
 */
export function TotoFXDotgrid({
  className,
  style,
  config,
  plugins,
}: TotoFXDotgridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DotgridInstance | null>(null);
  const { engine } = useTotoFX();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const grid = createDotgrid({
      ...config,
      container,
    } as DotgridConfig);

    if (plugins) {
      for (const plugin of plugins) {
        grid.use(plugin);
      }
    }

    grid.init();

    // Wire this dotgrid into the engine so engine.dotgridEffect() works
    engine.setDotgrid(grid);

    gridRef.current = grid;

    return () => {
      grid.destroy();
      gridRef.current = null;
    };
    // Only run on mount/unmount. Config and plugins are captured once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} style={style} />;
}
