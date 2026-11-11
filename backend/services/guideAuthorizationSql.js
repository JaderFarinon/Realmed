const types = [
  "CONSULTATION_GUIDE",
  "PHYSIOTHERAPY_GUIDE",
  "ELECTROSTIMULATION",
];
const released = ["AUTHORIZED", "SESSION_TOKEN", "NOT_REQUIRED"];
const evidenceSQL = (t) =>
  `(EXISTS(SELECT 1 FROM guide_process_documents ad WHERE ad.guide_process_id=gp.id AND ad.document_type='${t}' AND ad.deleted_at IS NULL) ${t === "ELECTROSTIMULATION" ? "OR EXISTS(SELECT 1 FROM guide_process_procedures ap JOIN procedures pr ON pr.id=ap.procedure_id WHERE ap.guide_process_id=gp.id AND pr.type='ELECTROSTIMULATION') OR EXISTS(SELECT 1 FROM guide_billing_items ab WHERE ab.guide_process_id=gp.id AND ab.document_type='ELECTROSTIMULATION' AND ab.applicable=1)" : ""})`;
const applicableSQL = () => '1=1';
const readySQL = (t) =>
  `EXISTS(SELECT 1 FROM guide_process_documents ad WHERE ad.guide_process_id=gp.id AND ad.document_type='${t}' AND ad.deleted_at IS NULL AND (ad.document_role='GENERATED' OR ad.is_usable=1))`;
const rawStatusSQL = t => `COALESCE((SELECT CASE WHEN ai.is_individual=0 THEN gp.authorization_status ELSE ai.status END FROM guide_authorization_items ai WHERE ai.guide_process_id=gp.id AND ai.document_type='${t}'),gp.authorization_status)`;
const statusSQL = (t) => {
  const raw = rawStatusSQL(t);
  return `(CASE WHEN ${raw} IN ('NOT_READY','READY') THEN CASE WHEN ${readySQL(t)} THEN 'READY' ELSE 'NOT_READY' END ELSE ${raw} END)`;
};
const anySQL = (statuses) =>
  `(${types.map((t) => `((${applicableSQL(t)}) AND ${(statuses.some(s => ['NOT_READY','READY'].includes(s)) ? statusSQL : rawStatusSQL)(t)} IN (${statuses.map((s) => "'" + s + "'").join(",")}))`).join(" OR ")})`;
const partialSQL = `(${anySQL(released)} AND (${types.map((t) => `((${applicableSQL(t)}) AND ${rawStatusSQL(t)} NOT IN ('AUTHORIZED','SESSION_TOKEN','NOT_REQUIRED'))`).join(" OR ")}))`;
const billAllowedSQL = (t) =>
  `((COALESCE((SELECT ai.is_individual FROM guide_authorization_items ai WHERE ai.guide_process_id=gp.id AND ai.document_type='${t}'),0)=0 AND gp.authorization_status NOT IN ('DENIED','IN_APPEAL')) OR ((${applicableSQL(t)}) AND ${rawStatusSQL(t)} ${t === "CONSULTATION_GUIDE" ? "NOT IN ('DENIED','IN_APPEAL')" : "IN ('AUTHORIZED','SESSION_TOKEN','NOT_REQUIRED')"}))`;
module.exports = {
  types,
  released,
  evidenceSQL,
  applicableSQL,
  statusSQL,
  anySQL,
  partialSQL,
  billAllowedSQL,
  readySQL,
};
