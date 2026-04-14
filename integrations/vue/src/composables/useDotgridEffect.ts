import { useTotoFX } from './useTotoFX';

export function useDotgridEffect() {
  const { engine } = useTotoFX();

  return (name: string, args?: Record<string, any>) => {
    engine.dotgridEffect(name, args);
  };
}
