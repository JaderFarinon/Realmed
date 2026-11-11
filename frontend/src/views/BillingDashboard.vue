<template>
  <PageShell
    class="billing-dashboard"
    title="Dashboard de Faturamento"
    subtitle="Acompanhamento analítico de atendimentos, tratamentos e guias"
  >
    <form class="panel billing-period billing-period--filters" @submit.prevent="load">
      <div class="billing-agenda-filters">
        <label
          >Agenda<select v-model="scheduleId" class="input" aria-label="Filtrar agenda">
            <option value="all">Todas as agendas</option>
            <option v-for="item in filterChoices.schedules" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select></label
        >
        <label
          >Tipo de Atendimento<select
            v-model="attendanceType"
            class="input"
            aria-label="Tipo de atendimento"
          >
            <option value="all">Todos</option>
            <option value="physiotherapy">Só Fisioterapia</option>
            <option value="evaluation">Só Avaliação</option>
          </select></label
        >
        <label
          >Local de Atendimento<select
            v-model="placeId"
            class="input"
            aria-label="Local de atendimento"
          >
            <option value="all">Todos os locais</option>
            <option v-for="item in filterChoices.places" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
            <option value="unassigned">Sem local informado</option>
          </select></label
        >
        <label
          >Status da Agenda<select
            v-model="agendaStatus"
            class="input"
            aria-label="Status da agenda"
          >
            <option value="active">Ativos (sem cancelados)</option>
            <option value="all">Todos os status</option>
            <option v-for="item in statusChoices" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select></label
        >
      </div>
      <div class="billing-period-fields">
        <label
          ><FieldLabel :required="true">De</FieldLabel
          ><input v-model="start" aria-label="De" type="date" class="input" required /></label
        ><label
          ><FieldLabel :required="true">Até</FieldLabel
          ><input v-model="end" aria-label="Até" type="date" class="input" required /></label
        ><button class="btn-primary" :disabled="loading">
          {{ loading ? 'Carregando…' : 'Aplicar filtros' }}
        </button>
        <button type="button" class="btn-secondary" :disabled="loading" @click="resetFilters">
          Limpar
        </button>
      </div>
      <div
        v-if="data"
        class="billing-coverage"
        :class="{ 'billing-coverage--partial': !data.agenda?.coverage?.complete }"
      >
        <span class="billing-live-dot" />
        <div>
          <b
            >{{ data.agenda?.coverage?.currentDays || 0 }} de
            {{ data.agenda?.coverage?.days || 0 }} dias atualizados</b
          ><small>{{ coverageText }}</small>
        </div>
      </div>
    </form>
    
    
    <p v-if="data?.filterOptions?.metadataPending" class="billing-help" role="status">
      Atualizando os vínculos de agenda, local e tipo nos dados já coletados. Os filtros podem
      apresentar cobertura parcial até concluir a atualização automática.
    </p>
    <p v-if="activeTab === 'guides'" class="billing-help">
      Guias e Tratamentos considera apenas as datas. Agenda, tipo, local e status filtram os dados
      Stenci e suas pendências.
    </p>
    <template v-if="data">
      <nav class="billing-tabs" role="tablist" aria-label="Análises de faturamento">
        <button
          v-for="tab in tabs"
          :id="`billing-tab-${tab.key}`"
          :key="tab.key"
          role="tab"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`billing-panel-${tab.key}`"
          :tabindex="activeTab === tab.key ? 0 : -1"
          @click="changeTab(tab.key)"
          @keydown="tabKeydown($event, tab.key)"
        >
          {{ tab.label
          }}<span v-if="tab.key === 'alerts'">{{
            data.alerts.length + (data.agenda?.alerts?.length || 0)
          }}</span>
        </button>
      </nav>
      <section
        :id="`billing-panel-${activeTab}`"
        role="tabpanel"
        :aria-labelledby="`billing-tab-${activeTab}`"
        class="billing-tab-panel"
      >
        <BillingAgendaAnalytics v-if="activeTab === 'agenda'" :agenda="data.agenda" />
        <template v-else-if="activeTab === 'guides'">
          <div class="billing-section-heading">
            <div>
              <h2>Guias e Tratamentos</h2>
              <p>Situação atual dos tratamentos criados no período selecionado no Realmed.</p>
            </div>
            <div class="billing-segmented" role="group" aria-label="Gráficos dos tratamentos">
              <button
                :aria-pressed="localChart === 'distribution'"
                @click="localChart = 'distribution'"
              >
                Distribuição</button
              ><button :aria-pressed="localChart === 'trend'" @click="localChart = 'trend'">
                Evolução por Mês
              </button>
            </div>
          </div>
          <section class="billing-featured-metrics">
            <article class="panel billing-featured-card">
              <div>
                <h3>Valor Pendente</h3>
                <b class="typography-metric">—</b>
                <p>Aguardando integração das contas e valores do Stenci</p>
              </div>
              <span class="billing-metric-icon" aria-hidden="true"
                ><svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                >
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 7v5l3 2" /></svg
              ></span>
            </article>
            <article class="panel billing-featured-card">
              <div>
                <h3>Tratamentos sem Faturamento</h3>
                <b class="typography-metric">{{ pendingTreatments.toLocaleString('pt-BR') }}</b>
                <p>Tratamentos criados no período sem faturamento local</p>
              </div>
              <span class="billing-metric-icon" aria-hidden="true"
                ><svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                >
                  <path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6" /></svg
              ></span>
            </article>
          </section>
          <details class="billing-additional-metrics">
            <summary>Mais indicadores de guias e tratamentos</summary>
            <section class="billing-metrics billing-metrics--guides">
              <article
                v-for="(card, i) in cards"
                :key="card.label"
                class="panel billing-metric"
                :class="`billing-metric--${i % 4}`"
              >
                <h3>{{ card.label }}</h3>
                <b class="typography-metric">{{ card.value?.toLocaleString('pt-BR') ?? '—' }}</b>
                <p>{{ card.source }}</p>
              </article>
            </section>
          </details>
          <section class="billing-chart-grid">
            <BillingChart
              v-if="localChart === 'distribution'"
              title="Aging de Pendências"
              description="Dias desde a criação dos tratamentos sem faturamento local"
              kind="bar"
              :rows="data.aging"
            /><BillingChart
              v-else
              title="Evolução Mensal de Pendências"
              description="Situação atual por mês de criação; não representa saldo histórico"
              kind="area"
              :rows="data.months"
            /><BillingChart
              title="Pendências por Convênio"
              description="Tratamentos sem faturamento registrado no Realmed"
              kind="donut"
              center-label="Total Pendente"
              :rows="data.insurers"
              unit="tratamentos"
            />
          </section>
        </template>
        <template v-else-if="activeTab === 'alerts'">
          <div class="billing-section-heading">
            <div>
              <h2>Pendências para Acompanhamento</h2>
              <p>
                {{
                  alertSource === 'agenda'
                    ? 'Finalizados sem evolução e faltas que precisam de conferência.'
                    : 'Documentação, avaliação e autorização dos tratamentos no Realmed.'
                }}
              </p>
            </div>
            <div class="billing-segmented" role="group" aria-label="Origem das pendências">
              <button :aria-pressed="alertSource === 'agenda'" @click="alertSource = 'agenda'">
                Atendimentos</button
              ><button :aria-pressed="alertSource === 'local'" @click="alertSource = 'local'">
                Tratamentos
              </button>
            </div>
          </div>
          <DataList
            v-if="alertSource === 'agenda'"
            :items="agendaAlerts"
            :columns="agendaColumns"
            :selectable="false"
            :page-size-options="[10, 20, 50, 100]"
            embedded
            ><template #filters
              ><label
                >Paciente<input
                  v-model="agendaSearch"
                  class="input"
                  aria-label="Pesquisar paciente na agenda consolidada"
                  placeholder="Pesquisar paciente"
              /></label>
              <p class="billing-help">
                Evolução pendente é uma regra temporária para todos os finalizados. Falta não
                comprova ausência de reagendamento.
              </p></template
            ></DataList
          >
          <DataList
            v-else
            v-model:selected="selected"
            :items="filtered"
            :columns="columns"
            :actions="actions"
            selection-key="patient_name"
            :page-size-options="[10, 20, 50, 100]"
            embedded
            ><template #filters
              ><div class="billing-period-fields">
                <label
                  >Paciente<input
                    v-model="search"
                    class="input"
                    aria-label="Paciente"
                    placeholder="Pesquisar paciente" /></label
                ><label
                  >Pendência<select v-model="reason" class="input" aria-label="Pendência">
                    <option value="">Todas</option>
                    <option v-for="label in reasons" :key="label">{{ label }}</option>
                  </select></label
                >
              </div></template
            ></DataList
          >
        </template>
        <BillingStenciPanel v-else />
      </section>
      <p class="billing-footer">
        {{
          activeTab === 'agenda'
            ? 'Fonte: agenda Stenci • Data do agendamento • Atualização automática no servidor'
            : activeTab === 'guides'
              ? 'Fonte: Realmed • Data de criação do tratamento • Valores de faturamento e glosas aguardam integração'
              : activeTab === 'consultations'
                ? 'Consultas diretas possuem filtros próprios e não alteram o período dos gráficos'
                : 'As pendências devem ser conferidas pela equipe responsável'
        }}<span v-if="data.generatedAt"
          >Atualizado em {{ new Date(data.generatedAt).toLocaleString('pt-BR') }}</span
        >
      </p>
    </template>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PageShell from '@/components/PageShell.vue'
