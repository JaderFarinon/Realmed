// Data reconciliation only: preserve all files, clinical evaluations and stage locks.
exports.config = {transaction:false};
exports.up = async (db) => {
  // System reconciliation has no human actor; preserve FK/type and allow system audit rows.
  const [columns] = await db.raw("SHOW COLUMNS FROM guide_process_history LIKE 'user_id'");
  if (columns[0]?.Null === 'NO')
    await db.raw('ALTER TABLE guide_process_history MODIFY user_id INT UNSIGNED NULL');
  let lastId = 0;
  while (true) {
    const next = await db.transaction(async (trx) => {
      const rows = await trx('guide_processes').where('id', '>', lastId).orderBy('id').limit(100).forUpdate();
      for (const row of rows) {
        const present = await trx('guide_process_documents').where({guide_process_id:row.id})
          .whereIn('document_type',['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE']).whereNull('deleted_at')
          .where(q=>q.where({document_role:'GENERATED'}).orWhere({is_usable:true})).distinct('document_type');
        const complete = present.length === 2;
        const document_status = complete ? 'COMPLETE' : 'INCOMPLETE';
        const authorization_status = complete
          ? (row.authorization_status === 'NOT_READY' ? 'READY' : row.authorization_status)
          : (row.authorization_status === 'READY' ? 'NOT_READY' : row.authorization_status);
        if (row.document_status === document_status && row.authorization_status === authorization_status) continue;
        await trx('guide_processes').where({id:row.id}).update({document_status,authorization_status});
        await trx('guide_process_history').insert({guide_process_id:row.id,user_id:null,action:'DOCUMENT_REQUIREMENTS_UPDATED',field:'document_status',old_value:row.document_status,new_value:document_status,metadata:JSON.stringify({requiredDocuments:['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE'],previousAuthorizationStatus:row.authorization_status,authorizationStatus:authorization_status})});
      }
      return rows.length ? rows[rows.length-1].id : null;
    });
    if (next == null) break;
    lastId = next;
  }
};
// Reverting code must not delete documents or recreate obsolete requirements.
exports.down = async () => {};
