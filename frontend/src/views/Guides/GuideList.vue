<template>
  <PageShell
    title="Gestão de Tratamentos"
    subtitle="Fila do faturamento para liberação dos tratamentos"
    list
  >

    <p v-if="showDeleted" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
      Lixeira: estes tratamentos foram arquivados e podem ser restaurados. Seus dados e documentos continuam preservados.
    </p>
    <DataList
      class="treatment-list"
      v-model:selected="selected"
      @row-dblclick="openTreatment"
      :items="data"
      :columns="columns"
      :actions="toolbarActions"
      bounded
      :loading="loading"
      :server-total="total"
      :page="page"
      selection-key="id"
      :row-height="56"
      @update:page="load"
      @update:page-size="resizePage"
    >
      <template #tabs><div v-if="!showDeleted" class="space-y-2">
          <nav class="flex gap-2 overflow-x-auto pb-1" aria-label="Filas da Central de Guias">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              class="flex shrink-0 items-center rounded-xl border text-sm font-semibold"
              :class="
                activeTab === tab.key
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              "
            >
              <button class="whitespace-nowrap py-2.5 pl-4 pr-1" :aria-pressed="activeTab === tab.key" @click="selectTab(tab.key)">
                {{ tab.label }}
                <span class="ml-1 opacity-80">({{ queueCounts[tab.key] ?? '…' }})</span>
              </button>
              <button
                type="button"
                class="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                :aria-label="`Informações: ${tab.label}`"
                :title="tab.description"
                @click="notify(`${tab.label}: ${tab.description}`, 'info', 10000)"
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v6M12 7v1" />
                </svg>
              </button>
            </div>
          </nav>
          <div v-if="activeChips.length" class="flex gap-2 overflow-x-auto">
            <button
              v-for="chip in activeChips"
              :key="chip.key"
              class="shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-xs"
              @click="removeFilter(chip.key)"
            >
              {{ chip.label }} ×
            </button>
          </div>
