const { billAllowedSQL } = require("./guideAuthorizationSql");
const { prerequisitesSQL } = require('./treatmentStageSql');
const stages = require('./treatmentStages');
const workflow = require('./guideWorkflow');
const requiredDocumentsSQL = `((SELECT COUNT(DISTINCT rd.document_type) FROM guide_process_documents rd WHERE rd.guide_process_id=gp.id AND rd.document_type IN ('CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION') AND rd.deleted_at IS NULL AND (rd.document_role='GENERATED' OR rd.is_usable=1))=3 AND ${require('./centralRequirements').proceduresSQL})`;
const billingWorkflowReadySQL = `(${prerequisitesSQL('billing')} AND ${requiredDocumentsSQL})`;
const types = [
  "CONSULTATION_GUIDE",
  "PHYSIOTHERAPY_GUIDE",
  "ELECTROSTIMULATION",
];
const labels = {
  CONSULTATION_GUIDE: "Consulta / Avaliação",
  PHYSIOTHERAPY_GUIDE: "Fisioterapia",
  ELECTROSTIMULATION: "Eletroestimulação",
};
const doneStatuses = ["BILLED", "DELIVERED"];
const therapyCompleteSQL = `(gp.treatment_status='COMPLETED' OR (gp.authorization_status IN ('AUTHORIZED','SESSION_TOKEN','NOT_REQUIRED') AND gp.authorized_sessions>0 AND gp.performed_sessions>=gp.authorized_sessions))`;
const electroSQL = `(EXISTS(SELECT 1 FROM guide_authorization_items ai WHERE ai.guide_process_id=gp.id AND ai.document_type='ELECTROSTIMULATION' AND ai.applicable=1) OR EXISTS(SELECT 1 FROM guide_process_documents bd WHERE bd.guide_process_id=gp.id AND bd.document_type='ELECTROSTIMULATION' AND bd.deleted_at IS NULL) OR EXISTS(SELECT 1 FROM guide_process_procedures bp JOIN procedures pr ON pr.id=bp.procedure_id WHERE bp.guide_process_id=gp.id AND pr.type='ELECTROSTIMULATION'))`;
const statusSQL = (t) =>
  `COALESCE((SELECT bi.status FROM guide_billing_items bi WHERE bi.guide_process_id=gp.id AND bi.document_type='${t}'), CASE WHEN gp.billing_status IN ('BILLED','DELIVERED') THEN gp.billing_status ELSE 'PENDING' END)`;
