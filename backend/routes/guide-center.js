const treatmentStages = require('../services/treatmentStages')
const { applyQueueFilters, queueCounts } = require('../services/treatmentQueues')
const express = require('express')
const knexFactory = require('knex')
const knexConfig = require('../knexfile')
const auth = require('../middleware/auth')
const { modulePermission } = require('../middleware/permission')
const { syncInsurance, syncProfessional } = require('../../integrations/stenci/StenciTreatmentSyncService')

const knex = knexFactory(knexConfig[process.env.NODE_ENV || 'development'] || knexConfig.development)
const router = express.Router()
const clean = (v) => typeof v === 'string' ? v.trim() : v
const id = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1) throw Object.assign(new Error('Identificador inválido.'), { status: 400 }); return n }
const handle = (res, error) => { console.error('[Central de Guias]', error); res.status(error.status || 500).json({ error: error.status ? error.message : 'Erro interno da Central de Guias.' }) }
const required = (body, fields) => { for (const field of fields) if (body[field] === undefined || clean(body[field]) === '') throw Object.assign(new Error(`Campo obrigatório: ${field}.`), { status: 400 }) }

router.use(auth)
router.get('/guide-processes/:id/preparation-options', modulePermission('guide_processes'), async (req,res) => {
  try {
      const treatment=await knex('guide_processes').where({id:id(req.params.id)}).whereNull('deleted_at').first();
    if(!treatment) throw Object.assign(new Error('Tratamento não encontrado.'),{status:404});
    const [professionals,insurances,procedures]=await Promise.all([
      knex('professionals').orderBy('full_name'),
      knex('patient_insurances as pi').join('insurance_providers as ip','ip.id','pi.insurance_provider_id').where('pi.patient_id',treatment.patient_id).select('pi.*','ip.name as insurance_name'),
      knex('procedures').where({active:true}).orderBy('description'),
    ]);
    res.json({professionals,insurances,procedures});
  } catch(e){handle(res,e)}
})

const catalogs = {
  'insurance-providers': { table: 'insurance_providers', module: 'insurance_providers', required: ['name', 'authorization_type'], fields: ['name','internal_code','ans_registration','authorization_type','active','notes'], logo: true },
  professionals: { table: 'professionals', module: 'professionals', required: ['full_name','type','council','council_number','state'], fields: ['full_name','type','council','council_number','state','cbo','active','notes'] },
  procedures: { table: 'procedures', module: 'procedures', required: ['code','description','type'], fields: ['code','description','table_name','type','active','notes'] },
}
for (const [path, config] of Object.entries(catalogs)) {
  router.get(`/${path}`, modulePermission(config.module), async (req, res) => { try { const q = knex(`${config.table} as catalog`).select('catalog.*').orderBy(`catalog.${config.fields[0]}`); if(config.logo)q.select(knex.raw("EXISTS(SELECT 1 FROM insurance_provider_assets asset WHERE asset.insurance_provider_id = catalog.id AND asset.asset_type = 'LOGO' AND asset.active = 1) AS has_logo"));if (req.query.active !== undefined) q.where('catalog.active', req.query.active === 'true'); res.json(await q) } catch (e) { handle(res, e) } })
  router.post(`/${path}`, modulePermission(config.module, 'create'), async (req, res) => { try { required(req.body, config.required); const data = Object.fromEntries(config.fields.filter((f) => req.body[f] !== undefined).map((f) => [f, clean(req.body[f])])); const [created] = await knex(config.table).insert(data); res.status(201).json(await knex(config.table).where({ id: created }).first()) } catch (e) { handle(res, e) } })
  router.put(`/${path}/:id`, modulePermission(config.module, 'edit'), async (req, res) => { try { if (req.body.active !== undefined) throw Object.assign(new Error('Altere a situação pela ação Inativar/Ativar, que exige permissão de exclusão.'), { status: 400 }); const itemId = id(req.params.id); const data = Object.fromEntries(config.fields.filter((f) => f !== 'active' && req.body[f] !== undefined).map((f) => [f, clean(req.body[f])])); if (Object.keys(data).length) await knex(config.table).where({ id: itemId }).update(data); const row = await knex(config.table).where({ id: itemId }).first(); if (!row) throw Object.assign(new Error('Cadastro não encontrado.'), { status: 404 }); res.json(row) } catch (e) { handle(res, e) } })
  router.patch(`/${path}/:id/active`, modulePermission(config.module, 'delete'), async (req, res) => { try { const itemId = id(req.params.id); if (typeof req.body.active !== 'boolean') throw Object.assign(new Error('Informe o estado ativo do cadastro.'), { status: 400 }); const changed = await knex(config.table).where({ id: itemId }).update({ active: req.body.active }); if (!changed) throw Object.assign(new Error('Cadastro não encontrado.'), { status: 404 }); res.json(await knex(config.table).where({ id: itemId }).first()) } catch (e) { handle(res, e) } })
}

