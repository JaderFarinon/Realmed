<template>
  <PageShell
    :style="{ '--treatment-context-offset': `${contextHeight + 24}px` }"
    title="Tratamento"
    subtitle="Documentos para liberação e acompanhamento pelo faturamento"
    >

    <div v-if="process" ref="contextCard" class="treatment-context">
      <section class="treatment-identity" aria-labelledby="treatment-patient-name">
        <div class="treatment-identity-heading">
          <div class="min-w-0">
            <p class="treatment-identity-reference">Tratamento #{{ process.treatment_root_id || process.id }} · Guia {{ process.guide_number || 1 }}</p>
            <h2 id="treatment-patient-name">{{ process.patient_name }}</h2>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <span class="treatment-identity-status">{{ process.authorization_status === 'PENDING' ? 'Pendência do convênio' : treatmentStatusLabel(process) }}</span>
            <GuideContinuity v-if="process.billing_due && canOperational('authorizations','canEdit')" :key="process.id" :process="process" :can-edit="!startingEdit && !hasLocalDraft()" billing-entry @open-guide="openRelatedGuide" />
          </div>
        </div>
        <dl class="treatment-identity-details">
          <div><dt>Convênio</dt><dd>{{ process.insurance_name || 'Não informado' }}</dd></div>
          <div><dt>Fisioterapeuta</dt><dd>{{ process.physiotherapist_name || 'Não informado' }}</dd></div>
          <div><dt>Avaliação</dt><dd>{{ date(process.assessment_date) }}</dd></div>
        </dl>
        <dl class="treatment-identity-sessions" aria-label="Sessões do tratamento">
          <div><dt>Solicitadas</dt><dd>{{ process.requested_sessions ?? '—' }}</dd></div>
          <div><dt>Autorizadas</dt><dd>{{ process.authorized_sessions ?? '—' }}</dd></div>
          <div><dt>Realizadas</dt><dd>{{ process.performed_sessions ?? 0 }}</dd></div>
          <div><dt>Restantes</dt><dd>{{ process.authorized_sessions == null ? '—' : Math.max(0, Number(process.authorized_sessions) - Number(process.performed_sessions || 0)) }}</dd></div>
        </dl>
        <details class="treatment-identity-more" :open="identificationOpen" @toggle="identificationOpen = ($event.target as HTMLDetailsElement).open">
          <summary>Mais informações do tratamento</summary>
          <div class="treatment-identity-more-body">
          <div class="grid gap-3 py-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Médico solicitante" :value="process.doctor_name || 'Não informado'" />
            <Info label="Início previsto" :value="date(process.expected_start_date)" />
            <Info label="Prioridade" :value="priorityLabel(process.priority)" />
            <div><span class="text-gray-500">Situação do tratamento</span><br /><StatusBadge :value="process.treatment_status" :labels="treatmentStatusLabels" /></div>
          </div>
          <p v-if="process.authorization_status === 'PENDING'" class="text-sm text-error-700">Há uma pendência do convênio que precisa ser resolvida para retomar a liberação.</p>
          <div v-if="canEdit" class="flex flex-wrap justify-end gap-3 py-2">
            <button type="button" class="btn-secondary" :disabled="refreshingPatient || stageClosed('reception')" :title="stageClosed('reception') ? 'Reabra os Dados da recepção para atualizar o paciente.' : 'Atualizar dados do paciente'" @click="refreshPatient">{{ refreshingPatient ? 'Atualizando dados…' : 'Atualizar dados do Stenci' }}</button>
            <TreatmentStageActions v-if="activeTreatmentTab === 'billing'" :process="process" stage="treatment" title="Acompanhamento do tratamento" :can-edit="canEdit" :disabled="!tabUnlocked('billing')" @updated="stageUpdated" />
          </div>
          </div>
        </details>
    <div v-if="activeTreatmentTab !== 'history'" class="treatment-edit-notice rounded-xl border px-4 py-2" :class="editingLock.locked && !editingOwned ? 'border-warning-300 bg-warning-50' : 'border-blue-200 bg-blue-50'" role="status" aria-live="polite">
      <div>
      <p v-if="editingLock.locked && !editingOwned" class="font-semibold">Em edição por {{ editingLock.owner || 'outro usuário' }} · Somente leitura</p>
      <p v-else-if="editingOwned">Você está editando a aba {{ activeTabLabel }}. Outros usuários só podem visualizar.</p>
      <p v-else>{{ activeTabLabel }}</p>


      <p class="sr-only">{{ liveConnected ? 'Atualização automática conectada.' : 'Reconectando atualização automática…' }}</p>
      </div>
      <button v-if="mayEditActiveTab && !editingOwned && !editingLock.locked" type="button" class="btn-secondary shrink-0" :disabled="editLockBusy" @click="beginEditing">Editar aba</button>
      <button v-if="editingOwned" type="button" class="btn-secondary shrink-0" :disabled="editLockBusy || startingEdit || hasLocalDraft()" @click="finishEditing">Terminar edição</button>
    </div>
      </section>
    </div>
    <div v-if="process" :key="process.id" class="space-y-3">
      <section class="treatment-stage-workspace" aria-label="Etapas do tratamento" @pointerdown.capture="explainReadonlyField" @keydown.capture="explainReadonlyKeyboard">
        <p class="text-sm text-gray-500">
          <span class="text-error-600" aria-hidden="true">*</span> Campo exigido pelas regras da
          etapa. É possível salvar rascunhos incompletos quando permitido.
        </p>
        <p class="mb-3 text-sm text-gray-600">Finalize cada etapa para liberar a próxima: Recepção → Avaliação → Central de Guias → Liberação → Faturamento. As etapas cinza ainda estão bloqueadas.</p>
        <div class="treatment-tabs" role="tablist" aria-label="Etapas do tratamento">
          <button
            v-for="tab in treatmentTabs"
            :key="tab.key"
            :id="'treatment-tab-' + tab.key"
            type="button"
            role="tab"
            :aria-selected="activeTreatmentTab === tab.key"
            :aria-controls="'treatment-tabpanel-' + tab.key"
            :tabindex="activeTreatmentTab === tab.key ? 0 : -1"
            :aria-disabled="tab.locked"
            :title="tab.locked ? `Conclua ${tab.blockedBy} antes de abrir esta etapa.` : tab.label"
            class="treatment-tab"
            :class="{ 'is-active': activeTreatmentTab === tab.key, 'is-complete': tab.complete }"
            @click="tab.locked ? alertLockedStage(tab.blockedBy) : selectTreatmentTab(tab.key)"
            @keydown="tabKeydown($event, tab.key)"
          >
            <span v-if="tab.complete" aria-label="Etapa finalizada">✓</span> {{ tab.label }}
          </button>
        </div>
        <TreatmentPreparation
          ref="preparationCard"
          :active-stage="activeTreatmentTab"
          :process="process"
          :can-edit="canEdit"
          :can-finalize-reception="canOperational('guide_processes', 'canEdit')"
          :prepare-reception-finalize="prepareReceptionFinalize"
          :can-create="editingOwned && !startingEdit && canOperational('guide_processes', 'canCreate')"
          :can-delete="editingOwned && !startingEdit && canOperational('guide_processes', 'canDelete')"
          :documents-busy="Object.values(generatingDocuments).some(Boolean) || codeReviewOpen || preparingDocuments"
          @updated="preparationUpdated"
          @stage-updated="stageUpdated"
        >
          <template #documents>
            <h3 id="treatment-documents" class="scroll-mt-4">Documentos para liberação</h3>
            <p class="mb-4 rounded-xl bg-blue-50 p-4" role="status">
              {{
                process.continuation_of_id
                  ? 'Continuidade: organize a nova guia. Não é necessária outra avaliação.'
                  : evaluation?.status === 'COMPLETED'
                  ? 'Avaliação concluída — Central de Guias: revisar os dados e organizar a documentação.'
                  : 'Aguardando avaliação fisioterapêutica e definição da agenda.'
              }}
            </p>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-semibold">
                  Documentação: {{ requiredPresent }}/{{ requiredTypes.length }} obrigatórios
                  completos
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
                requiredPresent === requiredTypes.length
                  ? 'Documentação completa. Confira também os procedimentos antes de finalizar a Central de Guias.'
                  : 'A Central de Guias organiza a documentação após a avaliação.'
              }}
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="type in documentTypes"
                :key="type"
                :id="'treatment-' + process.id + '-document-' + type"
                tabindex="-1"
                :aria-label="documentTypeLabels[type]"
                class="rounded-xl border p-4 scroll-mt-24"
              >
                <p class="mb-1 text-xs text-gray-500">
                  <input v-if="generatable.includes(type)" v-model="selectedGuideTypes" :value="type" type="checkbox" class="float-right h-5 w-5" :disabled="!canEditDocuments || codeReviewOpen" :aria-label="'Selecionar ' + documentTypeLabels[type] + ' para guia unificada'" />
                  {{
                    requiredTypes.includes(type)
                      ? 'Obrigatória'
                      : 'Opcional — não impede o andamento'
                  }}
                </p>
                <div class="flex justify-between gap-2">
                  <b
                    ><FieldLabel
                      :required="requiredTypes.includes(type)"
                      reason="Guia obrigatória para concluir a documentação e encaminhar ao convênio."
                      >{{ documentTypeLabels[type] }}</FieldLabel
                    ></b
                  ><span
                    class="text-xs font-semibold"
                    :class="
                      docs(type).length
                        ? 'text-success-700'
                        : requiredTypes.includes(type)
                          ? 'text-error-700'
                          : 'text-gray-500'
                    "
                    >{{
                      docs(type).length
                        ? '✓ Presente'
                        : requiredTypes.includes(type)
                          ? '○ Pendente'
                          : 'Opcional'
                    }}</span
                  >
                </div>
                <div v-for="doc in docs(type)" :key="doc.id" class="mt-2 text-sm">
                  <p class="text-xs font-semibold text-gray-500">
                    {{
                      doc.document_role === 'GENERATED'
                        ? 'Preparado pela Realmed'
                        : 'Original recebido'
                    }}
                  </p>
                  <p class="truncate" :title="doc.original_name">{{ doc.original_name }}</p>
                  <p class="text-xs text-gray-500">
                    {{ date(doc.created_at) }} · {{ doc.uploaded_by_name }}
                  </p>
                  <TableActionToolbar class="mt-2" :label="'Ações de ' + doc.original_name" :actions="[
                    { icon: 'eye', label: 'Visualizar ' + doc.original_name, onClick: () => download(doc.id) },
                    ...(doc.document_role === 'RECEIVED' && canEditDocuments ? [
                      { icon: 'check', label: 'Marcar documento como adequado', onClick: () => markUsable(doc.id, true) },
                      { icon: 'edit', label: 'Marcar documento como necessita ajuste', onClick: () => markUsable(doc.id, false) },
                      ...(generatable.includes(type) ? [{ icon: 'scan', label: 'Ler original e ajustar códigos', disabled: !selectedTemplates[type], onClick: () => openCodeReview(type, doc.id) }] : []),
                    ] : []),
                    ...(canDeleteDocuments ? [{ icon: 'delete', label: 'Remover ' + doc.original_name, variant: 'danger' as const, onClick: () => removeDocument(doc.id) }] : []),
                  ]" />
                </div>
                <div v-if="generatable.includes(type)" class="mt-3">
                  <p v-if="!templatesFor(type).length" class="text-sm font-medium text-warning-700">
                    Modelo não configurado.
                  </p>
                  <p v-else-if="templatesFor(type).length === 1" class="text-xs text-gray-500">
                    Modelo: {{ templatesFor(type)[0].name }} v{{ templatesFor(type)[0].version }}
                  </p>
                  <select
                    v-else
                    v-model="selectedTemplates[type]"
                    class="input w-full text-sm"
                    :disabled="generatingDocuments[type] || !canEditDocuments"
                    :aria-label="'Modelo para ' + documentTypeLabels[type]"
                  >
                    <option value="">Selecionar modelo</option>
                    <option
                      v-for="template in templatesFor(type)"
                      :key="template.id"
                      :value="template.id"
                    >
                      {{ template.name }} v{{ template.version }}
                    </option>
                  </select>
                  <TableActionToolbar class="mt-2" :label="'Gerar ' + documentTypeLabels[type]" :actions="[
                    { icon: 'eye', label: 'Pré-visualizar ' + documentTypeLabels[type], disabled: !canEditDocuments || !selectedTemplates[type] || generatingDocuments[type] || preparingDocuments, onClick: () => preview(type) },
                    ...(canEditDocuments ? [{ icon: 'fileAdd', label: generatingDocuments[type] ? 'Gerando guia…' : generatedDocs(type).length ? 'Gerar nova versão' : docs(type).length ? 'Gerar guia ajustada' : 'Gerar guia faltante', disabled: !selectedTemplates[type] || generatingDocuments[type] || preparingDocuments, onClick: () => openCodeReview(type) }] : []),
                  ]" />
                </div>
                <TableActionToolbar v-if="canEditDocuments" class="mt-3" :label="'Anexos de ' + documentTypeLabels[type]" :actions="[
                  { icon: docs(type).length && type !== 'OTHER' ? 'refresh' : 'attach', label: docs(type).length && type !== 'OTHER' ? 'Substituir documento' : 'Anexar documento', onClick: () => openDocumentUpload(type) },
                ]" />
                <input v-if="canEditDocuments" :id="'document-upload-' + type" class="hidden" type="file" accept=".pdf,.jpg,.jpeg,.png" :aria-label="'Anexar ' + documentTypeLabels[type]" @change="upload($event, type)" />
              </article>
            </div>
            <div v-if="selectedGuideTypes.length > 1" class="mt-4 flex justify-end">
              <button type="button" class="btn" :disabled="!canEditDocuments || codeReviewOpen || preparingDocuments" @click="openUnifiedReview">Gerar guia unificada</button>
            </div>
            <details v-if="previousEvaluationDocs.length" class="mt-4 rounded-lg border p-3">
              <summary class="cursor-pointer">Arquivos anteriores de avaliação (opcionais)</summary>
              <p class="mt-2 text-sm text-gray-500">
                Arquivos preservados para consulta. A avaliação atual é preenchida no sistema.
              </p>
              <div
                v-for="doc in previousEvaluationDocs"
                :key="doc.id"
                class="mt-2 flex flex-wrap items-center gap-3 text-sm"
              >
                <span>{{ doc.original_name }} · {{ dateTime(doc.created_at) }}</span>
                <button type="button" class="link" @click="download(doc.id)">
                  Visualizar arquivo anterior
                </button>
              </div>
            </details>
          </template>
        </TreatmentPreparation>
        <div
          v-show="activeTreatmentTab === 'evaluation'"
          id="treatment-tabpanel-evaluation"
          role="tabpanel"
          aria-labelledby="treatment-tab-evaluation"
          tabindex="0"
        >
          <p v-if="process.continuation_of_id" class="mb-4 rounded-lg bg-blue-50 p-3">Continuação em sequência: não é necessária uma nova avaliação. {{ evaluation ? `Avaliação inicial do tratamento #${process.treatment_root_id}, disponível somente para consulta.` : 'Não há ficha digital da avaliação inicial disponível neste tratamento.' }}</p>
          <PhysiotherapyEvaluation
            v-if="!process.continuation_of_id || evaluation"
            ref="evaluationCard"
            tabbed
            :active="activeTreatmentTab === 'evaluation'"
            :process="process"
            :evaluation="evaluation"
            :refreshed-patient="refreshedPatient"
            :can-edit="canEdit && !process.continuation_of_id"
            :initially-open="route.query.evaluate === '1'"
            @updated="evaluationUpdated"
            @executor-updated="executorUpdated"
          />
        </div>

        <GuideCodeReviewDialog
          :open="codeReviewOpen"
          :process-id="String(route.params.id)"
          :template-id="unifiedReviewTypes ? 'sadt-v1:' + codeReviewType : selectedTemplates[codeReviewType] || ''"
          :unified-document-types="unifiedReviewTypes"
          :document-type="codeReviewType"
          :source-document-id="codeReviewSource"
          @close="codeReviewOpen = false"
          @generated="codeGenerated"
        />
        <div
          v-show="activeTreatmentTab === 'authorization'"
          id="treatment-tabpanel-authorization"
          role="tabpanel"
          aria-labelledby="treatment-tab-authorization"
          tabindex="0"
        >
          <TreatmentStageCard
            tabbed
            :process="process"
            stage="authorization"
            title="Liberação"
            :can-edit="canAuthorize"
            :disabled="false"
            @updated="stageUpdated"
          >
            <AuthorizationWorkflow
              :process="process"
              :can-edit="canAuthorize"
              :closed="stageClosed('authorization')"
              :missing="forwardingMissing"
              @updated="authorizationUpdated"
              @open-guide="openRelatedGuide"
            >
              <template #requirements>
                <div
                  v-if="forwardingMissing.length"
                  class="mt-3 rounded-xl bg-warning-50 p-3 text-sm text-warning-800"
                >
                  <b>Complete antes de encaminhar:</b>
                  <span v-for="(item, index) in forwardingMissing" :key="item">
                    <span v-if="index">, </span>
                    <a
                      :href="'#' + forwardingTarget(item)"
                      class="font-semibold underline underline-offset-2"
                      @click.prevent="goToForwardingIssue(item)"
                      >{{ item }}</a
                    > </span
                  >.
                </div>
              </template>
            </AuthorizationWorkflow>
          </TreatmentStageCard>
        </div>
        <div v-show="activeTreatmentTab === 'billing'" id="treatment-tabpanel-billing" role="tabpanel" aria-labelledby="treatment-tab-billing" tabindex="0">
          <GuideBilling ref="billingCard" v-if="canOperational('guide_billing','canView')" :process-id="process.id" :active="activeTreatmentTab === 'billing'" :can-edit="editingOwned && !startingEdit && canOperational('guide_billing','canEdit')" @updated="billingUpdated" />
          <section v-else class="panel"><h2>Sem Permissão</h2><p>Usuário sem permissão a essa função</p></section>
        </div>
        <section
          v-show="activeTreatmentTab === 'history'"
          class="panel"
          id="treatment-tabpanel-history"
          role="tabpanel"
          aria-labelledby="treatment-tab-history"
          tabindex="0"
        >
          <h2 class="section-title">Histórico</h2>
          <div
            v-for="item in process.history"
            :key="item.id"
            class="relative border-l-2 border-blue-200 py-2 pl-5"
          >
            <b>{{ historyTitle(item) }}</b>
            <p class="text-sm text-gray-500">
              {{ item.user_name || 'Sistema' }} ·
              {{ new Date(item.created_at).toLocaleString('pt-BR') }}
            </p>
            <p v-if="historyNote(item)" class="text-sm text-gray-600">{{ historyNote(item) }}</p>
            <p v-if="item.field" class="text-sm text-gray-600">
              {{ translatedValue(item.old_value) }} → {{ translatedValue(item.new_value) }}
            </p>
          </div>
        </section>
      </section>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { useTreatmentLiveUpdates } from '@/composables/useTreatmentLiveUpdates'
