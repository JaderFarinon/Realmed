// Local disposable MySQL; no production writes and no external requests.
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  dep = (name) => require(path.join(root, "backend/node_modules", name));
(async () => {
  const env = dep("dotenv").parse(
      fs.readFileSync(path.join(root, "backend/.env")),
    ),
    connection = {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASS,
    };
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(connection.host));
  const database = "realmed_indicators_verify_" + Date.now(),
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "realmed-indicators-"));
  const admin = await dep("mysql2/promise").createConnection(connection);
  let db,
    pool,
    server,
    created = false;
  try {
    await admin.query("CREATE DATABASE ??", [database]);
    created = true;
    const secret = crypto.randomBytes(32).toString("hex");
    Object.assign(env, {
      DB_NAME: database,
      JWT_SECRET: secret,
      PERMISSIONS_ENABLED: "true",
      NODE_ENV: "test",
    });
    const envPath = path.join(temp, ".env");
    fs.writeFileSync(
      envPath,
      Object.entries(env)
        .map(([k, v]) => k + "=" + JSON.stringify(String(v)))
        .join("\n"),
      { mode: 0o600 },
    );
    process.env.DOTENV_CONFIG_PATH = envPath;
    process.chdir(temp);
    db = dep("knex")({
      client: "mysql2",
      connection: { ...connection, database },
    });
    await db.migrate.latest({
      directory: path.join(root, "backend/migrations"),
    });
    await require(
      path.join(root, "backend/migrations/20261112000003_indicators"),
    ).up(db);
    const [person] = await db("people").insert({ full_name: "Admin teste" }),
      [actor] = await db("users").insert({
        username: "admin-indicators",
        role: "admin",
        status: "active",
        person_id: person,
      });
    const [p2] = await db("people").insert({ full_name: "User teste" }),
      [user] = await db("users").insert({
        username: "user-indicators",
        role: "user",
        status: "active",
        person_id: p2,
      });
    const sync = require(
      path.join(root, "integrations/stenci/StenciPatientSyncService"),
    ).syncPatientFromStenci;
    const synced = await sync(db, {
      id: "p1",
      name: "Paciente fictício",
      birthDate: "1980-10-20",
      gender: "female",
      addresses: [
        {
          city: "Curitiba",
          neighborhood: "Centro",
          state: "PR",
          addressLine1: "Não copiar ao indicador",
        },
      ],
    });
    const patient = synced.patient.id;
    assert.equal(
      (await db("patients").where({ id: patient }).first()).city,
      "Curitiba",
    );
    const [provider] = await db("insurance_providers").insert({
        name: "Convênio teste",
      }),
      [insurance] = await db("patient_insurances").insert({
        patient_id: patient,
        insurance_provider_id: provider,
        card_number: "teste",
      });
    const [treatment] = await db("guide_processes").insert({
      patient_id: patient,
      patient_insurance_id: insurance,
      created_by: actor,
      created_at: "2026-10-10 12:00:00",
    });
    const [procedure] = await db("procedures").insert({
      code: "fixture-only",
      description: "Procedimento fictício",
      type: "PHYSIOTHERAPY",
    });
    await db("guide_process_procedures").insert({
      guide_process_id: treatment,
      procedure_id: procedure,
      requested_quantity: 10,
    });
    await db("guide_billing_items").insert({
      guide_process_id: treatment,
      document_type: "PHYSIOTHERAPY_GUIDE",
      status: "PENDING",
    });
    const row = {
      branch_id: "test-branch",
      external_id: "a1",
      service_date: "2026-10-10",
      schedule_id: "s",
      schedule_name: "Fisio teste",
      patient_external_id: "p1",
      patient_name: "Não deve sair da API",
      insurance_name: "Convênio teste",
      start_at: "2026-10-10 12:00:00",
      status: "finished",
      is_evaluation: 0,
      is_session: 1,
      is_physiotherapy: 1,
      expenses: "[]",
      schedule_memberships: JSON.stringify([
        { id: "s", name: "Fisio teste", place_id: "one", place_name: "Matriz" },
      ]),
      collected_at: new Date(),
    };
    await db("billing_stenci_appointments").insert([
      row,
      {
        ...row,
        external_id: "a2",
        patient_external_id: "p2",
        patient_demographics: JSON.stringify({
          gender: "male",
          birth_date: "1990-01-01",
        }),
      },
      {
        ...row,
        branch_id: "other",
        external_id: "a3",
        patient_external_id: "not-visible",
      },
    ]);
    await db("billing_collection_days").insert({
      branch_id: "test-branch",
      service_date: "2026-10-10",
      status: "COMPLETE",
      requested_at: new Date(),
      last_success_at: new Date(),
    });
    const express = dep("express"),
      jwt = dep("jsonwebtoken"),
      app = express();
    app.use(express.json());
    pool = require(path.join(root, "backend/db"));
    app.use(
      "/api/indicators",
      require(
        path.join(root, "backend/routes/indicators"),
      ).createIndicatorsRouter(db, { branchId: () => "test-branch" }),
    );
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}/api/indicators`;
    async function call(method, url, body, status = 200, who = actor) {
      const response = await fetch(base + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(who
            ? {
                Authorization:
                  "Bearer " + jwt.sign({ id: who, role: "admin" }, secret),
              }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await response.json();
      assert.equal(
        response.status,
        status,
        method + " " + url + ": " + JSON.stringify(data),
      );
      return data;
    }
    const f = {
        start: "2026-10-01",
        end: "2026-10-31",
        area: "epidemiology",
        source: "combined",
        status: "active",
        insurance: "",
        scheduleId: "all",
        placeId: "all",
      },
      query = "?" + new URLSearchParams(f);
    await call("GET", "/catalog", undefined, 401, null);
    await call("GET", "/dashboard" + query, undefined, 403, user);
    await db("user_permissions").insert({
      user_id: user,
      module_key: "indicator_panels",
      can_view: 1,
      can_create: 0,
      can_edit: 0,
      can_delete: 0,
    });
    const result = await call(
      "GET",
      "/dashboard" + query,
      undefined,
      200,
      user,
    );
    assert.equal(result.metrics[0].population, 2);
    assert.equal(result.metrics[0].total, 2);
    assert.equal(result.metrics[0].missing, 0);
    assert.equal(result.metrics.find((m) => m.key === "city").missing, 1);
    assert.equal(JSON.stringify(result).includes("Não deve sair"), false);
    assert.equal(JSON.stringify(result).includes("Não copiar"), false);
    assert.equal(
      (
        await call(
          "GET",
          "/dashboard" + query.replace("epidemiology", "billing"),
        )
      ).metrics[0].total,
      3,
    );
    assert.equal(
      (
        await call(
          "GET",
          "/dashboard" + query.replace("epidemiology", "physio"),
        )
      ).metrics[0].total,
      2,
    );
    await call(
      "POST",
      "/snapshots",
      { indicatorKey: "sex", filters: f },
      403,
      user,
    );
    await db("user_permissions").insert({
      user_id: user,
      module_key: "indicator_analysis",
      can_view: 1,
      can_create: 1,
      can_edit: 0,
      can_delete: 0,
    });
    const before = await call(
      "POST",
      "/snapshots",
      {
        indicatorKey: "sex",
        filters: f,
        rows: [{ label: "forged", value: 999 }],
      },
      201,
      user,
    );
    const current = await call(
      "POST",
      "/snapshots",
      { indicatorKey: "sex", filters: f },
      201,
      user,
    );
    assert.equal(before.metric.total, 2);
    assert.equal(
      before.metric.rows.some((x) => x.label === "forged"),
      false,
    );
    const slide = {
      title: "Perfil",
      indicatorKey: "sex",
      beforeId: before.id,
      nowId: current.id,
      origin: "Origem",
      explanation: "Interpretação",
      direction: "Objetivo",
      actions: "Ações",
      target: "Meta",
      responsible: "Equipe",
      dueDate: "2026-12-10",
    };
    const saved = await call(
      "POST",
      "/presentations",
      { title: "Reunião", slides: [slide] },
      201,
      user,
    );
    assert.equal(saved.slides[0].now.total, 2);
    assert.equal((await call("GET", "/presentations")).total, 1);
    await db("billing_stenci_appointments")
      .where({ branch_id: "test-branch", external_id: "a2" })
      .del();
    assert.equal(
      (await call("GET", "/dashboard" + query)).metrics[0].population,
      1,
    );
    assert.equal(
      (await call("GET", "/presentations/" + saved.id)).slides[0].now.total,
      2,
      "Saved snapshots are immutable",
    );
    await call(
      "PUT",
      "/presentations/" + saved.id,
      { ...saved, title: "Negado" },
      403,
      user,
    );
    await db("user_permissions")
      .where({ user_id: user, module_key: "indicator_analysis" })
      .update({ can_edit: 1 });
    const edited = await call(
      "PUT",
      "/presentations/" + saved.id,
      { ...saved, title: "Reunião revisada" },
      200,
      user,
    );
    assert.equal(edited.revision, 2);
    await call(
      "PUT",
      "/presentations/" + saved.id,
      { ...saved, title: "Obsoleto" },
      409,
      user,
    );
    await call(
      "POST",
      "/presentations",
      { title: "Inválida", slides: [{ ...slide, indicatorKey: "city" }] },
      400,
      user,
    );
    await call(
      "DELETE",
      "/presentations/" + saved.id,
      { revision: 2 },
      403,
      user,
    );
    await call("DELETE", "/presentations/" + saved.id, { revision: 1 }, 409);
    await call("DELETE", "/presentations/" + saved.id, { revision: 2 });
    await call("GET", "/presentations/" + saved.id, undefined, 404);
    assert.equal((await call("GET", "/presentations")).total, 0);
    assert.equal((await db("indicator_presentation_audit")).length, 3);
    await db("user_permissions").where({ user_id: user }).del();
    await call("GET", "/dashboard" + query, undefined, 403, user);
    await db("users").where({ id: user }).update({ status: "blocked" });
    await call("GET", "/catalog", undefined, 401, user);
    console.log(
      "PASS Indicators MySQL/API: migrations, demographics, deduplication, branch isolation, all areas, aggregate-only response, create/view/edit/delete permissions, server snapshots, immutable history, revision conflicts, audit and revoked/blocked access.",
    );
  } finally {
    if (server) await new Promise((r) => server.close(r));
    if (pool) await pool.end();
    if (db) await db.destroy();
    if (created) await admin.query("DROP DATABASE ??", [database]);
    await admin.end();
    process.chdir(root);
    const target = path.resolve(temp);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith("realmed-indicators-"));
    fs.rmSync(target, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
