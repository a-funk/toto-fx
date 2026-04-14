import { useTotoFX } from './useTotoFX';

export function usePlay(category: string = 'action') {
  const { engine } = useTotoFX();

  return (el: HTMLElement, opts?: Record<string, any>) => {
    engine.play(category, el, opts);
  };
}
