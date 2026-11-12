<template>
  <section class="physio-settings" aria-labelledby="settings-title">
    <header class="settings-heading">
      <div>
        <p class="settings-eyebrow">Configurações</p>
        <h2 id="settings-title">Ajustes na agenda</h2>
        <p>Consulte seus horários e prepare uma solicitação de mudança.</p>
      </div>
      <span class="settings-preview">Envio em breve</span>
    </header>
    <p class="settings-notice">
      Você já pode preencher e revisar o pedido. O envio ainda não está disponível; nada será salvo
      ou alterado na agenda nesta versão.
    </p>

    <div class="settings-layout">
      <aside class="settings-card settings-hours" aria-labelledby="hours-title">
        <h3 id="hours-title">Meus horários</h3>
        <label class="settings-field"
          >Consultar data<input
            :value="date"
            type="date"
            class="input"
            required
            @change="changeDate"
        /></label>
        <p class="settings-help">
          Horários com pacientes na data consultada. Esta consulta não representa a grade semanal
          completa nem confirma vagas livres.
        </p>
        <p v-if="developmentMode" class="settings-empty">
          A consulta de horários ficará disponível com a conexão Stenci.
        </p>
        <p v-else-if="loading" class="settings-empty" role="status">Carregando horários…</p>
        <div v-else-if="loadError" class="settings-empty">
          <p>Não foi possível consultar os horários desta data.</p>
          <button type="button" class="settings-button" @click="emit('loadDate', date)">
            Tentar novamente
          </button>
        </div>
        <p v-else-if="!schedules.length" class="settings-empty">
          Nenhuma agenda vinculada. Solicite o vínculo ao administrador.
        </p>
        <p v-else-if="!sessions.length" class="settings-empty">
          Nenhum horário com pacientes encontrado nesta data. Você pode informar o período desejado
          no formulário.
        </p>
        <div v-else class="settings-session-list">
          <button
            v-for="session in sessions"
            :key="session.id"
            type="button"
            class="settings-session"
            :aria-label="`Usar horário ${session.start_time} de ${session.schedule_name}`"
            @click="useSession(session)"
          >
            <span class="settings-session-caption"
              >Sessão {{ session.number }} <span aria-hidden="true">↗</span></span
            >
            <strong
              >{{ session.start_time }} – {{ session.end_time
              }}<small v-if="session.end_next_day"> (+1 dia)</small></strong
            >
            <span>{{ session.schedule_name }}</span>
            <small v-if="session.end_estimated"
              >Fim previsto{{
                session.end_source === 'default_45' ? ' (45 min)' : ' pelo intervalo anterior'
              }}</small
            >
            <span class="settings-session-action">Usar este horário</span>
          </button>
        </div>
      </aside>

      <form ref="formElement" class="settings-card settings-form" @submit.prevent="review">
        <h3>Preparar solicitação</h3>
        <fieldset class="settings-type">
          <legend>Tipo de ajuste</legend>
          <label :class="{ selected: form.kind === 'pontual' }"
            ><input v-model="form.kind" type="radio" value="pontual" name="adjustment-kind" /><span
              ><b>Pontual</b><small>Somente em uma data</small></span
            ></label
          >
          <label :class="{ selected: form.kind === 'definitivo' }"
            ><input
              v-model="form.kind"
              type="radio"
              value="definitivo"
              name="adjustment-kind"
            /><span><b>Definitivo</b><small>Repetir semanalmente</small></span></label
          >
        </fieldset>
        <label class="settings-field"
          >Agenda<select v-model="form.scheduleId" class="input" aria-label="Agenda" required>
            <option value="" disabled>Selecione a agenda</option>
            <option
              v-for="schedule in schedules"
              :key="schedule.schedule_id"
              :value="schedule.schedule_id"
            >
              {{ schedule.schedule_name || 'Minha agenda' }}
            </option>
          </select></label
        >
        <div class="settings-field-grid">
          <label class="settings-field"
            >O que deseja ajustar?<select
              v-model="form.action"
              class="input"
              aria-label="O que deseja ajustar?"
            >
              <option value="alterar">Alterar horário</option>
              <option value="adicionar">Adicionar horário</option>
              <option value="bloquear">Bloquear horário</option>
            </select></label
          >
          <label class="settings-field"
            >{{ form.kind === 'pontual' ? 'Data do ajuste' : 'Válido a partir de'
            }}<input v-model="form.date" type="date" class="input" required
          /></label>
        </div>
        <fieldset v-if="form.kind === 'definitivo'" class="settings-weekdays">
          <legend>Dias da semana</legend>
          <div>
            <label
              v-for="day in weekdays"
              :key="day.value"
              :class="{ selected: form.days.includes(day.value) }"
              ><input v-model="form.days" type="checkbox" :value="day.value" /><span>{{
                day.label
              }}</span></label
            >
          </div>
        </fieldset>
        <fieldset v-if="form.action !== 'adicionar'" class="settings-period">
          <legend>{{ form.action === 'bloquear' ? 'Período a bloquear' : 'Horário atual' }}</legend>
          <div class="settings-field-grid">
            <label class="settings-field"
              >Início atual<input
                v-model="form.currentStart"
                type="time"
                class="input"
                required /></label
            ><label class="settings-field"
              >Fim atual<input v-model="form.currentEnd" type="time" class="input" required
            /></label>
          </div>
          <label class="settings-check"
            ><input v-model="form.currentNextDay" type="checkbox" /> Termina no dia seguinte</label
          >
        </fieldset>
        <fieldset v-if="form.action !== 'bloquear'" class="settings-period">
          <legend>
            {{ form.action === 'adicionar' ? 'Horário a adicionar' : 'Novo horário desejado' }}
          </legend>
          <div class="settings-field-grid">
            <label class="settings-field"
              >Novo início<input
                v-model="form.newStart"
                type="time"
                class="input"
                required /></label
            ><label class="settings-field"
              >Novo fim<input v-model="form.newEnd" type="time" class="input" required
            /></label>
          </div>
          <label class="settings-check"
            ><input v-model="form.newNextDay" type="checkbox" /> Novo horário termina no dia
            seguinte</label
          >
        </fieldset>
        <label class="settings-field"
          >Motivo / observações<textarea
            v-model="form.reason"
            class="input"
            rows="3"
            maxlength="1000"
            required
            placeholder="Descreva o ajuste e o motivo do pedido."
          />
        </label>
        <div class="settings-form-footer">
          <p>
            Preenchimento temporário. Mantido ao alternar as abas; descartado ao sair ou recarregar.
          </p>
          <button type="submit" class="settings-button primary" :disabled="!schedules.length">
            Revisar solicitação
          </button>
        </div>
      </form>
    </div>

    <ListDetailDialog
      :open="reviewOpen"
      title="Revisar solicitação de ajuste"
      dialog-class="physio-settings-dialog"
      @close="reviewOpen = false"
    >
      <div class="settings-review">
        <p class="settings-notice">
          Prévia do pedido — não enviado. O envio estará disponível após a integração com o Stenci.
        </p>
        <dl>
          <div>
            <dt>Agenda</dt>
            <dd>{{ selectedSchedule }}</dd>
          </div>
          <div>
            <dt>Tipo de ajuste</dt>
            <dd>{{ form.kind === 'pontual' ? 'Pontual' : 'Definitivo' }} · {{ actionLabel }}</dd>
          </div>
          <div>
            <dt>{{ form.kind === 'pontual' ? 'Data' : 'Vigência' }}</dt>
            <dd>
              {{ form.kind === 'definitivo' ? 'A partir de ' : '' }}{{ physioDate(form.date)
              }}<span v-if="form.kind === 'definitivo'"> · {{ selectedDays }}</span>
            </dd>
          </div>
          <div v-if="form.action !== 'adicionar'">
            <dt>{{ form.action === 'bloquear' ? 'Período a bloquear' : 'Horário atual' }}</dt>
            <dd>
              {{ form.currentStart }} – {{ form.currentEnd
              }}{{ form.currentNextDay ? ' (+1 dia)' : '' }}
            </dd>
          </div>
          <div v-if="form.action !== 'bloquear'">
            <dt>Horário solicitado</dt>
            <dd>{{ form.newStart }} – {{ form.newEnd }}{{ form.newNextDay ? ' (+1 dia)' : '' }}</dd>
          </div>
          <div>
            <dt>Motivo / observações</dt>
            <dd class="settings-reason">{{ form.reason }}</dd>
          </div>
        </dl>
      </div>
      <template #footer
        ><button type="button" class="settings-button" @click="reviewOpen = false">
          Continuar preenchendo</button
        ><button
          type="button"
          class="settings-button primary"
          disabled
          title="O envio será habilitado após a integração com o Stenci"
        >
          Enviar solicitação
        </button></template
      >
    </ListDetailDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import { notify } from '@/composables/useNotifications'
