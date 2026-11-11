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
      "realmed_verify_evaluation_" +
      Date.now() +
      "_" +
      crypto.randomBytes(3).toString("hex"),
    admin = await mysql.createConnection(connection),
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "realmed-evaluation-"));
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
    const [patientId] = await db("patients").insert({
      full_name: "Paciente fictício",
      birth_date: "1990-01-01",
      phone: "000000000",
    });
    const [processId] = await db("guide_processes").insert({
      patient_id: patientId,
      created_by: actorId,
    });
    const express = require(path.join(root, "backend/node_modules/express")),
      app = express();
    app.use(express.json({ limit: "2mb" }));
    app.use(
      "/api",
      require(path.join(root, "backend/routes/guide-center")).router,
    );
    app.use(
      "/api",
      require(path.join(root, "backend/routes/physiotherapy-evaluations")),
    );
    guideDb = require(path.join(root, "backend/routes/guide-center")).knex;
    pool = require(path.join(root, "backend/db"));
    server = await new Promise((resolve) => {
      const running = app.listen(0, "127.0.0.1", () => resolve(running));
    });
    const token = require(
        path.join(root, "backend/node_modules/jsonwebtoken"),
      ).sign({ id: actorId, role: "admin" }, secret),
      base =
        "http://127.0.0.1:" +
        server.address().port +
        "/api/guide-processes/" +
        processId +
        "/evaluation";
    const call = async (method, suffix = "", data) => {
      const response = await fetch(base + suffix, {
        method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return { status: response.status, data: await response.json() };
    };
    const treatmentUrl = base.replace(/\/\d+\/evaluation$/, "");
    const headers = {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    };
    const createdResponse = await fetch(treatmentUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patient_id: patientId,
        assessment_date: "2026-10-20",
      }),
    });
    assert.equal(createdResponse.status, 201);
    const createdTreatment = await createdResponse.json();
    const newest = await fetch(treatmentUrl, { headers });
    assert.equal(newest.status, 200);
    assert.equal((await newest.json()).data[0].id, createdTreatment.id);
    assert.equal(createdTreatment.requested_sessions, null);
    assert.equal(createdTreatment.expected_start_date, null);
    const minimalUpdate = await fetch(
      treatmentUrl + "/" + createdTreatment.id,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ assessment_date: "2026-10-21", priority: 0 }),
      },
    );
    assert.equal(minimalUpdate.status, 200);
    assert.equal((await minimalUpdate.json()).priority, 0);
    const optionsResponse = await fetch(
      treatmentUrl + "/" + createdTreatment.id + "/preparation-options",
      { headers },
    );
    assert.equal(optionsResponse.status, 200);
    assert.ok(Array.isArray((await optionsResponse.json()).insurances));
    console.log(
      "PASS reception: patient and assessment date only, persistent editing, zero priority and preparation options.",
    );
    assert.equal((await call("GET", "/options")).status, 200);
    const queue = async (key) => {
      const result = await fetch(
        treatmentUrl + "?workflow_queue=" + key + "&pageSize=1",
        { headers },
      );
      assert.equal(result.status, 200);
      return result.json();
    };
    assert.equal((await queue("AWAITING_EVALUATION")).pagination.total, 2);
    assert.equal((await queue("AWAITING_GUIDE_CENTER")).pagination.total, 0);
    let response = await call("POST", "", {});
    assert.equal(response.status, 201);
    assert.equal((await queue("AWAITING_EVALUATION")).pagination.total, 2);
    assert.equal((await call("POST", "/complete", {})).status, 422);
    const payload = {
      chief_complaint: "Dor",
      physical_exam: "Exame fictício",
      severity: "MILD",
      care_risk: "LOW",
      therapeutic_goals: "Mobilidade",
      conducts: ["Cinesioterapia"],
      evaluation_date: "2026-10-19",
      responsible_name: "Profissional fictício",
      responsible_crefito: "000000 / PR",
      pain_score: 0,
      individual_monitoring: false,
      regions: [{ region: "Joelho", laterality: "LEFT" }],
      body_marks: [{ x: 0.4, y: 0.5, kind: "PAIN" }],
      signature_strokes: [
        [
          { x: 0.1, y: 0.2 },
          { x: 0.8, y: 0.7 },
        ],
      ],
      requested_sessions: 10,
      medical_diagnosis: "Hipótese ".repeat(40),
      cid: "M25",
      treatment_days: [{ day: "MONDAY", enabled: true, time: "08:30" }],
    };
    response = await call("PUT", "", payload);
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.deepEqual(response.data.body_marks, payload.body_marks);
    assert.equal(response.data.individual_monitoring, 0);
    assert.equal(
      (await db("guide_processes").where({ id: processId }).first())
        .requested_sessions,
      10,
    );
    response = await call("POST", "/complete", {});
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.status, "COMPLETED");
    assert.equal((await queue("AWAITING_EVALUATION")).pagination.total, 1);
    const central = await queue("AWAITING_GUIDE_CENTER");
    assert.equal(central.pagination.total, 1);
    assert.equal(central.data[0].id, processId);
    await db("guide_processes")
      .where({ id: processId })
      .update({ authorization_status: "READY" });
    assert.equal((await queue("AWAITING_GUIDE_CENTER")).pagination.total, 0);
    await db("guide_processes")
      .where({ id: processId })
      .update({ authorization_status: "NOT_READY" });
    assert.ok(response.data.completed_at);
    assert.equal((await call("POST", "/complete", {})).status, 200);
    assert.equal(
      (
        await db("guide_process_history").where({
          guide_process_id: processId,
          action: "EVALUATION_COMPLETED",
        })
      ).length,
      1,
    );
    assert.equal(
      (await call("PUT", "", { chief_complaint: "Alterar" })).status,
      409,
    );
    assert.equal((await call("POST", "/reopen", {})).status, 200);
    assert.equal((await queue("AWAITING_EVALUATION")).pagination.total, 2);
    assert.equal((await queue("AWAITING_GUIDE_CENTER")).pagination.total, 0);
    console.log(
      "PASS workflow queues: absent/draft evaluation, completion, ready exclusion, reopen and paginated totals.",
    );
    assert.equal(
      (await call("PUT", "", { chief_complaint: "Reavaliado" })).status,
      200,
    );
    assert.equal((await call("PUT", "", { pain_score: 11 })).status, 422);
    assert.equal(
      (
        await db("physiotherapy_evaluations")
          .where({ guide_process_id: processId })
          .first()
      ).pain_score,
      0,
    );
    assert.equal(
      (await db("guide_processes").where({ id: processId }).first())
        .authorization_status,
      "NOT_READY",
    );
    assert.ok(
      (
        await db("guide_process_history").where({
          guide_process_id: processId,
          action: "EVALUATION_REOPENED",
        })
      ).length,
    );
    const [viewerPerson] = await db("people").insert({
      full_name: "Leitor fictício",
    });
    const [viewerId] = await db("users").insert({
      username: "viewer-evaluation",
      person_id: viewerPerson,
      role: "user",
      status: "active",
    });
    await db("user_permissions").insert({
      user_id: viewerId,
      module_key: "guide_processes",
      can_view: true,
    });
    const viewerToken = require(
      path.join(root, "backend/node_modules/jsonwebtoken"),
    ).sign({ id: viewerId, role: "user" }, secret);
    assert.equal(
      (
        await fetch(base + "/options", {
          headers: { Authorization: "Bearer " + viewerToken },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + "/reopen", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + viewerToken,
            "Content-Type": "application/json",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    console.log(
      "PASS isolated MySQL: patient-only treatment, draft, roundtrip, completion, locked editing, audited reopen, validation, no insurance submission.",
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (guideDb) await guideDb.destroy();
    if (pool) await pool.end();
    if (db) await db.destroy();
    if (!/^realmed_verify_evaluation_[0-9]+_[a-f0-9]{6}$/.test(name))
      throw Error("Unsafe test database name");
    await admin.query("DROP DATABASE IF EXISTS ??", [name]);
    await admin.end();
    process.chdir(root);
    const resolved = path.resolve(temp);
    if (
      path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
      !path.basename(resolved).startsWith("realmed-evaluation-")
    )
      throw Error("Unsafe temporary directory");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error("Legacy inventory verification failed:", error.message);
  process.exitCode = 1;
});
