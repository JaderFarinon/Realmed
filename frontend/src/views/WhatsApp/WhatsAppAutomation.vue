<template>
  <PageShell title="Atendimento WhatsApp" subtitle="Eventos, campanhas e retornos recebidos pelo chatbot" list>
    <DataList
      v-model:selected="selected"
      :items="items"
      :columns="columns"
      :actions="actions"
      :loading="loading"
      :server-total="total"
      :page="page"
      selection-key="id"
      bounded
      :empty-text="emptyText"
      @update:page="changePage"
      @update:page-size="changeSize"
      @row-dblclick="openSelected"
    >
      <template #tabs>
        <div class="wa-tabs" role="tablist" aria-label="Áreas do atendimento WhatsApp">
          <button v-for="tab in tabs" :key="tab.key" type="button" role="tab" :aria-selected="activeTab===tab.key" :class="{active:activeTab===tab.key}" @click="changeTab(tab.key)">{{ tab.label }}</button>
        </div>
      </template>
      <template #actions><small class="text-gray-500">{{ contextText }}</small></template>
      <template #cell-name="{item}"><strong>{{ item.name }}</strong></template>
      <template #cell-patient_name="{item}"><strong>{{ item.patient_name }}</strong></template>
      <template #cell-type="{item}">{{ typeLabel(item.type) }}</template>
      <template #cell-status="{item}"><span class="wa-status">{{ statusLabel(item.status) }}</span></template>
      <template #cell-choice="{item}"><span class="wa-status">{{ choiceLabel(item.choice) }}</span></template>
      <template #cell-response_status="{item}"><span class="wa-status">{{ item.response_status==='COMPLETED' ? 'Respondida' : 'Aguardando' }}</span></template>
      <template #cell-block_schedule="{item}"><strong>{{ blockSchedule(item) }}</strong></template>
      <template #cell-block_period="{item}">{{ blockPeriod(item) }}</template>
    </DataList>

    <ListDetailDialog :open="eventOpen" :title="eventForm.id ? 'Editar evento' : 'Novo evento'" @close="closeEvent">
      <form id="wa-event-form" class="wa-form" @submit.prevent="saveEvent">
        <label>Tipo<select v-model="eventForm.type" class="input" required><option value="HOLIDAY">Feriado</option><option value="CAMPAIGN">Campanha</option><option value="OTHER">Outro evento</option></select></label>
        <label>Nome<input v-model.trim="eventForm.name" class="input" maxlength="180" required /></label>
        <div class="wa-grid"><label>Início<input v-model="eventForm.startDate" class="input" type="date" required /></label><label>Fim<input v-model="eventForm.endDate" class="input" type="date" required /></label></div>
        <label>Situação<select v-model="eventForm.status" class="input"><option value="DRAFT">Rascunho</option><option value="ACTIVE">Ativo</option><option value="PAUSED">Pausado</option><option value="COMPLETED">Concluído</option></select></label>
        <label>Texto da mensagem<textarea v-model="eventForm.message" class="input" rows="5" maxlength="4000" :required="eventForm.type==='CAMPAIGN'" placeholder="Obrigatório para campanhas" /></label>
        <div v-if="eventForm.type==='CAMPAIGN'" class="wa-grid"><label>Iniciar envio em<input v-model="eventForm.sendAt" class="input" type="datetime-local" required /></label><label>Prazo final do envio<input v-model="eventForm.sendDeadlineAt" class="input" type="datetime-local" required /></label></div>
        <fieldset class="wa-audience"><legend>Público da campanha</legend>
          <div class="wa-grid"><label>Situação<select v-model="eventForm.audience.patientStatus" class="input"><option value="ALL">Todos</option><option value="ACTIVE">Pacientes ativos</option><option value="ABSENT">Pacientes faltantes</option></select></label><label>Sexo<select v-model="eventForm.audience.gender" class="input"><option value="ALL">Todos</option><option value="FEMALE">Mulheres</option><option value="MALE">Homens</option></select></label></div>
          <div class="wa-grid"><label>Idade mínima<input v-model="eventForm.audience.ageMin" class="input" type="number" min="0" max="130" /></label><label>Idade máxima<input v-model="eventForm.audience.ageMax" class="input" type="number" min="0" max="130" /></label></div>
          <label>Tipos de serviço<input v-model="servicesText" class="input" maxlength="500" placeholder="Separados por vírgula; serão vinculados aos IDs Stenci na configuração" /></label>
        </fieldset>
      </form>
      <template #footer><button class="btn-secondary" type="button" @click="closeEvent">Cancelar</button><button class="btn-primary" form="wa-event-form" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar' }}</button></template>
    </ListDetailDialog>

    <ListDetailDialog :open="blockOpen" title="Bloquear horário no Stenci" @close="blockOpen=false">
      <form id="wa-block-form" class="wa-form" @submit.prevent="saveBlock">
        <label>Agenda e profissional<select v-model="blockForm.optionKey" class="input" required><option value="" disabled>Selecione</option><option v-for="option in blockOptions" :key="option.key" :value="option.key">{{ option.professionalName }} · {{ option.scheduleName }}</option></select></label>
        <div class="wa-grid"><label>Início<input v-model="blockForm.startDate" class="input" type="datetime-local" required /></label><label>Fim<input v-model="blockForm.endDate" class="input" type="datetime-local" required /></label></div>
        <label>Motivo interno<textarea v-model.trim="blockForm.notes" class="input" rows="3" maxlength="500" required /></label>
        <p class="text-gray-500">A API revalida a vaga no Stenci. Horário ocupado ou profissional indisponível será recusado sem sobrescrever o paciente.</p>
      </form>
      <template #footer><button class="btn-secondary" type="button" @click="blockOpen=false">Cancelar</button><button class="btn-primary" form="wa-block-form" :disabled="saving">{{ saving ? 'Bloqueando…' : 'Confirmar bloqueio' }}</button></template>
    </ListDetailDialog>

    <ListDetailDialog :open="previewOpen" title="Prévia da campanha" wide @close="previewOpen=false">
      <div v-if="campaignPreview" class="wa-preview"><p><strong>{{ campaignPreview.total }}</strong> pacientes elegíveis. Excluídos: {{ campaignPreview.excluded.noPhone }} sem telefone, {{ campaignPreview.excluded.missingDemographics }} sem dados necessários e {{ campaignPreview.excluded.filters }} fora dos filtros.</p><ul><li v-for="item in campaignPreview.items" :key="item.phone">{{ item.patientName }} · {{ item.phone }}</li></ul><p v-if="campaignPreview.total>campaignPreview.items.length" class="text-gray-500">A prévia mostra os primeiros {{ campaignPreview.items.length }}. O público completo será congelado na aprovação.</p></div>
      <template #footer><button class="btn-secondary" @click="previewOpen=false">Fechar</button><button class="btn-primary" :disabled="saving||!selected" @click="approveCampaign">Aprovar e agendar aviso</button></template>
    </ListDetailDialog>

    <ListDetailDialog :open="detailOpen" :title="detailTitle" @close="detailOpen=false">
      <dl v-if="selected" class="wa-detail">
        <template v-if="activeTab==='events'"><dt>Tipo</dt><dd>{{ typeLabel(selected.type) }}</dd><dt>Período</dt><dd>{{ dateOnly(selected.start_date) }} a {{ dateOnly(selected.end_date) }}</dd><dt>Situação</dt><dd>{{ statusLabel(selected.status) }}</dd><template v-if="selected.type==='CAMPAIGN'"><dt>Início do envio</dt><dd>{{ dateTime(selected.send_at) }}</dd><dt>Prazo final</dt><dd>{{ dateTime(selected.send_deadline_at) }}</dd><dt>Aviso ao chatbot</dt><dd>{{ selected.webhook_status || 'Não programado' }}</dd></template><dt>Mensagem</dt><dd>{{ selected.message || 'Sem mensagem' }}</dd><dt>Público</dt><dd>{{ audienceLabel(selected.audience) }}</dd></template>
        <template v-else-if="activeTab==='absences'"><dt>Paciente</dt><dd>{{ selected.patient_name }}</dd><dt>Resposta</dt><dd>{{ choiceLabel(selected.choice) }}</dd><dt>Respondido em</dt><dd>{{ dateTime(selected.responded_at) }}</dd><dt>Faltas consecutivas</dt><dd>{{ selected.absence_snapshot?.totalMisses ?? '—' }}</dd><dt>Mensagem registrada</dt><dd>{{ selected.response_text || 'Sem texto adicional' }}</dd><dt>Cobrança</dt><dd>{{ billingLabel(selected.billing_status) }}</dd><label>Situação da cobrança<select v-model="billingForm.status" class="input"><option value="PENDING">Pendente</option><option value="CONTACTED">Contatado</option><option value="RESOLVED">Resolvido</option><option value="NOT_APPLICABLE">Não se aplica</option></select></label><label>Observações<textarea v-model="billingForm.notes" class="input" rows="3" maxlength="2000" /></label></template>
        <template v-else-if="activeTab==='surveys'"><dt>Paciente</dt><dd>{{ selected.patient_name }}</dd><dt>Conclusão</dt><dd>{{ completionLabel(selected.completion_snapshot) }}</dd><dt>Respondido em</dt><dd>{{ dateTime(selected.responded_at) }}</dd><dt>Notas</dt><dd>{{ surveyLabel(selected.survey_response) }}</dd><dt>Recomendaria</dt><dd>{{ selected.survey_response ? (selected.survey_response.wouldRecommend ? 'Sim' : 'Não') : '—' }}</dd><dt>Comentário</dt><dd>{{ selected.survey_response?.comment || 'Sem comentário' }}</dd></template>
        <template v-else><dt>Agenda</dt><dd>{{ blockSchedule(selected) }}</dd><dt>Período</dt><dd>{{ blockPeriod(selected) }}</dd><dt>Situação</dt><dd>{{ selected.status }}</dd><dt>Agendamento Stenci</dt><dd>{{ selected.result?.appointmentId || 'Não confirmado' }}</dd><dt>Motivo</dt><dd>{{ selected.request?.notes || '—' }}</dd><dt>Erro</dt><dd>{{ selected.errorCode || '—' }}</dd></template>
      </dl>
      <template #footer><button class="btn-secondary" @click="detailOpen=false">Fechar</button><button v-if="activeTab==='absences' && selected" class="btn-primary" :disabled="saving" @click="saveBilling">Salvar cobrança</button></template>
    </ListDetailDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import api from '@/plugins/axios'