const applicableSQL = () => '1=1';
const billingDueSQL = `(${billingWorkflowReadySQL} AND (${types.map((t) => `((${applicableSQL(t)}) AND ${billAllowedSQL(t)} AND ${statusSQL(t)} NOT IN ('BILLED','DELIVERED') AND ${t === "CONSULTATION_GUIDE" ? "(gp.continuation_of_id IS NOT NULL OR COALESCE(ev.status,'')='COMPLETED')" : therapyCompleteSQL})`).join(" OR ")}))`;
const billingSummarySQL = `CASE WHEN ${billingDueSQL} THEN 'READY' WHEN gp.billing_status='DELIVERED' THEN 'DELIVERED' WHEN ${types.map((t) => `(NOT (${applicableSQL(t)}) OR ${statusSQL(t)} IN ('BILLED','DELIVERED'))`).join(" AND ")} THEN 'BILLED' ELSE 'NOT_READY' END`;
function therapyComplete(p) {
  return (
    p.treatment_status === "COMPLETED" ||
    (["AUTHORIZED", "SESSION_TOKEN", "NOT_REQUIRED"].includes(
      p.authorization_status,
    ) &&
      Number(p.authorized_sessions) > 0 &&
      Number(p.performed_sessions) >= Number(p.authorized_sessions))
  );
}
async function single(db, p) {
  const authItems = await require("./guideAuthorization").list(db, p);
  const [stored, evaluation, docs, procedures] = await Promise.all([
    db("guide_billing_items").where({ guide_process_id: p.id }),
    db("physiotherapy_evaluations").where({ guide_process_id: p.id }).first(),
    db("guide_process_documents")
      .where({ guide_process_id: p.id })
      .whereNull("deleted_at"),
    db("guide_process_procedures as bp")
      .join("procedures as pr", "pr.id", "bp.procedure_id")
      .where("bp.guide_process_id", p.id)
      .select("pr.type", "bp.requested_quantity"),
  ]);
  let blockingReason = '';
  try { stages.assertActive(p); stages.assertStagePrerequisites(p,'billing',evaluation?.status); }
  catch (e) { if (!e.code) throw e; blockingReason = e.message; }
  if (!blockingReason) { const pending = require('./centralRequirements').missing(procedures,docs); if (pending.length) blockingReason = 'Complete a Central de Guias. Falta: '+pending.join('; ')+'.'; }
  return types.map((type) => {
    const item = stored.find((i) => i.document_type === type),
      status =
        item?.status ||
        (doneStatuses.includes(p.billing_status)
          ? p.billing_status
          : "PENDING");
    const applicable = true;
    const authorization = authItems.find((a) => a.document_type === type);
    const authAllowed = !authorization?.is_individual
      ? !["DENIED", "IN_APPEAL"].includes(authorization?.status)
      : authorization.applicable &&
        (type === "CONSULTATION_GUIDE"
          ? !["DENIED", "IN_APPEAL"].includes(authorization.status)
          : ["AUTHORIZED", "SESSION_TOKEN", "NOT_REQUIRED"].includes(
              authorization.status,
            ));
    const eligible =
      !blockingReason && authAllowed &&
      applicable &&
      (type === "CONSULTATION_GUIDE"
        ? (Boolean(p.continuation_of_id) || evaluation?.status === "COMPLETED")
        : therapyComplete(p));
    return {
      key: p.id + ":" + type,
      guide_process_id: p.id,
      treatment_root_id: p.treatment_root_id || p.id,
      guide_number: p.guide_number || 1,
      document_type: type,
      label: labels[type],
      applicable,
      eligible,
      completion_ready:
        !blockingReason && authAllowed &&
        (type === "CONSULTATION_GUIDE"
          ? (Boolean(p.continuation_of_id) || evaluation?.status === "COMPLETED")
          : therapyComplete(p)),
      status,
      revision: Number(item?.revision || 0),
      notes: item?.notes || "",
      updated_at: item?.updated_at,
      updated_by: item?.updated_by,
      authorization_status: authorization?.status,
      blocking_reason: blockingReason || null,
      status_label: !applicable
        ? "Não aplicável"
        : status === "BILLED"
          ? "Faturada"
          : status === "DELIVERED"
            ? "Encaminhada (legado)"
            : blockingReason
              ? blockingReason
            : !authAllowed
              ? authorization?.status === "DENIED"
                ? "Não faturável — Guia negada"
                : "Aguardando liberação desta guia"
              : eligible
                ? "A faturar"
                : type === "CONSULTATION_GUIDE"
                  ? "Aguardando avaliação"
                  : "Aguardando conclusão das sessões",
      files: docs
        .filter((d) => d.document_type === type)
        .map((d) => ({
          id: d.id,
          name: d.original_name,
          version: d.document_version,
        })),
    };
  });
}
async function list(db, id) {
  const p = await db("guide_processes").where({ id }).first();
  if (!p)
    throw Object.assign(new Error("Tratamento não encontrado."), {
      status: 404,
    });
  const root = p.treatment_root_id || p.id;
  const processes = await db("guide_processes")
    .where(function () {
      this.where("id", root).orWhere("treatment_root_id", root);
    })
    .orderBy("guide_number");
  const items = (await Promise.all(processes.map((p) => single(db, p)))).flat();
  const active = items.filter((i) => i.applicable);
  return {
    items,
    ready: active.filter((i) => i.eligible && !doneStatuses.includes(i.status))
      .length,
    complete:
      active.length > 0 && active.every((i) => doneStatuses.includes(i.status)),
  };
}
async function change(db, id, type, actor, input) {
  if (
    !types.includes(type) ||
    !["PENDING", "BILLED"].includes(input.status) ||
    !Number.isInteger(input.revision) ||
    input.revision < 0 ||
    typeof (input.notes ?? "") !== "string" ||
    (input.notes || "").length > 1000
  )
    throw Object.assign(
      new Error("Informe uma guia, situação e revisão válidas."),
      { status: 422 },
    );
  return db.transaction(async (trx) => {
    const p = await trx("guide_processes").where({ id }).forUpdate().first();
    if (!p)
      throw Object.assign(new Error("Tratamento não encontrado."), {
        status: 404,
      });
    await require("./treatmentStages").assertStageUnlocked(trx, p, "billing");
    for (const t of types)
      if (
        !(await trx("guide_billing_items")
          .where({ guide_process_id: id, document_type: t })
          .first())
      )
        await trx("guide_billing_items").insert({
          guide_process_id: id,
          document_type: t,
          status: doneStatuses.includes(p.billing_status)
            ? p.billing_status
            : "PENDING",
        });
    const old = await trx("guide_billing_items")
      .where({ guide_process_id: id, document_type: type })
      .forUpdate()
      .first();
    if (Number(old.revision) !== input.revision)
      throw Object.assign(
        new Error(
          "Esta guia foi alterada por outro usuário. Atualize e confira novamente.",
        ),
        { status: 409 },
      );
    if (
      input.applicable !== undefined &&
      (type !== "ELECTROSTIMULATION" || typeof input.applicable !== "boolean")
    )
      throw Object.assign(
        new Error(
          "A aplicabilidade só pode ser alterada para eletroestimulação.",
        ),
        { status: 422 },
      );
    if (input.applicable === false) throw Object.assign(new Error('As três guias são obrigatórias e não podem ser marcadas como não aplicáveis.'),{status:422});
    if (input.applicable === false && doneStatuses.includes(old.status))
      throw Object.assign(
        new Error(
          "Reabra o faturamento antes de marcar a guia como não aplicável.",
        ),
        { status: 409 },
      );
    if (input.applicable !== undefined)
      await trx("guide_billing_items")
        .where({ id: old.id })
        .update({ applicable: input.applicable });
    const item = (await single(trx, p)).find((i) => i.document_type === type);
    if (input.status === "BILLED" && (!item.applicable || !item.eligible))
      throw Object.assign(
        new Error(
          item.blocking_reason || (type === "CONSULTATION_GUIDE"
            ? "Conclua a avaliação antes de faturar a consulta."
            : "Conclua as sessões desta guia antes de faturar fisioterapia ou eletroestimulação."),
        ),
        { status: 422 },
      );
    const value = {
      status: input.status,
      notes: (input.notes || "").trim() || null,
      revision: Number(old.revision) + 1,
      updated_by: actor,
      updated_at: trx.fn.now(),
    };
    await trx("guide_billing_items").where({ id: old.id }).update(value);
    const items = await single(trx, p),
      applicable = items.filter((i) => i.applicable);
    const aggregate = applicable.every((i) => doneStatuses.includes(i.status))
      ? "BILLED"
      : applicable.some((i) => i.eligible && !doneStatuses.includes(i.status))
        ? "READY"
        : "NOT_READY";
    await trx("guide_processes")
      .where({ id })
      .update({ billing_status: aggregate });
    await require("../routes/guide-center").history(
      trx,
      id,
      actor,
      "GUIDE_BILLING_UPDATED",
      "billing_status",
      old.status,
      input.status,
      {
        documentType: type,
        applicable: item.applicable,
        notesChanged: (old.notes || "") !== (value.notes || ""),
      },
    );
    return {
      ...(await list(trx, id)),
      process_id: id,
      billing_status: aggregate,
    };
  });
}
module.exports = {
  types,
  labels,
  therapyCompleteSQL,
  requiredDocumentsSQL,
  billingWorkflowReadySQL,
  billingDueSQL,
  billingSummarySQL,
  therapyComplete,
  single,
  list,
  change,
};
