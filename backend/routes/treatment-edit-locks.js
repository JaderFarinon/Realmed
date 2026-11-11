const express = require('express');
const auth = require('../middleware/auth');
const {modulePermission,modulePermissionAny} = require('../middleware/permission');
const locks = require('../services/treatmentEditLocks');

function createEditLocks(db, guardDb) {
  const router = express.Router();
  const editor = req => String(req.headers['x-realmed-editor'] || '');
  async function status(req, row) {
    if (!locks.active(row)) return {locked:false,owned:false};
    const person = await db('users as u').leftJoin('people as p','p.id','u.person_id').where('u.id',row.owner_id).select('p.full_name').first();
    return {locked:true,owned:locks.owned(row,req.user.id,editor(req)),owner:person?.full_name || 'Outro usuário',expiresAt:Number(row.expires_at)};
  }
  const path='/guide-processes/:id/edit-lock/:stage';
  router.all(path, auth, (req,res,next) => {
    if (!/^\d+$/.test(req.params.id) || !locks.STAGES.includes(req.params.stage)) return res.status(400).json({error:'Aba inválida.'});
    if(req.params.stage==='documents') req.params.stage='central';
    next();
  });
  router.get(path,modulePermission('guide_processes'),async(req,res,next)=>{
    try { res.json(await status(req,await guardDb('treatment_edit_locks').where({guide_process_id:Number(req.params.id),stage:req.params.stage==='documents'?'central':req.params.stage}).first())); } catch(e){next(e)}
  });
  function reservationPermission(method,req,res,next) {
    if(method==='delete') return modulePermission('guide_processes')(req,res,next);
    if(['central','documents'].includes(req.params.stage)) return modulePermissionAny([['guide_processes','edit'],['guide_processes','delete'],['guide_processes','create']])(req,res,next);
    return modulePermission(req.params.stage==='billing'?'guide_billing':req.params.stage==='authorization'?'authorizations':'guide_processes','edit')(req,res,next);
  }
  for (const method of ['post','delete']) router[method](path,(req,res,next)=>reservationPermission(method,req,res,next),async(req,res,next)=>{
    let trx;
    try {
      if (!/^[a-zA-Z0-9-]{20,64}$/.test(editor(req))) return res.status(400).json({error:'Identificador de edição inválido.'});
      const id=Number(req.params.id), stage=req.params.stage==='documents'?'central':req.params.stage;
      const process=await db('guide_processes').where({id}).first();
      if (!process) return res.status(404).json({error:'Tratamento não encontrado.'});
      if(method==='post') await require('../services/treatmentStages').assertStageUnlocked(db,process,stage);
      trx=await guardDb.transaction();
      const row=await locks.lockedRow(trx,id,stage);
      if (method==='post') {
        locks.assertAvailable(row,req.user.id,editor(req));
        await trx('treatment_edit_locks').where({guide_process_id:id,stage}).update({owner_id:req.user.id,editor_id:editor(req),expires_at:Date.now()+locks.TTL});
      } else if (locks.owned(row,req.user.id,editor(req))) {
        await trx('treatment_edit_locks').where({guide_process_id:id,stage}).update({expires_at:0});
      }
      const result=await trx('treatment_edit_locks').where({guide_process_id:id,stage}).first();
      await trx.commit(); trx=null;
      res.json(await status(req,result));
    } catch(e) { if(trx) await trx.rollback(); if(e.status) return res.status(e.status).json({error:e.message,code:e.code}); next(e); }
  });
  function guard(req,res,next) {
    if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
    let target=locks.mutationTarget(req.path,req.method,req.body);
    const doc=req.path.match(/^\/api\/(documents|authorizations)\/(\d+)/);
    if (!target && !doc) return next();
    auth(req,res,async()=>{
      let trx;
      try {
        if(doc) {
          const row=await db(doc[1]==='documents'?'guide_process_documents':'guide_authorizations').where({id:Number(doc[2])}).first();
          if(!row) return next();
          target={id:row.guide_process_id,stages:[doc[1]==='documents'?'central':'authorization']};
        }
        trx=await guardDb.transaction();
        for(const stage of [...new Set(target.stages)].sort()) {
          const row=await locks.lockedRow(trx,target.id,stage);
          if (stage==='central' && /^\/api\/guide-processes\/\d+\/evaluation(?:\/|$)/.test(req.path)) {
            req.preserveEvaluationCentral = locks.active(row) && !locks.owned(row,req.user.id,editor(req));
            continue;
          }
          locks.assertAvailable(row,req.user.id,editor(req));
        }
        // Hold the lease rows until the actual route has committed and responded.
        // A separate connection pool avoids starving the operational transactions.
        let finished=false;
        const release=()=>{if(!finished){finished=true;void trx.commit().catch(()=>{});}};
        res.once('finish',release);
        const end=res.end;
        res.end=function(...args){try{return end.apply(this,args)}finally{release()}};
        next();
      } catch(e) { if(trx) await trx.rollback(); if(e.status) return res.status(e.status).json({error:e.message,code:e.code}); next(e); }
    });
  }
  return {router,guard};
}
module.exports={createEditLocks};
