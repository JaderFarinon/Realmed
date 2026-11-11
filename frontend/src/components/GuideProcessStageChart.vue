<template>
  <figure class="panel process-stage-chart" aria-labelledby="process-stage-chart-title">
    <figcaption class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="process-stage-chart-title" class="section-title">Guias por estágio</h2>
        <p class="text-sm text-gray-500">
          Etapa operacional de cada ciclo e fila independente de faturamento.
        </p>
      </div>
      <p class="text-sm text-gray-500">
        <b class="text-gray-900">{{ total.toLocaleString('pt-BR') }}</b> guias
      </p>
    </figcaption>
    <p v-if="!total" class="text-sm text-gray-500">Nenhum processo nas etapas do gráfico.</p>
    <ol class="stage-bars" aria-label="Quantidade por estágio do processo">
      <li v-for="stage in stages" :key="stage.key">
        <RouterLink
          :data-stage="stage.key"
          :to="{
            path: '/central-de-guias/tratamentos',
            query: { queue: 'ALL', process_stage: stage.key },
          }"
          class="stage-bar-row"
          :class="{ 'is-billing': stage.key === 'billing' }"
          :title="`${stage.label}: ${stage.value}. Ver fila`"
        >
          <span class="stage-bar-label">{{ stage.label }}</span>
          <span class="stage-bar-track" aria-hidden="true"
            ><span class="stage-bar-fill" :style="{ width: `${(100 * stage.value) / maximum}%` }"
          /></span>
          <b class="stage-bar-value">{{ stage.value.toLocaleString('pt-BR') }}</b>
        </RouterLink>
      </li>
    </ol>
    <p class="text-sm text-gray-500">
      <b>Faturar:</b> exige as etapas anteriores finalizadas e os documentos obrigatórios completos.
      Fisioterapia e eletroestimulação também exigem sessões concluídas. Clique em uma barra para abrir a fila.
    </p>
  </figure>
</template>
<script setup lang="ts">
import { computed } from 'vue'
export interface ProcessStage {
  key: string
  label: string
  value: number
}
const props = defineProps<{ stages: ProcessStage[]; totalUnique?: number }>()
const maximum = computed(() => Math.max(1, ...props.stages.map((stage) => stage.value)))
const total = computed(
  () => props.totalUnique ?? props.stages.reduce((sum, stage) => sum + stage.value, 0),
)
</script>
<style scoped>
.process-stage-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}
.process-stage-chart .section-title {
  margin-bottom: 0.25rem;
}
.stage-bars {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.stage-bar-row {
  display: grid;
  grid-template-columns: minmax(180px, 230px) minmax(0, 1fr) 48px;
  gap: 1rem;
  align-items: center;
  border-radius: 0.5rem;
  padding: 0.375rem 0.5rem;
  color: #344054;
}
.stage-bar-row:hover,
.stage-bar-row:focus-visible {
  background: #f0f9fa;
  outline: 2px solid #21b8c8;
  outline-offset: 1px;
}
.stage-bar-track {
  height: 1.25rem;
  background: #edf5f7;
  border-radius: 0.25rem;
  overflow: hidden;
}
.stage-bar-fill {
  display: block;
  height: 100%;
  background: #21b8c8;
  border-radius: 0.25rem;
}
.stage-bar-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.is-billing .stage-bar-fill {
  background: #f59e0b;
}
.is-billing .stage-bar-label,
.is-billing .stage-bar-value {
  color: #b45309;
  font-weight: 600;
}
@media (max-width: 640px) {
  .stage-bar-row {
    grid-template-columns: minmax(0, 1fr) 40px;
    gap: 0.25rem 0.75rem;
  }
  .stage-bar-label {
    grid-column: 1 / -1;
  }
}
</style>
