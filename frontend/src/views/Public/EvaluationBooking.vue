<template>
  <main class="booking-page">
    <header class="booking-header"><span class="booking-brand">REALMED<span>Cuidado em movimento</span></span><span class="booking-unit">Realmed Matriz</span></header>
    <div class="booking-content">
      <div class="booking-intro"><span class="booking-eyebrow">AGENDAMENTO ONLINE</span><h1>Sua avaliação começa aqui.</h1><p>Este agendamento é para avaliação. As sessões de fisioterapia são agendadas na clínica após a avaliação.</p></div>
      <section ref="card" class="booking-card" aria-label="Agendar avaliação" :aria-busy="busy">
        <ol class="booking-progress" aria-label="Etapas do agendamento"><li v-for="(label, index) in steps" :key="label" :class="{ current: step === index + 1, done: step > index + 1 }" :aria-current="step === index + 1 ? 'step' : undefined"><span>{{ step > index + 1 ? '✓' : index + 1 }}</span>{{ label }}</li></ol>
        <div class="booking-preparation" role="note"><strong>Confirmação online em preparação</strong><p>{{ config?.enabled ? 'Consulte as datas e os horários de avaliação da Matriz.' : 'As agendas estão sendo preparadas para consulta.' }} A confirmação ainda não está disponível; escolher um horário não faz uma reserva.</p></div>
        <div v-if="initialLoading" class="booking-state" role="status">Carregando informações da clínica…</div>
        <div v-else-if="!config?.enabled" class="booking-state"><h2>Estamos preparando sua agenda</h2><p>{{ error || 'As agendas de avaliação ainda estão sendo configuradas. Para agendar, entre em contato com a recepção.' }}</p><p v-if="config?.contact">{{ config.contact }}</p><button class="booking-secondary" :disabled="busy" @click="loadConfig">Tentar novamente</button></div>
        <template v-else>
          <form v-if="step === 1" @submit.prevent="needsBirthDate ? verifyBirth() : identify()">
            <h2>{{ needsBirthDate ? 'Confirme sua data de nascimento' : 'Vamos começar pelo seu CPF' }}</h2>
            <p class="booking-help">{{ needsBirthDate ? 'Essa conferência permite preencher os dados do seu cadastro.' : 'Vamos verificar se você já tem cadastro na clínica.' }}</p>
            <fieldset :disabled="busy">
              <label for="booking-cpf">CPF<input id="booking-cpf" v-model="cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14" required :readonly="needsBirthDate" /></label>
              <label v-if="needsBirthDate" for="booking-birth-check">Data de nascimento<input id="booking-birth-check" v-model="birthCheck" type="date" min="1900-01-01" :max="config.minDate" required /></label>
              <button class="booking-primary" type="submit">{{ busy ? 'Consultando…' : needsBirthDate ? 'Conferir cadastro' : 'Continuar' }}<span aria-hidden="true">→</span></button>
              <button v-if="needsBirthDate" type="button" class="booking-text" @click="reset">Informar outro CPF</button>
            </fieldset>
          </form>
          <form v-else-if="step === 2" @submit.prevent="saveDetails">
            <h2>{{ existing ? 'Confira seus dados' : 'Preencha seus dados' }}</h2>
            <p class="booking-help">{{ existing ? 'Usaremos seu cadastro existente. As informações abaixo não alteram seu cadastro no Stenci.' : 'Seu cadastro só será criado quando for possível confirmar o agendamento.' }}</p>
            <fieldset :disabled="busy" class="booking-form-grid">
              <label class="booking-wide" for="booking-name">Nome completo<input id="booking-name" v-model="form.name" autocomplete="name" maxlength="160" :readonly="existing && Boolean(originalName)" required /></label>
              <label for="booking-birth">Data de nascimento<input id="booking-birth" v-model="form.birthDate" type="date" min="1900-01-01" :max="config.minDate" :readonly="existing" required /></label>
              <label for="booking-phone">Celular com DDD<input id="booking-phone" v-model="form.phone" type="tel" autocomplete="tel-national" placeholder="(41) 99999-9999" maxlength="20" required /></label>
              <label for="booking-insurance">Convênio<select id="booking-insurance" v-model="selectedInsurance" required @change="changeInsurance"><option value="" disabled>Selecione o convênio</option><option v-for="name in insuranceNames" :key="name">{{ name }}</option></select></label>
              <label for="booking-plan">Plano<select id="booking-plan" v-model="form.insuranceKey" :disabled="!selectedInsurance" required><option value="" disabled>Selecione o plano</option><option v-for="plan in insurancePlans" :key="plan.key" :value="plan.key">{{ plan.planName }}</option></select></label>
              <label for="booking-card">Carteirinha <span v-if="!selectedPlan?.cardRequired">(opcional)</span><input id="booking-card" v-model="form.cardNumber" maxlength="80" :required="selectedPlan?.cardRequired" autocomplete="off" /></label>
              <label for="booking-expiry">Validade <span v-if="!selectedPlan?.expiryRequired">(opcional)</span><input id="booking-expiry" v-model="form.cardExpiry" type="date" :min="config.minDate" :required="selectedPlan?.expiryRequired" /></label>
              <p v-if="!insurances.length" class="booking-wide booking-error">Nenhum convênio disponível. Entre em contato com a recepção.</p>
              <button class="booking-primary booking-wide" :disabled="!insurances.length">{{ busy ? 'Conferindo…' : 'Escolher data e horário' }}<span aria-hidden="true">→</span></button>
            </fieldset>
          </form>
          <div v-else-if="step === 3">
            <h2>Qual horário funciona para você?</h2><p class="booking-help">Avaliação de 20 minutos · Horário de Brasília · Antecedência mínima de 2 horas.</p>
            <fieldset :disabled="busy">
              <div class="booking-day-options" aria-label="Próximos dias"><button v-for="day in quickDates" :key="day" type="button" class="booking-day" :class="{ selected: date === day }" :aria-pressed="date === day" @click="selectDate(day)"><span>{{ weekday(day) }}</span><strong>{{ day.slice(8) }}/{{ day.slice(5, 7) }}</strong></button></div>
              <label for="booking-date">Escolher outra data<input id="booking-date" v-model="date" type="date" :min="config.minDate" :max="config.maxDate" @change="loadAvailability" /></label>
            </fieldset>
            <div v-if="busy" class="booking-state" role="status">Consultando horários…</div>
            <div v-else-if="availabilityError" class="booking-state"><p class="booking-error">{{ availabilityError }}</p><button class="booking-secondary" @click="loadAvailability">Tentar novamente</button></div>
            <template v-else>
              <p v-if="slots.length && !slots.some(slotAvailable)" class="booking-help">Não há horários disponíveis nesta data para seu convênio/plano. Escolha outro dia.</p>
              <div class="booking-slots" aria-label="Horários de avaliação"><button v-for="slot in slots" :key="slot.time" type="button" :disabled="!slotAvailable(slot)" :class="{ selected: selectedTime === slot.time }" :aria-pressed="selectedTime === slot.time" @click="selectedTime = slot.time"><strong>{{ slot.time }}</strong><span>{{ slotAvailable(slot) ? 'Disponível' : 'Ocupado' }}</span></button></div>
            </template>
            <div class="booking-actions"><button class="booking-primary" :disabled="busy || !selectedTime || !slots.some(s => s.time === selectedTime && slotAvailable(s))" @click="step = 4">Revisar agendamento<span aria-hidden="true">→</span></button><button class="booking-text" :disabled="busy" @click="step = 2">Alterar meus dados</button></div>
          </div>
          <div v-else>
            <h2>Confira antes de confirmar</h2><p class="booking-help">O horário escolhido ainda não está reservado.</p>
            <dl class="booking-summary"><div><dt>Paciente</dt><dd>{{ form.name }}</dd></div><div><dt>Convênio e plano</dt><dd>{{ selectedPlan?.insuranceName }} · {{ selectedPlan?.planName }}</dd></div><div><dt>Avaliação</dt><dd>{{ formattedDate(date) }} às {{ selectedTime }}<small>Duração de 20 minutos</small></dd></div><div><dt>Unidade</dt><dd>Realmed Matriz<small>{{ config.address }}</small></dd></div><div v-if="config.contact"><dt>Recepção</dt><dd>{{ config.contact }}</dd></div></dl>
            <p v-if="!selectedStillAvailable" class="booking-error">Este horário precisa ser consultado novamente.</p>
            <div class="booking-confirmation-note"><strong>Nenhum agendamento foi realizado</strong><p>{{ config.confirmationMessage }}</p></div>
            <button class="booking-primary" disabled aria-describedby="booking-confirmation-help">Confirmar agendamento</button><p id="booking-confirmation-help" class="booking-help">A confirmação será habilitada quando a integração de agendamento estiver concluída.</p>
            <button class="booking-text" :disabled="busy" @click="step = 3; loadAvailability()">Alterar data ou horário</button><button class="booking-text" :disabled="busy" @click="step = 2">Alterar meus dados</button>
          </div>
          <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
        </template>
      </section>
      <footer class="booking-footer"><strong>Realmed Matriz</strong><span v-if="config?.address">{{ config.address }}</span><span v-if="config?.contact">{{ config.contact }}</span><p>Alterações e cancelamentos de agendamentos são tratados pela recepção.</p></footer>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { notify } from '@/composables/useNotifications'
