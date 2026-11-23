<template>
  <div class="physio-evolution-form">
    <div class="clinical-heading">
      <div>
        <h2>Evolução fisioterapêutica</h2>
        <p v-if="progress">Sessão {{ progress.current }}/{{ progress.total }} · Agenda Stenci</p>
        <p v-else>Numeração da sessão não informada pelo Stenci.</p>
      </div>
      <button class="btn-secondary" type="button" :disabled="busy" @click="refresh">Conferir no Stenci</button>
    </div>
    <p v-if="loading" role="status">Conferindo atendimento…</p>
    <div v-if="loadError" class="clinical-context"><p>{{ loadError }}</p></div>
    <template v-if="clinical">
      <div class="clinical-context">
        <strong>{{ finished ? 'Evolução finalizada no Stenci' : 'Rascunho temporário · ainda não enviado' }}</strong>
        <p v-if="finished">Este registro é somente leitura. O Stenci não permite editar uma evolução finalizada; um atendimento posterior cria uma nova evolução.</p>
        <p v-else>Responda por toque, revise o texto e finalize. O envio usa a conta compartilhada, mas a assinatura identifica o fisioterapeuta autenticado pelo nome, CREFITO e UF.</p>
      </div>
      <div v-if="progress?.final" class="clinical-context final-session">
        <strong>Última sessão prevista · {{ progress.current }}/{{ progress.total }}</strong>
        <p>A última etapa registra a reavaliação do ciclo. A numeração não determina alta automaticamente.</p>
      </div>
      <fieldset v-if="!finished" :disabled="busy" class="evolution-wizard">
        <nav class="wizard-progress" aria-label="Etapas da evolução">
          <button v-for="(item,index) in steps" :key="item.id" type="button" :class="{active:step===index,complete:stepComplete(index)}" :aria-current="step===index?'step':undefined" :disabled="index>step&&!stepComplete(index-1)" @click="goToStep(index)">
            <span>{{ index+1 }}</span><small>{{ item.shortTitle }}</small>
          </button>
          <button type="button" :class="{active:reviewStep,complete:Boolean(text)&&!staleText}" :aria-current="reviewStep?'step':undefined" :disabled="!text||staleText" @click="step=steps.length">
            <span>✓</span><small>Revisão</small>
          </button>
        </nav>
        <section v-if="!reviewStep" class="wizard-stage" aria-live="polite">
          <header><p>Etapa {{ step+1 }} de {{ steps.length }}</p><h3>{{ currentStep.title }}</h3><span>Responda às três perguntas. A próxima etapa abrirá automaticamente.</span></header>
          <div class="wizard-questions">
            <section v-for="(question,questionIndex) in currentStep.questions" :key="question.key" class="evolution-question" :class="{answered:questionAnswered(question)}" :aria-labelledby="`question-${step}-${questionIndex}`">
              <div class="question-heading"><span>{{ questionIndex+1 }}</span><h4 :id="`question-${step}-${questionIndex}`">{{ question.prompt }}</h4><b v-if="questionAnswered(question)" aria-label="Respondida">✓</b></div>
              <div class="answer-options" :class="{compact:question.key.startsWith('pain')}" role="radiogroup" :aria-label="question.prompt">
                <button v-for="option in question.options" :key="option.label" type="button" role="radio" :aria-checked="optionSelected(question,option)" :class="{selected:optionSelected(question,option)}" @click="selectAnswer(question,option)">{{ option.label }}</button>
              </div>
            </section>
          </div>
          <footer class="wizard-navigation">
            <button type="button" class="btn-secondary" :disabled="step===0" @click="previousStep">Voltar</button>
            <span>{{ answeredInCurrentStep }}/3 respondidas</span>
            <button type="button" class="btn-primary" :disabled="!stepComplete(step)" @click="advance">{{ step===steps.length-1?'Gerar texto':'Avançar' }}</button>
          </footer>
        </section>
        <section v-else class="wizard-review" aria-live="polite">
          <header><p>Revisão final</p><h3>Confira e edite a evolução</h3><span>O texto foi montado somente com as opções escolhidas. Edite o que precisar.</span></header>
          <label class="clinical-text">Texto da evolução<textarea v-model="text" rows="15" maxlength="26000" placeholder="O texto será montado após responder às etapas." /></label>
          <p class="clinical-signature">Fisioterapeuta responsável: <b>{{ clinical.professional.name }}</b> · CREFITO {{ clinical.professional.crefito||'não informado' }} — {{ clinical.professional.state||'UF não informada' }}. Esta identificação será acrescentada ao final do texto.</p>
          <p v-if="text&&staleText" class="clinical-context" role="status">As respostas mudaram. Gere o texto novamente antes de conferir a prévia.</p>
          <div class="review-navigation"><button type="button" class="btn-secondary" @click="previousStep">Voltar às perguntas</button><button type="button" class="btn-secondary" :disabled="busy" @click="generate">Gerar novamente</button><button type="button" class="btn-primary" :disabled="busy||!text.trim()||staleText" @click="reviewOpen=true">Conferir prévia</button></div>
        </section>
      </fieldset>
      <article v-else class="finished-evolution"><pre>{{ finishedText }}</pre></article>
      <div v-if="!finished" class="clinical-actions"><button type="button" class="btn-secondary" disabled>Salvar rascunho no Stenci</button><button type="button" class="btn-primary" :disabled="busy||!clinical.writeEnabled||!reviewStep||!text.trim()||staleText" @click="reviewOpen=true">Finalizar atendimento</button></div>
    </template>
    <ListDetailDialog :open="reviewOpen" title="Finalizar evolução no Stenci?" wide dialog-class="physio-clinical-dialog" @close="reviewOpen=false">
      <p>Depois de finalizada, esta evolução ficará somente para consulta. Confira o texto e a assinatura do fisioterapeuta.</p><pre class="clinical-preview">{{ text }}

