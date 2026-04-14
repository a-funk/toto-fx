import { useCallback } from 'react';
import type { PlayOptions } from 'toto-fx';
import { useTotoFX } from './useTotoFX';

/**
 * Hook for one-shot animations. Returns a function that calls
 * `engine.play(category, element, opts)`.
 *
 * @param category - The animation category (e.g. 'action').
 *
 * @example
 * ```tsx
 * const play = usePlay('action');
 * // later:
 * play(ref.current, { style: 'thud', variant: 'anime-slam' });
 * ```
 */
export function usePlay(category: string) {
  const { engine } = useTotoFX();

  const play = useCallback(
    (element: HTMLElement, opts?: PlayOptions) => {
      engine.play(category, element, opts);
    },
    [engine, category],
  );

  return play;
}
