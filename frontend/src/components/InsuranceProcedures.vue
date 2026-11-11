<template>
  <ListDetailDialog
    :open="open"
    :embedded="embedded"
    :title="'Procedimentos — ' + (provider?.name || '')"
    wide
    @close="emit('close')"
  >
    <p class="mb-4 text-sm">
      Cadastre o código e a descrição que devem sair nas guias deste convênio. Em cada procedimento,
      informe os códigos que ele substitui quando forem encontrados no original.
    </p>
    <p class="mb-4 text-sm text-gray-600">Esta lista mostra os procedimentos vinculados ao convênio. Para usar códigos já cadastrados, clique em Vincular procedimentos do catálogo geral na barra de ações.</p>
    
    <DataList
      v-model:selected="selected"
      :items="filtered"
      :columns="columns"
      :actions="actions"
      :loading="loading"
      :empty-text="error ? 'Não foi possível carregar. Use Atualizar procedimentos para tentar novamente.' : search ? 'Nenhum procedimento encontrado para a pesquisa.' : 'Nenhum procedimento vinculado a este convênio.'"
      embedded
      selection-key="code"
    >
      <template #filters
        ><div class="list-filter-grid">
          <label class="filter-search"
            >Pesquisar<input
              v-model="search"
              class="input"
              placeholder="Código, descrição ou código substituído" /></label
          ><button class="btn-secondary" @click="search = ''">Limpar</button>
        </div></template
      >
    </DataList>
  </ListDetailDialog>
  <ListDetailDialog
    :open="editingOpen"
    :title="editing ? 'Editar procedimento do convênio' : 'Adicionar procedimento ao convênio'"
    wide
    @close="!saving && (editingOpen = false)"
  >
    <form class="grid gap-4 md:grid-cols-2" @submit.prevent="save">
      <p class="text-sm md:col-span-2">
        Convênio: <b>{{ provider?.name }}</b>
      </p>
      <label
        ><FieldLabel :required="true">Código do procedimento</FieldLabel
        ><input
          v-model="form.code"
          required
          maxlength="50"
          :readonly="Boolean(editing)"
          class="input"
      /></label>
      <label
        ><FieldLabel :required="true">Descrição do procedimento</FieldLabel
        ><input v-model="form.description" required maxlength="255" class="input"
      /></label>
      <label
        >Tipo<select v-model="form.type" aria-label="Tipo do procedimento" class="input">
          <option value="PHYSIOTHERAPY">Fisioterapia</option>
          <option value="CONSULTATION">Consulta</option>
          <option value="ELECTROSTIMULATION">Eletroestimulação</option>
          <option value="OTHER">Outro</option>
        </select></label
      >
      <label>Tabela<input v-model="form.table_name" maxlength="80" class="input" /></label>
      <label class="md:col-span-2"
        >Códigos que este procedimento substitui<textarea
          v-model="replacesText"
          class="input min-h-24"
          placeholder="Ex.: 1234, 4321 (separe por vírgula ou linha)"
        />
      </label>
      <p class="text-sm text-gray-600 md:col-span-2">
        Exemplo: ao cadastrar 1567 e informar 1234 acima, uma guia deste convênio contendo 1234 será
        gerada com 1567. A troca é direta e mantém o original anexado.
      </p>
      <label class="flex items-center gap-2"
        ><input v-model="form.active" type="checkbox" />Ativo neste convênio</label
      >
      
      <div class="flex flex-wrap justify-end gap-3 md:col-span-2">
        <button type="button" class="btn-secondary" :disabled="saving" @click="editingOpen = false">
          Cancelar</button
        ><button class="btn" :disabled="saving">
          {{ saving ? 'Salvando…' : 'Salvar procedimento e substituições' }}
        </button>
      </div>
    </form>
  </ListDetailDialog>
  <ListDetailDialog :open="linkOpen" title="Vincular procedimentos do catálogo geral" wide @close="!saving && (linkOpen = false)">
    <p class="mb-3">Convênio: <b>{{ provider?.name }}</b>. Selecione os procedimentos que deseja vincular. As regras de substituição existentes serão preservadas.</p>
    <DataList :items="availableCatalog" :columns="catalogColumns" :selectable="false" :loading="catalogLoading" embedded empty-text="Nenhum procedimento disponível. Os códigos ativos podem já estar vinculados a este convênio.">
      <template #filters><label>Pesquisar código ou descrição<input v-model="catalogSearch" class="input" /></label></template>
      <template #actions><label class="flex items-center gap-2"><input type="checkbox" :checked="allCatalogSelected" :disabled="saving || catalogLoading || !availableCatalog.length" @change="selectCatalogResults(($event.target as HTMLInputElement).checked)" />Selecionar resultados</label></template>
      <template #cell-selected="{ item }"><input v-model="catalogSelection" type="checkbox" :value="item.id" :disabled="saving || catalogLoading" :aria-label="item.code + ' — ' + item.description" /></template>
    </DataList>
    <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
      <span class="text-sm">{{ catalogSelection.length }} selecionados</span>
      <button type="button" class="btn-secondary" :disabled="saving || catalogLoading" @click="loadCatalog">Atualizar catálogo</button>
      <button type="button" class="btn-secondary" :disabled="saving" @click="linkOpen = false">Cancelar</button>
      <button type="button" class="btn" :disabled="saving || catalogLoading || !catalogSelection.length" @click="linkCatalog">{{ saving ? 'Vinculando…' : 'Vincular selecionados' }}</button>
    </div>
  </ListDetailDialog>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import ListDetailDialog from './ListDetailDialog.vue'
