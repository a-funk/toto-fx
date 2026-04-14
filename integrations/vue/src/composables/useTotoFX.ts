import { inject } from 'vue';
import { TotoFXInjectionKey, type TotoFXContext } from '../plugin';

export function useTotoFX(): TotoFXContext {
  const context = inject(TotoFXInjectionKey);
  if (!context) {
    throw new Error(
      'useTotoFX(): TotoFXPlugin is not installed. Call app.use(TotoFXPlugin) first.'
    );
  }
  return context;
}
