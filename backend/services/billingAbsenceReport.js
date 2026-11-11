const { dateText, daysBetween } = require("./billingAgendaCollection");
const { memberships } = require("./billingAgendaFilters");
function buildAbsenceReport({
  rows,
  coverage,
  date,
  historyStart,
  rule = "total3",
  contacts = [],
}) {
  if (!["total3", "prior3"].includes(rule))
    throw Object.assign(new Error("Regra de faltas inválida."), {
      status: 400,
    });
  const patients = new Map(),
    seen = new Set(),
    phones = new Map(contacts.map((p) => [p.external_id, p.phone || null]));
  for (const row of rows) {
    const day = dateText(row.service_date);
    if (
      day < historyStart ||
      day > date ||
      !row.patient_external_id ||
      seen.has(row.external_id)
    )
      continue;
    seen.add(row.external_id);
    if (!patients.has(row.patient_external_id))
      patients.set(row.patient_external_id, []);
    patients.get(row.patient_external_id).push(row);
  }
  const items = [];
  for (const [id, appointments] of patients) {
    const ignored = new Set([
      "patient_canceled",
      "professional_canceled",
      "canceled",
      "rescheduled",
      "available",
    ]);
    const ordered = appointments
      .filter((row) => !ignored.has(row.status))
      .sort(
        (a, b) =>
          dateText(a.service_date).localeCompare(dateText(b.service_date)) ||
          String(a.start_at).localeCompare(String(b.start_at)) ||
          String(a.external_id).localeCompare(String(b.external_id)),
      );
    let misses = [];
    for (const row of ordered) {
      if (row.status === "missed") misses.push(row);
      else misses = [];
    }
    misses.sort(
      (a, b) =>
        String(a.start_at).localeCompare(String(b.start_at)) ||
        String(a.external_id).localeCompare(String(b.external_id)),
    );
    const today = misses.filter((row) => dateText(row.service_date) === date),
      prior = misses.filter((row) => dateText(row.service_date) < date);
    if (
      !today.length ||
      (rule === "total3" ? misses.length < 3 : misses.length < 4)
    )
      continue;
    const latest = today[today.length - 1];
    const agendas = [
      ...new Set(
        today
          .flatMap((row) => memberships(row).map((link) => link.name))
          .filter(Boolean),
      ),
    ];
    const places = [
      ...new Set(
        today
          .flatMap((row) => memberships(row).map((link) => link.place_name))
          .filter(Boolean),
      ),
    ];
    items.push({
      id,
      patient_name: latest.patient_name,
      phone: phones.get(id) || null,
      daily_misses: today.length,
      prior_misses: prior.length,
      total_misses: misses.length,
      agendas: agendas.join(" • "),
      places: places.join(" • ") || "Sem local informado",
      previous_dates: prior.slice(-3).map((row) => dateText(row.service_date)),
      history: misses.map((row) => ({
        id: row.external_id,
        date: dateText(row.service_date),
        start_at: row.start_at,
        agenda: [
          ...new Set(
            memberships(row)
              .map((link) => link.name)
              .filter(Boolean),
          ),
        ].join(" • "),
        place:
          [
            ...new Set(
              memberships(row)
                .map((link) => link.place_name)
                .filter(Boolean),
            ),
          ].join(" • ") || "Sem local informado",
      })),
    });
  }
  items.sort(
    (a, b) =>
      a.patient_name.localeCompare(b.patient_name, "pt-BR") ||
      a.id.localeCompare(b.id),
  );
  const days = daysBetween(historyStart, date),
    byDay = new Map(coverage.map((row) => [dateText(row.service_date), row]));
  const collected = days.filter(
    (day) => byDay.get(day)?.last_success_at,
  ).length;
  const fresh = days.filter(
    (day) => byDay.get(day)?.status === "COMPLETE",
  ).length;
  const latest =
    coverage
      .map((row) => row.last_success_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] || null;
  return {
    date,
    historyStart,
    rule,
    items,
    total: items.length,
    generatedAt: new Date().toISOString(),
    coverage: {
      days: days.length,
      collectedDays: collected,
      currentDays: fresh,
      complete: fresh === days.length,
      failedDays: coverage.filter((row) => row.status === "FAILED").length,
      lastSuccessAt: latest,
      reportDayLastSuccessAt: byDay.get(date)?.last_success_at || null,
    },
    notes: [
      "Faltas consecutivas por paciente. Comparecimentos e status pendentes interrompem a sequência.",
      "Conta agendamentos distintos com status de falta; cancelamentos e remarcações não contam.",
      "Não identifica séries de tratamento distintas. Confirmar com o paciente antes de qualquer decisão.",
      "Telefone disponível somente quando o paciente já está cadastrado no Realmed; nos demais casos, consultar o Stenci.",
    ],
  };
}
module.exports = { buildAbsenceReport };
