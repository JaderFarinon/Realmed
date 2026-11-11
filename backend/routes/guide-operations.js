const {lockOpen} = require('../services/treatmentStages')
const {authorizationNumber,authorizationDateLimit,validateAuthorizationDates,authorizationQuery} = require('../services/authorizationWorkflow')
const express = require('express')
const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const auth = require('../middleware/auth')
const { modulePermission } = require('../middleware/permission')
const { knex, history, handle, id, documents, validateSessions } = require('./guide-center')
const { requiredDocuments, syncDocumentStatus } = require('../services/guideWorkflow')

const router = express.Router()
const storageRoot = path.resolve(__dirname, '../../storage/documents')
const generatedRoot = path.resolve(__dirname, '../../storage/generated')
const types = ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','PHYSIO_ASSESSMENT','ELECTROSTIMULATION','INSURANCE_CARD','OTHER']
const mimeExtensions = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' }
const hasValidSignature = (buffer, mime) => mime === 'application/pdf'
  ? buffer.subarray(0, 5).toString() === '%PDF-'
  : mime === 'image/png'
    ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9
router.use(auth)
router.post('/guide-processes/:id/continuities',modulePermission('authorizations','edit'),async(req,res)=>{try{res.status(201).json(await knex.transaction(trx=>require('../services/guideContinuity').create(trx,id(req.params.id),req.user.id,req.body)))}catch(e){if(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK'].includes(e.code)){e=Object.assign(new Error('Outra continuidade já foi criada ou está em processamento. Atualize o tratamento.'),{status:409})}else if(!e.status){console.error('[Continuidade] Falha na transação',{code:e.code||'UNKNOWN'});e=Object.assign(new Error('Não foi possível criar a continuidade. Tente novamente.'),{status:500})}handle(res,e)}});
router.get('/guide-processes/:id/authorization-guides',modulePermission('authorizations'),async(req,res)=>{try{const p=await knex('guide_processes').where({id:id(req.params.id)}).first();if(!p)return res.status(404).json({error:'Tratamento não encontrado.'});const items=await require('../services/guideAuthorization').list(knex,p);res.set('Cache-Control','no-store').json({items,partial:require('../services/guideAuthorization').partial(items)});}catch(e){handle(res,e)}});
router.post('/guide-processes/:id/authorization/release-together',modulePermission('authorizations','edit'),async(req,res)=>{try{res.json(await knex.transaction(trx=>require('../services/guideAuthorization').releaseTogether(trx,id(req.params.id),req.user.id,req.body)))}catch(e){handle(res,e)}});
router.post('/guide-processes/:id/authorization/status-together',modulePermission('authorizations','edit'),async(req,res)=>{try{if(!req.body.status)return res.status(422).json({error:'Selecione o status das guias.'});res.json(await knex.transaction(trx=>require('../services/guideAuthorization').releaseTogether(trx,id(req.params.id),req.user.id,req.body,req.body.status)))}catch(e){handle(res,e)}});
router.post('/guide-processes/:id/authorization/status',modulePermission('authorizations','edit'),async(req,res)=>{
  try {
    const result=await knex.transaction(trx=>req.body.document_type?require('../services/guideAuthorization').change(trx,id(req.params.id),req.user.id,req.body):require('../services/authorizationWorkflow').changeStatus(trx,id(req.params.id),req.user.id,req.body));
    res.json(result);
  } catch(e) { handle(res,e); }
});

router.post('/guide-processes/:id/authorization-documents', modulePermission('authorizations','edit'), express.raw({type:'application/pdf',limit:'10mb'}), async(req,res)=>{
  let trx, absolute;
  try {
    const processId=id(req.params.id);
    let originalName;
    try { originalName=decodeURIComponent(String(req.headers['x-file-name']||'documento.pdf')); }
    catch { throw Object.assign(new Error('Nome do arquivo inválido.'),{status:400}); }
    originalName=path.posix.basename(originalName.replace(/\\/g,'/')).trim();
    if (!originalName || originalName.length>255 || /[\x00-\x1f\x7f]/.test(originalName) || !/\.pdf$/i.test(originalName) || !Buffer.isBuffer(req.body) || !req.body.length || !hasValidSignature(req.body,'application/pdf'))
      throw Object.assign(new Error('Envie um arquivo PDF válido de até 10 MB.'),{status:400});
    try { await require('pdf-lib').PDFDocument.load(req.body); }
    catch { throw Object.assign(new Error('O PDF está inválido ou protegido por senha. Envie um PDF que possa ser aberto.'),{status:400}); }
    trx=await knex.transaction();
    await lockOpen(trx,processId,'authorization');
    await fs.mkdir(storageRoot,{recursive:true});
    const internal='authorization-'+crypto.randomUUID()+'.pdf';
    absolute=path.join(storageRoot,internal);
    await fs.writeFile(absolute,req.body,{flag:'wx'});
    const [documentId]=await trx('guide_authorization_documents').insert({guide_process_id:processId,file_path:internal,original_name:originalName,mime_type:'application/pdf',file_size:req.body.length,uploaded_by:req.user.id});
    await history(trx,processId,req.user.id,'AUTHORIZATION_DOCUMENT_ATTACHED',null,null,null,{documentId,originalName});
    const document=(await require('../services/authorizationDocuments').list(trx,processId)).find(d=>d.id===documentId);
    await trx.commit();
    res.status(201).json(document);
  } catch(e) { if(trx) await trx.rollback(); if(absolute) await fs.unlink(absolute).catch(()=>{}); handle(res,e); }
}, (error,req,res,next)=>{
  if(error?.type==='entity.too.large') return res.status(413).json({error:'O PDF deve ter no máximo 10 MB.'});
  next(error);
});
router.get('/guide-processes/:id/authorization-documents/:documentId/download',modulePermission('authorizations'),async(req,res)=>{
  try {
    const doc=await knex('guide_authorization_documents').where({id:id(req.params.documentId),guide_process_id:id(req.params.id)}).first();
    if(!doc) throw Object.assign(new Error('Documento da liberação não encontrado.'),{status:404});
    const absolute=documentPath({...doc,source:'UPLOADED'});
    await fs.access(absolute);
    res.type('application/pdf');
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('Content-Disposition',`${req.query.download==='1'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`);
    res.sendFile(absolute);
  } catch(e) { handle(res,e); }
});

router.post('/guide-processes/:id/documents', modulePermission('guide_processes','edit'), express.raw({type:['application/pdf','image/jpeg','image/png'],limit:'10mb'}), async (req,res) => {
  const trx=await knex.transaction(); let absolute
  try {
    const processId=id(req.params.id), documentType=String(req.query.documentType||''), mime=String(req.headers['content-type']||'').split(';')[0], originalName=decodeURIComponent(String(req.headers['x-file-name']||'document'))
    if(!types.includes(documentType) || !mimeExtensions[mime] || !Buffer.isBuffer(req.body) || !req.body.length || !hasValidSignature(req.body,mime)) throw Object.assign(new Error('Envie PDF, JPG ou PNG válido e informe o tipo do documento.'),{status:400})
    if(!originalName.toLowerCase().endsWith(mimeExtensions[mime]) && !(mime==='image/jpeg' && originalName.toLowerCase().endsWith('.jpeg'))) throw Object.assign(new Error('A extensão do arquivo não corresponde ao MIME type.'),{status:400})
    await lockOpen(trx,processId,'documents');
    await fs.mkdir(storageRoot,{recursive:true}); const internal=`${crypto.randomUUID()}${mimeExtensions[mime]}`; absolute=path.join(storageRoot,internal); await fs.writeFile(absolute,req.body,{flag:'wx'})
    const previous=documentType==='OTHER'?null:await trx('guide_process_documents').where({guide_process_id:processId,document_type:documentType,document_role:'RECEIVED'}).whereNull('deleted_at').first()
    const usable=req.query.isUsable === 'true' ? true : req.query.isUsable === 'false' ? false : (documentType === 'PHYSIO_ASSESSMENT' ? true : null)
    const [documentId]=await trx('guide_process_documents').insert({guide_process_id:processId,document_type:documentType,file_path:internal,original_name:path.basename(originalName),mime_type:mime,file_size:req.body.length,source:'UPLOADED',document_role:'RECEIVED',is_usable:usable,uploaded_by:req.user.id})
    if(previous) await trx('guide_process_documents').where({id:previous.id}).update({deleted_at:trx.fn.now(),replaced_by_document_id:documentId})
    await syncDocumentStatus(trx,processId)
    await history(trx,processId,req.user.id,'DOCUMENT_RECEIVED','document_status',null,documentType,{documentId,originalName:path.basename(originalName),isUsable:usable,replacedDocumentId:previous?.id})
    await trx.commit(); res.status(201).json((await documents(processId)).find((d)=>d.id===documentId))
  } catch(e){await trx.rollback();if(absolute) await fs.unlink(absolute).catch(()=>{});handle(res,e)}
})
router.patch('/documents/:id/usability', modulePermission('guide_processes','edit'), async(req,res)=>{const trx=await knex.transaction();try{const documentId=id(req.params.id),doc=await trx('guide_process_documents').where({id:documentId,document_role:'RECEIVED'}).whereNull('deleted_at').first();if(!doc)throw Object.assign(new Error('Documento recebido não encontrado.'),{status:404});await lockOpen(trx,doc.guide_process_id,doc.document_type==='PHYSIOTHERAPY_EVALUATION'?'evaluation_document':'documents');if(typeof req.body.is_usable!=='boolean')throw Object.assign(new Error('Informe se o documento está adequado.'),{status:400});await trx('guide_process_documents').where({id:documentId}).update({is_usable:req.body.is_usable});await syncDocumentStatus(trx,doc.guide_process_id);await history(trx,doc.guide_process_id,req.user.id,req.body.is_usable?'DOCUMENT_MARKED_USABLE':'DOCUMENT_MARKED_NEEDS_ADJUSTMENT','is_usable',doc.is_usable,req.body.is_usable,{documentId});await trx.commit();res.json({...doc,is_usable:req.body.is_usable})}catch(e){await trx.rollback();handle(res,e)}})
function documentPath(doc) {
  const root = doc.source === 'GENERATED' ? generatedRoot : storageRoot
  const stored = doc.source === 'GENERATED' && String(doc.file_path).startsWith('generated/') ? String(doc.file_path).slice(10) : String(doc.file_path)
  if (!stored || path.isAbsolute(stored) || path.basename(stored) !== stored) throw Object.assign(new Error('Documento inválido.'), { status: 400 })
  return path.join(root, stored)
}
router.get('/documents/:id/download', modulePermission('guide_processes'), async(req,res)=>{try{const documentId=id(req.params.id);const doc=await knex('guide_process_documents').where({id:documentId}).whereNull('deleted_at').first();if(!doc)throw Object.assign(new Error('Documento não encontrado.'),{status:404});const absolute=documentPath(doc);await fs.access(absolute);res.type(doc.mime_type);res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`);res.sendFile(absolute)}catch(e){handle(res,e)}})
router.delete('/documents/:id', modulePermission('guide_processes','delete'), async(req,res)=>{const trx=await knex.transaction();try{const documentId=id(req.params.id),doc=await trx('guide_process_documents').where({id:documentId}).whereNull('deleted_at').first();if(!doc)throw Object.assign(new Error('Documento não encontrado.'),{status:404});await lockOpen(trx,doc.guide_process_id,doc.document_type==='PHYSIOTHERAPY_EVALUATION'?'evaluation_document':'documents');await trx('guide_process_documents').where({id:documentId}).update({deleted_at:trx.fn.now()});await syncDocumentStatus(trx,doc.guide_process_id);await history(trx,doc.guide_process_id,req.user.id,'DOCUMENT_REMOVED','document_status',doc.document_type,null,{documentId});await trx.commit();res.status(204).send()}catch(e){await trx.rollback();handle(res,e)}})

router.post('/guide-processes/:id/authorization/start',modulePermission('authorizations','edit'),async(req,res)=>{const trx=await knex.transaction();try{const processId=id(req.params.id),process=await lockOpen(trx,processId,'authorization');await require('../services/guideAuthorization').assertLegacy(trx,processId);if(!process)throw Object.assign(new Error('Tratamento não encontrado.'),{status:404});const evaluation=await trx('physiotherapy_evaluations').where({guide_process_id:processId,status:'COMPLETED'}).first();const missing=[];if(!process.patient_insurance_id)missing.push('convênio e plano');if(!process.requesting_doctor_id)missing.push('médico solicitante');if(!process.physiotherapist_id)missing.push('fisioterapeuta responsável');if(!process.requested_sessions)missing.push('quantidade de sessões');if(process.document_status!=='COMPLETE')missing.push('documentação obrigatória');if(!evaluation&&!process.continuation_of_id)missing.push('avaliação fisioterapêutica concluída');if(process.authorization_status!=='READY')missing.push('tratamento pendente');if(missing.length)throw Object.assign(new Error(`Complete os dados obrigatórios e a documentação antes de encaminhar ao convênio. Pendências: ${missing.join(', ')}.`),{status:422,missing});await trx('guide_processes').where({id:processId}).update({authorization_status:'IN_PROGRESS'});await history(trx,processId,req.user.id,'SENT_TO_INSURANCE','authorization_status','READY','IN_PROGRESS');await trx.commit();res.json({authorization_status:'IN_PROGRESS'})}catch(e){await trx.rollback();handle(res,e)}})

router.post('/guide-processes/:id/authorizations',modulePermission('authorizations','create'),async(req,res)=>{const trx=await knex.transaction();try{const processId=id(req.params.id);await lockOpen(trx,processId,'authorization');await require('../services/guideAuthorization').assertLegacy(trx,processId);const process=await trx('guide_processes as gp').join('patient_insurances as pi','pi.id','gp.patient_insurance_id').join('insurance_providers as ip','ip.id','pi.insurance_provider_id').where('gp.id',processId).select('gp.*','ip.authorization_type').first();if(!process)throw Object.assign(new Error('Processo não encontrado.'),{status:404});const finalStatuses=['AUTHORIZED','DENIED','SESSION_TOKEN','NOT_REQUIRED'];if(process.authorization_status!=='IN_PROGRESS'||!finalStatuses.includes(req.body.status))throw Object.assign(new Error('A liberação deve estar em andamento antes de ser concluída.'),{status:409});validateSessions(req.body, process.authorization_type);const validatedDates=validateAuthorizationDates(req.body,await authorizationDateLimit(trx,processId));const data={guide_process_id:processId,authorization_number:authorizationNumber(req.body.authorization_number),...validatedDates,requested_sessions:Number(req.body.requested_sessions||process.requested_sessions),authorized_sessions:req.body.authorized_sessions??null,status:req.body.status,notes:req.body.notes||null,created_by:req.user.id,updated_by:req.user.id};const [authorizationId]=await trx('guide_authorizations').insert(data);await trx('guide_processes').where({id:processId}).update({authorization_status:data.status,authorized_sessions:data.authorized_sessions});await history(trx,processId,req.user.id,data.status==='DENIED'?'DENIED':'AUTHORIZED','authorization_status',process.authorization_status,data.status,{authorizationId});await trx.commit();res.status(201).json(await authorizationQuery(knex).where({id:authorizationId}).first())}catch(e){await trx.rollback();handle(res,e)}})
router.put('/authorizations/:id',modulePermission('authorizations','edit'),async(req,res)=>{const trx=await knex.transaction();try{const authorizationId=id(req.params.id),old=await trx('guide_authorizations').where({id:authorizationId}).first();if(!old)throw Object.assign(new Error('Autorização não encontrada.'),{status:404});await lockOpen(trx,old.guide_process_id,'authorization');await require('../services/guideAuthorization').assertLegacy(trx,old.guide_process_id);const provider=await trx('guide_processes as gp').join('patient_insurances as pi','pi.id','gp.patient_insurance_id').join('insurance_providers as ip','ip.id','pi.insurance_provider_id').where('gp.id',old.guide_process_id).select('gp.authorization_status','ip.authorization_type').first();if(req.body.status&&!['AUTHORIZED','DENIED','SESSION_TOKEN','NOT_REQUIRED'].includes(req.body.status))throw Object.assign(new Error('Status final de liberação inválido.'),{status:422});validateSessions({...old,...req.body},provider?.authorization_type);const data={...req.body,updated_by:req.user.id};delete data.id;delete data.guide_process_id;delete data.created_by;delete data.created_at;await trx('guide_authorizations').where({id:authorizationId}).update(data);await trx('guide_processes').where({id:old.guide_process_id}).update({authorization_status:data.status||old.status,authorized_sessions:data.authorized_sessions??old.authorized_sessions});await history(trx,old.guide_process_id,req.user.id,'AUTHORIZATION_UPDATED','authorization_status',provider.authorization_status,data.status||old.status,{authorizationId});await trx.commit();res.json(await knex('guide_authorizations').where({id:authorizationId}).first())}catch(e){await trx.rollback();handle(res,e)}})
router.post('/guide-processes/:id/pending-items',modulePermission('authorizations','edit'),async(req,res)=>{const trx=await knex.transaction();try{if(!String(req.body.description||'').trim())throw Object.assign(new Error('Descrição é obrigatória.'),{status:400});const processId=id(req.params.id),process=await lockOpen(trx,processId,'authorization');await require('../services/guideAuthorization').assertLegacy(trx,processId);if(!process||!['IN_PROGRESS','PENDING'].includes(process.authorization_status))throw Object.assign(new Error('Encaminhe o tratamento antes de registrar uma pendência.'),{status:409});const [itemId]=await trx('guide_process_pending_items').insert({guide_process_id:processId,description:req.body.description.trim(),notes:req.body.notes||null,created_by:req.user.id});await trx('guide_processes').where({id:processId}).update({authorization_status:'PENDING'});await history(trx,processId,req.user.id,'AUTHORIZATION_PENDING','authorization_status',process.authorization_status,'PENDING',{itemId});await trx.commit();res.status(201).json(await knex('guide_process_pending_items').where({id:itemId}).first())}catch(e){await trx.rollback();handle(res,e)}})
router.patch('/pending-items/:id/resolve',modulePermission('authorizations','edit'),async(req,res)=>{const trx=await knex.transaction();try{const itemId=id(req.params.id),item=await trx('guide_process_pending_items').where({id:itemId}).first();if(!item)throw Object.assign(new Error('Pendência não encontrada.'),{status:404});await lockOpen(trx,item.guide_process_id,'authorization');await require('../services/guideAuthorization').assertLegacy(trx,item.guide_process_id);await trx('guide_process_pending_items').where({id:itemId}).update({status:'RESOLVED',resolved_by:req.user.id,resolved_at:trx.fn.now(),notes:req.body.notes??item.notes});const open=await trx('guide_process_pending_items').where({guide_process_id:item.guide_process_id,status:'OPEN'}).count('* as total').first();if(Number(open.total)===0)await trx('guide_processes').where({id:item.guide_process_id,authorization_status:'PENDING'}).update({authorization_status:'IN_PROGRESS'});await history(trx,item.guide_process_id,req.user.id,'PENDING_ITEM_RESOLVED','authorization_status','PENDING',Number(open.total)===0?'IN_PROGRESS':'PENDING',{itemId});await trx.commit();res.json(await knex('guide_process_pending_items').where({id:itemId}).first())}catch(e){await trx.rollback();handle(res,e)}})
router.get('/guide-processes/:id/history',modulePermission('guide_processes'),async(req,res)=>{try{res.json(await knex('guide_process_history').where({guide_process_id:id(req.params.id)}).orderBy('created_at','desc'))}catch(e){handle(res,e)}})
router.get('/dashboard',modulePermission('guide_processes'),async(_req,res)=>{try{res.json(await require('../services/guideDashboard').metrics(knex))}catch(e){handle(res,e)}})

module.exports=router
module.exports.documentPath = documentPath
