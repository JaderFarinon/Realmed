<template>
  <section
    v-show="!activeStage || activeStage === 'reception'"
    :id="activeStage ? 'treatment-tabpanel-reception' : undefined"
    :role="activeStage ? 'tabpanel' : undefined"
    :aria-labelledby="activeStage ? 'treatment-tab-reception' : undefined"
    :tabindex="activeStage ? 0 : undefined"
    class="panel treatment-preparation"
    :class="{ 'treatment-stage-complete': receptionClosed && !activeStage }"
    data-treatment-stage="reception"
  >
    <div class="treatment-card-header">
      <div class="treatment-card-heading">
        <h2>Dados da recepção</h2>
        <p>{{ process.patient_name }} · Avaliação: {{ date(process.assessment_date) }}</p>
      </div>
      <TreatmentCardToggle
        v-if="!activeStage"
        :open="receptionOpen"
        label="dados da recepção"
        :controls="'treatment-' + process.id + '-reception-body'"
        @toggle="toggleReception"
      />
    </div>
    <div v-if="activeStage || receptionOpen" :id="'treatment-' + process.id + '-reception-body'">
      <form class="mt-4" @submit.prevent="saveReception">
        <fieldset class="grid gap-4" :disabled="receptionClosed || !canEdit || busy">
          <p>
            Paciente: <b>{{ process.patient_name }}</b
            >. Dados cadastrais podem ser consultados em
            <RouterLink :to="'/pacientes/' + process.patient_id" class="link"
              >Ver paciente</RouterLink
            >.
          </p>
          <label class="max-w-sm"
            >Data da avaliação<MaskedDateInput
              v-model="assessmentDate"
              :disabled="receptionClosed || !canEdit || busy"
          /></label>
          <button type="submit" class="sr-only">Salvar dados da recepção</button>
        </fieldset>
      </form>
      
      <div v-if="canEdit || (!receptionClosed && canFinalizeReception)" class="treatment-stage-footer">
        <TreatmentStageActions
          :process="process"
          stage="reception"
          title="Dados da recepção"
          :can-edit="canEdit"
          :can-finalize="canFinalizeReception"
          :disabled="busy"
          :save-draft-action="saveReception"
          :before-finalize="finalizeReception"
          @updated="stageChanged"
        />
      </div>
    </div>
  </section>
  <section
    v-show="!activeStage || activeStage === 'central'"
    :id="activeStage ? 'treatment-tabpanel-central' : undefined"
    :role="activeStage ? 'tabpanel' : undefined"
    :aria-labelledby="activeStage ? 'treatment-tab-central' : undefined"
    :tabindex="activeStage ? 0 : undefined"
    class="panel treatment-preparation"
    :class="{ 'treatment-stage-complete': centralClosed && !activeStage }"
    data-treatment-stage="central"
  >
    <div class="treatment-card-header">
      <div class="treatment-card-heading">
        <h2>Central de Guias</h2>
        <p>Confira os dados da avaliação, os procedimentos e os documentos. Finalize esta etapa para liberar a aba Liberação.</p>
      </div>
      <TreatmentCardToggle
        v-if="!activeStage"
        :open="centralOpen"
        label="preparação"
        :controls="'treatment-' + process.id + '-central-body'"
        @toggle="toggleCentral"
      />
    </div>
    <div
      v-if="activeStage || centralOpen"
      :id="'treatment-' + process.id + '-central-body'"
      class="mt-4 space-y-4"
    >
      
      <form @submit.prevent="saveCentral">
        <fieldset class="grid gap-4 md:grid-cols-2" :disabled="centralClosed || !canEdit || busy || documentsBusy">
          <label
            ><FieldLabel
              :required="true"
              reason="Obrigatório para encaminhar ao convênio; não impede salvar a preparação incompleta."
              >Convênio / plano do paciente</FieldLabel
            ><select
              v-model="form.patient_insurance_id"
              :id="'preparation-' + process.id + '-patient_insurance_id'"
              class="input"
            >
              <option value="">Não informado</option>
              <option v-for="item in patientInsurances" :key="item.id" :value="item.id">
                {{ item.insurance_name || item.name || process.insurance_name }} ·
                {{ item.plan || 'Sem plano' }} · {{ item.card_number || 'Sem carteirinha' }}
              </option>
            </select></label
          >
          <label
            ><FieldLabel
              :required="true"
              reason="Obrigatório para encaminhar ao convênio; não impede salvar a preparação incompleta."
              >Fisioterapeuta</FieldLabel
            ><select
              v-model="form.physiotherapist_id"
              :id="'preparation-' + process.id + '-physiotherapist_id'"
              class="input"
            >
              <option value="">Não informado</option>
              <option
                v-if="
                  form.physiotherapist_id &&
                  String(form.physiotherapist_id) === String(process.physiotherapist_id) &&
                  !professionals.some((p) => String(p.id) === String(form.physiotherapist_id))
                "
                :value="process.physiotherapist_id"
              >
                {{ process.physiotherapist_name }}
              </option>
              <option
                v-for="item in professionals.filter((p) => p.council === 'CREFITO')"
                :key="item.id"
                :value="item.id"
              >
                {{ item.full_name }}
              </option>
            </select></label
          >
          <div class="min-w-0">
            <label :for="'preparation-' + process.id + '-requesting_doctor_id'"><FieldLabel
              :required="true"
              reason="Obrigatório para encaminhar ao convênio; não impede salvar a preparação incompleta."
              >Médico solicitante</FieldLabel
            ></label>
            <div class="mt-1 flex items-center gap-2">
            <select
              v-model="form.requesting_doctor_id"
              :id="'preparation-' + process.id + '-requesting_doctor_id'"
              class="input flex-1"
            >
              <option value="">Não informado</option>
              <option
                v-for="item in professionals.filter((p) => p.council === 'CRM')"
                :key="item.id"
                :value="item.id"
              >
                {{ item.full_name }}
              </option>
            </select>
            <TableActionToolbar v-if="canCreateProfessional" class="shrink-0" label="Cadastro do médico solicitante" :actions="doctorActions" />
            </div>
          </div>
          <label>Início previsto<MaskedDateInput v-model="form.expected_start_date" /></label>
          <label
            ><FieldLabel
              :required="true"
              reason="Obrigatório para encaminhar ao convênio; não impede salvar a preparação incompleta."
              >Quantidade de sessões</FieldLabel
            ><input
              v-model="form.requested_sessions"
              :id="'preparation-' + process.id + '-requested_sessions'"
              type="number"
              min="1"
              step="1"
              class="input"
          /></label>
          <label
            >Prioridade<select v-model="form.priority" class="input">
              <option :value="0">Normal</option>
              <option :value="1">Alta</option>
              <option :value="2">Urgente</option>
            </select></label
          >
          <label>Data do encaminhamento<MaskedDateInput v-model="form.referral_date" /></label>
          <label>CID<input v-model="form.cid" class="input" /></label>
          <label class="md:col-span-2"
            >Diagnóstico<textarea v-model="form.medical_diagnosis" class="input" />
          </label>
          <label class="md:col-span-2"
            >Observações<textarea v-model="form.notes" class="input" />
          </label>
          <p class="md:col-span-2">
            Dias e horários são definidos na avaliação fisioterapêutica digital.
          </p>
          <button type="submit" class="sr-only">Salvar preparação</button>
          
        </fieldset>
        <button type="submit" class="sr-only">Salvar preparação</button>
      </form>
      <ListDetailDialog :open="doctorDialogOpen" title="Cadastrar médico" @close="!busy && (doctorDialogOpen = false)">
        <form class="grid gap-4" @submit.prevent="saveDoctor">
          <p class="text-sm text-gray-600">O médico será cadastrado em Profissionais e selecionado neste tratamento.</p>
          <fieldset class="grid gap-4 sm:grid-cols-2" :disabled="busy || !canAddDoctor">
            <label class="flex flex-col gap-1 sm:col-span-2"><FieldLabel required>Nome completo</FieldLabel>
              <input v-model="doctorForm.full_name" class="input w-full" maxlength="180" required />
            </label>
            <label class="flex flex-col gap-1"><FieldLabel required>Número do CRM</FieldLabel>
              <input v-model="doctorForm.council_number" class="input w-full" maxlength="40" required />
            </label>
            <label class="flex flex-col gap-1"><FieldLabel required>UF do CRM</FieldLabel>
              <select v-model="doctorForm.state" class="input w-full" required>
                <option value="">Selecione</option>
                <option v-for="state in states" :key="state" :value="state">{{ state }}</option>
              </select>
            </label>
            <label class="flex flex-col gap-1 sm:col-span-2">CBO (opcional)<input v-model="doctorForm.cbo" class="input w-full" maxlength="20" /></label>
          </fieldset>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" class="btn-secondary" :disabled="busy" @click="doctorDialogOpen = false">Cancelar</button>
            <button type="submit" class="btn" :disabled="busy || !canAddDoctor">{{ busy ? 'Salvando…' : 'Cadastrar e selecionar' }}</button>
          </div>
        </form>
      </ListDetailDialog>
      <h3>Procedimentos do tratamento</h3>
      <DataList
        v-model:selected="selectedProcedure"
        :items="process.procedures || []"
        :columns="procedureColumns"
        :actions="procedureActions"
        embedded
        selection-key="code"
      />
      <ListDetailDialog :open="procedureDialogOpen" title="Adicionar procedimento" @close="!busy && (procedureDialogOpen = false)">
      <form
        class="grid gap-4"
        @submit.prevent="addProcedure"
      >
        <label
          ><FieldLabel :required="true">Procedimento</FieldLabel
          ><select v-model="procedureId" class="input" required>
            <option value="">Selecione</option>
            <option v-for="item in procedures" :key="item.id" :value="item.id">
              {{ item.code }} · {{ item.description }}
            </option>
          </select></label
        >
        <label
          ><FieldLabel :required="true">Quantidade</FieldLabel
          ><input v-model.number="quantity" class="input" type="number" min="1" step="1" required
        /></label>
        <button class="btn self-end" :disabled="busy || !procedureId">
          Adicionar procedimento
        </button>
      </form>
        
      </ListDetailDialog>
      <div v-if="centralMissing.length" class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
        <p class="font-semibold">Para finalizar a Central de Guias, complete:</p>
        <ul class="list-disc pl-5"><li v-for="item in centralMissing" :key="item">{{ item }}</li></ul>
        <p>É possível salvar o rascunho e continuar depois.</p>
      </div>
      <slot name="documents" />
      <div v-if="canEdit" class="treatment-stage-footer">
        <TreatmentStageActions
          :process="process"
          stage="central"
          title="Central de Guias"
          :can-edit="canEdit"
          :disabled="busy || loading || documentsBusy"
          :save-draft-action="saveCentral"
          :before-finalize="finalizeCentral"
          @updated="stageChanged"
        />
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { useAuthUser } from '@/composables/useAuthUser'
import { onBeforeRouteUpdate } from 'vue-router'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, reactive, ref, nextTick, watch } from 'vue'
import api from '@/plugins/axios'
import DataList from './DataList.vue'
import ListDetailDialog from './ListDetailDialog.vue'
import TableActionToolbar from './TableActionToolbar.vue'
import TreatmentCardToggle from './TreatmentCardToggle.vue'
import TreatmentStageActions from './TreatmentStageActions.vue'
import { treatmentStageClosed } from '@/utils/treatmentStages'
import MaskedDateInput from './MaskedDateInput.vue'
const props = defineProps<{
  process: any
  canEdit: boolean
  canFinalizeReception?: boolean
  prepareReceptionFinalize?: () => Promise<boolean>
  canCreate: boolean
  canDelete: boolean
  activeStage?: string
  documentsBusy?: boolean
}>(),
  emit = defineEmits(['updated', 'stage-updated'])
