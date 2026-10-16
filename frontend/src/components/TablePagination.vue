<template>
  <nav class="table-pagination" aria-label="Paginação dos resultados">
    <span
      >{{ total ? (page - 1) * pageSize + 1 : 0 }}–{{ Math.min(page * pageSize, total) }} de
      {{ total }}</span
    >
    <div class="table-pagination-buttons">
      <button
        type="button"
        title="Página anterior"
        aria-label="Página anterior"
        :disabled="loading || page <= 1"
        @click="emit('update:page', page - 1)"
      >
        ‹</button
      ><button
        v-for="p in visible"
        :key="p"
        type="button"
        :class="{ 'is-current': p === page }"
        :aria-current="p === page ? 'page' : undefined"
        :disabled="loading"
        @click="emit('update:page', p)"
      >
        {{ p }}</button
      ><button
        type="button"
        title="Próxima página"
        aria-label="Próxima página"
        :disabled="loading || page >= pages"
        @click="emit('update:page', page + 1)"
      >
        ›
      </button>
    </div>
    <span>Página {{ page }} de {{ pages }}</span>
  </nav>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ page: number; pageSize: number; total: number; loading?: boolean }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const visible = computed(() => {
  const start = Math.max(1, Math.min(props.page - 2, pages.value - 4))
  return Array.from({ length: Math.min(5, pages.value) }, (_, i) => start + i)
})
</script>