import { useTreatmentEditLock } from '@/composables/useTreatmentEditLock'
/* eslint-disable @typescript-eslint/no-explicit-any */
import PhysiotherapyEvaluation from '@/components/PhysiotherapyEvaluation.vue'
import GuideBilling from '@/components/GuideBilling.vue'
import AuthorizationWorkflow from '@/components/AuthorizationWorkflow.vue'
import { computed, defineComponent, h, nextTick, onMounted, reactive, ref, watch } from 'vue'
const contextCard = ref<HTMLElement>()
const contextHeight = ref(180)
watch(contextCard, (element, _previous, cleanup) => {
  if (!element) return
  const measure = () => { contextHeight.value = element.getBoundingClientRect().height }
  const observer = new ResizeObserver(measure)
  observer.observe(element)
  measure()
  cleanup(() => observer.disconnect())
}, { flush: 'post' })
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import GuideCodeReviewDialog from '@/components/GuideCodeReviewDialog.vue'
import TableActionToolbar from '@/components/TableActionToolbar.vue'
import { notify } from '@/composables/useNotifications'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import {
  authorizationStatusLabels,
  documentStatusLabels,
  documentTypeLabels,
  historyLabels,
  labelFor,
  treatmentStatusLabels,
} from '@/utils/guideLabels'
import { treatmentStatusLabel } from '@/utils/treatmentStatus'
import TreatmentStageActions from '@/components/TreatmentStageActions.vue'
import TreatmentStageCard from '@/components/TreatmentStageCard.vue'
import { treatmentStageClosed } from '@/utils/treatmentStages'
import TreatmentPreparation from '@/components/TreatmentPreparation.vue'
import GuideContinuity from '@/components/GuideContinuity.vue'
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
const preparationCard = ref<InstanceType<typeof TreatmentPreparation>>()
const evaluationCard = ref<InstanceType<typeof PhysiotherapyEvaluation>>()

