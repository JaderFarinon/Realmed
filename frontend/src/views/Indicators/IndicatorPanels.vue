<template>
  <PageShell
    title="Painéis de indicadores"
    subtitle="Resultados do Stenci e do Realmed, com fontes e cobertura do período"
  >
    <section class="panel indicator-controls">
      <div class="indicator-tabs" role="tablist" aria-label="Áreas dos indicadores">
        <button
          v-for="a in areas"
          :key="a.key"
          role="tab"
          :aria-selected="area === a.key"
          :class="{ active: area === a.key }"
          @click="selectArea(a.key)"
        >
          {{ a.label }}
        </button>
      </div>
      <details>
        <summary>Filtros <span aria-hidden="true">⌄</span></summary>
        <form @submit.prevent="load">
          <IndicatorFilters v-model="draft" :options="result?.options || emptyOptions" />
          <div class="indicator-actions">
            <button class="btn-primary" :disabled="loading">Aplicar filtros</button
            ><button class="btn-secondary" type="button" :disabled="loading" @click="clear">
              Limpar
            </button>
          </div>
        </form>
      </details>
      <p v-if="result" class="indicator-context">
        {{ dateOnly(result.filters.start) }} a {{ dateOnly(result.filters.end) }} ·
        {{ result.filters.insurance || 'Todos os convênios' }} ·
        {{
          area === 'billing'
            ? 'Tratamentos criados no período'
            : `${result.coverage.collectedDays}/${result.coverage.days} dias de agenda coletados`
        }}
        · Consultado em {{ timestamp(result.generatedAt) }}
      </p>
      <p
        v-if="result && area !== 'billing' && !result.coverage.complete"
        class="indicator-coverage"
        role="status"
      >
        A coleta do Stenci está parcial neste período. Os gráficos identificam os dados disponíveis
        e os campos não informados.
      </p>
    </section>
    <p v-if="loading" role="status">Carregando indicadores…</p>
    <p v-if="failed" class="panel indicator-controls">
      Não foi possível carregar. Ajuste os filtros ou tente novamente.
    </p>
    <div v-if="result" class="indicator-grid" :aria-busy="loading">
      <div v-for="metric in result.metrics" :key="metric.key" class="panel indicator-card">
        <IndicatorMetric :metric="metric" /><RouterLink
          v-if="canOperational('indicator_analysis', 'canView')"
          class="btn-secondary"
          :to="{
            path: '/indicadores/analise-critica',
            query: { indicator: metric.key, ...result.filters },
          }"
          >Analisar este indicador</RouterLink
        >
      </div>
    </div>
  </PageShell>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PageShell from '@/components/PageShell.vue'
import IndicatorFilters from './IndicatorFilters.vue'
import IndicatorMetric from './IndicatorMetric.vue'
import type { Area, Dashboard } from './types'
import { initialFilters, dateOnly, timestamp, errorMessage } from './types'
import api from '@/plugins/axios'
import { notify } from '@/composables/useNotifications'
import { useAuthUser } from '@/composables/useAuthUser'
import '@/assets/indicators.css'
const { canOperational } = useAuthUser()
const areas = ref<Area[]>([]),
  area = ref('epidemiology'),
  draft = ref(initialFilters()),
  result = ref<Dashboard | null>(null),
  loading = ref(false),
  failed = ref(false)
const emptyOptions = { insurances: [], schedules: [], places: [] }
let controller: AbortController | undefined,
  request = 0
async function load() {
  const version = ++request
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  failed.value = false
  try {
    const { data } = await api.get<Dashboard>('/indicators/dashboard', {
      params: { ...draft.value, area: area.value },
      signal: controller.signal,
    })
    if (version === request) {
      result.value = data
      areas.value = data.areas
    }
  } catch (e) {
    if (version === request && !(e as { code?: string }).code?.includes('CANCELED')) {
      failed.value = true
      notify(errorMessage(e), 'error')
    }
  } finally {
    if (version === request) loading.value = false
  }
}
function selectArea(key: string) {
  area.value = key
  draft.value.area = key
  result.value = null
  void load()
}
function clear() {
  draft.value = initialFilters(area.value)
  void load()
}
onMounted(async () => {
  try {
    areas.value = (await api.get('/indicators/catalog')).data.areas
    await load()
  } catch (e) {
    notify(errorMessage(e), 'error')
  }
})
onBeforeUnmount(() => {
  request++
  controller?.abort()
})
</script>
