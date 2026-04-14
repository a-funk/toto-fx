<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createDotgrid, type DotgridConfig, type DotgridInstance } from 'toto-fx';
  import { getTotoFX } from '../context';

  /** Dotgrid configuration (baseOpacity, palette, etc.) */
  export let config: Partial<DotgridConfig> = {};

  /** Additional CSS class(es) for the wrapper div */
  let className: string = '';
  export { className as class };

  const { engine } = getTotoFX();

  let containerEl: HTMLElement;
  let grid: DotgridInstance | null = null;

  onMount(() => {
    grid = createDotgrid({
      ...config,
      container: containerEl,
    } as DotgridConfig);

    (grid as any).init();
    (engine as any).setDotgrid(grid);
  });

  onDestroy(() => {
    if (grid) {
      grid.destroy();
      grid = null;
    }
  });
</script>

<div bind:this={containerEl} class={className} style="position: relative; width: 100%; height: 100%;">
  <slot />
</div>
