const {lockOpen} = require('./treatmentStages');
const {isDocumentComplete,requiredForProcess} = require('./guideWorkflow');
const finals = ['AUTHORIZED','DENIED','SESSION_TOKEN','NOT_REQUIRED'];
const transitions = {
  NOT_READY: [],
  READY: ['IN_PROGRESS'],
  IN_PROGRESS: ['READY','PENDING',...finals],
  PENDING: ['READY','IN_PROGRESS'],
  DENIED: ['READY','IN_APPEAL','IN_PROGRESS',...finals],
  IN_APPEAL: ['READY','IN_PROGRESS',...finals],
  AUTHORIZED: ['READY','IN_PROGRESS',...finals],
  SESSION_TOKEN: ['READY','IN_PROGRESS',...finals],
  NOT_REQUIRED: ['READY','IN_PROGRESS',...finals],
};
const fail = (message,status=422) => {throw Object.assign(new Error(message),{status});};
function text(value,max,label) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) fail(`${label} inválido.`);
  return value.trim() || null;
}
function date(value,label) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+'T12:00:00Z')) || new Date(value+'T12:00:00Z').toISOString().slice(0,10) !== value) fail(`${label} inválida.`);
  return value;
}
function authorizationNumber(value) {
  const number = text(value,100,'Número da autorização');
  if (number !== null && !/^[0-9]+$/.test(number)) fail('Número da autorização deve conter apenas números.');
  return number;
}
// MySQL DATE values are calendar dates, not instants. Avoid UTC serialization.
function authorizationQuery(db) {
  return db('guide_authorizations').select('*',
    db.raw("DATE_FORMAT(authorization_date, '%Y-%m-%d') as authorization_date"),
    db.raw("DATE_FORMAT(expiration_date, '%Y-%m-%d') as expiration_date"));
}
async function authorizationDateLimit(db, processId) {
  const process = await db('guide_processes').where({id:processId}).select(db.raw("DATE_FORMAT(created_at, '%Y-%m-%d') as day")).first();
  const sent = await db('guide_process_history').where({guide_process_id:processId,field:'authorization_status',new_value:'IN_PROGRESS'})
    .whereIn('action',['SENT_TO_INSURANCE','AUTHORIZATION_STATUS_CHANGED','STATUS_CHANGED'])
    .select(db.raw("DATE_FORMAT(MAX(created_at), '%Y-%m-%d') as day")).first();
  return [process?.day,sent?.day].filter(Boolean).sort().pop() || null;
}
function validateAuthorizationDates(input, minimum) {
  const authorization_date = date(input.authorization_date,'Data da autorização');
  const expiration_date = date(input.expiration_date,'Validade');
  if (authorization_date && minimum && authorization_date < minimum) fail('Data da autorização não pode ser anterior à criação do tratamento ou ao último pedido de liberação ('+minimum.split('-').reverse().join('/')+').');
  if (authorization_date && expiration_date && expiration_date < authorization_date) fail('Validade não pode ser anterior à data da autorização.');
  return {authorization_date,expiration_date};
}
function validateInput(body) {
  if (!body || typeof body !== 'object' || !Object.hasOwn(transitions,body.status) || !Object.hasOwn(transitions,body.expected_status)) fail('Status de liberação inválido.');
  const quantity = body.authorized_sessions == null || body.authorized_sessions === '' ? null : Number(body.authorized_sessions);
  if (body.authorized_sessions != null && !['number','string'].includes(typeof body.authorized_sessions)) fail('Quantidade autorizada inválida.');
  if (quantity != null && (typeof body.authorized_sessions === 'boolean' || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100000)) fail('Quantidade autorizada deve ser um inteiro entre 0 e 100000.');
  const result = {
    status:body.status, expected_status:body.expected_status,
    notes:text(body.notes,5000,'Observação'),
    authorization_number:authorizationNumber(body.authorization_number),
    authorization_date:date(body.authorization_date,'Data da autorização'),
    expiration_date:date(body.expiration_date,'Validade'),
    authorized_sessions:quantity,
  };
  if (result.authorization_date && result.expiration_date && result.expiration_date < result.authorization_date) fail('Validade não pode ser anterior à data da autorização.');
  return result;
}
async function changeStatus(trx,processId,actorId,body) {
  const input=validateInput(body), process=await lockOpen(trx,processId,'authorization');
  await require('./guideAuthorization').assertLegacy(trx,processId);
  const current=process.authorization_status, target=input.status;
  if (current !== input.expected_status) fail('A liberação foi alterada por outra operação. Atualize a tela antes de continuar.',409);
  if (current===target && finals.includes(target)) {
    const latest=await trx('guide_authorizations').where({guide_process_id:processId}).orderBy('id','desc').first();
    if (!latest || Number(body.expected_authorization_id)!==latest.id) fail('Os dados da liberação foram alterados. Atualize a tela antes de continuar.',409);
  }
  if (current===target && !finals.includes(target)) return {authorization_status:current,unchanged:true};
  if (current!==target && !transitions[current]?.includes(target)) fail('Esta mudança de liberação não é permitida a partir da situação atual.',409);
  const correcting=finals.includes(current) && current!==target;
  if (process.treatment_status!=='WAITING' || process.billing_status!=='NOT_READY') {
    if (current!==target) fail('O tratamento já avançou para atendimento ou faturamento. Revise essas etapas antes de mudar a liberação.',409);
  }
  if (['READY','PENDING','DENIED','IN_APPEAL'].includes(target) || correcting || (target==='IN_PROGRESS' && current!=='READY')) {
    if (!input.notes) fail('Informe o motivo ou a observação desta mudança.');
  }
  if (target==='READY' || target==='IN_PROGRESS') {
    const docs=await trx('guide_process_documents').where({guide_process_id:processId}).whereNull('deleted_at');
    if (!isDocumentComplete(docs,requiredForProcess(process))) fail('Complete as guias obrigatórias antes de encaminhar ou retornar para pendente.');
  }
  if (target==='IN_PROGRESS') {
    const evaluation=await trx('physiotherapy_evaluations').where({guide_process_id:processId,status:'COMPLETED'}).first();
    if (!process.patient_insurance_id || !process.requesting_doctor_id || !process.physiotherapist_id || !process.requested_sessions || (!evaluation && !process.continuation_of_id)) fail('Complete os dados obrigatórios e a avaliação antes de encaminhar ao convênio.');
  }
  const open=await trx('guide_process_pending_items').where({guide_process_id:processId,status:'OPEN'}).select('id');
  if (open.length && !['IN_PROGRESS','READY','PENDING'].includes(target)) fail('Resolva as pendências do convênio antes de registrar uma decisão.');
  let authorizationId=null, itemId=null;
  if (target==='PENDING') {
    [itemId]=await trx('guide_process_pending_items').insert({guide_process_id:processId,description:input.notes.slice(0,255),notes:input.notes,created_by:actorId});
  }
  if (finals.includes(target)) {
    validateAuthorizationDates(input,await authorizationDateLimit(trx,processId));
    if (!process.patient_insurance_id || !process.requested_sessions) fail('Informe o convênio e as sessões solicitadas antes de registrar a decisão.');
    if (target==='AUTHORIZED' && !(input.authorized_sessions > 0)) fail('Informe a quantidade de sessões autorizadas para liberar.');
    if (target!=='DENIED' && input.authorized_sessions != null && Number(process.performed_sessions || 0)>input.authorized_sessions) fail('Sessões realizadas não podem ultrapassar as autorizadas.');
    [authorizationId]=await trx('guide_authorizations').insert({guide_process_id:processId,authorization_number:input.authorization_number,authorization_date:input.authorization_date,expiration_date:input.expiration_date,requested_sessions:process.requested_sessions,authorized_sessions:target==='DENIED'?null:input.authorized_sessions,status:target,notes:input.notes,created_by:actorId,updated_by:actorId});
  }
  const resolvedIds=['IN_PROGRESS','READY'].includes(target) ? open.map(item=>item.id) : [];
  if (resolvedIds.length) await trx('guide_process_pending_items').whereIn('id',resolvedIds).update({status:'RESOLVED',resolved_by:actorId,resolved_at:trx.fn.now()});
  const sessions=finals.includes(target) && target!=='DENIED' ? input.authorized_sessions : null;
  await trx('guide_processes').where({id:processId}).update({authorization_status:target,authorized_sessions:sessions});
  await trx('guide_process_history').insert({guide_process_id:processId,user_id:actorId,action:target==='IN_APPEAL'?'AUTHORIZATION_APPEALED':current===target?'AUTHORIZATION_UPDATED':'AUTHORIZATION_STATUS_CHANGED',field:'authorization_status',old_value:current,new_value:target,metadata:JSON.stringify({authorizationId,itemId,resolvedPendingIds:resolvedIds,notes:input.notes})});
  return {authorization_status:target,authorizationId,itemId};
}
module.exports={changeStatus,validateInput,transitions,finals,authorizationNumber,authorizationDateLimit,validateAuthorizationDates,authorizationQuery};
