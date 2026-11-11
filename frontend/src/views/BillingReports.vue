<template>
  <PageShell
    class="billing-absence-report"
    title="Relatórios de Faturamento"
    subtitle="Faltas recorrentes — lista diária para contato da telefonia"
    list
  >
    <div class="report-screen">
      <DataList
        v-model:selected="selectedReport"
        :items="reportRows"
        :columns="reportColumns"
        :actions="reportActions"
        :loading="loading"
        selection-key="name"
        bounded
        :row-height="64"
      >
        <template #filters>
          <form class="absence-filters" @submit.prevent="load()">
            <label
              >Relatório<select class="input" aria-label="Relatório">
                <option>Faltas Recorrentes — Telefonia</option>
              </select></label
            >
            <label
              ><FieldLabel :required="true">Data do Relatório</FieldLabel
              ><input
                v-model="date"
                type="date"
                class="input"
                aria-label="Data do relatório"
                :max="today"
                required
            /></label>
            <label
              >Histórico Desde<input
                v-model="historyStart"
                type="date"
                class="input"
                aria-label="Histórico desde"
                :max="date"
            /></label>
            <label
              >Regra de Inclusão<select v-model="rule" class="input" aria-label="Regra de inclusão">
                <option value="total3">3 faltas consecutivas, incluindo a do dia</option>
                <option value="prior3">4 faltas consecutivas</option>
              </select></label
            >
            <button class="btn-primary" :disabled="loading">Gerar relatório</button>
          </form>
          <div v-if="data" class="absence-summary">
            <b
              >{{ data.total }}
              {{ data.total === 1 ? 'paciente para contato' : 'pacientes para contato' }}</b
            >
            <span
              >Histórico: {{ fmt(data.historyStart) }} a {{ fmt(data.date) }} •
              {{ data.coverage.currentDays }} de {{ data.coverage.days }} dias atualizados</span
            >
            <span v-if="data.coverage.reportDayLastSuccessAt">
              Última coleta da data do relatório: {{ stamp(data.coverage.reportDayLastSuccessAt) }}
            </span>
            <p v-if="!data.coverage.complete" role="status" class="text-amber-700">
              Cobertura parcial: podem existir outras faltas nos dias ainda não atualizados. A
              impressão identificará essa condição.
            </p>
            <span class="text-gray-500"
              >Faltas consecutivas. Comparecimento interrompe a sequência.</span
            >
          </div>
        </template>
        <template #cell-name="{ item }">
          <b>{{ item.name }}</b>
          <small class="block text-gray-500"
            >Telefonia · Emitido em {{ stamp(item.generatedAt) }}</small
          >
        </template>
      </DataList>
    </div>
    <ListDetailDialog
      :open="reportOpen"
      title="Faltas Recorrentes — Telefonia"
      wide
      @close="reportOpen = false"
    >
      <p v-if="data" class="mb-3 text-sm text-gray-600">
        Data do relatório: {{ fmt(data.date) }} · Emitido em {{ stamp(data.generatedAt) }} ·
        {{ data.total }} pacientes
      </p>
      <DataList
        class="absence-report-patients"
        v-model:selected="selected"
        :items="filtered"
        :columns="columns"
        :actions="actions"
        selection-key="patient_name"
        embedded
      >
        <template #actions>
          <label class="absence-search"
            >Paciente<input
              v-model="search"
              class="input"
              aria-label="Pesquisar paciente no relatório"
              placeholder="Pesquisar paciente"
          /></label>
        </template>
        <template #cell-patient_name="{ item }"
          ><b>{{ item.patient_name }}</b
          ><small class="block text-gray-500">{{ phone(item.phone) }}</small></template
        >
        <template #cell-previous_dates="{ item }">{{
          item.previous_dates.map(fmt).join(' • ') || '—'
        }}</template>
      </DataList>
    </ListDetailDialog>
    <ListDetailDialog
      :open="Boolean(selected && historyOpen)"
      title="Histórico de Faltas do Paciente"
      wide
      @close="historyOpen = false"
    >
      <template v-if="selected"
        ><p>
          <b>{{ selected.patient_name }}</b> • {{ phone(selected.phone) }}
        </p>
        <p class="text-gray-500">
          Somente faltas confirmadas no intervalo selecionado. Cancelamentos não entram na contagem.
        </p>
        <DataList :items="selected.history" :columns="historyColumns" :selectable="false" embedded
      /></template>
    </ListDetailDialog>
    <section v-if="data" class="absence-print" aria-label="Relatório para impressão">
      <header>
        <h1>REALMED — Faltas Recorrentes</h1>
        <h2>Lista diária para a Telefonia • {{ fmt(data.date) }}</h2>
        <p>{{ ruleText(data.rule) }} • {{ filtered.length }} pacientes</p>
        <p>
          Histórico considerado: {{ fmt(data.historyStart) }} a {{ fmt(data.date) }}. Emitido em
          {{ stamp(data.generatedAt) }}.
        </p>
        <p v-if="search">Filtro de paciente: {{ search }}</p>
        <p v-if="data.coverage.reportDayLastSuccessAt">
          Última coleta da data do relatório: {{ stamp(data.coverage.reportDayLastSuccessAt) }}.
        </p>
        <strong v-if="!data.coverage.complete"
          >RELATÓRIO PARCIAL — {{ data.coverage.currentDays }} de {{ data.coverage.days }} dias
          atualizados. Podem existir faltas ainda não coletadas.</strong
        >
      </header>
      <table>
        <thead>
          <tr>
            <th>Paciente / Telefone</th>
            <th>Agenda / Local</th>
            <th>No Dia</th>
            <th>Anteriores</th>
            <th>Consecutivas</th>
            <th>Últimas Faltas Anteriores</th>
            <th>Retorno da Telefonia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>
              <b>{{ item.patient_name }}</b
              ><br />{{ phone(item.phone) }}
            </td>
            <td>{{ item.agendas }}<br />{{ item.places }}</td>
            <td>{{ item.daily_misses }}</td>
            <td>{{ item.prior_misses }}</td>
            <td>
              <b>{{ item.total_misses }}</b>
            </td>
            <td>{{ item.previous_dates.map(fmt).join(' • ') || '—' }}</td>
            <td class="absence-call-notes">
              Contato em: ____/____ às ____:____<br />Deseja continuar? ( ) Sim ( ) Não<br />Observação:
              _____________________
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7">
              Nenhum paciente atende ao critério na base disponível para esta data.
            </td>
          </tr>
        </tbody>
      </table>
      <footer>
        Contagem por agendamento distinto com status de falta, consecutiva no intervalo disponível.
        Não identifica séries de tratamento distintas nem confirma abandono. Quando o telefone não
        constar, consultar o cadastro no Stenci.
      </footer>
    </section>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import api from '@/plugins/axios'
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = localDate(new Date()),
  date = ref(today),
  historyStart = ref(''),
  rule = ref('total3'),
  data = ref<any>(null),
  loading = ref(false),
  error = ref(''),
  search = ref(''),
  selectedReport = ref<any>(null),
  reportOpen = ref(false),
  selected = ref<any>(null),
  historyOpen = ref(false)
