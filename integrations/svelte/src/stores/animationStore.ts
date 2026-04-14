import { readable } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { getTotoFX } from '../context';
import type { AnimationEventData } from 'toto-fx';

/**
 * Create a Svelte readable store that tracks whether a specific
 * persistent animation is currently active.
 *
 * Subscribes to engine 'animationStart' and 'animationEnd' events
 * and updates reactively. The store value is a boolean: true when
 * the animation is active, false otherwise.
 *
 * @param category - The animation category to watch
 * @param key - The animation key to watch
 * @returns A Svelte readable store of boolean
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createAnimationStore } from 'toto-fx-svelte';
 *   const active = createAnimationStore('persist', 'item-123');
 * </script>
 *
 * {#if $active}
 *   <span>Animation is running</span>
 * {/if}
 * ```
 */
export function createAnimationStore(category: string, key: string): Readable<boolean> {
  const { engine } = getTotoFX();

  return readable(engine.isActive(category, key), (set) => {
    function onStart(data: AnimationEventData) {
      if (data.category === category && data.key === key) {
        set(true);
      }
    }

    function onEnd(data: AnimationEventData) {
      if (data.category === category && data.key === key) {
        set(false);
      }
    }

    engine.on('animationStart', onStart);
    engine.on('animationEnd', onEnd);

    return () => {
      engine.off('animationStart', onStart);
      engine.off('animationEnd', onEnd);
    };
  });
}
