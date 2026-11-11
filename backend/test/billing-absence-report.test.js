const test = require("node:test"),
  assert = require("node:assert/strict");
const { buildAbsenceReport } = require("../services/billingAbsenceReport");
const miss = (id, date, patient = "p", status = "missed") => ({
  external_id: id,
  patient_external_id: patient,
  patient_name: patient === "p" ? "Paciente A" : "Paciente B",
  service_date: date,
  start_at: date + "T12:00:00Z",
  status,
  schedule_id: "s",
  schedule_name: "Agenda",
  schedule_memberships: JSON.stringify([
    { id: "s", name: "Agenda", place_id: "l", place_name: "Matriz" },
  ]),
});
const args = { date: "2026-10-20", historyStart: "2026-10-01", coverage: [] };
test("daily report starts at third consecutive miss, deduplicates agendas and excludes cancellations and future history", () => {
  const rows = [
    miss("1", "2026-10-02"),
    miss("2", "2026-10-08"),
    miss("3", "2026-10-20"),
    miss("3", "2026-10-20"),
    miss("4", "2026-10-21"),
    miss("5", "2026-10-15", "p", "patient_canceled"),
    miss("q1", "2026-10-01", "q"),
    miss("q2", "2026-10-02", "q"),
    miss("q3", "2026-10-03", "q"),
  ];
  const report = buildAbsenceReport({
    ...args,
    rows,
    contacts: [{ external_id: "p", phone: "(00) 0000-0000" }],
  });
  assert.equal(report.total, 1);
  assert.equal(report.items[0].total_misses, 3);
  assert.equal(report.items[0].prior_misses, 2);
  assert.equal(report.items[0].daily_misses, 1);
  assert.equal(report.items[0].phone, "(00) 0000-0000");
  assert.equal(report.items[0].history.length, 3);
  assert.equal(report.coverage.complete, false);
  assert.equal(buildAbsenceReport({ ...args, rows, rule: "prior3" }).total, 0);
  rows.push(miss("prior", "2026-10-19"));
  assert.equal(buildAbsenceReport({ ...args, rows, rule: "prior3" }).total, 1);
});
test("misses outside history are excluded, patients remain independent, no missed appointment today means no phone list", () => {
  const rows = [
    miss("old", "2026-09-01"),
    miss("a", "2026-10-02"),
    miss("b", "2026-10-20"),
    miss("q1", "2026-10-01", "q"),
    miss("q2", "2026-10-02", "q"),
    miss("q3", "2026-10-20", "q"),
  ];
  const report = buildAbsenceReport({ ...args, rows });
  assert.equal(report.total, 1);
  assert.equal(report.items[0].id, "q");
  assert.equal(report.items[0].phone, null);
  assert.equal(
    buildAbsenceReport({
      ...args,
      rows: rows.filter((row) => row.patient_external_id === "p"),
    }).total,
    0,
  );
  assert.throws(() => buildAbsenceReport({ ...args, rows, rule: "bad" }), {
    status: 400,
  });
});
test("coverage counts missing and stale days instead of claiming complete history", () => {
  const report = buildAbsenceReport({
    ...args,
    historyStart: "2026-10-19",
    rows: [],
    coverage: [
      {
        service_date: "2026-10-19",
        status: "COMPLETE",
        last_success_at: new Date(),
      },
      {
        service_date: "2026-10-20",
        status: "FAILED",
        last_success_at: new Date(),
      },
    ],
  });
  assert.equal(report.coverage.collectedDays, 2);
  assert.equal(report.coverage.currentDays, 1);
  assert.equal(report.coverage.failedDays, 1);
  assert.equal(report.coverage.complete, false);
});

test("attendance interrupts consecutive misses; cancellations do not count or interrupt", () => {
  const rows = [
    miss("1", "2026-10-02"),
    miss("2", "2026-10-03"),
    miss("attendance", "2026-10-04", "p", "finished"),
    miss("3", "2026-10-20"),
  ];
  assert.equal(buildAbsenceReport({ ...args, rows }).total, 0);
  rows.push(
    miss("4", "2026-10-18"),
    miss("5", "2026-10-19"),
    miss("cancel", "2026-10-19", "p", "canceled"),
  );
  const report = buildAbsenceReport({ ...args, rows });
  assert.equal(report.total, 1);
  assert.equal(report.items[0].total_misses, 3);
  assert.deepEqual(
    report.items[0].history.map((r) => r.id),
    ["4", "5", "3"],
  );
  rows.push({
    ...miss("later", "2026-10-20", "p", "finished"),
    start_at: "2026-10-20T18:00:00Z",
  });
  assert.equal(buildAbsenceReport({ ...args, rows }).total, 0);
});
