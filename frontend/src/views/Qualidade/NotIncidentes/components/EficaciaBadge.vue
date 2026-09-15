<template>
  <span :class="badgeClass">{{ texto }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosProcessamento } from '@/types/notIncidentes'

const props = defineProps<{ posProcessamento?: PosProcessamento | null }>()

const avaliacao = computed(() => (props.posProcessamento?.avaliacaoEficacia || '').toLowerCase())

const badgeClass = computed(() => {
  switch (avaliacao.value) {
    case 'eficaz':
      return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
    case 'ineficaz':
      return 'inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700'
    case 'pendente':
      return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'
    default:
      return 'inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500'
  }
})

const texto = computed(() => {
  switch (avaliacao.value) {
    case 'eficaz':
      return 'Eficaz'
    case 'ineficaz':
      return 'Ineficaz'
    case 'pendente':
      return 'Pendente'
    default:
      return 'Sem avaliação'
  }
})
</script>
