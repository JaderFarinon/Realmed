const crypto = require("node:crypto");
const { getStenciConfig } = require("../../integrations/stenci/config");
const StenciClient = require("../../integrations/stenci/StenciClient"),
  StenciService = require("../../integrations/stenci/StenciService");
const { withTransientStenci } = require("./transientStenciService");
const credentialsStore = require("./billingCollectorCredentials");
const {
  localToday,
  dateText,
  enqueueRange,
  collectDay,
} = require("./billingAgendaCollection");
const state = { running: false, lastError: null, pauseUntil: 0 };
function serviceBatch({
  configFactory = getStenciConfig,
  store = credentialsStore,
  serviceFactory,
} = {}) {
  return async (operations) => {
    const credentials = store.readCredentials();
    try {
      const config = configFactory();
      if (credentials.branchId !== config.branchId)
        throw Object.assign(
          new Error("Conta da coleta não corresponde à unidade."),
          { code: "COLLECTOR_BRANCH_MISMATCH" },
        );
      const service = serviceFactory
        ? serviceFactory(config)
        : new StenciService(
            new StenciClient({
              config: { ...config, timeoutMs: 10000 },
              deadlineAt: Date.now() + 35000,
              logger: { info() {}, warn() {}, error() {} },
            }),
          );
      return await withTransientStenci(service, async () => {
        const identity = await service.authenticateUser(
          credentials.username,
          credentials.password,
          crypto.randomUUID().replace(/-/g, ""),
        );
        if (identity.stenci_user_id !== credentials.stenciUserId)
          throw Object.assign(new Error("Identidade da coleta alterada."), {
            code: "COLLECTOR_IDENTITY_MISMATCH",
          });
        const results = [];
        for (const operation of operations)
          results.push(await service.billingRead(operation));
        return results;
      });
    } finally {
      credentials.username = "";
      credentials.password = "";
    }
  };
}
async function tick(
  db,
  {
    now = new Date(),
    readBatch = serviceBatch(),
    isConfigured = credentialsStore.configured,
    branchId = getStenciConfig().branchId,
    maxDays = 2,
    enabled = getStenciConfig().enabled,
  } = {},
) {
  if (!branchId || !enabled || now.getTime() < state.pauseUntil) return;
  if (
    state.running ||
    process.env.STENCI_BILLING_COLLECTION_ENABLED === "false"
  )
    return;
  state.running = true;
  let connection,
    locked = false;
  const lockName =
    "rm_bill_" +
    crypto.createHash("sha256").update(branchId).digest("hex").slice(0, 24);
  try {
    connection = await db.client.acquireConnection();
    const [lockRows] = await db
      .raw("SELECT GET_LOCK(?,0) AS acquired", [lockName])
      .connection(connection);
    locked = Number(lockRows[0].acquired) === 1;
    if (!locked) return;
    const today = localToday(now),
      oldest = await db("billing_collection_days")
        .where({ branch_id: branchId })
        .where("service_date", "<=", today)
        .min("service_date as first")
        .first();
    const start =
      process.env.STENCI_BILLING_COLLECTION_START ||
      (oldest?.first ? dateText(oldest.first) : today.slice(0, 7) + "-01");
    await enqueueRange(db, branchId, start, today, now);
    // A crashed worker cannot leave a day permanently RUNNING. This branch lock proves no other worker owns it.
    await db("billing_collection_days")
      .where({ branch_id: branchId, status: "RUNNING" })
      .update({ status: "QUEUED" });
    const recent = new Date(Date.parse(today) - 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    );
    const completed = await db("billing_collection_days")
      .where({ branch_id: branchId, status: "COMPLETE" })
      .whereBetween("service_date", [recent, today]);
    for (const day of completed) {
      const date = dateText(day.service_date),
        last = new Date(day.last_success_at);
      if (
        (date === today && now - last >= 3600000) ||
        (date < today && hour >= 3 && localToday(last) < today)
      )
        await db("billing_collection_days")
          .where({
            branch_id: branchId,
            service_date: date,
            status: "COMPLETE",
          })
          .update({ status: "QUEUED", retry_at: null });
    }
    if (!isConfigured()) {
      state.lastError = "COLLECTOR_CREDENTIALS_REQUIRED";
      return;
    }
    const due = await db("billing_collection_days")
      .where({ branch_id: branchId })
      .whereIn("status", ["QUEUED", "FAILED"])
      .where((q) => q.whereNull("retry_at").orWhere("retry_at", "<=", now))
      .orderByRaw(
        "CASE WHEN service_date > ? THEN 2 WHEN service_date >= ? THEN 0 ELSE 1 END",
        [today, recent],
      )
      .orderBy("service_date", "desc")
      .limit(maxDays);
    for (const day of due) {
      try {
        await collectDay({
          db,
          branchId,
          date: dateText(day.service_date),
          readBatch,
        });
        state.lastError = null;
      } catch (error) {
        state.lastError = /^[A-Z0-9_]+$/.test(error.code || "")
          ? error.code
          : "COLLECTION_FAILED";
        state.pauseUntil = Date.now() + 15 * 60_000;
        console.error("[Coleta agenda]", state.lastError);
        break;
      }
    }
  } catch (error) {
    state.lastError = /^[A-Z0-9_]+$/.test(error.code || "")
      ? error.code
      : "COLLECTION_FAILED";
    console.error("[Coleta agenda]", state.lastError);
  } finally {
    try {
      if (connection) {
        try {
          if (locked) await db.raw("SELECT RELEASE_LOCK(?)", [lockName]).connection(connection);
        } finally { await db.client.releaseConnection(connection) }
      }
    } catch { state.lastError='COLLECTION_LOCK_RELEASE_FAILED' }
    finally { state.running = false }
  }
}
function startWorker(db) {
  const timer = setInterval(() => {
    void tick(db);
  }, 60000);
  timer.unref();
  const first = setTimeout(() => {
    void tick(db);
  }, 2000);
  first.unref();
  return () => {
    clearInterval(timer);
    clearTimeout(first);
  };
}
module.exports = { state, serviceBatch, tick, startWorker };
