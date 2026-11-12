<template>
  <main class="physio-shell min-h-screen bg-slate-100 text-slate-900">
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[.18em] text-blue-700">REALMED · Atendimento</p>
          <h1 class="truncate text-lg font-semibold sm:text-xl">{{ profile?.professionalName || 'Modo Fisioterapeuta' }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink :to="systemHome" class="hidden rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium sm:block">Sistema completo</RouterLink>
          <button class="min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" @click="logout">Sair</button>
        </div>
      </div>
    </header>

    <div class="physio-main mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-8">
      <nav class="physio-mode-tabs grid grid-cols-4 gap-1 rounded-2xl bg-white p-2 shadow-sm sm:gap-2" aria-label="Seções do modo fisioterapeuta">
        <button v-for="tab in tabs" :key="tab.key" class="min-h-14 rounded-xl px-1 text-xs font-semibold sm:px-2 sm:text-base" :aria-pressed="activeTab === tab.key" :class="activeTab === tab.key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'" @click="activeTab = tab.key">{{ tab.label }}</button>
      </nav>

      <div v-if="profile?.developmentMode" class="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950" role="status">
        Login facial validado. Modo de desenvolvimento: a conexão com o Stenci está desligada para permitir montar e revisar estas telas.
      </div>
      <div v-else-if="profile && profile.schedules?.length === 0" class="mt-5 rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-sm" role="status">Seu usuário está vinculado a {{ profile.professionalName }}, mas esse profissional ainda não tem uma agenda Stenci associada. Solicite o vínculo da agenda ao administrador.</div>
      

      <section v-if="activeTab === 'agenda'" class="mt-5 space-y-4">
        <div class="physio-agenda-heading flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div><h2 class="text-xl font-semibold">Minha agenda</h2><p class="mt-1 text-sm text-slate-500">{{ sessions.length }} sessões · {{ appointments.length }} pacientes agendados</p></div>
          <label class="text-sm font-medium">Data<input v-model="date" type="date" class="input mt-1 block min-h-12 w-full min-w-44" @change="loadAgenda" /></label>
        </div>
        <div v-if="profile?.developmentMode" class="rounded-2xl bg-white p-8 text-center text-slate-600">A agenda aparecerá aqui quando a integração Stenci for habilitada.</div>
        <div v-else-if="loadingAgenda" class="rounded-2xl bg-white p-8 text-center text-slate-500">Carregando agenda…</div>
        <div v-else-if="!appointments.length" class="rounded-2xl bg-white p-10 text-center">
          <p class="text-lg font-semibold">Nenhum atendimento encontrado</p><p class="mt-2 text-sm text-slate-500">Não há atendimentos nas agendas vinculadas para esta data.</p>
        </div>
        <div v-else class="space-y-5">
          <section v-for="session in agendaSessions" :key="session.id" class="physio-session" :class="{'is-current':session.access === 'current'}" :aria-labelledby="`session-${session.number}`">
            <header class="physio-session-header">
              <h3 :id="`session-${session.number}`">
                <button type="button" class="physio-session-toggle" :aria-expanded="expandedSessions.has(session.id)" :aria-controls="`session-patients-${session.number}`" @click="toggleSession(session.id)">
                  <span class="physio-session-main">
                    <span class="physio-session-title"><span>Sessão {{ session.number }}</span><strong>{{ session.start_time }} – {{ session.end_time }}<small v-if="session.end_next_day"> (+1 dia)</small></strong></span>
                    <span class="physio-session-description">{{ session.schedule_name }}<span v-if="session.end_estimated"> · Fim previsto{{ session.end_source === 'default_45' ? ' (45 min)' : ' pelo intervalo anterior' }}</span></span>
                  </span>
                  <span class="physio-session-aside">
                    <span class="physio-session-state"><span class="physio-session-access" :class="session.access">{{ sessionAccessLabel[session.access] }}</span><span class="physio-session-count">{{ session.items.length }} {{ session.items.length === 1 ? 'paciente' : 'pacientes' }}</span></span>
                    <svg class="physio-session-chevron" :class="{'is-expanded':expandedSessions.has(session.id)}" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                  </span>
                </button>
              </h3>
            </header>
            <div v-if="expandedSessions.has(session.id)" :id="`session-patients-${session.number}`" class="physio-patients-grid">
              <component :is="session.access === 'current' ? RouterLink : 'article'" v-for="appointment in session.items" :key="appointment.id" :to="session.access === 'current' ? {path:`/modo-fisio/atendimentos/${appointment.id}`,query:{date}} : undefined" class="physio-patient-card" :class="{'is-locked':session.access !== 'current'}" :aria-disabled="session.access === 'current' ? undefined : 'true'" :aria-label="session.access === 'current' ? `Abrir atendimento de ${appointment.patient_name}` : `${appointment.patient_name} · ${sessionAccessLabel[session.access]}`">
                <div class="physio-patient-card-main"><h4>{{ appointment.patient_name }}</h4><p>{{ appointment.insurance_name || 'Convênio não informado' }}</p></div>
                <div class="physio-patient-card-footer"><PhysioAppointmentStatus :status="appointment.status" /><span v-if="session.access === 'current'" class="physio-patient-open" aria-hidden="true">Abrir <span>›</span></span><svg v-else aria-hidden="true" class="physio-patient-lock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></div>
              </component>
            </div>
          </section>
        </div>
      </section>

      <section v-if="activeTab === 'pacientes'" class="mt-5 space-y-4">
        <form class="rounded-2xl bg-white p-4 shadow-sm sm:p-6" @submit.prevent="searchPatients">
          <h2 class="text-xl font-semibold">Meus pacientes</h2><p class="mt-1 text-sm text-slate-500">Busque por nome ou CPF. São exibidos somente pacientes com atendimentos nas suas agendas vinculadas.</p>
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
                <div v-for="visit in patient.appointments" :key="visit.id" class="rounded-xl bg-slate-50 p-3 text-sm"><b>{{ simpleDate(visit.date) }} · {{ time(visit.startAt) }}</b><span class="mb-2 block text-slate-600">{{ visit.schedule }}</span><PhysioAppointmentStatus :status="visit.status" /></div>
              </div>
              <p v-else class="mt-2 text-sm text-slate-500">Não há atendimentos desta pessoa no histórico disponível das suas agendas.</p>
            </div>
          </article>
        </div>
        <div v-else-if="searched" class="rounded-2xl bg-white p-8 text-center text-slate-500">Nenhum paciente localizado.</div>
        <p v-if="patientHasMore" class="text-sm text-slate-600">Há mais resultados no cadastro. Refine o nome ou informe o CPF para localizar o paciente.</p>
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
      <PhysioSettings v-if="profile && settingsOpened" v-show="activeTab === 'configuracoes'" class="mt-5" :schedules="profile.schedules || []" :sessions="sessions" :date="date" :loading="loadingAgenda" :load-error="agendaError" :development-mode="profile.developmentMode" @load-date="loadSettingsDate" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import api, { ensurePhysioSession } from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
import { userHome } from '@/utils/userHome'
import PhysioAppointmentStatus from '@/components/PhysioAppointmentStatus.vue'
import PhysioSettings from './PhysioSettings.vue'
import {physioTime as time, sessionAccess, sessionAccessLabel, type PhysioAppointment, type PhysioSession} from '@/utils/physioAgenda'
import {usePhysioClock} from '@/composables/usePhysioClock'

type Patient = { external_id: string; full_name: string; cpf?: string | null; birth_date?: string | null; phone?: string | null; appointments: Array<{ id: string; date: string; schedule: string; startAt: string; status: string; isSession: boolean }> }
type Production = { start: string; end: string; totals: { appointments: number; completed: number; sessions: number }; days: Array<{ date: string; appointments: number; completed: number; sessions: number }> }
const router = useRouter()
const route = useRoute()
const {authUser}=useAuthUser()
const systemHome=computed(()=>userHome(authUser.value,false))
const tabs = [{ key: 'agenda', label: 'Agenda' }, { key: 'pacientes', label: 'Pacientes' }, { key: 'producao', label: 'Produção' }, { key: 'configuracoes', label: 'Configurações' }]
const activeTab = ref('agenda')
const settingsOpened = ref(false)
const profile = ref<any>(null)
const appointments = ref<PhysioAppointment[]>([])
const sessions = ref<PhysioSession[]>([])
const expandedSessions = ref(new Set<string>())
const clock = usePhysioClock(() => { if(profile.value) void loadAgenda() })
const agendaSessions = computed(() => sessions.value.map(session=>({...session,access:sessionAccess(session,date.value,clock.now.value)})))
const date = ref(typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date) ? route.query.date : localDate())
let agendaRequest = 0
let agendaAbort: AbortController | undefined
const loadingAgenda = ref(false)
const agendaError = ref('')
const patientQuery = ref('')
const patientResults = ref<Patient[]>([])
const patientHasMore = ref(false)
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
  const request = ++agendaRequest, selectedDate = date.value
  agendaAbort?.abort(); const controller = new AbortController(); agendaAbort = controller
  await router.replace({query:{...route.query,date:selectedDate}})
  if(request !== agendaRequest)return
  loadingAgenda.value = true
  clock.invalidate()
  agendaError.value = ''
  error.value = ''
  try { const {data} = await api.get('/physio/agenda', { params: { date: selectedDate }, signal:controller.signal }); if(request !== agendaRequest)return; appointments.value=data.items; sessions.value=data.sessions || []; clock.sync(data.server_time) }
  catch (cause) { if(request !== agendaRequest || (cause as any).code==='ERR_CANCELED')return; appointments.value=[]; sessions.value=[]; agendaError.value = errorText(cause, 'Não foi possível carregar a agenda.'); error.value = agendaError.value }
  finally { if(request === agendaRequest)loadingAgenda.value = false }
}
function loadSettingsDate(value: string) { date.value = value; void loadAgenda() }
function toggleSession(id: string) {
  if (expandedSessions.value.has(id)) expandedSessions.value.delete(id)
  else expandedSessions.value.add(id)
}
watch(date, () => { expandedSessions.value = new Set() })
onBeforeUnmount(()=>{agendaRequest++;agendaAbort?.abort()})
async function searchPatients() {
  patientHasMore.value = false
  if (profile.value?.developmentMode) return
  if (patientQuery.value.trim().length < 2) { error.value = 'Digite pelo menos dois caracteres para buscar.'; return }
  searching.value = true; searched.value = true; error.value = ''; patientResults.value = []
  try { const {data} = await api.get('/physio/patients/search', { params: { search: patientQuery.value.trim() } }); patientResults.value = data.items; patientHasMore.value=Boolean(data.hasMore) }
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
function simpleDate(value: string) { return String(value || '').slice(0, 10).split('-').reverse().join('/') }
function cpf(value?: string | null) { const digits = String(value || '').replace(/\D/g, ''); return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : value || '—' }
watch(activeTab, (value) => { if(value === 'configuracoes') settingsOpened.value = true; if (value === 'producao' && !production.value && !profile.value?.developmentMode) void loadProduction() })
onMounted(async () => {
  try { profile.value = (await api.get('/physio/me')).data; if (profile.value.needsSession) profile.value=await ensurePhysioSession(); if (!profile.value.developmentMode) await loadAgenda() }
  catch (cause) { error.value = errorText(cause, 'Não foi possível abrir o modo fisioterapeuta.') }
})

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => message.value, () => 'info')
</script>

