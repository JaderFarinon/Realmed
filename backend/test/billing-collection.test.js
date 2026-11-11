const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  normalizeDay,
  agendaSummary,
  daysBetween,
} = require("../services/billingAgendaCollection");
const schedule = { id: "a".repeat(24), name: "Avaliação" };
const record = (id = "one", status = "finished") => ({
  id,
  patient_id: "p",
  patient_name: "Paciente fictício",
  startDate: "2026-10-19T12:00:00Z",
  status,
  expenses: [{ code: "50000160", type: "session" }],
});
test("daily snapshot deduplicates appointments across agendas and fails on conflicting state or wrong timezone date", () => {
  const snapshots = [
    { schedule, data: { items: [record()] } },
    {
      schedule: { id: "b".repeat(24), name: "Fisioterapia" },
      data: { items: [record()] },
    },
  ];
  const rows = normalizeDay("branch", "2026-10-19", snapshots);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].is_evaluation, true);
  assert.equal(rows[0].is_session, true);
  snapshots[1].data.items[0].status = "missed";
  assert.throws(() => normalizeDay("branch", "2026-10-19", snapshots), {
    code: "STENCI_DUPLICATE_CONFLICT",
  });
  assert.throws(
    () =>
      normalizeDay("branch", "2026-10-19", [
        {
          schedule,
          data: { items: [{ ...record(), startDate: "2026-10-19T01:00:00Z" }] },
        },
      ]),
    { code: "STENCI_APPOINTMENT_DATE_MISMATCH" },
  );
});
test("analytics distinguishes missing coverage from zero and counts patients separately from sessions", () => {
  assert.equal(agendaSummary([], [], "2026-10-19", "2026-10-20").totals, null);
  const rows = normalizeDay("b", "2026-10-19", [
    {
      schedule,
      data: {
        items: [
          record("one"),
          record("two", "missed"),
          record("cancel", "patient_canceled"),
        ],
      },
    },
  ]);
  const result = agendaSummary(
    rows,
    [
      {
        service_date: "2026-10-19",
        status: "COMPLETE",
        last_success_at: new Date(),
      },
    ],
    "2026-10-19",
    "2026-10-20",
  );
  assert.equal(result.totals.appointments, 2);
  assert.equal(result.totals.patients, 1);
  assert.equal(result.totals.sessions, 2);
  assert.equal(result.totals.missed, 1);
  assert.equal(result.coverage.complete, false);
  assert.equal(result.coverage.pendingDays, 1);
  assert.equal(result.alerts.length, 2);
  assert.equal(
    agendaSummary(
      [],
      [
        {
          service_date: "2026-10-19",
          status: "COMPLETE",
          last_success_at: new Date(),
        },
      ],
      "2026-10-19",
      "2026-10-19",
    ).totals.appointments,
    0,
  );
  assert.deepEqual(daysBetween("2026-12-31", "2027-01-01"), [
    "2026-12-31",
    "2027-01-01",
  ]);
});
test("dedicated account always logs out before results and rejects changed identity", async () => {
  const { serviceBatch } = require("../services/billingCollectorWorker");
  let events = [];
  const store = {
    readCredentials: () => ({
      username: "u",
      password: "private",
      stenciUserId: "id",
      branchId: "b",
    }),
  };
  const factory = () => ({
    authenticateUser: async () => {
      events.push("login");
      return { stenci_user_id: "id" };
    },
    billingRead: async () => {
      events.push("read");
      return { items: [] };
    },
    logout: async () => {
      events.push("logout");
    },
  });
  const read = serviceBatch({
    store,
    configFactory: () => ({ branchId: "b" }),
    serviceFactory: factory,
  });
  await read([{ kind: "schedules" }]);
  assert.deepEqual(events, ["login", "read", "logout"]);
  events = [];
  await assert.rejects(
    serviceBatch({
      store,
      configFactory: () => ({ branchId: "b" }),
      serviceFactory: () => ({
        ...factory(),
        authenticateUser: async () => ({ stenci_user_id: "other" }),
      }),
    })([{ kind: "schedules" }]),
    { code: "COLLECTOR_IDENTITY_MISMATCH" },
  );
  assert.deepEqual(events, ["logout"]);
});
test("collector credential file is encrypted and tampering is rejected", () => {
  const fs = require("node:fs"),
    os = require("node:os"),
    path = require("node:path"),
    store = require("../services/billingCollectorCredentials");
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "realmed-billing-secret-test-"),
  );
  try {
    store.writeCredentials(
      {
        username: "private-user",
        password: "private-password",
        stenciUserId: "id",
        branchId: "b",
      },
      dir,
    );
    const text = fs.readFileSync(path.join(dir, "credentials.json"), "utf8");
    assert.equal(text.includes("private"), false);
    assert.equal(store.readCredentials(dir).password, "private-password");
    const bad = JSON.parse(text);
    bad.tag = Buffer.alloc(16).toString("base64");
    fs.writeFileSync(path.join(dir, "credentials.json"), JSON.stringify(bad));
    assert.throws(() => store.readCredentials(dir));
  } finally {
    for (const file of ["credentials.json", "key.bin"]) {
      const p = path.join(dir, file);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    fs.rmdirSync(dir);
  }
});
