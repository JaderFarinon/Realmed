const released=['AUTHORIZED','SESSION_TOKEN','NOT_REQUIRED'];
const fail=(message,status=422)=>{throw Object.assign(new Error(message),{status});};
function eligible(p) { return released.includes(p.authorization_status)||p.treatment_status==='COMPLETED'||['DELIVERED','BILLED'].includes(p.billing_status); }
function unfinished(p) { return p.treatment_status!=='COMPLETED'&&!['DELIVERED','BILLED'].includes(p.billing_status)&&!(Number(p.authorized_sessions)>0&&Number(p.performed_sessions)>=Number(p.authorized_sessions)); }
function assertOriginalEvaluation(process) { if(process?.continuation_of_id) fail('A avaliação desta continuidade é somente leitura. Não é necessário realizar uma nova avaliação.',409); }
async function related(db,p) {
  const root=p.treatment_root_id||p.id;
  return db('guide_processes').where(q=>q.where('treatment_root_id',root).orWhere('id',root))
    .select('id','treatment_root_id','continuation_of_id','guide_number','authorization_status','treatment_status','billing_status','requested_sessions','authorized_sessions','performed_sessions','created_at').orderBy('guide_number');
}
async function create(trx,processId,actorId,body) {
  if(body?.require_billing != null && typeof body.require_billing !== 'boolean') fail('Origem da continuidade inválida.');
  if(body?.confirm_end_current!==true) fail('Confirme o encerramento da guia atual para iniciar a continuidade.');
  const qty=Number(body.requested_sessions);
  if(!['number','string'].includes(typeof body.requested_sessions)||!Number.isSafeInteger(qty)||qty<1||qty>100000) fail('Informe de 1 a 100000 sessões para a nova guia.');
  if(body.notes!=null&&typeof body.notes!=='string') fail('Observação inválida.');
  const notes=String(body.notes||'').trim(); if(notes.length>2000) fail('Observação deve ter até 2000 caracteres.');
  const hint=await trx('guide_processes').where({id:processId}).first(); if(!hint) fail('Tratamento não encontrado.',404);
  const root=hint.treatment_root_id||hint.id;
  const original=await trx('guide_processes').where({id:root}).forUpdate().first();
  const old=await trx('guide_processes').where({id:processId}).forUpdate().first();
  if(!original || original.deleted_at || old.deleted_at) fail('Restaure o tratamento antes de gerar uma continuação.',409);
  const latest=await trx('guide_processes').where(q=>q.where('treatment_root_id',root).orWhere('id',root)).orderBy('guide_number','desc').forUpdate().first();
  if(latest.id!==old.id || await trx('guide_processes').where({continuation_of_id:old.id}).forUpdate().first()) fail('Já existe uma guia de continuidade. Abra a guia mais recente deste tratamento.',409);
  if(!eligible(old)) fail('A guia atual precisa estar liberada ou concluída antes de iniciar uma continuidade.',409);
  if(body.require_billing) {
    const ready=await trx('guide_processes as gp').leftJoin('physiotherapy_evaluations as ev','ev.guide_process_id','gp.id').where('gp.id',old.id).whereRaw(require('./guideBilling').billingDueSQL).first('gp.id');
    if(!ready) fail('Esta guia não está mais na fila Faturar. Atualize o tratamento antes de gerar a continuação.',409);
  }
  if(unfinished(old)&&!notes) fail('Informe o motivo para encerrar a guia antes da conclusão das sessões.');
  const shared=['patient_id','patient_insurance_id','physiotherapist_id','requesting_doctor_id','assessment_date','referral_date','medical_diagnosis','cid','priority','notes','preferred_period','treatment_days'];
  const data=Object.fromEntries(shared.map(key=>[key,old[key]]));
  if(data.treatment_days&&typeof data.treatment_days==='object') data.treatment_days=JSON.stringify(data.treatment_days);
  const number=Number(old.guide_number||1)+1;
  const [newId]=await trx('guide_processes').insert({...data,treatment_root_id:root,continuation_of_id:old.id,guide_number:number,requested_sessions:qty,authorized_sessions:null,performed_sessions:0,expected_start_date:null,authorization_status:'READY',document_status:'INCOMPLETE',treatment_status:'WAITING',billing_status:'NOT_READY',workflow_stages:null,created_by:actorId});
  const evaluation=await trx('physiotherapy_evaluations').where({guide_process_id:old.id,status:'COMPLETED'}).forUpdate().first();
  if(evaluation) {
    const copy=Object.fromEntries(Object.entries(evaluation).filter(([key])=>!['id','guide_process_id'].includes(key)).map(([key,value])=>[key,value&&typeof value==='object'&&!(value instanceof Date)&&!Buffer.isBuffer(value)?JSON.stringify(value):value]));
    await trx('physiotherapy_evaluations').insert({...copy,guide_process_id:newId});
  }
  const state=require('./treatmentStages').state(old), now=new Date().toISOString();
  const completedStages=['treatment']; if(old.document_status==='COMPLETE') completedStages.push('documents'); if(await require('./guideAuthorization').canFinalize(trx,old)) completedStages.push('authorization');
  for(const stage of completedStages) state[stage]={completed_at:state[stage]?.completed_at||now,completed_by:state[stage]?.completed_by||actorId};
  await trx('guide_processes').where({id:old.id}).update({treatment_root_id:root,treatment_status:'COMPLETED',billing_status:['DELIVERED','BILLED'].includes(old.billing_status)?old.billing_status:'READY',workflow_stages:JSON.stringify(state)});
  const audit={rootId:root,previousProcessId:old.id,newProcessId:newId,guideNumber:number,requestedSessions:qty,evaluationSourceId:evaluation?.id||null,notes};
  for(const [id,action] of [[old.id,'GUIDE_CONTINUITY_ADDED'],[newId,'GUIDE_CONTINUITY_CREATED']]) await trx('guide_process_history').insert({guide_process_id:id,user_id:actorId,action,metadata:JSON.stringify(audit)});
  return {id:newId,treatment_root_id:root,guide_number:number,authorization_status:'READY'};
}
module.exports={eligible,unfinished,assertOriginalEvaluation,related,create};