const identificationOpen = ref(false)
const codeReviewOpen = ref(false),
  codeReviewType = ref(''),
  codeReviewSource = ref<number | undefined>()
const selectedGuideTypes = ref<string[]>([])
const unifiedReviewTypes = ref<string[] | undefined>()
const preparingDocuments = ref(false)
async function persistDocumentDraft() {
  if (preparingDocuments.value || !canEditDocuments.value) return false
  preparingDocuments.value = true
  try {
    if ((await preparationCard.value?.saveDraftForDocuments()) !== true) return false
    try {
      await load()
    } catch {
      showDocumentError('Os dados salvos foram preservados, mas não foi possível atualizar os dados e modelos da guia. Tente novamente.')
      return false
    }
    return true
  } catch {
    showDocumentError('Não foi possível salvar os dados da Central antes de gerar a guia. Tente novamente.')
    return false
  } finally {
    preparingDocuments.value = false
  }
}
async function openUnifiedReview() {
  const types = ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'].filter(type => selectedGuideTypes.value.includes(type))
  if (types.length < 2 || !canEditDocuments.value) return
  if (!(await persistDocumentDraft())) return
  unifiedReviewTypes.value = types
  codeReviewType.value = types[0]!
  codeReviewSource.value = undefined
  codeReviewOpen.value = true
}
async function openCodeReview(type: string, source?: number) {
  if (!(await persistDocumentDraft())) return
  unifiedReviewTypes.value = undefined
  codeReviewType.value = type
  // Reading an attachment is explicit; normal generation uses the treatment procedures.
  codeReviewSource.value = source
  codeReviewOpen.value = true
}
async function codeGenerated() {
  documentActionMessage.value = 'Guia gerada com os códigos conferidos.'
  try {
    await load()
  } catch {
    documentActionMessage.value = 'Guia salva. Atualize a tela para consultar o arquivo.'
  }
}
const route = useRoute(),
  { canOperational } = useAuthUser(),
  process = ref<any>(),
  templates = ref<any[]>([]),
  selectedTemplates = reactive<Record<string, number | string>>({}),
  generatingDocuments = reactive<Record<string, boolean>>({}),
  evaluation = ref<any>(null),
  documentActionMessage = ref(''),
  documentActionError = ref(false)

