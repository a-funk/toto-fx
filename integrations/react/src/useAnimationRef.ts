import { useRef, useCallback } from 'react';
import type { PlayOptions } from 'toto-fx';
import { useTotoFX } from './useTotoFX';

/**
 * Convenience hook that combines a DOM ref with a one-shot play function.
 * The returned `play` function automatically uses the ref'd element.
 *
 * @param category - The animation category (e.g. 'action').
 * @returns A tuple of `[ref, play]`.
 *
 * @example
 * ```tsx
 * const [ref, play] = useAnimationRef<HTMLDivElement>('action');
 * <div ref={ref}>
 *   <button onClick={() => play({ style: 'thud', variant: 'anime-slam' })}>
 *     Slam
 *   </button>
 * </div>
 * ```
 */
export function useAnimationRef<T extends HTMLElement = HTMLElement>(
  category: string,
): [React.RefObject<T | null>, (opts?: PlayOptions) => void] {
  const { engine } = useTotoFX();
  const ref = useRef<T | null>(null);

  const play = useCallback(
    (opts?: PlayOptions) => {
      const el = ref.current;
      if (el) {
        engine.play(category, el, opts);
      }
    },
    [engine, category],
  );

  return [ref, play];
}