router.get('/patients', modulePermission('patients'), async (req, res) => { try { const q = knex('patients').orderBy('full_name'); if (clean(req.query.search)) q.where('full_name', 'like', `%${clean(req.query.search)}%`); res.json(await q) } catch (e) { handle(res, e) } })
router.post('/patients', modulePermission('patients', 'create'), async (req, res) => { try { required(req.body, ['full_name']); const data = pick(req.body, ['external_source','external_id','full_name','cpf','birth_date','phone','email']); const [patientId] = await knex('patients').insert(data); res.status(201).json(await knex('patients').where({ id: patientId }).first()) } catch (e) { duplicate(e); handle(res, e) } })
router.put('/patients/:id', modulePermission('patients', 'edit'), async (req, res) => { try { const patientId = id(req.params.id); await knex('patients').where({ id: patientId }).update(pick(req.body, ['external_source','external_id','full_name','cpf','birth_date','phone','email'])); res.json(await knex('patients').where({ id: patientId }).first()) } catch (e) { duplicate(e); handle(res, e) } })
router.post('/patients/:id/insurances', modulePermission('patients', 'edit'), async (req, res) => { try { required(req.body, ['insurance_provider_id','card_number']); const data = { ...pick(req.body, ['insurance_provider_id','card_number','card_expiration','plan','holder','active']), patient_id: id(req.params.id) }; const [rowId] = await knex('patient_insurances').insert(data); res.status(201).json(await knex('patient_insurances').where({ id: rowId }).first()) } catch (e) { handle(res, e) } })
router.get('/patients/:id', modulePermission('patients'), async (req, res) => { try { const patientId = id(req.params.id); const patient = await knex('patients').where({ id: patientId }).first(); if (!patient) throw Object.assign(new Error('Paciente não encontrado.'), { status: 404 }); patient.insurances = await knex('patient_insurances as pi').join('insurance_providers as ip','ip.id','pi.insurance_provider_id').where('pi.patient_id',patientId).select('pi.*','ip.name as insurance_name'); patient.processes = await processQuery().where('gp.patient_id',patientId); res.json(patient) } catch (e) { handle(res, e) } })

