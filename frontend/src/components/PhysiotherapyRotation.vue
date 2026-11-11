<template>
  <div class="mt-4 rounded-xl border border-gray-200 p-4">
    <h4>Rodízio de fisioterapeutas — Realmed Matriz</h4>
    <p class="mt-1 text-sm text-gray-600">
      Informe acima os dias, os horários desejados, o início e o total de sessões. A consulta exige
      vagas em todas as sessões, até 25 minutos antes ou depois. Cada sessão tem até seis vagas de
      um minuto no Stenci.
    </p>
    <p class="mt-2 text-sm">
      A indicação não agenda nem reserva no Stenci. Confira e realize o agendamento na agenda
      indicada.
    </p>
    <p v-if="assignment" class="mt-3 rounded-lg bg-green-50 p-3 text-green-800">
      Indicação registrada: <b>{{ assignment.professional_name }}</b
      >. O responsável pela avaliação permanece independente. Ao alterar dias, horários, início ou
      quantidade, consulte e confirme novamente.
    </p>
    <div v-if="!readonly" class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn-primary" :disabled="busy" @click="suggest">
        {{ busy ? 'Consultando...' : 'Consultar próximo fisioterapeuta' }}
      </button>
      <button v-if="admin" type="button" class="btn-secondary" :disabled="busy" @click="configure">
        Agendas participantes
      </button>
    </div>
    
    
    <button v-if="candidate && !candidateOpen && !readonly" type="button" class="btn-secondary mt-3" @click="candidateOpen = true">Rever fisioterapeuta sorteado</button>
    <ListDetailDialog :open="candidateOpen && !!candidate" title="Confirmar fisioterapeuta sorteado" wide @close="!busy && (candidateOpen = false)">
    <div v-if="candidate" class="mt-4">
      <p>
        <b>{{ candidate.professional_name }}</b> · {{ candidate.schedule_name }}
      </p>
      <p class="mt-1 text-sm text-gray-600">
        Entre quem tem vaga em todas as sessões dentro de 25 minutos, priorizamos mais vagas
        livres; o rodízio de indicações confirmadas desempata.
      </p>
      <DataList
        :items="candidate.sessions"
        :columns="columns"
        row-key="date"
        :selectable="false"
        :embedded="true"
      />
      <p class="mt-3 text-sm">Realize o agendamento no Stenci para este profissional e estes horários. A confirmação abaixo registra sua declaração; o Realmed não faz o agendamento.</p>
      <label class="my-4 flex items-center gap-3 font-semibold"><input v-model="scheduled" type="checkbox" class="h-5 w-5" :disabled="busy || readonly" />Agendei o paciente no Stenci</label>
      
      <button
        v-if="!readonly"
        type="button"
        class="btn-primary mt-3"
        :disabled="busy || !token || !scheduled || readonly"
        @click="confirm"
      >
        {{ busy ? 'Confirmando…' : 'Confirmar' }}
      </button>
    </div>
    </ListDetailDialog>
    <DataList
      v-if="assignment?.sessions?.length"
      :items="assignment.sessions"
      :columns="columns"
      row-key="date"
      :selectable="false"
      :embedded="true"
    />
    <button
      v-if="assignment?.sessions?.length && !candidate && !readonly"
      type="button"
      class="btn-secondary mt-3"
      @click="emit('applied', assignment.sessions)"
    >
      Usar horários da indicação registrada
    </button>
    <section class="mt-5" aria-label="Histórico do sorteio">
      <h4>Histórico do sorteio</h4>
      <p class="mt-1 text-sm text-gray-600">Consultas e confirmações ficam registradas para consulta posterior, mesmo após finalizar a avaliação.</p>
      
      <DataList :items="rotationHistory" :columns="historyColumns" row-key="id" :selectable="false" embedded all-rows />
    </section>
    <ListDetailDialog
      :open="configOpen"
      title="Agendas participantes do rodízio"
      wide
      @close="configOpen = false"
    >
      <p>
        Vincule cada agenda ao fisioterapeuta responsável. Somente agendas ativas da Realmed Matriz
        aparecem; agendas de avaliação são excluídas. Deixe sem vínculo para não participar.
      </p>
      <div class="mt-4 space-y-3">
        <label v-for="schedule in options.schedules" :key="schedule.id" class="block">
          {{ schedule.name }}
          <select v-model="mappings[schedule.id]" class="input w-full">
            <option value="">Não participa</option>
            <option v-for="p in options.professionals" :key="p.externalId" :value="p.externalId">
              {{ p.name }}
            </option>
          </select>
        </label>
      </div>
      
      <template #footer
        ><button type="button" class="btn-secondary" :disabled="busy" @click="configOpen = false">
          Cancelar</button
        ><button type="button" class="btn-primary" :disabled="busy" @click="saveMappings">
          Salvar agendas
        </button></template
      >
    </ListDetailDialog>
  </div>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
import DataList from './DataList.vue'
import ListDetailDialog from './ListDetailDialog.vue'
const props = defineProps<{
  processId: number
  days: any[]
  startDate?: string
  total?: number
  readonly: boolean
  historyVersion?: number
}>()
const emit = defineEmits<{ applied: [sessions: any[]]; confirmed: [assignment: any] }>()
const { authUser } = useAuthUser()
const admin = computed(() => ['admin', 'masteradmin'].includes(authUser.value?.role || ''))
const busy = ref(false),
  error = ref(''),
  message = ref(''),
  token = ref(''),
  candidate = ref<any>(null),
  assignment = ref<any>(null)
