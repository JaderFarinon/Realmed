const STAGES = ['reception','evaluation','central','documents','authorization','billing','treatment'];
const TTL = 60000;
const active = row => Number(row?.expires_at || 0) > Date.now();
const owned = (row, userId, editorId) => active(row) && Number(row.owner_id) === Number(userId) && row.editor_id === editorId;
function assertAvailable(row, userId, editorId) {
  if (active(row) && !owned(row,userId,editorId))
    throw Object.assign(new Error('Esta aba está sendo editada por outra pessoa ou janela. Aguarde a liberação.'),{status:423,code:'TREATMENT_EDIT_LOCKED'});
}
function assertReservation(row, userId, editorId, {renew=false,recoverFrom}={}) {
  // Heartbeats must never acquire a new lease or take one back after a transfer.
  if (renew) {
    if (!owned(row,userId,editorId) || recoverFrom !== undefined)
      throw Object.assign(new Error('Sua reserva de edição terminou ou foi recuperada em outra janela. Os dados não salvos continuam nesta tela.'),{status:423,code:'TREATMENT_EDIT_LOST'});
    return;
  }
  if (recoverFrom !== undefined) {
    if (Number(row?.owner_id) !== Number(userId))
      throw Object.assign(new Error('Só é possível recuperar uma reserva da sua própria conta.'),{status:423,code:'TREATMENT_EDIT_LOCKED'});
    // Compare the observed reservation under the row lock: two stale confirmations cannot win.
    if (typeof recoverFrom !== 'string' || !recoverFrom || row.editor_id !== recoverFrom || editorId === recoverFrom)
      throw Object.assign(new Error('A reserva de edição mudou. Confira a situação atual da aba e tente novamente.'),{status:409,code:'TREATMENT_EDIT_CHANGED'});
    return;
  }
  assertAvailable(row,userId,editorId);
}
function mutationTarget(path, method, body = {}) {
  if (/\/(preview|code-review-options|read-codes|indicate)$/.test(path) || path.includes('/edit-lock')) return null;
  const match = path.match(/^\/api\/guide-processes\/(\d+)(.*)$/) || path.match(/^\/api\/integrations\/stenci\/treatments\/(\d+)(.*)$/);
  if (!match) return null;
  const id = Number(match[1]), tail = match[2];
  const stage = tail.match(/^\/stages\/([^/]+)\//)?.[1];
  if (stage) return {id,stages:stage==='treatment'?['treatment','billing']:['documents','evaluation_document'].includes(stage)?['central']:STAGES.includes(stage)?[stage]:['central']};
  if (tail.startsWith('/evaluation')) return {id,stages:['evaluation','central']};
  if (/^\/(documents|physiotherapy-evaluation)/.test(tail)) return {id,stages:['central']};
  if (/^\/billing/.test(tail)) return {id,stages:['billing']};
  if (/^\/(authorizations|authorization|pending)/.test(tail)) return {id,stages:['authorization']};
  if (/^\/rotation/.test(tail)) return {id,stages:['evaluation','central']};
  if (tail==='' && method==='PUT') {
    const stages = new Set();
    for (const key of Object.keys(body)) stages.add(['patient_id','assessment_date'].includes(key)?'reception':['treatment_status','performed_sessions','billing_status'].includes(key)?'treatment':key==='authorized_sessions'?'authorization':'central');
    if(stages.has('treatment')) stages.add('billing');
    return {id,stages:[...stages]};
  }
  if (/^\/procedures/.test(tail)) return {id,stages:['central']};
  return {id,stages:STAGES};
}
async function lockedRow(trx,id,stage) {
  await trx('treatment_edit_locks').insert({guide_process_id:id,stage,expires_at:0}).onConflict(['guide_process_id','stage']).ignore();
  return trx('treatment_edit_locks').where({guide_process_id:id,stage}).forUpdate().first();
}
module.exports = {STAGES,TTL,active,owned,assertAvailable,assertReservation,mutationTarget,lockedRow};
