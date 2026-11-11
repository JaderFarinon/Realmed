const {lockOpen,assertOpen} = require("../services/treatmentStages");
const express = require("express");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const {
  fieldKeys,
  generateDocument,
  safeFile,
  roots,
} = require("../services/documentGenerationService");
const sadt = require("../services/sadtTemplateService");
const procedureCodes = require("../services/procedureCodeService");
const codeReview = require("../services/guideCodeReviewService");
const { cloneIfUsed } = require("../services/documentTemplateService");
const auth = require("../middleware/auth");
const { modulePermission } = require("../middleware/permission");
const { knex, history, handle, id, documents } = require("./guide-center");
const { syncDocumentStatus } = require("../services/guideWorkflow");
const { validateImageUpload } = require("../services/imageAssetService");
const {
  generatePhysiotherapyEvaluation,
} = require("../services/physiotherapyEvaluationService");

const router = express.Router();
const storage = path.resolve(__dirname, "../../storage");
roots.generated = path.join(storage, "generated");
const documentTypes = new Set([
  "CONSULTATION_GUIDE",
  "PHYSIOTHERAPY_GUIDE",
  "PHYSIOTHERAPY_EVALUATION",
  "ELECTROSTIMULATION",
  "OTHER",
]);
const pdf = (b) => b.length > 5 && b.subarray(0, 5).toString() === "%PDF-";
const raw = express.raw({
  type: ["application/pdf", "image/png", "image/jpeg"],
  limit: "10mb",
});
const imageRaw = express.raw({
  type: ["image/png", "image/jpeg"],
  limit: "5mb",
});
const originalName = (req) =>
  path.basename(
    decodeURIComponent(String(req.headers["x-file-name"] || "arquivo")),
  );

router.use(auth);

async function replaceAsset(req, res, config) {
  const trx = await knex.transaction();
  let target;
  try {
    const ownerId = id(req.params.id),
      mime = String(req.headers["content-type"] || "").split(";")[0],
      body = req.body;
    const validated = validateImageUpload({
      buffer: body,
      mimeType: mime,
      originalName: req.headers["x-file-name"],
      allowedMimeTypes: config.allowedMimeTypes,
    });
    const owner = await trx(config.ownerTable)
      .where({ id: ownerId })
      .forUpdate()
      .first();
    if (!owner)
      throw Object.assign(new Error("Cadastro não encontrado."), {
        status: 404,
      });
    if (config.doctor && owner.type !== "DOCTOR")
      throw Object.assign(
        new Error("Somente médicos podem possuir assinatura."),
        { status: 422 },
      );
    await fs.mkdir(config.root, { recursive: true });
    const filename = `${crypto.randomUUID()}${validated.extension}`;
    target = safeFile(config.root, filename);
    await fs.writeFile(target, body, { flag: "wx" });
    await trx(config.table)
      .where(config.ownerKey, ownerId)
      .where({ active: true })
      .update({ active: false });
    const data = {
      [config.ownerKey]: ownerId,
      file_path: filename,
      original_name: validated.originalName,
      mime_type: mime,
      active: true,
      created_by: req.user.id,
    };
    if (config.signer) {
      let name;
      try {
        name = decodeURIComponent(
          String(req.headers["x-doctor-name"] || ""),
        ).trim();
      } catch {
        throw Object.assign(new Error("Nome do médico inválido."), {
          status: 400,
        });
      }
      if (!name || name.length > 150)
        throw Object.assign(
          new Error("Informe o nome do médico, com até 150 caracteres."),
          { status: 400 },
        );
      data.doctor_name = name;
      let placement;
      try {
        placement = req.headers["x-signature-placement"]
          ? decodeURIComponent(String(req.headers["x-signature-placement"]))
          : null;
      } catch {
        throw Object.assign(new Error("Posição inválida."), { status: 400 });
      }
      data.placement = JSON.stringify(
        require("../services/insuranceSignerPlacement").parsePlacement(
          placement,
        ),
      );
    }
    if (config.fileSize) data.file_size = body.length;
    if (config.assetType) data.asset_type = config.assetType;
    const [assetId] = await trx(config.table).insert(data);
    await trx.commit();
    res.status(201).json({
      id: assetId,
      original_name: data.original_name,
      mime_type: mime,
      active: true,
    });
  } catch (e) {
    await trx.rollback();
    if (target) await fs.unlink(target).catch(() => {});
    handle(res, e);
  }
}
const signatureConfig = {
  table: "professional_signatures",
  ownerTable: "professionals",
  ownerKey: "professional_id",
  root: roots.signatures,
  doctor: true,
  allowedMimeTypes: ["image/png"],
};
const logoConfig = {
  table: "insurance_provider_assets",
  ownerTable: "insurance_providers",
  ownerKey: "insurance_provider_id",
  root: roots.logos,
  assetType: "LOGO",
  fileSize: true,
  allowedMimeTypes: ["image/png", "image/jpeg"],
};
router.post(
  "/professionals/:id/signature",
  modulePermission("professionals", "edit"),
  raw,
  (req, res) => replaceAsset(req, res, signatureConfig),
);
router.get(
  "/professionals/:id/signature",
  modulePermission("professionals"),
  async (req, res) =>
    serveAsset(
      res,
      "professional_signatures",
      "professional_id",
      id(req.params.id),
      roots.signatures,
    ),
);
router.post(
  "/insurance-providers/:id/logo",
  modulePermission("insurance_providers", "edit"),
  imageRaw,
  (req, res) => replaceAsset(req, res, logoConfig),
);
router.get(
  "/insurance-providers/:id/logo",
  modulePermission("insurance_providers"),
  async (req, res) =>
    serveAsset(
      res,
      "insurance_provider_assets",
      "insurance_provider_id",
      id(req.params.id),
      roots.logos,
      { asset_type: "LOGO" },
    ),
);
router.post('/insurance-providers/replicate-signer',
  modulePermission('insurance_providers'),
  modulePermission('insurance_providers','edit'),
  async(req,res)=>{
    try { res.json(await require('../services/insuranceSignerReplication').replicate(knex,req.body,req.user.id,roots.signatures)); }
    catch(error) { handle(res,error); }
  });
