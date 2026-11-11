const crypto = require("node:crypto");
const { integer, fail, isAdmin, allSectors } = require("./inventoryWorkflow");
const notes = (v) => {
  const s = String(v || "").trim();
  if (s.length > 5000) fail("Observações devem ter até 5000 caracteres.");
  return s || null;
};
function items(values) {
  if (!Array.isArray(values) || !values.length || values.length > 500)
    fail("Informe de um a 500 produtos.");
  const result = values
    .map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row))
        fail("Item inválido. Selecione produto e quantidade.");
      return {
        product_id: integer(row.product_id, "Produto"),
        quantity: integer(row.quantity),
      };
    })
    .sort((a, b) => a.product_id - b.product_id);
  if (new Set(result.map((r) => r.product_id)).size !== result.length)
    fail("Não repita o mesmo produto. Some as quantidades em uma linha.");
  return result;
}
function identity(body, data) {
  if (!/^[0-9a-f-]{36}$/i.test(body.request_key || ""))
    fail("Identificador da operação inválido.");
  return {
    request_key: body.request_key,
    request_hash: crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex"),
  };
}
async function sector(db, user, value, purchase = false) {
  const id = integer(value || user.sector_id, "Setor");
  if (
    !(purchase ? allSectors(user) : isAdmin(user)) &&
    Number(user.sector_id) !== id
  )
    fail("Usuário sem permissão a essa função", 403);
  if (!(await db("inventory_sectors").where({ id, active: true }).first()))
    fail("Setor não encontrado ou inativo.");
  return id;
}
function scope(q, user, purchase = false, alias = "h") {
  if (purchase) {
    if (!allSectors(user)) q.where(alias + ".sector_id", user.sector_id || -1);
  } else if (!isAdmin(user)) {
    q.where(alias + ".sector_id", user.sector_id || -1);
    if (user.inventory_profile !== "COORDINATOR")
      q.where(alias + ".created_by", user.id);
  }
  return q;
}
async function existing(db, table, user, token) {
  const row = await db(table)
    .where({ created_by: user.id, request_key: token.request_key })
    .forUpdate()
    .first();
  if (row && row.request_hash !== token.request_hash)
    fail(
      "Esta operação já foi registrada com outros dados. Reabra o formulário.",
      409,
    );
  return row;
}
async function activeProducts(db, rows) {
  const products = await db("inventory_products")
    .whereIn(
      "id",
      rows.map((r) => r.product_id),
    )
    .orderBy("id")
    .forShare();
  if (products.length !== rows.length || products.some((p) => !p.active))
    fail("Um dos produtos está inativo ou não existe. Atualize a lista.");
}
async function consume(db, user, body) {
  const data = {
      sector_id: integer(body.sector_id || user.sector_id, "Setor"),
      items: items(body.items),
      notes: notes(body.notes),
    },
    token = identity(body, data);
  return db.transaction(async (trx) => {
    await sector(trx, user, data.sector_id);
    // Serialize retries for the same actor, including an initially absent request key.
    await trx("users").where({ id: user.id }).forUpdate().first();
    const old = await existing(trx, "inventory_consumptions", user, token);
    if (old) return old;
    await activeProducts(trx, data.items);
    const [id] = await trx("inventory_consumptions").insert({
      sector_id: data.sector_id,
      created_by: user.id,
      notes: data.notes,
      ...token,
    });
    for (const row of data.items) {
      const key = { product_id: row.product_id, sector_id: data.sector_id };
      await trx("inventory_balances")
        .insert({ ...key, quantity: 0 })
        .onConflict(["product_id", "sector_id"])
        .ignore();
      const balance = await trx("inventory_balances")
        .where(key)
        .forUpdate()
        .first();
      if (Number(balance.quantity) < row.quantity)
        fail(
          `Saldo insuficiente para o produto ${row.product_id}. Nenhuma retirada foi registrada.`,
          409,
        );
      const next = Number(balance.quantity) - row.quantity;
      await trx("inventory_balances")
        .where({ id: balance.id })
        .update({ quantity: next, updated_at: trx.fn.now() });
      await trx("inventory_consumption_items").insert({
        consumption_id: id,
        ...row,
      });
      await trx("inventory_movements").insert({
        ...key,
        kind: "CONSUMPTION",
        delta: -row.quantity,
        balance_after: next,
        user_id: user.id,
        consumption_id: id,
        notes: data.notes,
      });
    }
    return trx("inventory_consumptions").where({ id }).first();
  });
}
async function minimumItems(db, sectorId) {
  return db("inventory_products as p")
    .leftJoin("inventory_balances as b", function () {
      this.on("b.product_id", "=", "p.id").andOn(
        "b.sector_id",
        "=",
        db.raw("?", [sectorId]),
      );
    })
    .where("p.active", true)
    .whereRaw("COALESCE(b.quantity,0) <= p.minimum_quantity")
    .orderBy("p.id")
    .select(
      "p.id as product_id",
      "p.minimum_quantity as minimum_snapshot",
      db.raw("COALESCE(b.quantity,0) as balance_snapshot"),
    );
}
async function purchase(db, user, body, automatic = false) {
  const input = {
      sector_id: integer(body.sector_id || user.sector_id, "Setor"),
      notes: notes(body.notes),
      source: automatic ? "MINIMUM" : "MANUAL",
      ...(!automatic ? { items: items(body.items) } : {}),
    },
    token = identity(body, input);
  return db.transaction(async (trx) => {
    await sector(trx, user, input.sector_id, true);
    await trx("users").where({ id: user.id }).forUpdate().first();
    const old = await existing(trx, "inventory_purchase_orders", user, token);
    if (old) return old;
    let rows = input.items;
    if (automatic) {
      rows = (await minimumItems(trx, input.sector_id)).map((r) => ({
        ...r,
        quantity: Math.max(
          1,
          Number(r.minimum_snapshot) - Number(r.balance_snapshot),
        ),
      }));
      if (!rows.length)
        fail("Nenhum produto ativo está no mínimo ou abaixo dele neste setor.");
      if (rows.length > 500)
        fail(
          "Há mais de 500 produtos em alerta. Divida os pedidos por seleção manual.",
        );
    }
    await activeProducts(trx, rows);
    const [id] = await trx("inventory_purchase_orders").insert({
      sector_id: input.sector_id,
      notes: input.notes,
      source: input.source,
      created_by: user.id,
      ...token,
    });
    await trx("inventory_purchase_order_items").insert(
      rows.map((r) => ({ ...r, purchase_order_id: id })),
    );
    return trx("inventory_purchase_orders").where({ id }).first();
  });
}
async function access(db, user, id, purchase, lock = false) {
  const table = purchase
    ? "inventory_purchase_orders"
    : "inventory_consumptions";
  const q = scope(
    db(table + " as h").where("h.id", integer(id, "Registro")),
    user,
    purchase,
  );
  const row = await (lock ? q.forUpdate() : q).first();
  if (!row) fail("Registro não encontrado ou sem acesso.", 404);
  return row;
}
async function editPurchase(db, user, id, body) {
  const rows = items(body.items),
    note = notes(body.notes);
  return db.transaction(async (trx) => {
    const old = await access(trx, user, id, true, true);
    if (old.status !== "DRAFT")
      fail("Somente pedidos em rascunho podem ser editados.", 409);
    if (Number(body.revision) !== old.revision)
      fail(
        "O pedido foi alterado por outro usuário. Reabra para revisar.",
        409,
      );
    await activeProducts(trx, rows);
    const previous = await trx("inventory_purchase_order_items").where({
      purchase_order_id: old.id,
    });
    await trx("inventory_purchase_order_items")
      .where({ purchase_order_id: old.id })
      .del();
    await trx("inventory_purchase_order_items").insert(
      rows.map((r) => {
        const before = previous.find((p) => p.product_id === r.product_id);
        return {
          ...r,
          purchase_order_id: old.id,
          balance_snapshot: before?.balance_snapshot ?? null,
          minimum_snapshot: before?.minimum_snapshot ?? null,
        };
      }),
    );
    await trx("inventory_purchase_orders")
      .where({ id: old.id })
      .update({
        notes: note,
        revision: old.revision + 1,
        updated_at: trx.fn.now(),
      });
    return trx("inventory_purchase_orders").where({ id: old.id }).first();
  });
}
module.exports = {
  consume,
  purchase,
  editPurchase,
  access,
  scope,
  items,
  minimumItems,
  sector,
};
