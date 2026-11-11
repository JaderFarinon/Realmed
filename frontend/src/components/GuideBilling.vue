<template>
  <section class="panel">
    <h2 class="section-title">Faturamento por Guia</h2>
    <p class="mt-2 mb-4 text-sm text-gray-600">
      Finalize as etapas anteriores e complete os documentos obrigatórios para faturar.
      Fisioterapia e eletroestimulação também exigem a conclusão das sessões de cada ciclo.
      O faturamento não altera a liberação pelo convênio.
    </p>
    
    
    <DataList
      v-model:selected="selected"
      :items="filtered"
      :columns="columns"
      :actions="actions"
      :loading="busy"
      row-key="key"
      selection-key="label"
      embedded
    >
      <template #filters
        ><label
          >Pesquisar guia<input
            v-model="search"
            class="input"
            placeholder="Consulta, fisioterapia, eletroestimulação" /></label
      ></template>
      <template #cell-files="{ item }"
        ><span v-if="item.files.length">{{ item.files.map((f: any) => f.name).join(' · ') }}</span
        ><span v-else>Sem arquivo anexado</span></template
      >
    </DataList>
    <ListDetailDialog :open="formOpen" title="Atualizar faturamento da guia" @close="close">
      <form id="guide-billing-form" class="grid gap-4" :inert="!canEdit" @submit.prevent="save">
        <p>
          <b>{{ selected?.label }}</b> · Ciclo {{ selected?.guide_number }}
        </p>
        <label
          ><FieldLabel required>Situação</FieldLabel
          ><select v-model="status" class="input" required>
            <option value="PENDING">Pendente</option>
            <option value="BILLED" :disabled="!selected?.completion_ready || !applicable">
              Faturada
            </option>
          </select></label
        >
        <p v-if="!selected?.completion_ready" class="text-sm text-gray-600">
          {{
            selected?.blocking_reason || (selected?.document_type === 'CONSULTATION_GUIDE'
              ? 'A consulta aguarda concluir a avaliação.'
              : 'Esta guia aguarda a conclusão das sessões.')
          }}
        </p>
        <label
          >Observações<textarea v-model="notes" class="input" rows="3" maxlength="1000" />
        </label>
        
      </form>
      <template #footer
        ><button type="button" class="btn-secondary" :disabled="busy" @click="close">
          Cancelar</button
        ><button type="submit" form="guide-billing-form" class="btn-primary" :disabled="busy || !canEdit">
          {{ busy ? 'Salvando...' : 'Salvar faturamento' }}
        </button></template
      >
    </ListDetailDialog>
  </section>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { computed, ref, watch } from 'vue'
import api from '@/plugins/axios'
import FieldLabel from './FieldLabel.vue'
import DataList from './DataList.vue'
import ListDetailDialog from './ListDetailDialog.vue'
const props = defineProps<{ processId: number; active: boolean; canEdit: boolean }>()
const emit = defineEmits<{ updated: [result: any] }>()
const items = ref<any[]>([]),
  selected = ref<any>(null),
  search = ref(''),
  busy = ref(false),
  error = ref(''),
  message = ref(''),
  formError = ref(''),
  formOpen = ref(false),
  status = ref('PENDING'),
  applicable = ref(true),
  notes = ref('')
const filtered = computed(() =>
  items.value.filter((i) =>
    i.applicable && [i.label, i.guide_number, i.status_label]
      .join(' ')
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
)
const columns = [
  { key: 'guide_number', label: 'Ciclo' },
  { key: 'label', label: 'Guia' },
  { key: 'status_label', label: 'Faturamento' },
  { key: 'files', label: 'Arquivos' },
  {
    key: 'updated_at',
    label: 'Atualizado em',
    format: (v: string) => (v ? new Date(v).toLocaleString('pt-BR') : '—'),
  },
]
const actions = computed(() => [
  {
    icon: 'edit',
    label: 'Atualizar faturamento da guia selecionada',
    disabled:
      !props.canEdit ||
      !selected.value ||
      (!selected.value.applicable && selected.value.document_type !== 'ELECTROSTIMULATION'),
    onClick: edit,
  },
  { icon: 'refresh', label: 'Atualizar guias para faturamento', onClick: load },
])
async function load() {
  busy.value = true
  error.value = ''
  try {
    const result = (await api.get(`/guide-processes/${props.processId}/billing`)).data
    if (!Array.isArray(result.items)) throw Error()
    items.value = result.items
    selected.value = null
    emit('updated', result)
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível carregar o faturamento das guias.'
  } finally {
    busy.value = false
  }
}
watch(
  () => props.active,
  (active) => {
    if (active && !formOpen.value) load()
  },
  { immediate: true },
)
function edit() {
  status.value = ['BILLED', 'DELIVERED'].includes(selected.value.status) ? 'BILLED' : 'PENDING'
  applicable.value = selected.value.applicable
  notes.value = selected.value.notes || ''
  formError.value = ''
  formOpen.value = true
}
function close() {
  if (!busy.value) formOpen.value = false
}
async function save() {
  if (!props.canEdit) return
  if (!selected.value || busy.value) return
  if (
    ['BILLED', 'DELIVERED'].includes(selected.value.status) &&
    status.value === 'PENDING' &&
    !window.confirm('Reabrir o faturamento desta guia? Ela voltará à fila quando estiver apta.')
  )
    return
  busy.value = true
  formError.value = ''
  try {
    const result = (
      await api.patch(
        `/guide-processes/${selected.value.guide_process_id}/billing/${selected.value.document_type}`,
        {
          status: status.value,
          revision: selected.value.revision,
          notes: notes.value,
          ...(selected.value.document_type === 'ELECTROSTIMULATION'
            ? { applicable: applicable.value }
            : {}),
        },
      )
    ).data
    items.value = result.items
    formOpen.value = false
    selected.value = null
    message.value = 'Faturamento da guia atualizado.'
    emit('updated', result)
  } catch (e: any) {
    formError.value = e.response?.data?.error || 'Não foi possível salvar. Tente novamente.'
  } finally {
    busy.value = false
  }
}
defineExpose({ refresh: async () => { if (!formOpen.value && !busy.value) await load() } })

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => unwrapNoticeValue(message), () => 'success')
useFeedback(() => unwrapNoticeValue(formError), () => 'error')
</script>