type Insurance = { key: string; insuranceName: string; planName: string; cardRequired: boolean; expiryRequired: boolean }
type Slot = { time: string; available: boolean; label: string }
type Config = { enabled: boolean; minDate: string; maxDate: string; serverNow: string; address: string; contact: string; confirmationMessage: string }
const origin = (import.meta.env.VITE_API_URL || 'http://localhost:3005').replace(/\/+$/, '')
// Intentionally independent of staff JWT/interceptors. Context and personal data live only in memory.
const api = axios.create({ baseURL: `${/\/api$/i.test(origin) ? origin : origin + '/api'}/public/evaluation-booking`, timeout: 90000 })
const controller = new AbortController()
const steps = ['Identificação', 'Seus dados', 'Horário', 'Revisão']
const card = ref<HTMLElement>()
const config = ref<Config>(), step = ref(1), busy = ref(false), initialLoading = ref(true), error = ref(''), availabilityError = ref('')
const cpf = ref(''), birthCheck = ref(''), contextToken = ref(''), needsBirthDate = ref(false), existing = ref(false), originalName = ref('')
const form = reactive({ name: '', birthDate: '', phone: '', insuranceKey: '', cardNumber: '', cardExpiry: '' })
const insurances = ref<Insurance[]>([]), selectedInsurance = ref(''), date = ref(''), selectedTime = ref(''), slots = ref<Slot[]>([])
const serverTime = ref(0), clockAnchor = ref(0), elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
const currentTime = computed(() => serverTime.value + elapsed.value)
const insuranceNames = computed(() => [...new Set(insurances.value.map(i => i.insuranceName))])
const insurancePlans = computed(() => insurances.value.filter(i => i.insuranceName === selectedInsurance.value))
const selectedPlan = computed(() => insurances.value.find(i => i.key === form.insuranceKey))
const selectedStillAvailable = computed(() => slots.value.some(s => s.time === selectedTime.value && slotAvailable(s)))
const quickDates = computed(() => { if (!config.value) return []; return Array.from({ length: 7 }, (_, i) => new Date(Date.parse(config.value!.minDate + 'T12:00:00Z') + i * 86400000).toISOString().slice(0, 10)).filter(d => d <= config.value!.maxDate) })
const weekday = (day: string) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z')).replace('.', '')
const formattedDate = (day: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))
function syncClock(value: string) { serverTime.value = Date.parse(value); clockAnchor.value = performance.now(); elapsed.value = 0 }
function slotAvailable(slot: Slot) { return slot.available && serverTime.value > 0 && Date.parse(`${date.value}T${slot.time}:00-03:00`) >= currentTime.value + 7200000 }
function changeInsurance() { form.insuranceKey = insurancePlans.value.length === 1 ? insurancePlans.value[0].key : ''; form.cardNumber = ''; form.cardExpiry = '' }
async function post(path: string, body: unknown = {}) { return (await api.post(path, body, { headers: { 'X-Booking-Context': contextToken.value }, signal: controller.signal })).data }
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await action() } catch (e: any) {
    if (!axios.isCancel(e)) { error.value = e.response?.data?.error || 'Não foi possível concluir a consulta. Tente novamente.'; notify(error.value, 'error'); if (e.response?.status === 410) reset() }
  } finally { busy.value = false }
}
async function loadConfig() { await run(async () => { config.value = (await api.get('/config', { signal: controller.signal })).data; syncClock(config.value!.serverNow); date.value ||= config.value!.minDate }); initialLoading.value = false }
async function loadCatalogs() {
  const data = await post('/catalogs'); insurances.value = data.insurances; existing.value = data.existing
  if (data.patient) Object.assign(form, data.patient)
  originalName.value = data.patient?.name || ''; selectedInsurance.value = selectedPlan.value?.insuranceName || ''; step.value = 2
}
async function identify() { await run(async () => { const data = await post('/identify', { cpf: cpf.value }); contextToken.value = data.context; needsBirthDate.value = data.needsBirthDate; if (!data.needsBirthDate) await loadCatalogs() }) }
async function verifyBirth() { await run(async () => { await post('/birth-date', { birthDate: birthCheck.value }); await loadCatalogs() }) }
async function saveDetails() { await run(async () => { await post('/details', form); step.value = 3; await fetchAvailability() }) }
async function fetchAvailability() {
  slots.value = []; selectedTime.value = ''; availabilityError.value = ''
  try { const data = await post('/availability', { date: date.value }); slots.value = data.slots; syncClock(data.serverNow) }
  catch (e: any) { availabilityError.value = e.response?.data?.error || 'Não foi possível consultar os horários. Tente novamente.'; throw e }
}
async function loadAvailability() { await run(fetchAvailability) }
function selectDate(day: string) { date.value = day; void loadAvailability() }
function reset() {
  if (contextToken.value) void api.delete('/context', { headers: { 'X-Booking-Context': contextToken.value } }).catch(() => {})
  contextToken.value = ''; needsBirthDate.value = false; existing.value = false; step.value = 1; birthCheck.value = ''; slots.value = []; selectedTime.value = ''; selectedInsurance.value = ''; Object.assign(form, { name: '', birthDate: '', phone: '', insuranceKey: '', cardNumber: '', cardExpiry: '' })
}
function visible() { if (!document.hidden && step.value >= 3 && contextToken.value) { step.value = 3; void loadAvailability() } }
watch(step, async () => { await nextTick(); const heading = card.value?.querySelector('h2'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'start' }) } })
onMounted(() => { void loadConfig(); timer = setInterval(() => { elapsed.value = performance.now() - clockAnchor.value }, 1000); document.addEventListener('visibilitychange', visible) })
onBeforeUnmount(() => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); if (contextToken.value) void api.delete('/context', { headers: { 'X-Booking-Context': contextToken.value } }).catch(() => {}) })
</script>
<style scoped>
.booking-page{min-height:100dvh;background:linear-gradient(135deg,#f6f5ff,#f2f7fb);color:#182239;padding:0 20px 28px}.booking-header{max-width:1040px;margin:auto;display:flex;justify-content:space-between;align-items:center;padding:28px 0}.booking-brand{font-size:24px;font-weight:800;letter-spacing:-.5px;color:#4438ee}.booking-brand span{display:block;font-size:11px;font-weight:500;letter-spacing:.3px;color:#67748a}.booking-unit{font-size:12px;padding:9px 13px;border:1px solid #dedff0;border-radius:20px;background:#ffffffa0}.booking-content{max-width:740px;margin:10px auto}.booking-intro{text-align:center;margin:28px auto;max-width:580px}.booking-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;color:#5546d6}.booking-intro h1{font-size:34px;line-height:1.15;margin:12px 0;font-weight:750;letter-spacing:-1px}.booking-intro p,.booking-help{font-size:14px;line-height:1.65;color:#667087}.booking-card{background:white;border:1px solid #e0e3ed;border-radius:24px;padding:30px;box-shadow:0 16px 50px #2835660a}.booking-progress{display:flex;list-style:none;padding:0;gap:12px;margin:0 0 25px;justify-content:space-between}.booking-progress li{display:flex;gap:7px;align-items:center;font-size:11px;color:#8992a4}.booking-progress li>span{display:grid;place-items:center;border-radius:50%;background:#f0f2f7;width:27px;height:27px;font-size:12px;font-weight:700}.booking-progress .current{color:#4438ee;font-weight:700}.booking-progress .current>span{background:#4438ee;color:white}.booking-progress .done>span{background:#e6f7f0;color:#08775a}.booking-preparation{border-left:3px solid #8981ed;border-radius:7px;background:#f5f4ff;padding:12px 14px;font-size:12px;line-height:1.6;margin-bottom:25px;color:#514d7d}.booking-preparation p{margin:3px 0 0}.booking-card h2{font-size:22px;font-weight:700;line-height:1.35;margin:0 0 8px}.booking-help{margin:0 0 20px}.booking-card fieldset{border:0;padding:0;min-width:0;margin:0}.booking-card label{font-size:13px;font-weight:600;display:flex;flex-direction:column;gap:8px;margin:0 0 18px}.booking-card label>span{font-size:11px;color:#7d8798;font-weight:400}.booking-card input,.booking-card select{font-family:inherit;font-size:16px;color:#182239;background:white;border:1px solid #d5dbea;border-radius:10px;width:100%;min-width:0;height:48px;padding:10px 13px;box-sizing:border-box}.booking-card input:read-only{background:#f5f7fa;color:#5c687c}.booking-card input:focus,.booking-card select:focus{outline:2px solid #867aff;outline-offset:2px}.booking-card button{font-family:inherit;cursor:pointer;min-height:44px}.booking-card button:disabled{cursor:not-allowed}.booking-primary{border:0;border-radius:11px;display:flex;justify-content:center;align-items:center;gap:20px;width:100%;font-size:14px;font-weight:650;padding:14px;background:#493bfa;color:white}.booking-primary:disabled{background:#edecf7;color:#85819d}.booking-secondary{padding:10px 18px;border:1px solid #d5dbea;border-radius:10px;background:white;color:#4134cc}.booking-text{border:0;background:none;font-size:13px;color:#5647d9;padding:10px 13px}.booking-form-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:18px}.booking-wide{grid-column:1/-1}.booking-state{padding:24px 0;text-align:center;line-height:1.7;color:#667087}.booking-state p{margin:12px 0 20px}.booking-error{color:#bd2727;font-size:13px;line-height:1.6;margin:16px 0}.booking-day-options{display:flex;gap:7px;overflow:auto;padding:3px 2px 15px}.booking-day{min-width:70px;border:1px solid #e0e3ef;border-radius:10px;background:white;padding:8px 10px;flex:1;display:grid;gap:4px;text-align:center}.booking-day span{font-size:11px;color:#6e788c}.booking-day strong{font-size:14px}.booking-slots{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin:20px 0}.booking-slots button{border:1px solid #cfc9ff;border-radius:9px;background:#faf9ff;color:#4735cc;display:grid;gap:4px;padding:10px 3px}.booking-slots strong{font-size:15px}.booking-slots span{font-size:10px}.booking-slots button:disabled{background:#f5f6f8;border-color:#e7eaf0;color:#8a92a3}.booking-card .selected{background:#4c3df4;border-color:#4c3df4;color:white}.booking-card .selected span{color:#eeeaff}.booking-actions{margin-top:24px}.booking-summary{margin:20px 0;padding:4px 20px;background:#f7f8fc;border-radius:12px}.booking-summary>div{padding:13px 0;border-bottom:1px solid #e7eaf3}.booking-summary>div:last-child{border:0}.booking-summary dt{font-size:11px;color:#6a7488;margin-bottom:5px}.booking-summary dd{margin:0;font-weight:600;font-size:16px}.booking-summary small{display:block;font-size:12px;font-weight:400;margin-top:5px}.booking-confirmation-note{background:#fff8e9;border:1px solid #f2ddb3;border-radius:10px;padding:15px;margin:20px 0;font-size:13px;color:#7c581b;line-height:1.6}.booking-confirmation-note p{margin:5px 0 0}.booking-footer{display:flex;flex-direction:column;text-align:center;gap:6px;color:#717c90;font-size:12px;padding:26px 0;line-height:1.5}.booking-footer p{font-size:11px;margin-top:8px}.booking-card button:focus-visible{outline:3px solid #978bfa;outline-offset:3px}@media(max-width:600px){.booking-page{padding:0 12px 20px}.booking-header{padding:20px 5px}.booking-brand{font-size:21px}.booking-unit{font-size:10px}.booking-content{margin:0 auto}.booking-intro{margin:18px 8px 24px}.booking-intro h1{font-size:28px}.booking-intro p{font-size:13px}.booking-card{padding:20px 16px;border-radius:18px}.booking-progress{gap:5px}.booking-progress li{flex-direction:column;gap:5px;font-size:10px;flex:1}.booking-card h2{font-size:21px}.booking-form-grid{grid-template-columns:1fr}.booking-slots{grid-template-columns:repeat(4,1fr);gap:8px}.booking-preparation{font-size:11px}.booking-day{min-width:65px}.booking-slots button{min-height:62px}}
</style>
<style scoped>
/* On computers the page uses the available width, while the phone keeps its single-column flow. */
.booking-header,.booking-content{max-width:1280px}
@media(min-width:961px){
  .booking-page{padding:0 40px 28px}
  .booking-header{padding:30px 0}
  .booking-content{display:grid;grid-template-columns:minmax(230px,300px) minmax(0,1fr);gap:28px 40px;align-items:start;margin-top:24px}
  .booking-intro{text-align:left;margin:24px 0;max-width:none}
  .booking-intro h1{font-size:44px;line-height:1.13;margin:18px 0 22px}
  .booking-intro p{font-size:16px;line-height:1.8}
  .booking-eyebrow{font-size:12px}
  .booking-card{padding:36px;min-width:0}
  .booking-card h2{font-size:26px}
  .booking-progress li{font-size:13px}
  .booking-progress li>span{width:32px;height:32px;font-size:14px;flex-shrink:0}
  .booking-preparation{font-size:13px}
  .booking-help,.booking-card label{font-size:15px}
  .booking-primary,.booking-secondary{font-size:16px}
  .booking-card input,.booking-card select{height:52px}
  .booking-slots{gap:12px}
  .booking-slots button{min-height:72px}
  .booking-slots strong{font-size:18px}
  .booking-slots span{font-size:12px}
  .booking-day{min-width:0;min-height:65px}
  .booking-day span{font-size:12px}
  .booking-day strong{font-size:16px}
  .booking-footer{grid-column:2;padding:0 0 20px}
}
@media(min-width:601px) and (max-width:960px){.booking-content{max-width:880px}.booking-intro{max-width:640px}.booking-card{padding:28px}}
</style>
