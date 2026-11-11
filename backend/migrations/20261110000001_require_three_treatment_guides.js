// Reconcile current documentation only; preserve decisions, completed stages, files and billed history.
exports.config={transaction:false};
exports.up=async db=>{
 const [columns]=await db.raw("SHOW COLUMNS FROM guide_process_history LIKE 'user_id'");
 if(columns[0]?.Null==='NO')await db.raw('ALTER TABLE guide_process_history MODIFY user_id INT UNSIGNED NULL');
 let last=0;
 while(true){
  const next=await db.transaction(async trx=>{
   const rows=await trx('guide_processes').where('id','>',last).whereNull('deleted_at').whereNotIn('billing_status',['BILLED','DELIVERED']).orderBy('id').limit(100).forUpdate();
   for(const row of rows){
    const docs=await trx('guide_process_documents').where({guide_process_id:row.id}).whereNull('deleted_at');
    const status=require('../services/guideWorkflow').isDocumentComplete(docs)?'COMPLETE':'INCOMPLETE';
    if(row.document_status===status)continue;
    await trx('guide_processes').where({id:row.id}).update({document_status:status});
    await trx('guide_process_history').insert({guide_process_id:row.id,user_id:null,action:'DOCUMENT_REQUIREMENTS_UPDATED',field:'document_status',old_value:row.document_status,new_value:status,metadata:JSON.stringify({requiredDocuments:require('../services/guideWorkflow').requiredDocuments,requiredProcedures:['CONSULTATION','PHYSIOTHERAPY','ELECTROSTIMULATION']})});
   }
   return rows.length?rows.at(-1).id:null;
  });
  if(next===null)break;last=next;
 }
};
exports.down=async()=>{};
