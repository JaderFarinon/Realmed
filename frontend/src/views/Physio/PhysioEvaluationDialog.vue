<template>
 <ListDetailDialog :open="open" title="Avaliação da Gestão de Tratamentos" wide dialog-class="physio-clinical-dialog" @close="$emit('close')">
  <p class="evaluation-patient"><strong>{{ patientName }}</strong></p>
  <p v-if="loading" role="status">Carregando avaliação…</p><p v-if="error" role="status">{{ error }}</p>
  <label v-if="options.length" class="evaluation-choice">Tratamento<select v-model="selected" class="input" aria-label="Tratamento" @change="loadEvaluation"><option value="">Selecione o tratamento</option><option v-for="item in options" :key="item.id" :value="String(item.id)">Tratamento #{{ item.id }} · Guia {{ item.guide_number || 1 }} · {{ simpleDate(item.evaluation_date || item.assessment_date || '') || 'Data não informada' }}{{ item.evaluation_status==='COMPLETED'?' · Avaliação concluída':' · Sem avaliação concluída' }}</option></select></label>
  <p v-else-if="!loading&&!error">Nenhum tratamento local está vinculado ao cadastro Stenci deste paciente.</p>
  <p v-if="selected&&!loading&&!evaluation&&!error">Este tratamento ainda não tem uma avaliação concluída disponível para consulta.</p>
  <div v-if="evaluation" class="physio-evaluation-read">
   <p class="evaluation-read-note">Somente leitura · {{ process?.continuation_of_id?'Avaliação inicial preservada nesta continuidade':'Avaliação concluída' }} · {{ simpleDate(evaluation.evaluation_date) }}</p>
   <section v-for="section in sections" :key="section.title"><h3>{{ section.title }}</h3><dl><div v-for="[key,label] in section.fields" :key="key"><dt>{{ label }}</dt><dd>{{ display(evaluation[key],key) }}</dd></div></dl></section>
   <section><h3>Regiões avaliadas</h3><p v-for="(region,index) in evaluation.regions||[]" :key="index">{{ region.name || region.region }}{{ region.side ? ' · '+region.side : '' }}{{ region.laterality ? ' · '+display(region.laterality) : '' }}</p><p v-if="evaluation.other_region">{{ evaluation.other_region }}</p><EvaluationDrawing v-if="evaluation.body_marks?.length" :model-value="evaluation.body_marks" disabled /></section>
   <section><h3>Programação registrada na avaliação</h3><p v-for="(day,index) in evaluation.treatment_days||[]" :key="index">{{ days[day.day]||day.day }}: {{ day.enabled===false?'Sem atendimento':day.time||'Horário não informado' }}</p><p>{{ evaluation.sessions_per_week??'—' }} sessões/semana · Total previsto: {{ evaluation.planned_total_sessions??evaluation.requested_sessions??'—' }} · Início: {{ simpleDate(evaluation.expected_start_date)||'não informado' }}</p></section>
   <section><h3>Responsável pela avaliação</h3><p>{{ evaluation.responsible_name || 'Não informado' }} · CREFITO {{ evaluation.responsible_crefito || 'não informado' }}</p><EvaluationDrawing v-if="evaluation.signature_strokes?.length" :model-value="evaluation.signature_strokes" signature disabled /></section>
  </div>
 </ListDetailDialog>
