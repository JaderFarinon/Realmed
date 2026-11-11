const { types, released } = require("./guideAuthorizationSql");
const labels = {
  CONSULTATION_GUIDE: "Consulta / Avaliação",
  PHYSIOTHERAPY_GUIDE: "Fisioterapia",
  ELECTROSTIMULATION: "Eletroestimulação",
};
const workflow = require("./authorizationWorkflow");
const fail = (message, status = 422) => {
  throw Object.assign(new Error(message), { status });
};
async function hasIndividual(db, id) {
  return Boolean(
    await db("guide_authorization_items")
      .where({ guide_process_id: id, is_individual: true })
      .first(),
  );
}
async function assertLegacy(db, id) {
  if (await hasIndividual(db, id))
    fail(
      "Este tratamento usa liberação por guia. Selecione a guia na aba Liberação.",
      409,
    );
}
async function list(db, p) {
  const [items, docs, procedures, billing, legacy] = await Promise.all([
    db("guide_authorization_items")
      .where({ guide_process_id: p.id })
      .select(
        "*",
        db.raw(
          "DATE_FORMAT(authorization_date,'%Y-%m-%d') as authorization_date",
        ),
        db.raw("DATE_FORMAT(expiration_date,'%Y-%m-%d') as expiration_date"),
        db.raw("DATE_FORMAT(requested_at,'%Y-%m-%d') as requested_at"),
      ),
    db("guide_process_documents")
      .where({ guide_process_id: p.id })
      .whereNull("deleted_at"),
    db("guide_process_procedures as ap")
      .join("procedures as pr", "pr.id", "ap.procedure_id")
      .where("ap.guide_process_id", p.id)
      .select("pr.type"),
    db("guide_billing_items").where({ guide_process_id: p.id }),
    workflow
      .authorizationQuery(db)
      .where({ guide_process_id: p.id })
      .whereNull("document_type")
      .orderBy("id", "desc")
      .first(),
  ]);
  return types.map((type) => {
    const row = items.find((i) => i.document_type === type),
      individual = Boolean(row?.is_individual),
      source = individual ? row : legacy || {};
    const applicable = true;
    let status = individual ? row.status : p.authorization_status;
    if (["NOT_READY", "READY"].includes(status))
      status = docs.some(
        (d) =>
          d.document_type === type &&
          (d.document_role === "GENERATED" ||
            d.is_usable === 1 ||
            d.is_usable === true),
      )
        ? "READY"
        : "NOT_READY";
    return {
      key: type,
      document_type: type,
      label: labels[type],
      applicable,
      status,
      revision: Number(row?.revision || 0),
      is_individual: individual,
      decision_source: row?.decision_source || "LEGACY",
      authorization_number: source.authorization_number || null,
      authorization_date: source.authorization_date || null,
      expiration_date: source.expiration_date || null,
      requested_at: source.requested_at || null,
      authorized_sessions: individual
        ? row.authorized_sessions
        : type === "CONSULTATION_GUIDE"
          ? released.includes(status)
            ? 1
            : null
          : p.authorized_sessions,
      notes: source.notes || null,
    };
  });
}
function partial(items) {
  return (
    items.some((i) => i.applicable && released.includes(i.status)) &&
    items.some((i) => i.applicable && !released.includes(i.status))
  );
}
async function freeze(db, p) {
  const current = await list(db, p);
  for (const item of current) {
    const data = {
      status: item.status,
      is_individual: true,
      decision_source: item.is_individual
        ? item.decision_source
        : "LEGACY_SNAPSHOT",
      authorization_number: item.authorization_number,
      authorization_date: item.authorization_date,
      expiration_date: item.expiration_date,
      authorized_sessions: item.authorized_sessions,
      notes: item.notes,
    };
    const old = await db("guide_authorization_items")
      .where({ guide_process_id: p.id, document_type: item.document_type })
      .first();
    if (!old)
      await db("guide_authorization_items").insert({
        ...data,
        guide_process_id: p.id,
        document_type: item.document_type,
      });
    else if (!old.is_individual)
      await db("guide_authorization_items").where({ id: old.id }).update(data);
  }
}
async function change(db, processId, actor, body) {
  if (
    !types.includes(body.document_type) ||
    !Number.isInteger(body.revision) ||
    body.revision < 0
  )
    fail("Selecione uma guia e revisão válidas.");
  const input = workflow.validateInput(body),
    p = await require("./treatmentStages").lockOpen(
      db,
      processId,
      "authorization",
    );
  const before = (await list(db, p)).find(
    (i) => i.document_type === body.document_type,
  );
  if (
    before.revision !== body.revision ||
    before.status !== input.expected_status
  )
    fail("Esta guia foi alterada. Atualize e confira novamente.", 409);
  if (
    body.applicable !== undefined &&
    (body.document_type !== "ELECTROSTIMULATION" ||
      typeof body.applicable !== "boolean")
  )
    fail("Aplicabilidade inválida.");
  if (body.applicable === false) fail('As três guias são obrigatórias e não podem ser marcadas como não aplicáveis.');
  if (!before.applicable && body.applicable !== true)
    fail("Esta guia não faz parte deste ciclo.");
  const current = before.status,
    target = input.status;
  if (
    target === "NOT_READY" &&
    !(body.applicable !== undefined && current === target)
  )
    fail("A preparação é calculada pelos documentos.");
  if (current !== target && !workflow.transitions[current]?.includes(target))
    fail("Esta mudança de liberação não é permitida para a guia.", 409);
  const billed = await db("guide_billing_items")
    .where({ guide_process_id: processId, document_type: body.document_type })
    .first();
  if (
    ["BILLED", "DELIVERED"].includes(billed?.status) &&
    (current !== target || body.applicable === false)
  )
    fail("Reabra o faturamento desta guia antes de mudar a decisão.", 409);
  if (
    body.document_type === "PHYSIOTHERAPY_GUIDE" &&
    Number(p.performed_sessions) > 0 &&
    (!released.includes(target) ||
      (input.authorized_sessions != null &&
        input.authorized_sessions < Number(p.performed_sessions)))
  )
    fail(
      "A fisioterapia já tem sessões realizadas. Preserve a liberação e a quantidade utilizada.",
      409,
    );
  if (
    ["READY", "PENDING", "DENIED", "IN_APPEAL"].includes(target) ||
    (workflow.finals.includes(current) && current !== target) ||
    (target === "IN_PROGRESS" && current !== "READY")
  )
    if (!input.notes) fail("Informe o motivo ou observação desta mudança.");
  if (target === "IN_PROGRESS" || target === "READY") {
    const docs = await db("guide_process_documents")
      .where({ guide_process_id: processId, document_type: body.document_type })
      .whereNull("deleted_at");
    if (
      !require("./guideWorkflow").isDocumentComplete(docs, [body.document_type])
    )
      fail("Anexe ou gere uma guia adequada antes de encaminhar.");
  }
  if (target === "IN_PROGRESS") {
    const evaluation = await db("physiotherapy_evaluations")
      .where({ guide_process_id: processId, status: "COMPLETED" })
      .first();
    if (
      !p.patient_insurance_id ||
      !p.requesting_doctor_id ||
      !p.physiotherapist_id ||
      (!p.continuation_of_id && !evaluation) ||
      (body.document_type !== "CONSULTATION_GUIDE" && !p.requested_sessions)
    )
      fail(
        "Complete os dados obrigatórios e a avaliação antes de encaminhar esta guia.",
      );
  }
  const open = await db("guide_process_pending_items")
    .where({ guide_process_id: processId, status: "OPEN" })
    .where((q) =>
      q.where("document_type", body.document_type).orWhereNull("document_type"),
    )
    .select("id");
  if (workflow.finals.includes(target) && open.length)
    fail("Resolva as pendências desta guia antes de registrar a decisão.");
  if (workflow.finals.includes(target)) {
    const minimum =
      before.requested_at ||
      (await workflow.authorizationDateLimit(db, processId));
    workflow.validateAuthorizationDates(input, minimum);
    if (!p.patient_insurance_id)
      fail("Informe o convênio antes de registrar a decisão.");
    if (target === "AUTHORIZED" && !(input.authorized_sessions > 0))
      fail("Informe a quantidade autorizada para esta guia.");
  }
  await freeze(db, p);
  const today = (
    await db("guide_processes")
      .where({ id: processId })
      .select(db.raw("DATE_FORMAT(CURRENT_DATE(),'%Y-%m-%d') as day"))
      .first()
  ).day;
  const value = {
    status: target,
    decision_source: "INDIVIDUAL",
    revision: before.revision + 1,
    authorization_number: workflow.finals.includes(target)
      ? input.authorization_number
      : null,
    authorization_date: workflow.finals.includes(target)
      ? input.authorization_date
      : null,
    expiration_date: workflow.finals.includes(target)
      ? input.expiration_date
      : null,
    authorized_sessions:
      workflow.finals.includes(target) && target !== "DENIED"
        ? input.authorized_sessions
        : null,
    notes: input.notes,
    updated_by: actor,
    updated_at: db.fn.now(),
    ...(target === "IN_PROGRESS" ? { requested_at: today } : {}),
    ...(body.applicable !== undefined ? { applicable: body.applicable } : {}),
  };
  await db("guide_authorization_items")
    .where({ guide_process_id: processId, document_type: body.document_type })
    .update(value);
  if (target === "PENDING")
    await db("guide_process_pending_items").insert({
      guide_process_id: processId,
      document_type: body.document_type,
      description: input.notes.slice(0, 255),
      notes: input.notes,
      created_by: actor,
    });
  if (["READY", "IN_PROGRESS"].includes(target) && open.length)
    await db("guide_process_pending_items")
      .whereIn(
        "id",
        open.map((i) => i.id),
      )
      .update({
        status: "RESOLVED",
        resolved_by: actor,
        resolved_at: db.fn.now(),
      });
  let authorizationId = null;
  if (workflow.finals.includes(target))
    [authorizationId] = await db("guide_authorizations").insert({
      guide_process_id: processId,
      document_type: body.document_type,
      authorization_number: input.authorization_number,
      authorization_date: input.authorization_date,
      expiration_date: input.expiration_date,
      requested_sessions:
        body.document_type === "CONSULTATION_GUIDE"
          ? 1
          : Number(p.requested_sessions || 0),
      authorized_sessions: value.authorized_sessions,
      status: target,
      notes: input.notes,
      created_by: actor,
      updated_by: actor,
    });
  const items = await list(db, p),
    physio = items.find((i) => i.document_type === "PHYSIOTHERAPY_GUIDE");
  await db("guide_processes")
    .where({ id: processId })
    .update({
      authorization_status: physio.status,
      authorized_sessions: released.includes(physio.status)
        ? physio.authorized_sessions
        : null,
    });
  await require("../routes/guide-center").history(
    db,
    processId,
    actor,
    "GUIDE_AUTHORIZATION_UPDATED",
    "authorization_status",
    current,
    target,
    {
      documentType: body.document_type,
      authorizationId,
      partial: partial(items),
      resolvedPendingIds: ["READY", "IN_PROGRESS"].includes(target)
        ? open.map((i) => i.id)
        : [],
    },
  );
  return {
    items,
    partial: partial(items),
    authorization_status: physio.status,
  };
}
async function canFinalize(db, p) {
  const items = (await list(db, p)).filter((i) => i.applicable);
  return (
    items.length > 0 &&
    items.every((i) => workflow.finals.includes(i.status)) &&
    !(await db("guide_process_pending_items")
      .where({ guide_process_id: p.id, status: "OPEN" })
      .first())
  );
}
// Caller owns the transaction: a failure on any guide rolls back all decisions/history.
async function releaseTogether(db, processId, actor, body, target = 'AUTHORIZED') {
  if (!Object.hasOwn(workflow.transitions, target) || target === 'NOT_READY') fail('Status de liberação inválido.');
  if (
    !Array.isArray(body.items) ||
    body.items.length < 2 ||
    body.items.length > types.length ||
    new Set(body.items.map((i) => i?.document_type)).size !==
      body.items.length ||
    body.items.some((i) => !i || !types.includes(i.document_type))
  )
    fail("Selecione de duas a três guias diferentes para alterar juntas.");
  await require("./treatmentStages").lockOpen(db, processId, "authorization");
  let result;
  for (const item of [...body.items].sort(
    (a, b) => types.indexOf(a.document_type) - types.indexOf(b.document_type),
  )) {
    result = await change(db, processId, actor, {
      status: target,
      document_type: item.document_type,
      expected_status: item.expected_status,
      revision: item.revision,
      authorized_sessions: item.authorized_sessions,
      authorization_number: body.authorization_number,
      authorization_date: body.authorization_date,
      expiration_date: body.expiration_date,
      notes: body.notes,
    });
  }
  return result;
}
module.exports = {
  releaseTogether,
  list,
  partial,
  change,
  hasIndividual,
  assertLegacy,
  canFinalize,
};
