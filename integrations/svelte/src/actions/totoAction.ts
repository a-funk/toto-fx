import type { Action } from 'svelte/action';
import { getTotoFX } from '../context';

export interface TotoActionParams {
  /** Animation style name (e.g., 'thud') */
  style?: string;
  /** Animation variant name (e.g., 'anime-slam') */
  variant?: string;
  /** Category to play on. Default: 'action' */
  category?: string;
  /** Additional params passed to engine.play() */
  params?: Record<string, any>;
}

/**
 * Svelte action for one-shot animations triggered on click.
 *
 * @example
 * ```svelte
 * <div use:totoAction={{ style: 'thud', variant: 'anime-slam' }}>Click me</div>
 * ```
 *
 * @example
 * ```svelte
 * <div use:totoAction={{ category: 'enter', style: 'dramatic', variant: 'slam-down' }}>
 *   Custom category
 * </div>
 * ```
 */
export const totoAction: Action<HTMLElement, TotoActionParams> = (node, params = {}) => {
  const { engine } = getTotoFX();

  let currentParams = params;

  function handleClick() {
    const { category = 'action', style, variant, params: extra } = currentParams;
    engine.play(category, node, {
      params: { style, variant, ...extra },
    });
  }

  node.addEventListener('click', handleClick);

  return {
    update(newParams: TotoActionParams) {
      currentParams = newParams;
    },
    destroy() {
      node.removeEventListener('click', handleClick);
    },
  };
};
