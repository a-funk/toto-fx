import { useCallback } from 'react';
import { useTotoFX } from './useTotoFX';

export interface DotgridEffectArgs {
  /** Center X coordinate. Auto-computed from `element` if omitted. */
  cx?: number;
  /** Center Y coordinate. Auto-computed from `element` if omitted. */
  cy?: number;
  /** If provided, cx/cy are computed from the element's bounding rect center. */
  element?: HTMLElement;
  /** Options passed through to the dotgrid effect. */
  opts?: Record<string, any>;
}

/**
 * Hook for triggering dotgrid effects via the engine.
 *
 * If `args.element` is provided, cx/cy are auto-computed from
 * `getBoundingClientRect()`.
 *
 * @example
 * ```tsx
 * const triggerEffect = useDotgridEffect();
 * triggerEffect('ripple', { cx: 500, cy: 300, opts: { radius: 200 } });
 *
 * // or with element center helper:
 * triggerEffect('heart', { element: ref.current, opts: { radius: 200 } });
 * ```
 */
export function useDotgridEffect() {
  const { engine } = useTotoFX();

  const triggerEffect = useCallback(
    (name: string, args?: DotgridEffectArgs) => {
      if (!args) {
        engine.dotgridEffect(name, {});
        return;
      }

      let { cx, cy, element, opts, ...rest } = args;

      // Auto-compute center from element bounding rect
      if (element && (cx === undefined || cy === undefined)) {
        const rect = element.getBoundingClientRect();
        cx = cx ?? rect.left + rect.width / 2;
        cy = cy ?? rect.top + rect.height / 2;
      }

      engine.dotgridEffect(name, { cx, cy, opts, ...rest });
    },
    [engine],
  );

  return triggerEffect;
}
