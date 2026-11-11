<template>
  <main class="physio-shell min-h-screen bg-slate-100 text-slate-900">
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[.18em] text-blue-700">REALMED · Atendimento</p>
          <h1 class="truncate text-lg font-semibold sm:text-xl">{{ profile?.professionalName || 'Modo Fisioterapeuta' }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink to="/central-de-guias/dashboard" class="hidden rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium sm:block">Sistema completo</RouterLink>
          <button class="min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" @click="logout">Sair</button>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-8">
      <nav class="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm" aria-label="Seções do modo fisioterapeuta">
        <button v-for="tab in tabs" :key="tab.key" class="min-h-14 rounded-xl px-2 text-sm font-semibold sm:text-base" :class="activeTab === tab.key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'" @click="activeTab = tab.key">{{ tab.label }}</button>
      </nav>

      <div v-if="profile?.developmentMode" class="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950" role="status">
        Login facial validado. Modo de desenvolvimento: a conexão com o Stenci está desligada para permitir montar e revisar estas telas.
      </div>
      

      <section v-if="activeTab === 'agenda'" class="mt-5 space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div><h2 class="text-xl font-semibold">Minha agenda</h2><p class="mt-1 text-sm text-slate-500">Consultas nas agendas associadas ao seu perfil</p></div>
          <label class="text-sm font-medium">Data<input v-model="date" type="date" class="input mt-1 block min-h-12 w-full min-w-44" @change="loadAgenda" /></label>
        </div>
        <div v-if="profile?.developmentMode" class="rounded-2xl bg-white p-8 text-center text-slate-600">A agenda aparecerá aqui quando a integração Stenci for habilitada.</div>
        <div v-else-if="loadingAgenda" class="rounded-2xl bg-white p-8 text-center text-slate-500">Carregando agenda…</div>
        <div v-else-if="!appointments.length" class="rounded-2xl bg-white p-10 text-center">
          <p class="text-lg font-semibold">Nenhum atendimento encontrado</p><p class="mt-2 text-sm text-slate-500">Não há atendimentos nas agendas vinculadas para esta data.</p>
        </div>
        <div v-else class="space-y-3">
          <article v-for="appointment in appointments" :key="appointment.id" class="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div class="text-2xl font-semibold tabular-nums text-blue-800">{{ time(appointment.startDate) }}</div>
            <div class="min-w-0"><h3 class="truncate text-lg font-semibold">{{ appointment.patient_name }}</h3><p class="mt-1 text-sm text-slate-500">{{ appointment.schedule_name || 'Agenda' }}<span v-if="appointment.insurance_name"> · {{ appointment.insurance_name }}</span></p></div>
            <div class="justify-self-start rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 sm:justify-self-end">{{ statusLabel(appointment.status) }}</div>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'pacientes'" class="mt-5 space-y-4">
        <form class="rounded-2xl bg-white p-4 shadow-sm sm:p-6" @submit.prevent="searchPatients">
          <h2 class="text-xl font-semibold">Pacientes</h2><p class="mt-1 text-sm text-slate-500">Busque no cadastro do Stenci por nome ou CPF.</p>
          <div class="mt-4 flex flex-col gap-3 sm:flex-row"><input v-model="patientQuery" class="input min-h-14 flex-1 text-base" autocomplete="off" placeholder="Nome ou CPF do paciente" :disabled="profile?.developmentMode" /><button class="min-h-14 rounded-xl bg-blue-700 px-7 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="searching || profile?.developmentMode">{{ profile?.developmentMode ? 'Indisponível no modo de desenvolvimento' : searching ? 'Buscando…' : 'Buscar' }}</button></div>
        </form>
        <div v-if="profile?.developmentMode" class="rounded-2xl bg-white p-8 text-center text-slate-600">A busca de pacientes será habilitada com a conexão Stenci.</div>
        <div v-else-if="searching" class="rounded-2xl bg-white p-8 text-center text-slate-500">Buscando pacientes…</div>
        <div v-else-if="patientResults.length" class="space-y-3">
          <article v-for="patient in patientResults" :key="patient.external_id" class="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div><h3 class="text-lg font-semibold">{{ patient.full_name }}</h3><p class="mt-1 text-sm text-slate-500">CPF {{ cpf(patient.cpf) }}<span v-if="patient.birth_date"> · Nasc. {{ simpleDate(patient.birth_date) }}</span><span v-if="patient.phone"> · {{ patient.phone }}</span></p></div>
              <span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{{ patient.appointments.length }} atendimento(s) encontrado(s)</span>
            </div>
            <div class="mt-4 border-t border-slate-100 pt-3">
              <h4 class="text-sm font-semibold">Atendimentos nas agendas vinculadas</h4>
              <div v-if="patient.appointments.length" class="mt-2 grid gap-2 sm:grid-cols-2">
                <div v-for="visit in patient.appointments" :key="visit.id" class="rounded-xl bg-slate-50 p-3 text-sm"><b>{{ simpleDate(visit.date) }} · {{ time(visit.startAt) }}</b><span class="block text-slate-600">{{ visit.schedule }} · {{ statusLabel(visit.status) }}</span></div>
              </div>
              <p v-else class="mt-2 text-sm text-slate-500">Não há atendimentos desta pessoa no histórico disponível das suas agendas.</p>
            </div>
          </article>
        </div>
        <div v-else-if="searched" class="rounded-2xl bg-white p-8 text-center text-slate-500">Nenhum paciente localizado.</div>
      </section>

      <section v-if="activeTab === 'producao'" class="mt-5 space-y-4">
        <form class="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6" @submit.prevent="loadProduction">
          <div class="sm:col-span-3"><h2 class="text-xl font-semibold">Minha produção</h2><p class="mt-1 text-sm text-slate-500">Resumo das agendas associadas no período selecionado.</p></div>
          <label class="text-sm font-medium">De<input v-model="periodStart" type="date" class="input mt-1 min-h-12 w-full" /></label>
          <label class="text-sm font-medium">Até<input v-model="periodEnd" type="date" class="input mt-1 min-h-12 w-full" /></label>
          <button class="min-h-12 rounded-xl bg-blue-700 px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="loadingProduction || profile?.developmentMode">{{ profile?.developmentMode ? 'Indisponível no modo de desenvolvimento' : loadingProduction ? 'Carregando…' : 'Gerar relatório' }}</button>
        </form>
        <div v-if="profile?.developmentMode" class="rounded-2xl bg-white p-8 text-center text-slate-600">A produção será exibida aqui quando a conexão Stenci for habilitada.</div>
        <div v-if="production" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl bg-white p-5 shadow-sm"><p class="text-sm text-slate-500">Atendimentos</p><p class="mt-1 text-3xl font-semibold">{{ production.totals.appointments }}</p></div>
            <div class="rounded-2xl bg-white p-5 shadow-sm"><p class="text-sm text-slate-500">Finalizados no Stenci</p><p class="mt-1 text-3xl font-semibold">{{ production.totals.completed }}</p></div>
            <div class="rounded-2xl bg-white p-5 shadow-sm"><p class="text-sm text-slate-500">Sessões</p><p class="mt-1 text-3xl font-semibold">{{ production.totals.sessions }}</p></div>
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3"><h3 class="font-semibold">Produção por dia</h3><button class="min-h-12 rounded-xl border border-slate-300 px-5 font-semibold" :disabled="!production.days.length" @click="shareProduction">Encaminhar resumo</button></div>
            <div v-if="production.days.length" class="mt-4 divide-y divide-slate-100"><div v-for="day in production.days" :key="day.date" class="grid grid-cols-[1fr_repeat(3,auto)] gap-3 py-3 text-sm"><b>{{ simpleDate(day.date) }}</b><span>{{ day.appointments }} atend.</span><span>{{ day.completed }} final.</span><span>{{ day.sessions }} sessões</span></div></div>
            <p v-else class="mt-4 text-sm text-slate-500">Sem registros no período coletado.</p>
          </div>
          <p class="text-xs text-slate-500">O resumo considera os dados coletados das agendas do Stenci e pode não incluir dias ainda não coletados.</p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '@/plugins/axios'

type Appointment = { id: string; patient_name: string; startDate: string; status: string; schedule_name?: string; insurance_name?: string }
type Patient = { external_id: string; full_name: string; cpf?: string | null; birth_date?: string | null; phone?: string | null; appointments: Array<{ id: string; date: string; schedule: string; startAt: string; status: string; isSession: boolean }> }
type Production = { start: string; end: string; totals: { appointments: number; completed: number; sessions: number }; days: Array<{ date: string; appointments: number; completed: number; sessions: number }> }
const router = useRouter()
const tabs = [{ key: 'agenda', label: 'Agenda' }, { key: 'pacientes', label: 'Pacientes' }, { key: 'producao', label: 'Produção' }]
const activeTab = ref('agenda')
const profile = ref<any>(null)
const appointments = ref<Appointment[]>([])
const date = ref(localDate())
const loadingAgenda = ref(false)
const patientQuery = ref('')
const patientResults = ref<Patient[]>([])
const searching = ref(false)
const searched = ref(false)
const periodStart = ref(`${date.value.slice(0, 7)}-01`)
const periodEnd = ref(date.value)
const production = ref<Production | null>(null)
const loadingProduction = ref(false)
const message = ref('')
const error = ref('')

function localDate() {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const get = (type: string) => values.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
const errorText = (cause: unknown, fallback: string) => (cause as any).response?.data?.error || fallback
async function loadAgenda() {
  if (profile.value?.developmentMode) return
  loadingAgenda.value = true
  error.value = ''
  try { appointments.value = (await api.get('/physio/agenda', { params: { date: date.value } })).data.items }
  catch (cause) { error.value = errorText(cause, 'Não foi possível carregar a agenda.') }
  finally { loadingAgenda.value = false }
}
async function searchPatients() {
  if (profile.value?.developmentMode) return
  if (patientQuery.value.trim().length < 2) { error.value = 'Digite pelo menos dois caracteres para buscar.'; return }
  searching.value = true; searched.value = true; error.value = ''; patientResults.value = []
  try { patientResults.value = (await api.get('/physio/patients/search', { params: { search: patientQuery.value.trim() } })).data.items }
  catch (cause) { error.value = errorText(cause, 'Não foi possível buscar pacientes.') }
  finally { searching.value = false }
}
async function loadProduction() {
  if (profile.value?.developmentMode) return
  loadingProduction.value = true; error.value = ''
  try { production.value = (await api.get('/physio/production', { params: { start: periodStart.value, end: periodEnd.value } })).data }
  catch (cause) { error.value = errorText(cause, 'Não foi possível gerar o relatório.') }
  finally { loadingProduction.value = false }
}
async function shareProduction() {
  if (!production.value) return
  const report = production.value
  const text = [`Produção de ${profile.value?.professionalName || 'Fisioterapia'}`, `Período: ${simpleDate(report.start)} a ${simpleDate(report.end)}`, `Atendimentos: ${report.totals.appointments}`, `Finalizados: ${report.totals.completed}`, `Sessões: ${report.totals.sessions}`, '', ...report.days.map((day) => `${simpleDate(day.date)}: ${day.appointments} atendimentos, ${day.completed} finalizados, ${day.sessions} sessões`)].join('\n')
  try {
    if (navigator.share) await navigator.share({ title: 'Relatório de produção — Realmed', text })
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text); message.value = 'Resumo copiado. Você pode colar e encaminhar pelo aplicativo desejado.' }
    else error.value = 'O compartilhamento não está disponível neste dispositivo.'
  } catch (cause) { if ((cause as any).name !== 'AbortError') error.value = 'Não foi possível compartilhar o relatório.' }
}
async function logout() {
  try { await api.post('/auth/logout') } catch { /* token is cleared locally even if the network is unavailable */ }
  localStorage.removeItem('token')
  await router.replace('/modo-fisio/entrar')
}
function time(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value).slice(11, 16) : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(date) }
function simpleDate(value: string) { return String(value || '').slice(0, 10).split('-').reverse().join('/') }
function cpf(value?: string | null) { const digits = String(value || '').replace(/\D/g, ''); return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : value || '—' }
function statusLabel(status: string) { return ({ finished: 'Finalizado', open: 'Agendado', in_billing: 'Em faturamento', closed: 'Encerrado', patient_canceled: 'Cancelado pelo paciente', canceled: 'Cancelado' } as Record<string, string>)[status] || 'Agendado' }
watch(activeTab, (value) => { if (value === 'producao' && !production.value && !profile.value?.developmentMode) void loadProduction() })
onMounted(async () => {
  try { profile.value = (await api.get('/physio/me')).data; if (!profile.value.developmentMode) await loadAgenda() }
  catch (cause) { error.value = errorText(cause, 'Não foi possível abrir o modo fisioterapeuta.') }
})

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => message.value, () => 'info')
</script>

