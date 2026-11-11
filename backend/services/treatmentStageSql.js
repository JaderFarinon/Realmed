const { prerequisites } = require('./treatmentStages');
const completedSQL = stage => {
  const key = stage === 'central' ? 'documents' : stage;
  if (!['reception','documents','authorization','treatment'].includes(key)) throw new Error('Etapa SQL inválida.');
  return `(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(gp.workflow_stages,'$.${key}.completed_at')),'null'),'') IS NOT NULL)`;
};
const evaluationCompleteSQL = `(gp.continuation_of_id IS NOT NULL OR COALESCE(ev.status,'')='COMPLETED')`;
function prerequisitesSQL(stage) {
  if (!Object.hasOwn(prerequisites,stage)) throw new Error('Etapa SQL inválida.');
  return `(${prerequisites[stage].map(key=>key==='evaluation'?evaluationCompleteSQL:completedSQL(key)).join(' AND ')})`;
}
module.exports = { completedSQL, evaluationCompleteSQL, prerequisitesSQL };
