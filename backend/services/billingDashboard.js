const DAY = 86400000;
function period(query) {
  const valid = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (
    !valid(query.start) ||
    !valid(query.end) ||
    query.start > query.end ||
    (Date.parse(query.end) - Date.parse(query.start)) / DAY > 730
  ) {
    throw Object.assign(
      new Error("Informe um período válido de até 731 dias."),
      { status: 400 },
    );
  }
  return {
    start: query.start,
    end: query.end,
    next: new Date(Date.parse(query.end) + DAY).toISOString().slice(0, 10),
  };
}
function summarize(rows, today) {
  const totals = {
    treatments: rows.length,
    evaluated: 0,
    inTreatment: 0,
    completed: 0,
    ready: 0,
  };
  const aging = [
    "Até 7 dias",
    "8 a 15 dias",
    "16 a 30 dias",
    "31 a 60 dias",
    "Acima de 60 dias",
  ].map((label) => ({ label, value: 0 }));
  const insurers = new Map(),
    months = new Map(),
    alerts = [];
  for (const row of rows) {
    totals.evaluated += row.evaluation_status === "COMPLETED" ? 1 : 0;
    totals.inTreatment += row.treatment_status === "IN_PROGRESS" ? 1 : 0;
    totals.completed += row.treatment_status === "COMPLETED" ? 1 : 0;
    totals.ready += row.billing_due === undefined ? (row.billing_status === "READY" ? 1 : 0) : (row.billing_due ? 1 : 0);
    const pending = row.billing_status !== "BILLED";
    const created = row.created_date;
    const age = Math.max(
      0,
      Math.floor((Date.parse(today) - Date.parse(created)) / DAY),
    );
    const reasons = [];
    if (row.document_status === "INCOMPLETE")
      reasons.push("Documentação incompleta");
    if (row.treatment_status === "COMPLETED" && pending)
      reasons.push("Finalizado sem faturamento registrado");
    if (
      row.assessment_date &&
      row.assessment_date < today &&
      row.evaluation_status !== "COMPLETED"
    )
      reasons.push("Data de avaliação passada sem conclusão digital");
    if (
      Number(row.authorized_sessions) > 0 &&
      Number(row.performed_sessions) > Number(row.authorized_sessions)
    )
      reasons.push("Sessões realizadas acima das autorizadas");
    if (row.authorization_status === "DENIED")
      reasons.push("Autorização não liberada");
    if (pending) {
      aging[age <= 7 ? 0 : age <= 15 ? 1 : age <= 30 ? 2 : age <= 60 ? 3 : 4]
        .value++;
      const insurance = row.insurance_name || "Sem convênio";
      insurers.set(insurance, (insurers.get(insurance) || 0) + 1);
    }
    const month = created.slice(0, 7);
    months.set(month, (months.get(month) || 0) + (pending ? 1 : 0));
    if (reasons.length)
      alerts.push({ ...row, age, reasons: reasons.join(" • ") });
  }
  return {
    totals,
    aging,
    insurers: [...insurers]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    months: [...months].sort().map(([label, value]) => ({ label, value })),
    alerts,
    sources: {
      realmed: true,
      agenda: false,
      invoices: false,
      evolutions: false,
    },
    generatedAt: new Date().toISOString(),
  };
}
module.exports = { period, summarize };
