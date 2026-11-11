const express = require("express"),
  { modulePermission } = require("../middleware/permission"),
  ops = require("../services/inventoryOperations"),
  { isAdmin, allSectors } = require("../services/inventoryWorkflow");
module.exports = ({ db, wrap }) => {
  const router = express.Router();
  for (const [slug, table, module, purchase] of [
    ["consumptions", "inventory_consumptions", "inventory_consumptions", false],
    [
      "purchase-orders",
      "inventory_purchase_orders",
      "inventory_purchase_orders",
      true,
    ],
  ]) {
    router.get(
      "/" + slug + "-options",
      modulePermission(module),
      wrap(async (req, res) => {
        let sectors = db("inventory_sectors")
          .where({ active: true })
          .orderBy("name");
        if (!(purchase ? allSectors(req.user) : isAdmin(req.user)))
          sectors.where("id", req.user.sector_id || -1);
        sectors = await sectors;
        if (!sectors.length)
          throw Object.assign(
            new Error(
              "Vincule o usuário a um setor ativo em Configurações → Permissões.",
            ),
            { status: 422 },
          );
        const sectorId = await ops.sector(
          db,
          req.user,
          req.query.sector_id || req.user.sector_id || sectors[0].id,
          purchase,
        );
        const products = await db("inventory_products as p")
          .leftJoin("inventory_balances as b", function () {
            this.on("b.product_id", "=", "p.id").andOn(
              "b.sector_id",
              "=",
              db.raw("?", [sectorId]),
            );
          })
          .where("p.active", true)
          .select("p.*", db.raw("COALESCE(b.quantity,0) as balance"))
          .orderBy("p.name");
        res.json({ sectors, sector_id: sectorId, products });
      }),
    );
    router.get(
      "/" + slug,
      modulePermission(module),
      wrap(async (req, res) => {
        const q = ops
          .scope(db(table + " as h"), req.user, purchase)
          .join("inventory_sectors as s", "s.id", "h.sector_id")
          .join("users as u", "u.id", "h.created_by")
          .leftJoin("people as p", "p.id", "u.person_id")
          .select(
            "h.id",
            "h.sector_id",
            "h.created_by",
            "h.notes",
            "h.created_at",
            "s.name as sector_name",
            db.raw("COALESCE(p.full_name,u.username) as requester_name"),
          );
        if (purchase) q.select("h.status", "h.source", "h.revision");
        res.json(await q.orderBy("h.id", "desc"));
      }),
    );
    router.get(
      "/" + slug + "/:id",
      modulePermission(module),
      wrap(async (req, res) => {
        const row = await ops.access(db, req.user, req.params.id, purchase);
        delete row.request_hash;
        delete row.request_key;
        row.items = await db(
          (purchase
            ? "inventory_purchase_order_items"
            : "inventory_consumption_items") + " as i",
        )
          .join("inventory_products as p", "p.id", "i.product_id")
          .where(purchase ? "i.purchase_order_id" : "i.consumption_id", row.id)
          .select("i.*", "p.name as product_name", "p.code");
        res.json(row);
      }),
    );
  }
  router.post(
    "/consumptions",
    modulePermission("inventory_consumptions", "create"),
    wrap(async (req, res) =>
      res.status(201).json(await ops.consume(db, req.user, req.body)),
    ),
  );
  router.post(
    "/purchase-orders",
    modulePermission("inventory_purchase_orders", "create"),
    wrap(async (req, res) =>
      res.status(201).json(await ops.purchase(db, req.user, req.body)),
    ),
  );
  router.post(
    "/purchase-orders/automatic",
    modulePermission("inventory_purchase_orders", "create"),
    wrap(async (req, res) =>
      res.status(201).json(await ops.purchase(db, req.user, req.body, true)),
    ),
  );
  router.put(
    "/purchase-orders/:id",
    modulePermission("inventory_purchase_orders", "edit"),
    wrap(async (req, res) =>
      res.json(await ops.editPurchase(db, req.user, req.params.id, req.body)),
    ),
  );
  return router;
};
