<template>
  <section>
    <p class="mb-3 text-sm">
      Selecione a guia para registrar a decisão do convênio. Consulta, fisioterapia e
      eletroestimulação podem ter liberações diferentes. Para alterar várias juntas, marque as guias e use
      Alterar status das guias selecionadas na barra de ações.
    </p>
    <p v-if="partial" class="mb-3 rounded-lg bg-amber-50 p-3 text-amber-800">
      Liberação parcial: parte das guias está liberada. Confira a decisão de cada guia antes de
      executar ou faturar.
    </p>
    
    
    <label class="mb-3 flex items-center gap-2"
      ><input
        type="checkbox"
        :checked="allChecked"
        :disabled="!eligibleBulk.length || busy || closed || !canEdit"
        @change="
          checkedTypes = ($event.target as HTMLInputElement).checked
            ? eligibleBulk.map((i) => i.document_type)
            : []
        "
      />Selecionar todas as guias disponíveis</label
    >
    <DataList
      v-model:selected="selectedGuide"
      :items="visibleItems"
      :columns="columns"
      :actions="actions"
      :loading="busy"
      row-key="document_type"
      selection-key="label"
      embedded
    >
      <template #cell-select="{ item }"
        ><input
          v-model="checkedTypes"
          type="checkbox"
          :value="item.document_type"
          :aria-label="'Selecionar ' + item.label + ' para alterar status'"
          :disabled="!canBulk(item) || busy || closed || !canEdit"
          @click.stop
          :title="!canEdit ? 'Clique em Editar aba para selecionar guias.' : closed ? 'Reabra a etapa para alterar as guias.' : !canBulk(item) ? 'Esta guia não possui mudança de status disponível.' : 'Selecionar guia para alterar status'"
          @keydown.stop
      /></template>
      <template #cell-generated_document="{ item }">
        <div v-if="latestDocuments[item.document_type]" class="flex items-center gap-2" @click.stop @keydown.stop>
          <div class="min-w-0">
            <p class="max-w-xs break-words">{{ latestDocuments[item.document_type].original_name }}</p>
            <p class="text-xs text-gray-500">{{ latestDocuments[item.document_type].document_role === 'RECEIVED' ? 'Anexo recebido' : 'Versão ' + (latestDocuments[item.document_type].document_version || 1) }}</p>
          </div>
          <TableActionToolbar :label="'Documento de ' + item.label" :actions="[
            { icon: 'eye', label: 'Visualizar documento de ' + item.label, disabled: viewingDocument !== null, onClick: () => viewDocument(latestDocuments[item.document_type]) },
          ]" />
        </div>
        <span v-else class="text-gray-500">Nenhum documento disponível</span>
      </template>
      <template #actions
        ><span v-if="checkedTypes.length" class="text-sm"
          >{{ checkedTypes.length }} guias para liberação conjunta</span
        ></template
      >
    </DataList>
    
    <ListDetailDialog :open="!!previewUrl" :title="previewName" @close="closePreview">
      <iframe v-if="previewUrl" :src="previewUrl" :title="previewName" class="h-[65vh] w-full rounded-lg border" />
    </ListDetailDialog>
    <div v-if="selectedGuide || checkedTypes.length > 1" class="mt-4">
      <h3 class="mb-2 font-semibold">{{ checkedTypes.length > 1 ? checkedTypes.length + ' guias selecionadas' : selectedGuide?.label }}</h3>
      <div
        class="flex gap-1 overflow-x-auto pb-2"
        role="group"
        :aria-label="'Status de liberação — ' + (checkedTypes.length > 1 ? 'Guias selecionadas' : selectedGuide?.label)"
      >
        <button
          v-for="item in statuses"
          :key="item.key"
          type="button"
          class="shrink-0 rounded-lg border px-3 py-3"
          :class="
            (checkedTypes.length > 1 ? checkedGuides.every((guide) => guide.status === item.key) : selectedGuide?.status === item.key)
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-gray-200'
          "
          :aria-pressed="(checkedTypes.length > 1 ? checkedGuides.every((guide) => guide.status === item.key) : selectedGuide?.status === item.key)"
          :disabled="!canEdit || closed || busy || !available(item.key)"
          :title="item.description"
          @click="checkedTypes.length > 1 ? chooseBulk(item.key) : choose(item.key)"
        >
          {{ item.label }}
        </button>
      </div>
      <p class="text-sm text-gray-500">
        {{
          selectedGuide?.decision_source === 'LEGACY' ||
          selectedGuide?.decision_source === 'LEGACY_SNAPSHOT'
            ? 'Decisão conjunta anterior preservada. A próxima alteração será exclusiva desta guia.'
            : ''
        }}
      </p>
      <p v-if="selectedGuide?.notes" class="mt-2 text-sm">{{ selectedGuide.notes }}</p>
    </div>
    <ListDetailDialog
      :open="formOpen"
      :title="bulkMode ? 'Alterar status das guias' : 'Liberação — ' + (selectedGuide?.label || 'Guia')"
      @close="close"
    >
      <form id="guide-authorization-form" class="grid gap-4" @submit.prevent="save">
        <label v-if="bulkMode">Novo status<select v-model="target" aria-label="Novo status" class="input" required><option v-for="status in bulkStatuses" :key="status.key" :value="status.key">{{ status.label }}</option></select></label>
        <p>
          <b>{{ statuses.find((s) => s.key === target)?.label }}</b> ·
          {{ bulkMode ? bulkGuides.map((i) => i.label).join(' e ') : selectedGuide?.label }}
        </p>
        <p v-if="bulkMode">
          A mudança será aplicada a todas as guias selecionadas. Confira os dados antes de confirmar.
        </p>
        <template v-if="finals.includes(target)">
          <label
            >Número da autorização<input
              :value="form.authorization_number"
              @input="
                form.authorization_number = ($event.target as HTMLInputElement).value =
                  ($event.target as HTMLInputElement).value.replace(/[^0-9]/g, '')
              "
              class="input"
              inputmode="numeric"
              maxlength="100"
          /></label>
          <label
            >Data da autorização<MaskedDateInput
              v-model="form.authorization_date"
              :aria-invalid="!!dateError"
          /></label>
          <p v-if="dateError" role="alert" class="text-error-700">{{ dateError }}</p>
          <label>Validade<MaskedDateInput v-model="form.expiration_date" /></label>
          <label v-if="!bulkMode && target !== 'DENIED'"
            ><FieldLabel :required="target === 'AUTHORIZED'">Quantidade autorizada</FieldLabel
            ><input
              v-model.number="form.authorized_sessions"
              class="input"
              type="number"
              :min="target === 'AUTHORIZED' ? 1 : 0"
              max="100000"
              :required="target === 'AUTHORIZED'"
          /></label>
        </template>
        <template v-if="bulkMode && finals.includes(target) && target !== 'DENIED'"
          ><label v-for="item in bulkGuides" :key="item.document_type"
            ><FieldLabel :required="target === 'AUTHORIZED'">{{ 'Quantidade autorizada — ' + item.label }}</FieldLabel
            ><input
              v-model.number="bulkQuantities[item.document_type]"
              class="input"
              type="number"
              :min="target === 'AUTHORIZED' ? 1 : 0"
              max="100000"
              :required="target === 'AUTHORIZED'" /></label
        ></template>
        <label
          ><FieldLabel :required="reasonRequired">Motivo / Observação</FieldLabel
          ><textarea
            v-model="form.notes"
            class="input"
            rows="3"
            maxlength="5000"
            :required="reasonRequired"
          />
        </label>
        <p
          v-if="['READY', 'IN_PROGRESS'].includes(target) && selectedGuide?.status === 'PENDING'"
          class="text-sm text-amber-700"
        >
          As pendências desta guia serão marcadas como resolvidas.
        </p>
        
      </form>
      <template #footer
        ><button type="button" class="btn-secondary" :disabled="busy" @click="close">
          Cancelar</button
        ><button
          type="submit"
          form="guide-authorization-form"
          class="btn-primary"
          :disabled="busy || !canEdit || closed"
        >
          Confirmar alteração
        </button></template
      >
    </ListDetailDialog>
  </section>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { computed, reactive, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import api from '@/plugins/axios'
import DataList from './DataList.vue'
import TableActionToolbar from './TableActionToolbar.vue'
import ListDetailDialog from './ListDetailDialog.vue'
import FieldLabel from './FieldLabel.vue'
import MaskedDateInput from './MaskedDateInput.vue'
const props = defineProps<{ process: any; canEdit: boolean; closed: boolean }>()
const emit = defineEmits(['updated'])
const latestDocuments = computed<Record<string, any>>(() => {
  const generated: Record<string, any> = {}, received: Record<string, any> = {}
  const newer = (a: any, b: any) => (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0) || Number(a.id) - Number(b.id)
  for (const doc of props.process.documents || []) {
    if (doc.deleted_at || !['GENERATED', 'RECEIVED'].includes(doc.document_role)) continue
    const group = doc.document_role === 'GENERATED' ? generated : received
    const previous = group[doc.document_type]
    const comparison = previous && doc.document_role === 'GENERATED'
      ? Number(doc.document_version || 0) - Number(previous.document_version || 0) || newer(doc, previous)
      : previous ? newer(doc, previous) : 1
    if (!previous || comparison > 0) group[doc.document_type] = doc
  }
  const result: Record<string, any> = { ...generated }
  for (const [type, doc] of Object.entries(received)) if (!result[type] || newer(doc, result[type]) > 0) result[type] = doc
  return result
})
const previewUrl = ref(''), previewName = ref(''), documentError = ref(''), viewingDocument = ref<number | null>(null)
let previewRequest = 0
function closePreview() {
  previewRequest++
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''; viewingDocument.value = null
}
onBeforeUnmount(closePreview)
async function viewDocument(document: any) {
  if (!document || viewingDocument.value !== null) return
  const request = ++previewRequest
  viewingDocument.value = document.id; documentError.value = ''
  try {
    const response = await api.get(`/documents/${document.id}/download`, { responseType: 'blob' })
    if (request !== previewRequest) return
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewName.value = document.original_name
    previewUrl.value = URL.createObjectURL(response.data)
  } catch {
    if (request === previewRequest) documentError.value = 'Não foi possível abrir a guia. Tente novamente.'
  } finally {
    if (request === previewRequest) viewingDocument.value = null
  }
}
const items = ref<any[]>([]),
  selectedGuide = ref<any>(null),
  partial = ref(false),
  busy = ref(false),
  error = ref(''),
  message = ref(''),
  formError = ref(''),
  formOpen = ref(false),
  target = ref(''),
  applicable = ref(true)
const checkedTypes = ref<string[]>([]),
  bulkMode = ref(false),
  bulkGuides = ref<any[]>([])
const visibleItems = computed(() => items.value.filter(i => i.applicable))
const bulkQuantities = reactive<Record<string, number | null>>({})
const canBulk = (i: any) =>
  i.applicable && Boolean(transitions[i.status]?.length)
const checkedGuides = computed(() => items.value.filter(i => checkedTypes.value.includes(i.document_type)))
const allows = (i: any, status: string) => i.applicable && ((i.status === status && finals.includes(status)) || transitions[i.status]?.includes(status))
const bulkStatuses = computed(() => statuses.filter(s => bulkGuides.value.length > 1 && bulkGuides.value.every(i => allows(i, s.key))))
const eligibleBulk = computed(() => items.value.filter(canBulk))
const allChecked = computed(
  () =>
    eligibleBulk.value.length > 0 &&
    eligibleBulk.value.every((i) => checkedTypes.value.includes(i.document_type)),
)
const form = reactive<any>({})
const dateError = computed(() => {
  if (!finals.includes(target.value)) return ''
  const min = bulkMode.value
    ? bulkGuides.value
        .map((i) => i.requested_at || props.process.authorization_min_date || '')
        .sort()
        .reverse()[0]
    : selectedGuide.value?.requested_at || props.process.authorization_min_date || ''
  if (form.authorization_date && min && form.authorization_date < min)
    return 'Data da autorização não pode anteceder o processo ou o pedido de liberação.'
  if (
    form.expiration_date &&
    form.authorization_date &&
    form.expiration_date < form.authorization_date
  )
    return 'Validade não pode anteceder a autorização.'
  return ''
})
const finals = ['AUTHORIZED', 'DENIED', 'SESSION_TOKEN', 'NOT_REQUIRED']
const statuses = [
  {
    key: 'NOT_READY',
    label: 'Em preparação',
    tone: 'neutral',
    description:
      'Dados ou guias ainda pendentes. Esta situação é definida automaticamente pela preparação.',
  },
  {
    key: 'READY',
    label: 'Pendente',
    tone: 'warning',
    description:
      'Aguardando encaminhamento para liberação. Retornar para esta situação não desfaz o histórico.',
  },
  {
    key: 'IN_PROGRESS',
    label: 'Encaminhado ao convênio',
    tone: 'info',
    description: 'Solicitação enviada ao convênio, aguardando resposta.',
  },
  {
    key: 'PENDING',
    label: 'Pendência do convênio',
    tone: 'warning',
    description: 'O convênio pediu ajustes ou informações. Descreva o que precisa ser resolvido.',
  },
  {
    key: 'AUTHORIZED',
    label: 'Liberado',
    tone: 'success',
    description: 'O convênio autorizou o tratamento. Confira as sessões e os dados da autorização.',
  },
  {
    key: 'DENIED',
    label: 'Negado',
    tone: 'danger',
    description: 'O convênio negou a solicitação. Registre o motivo informado.',
  },
  {
    key: 'IN_APPEAL',
    label: 'Em recurso',
    tone: 'warning',
    description:
      'Contestação da negativa de autorização enviada ao convênio. Não libera o tratamento.',
  },
  {
    key: 'SESSION_TOKEN',
    label: 'Token por sessão',
    tone: 'success',
    description: 'Liberação por sessão ou token, conforme a regra do convênio.',
  },
  {
    key: 'NOT_REQUIRED',
    label: 'Dispensa liberação',
    tone: 'success',
    description: 'O convênio dispensa autorização prévia para este tratamento.',
  },
]
const transitions: Record<string, string[]> = {
  NOT_READY: [],
  READY: ['IN_PROGRESS'],
  IN_PROGRESS: ['READY', 'PENDING', ...finals],
  PENDING: ['READY', 'IN_PROGRESS'],
  DENIED: ['READY', 'IN_APPEAL', 'IN_PROGRESS', ...finals],
  IN_APPEAL: ['READY', 'IN_PROGRESS', ...finals],
  AUTHORIZED: ['READY', 'IN_PROGRESS', ...finals],
  SESSION_TOKEN: ['READY', 'IN_PROGRESS', ...finals],
  NOT_REQUIRED: ['READY', 'IN_PROGRESS', ...finals],
}
const date = (v: string) => (v ? v.split('-').reverse().join('/') : '—')
const columns = [
  { key: 'select', label: 'Selecionar', width: '80px' },
  { key: 'label', label: 'Guia' },
  { key: 'generated_document', label: 'Documento da guia' },
  {
    key: 'status',
    label: 'Liberação',
    format: (v: string, item: any) =>
      !item.applicable ? 'Não aplicável' : statuses.find((s) => s.key === v)?.label || v,
  },
  { key: 'authorized_sessions', label: 'Quantidade autorizada' },
  { key: 'authorization_number', label: 'Autorização' },
  { key: 'authorization_date', label: 'Data', format: date },
  { key: 'expiration_date', label: 'Validade', format: date },
]
const actions = computed(() => [
  {
    icon: 'check',
    label: 'Alterar status das guias selecionadas',
    disabled: !props.canEdit || props.closed || checkedTypes.value.length < 2,
    onClick: chooseBulk,
  },
  {
    icon: 'edit',
    label: 'Editar liberação da guia selecionada',
    disabled:
      !props.canEdit ||
      props.closed ||
      !selectedGuide.value ||
      (!selectedGuide.value.applicable &&
        selectedGuide.value.document_type !== 'ELECTROSTIMULATION'),
    onClick: () => choose(selectedGuide.value.status, true),
  },
  { icon: 'refresh', label: 'Atualizar liberações das guias', onClick: load },
])
const reasonRequired = computed(
  () =>
    (bulkMode.value && bulkGuides.value.some((i) => ['READY','PENDING','DENIED','IN_APPEAL'].includes(target.value) || (finals.includes(i.status) && i.status !== target.value) || (i.status !== 'READY' && target.value === 'IN_PROGRESS'))) ||
    (!bulkMode.value &&
      (['READY', 'PENDING', 'DENIED', 'IN_APPEAL'].includes(target.value) ||
        (finals.includes(selectedGuide.value?.status) &&
          selectedGuide.value?.status !== target.value) ||
        (target.value === 'IN_PROGRESS' && selectedGuide.value?.status !== 'READY'))),
)
function available(status: string) {
  if (checkedTypes.value.length > 1) return checkedGuides.value.every(i => allows(i, status))
  const current = selectedGuide.value?.status
  return (
    selectedGuide.value?.applicable &&
    (current === status ? finals.includes(status) : transitions[current]?.includes(status))
  )
}
async function load() {
  busy.value = true
  error.value = ''
  try {
    const result = (await api.get(`/guide-processes/${props.process.id}/authorization-guides`)).data
    if (!Array.isArray(result.items)) throw Error()
    const type = selectedGuide.value?.document_type
    items.value = result.items
    checkedTypes.value = checkedTypes.value.filter((t) =>
      items.value.some((i) => i.document_type === t && canBulk(i)),
    )
    partial.value = result.partial
    selectedGuide.value = visibleItems.value.find((i) => i.document_type === type) || null
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível carregar as liberações.'
  } finally {
    busy.value = false
  }
}
onMounted(load)
watch(
  () => props.process,
  () => {
    if (!busy.value && !formOpen.value) load()
  },
)
function choose(status: string, edit = false) {
  if (
    !selectedGuide.value ||
    !props.canEdit ||
    props.closed ||
    busy.value ||
    (!edit && !available(status))
  )
    return
  bulkMode.value = false
  target.value = status
  applicable.value = selectedGuide.value.applicable
  Object.assign(form, {
    authorization_number: selectedGuide.value.authorization_number || '',
    authorization_date: selectedGuide.value.authorization_date || '',
    expiration_date: selectedGuide.value.expiration_date || '',
    authorized_sessions:
      selectedGuide.value.authorized_sessions ??
      (selectedGuide.value.document_type === 'CONSULTATION_GUIDE' ? 1 : null),
    notes: status === selectedGuide.value.status ? selectedGuide.value.notes || '' : '',
  })
  formError.value = ''
  formOpen.value = true
}
function chooseBulk(status?: string) {
  if (!props.canEdit || props.closed || busy.value) return
  const chosen = items.value.filter(
    (i) => checkedTypes.value.includes(i.document_type) && canBulk(i),
  )
  if (chosen.length < 2) return
  bulkMode.value = true
  bulkGuides.value = chosen.map((i) => ({ ...i }))
  const valid = statuses.filter(s => chosen.every(i => allows(i, s.key)))
  if (!valid.length) { error.value = 'As guias selecionadas não possuem um status de destino em comum.'; return }
  target.value = status && valid.some(s => s.key === status) ? status : valid.some(s => s.key === 'AUTHORIZED') ? 'AUTHORIZED' : valid[0].key
  for (const item of chosen)
    bulkQuantities[item.document_type] =
      item.authorized_sessions ??
      (item.document_type === 'CONSULTATION_GUIDE' ? 1 : props.process.requested_sessions || null)
  const shared = (key: string) =>
    chosen.every((i) => i[key] === chosen[0][key]) ? chosen[0][key] || '' : ''
  Object.assign(form, {
    authorization_number: shared('authorization_number'),
    authorization_date: shared('authorization_date'),
    expiration_date: shared('expiration_date'),
    notes: '',
  })
  formError.value = ''
  formOpen.value = true
}
function close() {
  if (!busy.value) formOpen.value = false
}
async function save() {
  if (
    busy.value ||
    props.closed ||
    !props.canEdit ||
    (!bulkMode.value && !selectedGuide.value) ||
    dateError.value
  )
    return
  busy.value = true
  formError.value = ''
  try {
    const result = (
      await api.post(
        `/guide-processes/${props.process.id}/authorization/${bulkMode.value ? 'status-together' : 'status'}`,
        bulkMode.value
          ? {
              status: target.value,
              authorization_number: form.authorization_number,
              authorization_date: form.authorization_date,
              expiration_date: form.expiration_date,
              notes: form.notes,
              items: bulkGuides.value.map((i) => ({
                document_type: i.document_type,
                expected_status: i.status,
                revision: i.revision,
                authorized_sessions: bulkQuantities[i.document_type],
              })),
            }
          : {
              ...form,
              status: target.value,
              expected_status: selectedGuide.value.status,
              revision: selectedGuide.value.revision,
              document_type: selectedGuide.value.document_type,
              ...(selectedGuide.value.document_type === 'ELECTROSTIMULATION'
                ? { applicable: applicable.value }
                : {}),
            },
      )
    ).data
    const type = selectedGuide.value?.document_type
    items.value = result.items
    checkedTypes.value = checkedTypes.value.filter((t) =>
      items.value.some((i) => i.document_type === t && canBulk(i)),
    )
    partial.value = result.partial
    selectedGuide.value = visibleItems.value.find((i) => i.document_type === type) || null
    formOpen.value = false
    message.value = bulkMode.value
      ? 'Status das guias selecionadas atualizado.'
      : 'Liberação desta guia atualizada.'
    if (bulkMode.value) checkedTypes.value = []
    emit('updated')
  } catch (e: any) {
    formError.value = e.response?.data?.error || 'Não foi possível salvar. Confira os dados.'
  } finally {
    busy.value = false
  }
}

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => unwrapNoticeValue(message), () => 'success')
useFeedback(() => unwrapNoticeValue(documentError), () => 'error')
useFeedback(() => unwrapNoticeValue(formError), () => 'error')
</script>
