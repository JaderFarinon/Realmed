<template>
    <div
    class="list-workspace"
    :class="{ 'is-bounded': bounded, 'is-embedded': embedded }"
    :style="{ '--table-row-height': `${rowHeight}px` }"
  >
    <section v-if="$slots.filters || $slots.tabs" class="panel list-filters" aria-label="Filtros">
      <div v-if="$slots.tabs" class="list-tabs"><slot name="tabs" /></div>
      <details v-if="$slots.filters" class="list-filter-disclosure" @toggle="toggleFilters">
        <summary :aria-expanded="filtersOpen" :aria-controls="filtersId"><span>Filtros</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
        <div :id="filtersId" class="list-filter-fields"><slot name="filters" /></div>
      </details>
    </section>
    <section class="panel list-results" aria-label="Resultados">
      <div class="list-actions"><slot name="actions" /></div>
      <div ref="viewport" class="list-table-viewport"><slot /></div>
      <div class="list-pagination"><slot name="pagination" /></div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUpdated, onBeforeUnmount, nextTick, useId } from 'vue'
import { tableCapacity } from '@/utils/tablePagination'
const props = withDefaults(
  defineProps<{
    pageSize?: number
    rowHeight?: number
    bounded?: boolean
    embedded?: boolean
    measureRows?: boolean
    loading?: boolean
  }>(),
  { pageSize: 10, rowHeight: 48, bounded: false, measureRows: true },
)
const emit = defineEmits<{ 'update:pageSize': [size: number] }>()
const viewport = ref<HTMLElement | null>(null)
const filtersOpen = ref(false), filtersId = useId()
function toggleFilters(event: Event) {
  filtersOpen.value = (event.target as HTMLDetailsElement).open
  measure()
}
let observer: ResizeObserver | undefined,
  frame = 0
let measuredWidth = 0, largestRow = 0, largestHeader = 0, disposed = false
function measure() {
  if (disposed) return
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(updateCapacity)
}
function updateCapacity() {
  const el = viewport.value
  // A placeholder has neither the row heights nor the column widths of the data.
  // Measuring it can change pageSize and trigger the very request being measured.
  if (!el || props.loading) return
  const desktop =
    props.bounded && !filtersOpen.value && window.matchMedia('(min-width:768px) and (min-height:480px)').matches
  if (Math.abs(el.clientWidth - measuredWidth) >= 1) {
    measuredWidth = el.clientWidth
    largestRow = largestHeader = 0
  }
  const measuredHeader = el.querySelector('thead')?.getBoundingClientRect().height || 48
  const measuredRows = desktop && props.measureRows
    ? Array.from(el.querySelectorAll('tbody tr'))
        .filter(row => !row.querySelector('.list-empty'))
        .map(row => row.getBoundingClientRect().height)
    : []
  // Retain the largest measurements at this width: dropping a tall last row
  // from a page must not grow the next page and bring that same row back forever.
  if (measuredRows.length) {
    largestRow = Math.max(largestRow, ...measuredRows)
    largestHeader = Math.max(largestHeader, measuredHeader)
  }
  const header = Math.max(measuredHeader, largestHeader)
  const rowHeight = Math.max(props.rowHeight, largestRow)
  el.style.setProperty('--table-minimum-height', desktop ? `${Math.ceil(header + rowHeight + 2)}px` : '0px')
  const size = tableCapacity(el.clientHeight, header, desktop, rowHeight)
  if (size !== props.pageSize) emit('update:pageSize', size)
}
onMounted(async () => {
  await nextTick()
  observer = new ResizeObserver(measure)
  if (viewport.value) {
    observer.observe(viewport.value)
    for (const node of viewport.value.querySelectorAll('table, thead')) observer.observe(node)
  }
  document.fonts?.ready.then(measure)
  window.addEventListener('resize', measure)
  // Establish the initial capacity without waiting for the first paint frame.
  updateCapacity()
})
onUpdated(measure)
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', measure)
})
</script>