const requiredTypes = computed(() => ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION']),
  documentTypes = (
    Object.keys(documentTypeLabels) as Array<keyof typeof documentTypeLabels>
  ).filter((type) => !['PHYSIOTHERAPY_EVALUATION', 'PHYSIO_ASSESSMENT'].includes(type)),
  generatable = ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION']
const startingEdit = ref(false)
const canEdit = computed(() => editingOwned.value && !startingEdit.value && canOperational('guide_processes', 'canEdit')),
  canAuthorize = computed(() => editingOwned.value && !startingEdit.value && canOperational('authorizations', 'canEdit'))
const stageClosed = (stage: string) => treatmentStageClosed(process.value, stage)
const canEditDocuments = computed(() => canEdit.value && !stageClosed('documents'))
const canDeleteDocuments = computed(
  () => editingOwned.value && !startingEdit.value && canOperational('guide_processes', 'canDelete') && !stageClosed('documents'),
)

async function stageUpdated(result: any) {
  process.value.workflow_stages = result.workflow_stages
  if (result.completed) editLease.release()
  try {
    await load()
  } catch {
    showDocumentError('Etapa atualizada. Atualize a página para conferir todos os dados.')
  }
}
const billingComplete = ref(false)
function billingUpdated(result: any) {
  if (result.process_id && Number(result.process_id) !== Number(process.value?.id)) return
  billingComplete.value = Boolean(result.complete)
  if (openingBilling) {
    openingBilling = false
    if (billingComplete.value && activeTreatmentTab.value === 'billing') activeTreatmentTab.value = 'history'
  }
  if (Number(result.process_id) === Number(process.value?.id) && result.billing_status) process.value = {...process.value, billing_status:result.billing_status}
}
const activeTreatmentTab = ref('reception')
let openingBilling = false
const editLease = useTreatmentEditLock(() => process.value?.id, () => activeTreatmentTab.value)
const { lock: editingLock, owned: editingOwned, busy: editLockBusy, error: editLockError } = editLease
const liveDraftNotice = ref('')
const billingCard = ref<InstanceType<typeof GuideBilling>>()
const activeTabLabel = computed(() => treatmentTabs.value.find(tab => tab.key === activeTreatmentTab.value)?.label || '')
const mayEditActiveTab = computed(() => !(activeTreatmentTab.value === 'evaluation' && process.value?.continuation_of_id) && (canOperational(activeTreatmentTab.value === 'billing' ? 'guide_billing' : activeTreatmentTab.value === 'authorization' ? 'authorizations' : 'guide_processes','canEdit') ||
  (['central','documents'].includes(activeTreatmentTab.value) && canOperational('guide_processes','canDelete')) ||
  (activeTreatmentTab.value==='central' && canOperational('guide_processes','canCreate'))))
function hasLocalDraft() { return Boolean(preparationCard.value?.hasDraft() || evaluationCard.value?.hasDraft()) }
async function beginEditing() {
  if (hasLocalDraft() && !window.confirm('Há um rascunho local. Para iniciar uma nova edição, descartá-lo e carregar os dados atuais?')) return
  startingEdit.value=true
  try {
  if (await editLease.acquire()) {
    try {
      await load()
      preparationCard.value?.discardDraft()
      evaluationCard.value?.discardDraft()
      liveDraftNotice.value=''
    } catch { editLease.release(); editLockError.value='Não foi possível carregar os dados atuais. Tente novamente.' }
  }
  } finally { startingEdit.value=false }
}
async function prepareReceptionFinalize() {
  if (activeTreatmentTab.value !== 'reception' || !canOperational('guide_processes', 'canEdit')) return false
  await beginEditing()
  return editingOwned.value && !startingEdit.value && !stageClosed('reception')
}
function finishEditing() { if (!hasLocalDraft()) editLease.release() }
const {connected:liveConnected} = useTreatmentLiveUpdates(async () => {
  await editLease.check()
  if (!process.value) return
  const before=JSON.stringify([process.value,evaluation.value])
  const draft=hasLocalDraft()
  await load()
  if (activeTreatmentTab.value==='billing') await billingCard.value?.refresh()
  if(draft && before!==JSON.stringify([process.value,evaluation.value]))
    liveDraftNotice.value='O tratamento foi atualizado. Seu rascunho local foi preservado; confira os dados antes de continuar.'
})
const treatmentTabs = computed(() => [
  { key: 'reception', label: 'Recepção', complete: stageClosed('reception') },
  { key: 'evaluation', label: 'Avaliação', complete: Boolean(process.value?.continuation_of_id) || evaluation.value?.status === 'COMPLETED' },
  { key: 'central', label: 'Central de Guias', complete: stageClosed('central') },
  { key: 'authorization', label: 'Liberação', complete: stageClosed('authorization') },
  { key: 'billing', label: 'Faturamento', complete: billingComplete.value },
  { key: 'history', label: 'Histórico', complete: false },
].map((tab, _index, tabs) => {
  const prerequisites: Record<string,string[]> = {
    reception: [], evaluation: process.value?.continuation_of_id ? [] : ['reception'], central: ['reception','evaluation'],
    authorization: ['reception','evaluation','central'],
    billing: ['reception','evaluation','central','authorization'], history: [],
  }
  const blocker = (prerequisites[tab.key] || []).map(key => tabs.find(prior => prior.key === key)).find(prior => prior && !prior.complete)
  return { ...tab, locked: Boolean(blocker), blockedBy: blocker?.label }
}))
const stageNotice = ref<{title:string;message:string;editable?:boolean} | null>(null)
watch(stageNotice, notice => { if (notice) notify(notice.message, notice.title === 'Não foi possível editar' ? 'error' : notice.title === 'Aba em somente leitura' ? 'info' : 'warning') })
const activeStageCompleted = computed(() => activeTreatmentTab.value === 'evaluation'
  ? Boolean(process.value?.continuation_of_id) || evaluation.value?.status === 'COMPLETED'
  : activeTreatmentTab.value === 'billing' ? billingComplete.value : stageClosed(activeTreatmentTab.value))
function explainReadonly() {
  if (activeTreatmentTab.value === 'history') return
  if (activeStageCompleted.value) {
    stageNotice.value = { title:'Etapa finalizada', message: process.value?.continuation_of_id && activeTreatmentTab.value === 'evaluation'
      ? 'Esta avaliação pertence ao tratamento original e está disponível apenas para consulta.'
      : `A etapa ${activeTabLabel.value} já foi finalizada. Para alterar os campos, reabra a etapa primeiro. Se necessário, clique em Editar aba e depois em ${activeTreatmentTab.value === 'evaluation' ? 'Reabrir avaliação' : 'Reabrir etapa'}.`, editable: !process.value?.continuation_of_id || activeTreatmentTab.value !== 'evaluation' }
  } else if (editingLock.value.locked && !editingOwned.value) {
    stageNotice.value = {title:'Aba em edição por outra pessoa',message:`${editingLock.value.owner || 'Outro usuário'} está editando a aba ${activeTabLabel.value}. Você pode consultar os dados, mas precisa aguardar a liberação para alterar.`}
  } else if (!editingOwned.value) {
    stageNotice.value = {title:'Aba em somente leitura',message:`Para preencher ou alterar a aba ${activeTabLabel.value}, clique em Editar aba.`,editable:true}
  }
}
function explainReadonlyField(event: PointerEvent) {
  if (editingOwned.value && !activeStageCompleted.value) return
  const panel = document.getElementById('treatment-tabpanel-' + activeTreatmentTab.value)
  if (!panel) return
  const blocked = Array.from(panel.querySelectorAll('input:disabled,select:disabled,textarea:disabled,button:disabled,[readonly],canvas')).some(element => {
    const rect=element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
  })
  if (blocked) { event.preventDefault(); explainReadonly() }
}
function explainReadonlyKeyboard(event: KeyboardEvent) {
  if (!['Enter',' '].includes(event.key) || !(event.target instanceof HTMLElement)) return
  if (event.target.matches(':disabled,[readonly]')) { event.preventDefault(); explainReadonly() }
}
watch(() => [process.value?.id, activeTreatmentTab.value, editingLock.value.locked && !editingOwned.value ? editingLock.value.owner : '', editingOwned.value] as const,
  (current, previous) => {
    if (!process.value || activeStageCompleted.value || editingOwned.value) return
    const entered = !previous || current[0] !== previous[0] || current[1] !== previous[1]
    const newOwner = current[2] && current[2] !== previous?.[2]
    if (entered || newOwner) explainReadonly()
  }, {flush:'post'})
watch(editLockError, value => { if(value) stageNotice.value={title:'Não foi possível editar',message:value} })
watch(liveDraftNotice, value => { if(value) stageNotice.value={title:'Atenção ao rascunho',message:value} })
function alertLockedStage(blockedBy?: string) {
  stageNotice.value={title:'Etapa bloqueada',message:`Finalize a etapa “${blockedBy || 'anterior'}” antes de continuar.`}
}
function tabUnlocked(key: string) {
  return treatmentTabs.value.some((tab) => tab.key === key && !tab.locked)
}
async function selectTreatmentTab(key: string) {
  if (!tabUnlocked(key)) return false
  if (key !== activeTreatmentTab.value && hasLocalDraft()) {
    liveDraftNotice.value='Salve o rascunho antes de trocar de aba e liberar a edição.'
    return false
  }
  openingBilling = false
  activeTreatmentTab.value = key
  await nextTick()
  document
    .getElementById('treatment-tab-' + key)
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  return true
}
async function tabKeydown(event: KeyboardEvent, key: string) {
  const keys = treatmentTabs.value.filter((tab) => !tab.locked).map((tab) => tab.key)
  const index = keys.indexOf(key)
  if (index < 0) return
  let next: string
  if (event.key === 'ArrowRight') next = keys[(index + 1) % keys.length]
  else if (event.key === 'ArrowLeft') next = keys[(index + keys.length - 1) % keys.length]
  else if (event.key === 'Home') next = keys[0]
  else if (event.key === 'End') next = keys[keys.length - 1]
  else return
  event.preventDefault()
  await selectTreatmentTab(next)
  document.getElementById('treatment-tab-' + next)?.focus({ preventScroll: true })
}
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
  if (!process.value?.continuation_of_id && evaluation.value?.status !== 'COMPLETED') missing.push('avaliação concluída')
  return missing
})
const forwardingFields: Record<string, string> = {
  'convênio e plano': 'patient_insurance_id',
  'médico solicitante': 'requesting_doctor_id',
  fisioterapeuta: 'physiotherapist_id',
  sessões: 'requested_sessions',
}
function forwardingTarget(item: string) {
  if (forwardingFields[item]) return `preparation-${process.value.id}-${forwardingFields[item]}`
  if (item === 'documentação obrigatória') {
    const missing = requiredTypes.value.find((type) => !usableDocs(type).length)
    return missing ? `treatment-${process.value.id}-document-${missing}` : 'treatment-documents'
  }
  return 'digital-evaluation'
}
async function goToForwardingIssue(item: string) {
  const opened = await selectTreatmentTab(
    forwardingFields[item]
      ? 'central'
      : item === 'documentação obrigatória'
        ? 'central'
        : 'evaluation',
  )
  if (!opened) {
    showDocumentError('Conclua as etapas anteriores para acessar este item.')
    return
  }
  if (forwardingFields[item]) await preparationCard.value?.reveal()
  else if (item === 'documentação obrigatória') await preparationCard.value?.reveal()
  else await evaluationCard.value?.reveal()
  await nextTick()
  let target = document.getElementById(forwardingTarget(item))
  if (item === 'avaliação concluída') target = target?.querySelector<HTMLElement>('h2') || target
  if (!target) return
  if (target.matches(':disabled')) target = target.closest('label') || target
  if (!target.matches('input, select, textarea, button, a, [tabindex]')) target.tabIndex = -1
  target.focus({ preventScroll: true })
  target.scrollIntoView({
    behavior: 'smooth',
    block: item === 'documentação obrigatória' ? 'start' : 'center',
  })
}
const usableDocs = (type: string) =>
  docs(type).filter(
    (d: any) => d.document_role === 'GENERATED' || d.is_usable === true || d.is_usable === 1,
  )
