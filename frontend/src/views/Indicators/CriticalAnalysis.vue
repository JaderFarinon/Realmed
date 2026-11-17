<template>
  <PageShell
    title="Análise crítica"
    subtitle="Monte apresentações com evidências, interpretação e plano de ação"
  >
    <template #actions
      ><button class="btn-secondary" :disabled="busy" @click="openLibrary">
        Abrir apresentações</button
      ><button v-if="canCreate" class="btn-secondary" :disabled="busy" @click="newPresentation">
        Nova apresentação
      </button></template
    >
    <section class="panel indicator-controls">
      <div class="indicator-tabs" role="tablist" aria-label="Áreas da análise crítica">
        <button
          v-for="a in areas"
          :key="a.key"
          role="tab"
          :aria-selected="area === a.key"
          :class="{ active: area === a.key }"
          @click="area = a.key"
        >
          {{ a.label }}
        </button>
      </div>
      <p>
        Escolha um indicador para adicionar uma tela com Antes, Agora e Futuro. Você pode combinar
        áreas na mesma apresentação.
      </p>
      <div class="indicator-picker">
        <button
          v-for="d in areaDefinitions"
          :key="d.key"
          class="btn-secondary"
          :disabled="!canModify || busy"
          @click="addIndicator(d)"
        >
          {{ d.label }}
        </button>
      </div>
      <p v-if="!canModify" class="indicator-context">
        Acesso de consulta. A criação ou edição depende da permissão de Análise crítica.
      </p>
    </section>
    <section class="panel indicator-controls">
      <label
        >Título da apresentação<input
          v-model="presentation.title"
          :readonly="!canModify"
          class="input"
          maxlength="180"
          placeholder="Ex.: Reunião de indicadores — novembro de 2026"
      /></label>
      <div class="indicator-actions">
        <button v-if="canModify" class="btn-primary" :disabled="busy || !dirty" @click="save">
          {{ saving ? 'Salvando…' : 'Salvar apresentação' }}</button
        ><button
          class="btn-secondary"
          :disabled="busy || !presentation.slides.length"
          @click="showPresentation"
        >
          Apresentar</button
        ><button
          class="btn-secondary"
          :disabled="busy || !presentation.slides.length"
          @click="print"
        >
          Imprimir / PDF</button
        ><span role="status" class="indicator-context"
          >{{
            dirty
              ? 'Alterações ainda não salvas'
              : presentation.id
                ? 'Versão salva ' + presentation.revision
                : 'Nova apresentação'
          }}
          · {{ presentation.slides.length }} / 30 telas</span
        >
      </div>
      <p class="indicator-context">
        Apresentações são compartilhadas com quem tem acesso à Análise crítica. Os gráficos salvos
        preservam os resultados e filtros da consulta.
      </p>
    </section>
    <div v-if="!presentation.slides.length" class="panel analysis-empty">
      Selecione um indicador acima para começar.
    </div>
    <section v-else class="analysis-workspace">
      <aside class="panel analysis-outline" aria-label="Telas da apresentação">
        <h2>Telas</h2>
        <ol>
          <li v-for="(s, i) in presentation.slides" :key="i">
            <button
              :class="{ active: index === i }"
              :aria-current="index === i ? 'step' : undefined"
              @click="selectSlide(i)"
            >
              {{ i + 1 }}. {{ s.title }}
            </button>
          </li>
        </ol>
        <div v-if="canModify" class="indicator-actions">
          <button
            class="table-action-button"
            title="Mover tela para cima"
            aria-label="Mover tela para cima"
            :disabled="index === 0 || busy"
            @click="move(-1)"
          >
            ↑</button
          ><button
            class="table-action-button"
            title="Mover tela para baixo"
            aria-label="Mover tela para baixo"
            :disabled="index === presentation.slides.length - 1 || busy"
            @click="move(1)"
          >
            ↓</button
          ><button
            class="table-action-button text-red-600"
            title="Remover tela"
            aria-label="Remover tela"
            :disabled="busy"
            @click="removeSlide"
          >
            ×
          </button>
        </div>
      </aside>
      <div v-if="active" class="panel analysis-editor">
        <label
          >Título da tela<input
            v-model="active.title"
            class="input"
            :readonly="!canModify"
            maxlength="180"
        /></label>
        <details v-if="canModify" class="analysis-periods">
          <summary>Períodos e filtros da comparação ⌄</summary>
          <div class="analysis-compare-filters">
            <fieldset>
              <legend>Antes</legend>
              <IndicatorFilters v-model="beforeFilters" :options="options" />
            </fieldset>
            <fieldset>
              <legend>Agora</legend>
              <IndicatorFilters v-model="nowFilters" :options="options" />
            </fieldset>
          </div>
          <div class="indicator-actions">
            <button class="btn-secondary" :disabled="busy" @click="refreshComparison">
              {{ capturing ? 'Consultando…' : 'Aplicar e atualizar comparação' }}</button
            ><span v-if="filtersChanged" class="indicator-context"
              >Filtros alterados. Aplique para atualizar os resultados desta tela.</span
            >
          </div>
        </details>
        <div class="analysis-text-fields">
          <section>
            <h3>Antes</h3>
            <label
              >De onde eu vim *<textarea
                v-model="active.origin"
                :readonly="!canModify"
                maxlength="3000"
                class="input"
                rows="4"
                placeholder="Qual era o cenário? Qual problema ou oportunidade motivou a análise?"
              />
            </label>
          </section>
          <section>
            <h3>Agora</h3>
            <label
              >Como cheguei a este resultado *<textarea
                v-model="active.explanation"
                :readonly="!canModify"
                maxlength="3000"
                class="input"
                rows="4"
                placeholder="Quais ações foram realizadas? O que ajudou, dificultou ou explica a mudança?"
              />
            </label>
          </section>
          <section>
            <h3>Futuro</h3>
            <label
              >Para onde estou indo *<textarea
                v-model="active.direction"
                :readonly="!canModify"
                maxlength="3000"
                class="input"
                rows="3"
                placeholder="Qual resultado deve ser alcançado?"
              /></label
            ><label
              >O que fazer para seguir *<textarea
                v-model="active.actions"
                :readonly="!canModify"
                maxlength="3000"
                class="input"
                rows="4"
                placeholder="Ações concretas e como acompanhar sua execução"
              /></label
            ><label
              >Meta<input
                v-model="active.target"
                :readonly="!canModify"
                maxlength="500"
                class="input"
                placeholder="Ex.: reduzir a taxa de faltas para 10% até março" /></label
            ><label
              >Responsável<input
                v-model="active.responsible"
                :readonly="!canModify"
                maxlength="180"
                class="input" /></label
            ><label
              >Prazo<input
                v-model="active.dueDate"
                :readonly="!canModify"
                type="date"
                class="input"
            /></label>
          </section>
        </div>
        <p class="indicator-context">
          * Necessário para apresentar. Você pode salvar o rascunho incompleto.
        </p>
        <details class="analysis-preview" open>
          <summary>Prévia da tela</summary>
          <AnalysisSlide :slide="active" />
        </details>
      </div>
    </section>
    <ListDetailDialog
      :open="libraryOpen"
      title="Apresentações salvas"
      wide
      @close="libraryOpen = false"
      ><DataList
        v-model:selected="selected"
        :items="saved"
        :columns="columns"
        :actions="libraryActions"
        :server-total="total"
        :page="page"
        :loading="libraryLoading"
        selection-key="title"
        embedded
        @update:page="changePage"
        @update:page-size="changeSize"
        @row-dblclick="openSelected"
        ><template #filters
          ><form
            class="list-filter-grid"
            @submit.prevent="searchLibrary"
          >
            <label class="filter-search"
              >Título<input v-model="search" class="input" maxlength="180" /></label
            ><button class="btn-primary">Pesquisar</button>
          </form></template
        ></DataList
      ></ListDetailDialog
    >
    <ListDetailDialog
      :open="confirmation !== null"
      title="Confirmar ação"
      @close="finishConfirmation(false)"
      ><p>{{ confirmation?.message }}</p>
      <template #footer
        ><button class="btn-secondary" @click="finishConfirmation(false)">Cancelar</button
        ><button class="btn-primary" @click="finishConfirmation(true)">Confirmar</button></template
      ></ListDetailDialog
    >
    <ListDetailDialog
      :open="presenting"
      :title="presentation.title"
      dialog-class="indicator-presentation-dialog"
      @close="presenting = false"
      ><div class="indicator-actions">
        <button class="btn-secondary" :disabled="presentIndex === 0" @click="presentIndex--">
          Tela anterior</button
        ><span>{{ presentIndex + 1 }} / {{ presentation.slides.length }}</span
        ><button
          class="btn-primary"
          :disabled="presentIndex === presentation.slides.length - 1"
          @click="presentIndex++"
        >
          Próxima tela
        </button>
      </div>
      <AnalysisSlide
        v-if="presentation.slides[presentIndex]"
        :slide="presentation.slides[presentIndex]"
    /></ListDetailDialog>
  </PageShell>
  <Teleport to="body"
    ><div v-if="printing" class="indicator-print-document">
      <h1>{{ presentation.title }}</h1>
      <AnalysisSlide v-for="(s, i) in presentation.slides" :key="i" :slide="s" /></div
  ></Teleport>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import IndicatorFilters from './IndicatorFilters.vue'
