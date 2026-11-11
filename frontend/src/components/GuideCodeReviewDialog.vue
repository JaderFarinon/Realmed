<template>
  <ListDetailDialog
    :open="open"
    title="Conferir códigos da guia"
    wide
    @close="!busy && emit('close')"
  >
    <p class="mb-3 text-sm">
      {{ sourceDocumentId
        ? 'Confira os procedimentos lidos do original e informe as quantidades.'
        : 'Confira os procedimentos e as quantidades cadastrados no tratamento.' }}
      Os documentos existentes serão preservados e a nova guia terá seu próprio arquivo e versão.
    </p>
    <div v-if="sourceDocumentId" class="mb-4 flex flex-wrap items-end gap-3">
      <label
        >Página do original<input
          v-model.number="page"
          type="number"
          min="1"
          max="20"
          class="input"
      /></label>
      <button class="btn-secondary" :disabled="busy" @click="read">
        {{ busy ? 'Lendo…' : 'Ler página' }}
      </button>
      <button class="btn-secondary" :disabled="busy" @click="viewOriginal">
        Visualizar original
      </button>
    </div>
    
    <p v-if="busy" role="status">Aguarde…</p>
    <DataList :items="rows" :columns="columns" :selectable="false" embedded all-rows>
      <template #cell-selected="{ item }"
        ><input
          v-model="item.selected"
          type="checkbox"
          :disabled="busy || !!item.error"
          :aria-label="'Incluir ' + item.source_code"
      /></template>
      <template #cell-requested_quantity="{ item }"
        ><input
          v-model.number="item.requested_quantity"
          type="number"
          min="1"
          max="999"
          class="input w-24"
          :disabled="busy || !item.selected"
          :aria-label="'Quantidade de ' + item.source_code"
      /></template>
      <template #cell-mapping_reason="{ item }"
        ><span :class="item.error ? 'text-error-700' : ''">{{
          item.error || item.mapping_reason
        }}</span></template
      >
    </DataList>
    <div v-if="sourceDocumentId && reviewId" class="mt-4 flex flex-wrap items-end gap-3">
      <label class="min-w-0 flex-1"
        ><FieldLabel
          required
          reason="Obrigatório ao adicionar um procedimento manual à conferência."
          >Adicionar procedimento não reconhecido</FieldLabel
        ><select v-model="manualId" class="input w-full">
          <option value="">Selecionar procedimento cadastrado</option>
          <option v-for="item in catalog" :key="item.id" :value="item.id">
            {{ item.code }} — {{ item.description }}
          </option>
        </select></label
      >
      <button class="btn-secondary" :disabled="busy || !manualId" @click="addManual">
        Adicionar à conferência
      </button>
      <p class="w-full text-sm text-gray-600">
        O de/para será aplicado novamente no servidor aos procedimentos incluídos manualmente.
      </p>
    </div>
    <details v-if="text" class="mt-4">
      <summary>Texto lido — confira trechos não reconhecidos</summary>
      <pre class="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{{ text }}</pre>
    </details>
    <label class="my-4 block"
      ><input v-model="confirmed" type="checkbox" :disabled="busy" />
      <FieldLabel required reason="Confirme a conferência antes de gerar a guia."
        >Conferi os procedimentos, códigos e quantidades desta guia.</FieldLabel
      ></label
    >
    <div class="flex flex-wrap gap-3">
      <button class="btn-secondary" :disabled="busy || !ready" @click="submit(true)">
        Pré-visualizar guia
      </button>
      <button class="btn" :disabled="busy || !ready || !confirmed" @click="submit(false)">
        Gerar guia conferida
      </button>
      <button class="btn-secondary" :disabled="busy" @click="emit('close')">Cancelar</button>
    </div>
  </ListDetailDialog>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref, watch } from 'vue'
import api from '@/plugins/axios'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
const props = defineProps<{
  open: boolean
  processId: string | number
  templateId: string | number
  documentType: string
  unifiedDocumentTypes?: string[]
  sourceDocumentId?: number
}>()
const emit = defineEmits<{ close: []; generated: [] }>()
const rows = ref<any[]>([]),
  catalog = ref<any[]>([]),
  busy = ref(false),
  error = ref(''),
  page = ref(1),
  reviewId = ref(''),
  text = ref(''),
  confirmed = ref(false),
  manualId = ref('')
