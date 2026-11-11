const express = require("express");
const knexFactory = require("knex");
const knexConfig = require("../knexfile");
const auth = require("../middleware/auth");
const {
  modulePermission,
  permissionMiddleware,
  modulePermissionAny,
} = require("../middleware/permission");
const { createIntegrationLog } = require("../services/integrationLogService");
const {
  getStenciConfig,
  publicConfig,
} = require("../../integrations/stenci/config");
const StenciMapper = require("../../integrations/stenci/StenciMapper");
const {
  syncPatientFromStenci,
} = require("../../integrations/stenci/StenciPatientSyncService");
const { stenciSessionStore } = require("../services/StenciSessionStore");
const {
  getAuthenticatedStenciService,
  normalizeStenciSessionError,
} = require("../services/authenticatedStenciService");
const { refreshStenci } = require("../services/stenciRefreshService");

const knex = knexFactory(
  knexConfig[process.env.NODE_ENV || "development"] || knexConfig.development,
);
const admin = [
  permissionMiddleware(["masteradmin", "admin"]),
  modulePermission("integrations"),
];
const safeText = (value, max) =>
  typeof value === "string" && value.length <= max ? value : null;

function validatedPatient(body, externalId) {
  if (!body || String(body.id) !== String(externalId))
    throw Object.assign(new Error("Dados do paciente Stenci inválidos."), {
      status: 422,
    });
  if (!safeText(body.name, 180))
    throw Object.assign(new Error("Dados do paciente Stenci inválidos."), {
      status: 422,
    });
  const insurance = body.patient?.insurance;
  return {
    id: String(body.id),
    identityId: safeText(body.identityId, 120),
    name: body.name,
    identity:
      body.identity?.type === "cpf"
        ? { type: "cpf", value: safeText(body.identity.value, 30) }
        : undefined,
    cellphone: safeText(body.cellphone, 30),
    phone: safeText(body.phone, 30),
    email: safeText(body.email, 180),
    birthDate: safeText(body.birthDate, 10),
    gender: safeText(body.gender, 40),
    socialName: safeText(body.socialName, 180),
    addresses: [],
    patient: {
      cns: safeText(body.patient?.cns, 30),
      insurance:
        insurance?.id && safeText(insurance.name, 180)
          ? {
              id: String(insurance.id),
              name: insurance.name,
              planId: safeText(insurance.planId, 120),
              plan: insurance.plan?.name
                ? {
                    id: safeText(insurance.plan.id, 120),
                    name: safeText(insurance.plan.name, 120),
                  }
                : undefined,
              record: safeText(insurance.record, 80),
              validity: safeText(insurance.validity, 10),
            }
          : null,
    },
  };
}

