// Creates/removes only its isolated temporary database. No source DB is queried.
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  mysql = require(path.join(root, "backend/node_modules/mysql2/promise")),
  knex = require(path.join(root, "backend/node_modules/knex")),
  dotenv = require(path.join(root, "backend/node_modules/dotenv"));
async function main() {
  const env = dotenv.parse(fs.readFileSync(path.join(root, "backend/.env"))),
    connection = {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASS,
    };
  const name =
      "realmed_verify_insurance_" +
      Date.now() +
      "_" +
      crypto.randomBytes(3).toString("hex"),
    admin = await mysql.createConnection(connection),
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "realmed-insurance-"));
  let db, server, pool, guideDb;
  try {
    await admin.query(
      "CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
      [name],
    );
    const secret = crypto.randomBytes(32).toString("hex"),
      settings = {
        ...env,
        DB_NAME: name,
        JWT_SECRET: secret,
        PERMISSIONS_ENABLED: "true",
        NODE_ENV: "test",
      };
    fs.writeFileSync(
      path.join(temp, ".env"),
      Object.entries(settings)
        .map(([key, value]) => key + "=" + JSON.stringify(String(value)))
        .join("\n"),
      { mode: 0o600 },
    );
    process.env.DOTENV_CONFIG_PATH = path.join(temp, ".env");
    process.chdir(temp);
    db = knex({
      client: "mysql2",
      connection: { ...connection, database: name },
    });
    for (const file of [
      "001_create_people.js",
      "002_create_users.js",
      "20250520000031_create_user_permissions.js",
      "20260916000001_add_stenci_users.js",
      "20260915000002_create_guide_center.js",
      "20260915000003_create_document_generation.js",
      "20260915000006_reorganize_guide_center_as_treatments.js",
      "20260916000003_add_physiotherapy_evaluation.js",
      "20260916000004_create_physiotherapy_evaluations.js",
      "20261019000003_expand_digital_evaluation.js",
      "20261027000013_authorization_documents.js",
      "20261027000014_guide_continuity.js",
      "20261028000001_physiotherapy_rotation.js",
      "20261028000002_guide_billing.js",
      "20261028000003_authorization_by_guide.js",
      "20261019000001_create_procedure_code_rules.js",
      "20261019000004_insurance_procedures.js",
      "20261014000001_create_inventory.js",
      "20261019000002_legacy_inventory_import.js",
    ])
      await require(path.join(root, "backend/migrations", file)).up(db);
    const [person] = await db("people").insert({
      full_name: "Administrador fictício",
      email: "migration@example.invalid",
    });
    const [actorId] = await db("users").insert({
      username: "migration-test",
      person_id: person,
      role: "admin",
      status: "active",
    });
    const general = await db("inventory_sectors")
      .where({ name: "Geral" })
      .first();
    await db("inventory_user_profiles").insert({
      user_id: actorId,
      sector_id: general.id,
      profile: "USER",
    });
    const service = require(
        path.join(root, "backend/services/insuranceProcedureService"),
      ),
      codes = require(path.join(root, "backend/services/procedureCodeService"));
    const [insurer] = await db("insurance_providers").insert({
        name: "Convênio A",
      }),
      [other] = await db("insurance_providers").insert({ name: "Convênio B" });
    const values = {
      code: "1567",
      description: "Descrição A",
      type: "PHYSIOTHERAPY",
      table_name: "TUSS",
      replaces: ["1234"],
      active: true,
    };
    const created = await service.save(db, insurer, values);
    assert.equal(created.code, "1567");
    assert.deepEqual(created.replaces, ["1234"]);
    await service.save(db, other, { ...values, description: "Descrição B" });
    let rules = await codes.loadRules(db);
    assert.equal(
      codes.choose({ code: "1234", requested_quantity: 10 }, rules, insurer)
        .code,
      "1567",
    );
    assert.equal(
      codes.choose({ code: "1234" }, rules, other).description,
      "Descrição B",
    );
    assert.equal(codes.choose({ code: "1234" }, rules, 99999).code, "1234");
    const candidates = codes.recognize(
      "Guia: código 1234",
      await codes.catalog(db, insurer),
      rules,
      insurer,
    );
    assert.ok(
      candidates.some(
        (c) => c.source.code === "1234" && c.proposed.code === "1567",
      ),
    );
    const hash = codes.fingerprint(rules);
    await service.save(
      db,
      insurer,
      { ...values, description: "Descrição atualizada" },
      created.id,
    );
    assert.notEqual(codes.fingerprint(await codes.loadRules(db)), hash);
    const count = Number((await db("procedures").count("* as n").first()).n);
    await assert.rejects(
      service.save(db, insurer, { ...values, code: "9999" }),
      /já é substituído/,
    );
    assert.equal(
      Number((await db("procedures").count("* as n").first()).n),
      count,
    );
    const inactive = await service.save(
      db,
      insurer,
      { ...values, active: false },
      created.id,
    );
    assert.deepEqual(inactive.replaces, ["1234"]);
    assert.equal(
      codes.choose({ code: "1234" }, await codes.loadRules(db), insurer).code,
      "1234",
    );
    assert.equal(
      codes.choose({ code: "1234" }, await codes.loadRules(db), other).code,
      "1567",
    );
    await service.save(db, insurer, values, created.id);
    assert.equal(
      codes.choose({ code: "1234" }, await codes.loadRules(db), insurer).code,
      "1567",
    );
    const [destination] = await db("insurance_providers").insert({
      name: "Destino réplica",
    });
    const [empty] = await db("insurance_providers").insert({
      name: "Destino rollback",
    });
    const [conflict] = await db("insurance_providers").insert({
      name: "Destino conflitante",
    });
    await db("procedure_code_rules")
      .where({ insurance_provider_id: insurer })
      .update({
        priority: 7,
        source_table: "TUSS",
        valid_from: "2026-01-01",
        valid_until: "2027-12-31",
        notes: "Regra preservada",
      });
    const unselected = await service.save(db, insurer, {
      ...values,
      code: "7654",
      replaces: [],
    });
    const copied = await service.replicate(
      db,
      insurer,
      [destination, other, destination],
      [created.procedure_id],
    );
    assert.equal(
      (await service.list(db, destination)).some(
        (row) => row.procedure_id === unselected.procedure_id,
      ),
      false,
    );
    assert.equal(copied.results.length, 2);
    assert.equal(copied.results[0].copied, 1);
    assert.equal(copied.results[1].skipped, 1);
    assert.equal((await service.list(db, other))[0].description, "Descrição B");
    assert.equal(
      (await service.list(db, destination))[0].description,
      values.description,
    );
    const copiedRule = await db("procedure_code_rules")
      .where({ insurance_provider_id: destination })
      .first();
    assert.equal(copiedRule.priority, 7);
    assert.equal(copiedRule.notes, "Regra preservada");
    assert.equal(copiedRule.source_table, "TUSS");
    assert.equal(new Date(copiedRule.valid_until).getFullYear(), 2027);
    assert.equal(
      codes.choose(
        { code: "1234", table_name: "TUSS" },
        await codes.loadRules(db),
        destination,
      ).code,
      "1567",
    );
    assert.equal(
      (
        await service.replicate(
          db,
          insurer,
          [destination],
          [created.procedure_id],
        )
      ).results[0].copied,
      0,
    );
    await service.save(db, conflict, { ...values, code: "9876" });
    await assert.rejects(
      service.replicate(db, insurer, [empty, conflict], [created.procedure_id]),
      /Conflito/,
    );
    assert.equal((await service.list(db, empty)).length, 0);
    await assert.rejects(
      service.replicate(db, insurer, [insurer], [created.procedure_id]),
      /origem/,
    );
    await assert.rejects(
      service.replicate(db, empty, [destination], [created.procedure_id]),
      /não pertence/,
    );
    await assert.rejects(
      service.replicate(db, insurer, [9999999], [created.procedure_id]),
      /não encontrado/,
    );
    const inactiveCopy = await service.save(db, insurer, {
      ...values,
      code: "8765",
      replaces: ["8764"],
      active: false,
    });
    await assert.rejects(
      service.replicate(db, insurer, [destination], []),
      /ao menos/,
    );
    await assert.rejects(
      service.replicate(db, insurer, [destination]),
      /ao menos/,
    );
    await assert.rejects(
      service.replicate(
        db,
        insurer,
        [destination],
        [created.procedure_id, 999999],
      ),
      /não pertence/,
    );
    await service.replicate(
      db,
      insurer,
      [destination],
      [inactiveCopy.procedure_id],
    );
    const inactiveResult = (await service.list(db, destination)).find(
      (row) => row.procedure_id === inactiveCopy.procedure_id,
    );
    assert.equal(Boolean(inactiveResult.active), false);
    assert.deepEqual(inactiveResult.replaces, ["8764"]);
    const [linkProvider] = await db("insurance_providers").insert({name:"Destino catálogo geral"});
    const globalBefore = await db("procedures").orderBy("id");
    const rulesBefore = await db("procedure_code_rules").orderBy("id");
    assert.deepEqual(await service.linkExisting(db, linkProvider, [created.procedure_id, unselected.procedure_id, created.procedure_id]), {linked:2,existing:0});
    assert.deepEqual(await db("procedures").orderBy("id"), globalBefore, "must not recreate shared procedures");
    assert.deepEqual(await db("procedure_code_rules").orderBy("id"), rulesBefore, "must not copy or alter substitution rules");
    await db("insurance_procedures").where({insurance_provider_id:linkProvider,procedure_id:created.procedure_id}).update({description:"Configuração local preservada",active:false});
    assert.deepEqual(await service.linkExisting(db, linkProvider, [created.procedure_id]), {linked:0,existing:1});
    const preserved=(await service.list(db,linkProvider)).find(row=>row.procedure_id===created.procedure_id);
    assert.equal(preserved.description,"Configuração local preservada");assert.equal(Boolean(preserved.active),false);
    await assert.rejects(service.linkExisting(db, linkProvider, [inactiveCopy.procedure_id,99999999]), /não existe|inativo/);
    assert.equal((await service.list(db,linkProvider)).length,2,"invalid selection rolls back all links");
    await assert.rejects(service.linkExisting(db, linkProvider, []), /Selecione/);
    const [inactiveGeneral]=await db("procedures").insert({code:"099900",description:"Inativo geral",type:"OTHER",active:false});
    await assert.rejects(service.linkExisting(db, linkProvider, [inactiveGeneral]), /inativo/);
    const express = require(path.join(root, "backend/node_modules/express")),
      app = express();
    app.use(express.json());
    app.use(
      "/api",
      require(path.join(root, "backend/routes/insurance-procedures")),
    );
    const auth = require(path.join(root, "backend/middleware/auth")),
      { modulePermissionAny } = require(
        path.join(root, "backend/middleware/permission"),
      );
    app.get(
      "/api/allowed",
      auth,
      modulePermissionAny([
        ["guide_processes", "create"],
        ["insurance_providers", "view"],
      ]),
      (req, res) => res.json(req.realmedAllowedModules),
    );
    guideDb = require(path.join(root, "backend/routes/guide-center")).knex;
    pool = require(path.join(root, "backend/db"));
    server = await new Promise((resolve) => {
      const running = app.listen(0, "127.0.0.1", () => resolve(running));
    });
    const jwt = require(path.join(root, "backend/node_modules/jsonwebtoken")),
      token = jwt.sign({ id: actorId, role: "admin" }, secret),
      base = "http://127.0.0.1:" + server.address().port + "/api";
    let response = await fetch(
      base + "/insurance-providers/" + insurer + "/procedures",
      { headers: { Authorization: "Bearer " + token } },
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json())[0].code, "1567");
    const [viewerPerson] = await db("people").insert({
        full_name: "Leitor fictício",
      }),
      [viewerId] = await db("users").insert({
        username: "insurance-viewer",
        person_id: viewerPerson,
        role: "user",
        status: "active",
      });
    await db("user_permissions").insert({
      user_id: viewerId,
      module_key: "insurance_providers",
      can_view: true,
    });
    const viewerToken = jwt.sign({ id: viewerId, role: "user" }, secret),
      headers = {
        Authorization: "Bearer " + viewerToken,
        "Content-Type": "application/json",
      };
    response = await fetch(base + "/allowed", { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), ["insurance_providers"]);
    response = await fetch(
      base + "/insurance-providers/" + insurer + "/procedures",
      { headers },
    );
    assert.equal(response.status, 403);
    await db("user_permissions").insert({
      user_id: viewerId,
      module_key: "procedures",
      can_view: true,
    });
    assert.equal(
      (
        await fetch(base + "/insurance-providers/" + insurer + "/procedures", {
          headers,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + "/insurance-providers/" + insurer + "/procedures", {
          method: "POST",
          headers,
          body: JSON.stringify(values),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/insurance-providers/replicate-procedures", {
          method: "POST",
          headers,
          body: JSON.stringify({
            source_id: insurer,
            destination_ids: [destination],
            procedure_ids: [created.procedure_id],
          }),
        })
      ).status,
      403,
    );
    const adminResponse = await fetch(
      base + "/insurance-providers/replicate-procedures",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_id: insurer,
          destination_ids: [destination],
          procedure_ids: [created.procedure_id],
        }),
      },
    );
    assert.equal(adminResponse.status, 200);
    const linkUrl=base+"/insurance-providers/"+linkProvider+"/procedures/link";
    assert.equal((await fetch(linkUrl,{method:"POST",headers,body:JSON.stringify({procedure_ids:[created.procedure_id]})})).status,403);
    await db("user_permissions").where({user_id:viewerId,module_key:"procedures"}).update({can_create:true});
    const linkResponse=await fetch(linkUrl,{method:"POST",headers,body:JSON.stringify({procedure_ids:[inactiveCopy.procedure_id]})});
    assert.equal(linkResponse.status,200);assert.deepEqual(await linkResponse.json(),{linked:1,existing:0});
    await db("user_permissions").where({user_id:viewerId,module_key:"insurance_providers"}).update({can_view:false});
    assert.equal((await fetch(linkUrl,{method:"POST",headers,body:JSON.stringify({procedure_ids:[created.procedure_id]})})).status,403);
    console.log("PASS link existing catalog: selected IDs only, no shared duplicates, preserved local configuration and all rules, idempotency, atomic invalid/inactive rejection and API create/provider permissions.");
    console.log(
      "PASS replication: multiple destinations, preserved existing procedures, advanced rules, inactive entries, repeat without duplication, atomic conflict rollback and endpoint permissions.",
    );
    console.log(
      "PASS isolated MySQL: insurer-specific catalog, 1234 -> 1567 recognition, description isolation, atomic conflict rollback, deactivation/reactivation, stale review fingerprint and permissions.",
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (guideDb) await guideDb.destroy();
    if (pool) await pool.end();
    if (db) await db.destroy();
    if (!/^realmed_verify_insurance_[0-9]+_[a-f0-9]{6}$/.test(name))
      throw Error("Unsafe test database name");
    await admin.query("DROP DATABASE IF EXISTS ??", [name]);
    await admin.end();
    process.chdir(root);
    const resolved = path.resolve(temp);
    if (
      path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
      !path.basename(resolved).startsWith("realmed-insurance-")
    )
      throw Error("Unsafe temporary directory");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error("Legacy inventory verification failed:", error.message);
  process.exitCode = 1;
});
