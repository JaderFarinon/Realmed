<template>
  <section class="panel min-w-0">
    <h2>Agenda e Faturas Stenci</h2>
    <p class="text-gray-500">
      Consulta direta com encerramento da sessão Stenci. Agenda por dia; faturas com todos os
      status, sem filtro de período.
    </p>
    <div class="flex flex-wrap items-end gap-3 my-4">
      <button class="btn-secondary" :disabled="busy" @click="loadSchedules">
        Carregar agendas
      </button>
      <label
        ><FieldLabel required reason="Obrigatório para consultar uma agenda no Stenci."
          >Agenda</FieldLabel
        ><select v-model="scheduleId" class="input" aria-label="Agenda">
          <option value="">Selecione</option>
          <option v-for="s in schedules" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select></label
      >
      <label
        ><FieldLabel required reason="Obrigatório para consultar uma agenda no Stenci."
          >Dia da agenda</FieldLabel
        ><input v-model="date" class="input" type="date" aria-label="Dia da agenda"
      /></label>
      <button class="btn-primary" :disabled="busy || !scheduleId" @click="loadCalendar">
        Consultar agenda
      </button>
      <button class="btn-secondary" :disabled="busy" @click="loadInvoices(0)">
        Consultar faturas
      </button>
    </div>
    
    <p v-if="busy" role="status">Consultando o Stenci…</p>
    <template v-if="calendar && resultType === 'calendar'">
      <h3 class="mt-4">Agenda consultada: {{ calendar.date.split('-').reverse().join('/') }}</h3>
      <p class="text-gray-500">
        {{ calendar.scheduleName }} • Consultada em
        {{ new Date(calendar.fetchedAt).toLocaleString('pt-BR') }}. Contagem por agendamento; não
        por procedimento ou paciente único.
      </p>
      <div class="grid gap-3 sm:grid-cols-4 my-4">
        <article v-for="c in counters" :key="c.label" class="rounded border p-3">
          <p>{{ c.label }}</p>
          <b class="typography-metric">{{ c.value }}</b>
        </article>
      </div>
      <DataList
        v-model:selected="appointment"
        :items="calendar.items"
        :columns="appointmentColumns"
        :actions="appointmentActions"
        embedded
        selection-key="patient_name"
      >
        <template #filters>
          <p class="text-amber-700">
            Evolução pendente:
            {{ calendar.items.filter((x: any) => x.evolution_status === 'PENDING_POLICY').length }}
            atendimentos. Regra temporária: todos os finalizados são sinalizados enquanto a evolução
            não é registrada e integrada.
          </p>
        </template>
        <template #cell-status="{ item }">{{ statusLabel(item.status) }}</template>
        <template #cell-evolution_status="{ item }"
          ><span :class="item.evolution_status === 'PENDING_POLICY' ? 'text-amber-700' : ''">{{
            item.evolution_status === 'PENDING_POLICY' ? 'Evolução pendente' : '—'
          }}</span></template
        >
        <template #cell-expenses="{ item }">{{
          item.expenses.map((e: any) => e.name).join(' • ') || 'Sem procedimento informado'
        }}</template>
      </DataList>
      <p class="text-gray-500 mt-2">
        Falta não comprova ausência de reagendamento. Atendimento finalizado não comprova evolução
        clínica. Classificar avaliação e fisioterapia exige mapear os procedimentos.
      </p>
    </template>
    <template v-if="invoices && resultType === 'invoices'">
      <h3 class="mt-5">Faturas — página consultada</h3>
      <p class="text-gray-500">
        {{ invoices.items.length }} faturas nesta página •
        {{ new Date(invoices.fetchedAt).toLocaleString('pt-BR') }}. Quantidade informada pelo Stenci
        em contas; uma conta pode incluir vários procedimentos. Não somar como pacientes ou
        tratamentos.
      </p>
      <DataList
        :items="invoices.items"
        :columns="invoiceColumns"
        :selectable="false"
        embedded
        all-rows
      >
        <template #cell-status="{ item }">{{
          item.status === 'finished' ? 'Finalizada' : statusLabel(item.status)
        }}</template>
      </DataList>
      <div class="flex flex-wrap gap-3 mt-3">
        <button
          class="btn-secondary"
          :disabled="busy || !offset"
          @click="loadInvoices(offset - 30)"
        >
          Página anterior</button
        ><span>Página {{ offset / 30 + 1 }}</span
        ><button
          class="btn-secondary"
          :disabled="busy || !invoices.hasMore"
          @click="loadInvoices(offset + 30)"
        >
          Próxima página
        </button>
      </div>
    </template>
    <ListDetailDialog
      :open="accountOpen"
      title="Vínculo da Conta com Fatura"
      @close="accountOpen = false"
    >
      <p v-if="!accounts.length">
        A agenda não informou uma conta para este atendimento. Isso não comprova que não existe
        faturamento.
      </p>
      <dl v-for="a in accounts" :key="a.id" class="mb-4">
        <dt>Conta</dt>
        <dd>{{ a.id }}</dd>
        <dt>Fatura</dt>
        <dd>{{ a.invoice?.code || 'Sem vínculo informado' }}</dd>
        <dt>Status da conta</dt>
        <dd>{{ statusLabel(a.status) }}</dd>
      </dl>
    </ListDetailDialog>
  </section>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