function processQuery(deleted = false) { const q = knex('guide_processes as gp').join('patients as p','p.id','gp.patient_id').leftJoin('patient_insurances as pi','pi.id','gp.patient_insurance_id').leftJoin('insurance_providers as ip','ip.id','pi.insurance_provider_id').leftJoin('professionals as ph','ph.id','gp.physiotherapist_id').leftJoin('professionals as dr','dr.id','gp.requesting_doctor_id').leftJoin('physiotherapy_evaluations as ev','ev.guide_process_id','gp.id').select(knex.raw(`${require('../services/guideAuthorizationSql').partialSQL} AS partial_authorization`),'gp.*','ev.status as evaluation_status','p.full_name as patient_name','ip.name as insurance_name','ip.id as insurance_provider_id','pi.plan as insurance_plan','pi.card_number','pi.card_expiration','ph.full_name as physiotherapist_name','dr.full_name as doctor_name'); return deleted ? q.whereNotNull('gp.deleted_at') : q.whereNull('gp.deleted_at') }
router.get('/guide-processes/queue-counts', modulePermission('guide_processes'), async (_req, res) => {
  try { res.json(await queueCounts(knex, processQuery())) } catch (e) { handle(res, e) }
})
router.get('/guide-processes', modulePermission('guide_processes'), async (req, res) => { try {
  if (req.query.deleted !== undefined && !['true','false'].includes(String(req.query.deleted))) throw Object.assign(new Error('Filtro de lixeira inválido.'),{status:400});
  const deleted = req.query.deleted === 'true';
  const page = Math.max(1,Number(req.query.page)||1), pageSize = Math.min(100,Math.max(1,Number(req.query.pageSize)||20)); const q = processQuery(deleted)
  const filters = ['physiotherapist_id','requesting_doctor_id','document_status','treatment_status','priority']
  if (!deleted) filters.forEach((f) => { if (req.query[f] !== undefined && req.query[f] !== '') q.where(`gp.${f}`,req.query[f]) })
  if (!deleted && req.query.billing_status) q.whereRaw(`(${require('../services/guideBilling').billingSummarySQL}) = ?`,[String(req.query.billing_status)]);
  if (!deleted) applyQueueFilters(q, req.query);
  if (!deleted && req.query.insurance_provider_id) q.where('pi.insurance_provider_id',req.query.insurance_provider_id)
  if (clean(req.query.search)) q.where('p.full_name','like',`%${clean(req.query.search)}%`)
  if (!deleted) for (const [parameter, column, operator] of [['assessment_date_from','assessment_date','>='],['assessment_date_to','assessment_date','<='],['expected_start_date_from','expected_start_date','>='],['expected_start_date_to','expected_start_date','<=']]) if (req.query[parameter]) q.where(`gp.${column}`,operator,req.query[parameter])
  const countQuery = q.clone().clearSelect().clearOrder().countDistinct('gp.id as total').first()
  const sorts = { start_asc:[['expected_start_date','asc'],['priority','desc'],['created_at','asc']], start_desc:[['expected_start_date','desc']], assessment_desc:[['assessment_date','desc']], assessment_asc:[['assessment_date','asc']], priority_desc:[['priority','desc'],['expected_start_date','asc']], created_asc:[['created_at','asc']], created_desc:[['created_at','desc'],['id','desc']] }
  for (const [column,direction] of (sorts[req.query.sort] || sorts.created_desc)) q.orderBy(`gp.${column}`,direction)
  const data = await q.limit(pageSize).offset((page-1)*pageSize); const total = Number((await countQuery).total); res.json({ data, pagination: { page, pageSize, total, pages: Math.ceil(total/pageSize) } })
} catch (e) { handle(res, e) } })
router.post('/guide-processes', modulePermission('guide_processes','create'), async (req, res) => { const trx = await knex.transaction(); try {
  required(req.body,['patient_id']); if(req.body.billing_status && req.body.billing_status!=='NOT_READY') throw Object.assign(new Error('Use a aba Faturamento para registrar cobranças por guia.'),{status:422}); validateSessions(req.body)
  const stenci = req.body.stenci
  const patientId = id(req.body.patient_id)
  const patient_insurance_id = stenci?.insurance ? await syncInsurance(trx, stenci.insurance, patientId) : null
  const physiotherapist_id = stenci?.physiotherapist ? await syncProfessional(trx, stenci.physiotherapist, 'CREFITO') : null
  const requesting_doctor_id = stenci?.doctor ? await syncProfessional(trx, stenci.doctor, 'CRM') : null
  const data = { ...pick(req.body, processFields), patient_id: patientId, patient_insurance_id, physiotherapist_id, requesting_doctor_id, treatment_days: JSON.stringify(Array.isArray(req.body.treatment_days) ? req.body.treatment_days : []), created_by: req.user.id }
  const [processId] = await trx('guide_processes').insert(data); await trx('guide_processes').where({id:processId}).update({treatment_root_id:processId}); for (const procedure of (req.body.procedures || [])) { const procedureId=id(procedure.procedure_id), quantity=Number(procedure.requested_quantity); if(!Number.isInteger(quantity)||quantity<1) throw Object.assign(new Error('A quantidade dos procedimentos deve ser maior que zero.'),{status:422}); await trx('guide_process_procedures').insert({guide_process_id:processId,procedure_id:procedureId,requested_quantity:quantity}) } await history(trx,processId,req.user.id,'TREATMENT_CREATED',null,null,null,{treatmentDays:Array.isArray(req.body.treatment_days)?req.body.treatment_days:[]}); await trx.commit(); res.status(201).json(await processQuery().where('gp.id',processId).first())
} catch (e) { await trx.rollback(); handle(res,e) } })
router.get('/guide-processes/:id', modulePermission('guide_processes'), async (req,res) => { try { const processId=id(req.params.id); const process=await processQuery().select(knex.raw(`${require('../services/guideBilling').billingDueSQL} AS billing_due`)).where('gp.id',processId).first(); if(!process) throw Object.assign(new Error('Processo não encontrado.'),{status:404}); process.authorization_min_date=await require('../services/authorizationWorkflow').authorizationDateLimit(knex,processId); process.authorization_documents=await require('../services/authorizationDocuments').list(knex,processId); process.related_guides=await require('../services/guideContinuity').related(knex,process); process.documents=await documents(processId); process.authorizations=await require('../services/authorizationWorkflow').authorizationQuery(knex).where({guide_process_id:processId}).orderBy('id','desc'); process.procedures=await knex('guide_process_procedures as gpp').join('procedures as pr','pr.id','gpp.procedure_id').where('gpp.guide_process_id',processId).select('gpp.*','pr.code','pr.description','pr.type'); process.pendingItems=await knex('guide_process_pending_items').where({guide_process_id:processId}).orderBy('created_at','desc'); process.history=await knex('guide_process_history as h').leftJoin('users as u','u.id','h.user_id').leftJoin('people as pe','pe.id','u.person_id').where('h.guide_process_id',processId).select('h.*','pe.full_name as user_name').orderBy('h.created_at','desc').orderBy('h.id','desc'); res.json(process) } catch(e){handle(res,e)} })
router.put('/guide-processes/:id', modulePermission('guide_processes','edit'), async (req,res) => { const trx=await knex.transaction(); try { const processId=id(req.params.id), old=await trx('guide_processes').where({id:processId}).forUpdate().first(); if(!old) throw Object.assign(new Error('Processo não encontrado.'),{status:404}); const data=pick(req.body,processFields); if(data.billing_status!==undefined&&data.billing_status!==old.billing_status) throw Object.assign(new Error('Use a aba Faturamento para registrar cobranças por guia.'),{status:422}); if(data.patient_id!==undefined&&Number(data.patient_id)!==old.patient_id&&(old.continuation_of_id||await trx('guide_processes').where({continuation_of_id:old.id}).first()))throw Object.assign(new Error('O paciente da continuidade deve permanecer o mesmo do tratamento original.'),{status:409}); if(data.authorized_sessions!==undefined&&Number(data.authorized_sessions)!==Number(old.authorized_sessions)&&await require('../services/guideAuthorization').hasIndividual(trx,processId))throw Object.assign(new Error('Altere a quantidade na liberação da guia de fisioterapia.'),{status:409}); if(data.treatment_days) data.treatment_days=JSON.stringify(Array.isArray(req.body.treatment_days)?req.body.treatment_days:[]); treatmentStages.assertFieldsOpen(old,data); await treatmentStages.assertChangedStagesUnlocked(trx,old,data); validateSessions({...old,...data}); await trx('guide_processes').where({id:processId}).update(data); for(const field of Object.keys(data)) if(String(old[field]??'')!==String(data[field]??'')) await history(trx,processId,req.user.id,field.endsWith('_status')?'STATUS_CHANGED':'FIELD_CHANGED',field,old[field],data[field]); await trx.commit(); res.json(await processQuery().where('gp.id',processId).first()) } catch(e){await trx.rollback();handle(res,e)} })
router.delete('/guide-processes/:id', modulePermission('guide_processes','delete'), async (req,res) => { const trx=await knex.transaction(); try { const processId=id(req.params.id), process=await trx('guide_processes').where({id:processId}).forUpdate().first(); if(!process) throw Object.assign(new Error('Tratamento não encontrado.'),{status:404}); if(process.deleted_at){await trx.commit();return res.status(204).send()} const deletedAt=new Date().toISOString(); await trx('guide_processes').where({id:processId}).update({deleted_at:trx.fn.now()}); await history(trx,processId,req.user.id,'TREATMENT_ARCHIVED','deleted_at',null,deletedAt); await trx.commit(); res.status(204).send() } catch(e){await trx.rollback();handle(res,e)} })
router.post('/guide-processes/:id/restore', modulePermission('guide_processes','edit'), async (req,res) => { const trx=await knex.transaction(); try { const processId=id(req.params.id), process=await trx('guide_processes').where({id:processId}).forUpdate().first(); if(!process) throw Object.assign(new Error('Tratamento não encontrado.'),{status:404}); if(!process.deleted_at) throw Object.assign(new Error('Este tratamento não está na lixeira.'),{status:409}); await trx('guide_processes').where({id:processId}).update({deleted_at:null}); await history(trx,processId,req.user.id,'TREATMENT_RESTORED','deleted_at',process.deleted_at,null); await trx.commit(); res.status(200).json({id:processId,restored:true}) } catch(e){await trx.rollback();handle(res,e)} })

