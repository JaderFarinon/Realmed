<template>
  <div v-if="agenda" class="billing-agenda">
    <div class="billing-section-heading">
      <div>
        <h2>Agenda Consolidada</h2>
      </div>
      <button class="btn-secondary" :aria-expanded="showAll" @click="showAll = !showAll">
        {{ showAll ? 'Recolher indicadores' : 'Mais indicadores' }}
      </button>
    </div>
    <section class="billing-metrics">
      <article
        v-for="(card, i) in visibleCards"
        :key="card.key"
        class="panel billing-metric"
        :class="`billing-metric--${i % 4}`"
      >
        <div class="billing-metric-heading">
          <h3>{{ card.label }}</h3>
          <span aria-hidden="true" class="billing-metric-icon"
            ><svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="4" y="5" width="16" height="16" rx="3" />
              <path d="M8 3v4m8-4v4M4 11h16m-11 4h2m3 0h2m-7 3h2" /></svg
          ></span>
        </div>
        <b class="typography-metric">{{
          agenda.totals?.[card.key]?.toLocaleString('pt-BR') ?? '—'
        }}</b>
        <p>{{ card.hint }}</p>
      </article>
    </section>
    <section class="billing-chart-grid">
      <BillingChart
        title="Evolução dos Agendamentos"
        description="Volume por data do atendimento no período selecionado"
        kind="area"
        :rows="agenda.daily || []"
        :empty-text="empty"
      />
      <BillingChart
        title="Agendamentos por Convênio"
        description="Distribuição dos agendamentos coletados"
        kind="donut"
        center-label="Agendamentos"
        :rows="agenda.insurers || []"
        :empty-text="empty"
      />
    </section>
    <section v-if="agenda.totals && showAll" class="panel billing-status-summary">
      <div class="billing-status-heading">
        <h3>Situação da Agenda</h3>
        <span>{{ agenda.totals.appointments.toLocaleString('pt-BR') }} agendamentos no filtro</span>
      </div>
      <div
        class="billing-status-bar"
        role="img"
        aria-label="Distribuição das situações dos agendamentos"
      >
        <span
          v-for="(row, i) in agenda.statuses"
          :key="row.label"
          :style="{ flexGrow: row.value, background: statusColor(row.label, i) }"
          :title="`${statusLabel(row.label)}: ${row.value}`"
          >{{ row.value || '' }}</span
        >
      </div>
      <ul class="billing-status-legend">
        <li v-for="(row, i) in agenda.statuses" :key="row.label">
          <i :style="{ background: statusColor(row.label, i) }" />{{ statusLabel(row.label) }}
          <b>{{ row.value }}</b>
        </li>
      </ul>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import BillingChart from '@/components/BillingChart.vue'
const props = defineProps<{ agenda?: any }>()
const showAll = ref(false)
const empty = computed(() =>
  props.agenda?.totals ? 'Nenhum agendamento nos dias coletados.' : 'Aguardando coleta.',
)
const cards = [
  { key: 'appointments', label: 'Agendamentos', hint: 'Sem cancelados e remarcados.' },
  {
    key: 'patients',
    label: 'Pacientes na Agenda',
    hint: 'Pacientes distintos no período coletado.',
  },
  {
    key: 'evaluations',
    label: 'Avaliações Agendadas',
    hint: 'Agenda Avaliação ou código 50000144.',
  },
  {
    key: 'sessions',
    label: 'Sessões Agendadas',
    hint: 'Agendamentos; sem somar procedimentos.',
  },
  {
    key: 'evaluatedWithSessions',
    label: 'Avaliados com Sessões Agendadas',
    hint: 'Pacientes distintos com avaliação finalizada.',
  },
  {
    key: 'finished',
    label: 'Atendimentos Finalizados',
    hint: 'Finalizado no Stenci; não significa alta.',
  },
  { key: 'missed', label: 'Faltas Registradas', hint: 'Situação informada pelo Stenci.' },
  {
    key: 'evolutionPending',
    label: 'Evoluções Pendentes',
    hint: 'Todos os finalizados, por regra temporária.',
  },
]

const visibleCards = computed(() =>
  showAll.value ? cards : [cards[2], cards[4], cards[3], cards[5]],
)
const statusLabel = (s: string) =>
  (
    ({
      finished: 'Finalizados',
      scheduled: 'Agendados',
      missed: 'Faltas',
      confirmed: 'Confirmados',
      waiting: 'Em espera',
      in_attendance: 'Em atendimento',
      patient_canceled: 'Cancelados pelo paciente',
      professional_canceled: 'Cancelados pelo profissional',
      canceled: 'Cancelados',
      rescheduled: 'Remarcados',
      available: 'Disponíveis',
    }) as Record<string, string>
  )[s] || 'Outras situações'
const statusColor = (s: string, i: number) =>
  (
    ({
      finished: '#10b98c',
      scheduled: '#efa310',
      missed: '#ef505c',
      confirmed: '#2ab8cc',
      waiting: '#9fb4c7',
      in_attendance: '#5479c6',
    }) as Record<string, string>
  )[s] || ['#98a7b8', '#64778b', '#b2bdca'][i % 3]
</script>
