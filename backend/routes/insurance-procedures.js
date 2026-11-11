const express = require("express"),
  auth = require("../middleware/auth"),
  { modulePermission } = require("../middleware/permission");
const { knex, id } = require("./guide-center"),
  service = require("../services/insuranceProcedureService");
const {
  getAuthenticatedStenciService,
  normalizeStenciSessionError,
} = require("../services/authenticatedStenciService");
const router = express.Router();
router.use(auth);
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    res.status(e.status || (e.code === "ER_DUP_ENTRY" ? 409 : 500)).json({
      error: e.status
        ? e.message
        : e.code === "ER_DUP_ENTRY"
          ? "Cadastro já existente. Atualize a tela."
          : "Não foi possível salvar os procedimentos do convênio.",
      ...(e.status && e.code ? { code: e.code } : {}),
    });
  }
};
router.post(
  "/insurance-providers/from-stenci",
  modulePermission("insurance_providers"),
  wrap(async (req, res) => {
    let item;
    try {
      const context = getAuthenticatedStenciService(req);
      const result = await context.service.listInsurances();
      item = result.items.find(
        (row) => String(row.id) === String(req.body.external_id),
      );
    } catch (error) {
      throw normalizeStenciSessionError(
        error,
        req.user.sid,
        require("../services/StenciSessionStore").stenciSessionStore,
      );
    }
    if (!item?.name)
      throw Object.assign(
        new Error("Convênio não encontrado no Stenci. Atualize a lista."),
        { status: 422 },
      );
    const provider = await knex.transaction(async (trx) => {
      let old = await trx("insurance_providers")
        .where({ external_source: "STENCI", external_id: String(item.id) })
        .first();
      if (old) {
        await trx("insurance_providers")
          .where({ id: old.id })
          .update({ name: item.name });
        return { ...old, name: item.name };
      }
      const [id] = await trx("insurance_providers").insert({
        name: item.name,
        external_source: "STENCI",
        external_id: String(item.id),
        active: true,
        authorization_type: "PRE_AUTHORIZATION",
      });
      return trx("insurance_providers").where({ id }).first();
    });
    res.json(provider);
  }),
);
router.post(
  "/insurance-providers/replicate-procedures",
  modulePermission("insurance_providers"),
  modulePermission("procedures"),
  modulePermission("procedures", "create"),
  wrap(async (req, res) =>
    res.json(
      await service.replicate(
        knex,
        req.body.source_id,
        req.body.destination_ids,
        req.body.procedure_ids,
      ),
    ),
  ),
);
router.get(
  "/insurance-providers/:id/procedures",
  modulePermission("insurance_providers"),
  modulePermission("procedures"),
  wrap(async (req, res) =>
    res.json(await service.list(knex, id(req.params.id))),
  ),
);
router.post(
  "/insurance-providers/:id/procedures",
  modulePermission("insurance_providers"),
  modulePermission("procedures", "create"),
  wrap(async (req, res) =>
    res.status(201).json(await service.save(knex, id(req.params.id), req.body)),
  ),
);
router.put(
  "/insurance-providers/:id/procedures/:procedureId",
  modulePermission("insurance_providers"),
  modulePermission("procedures", "edit"),
  wrap(async (req, res) =>
    res.json(
      await service.save(
        knex,
        id(req.params.id),
        req.body,
        id(req.params.procedureId),
      ),
    ),
  ),
);
router.post(
  "/insurance-providers/:id/procedures/link",
  modulePermission("insurance_providers"),
  modulePermission("procedures", "create"),
  wrap(async (req, res) => res.json(await service.linkExisting(knex, id(req.params.id), req.body.procedure_ids))),
);
module.exports = router;