import AnalysisSlide from './AnalysisSlide.vue'
import api from '@/plugins/axios'
import { notify } from '@/composables/useNotifications'
import { useAuthUser } from '@/composables/useAuthUser'
import type { Area, Definition, Presentation, Slide, Filters, Options, Metric } from './types'
import { initialFilters, previousFilters, errorMessage, timestamp } from './types'
import '@/assets/indicators.css'
const route = useRoute(),
  { canOperational } = useAuthUser()
const canCreate = computed(() => canOperational('indicator_analysis', 'canCreate'))
const presentation = ref<Presentation>({ title: '', slides: [] }),
  baseline = ref(JSON.stringify(presentation.value)),
  index = ref(0)
const dirty = computed(() => JSON.stringify(presentation.value) !== baseline.value)
const canModify = computed(() =>
  presentation.value.id ? canOperational('indicator_analysis', 'canEdit') : canCreate.value,
)
const active = computed(() => presentation.value.slides[index.value])
const areas = ref<Area[]>([]),
  definitions = ref<Definition[]>([]),
  area = ref('epidemiology')
const areaDefinitions = computed(() => definitions.value.filter((d) => d.area === area.value))
const beforeFilters = ref(previousFilters(initialFilters())),
  nowFilters = ref(initialFilters()),
  options = ref<Options>({ insurances: [], schedules: [], places: [] })