const configOpen = ref(false),
  configError = ref(''),
  options = ref<any>({ schedules: [], professionals: [] }),
  mappings = ref<Record<string, string>>({})
const candidateOpen = ref(false), scheduled = ref(false), rotationHistory = ref<any[]>([]), historyError = ref('')
const historyColumns = [
  {key:'created_at',label:'Data e hora',format:(value:string)=>new Date(value).toLocaleString('pt-BR')},
  {key:'label',label:'Registro'},
  {key:'professional_name',label:'Fisioterapeuta sorteado'},
  {key:'schedule_name',label:'Agenda'},
  {key:'user_name',label:'Responsável'},
  {key:'stenci_scheduled_confirmed',label:'Agendamento declarado',format:(value:boolean)=>value?'Sim':'—'},
]
async function loadHistory() {
  try { rotationHistory.value=(await api.get(`/guide-processes/${props.processId}/rotation/history`)).data; historyError.value='' }
  catch { historyError.value='Não foi possível carregar o histórico do sorteio. Atualize a página para tentar novamente.' }
}
const columns = [
  { key: 'date', label: 'Data', format: (v: string) => v.split('-').reverse().join('/') },
  { key: 'requested_time', label: 'Desejado' },
  { key: 'session_time', label: 'Sessão' },
  { key: 'stenci_time', label: 'Vaga no Stenci' },
  { key: 'free', label: 'Vagas livres' },
]
const request = computed(() => ({
  days: props.days?.filter((d) => d.enabled).map((d) => ({ day: d.day, time: d.time })),
  startDate: props.startDate,
  total: props.total,
}))
watch(
  request,
  () => {
    candidate.value = null
    candidateOpen.value = false
    scheduled.value = false
    token.value = ''
    message.value = ''
    error.value = ''
  },
  { deep: true },
)
onMounted(async () => {
  void loadHistory()
  try {
    assignment.value = (await api.get(`/guide-processes/${props.processId}/rotation`)).data
  } catch {
    error.value = 'Não foi possível carregar a indicação anterior.'
  }
})
watch(() => props.historyVersion, () => { void loadHistory() })
async function suggest() {
  if (busy.value || props.readonly) return
  busy.value = true
  error.value = ''
  message.value = ''
  candidate.value = null
  token.value = ''
  scheduled.value = false
  try {
    const result = (
      await api.post(`/guide-processes/${props.processId}/rotation/suggest`, request.value)
    ).data
    candidate.value = result.candidates[0] || null
    token.value = result.token
    message.value = result.message
    candidateOpen.value = !!candidate.value
    await loadHistory()
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível consultar as vagas.'
  } finally {
    busy.value = false
  }
}
async function confirm() {
  if (busy.value || props.readonly || !scheduled.value || !token.value) return
  busy.value = true
  error.value = ''
  try {
    const result = (
      await api.post(`/guide-processes/${props.processId}/rotation/confirm`, { token: token.value, stenci_scheduled_confirmed: true })
    ).data
    assignment.value = result.assignment
    candidateOpen.value = false
    scheduled.value = false
    emit('applied', result.assignment.sessions)
    emit('confirmed', result.assignment)
    candidate.value = null
    token.value = ''
    message.value =
      'Indicação registrada. Fisioterapeuta executor preenchido na Central de Guias, que permanece aberta para conferência. Salve a avaliação para manter os horários sugeridos.'
    await loadHistory()
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível confirmar.'
    if (e.response?.status === 409) {
      candidate.value = null
      token.value = ''
      candidateOpen.value = false
      scheduled.value = false
    }
  } finally {
    busy.value = false
  }
}
async function configure() {
  busy.value = true
  error.value = ''
  configError.value = ''
  try {
    options.value = (await api.get('/physiotherapy-rotation/options')).data
    mappings.value = {}
    for (const m of options.value.mappings) {
      const p = options.value.professionals.find((p: any) => p.externalId === m.external_id)
      if (p) mappings.value[m.schedule_id] = p.externalId
    }
    configOpen.value = true
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível carregar as agendas.'
  } finally {
    busy.value = false
  }
}
async function saveMappings() {
  busy.value = true
  configError.value = ''
  try {
    await api.put('/physiotherapy-rotation/agendas', {
      mappings: Object.entries(mappings.value)
        .filter(([, id]) => id)
        .map(([schedule_id, external_id]) => ({ schedule_id, external_id })),
    })
    configOpen.value = false
    candidate.value = null
    token.value = ''
    message.value = 'Agendas participantes atualizadas.'
  } catch (e: any) {
    configError.value = e.response?.data?.error || 'Não foi possível salvar as agendas.'
  } finally {
    busy.value = false
  }
}

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => unwrapNoticeValue(message), () => 'info')
useFeedback(() => unwrapNoticeValue(historyError), () => 'error')
useFeedback(() => unwrapNoticeValue(configError), () => 'error')
</script>
