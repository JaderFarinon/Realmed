<template>
  <section class="indicator-metric">
    <div class="indicator-metric-total">
      <b class="typography-metric">{{
        metric.total === null ? '—' : metric.total.toLocaleString('pt-BR')
      }}</b
      ><span
        >{{ metric.unit }}
        <template v-if="metric.population !== null"
          >· {{ metric.population }} pacientes únicos</template
        ></span
      >
    </div>
    <BillingChart
      :title="metric.label"
      description=""
      :rows="metric.rows"
      :kind="metric.kind"
      :unit="metric.unit"
      :empty-text="
        metric.total === null
          ? 'Sem coleta disponível para o período.'
          : 'Nenhum registro no recorte.'
      "
    />
    <div class="indicator-footnotes">
      <p v-if="metric.area==='billing'">Situação atual dos ciclos criados no período; não é uma série histórica de status.</p>
      <p v-else-if="!(metric.area==='epidemiology' && metric.filters.source==='local') && !metric.coverage.complete">Agenda com cobertura parcial: {{metric.coverage.collectedDays}} / {{metric.coverage.days}} dias.</p>
      <p v-if="metric.key==='treatment_type'">Um paciente pode aparecer em mais de um tipo.</p>
      <p v-if="metric.missing">Não informado: {{ metric.missing }}.</p>
      <p>
        {{ dateOnly(metric.filters.start) }} a {{ dateOnly(metric.filters.end) }} ·
        {{ metric.filters.insurance || 'Todos os convênios'
        }}<span v-if="metric.area === 'epidemiology'">
          · {{ sourceNames[metric.filters.source] }}</span
        >
      </p>
      <p>Consultado em {{ timestamp(metric.capturedAt) }}</p>
      <details class="indicator-method"><summary>Fonte, filtros e cálculo</summary><p>{{metric.description}}</p><p>{{metric.scope}}</p><p v-for="warning in metric.warnings" :key="warning">{{warning}}</p></details>
    </div>
  </section>
</template>
<script setup lang="ts">
import BillingChart from '@/components/BillingChart.vue'
import type { Metric } from './types'
import { dateOnly, timestamp } from './types'
defineProps<{ metric: Metric; compact?: boolean }>()
const sourceNames: Record<string, string> = {
  combined: 'Stenci + Realmed',
  stenci: 'Stenci',
  local: 'Realmed',
}
</script>
