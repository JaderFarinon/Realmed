const fields = [
  "chief_complaint",
  "current_history",
  "functional_limitations",
  "physical_exam",
  "pain_score",
  "pain_classification",
  "pain_location",
  "severity",
  "severity_justification",
  "care_risk",
  "individual_monitoring",
  "precautions",
  "specific_care_notes",
  "therapeutic_goals",
  "conducts",
  "conduct_description",
  "reevaluation_date",
  "reevaluation_notes",
  "regions",
  "physiotherapist_id",
  "evaluation_date",
  "referral_professional",
  "medical_diagnosis",
  "authorization_reference",
  "responsible_name",
  "responsible_crefito",
  "other_region",
  "other_precaution",
  "other_conduct",
  "cid",
  "referral_date",
  "expected_start_date",
  "requested_sessions",
  "planned_total_sessions",
  "sessions_per_week",
  "treatment_days",
  "body_marks",
  "signature_strokes",
];
const jsonFields = new Set([
  "precautions",
  "conducts",
  "regions",
  "treatment_days",
  "body_marks",
  "signature_strokes",
]);
const fail = (message) => {
  throw Object.assign(new Error(message), { status: 422 });
};
function serialize(row) {
  if (!row) return null;
  const result = { ...row };
  for (const key of jsonFields)
    if (typeof result[key] === "string") {
      try {
        result[key] = JSON.parse(result[key]);
      } catch {
        result[key] = [];
      }
    }
  for (const key of [
    "evaluation_date",
    "referral_date",
    "expected_start_date",
    "reevaluation_date",
  ])
    if (result[key] instanceof Date) {
      const d = result[key];
      result[key] =
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  return result;
}
function validate(data, completing = false) {
  for (const key of [
    "pain_score",
    "requested_sessions",
    "planned_total_sessions",
    "sessions_per_week",
    "physiotherapist_id",
  ])
    if (
      data[key] != null &&
      (!Number.isInteger(Number(data[key])) ||
        Number(data[key]) <
          (key === "pain_score" || key === "sessions_per_week" ? 0 : 1) ||
        Number(data[key]) >
          (key === "pain_score"
            ? 10
            : key === "sessions_per_week"
              ? 5
              : 100000))
    )
      fail("Quantidade inválida: " + key);
  for (const [key, values] of Object.entries({
    severity: ["MILD", "MODERATE", "SEVERE"],
    care_risk: ["LOW", "MODERATE", "HIGH"],
  }))
    if (data[key] != null && !values.includes(data[key]))
      fail("Valor inválido: " + key);
  if (
    data.individual_monitoring != null &&
    ![true, false, 0, 1].includes(data.individual_monitoring)
  )
    fail("Informe Sim ou Não para acompanhamento individualizado.");
  for (const key of [
    "evaluation_date",
    "referral_date",
    "expected_start_date",
    "reevaluation_date",
  ])
    if (data[key] != null) {
      const value = String(data[key]);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value
      )
        fail("Data inválida: " + key);
    }
  for (const key of fields)
    if (
      typeof data[key] === "string" &&
      data[key].length > (key === "cid" ? 40 : 12000)
    )
      fail("Texto muito extenso: " + key);
  for (const key of jsonFields)
    if (data[key] != null && !Array.isArray(data[key]))
      fail("Formato inválido: " + key);
  for (const key of ["precautions", "conducts"])
    if (
      data[key]?.some((v) => typeof v !== "string" || v.length > 120) ||
      data[key]?.length > 30
    )
      fail("Opções inválidas: " + key);
  if (
    data.regions?.length > 30 ||
    data.regions?.some(
      (r) =>
        typeof r?.region !== "string" ||
        r.region.length > 80 ||
        !["", "RIGHT", "LEFT", "BILATERAL", null, undefined].includes(
          r.laterality,
        ),
    )
  )
    fail("Região ou lateralidade inválida.");
  if (data.treatment_days) {
    const seen = new Set();
    for (const d of data.treatment_days) {
      if (
        !["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(
          d?.day,
        ) ||
        seen.has(d.day) ||
        typeof d.enabled !== "boolean" ||
        (d.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time))
      )
        fail("Dias ou horários inválidos.");
      seen.add(d.day);
    }
  }
  const point = (p) =>
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 0 &&
    p.x <= 1 &&
    p.y >= 0 &&
    p.y <= 1;
  if (
    data.body_marks?.length > 300 ||
    data.body_marks?.some(
      (p) => !point(p) || !["PAIN", "LIMITATION", "ATTENTION"].includes(p.kind),
    )
  )
    fail("Marcação corporal inválida.");
  if (
    data.signature_strokes?.length > 200 ||
    data.signature_strokes?.some(
      (s) => !Array.isArray(s) || s.length > 2000 || s.some((p) => !point(p)),
    )
  )
    fail("Rubrica inválida.");
  if (completing) {
    const labels = {
      chief_complaint: "queixa principal",
      physical_exam: "exame físico",
      severity: "gravidade",
      care_risk: "risco assistencial",
      therapeutic_goals: "objetivos terapêuticos",
      conducts: "conduta",
      evaluation_date: "data da avaliação",
      responsible_name: "fisioterapeuta responsável",
      responsible_crefito: "CREFITO",
    };
    const missing = Object.entries(labels)
      .filter(
        ([k]) =>
          data[k] == null ||
          data[k] === "" ||
          (Array.isArray(data[k]) && !data[k].length),
      )
      .map(([, v]) => v);
    for (const [key, label, selected] of [
      [
        "other_region",
        "outra região",
        data.regions?.some((r) => r.region === "Outro"),
      ],
      [
        "other_precaution",
        "outra precaução",
        data.precautions?.includes("Outro"),
      ],
      ["other_conduct", "outra conduta", data.conducts?.includes("Outra")],
    ])
      if (selected && !data[key]) missing.push(label);
    if (data.treatment_days?.some((d) => d.enabled && !d.time))
      missing.push("horário dos dias de atendimento selecionados");
    if (missing.length)
      throw Object.assign(
        new Error(
          "Complete a avaliação antes de concluir: " + missing.join(", ") + ".",
        ),
        { status: 422, missing },
      );
  }
}
function normalize(body) {
  const data = Object.fromEntries(
    fields
      .filter((k) => body[k] !== undefined)
      .map((k) => [
        k,
        typeof body[k] === "string" ? body[k].trim() || null : body[k],
      ]),
  );
  validate(data);
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      jsonFields.has(k) && v != null ? JSON.stringify(v) : v,
    ]),
  );
}
module.exports = { fields, jsonFields, serialize, normalize, validate };
