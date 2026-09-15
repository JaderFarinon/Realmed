<template>
  <span :class="badgeClass">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const normalized = computed(() => (props.status || 'Não Processado').toLowerCase())

const badgeClass = computed(() => {
  switch (normalized.value) {
    case 'procedente':
      return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
    case 'improcedente':
      return 'inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700'
    case 'não processado':
    case 'nao processado':
      return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'
    default:
      return 'inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600'
  }
})

const label = computed(() => {
  switch (normalized.value) {
    case 'procedente':
      return 'Procedente'
    case 'improcedente':
      return 'Improcedente'
    case 'não processado':
    case 'nao processado':
      return 'Não Processado'
    default:
      return props.status || 'Não Processado'
  }
})
</script>