{{ signature }}</pre><template #footer><button class="btn-secondary" :disabled="busy" @click="reviewOpen=false">Continuar revisando</button><button class="btn-primary" :disabled="busy" @click="finish">Confirmar e finalizar</button></template>
    </ListDetailDialog>
  </div>
</template>

<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,ref,watch} from 'vue'
import {usePhysioAccess} from '@/composables/usePhysioAccess'
import {notify} from '@/composables/useNotifications'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import type {PhysioAppointment} from '@/utils/physioAgenda'
type Answers=Record<string,string>
type Clinical={progress:PhysioAppointment['session_progress'];appointmentStatus:string;writeEnabled:boolean;professional:{name:string;crefito:string;state:string};evolution?:{state:string;recordId:string|null;snapshot?:{text:string}|null}|null}
type EvolutionDraft={text:string;answers:Answers;dirty:boolean;generatedAnswers?:string;signature?:string}
type AnswerOption={label:string;value:string;set?:Record<string,string>}
type Question={key:string;prompt:string;options:AnswerOption[]}
type WizardStep={id:string;title:string;shortTitle:string;questions:Question[]}
const {api}=usePhysioAccess()
const props=defineProps<{appointment:PhysioAppointment;date:string;active:boolean;draft:EvolutionDraft|null}>(),emit=defineEmits<{draft:[EvolutionDraft];status:[string]}>()
const emptyAnswers=()=>Object.fromEntries(['arrival','painBefore','painAfter','findings','procedures','response','events','guidance','plan','comparison','goals','limitations','outcome'].map(key=>[key,'']))
const answers=ref<Answers>({...emptyAnswers(),...props.draft?.answers}),text=ref(props.draft?.text||''),clinical=ref<Clinical|null>(null),loading=ref(false),busy=ref(false),loadError=ref(''),reviewOpen=ref(false),generatedAnswers=ref(props.draft?.generatedAnswers||''),signature=ref(props.draft?.signature||''),step=ref(0)
const submittedText=ref(''),finished=computed(()=>clinical.value?.evolution?.state==='FINISHED'),finishedText=computed(()=>clinical.value?.evolution?.snapshot?.text||submittedText.value),dirty=computed(()=>!finished.value&&Boolean(text.value||Object.values(answers.value).some(Boolean))),staleText=computed(()=>JSON.stringify(answers.value)!==generatedAnswers.value),progress=computed(()=>clinical.value?clinical.value.progress:props.appointment.session_progress)
const painOptions:AnswerOption[]=[...Array.from({length:11},(_,value)=>({label:`${value}/10`,value:String(value)})),{label:'Não avaliada',value:'not_assessed'}]
const baseSteps:WizardStep[]=[
 {id:'condition',shortTitle:'Estado atual',title:'Como o paciente se apresenta hoje?',questions:[
  {key:'arrival',prompt:'Qual é a principal mudança ou queixa desde a última sessão?',options:[{label:'Refere melhora',value:'Paciente refere melhora desde a última sessão.'},{label:'Quadro estável',value:'Paciente refere quadro estável, sem mudança relevante desde a última sessão.'},{label:'Refere piora',value:'Paciente refere piora dos sintomas ou da função desde a última sessão.'},{label:'Apresenta nova queixa',value:'Paciente apresenta nova queixa ou mudança relevante, a ser detalhada na revisão final.'}]},
  {key:'findings',prompt:'O que mais se destaca no desempenho funcional observado?',options:[{label:'Evolução funcional favorável',value:'Observada evolução funcional favorável em relação à sessão anterior.'},{label:'Desempenho funcional estável',value:'Desempenho funcional observado permanece estável.'},{label:'Limitação ainda evidente',value:'Permanece limitação funcional evidente durante as atividades avaliadas.'},{label:'Piora funcional observada',value:'Observada piora funcional em relação à sessão anterior.'},{label:'Não avaliado hoje',value:'Desempenho funcional específico não avaliado nesta sessão.'}]},
  {key:'painBefore',prompt:'Qual era a intensidade da dor antes do atendimento?',options:painOptions},
 ]},
 {id:'attendance',shortTitle:'Atendimento',title:'O que foi realizado e como o paciente respondeu?',questions:[
  {key:'procedures',prompt:'Qual conduta melhor resume o atendimento de hoje?',options:[{label:'Mobilidade, alongamento e fortalecimento',value:'Realizados exercícios terapêuticos de mobilidade, alongamento e fortalecimento conforme tolerância.'},{label:'Treino funcional, equilíbrio ou marcha',value:'Realizado treino funcional, de equilíbrio ou de marcha conforme os objetivos terapêuticos.'},{label:'Terapia manual e exercícios',value:'Realizadas técnicas de terapia manual associadas a exercícios terapêuticos.'},{label:'Recurso eletrofísico e exercícios',value:'Aplicado recurso eletrofísico associado a exercícios terapêuticos, conforme indicação e tolerância.'},{label:'Conduta combinada',value:'Realizada combinação de recursos e exercícios conforme o plano terapêutico, a detalhar na revisão final.'}]},
  {key:'response',prompt:'Como o paciente respondeu às condutas realizadas?',options:[{label:'Tolerou bem, sem piora',value:'Paciente tolerou bem as condutas, sem piora dos sintomas durante o atendimento.'},{label:'Melhora da dor ou função',value:'Paciente apresentou melhora da dor ou do desempenho funcional após as condutas.'},{label:'Resposta estável',value:'Paciente apresentou resposta estável, sem mudança clínica relevante após as condutas.'},{label:'Baixa tolerância ou piora',value:'Paciente apresentou baixa tolerância ou piora durante o atendimento, com necessidade de ajuste da conduta.'}]},
  {key:'painAfter',prompt:'Qual era a intensidade da dor após o atendimento?',options:painOptions},
 ]},
 {id:'continuity',shortTitle:'Continuidade',title:'Segurança, orientações e próximos passos',questions:[
  {key:'events',prompt:'Houve alguma intercorrência durante o atendimento?',options:[{label:'Sem intercorrências',value:'Sem intercorrências observadas durante o atendimento.'},{label:'Dor ou desconforto',value:'Houve dor ou desconforto durante o atendimento, com ajuste da conduta.'},{label:'Fadiga, tontura ou mal-estar',value:'Houve fadiga, tontura ou mal-estar durante o atendimento, com interrupção ou adaptação da conduta.'},{label:'Outra intercorrência',value:'Houve outra intercorrência, a ser detalhada na revisão final.'}]},
  {key:'guidance',prompt:'Qual orientação principal foi reforçada ao paciente?',options:[{label:'Exercícios domiciliares e autocuidado',value:'Reforçadas orientações sobre exercícios domiciliares e autocuidado.'},{label:'Postura, ergonomia ou proteção articular',value:'Fornecidas orientações sobre postura, ergonomia ou proteção articular.'},{label:'Limites de esforço e sinais de alerta',value:'Orientado sobre progressão segura, limites de esforço e sinais de alerta.'},{label:'Mantidas orientações anteriores',value:'Mantidas e reforçadas as orientações fornecidas anteriormente.'}]},
  {key:'plan',prompt:'Qual é o plano para a continuidade do cuidado?',options:[{label:'Manter e progredir o plano',value:'Manter o plano terapêutico, com progressão conforme resposta clínica.'},{label:'Reavaliar na próxima sessão',value:'Realizar nova avaliação funcional na próxima sessão antes de progredir a conduta.'},{label:'Ajustar a conduta',value:'Ajustar a conduta terapêutica conforme a resposta observada nesta sessão.'},{label:'Discutir ou encaminhar',value:'Discutir o caso com a equipe ou realizar encaminhamento conforme necessidade clínica.'}]},
 ]},
]
const finalStep:WizardStep={id:'reassessment',shortTitle:'Reavaliação',title:'Reavaliação ao final das sessões previstas',questions:[
 {key:'comparison',prompt:'Como o paciente está em relação à avaliação inicial?',options:[{label:'Melhora global',value:'Apresenta melhora global em relação à avaliação inicial.'},{label:'Melhora parcial',value:'Apresenta melhora parcial, com ganhos funcionais e sintomas ainda presentes.'},{label:'Quadro estável',value:'Mantém quadro funcional semelhante ao registrado na avaliação inicial.'},{label:'Piora clínica ou funcional',value:'Apresenta piora clínica ou funcional em relação à avaliação inicial.'},{label:'Comparação limitada',value:'Não foi possível realizar comparação completa com a avaliação inicial nesta sessão.'}]},
 {key:'goals',prompt:'Qual opção resume os objetivos e as limitações atuais?',options:[{label:'Objetivos alcançados, sem limitação relevante',value:'Objetivos terapêuticos previstos alcançados.',set:{limitations:'Sem limitações funcionais relevantes adicionais registradas nesta reavaliação.'}},{label:'Objetivos parcialmente alcançados',value:'Objetivos terapêuticos parcialmente alcançados.',set:{limitations:'Persistem limitações funcionais que justificam continuidade ou acompanhamento.'}},{label:'Objetivos não alcançados',value:'Objetivos terapêuticos não alcançados conforme previsto.',set:{limitations:'Persistem limitações funcionais relevantes ao final das sessões previstas.'}},{label:'Necessita reavaliação detalhada',value:'Objetivos terapêuticos necessitam de nova definição após reavaliação detalhada.',set:{limitations:'As limitações atuais precisam ser detalhadas em nova avaliação funcional.'}}]},
 {key:'outcome',prompt:'Qual é o desfecho indicado neste momento?',options:[{label:'Continuar fisioterapia',value:'Indicada continuidade da fisioterapia, com revisão do plano terapêutico.'},{label:'Alta com orientações',value:'Indicada alta fisioterapêutica com orientações e programa de manutenção.'},{label:'Encaminhar para avaliação',value:'Indicado encaminhamento para avaliação complementar antes de definir a continuidade.'},{label:'Acompanhar e reavaliar',value:'Indicado acompanhamento e nova reavaliação para definição do desfecho.'}]},
]}
const steps=computed(()=>(progress.value?.final?[...baseSteps,finalStep]:baseSteps)),currentStep=computed(()=>steps.value[Math.min(step.value,steps.value.length-1)]!),reviewStep=computed(()=>step.value===steps.value.length),answeredInCurrentStep=computed(()=>currentStep.value.questions.filter(questionAnswered).length)
let controller=new AbortController(),alive=true,advanceTimer:ReturnType<typeof setTimeout>|undefined
function questionAnswered(question:Question){return Boolean(answers.value[question.key])}
function stepComplete(index:number){return Boolean(steps.value[index]?.questions.every(questionAnswered))}
function optionSelected(question:Question,option:AnswerOption){return answers.value[question.key]===option.value}
function selectAnswer(question:Question,option:AnswerOption){answers.value[question.key]=option.value;if(option.set)Object.assign(answers.value,option.set);clearTimeout(advanceTimer);void nextTick(()=>{if(!stepComplete(step.value))return;const selectedStep=step.value;advanceTimer=setTimeout(()=>{if(step.value===selectedStep&&stepComplete(selectedStep))void advance()},450)})}
function goToStep(index:number){clearTimeout(advanceTimer);if(index<=step.value||steps.value.slice(0,index).every((_,item)=>stepComplete(item)))step.value=index}
function previousStep(){clearTimeout(advanceTimer);step.value=Math.max(0,reviewStep.value?steps.value.length-1:step.value-1)}
async function advance(){clearTimeout(advanceTimer);if(!stepComplete(step.value))return;if(step.value<steps.value.length-1){step.value++;return}if(await generate())step.value=steps.value.length}
function endpoint(action=''){return `/physio/agenda/${encodeURIComponent(props.appointment.id)}/clinical${action?'/'+action:''}`}
function report(error:any){const message=error.response?.data?.error||'Não foi possível conferir o atendimento. Seu texto permanece na tela.';loadError.value=message;notify(message,error.response?.status===409?'warning':'error')}
async function refresh(){if(loading.value||busy.value)return;loading.value=true;loadError.value='';try{const result=(await api.get<Clinical>(endpoint(),{params:{date:props.date},signal:controller.signal})).data;if(!alive)return;if(clinical.value&&JSON.stringify(result.progress)!==JSON.stringify(clinical.value.progress))generatedAnswers.value='';clinical.value=result;emit('status',result.appointmentStatus)}catch(error:any){if(error.code!=='ERR_CANCELED')report(error)}finally{loading.value=false}}
async function generate(){if(busy.value)return false;busy.value=true;loadError.value='';try{const snapshot=JSON.stringify(answers.value);const result=(await api.post(endpoint('preview'),{answers:answers.value,expectedProgress:JSON.stringify(progress.value||null)},{params:{date:props.date},signal:controller.signal})).data;if(!alive)return false;text.value=result.text;signature.value=result.signedText.slice(result.text.length).trim();generatedAnswers.value=snapshot;notify('Texto preparado para revisão. Ainda não enviado ao Stenci.','info');return true}catch(error:any){if(error.code!=='ERR_CANCELED')report(error);if(error.response?.data?.code==='PHYSIO_SESSION_PROGRESS_CHANGED'){generatedAnswers.value='';busy.value=false;await refresh()}return false}finally{busy.value=false}}
async function finish(){if(busy.value||!clinical.value?.writeEnabled||finished.value||!text.value.trim()||staleText.value)return;busy.value=true;loadError.value='';try{const result=(await api.post(endpoint('finish'),{text:text.value,expectedProgress:JSON.stringify(progress.value||null)},{params:{date:props.date},signal:controller.signal})).data;if(!alive)return;submittedText.value=[text.value.trim(),signature.value].filter(Boolean).join('\n\n');clinical.value.evolution={state:'FINISHED',recordId:result.recordId,snapshot:{text:submittedText.value}};clinical.value.appointmentStatus=result.appointmentStatus||'finished';reviewOpen.value=false;emit('status',clinical.value.appointmentStatus);emit('draft',{text:'',answers:emptyAnswers(),dirty:false});notify('Evolução finalizada no Stenci e liberada para consulta.','success')}catch(error:any){if(error.code!=='ERR_CANCELED')report(error)}finally{busy.value=false}}
watch(()=>props.active,active=>{if(active&&!clinical.value&&!loading.value)void refresh()},{immediate:true})
watch([text,answers,dirty,generatedAnswers,signature],()=>emit('draft',{text:text.value,answers:{...answers.value},dirty:dirty.value,generatedAnswers:generatedAnswers.value,signature:signature.value}),{deep:true})
onBeforeUnmount(()=>{alive=false;clearTimeout(advanceTimer);controller.abort()})
</script>

