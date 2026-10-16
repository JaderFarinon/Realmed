<template>
  <PageShell
    title="Modelos de Documentos"
    subtitle="Templates PDF e posicionamento dos campos"
    list
  >
    <p v-if="message" class="text-error-700" role="alert">{{ message }}</p>
    <DataList
      v-model:selected="selected"
      :items="filteredTemplates"
      :columns="columns"
      :actions="toolbarActions"
      bounded
      selection-key="name"
    >
      <template #filters
        ><div class="list-filter-grid">
          <label class="filter-search"
            >Pesquisar<input v-model="search" class="input" placeholder="Nome ou convênio" /></label
          ><label
            >Tipo<select v-model="typeFilter" class="input">
              <option value="">Todos</option>
              <option v-for="type in types" :key="type" :value="type">
                {{ documentTypeLabels[type as keyof typeof documentTypeLabels] }}
              </option>
            </select></label
          ><button class="btn-secondary" @click="clearListFilters">Limpar</button>
        </div></template
      >
    </DataList>
    <ListDetailDialog
      :open="editorOpen"
      :title="editing ? 'Configurar modelo' : 'Novo modelo'"
      wide
      @close="editorOpen = false"
    >
      <form class="grid gap-3 md:grid-cols-4" @submit.prevent="saveTemplate">
        <label>Nome<input v-model="form.name" class="input" placeholder="Nome" required /></label>
        <label
          >Tipo<select v-model="form.document_type" class="input" required>
            <option value="" disabled>Tipo</option>
            <option v-for="type in types" :key="type" :value="type">
              {{ documentTypeLabels[type as keyof typeof documentTypeLabels] }}
            </option>
          </select></label
        >
        <label
          >Convênio<select v-model="form.insurance_provider_id" class="input">
            <option value="">Genérico (todos)</option>
            <option v-for="i in insurances" :key="i.id" :value="i.id">{{ i.name }}</option>
          </select></label
        >
        <div class="flex items-end">
          <button class="btn-primary">{{ editing ? 'Salvar' : 'Criar modelo' }}</button>
        </div>
      </form>
      <section v-if="editing" class="panel">
        <h2 class="section-title">Campos do modelo</h2>
        <p class="mb-3 text-sm text-gray-500">
          <b>X:</b> distância da esquerda. <b>Y:</b> distância do topo. As medidas são pontos do PDF
          original.
        </p>
        <DataList
          v-model:selected="selectedField"
          :items="fieldRows"
          :columns="fieldColumns"
          :actions="fieldActions"
          embedded
          row-key="_rowKey"
          selection-key="field_key"
        >
          <template #cell-field_key="{ item }"
            ><select v-model="item.field_key" class="input min-w-48">
              <optgroup
                v-for="category in keyCategories"
                :key="category.label"
                :label="category.label"
              >
                <option v-for="key in category.keys" :key="key">{{ key }}</option>
              </optgroup>
            </select></template
          >
          <template
            v-for="key in ['page', 'x', 'y', 'width', 'height', 'font_size']"
            :key="key"
            #[`cell-${key}`]="{ item }"
            ><input
              v-model.number="item[key]"
              class="input min-w-20"
              type="number"
              :min="key === 'page' ? 1 : undefined"
          /></template>
          <template #cell-alignment="{ item }"
            ><select v-model="item.alignment" class="input">
              <option value="LEFT">Esquerda</option>
              <option value="CENTER">Centro</option>
              <option value="RIGHT">Direita</option>
            </select></template
          >
          <template #cell-required="{ item }"
            ><input v-model="item.options.required" type="checkbox" aria-label="Campo obrigatório"
          /></template>
        </DataList></section
    ></ListDetailDialog>
    <input
      ref="pdfInput"
      type="file"
      class="hidden"
      accept="application/pdf"
      @change="selected && uploadTemplate($event, selected.id)"
    />
  </PageShell>
</template>
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { documentTypeLabels } from '@/utils/guideLabels'

const types = ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION', 'OTHER']
const keyCategories = [
  {
    label: 'Paciente',
    keys: [
      'PATIENT_NAME',
      'PATIENT_BIRTH_DATE',
      'PATIENT_CPF',
      'PATIENT_CARD_NUMBER',
      'PATIENT_CARD_EXPIRATION',
    ],
  },
  { label: 'Convênio', keys: ['INSURANCE_NAME', 'INSURANCE_ANS_REGISTRATION', 'INSURANCE_LOGO'] },
  {
    label: 'Médico solicitante',
    keys: [
      'DOCTOR_NAME',
      'DOCTOR_COUNCIL',
      'DOCTOR_COUNCIL_NUMBER',
      'DOCTOR_STATE',
      'DOCTOR_CBO',
      'DOCTOR_SIGNATURE',
    ],
  },
  {
    label: 'Fisioterapeuta',
    keys: [
      'PHYSIOTHERAPIST_NAME',
      'PHYSIOTHERAPIST_COUNCIL',
      'PHYSIOTHERAPIST_COUNCIL_NUMBER',
      'PHYSIOTHERAPIST_STATE',
      'PHYSIOTHERAPIST_CBO',
    ],
  },
  {
    label: 'Processo',
    keys: ['ASSESSMENT_DATE', 'EXPECTED_START_DATE', 'REQUESTED_SESSIONS', 'AUTHORIZED_SESSIONS'],
  },
  {
    label: 'Procedimentos (linhas 1–5)',
    keys: Array.from({ length: 5 }, (_, i) =>
      ['CODE', 'DESCRIPTION', 'REQUESTED_QUANTITY', 'AUTHORIZED_QUANTITY'].map(
        (column) => `PROCEDURE_${i + 1}_${column}`,
      ),
    ).flat(),
  },
]
const templates = ref<any[]>([]),
  insurances = ref<any[]>([]),
  editing = ref<number | null>(null),
  fields = ref<any[]>([])