import { physioDate, type PhysioSession } from '@/utils/physioAgenda'

const props = defineProps<{
  schedules: Array<{ schedule_id: string; schedule_name?: string }>
  sessions: PhysioSession[]
  date: string
  loading: boolean
  loadError: string
  developmentMode?: boolean
}>()
const emit = defineEmits<{ loadDate: [date: string] }>()
const formElement = ref<HTMLFormElement | null>(null)
const reviewOpen = ref(false)
const form = reactive({
  kind: 'pontual',
  action: 'alterar',
  scheduleId: '',
  date: props.date,
  days: [] as number[],
  currentStart: '',
  currentEnd: '',
  currentNextDay: false,
  newStart: '',
  newEnd: '',
  newNextDay: false,
  reason: '',
})
const weekdays = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]
const selectedSchedule = computed(
  () =>
    props.schedules.find((schedule) => schedule.schedule_id === form.scheduleId)?.schedule_name ||
    'Minha agenda',
)
const selectedDays = computed(() =>
  weekdays
    .filter((day) => form.days.includes(day.value))
    .map((day) => day.label)
    .join(', '),
)
const actionLabel = computed(
  () =>
    ({ alterar: 'Alterar horário', adicionar: 'Adicionar horário', bloquear: 'Bloquear horário' })[
      form.action
    ],
)
watch(
  () => props.schedules,
  (schedules) => {
    if (!schedules.some((schedule) => schedule.schedule_id === form.scheduleId))
      form.scheduleId = schedules.length === 1 ? schedules[0]!.schedule_id : ''
  },
  { immediate: true },
)
function changeDate(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.value) emit('loadDate', input.value)
  else input.value = props.date
}
function useSession(session: PhysioSession) {
  form.scheduleId = session.schedule_id
  form.currentStart = session.start_time
  form.currentEnd = session.end_time
  form.currentNextDay = !!session.end_next_day
  form.action = 'alterar'
  form.date = props.date
  form.days = [new Date(`${props.date}T12:00:00`).getDay()]
  formElement.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  notify(
    session.end_estimated
      ? 'Horário selecionado. Confira o fim previsto antes de revisar o pedido.'
      : 'Horário selecionado. Preencha a mudança desejada.',
    'info',
  )
}
function validPeriod(start: string, end: string, nextDay: boolean) {
  const minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h! * 60 + m!
  }
  const duration = minutes(end) + (nextDay ? 1440 : 0) - minutes(start)
  return (
    /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && duration > 0 && duration <= 1440
  )
}
function review() {
  if (!formElement.value?.reportValidity()) return
  if (!props.schedules.some((schedule) => schedule.schedule_id === form.scheduleId)) {
    notify('Selecione uma das suas agendas vinculadas.', 'warning')
    return
  }
  if (form.kind === 'definitivo' && !form.days.length) {
    notify('Selecione pelo menos um dia da semana para o ajuste definitivo.', 'warning')
    return
  }
  if (
    form.action !== 'adicionar' &&
    !validPeriod(form.currentStart, form.currentEnd, form.currentNextDay)
  ) {
    notify(
      'Confira o período atual. O fim deve ser posterior ao início; marque o dia seguinte quando necessário.',
      'warning',
    )
    return
  }
  if (form.action !== 'bloquear' && !validPeriod(form.newStart, form.newEnd, form.newNextDay)) {
    notify(
      'Confira o novo horário. O fim deve ser posterior ao início; marque o dia seguinte quando necessário.',
      'warning',
    )
    return
  }
  if (
    form.action === 'alterar' &&
    form.currentStart === form.newStart &&
    form.currentEnd === form.newEnd &&
    form.currentNextDay === form.newNextDay
  ) {
    notify('Informe um novo horário diferente do atual.', 'warning')
    return
  }
  if (!form.reason.trim()) {
    notify('Informe o motivo do ajuste.', 'warning')
    return
  }
  reviewOpen.value = true
}
</script>

