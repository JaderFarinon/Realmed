const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  normalize,
  blocks,
  rank,
  matrixSchedules,
} = require("../services/physiotherapyRotation");
const { rotationRead } = require("../../integrations/stenci/rotationRead");
const day = (day = "MONDAY", time = "14:00") => ({ day, time, enabled: true });
const request = () =>
  normalize({
    startDate: "2026-11-02",
    total: 6,
    days: [day(), day("WEDNESDAY"), day("FRIDAY")],
  });
const slots = (date, time = "14:00", free = 6) =>
  Array.from({ length: 6 }, (_, i) => ({
    startDate:
      date +
      "T" +
      time.slice(0, 3) +
      String(Number(time.slice(3)) + i).padStart(2, "0") +
      ":00-03:00",
    status: i < free ? "available" : "scheduled",
  }));
const agendas = [
  { schedule_id: "a".repeat(24), professional_id: 1 },
  { schedule_id: "b".repeat(24), professional_id: 2 },
];
const snapshots = (req, freeA = 6, freeB = 6) =>
  Object.fromEntries(
    agendas.flatMap((a) =>
      req.sessions.map((s) => [
        a.schedule_id + ":" + s.date,
        slots(s.date, "14:00", a.professional_id === 1 ? freeA : freeB),
      ]),
    ),
  );
test("all sessions are enumerated across all weekdays, not just first week", () => {
  const r = request();
  assert.equal(r.sessions.length, 6);
  assert.equal(r.sessions.at(-1).date, "2026-11-13");
  assert.throws(() => normalize({ ...r, total: 0 }));
  assert.throws(() => normalize({ ...r, startDate: "2026-02-30" }));
});
test("six one-minute rows form one session, duplicates do not add capacity", () => {
  const rows = slots("2026-11-02", "08:00", 4);
  assert.deepEqual(blocks([...rows, ...rows], "2026-11-02"), [
    { base: 480, capacity: 6, free: 4, slot: 480 },
  ]);
  assert.equal(
    blocks([...rows, { ...rows[0], status: "blocked" }], "2026-11-02")[0].free,
    3,
  );
  assert.equal(blocks([], "2026-11-02").length, 0);
});
test("requires all days and all future sessions; missing Friday excludes professional", () => {
  const r = request(),
    s = snapshots(r);
  delete s[agendas[0].schedule_id + ":2026-11-13"];
  assert.equal(rank(r, agendas, s)[0].professional_id, 2);
  assert.equal(rank(r, agendas, s).length, 1);
});
test("nearest session and 25-minute tolerance are evaluated on session time, not one-minute place", () => {
  const r = normalize({ startDate: "2026-11-02", total: 1, days: [day()] });
  const s = snapshots(r);
  s[agendas[0].schedule_id + ":2026-11-02"] = slots("2026-11-02", "14:25");
  s[agendas[1].schedule_id + ":2026-11-02"] = slots("2026-11-02", "14:26");
  const c = rank(r, agendas, s);
  assert.equal(c.length, 1);
  assert.equal(c[0].sessions[0].session_time, "14:25");
  s[agendas[0].schedule_id + ":2026-11-02"] = slots("2026-11-02", "13:35");
  assert.equal(rank(r, agendas, s).length, 1);
});
test("availability balances first and confirmed indications break ties without counting previews", () => {
  const r = request();
  assert.equal(rank(r, agendas, snapshots(r, 2, 6))[0].professional_id, 2);
  assert.equal(
    rank(r, agendas, snapshots(r), [{ professional_id: 1, sequence: 1 }])[0]
      .professional_id,
    2,
  );
});
test("same weekday needs a recurring session time, not changing weekly hours", () => {
  const r = request(),
    s = snapshots(r);
  s[agendas[0].schedule_id + ":2026-11-09"] = slots("2026-11-09", "14:20");
  assert.equal(rank(r, agendas, s)[0].professional_id, 2);
});
test("only matrix active schedule source and no evaluations, no loose unit name match", () => {
  assert.deepEqual(
    matrixSchedules([
      { id: "a", name: "Fisio", place: { id: "m", name: "Realmed Matriz" } },
      {
        id: "b",
        name: "Avaliação",
        place: { id: "m", name: "Realmed Matriz" },
      },
      {
        id: "c",
        name: "Fisio",
        place: { id: "x", name: "Realmed Matriz Anexo" },
      },
    ]).map((s) => s.id),
    ["a"],
  );
});
test("availability reads every date, strips patient information and rejects partial responses", async () => {
  const req = request(),
    id = agendas[0].schedule_id,
    calls = [];
  const client = {
    assertAuthenticated() {},
    async request(path, { query }) {
      calls.push(path);
      if (path === "/v1/schedules")
        return {
          items: [
            { id, name: "Fisio", place: { id: "m", name: "Realmed Matriz" } },
          ],
        };
      return {
        items: [
          {
            ...slots(query.date)[0],
            patient: { id: "secret", name: "private" },
          },
        ],
      };
    },
  };
  const result = await rotationRead(client, {
    kind: "availability",
    request: req,
    scheduleIds: [id],
  });
  assert.equal(Object.keys(result.snapshots).length, 6);
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.equal(Object.values(result.snapshots)[0][0].status, "occupied");
  assert.equal(calls.length, 7);
  client.request = async (path) =>
    path === "/v1/schedules"
      ? {
          items: [
            { id, name: "Fisio", place: { id: "m", name: "Realmed Matriz" } },
          ],
        }
      : { items: [], hasMore: true };
  await assert.rejects(
    rotationRead(client, {
      kind: "availability",
      request: req,
      scheduleIds: [id],
    }),
  );
});

test("live rotation reads use temporary login/logout every time and do not publish failed logout results", async () => {
  const { StenciSessionStore } = require("../services/StenciSessionStore");
  const { automaticService } = require("../services/stenciRefreshService");
  const store = new StenciSessionStore(),
    session = {
      mode: "detached",
      stenciUserId: "external-user",
      cache: new Map(),
    },
    sid = store.create(session);
  store.setCredentials(sid, { username: "synthetic", password: "synthetic" });
  let logins = 0,
    logouts = 0,
    failLogout = false;
  const api = automaticService({
    sid,
    sessionStore: store,
    configFactory: () => ({}),
    logger: { error() {} },
    serviceFactory: () => ({
      async authenticateUser() {
        logins++;
        return { stenci_user_id: "external-user" };
      },
      async rotationRead() {
        return { value: logins };
      },
      async logout() {
        logouts++;
        if (failLogout)
          throw Object.assign(new Error("network"), { code: "TEST_NETWORK" });
      },
    }),
  });
  try {
    assert.equal((await api.rotationRead({ kind: "options" })).value, 1);
    assert.equal((await api.rotationRead({ kind: "options" })).value, 2);
    assert.equal(logouts, 2);
    failLogout = true;
    await assert.rejects(api.rotationRead({ kind: "options" }), {
      code: "STENCI_LOGOUT_FAILED",
    });
    assert.equal(logins, 3);
    assert.equal(logouts, 4);
    assert.equal(store.hasCredentials(sid), true);
  } finally {
    store.clear();
  }
});