</div></template>
      <template #filters>
        <div v-if="showDeleted" class="space-y-3">
          <form class="flex flex-wrap items-end gap-3" @submit.prevent="load(1)">
            <label class="filter-search flex-1"
              >Buscar paciente<input v-model="filters.search" class="input" placeholder="Nome do paciente"
            /></label>
            <button class="btn-primary" type="submit">Buscar</button>
            <button class="btn-secondary" type="button" @click="filters.search = ''; load(1)">Limpar</button>
          </form>
        </div>
        <div v-else class="space-y-3">

          <form @submit.prevent="load(1)">
            <label class="filter-search"
              >Paciente<input
                v-model="filters.search"
                class="input"
                placeholder="Buscar paciente" /></label
            ><label
              >Ordenar por<select v-model="filters.sort" class="input" @change="load(1)">
                <option value="start_asc">Início mais próximo</option>
                <option value="start_desc">Início mais distante</option>
                <option value="assessment_desc">Avaliação mais recente</option>
                <option value="assessment_asc">Avaliação mais antiga</option>
                <option value="priority_desc">Prioridade</option>
                <option value="created_asc">Criação mais antiga</option>
                <option value="created_desc">Criação mais recente</option>
              </select></label
            ><button class="btn-primary" type="submit">Aplicar</button
            ><button
              class="btn-secondary"
              type="button"
              :aria-expanded="showFilters"
              @click="showFilters = !showFilters"
            >
              Mais filtros{{ activeFilterCount ? ' (' + activeFilterCount + ')' : '' }}</button
            ><button class="btn-secondary" type="button" @click="clearFilters">Limpar</button>
          </form>
          <div v-if="showFilters">
            <form class="advanced-filter-grid" @submit.prevent="load(1)">
              <label class="filter-label xl:col-span-2"
                >Buscar paciente<input
                  v-model="filters.search"
                  class="input"
                  placeholder="Nome do paciente"
              /></label>
              <label class="filter-label"
                >Estágio do processo<select v-model="filters.process_stage" class="input">
                  <option value="">Todos</option>
                  <option v-for="(label, key) in processStageLabels" :key="key" :value="key">
                    {{ label }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Convênio<select v-model="filters.insurance_provider_id" class="input">
                  <option value="">Todos</option>
                  <option v-for="item in insurers" :key="item.id" :value="item.id">
                    {{ item.name }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Fisioterapeuta<select v-model="filters.physiotherapist_id" class="input">
                  <option value="">Todos</option>
                  <option v-for="item in physiotherapists" :key="item.id" :value="item.id">
                    {{ item.full_name }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Médico solicitante<select v-model="filters.requesting_doctor_id" class="input">
                  <option value="">Todos</option>
                  <option v-for="item in doctors" :key="item.id" :value="item.id">
                    {{ item.full_name }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Status da liberação<select v-model="filters.authorization_status" class="input">
                  <option value="">Todos</option>
                  <option
                    v-for="(label, value) in authorizationStatusLabels"
                    :key="value"
                    :value="value"
                  >
                    {{ label }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Documentação<select v-model="filters.document_status" class="input">
                  <option value="">Todos</option>
                  <option
                    v-for="(label, value) in documentStatusLabels"
                    :key="value"
                    :value="value"
                  >
                    {{ label }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Tratamento<select v-model="filters.treatment_status" class="input">
                  <option value="">Todos</option>
                  <option
                    v-for="(label, value) in treatmentStatusLabels"
                    :key="value"
                    :value="value"
                  >
                    {{ label }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Faturamento<select v-model="filters.billing_status" class="input">
                  <option value="">Todos</option>
                  <option v-for="(label, value) in billingStatusLabels" :key="value" :value="value">
                    {{ label }}
                  </option>
                </select></label
              >
              <label class="filter-label"
                >Prioridade<select v-model="filters.priority" class="input">
                  <option value="">Todas</option>
                  <option value="2">Urgente</option>
                  <option value="1">Alta</option>
                  <option value="0">Normal</option>
                </select></label
              >
              <label class="filter-label"
                >Avaliação de<input
                  v-model="filters.assessment_date_from"
                  type="date"
                  class="input" /></label
              ><label class="filter-label"
                >Avaliação até<input v-model="filters.assessment_date_to" type="date" class="input"
              /></label>
              <label class="filter-label"
                >Início previsto de<input
                  v-model="filters.expected_start_date_from"
                  type="date"
                  class="input" /></label
              ><label class="filter-label"
                >Início previsto até<input
                  v-model="filters.expected_start_date_to"
                  type="date"
                  class="input"
              /></label>
              <div class="flex items-end gap-2 xl:col-span-4">
                <button class="btn" type="submit">Aplicar filtros</button
                ><button class="btn-secondary" type="button" @click="clearFilters">
                  Limpar filtros
                </button>
              </div>
            </form>
          </div>

        </div>
      </template>
      <template #cell-patient_name="{ value, item }"
        ><b class="treatment-patient">{{ value }}</b
        ><small class="block text-gray-500"
          >Tratamento #{{ item.treatment_root_id || item.id }} · Guia
          {{ item.guide_number || 1 }}</small
        ></template
      ><template #cell-insurance_name="{ value }"
        ><span class="treatment-name">{{ value || '—' }}</span></template
      ><template #cell-physiotherapist_name="{ value }"
        ><span class="treatment-name">{{ value || '—' }}</span></template
      ><template #cell-requested_sessions="{ item }"
        ><b>{{ item.requested_sessions ?? '—' }} solicitadas</b
        ><small class="block text-gray-500"
          >{{ item.authorized_sessions ?? '—' }} autorizadas</small
        ></template
      ><template #cell-document_status="{ item }"
        ><StatusBadge :value="item.document_status" :labels="documentStatusLabels" /></template
      ><template #cell-authorization_status="{ item }"
        ><b>{{ treatmentStatusLabel(item) }}</b
        ><small v-if="item.authorization_status === 'PENDING'" class="block text-error-700"
          >Pendência do convênio</small
        ></template
      >
    </DataList>
  </PageShell>
</template>

<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { notify, useFeedback } from '@/composables/useNotifications'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useTreatmentLiveUpdates } from '@/composables/useTreatmentLiveUpdates'
import { apiCooldownRemaining } from '@/utils/apiCooldown'
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  processStageLabels,
  authorizationStatusLabels,
  billingStatusLabels,
  documentStatusLabels,
  treatmentStatusLabels,
} from '@/utils/guideLabels'
import { treatmentStatusLabel } from '@/utils/treatmentStatus'

const route = useRoute(),
  router = useRouter(),
  data = ref<any[]>([]),
  insurers = ref<any[]>([]),
  professionals = ref<any[]>([]),
  page = ref(1),
  pages = ref(1),
  total = ref(0),
  showFilters = ref(false),
  showDeleted = ref(false),
  loadError = ref(''),
  queueCounts = reactive<Record<string, number>>({})
const keepAllTab = ref(false)
const tabs = [
  {
    key: 'AWAITING_EVALUATION',
    label: 'Aguardando Avaliação',
    description: 'Tratamentos que ainda aguardam a conclusão da avaliação fisioterapêutica.',
  },
  {
    key: 'AWAITING_GUIDE_CENTER',
    label: 'Aguardando Central de Guias',
    description: 'Avaliações concluídas que aguardam a preparação pela Central de Guias.',
  },
  {
    key: 'READY',
    label: 'Pendente de Liberação',
    description: 'Tratamentos com documentação completa, aguardando encaminhamento para liberação.',
  },
  {
    key: 'IN_PROGRESS,PENDING',
    label: 'Encaminhados ao Convênio',
    description:
      'Tratamentos enviados ao convênio, aguardando resposta ou resolução de pendências.',
  },
  {
    key: 'IN_APPEAL',
    label: 'Em Recurso',
    description: 'Negativas de autorização contestadas junto ao convênio, aguardando nova decisão.',
  },
  {
    key: 'DENIED',
    label: 'Não Liberados',
    description: 'Tratamentos cuja autorização foi negada pelo convênio.',
  },
  {
    key: 'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED',
    label: 'Liberados',
    description: 'Tratamentos autorizados, liberados por token ou que dispensam autorização.',
  },
  {
    key: 'NOT_READY',
    label: 'Faltando Documentação',
    description: 'Tratamentos com documentos ou dados pendentes para solicitar a liberação.',
  },
  {key:'PARTIAL',label:'Liberações Parciais',description:'Parte das guias está liberada e outras aguardam decisão, foram negadas ou estão em recurso.'},
  {
    key: 'BILLING',
    label: 'Faturar',
    description:
      'Tratamentos com etapas anteriores finalizadas, documentos obrigatórios completos e cobranças pendentes por guia. Fisioterapia e eletroestimulação também exigem sessões concluídas.',
  },
  {
    key: 'ALL',
    label: 'Todos',
    description: 'Todos os tratamentos, independentemente da etapa ou situação de liberação.',
  },
]
const filters = reactive<Record<string, string>>({
  search: '',
  insurance_provider_id: '',
  physiotherapist_id: '',
  requesting_doctor_id: '',
  authorization_status: 'READY',
  workflow_queue: '',
  process_stage: '',
  document_status: '',
  treatment_status: '',
  billing_status: '',
  priority: '',
  assessment_date_from: '',
  assessment_date_to: '',
  expected_start_date_from: '',
  expected_start_date_to: '',
  sort: 'created_desc',
})
const activeTab = computed(
  () =>
    (keepAllTab.value ? 'ALL' : '') ||
    (filters.process_stage === 'billing' ? 'BILLING' : filters.process_stage === 'partial' ? 'PARTIAL' : '') ||
    filters.workflow_queue ||
    (tabs.some((t) => t.key === filters.authorization_status)
      ? filters.authorization_status
      : 'ALL'),
)
const currentTabLabel = computed(
  () => tabs.find((t) => t.key === activeTab.value)?.label || 'Todos',
)
const physiotherapists = computed(() =>
  professionals.value.filter((p) => p.type === 'PHYSIOTHERAPIST'),
)
const doctors = computed(() => professionals.value.filter((p) => p.type === 'DOCTOR'))
const filterNames: Record<string, string> = {
  process_stage: 'Estágio',
  search: 'Paciente',
  insurance_provider_id: 'Convênio',
  physiotherapist_id: 'Fisioterapeuta',
  requesting_doctor_id: 'Médico',
  document_status: 'Documentação',
  treatment_status: 'Tratamento',
  billing_status: 'Faturamento',
  priority: 'Prioridade',
  assessment_date_from: 'Avaliação de',
  assessment_date_to: 'Avaliação até',
  expected_start_date_from: 'Início de',
  expected_start_date_to: 'Início até',
}
const activeChips = computed(() =>
  Object.entries(filters)
    .filter(([k, v]) => v && filterNames[k])
    .map(([key, value]) => ({ key, label: `${filterNames[key]}: ${displayValue(key, value)}` })),
)
const activeFilterCount = computed(() => activeChips.value.length)
const date = (value: string) =>
  value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'
const priorityLabel = (value: number) =>
  Number(value) >= 2 ? 'Urgente' : Number(value) === 1 ? 'Alta' : 'Normal'
function displayValue(key: string, value: string) {
  if (key === 'process_stage') return processStageLabels[value] || value
  if (key === 'insurance_provider_id')
    return insurers.value.find((i) => String(i.id) === String(value))?.name || value
  if (['physiotherapist_id', 'requesting_doctor_id'].includes(key))
    return professionals.value.find((i) => String(i.id) === String(value))?.full_name || value
  if (key.includes('date')) return date(value)
  return (
    ({ ...documentStatusLabels, ...treatmentStatusLabels, ...billingStatusLabels }[
      value as keyof typeof documentStatusLabels
    ] as string) || priorityLabel(Number(value))
  )
}
let loadSequence = 0
let resizeTimer: ReturnType<typeof setTimeout> | undefined
let initialized = false, disposed = false
type ListRequest = { sequence: number; target: number; live: boolean; params: Record<string, unknown>; query: Record<string, any> }
let pendingLoad: ListRequest | undefined, loadingTask: Promise<void> | undefined
let cooldownTimer: ReturnType<typeof setTimeout> | undefined, resumeCooldown: (() => void) | undefined
let countsTask: Promise<void> | undefined
const selected = ref<any>(null),
  pageSize = ref(10),
  loading = ref(false),
  { canOperational } = useAuthUser()
const columns = computed(() => [
  { key: 'patient_name', label: 'Paciente' },
  { key: 'insurance_name', label: 'Convênio' },
  { key: 'physiotherapist_name', label: 'Fisioterapeuta' },
  {
    key: 'created_at',
    label: 'Criado em',
    format: (value: string) =>
      value
        ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '—',
  },
  { key: 'assessment_date', label: 'Avaliação', format: date },
  { key: 'expected_start_date', label: 'Início previsto', format: date },
  { key: 'requested_sessions', label: 'Sessões' },
  { key: 'document_status', label: 'Documentação' },
  { key: 'authorization_status', label: 'Liberação' },
  { key: 'priority', label: 'Prioridade', format: priorityLabel },
  ...(showDeleted.value
    ? [{
        key: 'deleted_at',
        label: 'Excluído em',
        format: (value: string) =>
          value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—',
      }]
    : []),
])
function openTreatment(item: any) {
  if (!item?.id) return
  selected.value = item
  router.push({
    path: '/central-de-guias/tratamentos/' + item.id,
    query: activeTab.value === 'BILLING' ? { billing: '1' } : {},
  })
}
const toolbarActions = computed(() => {
  const deletedItemsAction = {
    icon: showDeleted.value ? 'open' : 'trashEye',
    label: showDeleted.value ? 'Ver tratamentos ativos' : 'Ver tratamentos excluídos',
    onClick: toggleDeleted,
  }
  if (showDeleted.value)
    return [
      deletedItemsAction,
      {
        icon: 'restore',
        label: 'Restaurar tratamento selecionado',
        disabled: !selected.value || !canOperational('guide_processes', 'canEdit'),
        onClick: restoreSelected,
      },
      { icon: 'refresh', label: 'Atualizar', onClick: () => load(page.value) },
    ]
  return [
    {
      icon: 'add',
      label: 'Novo tratamento',
      variant: 'primary' as const,
      disabled: !canOperational('guide_processes', 'canCreate'),
      onClick: () => router.push('/central-de-guias/novo'),
    },
    {
      icon: 'open',
      label: 'Abrir tratamento selecionado',
      disabled: !selected.value,
      onClick: () => openTreatment(selected.value),
    },
    {
      icon: 'edit',
      label: 'Avaliar tratamento selecionado',
      disabled: !selected.value || !canOperational('guide_processes', 'canEdit'),
      onClick: () =>
        router.push({
          path: '/central-de-guias/tratamentos/' + selected.value.id,
          query: { evaluate: '1' },
        }),
    },
    {
      icon: 'file',
      label: 'Gerar guias do tratamento selecionado',
      disabled: !selected.value || !canOperational('guide_processes', 'canEdit'),
      onClick: () =>
        router.push({
          path: '/central-de-guias/tratamentos/' + selected.value.id,
          query: { documents: '1' },
        }),
    },
    {
      icon: 'delete',
      label: 'Excluir tratamento selecionado',
      variant: 'danger' as const,
      disabled: !selected.value || !canOperational('guide_processes', 'canDelete'),
      onClick: archiveSelected,
    },
    deletedItemsAction,
    { icon: 'refresh', label: 'Atualizar', onClick: () => load(page.value) },
  ]
})
async function toggleDeleted() {
  if (showDeleted.value) {
    showDeleted.value = false
    clearFilters()
    return
  }
  showDeleted.value = true
  showFilters.value = false
  Object.keys(filters).forEach((key) => (filters[key] = ''))
  filters.sort = 'created_desc'
  await load(1)
}
async function archiveSelected() {
  const item = selected.value
  if (!item || !canOperational('guide_processes', 'canDelete')) return
  if (!window.confirm(`Mover o tratamento de ${item.patient_name} para a lixeira? Os dados e documentos serão preservados e o tratamento poderá ser restaurado.`)) return
  try {
    await api.delete(`/guide-processes/${item.id}`)
    selected.value = null
    await Promise.all([load(data.value.length === 1 && page.value > 1 ? page.value - 1 : page.value), loadQueueCounts()])
  } catch (error: any) {
    loadError.value = error.response?.data?.error || 'Não foi possível excluir o tratamento.'
  }
}
async function restoreSelected() {
  const item = selected.value
  if (!item || !canOperational('guide_processes', 'canEdit')) return
  if (!window.confirm(`Restaurar o tratamento de ${item.patient_name} para as filas ativas?`)) return
  try {
    await api.post(`/guide-processes/${item.id}/restore`)
    selected.value = null
    await Promise.all([load(data.value.length === 1 && page.value > 1 ? page.value - 1 : page.value), loadQueueCounts()])
  } catch (error: any) {
    loadError.value = error.response?.data?.error || 'Não foi possível restaurar o tratamento.'
  }
}
function resizePage(size: number) {
  if (size === pageSize.value) {
    clearTimeout(resizeTimer)
    resizeTimer = undefined
    return
  }
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = undefined
    if (size === pageSize.value) return
    pageSize.value = size
    if (initialized) void load(1)
  }, 180)
}
useTreatmentLiveUpdates(async () => {
  if (!initialized) return
  await load(page.value, true)
  await loadQueueCounts()
})
function load(target = 1, live = false): Promise<void> {
  if (disposed) return Promise.resolve()
  // A background event must not replace a newer filter/page chosen by the user.
  if (live && pendingLoad) return loadingTask || Promise.resolve()
  const params = showDeleted.value
    ? Object.fromEntries(Object.entries({ search: filters.search, sort: filters.sort }).filter(([, v]) => v))
    : Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  pendingLoad = {
    sequence: ++loadSequence, target, live,
    params: { ...params, ...(showDeleted.value ? { deleted: 'true' } : {}), page: target, pageSize: pageSize.value },
    query: { ...route.query, queue: showDeleted.value ? undefined : activeTab.value,
      process_stage: showDeleted.value ? undefined : filters.process_stage || undefined,
      deleted: showDeleted.value ? '1' : undefined },
  }
  if (!live) selected.value = null
  if (!loadingTask) loadingTask = drainLoads().finally(() => { loadingTask = undefined })
  return loadingTask
}
async function drainLoads() {
  while (pendingLoad && !disposed) {
    const delay = apiCooldownRemaining()
    if (delay) {
      loading.value = false
      await new Promise<void>(resolve => { resumeCooldown = resolve; cooldownTimer = setTimeout(resolve, delay) })
      resumeCooldown = undefined
      continue
    }
    const request = pendingLoad
    pendingLoad = undefined
    await fetchList(request)
  }
  loading.value = false
}
async function fetchList(request: ListRequest) {
  const { sequence, live } = request
  loading.value = true
  const previousSelection = live ? selected.value : null
  try {
    const response = await api.get('/guide-processes', {
      params: request.params,
    })
    if (disposed || sequence !== loadSequence) return
    data.value = response.data.data
    if (live) selected.value = data.value.find((item:any) => item.id === previousSelection?.id) || null
    page.value = response.data.pagination.page
    pages.value = response.data.pagination.pages || 1
    total.value = response.data.pagination.total
    await router.replace({ query: request.query })
  } catch (e) {
    if (disposed) return
    if ((e as any).response?.status === 429 && !pendingLoad) pendingLoad = request
    if (sequence === loadSequence)
      loadError.value =
        (e as any).response?.data?.error || 'Não foi possível carregar os tratamentos.'
  }
}
function loadQueueCounts(): Promise<void> {
  if (disposed || apiCooldownRemaining()) return Promise.resolve()
  if (countsTask) return countsTask
  countsTask = api.get('/guide-processes/queue-counts')
    .then(response => { if (!disposed) Object.assign(queueCounts, response.data) })
    .finally(() => { countsTask = undefined })
  return countsTask
}
function queueParams(key: string) {
  if (key === 'PARTIAL') return {process_stage:'partial'}
  if (key === 'BILLING') return { process_stage: 'billing' }
  if (['AWAITING_EVALUATION', 'AWAITING_GUIDE_CENTER'].includes(key)) return { workflow_queue: key }
  return key === 'ALL' ? {} : { authorization_status: key }
}
function selectTab(key: string) {
  keepAllTab.value = key === 'ALL'
  filters.process_stage = ''
  filters.authorization_status = ''
  filters.workflow_queue = ''
  Object.assign(filters, queueParams(key))
  load(1)
}
function clearFilters() {
  Object.keys(filters).forEach((key) => (filters[key] = ''))
  filters.sort = 'created_desc'
  selectTab('READY')
}
function removeFilter(key: string) {
  filters[key] = ''
  load(1)
}
onMounted(async () => {
  showDeleted.value = route.query.deleted === '1'
  const queue = typeof route.query.queue === 'string' ? route.query.queue : typeof route.query.process_stage === 'string' ? 'ALL' : 'READY'
  keepAllTab.value = queue === 'ALL'
  filters.authorization_status = ''
  if (!showDeleted.value) {
    Object.assign(filters, queueParams(queue))
    for (const key of ['process_stage', 'document_status', 'treatment_status', 'billing_status'])
      if (typeof route.query[key] === 'string') filters[key] = route.query[key] as string
  }
  try {
    ;[insurers.value, professionals.value] = await Promise.all([
      (await api.get('/insurance-providers', { params: { active: true } })).data,
      (await api.get('/professionals', { params: { active: true } })).data,
    ])
    if (disposed) return
    initialized = true
    await Promise.all([load(), loadQueueCounts()])
  } catch {
    loadError.value = 'Não foi possível carregar os tratamentos e seus filtros.'
  }
})
onBeforeUnmount(() => {
  disposed = true
  pendingLoad = undefined
  clearTimeout(resizeTimer)
  clearTimeout(cooldownTimer)
  resumeCooldown?.()
})

useFeedback(() => unwrapNoticeValue(loadError), () => 'error')
</script>

<style scoped>
/* Content-driven columns: compact values take only the space they need. */
.treatment-list :deep(.list-table) {
  table-layout: auto;
}
.treatment-list :deep(.list-table tbody tr[aria-selected]) {
  -webkit-user-select: none;
  user-select: none;
}
.treatment-list :deep(.list-table th),
.treatment-list :deep(.list-table td) {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}
.treatment-list :deep(.list-table th:nth-child(n + 4)) {
  width: 1%;
}
.treatment-patient,
.treatment-name {
  display: block;
  white-space: normal;
  overflow-wrap: anywhere;
}
.treatment-patient {
  min-width: 12rem;
  max-width: 30rem;
}
.treatment-name {
  min-width: 7rem;
  max-width: 18rem;
}
.filter-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  color: #475467;
}
.filter-label .input {
  width: 100%;

  color: #344054;
}
</style>