const receptionOpen = ref(false),
  centralOpen = ref(false),
  busy = ref(false),
  loading = ref(false),
  message = ref(''),
  feedbackArea = ref<'reception' | 'central'>('central'),
  error = ref(false),
  catalogError = ref(''),
  assessmentDate = ref(''),
  form = reactive<any>({}),
  professionals = ref<any[]>([]),
  patientInsurances = ref<any[]>([]),
  procedures = ref<any[]>([]),
  selectedProcedure = ref<any>(null),
  procedureId = ref(''),
  procedureDialogOpen = ref(false),
  quantity = ref(1)
const centralBaseline = ref(''),
  receptionBaseline = ref('')
const receptionClosed = computed(() => treatmentStageClosed(props.process, 'reception'))
const centralClosed = computed(() => treatmentStageClosed(props.process, 'central'))
const { canOperational } = useAuthUser()
const canCreateProfessional = computed(() => canOperational('professionals', 'canCreate'))
const canAddDoctor = computed(() => canCreateProfessional.value && props.canEdit && !centralClosed.value && !loading.value && !props.documentsBusy && (!props.activeStage || props.activeStage === 'central'))
const doctorDialogOpen = ref(false)
const doctorForm = reactive({ full_name: '', council_number: '', state: '', cbo: '' })
const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const doctorActions = computed(() => [{
  icon: 'add', label: 'Cadastrar médico', variant: 'primary' as const,
  disabled: !canAddDoctor.value || busy.value,
  onClick: () => {
    if (!canAddDoctor.value || busy.value) return
    Object.assign(doctorForm, { full_name: '', council_number: '', state: '', cbo: '' })
    doctorDialogOpen.value = true
  },
}])
async function saveDoctor() {
  if (!canAddDoctor.value || busy.value) return
  const payload = {
    full_name: doctorForm.full_name.trim(), type: 'DOCTOR', council: 'CRM',
    council_number: doctorForm.council_number.trim(), state: doctorForm.state,
    cbo: doctorForm.cbo.trim() || null, active: true,
  }
  message.value = ''
  error.value = false
  if (!payload.full_name || !payload.council_number || !states.includes(payload.state)) {
    error.value = true
    message.value = 'Preencha nome completo, número do CRM e UF do médico.'
    return
  }
  if (professionals.value.some(item => item.council === 'CRM' && String(item.council_number).trim() === payload.council_number && item.state === payload.state)) {
    error.value = true
    message.value = 'Já existe um médico com esse CRM e UF. Selecione o cadastro existente.'
    return
  }
  busy.value = true
  const processId = props.process.id
  try {
    const doctor = (await api.post('/professionals', payload)).data
    professionals.value = [...professionals.value.filter(item => item.id !== doctor.id), doctor]
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
    doctorDialogOpen.value = false
    if (props.process.id === processId && canAddDoctor.value) {
      form.requesting_doctor_id = doctor.id
      message.value = 'Médico cadastrado e selecionado. Salve o rascunho ou gere a guia para gravar a seleção no tratamento.'
    } else message.value = 'Médico cadastrado. Entre em edição para selecioná-lo no tratamento.'
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível cadastrar o médico. Confira os dados e tente novamente.'
  } finally {
    busy.value = false
  }
}
function stageChanged(result: any) {
  if (result.completed && !props.activeStage) {
    if (result.stage === 'reception') receptionOpen.value = false
    if (result.stage === 'central') centralOpen.value = false
  }
  emit('stage-updated', result)
}
async function finalizeReception() {
  if (!props.canEdit) return props.prepareReceptionFinalize ? props.prepareReceptionFinalize() : false
  return !receptionOpen.value || (await saveReception())
}
const centralMissing = computed(() => {
  const requirements = [
    ['CONSULTATION','CONSULTATION_GUIDE','Consulta / avaliação'],
    ['PHYSIOTHERAPY','PHYSIOTHERAPY_GUIDE','Sessão de fisioterapia'],
    ['ELECTROSTIMULATION','ELECTROSTIMULATION','Eletroestimulação'],
  ]
  return requirements.flatMap(([type,document,label]) => [
    ...((props.process.procedures || []).some((p:any) => p.type === type && Number(p.requested_quantity)>0) ? [] : ['Procedimento: '+label]),
    ...((props.process.documents || []).some((d:any) => d.document_type === document && !d.deleted_at && (d.document_role === 'GENERATED' || d.is_usable === true || d.is_usable === 1)) ? [] : ['Guia: '+label]),
  ])
})
async function finalizeCentral() {
  if (centralMissing.value.length) {
    feedbackArea.value = 'central'
    error.value = true
    message.value = 'Complete a Central de Guias. Falta: '+centralMissing.value.join('; ')+'.'
    return false
  }
  return !centralOpen.value || (await saveCentral())
}
const fields = [
  'patient_insurance_id',
  'physiotherapist_id',
  'requesting_doctor_id',
  'expected_start_date',
  'requested_sessions',
  'priority',
  'referral_date',
  'cid',
  'medical_diagnosis',
  'notes',
]
const date = (v: string) =>
  v ? new Date(String(v).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informada'
function toggleReception() {
  receptionOpen.value = !receptionOpen.value
  if (receptionOpen.value) {
    assessmentDate.value = String(props.process.assessment_date || '').slice(0, 10)
    receptionBaseline.value = assessmentDate.value
  }
}
const centralSnapshot = () => JSON.stringify(fields.map((field) => form[field]))
function hydrateCentral() {
  for (const field of fields)
    form[field] = field.includes('date')
      ? String(props.process[field] || '').slice(0, 10)
      : (props.process[field] ?? '')
  form.priority = props.process.priority ?? 0
  centralBaseline.value = centralSnapshot()
}
async function toggleCentral() {
  centralOpen.value = !centralOpen.value
  if (!centralOpen.value) return
  hydrateCentral()
  loading.value = true
  catalogError.value = ''
  try {
    const options = (await api.get('/guide-processes/' + props.process.id + '/preparation-options'))
      .data
    professionals.value = options.professionals
    patientInsurances.value = options.insurances
    procedures.value = options.procedures
  } catch {
    catalogError.value =
      'Não foi possível carregar as opções. Feche e abra novamente para tentar de novo.'
  }
  loading.value = false
}
onBeforeRouteUpdate(() => {
  if (busy.value) return false
  const dirty =
    (centralOpen.value && centralSnapshot() !== centralBaseline.value) ||
    (receptionOpen.value && assessmentDate.value !== receptionBaseline.value)
  return (
    !dirty || window.confirm('Há alterações não salvas nos dados do tratamento. Sair mesmo assim?')
  )
})
defineExpose({
  hasDraft: () => (centralOpen.value && centralSnapshot() !== centralBaseline.value) || (receptionOpen.value && assessmentDate.value !== receptionBaseline.value),
  async saveDraftForDocuments() {
    if (!centralOpen.value || centralSnapshot() === centralBaseline.value) return true
    if (!props.canEdit || centralClosed.value || busy.value) {
      error.value = true
      message.value = 'Não foi possível salvar as alterações da Central. Confira a reserva de edição e aguarde qualquer salvamento em andamento antes de gerar a guia.'
      return false
    }
    return saveCentral()
  },
  discardDraft: () => { hydrateCentral(); assessmentDate.value=String(props.process.assessment_date || '').slice(0,10); receptionBaseline.value=assessmentDate.value },
  async reveal() {
    if (!centralOpen.value) await toggleCentral()
    await nextTick()
  },
})
watch(
  () => props.process,
  () => {
    if (busy.value) return
    // Other stages can update shared fields: refresh only forms without local edits.
    if (centralOpen.value && centralSnapshot() === centralBaseline.value) hydrateCentral()
    if (receptionOpen.value && assessmentDate.value === receptionBaseline.value) {
      assessmentDate.value = String(props.process.assessment_date || '').slice(0, 10)
      receptionBaseline.value = assessmentDate.value
    }
  },
)
// A confirmed rotation updates only the executor, preserving other local drafts.
watch(
  () => props.process.physiotherapist_id,
  (value, previous) => {
    if (!centralOpen.value || value === previous) return
    form.physiotherapist_id = value ?? ''
    if (centralBaseline.value) {
      const baseline = JSON.parse(centralBaseline.value)
      baseline[fields.indexOf('physiotherapist_id')] = form.physiotherapist_id
      centralBaseline.value = JSON.stringify(baseline)
    }
  },
)
// Keep each form mounted and initialize it once so changing tabs preserves drafts.
watch(
  () => props.activeStage,
  async (stage) => {
    if (stage === 'reception' && !receptionOpen.value) toggleReception()
    if (stage === 'central' && !centralOpen.value) await toggleCentral()
  },
  { immediate: true },
)
async function update(payload: any, area: 'reception' | 'central' = 'central') {
  if (
    !props.canEdit ||
    busy.value ||
    (area === 'reception' ? receptionClosed.value : centralClosed.value)
  )
    return false
  busy.value = true
  feedbackArea.value = area
  message.value = ''
  error.value = false
  try {
    const saved = (await api.put('/guide-processes/' + props.process.id, payload)).data
    if (area === 'central') centralBaseline.value = centralSnapshot()
    else receptionBaseline.value = assessmentDate.value
    message.value =
      area === 'central' ? 'Preparação salva com sucesso.' : 'Dados da recepção salvos com sucesso.'
    emit('updated', saved)
    return true
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível salvar.'
    return false
  } finally {
    busy.value = false
  }
}
function saveReception() {
  return update({ assessment_date: assessmentDate.value || null }, 'reception')
}
function saveCentral() {
  return update(
    Object.fromEntries(fields.map((field) => [field, form[field] === '' ? null : form[field]])),
  )
}
const procedureColumns = [
  { key: 'code', label: 'Código' },
  { key: 'description', label: 'Descrição' },
  { key: 'requested_quantity', label: 'Quantidade' },
]
const procedureActions = computed(() => [
  {
    icon: 'add',
    label: 'Adicionar procedimento',
    disabled: !props.canCreate || centralClosed.value || busy.value || loading.value,
    onClick: () => { procedureId.value = ''; quantity.value = 1; error.value = false; message.value = ''; procedureDialogOpen.value = true },
  },
  {
    icon: 'delete',
    label: 'Remover procedimento selecionado',
    disabled: !props.canDelete || centralClosed.value || busy.value || !selectedProcedure.value,
    onClick: removeProcedure,
  },
])
async function changeProcedure(action: () => Promise<any>, permitted: boolean) {
  if (busy.value || !permitted || centralClosed.value) return
  busy.value = true
  feedbackArea.value = 'central'
  error.value = false
  message.value = ''
  try {
    await action()
    selectedProcedure.value = null
    procedureId.value = ''
    procedureDialogOpen.value = false
    message.value = 'Procedimentos atualizados.'
    emit('updated')
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível atualizar o procedimento.'
  } finally {
    busy.value = false
  }
}
function addProcedure() {
  if (!props.canCreate || centralClosed.value) return
  return changeProcedure(
    () => api.post('/guide-processes/' + props.process.id + '/procedures', {
      procedure_id: procedureId.value,
      requested_quantity: quantity.value,
    }),
    props.canCreate,
  )
}
function removeProcedure() {
  if (!selectedProcedure.value || !props.canDelete || centralClosed.value) return
  return changeProcedure(
    () => api.delete(
      '/guide-processes/' + props.process.id + '/procedures/' + selectedProcedure.value.id,
    ),
    props.canDelete,
  )
}

useFeedback(() => unwrapNoticeValue(message), () => unwrapNoticeValue(error) ? 'error' : 'success')
useFeedback(() => unwrapNoticeValue(catalogError), () => 'error')
</script>
<style scoped>
.treatment-preparation form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.treatment-preparation .input {
  width: 100%;
  min-width: 0;
}
</style>
