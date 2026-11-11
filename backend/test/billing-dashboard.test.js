const { test } = require("node:test");
const assert = require("node:assert/strict");
const { period, summarize } = require("../services/billingDashboard");
test("período exige datas reais e limite de consulta", () => {
  assert.equal(
    period({ start: "2026-01-01", end: "2026-01-31" }).next,
    "2026-02-01",
  );
  for (const q of [
    { start: "2026-02-30", end: "2026-03-01" },
    { start: "2026-02-01", end: "2026-01-01" },
    { start: "2020-01-01", end: "2026-01-01" },
    { start: "x", end: "x" },
  ])
    assert.throws(() => period(q));
});
test("painel não confunde guia faturada com tratamento, nem avaliação com presença", () => {
  const result = summarize(
    [
      {
        id: 1,
        created_date: "2026-10-01",
        assessment_date: "2026-10-02",
        patient_name: "A",
        document_status: "INCOMPLETE",
        billing_status: "READY",
        treatment_status: "COMPLETED",
        authorized_sessions: 10,
        performed_sessions: 11,
      },
      {
        id: 2,
        created_date: "2026-10-01",
        billing_status: "BILLED",
        treatment_status: "IN_PROGRESS",
        evaluation_status: "COMPLETED",
      },
    ],
    "2026-10-19",
  );
  assert.equal(result.totals.completed, 1);
  assert.equal(result.totals.evaluated, 1);
  assert.equal(result.alerts.length, 1);
  assert.match(result.alerts[0].reasons, /acima das autorizadas/);
  assert.equal(result.aging[2].value, 1);
  assert.equal(result.sources.invoices, false);
  assert.equal(result.sources.agenda, false);
  assert.equal(result.months[0].value, 1);
});
const {
  billingRead,
  billingOptions,
} = require("../../integrations/stenci/billingRead");
const { operationKey } = require("../services/transientStenciService");
test("HAR contracts use safe parameters and keep personal/clinical fields outside cache", async () => {
  const calls = [];
  const client = {
    assertAuthenticated() {},
    async request(path, { query, base }) {
      calls.push({ path, query, base });
      return {
        items: [
          {
            id: "appt",
            patient: {
              id: "p",
              name: "Paciente",
              identity: { value: "secret-cpf" },
            },
            notes: "clinical-secret",
            status: "finished",
            expenses: [
              {
                expense: { name: "Sessão", type: "session" },
                billing: { accountId: "account" },
              },
            ],
          },
          { id: null, isSlot: true },
        ],
        hasMore: false,
      };
    },
  };
  const result = await billingRead(client, {
    kind: "calendar",
    date: "2026-10-19",
    scheduleId: "a".repeat(32),
  });
  assert.equal(calls[0].path, "/v1/calendar");
  assert.equal(calls[0].base, "apiX");
  await billingRead(client, { kind: "invoices", offset: 30 });
  assert.equal(calls[1].base, undefined);
  assert.equal(calls[1].query.offset, 30);
  assert.equal(
    calls[1].query.statuses,
    "open,in_billing,closed,in_appeal,finished,canceled",
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].evolution_status, "PENDING_POLICY");
  assert.equal(result.items[0].expenses[0].accountId, "account");
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.notEqual(
    operationKey("billingRead", {
      kind: "calendar",
      date: "2026-10-19",
      scheduleId: "a".repeat(32),
    }),
    operationKey("billingRead", {
      kind: "calendar",
      date: "2026-10-20",
      scheduleId: "a".repeat(32),
    }),
  );
  for (const input of [
    { kind: "arbitrary" },
    { kind: "account", id: "../auth" },
    { kind: "calendar", date: "2026-99-99", scheduleId: "a".repeat(32) },
    { kind: "invoices", offset: -1 },
  ])
    assert.throws(() => billingOptions(input));
});
test("billing query uses existing temporary login and confirms logout before publishing cache", async () => {
  const { StenciSessionStore } = require("../services/StenciSessionStore");
  const { automaticService } = require("../services/stenciRefreshService");
  const store = new StenciSessionStore(),
    session = { mode: "detached", stenciUserId: "u", cache: new Map() },
    sid = store.create(session);
  store.setCredentials(sid, { username: "u", password: "s" });
  const events = [];
  const service = automaticService({
    sid,
    sessionStore: store,
    configFactory: () => ({}),
    serviceFactory: () => ({
      async authenticateUser() {
        events.push("login");
        return { stenci_user_id: "u" };
      },
      async billingRead(op) {
        events.push(op.kind);
        return { items: [] };
      },
      async logout() {
        events.push("logout");
        assert.equal(session.cache.size, 0);
      },
    }),
  });
  await service.billingRead({ kind: "invoices", offset: 0 });
  await service.billingRead({ kind: "invoices", offset: 0 });
  assert.deepEqual(events, ["login", "invoices", "logout"]);
  store.clear();
});

test("evolution policy flags completed appointments only, regardless of missing procedure classification", async () => {
  const appointments = [
    "finished",
    "missed",
    "scheduled",
    "patient_canceled",
  ].map((status, i) => ({
    id: String(i),
    status,
    patient: { id: "p" },
    expenses: [],
  }));
  const result = await billingRead(
    {
      assertAuthenticated() {},
      async request() {
        return { items: appointments };
      },
    },
    { kind: "calendar", date: "2026-10-19", scheduleId: "a".repeat(32) },
  );
  assert.deepEqual(
    result.items.map((x) => x.evolution_status),
    ["PENDING_POLICY", "NOT_APPLICABLE", "NOT_APPLICABLE", "NOT_APPLICABLE"],
  );
});