import DataList from './DataList.vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
import { procedureTypeLabels } from '@/utils/guideLabels'
const props = defineProps<{ open: boolean; provider: any; embedded?: boolean }>(),
  emit = defineEmits(['close', 'busy-change']),
  { canOperational } = useAuthUser()
const rows = ref<any[]>([]),
  selected = ref<any>(null),
  search = ref(''),
  loading = ref(false),
  error = ref(''),
  editingOpen = ref(false),
  editing = ref<number | null>(null),
  saving = ref(false),
  formError = ref(''),
  replacesText = ref(''),
  form = reactive<any>({})
const linkOpen = ref(false), catalogLoading = ref(false), catalog = ref<any[]>([]),
  catalogSearch = ref(''), catalogSelection = ref<number[]>([]), success = ref('')
let catalogVersion = 0
const catalogColumns = [
  { key: 'selected', label: 'Selecionar' }, { key: 'code', label: 'Código' },
  { key: 'description', label: 'Descrição' },
  { key: 'type', label: 'Tipo', format: (value: string) => procedureTypeLabels[value as keyof typeof procedureTypeLabels] || value },
]
const availableCatalog = computed(() => catalog.value.filter(row =>
  !rows.value.some(link => Number(link.procedure_id) === Number(row.id)) &&
  [row.code, row.description].some(value => String(value).toLowerCase().includes(catalogSearch.value.trim().toLowerCase())),
))
const allCatalogSelected = computed(() => availableCatalog.value.length > 0 && availableCatalog.value.every(row => catalogSelection.value.includes(row.id)))
function selectCatalogResults(checked: boolean) {
  const ids = availableCatalog.value.map(row => row.id)
  catalogSelection.value = checked ? [...new Set([...catalogSelection.value, ...ids])] : catalogSelection.value.filter(id => !ids.includes(id))
}
async function loadCatalog() {
  const version = ++catalogVersion
  catalogLoading.value = true
  catalog.value = []
  catalogSelection.value = []
  formError.value = ''
  try {
    const response = await api.get('/procedures', { params: { active: true } })
    if (version === catalogVersion) catalog.value = response.data
  } catch (e: any) {
    if (version === catalogVersion) formError.value = e.response?.data?.error || 'Não foi possível carregar o catálogo geral.'
  } finally { if (version === catalogVersion) catalogLoading.value = false }
}
async function openCatalog() {
  if (saving.value || loading.value || !canOperational('procedures', 'canCreate')) return
  catalogSearch.value = ''
  linkOpen.value = true
  await loadCatalog()
}
async function linkCatalog() {
  if (saving.value || catalogLoading.value || !catalogSelection.value.length || !canOperational('procedures', 'canCreate')) return
  saving.value = true
  formError.value = ''
  success.value = ''
  try {
    const result = (await api.post(`/insurance-providers/${props.provider.id}/procedures/link`, { procedure_ids: catalogSelection.value })).data
    linkOpen.value = false
    success.value = `${result.linked} procedimento(s) vinculado(s) ao convênio.`
    await load()
  } catch (e: any) { formError.value = e.response?.data?.error || 'Não foi possível vincular os procedimentos.' }
  finally { saving.value = false }
}
const columns = [
  { key: 'code', label: 'Código' },
  { key: 'description', label: 'Descrição' },
  {
    key: 'replaces',
    label: 'Substitui',
    format: (v: string[]) => v.join(', ') || 'Sem substituição',
  },
  { key: 'active', label: 'Situação', format: (v: boolean) => (v ? 'Ativo' : 'Inativo') },
]
watch(saving, (value) => emit('busy-change', value))
const filtered = computed(() =>
  rows.value.filter((r) =>
    [r.code, r.description, ...r.replaces].some((v) =>
      String(v).toLowerCase().includes(search.value.toLowerCase()),
    ),
  ),
)
const actions = computed(() => [
  {
    icon: 'add',
    label: 'Adicionar procedimento',
    variant: 'primary' as const,
    disabled: !canOperational('procedures', 'canCreate'),
    onClick: () => edit(),
  },
  {
    icon: 'copy',
    label: 'Vincular procedimentos do catálogo geral',
    disabled: !canOperational('procedures', 'canCreate'),
    onClick: openCatalog,
  },
  {
    icon: 'edit',
    label: 'Editar procedimento selecionado',
    disabled: !selected.value || !canOperational('procedures', 'canEdit'),
    onClick: () => edit(selected.value),
  },
  { icon: 'refresh', label: 'Atualizar procedimentos', onClick: load },
])
function edit(row?: any) {
  editing.value = row?.id || null
  Object.assign(
    form,
    row
      ? { ...row, active: Boolean(row.active) }
      : { code: '', description: '', table_name: 'TUSS', type: 'PHYSIOTHERAPY', active: true },
  )
  replacesText.value = row?.replaces.join('\n') || ''
  formError.value = ''
  editingOpen.value = true
}
async function load() {
  const version = ++loadVersion
  const providerId = props.provider?.id
  selected.value = null
  rows.value = []
  error.value = ''
  loading.value = false
  if (!props.open || !providerId) return
  loading.value = true
  try {
    const response = await api.get(`/insurance-providers/${providerId}/procedures`)
    if (version === loadVersion) rows.value = response.data
  } catch (e: any) {
    if (version === loadVersion)
      error.value = e.response?.data?.error || 'Não foi possível carregar os procedimentos.'
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
async function save() {
  saving.value = true
  formError.value = ''
  try {
    const payload = {
        ...form,
        replaces: replacesText.value
          .split(/[,;\n]+/)
          .map((v) => v.trim())
          .filter(Boolean),
      },
      base = `/insurance-providers/${props.provider.id}/procedures`
    if (editing.value) await api.put(`${base}/${editing.value}`, payload)
    else await api.post(base, payload)
    editingOpen.value = false
    await load()
  } catch (e: any) {
    formError.value = e.response?.data?.error || 'Não foi possível salvar.'
  } finally {
    saving.value = false
  }
}
let loadVersion = 0
watch(
  () => [props.open, props.provider?.id],
  async () => {
    editingOpen.value = false
    linkOpen.value = false
    catalogVersion++
    search.value = ''
    await load()
  },
  { immediate: true },
)
onBeforeUnmount(() => { loadVersion++; catalogVersion++ })

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => unwrapNoticeValue(formError), () => 'error')
useFeedback(() => unwrapNoticeValue(success), () => 'success')
</script>
