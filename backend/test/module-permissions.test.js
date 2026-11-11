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

test("permissions distinguish view, create, edit and delete using the current database role", async () => {
  const oldQuery = db.query,
    oldMode = process.env.PERMISSIONS_ENABLED;
  process.env.PERMISSIONS_ENABLED = "true";
  let role = "user",
    rights = [],
    status = "active";
  db.query = async (sql) =>
    sql.includes("SELECT role") ? [[{ role, status }]] : [rights];
  async function check(action = "view", tokenRole = "user") {
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
    await modulePermission("inventory_stock", action)(req, res, () => {
      allowed = true;
    });
    return { allowed, res };
  }
  try {
    const actions = {
      view: "can_view",
      create: "can_create",
      edit: "can_edit",
      delete: "can_delete",
    };

    role = "user";
    rights = [];
    assert.equal(
      (await check("edit", "admin")).res.statusCode,
      403,
      "an old admin JWT cannot bypass the current database role",
    );
    for (const action of Object.keys(actions)) {
      assert.equal(
        (await check(action)).res.body.code,
        "PERMISSION_DENIED",
        `${action} is denied when no row is assigned`,
      );
    }

    for (const [action, column] of Object.entries(actions)) {
      rights = [{ allowed: 1, can_view: 0 }];
      assert.equal(
        (await check(action)).allowed,
        false,
        `${action} also requires can_view`,
      );
      rights = [{ allowed: action === "view" ? 1 : 0, can_view: 1 }];
      assert.equal(
        (await check(action)).allowed,
        action === "view",
        `${action} follows its own action column`,
      );
      rights = [{ allowed: 1, can_view: 1 }];
      assert.equal(
        (await check(action)).allowed,
        true,
        `${action} is allowed when both view and ${column} are granted`,
      );
    }

    for (const administratorRole of ["admin", "masteradmin"]) {
      role = administratorRole;
      rights = [];
      for (const action of Object.keys(actions)) {
        assert.equal(
          (await check(action, "user")).allowed,
          true,
          `${administratorRole} has full access independently of matrix rows`,
        );
      }
    }

    role = "admin";
    status = "inactive";
    assert.equal((await check("view", "admin")).res.statusCode, 401);
  } finally {
    db.query = oldQuery;
    if (oldMode === undefined) delete process.env.PERMISSIONS_ENABLED;
    else process.env.PERMISSIONS_ENABLED = oldMode;
  }
});