const form = reactive<any>({ name: '', document_type: '', insurance_provider_id: '' })
async function load() {
  ;[templates.value, insurances.value] = await Promise.all([
    (await api.get('/document-templates')).data,
    (await api.get('/insurance-providers')).data,
  ])
}
async function saveTemplate() {
  const response = editing.value
    ? await api.put(`/document-templates/${editing.value}`, form)
    : await api.post('/document-templates', form)
  editing.value = response.data.id
  await load()
}
async function edit(item: any) {
  const detail = (await api.get(`/document-templates/${item.id}`)).data
  editing.value = item.id
  Object.assign(form, detail)
  fields.value = detail.fields.map((field: any) => ({
    ...field,
    options: typeof field.options === 'string' ? JSON.parse(field.options) : field.options || {},
  }))
}
function addField() {
  fields.value.push({
    field_key: 'PATIENT_NAME',
    page: 1,
    x: 0,
    y: 0,
    font_size: 10,
    alignment: 'LEFT',
    options: { required: false },
  })
}
async function saveFields() {
  const response = await api.put(`/document-templates/${editing.value}/fields`, {
    fields: fields.value,
  })
  editing.value = response.data.id
  fields.value = response.data.fields.map((field: any) => ({
    ...field,
    options: typeof field.options === 'string' ? JSON.parse(field.options) : field.options || {},
  }))
  await load()
}
async function uploadTemplate(event: Event, id: number) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const response = await api.post(`/document-templates/${id}/file`, file, {
    headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) },
  })
  editing.value = response.data.id
  await load()
}
async function toggle(item: any) {
  await api.put(`/document-templates/${item.id}`, { active: !item.active })
  await load()
}
const selectedField = ref<any>(null)
const fieldRows = computed(() =>
  fields.value.map((field, index) =>
    Object.assign(field, { _rowKey: field.id ? `saved-${field.id}` : `new-${index}` }),
  ),
)
const fieldColumns = [
  { key: '_rowKey', label: 'Linha', width: '64px', format: (_value: any, item: any) => fields.value.indexOf(item) + 1 },
  { key: 'field_key', label: 'Campo' },
  { key: 'page', label: 'Página' },
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'width', label: 'Largura' },
  { key: 'height', label: 'Altura' },
  { key: 'font_size', label: 'Fonte' },
  { key: 'alignment', label: 'Alinhamento' },
  { key: 'required', label: 'Obrigatório' },
]
const fieldActions = computed(() => [
  { icon: 'add', label: 'Adicionar campo', variant: 'primary' as const, onClick: addField },
  {
    icon: 'delete',
    label: 'Remover campo selecionado',
    variant: 'danger' as const,
    disabled: !selectedField.value,
    onClick: () => {
      const index = fields.value.indexOf(selectedField.value)
      if (index >= 0) fields.value.splice(index, 1)
      selectedField.value = null
    },
  },
  { icon: 'save', label: 'Salvar campos do modelo', onClick: saveFields },
])
const selected = ref<any>(null),
  search = ref(''),
  typeFilter = ref(''),
  editorOpen = ref(false),
  message = ref(''),
  pdfInput = ref<HTMLInputElement | null>(null),
  { canOperational } = useAuthUser()
const columns = [
  { key: 'name', label: 'Nome' },
  {
    key: 'document_type',
    label: 'Tipo',
    format: (v: string) => documentTypeLabels[v as keyof typeof documentTypeLabels] || v,
  },
  { key: 'insurance_name', label: 'Convênio', format: (v: string) => v || 'Genérico' },
  { key: 'version', label: 'Versão', format: (v: any) => 'v' + v },
  { key: 'template_file_path', label: 'PDF cadastrado', format: (v: any) => (v ? 'Sim' : 'Não') },
  { key: 'active', label: 'Status', format: (v: any) => (v ? 'Ativo' : 'Inativo') },
]
const filteredTemplates = computed(() =>
  templates.value.filter(
    (t) =>
      (!typeFilter.value || t.document_type === typeFilter.value) &&
      [t.name, t.insurance_name].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      ),
  ),
)
const toolbarActions = computed(() => [
  {
    icon: 'add',
    label: 'Novo modelo',
    variant: 'primary' as const,
    disabled: !canOperational('document_templates', 'canCreate'),
    onClick: () => {
      editing.value = null
      form.name = ''
      form.document_type = ''
      form.insurance_provider_id = ''
      fields.value = []
      editorOpen.value = true
    },
  },
  {
    icon: 'edit',
    label: 'Configurar modelo selecionado',
    disabled: !selected.value || !canOperational('document_templates', 'canEdit'),
    onClick: async () => {
      if (selected.value) {
        await edit(selected.value)
        editorOpen.value = true
      }
    },
  },
  {
    icon: 'upload',
    label: 'Enviar PDF para o modelo selecionado',
    disabled: !selected.value || !canOperational('document_templates', 'canEdit'),
    onClick: () => pdfInput.value?.click(),
  },
  {
    icon: 'toggle',
    label: selected.value?.active ? 'Desativar modelo' : 'Ativar modelo',
    disabled: !selected.value || !canOperational('document_templates', 'canEdit'),
    onClick: () => selected.value && toggle(selected.value),
  },
  { icon: 'refresh', label: 'Atualizar', onClick: load },
])
onMounted(load)
function clearListFilters() {
  search.value = ''
  typeFilter.value = ''
}
</script>
