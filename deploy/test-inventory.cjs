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
      "20261014000001_create_inventory.js",
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
    message: error.code ? "Database operation failed" : error.message,
  });
  process.exitCode = 1;
});
