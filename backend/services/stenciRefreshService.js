const crypto = require("node:crypto");
const {
  withTransientStenci,
  operationKey,
  detachedService,
} = require("./transientStenciService");
const { getStenciConfig } = require("../../integrations/stenci/config");
const StenciClient = require("../../integrations/stenci/StenciClient");
const StenciService = require("../../integrations/stenci/StenciService");
const states = new WeakMap();
const expired = () =>
  Object.assign(new Error("Sua sessão Realmed terminou."), {
    status: 401,
    code: "AUTH_SESSION_EXPIRED",
  });
const credentialsRequired = () =>
  Object.assign(
    new Error(
      "Confirme sua conta Stenci para retomar as consultas automáticas.",
    ),
    { status: 428, code: "STENCI_REFRESH_REQUIRED" },
  );

async function execute(job, operations) {
  const {
    sid,
    session,
    sessionStore,
    configFactory = getStenciConfig,
    serviceFactory,
    logger = console,
  } = job;
  if (sessionStore.get(sid) !== session) throw expired();
  const credentials = job.credentials
    ? { ...job.credentials }
    : sessionStore.getCredentials(sid);
  if (!credentials) throw credentialsRequired();
  try {
    const configured = configFactory();
    const config = {
      ...configured,
      timeoutMs: Math.min(Number(configured.timeoutMs) || 10000, 10000),
    };
    const service = serviceFactory
      ? serviceFactory(config)
      : new StenciService(
          new StenciClient({
            config,
            deadlineAt:
              Date.now() +
              (operations.some((op) => op.name === "rotationRead")
                ? 120000
                : 35000),
          }),
        );
    const results = await withTransientStenci(
      service,
      async () => {
        const identity = await service.authenticateUser(
          credentials.username,
          credentials.password,
          crypto.randomUUID().replace(/-/g, ""),
        );
        if (String(identity.stenci_user_id) !== String(session.stenciUserId))
          throw Object.assign(
            new Error(
              "Use a mesma conta Stenci vinculada ao seu acesso Realmed.",
            ),
            { status: 422, code: "STENCI_ACCOUNT_MISMATCH" },
          );
        const results = [];
        for (const operation of operations) {
          if (sessionStore.get(sid) !== session) throw expired();
          const value =
            operation.name === "searchPatients"
              ? await service.searchPatients(operation.search, {
                  limit: operation.limit,
                  offset: operation.offset,
                })
              : operation.name === "rotationRead"
                ? await service.rotationRead(operation)
                : operation.name === "billingRead"
                  ? await service.billingRead(operation)
                  : operation.name === 'physioRead'
                    ? await service.physioRead(operation)
                  : await service[operation.name]();
          results.push({
            key: operationKey(operation.name, operation),
            value,
            createdAt: Date.now(),
          });
        }
        return results;
      },
      logger,
    );
    if (sessionStore.get(sid) !== session) throw expired();
    if (job.credentials) sessionStore.setCredentials(sid, credentials);
    for (const result of results) {
      session.cache.delete(result.key);
      session.cache.set(result.key, result);
    }
    while (session.cache.size > 100)
      session.cache.delete(session.cache.keys().next().value);
    return results;
  } catch (error) {
    if (
      ["STENCI_INVALID_CREDENTIALS", "STENCI_ACCOUNT_MISMATCH"].includes(
        error.code,
      )
    ) {
      sessionStore.clearCredentials(sid);
      if (!job.credentials) throw credentialsRequired();
    }
    throw error;
  } finally {
    credentials.password = "";
    credentials.username = "";
  }
}

// One queue per Realmed session, shared by all routes and explicit refreshes.
// Automatic requests arriving together share a single short-lived Stenci login.
function refreshStenci(options) {
  if (options.operations?.some(operation => operation.name === 'physioRead') && options.scope !== 'physio') return Promise.reject(Object.assign(new Error('Consulta restrita à área do fisioterapeuta.'), {status:403,code:'PHYSIO_SCOPE_REQUIRED'}));
  const session = options.sessionStore.get(options.sid);
  if (!session) return Promise.reject(expired());
  if(session.mode==='physio-shared' && options.scope!=='physio')return Promise.reject(Object.assign(new Error('A conexão compartilhada está disponível somente na área do fisioterapeuta.'),{status:403,code:'PHYSIO_SCOPE_REQUIRED'}));
  let state = states.get(session);
  if (!state) {
    state = { pending: [], running: false };
    states.set(session, state);
  }
  return new Promise((resolve, reject) => {
    state.pending.push({ ...options, session, resolve, reject });
    if (!state.running) {
      state.running = true;
      setTimeout(() => drain(state), 20);
    }
  });
}
async function drain(state) {
  while (state.pending.length) {
    const first = state.pending.shift(),
      jobs = [first];
    const operations = new Map(
      first.operations.map((op) => [operationKey(op.name, op), op]),
    );
    while (
      !first.credentials &&
      state.pending.length &&
      !state.pending[0].credentials
    ) {
      const next = state.pending[0],
        keys = next.operations.map((op) => operationKey(op.name, op));
      if (new Set([...operations.keys(), ...keys]).size > 8) break;
      state.pending.shift();
      jobs.push(next);
      for (const op of next.operations)
        operations.set(operationKey(op.name, op), op);
    }
    try {
      const results = await execute(first, [...operations.values()]);
      // Resolve values now; testConnection is deliberately consumed on read.
      for (const job of jobs) job.resolve(results);
    } catch (error) {
      for (const job of jobs) job.reject(error);
    } finally {
      for (const job of jobs)
        if (job.credentials) {
          job.credentials.password = "";
          job.credentials.username = "";
        }
    }
  }
  state.running = false;
}
function automaticService(options) {
  const session = options.sessionStore.get(options.sid);
  if(session?.mode==='physio-shared' && options.scope!=='physio')throw Object.assign(new Error('A conexão compartilhada está disponível somente na área do fisioterapeuta.'),{status:403,code:'PHYSIO_SCOPE_REQUIRED'});
  const cache = detachedService(session);
  const run = async (name, operation, args) => {
    try {
      if (name === "rotationRead") throw credentialsRequired(); // Availability must always be live.
      return await cache[name](...args);
    } catch (error) {
      if (error.code !== "STENCI_REFRESH_REQUIRED") throw error;
    }
    // No credentials are sent to the browser. A legacy session prompts once.
    if (!options.sessionStore.hasCredentials(options.sid))
      throw credentialsRequired();
    const results = await refreshStenci({
      ...options,
      operations: [operation],
    });
    if (name === "testConnection") session.cache.delete(operationKey(name));
    return results.find(
      (result) => result.key === operationKey(name, operation),
    ).value;
  };
  return {
    rotationRead: (options) =>
      run("rotationRead", { name: "rotationRead", ...options }, [options]),
    billingRead: (options) =>
      run("billingRead", { name: "billingRead", ...options }, [options]),
    searchPatients: (search, opts = {}) =>
      run("searchPatients", { name: "searchPatients", search, ...opts }, [
        search,
        opts,
      ]),
    ...Object.fromEntries(
      [
        "listInsurances",
        "listInsurancePlans",
        "listProfessionals",
        "testConnection",
      ].map((name) => [name, () => run(name, { name }, [])]),
    ),
  };
}
module.exports = { refreshStenci, automaticService };
