const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");
const { modulePermission } = require("../middleware/permission");
const { period, summarize } = require("../services/billingDashboard");
const {
  getAuthenticatedStenciService,
  normalizeStenciSessionError,
} = require("../services/authenticatedStenciService");
const { billingOptions } = require("../../integrations/stenci/billingRead");
const { knex } = require("./guide-center");
const { getStenciConfig } = require("../../integrations/stenci/config");
const {
  enqueueRange,
  agendaSummary,
  localToday,
} = require("../services/billingAgendaCollection");
const worker = require("../services/billingCollectorWorker");
const collectorCredentials = require("../services/billingCollectorCredentials");
const {
  parseFilters,
  applyFilters,
  filterOptions,
} = require("../services/billingAgendaFilters");
const { buildAbsenceReport } = require("../services/billingAbsenceReport");
async function absenceOptions(input = {}) {
  const date = input.date || localToday();
  period({ start: date, end: date });
  if (date < "2000-01-01" || date > localToday())
    throw Object.assign(new Error("Escolha a data do relatório até hoje."), {
      status: 400,
    });
  const branchId = getStenciConfig().branchId;
  const oldest = await knex("billing_collection_days")
    .where({ branch_id: branchId })
    .where("service_date", "<=", date)
    .min("service_date as first")
    .first();
  const historyStart =
    input.historyStart ||
    (oldest?.first
      ? require("../services/billingAgendaCollection").dateText(oldest.first)
      : date.slice(0, 7) + "-01");
  period({ start: historyStart, end: date });
  if (historyStart < "2000-01-01")
    throw Object.assign(new Error("Início do histórico inválido."), {
      status: 400,
    });
  const rule = input.rule || "total3";
  if (!["total3", "prior3"].includes(rule))
    throw Object.assign(new Error("Regra de faltas inválida."), {
      status: 400,
    });
  return { branchId, date, historyStart, rule };
}
router.get(
  "/reports/absences",
  auth,
  modulePermission("billing_reports"),
  async (req, res) => {
    try {
      const options = await absenceOptions(req.query);
      const [rows, coverage] = await knex.transaction(
        (trx) =>
          Promise.all([
            trx("billing_stenci_appointments as a")
              .leftJoin("patients as p", function () {
                this.on("p.external_id", "=", "a.patient_external_id").andOnVal(
                  "p.external_source",
                  "STENCI",
                );
              })
              .where({ "a.branch_id": options.branchId })
              .whereBetween("a.service_date", [
                options.historyStart,
                options.date,
              ])
              .select(
                "a.external_id",
                "a.patient_external_id",
                "a.patient_name",
                "a.service_date",
                "a.start_at",
                "a.status",
                "a.schedule_id",
                "a.schedule_name",
                "a.schedule_memberships",
                "p.phone",
              ),
            trx("billing_collection_days")
              .where({ branch_id: options.branchId })
              .whereBetween("service_date", [
                options.historyStart,
                options.date,
              ]),
          ]),
        { isolationLevel: "repeatable read" },
      );
      const contacts = rows
        .filter((row) => row.phone)
        .map((row) => ({
          external_id: row.patient_external_id,
          phone: row.phone,
        }));
      res
        .set("Cache-Control", "no-store")
        .json(buildAbsenceReport({ ...options, rows, coverage, contacts }));
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.status
          ? error.message
          : "Não foi possível gerar o relatório de faltas.",
      });
    }
  },
);
router.post(
  "/reports/absences/queue",
  auth,
  modulePermission("billing_reports"),
  async (req, res) => {
    try {
      const options = await absenceOptions(req.body);
      await enqueueRange(
        knex,
        options.branchId,
        options.historyStart,
        options.date,
      );
      if (req.body.forceDate === true)
        await enqueueRange(
          knex,
          options.branchId,
          options.date,
          options.date,
          new Date(),
          true,
        );
      res.status(202).json({ queued: true });
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.status
          ? error.message
          : "Não foi possível programar a atualização do relatório.",
      });
    }
  },
);
router.post(
  "/collection/queue",
  auth,
  modulePermission("billing_dashboard"),
  async (req, res) => {
    try {
      const range = period(req.body || {}),
        today = localToday(),
        latest = new Date(Date.parse(today) + 365 * 86400000)
          .toISOString()
          .slice(0, 10);
      if (range.start < "2000-01-01" || range.end > latest)
        return res
          .status(400)
          .json({ error: "Escolha datas entre 2000 e os próximos 365 dias." });
      await enqueueRange(
        knex,
        getStenciConfig().branchId,
        range.start,
        range.end,
        new Date(),
        req.body.force === true,
      );
      res.status(202).json({ queued: true });
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.status
          ? error.message
          : "Não foi possível programar a coleta.",
      });
    }
  },
);
router.get(
  "/stenci",
  auth,
  modulePermission("billing_dashboard"),
  async (req, res) => {
    let context;
    try {
      const options = billingOptions(req.query);
      context = getAuthenticatedStenciService(req);
      const data = await context.service.billingRead(options);
      res.set("Cache-Control", "no-store").json(data);
    } catch (e) {
      const error = context
        ? normalizeStenciSessionError(e, context.sid, context.sessionStore)
        : e;
      res.status(error.status || 502).json({
        error: error.status
          ? error.message
          : "Não foi possível consultar o Stenci.",
        code: error.code,
      });
    }
  },
);
router.get(
  "/dashboard",
  auth,
  modulePermission("billing_dashboard"),
  async (req, res) => {
    try {
      const range = period(req.query);
      const filters = parseFilters(req.query);
      const branchId = getStenciConfig().branchId;
      const [appointments, coverage, evaluations, schedules] =
        await knex.transaction(
          async (trx) =>
            Promise.all([
              trx("billing_stenci_appointments")
                .where({ branch_id: branchId })
                .whereBetween("service_date", [range.start, range.end])
                .select(
                  "external_id",
                  "service_date",
                  "schedule_id",
                  "schedule_name",
                  "schedule_memberships",
                  "is_physiotherapy",
                  "patient_external_id",
                  "patient_name",
                  "insurance_name",
                  "start_at",
                  "status",
                  "is_evaluation",
                  "is_session",
                ),
              trx("billing_collection_days")
                .where({ branch_id: branchId })
                .whereBetween("service_date", [range.start, range.end]),
              trx("billing_stenci_appointments")
                .where({
                  branch_id: branchId,
                  is_evaluation: true,
                  status: "finished",
                })
                .where("service_date", "<=", range.end)
                .select("patient_external_id", "start_at"),
              trx("billing_stenci_schedules")
                .where({ branch_id: branchId })
                .select(
                  "external_id",
                  "name",
                  "place_external_id",
                  "place_name",
                ),
            ]),
          { isolationLevel: "repeatable read" },
        );
      const [rows] = await db.query(
        `SELECT gp.id,p.full_name patient_name,ip.name insurance_name,
      DATE_FORMAT(gp.created_at,'%Y-%m-%d') created_date,DATE_FORMAT(gp.assessment_date,'%Y-%m-%d') assessment_date,
      gp.treatment_status,gp.billing_status,gp.document_status,gp.authorization_status,
      gp.authorized_sessions,gp.performed_sessions,ev.status evaluation_status, ${require("../services/guideBilling").billingDueSQL} billing_due
      FROM guide_processes gp JOIN patients p ON p.id=gp.patient_id
      LEFT JOIN patient_insurances pi ON pi.id=gp.patient_insurance_id
      LEFT JOIN insurance_providers ip ON ip.id=pi.insurance_provider_id
      LEFT JOIN physiotherapy_evaluations ev ON ev.guide_process_id=gp.id
      WHERE gp.created_at>=? AND gp.created_at<? ORDER BY gp.created_at DESC,gp.id DESC`,
        [range.start, range.next],
      );
      res.set("Cache-Control", "no-store");
      res.json({
        ...summarize(
          rows,
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
          }).format(new Date()),
        ),
        period: { start: range.start, end: range.end },
        filters,
        filterOptions: filterOptions(schedules, appointments),
        agenda: agendaSummary(
          applyFilters(appointments, filters),
          coverage,
          range.start,
          range.end,
          evaluations,
          { includeInactive: true },
        ),
        collection: {
          configured: collectorCredentials.configured(),
          enabled:
            getStenciConfig().enabled &&
            process.env.STENCI_BILLING_COLLECTION_ENABLED !== "false",
          running: worker.state.running,
          errorCode: worker.state.lastError,
          dailyHour: "03:00",
          timeZone: "America/Sao_Paulo",
        },
      });
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.status
          ? error.message
          : "Não foi possível carregar o faturamento.",
      });
    }
  },
);
module.exports = router;
