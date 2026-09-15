<template>
  <span :class="badgeClass">{{ texto }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosProcessamento } from '@/types/notIncidentes'

const props = defineProps<{ posProcessamento?: PosProcessamento | null }>()

const temPlano = computed(() => {
  const value = props.posProcessamento
  if (!value) return false
  return [
    value.dsAcao1_1,
    value.dsAcao1_2,
    value.dsAcao2_1,
    value.dsAcao2_2,
    value.dsAcao3_1,
  ].some((texto) => Boolean(texto && texto.trim().length > 0))
})

const badgeClass = computed(() =>
  temPlano.value
    ? 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
    : 'inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500',
)

const texto = computed(() => (temPlano.value ? 'Plano definido' : 'Pendente'))
</script>