let poll: ReturnType<typeof setTimeout> | undefined,
  version = 0
const fmt = (value: string) => (value ? value.split('-').reverse().join('/') : '—')
const stamp = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
const phone = (value: string | null) => {
  if (!value) return 'Telefone: consultar Stenci'
  const digits = value.replace(/\D/g, '')
  return digits.length === 11
    ? digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    : digits.length === 10
      ? digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
      : value
}
const ruleText = (value: string) =>
  value === 'prior3'
    ? 'Falta na data e pelo menos 4 faltas consecutivas'
    : 'Falta na data e pelo menos 3 faltas consecutivas'
const filtered = computed(() =>
  (data.value?.items || []).filter((row: any) =>
    row.patient_name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
  ),
)
function schedulePoll(params: any, current: number) {
  clearTimeout(poll)
  if (data.value && !data.value.coverage.complete)
    poll = setTimeout(async () => {
      try {
        const result = (await api.get('/billing/reports/absences', { params })).data
        if (current !== version) return
        data.value = result
        schedulePoll(params, current)
      } catch {
        /* Keep the last successful report; user can refresh again. */
      }
    }, 10000)
}
async function load(forceDate = false) {
  const current = ++version
  clearTimeout(poll)
  loading.value = true
  error.value = ''
  selectedReport.value = null
  reportOpen.value = false
  selected.value = null
  historyOpen.value = false
  try {
    const params = {
      date: date.value,
      historyStart: historyStart.value || undefined,
      rule: rule.value,
    }
    const result = (await api.get('/billing/reports/absences', { params })).data
    if (current !== version) return
    data.value = result
    historyStart.value = result.historyStart
    const effective = { ...params, historyStart: result.historyStart }
    try {
      await api.post('/billing/reports/absences/queue', { ...effective, forceDate })
      if (forceDate)
        data.value = (await api.get('/billing/reports/absences', { params: effective })).data
    } catch {
      error.value = 'Relatório carregado; não foi possível programar a atualização da coleta.'
    }
    schedulePoll(effective, current)
  } catch (e: any) {
    data.value = null
    error.value = e.response?.data?.error || 'Não foi possível gerar o relatório.'
  } finally {
    if (current === version) loading.value = false
  }
}
const reportRows = computed(() =>
  data.value
    ? [
        {
          id: 'absences',
          name: `Faltas Recorrentes — ${stamp(data.value.generatedAt)}`,
          generatedAt: data.value.generatedAt,
          date: data.value.date,
          total: data.value.total,
          historyStart: data.value.historyStart,
        },
      ]
    : [],
)
const reportColumns = [
  { key: 'name', label: 'Relatório', width: '44%' },
  { key: 'date', label: 'Data do relatório', format: fmt },
  { key: 'historyStart', label: 'Histórico desde', format: fmt },
  { key: 'total', label: 'Pacientes' },
]
const reportActions = computed(() => [
  {
    icon: 'open',
    label: 'Abrir relatório selecionado',
    disabled: !selectedReport.value || loading.value,
    onClick: () => {
      reportOpen.value = true
    },
  },
  {
    icon: 'print',
    label: 'Imprimir relatório completo',
    disabled: !data.value || loading.value,
    onClick: () => window.print(),
  },
  {
    icon: 'refresh',
    label: 'Atualizar dados do dia',
    disabled: loading.value,
    onClick: () => load(true),
  },
])
const columns = [
  { key: 'patient_name', label: 'Paciente / Telefone', width: '25%' },
  { key: 'agendas', label: 'Agenda', width: '15%' },
  { key: 'places', label: 'Local', width: '10%' },
  { key: 'daily_misses', label: 'No Dia', width: '8%' },
  { key: 'prior_misses', label: 'Dias Anteriores', width: '9%' },
  { key: 'total_misses', label: 'Consecutivas', width: '9%' },
  { key: 'previous_dates', label: 'Últimas Faltas Anteriores', width: '24%' },
]
const historyColumns = [
  { key: 'date', label: 'Data', format: fmt },
  {
    key: 'start_at',
    label: 'Horário',
    format: (value: string) =>
      new Date(value).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  { key: 'agenda', label: 'Agenda' },
  { key: 'place', label: 'Local' },
]
const actions = computed(() => [
  {
    icon: 'print',
    label: 'Imprimir relatório completo',
    disabled: !data.value || loading.value,
    onClick: () => window.print(),
  },
  {
    icon: 'open',
    label: 'Ver histórico do paciente selecionado',
    disabled: !selected.value || loading.value,
    onClick: () => {
      historyOpen.value = true
    },
  },
])
onMounted(() => load())
onBeforeUnmount(() => {
  version++
  clearTimeout(poll)
})

useFeedback(
  () => unwrapNoticeValue(error),
  () => 'error',
)
</script>
<style>
.report-screen {
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}
:is(.billing-absence-report, .absence-report-patients) .list-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
:is(.billing-absence-report, .absence-report-patients) .absence-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 310px;
  max-width: 100%;
  margin: 0;
}
:is(.billing-absence-report, .absence-report-patients) .absence-search .input {
  min-width: 0;
  flex: 1;
}
:is(.billing-absence-report, .absence-report-patients) .list-table td:first-child {
  white-space: normal;
}
.absence-filters {
  display: grid;
  grid-template-columns:
    minmax(190px, 1.6fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(240px, 1.7fr)
    auto;
  gap: 12px;
  align-items: end;
}
.absence-filters label,
.absence-search {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.absence-filters .input {
  width: 100%;
  min-width: 0;
  min-height: 40px;
}
.absence-summary {
  display: flex;
  gap: 6px 18px;
  flex-wrap: wrap;
  margin-top: 12px;
  align-items: center;
  font-size: var(--realmed-help-size);
}
.absence-summary p {
  width: 100%;
}
.absence-search {
  width: 280px;
  max-width: 100%;
  margin-top: 4px;
  font-size: var(--realmed-text-size);
}
.absence-print {
  display: none;
}
@media (max-width: 1350px) {
  .absence-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .absence-filters {
    grid-template-columns: 1fr;
  }
}
@page absence-report {
  size: A4 landscape;
  margin: 12mm;
}
@media print {
  .billing-absence-report {
    min-height: 0 !important;
    background: white !important;
  }
  .billing-absence-report .realmed-sidebar,
  .billing-absence-report .realmed-content > header,
  .billing-absence-report .page-heading,
  .billing-absence-report .absence-error,
  .billing-absence-report .report-screen,
  .billing-absence-report .list-dialog-backdrop {
    display: none !important;
  }
  .billing-absence-report .realmed-content {
    padding: 0 !important;
  }
  .billing-absence-report main {
    padding: 0 !important;
  }
  .billing-absence-report .page-shell {
    display: block;
    height: auto !important;
  }
  .absence-print {
    display: block;
    page: absence-report;
    font-size: 10pt;
    color: #000;
  }
  .absence-print header {
    margin-bottom: 5mm;
  }
  .absence-print h1 {
    font-size: 16pt;
  }
  .absence-print h2 {
    font-size: 12pt;
  }
  .absence-print table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }
  .absence-print th,
  .absence-print td {
    border: 1px solid #aab2bd;
    padding: 3mm 2mm;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  .absence-print th {
    background: #edf1f5;
  }
  .absence-print thead {
    display: table-header-group;
  }
  .absence-print tr {
    break-inside: avoid;
  }
  .absence-print .absence-call-notes {
    min-width: 65mm;
    line-height: 1.8;
  }
  .absence-print footer {
    font-size: 9pt;
    margin-top: 4mm;
  }
  .absence-print strong {
    display: block;
    margin-top: 2mm;
  }
}
</style>
