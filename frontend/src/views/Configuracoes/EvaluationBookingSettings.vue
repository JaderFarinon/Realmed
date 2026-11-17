<template>
  <PageShell title="Agendamento online de avaliações" subtitle="Realmed Matriz · configuração privada">
    <section class="panel booking-settings">
      <div class="settings-note"><strong>Confirmação de agendamento indisponível</strong><p>As consultas podem ser habilitadas. A gravação depende dos contratos de cadastro, reserva, conferência do resultado e conflito de horário do Stenci. Esta configuração não habilita a confirmação.</p><a href="/agendar-avaliacao" target="_blank" rel="noopener">Abrir página pública ↗</a></div>
      <p v-if="loading">Carregando configuração…</p>
      <form v-else @submit.prevent="save">
        <fieldset :disabled="busy || !loaded">
          <h2>Conexão e agendas participantes</h2>
          <label class="check"><input v-model="form.useInstitutionalConnection" type="checkbox" @change="clearOptions" /> Usar a conexão institucional já configurada para o modo fisioterapeuta</label>
          <p class="help">Se não selecionado, a conexão dedicada STENCI_BOOKING deve estar configurada no servidor. Credenciais não são exibidas nem cadastradas nesta tela.</p>
          <button type="button" class="btn btn-outline" @click="loadOptions">Consultar agendas, serviços e convênios do Stenci</button>
          <p class="help">Selecione explicitamente somente agendas de avaliação da Matriz. Agendas de sessões e rodízio não participam automaticamente.</p>
          <template v-if="options">
            <div class="settings-agendas"><label v-for="agenda in options.schedules" :key="agenda.id" class="check"><input v-model="form.scheduleIds" type="checkbox" :value="agenda.id" /> {{ agenda.name }}</label><p v-if="!options.schedules.length">Nenhuma agenda ativa da Realmed Matriz foi retornada.</p></div>
            <label>Serviço de avaliação<select v-model="form.serviceId" aria-label="Serviço de avaliação" :required="form.enabled"><option value="">Selecione o serviço correspondente à avaliação</option><option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option></select></label>
            <h2>Convênios e planos aceitos</h2><p class="help">Marque os planos aceitos e as exigências de carteirinha. Somente combinações permitidas pelo serviço e pelas agendas são exibidas.</p>
            <label>Pesquisar convênio ou plano<input v-model="filter" type="search" placeholder="Nome do convênio ou plano" /></label>
            <p class="help">{{ form.insuranceKeys.length }} plano(s) selecionado(s). <button type="button" class="text-brand-500" @click="form.insuranceKeys = []; cleanRequirements()">Limpar seleção de convênios</button></p>
            <div class="settings-plans"><div v-for="plan in plans" :key="plan.key" class="settings-plan"><label class="check"><input v-model="form.insuranceKeys" type="checkbox" :value="plan.key" @change="cleanRequirements" /><span><strong>{{ plan.insuranceName }}</strong><small>{{ plan.planName }}</small></span></label><label class="check"><input v-model="form.cardRequiredKeys" type="checkbox" :value="plan.key" :disabled="!form.insuranceKeys.includes(plan.key)" @change="cleanRequirements" /> Carteirinha obrigatória</label><label class="check"><input v-model="form.expiryRequiredKeys" type="checkbox" :value="plan.key" :disabled="!form.cardRequiredKeys.includes(plan.key)" /> Validade obrigatória</label></div><p v-if="!plans.length">Selecione agendas e serviço para consultar planos compatíveis.</p></div>
          </template>
          <p v-else class="help">{{ form.scheduleIds.length }} agenda(s) e {{ form.insuranceKeys.length }} plano(s) salvos. Consulte o Stenci para revisar a seleção.</p>
          <h2>Informações para o paciente</h2><div class="settings-grid"><label>Período de datas (dias)<input v-model.number="form.horizonDays" type="number" min="1" max="90" required /></label><label>Contato da recepção<input v-model="form.contact" maxlength="160" placeholder="Telefone / WhatsApp da clínica" /></label><label class="wide">Endereço da Realmed Matriz<input v-model="form.address" maxlength="250" /></label></div>
          <p class="help">Grade fixa: 08h às 20h, avaliações de 20 minutos, último início às 19h40. Antecedência mínima de 2 horas, conferida pelo servidor.</p>
          <label class="check"><input v-model="form.enabled" type="checkbox" /> Habilitar identificação e consulta pública de horários</label>
          <div class="settings-actions"><button class="btn btn-primary" type="submit">{{ busy ? 'Aguarde…' : 'Salvar configuração' }}</button><button class="btn btn-outline" type="button" @click="load">Recarregar configuração</button></div>
        </fieldset>
      </form>
      <details v-if="loaded" class="settings-preview">
        <summary>Conferir horários da configuração salva</summary>
        <p class="help">Consulta os mesmos horários exibidos ao paciente, sem consultar cadastros ou reservar vagas. Salve e habilite a configuração antes de conferir.</p>
        <form @submit.prevent="previewAvailability">
          <div class="settings-grid"><label>Data da consulta<input v-model="previewDate" type="date" required :disabled="busy" /></label><label>Convênio e plano da consulta<select v-model="previewPlan" required :disabled="busy"><option value="">Consulte os convênios e selecione um plano</option><option v-for="plan in savedPlans" :key="plan.key" :value="plan.key">{{ plan.planName }}</option></select></label></div>
          <button class="btn btn-outline" :disabled="busy || !previewPlan">{{ busy ? 'Consultando…' : 'Conferir horários' }}</button>
        </form>
        <p v-if="previewSlots.length" class="help">Disponibilidade consultada para {{ previewResultDate.split('-').reverse().join('/') }}. Escolher um horário não faz uma reserva.</p>
        <div class="settings-slots"><div v-for="slot in previewSlots" :key="slot.time" :class="{ available: slot.available }"><strong>{{ slot.time }}</strong><span>{{ slot.label }}</span></div></div>
      </details>
      <div v-if="!loading && !loaded"><p>Não foi possível carregar a configuração.</p><button class="btn btn-outline" @click="load">Tentar novamente</button></div>
    </section>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import api from '@/plugins/axios'
