<template>
  <section
    id="digital-evaluation"
    class="panel evaluation scroll-mt-4"
    :class="{ 'treatment-stage-complete': completed && !tabbed }"
    data-treatment-stage="evaluation"
  >
    <div class="treatment-card-header">
      <div class="treatment-card-heading">
        <h2 class="section-title">Avaliação fisioterapêutica digital</h2>
        <p class="mt-1 text-sm">
          {{ completed ? 'Concluída' : evaluation ? 'Em preenchimento' : 'Não iniciada' }} ·
          {{ dirty ? 'Alterações não salvas' : 'Dados salvos no servidor' }}
        </p>
      </div>
      <TreatmentCardToggle
        v-if="!tabbed"
        :open="open"
        label="avaliação"
        :controls="'treatment-' + process.id + '-evaluation-body'"
        @toggle="toggleOpen"
      />
    </div>
    <form
      v-if="tabbed || open"
      :id="'treatment-' + process.id + '-evaluation-body'"
      class="mt-5 space-y-6"
      @submit.prevent="save(false)"
    >
      <p v-if="process.continuation_of_id" class="text-sm text-gray-600">
        Dados da avaliação inicial, preservados para consulta. Não é necessário preencher uma nova ficha nesta continuação.
      </p>
      <p v-else class="text-sm text-gray-600">
        Preencha a ficha da avaliação inicial. É possível salvar o rascunho e continuar depois.
        Campos administrativos ausentes não impedem o rascunho.
        <span v-if="canEdit && !completed">As alterações são salvas automaticamente a cada minuto.</span>
      </p>
      <div
        v-if="missingFields.length"
        class="validation-summary"
        role="alert"
        tabindex="-1"
        ref="validationSummary"
      >
        <p class="font-semibold">Complete os campos abaixo antes de concluir:</p>
        <ol class="list-decimal pl-6 mt-2 space-y-1">
          <li v-for="field in missingFields" :key="field.key">
            <button type="button" class="validation-link" @click="focusField(field.key)">
              {{ field.label }}
            </button>
          </li>
        </ol>
      </div>
      
      <fieldset :disabled="completed || busy || !canEdit" class="space-y-6">
        <section>
          <h3>1. Identificação do paciente</h3>
          <dl class="fields identification">
            <div v-for="row in patientFields" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value || 'Não informado' }}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>2. Dados do encaminhamento / solicitação</h3>
          <div class="fields">
            <label
              >Médico / profissional solicitante<input
                :value="props.process.continuation_of_id ? (props.evaluation?.referral_professional || '') : (props.process.doctor_name || '')"
                readonly
                title="Médico solicitante definido na Central de Guias"
                class="input"
            /></label>
            <label
              >Data do encaminhamento<input v-model="form.referral_date" type="date" class="input"
            /></label>
            <label class="wide"
              >Diagnóstico médico / hipótese<textarea
                v-model="form.medical_diagnosis"
                class="input"
              />
            </label>
            <label
              >CID (se informado)<input v-model="form.cid" maxlength="40" class="input"
            /></label>
            <label
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Sessões solicitadas</FieldLabel
              ><input
                v-model.number="form.requested_sessions"
                type="number"
                min="1"
                inputmode="numeric"
                class="input"
            /></label>
            <label class="wide"
              >Guia / autorização nº<input v-model="form.authorization_reference" class="input"
            /></label>
          </div>
        </section>
        <section>
          <h3>3. Avaliação fisioterapêutica</h3>
          <div class="fields">
            <label v-for="field in clinicalFields" :key="field.key" class="wide"
              ><FieldLabel
                :required="['chief_complaint', 'physical_exam'].includes(field.key)"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >{{ field.label }}</FieldLabel
              ><textarea
                v-model="form[field.key]"
                :aria-invalid="invalidField(field.key)"
                :data-validation-key="field.key"
                class="input"
                rows="4"
                :placeholder="field.hint"
              />
            </label>
            <label
              >Dor EVA (0–10)<input
                v-model.number="form.pain_score"
                type="number"
                min="0"
                max="10"
                inputmode="numeric"
                class="input"
            /></label>
            <label
              >Classificação da dor<select
                aria-label="Classificação da dor"
                v-model="form.pain_classification"
                class="input"
              >
                <option value="">Não informado</option>
                <option>Sem dor</option>
                <option>Leve</option>
                <option>Moderada</option>
                <option>Intensa</option>
              </select></label
            >
            <label class="wide"
              >Localização predominante<input v-model="form.pain_location" class="input"
            /></label>
          </div>
        </section>
        <section>
          <h3>4. Região / membro acometido e mapa corporal</h3>
          <p class="mb-3 text-sm">Marque as regiões e informe a lateralidade quando aplicável.</p>
          <div class="region-grid">
            <div v-for="region in regions" :key="region" class="region-row">
              <label class="choice"
                ><input
                  type="checkbox"
                  :checked="Boolean(findRegion(region))"
                  @change="toggleRegion(region)"
                />{{ region }}</label
              ><select
                v-if="findRegion(region)"
                v-model="findRegion(region)!.laterality"
                class="input"
                :aria-label="'Lateralidade de ' + region"
              >
                <option value="">Não se aplica / não informada</option>
                <option value="RIGHT">Direita</option>
                <option value="LEFT">Esquerda</option>
                <option value="BILATERAL">Bilateral</option>
              </select>
            </div>
          </div>
          <label v-if="findRegion('Outro')" class="mt-3"
            ><FieldLabel
              :required="true"
              reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
              >Outra região</FieldLabel
            ><input
              v-model="form.other_region"
              :aria-invalid="invalidField('other_region')"
              data-validation-key="other_region"
              class="input"
          /></label>
          <div class="mt-4">
            <EvaluationDrawing
              v-model="form.body_marks"
              :disabled="completed || busy || !canEdit"
            />
          </div>
        </section>
        <section>
          <h3>5. Classificação de gravidade e riscos / precauções</h3>
          <div class="fields">
            <label
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Gravidade do quadro</FieldLabel
              ><select
                aria-label="Gravidade do quadro"
                v-model="form.severity"
                :aria-invalid="invalidField('severity')"
                data-validation-key="severity"
                class="input"
              >
                <option value="">Selecione</option>
                <option value="MILD">Leve</option>
                <option value="MODERATE">Moderada</option>
                <option value="SEVERE">Grave</option>
              </select></label
            >
            <label
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Risco assistencial global</FieldLabel
              ><select
                aria-label="Risco assistencial global"
                v-model="form.care_risk"
                :aria-invalid="invalidField('care_risk')"
                data-validation-key="care_risk"
                class="input"
              >
                <option value="">Selecione</option>
                <option value="LOW">Baixo</option>
                <option value="MODERATE">Moderado</option>
                <option value="HIGH">Alto</option>
              </select></label
            >
            <label class="wide"
              >Justificativa da gravidade<textarea
                v-model="form.severity_justification"
                class="input"
              />
            </label>
            <label class="wide"
              >Necessita acompanhamento individualizado?<select
                v-model="form.individual_monitoring"
                class="input"
              >
                <option :value="null">Não informado</option>
                <option :value="true">Sim</option>
                <option :value="false">Não</option>
              </select></label
            >
            <fieldset class="wide">
              <legend>Riscos / alertas / precauções identificados ou relatados</legend>
              <div class="choices">
                <label v-for="item in precautions" :key="item" class="choice"
                  ><input v-model="form.precautions" type="checkbox" :value="item" />{{
                    item
                  }}</label
                >
              </div>
            </fieldset>
            <label v-if="form.precautions.includes('Outro')" class="wide"
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Outra precaução</FieldLabel
              ><input
                v-model="form.other_precaution"
                :aria-invalid="invalidField('other_precaution')"
                data-validation-key="other_precaution"
                class="input"
            /></label>
            <label class="wide"
              >Observações / cuidados específicos<textarea
                v-model="form.specific_care_notes"
                class="input"
              />
            </label>
          </div>
        </section>
        <section>
          <h3>6. Conduta e plano terapêutico</h3>
          <div class="fields">
            <label class="wide"
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Objetivos terapêuticos</FieldLabel
              ><textarea
                v-model="form.therapeutic_goals"
                :aria-invalid="invalidField('therapeutic_goals')"
                data-validation-key="therapeutic_goals"
                class="input"
                rows="3"
              />
            </label>
            <fieldset
              class="wide validation-group"
              :aria-invalid="invalidField('conducts')"
              data-validation-key="conducts"
            >
              <legend>
                <FieldLabel
                  required
                  reason="Selecione ao menos uma conduta para concluir a avaliação."
                  >Conduta proposta</FieldLabel
                >
              </legend>
              <div class="choices">
                <label v-for="item in conducts" :key="item" class="choice"
                  ><input v-model="form.conducts" type="checkbox" :value="item" />{{ item }}</label
                >
              </div>
            </fieldset>
            <label v-if="form.conducts.includes('Outra')" class="wide"
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Outra conduta</FieldLabel
              ><input
                v-model="form.other_conduct"
                :aria-invalid="invalidField('other_conduct')"
                data-validation-key="other_conduct"
                class="input"
            /></label>
            <label class="wide"
              >Descrição / parâmetros / progressão planejada<textarea
                v-model="form.conduct_description"
                class="input"
                rows="4"
              />
            </label>
            <label
              >Previsão de reavaliação<input
                v-model="form.reevaluation_date"
                type="date"
                class="input"
            /></label>
            <label
              >Critério / observação<input v-model="form.reevaluation_notes" class="input"
            /></label>
          </div>
        </section>
        <section>
          <h3>7. Dias e horário de atendimento</h3>
          <div class="schedule">
            <div v-for="day in form.treatment_days" :key="day.day" class="day">
              <label class="choice"
                ><input v-model="day.enabled" type="checkbox" />{{ dayNames[day.day] }}</label
              ><label
                ><FieldLabel
                  :required="day.enabled"
                  reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                  >Horário</FieldLabel
                ><input
                  v-model="day.time"
                  :aria-invalid="invalidField('time_' + day.day)"
                  :data-validation-key="'time_' + day.day"
                  type="time"
                  :disabled="!day.enabled || completed || busy || !canEdit"
                  class="input"
              /></label>
            </div>
          </div>
          <div class="fields mt-4">
            <label
              >Frequência planejada (sessões/semana)<input
                v-model.number="form.sessions_per_week"
                type="number"
                min="0"
                max="5"
                inputmode="numeric"
                class="input"
            /></label>
            <label
              >Total previsto de sessões<input
                v-model.number="form.planned_total_sessions"
                type="number"
                min="1"
                inputmode="numeric"
                class="input"
            /></label>
            <label
              >Início previsto<input v-model="form.expected_start_date" type="date" class="input"
            /></label>
          </div>
        </section>
        <PhysiotherapyRotation
          :process-id="process.id"
          :history-version="process.history?.length"
          :days="form.treatment_days"
          :start-date="form.expected_start_date"
          :total="form.planned_total_sessions || form.requested_sessions"
          :readonly="completed || busy || !canEdit"
          @applied="applyRotation"
          @confirmed="emit('executor-updated', $event)"
        />
        <section>
          <h3>8. Responsável pela avaliação</h3>
          <div class="fields">
            <label v-if="professionals.length" class="wide"
              >Selecionar fisioterapeuta cadastrado<select
                v-model="form.physiotherapist_id"
                class="input"
                @change="selectProfessional"
              >
                <option :value="null">Informar responsável abaixo</option>
                <option v-for="p in professionals" :key="p.id" :value="p.id">
                  {{ p.full_name }} · {{ p.council_number }} {{ p.state }}
                </option>
              </select></label
            >
            <label
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Fisioterapeuta</FieldLabel
              ><input
                v-model="form.responsible_name"
                :aria-invalid="invalidField('responsible_name')"
                data-validation-key="responsible_name"
                class="input" /></label
            ><label
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >CREFITO</FieldLabel
              ><input
                v-model="form.responsible_crefito"
                :aria-invalid="invalidField('responsible_crefito')"
                data-validation-key="responsible_crefito"
                class="input"
            /></label>
            <label
              ><FieldLabel
                :required="true"
                reason="Obrigatório para concluir a avaliação ou encaminhar ao convênio; não impede salvar rascunho."
                >Data da avaliação</FieldLabel
              ><input
                v-model="form.evaluation_date"
                :aria-invalid="invalidField('evaluation_date')"
                data-validation-key="evaluation_date"
                type="date"
                class="input"
            /></label>
            <div class="wide">
              <p class="mb-2 font-semibold">Assinatura / rubrica</p>
              <EvaluationDrawing
                v-model="form.signature_strokes"
                signature
                :disabled="completed || busy || !canEdit"
              />
            </div>
          </div>
        </section>
      </fieldset>
      <div class="evaluation-actions">
        <p class="mr-auto text-sm" aria-live="polite">
          {{
            busy || autoSaving
              ? 'Salvando…'
              : dirty
                ? 'Há alterações não salvas.'
                : completed
                  ? 'Avaliação concluída.'
                  : 'Rascunho salvo.'
          }}
        </p>
        <button
          v-if="completed && canEdit"
          type="button"
          class="btn-secondary"
          :disabled="busy"
          @click="reopen"
        >
          Reabrir avaliação</button
        ><template v-else-if="canEdit"
          ><TreatmentSaveButton :busy="busy || autoSaving" @click="save(false)" />
          <button type="button" class="btn" :disabled="busy || autoSaving" @click="confirmOpen = true">
            Concluir avaliação
          </button></template
        >
      </div>
      
    </form>
    <ListDetailDialog :open="confirmOpen" title="Confirmar avaliação" @close="confirmOpen = false"
      ><p>
        Confirme os dados clínicos, a conduta e o responsável. A avaliação ficará concluída e será
        necessário reabri-la para alterar. O tratamento seguirá para a Central de Guias organizar a
        documentação. Esta ação não encaminha o tratamento ao convênio.
      </p>
      <div class="mt-5 flex flex-wrap justify-end gap-3">
        <button class="btn-secondary" :disabled="busy" @click="confirmOpen = false">
          Cancelar</button
        ><button class="btn" :disabled="busy" @click="save(true)">Confirmar e concluir</button>
      </div></ListDetailDialog
    >
  </section>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import PhysiotherapyRotation from './PhysiotherapyRotation.vue'
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import api from '@/plugins/axios'
import TreatmentCardToggle from './TreatmentCardToggle.vue'
import TreatmentSaveButton from './TreatmentSaveButton.vue'
import EvaluationDrawing from './EvaluationDrawing.vue'
import ListDetailDialog from './ListDetailDialog.vue'
const props = defineProps<{
  process: any
  evaluation: any
  canEdit: boolean
  active?: boolean
  initiallyOpen?: boolean
  refreshedPatient?: any
  tabbed?: boolean
}>()
const emit = defineEmits(['updated', 'executor-updated'])
const open = ref(Boolean(props.initiallyOpen)),
  busy = ref(false),
  autoSaving = ref(false),
  message = ref(''),
  error = ref(false),
  confirmOpen = ref(false),
  baseline = ref(''),
  professionals = ref<any[]>([]),
  patient = ref<any>({})
