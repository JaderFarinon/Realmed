<template>
  <PageShell title="Visão geral" subtitle="Indicadores operacionais da Central de Guias">
    <template #actions
      ><TableActionToolbar
        :actions="[
          {
            icon: 'refresh',
            label: 'Atualizar indicadores',
            disabled: loading,
            onClick: loadDashboard,
          },
        ]"
    /></template>
    
    <p v-if="loading && !loaded" class="mt-4 text-gray-500" role="status">
      Carregando indicadores…
    </p>
    <div v-if="loaded" class="mt-6 space-y-4">
      <GuideProcessStageChart :stages="stages" :total-unique="totalUnique" />
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <RouterLink
          v-for="stage in stages"
          :key="stage.key"
          :data-stage-card="stage.key"
          :to="{
            path: '/central-de-guias/tratamentos',
            query: { queue: 'ALL', process_stage: stage.key },
          }"
          class="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
        >
          <p class="text-sm text-gray-500">{{ stage.label }}</p>
          <strong class="typography-metric mt-2 block text-gray-900">{{
            stage.value.toLocaleString('pt-BR')
          }}</strong>
          <span class="mt-2 block text-xs font-semibold text-brand-600">Ver fila →</span>
        </RouterLink>
      </div>
    </div>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
defineOptions({ name: 'DashboardView' })
import { onMounted, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import TableActionToolbar from '@/components/TableActionToolbar.vue'
import GuideProcessStageChart, { type ProcessStage } from '@/components/GuideProcessStageChart.vue'
import api from '@/plugins/axios'
const totalUnique = ref<number | undefined>()
const stages = ref<ProcessStage[]>([]),
  loadError = ref(''),
  loading = ref(false),
  loaded = ref(false)
async function loadDashboard() {
  if (loading.value) return
  loading.value = true
  try {
    const response = (await api.get('/dashboard')).data
    if (!Array.isArray(response.stages)) throw new Error('Indicadores inválidos')
    stages.value = response.stages.map((stage: ProcessStage) => ({
      ...stage,
      value: Number(stage.value) || 0,
    }))
    totalUnique.value = response.total === undefined ? undefined : Number(response.total)
    loaded.value = true
    loadError.value = ''
  } catch {
    loadError.value = 'Não foi possível carregar os indicadores. Tente atualizar novamente.'
  } finally {
    loading.value = false
  }
}
onMounted(loadDashboard)

useFeedback(() => unwrapNoticeValue(loadError), () => 'error')
</script>