import { notify } from '@/composables/useNotifications'
type Options = { schedules: { id: string; name: string }[]; services: { id: string; name: string; scheduleIds: string[]; insuranceIds: string[] }[]; insurances: { key: string; insuranceId: string; insuranceName: string; planName: string; scheduleIds: string[] }[] }
const form = reactive({ enabled: false, useInstitutionalConnection: false, horizonDays: 30, scheduleIds: [] as string[], serviceId: '', insuranceKeys: [] as string[], cardRequiredKeys: [] as string[], expiryRequiredKeys: [] as string[], address: '', contact: '', revision: 0 })
const options = ref<Options>(), filter = ref(''), busy = ref(false), loading = ref(true), loaded = ref(false)
const savedKeys = ref<string[]>([]), previewDate = ref(''), previewPlan = ref(''), previewResultDate = ref('')
const previewSlots = ref<{ time: string; available: boolean; label: string }[]>([])
const savedPlans = computed(() => options.value?.insurances.filter(p => savedKeys.value.includes(p.key)) || [])
const services = computed(() => options.value?.services.filter(s => form.scheduleIds.length && form.scheduleIds.every(id => s.scheduleIds.includes(id))) || [])
const service = computed(() => services.value.find(s => s.id === form.serviceId))
const plans = computed(() => options.value?.insurances.filter(p => service.value?.insuranceIds.includes(p.insuranceId) && p.scheduleIds.some(id => form.scheduleIds.includes(id)) && `${p.insuranceName} ${p.planName}`.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase())) || [])
function cleanRequirements() { form.cardRequiredKeys = form.cardRequiredKeys.filter(key => form.insuranceKeys.includes(key)); form.expiryRequiredKeys = form.expiryRequiredKeys.filter(key => form.cardRequiredKeys.includes(key)) }
function clearOptions() { options.value = undefined }
async function run(action: () => Promise<void>) { if (busy.value) return; busy.value = true; try { await action() } catch (e: any) { notify(e.response?.data?.error || 'Não foi possível concluir a consulta.', 'error') } finally { busy.value = false; loading.value = false } }
async function load() { await run(async () => { Object.assign(form, (await api.get('/evaluation-booking/config')).data.settings); savedKeys.value = [...form.insuranceKeys]; previewSlots.value = []; loaded.value = true; options.value = undefined }) }
async function loadOptions() { await run(async () => { options.value = (await api.post('/evaluation-booking/options', { useInstitutionalConnection: form.useInstitutionalConnection }, { timeout: 90000 })).data }) }
async function save() { await run(async () => { Object.assign(form, (await api.put('/evaluation-booking/config', form, { timeout: 90000 })).data.settings); savedKeys.value = [...form.insuranceKeys]; previewSlots.value = []; notify('Configuração salva. A confirmação permanece indisponível até concluir a integração.', 'success') }) }
async function previewAvailability() { await run(async () => { previewSlots.value = []; const result = (await api.post('/evaluation-booking/availability', { date: previewDate.value, insuranceKey: previewPlan.value }, { timeout: 90000 })).data; previewResultDate.value = result.date; previewSlots.value = result.slots }) }
onMounted(load)
</script>
<style scoped>
.booking-settings .btn{white-space:normal;max-width:100%;height:auto;min-height:40px}.settings-plan span{min-width:0;overflow-wrap:anywhere}
.booking-settings{max-width:1120px}.settings-note{background:#f2f2ff;border:1px solid #dcd9ff;padding:16px;border-radius:10px;margin-bottom:22px;font-size:13px;line-height:1.7}.settings-note a{color:#4438ee;text-decoration:underline}.booking-settings fieldset{border:0;margin:0;padding:0;min-width:0}.booking-settings h2{font-size:17px;margin:24px 0 12px}.booking-settings label:not(.check){display:flex;flex-direction:column;gap:7px;font-size:13px;margin:14px 0}.booking-settings input:not([type=checkbox]),.booking-settings select{border:1px solid #cdd5e5;border-radius:7px;padding:10px;min-height:40px;width:100%;min-width:0;background:white}.check{display:flex;align-items:center;gap:10px;min-height:36px;font-size:13px}.check input{width:17px;height:17px;flex-shrink:0}.help{color:#69788f;font-size:12px;line-height:1.7;margin:12px 0}.settings-agendas{display:grid;grid-template-columns:1fr 1fr;gap:5px;border:1px solid #e0e5ed;padding:12px;border-radius:8px}.settings-plans{max-height:480px;overflow:auto;border:1px solid #e0e5ed;padding:12px;border-radius:8px}.settings-plan{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;border-bottom:1px solid #edf0f6;padding:9px 0}.settings-plan small{display:block;color:#748096;font-size:11px}.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}.wide{grid-column:1/-1}.settings-actions{display:flex;gap:12px;margin-top:22px;flex-wrap:wrap}@media(max-width:700px){.settings-plan,.settings-grid,.settings-agendas{grid-template-columns:1fr}.settings-plan{gap:0}.settings-plans{max-height:none}}
</style>
<style scoped>
.settings-preview{margin-top:24px;border-top:1px solid #dce2ef;padding-top:18px}.settings-preview summary{cursor:pointer;font-size:15px;font-weight:600}.settings-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-top:16px}.settings-slots>div{display:grid;gap:4px;padding:10px;border:1px solid #e2e6ed;border-radius:8px;background:#f4f5f8;color:#738095;text-align:center}.settings-slots span{font-size:11px}.settings-slots .available{background:#f1fff7;color:#087747;border-color:#a1d8bd}
</style>
