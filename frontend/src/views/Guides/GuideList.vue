<template>
  <PageShell
    title="Gestão de Tratamentos"
    subtitle="Fila do faturamento para liberação dos tratamentos"
    :list="!showFilters"
  >
    <p v-if="loadError" class="text-error-700" role="alert">{{ loadError }}</p>
    <DataList
      v-model:selected="selected"
      :items="data"
      :columns="columns"
      :actions="toolbarActions"
      :bounded="!showFilters"
      :loading="loading"
      :server-total="total"
      :page="page"
      selection-key="patient_name"
      :row-height="64"
      @update:page="load"
      @update:page-size="resizePage"
    >
      <template #filters
        ><div class="space-y-3">
          <nav class="flex gap-2 overflow-x-auto pb-1" aria-label="Filas da Central de Guias">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold"
              :class="
                activeTab === tab.key
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              "
              @click="selectTab(tab.key)"
            >
              {{ tab.label }}
              <span class="ml-1 opacity-80">({{ queueCounts[tab.key] ?? '…' }})</span>
            </button>
          </nav>
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
          <div v-if="activeChips.length" class="flex flex-wrap gap-2">
            <button
              v-for="chip in activeChips"
              :key="chip.key"
              class="rounded-full bg-gray-100 px-3 py-1 text-xs"
              @click="removeFilter(chip.key)"
            >
              {{ chip.label }} ×
            </button>
          </div>
        </div></template
      >
      <template #cell-patient_name="{ value }"
        ><b>{{ value }}</b></template
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
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import StatusBadge from '@/components/StatusBadge.vue'
import {
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
  loadError = ref(''),
  queueCounts = reactive<Record<string, number>>({})
const tabs = [
  { key: 'READY', label: 'Pendentes' },
  { key: 'IN_PROGRESS,PENDING', label: 'Encaminhados ao Convênio' },
  { key: 'DENIED', label: 'Não Liberados' },
  { key: 'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED', label: 'Liberados' },
  { key: 'NOT_READY', label: 'Faltando Documentação' },
  { key: 'ALL', label: 'Todos' },
]
const filters = reactive<Record<string, string>>({
  search: '',
  insurance_provider_id: '',
  physiotherapist_id: '',
  requesting_doctor_id: '',
  authorization_status: 'READY',
  document_status: '',
  treatment_status: '',
  billing_status: '',
  priority: '',
  assessment_date_from: '',
  assessment_date_to: '',
  expected_start_date_from: '',
  expected_start_date_to: '',
  sort: 'start_asc',
})
const activeTab = computed(() =>
  tabs.some((t) => t.key === filters.authorization_status) ? filters.authorization_status : 'ALL',
)
const currentTabLabel = computed(
  () => tabs.find((t) => t.key === activeTab.value)?.label || 'Todos',
)
const physiotherapists = computed(() =>
  professionals.value.filter((p) => p.type === 'PHYSIOTHERAPIST'),
)
const doctors = computed(() => professionals.value.filter((p) => p.type === 'DOCTOR'))
const filterNames: Record<string, string> = {
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
const selected = ref<any>(null),
  pageSize = ref(10),
  loading = ref(false),
  { canOperational } = useAuthUser()
const columns = [
  { key: 'patient_name', label: 'Paciente', width: '18%' },
  { key: 'insurance_name', label: 'Convênio' },
  { key: 'physiotherapist_name', label: 'Fisioterapeuta' },
  { key: 'assessment_date', label: 'Avaliação', format: date },
  { key: 'expected_start_date', label: 'Início previsto', format: date },
  { key: 'requested_sessions', label: 'Sessões' },
  { key: 'document_status', label: 'Documentação' },
  { key: 'authorization_status', label: 'Liberação', width: '18%' },
  { key: 'priority', label: 'Prioridade', format: priorityLabel },
]
const toolbarActions = computed(() => [
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
    onClick: () => router.push('/central-de-guias/tratamentos/' + selected.value.id),
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
  { icon: 'refresh', label: 'Atualizar', onClick: () => load(page.value) },
])
function resizePage(size: number) {
  if (size === pageSize.value) return
  pageSize.value = size
  load(1)
}
async function load(target = 1) {
  const sequence = ++loadSequence
  loading.value = true
  selected.value = null
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    const response = await api.get('/guide-processes', {
      params: { ...params, page: target, pageSize: pageSize.value },
    })
    if (sequence !== loadSequence) return
    data.value = response.data.data
    page.value = response.data.pagination.page
    pages.value = response.data.pagination.pages || 1
    total.value = response.data.pagination.total
    await router.replace({
      query: {
        ...route.query,
        queue: activeTab.value === 'ALL' ? 'ALL' : filters.authorization_status,
      },
    })
  } catch (e) {
    if (sequence === loadSequence)
      loadError.value =
        (e as any).response?.data?.error || 'Não foi possível carregar os tratamentos.'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}
async function loadQueueCounts() {
  await Promise.all(
    tabs.map(async (tab) => {
      const response = await api.get('/guide-processes', {
        params: { pageSize: 1, ...(tab.key === 'ALL' ? {} : { authorization_status: tab.key }) },
      })
      queueCounts[tab.key] = response.data.pagination.total
    }),
  )
}
function selectTab(key: string) {
  filters.authorization_status = key === 'ALL' ? '' : key
  load(1)
}
function clearFilters() {
  Object.keys(filters).forEach((key) => (filters[key] = ''))
  filters.sort = 'start_asc'
  selectTab('READY')
}
function removeFilter(key: string) {
  filters[key] = ''
  load(1)
}
onMounted(async () => {
  const queue = typeof route.query.queue === 'string' ? route.query.queue : 'READY'
  filters.authorization_status = queue === 'ALL' ? '' : queue
  for (const key of ['document_status', 'treatment_status', 'billing_status'])
    if (typeof route.query[key] === 'string') filters[key] = route.query[key] as string
  try {
    ;[insurers.value, professionals.value] = await Promise.all([
      (await api.get('/insurance-providers', { params: { active: true } })).data,
      (await api.get('/professionals', { params: { active: true } })).data,
    ])
    await Promise.all([load(), loadQueueCounts()])
  } catch {
    loadError.value = 'Não foi possível carregar os tratamentos e seus filtros.'
  }
})
</script>

<style scoped>
.filter-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475467;
}
.filter-label .input {
  width: 100%;
  font-weight: 400;
  color: #344054;
}
</style>
