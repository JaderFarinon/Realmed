const procedureLabels = {CONSULTATION:'Consulta / avaliação',PHYSIOTHERAPY:'Sessão de fisioterapia',ELECTROSTIMULATION:'Eletroestimulação'};
const documentLabels = {CONSULTATION_GUIDE:'Guia de consulta / avaliação',PHYSIOTHERAPY_GUIDE:'Guia de fisioterapia',ELECTROSTIMULATION:'Guia de eletroestimulação'};
function missing(procedures, documents) {
  const workflow = require('./guideWorkflow');
  return [
    ...Object.entries(procedureLabels).filter(([type]) => !procedures.some(p => p.type === type && Number(p.requested_quantity) > 0)).map(([,label]) => 'Procedimento: '+label),
    ...Object.entries(documentLabels).filter(([type]) => !workflow.isDocumentComplete(documents,[type])).map(([,label]) => label),
  ];
}
async function assertComplete(db, processId) {
  const [procedures,documents] = await Promise.all([
    db('guide_process_procedures as crp').join('procedures as cr','cr.id','crp.procedure_id').where('crp.guide_process_id',processId).select('cr.type','crp.requested_quantity'),
    db('guide_process_documents').where({guide_process_id:processId}).whereNull('deleted_at'),
  ]);
  const pending = missing(procedures,documents);
  if (pending.length) throw Object.assign(new Error('Complete a Central de Guias antes de continuar. Falta: '+pending.join('; ')+'.'),{status:422,code:'CENTRAL_REQUIREMENTS_MISSING',missing:pending});
}
const proceduresSQL = `(SELECT COUNT(DISTINCT cr.type) FROM guide_process_procedures crp JOIN procedures cr ON cr.id=crp.procedure_id WHERE crp.guide_process_id=gp.id AND cr.type IN ('CONSULTATION','PHYSIOTHERAPY','ELECTROSTIMULATION') AND crp.requested_quantity>0)=3`;
module.exports={procedureLabels,documentLabels,missing,assertComplete,proceduresSQL};