import BillingStenciPanel from '@/components/BillingStenciPanel.vue'
import BillingAgendaAnalytics from '@/components/BillingAgendaAnalytics.vue'
import BillingChart from '@/components/BillingChart.vue'
import '@/assets/billing-dashboard.css'
import DataList from '@/components/DataList.vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
const router = useRouter(),
  now = new Date()
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const start = ref(localDate(new Date(now.getFullYear(), now.getMonth(), 1))),
  end = ref(localDate(now))
const scheduleId = ref('all'),
  attendanceType = ref('all'),
  placeId = ref('all'),
  agendaStatus = ref('active')
const filterChoices = ref<{
  schedules: Array<{ id: string; name: string }>
  places: Array<{ id: string; name: string }>
  statuses: string[]
}>({ schedules: [], places: [], statuses: [] })
const statusLabels: Record<string, string> = {
  finished: 'Finalizado',
  scheduled: 'Agendado',
  missed: 'Falta',
  confirmed: 'Confirmado',
  waiting: 'Em espera',
  in_attendance: 'Em atendimento',
  patient_canceled: 'Cancelado pelo paciente',
  professional_canceled: 'Cancelado pelo profissional',
  canceled: 'Cancelado',
  rescheduled: 'Remarcado',
}
const statusChoices = computed(() =>
  [...new Set([...Object.keys(statusLabels), ...filterChoices.value.statuses])].map((value) => ({
    value,
    label: statusLabels[value] || value,
  })),
)
function resetFilters() {
  scheduleId.value = 'all'
  attendanceType.value = 'all'
  placeId.value = 'all'
  agendaStatus.value = 'active'
  start.value = localDate(new Date(now.getFullYear(), now.getMonth(), 1))
  end.value = localDate(now)
  void load()
}
const data = ref<any>(null),
  loading = ref(false),
  error = ref(''),
  selected = ref<any>(null),
  search = ref(''),
  reason = ref('')