<style scoped>
.physio-settings {
  color: #183049;
}
.settings-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.settings-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: #4b6482;
}
.settings-heading h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 3px 0;
}
.settings-heading > div > p:last-child {
  font-size: 14px;
  color: #597089;
}
.settings-preview {
  flex-shrink: 0;
  background: #e1ebff;
  color: #2455a4;
  border: 1px solid #cbdcff;
  border-radius: 20px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
}
.settings-notice {
  border: 1px solid #bed6fa;
  border-radius: 12px;
  background: #eef5ff;
  color: #244d7e;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 16px;
}
.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.8fr);
  gap: 18px;
  align-items: start;
}
.settings-card {
  border: 1px solid #dae3ef;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px #102a4308;
}
.settings-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}
.settings-form {
  display: grid;
  gap: 18px;
  scroll-margin-top: 100px;
}
.settings-form h3 {
  margin: 0;
}
.settings-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  min-width: 0;
}
.settings-field .input {
  min-height: 48px;
  width: 100%;
  min-width: 0;
  font-size: 14px;
  font-weight: 400;
  background: white;
  color: #183049;
}
.settings-field textarea {
  resize: vertical;
  line-height: 1.6;
}
.settings-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.settings-help {
  font-size: 12px;
  line-height: 1.6;
  color: #61748e;
  margin: 12px 0 16px;
}
.settings-empty {
  font-size: 14px;
  background: #f5f8fc;
  border-radius: 10px;
  padding: 18px;
  line-height: 1.6;
}
.settings-empty button {
  margin-top: 12px;
}
.settings-session-list {
  display: grid;
  gap: 10px;
}
.settings-session {
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 5px;
  border: 1px solid #d7e3f3;
  border-radius: 12px;
  padding: 14px;
  background: #f8fbff;
  color: #2b527d;
}
.settings-session:hover {
  background: #edf4ff;
  border-color: #709ee8;
}
.settings-session-caption {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.settings-session strong {
  font-size: 20px;
  line-height: 1.4;
  color: #173e6c;
}
.settings-session strong small {
  font-size: 11px;
}
.settings-session > span:not(.settings-session-caption) {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.settings-session > small {
  font-size: 11px;
  color: #597089;
}
.settings-session-action {
  font-weight: 600;
  margin-top: 6px;
  color: #1d5bb2;
}
fieldset {
  min-width: 0;
}
legend {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 9px;
}
.settings-type {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.settings-type label {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid #d3deeb;
  border-radius: 12px;
  cursor: pointer;
  min-height: 72px;
}
.settings-type label.selected,
.settings-weekdays label.selected {
  background: #edf4ff;
  border-color: #3976d2;
  color: #184a96;
}
.settings-type b {
  display: block;
  font-size: 14px;
}
.settings-type small {
  display: block;
  font-size: 11px;
  color: #61748e;
  margin-top: 4px;
}
.settings-type input,
.settings-check input,
.settings-weekdays input {
  width: 18px;
  height: 18px;
  accent-color: #1d4ed8;
  flex-shrink: 0;
}
.settings-weekdays > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.settings-weekdays label {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 46px;
  border: 1px solid #d3deeb;
  padding: 8px;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
}
.settings-period {
  background: #f8fafc;
  border: 1px solid #e0e7f0;
  padding: 12px;
  border-radius: 12px;
}
.settings-period legend {
  padding: 0 6px;
  margin: 0;
}
.settings-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  margin-top: 5px;
  font-size: 12px;
  color: #526a85;
}
.settings-form-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.settings-form-footer p {
  font-size: 11px;
  line-height: 1.6;
  color: #61748e;
  max-width: 230px;
}
.settings-button {
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 10px;
  padding: 12px 16px;
  min-height: 48px;
  font-size: 13px;
  font-weight: 600;
  color: #294968;
  white-space: nowrap;
}
.settings-button.primary {
  border-color: #1d4ed8;
  background: #1d4ed8;
  color: white;
}
.settings-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.settings-review dl {
  display: grid;
  gap: 14px;
}
.settings-review dl > div {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}
.settings-review dt {
  font-size: 12px;
  color: #61748e;
  margin-bottom: 4px;
}
.settings-review dd {
  font-size: 14px;
  font-weight: 600;
  color: #183049;
}
.settings-reason {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.settings-button:focus-visible,
.settings-session:focus-visible {
  outline: 3px solid #5593ef;
  outline-offset: 2px;
}
@media (max-width: 899px) {
  .settings-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .settings-session-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 310px;
    overflow-y: auto;
    padding: 3px;
  }
  .settings-hours {
    padding: 16px;
  }
  .settings-form {
    scroll-margin-top: 100px;
  }
}
@media (max-width: 480px) {
  .settings-heading {
    align-items: start;
  }
  .settings-heading h2 {
    font-size: 20px;
  }
  .settings-preview {
    font-size: 10px;
    padding: 6px 8px;
  }
  .settings-card {
    padding: 16px;
  }
  .settings-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .settings-form-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .settings-form-footer p {
    max-width: none;
  }
  .settings-type label {
    padding: 10px 8px;
    gap: 7px;
  }
  .settings-session strong {
    font-size: 17px;
  }
  .settings-review .settings-notice {
    padding: 10px;
  }
}
@media (orientation: landscape) and (max-height: 800px) {
  .settings-heading {
    margin-bottom: 10px;
  }
  .settings-heading h2 {
    font-size: 22px;
  }
  .settings-card {
    padding: 16px;
  }
  .settings-form {
    gap: 14px;
  }
  .settings-session-list {
    max-height: 460px;
    overflow-y: auto;
    padding: 3px;
  }
}
@media screen and (min-width: 640px) and (max-width: 1368px), screen and (min-width: 640px) and (pointer: coarse) {
  .settings-heading { gap: 11px; margin-bottom: 8px; }
  .settings-heading h2 { font-size: 17px; line-height: 1.35; margin: 2px 0; }
  .settings-heading > div > p:last-child { font-size: 12px; line-height: 1.4; }
  .settings-eyebrow { font-size: 10px; line-height: 1.3; }
  .settings-preview { padding: 5px 8px; font-size: 11px; }
  .settings-notice { padding: 8px 11px; font-size: 12px; line-height: 1.4; margin-bottom: 11px; border-radius: 8px; }
  .settings-layout { gap: 12px; }
  .settings-card { padding: 12px; border-radius: 11px; }
  .settings-card h3 { font-size: 14px; line-height: 1.4; margin-bottom: 11px; }
  .settings-form { gap: 8px; scroll-margin-top: 72px; }
  .settings-form h3 { margin: 0; }
  .settings-field { font-size: 12px; line-height: 1.3; gap: 4px; }
  .settings-field .input { min-height: 36px; padding: 7px 10px; font-size: 13px; line-height: 1.4; border-radius: 7px; }
  .settings-field textarea { min-height: 70px; }
  .settings-field-grid { gap: 8px; }
  .settings-help { font-size: 11px; line-height: 1.45; margin: 8px 0 11px; }
  .settings-empty { font-size: 12px; padding: 13px; }
  .settings-session-list { gap: 7px; }
  .settings-session { padding: 10px; gap: 3px; border-radius: 8px; }
  .settings-session strong { font-size: 15px; }
  .settings-session-caption, .settings-session > span:not(.settings-session-caption) { font-size: 11px; }
  .settings-session-action { margin-top: 4px; }
  legend { font-size: 12px; margin-bottom: 6px; }
  .settings-type { gap: 7px; }
  .settings-type label { min-height: 50px; padding: 8px; gap: 7px; border-radius: 8px; }
  .settings-type b { font-size: 13px; line-height: 1.3; }
  .settings-type small { margin-top: 2px; line-height: 1.3; }
  .settings-type input, .settings-check input, .settings-weekdays input { width: 16px; height: 16px; }
  .settings-weekdays > div { gap: 6px; }
  .settings-weekdays label { min-height: 36px; padding: 5px 7px; font-size: 11px; border-radius: 7px; }
  .settings-period { padding: 8px; border-radius: 8px; }
  .settings-period legend { margin: 0; }
  .settings-check { min-height: 32px; margin-top: 3px; gap: 6px; font-size: 11px; }
  .settings-form-footer { padding-top: 11px; gap: 11px; }
  .settings-form-footer p { font-size: 11px; line-height: 1.4; }
  .settings-button { min-height: 36px; padding: 7px 11px; font-size: 12px; border-radius: 7px; }
  .settings-review dl { gap: 10px; }
  .settings-review dl > div { padding-bottom: 8px; }
  .settings-review dt { font-size: 11px; margin-bottom: 3px; }
  .settings-review dd { font-size: 13px; }
  :global(.physio-settings-dialog > header), :global(.physio-settings-dialog > footer) { padding: 10px 14px; gap: 8px; }
  :global(.physio-settings-dialog > header h2) { font-size: 16px; line-height: 1.4; }
  :global(.physio-settings-dialog .list-dialog-content) { padding: 14px; }
  :global(.physio-settings-dialog > footer button) { min-height: 36px; font-size: 12px; }
}
</style>
