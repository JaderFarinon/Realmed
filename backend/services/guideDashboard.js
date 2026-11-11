const {partialSQL}=require('./guideAuthorizationSql');
const { billingDueSQL, therapyCompleteSQL, requiredDocumentsSQL, billingWorkflowReadySQL } = require("./guideBilling");
const { completedSQL, evaluationCompleteSQL } = require('./treatmentStageSql');
const stages = [
  { key: "assessment", label: "Aguardando Avaliação" },
  { key: "preparation", label: "Aguardando Central de Guias" },
  { key: "ready", label: "Pendente de Liberação" },
  { key: "authorizing", label: "Encaminhado ao Convênio" },
  { key: "pending", label: "Pendência do Convênio" },
  { key: "denied", label: "Não Liberado" },
  { key: "appeals", label: "Em Recurso" },
  { key: "partial", label: "Liberação Parcial" },
  { key: "authorized", label: "Liberado" },
  { key: "treatment", label: "Em Tratamento" },
  { key: "billing", label: "Faturar" },
];
// Operational stages remain exclusive. Billing is an independent overlapping queue.
const stageCase = `CASE
  WHEN gp.billing_status IN ('DELIVERED','BILLED') THEN NULL
  WHEN NOT ${completedSQL('reception')} OR NOT ${evaluationCompleteSQL} THEN 'assessment'
  WHEN NOT ${completedSQL('central')} OR NOT ${requiredDocumentsSQL} THEN 'preparation'
  WHEN ${billingWorkflowReadySQL} AND ${therapyCompleteSQL} THEN CASE WHEN ${billingDueSQL} THEN 'billing' ELSE NULL END
  WHEN gp.treatment_status = 'IN_PROGRESS' THEN 'treatment'
  WHEN ${partialSQL} THEN 'partial'
  WHEN gp.authorization_status IN ('AUTHORIZED','SESSION_TOKEN','NOT_REQUIRED') THEN 'authorized'
  WHEN gp.authorization_status = 'IN_APPEAL' THEN 'appeals'
  WHEN gp.authorization_status = 'DENIED' THEN 'denied'
  WHEN gp.authorization_status = 'PENDING' THEN 'pending'
  WHEN gp.authorization_status = 'IN_PROGRESS' THEN 'authorizing'
  WHEN gp.continuation_of_id IS NULL AND COALESCE(ev.status,'') <> 'COMPLETED' THEN 'assessment'
  WHEN gp.authorization_status = 'READY' THEN 'ready'
  ELSE 'preparation' END`;
function filterStage(query, key) {
  if (!stages.some((stage) => stage.key === key))
    throw Object.assign(new Error("Estágio do processo inválido."), {
      status: 422,
    });
  return key === "billing"
    ? query.whereRaw(billingDueSQL)
    : query.whereRaw(`(${stageCase}) = ?`, [key]);
}
async function metrics(db) {
  const rows = await db("guide_processes as gp")
    .whereNull("gp.deleted_at")
    .leftJoin("physiotherapy_evaluations as ev", "ev.guide_process_id", "gp.id")
    .select(db.raw(`${stageCase} AS stage`))
    .countDistinct({ total: "gp.id" })
    .sum({ incomplete: db.raw("gp.document_status = 'INCOMPLETE'") })
    .groupByRaw(stageCase);
  const counts = Object.fromEntries(stages.map((stage) => [stage.key, 0]));
  let incomplete = 0;
  for (const row of rows)
    if (Object.hasOwn(counts, row.stage)) {
      counts[row.stage] = Number(row.total) || 0;
      incomplete += Number(row.incomplete) || 0;
    }
  const base = () =>
    db("guide_processes as gp").whereNull("gp.deleted_at").leftJoin(
      "physiotherapy_evaluations as ev",
      "ev.guide_process_id",
      "gp.id",
    );
  counts.billing =
    Number(
      (
        await base()
          .whereRaw(billingDueSQL)
          .countDistinct("gp.id as total")
          .first()
      ).total,
    ) || 0;
  const total =
    Number(
      (
        await base()
          .whereRaw(`((${stageCase}) IS NOT NULL OR ${billingDueSQL})`)
          .countDistinct("gp.id as total")
          .first()
      ).total,
    ) || 0;
  return {
    ...counts,
    incomplete,
    total,
    stages: stages.map((stage) => ({ ...stage, value: counts[stage.key] })),
  };
}
module.exports = { stages, stageCase, filterStage, metrics };