function validateSessions(data, authorizationType) {
  for (const field of ['requested_sessions','authorized_sessions','performed_sessions']) if (data[field] != null && (!Number.isInteger(Number(data[field])) || Number(data[field]) < 0)) throw Object.assign(new Error(`${field} deve ser um inteiro maior ou igual a zero.`), {status:422})
  if (authorizationType !== 'SESSION_TOKEN' && data.authorized_sessions != null && Number(data.performed_sessions || 0) > Number(data.authorized_sessions)) throw Object.assign(new Error('Sessões realizadas não podem ultrapassar as autorizadas.'), {status:422})
}

const processFields=['patient_id','patient_insurance_id','physiotherapist_id','requesting_doctor_id','assessment_date','expected_start_date','referral_date','medical_diagnosis','cid','requested_sessions','authorized_sessions','performed_sessions','priority','notes','preferred_period','treatment_days','external_source','external_reference','treatment_status','billing_status']
function pick(body, fields) { return Object.fromEntries(fields.filter((f)=>body[f]!==undefined).map((f)=>[f,clean(body[f]) === "" ? null : clean(body[f])])) }
function duplicate(e) { if (e.code === 'ER_DUP_ENTRY') { e.status=409; e.message='Já existe um registro com estes identificadores.' } }
async function history(db, processId, userId, action, field, oldValue, newValue, metadata) { await db('guide_process_history').insert({guide_process_id:processId,user_id:userId,action,field,old_value:oldValue==null?null:String(oldValue),new_value:newValue==null?null:String(newValue),metadata:metadata?JSON.stringify(metadata):null}) }
async function documents(processId, includeHistory=false) { const query=knex('guide_process_documents as d').leftJoin('users as u','u.id','d.uploaded_by').leftJoin('people as p','p.id','u.person_id').where('d.guide_process_id',processId).select('d.id','d.document_type','d.original_name','d.mime_type','d.file_size','d.source','d.document_role','d.document_version','d.is_usable','d.replaced_by_document_id','d.deleted_at','d.created_at','p.full_name as uploaded_by_name').orderBy('d.created_at','desc'); if(!includeHistory)query.whereNull('d.deleted_at'); return query }


