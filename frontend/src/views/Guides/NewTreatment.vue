<template>
  <PageShell
    title="Novo Tratamento"
    subtitle="Prepare o tratamento e a documentação recebida antes de encaminhá-lo ao faturamento"
  >
    <form class="space-y-5" @submit.prevent="save">
      <section class="panel">
        <h2 class="section-title">1. Paciente</h2>
        <label class="field patient-search"
          >Paciente<SearchableSelect
            v-model="patientOption"
            :options="patients"
            label-key="full_name"
            key-key="external_id"
            :loading="searching"
            loading-text="Consultando o Stenci..."
            placeholder="Digite nome, CPF etc."
            :min-chars="2"
            remote
            @search="findPatients"
            ><template #option="{ option: patient }"
              ><b class="block">{{ patient.full_name }}</b
              ><span class="block text-xs text-gray-600"
                >CPF: {{ patient.cpf || '—' }} · Nasc.: {{ date(patient.birth_date) }} · Tel.:
                {{ patient.phone || '—' }}</span
              ><span v-if="patient.insurance" class="block text-xs text-gray-500"
                >{{ patient.insurance.name || '—' }} · {{ patient.insurance.plan || '—' }} ·
                Carteirinha: {{ patient.insurance.card_number || '—' }}</span
              ></template
            ></SearchableSelect
          ></label
        >
        <p v-if="searchError" class="mt-2 text-sm text-error-700">{{ searchError }}</p>
        <p v-if="importing" class="mt-2 text-sm font-semibold text-blue-700">
          Importando dados do Stenci...
        </p>
        <div
          v-if="selectedPatient"
          class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 px-4 py-3"
        >
          <div>
            <span class="text-xs font-semibold uppercase text-blue-700">Paciente selecionado</span
            ><b class="block text-gray-800">{{ selectedPatient.full_name }}</b
            ><span class="text-sm text-gray-600"
              >{{ date(selectedPatient.birth_date) }} ·
              {{ selectedInsurance?.name || 'Sem convênio'
              }}<template v-if="selectedPlan"> / {{ selectedPlan.planName }}</template></span
            >
          </div>
          <button type="button" class="link" @click="changePatient">Alterar paciente</button>
        </div>
        <RouterLink
          class="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
          to="/pacientes"
          >Paciente não encontrado? Cadastrar manualmente</RouterLink
        >
      </section>

      <section class="panel">
        <h2 class="section-title">2. Dados do tratamento</h2>
        <div class="treatment-grid">
          <label class="field span-4"
            >Convênio<SearchableSelect
              v-model="selectedInsurance"
              :options="insurances"
              :loading="catalogLoading.insurances"
              loading-text="Carregando convênios..."
              placeholder="Selecione"
              @update:model-value="insuranceChanged" /></label
          ><label class="field span-4"
            >Plano<SearchableSelect
              v-model="selectedPlan"
              :options="availablePlans"
              label-key="planName"
              key-key="planExternalId"
              :disabled="!selectedInsurance"
              :loading="catalogLoading.plans"
              loading-text="Carregando planos..."
              placeholder="Selecione" /></label
          ><label class="field span-2"
            >Número da carteirinha<input v-model="cardNumber" class="input" /></label
          ><label class="field span-2"
            >Validade da carteirinha<MaskedDateInput v-model="cardExpiration"
          /></label>
          <p v-if="catalogErrors.insurances" class="error-text">{{ catalogErrors.insurances }}</p>
          <p v-if="catalogErrors.plans" class="error-text">{{ catalogErrors.plans }}</p>

          <label class="field span-6"
            >Fisioterapeuta responsável<SearchableSelect
              v-model="selectedPhysiotherapist"
              :options="physiotherapists"
              :loading="catalogLoading.professionals"
              loading-text="Carregando profissionais..."
              ><template #option="{ option }"
                ><b class="block">{{ option.name }}</b
                ><span class="text-xs text-gray-500">{{
                  councilLabel(option, 'CREFITO')
                }}</span></template
              ></SearchableSelect
            ></label
          ><label class="field span-6"
            >Médico solicitante<SearchableSelect
              v-model="selectedDoctor"
              :options="doctors"
              :loading="catalogLoading.professionals"
              loading-text="Carregando profissionais..."
              ><template #option="{ option }"
                ><b class="block">{{ option.name }}</b
                ><span class="text-xs text-gray-500">{{
                  councilLabel(option, 'CRM')
                }}</span></template
              ></SearchableSelect
            ></label
          >
          <p v-if="catalogErrors.professionals" class="error-text md:col-span-2">
            {{ catalogErrors.professionals }}
          </p>

          <label class="field span-4"
            >Data da avaliação<MaskedDateInput v-model="form.assessment_date" /></label
          ><label class="field span-4"
            >Data prevista de início<MaskedDateInput v-model="form.expected_start_date" /></label
          ><label class="field span-4"
            >Quantidade de sessões<input
              v-model.number="form.requested_sessions"
              type="number"
              min="1"
              step="1"
              class="input" /></label
          ><label class="field span-12"
            >Observações<textarea v-model="form.notes" class="input min-h-20"></textarea>
          </label>
        </div>
      </section>

      <section class="panel">
        <h2 class="section-title">3. Dias e horários pretendidos</h2>
        <div class="schedule-grid">
          <label v-for="day in weekdays" :key="day.value" class="schedule-day">
            <span><input v-model="day.enabled" type="checkbox" class="mr-2" />{{ day.label }}</span>
            <input
              v-model="day.time"
              type="time"
              class="input"
              :disabled="!day.enabled"
              :aria-label="`Horário de ${day.label}`"
            />
          </label>
        </div>
        <label class="field mt-4 max-w-md"
          >Período / horário preferencial<input
            v-model="form.preferred_period"
            class="input"
            placeholder="Ex.: Manhã, 14h ou após as 18h"
        /></label>
      </section>

      <section class="panel">
        <h2 class="section-title">4. Procedimentos</h2>
        <p class="mb-4 text-sm text-gray-500">
          Selecione no cadastro de procedimentos; nenhum código é fixado nesta tela.
        </p>
        <div class="grid gap-4 md:grid-cols-3">
          <label v-for="kind in procedureKinds" :key="kind.type" class="field"
            >{{ kind.label
            }}<select v-model="procedureSelection[kind.type].procedure_id" class="input">
              <option value="">Selecione</option>
              <option
                v-for="item in procedures.filter((p) => p.type === kind.type)"
                :key="item.id"
                :value="item.id"
              >
                {{ item.code }} · {{ item.description }}
              </option></select
            ><input
              v-model.number="procedureSelection[kind.type].requested_quantity"
              class="input mt-2"
              type="number"
              min="1"
              :placeholder="kind.type === 'CONSULTATION' ? '1' : 'Quantidade'"
          /></label>
        </div>
      </section>

      <section class="panel">
        <h2 class="section-title">5. Documentação recebida</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <article v-for="card in documentCards" :key="card.type" class="rounded-xl border p-4">
            <h3 class="font-bold">{{ card.label }}</h3>
            <p class="my-2 text-sm text-gray-500">{{ files[card.type]?.name || card.empty }}</p>
            <label class="btn-secondary inline-block"
              >Anexar<input
                type="file"
                class="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                @change="chooseFile($event, card.type)"
            /></label>
            <div v-if="card.usability && files[card.type]" class="mt-3 flex gap-4 text-sm">
              <label
                ><input v-model="usability[card.type]" type="radio" :value="true" /> Adequado</label
              ><label
                ><input v-model="usability[card.type]" type="radio" :value="false" /> Necessita
                ajuste</label
              >
            </div>
          </article>
          <article class="rounded-xl border p-4">
            <h3 class="font-bold">Outros documentos</h3>
            <p class="my-2 text-sm text-gray-500">
              Encaminhamentos, relatórios, exames e complementos.
            </p>
            <label class="btn-secondary inline-block"
              >Selecionar arquivos<input
                type="file"
                multiple
                class="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                @change="chooseOthers"
            /></label>
            <p v-for="file in otherFiles" :key="file.name" class="mt-2 text-sm">{{ file.name }}</p>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2 class="section-title">6. Documentação necessária</h2>
        <p class="text-sm text-gray-600">
          Guias ausentes ou marcadas como “Necessita ajuste” poderão ser geradas com os modelos já
          cadastrados após salvar. O original permanecerá disponível ao lado do documento preparado
          pela Realmed.
        </p>
      </section>
      <section class="panel">
        <h2 class="section-title">7. Resumo / conclusão</h2>
        <ul class="space-y-2 text-sm">
          <li
            v-for="item in checklist"
            :key="item.label"
            :class="item.ok ? 'text-success-700' : 'text-error-700'"
          >
            {{ item.ok ? '✓' : '✕' }} {{ item.label }}
          </li>
        </ul>
        <p class="mt-4 font-semibold">
          {{ locallyComplete ? 'Documentação pronta para conferência' : 'Documentação incompleta' }}
        </p>
        <button class="btn mt-4 px-6 py-3" :disabled="saving">
          {{ saving ? 'Salvando...' : 'Salvar tratamento' }}
        </button>
      </section>
    </form>
  </PageShell>