const queueError = ref('')
let poll: ReturnType<typeof setTimeout> | undefined,
  version = 0
onBeforeUnmount(() => {
  version++
  clearTimeout(poll)
})
function schedulePoll(params: any, current: number) {
  clearTimeout(poll)
  if (
    data.value?.collection?.configured &&
    data.value?.collection?.enabled &&
    !data.value?.agenda?.coverage?.complete
  )
    poll = setTimeout(async () => {
      try {
        const result = (await api.get('/billing/dashboard', { params })).data
        if (version !== current) return
        data.value = result
        if (result.filterOptions) filterChoices.value = result.filterOptions
        schedulePoll(params, current)
      } catch {
        /* Preserve the last successful dashboard; retry when the period is applied again. */
      }
    }, 10000)
}
async function load() {
  const current = ++version,
    params = {
      start: start.value,
      end: end.value,
      scheduleId: scheduleId.value,
      attendanceType: attendanceType.value,
      placeId: placeId.value,
      status: agendaStatus.value,
    }
  clearTimeout(poll)
  queueError.value = ''
  loading.value = true
  error.value = ''
  selected.value = null
  data.value = null
  try {
    data.value = (await api.get('/billing/dashboard', { params })).data
    if (data.value.filterOptions) filterChoices.value = data.value.filterOptions
    try {
      await api.post('/billing/collection/queue', { start: params.start, end: params.end })
    } catch {
      queueError.value =
        'Os dados disponíveis foram carregados, mas não foi possível programar os dias pendentes.'
    }
    if (current === version) schedulePoll(params, current)
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível carregar o painel.'
  } finally {
    loading.value = false
  }
}
const cards = computed(() => [
  {
    label: 'Tratamentos em andamento',
    value: data.value.totals.inTreatment,
    source: 'Situação registrada no Realmed',
  },
  {
    label: 'Tratamentos finalizados',
    value: data.value.totals.completed,
    source: 'Situação registrada no Realmed',
  },
  {
    label: 'Guias faturadas',
    value: null,
    source: 'Consolidação por guia ainda indisponível',
  },
  {
    label: 'Guias recusadas/glosadas',
    value: null,
    source: 'Pendente: retorno das glosas por guia',
  },
  {
    label: 'Avaliações digitais concluídas',
    value: data.value.totals.evaluated,
    source: 'Realmed — não confirma sessões agendadas',
  },
])
const pendingTreatments = computed(() =>
  (data.value?.aging || []).reduce((total: number, row: { value: number }) => total + row.value, 0),
)
const reasons = [
  'Documentação incompleta',
  'Finalizado sem faturamento registrado',
  'Data de avaliação passada sem conclusão digital',
  'Sessões realizadas acima das autorizadas',
  'Autorização não liberada',
]
const filtered = computed(() =>
  data.value.alerts.filter(
    (r: any) =>
      r.patient_name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()) &&
      (!reason.value || r.reasons.includes(reason.value)),
  ),
)
const columns = [
  { key: 'patient_name', label: 'Paciente' },
  { key: 'insurance_name', label: 'Convênio' },
  { key: 'created_date', label: 'Criado em', format: (v: any) => v.split('-').reverse().join('/') },
  { key: 'age', label: 'Dias desde a criação' },
  { key: 'reasons', label: 'Pendências' },
]
const actions = computed(() => [
  {
    label: 'Abrir tratamento',
    icon: 'open',
    disabled: !selected.value || !useAuthUser().canOperational('guide_processes', 'canView'),
    onClick: () => router.push(`/central-de-guias/tratamentos/${selected.value.id}`),
  },
])