function createStenciRouter({
  db = knex,
  configFactory = getStenciConfig,
  serviceFactory,
  sessionStore = stenciSessionStore,
  sync = syncPatientFromStenci,
} = {}) {
  const router = express.Router();
  router.use(auth);
  const makeService = (req) =>
    getAuthenticatedStenciService(req, {
      configFactory,
      serviceFactory,
      sessionStore,
    });
  const log = async (entry) => {
    try {
      await createIntegrationLog(db, entry);
    } catch (error) {
      console.error("[Stenci] Falha ao registrar log:", error.message);
    }
  };
  const latestLog = () =>
    db("integration_logs")
      .where({ integration: "STENCI" })
      .orderBy("created_at", "desc")
      .first();
  router.post(
    "/refresh",
    modulePermissionAny([
      ["guide_processes", "create"],
      ["guide_processes", "edit"],
      ["insurance_providers", "view"],
      ["billing_dashboard", "view"],
    ]),
    async (req, res) => {
      if (req.user.authProvider === "LOCAL")
        return res.status(403).json({
          error: "Esta conta local não possui integração com o Stenci.",
          code: "STENCI_NOT_AVAILABLE_FOR_LOCAL_ACCOUNT",
        });
      const session = sessionStore.get(req.user.sid);
      if (!session || session.mode !== "detached")
        return res.status(401).json({
          error: "Entre novamente no Realmed.",
          code: "AUTH_SESSION_EXPIRED",
        });
      const username =
        typeof req.body?.username === "string" ? req.body.username.trim() : "";
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      const requested = req.body?.operations;
      const allowed = [
        "searchPatients",
        "listInsurances",
        "listInsurancePlans",
        "listProfessionals",
        "testConnection",
        "billingRead",
        "rotationRead",
      ];
      if (
        Boolean(username) !== Boolean(password) ||
        username.length > 300 ||
        password.length > 4096 ||
        !Array.isArray(requested) ||
        !requested.length ||
        requested.length > 8 ||
        requested.some((item) => !allowed.includes(item?.name))
      )
        return res
          .status(400)
          .json({ error: "Informe credenciais e consultas válidas." });
      if (
        !req.realmedAllowedModules.includes("guide_processes") &&
        requested.some(
          (item) =>
            item.name !== "listInsurances" &&
            !(
              item.name === "billingRead" &&
              req.realmedAllowedModules.includes("billing_dashboard")
            ),
        )
      )
        return res.status(403).json({
          error: "Usuário sem permissão a essa função",
          code: "PERMISSION_DENIED",
        });
      if (
        requested.some((item) => item.name === "billingRead") &&
        !req.realmedAllowedModules.includes("billing_dashboard")
      )
        return res.status(403).json({
          error: "Usuário sem permissão a essa função",
          code: "PERMISSION_DENIED",
        });
      let billingQueries;
      try {
        billingQueries = requested.map((item) =>
          item.name === "rotationRead"
            ? require("../../integrations/stenci/rotationRead").rotationOptions(
                item,
              )
            : item.name === "billingRead"
              ? require("../../integrations/stenci/billingRead").billingOptions(
                  item,
                )
              : null,
        );
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
      const operations = requested.map((item, index) => ({
        name: item.name,
        ...(billingQueries[index] || {}),
        ...(item.name === "searchPatients"
          ? {
              search: String(item.search || "").trim(),
              limit: Math.min(30, Math.max(1, Number(item.limit) || 30)),
              offset: Math.max(0, Number(item.offset) || 0),
            }
          : {}),
      }));
      if (
        operations.some(
          (item) =>
            item.name === "searchPatients" &&
            (item.search.length < 2 ||
              item.search.length > 180 ||
              !Number.isFinite(item.offset)),
        )
      )
        return res.status(400).json({ error: "Busca de paciente inválida." });
      const started = new Date();
      try {
        await refreshStenci({
          sid: req.user.sid,
          sessionStore,
          configFactory,
          serviceFactory,
          operations,
          credentials:
            username && password ? { username, password } : undefined,
        });
        const finished = new Date();
        await log({
          integration: "STENCI",
          operation: "TRANSIENT_REFRESH",
          status: "SUCCESS",
          started_at: started,
          finished_at: finished,
          duration_ms: finished - started,
          records_processed: operations.length,
        });
        return res.json({
          message: "Dados consultados e sessão Stenci encerrada.",
        });
      } catch (error) {
        const finished = new Date();
        await log({
          integration: "STENCI",
          operation: "TRANSIENT_REFRESH",
          status: "ERROR",
          started_at: started,
          finished_at: finished,
          duration_ms: finished - started,
          records_processed: 0,
          error_message: error.code || "STENCI_ERROR",
        });
        return res
          .status(
            error.code === "STENCI_INVALID_CREDENTIALS" ||
              ([401, 403].includes(error.status) &&
                error.code !== "AUTH_SESSION_EXPIRED")
              ? 422
              : error.status || 502,
          )
          .json({
            error:
              error.code === "STENCI_INVALID_CREDENTIALS"
                ? "Usuário ou senha Stenci inválidos."
                : [
                      "STENCI_ACCOUNT_MISMATCH",
                      "STENCI_LOGOUT_FAILED",
                      "STENCI_REFRESH_REQUIRED",
                      "AUTH_SESSION_EXPIRED",
                    ].includes(error.code)
                  ? error.message
                  : "Não foi possível consultar o Stenci. Tente novamente.",
            code: error.code || "STENCI_ERROR",
          });
      }
    },
  );

  router.get("/status", ...admin, async (_req, res) => {
    try {
      const config = configFactory(),
        latest = await latestLog();
      const status = !config.enabled
        ? "DISABLED"
        : latest?.status === "ERROR"
          ? "ERROR"
          : latest?.status === "SUCCESS"
            ? "CONNECTED"
            : "CONFIGURED";
      res.json({
        ...publicConfig(config),
        status,
        last_operation: latest
          ? {
              operation: latest.operation,
              status: latest.status,
              started_at: latest.started_at,
              finished_at: latest.finished_at,
              records_processed: latest.records_processed,
            }
          : null,
        last_error: latest?.status === "ERROR" ? latest.error_message : null,
      });
    } catch (_error) {
      res
        .status(500)
        .json({ error: "Não foi possível consultar o status da integração." });
    }
  });
  router.get("/logs", ...admin, async (_req, res) => {
    try {
      res.json(
        await db("integration_logs")
          .where({ integration: "STENCI" })
          .select(
            "id",
            "integration",
            "operation",
            "status",
            "started_at",
            "finished_at",
            "duration_ms",
            "records_processed",
            "error_message",
            "metadata",
            "created_at",
          )
          .orderBy("created_at", "desc")
          .limit(100),
      );
    } catch (_error) {
      res
        .status(500)
        .json({ error: "Não foi possível consultar os logs da integração." });
    }
  });
  router.post("/test-connection", ...admin, async (req, res) => {
    const started = new Date();
    let context;
    try {
      context = makeService(req);
      await context.service.testConnection();
      const finished = new Date();
      await log({
        integration: "STENCI",
        operation: "TEST_CONNECTION",
        status: "SUCCESS",
        started_at: started,
        finished_at: finished,
        duration_ms: finished - started,
        records_processed: 0,
      });
      res.json({ message: "Integração validada e sessão Stenci encerrada." });
    } catch (originalError) {
      const error = normalizeStenciSessionError(
        originalError,
        context?.sid || req.user?.sid,
        sessionStore,
      );
      const finished = new Date();
      await log({
        integration: "STENCI",
        operation: "TEST_CONNECTION",
        status: "ERROR",
        started_at: started,
        finished_at: finished,
        duration_ms: finished - started,
        records_processed: 0,
        error_message: error.message,
      });
      res.status(error.status || 503).json({
        error: error.message || "Falha controlada ao consultar o Stenci.",
        code: error.code || "STENCI_ERROR",
      });
    }
  });

  router.get(
    "/patients/search",
    modulePermission("guide_processes", "create"),
    async (req, res) => {
      const started = new Date(),
        search = String(req.query.search || "").trim(),
        limit = Math.min(30, Math.max(1, Number(req.query.limit) || 30)),
        offset = Math.max(0, Number(req.query.offset) || 0);
      if (search.length < 2)
        return res
          .status(400)
          .json({ error: "Informe pelo menos 2 caracteres para buscar." });
      let context;
      try {
        context = makeService(req);
        const result = await context.service.searchPatients(search, {
          limit,
          offset,
        });
        const items = result.items.map((item) => ({
          ...StenciMapper.patient(item),
          insurance: StenciMapper.insurance(item),
          raw: validatedPatient(item, item.id),
        }));
        const finished = new Date();
        await log({
          integration: "STENCI",
          operation: "PATIENT_SEARCH",
          status: "SUCCESS",
          started_at: started,
          finished_at: finished,
          duration_ms: finished - started,
          records_processed: items.length,
        });
        res.json({ items, hasMore: result.hasMore });
      } catch (originalError) {
        const error = normalizeStenciSessionError(
          originalError,
          context?.sid || req.user?.sid,
          sessionStore,
        );
        const finished = new Date();
        await log({
          integration: "STENCI",
          operation: "PATIENT_SEARCH",
          status: "ERROR",
          started_at: started,
          finished_at: finished,
          duration_ms: finished - started,
          records_processed: 0,
          error_message: error.message,
        });
        res.status(error.status || 503).json({
          error:
            error.code === "STENCI_SESSION_EXPIRED"
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível consultar o Stenci no momento.",
          code: error.code || "STENCI_ERROR",
        });
      }
    },
  );
  const catalog = (path, operation, load, map) =>
    router.get(
      path,
      path === "/insurances"
        ? modulePermissionAny([
            ["guide_processes", "create"],
            ["insurance_providers", "view"],
          ])
        : modulePermission("guide_processes", "create"),
      async (req, res) => {
        const started = new Date();
        let context;
        try {
          context = makeService(req);
          const result = await context.service[load]();
          const items = result.items.map(map).filter(Boolean);
          const finished = new Date();
          await log({
            integration: "STENCI",
            operation,
            status: "SUCCESS",
            started_at: started,
            finished_at: finished,
            duration_ms: finished - started,
            records_processed: items.length,
          });
          res.json({ items, hasMore: result.hasMore });
        } catch (originalError) {
          const error = normalizeStenciSessionError(
            originalError,
            context?.sid || req.user?.sid,
            sessionStore,
          );
          const finished = new Date();
          await log({
            integration: "STENCI",
            operation,
            status: "ERROR",
            started_at: started,
            finished_at: finished,
            duration_ms: finished - started,
            records_processed: 0,
            error_message: error.message,
          });
          res.status(error.status || 503).json({
            error:
              error.code === "STENCI_SESSION_EXPIRED"
                ? "Sua sessão expirou. Entre novamente."
                : "Não foi possível consultar o Stenci no momento.",
            code: error.code || "STENCI_ERROR",
          });
        }
      },
    );
  catalog(
    "/insurances",
    "INSURANCE_LIST",
    "listInsurances",
    StenciMapper.insuranceCatalog,
  );
  catalog(
    "/insurance-plans",
    "INSURANCE_PLAN_LIST",
    "listInsurancePlans",
    StenciMapper.insurancePlan,
  );
  catalog(
    "/professionals",
    "PROFESSIONAL_LIST",
    "listProfessionals",
    StenciMapper.professional,
  );
  router.post(
    "/patients/:externalId/sync",
    modulePermission("guide_processes", "create"),
    async (req, res) => {
      const started = new Date();
      try {
        const externalPatient = validatedPatient(
            req.body?.patient,
            req.params.externalId,
          ),
          result = await sync(db, externalPatient);
        const finished = new Date();
        await log({
          integration: "STENCI",
          operation: "PATIENT_SYNC",
          status: "SUCCESS",
          started_at: started,
          finished_at: finished,
          duration_ms: finished - started,
          records_processed: 1,
        });
        res.json(result);
      } catch (error) {
        const finished = new Date();
        await log({
          integration: "STENCI",
          operation: "PATIENT_SYNC",
          status: "ERROR",
          started_at: started,
          finished_at: finished,
          duration_ms: finished - started,
          records_processed: 0,
          error_message: error.message,
        });
        res.status(error.status || 500).json({
          error:
            error.status === 422
              ? error.message
              : "Não foi possível importar o paciente do Stenci.",
        });
      }
    },
  );

  router.post(
    "/treatments/:id/refresh-patient",
    modulePermission("guide_processes", "edit"),
    async (req, res) => {
      const started = new Date();
      try {
        const processId = Number(req.params.id);
        if (!Number.isSafeInteger(processId) || processId < 1)
          return res.status(400).json({ error: "Tratamento inválido." });
        const result =
          await require("../services/treatmentPatientRefresh").refreshTreatmentPatient(
            db,
            {
              processId,
              actorId: req.user.id,
              validatePatient: validatedPatient,
              fetchPatients: async (operation) => {
                try {
                  const results = await refreshStenci({
                    sid: req.user.sid,
                    sessionStore,
                    configFactory,
                    serviceFactory,
                    operations: [operation],
                  });
                  return results[0].value;
                } catch (error) {
                  if (error.code === "STENCI_REFRESH_REQUIRED")
                    error.stenciOperation = operation;
                  throw error;
                }
              },
              audit: async (trx, data) =>
                require("./guide-center").history(
                  trx,
                  processId,
                  req.user.id,
                  "PATIENT_STENCI_REFRESHED",
                  null,
                  null,
                  null,
                  {
                    patientId: data.patientId,
                    insurancePreserved: data.insurancePreserved,
                  },
                ),
            },
          );
        await log({
          integration: "STENCI",
          operation: "PATIENT_REFRESH",
          status: "SUCCESS",
          started_at: started,
          finished_at: new Date(),
          records_processed: 1,
        });
        res.set("Cache-Control", "no-store").json(result);
      } catch (original) {
        const error = normalizeStenciSessionError(
          original,
          req.user.sid,
          sessionStore,
        );
        await log({
          integration: "STENCI",
          operation: "PATIENT_REFRESH",
          status: "ERROR",
          started_at: started,
          finished_at: new Date(),
          records_processed: 0,
          error_message: error.code || "PATIENT_REFRESH_FAILED",
        });
        res.status(error.status || 502).json({
          error:
            error.status && error.status < 500
              ? error.message
              : "Não foi possível atualizar o paciente. Nenhum dado do tratamento foi alterado.",
          code: error.code,
          stenciOperation: error.stenciOperation,
        });
      }
    },
  );
  const pendingReport = (_req, res) =>
    res
      .status(501)
      .json({ error: "Endpoint do Stenci ainda não configurado." });
  router.get("/assessments", ...admin, pendingReport);
  router.get("/completed-treatments", ...admin, pendingReport);
  return router;
}
module.exports = { createStenciRouter, knex, validatedPatient };
