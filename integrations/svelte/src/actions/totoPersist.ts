import type { Action } from 'svelte/action';
import { getTotoFX } from '../context';

export interface TotoPersistParams {
  /** Animation category (e.g., 'persist') */
  category: string;
  /** Unique key for this persistent animation */
  key: string;
  /** Animation style name */
  style?: string;
  /** Animation variant name */
  variant?: string;
  /** Additional params passed to engine.set() */
  params?: Record<string, any>;
  /** Optional group ID */
  groupId?: string;
}

/**
 * Svelte action for persistent animations.
 * Sets the animation on mount, clears on destroy,
 * and handles updates by clearing the old state and setting the new one.
 *
 * @example
 * ```svelte
 * <div use:totoPersist={{
 *   category: 'persist',
 *   key: 'item-1',
 *   style: 'ambient',
 *   variant: 'glow'
 * }}>
 *   Persistent glow
 * </div>
 * ```
 */
export const totoPersist: Action<HTMLElement, TotoPersistParams> = (node, params) => {
  const { engine } = getTotoFX();

  let currentParams = params!;

  function applyState(p: TotoPersistParams) {
    engine.set(p.category, p.key, {
      style: p.style,
      variant: p.variant,
      groupId: p.groupId,
      params: p.params,
    });
  }

  function clearState(p: TotoPersistParams) {
    engine.clear(p.category, p.key);
  }

  applyState(currentParams);

  return {
    update(newParams: TotoPersistParams) {
      clearState(currentParams);
      currentParams = newParams;
      applyState(currentParams);
    },
    destroy() {
      clearState(currentParams);
    },
  };
};
