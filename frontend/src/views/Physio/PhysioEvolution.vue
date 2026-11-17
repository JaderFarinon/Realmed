<template>
  <div class="physio-evolution-form">
    <div class="clinical-heading"><div><h2>Evolução fisioterapêutica</h2><p v-if="progress">Sessão {{ progress.current }}/{{ progress.total }} · Agenda Stenci</p><p v-else>Numeração da sessão não informada pelo Stenci.</p></div><button class="btn-secondary" type="button" :disabled="busy" @click="refresh">Conferir no Stenci</button></div>
    <p v-if="loading" role="status">Conferindo atendimento…</p>
    <div v-if="loadError" class="clinical-context"><p>{{ loadError }}</p></div>
    <template v-if="clinical">
      <div class="clinical-context"><strong>Rascunho temporário · ainda não enviado</strong><p>O questionário prepara o texto para revisão. Iniciar, salvar e finalizar no Stenci ainda aguardam a integração de retomada do atendimento. Ao sair ou recarregar, este rascunho será descartado.</p><button class="btn-secondary" type="button" disabled>Iniciar atendimento no Stenci</button></div>
        <div v-if="progress?.final" class="clinical-context final-session"><strong>Última sessão prevista · {{ progress.current }}/{{ progress.total }}</strong><p>Registre a reavaliação do ciclo e defina o desfecho clínico. A numeração não determina alta automaticamente.</p></div>
        <fieldset :disabled="busy">
          <details open class="questionnaire">
            <summary>Questionário para montar a evolução</summary>
            <p>Registre somente o que foi observado ou realizado. Os atalhos preenchem o campo apenas quando tocados.</p>
            <div class="clinical-grid">
              <label>Como o paciente chegou? Quais queixas ou mudanças?<textarea v-model="answers.arrival" rows="2" maxlength="3000" placeholder="Queixas, mudanças desde a última sessão e informações relevantes." /></label>
              <div class="clinical-pain"><label>Dor antes<select v-model="answers.painBefore" aria-label="Dor antes"><option value="">Selecione</option><option v-for="n in 11" :key="n" :value="String(n-1)">{{ n-1 }}/10</option><option value="not_assessed">Não avaliada</option></select></label><label>Dor após<select v-model="answers.painAfter" aria-label="Dor após"><option value="">Selecione</option><option v-for="n in 11" :key="n" :value="String(n-1)">{{ n-1 }}/10</option><option value="not_assessed">Não avaliada</option></select></label></div>
              <label>Quais achados funcionais foram observados?<textarea v-model="answers.findings" rows="2" maxlength="3000" placeholder="Mobilidade, força, marcha, edema, medidas e limitações observadas; indique o que não foi avaliado." /></label>
              <label>O que foi realizado? Quais parâmetros?<textarea v-model="answers.procedures" rows="2" maxlength="3000" placeholder="Recursos, exercícios, região, séries, repetições, carga, duração e parâmetros aplicáveis." /><span class="clinical-chips"><button v-for="item in procedures" :key="item" type="button" @click="appendProcedure(item)">{{ item }}</button></span></label>
              <label>Como respondeu ao atendimento?<textarea v-model="answers.response" rows="2" maxlength="3000" placeholder="Tolerância, alterações da dor/função e resposta às condutas." /></label>
              <label>Houve intercorrências?<textarea v-model="answers.events" rows="2" maxlength="3000" placeholder="Descreva o ocorrido e as medidas tomadas, ou registre a ausência observada." /><span class="clinical-chips"><button type="button" @click="answers.events='Sem intercorrências observadas durante o atendimento.'">Sem intercorrências observadas</button></span></label>
              <label>Quais orientações foram fornecidas?<textarea v-model="answers.guidance" rows="2" maxlength="3000" placeholder="Orientações, cuidados e programa domiciliar efetivamente discutidos." /></label>
              <label>Qual é o plano para seguir?<textarea v-model="answers.plan" rows="2" maxlength="3000" placeholder="Plano para a próxima sessão, reavaliação ou encaminhamento." /></label>
            </div>
            <section v-if="progress?.final" class="final-questionnaire"><h3>Reavaliação de encerramento do ciclo</h3><p>Consulte a avaliação inicial no botão Ver Avaliação.</p><div class="clinical-grid">
              <label>Como está em relação à avaliação inicial?<textarea v-model="answers.comparison" rows="3" maxlength="3000" placeholder="Compare dor, função, medidas e atividades; identifique limitações da comparação." /></label>
              <label>Quais objetivos foram alcançados ou ficaram pendentes?<textarea v-model="answers.goals" rows="3" maxlength="3000" /></label>
              <label>Quais limitações e cuidados permanecem?<textarea v-model="answers.limitations" rows="3" maxlength="3000" /></label>
              <label>Qual o desfecho e os próximos passos?<textarea v-model="answers.outcome" rows="3" maxlength="3000" placeholder="Alta, continuidade ou encaminhamento, com justificativa, orientações e acompanhamento." /></label>
            </div></section>
            <button class="btn-primary" type="button" @click="generate">Gerar texto para revisar</button>
          </details>
          <label class="clinical-text">Texto da evolução<textarea v-model="text" rows="12" maxlength="26000"  placeholder="Preencha o questionário e gere o texto. Revise e ajuste antes de enviar." /></label>
        </fieldset>
        <p class="clinical-signature">Fisioterapeuta responsável: <b>{{ clinical.professional.name }}</b> · CREFITO {{ clinical.professional.crefito || 'não informado' }} — {{ clinical.professional.state || 'UF não informada' }}. Esta identificação será acrescentada ao final do texto.</p>
        <p v-if="text && staleText" class="clinical-context" role="status">As respostas mudaram. Gere o texto novamente e revise as alterações.</p>
        <div class="clinical-actions"><button type="button" class="btn-secondary" :disabled="busy || !text.trim() || staleText" @click="reviewOpen=true">Pré-visualizar texto</button><button type="button" class="btn-secondary" disabled>Salvar rascunho no Stenci</button><button type="button" class="btn-primary" disabled>Finalizar atendimento</button></div>
    </template>
    <ListDetailDialog :open="reviewOpen" title="Prévia da evolução · não enviada" wide dialog-class="physio-clinical-dialog" @close="reviewOpen=false"><p>Revise o texto e a identificação profissional. Esta prévia não foi gravada no Stenci.</p><pre class="clinical-preview">{{ text }}