</template>
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
import MaskedDateInput from '@/components/MaskedDateInput.vue'
const router = useRouter(),
  patients = ref<any[]>([]),
  patientOption = ref<any>(null),
  selectedPatient = ref<any>(),
  insurances = ref<any[]>([]),
  plans = ref<any[]>([]),
  professionals = ref<any[]>([]),
  procedures = ref<any[]>([]),
  files = reactive<Record<string, File | undefined>>({}),
  otherFiles = ref<File[]>([]),
  usability = reactive<Record<string, boolean>>({}),
  saving = ref(false),
  searching = ref(false),
  importing = ref(false),
  searchError = ref('')
const selectedInsurance = ref<any>(null),
  selectedPlan = ref<any>(null),
  selectedPhysiotherapist = ref<any>(null),
  selectedDoctor = ref<any>(null),
  cardNumber = ref(''),
  cardExpiration = ref('')
const catalogLoading = reactive({ insurances: true, plans: true, professionals: true }),
  catalogErrors = reactive({ insurances: '', plans: '', professionals: '' })
const form = reactive<any>({
  assessment_date: '',
  expected_start_date: '',
  requested_sessions: null,
  notes: '',
  treatment_days: [],
  preferred_period: '',
})
const weekdays = [
  ['MONDAY', 'Segunda'],
  ['TUESDAY', 'Terça'],
  ['WEDNESDAY', 'Quarta'],
  ['THURSDAY', 'Quinta'],
  ['FRIDAY', 'Sexta'],
  ['SATURDAY', 'Sábado'],
].map(([value, label]) => reactive({ value, label, enabled: false, time: '' }))
const procedureKinds = [
  { type: 'PHYSIOTHERAPY', label: 'Fisioterapia' },
  { type: 'ELECTROSTIMULATION', label: 'Eletroestimulação' },
  { type: 'CONSULTATION', label: 'Consulta / Avaliação' },
]
const procedureSelection = reactive<Record<string, any>>(
  Object.fromEntries(
    procedureKinds.map((k) => [
      k.type,
      { procedure_id: '', requested_quantity: k.type === 'CONSULTATION' ? 1 : 10 },
    ]),
  ),
)
const documentCards = [
  {
    type: 'PHYSIOTHERAPY_GUIDE',
    label: 'Guia de Fisioterapia',
    empty: 'Nenhuma guia recebida',
    usability: true,
  },
  {
    type: 'CONSULTATION_GUIDE',
    label: 'Guia de Consulta / Avaliação',
    empty: 'Nenhuma guia recebida',
    usability: true,
  },
  {
    type: 'PHYSIO_ASSESSMENT',
    label: 'Avaliação Fisioterapêutica',
    empty: 'Anexe o formulário preenchido',
    usability: false,
  },
]
const byName = (a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  hasCouncil = (p: any, name: string) =>
    p.active === true && p.councils.some((c: any) => String(c.name).toUpperCase() === name)
const physiotherapists = computed(() =>
    professionals.value.filter((p) => hasCouncil(p, 'CREFITO')).sort(byName),
  ),
  doctors = computed(() => professionals.value.filter((p) => hasCouncil(p, 'CRM')).sort(byName)),
  availablePlans = computed(() =>
    plans.value
      .filter((p) => p.insuranceExternalId === selectedInsurance.value?.externalId)
      .sort((a, b) => a.planName.localeCompare(b.planName, 'pt-BR', { sensitivity: 'base' })),
  )
const checklist = computed(() => [
    { label: 'Avaliação fisioterapêutica', ok: !!files.PHYSIO_ASSESSMENT },
    {
      label: 'Guia de consulta adequada',
      ok: !!files.CONSULTATION_GUIDE && usability.CONSULTATION_GUIDE === true,
    },
    {
      label: 'Guia de fisioterapia adequada',
      ok: !!files.PHYSIOTHERAPY_GUIDE && usability.PHYSIOTHERAPY_GUIDE === true,
    },
    {
      label: 'Eletroestimulação incluída',
      ok: !!procedureSelection.ELECTROSTIMULATION.procedure_id,
    },
  ]),
  locallyComplete = computed(() => checklist.value.every((i) => i.ok))
let timer: number | undefined
function findPatients(value: string) {
  window.clearTimeout(timer)
  searchError.value = ''
  if (value.trim().length < 2) {
    patients.value = []
    return
  }
  timer = window.setTimeout(() => fetchPatients(value.trim()), 300)
}
async function fetchPatients(search: string) {
  searching.value = true
  try {
    patients.value = (
      await api.get('/integrations/stenci/patients/search', {
        params: { search, limit: 30, offset: 0 },
      })
    ).data.items
  } catch {
    patients.value = []
    searchError.value = 'Não foi possível consultar o Stenci no momento.'
  } finally {
    searching.value = false
  }
}
watch(patientOption, (patient) => {
  if (patient) selectPatient(patient)
})
async function selectPatient(patient: any) {
  importing.value = true
  searchError.value = ''
  try {
    const synced = (
      await api.post(
        `/integrations/stenci/patients/${encodeURIComponent(patient.external_id)}/sync`,
        { patient: patient.raw },
      )
    ).data
    selectedPatient.value = synced.patient
    patients.value = []
    const linked = patient.insurance
    if (linked) {
      selectedInsurance.value = insurances.value.find(
        (i) => i.externalId === linked.external_id,
      ) || { externalId: linked.external_id, name: linked.name }
      selectedPlan.value =
        plans.value.find(
          (p) =>
            p.insuranceExternalId === linked.external_id && p.planExternalId === linked.plan_id,
        ) || null
      cardNumber.value = linked.card_number || ''
      cardExpiration.value = String(linked.card_expiration || '').slice(0, 10)
    } else clearInsurance()
  } catch {
    patientOption.value = null
    searchError.value =
      'Não foi possível importar o paciente do Stenci. Você ainda pode cadastrá-lo manualmente.'
  } finally {
    importing.value = false
  }
}
function clearInsurance() {
  selectedInsurance.value = null
  selectedPlan.value = null
  cardNumber.value = ''
  cardExpiration.value = ''
}
function changePatient() {
  selectedPatient.value = undefined
  patientOption.value = null
  clearInsurance()
}
function insuranceChanged(value: any) {
  if (!value || selectedPlan.value?.insuranceExternalId !== value.externalId)
    selectedPlan.value = null
}
function councilLabel(item: any, name: string) {
  const c = item.councils.find((entry: any) => String(entry.name).toUpperCase() === name)
  return c ? `${name} ${c.record} / ${c.state}` : name
}
function chooseFile(event: Event, type: string) {
  files[type] = (event.target as HTMLInputElement).files?.[0]
}
function chooseOthers(event: Event) {
  otherFiles.value = Array.from((event.target as HTMLInputElement).files || [])
}
async function upload(processId: number, type: string, file: File) {
  await api.post(`/guide-processes/${processId}/documents`, file, {
    params: { documentType: type, isUsable: type === 'PHYSIO_ASSESSMENT' ? true : usability[type] },
    headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
  })
}
async function save() {
  if (!selectedPatient.value) return window.alert('Selecione um paciente.')
  saving.value = true
  let treatmentId: number | null = null
  try {
    const proceduresPayload = Object.values(procedureSelection).filter((p: any) => p.procedure_id)
    const stenci = {
      insurance:
        selectedInsurance.value && selectedPlan.value
          ? {
              ...selectedInsurance.value,
              planExternalId: selectedPlan.value.planExternalId,
              planName: selectedPlan.value.planName,
              cardNumber: cardNumber.value,
              cardExpiration: cardExpiration.value || null,
            }
          : null,
      physiotherapist: selectedPhysiotherapist.value,
      doctor: selectedDoctor.value,
    }
    const treatment = (
      await api.post('/guide-processes', {
        ...form,
        treatment_days: weekdays
          .filter((day) => day.enabled)
          .map((day) => ({ day: day.value, enabled: true, time: day.time })),
        patient_id: selectedPatient.value.id,
        procedures: proceduresPayload,
        stenci,
      })
    ).data
    treatmentId = treatment.id
  } catch (error: any) {
    window.alert(error.response?.data?.error || 'Não foi possível salvar o tratamento.')
    saving.value = false
    return
  }

  const failedUploads: string[] = []
  try {
    for (const card of documentCards) {
      const file = files[card.type]
      if (file) {
        try {
          await upload(treatmentId!, card.type, file)
        } catch {
          failedUploads.push(file.name)
        }
      }
    }
    for (const file of otherFiles.value) {
      try {
        await upload(treatmentId!, 'OTHER', file)
      } catch {
        failedUploads.push(file.name)
      }
    }
    await router.push({
      path: `/central-de-guias/tratamentos/${treatmentId}`,
      query: {
        saved: '1',
        ...(failedUploads.length ? { uploadFailures: String(failedUploads.length) } : {}),
      },
    })
  } finally {
    saving.value = false
  }
}
const date = (value: string) =>
  value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'
async function loadCatalog(
  key: 'insurances' | 'plans' | 'professionals',
  path: string,
  message: string,
) {
  try {
    const data = (await api.get(path)).data
    if (key === 'insurances') insurances.value = data.items.sort(byName)
    if (key === 'plans') plans.value = data.items
    if (key === 'professionals') professionals.value = data.items
  } catch {
    catalogErrors[key] = message
  } finally {
    catalogLoading[key] = false
  }
}
onMounted(async () => {
  await Promise.all([
    loadCatalog(
      'insurances',
      '/integrations/stenci/insurances',
      'Não foi possível carregar os convênios do Stenci.',
    ),
    loadCatalog(
      'plans',
      '/integrations/stenci/insurance-plans',
      'Não foi possível carregar os planos do Stenci.',
    ),
    loadCatalog(
      'professionals',
      '/integrations/stenci/professionals',
      'Não foi possível carregar os profissionais do Stenci.',
    ),
    api
      .get('/procedures', { params: { active: true } })
      .then((r) => (procedures.value = r.data))
      .catch(() => {}),
  ])
})
</script>
<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475467;
  min-width: 0;
}
.field .input,
.field > * {
  width: 100%;
  min-width: 0;
  font-weight: 400;
  color: #344054;
}
</style>

<style scoped>
.patient-search {
  width: min(100%, 50rem);
}
.treatment-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}
.span-2 {
  grid-column: span 2;
}
.span-4 {
  grid-column: span 4;
}
.span-6 {
  grid-column: span 6;
}
.span-12 {
  grid-column: span 12;
}
.schedule-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}
.schedule-day {
  min-width: 0;
  display: grid;
  gap: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
}
@media (min-width: 640px) {
  .treatment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .span-2,
  .span-4,
  .span-6 {
    grid-column: span 1;
  }
  .span-12 {
    grid-column: 1 / -1;
  }
}
@media (min-width: 1200px) {
  .treatment-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .span-2 {
    grid-column: span 2;
  }
  .span-4 {
    grid-column: span 4;
  }
  .span-6 {
    grid-column: span 6;
  }
  .span-12 {
    grid-column: span 12;
  }
}
@media (max-width: 1023px) {
  .schedule-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .schedule-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
