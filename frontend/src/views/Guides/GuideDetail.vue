<template>
  <PageShell
    title="Tratamento"
    subtitle="Documentos para liberação e acompanhamento pelo faturamento"
  >
    <div v-if="process" class="space-y-5">
      <div
        v-if="saveNotice"
        class="rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-800"
        role="status"
      >
        <b>{{
          uploadFailures
            ? 'Tratamento salvo, mas alguns documentos não puderam ser enviados.'
            : '✓ Tratamento salvo com pendências.'
        }}</b>
        <p v-if="savePendingItems.length" class="mt-2">
          Pendências: {{ savePendingItems.join('; ') }}.
        </p>
      </div>
      <p
        v-if="documentActionMessage"
        class="rounded-xl p-3 text-sm font-semibold"
        :class="
          documentActionError ? 'bg-error-50 text-error-700' : 'bg-success-50 text-success-700'
        "
        role="status"
      >
        {{ documentActionMessage }}
      </p>
      <header class="panel border-l-4 border-l-brand-600">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-gray-500">Tratamento #{{ process.id }}</p>
            <h2 class="text-2xl font-bold text-gray-900">{{ process.patient_name }}</h2>
            <p class="mt-1 text-gray-600">
              {{ process.insurance_name }} · {{ process.physiotherapist_name }}
            </p>
            <p class="mt-2 font-medium">
              Início previsto: {{ date(process.expected_start_date) }} ·
              {{ process.requested_sessions }} sessões
            </p>
          </div>
          <b>{{ treatmentStatusLabel(process) }}</b>
        </div>
        <div
          v-if="process.authorization_status === 'PENDING'"
          class="mt-4 rounded-xl bg-error-50 p-4 text-sm font-medium text-error-800"
        >
          Há uma pendência do convênio que precisa ser resolvida para retomar a liberação.
        </div>
      </header>

      <section class="panel">
        <h2 class="section-title">1. Identificação</h2>
        <div class="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Paciente" :value="process.patient_name" /><Info
            label="Convênio"
            :value="process.insurance_name"
          /><Info label="Fisioterapeuta" :value="process.physiotherapist_name" /><Info
            label="Médico solicitante"
            :value="process.doctor_name || 'Não informado'"
          /><Info label="Data da avaliação" :value="date(process.assessment_date)" /><Info
            label="Início previsto"
            :value="date(process.expected_start_date)"
          /><Info label="Sessões solicitadas" :value="String(process.requested_sessions)" /><Info
            label="Prioridade"
            :value="priorityLabel(process.priority)"
          />
        </div>
      </section>

      <section class="panel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="section-title mb-1">Avaliação fisioterapêutica digital</h2>
            <p class="text-sm text-gray-600">
              Dados clínicos: <b>{{ evaluationStatus }}</b>
            </p>
          </div>
          <button v-if="canEdit" class="btn-secondary" @click="evaluationOpen = !evaluationOpen">
            {{
              evaluationOpen ? 'Fechar' : evaluation ? 'Continuar avaliação' : 'Avaliar paciente'
            }}
          </button>
        </div>
        <form v-if="evaluationOpen" class="evaluation-grid mt-5 border-t pt-5" @submit.prevent>
          <label class="field full"
            >Queixa principal<textarea
              v-model="evaluationForm.chief_complaint"
              class="input min-h-20"
            />
          </label>
          <label class="field full"
            >História do quadro atual<textarea
              v-model="evaluationForm.current_history"
              class="input"
            />
          </label>
          <label class="field half"
            >Limitações funcionais<textarea
              v-model="evaluationForm.functional_limitations"
              class="input"
            />
          </label>
          <label class="field half"
            >Exame físico / achados<textarea v-model="evaluationForm.physical_exam" class="input" />
          </label>
          <label class="field"
            >Dor EVA (0–10)<input
              v-model.number="evaluationForm.pain_score"
              type="number"
              min="0"
              max="10"
              class="input"
          /></label>
          <label class="field"
            >Classificação da dor<input v-model="evaluationForm.pain_classification" class="input"
          /></label>
          <label class="field half"
            >Localização predominante<input v-model="evaluationForm.pain_location" class="input"
          /></label>
          <label class="field"
            >Gravidade<select v-model="evaluationForm.severity" class="input">
              <option value="">Selecione</option>
              <option value="MILD">Leve</option>
              <option value="MODERATE">Moderada</option>
              <option value="SEVERE">Grave</option>
            </select></label
          >
          <label class="field"
            >Risco assistencial<select v-model="evaluationForm.care_risk" class="input">
              <option value="">Selecione</option>
              <option value="LOW">Baixo</option>
              <option value="MODERATE">Moderado</option>
              <option value="HIGH">Alto</option>
            </select></label
          >
          <label class="field half"
            >Justificativa da gravidade<input
              v-model="evaluationForm.severity_justification"
              class="input"
          /></label>
          <fieldset class="choice-box full">
            <legend>Regiões e lateralidade</legend>
            <div class="choice-grid">
              <label v-for="region in regions" :key="region"
                ><input
                  type="checkbox"
                  :checked="hasRegion(region)"
                  @change="toggleRegion(region)"
                />
                {{ region }}</label
              >
            </div>
          </fieldset>
          <fieldset class="choice-box full">
            <legend>Riscos / precauções</legend>
            <div class="choice-grid">
              <label v-for="item in precautions" :key="item"
                ><input v-model="evaluationForm.precautions" type="checkbox" :value="item" />
                {{ item }}</label
              >
            </div>
          </fieldset>
          <label class="field full"
            >Observações / cuidados específicos<textarea
              v-model="evaluationForm.specific_care_notes"
              class="input"
            />
          </label>
          <label class="field full"
            >Objetivos terapêuticos<textarea
              v-model="evaluationForm.therapeutic_goals"
              class="input"
            />
          </label>
          <fieldset class="choice-box full">
            <legend>Condutas</legend>
            <div class="choice-grid">
              <label v-for="item in conducts" :key="item"
                ><input v-model="evaluationForm.conducts" type="checkbox" :value="item" />
                {{ item }}</label
              >
            </div>
          </fieldset>
          <label class="field full"
            >Descrição / parâmetros / progressão<textarea
              v-model="evaluationForm.conduct_description"
              class="input"
            />
          </label>
          <label class="field"
            >Previsão de reavaliação<input
              v-model="evaluationForm.reevaluation_date"
              type="date"
              class="input"
          /></label>
          <label class="field half"
            >Critério / observação<input v-model="evaluationForm.reevaluation_notes" class="input"
          /></label>
          <label class="field"
            >Acompanhamento individualizado<select
              v-model="evaluationForm.individual_monitoring"
              class="input"
            >
              <option :value="null">Selecione</option>
              <option :value="true">Sim</option>
              <option :value="false">Não</option>
            </select></label
          >
          <div class="full flex flex-wrap gap-2">
            <button class="btn-secondary" :disabled="savingEvaluation" @click="saveEvaluation">
              Salvar rascunho</button
            ><button class="btn" :disabled="savingEvaluation" @click="completeEvaluation">
              Concluir avaliação
            </button>
          </div>
          <p
            v-if="evaluationMessage"
            class="full text-sm font-semibold"
            :class="evaluationError ? 'text-error-700' : 'text-success-700'"
          >
            {{ evaluationMessage }}
          </p>
        </form>
      </section>

      <section class="panel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="section-title mb-1">2. Documentos para liberação</h2>
            <p class="font-semibold">
              Documentação: {{ requiredPresent }}/{{ requiredTypes.length }} obrigatórios completos
            </p>
            <p v-if="missingLabels.length" class="mt-1 text-sm text-error-700">
              Falta: {{ missingLabels.join(', ') }}
            </p>
          </div>
          <StatusBadge :value="process.document_status" :labels="documentStatusLabels" />
        </div>
        <div
          class="my-4 rounded-xl p-3 text-sm"
          :class="
            process.document_status === 'COMPLETE'
              ? 'bg-success-50 text-success-800'
              : 'bg-warning-50 text-warning-800'
          "
        >
          {{
            process.document_status === 'COMPLETE'
              ? 'Documentação completa. Processo disponível para liberação.'
              : 'Este processo ainda está sendo preparado pela recepção.'
          }}
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="type in documentTypes" :key="type" class="rounded-xl border p-4">
            <div class="flex justify-between gap-2">
              <b>{{ documentTypeLabels[type] }}</b
              ><span
                class="text-xs font-semibold"
                :class="docs(type).length ? 'text-success-700' : 'text-error-700'"
                >{{ docs(type).length ? '✓ Presente' : '○ Pendente' }}</span
              >
            </div>
            <div v-for="doc in docs(type)" :key="doc.id" class="mt-2 text-sm">
              <p class="text-xs font-semibold text-gray-500">
                {{
                  doc.document_role === 'GENERATED' ? 'Preparado pela Realmed' : 'Original recebido'
                }}
              </p>
              <p class="truncate" :title="doc.original_name">{{ doc.original_name }}</p>
              <p class="text-xs text-gray-500">
                {{ date(doc.created_at) }} · {{ doc.uploaded_by_name }}
              </p>
              <div class="mt-2 flex gap-3">
                <button class="link" @click="download(doc.id)">Visualizar</button
                ><button
                  v-if="doc.document_role === 'RECEIVED' && canEdit"
                  class="link"
                  @click="markUsable(doc.id, true)"
                >
                  Adequado</button
                ><button
                  v-if="doc.document_role === 'RECEIVED' && canEdit"
                  class="link"
                  @click="markUsable(doc.id, false)"
                >
                  Necessita ajuste</button
                ><button
                  v-if="canEdit"
                  class="text-xs font-medium text-error-600"
                  @click="removeDocument(doc.id)"
                >
                  Remover
                </button>
              </div>
            </div>
            <div v-if="generatable.includes(type)" class="mt-3">
              <p v-if="!templatesFor(type).length" class="text-sm font-medium text-warning-700">
                Modelo não configurado.
              </p>
              <p v-else-if="templatesFor(type).length === 1" class="text-xs text-gray-500">
                Modelo: {{ templatesFor(type)[0].name }} v{{ templatesFor(type)[0].version }}
              </p>
              <select v-else v-model="selectedTemplates[type]" class="input w-full text-sm">
                <option value="">Selecionar modelo</option>
                <option
                  v-for="template in templatesFor(type)"
                  :key="template.id"
                  :value="template.id"
                >
                  {{ template.name }} v{{ template.version }}
                </option>
              </select>
              <div class="mt-2 flex gap-3">
                <button
                  class="link disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!selectedTemplates[type]"
                  @click="preview(type)"
                >
                  Pré-visualizar</button
                ><button
                  v-if="canEdit"
                  class="link disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!selectedTemplates[type]"
                  @click="generate(type)"
                >
                  {{ generatedDocs(type).length ? 'Gerar nova versão' : 'Gerar documento' }}
                </button>
              </div>
            </div>
            <label v-if="canEdit" class="btn-secondary mt-3 inline-block"
              >{{ docs(type).length && type !== 'OTHER' ? 'Substituir' : 'Anexar'
              }}<input
                class="hidden"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                @change="upload($event, type)"
            /></label>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="section-title mb-1">Ficha de Avaliação Fisioterapêutica</h2>
            <p class="text-sm text-gray-600">
              PDF A4 de duas páginas pré-preenchido com os dados atualmente salvos no tratamento.
            </p>
            <p
              class="mt-1 text-sm font-semibold"
              :class="evaluationDocs.length ? 'text-success-700' : 'text-gray-500'"
            >
              {{
                evaluationDocs.length
                  ? `Gerada · Atualizada em ${dateTime(evaluationDocs[0].created_at)}`
                  : 'Não gerada'
              }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary" @click="previewEvaluation">Visualizar prévia</button
            ><button
              v-if="canEdit"
              class="btn"
              :disabled="generatingEvaluation"
              @click="generateEvaluation"
            >
              {{ evaluationDocs.length ? 'Gerar nova versão' : 'Gerar' }}
            </button>
          </div>
        </div>
        <div v-if="evaluationDocs.length" class="mt-4 overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Versão</th>
                <th>Gerada em</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(doc, index) in evaluationDocs" :key="doc.id">
                <td class="font-semibold">
                  v{{ doc.document_version || evaluationDocs.length - index }}
                </td>
                <td>{{ dateTime(doc.created_at) }}</td>
                <td>{{ index === 0 ? 'Atual' : 'Histórico' }}</td>
                <td>
                  <div class="flex gap-3">
                    <button class="link" @click="download(doc.id)">Visualizar</button
                    ><button class="link" @click="download(doc.id)">Baixar</button
                    ><button class="link" @click="printDocument(doc.id)">Imprimir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="section-title mb-1">3. Liberação</h2>
            <StatusBadge
              :value="process.authorization_status"
              :labels="authorizationStatusLabels"
            />
          </div>
          <button
            v-if="process.authorization_status === 'READY' && canAuthorize"
            class="btn px-6 py-3"
            :disabled="forwardingMissing.length > 0"
            :title="
              forwardingMissing.length
                ? 'Complete os dados obrigatórios e a documentação antes de encaminhar ao convênio.'
                : ''
            "
            @click="startAuthorization"
          >
            Encaminhar ao Convênio</button
          ><button
            v-if="process.authorization_status === 'PENDING' && canAuthorize"
            class="btn"
            @click="resumeAuthorization"
          >
            Retomar liberação
          </button>
        </div>
        <p v-if="process.authorization_status === 'READY'" class="mt-4 text-sm text-gray-600">
          Confira os documentos acima e inicie explicitamente o trabalho de liberação.
        </p>
        <div
          v-if="forwardingMissing.length"
          class="mt-3 rounded-xl bg-warning-50 p-3 text-sm text-warning-800"
        >
          <b>Complete antes de encaminhar:</b> {{ forwardingMissing.join(', ') }}.
        </div>
        <form
          v-if="process.authorization_status === 'IN_PROGRESS'"
          class="mt-5 grid gap-3 border-t pt-5 md:grid-cols-2 xl:grid-cols-3"
          @submit.prevent
        >
          <label class="filter-label"
            >Número da autorização<input
              v-model="authorization.authorization_number"
              class="input" /></label
          ><label class="filter-label"
            >Data da autorização<input
              v-model="authorization.authorization_date"
              type="date"
              class="input" /></label
          ><label class="filter-label"
            >Validade<input
              v-model="authorization.expiration_date"
              type="date"
              class="input" /></label
          ><label class="filter-label"
            >Quantidade autorizada<input
              v-model.number="authorization.authorized_sessions"
              type="number"
              min="0"
              class="input" /></label
          ><label class="filter-label md:col-span-2"
            >Observações<textarea v-model="authorization.notes" class="input min-h-20"></textarea>
          </label>
          <div v-if="canAuthorize" class="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
            <button
              v-if="process.authorization_status === 'IN_PROGRESS'"
              class="btn-secondary"
              @click="pendingModal = true"
            >
              Registrar pendência</button
            ><button
              class="btn bg-success-600 hover:bg-success-700"
              @click="saveAuthorization('AUTHORIZED')"
            >
              Liberar</button
            ><button
              class="btn bg-error-600 hover:bg-error-700"
              @click="saveAuthorization('DENIED')"
            >
              Negar
            </button>
          </div>
        </form>
        <div v-if="process.pendingItems.length" class="mt-5 border-t pt-4">
          <h3 class="font-semibold">Pendências do convênio</h3>
          <div
            v-for="item in process.pendingItems"
            :key="item.id"
            class="mt-2 rounded-lg bg-gray-50 p-3 text-sm"
          >
            <div class="flex justify-between gap-2">
              <b>{{ item.description }}</b
              ><span>{{
                pendingStatusLabels[item.status as keyof typeof pendingStatusLabels]
              }}</span>
            </div>
            <p v-if="item.notes" class="mt-1 text-gray-600">{{ item.notes }}</p>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2 class="section-title">4. Tratamento</h2>
        <div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
          <Info label="Solicitadas" :value="String(process.requested_sessions)" /><Info
            label="Autorizadas"
            :value="String(process.authorized_sessions ?? '—')"
          /><Info label="Realizadas" :value="String(process.performed_sessions)" /><Info
            label="Restantes"
            :value="
              String(Math.max(0, (process.authorized_sessions || 0) - process.performed_sessions))
            "
          />
          <div>
            <span class="text-gray-500">Status</span><br /><StatusBadge
              :value="process.treatment_status"
              :labels="treatmentStatusLabels"
            />
          </div>
        </div>
      </section>

      <section class="panel">
        <h2 class="section-title">5. Histórico</h2>
        <div
          v-for="item in process.history"
          :key="item.id"
          class="relative border-l-2 border-blue-200 py-2 pl-5"
        >
          <b>{{ historyLabels[item.action] || 'Atualização do processo' }}</b>
          <p class="text-sm text-gray-500">
            {{ item.user_name || 'Sistema' }} ·
            {{ new Date(item.created_at).toLocaleString('pt-BR') }}
          </p>
          <p v-if="item.field" class="text-sm text-gray-600">
            {{ translatedValue(item.old_value) }} → {{ translatedValue(item.new_value) }}
          </p>
        </div>
      </section>
    </div>

    <div
      v-if="pendingModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        @submit.prevent="registerPending"
      >
        <h2 class="text-xl font-bold">Registrar pendência do convênio</h2>
        <p class="mt-1 text-sm text-gray-500">
          O processo será movido para a fila “Com pendência”.
        </p>
        <label class="filter-label mt-5"
          >Descrição<input v-model="pending.description" class="input" required /></label
        ><label class="filter-label mt-3"
          >Observação<textarea v-model="pending.notes" class="input min-h-24"></textarea>
        </label>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="pendingModal = false">Cancelar</button
          ><button class="btn">Registrar pendência</button>
        </div>
      </form>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import {
  authorizationStatusLabels,
  documentStatusLabels,
  documentTypeLabels,
  historyLabels,
  labelFor,
  pendingStatusLabels,
  treatmentStatusLabels,
} from '@/utils/guideLabels'
import { treatmentStatusLabel } from '@/utils/treatmentStatus'
const Info = defineComponent({
  props: { label: String, value: String },
  setup(props) {
    return () =>
      h('p', [
        h('span', { class: 'text-gray-500' }, props.label),
        h('br'),
        h('b', { class: 'text-gray-900' }, props.value),
      ])
  },
})
const route = useRoute(),
  { canOperational } = useAuthUser(),
  process = ref<any>(),
  templates = ref<any[]>([]),
  selectedTemplates = reactive<Record<string, number | string>>({}),
  pendingModal = ref(false),
  generatingEvaluation = ref(false),
  evaluation = ref<any>(null),
  evaluationOpen = ref(false),
  savingEvaluation = ref(false),
  evaluationMessage = ref(''),
  evaluationError = ref(false),
  documentActionMessage = ref(''),
  documentActionError = ref(false),
  evaluationForm = reactive<any>({
    precautions: [],
    conducts: [],
    regions: [],
    individual_monitoring: null,
  }),
  pending = reactive({ description: '', notes: '' }),
  authorization = reactive<any>({
    authorization_number: '',
    authorization_date: '',
    expiration_date: '',
    authorized_sessions: null,
    notes: '',
  })
const requiredTypes = ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'PHYSIO_ASSESSMENT'],
  documentTypes = (
    Object.keys(documentTypeLabels) as Array<keyof typeof documentTypeLabels>
  ).filter((type) => type !== 'PHYSIOTHERAPY_EVALUATION'),
  generatable = ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION']
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
const evaluationStatus = computed(() =>
  evaluation.value?.status === 'COMPLETED'
    ? 'Concluídos'
    : evaluation.value
      ? 'Em preenchimento'
      : 'Não iniciados',
)
const canEdit = computed(() => canOperational('guide_processes', 'canEdit')),
  canAuthorize = computed(() => canOperational('authorizations', 'canEdit'))