const tabs = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'guides', label: 'Guias e Tratamentos' },
  { key: 'alerts', label: 'Pendências' },
  { key: 'consultations', label: 'Consultas Stenci' },
]
const route = useRoute(),
  activeTab = ref(
    tabs.some((tab) => tab.key === route.query.aba) ? String(route.query.aba) : 'agenda',
  )
const localChart = ref('distribution'),
  alertSource = ref('agenda'),
  agendaSearch = ref('')
watch(
  () => route.query.aba,
  (value) => {
    activeTab.value = tabs.some((tab) => tab.key === value) ? String(value) : 'agenda'
  },
)
function changeTab(key: string) {
  activeTab.value = key
  router.replace({ query: { ...route.query, aba: key } })
}
function tabKeydown(event: KeyboardEvent, key: string) {
  const i = tabs.findIndex((tab) => tab.key === key)
  let next = i
  if (event.key === 'ArrowRight') next = (i + 1) % tabs.length
  else if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = tabs.length - 1
  else return
  event.preventDefault()
  changeTab(tabs[next].key)
  document.getElementById('billing-tab-' + tabs[next].key)?.focus()
}
const coverageText = computed(() => {
  if (!data.value.collection?.configured)
    return 'Aguardando configuração da conta exclusiva de coleta.'
  if (data.value.collection?.enabled === false) return 'Coleta automática desativada.'
  if (data.value.collection?.errorCode || data.value.agenda?.coverage?.failedDays)
    return 'Coleta com pendência; nova tentativa automática.'
  if (!data.value.agenda?.coverage?.complete)
    return 'Dados parciais • Coleta dos dias pendentes em andamento'
  return 'Período coletado • Atualização automática ativa'
})
const agendaAlerts = computed(() =>
  (data.value?.agenda?.alerts || []).filter((row: any) =>
    row.patient_name.toLocaleLowerCase().includes(agendaSearch.value.toLocaleLowerCase()),
  ),
)
const agendaColumns = [
  { key: 'patient_name', label: 'Paciente' },
  { key: 'date', label: 'Data', format: (v: string) => v.split('-').reverse().join('/') },
  { key: 'schedule_name', label: 'Agenda' },
  { key: 'place_name', label: 'Local de Atendimento' },
  { key: 'insurance_name', label: 'Convênio' },
  { key: 'reason', label: 'Alerta' },
]

onMounted(load)

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => unwrapNoticeValue(queueError), () => 'warning')
</script>