const filtersChanged = computed(
  () =>
    !!active.value &&
    (JSON.stringify(beforeFilters.value) !== JSON.stringify(active.value.before.filters) ||
      JSON.stringify(nowFilters.value) !== JSON.stringify(active.value.now.filters)),
)
const saving = ref(false),
  capturing = ref(false),
  opening = ref(false),
  busy = computed(() => saving.value || capturing.value || opening.value)
const libraryOpen = ref(false),
  libraryLoading = ref(false),
  saved = ref<Record<string, unknown>[]>([]),
  selected = ref<Record<string, unknown> | null>(null),
  total = ref(0),
  page = ref(1),
  pageSize = ref(10),
  search = ref('')
const presenting = ref(false),
  presentIndex = ref(0),
  printing = ref(false)
const confirmation = ref<{ message: string; resolve: (ok: boolean) => void } | null>(null)
let disposed = false,
  libraryRequest = 0
const controllers = new Set<AbortController>()
function confirm(message: string) {
  return new Promise<boolean>((resolve) => {
    confirmation.value = { message, resolve }
  })
}
function finishConfirmation(ok: boolean) {
  confirmation.value?.resolve(ok)
  confirmation.value = null
}
async function get<T>(path: string, params?: object) {
  const controller = new AbortController()
  controllers.add(controller)
  try {
    return (await api.get<T>(path, { params, signal: controller.signal })).data
  } finally {
    controllers.delete(controller)
  }
}
function setPresentation(value: Presentation) {
  presentation.value = value
  baseline.value = JSON.stringify(value)
  selectSlide(0)
}
function selectSlide(i: number) {
  index.value = i
  const s = active.value
  if (s) {
    beforeFilters.value = { ...s.before.filters }
    nowFilters.value = { ...s.now.filters }
  }
}
async function fetchOptions(f: Filters) {
  try {
    options.value = (await get<{ options: Options }>('/indicators/dashboard', f)).options
  } catch (e) {
    if (!disposed) notify(errorMessage(e), 'error')
  }
}
async function snapshots(key: string, before: Filters, now: Filters) {
  const capture = async (filters: Filters) => {
    const controller = new AbortController()
    controllers.add(controller)
    try {
      return (
        await api.post<{ id: string; metric: Metric }>(
          '/indicators/snapshots',
          { indicatorKey: key, filters },
          { signal: controller.signal },
        )
      ).data
    } finally {
      controllers.delete(controller)
    }
  }
  const b = await capture({ ...before }),
    n = await capture({ ...now })
  return { beforeId: b.id, nowId: n.id, before: b.metric, now: n.metric }
}
async function addIndicator(def: Definition, provided?: Filters) {
  if (!canModify.value || busy.value) return
  if (presentation.value.slides.length >= 30) {
    notify('Limite de 30 telas por apresentação.', 'warning')
    return
  }
  capturing.value = true
  try {
    const now = { ...(provided || initialFilters(def.area)), area: def.area },
      before = previousFilters(now)
    const captured = await snapshots(def.key, before, now)
    if (disposed) return
    presentation.value.slides.push({
      title: def.label,
      indicatorKey: def.key,
      ...captured,
      origin: '',
      explanation: '',
      direction: '',
      actions: '',
      target: '',
      responsible: '',
      dueDate: '',
    })
    if (!presentation.value.title) presentation.value.title = 'Análise crítica de indicadores'
    selectSlide(presentation.value.slides.length - 1)
    void fetchOptions(now)
  } catch (e) {
    if (!disposed) notify(errorMessage(e), 'error')
  } finally {
    capturing.value = false
  }
}
async function refreshComparison() {
  if (!active.value || busy.value) return
  const slide = active.value,
    b = { ...beforeFilters.value },
    n = { ...nowFilters.value }
  capturing.value = true
  try {
    const captured = await snapshots(slide.indicatorKey, b, n)
    if (disposed) return
    Object.assign(slide, captured)
    selectSlide(index.value)
    void fetchOptions(n)
    notify(
      'Comparação atualizada. Salve a apresentação para preservar estes resultados.',
      'success',
    )
  } catch (e) {
    if (!disposed) notify(errorMessage(e), 'error')
  } finally {
    capturing.value = false
  }
}
async function save() {
  if (!canModify.value || busy.value) return
  if (!presentation.value.title.trim()) {
    notify('Informe o título da apresentação.', 'warning')
    return
  }
  saving.value = true
  try {
    const data = {
      title: presentation.value.title,
      revision: presentation.value.revision,
      slides: presentation.value.slides,
    }
    const result = presentation.value.id
      ? await api.put('/indicators/presentations/' + presentation.value.id, data)
      : await api.post('/indicators/presentations', data)
    if (disposed) return
    setPresentation(result.data)
    notify('Apresentação salva.', 'success')
  } catch (e) {
    if (!disposed) notify(errorMessage(e), 'error')
  } finally {
    saving.value = false
  }
}
async function newPresentation() {
  if (
    dirty.value &&
    !(await confirm('Descartar as alterações não salvas e iniciar outra apresentação?'))
  )
    return
  setPresentation({ title: '', slides: [] })
}
function move(direction: number) {
  const next = index.value + direction
  if (next < 0 || next >= presentation.value.slides.length) return
  const slides = presentation.value.slides
  ;[slides[index.value], slides[next]] = [slides[next], slides[index.value]]
  selectSlide(next)
}
async function removeSlide() {
  if (
    !(await confirm(
      'Remover esta tela da apresentação? A mudança será gravada quando você salvar.',
    ))
  )
    return
  presentation.value.slides.splice(index.value, 1)
  selectSlide(Math.max(0, index.value - 1))
}
function ready() {
  if (!presentation.value.title.trim() || !presentation.value.slides.length) {
    notify('Informe o título e adicione ao menos uma tela.', 'warning')
    return false
  }
  const missing = presentation.value.slides.findIndex(
    (s) => ![s.title, s.origin, s.explanation, s.direction, s.actions].every((v) => v.trim()),
  )
  if (missing >= 0) {
    selectSlide(missing)
    notify(
      `Preencha a interpretação de Antes, Agora e Futuro e o plano de ação da tela ${missing + 1}. Você pode salvar o rascunho incompleto.`,
      'warning',
    )
    return false
  }
  return true
}
function showPresentation() {
  if (!ready()) return
  presentIndex.value = 0
  presenting.value = true
}
async function print() {
  if (!ready()) return
  printing.value = true
  document.body.classList.add('printing-indicators')
  await nextTick()
  window.print()
  document.body.classList.remove('printing-indicators')
  printing.value = false
}
async function loadLibrary() {
  const request = ++libraryRequest
  libraryLoading.value = true
  try {
    const data = await get<{ items: Record<string, unknown>[]; total: number }>(
      '/indicators/presentations',
      { page: page.value, pageSize: pageSize.value, search: search.value },
    )
    if (disposed || request !== libraryRequest) return
    saved.value = data.items
    total.value = data.total
    selected.value = null
  } catch (e) {
    if (!disposed) notify(errorMessage(e), 'error')
  } finally {
    if (request === libraryRequest) libraryLoading.value = false
  }
}
function searchLibrary() {
  page.value = 1
  void loadLibrary()
}
function openLibrary() {
  libraryOpen.value = true
  void loadLibrary()
}
function changePage(n: number) {
  if (page.value !== n) {
    page.value = n
    void loadLibrary()
  }
}
function changeSize(n: number) {
  if (pageSize.value !== n) {
    pageSize.value = n
    page.value = 1
    if (libraryOpen.value) void loadLibrary()
  }
}
async function openSelected(row = selected.value) {
  if (!row || busy.value) return
  if (
    dirty.value &&
    !(await confirm('Descartar as alterações não salvas e abrir a apresentação escolhida?'))
  )
    return
  opening.value = true
  try {
    const data = await get<Presentation>('/indicators/presentations/' + row.id)
    if (disposed) return
    setPresentation(data)
    libraryOpen.value = false
    if (active.value) void fetchOptions(active.value.now.filters)
  } catch (e) {
    if (!disposed) notify(errorMessage(e), 'error')
  } finally {
    opening.value = false
  }
}
async function deleteSelected() {
  const row = selected.value
  if (!row || !(await confirm('Excluir a apresentação “' + row.title + '”?'))) return
  try {
    await api.delete('/indicators/presentations/' + row.id, { data: { revision: row.revision } })
    if (presentation.value.id === row.id) setPresentation({ title: '', slides: [] })
    notify('Apresentação excluída.', 'success')
    await loadLibrary()
  } catch (e) {
    notify(errorMessage(e), 'error')
  }
}
const columns = [
  { key: 'title', label: 'Apresentação' },
  { key: 'slide_count', label: 'Telas' },
  { key: 'revision', label: 'Versão' },
  {
    key: 'updated_at',
    label: 'Atualizada em',
    format: (value: unknown) => timestamp(String(value)),
  },
]
const libraryActions = computed(() => [
  {
    icon: 'eye',
    label: 'Abrir apresentação',
    disabled: !selected.value || busy.value,
    onClick: () => openSelected(),
  },
  {
    icon: 'delete',
    label: 'Excluir apresentação',
    disabled: !selected.value || !canOperational('indicator_analysis', 'canDelete'),
    onClick: deleteSelected,
  },
  { icon: 'refresh', label: 'Atualizar apresentações', onClick: loadLibrary },
])
function unload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onBeforeRouteLeave(
  async () =>
    !dirty.value ||
    (await confirm('Sair e descartar as alterações não salvas desta apresentação?')),
)
onMounted(async () => {
  window.addEventListener('beforeunload', unload)
  try {
    const catalog = await get<{ areas: Area[]; definitions: Definition[] }>('/indicators/catalog')
    if (disposed) return
    areas.value = catalog.areas
    definitions.value = catalog.definitions
    const def = definitions.value.find((d) => d.key === route.query.indicator)
    if (def) {
      area.value = def.area
      const f = initialFilters(def.area)
      for (const k of Object.keys(f) as (keyof Filters)[]) {
        const v = route.query[k]
        if (typeof v === 'string') f[k] = v
      }
      await addIndicator(def, f)
    }
  } catch (e) {
    if (!disposed) notify(errorMessage(e), 'error')
  }
})
onBeforeUnmount(() => {
  disposed = true
  controllers.forEach((c) => c.abort())
  finishConfirmation(false)
  window.removeEventListener('beforeunload', unload)
  document.body.classList.remove('printing-indicators')
})
</script>