const saveNotice = computed(() => route.query.saved === '1')
const uploadFailures = computed(() => Number(route.query.uploadFailures || 0))
const forwardingMissing = computed(() => {
  if (!process.value) return []
  const missing: string[] = []
  if (!process.value.patient_insurance_id) missing.push('convênio e plano')
  if (!process.value.requesting_doctor_id) missing.push('médico solicitante')
  if (!process.value.physiotherapist_id) missing.push('fisioterapeuta')
  if (!process.value.requested_sessions) missing.push('sessões')
  if (process.value.document_status !== 'COMPLETE') missing.push('documentação obrigatória')
  if (evaluation.value?.status !== 'COMPLETED') missing.push('avaliação concluída')
  return missing
})
const usableDocs = (type: string) =>
  docs(type).filter(
    (d: any) => d.document_role === 'GENERATED' || d.is_usable === true || d.is_usable === 1,
  )
const evaluationDocs = computed(() =>
  docs('PHYSIOTHERAPY_EVALUATION').sort(
    (a: any, b: any) => Number(b.document_version || 0) - Number(a.document_version || 0),
  ),
)
const requiredPresent = computed(
    () => requiredTypes.filter((type) => usableDocs(type).length).length,
  ),
  missingLabels = computed(() =>
    requiredTypes
      .filter((type) => !usableDocs(type).length)
      .map((type) => documentTypeLabels[type as keyof typeof documentTypeLabels]),
  )
