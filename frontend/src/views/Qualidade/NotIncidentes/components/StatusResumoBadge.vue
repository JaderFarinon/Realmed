<template>
  <span :class="badgeClass">{{ texto }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NotificacaoIncidente } from '@/types/notIncidentes'

const props = defineProps<{ notificacao: NotificacaoIncidente }>()

const statusPrimario = computed(() => props.notificacao.preProcessamento?.dsClass || props.notificacao.status)

const badgeClass = computed(() => {
  const status = (statusPrimario.value || '').toLowerCase()
  if (status === 'procedente') {
    return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
  }
  if (status === 'improcedente') {
    return 'inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700'
  }
  if (status === 'não processado' || status === 'nao processado') {
    return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'
  }
  return 'inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600'
})

const texto = computed(() => {
  const status = statusPrimario.value
  if (!status || status.trim() === '') return 'Não Processado'
  return status
})
</script>
