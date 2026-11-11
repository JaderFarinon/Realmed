// Integration verification uses a disposable, isolated Realmed database only.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const mysql = require(path.join(root, "backend/node_modules/mysql2/promise"));
const dotenv = require(path.join(root, "backend/node_modules/dotenv"));
const knexFactory = require(path.join(root, "backend/node_modules/knex"));
const jwt = require(path.join(root, "backend/node_modules/jsonwebtoken"));
async function main() {
  const original = dotenv.parse(
    fs.readFileSync(path.join(root, "backend/.env")),
  );
  const name = `realmed_verify_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const connection = {
    host: original.DB_HOST,
    port: Number(original.DB_PORT),
    user: original.DB_USER,
    password: original.DB_PASS,
  };
  const admin = await mysql.createConnection(connection);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "realmed-verify-"));
  let db,
    server,
    pool,
    created = false;
  try {
    await admin.query(
      "CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
      [name],
    );
    created = true;
    const secret = crypto.randomBytes(32).toString("hex");
    const env = {
      ...original,
      DB_NAME: name,
      JWT_SECRET: secret,
      PERMISSIONS_ENABLED: "true",
      NODE_ENV: "test",
      STENCI_ENABLED: "false",
    };
    const envPath = path.join(temp, ".env");
    fs.writeFileSync(
      envPath,
      Object.entries(env)
        .map(([k, v]) => `${k}=${JSON.stringify(String(v))}`)
        .join("\n"),
      { mode: 0o600 },
    );
    process.env.DOTENV_CONFIG_PATH = envPath;
    process.chdir(temp);
    db = knexFactory({
      client: "mysql2",
      connection: { ...connection, database: name },
    });
    for (const migration of [
      "001_create_people.js",
      "002_create_users.js",
      "20250520000031_create_user_permissions.js",
      "20260916000001_add_stenci_users.js",
      "20261106000001_add_local_authentication.js",
      "20261014000001_create_inventory.js",
      "20261019000002_legacy_inventory_import.js",
      "20261019000005_consumption_and_purchase_orders.js",
    ])
      await require(path.join(root, "backend/migrations", migration)).up(db);
    const [personId] = await db("people").insert({
      full_name: "Realmed verification admin",
      email: "verify-admin@example.invalid",
    });
    const [adminId] = await db("users").insert({
      username: "verify-admin",
      person_id: personId,
      role: "admin",
      status: "active",
    });
    const [userPerson] = await db("people").insert({
      full_name: "Realmed verification user",
      email: "verify-user@example.invalid",
    });
    const [userId] = await db("users").insert({
      username: "verify-user",
      person_id: userPerson,
      role: "user",
      status: "active",
    });
    const { createApp } = require(path.join(root, "backend/app"));
    pool = require(path.join(root, "backend/db"));
    server = createApp().listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const token = jwt.sign({ id: adminId, role: "admin" }, secret);
    const userToken = jwt.sign({ id: userId, role: "user" }, secret);
    async function call(method, url, body, as = token, status = 200) {
      const res = await fetch(base + url, {
        method,
        headers: {
          Authorization: `Bearer ${as}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = res.status === 204 ? null : await res.json();
      assert.equal(
        res.status,
        status,
        `${method} ${url}: ${JSON.stringify(data)}`,
      );
      return data;
    }
    const sector = (await db("inventory_sectors").first()).id;
    const other = await call(
      "POST",
      "/inventory/sectors",
      { name: "Verification other sector" },
      token,
      201,
    );
    await db("inventory_user_profiles").insert({
      user_id: userId,
      sector_id: sector,
      profile: "USER",
    });
    const cat = await call(
      "POST",
      "/inventory/categories",
      { name: "Verification category" },
      token,
      201,
    );
    const unit = await call(
      "POST",
      "/inventory/presentations",
      { name: "Unidade" },
      token,
      201,
    );
    const product = await call(
      "POST",
      "/inventory/products",
      {
        name: "Verification product",
        category_id: cat.id,
        presentation_id: unit.id,
        minimum_quantity: 5,
      },
      token,
      201,
    );
    assert.equal(product.code, "000001");
    await call(
      "POST",
      "/inventory/products",
      {
        name: "Duplicate",
        code: "1",
        category_id: cat.id,
        presentation_id: unit.id,
      },
      token,
      409,
    );
    const supplier = await call(
      "POST",
      "/inventory/suppliers",
      { name: "Verification supplier" },
      token,
      201,
    );
    const invoice = await call(
      "POST",
      "/inventory/invoices",
      {
        number: "VERIFY",
        supplier_id: supplier.id,
        sector_id: sector,
        invoice_date: "2026-10-14",
      },
      token,
      201,
    );
    const invoiceItem = await call(
      "POST",
      `/inventory/invoices/${invoice.id}/items`,
      { product_id: product.id, quantity: 10, unit_price: "2,50" },
      token,
      201,
    );
    let stock = await call(
      "GET",
      `/inventory/stock?sector_id=${sector}&show_zero=true`,
    );
    assert.equal(Number(stock[0].quantity), 10);
    await call(
      "PUT",
      `/inventory/invoices/${invoice.id}/items/${invoiceItem.id}`,
      { product_id: product.id, quantity: 12, unit_price: "2.50" },
    );
    stock = await call(
      "GET",
      `/inventory/stock?sector_id=${sector}&show_zero=true`,
    );
    assert.equal(Number(stock[0].quantity), 12);
    await call("GET", "/inventory/stock", undefined, userToken, 403);
    await call("POST", `/permissoes/${userId}`, {
      permissions: [
        { moduleKey: "inventory_stock", canView: true },
        {
          moduleKey: "inventory_requests",
          canView: true,
          canCreate: true,
          canEdit: true,
        },
        { moduleKey: "inventory_fulfillment", canView: true, canEdit: true },
      ],
      inventoryProfile: { sector_id: sector, profile: "USER" },
      role: "user",
    });
    await call(
      "POST",
      "/inventory/stock/adjust",
      {
        product_id: product.id,
        sector_id: sector,
        quantity: 99,
        notes: "unauthorized",
      },
      userToken,
      403,
    );
    const forbiddenTarget = await call(
      "POST",
      "/inventory/requests",
      { requester_id: adminId, request_date: "2026-10-14" },
      userToken,
      403,
    );
    assert.equal(forbiddenTarget.code, "PERMISSION_DENIED");
    const request = await call(
      "POST",
      "/inventory/requests",
      { requester_id: userId, request_date: "2026-10-14" },
      userToken,
      201,
    );
    const item = await call(
      "POST",
      `/inventory/requests/${request.id}/items`,
      { product_id: product.id, requested_quantity: 15 },
      userToken,
      201,
    );
    let delivery = await call(
      "POST",
      `/inventory/requests/${request.id}/items/${item.id}/fulfill`,
      { quantity: 4 },
      userToken,
    );
    assert.equal(delivery.status, "PARCIALMENTE_ATENDIDO");
    delivery = await call(
      "POST",
      `/inventory/requests/${request.id}/items/${item.id}/fulfill`,
      { quantity: 11 },
      userToken,
    );
    assert.equal(delivery.ok, false);
    assert.equal(delivery.status, "AGUARDANDO_COMPRA");
    await call(
      "PUT",
      `/inventory/invoices/${invoice.id}/items/${invoiceItem.id}`,
      { product_id: product.id, quantity: 2, unit_price: 2.5 },
      token,
      409,
    );
    stock = await call(
      "GET",
      `/inventory/stock?sector_id=${sector}&show_zero=true`,
    );
    assert.equal(Number(stock[0].quantity), 8);
    await call("POST", "/inventory/stock/adjust", {
      product_id: product.id,
      sector_id: sector,
      quantity: 11,
      notes: "Verification replenishment",
    });
    const deliveries = await Promise.all(
      [0, 1].map(() =>
        (async () => {
          const res = await fetch(
            `${base}/inventory/requests/${request.id}/items/${item.id}/fulfill`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${userToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ quantity: 11 }),
            },
          );
          return { httpStatus: res.status, body: await res.json() };
        })(),
      ),
    );
    assert.deepEqual(deliveries.map((d) => d.httpStatus).sort(), [200, 422]);
    assert.equal(
      deliveries.find((d) => d.httpStatus === 200).body.status,
      "ATENDIDO",
    );
    stock = await call(
      "GET",
      `/inventory/stock?sector_id=${sector}&show_zero=true`,
    );
    assert.equal(Number(stock[0].quantity), 0);
    await call("POST", `/inventory/invoices/${invoice.id}/close`, {});
    await call(
      "POST",
      `/inventory/invoices/${invoice.id}/items`,
      { product_id: product.id, quantity: 1, unit_price: 1 },
      token,
      409,
    );
    await call("POST", "/inventory/stock/adjust", {
      product_id: product.id,
      sector_id: other.id,
      quantity: 7,
      notes: "Verification other sector",
    });
    stock = await call(
      "GET",
      `/inventory/stock?sector_id=${other.id}&show_zero=true`,
      undefined,
      userToken,
    );
    assert.equal(
      Number(stock[0].quantity),
      0,
      "regular user cannot read another sector by tampering with filter",
    );
    await call(
      "DELETE",
      `/inventory/requests/${request.id}`,
      undefined,
      token,
      409,
    );
    const report = await call("GET", "/inventory/reports");
    assert.equal(
      report
        .filter((row) => row.kind === "FULFILLMENT")
        .reduce((sum, row) => sum + row.delta, 0),
      -15,
    );
    const dashboard = await call("GET", "/inventory/dashboard");
    assert.equal(dashboard.cards.products, 1);
    assert.equal(Number(dashboard.topProducts[0].quantity), 15);
    assert.equal(Number(dashboard.monthlyPurchases[0].total), 30);
    assert.equal(
      Number((await db("permission_audit").count("* as total").first()).total),
      1,
    );
    // New consumption/purchase split: only this disposable DB is touched.
    await db("users").where({ id: userId }).update({ role: "user" });
    await call("GET", "/inventory/consumptions", undefined, userToken, 403);
    await db("user_permissions").insert({
      user_id: userId,
      module_key: "inventory_consumptions",
      can_view: true,
      can_create: true,
    });
    await call("POST", "/inventory/stock/adjust", {
      product_id: product.id,
      sector_id: sector,
      quantity: 10,
      notes: "Consumption test balance",
    });
    const addProduct = async (name, minimum = 0, active = true) =>
      call(
        "POST",
        "/inventory/products",
        {
          name,
          category_id: cat.id,
          presentation_id: unit.id,
          minimum_quantity: minimum,
          active,
        },
        token,
        201,
      );
    const equal = await addProduct("Equal minimum", 4),
      zero = await addProduct("Zero minimum", 0),
      above = await addProduct("Above minimum", 4),
      inactive = await addProduct("Inactive purchase exclusion", 3, false);
    await call("POST", "/inventory/stock/adjust", {
      product_id: equal.id,
      sector_id: sector,
      quantity: 4,
      notes: "Equal threshold",
    });
    await call("POST", "/inventory/stock/adjust", {
      product_id: above.id,
      sector_id: sector,
      quantity: 8,
      notes: "Above threshold",
    });
    const payload = {
      request_key: crypto.randomUUID(),
      sector_id: sector,
      created_by: adminId,
      items: [{ product_id: product.id, quantity: 3 }],
    };
    await call(
      "POST",
      "/inventory/consumptions",
      { ...payload, sector_id: other.id },
      userToken,
      403,
    );
    const repeated = await Promise.all([
      call("POST", "/inventory/consumptions", payload, userToken, 201),
      call("POST", "/inventory/consumptions", payload, userToken, 201),
    ]);
    assert.equal(repeated[0].id, repeated[1].id);
    assert.equal(repeated[0].created_by, userId);
    const balanceOf = async (id) =>
      Number(
        (
          await db("inventory_balances")
            .where({ product_id: id, sector_id: sector })
            .first()
        )?.quantity || 0,
      );
    assert.equal(await balanceOf(product.id), 7);
    await call(
      "POST",
      "/inventory/consumptions",
      { ...payload, items: [{ product_id: product.id, quantity: 4 }] },
      userToken,
      409,
    );
    await call(
      "POST",
      "/inventory/consumptions",
      {
        ...payload,
        request_key: crypto.randomUUID(),
        items: [
          { product_id: product.id, quantity: 2 },
          { product_id: zero.id, quantity: 1 },
        ],
      },
      userToken,
      409,
    );
    assert.equal(
      await balanceOf(product.id),
      7,
      "multi-item failure rolls back prior deduction",
    );
    await call(
      "POST",
      "/inventory/consumptions",
      {
        ...payload,
        request_key: crypto.randomUUID(),
        items: [{ product_id: inactive.id, quantity: 1 }],
      },
      userToken,
      422,
    );
    await call(
      "POST",
      "/inventory/consumptions",
      {
        ...payload,
        request_key: crypto.randomUUID(),
        items: [{ product_id: product.id, quantity: -1 }],
      },
      userToken,
      422,
    );
    const competing = await Promise.all(
      [1, 2].map(async () => {
        const result = await fetch(base + "/inventory/consumptions", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + userToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            request_key: crypto.randomUUID(),
            items: [{ product_id: product.id, quantity: 5 }],
          }),
        });
        return result.status;
      }),
    );
    assert.deepEqual(competing.sort(), [201, 409]);
    assert.equal(await balanceOf(product.id), 2);
    const consumptionOptions = await call(
      "GET",
      "/inventory/consumptions-options",
      undefined,
      userToken,
    );
    assert.equal(consumptionOptions.sectors.length, 1);
    assert.equal(
      Number(
        consumptionOptions.products.find((p) => p.id === product.id).balance,
      ),
      2,
    );
    const beforePurchase = await balanceOf(product.id);
    const autoBody = {
      request_key: crypto.randomUUID(),
      sector_id: sector,
      notes: "Review only",
    };
    const auto = await call(
      "POST",
      "/inventory/purchase-orders/automatic",
      autoBody,
      token,
      201,
    );
    assert.equal(
      (
        await call(
          "POST",
          "/inventory/purchase-orders/automatic",
          autoBody,
          token,
          201,
        )
      ).id,
      auto.id,
    );
    let order = await call("GET", "/inventory/purchase-orders/" + auto.id);
    assert.equal(order.status, "DRAFT");
    assert.equal(
      order.items.find((i) => i.product_id === product.id).quantity,
      3,
    );
    assert.equal(
      order.items.find((i) => i.product_id === equal.id).quantity,
      1,
    );
    assert.equal(order.items.find((i) => i.product_id === zero.id).quantity, 1);
    assert.ok(
      !order.items.some((i) => [above.id, inactive.id].includes(i.product_id)),
    );
    assert.equal(await balanceOf(product.id), beforePurchase);
    await call("PUT", "/inventory/purchase-orders/" + auto.id, {
      revision: 0,
      notes: "Buyer revised",
      items: [
        { product_id: product.id, quantity: 9 },
        { product_id: above.id, quantity: 2 },
      ],
    });
    order = await call("GET", "/inventory/purchase-orders/" + auto.id);
    assert.equal(order.revision, 1);
    assert.equal(order.items.length, 2);
    assert.equal(
      order.items.find((i) => i.product_id === product.id).quantity,
      9,
    );
    assert.equal(
      await balanceOf(product.id),
      beforePurchase,
      "purchase edits never change stock",
    );
    await call(
      "PUT",
      "/inventory/purchase-orders/" + auto.id,
      { revision: 0, items: [{ product_id: product.id, quantity: 1 }] },
      token,
      409,
    );
    await call("GET", "/inventory/purchase-orders", undefined, userToken, 403);
    await db("user_permissions").insert({
      user_id: userId,
      module_key: "inventory_purchase_orders",
      can_view: true,
      can_create: true,
      can_edit: false,
    });
    await call(
      "PUT",
      "/inventory/purchase-orders/" + auto.id,
      { revision: 1, items: [{ product_id: product.id, quantity: 1 }] },
      userToken,
      403,
    );
    await call(
      "POST",
      "/inventory/purchase-orders/automatic",
      { request_key: crypto.randomUUID(), sector_id: other.id },
      userToken,
      403,
    );
    const ledger = await db("inventory_movements").where({
      kind: "CONSUMPTION",
    });
    assert.equal(
      ledger.reduce((sum, row) => sum + row.delta, 0),
      -8,
    );
    assert.equal((await db("inventory_consumptions")).length, 2);
    const manual = await call('POST','/inventory/purchase-orders',{request_key:crypto.randomUUID(),sector_id:sector,items:[{product_id:above.id,quantity:2}]},token,201);
    assert.equal(manual.source,'MANUAL');assert.equal(await balanceOf(above.id),8);
    await call('POST','/inventory/purchase-orders',{request_key:crypto.randomUUID(),sector_id:sector,items:[{product_id:product.id,quantity:1},{product_id:product.id,quantity:2}]},token,422);
    const immutable=await fetch(base+'/inventory/consumptions/'+repeated[0].id,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});
    assert.equal(immutable.status,404);
    const updatedDashboard = await call("GET", "/inventory/dashboard");
    assert.equal(updatedDashboard.cards.purchaseDrafts, 2);
    assert.equal(updatedDashboard.cards.consumptions, 2);
    assert.equal(
      Number(
        updatedDashboard.topProducts.find((p) => p.name === product.name)
          .quantity,
      ),
      23,
    );
    const inventoryPermissions=(await call('GET','/permissoes/catalog')).filter(p=>p.key.startsWith('inventory_')).map(p=>({moduleKey:p.key,canView:true,canCreate:true,canEdit:true,canDelete:false}));
    await call('POST',`/permissoes/${userId}`,{permissions:inventoryPermissions,inventoryProfile:{profile:'USER',sector_id:null}},token,422);
    const savedMatrix=await call('POST',`/permissoes/${userId}`,{permissions:inventoryPermissions,inventoryProfile:{profile:'USER',sector_id:sector}});
    assert.ok(savedMatrix.permissions.every(p=>p.canView&&!p.canDelete));
    await call('GET','/inventory/dashboard',undefined,userToken);
    await call('GET','/inventory/options',undefined,userToken);
    await call('GET','/inventory/stock',undefined,userToken);
    await call('GET','/inventory/products',undefined,userToken);
    const allowedCategory=await call('POST','/inventory/categories',{name:'Permission test category'},userToken,201);
    await call('PUT',`/inventory/categories/${allowedCategory.id}`,{name:'Updated permission test category'},userToken);
    await call('DELETE',`/inventory/categories/${allowedCategory.id}`,undefined,userToken,403);
    await call('PATCH',`/inventory/categories/${allowedCategory.id}/active`,{active:false},userToken,403);
    await call('GET','/guide-processes',undefined,userToken,403);
    const me=(await call('GET','/auth/me',undefined,userToken)).user;
    assert.ok(me.permissions.some(p=>p.moduleKey==='inventory_dashboard'&&p.canView));
    assert.equal(me.permissions.some(p=>p.moduleKey==='guide_processes'&&p.canView),false);
    await call('POST',`/permissoes/${userId}`,{permissions:inventoryPermissions.map(p=>p.moduleKey==='inventory_stock'?{...p,canView:false,canCreate:false,canEdit:false}:p),inventoryProfile:{profile:'USER',sector_id:sector}});
    await call('GET','/inventory/stock',undefined,userToken,403);
    await call('GET','/inventory/dashboard',undefined,userToken);
    console.log('PASS stock-only account: permissions persisted, active sector enforced, view/create/edit allowed, delete/inactivate denied, unrelated treatment denied, auth/me consistent and revocation immediate.');
    console.log(
      "PASS consumption/purchases: permissions, actor/sector isolation, atomic rollback, retries/concurrent withdrawals, minimum/equal/zero/inactive products, editable draft, revision conflicts, dashboard and unchanged stock on purchases.",
    );
    console.log(
      "Inventory integration verified: receipts, edits, insufficient stock, partial and concurrent fulfillment, invoice closure, requester scope, permissions and sector isolation.",
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    const routeModule =
      require.cache[
        require.resolve(path.join(root, "backend/routes/guide-center"))
      ];
    if (routeModule?.exports.knex) await routeModule.exports.knex.destroy();
    const permissionsModule =
      require.cache[
        require.resolve(path.join(root, "backend/routes/permissoes"))
      ];
    if (permissionsModule?.exports.knex)
      await permissionsModule.exports.knex.destroy();
    if (db) await db.destroy();
    if (created && /^realmed_verify_\d+_[a-f0-9]{6}$/.test(name))
      await admin.query("DROP DATABASE ??", [name]);
    await admin.end();
    process.chdir(root);
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    if (!path.resolve(temp).startsWith(tempRoot))
      throw new Error("Unexpected temporary path");
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error("Inventory integration verification failed:", {
    code: error.code || error.name,
    message: error.code?.startsWith("ER_")
      ? "Database operation failed"
      : error.message,
    ...(error.code === "ERR_ASSERTION" ? { stack: error.stack } : {}),
  });
  process.exitCode = 1;
});
