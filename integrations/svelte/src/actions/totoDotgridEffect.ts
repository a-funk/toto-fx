import type { Action } from 'svelte/action';
import { getTotoFX } from '../context';

export interface TotoDotgridEffectParams {
  /** Dotgrid effect name (e.g., 'ripple', 'vortex') */
  name: string;
  /** Additional options passed to the effect */
  opts?: Record<string, any>;
}

/**
 * Svelte action that triggers a dotgrid effect centered on the element when clicked.
 * Computes the center of the element via getBoundingClientRect and passes
 * cx/cy to the engine's dotgridEffect method.
 *
 * @example
 * ```svelte
 * <div use:totoDotgridEffect={{ name: 'ripple', opts: { radius: 200 } }}>
 *   Click for ripple
 * </div>
 * ```
 */
export const totoDotgridEffect: Action<HTMLElement, TotoDotgridEffectParams> = (node, params) => {
  const { engine } = getTotoFX();

  let currentParams = params!;

  function handleClick() {
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    (engine as any).dotgridEffect(currentParams.name, {
      cx,
      cy,
      opts: currentParams.opts,
    });
  }

  node.addEventListener('click', handleClick);

  return {
    update(newParams: TotoDotgridEffectParams) {
      currentParams = newParams;
    },
    destroy() {
      node.removeEventListener('click', handleClick);
    },
  };
};
