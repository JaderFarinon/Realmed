const { period } = require("./billingDashboard");
const {
  dateText,
  localToday,
  daysBetween,
} = require("./billingAgendaCollection");
const { applyFilters, filterOptions } = require("./billingAgendaFilters");
const { stageCase, stages } = require("./guideDashboard");
const areas = [
  { key: "epidemiology", label: "Perfil epidemiológico" },
  { key: "reception", label: "Recepção" },
  { key: "physio", label: "Fisioterapia" },
  { key: "billing", label: "Faturamento" },
];
const definitions = [
  ["sex", "epidemiology", "Pacientes por sexo", "donut", "pacientes"],
  ["age", "epidemiology", "Pacientes por faixa etária", "bar", "pacientes"],
  ["insurance", "epidemiology", "Pacientes por convênio", "donut", "pacientes"],
  ["city", "epidemiology", "Pacientes por município", "bar", "pacientes"],
  ["neighborhood", "epidemiology", "Pacientes por bairro", "bar", "pacientes"],
  [
    "treatment_type",
    "epidemiology",
    "Pacientes por tipo de tratamento / procedimento",
    "bar",
    "pacientes",
  ],
  [
    "attendance_status",
    "reception",
    "Situação dos agendamentos",
    "donut",
    "agendamentos",
  ],
  [
    "daily_appointments",
    "reception",
    "Agendamentos por dia",
    "area",
    "agendamentos",
  ],
  [
    "attendance_outcomes",
    "reception",
    "Comparecimento e faltas",
    "bar",
    "agendamentos",
  ],
  [
    "physio_status",
    "physio",
    "Situação dos atendimentos de fisioterapia",
    "donut",
    "agendamentos",
  ],
  [
    "physio_daily",
    "physio",
    "Fisioterapia finalizada por dia",
    "area",
    "agendamentos",
  ],
  [
    "physio_insurance",
    "physio",
    "Fisioterapia por convênio",
    "bar",
    "agendamentos",
  ],
  [
    "billing_status",
    "billing",
    "Situação do faturamento por guia",
    "donut",
    "guias",
  ],
  [
    "treatment_stages",
    "billing",
    "Situação atual dos tratamentos",
    "bar",
    "ciclos",
  ],
  [
    "documentation",
    "billing",
    "Documentação dos tratamentos",
    "donut",
    "ciclos",
  ],
].map(([key, area, label, kind, unit]) => ({ key, area, label, kind, unit }));
const parseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const clean = (value) => (typeof value === "string" ? value.trim() : "");
const fail = (message) => Object.assign(new Error(message), { status: 400 });
function filters(input = {}) {
  const range = period(input);
  if (range.start < "2000-01-01" || range.end > localToday())
    throw fail("Escolha um período entre 2000 e hoje.");
  const area = input.area || "epidemiology",
    source = input.source || "combined",
    status = input.status || "active";
  if (
    !areas.some((a) => a.key === area) ||
    !["combined", "stenci", "local"].includes(source) ||
    ![
      "active",
      "all",
      "finished",
      "missed",
      "scheduled",
      "confirmed",
      "waiting",
      "in_attendance",
      "patient_canceled",
      "professional_canceled",
      "canceled",
      "rescheduled",
    ].includes(status)
  )
    throw fail("Filtros de indicadores inválidos.");
  const read = (key, max = 120) => {
    const value = input[key] || "";
    if (typeof value !== "string" || value.length > max)
      throw fail("Filtro inválido.");
    return value;
  };
  return {
    start: range.start,
    end: range.end,
    area,
    source,
    status,
    insurance: read("insurance"),
    scheduleId: read("scheduleId", 64) || "all",
    placeId: read("placeId", 64) || "all",
  };
}
const statusLabel = (s) =>
  ({
    scheduled: "Agendado",
    finished: "Finalizado",
    missed: "Falta",
    confirmed: "Confirmado",
    waiting: "Em espera",
    in_attendance: "Em atendimento",
    patient_canceled: "Cancelado pelo paciente",
    professional_canceled: "Cancelado pelo profissional",
    canceled: "Cancelado",
    rescheduled: "Remarcado",
    triage: "Triagem",
  })[s] ||
  s ||
  "Não informado";
