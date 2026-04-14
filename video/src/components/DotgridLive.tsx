import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig, continueRender, delayRender } from 'remotion';

/**
 * DotgridLive — renders actual toto-fx fluid simulation live in Remotion.
 *
 * Uses the dotgrid `step()` API to advance the simulation one tick per frame,
 * giving deterministic, frame-accurate rendering of the real fluid sim.
 *
 * Effects are triggered at specific frames via the `effects` prop.
 * Dotgrid plugins must be registered via the `plugins` prop.
 *
 * Usage:
 * ```tsx
 * <DotgridLive
 *   width={1920}
 *   height={1080}
 *   effects={[
 *     { frame: 30, name: 'heart', args: { cx: 960, cy: 540, opts: { radius: 200, pulses: 1 } } },
 *     { frame: 45, name: 'heart', args: { cx: 960, cy: 540, opts: { radius: 200, pulses: 1 } } },
 *     { frame: 60, name: 'ripple', args: { cx: 400, cy: 300, opts: { radius: 300 } } },
 *   ]}
 * />
 * ```
 */

interface EffectTrigger {
  /** Frame number (relative to this component's first frame) to trigger the effect */
  frame: number;
  /** Dotgrid effect name (must be registered via plugins) */
  name: string;
  /** Arguments passed to runEffect (e.g., { cx, cy, opts }) */
  args: Record<string, any>;
}

interface DotgridLiveProps {
  width?: number;
  height?: number;
  effects?: EffectTrigger[];
  /** Dotgrid configuration overrides */
  config?: Record<string, any>;
  /** Background color behind the dotgrid canvas */
  backgroundColor?: string;
  /** CSS styles for the container */
  style?: React.CSSProperties;
}

export const DotgridLive: React.FC<DotgridLiveProps> = ({
  width = 1920,
  height = 1080,
  effects = [],
  config: userConfig = {},
  backgroundColor = '#1a1a2e',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const firedEffectsRef = useRef<Set<number>>(new Set());

  // Initialize dotgrid on first render
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;

    // Dynamic import — toto-fx is a sibling package
    // In the Remotion project, install toto-fx as a dependency or use a relative path
    const initGrid = async () => {
      try {
        // Try importing from the parent toto-fx package
        const { createDotgrid } = await import('toto-fx');
        const dotgridPlugins = await Promise.all([
          import('toto-fx/dotgrid-plugins/ripple'),
          import('toto-fx/dotgrid-plugins/vortex'),
          import('toto-fx/dotgrid-plugins/crater'),
          import('toto-fx/dotgrid-plugins/nuclear'),
          import('toto-fx/dotgrid-plugins/scorch'),
          import('toto-fx/dotgrid-plugins/heart'),
        ]);

        const grid = createDotgrid({
          container: containerRef.current!,
          baseOpacity: 0.15,
          baseColor: [100, 100, 160],
          ...userConfig,
        });

        grid.init();

        // Register all dotgrid plugins
        for (const plugin of dotgridPlugins) {
          const p = plugin.default || plugin;
          if (p && typeof p.install === 'function') {
            grid.use(p);
          }
        }

        gridRef.current = grid;
        initializedRef.current = true;
      } catch (err) {
        console.warn('DotgridLive: Could not import toto-fx. Falling back to placeholder.', err);
      }
    };

    initGrid();
  }, []);

  // Step the simulation and trigger effects each frame
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Trigger any effects scheduled for this frame
    for (const effect of effects) {
      if (effect.frame === frame && !firedEffectsRef.current.has(frame)) {
        grid.runEffect(effect.name, effect.args);
        firedEffectsRef.current.add(frame);
      }
    }

    // Advance the simulation by one tick
    grid.step();
  }, [frame, effects]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        backgroundColor,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
};

export default DotgridLive;