const schedules = ref<any[]>([]),
  resultType = ref('calendar'),
  scheduleId = ref(''),
  date = ref(new Date().toLocaleDateString('en-CA')),
  calendar = ref<any>(null),
  invoices = ref<any>(null),
  appointment = ref<any>(null),
  accounts = ref<any[]>([]),
  accountOpen = ref(false),
  busy = ref(false),
  error = ref(''),
  offset = ref(0)
const statusLabel = (s: string) =>
  (
    ({
      scheduled: 'Agendado',
      finished: 'Finalizado',
      missed: 'Falta',
      patient_canceled: 'Cancelado pelo paciente',
      open: 'Aberta',
      in_billing: 'Em faturamento',
      closed: 'Fechada',
      in_appeal: 'Em recurso',
      canceled: 'Cancelada',
    }) as Record<string, string>
  )[s] || `Status Stenci: ${s || 'não informado'}`
async function read(params: any) {
  return (await api.get('/billing/stenci', { params })).data
}
async function run(fn: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await fn()
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Falha ao consultar o Stenci.'
  } finally {
    busy.value = false
  }
}
const loadSchedules = () =>
  run(async () => {
    schedules.value = (await read({ kind: 'schedules' })).items
  })
const loadCalendar = () =>
  run(async () => {
    resultType.value = 'calendar'
    calendar.value = null
    appointment.value = null
    const id = scheduleId.value,
      day = date.value
    calendar.value = {
      ...(await read({ kind: 'calendar', date: day, scheduleId: id })),
      scheduleName: schedules.value.find((s) => s.id === id)?.name || 'Agenda selecionada',
    }
  })
const loadInvoices = (page: number) =>
  run(async () => {
    resultType.value = 'invoices'
    invoices.value = null
    invoices.value = await read({ kind: 'invoices', offset: page })
    offset.value = page
  })
const counters = computed(() => [
  { label: 'Agendamentos', value: calendar.value.items.length },
  {
    label: 'Finalizados',
    value: calendar.value.items.filter((x: any) => x.status === 'finished').length,
  },
  { label: 'Faltas', value: calendar.value.items.filter((x: any) => x.status === 'missed').length },
  {
    label: 'Agendados sem finalização',
    value: calendar.value.items.filter((x: any) => x.status === 'scheduled').length,
  },
])
const appointmentColumns = [
  { key: 'patient_name', label: 'Paciente' },
  {
    key: 'startDate',
    label: 'Horário',
    format: (v: any) =>
      new Date(v).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  { key: 'insurance_name', label: 'Convênio' },
  { key: 'status', label: 'Status' },
  { key: 'evolution_status', label: 'Evolução' },
  { key: 'expenses', label: 'Procedimentos' },
]
const money = (v: any) =>
  v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const invoiceColumns = [
  { key: 'code', label: 'Fatura' },
  { key: 'insurance_name', label: 'Convênio' },
  { key: 'status', label: 'Status' },
  { key: 'quantity', label: 'Contas' },
  { key: 'total', label: 'Valor', format: money },
]
const appointmentActions = computed(() => [
  {
    label: 'Consultar vínculo com fatura',
    icon: 'file',
    disabled: !appointment.value || busy.value,
    onClick: () =>
      run(async () => {
        const ids = [
          ...new Set(appointment.value.expenses.map((x: any) => x.accountId).filter(Boolean)),
        ]
        accounts.value = []
        const loaded = []
        for (const id of ids) loaded.push(await read({ kind: 'account', id }))
        accounts.value = loaded
        accountOpen.value = true
      }),
  },
])

useFeedback(() => unwrapNoticeValue(error), () => 'error')
</script>
