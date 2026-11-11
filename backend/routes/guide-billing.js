const express = require("express"),
  auth = require("../middleware/auth"),
  { modulePermission } = require("../middleware/permission");
const { knex, id, handle } = require("./guide-center"),
  service = require("../services/guideBilling");
const router = express.Router();
router.use(auth);
router.get(
  "/guide-processes/:id/billing",
  modulePermission("guide_processes"),
  modulePermission("guide_billing"),
  async (req, res) => {
    try {
      const process = await knex("guide_processes").where({ id: id(req.params.id) }).first();
      if (!process) throw Object.assign(new Error("Tratamento não encontrado."), { status: 404 });
      await require("../services/treatmentStages").assertStageUnlocked(knex, process, "billing");
      res
        .set("Cache-Control", "no-store")
        .json(await service.list(knex, id(req.params.id)));
    } catch (e) {
      handle(res, e);
    }
  },
);
router.patch(
  "/guide-processes/:id/billing/:type",
  modulePermission("guide_processes"),
  modulePermission("guide_billing", "edit"),
  async (req, res) => {
    try {
      res.json(
        await service.change(
          knex,
          id(req.params.id),
          req.params.type,
          req.user.id,
          req.body,
        ),
      );
    } catch (e) {
      handle(res, e);
    }
  },
);
module.exports = router;
