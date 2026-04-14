import { useContext } from 'react';
import { TotoFXContext, type TotoFXContextValue } from './TotoFXProvider';

/**
 * Consume the toto-fx context. Returns `{ engine, dotgrid }`.
 *
 * @throws If called outside a `<TotoFXProvider>`.
 *
 * @example
 * ```ts
 * const { engine, dotgrid } = useTotoFX();
 * engine.play('action', el, { style: 'thud' });
 * ```
 */
export function useTotoFX(): TotoFXContextValue {
  const ctx = useContext(TotoFXContext);
  if (ctx === null) {
    throw new Error(
      'useTotoFX must be used within a <TotoFXProvider>. ' +
        'Wrap your component tree in <TotoFXProvider> to provide the engine context.',
    );
  }
  return ctx;
}
