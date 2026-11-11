const { filterStage } = require('./guideDashboard');
const { anySQL } = require('./guideAuthorizationSql');

const queues = {
  AWAITING_EVALUATION: { workflow_queue: 'AWAITING_EVALUATION' },
  AWAITING_GUIDE_CENTER: { workflow_queue: 'AWAITING_GUIDE_CENTER' },
  READY: { authorization_status: 'READY' },
  'IN_PROGRESS,PENDING': { authorization_status: 'IN_PROGRESS,PENDING' },
  IN_APPEAL: { authorization_status: 'IN_APPEAL' },
  DENIED: { authorization_status: 'DENIED' },
  'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED': { authorization_status: 'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED' },
  NOT_READY: { authorization_status: 'NOT_READY' },
  PARTIAL: { process_stage: 'partial' },
  BILLING: { process_stage: 'billing' },
  ALL: {},
};

// The list and its counters must use exactly the same operational predicates.
function applyQueueFilters(query, filters) {
  if (filters.process_stage) filterStage(query, String(filters.process_stage));
  if (filters.authorization_status) {
    const states = String(filters.authorization_status).split(',').filter(Boolean);
    if (states.some(s => !['NOT_READY','READY','IN_PROGRESS','PENDING','AUTHORIZED','DENIED','SESSION_TOKEN','NOT_REQUIRED','IN_APPEAL'].includes(s)))
      throw Object.assign(new Error('Status de liberação inválido.'), { status: 422 });
    query.whereRaw(anySQL(states));
  }
  if (filters.workflow_queue) {
    if (!['AWAITING_EVALUATION','AWAITING_GUIDE_CENTER'].includes(filters.workflow_queue))
      throw Object.assign(new Error('Fila operacional inválida.'), { status: 422 });
    filterStage(query, filters.workflow_queue === 'AWAITING_EVALUATION' ? 'assessment' : 'preparation');
  }
  return query;
}

async function queueCounts(db, baseQuery) {
  // One request/SQL round trip, counting only; no patient rows are fetched for badges.
  const queries = Object.fromEntries(Object.entries(queues).map(([key, filters]) => [key,
    applyQueueFilters(baseQuery.clone().clearSelect().clearOrder(), filters).countDistinct('gp.id'),
  ]));
  const [counts] = await db.select(queries);
  return Object.fromEntries(Object.keys(queues).map(key => [key, Number(counts[key]) || 0]));
}
module.exports = { queues, applyQueueFilters, queueCounts };
