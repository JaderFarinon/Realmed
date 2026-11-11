const express = require("express"),
  auth = require("../middleware/auth"),
  { modulePermission } = require("../middleware/permission"),
  { knex, history, handle, id } = require("./guide-center");
const {
  serialize,
  normalize,
  validate,
} = require("../services/evaluationValidation");
const router = express.Router();
router.use(auth);
const responseError = (res, e) =>
  e.missing
    ? res.status(e.status).json({ error: e.message, missing: e.missing })
    : handle(res, e);
router.get(
  "/guide-processes/:id/evaluation/options",
  modulePermission("guide_processes"),
  async (req, res) => {
    try {
      const process = await knex("guide_processes")
        .where({ id: id(req.params.id) })
        .whereNull("deleted_at")
        .first();
      if (!process)
        return res.status(404).json({ error: "Tratamento não encontrado." });
      const professionals = await knex("professionals")
        .whereRaw("UPPER(council) = ?", ["CREFITO"])
        .select("id", "full_name", "council", "council_number", "state");
      const patient = await knex("patients")
        .where({ id: process.patient_id })
        .select(
          "full_name",
          "cpf",
          "birth_date",
          "gender",
          "cellphone",
          "phone",
        )
        .first();
      res.set("Cache-Control", "no-store").json({ professionals, patient });
    } catch (e) {
      handle(res, e);
    }
  },
);
router.get(
  "/guide-processes/:id/evaluation",
  modulePermission("guide_processes"),
  async (req, res) => {
    try {
      const processId = id(req.params.id);
      if (!(await knex("guide_processes").where({ id: processId }).whereNull("deleted_at").first()))
        return res.status(404).json({ error: "Tratamento não encontrado." });
      res.json(
        serialize(
          await knex("physiotherapy_evaluations")
            .where({ guide_process_id: processId })
            .first(),
        ),
      );
    } catch (e) {
      handle(res, e);
    }
  },
);
async function save(req, res) {
  const trx = await knex.transaction();
  try {
    const processId = id(req.params.id),
      process = await trx("guide_processes")
        .where({ id: processId })
        .forUpdate()
        .first();
    if (!process)
      throw Object.assign(new Error("Tratamento não encontrado."), {
        status: 404,
      });
    require("../services/treatmentStages").assertActive(process);
    await require("../services/treatmentStages").assertStageUnlocked(trx, process, "evaluation");
    require("../services/guideContinuity").assertOriginalEvaluation(process);
    const old = await trx("physiotherapy_evaluations")
      .where({ guide_process_id: processId })
      .first();
    if (old?.status === "COMPLETED")
      throw Object.assign(
        new Error("Reabra a avaliação concluída antes de editar."),
        { status: 409 },
      );
    const data = normalize(req.body);
    validate({ ...serialize(old), ...serialize(data) });
    if (data.physiotherapist_id) {
      const professional = await trx("professionals")
        .where({ id: data.physiotherapist_id })
        .first();
      if (
        !professional ||
        String(professional.council).toUpperCase() !== "CREFITO"
      )
        throw Object.assign(
          new Error("Selecione um fisioterapeuta com CREFITO."),
          { status: 422 },
        );
    }
    data.status = "IN_PROGRESS";
    data.updated_by = req.user.id;
    if (old)
      await trx("physiotherapy_evaluations").where({ id: old.id }).update(data);
    else
      await trx("physiotherapy_evaluations").insert({
        ...data,
        guide_process_id: processId,
        created_by: req.user.id,
      });
    let sync = {};
    const rotation = await trx("physiotherapy_rotation_assignments")
      .where({ guide_process_id: processId })
      .first();
    for (const key of [
      "referral_date",
      "medical_diagnosis",
      "cid",
      "requested_sessions",
      "expected_start_date",
      "treatment_days",
      "physiotherapist_id",
    ])
      if (data[key] !== undefined) sync[key] = data[key];
    // The clinical date belongs to the evaluation. Reception is already closed
    // when this stage opens, and its scheduled date must remain unchanged.
    if (data.evaluation_date !== undefined &&
        !require("../services/treatmentStages").state(process).reception?.completed_at)
      sync.assessment_date = data.evaluation_date;
    if (rotation) sync.physiotherapist_id = rotation.professional_id;
    else if (sync.physiotherapist_id == null) delete sync.physiotherapist_id;
    sync = require("../services/treatmentStages").evaluationSync(process, sync, req.preserveEvaluationCentral);
    require("../services/treatmentStages").assertFieldsOpen(process, sync);
    if (Object.keys(sync).length)
      await trx("guide_processes").where({ id: processId }).update(sync);
    await history(
      trx,
      processId,
      req.user.id,
      "EVALUATION_DRAFT_SAVED",
      null,
      null,
      "IN_PROGRESS",
    );
    await trx.commit();
    res
      .status(old ? 200 : 201)
      .json(
        serialize(
          await knex("physiotherapy_evaluations")
            .where({ guide_process_id: processId })
            .first(),
        ),
      );
  } catch (e) {
    await trx.rollback();
    responseError(res, e);
  }
}
router.post(
  "/guide-processes/:id/evaluation",
  modulePermission("guide_processes", "edit"),
  save,
);
router.put(
  "/guide-processes/:id/evaluation",
  modulePermission("guide_processes", "edit"),
  save,
);
router.post(
  "/guide-processes/:id/evaluation/complete",
  modulePermission("guide_processes", "edit"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      const processId = id(req.params.id);
      const process = await trx("guide_processes")
        .where({ id: processId })
        .forUpdate()
        .first();
      if (!process)
        throw Object.assign(new Error("Tratamento não encontrado."), { status: 404 });
      require("../services/treatmentStages").assertActive(process);
      await require("../services/treatmentStages").assertStageUnlocked(trx, process, "evaluation");
      require("../services/guideContinuity").assertOriginalEvaluation(process);
      const row = await trx("physiotherapy_evaluations")
        .where({ guide_process_id: processId })
        .first();
      if (!row)
        throw Object.assign(new Error("Salve um rascunho antes de concluir."), {
          status: 409,
        });
      if (row.status === "COMPLETED") {
        await trx.commit();
        return res.json(serialize(row));
      }
      validate(serialize(row), true);
      await trx("physiotherapy_evaluations").where({ id: row.id }).update({
        status: "COMPLETED",
        completed_at: knex.fn.now(),
        updated_by: req.user.id,
      });
      await history(
        trx,
        processId,
        req.user.id,
        "EVALUATION_COMPLETED",
        "status",
        "IN_PROGRESS",
        "COMPLETED",
      );
      await trx.commit();
      res.json(
        serialize(
          await knex("physiotherapy_evaluations").where({ id: row.id }).first(),
        ),
      );
    } catch (e) {
      await trx.rollback();
      responseError(res, e);
    }
  },
);
router.post(
  "/guide-processes/:id/evaluation/reopen",
  modulePermission("guide_processes", "edit"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      const processId = id(req.params.id);
      const process = await trx("guide_processes")
        .where({ id: processId })
        .forUpdate()
        .first();
      if (!process)
        throw Object.assign(new Error("Tratamento não encontrado."), { status: 404 });
      require("../services/treatmentStages").assertActive(process);
      await require("../services/treatmentStages").assertStageUnlocked(trx, process, "evaluation");
      require("../services/guideContinuity").assertOriginalEvaluation(process);
      await require("../services/treatmentStages").assertCanReopenStage(trx, process, "evaluation");
      const row = await trx("physiotherapy_evaluations")
        .where({ guide_process_id: processId })
        .first();
      if (!row)
        throw Object.assign(new Error("Avaliação não encontrada."), {
          status: 404,
        });
      if (row.status === "COMPLETED") {
        await trx("physiotherapy_evaluations").where({ id: row.id }).update({
          status: "IN_PROGRESS",
          completed_at: null,
          updated_by: req.user.id,
        });
        await history(
          trx,
          processId,
          req.user.id,
          "EVALUATION_REOPENED",
          "status",
          "COMPLETED",
          "IN_PROGRESS",
        );
      }
      await trx.commit();
      res.json(
        serialize(
          await knex("physiotherapy_evaluations").where({ id: row.id }).first(),
        ),
      );
    } catch (e) {
      await trx.rollback();
      handle(res, e);
    }
  },
);
module.exports = router;
