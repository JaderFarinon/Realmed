const express = require("express");
const auth = require("../middleware/auth");
const { modulePermission } = require("../middleware/permission");
const { knex, id, history } = require("./guide-center");
const codes = require("../services/procedureCodeService");
const review = require("../services/guideCodeReviewService");
const ocr = require("../services/guideOcrService");
const { documentPath } = require("./guide-operations");
const fs = require("fs/promises");
const router = express.Router();
router.use(auth);
const error = (res, e) =>
  res.status(e.status || 500).json({
    error: e.status ? e.message : "Não foi possível processar os códigos.",
  });
async function lookups(db = knex) {
  return {
    procedures: await db("procedures").orderBy("description"),
    insurers: await db("insurance_providers")
      .select("id", "name", "active")
      .orderBy("name"),
  };
}
router.get(
  "/procedure-code-rules/lookups",
  modulePermission("procedures"),
  async (req, res) => {
    try {
      res.json(await lookups());
    } catch (e) {
      error(res, e);
    }
  },
);
router.get(
  "/procedure-code-rules",
  modulePermission("procedures"),
  async (req, res) => {
    try {
      res.json(await codes.loadRules(knex));
    } catch (e) {
      error(res, e);
    }
  },
);
async function validate(body, db) {
  const source_code = String(body.source_code || "").trim(),
    priority = Number(body.priority),
    target_procedure_id = id(body.target_procedure_id);
  if (
    !/^[A-Za-z0-9 .\-/]{3,50}$/.test(source_code) ||
    !codes.normalize(source_code)
  )
    throw codes.fail("Informe um código de origem de 3 a 50 caracteres.");
  if (!Number.isInteger(priority) || priority < 1 || priority > 9999)
    throw codes.fail(
      "A prioridade deve ser um inteiro entre 1 e 9999. O menor número tem preferência.",
    );
  const target = await db("procedures")
    .where({ id: target_procedure_id, active: true })
    .first();
  if (!target) throw codes.fail("Selecione um procedimento de destino ativo.");
  const originals = await db("procedures").select("code", "type", "table_name");
  const known = originals.filter(
    (item) =>
      codes.normalize(item.code) === codes.normalize(source_code) &&
      (!body.source_table ||
        codes.normalize(item.table_name) ===
          codes.normalize(body.source_table)),
  );
  if (known.some((item) => item.type !== target.type))
    throw codes.fail(
      "A origem e o destino devem pertencer ao mesmo tipo de procedimento.",
    );
  const insurer = body.insurance_provider_id
    ? id(body.insurance_provider_id)
    : null;
  if (
    insurer &&
    !(await db("insurance_providers").where({ id: insurer }).first())
  )
    throw codes.fail("Convênio não encontrado.");
  const dates = {
    valid_from: body.valid_from || null,
    valid_until: body.valid_until || null,
  };
  for (const value of Object.values(dates))
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw codes.fail("Informe datas válidas para a vigência.");
  if (
    dates.valid_from &&
    dates.valid_until &&
    dates.valid_from > dates.valid_until
  )
    throw codes.fail("O fim da vigência deve ser posterior ao início.");
  const text = (value, max) => {
    const result = String(value || "").trim();
    if (result.length > max)
      throw codes.fail("Texto excede o limite permitido.");
    return result || null;
  };
  return {
    source_code,
    source_description: text(body.source_description, 255),
    source_table: text(body.source_table, 80),
    target_procedure_id,
    insurance_provider_id: insurer,
    priority,
    ...dates,
    active: body.active !== false && body.active !== 0,
    notes: text(body.notes, 5000),
  };
}
for (const method of ["post", "put"])
  router[method](
    "/procedure-code-rules" + (method === "put" ? "/:id" : ""),
    modulePermission("procedures", method === "post" ? "create" : "edit"),
    async (req, res) => {
      try {
        const data = await validate(req.body, knex);
        let key;
        if (method === "post") {
          [key] = await knex("procedure_code_rules").insert(data);
        } else {
          key = id(req.params.id);
          if (
            !(await knex("procedure_code_rules")
              .where({ id: key })
              .update(data))
          )
            throw Object.assign(new Error("De/para não encontrado."), {
              status: 404,
            });
        }
        res.status(method === "post" ? 201 : 200).json({ id: key, ...data });
      } catch (e) {
        error(res, e);
      }
    },
  );
