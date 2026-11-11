<template>
  <PageShell
    title="Novo Tratamento"
    subtitle="Recepção: selecione o paciente e informe a data da avaliação."
    >
    <form id="new-treatment-form" class="space-y-5" @submit.prevent="save">
      <section class="panel">
        <h2 class="section-title">1. Paciente</h2>
        <label class="field patient-search"
          ><FieldLabel required>Paciente</FieldLabel
          ><SearchableSelect
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
        <label class="field max-w-sm"
          >Data da avaliação<MaskedDateInput v-model="assessmentDate"
        /></label>
      </section>
      <p class="text-sm text-gray-600">
        A fisioterapeuta preencherá a avaliação e a agenda. A Central de Guias completará os dados e
        organizará os documentos depois.
      </p>
      
      <button type="submit" class="btn" :disabled="saving || importing">
        {{ saving ? 'Salvando…' : 'Salvar tratamento' }}
      </button>
    </form></PageShell
  >
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import MaskedDateInput from '@/components/MaskedDateInput.vue'
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
const router = useRouter(),
  patientOption = ref<any>(null),
  selectedPatient = ref<any>(null),
  patients = ref<any[]>([]),
  selectedInsurance = ref<any>(null),
  selectedPlan = ref<any>(null),
  searching = ref(false),
  importing = ref(false),
  saving = ref(false),
  searchError = ref(''),
  error = ref(''),
  assessmentDate = ref('')
let timer: ReturnType<typeof setTimeout> | undefined,
  searchSequence = 0
const date = (value: string) =>
  value ? new Date(String(value).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
function findPatients(value: string) {
  clearTimeout(timer)
  const sequence = ++searchSequence
  patients.value = []
  searchError.value = ''
  if (value.trim().length < 2) return
  timer = setTimeout(async () => {
    searching.value = true
    try {
      const data = (
        await api.get('/integrations/stenci/patients/search', {
          params: { search: value.trim(), limit: 30, offset: 0 },
        })
      ).data
      if (sequence === searchSequence) patients.value = data.items
    } catch {
      if (sequence === searchSequence)
        searchError.value = 'Não foi possível consultar o Stenci no momento.'
    } finally {
      if (sequence === searchSequence) searching.value = false
    }
  }, 300)
}
watch(patientOption, async (patient) => {
  if (!patient) return
  importing.value = true
  searchError.value = ''
  try {
    selectedPatient.value = (
      await api.post(
        '/integrations/stenci/patients/' + encodeURIComponent(patient.external_id) + '/sync',
        { patient: patient.raw },
      )
    ).data.patient
    const linked = patient.insurance
    selectedInsurance.value = linked
      ? {
          externalId: linked.external_id,
          name: linked.name,
          planExternalId: linked.plan_id,
          planName: linked.plan,
          cardNumber: linked.card_number,
          cardExpiration: linked.card_expiration || null,
        }
      : null
    selectedPlan.value = linked?.plan ? { planName: linked.plan } : null
    patients.value = []
  } catch {
    patientOption.value = null
    searchError.value = 'Não foi possível importar o paciente do Stenci.'
  } finally {
    importing.value = false
  }
})
function changePatient() {
  selectedPatient.value = null
  patientOption.value = null
  selectedInsurance.value = null
  selectedPlan.value = null
}
async function save() {
  if (saving.value || importing.value) return
  if (!selectedPatient.value) {
    error.value = 'Selecione um paciente.'
    return
  }
  saving.value = true
  error.value = ''
  let created = false
  try {
    const treatment = (
      await api.post('/guide-processes', {
        patient_id: selectedPatient.value.id,
        assessment_date: assessmentDate.value || null,
        stenci: {
          insurance:
            selectedInsurance.value?.externalId && selectedInsurance.value?.name
              ? selectedInsurance.value
              : null,
        },
      })
    ).data
    created = true
    await router.push({
      path: '/central-de-guias/tratamentos/' + treatment.id,
      query: { saved: '1' },
    })
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível salvar o tratamento.'
  } finally {
    if (!created) saving.value = false
  }
}
onBeforeUnmount(() => {
  clearTimeout(timer)
  searchSequence++
})

useFeedback(() => unwrapNoticeValue(error), () => 'error')
</script>
<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
</style>