const previousEvaluationDocs = computed(() =>
  (process.value?.documents || []).filter((doc: any) =>
    ['PHYSIO_ASSESSMENT', 'PHYSIOTHERAPY_EVALUATION'].includes(doc.document_type),
  ),
)
const requiredPresent = computed(
    () => requiredTypes.value.filter((type) => usableDocs(type).length).length,
  ),
  missingLabels = computed(() =>
    requiredTypes.value
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
function historyTitle(item: any) {
  const title = historyLabels[item.action] || 'Atualização do processo'
  if(['GUIDE_BILLING_UPDATED','GUIDE_AUTHORIZATION_UPDATED'].includes(item.action)) {
    try { const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata; return `${title} — ${documentTypeLabels[meta?.documentType as keyof typeof documentTypeLabels] || 'Guia'}` } catch { return title }
  }
  if (!['STAGE_COMPLETED', 'STAGE_REOPENED'].includes(item.action)) return title
  try {
    const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
    return meta?.label ? `${title} — ${meta.label}` : title
  } catch {
    return title
  }
}
function historyNote(item: any) {
  if (
    !['AUTHORIZATION_APPEALED', 'AUTHORIZATION_STATUS_CHANGED', 'AUTHORIZATION_UPDATED', 'AUTHORIZATION_DOCUMENT_ATTACHED'].includes(
      item.action,
    )
  )
    return ''
  try {
    const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
    return (item.action === 'AUTHORIZATION_DOCUMENT_ATTACHED' ? metadata?.originalName : metadata?.notes) || ''
  } catch {
    return ''
  }
}
async function openRelatedGuide(id: number) {
  await router.push({path:'/central-de-guias/tratamentos/'+id,query:{authorization:'1'}})
}

async function authorizationUpdated() {
  try {
    await load()
  } catch {
    showDocumentError('Liberação salva. Atualize a página para conferir a situação atual.')
  }
}
function translatedValue(value: string) {
  return labelFor(
    { ...authorizationStatusLabels, ...documentStatusLabels, ...treatmentStatusLabels },
    value,
  )
}
const detailLoadError = ref('')
let detailLoadSequence = 0
watch(() => route.params.id, async (next, previous) => {
  if(next === previous) return
  documentActionMessage.value = ''; identificationOpen.value = false; refreshedPatient.value = null
  process.value = null; billingComplete.value = false; detailLoadError.value = ''
  activeTreatmentTab.value = 'reception'; openingBilling = false
  try { await load() } catch { detailLoadError.value = 'Não foi possível abrir a guia. Atualize a página.' }
})
async function load() {
  const sequence = ++detailLoadSequence, id = route.params.id
  const [detail, clinical, options] = await Promise.all([
    api.get(`/guide-processes/${id}`), api.get(`/guide-processes/${id}/evaluation`), api.get(`/guide-processes/${id}/document-generation-options`),
  ])
  if(sequence !== detailLoadSequence || id !== route.params.id) return
  const opening = String(process.value?.id) !== String(id)
  process.value = detail.data; evaluation.value = clinical.data; templates.value = options.data
  if (opening || !tabUnlocked(activeTreatmentTab.value)) {
    activeTreatmentTab.value = treatmentTabs.value.find((tab) => !tab.locked && !tab.complete)?.key || 'history'
    openingBilling = opening && activeTreatmentTab.value === 'billing'
  }
  for (const type of generatable) {
    const matches = templatesFor(type)
    if (!matches.some((template) => template.id === selectedTemplates[type]))
      selectedTemplates[type] =
        (matches.find((template) => template.insurance_provider_id != null) || matches[0])?.id || ''
  }
}
const refreshingPatient = ref(false),
  refreshedPatient = ref<any>(null)
async function refreshPatient() {
  if (refreshingPatient.value || !canEdit.value || stageClosed('reception')) return
  refreshingPatient.value = true
  documentActionMessage.value = ''
  documentActionError.value = false
  try {
    const result = (
      await api.post(`/integrations/stenci/treatments/${route.params.id}/refresh-patient`)
    ).data
    refreshedPatient.value = result.patient
    process.value = (await api.get(`/guide-processes/${route.params.id}`)).data
    documentActionMessage.value = result.insurancePreserved
      ? 'Dados do paciente atualizados. O convênio do Stenci é diferente; o convênio escolhido neste tratamento foi preservado. Revise a Preparação pela Central de Guias se desejar trocar.'
      : 'Dados do paciente atualizados do Stenci. Avaliação, documentos e informações do tratamento foram preservados.'
  } catch (e: any) {
    documentActionError.value = true
    documentActionMessage.value =
      e.response?.data?.error || e.message || 'Não foi possível atualizar os dados do paciente.'
  } finally {
    refreshingPatient.value = false
  }
}
function executorUpdated(assignment: any) {
  if (!process.value || Number(assignment.guide_process_id) !== Number(process.value.id)) return
  process.value = { ...process.value, physiotherapist_id: assignment.professional_id, physiotherapist_name: assignment.professional_name }
}
async function evaluationUpdated(value: any) {
  evaluation.value = value
  if (value?.status === 'COMPLETED') editLease.release()
  await refreshAfterSave()
}
async function preparationUpdated(value: any) {
  process.value = { ...process.value, ...value }
  await refreshAfterSave()
}
async function refreshAfterSave() {
  try {
    await load()
    detailLoadError.value = ''
  } catch {
    detailLoadError.value = 'Dados salvos. Não foi possível atualizar todos os detalhes; atualize a página para consultá-los.'
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
async function download(id: number) {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' })
  window.open(URL.createObjectURL(response.data), '_blank')
}
async function markUsable(id: number, is_usable: boolean) {
  await api.patch(`/documents/${id}/usability`, { is_usable })
  await load()
}
async function removeDocument(id: number) {
    if (!canDeleteDocuments.value) return
  if (window.confirm('Remover este documento? O processo poderá voltar para preparação.')) {
    await api.delete(`/documents/${id}`)
    await load()
  }
}
async function preview(type: string) {
  if (generatingDocuments[type]) return
  if (!selectedTemplates[type]) return showDocumentError('Selecione um modelo para pré-visualizar.')
  if (!(await persistDocumentDraft())) return
  clearDocumentMessage()
  generatingDocuments[type] = true
  try {
    const response = await api.post(
      `/guide-processes/${route.params.id}/documents/preview`,
      { template_id: selectedTemplates[type] },
      { responseType: 'blob' },
    )
    window.open(URL.createObjectURL(response.data), '_blank')
  } catch (error: any) {
    await showGenerationError(error)
  } finally {
    generatingDocuments[type] = false
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
function openDocumentUpload(type: string) {
  document.getElementById('document-upload-' + type)?.click()
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
const router = useRouter()
onMounted(async () => {
  await load()
  if (route.query.evaluate === '1' && activeTreatmentTab.value === 'evaluation') {
    await nextTick()
    document
      .getElementById('digital-evaluation')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (route.query.documents === '1' && activeTreatmentTab.value === 'central') {
    await nextTick()
    document
      .getElementById('treatment-documents')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

useFeedback(() => saveNotice.value ? (uploadFailures.value ? 'Tratamento salvo, mas alguns documentos não puderam ser enviados.' : 'Tratamento salvo. Disponível para avaliação fisioterapêutica.') : '', () => uploadFailures.value ? 'warning' : 'success')
useFeedback(() => unwrapNoticeValue(detailLoadError), () => 'error')
useFeedback(() => unwrapNoticeValue(documentActionMessage), () => unwrapNoticeValue(documentActionError) ? 'error' : 'success')
</script>
<style scoped>
.treatment-stage-workspace :deep(input:disabled),
.treatment-stage-workspace :deep(select:disabled),
.treatment-stage-workspace :deep(textarea:disabled),
.treatment-stage-workspace :deep(button:disabled) {
  pointer-events: none;
}
.treatment-stage-workspace :deep([id]),
.treatment-stage-workspace :deep(input),
.treatment-stage-workspace :deep(select),
.treatment-stage-workspace :deep(textarea),
.treatment-stage-workspace :deep(button) {
  scroll-margin-top: var(--treatment-context-offset, 204px);
}
.treatment-context {
  position: sticky;
  top: 0.5rem;
  z-index: 20;
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
.treatment-identity {
  border: 1px solid #c7d7fe;
  border-left: 4px solid #465fff;
  border-radius: 1rem;
  padding: 0.75rem 1rem;
  background: #fff;
  box-shadow: 0 4px 12px #10182814;
}
.treatment-identity-heading, .treatment-edit-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.treatment-identity-reference {
  color: #3641f5;
  font-weight: var(--realmed-weight-emphasis);
}
.treatment-identity #treatment-patient-name {
  font-size: var(--realmed-patient-name-size);
  font-weight: 700;
  line-height: 1.15;
  color: #101828;
  overflow-wrap: anywhere;
}
.treatment-identity-status {
  border-radius: 0.5rem;
  padding: 0.35rem 0.65rem;
  background: #f2f4f7;
  color: #344054;
  font-weight: var(--realmed-weight-medium);
  flex-shrink: 0;
}
.treatment-identity-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.5rem;
  margin-top: 0.4rem;
}
.treatment-identity-details > div { display: flex; flex-wrap: wrap; gap: 0.25rem; min-width: 0; }
.treatment-identity-details dt { color: #667085; }
.treatment-identity-details dt::after { content: ':'; }
.treatment-identity-details dd { color: #344054; overflow-wrap: anywhere; }
.treatment-identity-sessions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; max-width: 48rem; margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid #eaecf0; }
.treatment-identity-sessions > div { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.35rem; }
.treatment-identity-sessions dt { color: #667085; font-size: var(--realmed-help-size); }
.treatment-identity-sessions dd { color: #344054; font-weight: 600; }
.treatment-identity-more { margin-top: 0.25rem; }
.treatment-identity-more > summary { cursor: pointer; min-height: 32px; padding-top: 0.3rem; color: #3641f5; }
.treatment-identity-more-body { max-height: min(32dvh, 16rem); overflow: auto; }
.treatment-edit-notice { margin-top: 0.4rem; }
@media (max-width: 639px) {
  .treatment-identity { padding: 0.6rem 0.75rem; }
  .treatment-identity-heading { flex-wrap: wrap; gap: 0.25rem; }
  .treatment-identity-status { padding: 0.15rem 0.4rem; }
  .treatment-identity-details { gap: 0.15rem 0.75rem; }
  .treatment-identity-sessions > div { display: block; }
  .treatment-edit-notice { align-items: flex-start; padding: 0.5rem 0.75rem; }
}
.treatment-tabs :deep(.treatment-tab[aria-disabled='true']) {
  cursor: not-allowed;
  opacity: 1;
  color: #667085;
  background: #f2f4f7;
  border-color: #e4e7ec;
  box-shadow: none;
}
.treatment-stage-workspace {
  border: 1px solid #e4e7ec;
  border-radius: 1rem;
  background: #fff;
  padding: 1rem;
  box-shadow: 0 1px 2px #1018280d;
}
.treatment-stage-workspace > .treatment-tabs {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}
.treatment-stage-workspace :deep([data-treatment-stage]),
.treatment-stage-workspace > #treatment-tabpanel-history {
  border: 0;
  padding: 0;
  box-shadow: none;
  background: transparent;
}

.filter-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  color: #475467;
}
.filter-label .input {
  width: 100%;

  color: #344054;
}
</style>
