const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  parseFilters,
  applyFilters,
  filterOptions,
} = require("../services/billingAgendaFilters");
const {
  normalizeDay,
  agendaSummary,
} = require("../services/billingAgendaCollection");
const one = {
  id: "a".repeat(24),
  name: "Fisioterapia A",
  place: { id: "place-a", name: "Matriz" },
};
const two = {
  id: "b".repeat(24),
  name: "Fisioterapia B",
  place: { id: "place-b", name: "Hauer" },
};
const appointment = (id, status = "finished") => ({
  id,
  patient_id: id,
  patient_name: "Fictício",
  startDate: "2026-10-20T12:00:00Z",
  status,
  is_physiotherapy: true,
  expenses: [{ type: "session", code: "test" }],
});
test("filters combine membership agenda and place without duplicating shared appointments", () => {
  const rows = normalizeDay("branch", "2026-10-20", [
    {
      schedule: one,
      data: { items: [appointment("shared"), appointment("a")] },
    },
    {
      schedule: two,
      data: { items: [appointment("shared"), appointment("b", "missed")] },
    },
  ]);
  assert.equal(rows.length, 3);
  assert.equal(
    JSON.parse(
      rows.find((row) => row.external_id === "shared").schedule_memberships,
    ).length,
    2,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ scheduleId: two.id, placeId: "place-b" }))
      .length,
    2,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ scheduleId: two.id, placeId: "place-a" }))
      .length,
    0,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ status: "missed" })).length,
    1,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ attendanceType: "physiotherapy" }))
      .length,
    3,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ attendanceType: "evaluation" })).length,
    0,
  );
  const options = filterOptions([], rows);
  assert.equal(options.schedules.length, 2);
  assert.equal(options.places.length, 2);
  assert.equal(options.metadataPending, false);
});
test("evaluation takes priority over physiotherapy and unknown metadata is not guessed", () => {
  const rows = [
    {
      schedule_id: "a",
      is_evaluation: 1,
      is_physiotherapy: 1,
      status: "finished",
    },
    {
      schedule_id: "a",
      is_evaluation: 0,
      is_physiotherapy: null,
      status: "finished",
    },
  ];
  assert.equal(
    applyFilters(rows, parseFilters({ attendanceType: "physiotherapy" }))
      .length,
    0,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ attendanceType: "evaluation" })).length,
    1,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ placeId: "unassigned" })).length,
    2,
  );
  assert.equal(filterOptions([], rows).metadataPending, true);
  for (const input of [
    { attendanceType: "other" },
    { scheduleId: ["a", "b"] },
    { placeId: "bad value" },
  ])
    assert.throws(() => parseFilters(input), { status: 400 });
});
test("canceled status is filterable explicitly, while default keeps active agenda semantics", () => {
  const rows = normalizeDay("b", "2026-10-20", [
    {
      schedule: one,
      data: {
        items: [appointment("one"), appointment("cancel", "patient_canceled")],
      },
    },
  ]);
  assert.equal(applyFilters(rows, parseFilters()).length, 1);
  assert.equal(applyFilters(rows, parseFilters({ status: "all" })).length, 2);
  const filtered = applyFilters(
    rows,
    parseFilters({ status: "patient_canceled" }),
  );
  const result = agendaSummary(
    filtered,
    [
      {
        service_date: "2026-10-20",
        status: "COMPLETE",
        last_success_at: new Date(),
      },
    ],
    "2026-10-20",
    "2026-10-20",
    [],
    { includeInactive: true },
  );
  assert.equal(result.totals.appointments, 1);
  assert.deepEqual(result.statuses, [{ label: "patient_canceled", value: 1 }]);
  assert.equal(result.alerts.length, 0);
});
test("explicit appointment place overrides the agenda place and uses known location names", () => {
  const rows = normalizeDay("b", "2026-10-20", [
    {
      schedule: one,
      data: { items: [{ ...appointment("one"), place_id: "place-b" }] },
    },
    { schedule: two, data: { items: [] } },
  ]);
  const links = JSON.parse(rows[0].schedule_memberships);
  assert.equal(links[0].place_name, "Hauer");
  assert.equal(
    applyFilters(rows, parseFilters({ placeId: "place-a" })).length,
    0,
  );
  assert.equal(
    applyFilters(rows, parseFilters({ placeId: "place-b" })).length,
    1,
  );
});
