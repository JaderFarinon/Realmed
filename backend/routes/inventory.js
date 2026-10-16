const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const auth = require("../middleware/auth");
const { modulePermission } = require("../middleware/permission");
const { knex } = require("./guide-center");
const {
  integer,
  fail,
  normalizeCode,
  requestStatus,
  fulfillment,
  isAdmin,
  allSectors,
  canRequestFor,
} = require("../services/inventoryWorkflow");
const { validateImageUpload } = require("../services/imageAssetService");
const { downloadPhoto } = require("../services/inventoryPhotoService");

const router = express.Router();
const photos = path.resolve(__dirname, "../../storage/assets/products");
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    const status =
      error.status ||
      (error.code === "ER_DUP_ENTRY"
        ? 409
        : error.code === "ER_NO_REFERENCED_ROW_2"
          ? 422
          : 500);
    if (status === 500)
      console.error("[Estoque]", { code: error.code || error.name });
    res
      .status(status)
      .json({
        error: error.status
          ? error.message
          : status === 409
            ? "Registro já cadastrado."
            : status === 422
              ? "Referência inválida."
              : "Não foi possível concluir a operação de estoque.",
        ...(status === 403 ? { code: "PERMISSION_DENIED" } : {}),
      });
  }
};
const text = (value) => String(value ?? "").trim() || null;
const date = (value) => {
  const v = String(value || "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    Number.isNaN(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    fail("Informe uma data válida.");
  return v;
};
const money = (value) => {
  const v = Number(String(value).replace(",", "."));
  if (!Number.isFinite(v) || v < 0 || v > 9999999999.99)
    fail("Valor unitário inválido.");
  return v.toFixed(2);
};
const ensureActive = async (db, table, id) => {
  const row = await db(table)
    .where({ id: integer(id, "Identificador"), active: true })
    .first();
  if (!row) fail("Cadastro não encontrado ou inativo.");
  return row;
};
async function sectorAccess(user, sectorId, db = knex) {
  const sector = await ensureActive(db, "inventory_sectors", sectorId);
  if (!allSectors(user) && Number(user.sector_id) !== sector.id)
    fail("Usuário sem permissão a essa função", 403);
  return sector.id;
}
const scope = (q, user, column) =>
  !isAdmin(user) ? q.where(column, user.sector_id || -1) : q;
async function requestAccess(db, user, requestId, edit = false) {
  const q = db("inventory_requests").where({
    id: integer(requestId, "Pedido"),
  });
  const request = await (edit ? q.forUpdate() : q).first();
  if (!request) fail("Pedido não encontrado.", 404);
  if (!isAdmin(user) && Number(request.sector_id) !== Number(user.sector_id))
    fail("Usuário sem permissão a essa função", 403);
  if (
    !isAdmin(user) &&
    !(
      user.inventory_profile === "COORDINATOR" &&
      Number(user.sector_id) === Number(request.sector_id)
    ) &&
    Number(request.requester_id) !== Number(user.id)
  )
    fail("Usuário sem permissão a essa função", 403);
  return request;
}
async function updateRequestStatus(db, requestId) {
  const items = await db("inventory_request_items").where({
    request_id: requestId,
  });
  const status = requestStatus(items);
  await db("inventory_requests")
    .where({ id: requestId })
    .update({ status, updated_at: db.fn.now() });
  return status;
}
async function move(db, user, productId, sectorId, delta, kind, refs = {}) {
  const key = { product_id: productId, sector_id: sectorId };
  await db("inventory_balances")
    .insert({ ...key, quantity: 0 })
    .onConflict(["product_id", "sector_id"])
    .ignore();
  const old = await db("inventory_balances").where(key).forUpdate().first();
  const next = Number(old.quantity) + delta;
  if (!Number.isSafeInteger(next) || next < 0 || next > 2147483647)
    fail(
      "Saldo insuficiente para esta alteração. Nenhuma movimentação foi aplicada.",
      409,
    );
  await db("inventory_balances")
    .where({ id: old.id })
    .update({ quantity: next, updated_at: db.fn.now() });
  await db("inventory_movements").insert({
    ...key,
    delta,
    balance_after: next,
    kind,
    user_id: user.id,
    ...refs,
  });
  return next;
}

router.use(auth);
router.use(async (req, res, next) => {
  try {
    const user = await knex("users")
      .where({ id: req.user.id, status: "active" })
      .first();
    if (!user) return res.status(401).json({ error: "Usuário inativo." });
    const profile = await knex("inventory_user_profiles")
      .where({ user_id: user.id })
      .first();
    req.user = {
      ...req.user,
      role: user.role,
      sector_id: profile?.sector_id || null,
      inventory_profile: profile?.profile || "USER",
    };
    next();
  } catch {
    res
      .status(500)
      .json({ error: "Não foi possível carregar o contexto de estoque." });
  }
});

router.get(
  "/options",
  wrap(async (req, res) => {
    if (!isAdmin(req.user)) {
      const allowed = await knex("user_permissions")
        .where({ user_id: req.user.id, can_view: true })
        .where("module_key", "like", "inventory_%")
        .first();
      if (!allowed) fail("Usuário sem permissão a essa função", 403);
    }
    let requesters = knex("users as u")
      .leftJoin("people as p", "p.id", "u.person_id")
      .leftJoin("inventory_user_profiles as ip", "ip.user_id", "u.id")
      .where("u.status", "active")
      .select("u.id", "u.username", "p.full_name as name", "ip.sector_id");
    if (!isAdmin(req.user)) {
      if (req.user.inventory_profile === "COORDINATOR")
        requesters.where("ip.sector_id", req.user.sector_id || -1);
      else requesters.where("u.id", req.user.id);
    }
    const [products, sectors, categories, presentations, suppliers, users] =
      await Promise.all([
        knex("inventory_products").where({ active: true }).orderBy("name"),
        allSectors(req.user)
          ? knex("inventory_sectors").where({ active: true }).orderBy("name")
          : knex("inventory_sectors").where({
              active: true,
              id: req.user.sector_id || -1,
            }),
        knex("inventory_categories").where({ active: true }).orderBy("name"),
        knex("inventory_presentations").where({ active: true }).orderBy("name"),
        knex("inventory_suppliers").where({ active: true }).orderBy("name"),
        requesters,
      ]);
    res.json({
      products,
      sectors,
      categories,
      presentations,
      suppliers,
      users,
      profile: {
        sector_id: req.user.sector_id,
        profile: req.user.inventory_profile,
      },
      canFilterSectors: allSectors(req.user),
    });
  }),
);

const catalogs = {
  sectors: ["inventory_sectors", ["name", "description", "active"]],
  categories: ["inventory_categories", ["name", "description", "active"]],
  presentations: ["inventory_presentations", ["name", "description", "active"]],
  suppliers: [
    "inventory_suppliers",
    ["name", "cnpj", "phone", "email", "contact_name", "active"],
  ],
  products: [
    "inventory_products",
    [
      "name",
      "code",
      "category_id",
      "presentation_id",
      "minimum_quantity",
      "active",
    ],
  ],
};
const productQuery = () =>
  knex("inventory_products as p")
    .join("inventory_categories as c", "c.id", "p.category_id")
    .join("inventory_presentations as a", "a.id", "p.presentation_id")
    .select("p.*", "c.name as category_name", "a.name as presentation_name");
router.get(
  "/dashboard",
  modulePermission("inventory_dashboard"),
  wrap(async (req, res) => {
    const balances = knex("inventory_balances as b")
      .join("inventory_products as p", "p.id", "b.product_id")
      .join("inventory_sectors as s", "s.id", "b.sector_id")
      .select(
        "p.name as product_name",
        "s.name as sector_name",
        "b.quantity",
        "p.minimum_quantity",
      );
    const requests = knex("inventory_requests")
      .select("status")
      .count("* as total")
      .groupBy("status");
    const consumed = knex("inventory_request_items as i")
      .join("inventory_requests as r", "r.id", "i.request_id")
      .join("inventory_products as p", "p.id", "i.product_id")
      .select("p.name")
      .sum("i.fulfilled_quantity as quantity")
      .groupBy("p.id", "p.name")
      .orderBy("quantity", "desc")
      .limit(10);
    const purchases = knex("inventory_invoice_items as i")
      .join("inventory_invoices as n", "n.id", "i.invoice_id")
      .select(knex.raw("DATE_FORMAT(n.invoice_date,'%Y-%m') as month"))
      .sum({ total: knex.raw("i.quantity * i.unit_price") })
      .groupByRaw("DATE_FORMAT(n.invoice_date,'%Y-%m')")
      .orderBy("month");
    if (!isAdmin(req.user)) {
      balances.where("b.sector_id", req.user.sector_id || -1);
      requests.where("sector_id", req.user.sector_id || -1);
      consumed.where("r.sector_id", req.user.sector_id || -1);
      purchases.where("n.sector_id", req.user.sector_id || -1);
    }
    const [stock, orders, topProducts, monthlyPurchases, products] =
      await Promise.all([
        balances,
        requests,
        consumed,
        purchases,
        knex("inventory_products")
          .where({ active: true })
          .count("* as total")
          .first(),
      ]);
    res.json({
      cards: {
        products: Number(products.total),
        zero: stock.filter((s) => Number(s.quantity) === 0).length,
        belowMinimum: stock.filter(
          (s) => Number(s.quantity) < Number(s.minimum_quantity),
        ).length,
        pending: Number(
          orders.find((r) => r.status === "PENDENTE")?.total || 0,
        ),
        waiting: Number(
          orders.find((r) => r.status === "AGUARDANDO_COMPRA")?.total || 0,
        ),
        purchaseValue: monthlyPurchases.reduce(
          (s, r) => s + Number(r.total),
          0,
        ),
      },
      alerts: stock
        .filter((s) => Number(s.quantity) <= Number(s.minimum_quantity))
        .slice(0, 10),
      topProducts,
      monthlyPurchases,
    });
  }),
);
for (const [catalog, [table, fields]] of Object.entries(catalogs)) {
  const permission = `inventory_${catalog}`;
  router.get(
    `/${catalog}`,
    modulePermission(permission),
    wrap(async (req, res) => {
      const q =
        catalog === "products"
          ? productQuery().orderBy("p.name")
          : knex(table).orderBy("name");
      if (req.query.active !== undefined)
        q.where(
          catalog === "products" ? "p.active" : "active",
          req.query.active === "true",
        );
      if (req.query.search)
        q.where(
          catalog === "products" ? "p.name" : "name",
          "like",
          `%${String(req.query.search).slice(0, 150)}%`,
        );
      res.json(await q);
    }),
  );
  const save = (create) =>
    wrap(async (req, res) => {
      const row = await knex.transaction(async (db) => {
        const old = create
          ? null
          : await db(table)
              .where({ id: integer(req.params.id) })
              .forUpdate()
              .first();
        if (!create && !old) fail("Cadastro não encontrado.", 404);
        const data = Object.fromEntries(
          fields
            .filter((f) => req.body[f] !== undefined)
            .map((f) => [
              f,
              f === "active" ? req.body[f] === true : text(req.body[f]),
            ]),
        );
        if (!text(data.name ?? old?.name)) fail("Nome é obrigatório.");
        if (catalog === "products") {
          for (const [field, ref] of [
            ["category_id", "inventory_categories"],
            ["presentation_id", "inventory_presentations"],
          ]) {
            data[field] = integer(
              data[field] ?? old?.[field],
              field === "category_id" ? "Categoria" : "Apresentação",
            );
            if (create || data[field] !== old[field])
              await ensureActive(db, ref, data[field]);
          }
          data.minimum_quantity = integer(
            data.minimum_quantity ?? old?.minimum_quantity ?? 0,
            "Estoque mínimo",
            0,
          );
          data.code = normalizeCode(data.code ?? old?.code);
          if (!data.code && create) {
            const seq = await db("inventory_sequences")
              .where({ name: "product_code" })
              .forUpdate()
              .first();
            let next = seq.value;
            do {
              data.code = String(++next).padStart(6, "0");
            } while (await db(table).where({ code: data.code }).first());
            await db("inventory_sequences")
              .where({ name: "product_code" })
              .update({ value: next });
          }
          if (!data.code || data.code.length > 40)
            fail("Informe um código de produto válido.");
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
          fail("E-mail inválido.");
        const recordId = create ? (await db(table).insert(data))[0] : old.id;
        if (!create)
          await db(table)
            .where({ id: recordId })
            .update({ ...data, updated_at: db.fn.now() });
        return db(table).where({ id: recordId }).first();
      });
      res.status(create ? 201 : 200).json(row);
    });
  router.post(
    `/${catalog}`,
    modulePermission(permission, "create"),
    save(true),
  );
  router.put(
    `/${catalog}/:id`,
    modulePermission(permission, "edit"),
    save(false),
  );
  router.delete(
    `/${catalog}/:id`,
    modulePermission(permission, "delete"),
    wrap(async (req, res) => {
      const changed = await knex(table)
        .where({ id: integer(req.params.id) })
        .update({ active: false, updated_at: knex.fn.now() });
      if (!changed) fail("Cadastro não encontrado.", 404);
      res.status(204).end();
    }),
  );
}

router.post(
  "/products/:id/photo",
  modulePermission("inventory_products", "edit"),
  express.raw({ type: ["image/png", "image/jpeg"], limit: "2mb" }),
  wrap(async (req, res) => {
    const product = await knex("inventory_products")
      .where({ id: integer(req.params.id) })
      .first();
    if (!product) fail("Produto não encontrado.", 404);
    const image = validateImageUpload({
      buffer: req.body,
      mimeType: req.headers["content-type"],
      originalName: req.headers["x-file-name"],
    });
    const filename = crypto.randomUUID() + image.extension;
    await fs.mkdir(photos, { recursive: true });
    await fs.writeFile(path.join(photos, filename), req.body, { flag: "wx" });
    try {
      await knex("inventory_products")
        .where({ id: product.id })
        .update({ photo_path: filename });
    } catch (error) {
      await fs.unlink(path.join(photos, filename));
      throw error;
    }
    res.json({ photo_path: filename });
  }),
);
router.post(
  "/photo-from-url",
  modulePermission("inventory_products", "edit"),
  wrap(async (req, res) => {
    const image = await downloadPhoto(req.body.url);
    res.type(image.mime).send(image.buffer);
  }),
);
router.get(
  "/products/:id/photo",
  modulePermission("inventory_products"),
  wrap(async (req, res) => {
    const product = await knex("inventory_products")
      .where({ id: integer(req.params.id) })
      .first();
    if (
      !product?.photo_path ||
      path.basename(product.photo_path) !== product.photo_path
    )
      fail("Foto não encontrada.", 404);
    await fs.access(path.join(photos, product.photo_path));
    res.sendFile(path.join(photos, product.photo_path));
  }),
);

async function stockList(user, filters) {
  const sectorId = allSectors(user)
    ? filters.sector_id
      ? await sectorAccess(user, filters.sector_id)
      : null
    : user.sector_id || -1;
  const sums = knex("inventory_balances")
    .select("product_id")
    .sum("quantity as quantity")
    .groupBy("product_id");
  if (sectorId) sums.where("sector_id", sectorId);
  const q = productQuery()
    .leftJoin(sums.as("b"), "b.product_id", "p.id")
    .select(knex.raw("COALESCE(b.quantity, 0) as quantity"))
    .where("p.active", true);
  if (sectorId === -1) q.whereRaw("1=0");
  if (filters.category_id)
    q.where("p.category_id", integer(filters.category_id));
  if (filters.search)
    q.where("p.name", "like", `%${String(filters.search).slice(0, 150)}%`);
  if (filters.show_zero !== "true") q.whereRaw("COALESCE(b.quantity,0) <> 0");
  if (filters.alert_only === "true")
    q.where("p.minimum_quantity", ">", 0).whereRaw(
      "COALESCE(b.quantity,0) <= p.minimum_quantity",
    );
  return q.orderBy("p.name");
}
router.get(
  "/stock",
  modulePermission("inventory_stock"),
  wrap(async (req, res) => res.json(await stockList(req.user, req.query))),
);
router.post(
  "/stock/adjust",
  modulePermission("inventory_stock", "edit"),
  wrap(async (req, res) => {
    const quantity = integer(req.body.quantity, "Saldo", 0);
    if (!text(req.body.notes)) fail("Informe o motivo do ajuste.");
    const result = await knex.transaction(async (db) => {
      const sectorId = await sectorAccess(req.user, req.body.sector_id, db);
      const product = await ensureActive(
        db,
        "inventory_products",
        req.body.product_id,
      );
      const key = { product_id: product.id, sector_id: sectorId };
      await db("inventory_balances")
        .insert({ ...key, quantity: 0 })
        .onConflict(["product_id", "sector_id"])
        .ignore();
      const old = await db("inventory_balances").where(key).forUpdate().first();
      return move(
        db,
        req.user,
        product.id,
        sectorId,
        quantity - old.quantity,
        "ADJUSTMENT",
        { notes: text(req.body.notes) },
      );
    });
    res.json({ quantity: result });
  }),
);

router.get(
  "/requests",
  modulePermission("inventory_requests"),
  wrap(async (req, res) => {
    const q = knex("inventory_requests as r")
      .join("users as u", "u.id", "r.requester_id")
      .leftJoin("people as p", "p.id", "u.person_id")
      .join("inventory_sectors as s", "s.id", "r.sector_id")
      .select(
        "r.*",
        "u.username",
        "p.full_name as requester_name",
        "s.name as sector_name",
      );
    const totals = knex("inventory_request_items")
      .select("request_id")
      .count("* as total_items")
      .sum("requested_quantity as requested_quantity")
      .sum("fulfilled_quantity as fulfilled_quantity")
      .groupBy("request_id");
    q.leftJoin(totals.as("totals"), "totals.request_id", "r.id").select(
      knex.raw("COALESCE(totals.total_items,0) as total_items"),
      knex.raw("COALESCE(totals.requested_quantity,0) as requested_quantity"),
      knex.raw("COALESCE(totals.fulfilled_quantity,0) as fulfilled_quantity"),
    );
    scope(q, req.user, "r.sector_id");
    if (req.query.status) q.where("r.status", req.query.status);
    res.json(await q.orderBy("r.request_date", "desc").orderBy("r.id", "desc"));
  }),
);
router.get(
  "/requests/:id",
  modulePermission("inventory_requests"),
  wrap(async (req, res) => {
    const request = await requestAccess(knex, req.user, req.params.id);
    const items = await knex("inventory_request_items as i")
      .join("inventory_products as p", "p.id", "i.product_id")
      .where("i.request_id", request.id)
      .select("i.*", "p.name as product_name", "p.code");
    res.json({ ...request, items });
  }),
);
async function requester(db, user, requesterId) {
  const target = await db("users as u")
    .leftJoin("inventory_user_profiles as ip", "ip.user_id", "u.id")
    .where({
      "u.id": integer(requesterId, "Solicitante"),
      "u.status": "active",
    })
    .select("u.id", "ip.sector_id")
    .first();
  if (!target || !canRequestFor(user, target))
    fail("Solicitante inválido para o seu perfil.", 403);
  if (!target.sector_id)
    fail(
      "Cadastre o setor do solicitante nas permissões antes de criar o pedido.",
    );
  await ensureActive(db, "inventory_sectors", target.sector_id);
  return target;
}
router.post(
  "/requests",
  modulePermission("inventory_requests", "create"),
  wrap(async (req, res) => {
    const request = await knex.transaction(async (db) => {
      const target = await requester(
        db,
        req.user,
        req.body.requester_id || req.user.id,
      );
      const [id] = await db("inventory_requests").insert({
        requester_id: target.id,
        sector_id: target.sector_id,
        request_date: date(req.body.request_date),
        notes: text(req.body.notes),
        created_by: req.user.id,
      });
      return db("inventory_requests").where({ id }).first();
    });
    res.status(201).json(request);
  }),
);
router.put(
  "/requests/:id",
  modulePermission("inventory_requests", "edit"),
  wrap(async (req, res) => {
    res.json(
      await knex.transaction(async (db) => {
        const old = await requestAccess(db, req.user, req.params.id, true);
        if (old.status === "ATENDIDO")
          fail("Pedido atendido não pode ser alterado.", 409);
        const target = await requester(
          db,
          req.user,
          req.body.requester_id || old.requester_id,
        );
        const delivered = await db("inventory_request_items")
          .where({ request_id: old.id })
          .where("fulfilled_quantity", ">", 0)
          .first();
        if (
          delivered &&
          (target.id !== old.requester_id || target.sector_id !== old.sector_id)
        )
          fail(
            "Pedido com atendimento não pode mudar de solicitante ou setor.",
            409,
          );
        await db("inventory_requests")
          .where({ id: old.id })
          .update({
            requester_id: target.id,
            sector_id: target.sector_id,
            request_date: date(req.body.request_date),
            notes: text(req.body.notes),
            updated_at: db.fn.now(),
          });
        return db("inventory_requests").where({ id: old.id }).first();
      }),
    );
  }),
);
router.delete(
  "/requests/:id",
  modulePermission("inventory_requests", "delete"),
  wrap(async (req, res) => {
    await knex.transaction(async (db) => {
      const request = await requestAccess(db, req.user, req.params.id, true);
      if (
        await db("inventory_request_items")
          .where({ request_id: request.id })
          .where("fulfilled_quantity", ">", 0)
          .first()
      )
        fail("Pedido com atendimento não pode ser excluído.", 409);
      await db("inventory_requests").where({ id: request.id }).del();
    });
    res.status(204).end();
  }),
);
const saveRequestItem = (create) =>
  wrap(async (req, res) => {
    const item = await knex.transaction(async (db) => {
      const request = await requestAccess(db, req.user, req.params.id, true);
      if (request.status === "ATENDIDO") fail("Pedido já atendido.", 409);
      const old = create
        ? null
        : await db("inventory_request_items")
            .where({ id: integer(req.params.itemId), request_id: request.id })
            .forUpdate()
            .first();
      if (!create && !old) fail("Item não encontrado.", 404);
      if (old?.fulfilled_quantity > 0)
        fail("Item com atendimento não pode ser alterado.", 409);
      const product = await ensureActive(
        db,
        "inventory_products",
        req.body.product_id,
      );
      const data = {
        product_id: product.id,
        requested_quantity: integer(req.body.requested_quantity),
        notes: text(req.body.notes),
        status: "PENDENTE",
      };
      const id = create
        ? (
            await db("inventory_request_items").insert({
              ...data,
              request_id: request.id,
            })
          )[0]
        : old.id;
      if (!create)
        await db("inventory_request_items").where({ id }).update(data);
      await updateRequestStatus(db, request.id);
      return db("inventory_request_items").where({ id }).first();
    });
    res.status(create ? 201 : 200).json(item);
  });
router.post(
  "/requests/:id/items",
  modulePermission("inventory_requests", "create"),
  saveRequestItem(true),
);
router.put(
  "/requests/:id/items/:itemId",
  modulePermission("inventory_requests", "edit"),
  saveRequestItem(false),
);
router.delete(
  "/requests/:id/items/:itemId",
  modulePermission("inventory_requests", "delete"),
  wrap(async (req, res) => {
    await knex.transaction(async (db) => {
      const request = await requestAccess(db, req.user, req.params.id, true);
      const item = await db("inventory_request_items")
        .where({ id: integer(req.params.itemId), request_id: request.id })
        .forUpdate()
        .first();
      if (!item) fail("Item não encontrado.", 404);
      if (item.fulfilled_quantity > 0)
        fail("Item com atendimento não pode ser excluído.", 409);
      await db("inventory_request_items").where({ id: item.id }).del();
      await updateRequestStatus(db, request.id);
    });
    res.status(204).end();
  }),
);
router.post(
  "/requests/:id/items/:itemId/fulfill",
  modulePermission("inventory_fulfillment", "edit"),
  wrap(async (req, res) => {
    const result = await knex.transaction(async (db) => {
      const request = await requestAccess(db, req.user, req.params.id, true);
      const item = await db("inventory_request_items")
        .where({ id: integer(req.params.itemId), request_id: request.id })
        .forUpdate()
        .first();
      if (!item) fail("Item não encontrado.", 404);
      await ensureActive(db, "inventory_sectors", request.sector_id);
      const key = { product_id: item.product_id, sector_id: request.sector_id };
      await db("inventory_balances")
        .insert({ ...key, quantity: 0 })
        .onConflict(["product_id", "sector_id"])
        .ignore();
      const balance = await db("inventory_balances")
        .where(key)
        .forUpdate()
        .first();
      const outcome = fulfillment(item, req.body.quantity, balance.quantity);
      if (outcome.ok)
        await move(
          db,
          req.user,
          item.product_id,
          request.sector_id,
          -integer(req.body.quantity),
          "FULFILLMENT",
          { request_id: request.id },
        );
      await db("inventory_request_items")
        .where({ id: item.id })
        .update({
          status: outcome.status,
          fulfilled_quantity: outcome.fulfilled_quantity,
          updated_at: db.fn.now(),
        });
      return {
        ...outcome,
        request_status: await updateRequestStatus(db, request.id),
      };
    });
    res.json(result);
  }),
);
router.post(
  "/requests/:id/items/:itemId/wait",
  modulePermission("inventory_fulfillment", "edit"),
  wrap(async (req, res) => {
    await knex.transaction(async (db) => {
      const request = await requestAccess(db, req.user, req.params.id, true);
      const item = await db("inventory_request_items")
        .where({ id: integer(req.params.itemId), request_id: request.id })
        .forUpdate()
        .first();
      if (!item) fail("Item não encontrado.", 404);
      if (item.status === "ATENDIDO") fail("Item já atendido.", 409);
      await db("inventory_request_items")
        .where({ id: item.id })
        .update({ status: "AGUARDANDO_COMPRA" });
      await updateRequestStatus(db, request.id);
    });
    res.json({ message: "Item marcado como Aguardando compra." });
  }),
);

const invoiceQuery = () =>
  knex("inventory_invoices as n")
    .join("inventory_suppliers as s", "s.id", "n.supplier_id")
    .join("inventory_sectors as se", "se.id", "n.sector_id")
    .select("n.*", "s.name as supplier_name", "se.name as sector_name");
router.get(
  "/invoices",
  modulePermission("inventory_invoices"),
  wrap(async (req, res) => {
    const q = invoiceQuery();
    if (!allSectors(req.user)) q.where("n.sector_id", req.user.sector_id || -1);
    res.json(await q.orderBy("n.invoice_date", "desc").orderBy("n.id", "desc"));
  }),
);
async function invoiceAccess(db, user, id, edit = false) {
  const q = db("inventory_invoices").where({ id: integer(id, "Nota fiscal") });
  const invoice = await (edit ? q.forUpdate() : q).first();
  if (!invoice) fail("Nota fiscal não encontrada.", 404);
  if (!allSectors(user) && invoice.sector_id !== user.sector_id)
    fail("Usuário sem permissão a essa função", 403);
  if (edit && invoice.closed)
    fail("Nota fiscal fechada não pode ser alterada.", 409);
  return invoice;
}
router.get(
  "/invoices/:id",
  modulePermission("inventory_invoices"),
  wrap(async (req, res) => {
    const invoice = await invoiceAccess(knex, req.user, req.params.id);
    const items = await knex("inventory_invoice_items as i")
      .join("inventory_products as p", "p.id", "i.product_id")
      .where("i.invoice_id", invoice.id)
      .select("i.*", "p.name as product_name", "p.code");
    res.json({
      ...invoice,
      items,
      total: items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0),
    });
  }),
);
const saveInvoice = (create) =>
  wrap(async (req, res) => {
    const invoice = await knex.transaction(async (db) => {
      const old = create
        ? null
        : await invoiceAccess(db, req.user, req.params.id, true);
      const sectorId = await sectorAccess(req.user, req.body.sector_id, db);
      const supplier = await ensureActive(
        db,
        "inventory_suppliers",
        req.body.supplier_id,
      );
      if (!text(req.body.number)) fail("Número da nota é obrigatório.");
      if (
        old &&
        sectorId !== old.sector_id &&
        (await db("inventory_invoice_items")
          .where({ invoice_id: old.id })
          .first())
      )
        fail("Nota com itens não pode mudar de setor.", 409);
      const data = {
        number: text(req.body.number),
        supplier_id: supplier.id,
        sector_id: sectorId,
        invoice_date: date(req.body.invoice_date),
        notes: text(req.body.notes),
      };
      const id = create
        ? (
            await db("inventory_invoices").insert({
              ...data,
              created_by: req.user.id,
            })
          )[0]
        : old.id;
      if (!create)
        await db("inventory_invoices")
          .where({ id })
          .update({ ...data, updated_at: db.fn.now() });
      return db("inventory_invoices").where({ id }).first();
    });
    res.status(create ? 201 : 200).json(invoice);
  });
router.post(
  "/invoices",
  modulePermission("inventory_invoices", "create"),
  saveInvoice(true),
);
router.put(
  "/invoices/:id",
  modulePermission("inventory_invoices", "edit"),
  saveInvoice(false),
);
router.post(
  "/invoices/:id/close",
  modulePermission("inventory_invoices", "edit"),
  wrap(async (req, res) => {
    await knex.transaction(async (db) => {
      const invoice = await invoiceAccess(db, req.user, req.params.id, true);
      if (
        !(await db("inventory_invoice_items")
          .where({ invoice_id: invoice.id })
          .first())
      )
        fail("Adicione itens antes de fechar a nota.");
      await db("inventory_invoices")
        .where({ id: invoice.id })
        .update({ closed: true, updated_at: db.fn.now() });
    });
    res.json({ closed: true });
  }),
);
const saveInvoiceItem = (create) =>
  wrap(async (req, res) => {
    const item = await knex.transaction(async (db) => {
      const invoice = await invoiceAccess(db, req.user, req.params.id, true);
      const old = create
        ? null
        : await db("inventory_invoice_items")
            .where({ id: integer(req.params.itemId), invoice_id: invoice.id })
            .forUpdate()
            .first();
      if (!create && !old) fail("Item não encontrado.", 404);
      const product = await ensureActive(
        db,
        "inventory_products",
        req.body.product_id,
      );
      const quantity = integer(req.body.quantity),
        unit_price = money(req.body.unit_price);
      if (old && old.product_id !== product.id) {
        await move(
          db,
          req.user,
          old.product_id,
          invoice.sector_id,
          -old.quantity,
          "INVOICE_EDIT",
          { invoice_id: invoice.id },
        );
        await move(
          db,
          req.user,
          product.id,
          invoice.sector_id,
          quantity,
          "INVOICE_EDIT",
          { invoice_id: invoice.id },
        );
      } else
        await move(
          db,
          req.user,
          product.id,
          invoice.sector_id,
          quantity - (old?.quantity || 0),
          create ? "RECEIPT" : "INVOICE_EDIT",
          { invoice_id: invoice.id },
        );
      const data = { product_id: product.id, quantity, unit_price };
      const id = create
        ? (
            await db("inventory_invoice_items").insert({
              ...data,
              invoice_id: invoice.id,
            })
          )[0]
        : old.id;
      if (!create)
        await db("inventory_invoice_items").where({ id }).update(data);
      return db("inventory_invoice_items").where({ id }).first();
    });
    res.status(create ? 201 : 200).json(item);
  });
router.post(
  "/invoices/:id/items",
  modulePermission("inventory_invoices", "create"),
  saveInvoiceItem(true),
);
router.put(
  "/invoices/:id/items/:itemId",
  modulePermission("inventory_invoices", "edit"),
  saveInvoiceItem(false),
);
router.delete(
  "/invoices/:id/items/:itemId",
  modulePermission("inventory_invoices", "delete"),
  wrap(async (req, res) => {
    await knex.transaction(async (db) => {
      const invoice = await invoiceAccess(db, req.user, req.params.id, true);
      const item = await db("inventory_invoice_items")
        .where({ id: integer(req.params.itemId), invoice_id: invoice.id })
        .forUpdate()
        .first();
      if (!item) fail("Item não encontrado.", 404);
      await move(
        db,
        req.user,
        item.product_id,
        invoice.sector_id,
        -item.quantity,
        "INVOICE_REMOVAL",
        { invoice_id: invoice.id },
      );
      await db("inventory_invoice_items").where({ id: item.id }).del();
    });
    res.status(204).end();
  }),
);

router.get(
  "/reports",
  modulePermission("inventory_reports"),
  wrap(async (req, res) => {
    const q = knex("inventory_movements as m")
      .join("inventory_products as p", "p.id", "m.product_id")
      .join("inventory_sectors as s", "s.id", "m.sector_id")
      .join("users as u", "u.id", "m.user_id")
      .select(
        "m.*",
        "p.name as product_name",
        "s.name as sector_name",
        "u.username",
      );
    if (!allSectors(req.user)) q.where("m.sector_id", req.user.sector_id || -1);
    else if (req.query.sector_id)
      q.where("m.sector_id", integer(req.query.sector_id));
    if (req.query.product_id)
      q.where("m.product_id", integer(req.query.product_id));
    if (req.query.from) q.where("m.created_at", ">=", date(req.query.from));
    if (req.query.to)
      q.where(
        "m.created_at",
        "<",
        knex.raw("DATE_ADD(?, INTERVAL 1 DAY)", [date(req.query.to)]),
      );
    if (req.query.kind) q.where("m.kind", String(req.query.kind));
    res.json(await q.orderBy("m.id", "desc"));
  }),
);
module.exports = router;