<style scoped>
.clinical-heading,.clinical-actions,.wizard-navigation,.review-navigation{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.clinical-heading h2{font-size:18px;font-weight:700}.clinical-heading p,.clinical-signature{font-size:12px;color:#526b89;margin:6px 0 12px}.clinical-context{padding:12px;margin:14px 0;border:1px solid #cbdcf6;border-radius:9px;background:#edf5ff;font-size:13px}.clinical-context button{margin-top:10px}.final-session{background:#fff8df;border-color:#e9ca65}.evolution-wizard{border:0;padding:0;margin:18px 0 0;min-width:0}.wizard-progress{display:grid;grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:7px;margin-bottom:14px}.wizard-progress button{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:40px;padding:6px;border:1px solid #d7e1ed;border-radius:9px;background:#f7f9fc;color:#64748b;font-size:11px}.wizard-progress button span{display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:50%;background:#e4eaf1;font-weight:700}.wizard-progress button small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wizard-progress button.complete{color:#08765b;border-color:#a9d8c8;background:#f0faf6}.wizard-progress button.complete span{background:#cbeede}.wizard-progress button.active{color:#174f9b;border-color:#80a9e8;background:#edf4ff}.wizard-progress button.active span{background:#cfe0fb}.wizard-stage,.wizard-review{border:1px solid #d9e2ee;border-radius:14px;background:#fff;padding:16px}.wizard-stage>header,.wizard-review>header{margin-bottom:14px}.wizard-stage>header p,.wizard-review>header p{color:#245ba7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.wizard-stage>header h3,.wizard-review>header h3{font-size:19px;font-weight:700;color:#173e6c;margin:3px 0}.wizard-stage>header span,.wizard-review>header span{font-size:12px;color:#60748d}.wizard-questions{display:grid;gap:10px}.evolution-question{border:1px solid #dbe3ed;border-radius:11px;padding:12px;background:#fbfcfe}.evolution-question.answered{border-color:#abd8c9;background:#f7fcfa}.question-heading{display:grid;grid-template-columns:26px minmax(0,1fr) 20px;align-items:center;gap:8px;margin-bottom:10px}.question-heading>span{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#e8eef7;color:#24558f;font-size:12px;font-weight:700}.question-heading h4{font-size:14px;font-weight:700;line-height:1.35;color:#1d3855}.question-heading b{color:#08765b}.answer-options{display:flex;flex-wrap:wrap;gap:7px}.answer-options button{min-height:38px;padding:7px 11px;border:1px solid #cbd7e6;border-radius:9px;background:#fff;color:#294862;font-size:12px;line-height:1.3;text-align:left}.answer-options button:hover{border-color:#6f9cde;background:#f2f7ff}.answer-options button.selected{border-color:#3976d2;background:#e8f1ff;color:#174f9b;box-shadow:inset 0 0 0 1px #3976d2;font-weight:650}.wizard-navigation{margin-top:14px}.wizard-navigation>span{font-size:12px;color:#60748d}.clinical-text{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:600;min-width:0;margin-top:15px}.clinical-text textarea{width:100%;min-width:0;min-height:270px;border:1px solid #c9d4e5;border-radius:9px;padding:11px;font-size:14px;font-weight:400;line-height:1.55;background:#fff;resize:vertical}.clinical-signature{padding:10px;border-radius:7px;background:#f3f6fa}.review-navigation{justify-content:flex-end;margin-top:14px}.clinical-actions{justify-content:flex-end;margin-top:14px}.clinical-preview{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:13px;line-height:1.6;background:#f8fafc;border:1px solid #dce4ed;padding:15px;margin:15px 0}.physio-evolution-form button{min-height:36px}.physio-evolution-form button:disabled{opacity:.5;cursor:not-allowed}.clinical-text textarea:focus,.answer-options button:focus-visible,.wizard-progress button:focus-visible{outline:2px solid #7da5f4;outline-offset:2px}
.finished-evolution{margin-top:14px;border:1px solid #abd8c9;border-radius:12px;background:#f5fbf8;padding:15px}.finished-evolution pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:13px;line-height:1.7;color:#294862}
@media(max-width:900px){.wizard-progress button small{display:none}.wizard-progress button{padding:5px}.wizard-stage,.wizard-review{padding:12px}.answer-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.answer-options button{width:100%}}
@media(max-width:639px){.answer-options{grid-template-columns:1fr}.answer-options.compact{grid-template-columns:repeat(4,minmax(0,1fr))}.answer-options.compact button{justify-content:center;padding-inline:4px;text-align:center}.clinical-text textarea{font-size:16px}.physio-evolution-form button{min-height:44px}.clinical-actions,.review-navigation{align-items:stretch;flex-direction:column}.wizard-navigation>span{order:-1;width:100%;text-align:center}.wizard-stage>header h3,.wizard-review>header h3{font-size:17px}.question-heading h4{font-size:13px}}
@media screen and (min-width:640px) and (max-width:1368px),screen and (min-width:640px) and (pointer:coarse){.wizard-stage,.wizard-review{padding:10px}.wizard-questions{gap:7px}.evolution-question{padding:8px}.question-heading{margin-bottom:7px}.answer-options button{min-height:36px;padding:6px 9px;font-size:11px}.wizard-navigation{margin-top:10px}.clinical-text textarea{min-height:220px}}
</style>