router.post(
  "/guide-processes/:id/documents/:documentId/read-codes",
  modulePermission("guide_processes", "edit"),
  async (req, res) => {
    try {
      const processId = id(req.params.id),
        documentId = id(req.params.documentId);
      const original = await knex("guide_process_documents")
        .where({
          id: documentId,
          guide_process_id: processId,
          document_role: "RECEIVED",
        })
        .whereNull("deleted_at")
        .first();
      if (!original)
        throw Object.assign(
          new Error("Guia original recebida não encontrada."),
          { status: 404 },
        );
      if (
        ![
          "CONSULTATION_GUIDE",
          "PHYSIOTHERAPY_GUIDE",
          "ELECTROSTIMULATION",
        ].includes(original.document_type)
      )
        throw codes.fail(
          "Selecione uma guia de consulta, fisioterapia ou eletroestimulação.",
        );
      const treatment = await knex("guide_processes as gp")
        .leftJoin(
          "patient_insurances as pi",
          "pi.id",
          "gp.patient_insurance_id",
        )
        .where("gp.id", processId)
        .select("pi.insurance_provider_id")
        .first();
      if (!treatment?.insurance_provider_id)
        throw codes.fail("Informe o convênio do tratamento antes da leitura.");
      const file = documentPath(original),
        result = await ocr.extract(
          file,
          original.mime_type,
          Number(req.body.page || 1),
        );
      const catalog = await codes.catalog(
          knex,
          treatment.insurance_provider_id,
        ),
        rules = await codes.loadRules(knex);
      const candidates = codes.recognize(
        result.text,
        catalog,
        rules,
        treatment.insurance_provider_id,
      );
      const key = review.remember({
        userId: req.user.id,
        processId,
        documentId,
        file,
        hash: review.hash(await fs.readFile(file)),
        rulesHash: codes.fingerprint(rules),
        catalogHash: codes.fingerprint(catalog),
        insurer: treatment.insurance_provider_id,
        candidates,
        page: result.page,
      });
      await history(
        knex,
        processId,
        req.user.id,
        "GUIDE_CODES_READ",
        null,
        null,
        null,
        {
          sourceDocumentId: documentId,
          page: result.page,
          candidateCount: candidates.length,
        },
      );
      const alternatives = catalog.map((source) => {
        try {
          return codes.choose(source, rules, treatment.insurance_provider_id);
        } catch (e) {
          return { ...source, error: e.message };
        }
      });
      res.set("Cache-Control", "no-store").json({
        code_review_id: key,
        ...result,
        candidates,
        procedures: alternatives,
        document_type: original.document_type,
      });
    } catch (e) {
      error(res, e);
    }
  },
);
router.post(
  "/guide-processes/:id/code-review-options",
  modulePermission("guide_processes", "edit"),
  async (req, res) => {
    try {
      const processId = id(req.params.id),
        treatment = await knex("guide_processes as gp")
          .leftJoin(
            "patient_insurances as pi",
            "pi.id",
            "gp.patient_insurance_id",
          )
          .where("gp.id", processId)
          .select("pi.insurance_provider_id")
          .first();
      if (!treatment)
        throw Object.assign(new Error("Tratamento não encontrado."), {
          status: 404,
        });
      let procedures = await knex("guide_process_procedures as g")
        .join("procedures as p", "p.id", "g.procedure_id")
        .where("g.guide_process_id", processId)
        .select("g.*", "p.code", "p.description", "p.type", "p.table_name");
      if (
        [
          "CONSULTATION_GUIDE",
          "PHYSIOTHERAPY_GUIDE",
          "ELECTROSTIMULATION",
        ].includes(req.body.document_type)
      )
        procedures =
          require("../services/sadtTemplateService").selectProcedures(
            require('../services/sadtTemplateService').unifiedTypes(req.body.unified_document_types) || req.body.document_type,
            procedures,
          );
      res.json(
        await codes.resolve(knex, procedures, treatment.insurance_provider_id),
      );
    } catch (e) {
      error(res, e);
    }
  },
);
module.exports = router;
