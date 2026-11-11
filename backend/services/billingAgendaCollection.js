const { period } = require("./billingDashboard");
const DAY = 86400000;
const dateText = (value) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
const localToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    now,
  );
const daysBetween = (start, end) => {
  const out = [];
  for (
    let d = start;
    d <= end;
    d = new Date(Date.parse(d) + DAY).toISOString().slice(0, 10)
  )
    out.push(d);
  return out;
};
const failure = (code) =>
  Object.assign(new Error("Coleta de agenda incompleta."), { code });
function normalizeDay(branchId, date, snapshots, now = new Date()) {
  const found = new Map();
  const places = new Map(
    snapshots
      .filter((s) => s.schedule.place?.id)
      .map((s) => [s.schedule.place.id, s.schedule.place.name]),
  );
  for (const { schedule, data } of snapshots) {
    if (data.hasMore) throw failure("STENCI_CALENDAR_INCOMPLETE");
    for (const row of data.items) {
      if (
        !row.id ||
        !row.patient_id ||
        !row.patient_name ||
        !row.startDate ||
        !row.status
      )
        throw failure("STENCI_APPOINTMENT_INVALID");
      const actualDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date(row.startDate));
      if (actualDate !== date)
        throw failure("STENCI_APPOINTMENT_DATE_MISMATCH");
      const codes = (row.expenses || []).map((e) =>
        String(e.code || "").replace(/\D/g, ""),
      );
      // Explicit clinic evaluation agenda and known consultation code; no guessed clinical equivalences.
      const isEvaluation =
        schedule.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase() === "avaliacao" || codes.includes("50000144");
      const value = {
        branch_id: branchId,
        external_id: String(row.id),
        service_date: date,
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        patient_external_id: String(row.patient_id),
        patient_name: row.patient_name,
        insurance_external_id: row.insurance_id || null,
        insurance_name: row.insurance_name || null,
        start_at: row.startDate,
        status: row.status,
        is_evaluation: isEvaluation,
        is_physiotherapy: Boolean(row.is_physiotherapy),
        schedule_memberships: JSON.stringify([
          {
            id: schedule.id,
            name: schedule.name,
            place_id: row.place_id || schedule.place?.id || null,
            place_name: places.get(row.place_id || schedule.place?.id) || null,
          },
        ]),
        is_session: (row.expenses || []).some(
          (e) =>
            e.type === "session" &&
            String(e.code || "").replace(/\D/g, "") !== "50000144",
        ),
        expenses: JSON.stringify(row.expenses || []),
        collected_at: now,
      };
      const previous = found.get(value.external_id);
      if (previous) {
        if (
          previous.patient_external_id !== value.patient_external_id ||
          previous.start_at !== value.start_at ||
          previous.status !== value.status
        )
          throw failure("STENCI_DUPLICATE_CONFLICT");
        previous.is_evaluation ||= value.is_evaluation;
        previous.is_session ||= value.is_session;
        previous.is_physiotherapy ||= value.is_physiotherapy;
        previous.schedule_memberships = JSON.stringify(
          [
            ...JSON.parse(previous.schedule_memberships),
            ...JSON.parse(value.schedule_memberships),
          ].filter(
            (link, index, links) =>
              links.findIndex(
                (other) =>
                  other.id === link.id && other.place_id === link.place_id,
              ) === index,
          ),
        );
        const expenses = new Map(
          [...JSON.parse(previous.expenses), ...JSON.parse(value.expenses)].map(
            (e) => [e.id || JSON.stringify(e), e],
          ),
        );
        previous.expenses = JSON.stringify([...expenses.values()]);
      } else found.set(value.external_id, value);
    }
  }
  return [...found.values()];
}
async function enqueueRange(
  db,
  branchId,
  start,
  end,
  now = new Date(),
  force = false,
) {
  period({ start, end });
  const dates = daysBetween(start, end);
  const existing = new Set(
    (
      await db("billing_collection_days")
        .where({ branch_id: branchId })
        .whereBetween("service_date", [start, end])
        .select("service_date")
    ).map((r) => dateText(r.service_date)),
  );
  const missing = dates.filter((d) => !existing.has(d));
  for (let i = 0; i < missing.length; i += 100)
    await db("billing_collection_days")
      .insert(
        missing.slice(i, i + 100).map((service_date) => ({
          branch_id: branchId,
          service_date,
          status: "QUEUED",
          requested_at: now,
        })),
      )
      .onConflict(["branch_id", "service_date"])
      .ignore();
  if (force)
    await db("billing_collection_days")
      .where({ branch_id: branchId })
      .whereBetween("service_date", [start, end])
      .whereNot("status", "RUNNING")
      .update({ status: "QUEUED", retry_at: null, requested_at: now });
}
async function collectDay({
  db,
  branchId,
  date,
  readBatch,
  now = () => new Date(),
}) {
  const scope = { branch_id: branchId, service_date: date };
  await db("billing_collection_days")
    .where(scope)
    .update({
      status: "RUNNING",
      last_attempt_at: now(),
      attempts: db.raw("attempts + 1"),
      error_code: null,
    });
  try {
    const [listed] = await readBatch([{ kind: "schedules" }]);
    if (!listed?.items?.length || listed.hasMore)
      throw failure("STENCI_SCHEDULES_INCOMPLETE");
    const known = await db("billing_stenci_schedules").where({
      branch_id: branchId,
    });
    const schedules = new Map(
      known.map((s) => [
        s.external_id,
        {
          id: s.external_id,
          name: s.name,
          place: s.place_external_id
            ? { id: s.place_external_id, name: s.place_name }
            : null,
        },
      ]),
    );
    for (const schedule of listed.items) {
      if (!/^[a-f0-9]{24,32}$/i.test(schedule.id) || !schedule.name)
        throw failure("STENCI_SCHEDULE_INVALID");
      schedules.set(schedule.id, schedule);
    }
    const snapshots = [],
      all = [...schedules.values()].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < all.length; i += 4) {
      const group = all.slice(i, i + 4),
        results = await readBatch(
          group.map((s) => ({ kind: "calendar", date, scheduleId: s.id })),
        );
      if (results.length !== group.length)
        throw failure("STENCI_CALENDAR_INCOMPLETE");
      group.forEach((schedule, index) =>
        snapshots.push({ schedule, data: results[index] }),
      );
    }
    // readBatch returns only AFTER confirmed remote logout. A failed agenda never replaces a day.
    const records = normalizeDay(branchId, date, snapshots, now());
    await db.transaction(async (trx) => {
      await trx("billing_stenci_schedules")
        .insert(
          all.map((s) => ({
            branch_id: branchId,
            external_id: s.id,
            name: s.name,
            place_external_id: s.place?.id || null,
            place_name: s.place?.name || null,
            last_seen_at: now(),
          })),
        )
        .onConflict(["branch_id", "external_id"])
        .merge();
      await trx("billing_stenci_appointments").where(scope).delete();
      for (let i = 0; i < records.length; i += 100)
        await trx("billing_stenci_appointments")
          .insert(records.slice(i, i + 100))
          .onConflict(["branch_id", "external_id"])
          .merge();
      await trx("billing_collection_days").where(scope).update({
        status: "COMPLETE",
        last_success_at: now(),
        schedule_count: all.length,
        appointment_count: records.length,
        retry_at: null,
        error_code: null,
      });
    });
    return records.length;
  } catch (error) {
    const code = /^[A-Z0-9_]{1,80}$/.test(error.code || "")
      ? error.code
      : "COLLECTION_FAILED";
    await db("billing_collection_days")
      .where(scope)
      .update({
        status: "FAILED",
        error_code: code,
        retry_at: new Date(now().getTime() + 15 * 60_000),
      });
    throw error;
  }
}
function agendaSummary(
  rows,
  coverage,
  start,
  end,
  evaluations = [],
  { includeInactive = false } = {},
) {
  const excluded = new Set([
    "patient_canceled",
    "professional_canceled",
    "canceled",
    "rescheduled",
    "available",
  ]);
  const valid = includeInactive
      ? rows
      : rows.filter((r) => !excluded.has(r.status)),
    seen = new Set();
  const unique = valid.filter(
    (r) => !seen.has(r.external_id) && seen.add(r.external_id),
  );
  const totals = {
    appointments: unique.length,
    patients: new Set(unique.map((r) => r.patient_external_id)).size,
    evaluations: unique.filter((r) => r.is_evaluation).length,
    sessions: unique.filter((r) => r.is_session).length,
    finished: unique.filter((r) => r.status === "finished").length,
    missed: unique.filter((r) => r.status === "missed").length,
    evolutionPending: unique.filter((r) => r.status === "finished").length,
  };
  const assessed = new Map();
  for (const row of [
    ...evaluations,
    ...unique.filter((r) => r.is_evaluation && r.status === "finished"),
  ]) {
    const time = Date.parse(row.start_at);
    if (
      !assessed.has(row.patient_external_id) ||
      time < assessed.get(row.patient_external_id)
    )
      assessed.set(row.patient_external_id, time);
  }
  totals.evaluatedWithSessions = new Set(
    unique
      .filter(
        (r) =>
          r.is_session &&
          assessed.has(r.patient_external_id) &&
          Date.parse(r.start_at) >= assessed.get(r.patient_external_id),
      )
      .map((r) => r.patient_external_id),
  ).size;
  const byDate = new Map(),
    byStatus = new Map(),
    byInsurance = new Map();
  for (const row of unique) {
    const day = dateText(row.service_date);
    byDate.set(day, (byDate.get(day) || 0) + 1);
    byStatus.set(row.status, (byStatus.get(row.status) || 0) + 1);
    const insurer = row.insurance_name || "Sem convênio";
    byInsurance.set(insurer, (byInsurance.get(insurer) || 0) + 1);
  }
  const successful = new Set(
    coverage
      .filter((r) => r.last_success_at)
      .map((r) => dateText(r.service_date)),
  );
  const fresh = new Set(
    coverage
      .filter((r) => r.status === "COMPLETE")
      .map((r) => dateText(r.service_date)),
  );
  const dates = daysBetween(start, end),
    latest =
      coverage
        .map((r) => r.last_success_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0] || null;
  return {
    totals: successful.size ? totals : null,
    coverage: {
      days: dates.length,
      collectedDays: dates.filter((d) => successful.has(d)).length,
      currentDays: dates.filter((d) => fresh.has(d)).length,
      pendingDays: dates.filter((d) => !successful.has(d)).length,
      failedDays: coverage.filter((r) => r.status === "FAILED").length,
      lastSuccessAt: latest,
      complete: dates.every((d) => fresh.has(d)),
    },
    daily: [...byDate].sort().map(([label, value]) => ({ label, value })),
    statuses: [...byStatus].map(([label, value]) => ({ label, value })),
    insurers: [...byInsurance]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    alerts: unique
      .filter((r) => r.status === "finished" || r.status === "missed")
      .map((r) => ({
        id: r.external_id,
        patient_name: r.patient_name,
        insurance_name: r.insurance_name,
        date: dateText(r.service_date),
        schedule_name: r.schedule_name,
        place_name: r.place_name || null,
        reason:
          r.status === "finished"
            ? "Evolução pendente — regra temporária"
            : "Falta registrada — conferir reagendamento",
      })),
  };
}
module.exports = {
  dateText,
  localToday,
  daysBetween,
  normalizeDay,
  enqueueRange,
  collectDay,
  agendaSummary,
};
