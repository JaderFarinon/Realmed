const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
  DB_HOST: "localhost",
  DB_USER: "test",
  DB_PASS: "test",
  DB_NAME: "test",
  DB_PORT: "3306",
});
const db = require("../db");
const { modulePermission } = require("../middleware/permission");

test("permissions use current database roles, deny absent rights and require viewing for writes", async () => {
  const oldQuery = db.query,
    oldMode = process.env.PERMISSIONS_ENABLED;
  process.env.PERMISSIONS_ENABLED = "true";
  let role = "user",
    rights = [],
    status = "active";
  db.query = async (sql) =>
    sql.includes("SELECT role") ? [[{ role, status }]] : [rights];
  async function check(tokenRole = "user") {
    const req = { user: { id: 42, role: tokenRole } },
      res = {
        statusCode: 200,
        body: null,
        status(n) {
          this.statusCode = n;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
    let allowed = false;
    await modulePermission("inventory_stock", "edit")(req, res, () => {
      allowed = true;
    });
    return { allowed, res };
  }
  try {
    assert.equal(
      (await check("admin")).res.statusCode,
      403,
      "old admin token cannot bypass revoked database role",
    );
    assert.equal((await check()).res.body.code, "PERMISSION_DENIED");
    rights = [{ allowed: 1, can_view: 0 }];
    assert.equal((await check()).allowed, false);
    rights = [{ allowed: 1, can_view: 1 }];
    assert.equal((await check()).allowed, true);
    role = "admin";
    rights = [];
    assert.equal((await check()).allowed, true);
    status = "inactive";
    assert.equal((await check("admin")).res.statusCode, 401);
  } finally {
    db.query = oldQuery;
    if (oldMode === undefined) delete process.env.PERMISSIONS_ENABLED;
    else process.env.PERMISSIONS_ENABLED = oldMode;
  }
});