</template>
<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import { usePhysioAccess } from '@/composables/usePhysioAccess'
import {notify} from '@/composables/useNotifications'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import EvaluationDrawing from '@/components/EvaluationDrawing.vue'
import {physioDate as simpleDate} from '@/utils/physioAgenda'
const {api} = usePhysioAccess()
const props=defineProps<{open:boolean;appointmentId:string;date:string;patientName:string}>();defineEmits<{close:[]}>()
const options=ref<any[]>([]),selected=ref(''),evaluation=ref<any>(null),process=ref<any>(null),loading=ref(false),error=ref('')
let controller:AbortController|undefined,version=0
const days:Record<string,string>={MONDAY:'Segunda',TUESDAY:'Terça',WEDNESDAY:'Quarta',THURSDAY:'Quinta',FRIDAY:'Sexta',SATURDAY:'Sábado',SUNDAY:'Domingo'}
const labels:Record<string,string>={MILD:'Leve',MODERATE:'Moderado',SEVERE:'Grave',LOW:'Baixo',HIGH:'Alto',RIGHT:'Direita',LEFT:'Esquerda',BILATERAL:'Bilateral'}
function display(value:any,key?:string):string{if(key==='individual_monitoring' && value!=null)return Number(value)?'Sim':'Não';if(key?.endsWith('_date') && value)return simpleDate(value);if(value===null||value===undefined||value==='')return 'Não informado';if(typeof value==='boolean')return value?'Sim':'Não';if(Array.isArray(value))return value.map(item=>display(item)).join(' · ')||'Não informado';return labels[String(value)]||String(value)}
const sections=[{title:'Encaminhamento e diagnóstico',fields:[['referral_professional','Profissional solicitante'],['referral_date','Data do encaminhamento'],['medical_diagnosis','Diagnóstico médico / hipótese'],['cid','CID'],['authorization_reference','Guia / autorização']]},{title:'Condição físico-funcional inicial',fields:[['chief_complaint','Queixa principal'],['current_history','História do quadro'],['functional_limitations','Limitações funcionais'],['physical_exam','Exame físico'],['pain_score','EVA inicial'],['pain_classification','Classificação da dor'],['pain_location','Localização da dor']]},{title:'Gravidade, riscos e precauções',fields:[['severity','Gravidade'],['severity_justification','Justificativa'],['care_risk','Risco'],['individual_monitoring','Acompanhamento individualizado'],['precautions','Precauções'],['other_precaution','Outra precaução'],['specific_care_notes','Cuidados específicos']]},{title:'Plano terapêutico',fields:[['therapeutic_goals','Objetivos'],['conducts','Condutas'],['other_conduct','Outra conduta'],['conduct_description','Parâmetros e progressão'],['reevaluation_date','Data de reavaliação'],['reevaluation_notes','Critério de reavaliação']]}]
async function request(processId?:string){const current=++version;controller?.abort();controller=new AbortController();loading.value=true;error.value='';try{const {data}=await api.get(`/physio/agenda/${encodeURIComponent(props.appointmentId)}/evaluation`,{params:{date:props.date,processId},signal:controller.signal});if(current!==version)return;if(processId){evaluation.value=data.evaluation;process.value=data.process}else{options.value=data.options;selected.value=options.value.length===1?String(options.value[0].id):'';if(selected.value)await loadEvaluation()}}catch(e:any){if(e.code==='ERR_CANCELED')return;error.value=e.response?.data?.error||'Não foi possível consultar a avaliação.';notify(error.value,'error')}finally{if(current===version)loading.value=false}}
async function loadEvaluation(){evaluation.value=null;process.value=null;if(selected.value)await request(selected.value)}
watch(()=>[props.open,props.appointmentId,props.date],()=>{version++;controller?.abort();evaluation.value=null;options.value=[];selected.value='';error.value='';if(props.open)void request()},{immediate:true})
onBeforeUnmount(()=>{version++;controller?.abort()})
</script>
<style scoped>
.evaluation-choice{display:flex;flex-direction:column;gap:8px;font-size:13px;margin:12px 0}.evaluation-choice select{width:100%;min-height:36px}.physio-evaluation-read section{border-top:1px solid #dce5f0;padding:14px 0}.physio-evaluation-read h3{font-weight:700;font-size:15px;margin-bottom:10px}.physio-evaluation-read dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}.physio-evaluation-read dt{font-size:11px;color:#526b89}.physio-evaluation-read dd,.physio-evaluation-read p{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}.evaluation-read-note{background:#edf7f2;padding:10px;border-radius:8px}.physio-evaluation-read :deep(.drawing){max-height:380px;width:100%}.physio-evaluation-read :deep(button){display:none}@media(max-width:639px){.physio-evaluation-read dl{grid-template-columns:1fr}}
</style>
