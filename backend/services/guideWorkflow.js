const requiredDocuments = ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION']

const requiredForProcess = () => requiredDocuments

const documentTransition = (complete, currentAuthorizationStatus, continuation=false) => ({
  document_status: complete ? 'COMPLETE' : 'INCOMPLETE',
  authorization_status: complete
    ? (currentAuthorizationStatus === 'NOT_READY' ? 'READY' : currentAuthorizationStatus)
    : (continuation && currentAuthorizationStatus==='READY' ? 'READY' : (['NOT_READY','READY'].includes(currentAuthorizationStatus) ? 'NOT_READY' : currentAuthorizationStatus)),
})

async function syncDocumentStatus(trx, processId) {
  const process = await trx('guide_processes').where({id:processId}).first()
  const required = requiredForProcess(process)
  const present = await trx('guide_process_documents').where({guide_process_id:processId}).whereIn('document_type',required).whereNull('deleted_at').where(query=>query.where({document_role:'GENERATED'}).orWhere({is_usable:true})).distinct('document_type')
  const transition = documentTransition(present.length === required.length, process.authorization_status,Boolean(process.continuation_of_id))
  require('./treatmentStages').assertFieldsOpen(process, transition)
  await trx('guide_processes').where({id:processId}).update(transition)
  return transition
}

const isDocumentComplete = (documents,required=requiredDocuments) => required.every((type) => documents.some((document) =>
  document.document_type === type && !document.deleted_at && (document.document_role === 'GENERATED' || document.is_usable === true || document.is_usable === 1)))

module.exports = { documentTransition, isDocumentComplete, requiredDocuments, requiredForProcess, syncDocumentStatus }
