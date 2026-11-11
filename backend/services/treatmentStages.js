const stages = {
  reception: 'Dados da recepção',
  central: 'Central de Guias',
  documents: 'Central de Guias',
  evaluation_document: 'Ficha de Avaliação Fisioterapêutica',
  authorization: 'Liberação',
  treatment: 'Tratamento',
};
const labels = { ...stages, evaluation: 'Avaliação fisioterapêutica' };
const prerequisites = {
  evaluation: ['reception'],
  central: ['reception', 'evaluation'],
  documents: ['reception', 'evaluation'],
  evaluation_document: ['reception', 'evaluation'],
  authorization: ['reception', 'evaluation', 'central'],
  treatment: ['reception', 'evaluation', 'central', 'authorization'],
  billing: ['reception', 'evaluation', 'central', 'authorization'],
};
const dependents = {
  reception: ['evaluation', 'central', 'authorization', 'treatment'],
  evaluation: ['central', 'authorization', 'treatment'],
  central: ['authorization', 'treatment'],
  documents: ['authorization', 'treatment'],
  authorization: ['treatment'],
};
function state(process) {
  const value = process?.workflow_stages;
  if (!value) return {};
  const result = { ...(typeof value === 'string' ? JSON.parse(value) : value) };
  // The old documents completion is the terminal marker of the merged stage.
  // A legacy preparation-only completion must not unlock authorization.
  if (result.documents) result.central = result.documents;
  else delete result.central;
  return result;
}
function assertOpen(process, stage) {
  if (stage === 'evaluation_document') stage = 'central';
  if (state(process)[stage]?.completed_at)
    throw Object.assign(new Error(`Reabra a etapa “${stages[stage]}” antes de alterar seus dados.`), {status:409, code:'TREATMENT_STAGE_CLOSED'});
}
function assertActive(process) {
  if (process?.deleted_at)
    throw Object.assign(new Error('Este tratamento está na lixeira. Restaure-o antes de continuar.'), {status:409, code:'TREATMENT_ARCHIVED'});
}
const fields = {
  reception: ['patient_id','assessment_date'],
  central: ['patient_insurance_id','physiotherapist_id','requesting_doctor_id','expected_start_date','referral_date','medical_diagnosis','cid','requested_sessions','priority','notes','preferred_period','treatment_days','external_source','external_reference'],
  authorization: ['authorized_sessions','authorization_status'],
  treatment: ['performed_sessions','treatment_status','billing_status'],
};
const equivalent = (a,b,key) => {
  if (key === 'treatment_days') {
    const json = value => typeof value === 'string' ? JSON.parse(value) : value;
    return require('node:util').isDeepStrictEqual(json(a),json(b));
  }
  if (a == null || a === '') return b == null || b === '';
  if (a instanceof Date || b instanceof Date) return String(a instanceof Date ? a.toISOString().slice(0,10) : a).slice(0,10) === String(b instanceof Date ? b.toISOString().slice(0,10) : b).slice(0,10);
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return String(a) === String(b);
};
function assertStagePrerequisites(process, stage, evaluationStatus) {
  for (const prerequisite of prerequisites[stage] || []) {
    const isComplete = prerequisite === 'evaluation'
      ? Boolean(process?.continuation_of_id) || evaluationStatus === 'COMPLETED'
      : Boolean(state(process)[prerequisite]?.completed_at);
    if (!isComplete)
      throw Object.assign(
        new Error(`Conclua a etapa “${labels[prerequisite]}” antes de abrir esta etapa.`),
        { status: 409, code: 'TREATMENT_STAGE_LOCKED', prerequisite },
      );
  }
}
function assertNoCompletedDependents(process, stage, evaluationStatus) {
  for (const dependent of dependents[stage] || []) {
    const isComplete = dependent === 'evaluation'
      ? evaluationStatus === 'COMPLETED'
      : Boolean(state(process)[dependent]?.completed_at);
    if (isComplete)
      throw Object.assign(
        new Error(`Reabra primeiro a etapa “${labels[dependent]}” para reabrir esta etapa.`),
        { status: 409, code: 'TREATMENT_STAGE_DEPENDENT_CLOSED', dependent },
      );
  }
}
async function assertCanReopenStage(trx, process, stage) {
  let evaluationStatus;
  if ((dependents[stage] || []).includes('evaluation')) {
    const evaluation = await trx('physiotherapy_evaluations')
      .where({ guide_process_id: process.id })
      .select('status')
      .first();
    evaluationStatus = evaluation?.status;
  }
  assertNoCompletedDependents(process, stage, evaluationStatus);
}
async function assertStageUnlocked(trx, process, stage, evaluationStatus) {
  assertActive(process);
  if (prerequisites[stage]?.includes('evaluation') && !process?.continuation_of_id && evaluationStatus === undefined) {
    const evaluation = await trx('physiotherapy_evaluations')
      .where({ guide_process_id: process.id })
      .select('status')
      .first();
    evaluationStatus = evaluation?.status;
  }
  assertStagePrerequisites(process, stage, evaluationStatus);
}
async function assertChangedStagesUnlocked(trx, process, data) {
  for (const [stage, keys] of Object.entries(fields)) {
    if (keys.some((key) => data[key] !== undefined && !equivalent(process[key], data[key], key)))
      await assertStageUnlocked(trx, process, stage);
  }
}
async function lockOpen(trx, processId, stage) {
  const process = await trx('guide_processes').where({id:processId}).forUpdate().first();
  if (!process) throw Object.assign(new Error('Tratamento não encontrado.'), {status:404});
  assertActive(process);
  assertOpen(process, stage);
  await assertStageUnlocked(trx, process, stage);
  if (['authorization','treatment','billing'].includes(stage)) await require('./centralRequirements').assertComplete(trx,processId);
  return process;
}
function assertFieldsOpen(process, data) {
  assertActive(process);
  for (const [stage, keys] of Object.entries(fields))
    if (keys.some(key => data[key] !== undefined && !equivalent(process[key], data[key],key))) assertOpen(process, stage);
}
function evaluationSync(process, data, centralReserved = false) {
  if (!centralReserved && !state(process).central?.completed_at) return data;
  return Object.fromEntries(Object.entries(data).filter(([key]) => !fields.central.includes(key)));
}
module.exports = {stages,prerequisites,state,assertOpen,assertActive,assertStagePrerequisites,assertNoCompletedDependents,assertCanReopenStage,assertStageUnlocked,assertChangedStagesUnlocked,lockOpen,assertFieldsOpen,evaluationSync};