const allowed = computed(() =>
  (props.unifiedDocumentTypes || [props.documentType]).map(type => ({CONSULTATION_GUIDE:'CONSULTATION',PHYSIOTHERAPY_GUIDE:'PHYSIOTHERAPY',ELECTROSTIMULATION:'ELECTROSTIMULATION'} as Record<string,string>)[type]),
)
const columns = [
  { key: 'selected', label: 'Incluir' },
  { key: 'source_code', label: 'Origem' },
  { key: 'code', label: 'Código sugerido' },
  { key: 'description', label: 'Procedimento' },
  { key: 'requested_quantity', label: 'Quantidade', required: true },
  { key: 'mapping_reason', label: 'Regra aplicada' },
]
const ready = computed(
  () =>
    rows.value.some((row) => row.selected) &&
    (!props.sourceDocumentId || !!reviewId.value) &&
    rows.value
      .filter((row) => row.selected)
      .every(
        (row) =>
          Number.isInteger(row.requested_quantity) &&
          row.requested_quantity > 0 &&
          row.requested_quantity <= 999,
      ),
)
watch(
  () => props.open,
  async (value) => {
    if (!value) return
    rows.value = []
    reviewId.value = ''
    text.value = ''
    confirmed.value = false
    error.value = ''
    page.value = 1
    manualId.value = ''
    if (props.sourceDocumentId) await read()
    else {
      busy.value = true
      try {
        const response = await api.post(`/guide-processes/${props.processId}/code-review-options`, {
          document_type: props.documentType,
          unified_document_types: props.unifiedDocumentTypes,
        })
        rows.value = response.data
          .filter((row: any) => allowed.value.includes(row.type))
          .map((row: any) => ({ ...row, selected: true }))
        if (!rows.value.length)
          error.value = 'Adicione os procedimentos ao tratamento antes de gerar.'
      } catch (e: any) {
        await showError(e)
      } finally {
        busy.value = false
      }
    }
  },
)
watch(
  rows,
  () => {
    confirmed.value = false
  },
  { deep: true },
)
async function read() {
  busy.value = true
  error.value = ''
  reviewId.value = ''
  rows.value = []
  confirmed.value = false
  try {
    const response = await api.post(
      `/guide-processes/${props.processId}/documents/${props.sourceDocumentId}/read-codes`,
      { page: page.value },
      { timeout: 180000 },
    )
    reviewId.value = response.data.code_review_id
    text.value = response.data.text
    catalog.value = response.data.procedures.filter((row: any) => allowed.value.includes(row.type))
    rows.value = response.data.candidates
      .filter((row: any) => allowed.value.includes(row.source.type))
      .map((row: any) => ({
        ...row.source,
        ...row.proposed,
        id: 'candidate-' + row.candidate_id,
        candidate_id: row.candidate_id,
        source_code: row.source.code,
        selected: !row.error,
        error: row.error,
        requested_quantity: null,
      }))
    if (!rows.value.length)
      error.value =
        'Nenhum código reconhecido. Confira o texto e acrescente os procedimentos cadastrados manualmente.'
  } catch (e: any) {
    await showError(e)
  } finally {
    busy.value = false
  }
}
function addManual() {
  const item = catalog.value.find((row) => Number(row.id) === Number(manualId.value))
  if (!item) return
  if (rows.value.some((row) => row.source_code === (item.source_code || item.code))) {
    error.value = 'Este procedimento já está na conferência.'
    return
  }
  rows.value.push({
    ...item,
    id: 'manual-' + item.id,
    procedure_id: item.id,
    source_code: item.source_code || item.code,
    selected: !item.error,
    requested_quantity: null,
  })
  manualId.value = ''
}
async function viewOriginal() {
  try {
    const response = await api.get(`/documents/${props.sourceDocumentId}/download`, {
      responseType: 'blob',
    })
    openPdf(response.data)
  } catch (error) {
    await showError(error)
  }
}
function openPdf(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
async function submit(preview: boolean) {
  busy.value = true
  error.value = ''
  try {
    const payload: any = { template_id: props.templateId, codes_confirmed: confirmed.value, unified_document_types: props.unifiedDocumentTypes }
    if (props.sourceDocumentId) {
      payload.code_review_id = reviewId.value
      payload.review_items = rows.value
        .filter((row) => row.selected)
        .map((row) => ({
          candidate_id: row.candidate_id,
          procedure_id: row.candidate_id ? undefined : row.procedure_id,
          requested_quantity: row.requested_quantity,
        }))
    } else {
      payload.code_selection = rows.value
        .filter((row) => row.selected)
        .map((row) => ({
          procedure_id: row.procedure_id,
          requested_quantity: row.requested_quantity,
        }))
      payload.code_selection_snapshot = JSON.stringify(
        rows.value
          .filter((row) => row.selected)
          .map((row) => ({
            code: row.code,
            description: row.description,
            table: row.table_name,
            rule: row.mapping_rule_id,
            quantity: row.requested_quantity,
          })),
      )
    }
    const response = await api.post(
      `/guide-processes/${props.processId}/documents/${preview ? 'preview' : 'generate'}`,
      payload,
      preview ? { responseType: 'blob' } : {},
    )
    if (preview) openPdf(response.data)
    else {
      emit('generated')
      emit('close')
    }
  } catch (e: any) {
    await showError(e)
  } finally {
    busy.value = false
  }
}
async function showError(e: any) {
  let data = e.response?.data
  if (data instanceof Blob)
    try {
      data = JSON.parse(await data.text())
    } catch {
      data = null
    }
  error.value = data?.missing?.length
    ? `Não foi possível gerar a guia. Faltam: ${data.missing.join(', ')}.`
    : data?.error || 'Não foi possível conferir a guia.'
}

useFeedback(() => unwrapNoticeValue(error), () => 'error')
</script>