for (const action of ['complete','reopen']) router.post('/guide-processes/:id/stages/:stage/'+action,
  (req,res,next) => modulePermission(req.params.stage === 'authorization' ? 'authorizations' : 'guide_processes','edit')(req,res,next),
  async (req,res) => {
    const trx=await knex.transaction();
    try {
      const stage=req.params.stage==='documents' ? 'central' : String(req.params.stage);
      if (!Object.hasOwn(treatmentStages.stages,stage)) throw Object.assign(new Error('Etapa inválida.'),{status:400});
      const processId=id(req.params.id), process=await trx('guide_processes').where({id:processId}).forUpdate().first();
      if(!process) throw Object.assign(new Error('Tratamento não encontrado.'),{status:404});
      treatmentStages.assertActive(process);
      await treatmentStages.assertStageUnlocked(trx,process,stage);
      const state=treatmentStages.state(process), closed=Boolean(state[stage]?.completed_at);
      if (closed !== (action==='complete')) {
        if(action==='complete') {
          if(['central','authorization','treatment'].includes(stage)) {
            await require('../services/centralRequirements').assertComplete(trx,processId);
          }
          if(stage==='evaluation_document' && !(await trx('guide_process_documents').where({guide_process_id:processId,document_type:'PHYSIOTHERAPY_EVALUATION'}).whereNull('deleted_at').first())) throw Object.assign(new Error('Gere a ficha de avaliação antes de finalizar esta etapa.'),{status:422});
          if(stage==='authorization' && !(await require('../services/guideAuthorization').canFinalize(trx,process))) throw Object.assign(new Error('Conclua a liberação e resolva as pendências antes de finalizar esta etapa.'),{status:422});
          state[stage]={completed_at:new Date().toISOString(),completed_by:req.user.id};
          if(stage==='central') state.documents=state.central;
        } else {
          await treatmentStages.assertCanReopenStage(trx,process,stage);
          delete state[stage];
          if(stage==='central') delete state.documents;
        }
        await trx('guide_processes').where({id:processId}).update({workflow_stages:JSON.stringify(state)});
        await history(trx,processId,req.user.id,action==='complete'?'STAGE_COMPLETED':'STAGE_REOPENED',null,null,null,{stage,label:treatmentStages.stages[stage]});
      }
      await trx.commit(); res.json({workflow_stages:state,stage,completed:action==='complete'});
    } catch(e) { await trx.rollback(); handle(res,e); }
  });

module.exports = { router, knex, history, handle, id, documents, validateSessions }
