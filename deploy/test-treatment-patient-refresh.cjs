// Uses only a disposable local database; never updates the Realmed database.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const dependency = (name) =>
  require(path.join(root, "backend/node_modules", name));
async function main() {
  const env = dependency("dotenv").parse(
    fs.readFileSync(path.join(root, "backend/.env")),
  );
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(env.DB_HOST),
    "Local database required",
  );
  const connection = {
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASS,
  };
  const name = `realmed_users_verify_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const admin = await dependency("mysql2/promise").createConnection(connection);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "realmed-users-"));
  let db,
    server,
    pool,
    created = false;
  const routers = [];
  try {
    await admin.query("CREATE DATABASE ??", [name]);
    created = true;
    const secret = crypto.randomBytes(32).toString("hex");
    Object.assign(env, {
      DB_NAME: name,
      JWT_SECRET: secret,
      PERMISSIONS_ENABLED: "true",
      NODE_ENV: "test",
    });
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
    db = dependency("knex")({
      client: "mysql2",
      connection: { ...connection, database: name },
    });
    for (const file of [
      "001_create_people.js",
      "002_create_users.js",
      "20250520000031_create_user_permissions.js",
      "20260916000001_add_stenci_users.js",
    ])
      await require(path.join(root, "backend/migrations", file)).up(db);
    await db.schema.createTable("patients", (t) => {
      t.increments("id");
      for (const k of [
        "external_source",
        "external_id",
        "full_name",
        "cpf",
        "phone",
        "email",
        "gender",
        "cellphone",
      ])
        t.string(k);
      t.date("birth_date");
    });
    await db.schema.createTable("insurance_providers", (t) => {
      t.increments("id");
      for (const k of ["external_source", "external_id", "name"]) t.string(k);
      t.boolean("active");
    });
    await db.schema.createTable("patient_insurances", (t) => {
      t.increments("id");
      t.integer("patient_id");
      t.integer("insurance_provider_id");
      for (const k of ["card_number", "plan", "plan_external_id"]) t.string(k);
      t.date("card_expiration");
      t.boolean("active");
    });
    await db.schema.createTable("guide_processes", (t) => {
      t.increments("id");
      t.integer("patient_id");
      t.integer("patient_insurance_id");
      t.integer("requested_sessions");
      t.string("authorization_status");
      t.string("notes");
      t.timestamp("updated_at");
    });
    await db.schema.createTable("physiotherapy_evaluations", (t) => {
      t.increments("id");
      t.integer("guide_process_id");
      t.text("content");
      t.string("status");
    });
    await db.schema.createTable("guide_process_documents", (t) => {
      t.increments("id");
      t.integer("guide_process_id");
      t.string("file_path");
      t.integer("document_version");
    });
    await db.schema.createTable("guide_process_history", (t) => {
      t.increments("id");
      t.integer("guide_process_id");
      t.integer("user_id");
      for (const k of ["action", "field", "old_value", "new_value"])
        t.string(k);
      t.text("metadata");
    });
    await db.schema.createTable("integration_logs", (t) => {
      t.increments("id");
      for (const k of ["integration", "operation", "status", "error_message"])
        t.string(k);
      t.timestamp("started_at").nullable();
      t.timestamp("finished_at").nullable();
      t.integer("records_processed");
      t.text("metadata");
    });
    const [person] = await db("people").insert({
      full_name: "Synthetic editor",
    });
    const [actor] = await db("users").insert({
      username: "editor",
      person_id: person,
      role: "user",
      status: "active",
    });
    const [denied] = await db("users").insert({
      username: "denied",
      person_id: person,
      role: "user",
      status: "active",
    });
    await db("user_permissions").insert({
      user_id: actor,
      module_key: "guide_processes",
      can_view: true,
      can_edit: true,
      can_create: false,
    });
    const [patientId] = await db("patients").insert({
      external_source: "STENCI",
      external_id: "external-patient",
      full_name: "Before",
      cpf: "01234567890",
    });
    const [providerId] = await db("insurance_providers").insert({
      external_source: "STENCI",
      external_id: "insurance-a",
      name: "Insurer A",
      active: true,
    });
    const [linkId] = await db("patient_insurances").insert({
      patient_id: patientId,
      insurance_provider_id: providerId,
      card_number: null,
      active: true,
    });
    const [treatmentId] = await db("guide_processes").insert({
      patient_id: patientId,
      patient_insurance_id: linkId,
      requested_sessions: 20,
      authorization_status: "AUTHORIZED",
      notes: "Keep clinical/operational notes",
    });
    await db("physiotherapy_evaluations").insert({
      guide_process_id: treatmentId,
      content: "Keep clinical content",
      status: "COMPLETED",
    });
    await db("guide_process_documents").insert({
      guide_process_id: treatmentId,
      file_path: "preserved-original.pdf",
      document_version: 3,
    });
    let raw = {
      id: "external-patient",
      name: "After",
      identity: { type: "cpf", value: "01234567890" },
      birthDate: "1989-05-23",
      cellphone: "41999999999",
      gender: "female",
      patient: {
        insurance: {
          id: "insurance-a",
          name: "Insurer A",
          record: "CARD-NEW",
          planId: "plan-a",
          plan: { id: "plan-a", name: "Plan A" },
          validity: "2027-01-01",
        },
      },
    };
    let auths = 0,
      logouts = 0,
      failLogout = false,
      wrong = false;
    const { StenciSessionStore } = require(
      path.join(root, "backend/services/StenciSessionStore"),
    );
    const store = new StenciSessionStore();
    const sid = store.create({
      mode: "detached",
      stenciUserId: "external-editor",
      cache: new Map(),
    });
    store.setCredentials(sid, {
      username: "fake-user",
      password: "fake-password",
    });
    const { createStenciRouter, knex: stenciDb } = require(
      path.join(root, "backend/routes/stenci"),
    );
    routers.push({ knex: stenciDb });
    const router = createStenciRouter({
      db,
      sessionStore: store,
      configFactory: () => ({ branchId: "fake-branch" }),
      serviceFactory: () => ({
        authenticateUser: async () => {
          auths++;
          return { stenci_user_id: "external-editor" };
        },
        searchPatients: async () => ({
          items: wrong ? [{ ...raw, id: "homonym" }] : [raw],
          hasMore: false,
        }),
        logout: async () => {
          logouts++;
          if (failLogout) throw Error("Simulated logout failure");
        },
      }),
    });
    const express = dependency("express"),
      jwt = dependency("jsonwebtoken");
    const app = express();
    app.use(express.json());
    app.use("/api/integrations/stenci", router);
    pool = require(path.join(root, "backend/db"));
    routers.push({
      knex: require(path.join(root, "backend/routes/guide-center")).knex,
    });
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}/api/integrations/stenci/treatments/${treatmentId}/refresh-patient`;
    async function request(status = 200, as = actor) {
      const res = await fetch(base, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt.sign({ id: as, sid }, secret)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patient: { id: "forged", name: "Forged" } }),
      });
      const result = await res.json();
      assert.equal(res.status, status, JSON.stringify(result));
      return result;
    }
    await request(403, denied);
    assert.equal(auths, 0);
    const result = await request();
    assert.equal(result.patient.id, patientId);
    assert.equal(result.patient.full_name, "After");
    assert.equal(result.patient.gender, "female");
    assert.equal(result.patient.cellphone, "41999999999");
    assert.equal(auths, 1);
    assert.equal(logouts, 1);
    assert.equal(
      (await db("patient_insurances").where({ id: linkId }).first())
        .card_number,
      "CARD-NEW",
    );
    let currentTreatment = await db("guide_processes")
      .where({ id: treatmentId })
      .first();
    assert.equal(currentTreatment.patient_insurance_id, linkId);
    assert.equal(currentTreatment.requested_sessions, 20);
    assert.equal(currentTreatment.authorization_status, "AUTHORIZED");
    assert.equal(currentTreatment.notes, "Keep clinical/operational notes");
    assert.equal(
      (await db("physiotherapy_evaluations").first()).content,
      "Keep clinical content",
    );
    assert.equal(
      (await db("guide_process_documents").first()).document_version,
      3,
    );
    assert.equal((await db("guide_processes")).length, 1);
    raw.name = "Fresh again";
    await request();
    assert.equal(auths, 2);
    assert.equal((await db("patients").first()).full_name, "Fresh again");
    raw.name = "Must not apply";
    failLogout = true;
    await request(502);
    assert.equal((await db("patients").first()).full_name, "Fresh again");
    failLogout = false;
    wrong = true;
    await request(404);
    assert.equal((await db("patients")).length, 1);
    wrong = false;
    raw.patient.insurance = {
      id: "insurance-b",
      name: "Insurer B",
      record: "CARD-B",
    };
    assert.equal((await request()).insurancePreserved, true);
    assert.equal(
      (await db("guide_processes").first()).patient_insurance_id,
      linkId,
    );
    await db("guide_processes")
      .where({ id: treatmentId })
      .update({ patient_insurance_id: null });
    await request();
    assert.notEqual(
      (await db("guide_processes").first()).patient_insurance_id,
      linkId,
    );
    store.clearCredentials(sid);
    const missing = await request(428);
    assert.equal(missing.code, "STENCI_REFRESH_REQUIRED");
    assert.equal(missing.stenciOperation.name, "searchPatients");
    assert.equal(
      (
        await db("guide_process_history").where({
          action: "PATIENT_STENCI_REFRESHED",
        })
      ).length,
      4,
    );
    console.log(
      "PASS: edit-only permission, server-side fresh lookup, exact patient identity, demographic/card refresh, no new treatment, preserved clinical data and originals, insurer conflict, logout failure rollback and credential recovery",
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const router of routers) await router.knex.destroy();
    if (pool) await pool.end();
    if (db) await db.destroy();
    if (created && /^realmed_users_verify_\d+_[a-f0-9]{6}$/.test(name))
      await admin.query("DROP DATABASE ??", [name]);
    await admin.end();
    process.chdir(root);
    if (!path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep))
      throw new Error("Unexpected temporary directory");
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error({
    code: error.code || error.name,
    message: error.code?.startsWith("ER_")
      ? "Database verification failed"
      : error.message,
  });
  process.exitCode = 1;
});