function group(values, ordered = false) {
  const counts = new Map();
  for (const label of values)
    counts.set(
      label || "Não informado",
      (counts.get(label || "Não informado") || 0) + 1,
    );
  const rows = [...counts].map(([label, value]) => ({ label, value }));
  return ordered
    ? rows.sort((a, b) => a.label.localeCompare(b.label))
    : rows.sort(
        (a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"),
      );
}
function ageGroup(birth, end) {
  const date = birth ? dateText(birth) : "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > end
  )
    return "Não informado";
  const age =
    Number(end.slice(0, 4)) -
    Number(date.slice(0, 4)) -
    (end.slice(5) < date.slice(5) ? 1 : 0);
  if (age < 0 || age > 120) return "Não informado";
  return age < 18
    ? "0–17 anos"
    : age < 30
      ? "18–29 anos"
      : age < 45
        ? "30–44 anos"
        : age < 60
          ? "45–59 anos"
          : age < 75
            ? "60–74 anos"
            : "75 anos ou mais";
}
function sexLabel(value) {
  return (
    {
      female: "Feminino",
      f: "Feminino",
      feminino: "Feminino",
      male: "Masculino",
      m: "Masculino",
      masculino: "Masculino",
      other: "Outro",
      outro: "Outro",
      intersex: "Intersexo",
    }[clean(value).toLowerCase()] || "Não informado"
  );
}
const procedureLabel = {
  CONSULTATION: "Consulta / Avaliação",
  PHYSIOTHERAPY: "Fisioterapia",
  ELECTROSTIMULATION: "Eletroestimulação",
  OTHER: "Outro procedimento",
};
function summarize(
  {
    appointments = [],
    patients = [],
    treatments = [],
    procedures = [],
    billing = [],
    coverage = [],
    schedules = [],
  },
  f,
  now = new Date(),
) {
  const patientById = new Map(patients.map((p) => [Number(p.id), p]));
  const patientByExternal = new Map(
    patients
      .filter((p) => p.external_source === "STENCI" && p.external_id)
      .map((p) => [String(p.external_id), p]),
  );
  const availableInsurance = [
    ...new Set(
      [
        ...appointments.map((a) => a.insurance_name),
        ...treatments.map((t) => t.insurance_name),
      ].filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  let agenda = applyFilters(appointments, {
    status: f.status,
    attendanceType: "all",
    scheduleId: f.scheduleId,
    placeId: f.placeId,
  });
  if (f.insurance)
    agenda = agenda.filter(
      (a) => (a.insurance_name || "Não informado") === f.insurance,
    );
  const local = treatments.filter(
    (t) =>
      !f.insurance || (t.insurance_name || "Não informado") === f.insurance,
  );
  const cohort = new Map();
  const patientKey = (p) =>
    p?.external_source === "STENCI" && p.external_id
      ? "s:" + p.external_id
      : "l:" + p.id;
  const get = (key, p = {}) => {
    if (!cohort.has(key))
      cohort.set(key, {
        ...p,
        types: new Set(),
        insurance: "Não informado",
        latest: "",
      });
    return cohort.get(key);
  };
  if (f.source !== "local")
    for (const a of [...agenda].sort((a, b) =>
      new Date(a.start_at) - new Date(b.start_at) || String(a.external_id).localeCompare(String(b.external_id)),
    )) {
      const p = patientByExternal.get(String(a.patient_external_id));
      const c = get("s:" + a.patient_external_id, {
        ...(parseJson(a.patient_demographics) || {}),
        ...Object.fromEntries(
          Object.entries(p || {}).filter(([, v]) => v != null),
        ),
      });
      for (const [key, value] of Object.entries(
        parseJson(a.patient_demographics) || {},
      ))
        if (!p?.[key] && value) c[key] = value;
      const date = dateText(a.service_date);
      if (date >= c.latest) {
        c.insurance = a.insurance_name || "Não informado";
        c.latest = date;
      }
      c.types.add(
        a.is_evaluation
          ? "Consulta / Avaliação"
          : a.is_physiotherapy
            ? "Fisioterapia"
            : "Outro / não classificado",
      );
    }
  if (f.source !== "stenci")
    for (const t of [...local].sort((a, b) =>
      String(a.created_date).localeCompare(String(b.created_date)),
    )) {
      const p = patientById.get(Number(t.patient_id));
      if (!p) continue;
      const c = get(patientKey(p), p);
      if (t.created_date > c.latest) {
        c.insurance = t.insurance_name || "Não informado";
        c.latest = t.created_date;
      }
      for (const pr of procedures.filter(
        (pr) =>
          Number(pr.guide_process_id) === Number(t.id) &&
          Number(pr.quantity) > 0,
      ))
        c.types.add(procedureLabel[pr.type] || "Outro procedimento");
    }
  const people = [...cohort.values()],
    physio = agenda.filter((a) => a.is_physiotherapy && !a.is_evaluation);
  const billingByGuide = new Map(billing.map(b=>[Number(b.guide_process_id)+':'+b.document_type,b.status]));
  // Same three applicable guide types and unsaved-status fallback as guideBilling.single.
  const billingStatuses = local.flatMap(t=>require('./guideBilling').types.map(type=>billingByGuide.get(Number(t.id)+':'+type)||(['BILLED','DELIVERED'].includes(t.billing_status)?t.billing_status:'PENDING')));
  const covered = new Set(
    coverage
      .filter((d) => d.last_success_at)
      .map((d) => dateText(d.service_date)),
  );
  const fresh = new Set(
    coverage
      .filter((d) => d.status === "COMPLETE")
      .map((d) => dateText(d.service_date)),
  );
  const dates = daysBetween(f.start, f.end),
    collected = dates.filter((d) => covered.has(d)).length;
  const collection = {
    days: dates.length,
    collectedDays: collected,
    currentDays: dates.filter((d) => fresh.has(d)).length,
    complete: dates.every((d) => fresh.has(d)),
    lastSuccessAt:
      coverage
        .map((d) => d.last_success_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0] || null,
  };
  const options = filterOptions(schedules, appointments);
  const agendaScope =
    "Status: " +
    (f.status === "active"
      ? "ativos, sem cancelados/remarcados"
      : f.status === "all"
        ? "todos"
        : statusLabel(f.status)) +
    " · Agenda: " +
    (f.scheduleId === "all"
      ? "todas"
      : options.schedules.find((s) => s.id === f.scheduleId)?.name ||
        "seleção sem dados") +
    " · Unidade: " +
    (f.placeId === "all"
      ? "todas"
      : f.placeId === "unassigned"
        ? "não informada"
        : options.places.find((p) => p.id === f.placeId)?.name ||
          "seleção sem dados");
  const pendingNote = collection.complete
    ? ""
    : "Cobertura da agenda parcial: " +
      collected +
      " de " +
      dates.length +
      " dias possuem coleta. Resultados representam somente os registros disponíveis.";
  const cohortNote =
    "Pacientes únicos no período: agenda Stenci por data do agendamento e tratamentos Realmed por data de criação, conforme a origem escolhida. Vínculo somente pelo ID Stenci; nunca pelo nome. Convênio mais recente no recorte. Dados cadastrais refletem a informação disponível na consulta, não um cadastro histórico.";
  const baseLocal =
    "Ciclos criados no período, sem excluídos. Situação atual na consulta; o filtro de datas não reconstrói a situação histórica. Valores financeiros não são inferidos.";
  const stageNames = Object.fromEntries(stages.map((s) => [s.key, s.label]));
  const chartRows = {
    sex: group(people.map((p) => sexLabel(p.gender))),
    age: group(
      people.map((p) => ageGroup(p.birth_date, f.end)),
      true,
    ),
    insurance: group(people.map((p) => p.insurance)),
    city: group(
      people.map((p) =>
        clean(p.city)
          ? clean(p.city) + (clean(p.state) ? " / " + clean(p.state) : "")
          : "Não informado",
      ),
    ),
    neighborhood: group(
      people.map((p) =>
        clean(p.neighborhood)
          ? clean(p.neighborhood) + (clean(p.city) ? " — " + clean(p.city) : "")
          : "Não informado",
      ),
    ),
    treatment_type: group(
      people.flatMap((p) => (p.types.size ? [...p.types] : ["Não informado"])),
    ),
    attendance_status: group(agenda.map((a) => statusLabel(a.status))),
    daily_appointments: group(
      agenda.map((a) => dateText(a.service_date)),
      true,
    ),
    attendance_outcomes: group(
      agenda
        .filter((a) => ["finished", "missed"].includes(a.status))
        .map((a) => statusLabel(a.status)),
    ),
    physio_status: group(physio.map((a) => statusLabel(a.status))),
    physio_daily: group(
      physio
        .filter((a) => a.status === "finished")
        .map((a) => dateText(a.service_date)),
      true,
    ),
    physio_insurance: group(physio.map((a) => a.insurance_name)),
    billing_status: group(billingStatuses.map(status=>({PENDING:'Pendente',BILLED:'Faturada',DELIVERED:'Entregue',READY:'Pronta'}[status]||status))),
    treatment_stages: group(
      local.map(
        (t) =>
          stageNames[t.stage] ||
          (t.billing_status === "BILLED"
            ? "Faturado"
            : t.billing_status === "DELIVERED"
              ? "Entregue"
              : "Sem fila pendente"),
      ),
    ),
    documentation: group(
      local.map((t) =>
        t.document_status === "COMPLETE" ? "Completa" : "Incompleta",
      ),
    ),
  };
  const metrics = definitions
    .filter((d) => d.area === f.area)
    .map((d) => {
      const raw = chartRows[d.key],
        rows =
          raw.length > 200
            ? [
                ...raw.slice(0, 199),
                {
                  label: "Demais grupos",
                  value: raw.slice(199).reduce((n, r) => n + r.value, 0),
                },
              ]
            : raw;
      const missing = raw.find((r) => r.label === "Não informado")?.value || 0;
      const unavailable =
        (d.area === "reception" ||
          d.area === "physio" ||
          (d.area === "epidemiology" && f.source === "stenci")) &&
        !collected;
      const note =
        d.area === "epidemiology"
          ? cohortNote +
            (d.key === "age" ? " Idade calculada no fim do período." : "") +
            (d.key === "treatment_type"
              ? " Um paciente pode aparecer em mais de um tipo; não são diagnósticos inferidos."
              : "")
          : d.area === "billing"
            ? baseLocal
            : "Agendamentos únicos do Stenci. Finalizado é o status da agenda e não comprova conclusão do tratamento, evolução ou pagamento.";
      return {
        ...d,
        rows: unavailable ? [] : rows,
        total: unavailable ? null : raw.reduce((s, r) => s + r.value, 0),
        population: d.area === "epidemiology" ? people.length : null,
        missing,
      description: note + (d.key==='billing_status'?' Considera as três guias previstas de cada ciclo, inclusive sem movimentação registrada. Pendente não significa apta a faturar; não conta versões de PDF.':''),
        scope:
          d.area === "billing" ||
          (d.area === "epidemiology" && f.source === "local")
            ? "Base local por data de criação."
            : agendaScope +
              (d.area === "epidemiology" && f.source === "combined"
                ? " · Filtros da agenda não restringem tratamentos locais."
                : ""),
        warnings: [
          ...(d.area !== "billing" &&
          !(d.area === "epidemiology" && f.source === "local") &&
          pendingNote
            ? [pendingNote]
            : []),
          ...(d.area === "epidemiology" &&
          ["sex", "age", "city", "neighborhood"].includes(d.key)
            ? [
                "Campos ausentes aparecem como Não informado. Município e bairro passam a ser preservados nas próximas sincronizações; endereços completos não são exibidos.",
              ]
            : []),
        ],
        filters: f,
        capturedAt: now.toISOString(),
        coverage: collection,
        version: 1,
      };
    });
  return {
    areas,
    definitions,
    metrics,
    filters: f,
    coverage: collection,
    options: { ...options, insurances: availableInsurance },
    generatedAt: now.toISOString(),
  };
}
async function loadDashboard(db, branchId, input) {
  const f = filters(input),
    range = period(f);
  return db.transaction(
    async (trx) => {
      const [appointments, coverage, schedules, treatments] = await Promise.all(
        [
          trx("billing_stenci_appointments")
            .where({ branch_id: branchId })
            .whereBetween("service_date", [f.start, f.end])
            .select(
              "external_id",
              "patient_external_id",
              "patient_demographics",
              "service_date",
              "start_at",
              "status",
              "insurance_name",
              "schedule_id",
              "schedule_name",
              "schedule_memberships",
              "is_evaluation",
              "is_physiotherapy",
            ),
          trx("billing_collection_days")
            .where({ branch_id: branchId })
            .whereBetween("service_date", [f.start, f.end])
            .select("service_date", "status", "last_success_at"),
          trx("billing_stenci_schedules")
            .where({ branch_id: branchId })
            .select("external_id", "name", "place_external_id", "place_name"),
          trx("guide_processes as gp")
            .leftJoin(
              "patient_insurances as pi",
              "pi.id",
              "gp.patient_insurance_id",
            )
            .leftJoin(
              "insurance_providers as ip",
              "ip.id",
              "pi.insurance_provider_id",
            )
            .leftJoin(
              "physiotherapy_evaluations as ev",
              "ev.guide_process_id",
              "gp.id",
            )
            .whereNull("gp.deleted_at")
            .where("gp.created_at", ">=", range.start)
            .where("gp.created_at", "<", range.next)
            .select(
              "gp.id",
              "gp.patient_id",
              "ip.name as insurance_name",
              "gp.document_status",
              "gp.billing_status",
              trx.raw("DATE_FORMAT(gp.created_at,'%Y-%m-%d') as created_date"),
              trx.raw(`${stageCase} as stage`),
            ),
        ],
      );
      const ids = treatments.map((t) => t.id),
        external = [...new Set(appointments.map((a) => a.patient_external_id))],
        patientIds = treatments.map((t) => t.patient_id);
      const [patients, procedures, billing] = await Promise.all([
        trx("patients")
          .where((q) => {
            q.whereIn("id", patientIds);
            if (external.length)
              q.orWhere((s) =>
                s
                  .where({ external_source: "STENCI" })
                  .whereIn("external_id", external),
              );
          })
          .select(
            "id",
            "external_source",
            "external_id",
            "birth_date",
            "gender",
            "city",
            "neighborhood",
            "state",
          ),
        trx("guide_process_procedures as gpp")
          .join("procedures as p", "p.id", "gpp.procedure_id")
          .whereIn("gpp.guide_process_id", ids)
          .select(
            "gpp.guide_process_id",
            "gpp.requested_quantity as quantity",
            "p.type",
          ),
        trx("guide_billing_items")
          .whereIn("guide_process_id", ids)
          .select("guide_process_id", "document_type", "status", "applicable"),
      ]);
      return summarize(
        {
          appointments,
          patients,
          treatments,
          procedures,
          billing,
          coverage,
          schedules,
        },
        f,
      );
    },
    { isolationLevel: "repeatable read" },
  );
}
module.exports = {
  areas,
  definitions,
  filters,
  summarize,
  loadDashboard,
  ageGroup,
  sexLabel,
  parseJson,
};