const insurerSignerConfig = {
  table: "insurance_provider_signatures",
  ownerTable: "insurance_providers",
  ownerKey: "insurance_provider_id",
  root: roots.signatures,
  allowedMimeTypes: ["image/png"],
  fileSize: true,
  signer: true,
};
router.get(
  "/insurance-providers/:id/signer",
  modulePermission("insurance_providers"),
  async (req, res) => {
    try {
      const row = await knex("insurance_provider_signatures")
        .where({ insurance_provider_id: id(req.params.id), active: true })
        .orderBy("id", "desc")
        .first();
      res.set("Cache-Control", "no-store").json(
        row
          ? {
              id: row.id,
              doctor_name: row.doctor_name,
              has_image: true,
              placement:
                require("../services/insuranceSignerPlacement").parsePlacement(
                  row.placement,
                ),
            }
          : null,
      );
    } catch (e) {
      handle(res, e);
    }
  },
);
router.get(
  "/insurance-providers/:id/signer/image",
  modulePermission("insurance_providers"),
  async (req, res) =>
    serveAsset(
      res,
      "insurance_provider_signatures",
      "insurance_provider_id",
      id(req.params.id),
      roots.signatures,
    ),
);
router.post(
  "/insurance-providers/:id/signer",
  modulePermission("insurance_providers", "edit"),
  imageRaw,
  (req, res) => replaceAsset(req, res, insurerSignerConfig),
);
async function serveAsset(res, table, key, value, root, extra = {}) {
  try {
    const row = await knex(table)
      .where({ [key]: value, active: true, ...extra })
      .orderBy("created_at", "desc")
      .first();
    if (!row)
      throw Object.assign(new Error("Arquivo não encontrado."), {
        status: 404,
      });
    res.type(row.mime_type).sendFile(safeFile(root, row.file_path));
  } catch (e) {
    handle(res, e);
  }
}

