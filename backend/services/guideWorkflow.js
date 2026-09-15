const requiredDocuments = ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','PHYSIO_ASSESSMENT']

const documentTransition = (complete, currentAuthorizationStatus) => ({
  document_status: complete ? 'COMPLETE' : 'INCOMPLETE',
  authorization_status: complete
    ? (currentAuthorizationStatus === 'NOT_READY' ? 'READY' : currentAuthorizationStatus)
    : 'NOT_READY',
})

async function syncDocumentStatus(trx, processId) {
  const [present, process] = await Promise.all([
    trx('guide_process_documents').where({guide_process_id:processId}).whereIn('document_type',requiredDocuments).whereNull('deleted_at').distinct('document_type'),
    trx('guide_processes').where({id:processId}).first(),
  ])
  const transition = documentTransition(present.length === requiredDocuments.length, process.authorization_status)
  await trx('guide_processes').where({id:processId}).update(transition)
  return transition
}

module.exports = { documentTransition, requiredDocuments, syncDocumentStatus }