const form = reactive<any>({}),
  completed = computed(() => props.evaluation?.status === 'COMPLETED'),
  dirty = computed(() => JSON.stringify(form) !== baseline.value)
const regions = [
  'Cervical/cabeça',
  'Ombro',
  'Braço',
  'Cotovelo',
  'Antebraço',
  'Punho/mão',
  'Torácica',
  'Lombar',
  'Quadril',
  'Coxa',
  'Joelho',
  'Perna',
  'Tornozelo/pé',
  'Outro',
]
const precautions = [
  'Risco de queda',
  'Alteração de sensibilidade',
  'Pós-operatório',
  'Doença cardiovascular',
  'Déficit neurológico',
  'Lesão de pele',
  'Marcapasso / implante eletrônico',
  'Gestação',
  'Trombose / risco vascular',
  'Dor intensa',
  'Outro',
]
const conducts = [
  'Cinesioterapia',
  'Alongamento',
  'Fortalecimento',
  'Treino funcional',
  'Terapia manual',
  'Eletroterapia',
  'Termoterapia',
  'Crioterapia',
  'Propriocepção/equilíbrio',
  'Treino de marcha',
  'Orientações domiciliares',
  'Outra',
]
const clinicalFields = [
  { key: 'chief_complaint', label: 'Queixa principal / motivo do atendimento', hint: '' },
  {
    key: 'current_history',
    label: 'História do quadro atual',
    hint: 'Início, mecanismo, evolução, fatores de melhora/piora e medicações em uso',
  },
  {
    key: 'functional_limitations',
    label: 'Limitações funcionais / atividades comprometidas',
    hint: '',
  },
  {
    key: 'physical_exam',
    label: 'Exame físico e achados relevantes',
    hint: 'Mobilidade, força, sensibilidade, edema, marcha e testes específicos, quando aplicável',
  },
]
const dayNames: Record<string, string> = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
}
const validationAttempted = ref(false)
const validationSummary = ref<HTMLElement>()
const missingFields = computed(() => {
  if (!validationAttempted.value || completed.value) return []
  const required = [
    ['chief_complaint', 'Item 3 — Queixa principal / motivo do atendimento'],
    ['physical_exam', 'Item 3 — Exame físico e achados relevantes'],
    ['severity', 'Item 5 — Gravidade do quadro'],
    ['care_risk', 'Item 5 — Risco assistencial global'],
    ['therapeutic_goals', 'Item 6 — Objetivos terapêuticos'],
    ['conducts', 'Item 6 — Conduta proposta'],
    ['responsible_name', 'Item 8 — Fisioterapeuta responsável'],
    ['responsible_crefito', 'Item 8 — CREFITO'],
    ['evaluation_date', 'Item 8 — Data da avaliação'],
  ]
  const empty = (value: any) =>
    value == null ||
    (typeof value === 'string' && !value.trim()) ||
    (Array.isArray(value) && !value.length)
  const fields = required
    .filter(([key]) => empty(form[key]))
    .map(([key, label]) => ({ key, label }))
  for (const [key, label, selected] of [
    ['other_region', 'Item 4 — Outra região', form.regions?.some((r: any) => r.region === 'Outro')],
    ['other_precaution', 'Item 5 — Outra precaução', form.precautions?.includes('Outro')],
    ['other_conduct', 'Item 6 — Outra conduta', form.conducts?.includes('Outra')],
  ] as [string, string, boolean][]) {
    if (selected && empty(form[key])) fields.push({ key, label })
  }
  for (const day of form.treatment_days || [])
    if (day.enabled && !day.time)
      fields.push({ key: 'time_' + day.day, label: 'Item 7 — Horário de ' + dayNames[day.day] })
  return fields.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }))
})
const invalidField = (key: string) => missingFields.value.some((field) => field.key === key)
function focusField(key: string) {
  const target = document.querySelector<HTMLElement>(
    `#digital-evaluation [data-validation-key="${key}"]`,
  )
  const input = target?.matches('fieldset') ? target.querySelector<HTMLElement>('input') : target
  input?.focus()
  input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
const date = (v: any) => (v ? String(v).slice(0, 10) : '')
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
watch(
  () => props.refreshedPatient,
  (value) => {
    if (value) patient.value = value
  },
)
const patientFields = computed(() => [
  { label: 'Nome', value: props.process.patient_name },
  { label: 'CPF', value: patient.value.cpf },
  {
    label: 'Data de nascimento',
    value: date(patient.value.birth_date).split('-').reverse().join('/'),
  },
  {
    label: 'Sexo',
    value:
      (
        { male: 'Masculino', female: 'Feminino', m: 'Masculino', f: 'Feminino' } as Record<
          string,
          string
        >
      )[String(patient.value.gender || '').toLowerCase()] || patient.value.gender,
  },
  { label: 'Celular', value: patient.value.cellphone || patient.value.phone },
  { label: 'Convênio', value: props.process.insurance_name },
  { label: 'Carteirinha', value: props.process.card_number },
])
function hydrate() {
  const p = props.process.continuation_of_id ? {} : props.process,
    e = props.evaluation || {}
  let days = e.treatment_days ?? p.treatment_days ?? []
  if (typeof days === 'string') {
    try {
      days = JSON.parse(days)
    } catch {
      days = []
    }
  }
  Object.keys(form).forEach((k) => delete form[k])
  Object.assign(form, {
    precautions: [],
    conducts: [],
    regions: [],
    body_marks: [],
    signature_strokes: [],
    individual_monitoring: null,
    pain_classification: '',
    severity: '',
    care_risk: '',
    physiotherapist_id: null,
    referral_professional: p.doctor_name || '',
    medical_diagnosis: p.medical_diagnosis || '',
    cid: p.cid || '',
    requested_sessions: p.requested_sessions || null,
    planned_total_sessions: p.requested_sessions || null,
    authorization_reference: p.authorizations?.find((a:any)=>!a.document_type||a.document_type==='PHYSIOTHERAPY_GUIDE')?.authorization_number || '',
    responsible_name: '',
    responsible_crefito: '',
    evaluation_date: date(p.assessment_date) || (props.process.continuation_of_id ? '' : localToday()),
    ...JSON.parse(JSON.stringify(e)),
  })
  for (const key of ['precautions', 'conducts', 'regions', 'body_marks', 'signature_strokes'])
    if (!Array.isArray(form[key])) form[key] = []
  const existingDefaults: Record<string, any> = {
    referral_professional: p.doctor_name || '',
    medical_diagnosis: p.medical_diagnosis || '',
    cid: p.cid || '',
    requested_sessions: p.requested_sessions || null,
    planned_total_sessions: p.requested_sessions || null,
    responsible_name: '',
    physiotherapist_id: null,
    authorization_reference: p.authorizations?.find((a:any)=>!a.document_type||a.document_type==='PHYSIOTHERAPY_GUIDE')?.authorization_number || '',
  }
  for (const [key, value] of Object.entries(existingDefaults))
    if (form[key] == null) form[key] = value
  for (const k of ['evaluation_date', 'referral_date', 'expected_start_date', 'reevaluation_date'])
    form[k] = date(e[k] ?? p[k] ?? form[k])
  if (!props.process.continuation_of_id) form.evaluation_date ||= localToday()
  form.individual_monitoring =
    form.individual_monitoring == null ? null : Boolean(form.individual_monitoring)
  form.treatment_days = Object.keys(dayNames).map((day) => {
    const old = days.find((d: any) => (typeof d === 'string' ? d : d.day) === day)
    return {
      day,
      enabled: Boolean(old && (typeof old === 'string' || old.enabled !== false)),
      time: old?.time || '',
    }
  })
  form.sessions_per_week ??= form.treatment_days.filter((d: any) => d.enabled).length
  baseline.value = JSON.stringify(form)
}
watch(
  () => props.evaluation,
  () => {
    if (!baseline.value || !dirty.value) hydrate()
  },
  { immediate: true },
)
watch(
  () => form.treatment_days?.map((d: any) => d.enabled).join(','),
  () => {
    form.sessions_per_week = form.treatment_days.filter((d: any) => d.enabled).length
  },
)
function findRegion(region: string) {
  return form.regions.find((r: any) => r.region === region)
}
function toggleRegion(region: string) {
  const i = form.regions.findIndex((r: any) => r.region === region)
  if (i >= 0) form.regions.splice(i, 1)
  else form.regions.push({ region, laterality: '' })
}
function applyRotation(sessions: any[]) {
  for (const day of form.treatment_days) {
    const session = sessions.find((s: any) => s.day === day.day)
    if (session) day.time = session.session_time
  }
}
function selectProfessional() {
  const p = professionals.value.find((p) => p.id === form.physiotherapist_id)
  if (p) {
    form.responsible_name = p.full_name
    form.responsible_crefito = [p.council_number, p.state].filter(Boolean).join(' / ')
  }
}
defineExpose({
  hasDraft: () => dirty.value,
  discardDraft: hydrate,
  async reveal() {
    open.value = true
    await nextTick()
  },
})
function toggleOpen() {
  if (
    open.value &&
    dirty.value &&
    !window.confirm('Há alterações não salvas. Recolher sem salvar?')
  )
    return
  open.value = !open.value
}
async function save(finish: boolean, automatic = false) {
  if (busy.value || autoSaving.value || !props.canEdit || completed.value || props.active === false) return
  if (automatic && (!dirty.value || confirmOpen.value)) return
  if (automatic) autoSaving.value = true
  else busy.value = true
  error.value = false
  message.value = ''
  try {
    const savedSnapshot = JSON.stringify(form)
    const payload = JSON.parse(savedSnapshot)
    for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
    let result = (
      await api[props.evaluation ? 'put' : 'post'](
        `/guide-processes/${props.process.id}/evaluation`,
        payload,
      )
    ).data
    baseline.value = savedSnapshot
    if (finish)
      result = (await api.post(`/guide-processes/${props.process.id}/evaluation/complete`)).data
    if (!automatic) validationAttempted.value = false
    if (finish) open.value = false
    message.value = finish ? 'Avaliação concluída.' : automatic ? 'Rascunho salvo automaticamente.' : 'Rascunho salvo com sucesso.'
    confirmOpen.value = false
    emit('updated', result)
  } catch (e: any) {
    error.value = true
    validationAttempted.value = Boolean(finish && e.response?.data?.missing?.length)
    message.value = validationAttempted.value
      ? 'Não foi possível concluir. Confira os campos destacados na avaliação.'
      : e.response?.data?.error || (automatic ? 'Não foi possível salvar automaticamente a avaliação. As alterações continuam nesta tela; tente Salvar rascunho.' : 'Não foi possível salvar a avaliação.')
    confirmOpen.value = false
    if (validationAttempted.value) {
      await nextTick()
      validationSummary.value?.focus()
    }
  } finally {
    busy.value = false
    autoSaving.value = false
  }
}
watch(
  () => props.canEdit && props.active !== false && !completed.value,
  (enabled, _, onCleanup) => {
    if (!enabled) return
    const timer = window.setInterval(() => { void save(false, true) }, 60_000)
    onCleanup(() => window.clearInterval(timer))
  },
  { immediate: true },
)
async function reopen() {
  if (!window.confirm('Reabrir a avaliação para edição? A reabertura ficará no histórico.')) return
  busy.value = true
  try {
    emit('updated', (await api.post(`/guide-processes/${props.process.id}/evaluation/reopen`)).data)
    open.value = true
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível reabrir.'
  } finally {
    busy.value = false
  }
}
const unload = (e: BeforeUnloadEvent) => {
  if (dirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onBeforeRouteLeave(
  () => !dirty.value || window.confirm('Há alterações não salvas na avaliação. Sair mesmo assim?'),
)
onBeforeRouteUpdate(
  () => !dirty.value || window.confirm('Há alterações não salvas na avaliação. Sair mesmo assim?'),
)
onMounted(async () => {
  window.addEventListener('beforeunload', unload)
  try {
    const options = (await api.get(`/guide-processes/${props.process.id}/evaluation/options`)).data
    professionals.value = Array.isArray(options) ? options : options.professionals || []
    patient.value = props.refreshedPatient || options.patient || {}
    if (!form.responsible_crefito && form.physiotherapist_id && !dirty.value) {
      selectProfessional()
      baseline.value = JSON.stringify(form)
    }
  } catch {
    error.value = true
    message.value =
      'N�o foi poss�vel carregar os dados complementares do paciente. Atualize a p�gina para conferir a identifica��o.'
  }
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', unload))

useFeedback(() => unwrapNoticeValue(message), () => unwrapNoticeValue(error) ? 'error' : 'success')
</script>
<style scoped>
.validation-summary {
  border: 1px solid #d92d20;
  background: #fef3f2;
  color: #b42318;
  border-radius: 8px;
  padding: 1rem;
}
.evaluation .validation-link {
  min-height: 0;
  text-align: left;
  text-decoration: underline;
}
.evaluation [aria-invalid='true'] {
  border: 2px solid #d92d20 !important;
  background-color: #fef3f2;
  outline-color: #d92d20;
}
.validation-group[aria-invalid='true'] {
  padding: 0.75rem;
  border-radius: 8px;
}
.evaluation {
  min-width: 0;
}
.evaluation h3 {
  border-bottom: 1px solid #eaecf0;
  padding-bottom: 0.6rem;
  margin-bottom: 1rem;
}
.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.fields .wide {
  grid-column: 1/-1;
}
.evaluation label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  min-width: 0;
}
.evaluation .input {
  width: 100%;
  min-height: 48px;
}
.evaluation textarea {
  min-height: 100px;
}
.choices,
.region-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}
.evaluation .choice {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  padding: 0.5rem;
  border-radius: 8px;
  background: #f9fafb;
}
.choice input {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.region-row {
  min-width: 0;
}
.schedule {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
}
.day {
  border: 1px solid #eaecf0;
  padding: 0.6rem;
  border-radius: 10px;
  min-width: 0;
}
.identification dd {
  overflow-wrap: anywhere;
}
.identification dt {
  color: #667085;
}
.evaluation-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  background: white;
  border-top: 1px solid #eaecf0;
  padding: 1rem 0;
}
.evaluation button {
  min-height: 48px;
}
.evaluation fieldset {
  min-width: 0;
}
.evaluation legend {
  margin-bottom: 0.75rem;
}
@media (max-width: 1100px) {
  .schedule {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .fields,
  .choices,
  .region-grid,
  .schedule {
    grid-template-columns: 1fr;
  }
  .evaluation-actions button {
    flex: 1;
  }
  .evaluation-actions p {
    width: 100%;
  }
}
</style>