router.get(
  "/document-templates",
  modulePermission("document_templates"),
  async (req, res) => {
    try {
      const q = knex("document_templates as dt")
        .leftJoin(
          "insurance_providers as ip",
          "ip.id",
          "dt.insurance_provider_id",
        )
        .select("dt.*", "ip.name as insurance_name")
        .orderBy("dt.name")
        .orderBy("dt.version", "desc");
      if (req.query.document_type)
        q.where("dt.document_type", req.query.document_type);
      if (req.query.insurance_provider_id)
        q.where((b) =>
          b
            .whereNull("dt.insurance_provider_id")
            .orWhere(
              "dt.insurance_provider_id",
              id(req.query.insurance_provider_id),
            ),
        );
      if (req.query.active !== undefined)
        q.where("dt.active", req.query.active === "true");
      res.json(await q);
    } catch (e) {
      handle(res, e);
    }
  },
);
router.post(
  "/document-templates",
  modulePermission("document_templates", "create"),
  async (req, res) => {
    try {
      if (
        !String(req.body.name || "").trim() ||
        !documentTypes.has(req.body.document_type)
      )
        throw Object.assign(
          new Error("Nome e tipo de documento válido são obrigatórios."),
          { status: 400 },
        );
      const [templateId] = await knex("document_templates").insert({
        name: req.body.name.trim(),
        document_type: req.body.document_type,
        insurance_provider_id: req.body.insurance_provider_id || null,
        version: Number(req.body.version) || 1,
        notes: req.body.notes || null,
        active: req.body.active !== false,
        created_by: req.user.id,
      });
      await audit(templateId, req.user.id, "TEMPLATE_CREATED");
      res.status(201).json(await templateWithFields(templateId));
    } catch (e) {
      handle(res, e);
    }
  },
);
router.get(
  "/document-templates/:id",
  modulePermission("document_templates"),
  async (req, res) => {
    try {
      const item = await templateWithFields(id(req.params.id));
      if (!item)
        throw Object.assign(new Error("Modelo não encontrado."), {
          status: 404,
        });
      res.json(item);
    } catch (e) {
      handle(res, e);
    }
  },
);
router.put(
  "/document-templates/:id",
  modulePermission("document_templates", "edit"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      let templateId = id(req.params.id),
        data = {};
      if (req.body.active !== undefined)
        throw Object.assign(
          new Error("Altere a situação pela ação Ativar/Desativar, que exige permissão de exclusão."),
          { status: 400 },
        );
      for (const key of [
        "name",
        "document_type",
        "insurance_provider_id",
        "notes",
      ])
        if (req.body[key] !== undefined)
          data[key] = req.body[key] || null;
      if (data.document_type && !documentTypes.has(data.document_type))
        throw Object.assign(new Error("Tipo de documento inválido."), {
          status: 400,
        });
      if (Object.keys(data).length)
        ({ templateId } = await cloneIfUsed(trx, templateId, req.user.id));
      if (Object.keys(data).length)
        await trx("document_templates").where({ id: templateId }).update(data);
      await trx("document_template_audit").insert({
        document_template_id: templateId,
        user_id: req.user.id,
        action: "TEMPLATE_UPDATED",
        metadata: JSON.stringify({ fields: Object.keys(data) }),
      });
      await trx.commit();
      res.json(await templateWithFields(templateId));
    } catch (e) {
      await trx.rollback();
      handle(res, e);
    }
  },
);
router.patch(
  "/document-templates/:id/active",
  modulePermission("document_templates", "delete"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      const templateId = id(req.params.id);
      if (typeof req.body.active !== "boolean")
        throw Object.assign(new Error("Informe o estado ativo do modelo."), {
          status: 400,
        });
      const template = await trx("document_templates")
        .where({ id: templateId })
        .forUpdate()
        .first();
      if (!template)
        throw Object.assign(new Error("Modelo não encontrado."), {
          status: 404,
        });
      await trx("document_templates")
        .where({ id: templateId })
        .update({ active: req.body.active });
      await trx("document_template_audit").insert({
        document_template_id: templateId,
        user_id: req.user.id,
        action: req.body.active ? "TEMPLATE_ACTIVATED" : "TEMPLATE_DEACTIVATED",
        metadata: JSON.stringify({ active: req.body.active }),
      });
      await trx.commit();
      res.json(await templateWithFields(templateId));
    } catch (e) {
      await trx.rollback();
      handle(res, e);
    }
  },
);
router.delete(
  "/document-templates/:id",
  modulePermission("document_templates", "delete"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      const templateId = id(req.params.id);
      const template = await trx("document_templates")
        .where({ id: templateId })
        .forUpdate()
        .first();
      if (!template)
        throw Object.assign(new Error("Modelo não encontrado."), {
          status: 404,
        });

      const used = await trx("guide_process_documents")
        .where({ document_template_id: templateId })
        .first("id");
      if (used)
        throw Object.assign(
          new Error(
            "Este modelo já está vinculado a documentos e não pode ser excluído. Você pode desativá-lo para mantê-lo no histórico.",
          ),
          { status: 409 },
        );

      const filePath = template.template_file_path
        ? safeFile(roots.templates, template.template_file_path)
        : null;
      await trx("document_template_audit").insert({
        document_template_id: templateId,
        user_id: req.user.id,
        action: "TEMPLATE_DELETED",
        metadata: JSON.stringify({ name: template.name, version: template.version }),
      });
      await trx("document_templates").where({ id: templateId }).del();
      const fileStillUsed = filePath
        ? await trx("document_templates")
            .where({ template_file_path: template.template_file_path })
            .first("id")
        : null;
      await trx.commit();
      if (filePath && !fileStillUsed) await fs.unlink(filePath).catch(() => {});
      res.status(204).send();
    } catch (e) {
      await trx.rollback();
      if (e.code === "ER_ROW_IS_REFERENCED_2" || e.errno === 1451)
        return res.status(409).json({
          error:
            "Este modelo já está vinculado a documentos e não pode ser excluído. Você pode desativá-lo para mantê-lo no histórico.",
        });
      handle(res, e);
    }
  },
);
router.post(
  "/document-templates/:id/file",
  modulePermission("document_templates", "edit"),
  raw,
  async (req, res) => {
    const trx = await knex.transaction();
    let target;
    try {
      let templateId = id(req.params.id);
      if (!Buffer.isBuffer(req.body) || !pdf(req.body))
        throw Object.assign(new Error("O modelo deve ser um PDF válido."), {
          status: 400,
        });
      ({ templateId } = await cloneIfUsed(trx, templateId, req.user.id));
      await fs.mkdir(roots.templates, { recursive: true });
      const filename = `${crypto.randomUUID()}.pdf`;
      target = safeFile(roots.templates, filename);
      await fs.writeFile(target, req.body, { flag: "wx" });
      await trx("document_templates")
        .where({ id: templateId })
        .update({ template_file_path: filename, template_format: "PDF" });
      await trx("document_template_audit").insert({
        document_template_id: templateId,
        user_id: req.user.id,
        action: "TEMPLATE_UPDATED",
        metadata: JSON.stringify({ file: originalName(req) }),
      });
      await trx.commit();
      res.json(await templateWithFields(templateId));
    } catch (e) {
      await trx.rollback();
      if (target) await fs.unlink(target).catch(() => {});
      handle(res, e);
    }
  },
);
router.put(
  "/document-templates/:id/fields",
  modulePermission("document_templates", "edit"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      let templateId = id(req.params.id);
      const fields = Array.isArray(req.body.fields) ? req.body.fields : [];
      for (const f of fields)
        if (
          !fieldKeys.has(f.field_key) ||
          !Number.isInteger(Number(f.page)) ||
          Number(f.page) < 1 ||
          !Number.isFinite(Number(f.x)) ||
          !Number.isFinite(Number(f.y))
        )
          throw Object.assign(
            new Error(
              `Configuração inválida para o campo ${f.field_key || ""}.`,
            ),
            { status: 400 },
          );
      ({ templateId } = await cloneIfUsed(trx, templateId, req.user.id));
      await trx("document_template_fields")
        .where({ document_template_id: templateId })
        .del();
      if (fields.length)
        await trx("document_template_fields").insert(
          fields.map((f) => ({
            document_template_id: templateId,
            field_key: f.field_key,
            page: Number(f.page),
            x: Number(f.x),
            y: Number(f.y),
            width: f.width || null,
            height: f.height || null,
            font_size: f.font_size || null,
            alignment: f.alignment || null,
            options: f.options ? JSON.stringify(f.options) : null,
          })),
        );
      await trx("document_template_audit").insert({
        document_template_id: templateId,
        user_id: req.user.id,
        action: "TEMPLATE_UPDATED",
        metadata: JSON.stringify({ fields: fields.length }),
      });
      await trx.commit();
      res.json(await templateWithFields(templateId));
    } catch (e) {
      await trx.rollback();
      handle(res, e);
    }
  },
);
async function templateWithFields(templateId, db = knex) {
  const row = await db("document_templates").where({ id: templateId }).first();
  if (row)
    row.fields = await db("document_template_fields")
      .where({ document_template_id: templateId })
      .orderBy(["page", "id"]);
  return row;
}
async function audit(templateId, userId, action, metadata) {
  await knex("document_template_audit").insert({
    document_template_id: templateId,
    user_id: userId,
    action,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

router.post(
  "/guide-processes/:id/procedures",
  modulePermission("guide_processes", "create"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      const processId = id(req.params.id),
        procedureId = id(req.body.procedure_id),
        quantity = Number(req.body.requested_quantity);
      if (!Number.isInteger(quantity) || quantity < 1)
        throw Object.assign(
          new Error("A quantidade solicitada deve ser maior que zero."),
          { status: 422 },
        );
      await lockOpen(trx,processId,"central");
      const [rowId] = await trx("guide_process_procedures").insert({
        guide_process_id: processId,
        procedure_id: procedureId,
        requested_quantity: quantity,
        authorized_quantity: req.body.authorized_quantity ?? null,
        notes: req.body.notes || null,
      });
      await trx.commit();
      res
        .status(201)
        .json(
          await knex("guide_process_procedures").where({ id: rowId }).first(),
        );
    } catch (e) {
      await trx.rollback();
      handle(res, e);
    }
  },
);
router.delete(
  "/guide-processes/:processId/procedures/:id",
  modulePermission("guide_processes", "delete"),
  async (req, res) => {
    const trx = await knex.transaction();
    try {
      await lockOpen(trx,id(req.params.processId),"central");
      await trx("guide_process_procedures")
        .where({
          id: id(req.params.id),
          guide_process_id: id(req.params.processId),
        })
        .del();
      await trx.commit();
      res.status(204).send();
    } catch (e) {
      await trx.rollback();
      handle(res, e);
    }
  },
);

router.get(
  "/guide-processes/:id/document-generation-options",
  modulePermission("guide_processes"),
  async (req, res) => {
    try {
      const processId = id(req.params.id);
      const treatment = await knex("guide_processes as gp")
        .leftJoin(
          "patient_insurances as pi",
          "pi.id",
          "gp.patient_insurance_id",
        )
        .where("gp.id", processId)
        .select("gp.id", "pi.insurance_provider_id")
        .first();
      if (!treatment)
        throw Object.assign(new Error("Tratamento não encontrado."), {
          status: 404,
        });
      const custom = await knex("document_templates")
        .where({ active: true })
        .whereIn("document_type", [
          "CONSULTATION_GUIDE",
          "PHYSIOTHERAPY_GUIDE",
          "ELECTROSTIMULATION",
        ])
        .whereNotNull("template_file_path")
        .where((query) =>
          query
            .whereNull("insurance_provider_id")
            .orWhere(
              "insurance_provider_id",
              treatment.insurance_provider_id || null,
            ),
        )
        .orderBy("name")
        .orderBy("version", "desc");
      res.json([...custom, ...sadt.options()]);
    } catch (error) {
      handle(res, error);
    }
  },
);

async function generationContext(
  processId,
  templateReference,
  db = knex,
  reviewBody = null,
  userId = null,
) {
  const unified = sadt.unifiedTypes(reviewBody?.unified_document_types);
  if (unified && (templateReference !== sadt.referenceFor(unified[0]) || reviewBody?.code_review_id))
    throw Object.assign(new Error('Use o modelo SADT padrão e os procedimentos do tratamento para unificar.'), {status:422});
  const process = await db("guide_processes as gp")
    .join("patients as p", "p.id", "gp.patient_id")
    .leftJoin("patient_insurances as pi", "pi.id", "gp.patient_insurance_id")
    .leftJoin("insurance_providers as ip", "ip.id", "pi.insurance_provider_id")
    .leftJoin("professionals as dr", "dr.id", "gp.requesting_doctor_id")
    .where("gp.id", processId)
    .leftJoin("professionals as ph", "ph.id", "gp.physiotherapist_id")
    .leftJoin("physiotherapy_evaluations as ev", "ev.guide_process_id", "gp.id")
    .select(
      "gp.*",
      "ev.status as evaluation_status",
      "ev.chief_complaint",
      "ev.current_history",
      "ev.functional_limitations",
      "ev.physical_exam",
      "ev.pain_score",
      "ev.pain_classification",
      "ev.pain_location",
      "ev.severity",
      "ev.severity_justification",
      "ev.care_risk",
      "ev.individual_monitoring",
      "ev.precautions",
      "ev.specific_care_notes",
      "ev.therapeutic_goals",
      "ev.conducts",
      "ev.conduct_description",
      "ev.reevaluation_date",
      "ev.reevaluation_notes",
      "ev.regions",
      "ev.evaluation_date",
      "p.full_name as patient_name",
      "p.birth_date",
      "p.cpf as patient_cpf",
      "p.gender",
      "p.cellphone",
      "p.phone as patient_phone",
      "pi.card_number",
      "pi.card_expiration",
      "ip.id as insurance_provider_id",
      "ip.ans_registration",
      "ip.name as insurance_name",
      "ip.authorization_type",
      "dr.full_name as doctor_name",
      "dr.council as doctor_council",
      "dr.council_number as doctor_council_number",
      "dr.state as doctor_state",
      "dr.cbo as doctor_cbo",
      "ph.full_name as physiotherapist_name",
      "ph.council as physiotherapist_council",
      "ph.council_number as physiotherapist_council_number",
      "ph.state as physiotherapist_state",
      "ph.cbo as physiotherapist_cbo",
    )
    .first();
  const template =
    sadt.templateFor(String(templateReference)) ||
    (await templateWithFields(id(templateReference), db));
  if (
    !process ||
    !template ||
    !template.active ||
    !template.template_file_path ||
    template.document_type === "OTHER" ||
    (template.insurance_provider_id &&
      template.insurance_provider_id !== process.insurance_provider_id)
  )
    throw Object.assign(
      new Error("Processo ou modelo aplicável não encontrado."),
      { status: 404 },
    );
  if (['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'].includes(template.document_type)) {
    const item=(await require('../services/guideAuthorization').list(db,process)).find(i=>i.document_type===template.document_type);
    if(item) {process.authorization_number=item.authorization_number;process.authorization_date=item.authorization_date;process.expiration_date=item.expiration_date;process.authorized_sessions=item.authorized_sessions;}
  }
  await fs
    .access(
      template.builtin_key === sadt.BUILTIN_KEY
        ? sadt.builtinFile
        : safeFile(roots.templates, template.template_file_path),
    )
    .catch(() => {
      throw Object.assign(
        new Error("Arquivo PDF do modelo não está disponível."),
        { status: 422 },
      );
    });
  let sourceDocumentId = null,
    sourcePage = null;
  let procedures;
  if (reviewBody?.code_review_id) {
    const reviewed = await codeReview.reviewedProcedures(
      db,
      reviewBody,
      userId,
      processId,
      process.insurance_provider_id,
    );
    procedures = reviewed.procedures;
    sourceDocumentId = reviewed.sourceDocumentId;
    sourcePage = reviewed.sourcePage;
  } else {
    let original = await db("guide_process_procedures as g")
      .join("procedures as p", "p.id", "g.procedure_id")
      .where("g.guide_process_id", processId)
      .select("g.*", "p.code", "p.description", "p.type", "p.table_name");
    if (Object.hasOwn({CONSULTATION_GUIDE:1,PHYSIOTHERAPY_GUIDE:1,ELECTROSTIMULATION:1}, template.document_type))
      original = sadt.selectProcedures(unified || template.document_type, original);
    if (Array.isArray(reviewBody?.code_selection))
      original = original.filter((row) =>
        reviewBody.code_selection.some(
          (item) => Number(item.procedure_id) === Number(row.procedure_id),
        ),
      );
    procedures = await procedureCodes.resolve(
      db,
      original,
      process.insurance_provider_id,
    );
    if (reviewBody?.code_selection) {
      if (
        !Array.isArray(reviewBody.code_selection) ||
        !reviewBody.code_selection.length ||
        reviewBody.code_selection.length > 5
      )
        throw procedureCodes.fail("Selecione de um a cinco procedimentos.");
      const seen = new Set();
      procedures = reviewBody.code_selection.map((item) => {
        const source = procedures.find(
            (row) => Number(row.procedure_id) === Number(item.procedure_id),
          ),
          quantity = Number(item.requested_quantity);
        if (
          !source ||
          seen.has(Number(item.procedure_id)) ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > 999
        )
          throw procedureCodes.fail(
            "Seleção ou quantidade inválida. Confira novamente os procedimentos.",
          );
        seen.add(Number(item.procedure_id));
        return { ...source, requested_quantity: quantity };
      });
      const snapshot = JSON.stringify(
        procedures.map((row) => ({
          code: row.code,
          description: row.description,
          table: row.table_name,
          rule: row.mapping_rule_id,
          quantity: row.requested_quantity,
        })),
      );
      if (snapshot !== reviewBody.code_selection_snapshot)
        throw Object.assign(
          new Error(
            "Os códigos foram alterados após a conferência. Feche e abra a conferência novamente.",
          ),
          { status: 409 },
        );
    }
  }
  if (['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'].includes(template.document_type))
    procedures = sadt.selectProcedures(unified || template.document_type, procedures);
  if (template.builtin_key === sadt.BUILTIN_KEY) {
    process.referral_date = process.referral_date || process.assessment_date;
    process.medical_diagnosis = [
      process.medical_diagnosis,
      process.cid ? `CID: ${process.cid}` : null,
    ]
      .filter(Boolean)
      .join(" - ");
  }
  const missing = [];
  if (!process.patient_name) missing.push("paciente");
  if (!process.insurance_name) missing.push("convênio");
  if (!process.card_number) missing.push("carteirinha");
  if (!process.requesting_doctor_id) missing.push("médico solicitante");
  for (const [key, label] of Object.entries({
    doctor_name: "nome do médico",
    doctor_council: "conselho do médico",
    doctor_council_number: "registro do médico",
    doctor_state: "UF do médico",
  }))
    if (!process[key]) missing.push(label);
  if (!process.assessment_date) missing.push("data");
  if (!procedures.length) missing.push("procedimentos");
  if (
    template.document_type === "CONSULTATION_GUIDE" &&
    !procedures.some((p) => p.type === "CONSULTATION")
  )
    missing.push("procedimento de consulta");
  if (
    (unified || [template.document_type]).includes("PHYSIOTHERAPY_GUIDE") &&
    !process.physiotherapist_id
  )
    missing.push("fisioterapeuta");
  if (
    template.builtin_key === sadt.BUILTIN_KEY &&
    template.document_type === "PHYSIOTHERAPY_GUIDE"
  ) {
    if (!procedures.some((procedure) => procedure.type === "PHYSIOTHERAPY"))
      missing.push("procedimento de fisioterapia");
  }
  for (const type of unified || [])
    if (!sadt.selectProcedures(type, procedures).length) missing.push('procedimento de ' + type);
  if (unified) template.name = 'Guia SADT unificada';
  const signerRow =
    template.builtin_key === sadt.BUILTIN_KEY && process.insurance_provider_id
      ? await db("insurance_provider_signatures")
          .where({
            insurance_provider_id: process.insurance_provider_id,
            active: true,
          })
          .orderBy("id", "desc")
          .first()
      : null;
  const signerPlacement = signerRow
    ? require("../services/insuranceSignerPlacement").parsePlacement(
        signerRow.placement,
      )
    : null;
  const insuranceSigner = signerPlacement
    ? { ...signerRow, placement: signerPlacement }
    : null;
  const signature =
    !insuranceSigner &&
    template.fields.some((f) => f.field_key === "DOCTOR_SIGNATURE")
      ? await db("professional_signatures")
          .where({
            professional_id: process.requesting_doctor_id,
            active: true,
          })
          .orderBy("created_at", "desc")
          .first()
      : null;
  const logo = template.fields.some((f) => f.field_key === "INSURANCE_LOGO")
    ? await db("insurance_provider_assets")
        .where({
          insurance_provider_id: process.insurance_provider_id,
          asset_type: "LOGO",
          active: true,
        })
        .orderBy("created_at", "desc")
        .first()
    : null;
  for (const f of template.fields) {
    let options = f.options;
    if (typeof options === "string")
      try {
        options = JSON.parse(options);
      } catch {
        options = {};
      }
    if (
      options?.required &&
      f.field_key === "DOCTOR_SIGNATURE" &&
      !signature &&
      !insuranceSigner
    )
      missing.push("assinatura do médico");
    if (options?.required && f.field_key === "INSURANCE_LOGO" && !logo)
      missing.push("logo do convênio");
  }
  if (missing.includes("logo do convênio"))
    throw Object.assign(
      new Error(
        "Este modelo exige a logo do convênio, mas nenhuma logo está cadastrada.",
      ),
      { status: 422, missing: ["logo do convênio"] },
    );
  if (missing.length)
    throw Object.assign(
      new Error(
        `Não foi possível gerar. Campos faltantes: ${[...new Set(missing)].join(", ")}.`,
      ),
      { status: 422, missing: [...new Set(missing)] },
    );
  return {
    process,
    template,
    procedures,
    signature,
    insuranceSigner,
    logo,
    sourceDocumentId,
    sourcePage,
    unifiedTypes: unified,
  };
}
router.post(
  "/guide-processes/:id/documents/preview",
  modulePermission("guide_processes", "edit"),
  async (req, res) => {
    try {
      const processId = id(req.params.id),
        ctx = await generationContext(
          processId,
          req.body.template_id,
          knex,
          req.body,
          req.user.id,
        ),
        buffer = await generateDocument(ctx);
      await history(
        knex,
        processId,
        req.user.id,
        "DOCUMENT_PREVIEWED",
        null,
        null,
        null,
        { templateId: ctx.template.id, version: ctx.template.version },
      );
      res.type("application/pdf").set("Cache-Control", "no-store").send(buffer);
    } catch (e) {
      if (e.missing)
        return res
          .status(e.status)
          .json({ error: e.message, missing: e.missing });
      handle(res, e);
    }
  },
);
router.post(
  "/guide-processes/:id/documents/generate",
  modulePermission("guide_processes", "edit"),
  async (req, res) => {
    const trx = await knex.transaction();
    let target,
      committed = false;
    try {
      const processId = id(req.params.id);
      // Serialize generations for the same treatment, including the first version.
      const treatment = await trx("guide_processes")
        .where({ id: processId })
        .forUpdate()
        .first();
      if (!treatment)
        throw Object.assign(new Error("Tratamento não encontrado."), {
          status: 404,
        });
      if (
        (req.body.code_review_id || req.body.code_selection || req.body.unified_document_types) &&
        req.body.codes_confirmed !== true
      )
        throw Object.assign(
          new Error(
            "Confira e confirme os códigos e quantidades antes de gerar.",
          ),
          { status: 422 },
        );
      assertOpen(treatment,"documents");
      if (req.body.unified_document_types && !Array.isArray(req.body.code_selection))
        throw Object.assign(new Error('Confira os procedimentos do tratamento antes de unificar.'), {status:422});
      await require('../services/treatmentStages').assertStageUnlocked(trx,treatment,'documents');
      const ctx = await generationContext(
        processId,
        req.body.template_id,
        trx,
        req.body,
        req.user.id,
      );
      const buffer = await generateDocument(ctx);
      const previous = await trx("guide_process_documents")
        .where({
          guide_process_id: processId,
          document_type: ctx.template.document_type,
          document_role: "GENERATED",
        })
        .orderBy("document_version", "desc")
        .first();
      const nextVersion = Number(previous?.document_version || 0) + 1;
      await fs.mkdir(roots.generated, { recursive: true });
      const filename = crypto.randomUUID() + ".pdf";
      target = safeFile(roots.generated, filename);
      await fs.writeFile(target, buffer, { flag: "wx" });
      const [documentId] = await trx("guide_process_documents").insert({
        guide_process_id: processId,
        document_type: ctx.template.document_type,
        file_path: filename,
        original_name: ctx.template.name + "-v" + nextVersion + ".pdf",
        mime_type: "application/pdf",
        file_size: buffer.length,
        source: "GENERATED",
        document_role: "GENERATED",
        document_version: nextVersion,
        is_usable: true,
        uploaded_by: req.user.id,
        document_template_id: ctx.template.id,
        template_version: ctx.template.version,
        signature_id: ctx.signature?.id || null,
      });
      const unifiedDocumentIds = [documentId];
      for (const type of (ctx.unifiedTypes || []).filter(type => type !== ctx.template.document_type)) {
        const latest = await trx('guide_process_documents').where({guide_process_id:processId,document_type:type,document_role:'GENERATED'}).orderBy('document_version','desc').first();
        const [linkedId] = await trx('guide_process_documents').insert({
          guide_process_id:processId, document_type:type, file_path:filename,
          original_name:ctx.template.name+'-v'+nextVersion+'.pdf', mime_type:'application/pdf', file_size:buffer.length,
          source:'GENERATED', document_role:'GENERATED', document_version:Number(latest?.document_version || 0)+1,
          is_usable:true, uploaded_by:req.user.id, document_template_id:ctx.template.id, template_version:ctx.template.version,
          signature_id:ctx.signature?.id || null,
        });
        unifiedDocumentIds.push(linkedId);
      }
      const transition = await syncDocumentStatus(trx, processId);
      await history(
        trx,
        processId,
        req.user.id,
        previous ? "DOCUMENT_REGENERATED" : "DOCUMENT_GENERATED",
        null,
        null,
        ctx.template.document_type,
        {
          documentId,
          documentVersion: nextVersion,
          unifiedDocumentTypes: ctx.unifiedTypes,
          unifiedDocumentIds,
          templateId: ctx.template.id,
          templateKey: ctx.template.builtin_key || null,
          templateVersion: ctx.template.version,
          doctorId: ctx.process.requesting_doctor_id,
          signatureId: ctx.signature?.id || null,
          insuranceSignerId: ctx.insuranceSigner?.id || null,
          insuranceSignerPlacement: ctx.insuranceSigner?.placement || null,
          sourceDocumentId: ctx.sourceDocumentId,
          sourcePage: ctx.sourcePage,
          procedureCodes: ctx.procedures.map((p) => ({
            sourceCode: p.source_code,
            code: p.code,
            description: p.description,
            table: p.table_name,
            ruleId: p.mapping_rule_id,
            quantity: p.requested_quantity,
          })),
        },
      );
      if (
        treatment.authorization_status === "NOT_READY" &&
        transition.authorization_status === "READY"
      )
        await history(
          trx,
          processId,
          req.user.id,
          "TREATMENT_READY_FOR_AUTHORIZATION",
          "authorization_status",
          "NOT_READY",
          "READY",
        );
      await trx.commit();
      committed = true;
      // A failed post-commit refresh must not delete an already-saved document.
      const saved = (await documents(processId).catch(() => [])).find(
        (document) => document.id === documentId,
      );
      res.status(201).json(
        saved || {
          id: documentId,
          document_type: ctx.template.document_type,
          document_role: "GENERATED",
          source: "GENERATED",
          document_version: nextVersion,
          original_name: ctx.template.name + "-v" + nextVersion + ".pdf",
          mime_type: "application/pdf",
          is_usable: true,
        },
      );
    } catch (error) {
      if (!committed) {
        await trx.rollback();
        if (target) await fs.unlink(target).catch(() => {});
      }
      if (error.missing)
        return res
          .status(error.status)
          .json({ error: error.message, missing: error.missing });
      handle(res, error);
    }
  },
);

async function evaluationContext(processId) {
  const process = await knex("guide_processes as gp")
    .join("patients as p", "p.id", "gp.patient_id")
    .leftJoin("patient_insurances as pi", "pi.id", "gp.patient_insurance_id")
    .leftJoin("insurance_providers as ip", "ip.id", "pi.insurance_provider_id")
    .leftJoin("professionals as dr", "dr.id", "gp.requesting_doctor_id")
    .leftJoin("professionals as ph", "ph.id", "gp.physiotherapist_id")
    .leftJoin("physiotherapy_evaluations as ev", "ev.guide_process_id", "gp.id")
    .leftJoin("guide_authorizations as ga", function () {
      this.on("ga.guide_process_id", "=", "gp.id").andOn(
        "ga.id",
        "=",
        knex.raw(
          "(SELECT MAX(a.id) FROM guide_authorizations a WHERE a.guide_process_id = gp.id AND (a.document_type IS NULL OR a.document_type='PHYSIOTHERAPY_GUIDE'))",
        ),
      );
    })
    .where("gp.id", processId)
    .select(
      "gp.*",
      "ev.status as evaluation_status",
      "ev.chief_complaint",
      "ev.current_history",
      "ev.functional_limitations",
      "ev.physical_exam",
      "ev.pain_score",
      "ev.pain_classification",
      "ev.pain_location",
      "ev.severity",
      "ev.severity_justification",
      "ev.care_risk",
      "ev.individual_monitoring",
      "ev.precautions",
      "ev.specific_care_notes",
      "ev.therapeutic_goals",
      "ev.conducts",
      "ev.conduct_description",
      "ev.reevaluation_date",
      "ev.reevaluation_notes",
      "ev.regions",
      "ev.evaluation_date",
      "p.full_name as patient_name",
      "p.cpf as patient_cpf",
      "p.birth_date",
      "p.gender",
      "p.cellphone",
      "p.phone as patient_phone",
      "pi.card_number",
      "pi.card_expiration",
      "ip.name as insurance_name",
      "dr.full_name as doctor_name",
      "dr.council as doctor_council",
      "dr.council_number as doctor_council_number",
      "dr.state as doctor_state",
      "ph.full_name as physiotherapist_name",
      "ph.council as physiotherapist_council",
      "ph.council_number as physiotherapist_council_number",
      "ph.state as physiotherapist_state",
      "ga.authorization_number",
    )
    .first();
  if (!process)
    throw Object.assign(new Error("Tratamento não encontrado."), {
      status: 404,
    });
  const evaluation = await knex("physiotherapy_evaluations")
    .where({ guide_process_id: processId })
    .first();
  if (evaluation) {
    const details = require("../services/evaluationValidation").serialize(
      evaluation,
    );
    process.evaluation_details = details;
    for (const key of [
      "body_marks",
      "signature_strokes",
      "planned_total_sessions",
      "sessions_per_week",
    ])
      process[key] = details[key];
    process.doctor_name = details.referral_professional || process.doctor_name;
    process.authorization_number =
      details.authorization_reference || process.authorization_number;
    process.physiotherapist_name =
      details.responsible_name || process.physiotherapist_name;
    if (details.responsible_crefito) {
      process.physiotherapist_council = "CREFITO";
      process.physiotherapist_council_number = details.responsible_crefito;
      process.physiotherapist_state = "";
    }
    process.assessment_date =
      details.evaluation_date || process.assessment_date;
  }
  return process;
}

router.post(
  "/guide-processes/:id/physiotherapy-evaluation/preview",
  modulePermission("guide_processes"),
  async (req, res) => {
    try {
      const buffer = await generatePhysiotherapyEvaluation(
        await evaluationContext(id(req.params.id)),
      );
      res.type("application/pdf").set("Cache-Control", "no-store").send(buffer);
    } catch (e) {
      handle(res, e);
    }
  },
);

router.post(
  "/guide-processes/:id/physiotherapy-evaluation/generate",
  modulePermission("guide_processes", "edit"),
  async (req, res) => {
    const trx = await knex.transaction();
    let target;
    try {
      const processId = id(req.params.id);
      await lockOpen(trx,processId,"evaluation_document");
      const buffer = await generatePhysiotherapyEvaluation(
          await evaluationContext(processId),
        );
      const latest = await trx("guide_process_documents")
        .where({
          guide_process_id: processId,
          document_type: "PHYSIOTHERAPY_EVALUATION",
        })
        .max("document_version as version")
        .first();
      const version = Number(latest?.version) || 0,
        nextVersion = version + 1;
      await fs.mkdir(roots.generated, { recursive: true });
      const filename = `${crypto.randomUUID()}.pdf`;
      target = safeFile(roots.generated, filename);
      await fs.writeFile(target, buffer, { flag: "wx" });
      const [documentId] = await trx("guide_process_documents").insert({
        guide_process_id: processId,
        document_type: "PHYSIOTHERAPY_EVALUATION",
        file_path: filename,
        original_name: `Ficha-de-Avaliacao-Fisioterapeutica-v${nextVersion}.pdf`,
        mime_type: "application/pdf",
        file_size: buffer.length,
        source: "GENERATED",
        document_role: "GENERATED",
        document_version: nextVersion,
        is_usable: true,
        uploaded_by: req.user.id,
      });
      await history(
        trx,
        processId,
        req.user.id,
        version ? "DOCUMENT_REGENERATED" : "DOCUMENT_GENERATED",
        null,
        null,
        "PHYSIOTHERAPY_EVALUATION",
        { documentId, documentVersion: nextVersion },
      );
      await trx.commit();
      res
        .status(201)
        .json((await documents(processId)).find((d) => d.id === documentId));
    } catch (e) {
      await trx.rollback();
      if (target) await fs.unlink(target).catch(() => {});
      handle(res, e);
    }
  },
);

module.exports = router;

module.exports.generationContext = generationContext;