<style scoped>
.physio-session{border:1px solid #dce5f0;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 1px 3px #102a4310}
.physio-session-header{background:#eff5ff}.physio-session-header h3{margin:0}
.physio-session-toggle{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;min-height:48px;padding:14px 18px;text-align:left;cursor:pointer}.physio-session-toggle:hover{background:#e5eeff}.physio-session-toggle:focus-visible{outline:2px solid #2563eb;outline-offset:-3px}.physio-session-toggle[aria-expanded="true"]{border-bottom:1px solid #dce5f0}
.physio-session-main{min-width:0}.physio-session-title{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}.physio-session-title>span{font-size:14px;color:#365d8e;font-weight:600}.physio-session-header strong{font-size:22px;line-height:1.2;color:#143864}.physio-session-header small{font-size:12px}.physio-session-description{display:block;font-size:12px;font-weight:400;color:#526b8b;margin-top:5px;overflow-wrap:anywhere}.physio-session-count{font-size:12px;font-weight:400;color:#365d8e;white-space:nowrap}
.physio-session-aside{display:flex;align-items:center;gap:12px;flex-shrink:0}.physio-session-chevron{flex:none;color:#365d8e}.physio-session-chevron.is-expanded{transform:rotate(180deg)}
.physio-patients-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px}
.physio-patient-card{display:flex;flex-direction:column;justify-content:space-between;gap:14px;border:1px solid #dce3ed;border-radius:12px;padding:16px;min-height:116px;text-decoration:none;color:#102a43;transition:background-color .15s,border-color .15s}
.physio-patient-card:hover,.physio-patient-card:focus-visible{background:#f8fbff;border-color:#5488ee;outline:2px solid #5488ee;outline-offset:2px}.physio-patient-card:active{background:#edf4ff}
.physio-patient-card.is-locked,.physio-patient-card.is-locked:hover,.physio-patient-card.is-locked:active{background:#f8fafc;border-color:#e0e6ef;outline:none;cursor:default}.physio-patient-lock{flex:none;color:#7a899d}.physio-session.is-current{border-color:#93b4ed}.physio-session-state{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.physio-session-access{font-size:11px;white-space:nowrap;color:#64748b}.physio-session-access.current{font-weight:700;color:#08765b}
.physio-patient-card h4{font-size:18px;line-height:1.3;font-weight:700;overflow-wrap:anywhere}.physio-patient-card p{font-size:12px;color:#61738c;margin-top:5px}.physio-patient-card-footer{display:flex;justify-content:space-between;align-items:center;gap:10px}.physio-patient-open{display:flex;align-items:center;gap:6px;white-space:nowrap;font-size:12px;color:#2463ba}.physio-patient-open>span{font-size:24px}
@media(min-width:1000px){.physio-patients-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:639px){.physio-mode-tabs{grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,1.4fr)}.physio-mode-tabs button{min-width:0;font-size:clamp(10px,3vw,12px);padding-inline:2px}}
@media(orientation:landscape) and (max-height:800px){.physio-shell>header{padding-top:7px;padding-bottom:7px}.physio-main{padding-top:12px;padding-bottom:16px}.physio-mode-tabs{padding:4px}.physio-mode-tabs button{min-height:48px}.physio-main>section{margin-top:12px}.physio-agenda-heading{padding:10px 16px;align-items:center}.physio-agenda-heading>label{display:flex;align-items:center;gap:10px}.physio-agenda-heading input{margin-top:0}.physio-session-toggle{padding:11px 16px}.physio-patients-grid{padding:10px;gap:10px}.physio-patient-card{padding:12px;gap:10px;min-height:110px}.physio-patient-card h4{font-size:16px}}
@media(max-width:639px){.physio-patients-grid{grid-template-columns:minmax(0,1fr);padding:10px}.physio-session-toggle{padding:12px;flex-wrap:wrap}.physio-session-title{gap:7px}.physio-session-aside{margin-left:auto}.physio-session-header strong{font-size:20px}}
/* Tablet density: reduce the occupied space without changing browser zoom. */
@media screen and (min-width:640px) and (max-width:1368px), screen and (min-width:640px) and (pointer:coarse){
  .physio-shell>header{padding:5px 22px}.physio-shell>header h1{font-size:16px;line-height:1.3}.physio-shell>header p{font-size:10px;line-height:1.4}
  .physio-shell>header :is(button,a){min-height:36px;padding:7px 12px;font-size:12px;border-radius:8px}
  .physio-main{padding:8px 22px 14px}.physio-mode-tabs{padding:3px;gap:6px;border-radius:12px}.physio-mode-tabs button{min-height:36px;padding:5px 8px;border-radius:8px;font-size:13px}
  .physio-main>section{margin-top:8px}.physio-main :is(.space-y-4,.space-y-5)>:not(:last-child){margin-block-end:10px}
  .physio-main :is(.p-4,.p-5,.p-6){padding:12px}.physio-main :is(.p-8,.p-10){padding:22px}.physio-main .p-3{padding:8px}.physio-main .gap-3{gap:8px}.physio-main .gap-4{gap:10px}.physio-main .mt-4{margin-top:10px}
  .physio-main .text-xl{font-size:16px;line-height:1.4}.physio-main .text-lg{font-size:15px;line-height:1.4}.physio-main .text-base{font-size:13px}.physio-main .text-sm{font-size:12px;line-height:1.45}.physio-main .text-3xl{font-size:22px;line-height:1.25}
  .physio-main :is(.min-h-12,.min-h-14){min-height:36px}.physio-main :is(input.input,select.input){padding:7px 10px;font-size:13px;line-height:1.4;border-radius:8px}
  .physio-main button:not(.settings-session){font-size:12px}.physio-main :is(button.px-5,button.px-6,button.px-7){padding-inline:14px}
  .physio-main .physio-agenda-heading{padding:7px 12px;gap:10px;align-items:center}.physio-agenda-heading>label{display:flex;align-items:center;gap:8px}.physio-agenda-heading input{margin-top:0;min-width:150px}
  .physio-session{border-radius:12px}.physio-session-toggle{padding:7px 11px;gap:8px}.physio-session-title{gap:10px}.physio-session-title>span{font-size:12px}.physio-session-header strong{font-size:16px}.physio-session-description{font-size:11px;margin-top:3px}.physio-session-count{font-size:11px}.physio-session-aside{gap:8px}
  .physio-patients-grid{padding:7px;gap:7px}.physio-patient-card{padding:7px;gap:6px;min-height:78px;border-radius:8px}.physio-patient-card h4{font-size:13px;line-height:1.3}.physio-patient-card p{font-size:11px;line-height:1.3;margin-top:3px}.physio-patient-card-footer{gap:7px}.physio-patient-open{font-size:11px;gap:4px}.physio-patient-open>span{font-size:18px}
}
</style>