{{ signature }}</pre><template #footer><button class="btn-primary" @click="reviewOpen=false">Continuar revisando</button></template></ListDetailDialog>
  </div>
</template>
<script setup lang="ts">
import {computed,ref,watch,onBeforeUnmount} from 'vue'
import { usePhysioAccess } from '@/composables/usePhysioAccess'
import {notify} from '@/composables/useNotifications'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import type {PhysioAppointment} from '@/utils/physioAgenda'
type Answers=Record<string,string>
type Clinical={progress:PhysioAppointment['session_progress'];appointmentStatus:string;professional:{name:string;crefito:string;state:string}}
type EvolutionDraft={text:string;answers:Answers;dirty:boolean;generatedAnswers?:string;signature?:string}
const {api} = usePhysioAccess()
const props=defineProps<{appointment:PhysioAppointment;date:string;active:boolean;draft:EvolutionDraft|null}>(),emit=defineEmits<{draft:[EvolutionDraft];status:[string]}>()
const emptyAnswers=()=>Object.fromEntries(['arrival','painBefore','painAfter','findings','procedures','response','events','guidance','plan','comparison','goals','limitations','outcome'].map(key=>[key,'']))
const answers=ref<Answers>({...emptyAnswers(),...props.draft?.answers}),text=ref(props.draft?.text||''),clinical=ref<Clinical|null>(null),loading=ref(false),busy=ref(false),loadError=ref(''),reviewOpen=ref(false),generatedAnswers=ref(props.draft?.generatedAnswers||''),signature=ref(props.draft?.signature||'')
const dirty=computed(()=>Boolean(text.value||Object.values(answers.value).some(Boolean))),staleText=computed(()=>JSON.stringify(answers.value)!==generatedAnswers.value),progress=computed(()=>clinical.value?clinical.value.progress:props.appointment.session_progress)
let controller=new AbortController(),alive=true
const procedures=['Cinesioterapia','Alongamento','Fortalecimento','Treino funcional','Terapia manual','Eletroterapia','Treino de marcha']
function appendProcedure(item:string){answers.value.procedures+=(answers.value.procedures?'\n':'')+item+': '}
function endpoint(action=''){return `/physio/agenda/${encodeURIComponent(props.appointment.id)}/clinical${action?'/'+action:''}`}
function report(error:any){const message=error.response?.data?.error||'Não foi possível conferir o atendimento. Seu texto permanece na tela.';loadError.value=message;notify(message,error.response?.status===409?'warning':'error')}
async function refresh(){if(loading.value||busy.value)return;loading.value=true;loadError.value='';try{const result=(await api.get<Clinical>(endpoint(),{params:{date:props.date},signal:controller.signal})).data;if(!alive)return;if(clinical.value&&JSON.stringify(result.progress)!==JSON.stringify(clinical.value.progress))generatedAnswers.value='';clinical.value=result;emit('status',result.appointmentStatus)}catch(error:any){if(error.code!=='ERR_CANCELED')report(error)}finally{loading.value=false}}
async function generate(){if(busy.value)return;busy.value=true;loadError.value='';try{const snapshot=JSON.stringify(answers.value);const result=(await api.post(endpoint('preview'),{answers:answers.value,expectedProgress:JSON.stringify(progress.value||null)},{params:{date:props.date},signal:controller.signal})).data;if(!alive)return;text.value=result.text;signature.value=result.signedText.slice(result.text.length).trim();generatedAnswers.value=snapshot;notify('Texto preparado para revisão. Ainda não enviado ao Stenci.','info')}catch(error:any){if(error.code!=='ERR_CANCELED')report(error);if(error.response?.data?.code==='PHYSIO_SESSION_PROGRESS_CHANGED'){generatedAnswers.value='';busy.value=false;await refresh()}}finally{busy.value=false}}
watch(()=>props.active,active=>{if(active&&!clinical.value&&!loading.value)void refresh()},{immediate:true})
watch([text,answers,dirty,generatedAnswers,signature],()=>emit('draft',{text:text.value,answers:{...answers.value},dirty:dirty.value,generatedAnswers:generatedAnswers.value,signature:signature.value}),{deep:true})
onBeforeUnmount(()=>{alive=false;controller.abort()})
</script>
<style scoped>
.clinical-heading,.clinical-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.clinical-heading h2{font-size:18px;font-weight:700}.clinical-heading p,.clinical-signature,.questionnaire>p,.final-questionnaire>p{font-size:12px;color:#526b89;margin:6px 0 12px}.clinical-context{padding:12px;margin:14px 0;border:1px solid #cbdcf6;border-radius:9px;background:#edf5ff;font-size:13px}.clinical-context button{margin-top:10px}.final-session{background:#fff8df;border-color:#e9ca65}.clinical-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.clinical-grid label,.clinical-text{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:600;min-width:0}.clinical-grid textarea,.clinical-text textarea,.clinical-grid select{width:100%;min-width:0;border:1px solid #c9d4e5;border-radius:7px;padding:9px;font-size:14px;font-weight:400;background:#fff;min-height:36px}.clinical-grid textarea,.clinical-text textarea{resize:vertical}.clinical-pain{display:grid;grid-template-columns:1fr 1fr;gap:10px}.clinical-chips{display:flex;flex-wrap:wrap;gap:5px}.clinical-chips button{font-size:11px;border:1px solid #c9d4e5;border-radius:16px;padding:6px 9px;background:#f5f8fc;min-height:32px}.questionnaire summary{cursor:pointer;font-weight:700;padding:12px 0}.questionnaire>.btn-primary{margin:16px 0}.final-questionnaire{margin-top:18px;padding-top:14px;border-top:1px solid #dde5ef}.final-questionnaire h3{font-weight:700}.clinical-text{margin-top:15px}.clinical-text textarea{min-height:210px}.clinical-signature{padding:10px;border-radius:7px;background:#f3f6fa}.clinical-actions{justify-content:flex-end;margin-top:14px}.clinical-actions>span{margin-right:auto;font-size:12px;color:#526b89}.clinical-preview{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:13px;line-height:1.6;background:#f8fafc;border:1px solid #dce4ed;padding:15px;margin:15px 0}.clinical-confirm{display:flex;align-items:flex-start;gap:10px;font-size:14px;margin-top:15px}.clinical-confirm input{margin-top:4px}.physio-evolution-form button{min-height:36px}.physio-evolution-form button:disabled{opacity:.5;cursor:not-allowed}.clinical-grid :disabled,.clinical-text textarea:read-only{background:#f5f7fa;color:#4e6178}.clinical-grid :focus,.clinical-text textarea:focus{outline:2px solid #7da5f4;outline-offset:1px}fieldset{border:0;padding:0;margin:0;min-width:0}@media(max-width:639px){.clinical-grid{grid-template-columns:1fr}.clinical-grid textarea,.clinical-grid select,.clinical-text textarea{font-size:16px}.physio-evolution-form button{min-height:44px}.clinical-actions{align-items:stretch;flex-direction:column}.clinical-actions>span{margin:0}}
</style>
