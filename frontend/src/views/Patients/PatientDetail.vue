<template>
  <PageShell
    :title="patient?.full_name || 'Detalhes do paciente'"
    subtitle="Identificação, convênios e histórico de tratamentos"
  >
    <template #actions
      ><TableActionToolbar
        :actions="[
          { icon: 'open', label: 'Voltar aos pacientes', onClick: () => router.push('/pacientes') },
        ]"
    /></template>
    <p v-if="message" role="alert" class="text-error-700">{{ message }}</p>
    <template v-if="patient"
      ><section class="panel">
        <h2 class="section-title">Identificação</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <p><span class="text-gray-500">Telefone</span><br />{{ patient.phone || '—' }}</p>
          <p><span class="text-gray-500">E-mail</span><br />{{ patient.email || '—' }}</p>
          <p><span class="text-gray-500">Nascimento</span><br />{{ date(patient.birth_date) }}</p>
        </div>
      </section>
      <section class="panel">
        <h2 class="section-title">Convênios</h2>
        <DataList
          v-model:selected="selectedInsurance"
          :items="patient.insurances"
          :columns="insuranceColumns"
          embedded
          selection-key="insurance_name"
        />
      </section>
      <section class="panel">
        <h2 class="section-title">Tratamentos anteriores</h2>
        <DataList
          v-model:selected="selectedTreatment"
          :items="patient.processes"
          :columns="treatmentColumns"
          :actions="treatmentActions"
          embedded
          selection-key="id"
        /></section
    ></template>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import TableActionToolbar from '@/components/TableActionToolbar.vue'
import { treatmentStatusLabel } from '@/utils/treatmentStatus'
const route = useRoute(),
  router = useRouter(),
  patient = ref<any>(null),
  message = ref(''),
  selectedInsurance = ref<any>(null),
  selectedTreatment = ref<any>(null)
const date = (v: any) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—')
const insuranceColumns = [
  { key: 'insurance_name', label: 'Convênio' },
  { key: 'plan', label: 'Plano' },
  { key: 'card_number', label: 'Carteirinha' },
  { key: 'card_expiration', label: 'Validade', format: date },
  { key: 'active', label: 'Status', format: (v: any) => (v ? 'Ativo' : 'Inativo') },
]
const treatmentColumns = [
  { key: 'id', label: 'Tratamento' },
  { key: 'assessment_date', label: 'Avaliação', format: date },
  { key: 'expected_start_date', label: 'Início previsto', format: date },
  { key: 'insurance_name', label: 'Convênio' },
  {
    key: 'authorization_status',
    label: 'Liberação',
    format: (_v: any, row: any) => treatmentStatusLabel(row),
  },
]
const treatmentActions = computed(() => [
  {
    icon: 'open',
    label: 'Abrir tratamento selecionado',
    disabled: !selectedTreatment.value,
    onClick: () => router.push('/central-de-guias/tratamentos/' + selectedTreatment.value.id),
  },
])
onMounted(async () => {
  try {
    patient.value = (await api.get('/patients/' + route.params.id)).data
  } catch (e) {
    message.value = (e as any).response?.data?.error || 'Não foi possível carregar o paciente.'
  }
})
</script>
