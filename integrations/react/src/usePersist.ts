import { useCallback, useSyncExternalStore } from 'react';
import { useTotoFX } from './useTotoFX';

interface UsePersistResult {
  /** Whether the persistent animation is currently active. Re-renders on change. */
  isActive: boolean;
  /** Activate the persistent animation. Calls engine.set(category, key, state). */
  set: (state?: { style?: string; variant?: string; params?: Record<string, any> }) => void;
  /** Deactivate the persistent animation. Calls engine.clear(category, key). */
  clear: () => void;
  /** Toggle: set if inactive, clear if active. */
  toggle: (state?: { style?: string; variant?: string; params?: Record<string, any> }) => void;
}

/**
 * Hook for persistent (toggle) animations that re-renders when the
 * active state changes.
 *
 * @param category - The animation category (e.g. 'persist').
 * @param key - The unique key for this persistent animation (e.g. 'item-123').
 *
 * @example
 * ```tsx
 * const { isActive, set, clear, toggle } = usePersist('persist', 'item-123');
 * ```
 */
export function usePersist(category: string, key: string): UsePersistResult {
  const { engine } = useTotoFX();

  // Subscribe to engine events to detect state changes.
  // useSyncExternalStore ensures we re-render when isActive flips.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      engine.on('animationStart', onStoreChange);
      engine.on('animationEnd', onStoreChange);
      engine.on('reconcile', onStoreChange);
      return () => {
        engine.off('animationStart', onStoreChange);
        engine.off('animationEnd', onStoreChange);
        engine.off('reconcile', onStoreChange);
      };
    },
    [engine],
  );

  const getSnapshot = useCallback(
    () => engine.isActive(category, key),
    [engine, category, key],
  );

  const isActive = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const set = useCallback(
    (state?: { style?: string; variant?: string; params?: Record<string, any> }) => {
      engine.set(category, key, state);
    },
    [engine, category, key],
  );

  const clear = useCallback(() => {
    engine.clear(category, key);
  }, [engine, category, key]);

  const toggle = useCallback(
    (state?: { style?: string; variant?: string; params?: Record<string, any> }) => {
      if (engine.isActive(category, key)) {
        engine.clear(category, key);
      } else {
        engine.set(category, key, state);
      }
    },
    [engine, category, key],
  );

  return { isActive, set, clear, toggle };
}
