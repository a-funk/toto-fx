import { ref, onUnmounted } from 'vue';
import { useTotoFX } from './useTotoFX';

export function usePersist(category: string, key: string) {
  const { engine } = useTotoFX();
  const isActive = ref(engine.isActive(category, key));

  const onAnimationEnd = () => {
    isActive.value = engine.isActive(category, key);
  };

  engine.on('animationEnd', onAnimationEnd);

  onUnmounted(() => {
    engine.off('animationEnd', onAnimationEnd);
  });

  const set = (state?: Record<string, any>) => {
    engine.set(category, key, state);
    isActive.value = true;
  };

  const clear = () => {
    engine.clear(category, key);
    isActive.value = false;
  };

  const toggle = (state?: Record<string, any>) => {
    if (isActive.value) {
      clear();
    } else {
      set(state);
    }
  };

  return { isActive, set, clear, toggle };
}
