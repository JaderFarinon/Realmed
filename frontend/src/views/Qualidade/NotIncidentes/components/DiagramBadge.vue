<template>
  <div class="flex items-center gap-2">
    <span
      v-if="diagramas?.ishikawa"
      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700"
      title="Diagrama de Ishikawa disponível"
    >
      I
    </span>
    <span
      v-if="diagramas?.bowTie"
      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700"
      title="Diagrama BowTie disponível"
    >
      B
    </span>
    <span
      v-if="diagramas?.naranjo"
      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700"
      title="Diagrama de Naranjo disponível"
    >
      N
    </span>
    <span v-if="!temDiagramas" class="text-xs text-gray-400">—</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Diagramas } from '@/types/notIncidentes'

const props = defineProps<{ diagramas?: Diagramas | null }>()

const temDiagramas = computed(() => {
  const value = props.diagramas
  return Boolean(value?.ishikawa || value?.bowTie || value?.naranjo)
})
</script>