const savePendingItems = computed(() => {
  const items: string[] = [...missingLabels.value]
  if (!process.value?.physiotherapist_id) items.push('fisioterapeuta não informado')
  if (!process.value?.requesting_doctor_id) items.push('médico solicitante não informado')
  if (!process.value?.patient_insurance_id) items.push('convênio e plano não informados')
  if (!process.value?.requested_sessions) items.push('quantidade de sessões não informada')
  return items
})
const date = (value: string) =>
    value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—',
  docs = (type: string) =>
    process.value?.documents.filter((d: any) => d.document_type === type) || [],
  generatedDocs = (type: string) => docs(type).filter((d: any) => d.document_role === 'GENERATED'),
  priorityLabel = (value: number) =>
    Number(value) >= 2 ? 'Urgente' : Number(value) === 1 ? 'Alta' : 'Normal'
const dateTime = (value: string) => (value ? new Date(value).toLocaleString('pt-BR') : '—')
function translatedValue(value: string) {
  return labelFor(
    { ...authorizationStatusLabels, ...documentStatusLabels, ...treatmentStatusLabels },
    value,
  )
}
async function load() {
  process.value = (await api.get(`/guide-processes/${route.params.id}`)).data
  evaluation.value = (await api.get(`/guide-processes/${route.params.id}/evaluation`)).data
  Object.assign(
    evaluationForm,
    {
      precautions: [],
      conducts: [],
      regions: [],
      individual_monitoring: null,
      physiotherapist_id: process.value.physiotherapist_id,
      evaluation_date:
        process.value.assessment_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    },
    evaluation.value || {},
  )
  templates.value = (await api.get('/document-templates', { params: { active: true } })).data
  const latest = process.value.authorizations[0]
  if (latest) Object.assign(authorization, latest)
  for (const type of generatable) {
    const matches = templatesFor(type)
    if (matches.length === 1) selectedTemplates[type] = matches[0].id
  }
}
function hasRegion(region: string) {
  return evaluationForm.regions.some((item: any) => item.region === region)
}
function toggleRegion(region: string) {
  const index = evaluationForm.regions.findIndex((item: any) => item.region === region)
  if (index >= 0) evaluationForm.regions.splice(index, 1)
  else evaluationForm.regions.push({ region, laterality: 'BILATERAL' })
}
async function saveEvaluation() {
  savingEvaluation.value = true
  evaluationMessage.value = ''
  evaluationError.value = false
  try {
    const response = await api[evaluation.value ? 'put' : 'post'](
      `/guide-processes/${route.params.id}/evaluation`,
      evaluationForm,
    )
    evaluation.value = response.data
    evaluationMessage.value = 'Rascunho salvo com sucesso.'
  } catch (error: any) {
    evaluationError.value = true
    evaluationMessage.value = error.response?.data?.error || 'Não foi possível salvar a avaliação.'
  } finally {
    savingEvaluation.value = false
  }
}
async function completeEvaluation() {
  await saveEvaluation()
  if (evaluationError.value) return
  savingEvaluation.value = true
  try {
    evaluation.value = (
      await api.post(`/guide-processes/${route.params.id}/evaluation/complete`)
    ).data
    evaluationMessage.value = 'Avaliação concluída.'
    await load()
  } catch (error: any) {
    evaluationError.value = true
    evaluationMessage.value =
      error.response?.data?.error || 'Não foi possível concluir a avaliação.'
  } finally {
    savingEvaluation.value = false
  }
}
function templatesFor(type: string) {
  return templates.value.filter(
    (t) =>
      t.document_type === type &&
      (t.insurance_provider_id == null ||
        Number(t.insurance_provider_id) === Number(process.value.insurance_provider_id)),
  )
}
async function startAuthorization() {
  if (!window.confirm('Confirmar o início da liberação deste processo?')) return
  await api.post(`/guide-processes/${route.params.id}/authorization/start`)
  await load()
}
async function registerPending() {
  await api.post(`/guide-processes/${route.params.id}/pending-items`, pending)
  pending.description = ''
  pending.notes = ''
  pendingModal.value = false
  await load()
}
async function resumeAuthorization() {
  const open = process.value.pendingItems.filter((item: any) => item.status === 'OPEN')
  for (const item of open) await api.patch(`/pending-items/${item.id}/resolve`, {})
  await load()
}
async function saveAuthorization(status: string) {
  const payload = { ...authorization, status, requested_sessions: process.value.requested_sessions }
  const latest = process.value.authorizations[0]
  if (latest) await api.put(`/authorizations/${latest.id}`, payload)
  else await api.post(`/guide-processes/${route.params.id}/authorizations`, payload)
  await load()
}
async function download(id: number) {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' })
  window.open(URL.createObjectURL(response.data), '_blank')
}
async function markUsable(id: number, is_usable: boolean) {
  await api.patch(`/documents/${id}/usability`, { is_usable })
  await load()
}
async function removeDocument(id: number) {
  if (window.confirm('Remover este documento? O processo poderá voltar para preparação.')) {
    await api.delete(`/documents/${id}`)
    await load()
  }
}
async function preview(type: string) {
  if (!selectedTemplates[type]) return showDocumentError('Selecione um modelo para pré-visualizar.')
  clearDocumentMessage()
  try {
    const response = await api.post(
      `/guide-processes/${route.params.id}/documents/preview`,
      { template_id: selectedTemplates[type] },
      { responseType: 'blob' },
    )
    window.open(URL.createObjectURL(response.data), '_blank')
  } catch (error: any) {
    await showGenerationError(error)
  }
}
async function generate(type: string) {
  if (!selectedTemplates[type])
    return showDocumentError('Selecione um modelo para gerar o documento.')
  clearDocumentMessage()
  try {
    await api.post(`/guide-processes/${route.params.id}/documents/generate`, {
      template_id: selectedTemplates[type],
    })
    documentActionMessage.value = 'Documento gerado com sucesso.'
    await load()
  } catch (error: any) {
    await showGenerationError(error)
  }
}
function clearDocumentMessage() {
  documentActionMessage.value = ''
  documentActionError.value = false
}
function showDocumentError(message: string) {
  documentActionError.value = true
  documentActionMessage.value = message
}
async function showGenerationError(error: any) {
  let payload = error.response?.data
  if (payload instanceof Blob) {
    try {
      payload = JSON.parse(await payload.text())
    } catch {
      payload = null
    }
  }
  const missing = Array.isArray(payload?.missing) ? payload.missing : []
  showDocumentError(
    missing.length
      ? `Não foi possível gerar a guia. Faltam: ${missing.join(', ')}.`
      : payload?.error || 'Não foi possível gerar o documento.',
  )
}
async function previewEvaluation() {
  const response = await api.post(
    `/guide-processes/${route.params.id}/physiotherapy-evaluation/preview`,
    {},
    { responseType: 'blob' },
  )
  window.open(URL.createObjectURL(response.data), '_blank')
}
async function generateEvaluation() {
  generatingEvaluation.value = true
  try {
    await api.post(`/guide-processes/${route.params.id}/physiotherapy-evaluation/generate`)
    await load()
  } finally {
    generatingEvaluation.value = false
  }
}
async function printDocument(id: number) {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' })
  const popup = window.open(URL.createObjectURL(response.data), '_blank')
  popup?.addEventListener('load', () => popup.print())
}
async function upload(event: Event, type: string) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  await api.post(`/guide-processes/${route.params.id}/documents`, file, {
    params: { documentType: type },
    headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
  })
  await load()
}
onMounted(load)
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
.evaluation-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}
.evaluation-grid .half {
  grid-column: span 2;
}
.evaluation-grid .full {
  grid-column: 1 / -1;
}
.choice-box {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
}
.choice-box legend {
  padding: 0 0.35rem;
  font-weight: 600;
  color: #475467;
}
.choice-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  font-size: 0.875rem;
}
@media (max-width: 768px) {
  .evaluation-grid {
    grid-template-columns: 1fr;
  }
  .evaluation-grid .half,
  .evaluation-grid .full {
    grid-column: 1;
  }
  .choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
