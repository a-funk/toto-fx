import { useEffect } from 'react';
import type { EngineEvent, AnimationEventData, ReconcileEventData } from 'toto-fx';
import { useTotoFX } from './useTotoFX';

/**
 * Subscribe to engine events with automatic cleanup on unmount.
 *
 * @param event - The engine event name.
 * @param handler - Callback invoked when the event fires.
 *
 * @example
 * ```tsx
 * useEngineEvent('animationEnd', (data) => {
 *   console.log('Animation ended:', data);
 * });
 * ```
 */
export function useEngineEvent(
  event: 'animationStart' | 'animationEnd',
  handler: (data: AnimationEventData) => void,
): void;
export function useEngineEvent(
  event: 'reconcile',
  handler: (data: ReconcileEventData) => void,
): void;
export function useEngineEvent(
  event: EngineEvent,
  handler: (data: any) => void,
): void {
  const { engine } = useTotoFX();

  useEffect(() => {
    engine.on(event as any, handler);
    return () => {
      engine.off(event, handler);
    };
    // We intentionally depend on handler identity — callers should
    // memoize with useCallback if they want to avoid resubscribing.
  }, [engine, event, handler]);
}
