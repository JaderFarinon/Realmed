const express = require('express')
const auth = require('../middleware/auth')
const { modulePermission } = require('../middleware/permission')
const { knex, history, handle, id } = require('./guide-center')

const router = express.Router()
const fields = ['chief_complaint','current_history','functional_limitations','physical_exam','pain_score','pain_classification','pain_location','severity','severity_justification','care_risk','individual_monitoring','precautions','specific_care_notes','therapeutic_goals','conducts','conduct_description','reevaluation_date','reevaluation_notes','regions','physiotherapist_id','evaluation_date']
const jsonFields = new Set(['precautions', 'conducts', 'regions'])
const enums = { severity: ['MILD','MODERATE','SEVERE'], care_risk: ['LOW','MODERATE','HIGH'] }
router.use(auth)

const normalize = (body) => Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => {
  let value = body[key]
  if (jsonFields.has(key)) value = JSON.stringify(Array.isArray(value) ? value : [])
  if (typeof value === 'string') value = value.trim() || null
  return [key, value]
}))
const serialize = (row) => {
  if (!row) return null
  for (const key of jsonFields) if (typeof row[key] === 'string') { try { row[key] = JSON.parse(row[key]) } catch { row[key] = [] } }
  return row
}
function validate(data, completing = false) {
  if (data.pain_score != null && (!Number.isInteger(Number(data.pain_score)) || Number(data.pain_score) < 0 || Number(data.pain_score) > 10)) throw Object.assign(new Error('A dor EVA deve ser um número inteiro entre 0 e 10.'), { status: 422 })
  for (const [key, values] of Object.entries(enums)) if (data[key] != null && !values.includes(data[key])) throw Object.assign(new Error(`Valor inválido para ${key}.`), { status: 422 })
  if (completing) {
    const labels = { chief_complaint:'queixa principal', physical_exam:'exame físico', severity:'gravidade', care_risk:'risco assistencial', therapeutic_goals:'objetivos terapêuticos', conducts:'conduta', physiotherapist_id:'fisioterapeuta', evaluation_date:'data da avaliação' }
    const missing = Object.entries(labels).filter(([key]) => data[key] == null || data[key] === '' || (key === 'conducts' && (!Array.isArray(data[key]) || !data[key].length))).map(([,label]) => label)
    if (missing.length) throw Object.assign(new Error(`Complete a avaliação antes de concluir: ${missing.join(', ')}.`), { status: 422, missing })
  }
}
async function processExists(processId) { return Boolean(await knex('guide_processes').where({ id: processId }).first()) }
router.get('/guide-processes/:id/evaluation', modulePermission('guide_processes'), async (req,res) => { try { const processId=id(req.params.id); if(!await processExists(processId)) throw Object.assign(new Error('Tratamento não encontrado.'),{status:404}); res.json(serialize(await knex('physiotherapy_evaluations').where({guide_process_id:processId}).first())) } catch(e){handle(res,e)} })
async function save(req,res) { const trx=await knex.transaction(); try { const processId=id(req.params.id); const process=await trx('guide_processes').where({id:processId}).first(); if(!process) throw Object.assign(new Error('Tratamento não encontrado.'),{status:404}); const old=await trx('physiotherapy_evaluations').where({guide_process_id:processId}).first(); if(old?.status==='COMPLETED') throw Object.assign(new Error('Reabra a avaliação concluída antes de editar.'),{status:409}); const data=normalize(req.body); validate({...old,...req.body,...data}); data.status='IN_PROGRESS'; data.updated_by=req.user.id; if(old) await trx('physiotherapy_evaluations').where({id:old.id}).update(data); else await trx('physiotherapy_evaluations').insert({...data,guide_process_id:processId,created_by:req.user.id}); if(req.body.sync_schedule===true && Array.isArray(req.body.treatment_days)) await trx('guide_processes').where({id:processId}).update({treatment_days:JSON.stringify(req.body.treatment_days)}); await history(trx,processId,req.user.id,'EVALUATION_DRAFT_SAVED',null,null,'IN_PROGRESS'); await trx.commit(); res.status(old?200:201).json(serialize(await knex('physiotherapy_evaluations').where({guide_process_id:processId}).first())) } catch(e){await trx.rollback();handle(res,e)} }
router.post('/guide-processes/:id/evaluation', modulePermission('guide_processes','edit'), save)
router.put('/guide-processes/:id/evaluation', modulePermission('guide_processes','edit'), save)
router.post('/guide-processes/:id/evaluation/complete', modulePermission('guide_processes','edit'), async(req,res)=>{const trx=await knex.transaction();try{const processId=id(req.params.id),row=await trx('physiotherapy_evaluations').where({guide_process_id:processId}).first();if(!row)throw Object.assign(new Error('Salve um rascunho antes de concluir.'),{status:409});const parsed=serialize({...row});validate(parsed,true);await trx('physiotherapy_evaluations').where({id:row.id}).update({status:'COMPLETED',updated_by:req.user.id});await history(trx,processId,req.user.id,'EVALUATION_COMPLETED','status','IN_PROGRESS','COMPLETED');await trx.commit();res.json(serialize(await knex('physiotherapy_evaluations').where({id:row.id}).first()))}catch(e){await trx.rollback();if(e.missing)return res.status(e.status).json({error:e.message,missing:e.missing});handle(res,e)}})

module.exports = router
