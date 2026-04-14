<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createDotgrid } from 'toto-fx';
import { useTotoFX } from '../composables/useTotoFX';

const props = defineProps<{
  config?: Record<string, any>;
}>();

const containerRef = ref<HTMLElement | null>(null);
const { engine } = useTotoFX();

let dotgrid: ReturnType<typeof createDotgrid> | null = null;

onMounted(() => {
  if (!containerRef.value) return;

  dotgrid = createDotgrid({
    ...props.config,
    container: containerRef.value,
  });

  dotgrid.init();
  engine.setDotgrid(dotgrid);
});

onUnmounted(() => {
  if (dotgrid) {
    dotgrid.destroy();
    dotgrid = null;
  }
});
</script>

<template>
  <div ref="containerRef" />
</template>