import { notify } from '@/composables/useNotifications'
import { useAuthUser } from '@/composables/useAuthUser'

type Tab='events'|'absences'|'surveys'|'blocks'
const tabs:{key:Tab;label:string}[]=[{key:'events',label:'Eventos e campanhas'},{key:'blocks',label:'Bloqueios de agenda'},{key:'absences',label:'Retorno das faltas'},{key:'surveys',label:'Pesquisas finais'}]
const activeTab=ref<Tab>('events'),items=ref<any[]>([]),selected=ref<any|null>(null),loading=ref(false),saving=ref(false),total=ref(0),page=ref(1),pageSize=ref(20),eventOpen=ref(false),blockOpen=ref(false),detailOpen=ref(false),previewOpen=ref(false),campaignPreview=ref<any|null>(null),blockOptions=ref<any[]>([])
const {canOperational}=useAuthUser()
const emptyEvent=()=>({id:null,revision:0,type:'HOLIDAY',name:'',startDate:'',endDate:'',message:'',sendAt:'',sendDeadlineAt:'',status:'DRAFT',audience:{patientStatus:'ALL',gender:'ALL',ageMin:'',ageMax:'',services:[] as string[]}})
const eventForm=reactive(emptyEvent()),servicesText=ref(''),billingForm=reactive({status:'NOT_APPLICABLE',notes:''})
const blockForm=reactive({optionKey:'',startDate:'',endDate:'',notes:''})
const columns=computed(()=>activeTab.value==='events'?[{key:'name',label:'Evento'},{key:'type',label:'Tipo'},{key:'start_date',label:'Início',format:dateOnly},{key:'end_date',label:'Fim',format:dateOnly},{key:'status',label:'Situação'}]:activeTab.value==='blocks'?[{key:'block_schedule',label:'Agenda'},{key:'block_period',label:'Período'},{key:'status',label:'Situação'},{key:'createdAt',label:'Criado em',format:dateTime}]:activeTab.value==='absences'?[{key:'patient_name',label:'Paciente'},{key:'choice',label:'Resposta'},{key:'billing_status',label:'Cobrança',format:billingLabel},{key:'responded_at',label:'Respondido em',format:dateTime}]:[{key:'patient_name',label:'Paciente'},{key:'response_status',label:'Pesquisa'},{key:'report_date',label:'Conclusão em',format:dateOnly},{key:'responded_at',label:'Respondido em',format:dateTime}])
const emptyText=computed(()=>activeTab.value==='events'?'Nenhum evento ou campanha cadastrado.':activeTab.value==='blocks'?'Nenhum bloqueio criado pelo Realmed.':activeTab.value==='absences'?'Nenhuma resposta de faltas registrada.':'Nenhuma pesquisa final registrada.')
const contextText=computed(()=>activeTab.value==='events'?'Feriados não alteram o Stenci; campanhas aprovadas avisam o chatbot por webhook no início programado.':activeTab.value==='blocks'?'O bloqueio só é confirmado depois da revalidação e reconciliação na agenda Stenci.':activeTab.value==='absences'?'Pacientes que decidiram parar aparecem com cobrança pendente.':'Somente ciclos concluídos com contador Stenci de pelo menos 10 sessões entram na pesquisa.')
const detailTitle=computed(()=>activeTab.value==='events'?'Detalhes do evento':activeTab.value==='blocks'?'Detalhes do bloqueio':activeTab.value==='absences'?'Retorno do paciente':'Pesquisa de satisfação')
const actions=computed(()=>activeTab.value==='events'?[{icon:'plus',label:'Novo evento',disabled:!canOperational('whatsapp_automation','canCreate'),onClick:newEvent},{icon:'eye',label:'Prévia da campanha',disabled:!selected.value||selected.value.type!=='CAMPAIGN',onClick:previewCampaign},{icon:'edit',label:'Editar evento',disabled:!selected.value||!canOperational('whatsapp_automation','canEdit'),onClick:editEvent},{icon:'trash',label:'Excluir evento',disabled:!selected.value||!canOperational('whatsapp_automation','canDelete'),onClick:deleteEvent},{icon:'refresh',label:'Atualizar',onClick:load}]:activeTab.value==='blocks'?[{icon:'plus',label:'Novo bloqueio',disabled:!canOperational('whatsapp_automation','canCreate'),onClick:newBlock},{icon:'eye',label:'Ver detalhes',disabled:!selected.value,onClick:openSelected},{icon:'refresh',label:'Atualizar',onClick:load}]:[{icon:'eye',label:'Ver detalhes',disabled:!selected.value,onClick:openSelected},{icon:'refresh',label:'Atualizar',onClick:load}])
const dateOnly=(value:any)=>value?String(value).slice(0,10).split('-').reverse().join('/'):'—'
const dateTime=(value:any)=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value)):'—'
const typeLabel=(value:string)=>({HOLIDAY:'Feriado',CAMPAIGN:'Campanha',OTHER:'Outro evento'} as any)[value]||value
const statusLabel=(value:string)=>({DRAFT:'Rascunho',ACTIVE:'Ativo',PAUSED:'Pausado',COMPLETED:'Concluído'} as any)[value]||value
const choiceLabel=(value:string)=>({PENDING:'Aguardando',CONTINUE_TREATMENT:'Vai continuar',STOP_TREATMENT:'Vai parar',HUMAN_ASSISTANCE:'Precisa de atendente',NO_RESPONSE:'Sem resposta',OTHER:'Outro retorno'} as any)[value]||value
const billingLabel=(value:string)=>({PENDING:'Pendente',CONTACTED:'Contatado',RESOLVED:'Resolvido',NOT_APPLICABLE:'Não se aplica'} as any)[value]||value
function audienceLabel(value:any){if(!value)return'Todos';const parts=[value.patientStatus==='ACTIVE'?'Pacientes ativos':value.patientStatus==='ABSENT'?'Pacientes faltantes':'Todos os pacientes',value.gender==='FEMALE'?'Mulheres':value.gender==='MALE'?'Homens':'Todos os sexos'];if(value.ageMin!==null&&value.ageMin!=='')parts.push(`A partir de ${value.ageMin} anos`);if(value.ageMax!==null&&value.ageMax!=='')parts.push(`Até ${value.ageMax} anos`);return parts.join(' · ')}
function completionLabel(value:any){return value?`${value.current} de ${value.total} sessões · ${dateOnly(value.date)}`:'—'}
function surveyLabel(value:any){return value?`Estrutura ${value.structureRating}/5 · Atendimento ${value.serviceRating}/5 · Profissionais ${value.professionalsRating}/5 · Geral ${value.overallRating}/5`:'Aguardando resposta'}
function blockSchedule(item:any){const option=blockOptions.value.find(value=>value.scheduleId===item.request?.destination?.scheduleId);return option?`${option.professionalName} · ${option.scheduleName}`:item.request?.destination?.scheduleId||'—'}
function blockPeriod(item:any){const value=item.request?.destination;return value?`${dateTime(value.startDate+'-03:00')} a ${dateTime(value.endDate+'-03:00')}`:'—'}
function changeTab(tab:Tab){if(tab===activeTab.value)return;activeTab.value=tab;selected.value=null;page.value=1;void load()}
function changePage(value:number){page.value=value;void load()}
function changeSize(value:number){pageSize.value=value;page.value=1;void load()}
async function load(){loading.value=true;try{const path=activeTab.value==='events'?'/whatsapp/events':activeTab.value==='blocks'?'/whatsapp/schedule-blocks':activeTab.value==='absences'?'/whatsapp/absence-responses':'/whatsapp/completion-responses';if(activeTab.value==='blocks'&&!blockOptions.value.length)await loadBlockOptions();const {data}=await api.get(path,{params:{page:page.value,pageSize:pageSize.value}});items.value=data.items;total.value=data.pagination.total;if(selected.value)selected.value=items.value.find(item=>item.id===selected.value.id)||null}catch(error:any){notify(error.response?.data?.error||'Não foi possível carregar o atendimento WhatsApp.','error')}finally{loading.value=false}}
async function loadBlockOptions(){const {data}=await api.get('/whatsapp/schedule-block-options');blockOptions.value=data.items.map((item:any)=>({...item,key:`${item.scheduleId}:${item.professionalId}`}))}
async function newBlock(){try{if(!blockOptions.value.length)await loadBlockOptions();Object.assign(blockForm,{optionKey:'',startDate:'',endDate:'',notes:''});blockOpen.value=true}catch(error:any){notify(error.response?.data?.error||'Não foi possível carregar agendas e profissionais.','error')}}
async function saveBlock(){const option=blockOptions.value.find(value=>value.key===blockForm.optionKey);if(!option)return;if(!window.confirm(`Bloquear ${option.scheduleName} de ${blockForm.startDate} até ${blockForm.endDate}?`))return;saving.value=true;try{await api.post('/whatsapp/schedule-blocks',{scheduleId:option.scheduleId,professionalId:option.professionalId,startDate:blockForm.startDate,endDate:blockForm.endDate,notes:blockForm.notes},{timeout:90000});notify('Bloqueio confirmado no Stenci.','success');blockOpen.value=false;await load()}catch(error:any){notify(error.response?.data?.error||'Não foi possível bloquear o horário.','error')}finally{saving.value=false}}
function newEvent(){Object.assign(eventForm,emptyEvent());servicesText.value='';eventOpen.value=true}
const localDateTime=(value:any)=>{if(!value)return'';return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replace(' ','T')}
function editEvent(){if(!selected.value)return;Object.assign(eventForm,{id:selected.value.id,revision:selected.value.revision,type:selected.value.type,name:selected.value.name,startDate:selected.value.start_date,endDate:selected.value.end_date,message:selected.value.message||'',sendAt:localDateTime(selected.value.send_at),sendDeadlineAt:localDateTime(selected.value.send_deadline_at),status:selected.value.status,audience:{patientStatus:selected.value.audience?.patientStatus||'ALL',gender:selected.value.audience?.gender||'ALL',ageMin:selected.value.audience?.ageMin??'',ageMax:selected.value.audience?.ageMax??'',services:selected.value.audience?.services||[]}});servicesText.value=(eventForm.audience.services||[]).join(', ');eventOpen.value=true}
function closeEvent(){if(saving.value)return;eventOpen.value=false}
async function saveEvent(){saving.value=true;try{const payload={...eventForm,audience:{...eventForm.audience,services:servicesText.value.split(',').map(v=>v.trim()).filter(Boolean)}};if(eventForm.id)await api.put(`/whatsapp/events/${eventForm.id}`,payload);else await api.post('/whatsapp/events',payload);notify('Evento salvo.','success');eventOpen.value=false;selected.value=null;await load()}catch(error:any){notify(error.response?.data?.error||'Não foi possível salvar o evento.','error')}finally{saving.value=false}}
async function deleteEvent(){if(!selected.value||!window.confirm(`Excluir ${selected.value.name}?`))return;saving.value=true;try{await api.delete(`/whatsapp/events/${selected.value.id}`,{data:{revision:selected.value.revision}});notify('Evento excluído.','success');selected.value=null;await load()}catch(error:any){notify(error.response?.data?.error||'Não foi possível excluir o evento.','error')}finally{saving.value=false}}
async function previewCampaign(){if(!selected.value)return;loading.value=true;try{const {data}=await api.post(`/whatsapp/events/${selected.value.id}/preview`);campaignPreview.value=data;previewOpen.value=true}catch(error:any){notify(error.response?.data?.error||'Não foi possível calcular a prévia.','error')}finally{loading.value=false}}
async function approveCampaign(){if(!selected.value||!campaignPreview.value||!window.confirm(`Aprovar a revisão ${selected.value.revision} para ${campaignPreview.value.total} pacientes?`))return;saving.value=true;try{await api.post(`/whatsapp/events/${selected.value.id}/approve`,{revision:selected.value.revision});notify('Campanha aprovada. O Realmed avisará o chatbot no início programado.','success');previewOpen.value=false;await load()}catch(error:any){notify(error.response?.data?.error||'Não foi possível aprovar a campanha.','error')}finally{saving.value=false}}
function openSelected(item=selected.value){if(!item)return;selected.value=item;if(activeTab.value==='absences')Object.assign(billingForm,{status:item.billing_status,notes:item.billing_notes||''});detailOpen.value=true}
async function saveBilling(){if(!selected.value)return;saving.value=true;try{const {data}=await api.patch(`/whatsapp/absence-responses/${selected.value.id}/billing`,{...billingForm,revision:selected.value.revision});Object.assign(selected.value,data);notify('Situação da cobrança atualizada.','success');detailOpen.value=false;await load()}catch(error:any){notify(error.response?.data?.error||'Não foi possível atualizar a cobrança.','error')}finally{saving.value=false}}
onMounted(load)
</script>

<style scoped>
.wa-tabs{display:flex;gap:6px;overflow:auto}.wa-tabs button{border:1px solid #d0d5dd;border-radius:8px;background:#fff;padding:8px 12px;white-space:nowrap}.wa-tabs button.active{background:#e0f2fe;border-color:#38bdf8;color:#075985;font-weight:700}.wa-form,.wa-detail{display:grid;gap:14px}.wa-form label,.wa-detail label{display:grid;gap:6px;font-size:13px;font-weight:600}.wa-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wa-audience{display:grid;gap:12px;border:1px solid #d0d5dd;border-radius:10px;padding:12px}.wa-audience legend{padding:0 5px;font-weight:700}.wa-detail dt{font-size:12px;color:#667085}.wa-detail dd{overflow-wrap:anywhere}.wa-status{display:inline-flex;border-radius:999px;background:#f2f4f7;padding:3px 8px;font-size:12px}@media(max-width:640px){.wa-grid{grid-template-columns:1fr}}
</style>
