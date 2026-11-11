<template>
  <section :class="billingEntry ? 'treatment-continuation-action' : 'mb-5 space-y-3'" aria-label="Continuidade das guias">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p v-if="!billingEntry">
        <b
          >Tratamento #{{ process.treatment_root_id || process.id }} · Guia
          {{ process.guide_number || 1 }}</b
        >
      </p>
      <button type="button" :class="billingEntry ? 'btn-primary' : 'btn-secondary'" :disabled="!canAdd || busy" :title="addTitle" @click="openForm">
        {{ billingEntry ? 'Gerar Continuação' : 'Adicionar Guias' }}
      </button>
    </div>
    <p v-if="!billingEntry && process.continuation_of_id" class="rounded-lg bg-blue-50 p-3 text-sm">
      Guia de continuidade. Não é necessária uma nova avaliação; a avaliação anterior é mantida como
      referência.
    </p>
    <p v-if="!billingEntry && createdId" class="text-success-700" role="status">
      Continuidade criada.
      <button class="link" @click="emit('open-guide', createdId)">Abrir nova guia</button>
    </p>
    <DataList
      v-if="!billingEntry && (process.related_guides || []).length > 1"
      v-model:selected="selected"
      :items="process.related_guides"
      :columns="columns"
      :actions="actions"
      selection-key="guide_number"
      embedded
    />
    <ListDetailDialog
      :open="open"
      :title="billingEntry ? 'Gerar Continuação' : 'Adicionar Guias — Continuidade'"
      @close="!busy && (open = false)"
    >
      <form id="guide-continuity-form" class="grid gap-4" @submit.prevent="create">
        <p>
          Será criado um novo ciclo do tratamento de {{ process.patient_name }}, com a quantidade
          de sessões informada abaixo e a avaliação inicial em somente leitura. A guia atual será
          encerrada, preservando seus documentos, sessões e faturamento.
        </p>
        <label
          ><FieldLabel required>Sessões solicitadas na nova guia</FieldLabel
          ><input
            v-model.number="quantity"
            type="number"
            class="input"
            min="1"
            max="100000"
            step="1"
            required
            :disabled="busy"
        /></label>
        <label
          ><FieldLabel :required="unfinished">{{
            unfinished ? 'Motivo do encerramento antecipado' : 'Observação'
          }}</FieldLabel
          ><textarea
            v-model="notes"
            class="input min-h-24"
            maxlength="2000"
            :required="unfinished"
            :disabled="busy"
          />
        </label>
        <label class="flex items-start gap-2"
          ><input v-model="confirmed" type="checkbox" required :disabled="busy" /><FieldLabel
            required
            >Confirmo o encerramento da guia atual e a continuidade em sequência do tratamento,
            sem nova avaliação.</FieldLabel
          ></label
        >
        <p class="text-sm text-gray-500">
          Depois, confira a Recepção e a Central de Guias do novo ciclo. Os três procedimentos e
          as guias de consulta, fisioterapia e eletroestimulação continuam obrigatórios.
        </p>
        
      </form>
      <template #footer
        ><button class="btn-secondary" :disabled="busy" @click="open = false">Cancelar</button
        ><button
          class="btn-primary"
          type="submit"
          form="guide-continuity-form"
          :disabled="busy || !canAdd || !confirmed"
        >
          {{ busy ? 'Gerando…' : billingEntry ? 'Gerar Continuação' : 'Adicionar Guias' }}
        </button></template
      >
    </ListDetailDialog>
  </section>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { notify, useFeedback } from '@/composables/useNotifications'
import { computed, ref } from 'vue'
import api from '@/plugins/axios'
import DataList from './DataList.vue'
import ListDetailDialog from './ListDetailDialog.vue'
import FieldLabel from './FieldLabel.vue'
import { authorizationStatusLabels, billingStatusLabels } from '@/utils/guideLabels'
const props = defineProps<{ process: any; canEdit: boolean; billingEntry?: boolean }>()
const emit = defineEmits<{ 'open-guide': [id: number]; updated: [] }>()
const createdId = ref<number>(0)
const open = ref(false),
  busy = ref(false),
  quantity = ref<number | ''>(''),
  notes = ref(''),
  confirmed = ref(false),
  error = ref(''),
  selected = ref<any>(null)
const nextExists = computed(() =>
  (props.process.related_guides || []).some((p: any) => p.continuation_of_id === props.process.id),
)
const eligible = computed(
  () =>
    ['AUTHORIZED', 'SESSION_TOKEN', 'NOT_REQUIRED'].includes(props.process.authorization_status) ||
    props.process.treatment_status === 'COMPLETED' ||
    ['DELIVERED', 'BILLED'].includes(props.process.billing_status),
)
const canAdd = computed(
  () => props.canEdit && eligible.value && (!props.billingEntry || Boolean(props.process.billing_due)) && !nextExists.value && !createdId.value,
)
const unfinished = computed(
  () =>
    props.process.treatment_status !== 'COMPLETED' &&
    !['DELIVERED', 'BILLED'].includes(props.process.billing_status) &&
    !(
      Number(props.process.authorized_sessions) > 0 &&
      Number(props.process.performed_sessions) >= Number(props.process.authorized_sessions)
    ),
)
const addTitle = computed(() =>
  !props.canEdit
    ? 'Sem permissão para adicionar continuidade.'
    : nextExists.value
      ? 'A continuidade já foi criada. Abra a guia seguinte.'
      : !eligible.value
        ? 'A guia atual precisa estar liberada ou concluída.'
        : 'Adicionar uma nova guia de continuidade, sem refazer a avaliação.',
)
const columns = [
  { key: 'guide_number', label: 'Guia', format: (v: any) => `Guia ${v || 1}` },
  {
    key: 'authorization_status',
    label: 'Liberação',
    format: (v: string) =>
      authorizationStatusLabels[v as keyof typeof authorizationStatusLabels] || v,
  },
  { key: 'requested_sessions', label: 'Solicitadas' },
  { key: 'authorized_sessions', label: 'Autorizadas' },
  { key: 'performed_sessions', label: 'Realizadas' },
  {
    key: 'billing_status',
    label: 'Faturamento',
    format: (v: string) => billingStatusLabels[v as keyof typeof billingStatusLabels] || v,
  },
]
const actions = computed(() => [
  {
    icon: 'open',
    label: 'Abrir guia selecionada',
    disabled: !selected.value || selected.value.id === props.process.id,
    onClick: () => emit('open-guide', selected.value.id),
  },
])
function openForm() {
  if (!canAdd.value || busy.value) return
  quantity.value = ''
  notes.value = ''
  confirmed.value = false
  error.value = ''
  open.value = true
}
async function create() {
  if (!canAdd.value || busy.value || !confirmed.value) return
  busy.value = true
  error.value = ''
  try {
    const response = await api.post(`/guide-processes/${props.process.id}/continuities`, {
      requested_sessions: quantity.value,
      notes: notes.value,
      confirm_end_current: confirmed.value,
      ...(props.billingEntry ? { require_billing: true } : {}),
    })
    open.value = false
    createdId.value = response.data.id
    notify('Continuação criada. A avaliação inicial foi mantida para consulta.', 'success')
    emit('open-guide', response.data.id)
  } catch (e: any) {
    error.value =
      e.response?.data?.error || 'Não foi possível criar a continuidade. Tente novamente.'
  } finally {
    busy.value = false
  }
}

useFeedback(() => unwrapNoticeValue(error), () => 'error')
</script>
