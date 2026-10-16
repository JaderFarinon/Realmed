<template>
  <div
    class="list-workspace"
    :class="{ 'is-bounded': bounded, 'is-embedded': embedded }"
    :style="{ '--table-row-height': `${rowHeight}px` }"
  >
    <section v-if="$slots.filters" class="panel list-filters" aria-label="Filtros">
      <slot name="filters" />
    </section>
    <section class="panel list-results" aria-label="Resultados">
      <div class="list-actions"><slot name="actions" /></div>
      <div ref="viewport" class="list-table-viewport"><slot /></div>
      <div class="list-pagination"><slot name="pagination" /></div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { tableCapacity } from '@/utils/tablePagination'
const props = withDefaults(
  defineProps<{ pageSize?: number; rowHeight?: number; bounded?: boolean; embedded?: boolean }>(),
  { pageSize: 10, rowHeight: 48, bounded: false },
)
const emit = defineEmits<{ 'update:pageSize': [size: number] }>()
const viewport = ref<HTMLElement | null>(null)
let observer: ResizeObserver | undefined,
  frame = 0
function measure() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const el = viewport.value
    if (!el) return
    const desktop =
      props.bounded && window.matchMedia('(min-width:1024px) and (min-height:650px)').matches
    const header = el.querySelector('thead')?.getBoundingClientRect().height || 48
    const size = tableCapacity(el.clientHeight, header, desktop, props.rowHeight)
    if (size !== props.pageSize) emit('update:pageSize', size)
  })
}
onMounted(async () => {
  await nextTick()
  observer = new ResizeObserver(measure)
  if (viewport.value) observer.observe(viewport.value)
  window.addEventListener('resize', measure)
  measure()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', measure)
})
</script>
