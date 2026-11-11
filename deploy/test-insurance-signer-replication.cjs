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
    await db.schema.createTable("insurance_providers", (t) => {
      t.increments("id");
      t.string("name");
    });
    await require(
      path.join(root, "backend/migrations/20261021000008_insurance_signers.js"),
    ).up(db);
    await require(path.join(root,'backend/migrations/20261021000009_insurance_signer_placement.js')).up(db);
    const [person] = await db("people").insert({
      full_name: "Synthetic admin",
    });
    const [actor] = await db("users").insert({
      username: "synthetic-admin",
      person_id: person,
      role: "admin",
      status: "active",
    });
    const [user] = await db("users").insert({
      username: "synthetic-user",
      person_id: person,
      role: "user",
      status: "active",
    });
    const [provider] = await db("insurance_providers").insert({
      name: "Synthetic insurer",
    });
    const express = dependency("express"),
      jwt = dependency("jsonwebtoken");
    require(
      path.join(root, "backend/services/documentGenerationService"),
    ).roots.signatures = path.join(temp, "signatures");
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      require(path.join(root, "backend/routes/document-generation")),
    );
    routers.push({
      knex: require(path.join(root, "backend/routes/guide-center")).knex,
    });
    pool = require(path.join(root, "backend/db"));
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}/api/insurance-providers/${provider}/signer`;
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2WQAAAAASUVORK5CYII=",
      "base64",
    );
    async function request(
      method,
      body,
      name = "Synthetic Doctor",
      as = actor,
      mime = "image/png",
    ) {
      return fetch(base, {
        method,
        headers: {
          Authorization: `Bearer ${jwt.sign({ id: as }, secret)}`,
          "Content-Type": mime,
          "X-File-Name": "assinatura.png",
          "X-Doctor-Name": encodeURIComponent(name),
          "X-Signature-Placement": encodeURIComponent(JSON.stringify({templateKey:'SADT_STANDARD_V1',page:1,x:40,y:550,width:240,height:40})),
        },
        ...(body ? { body } : {}),
      });
    }
    assert.equal(await (await request("GET")).json(), null);
    assert.equal(
      (await request("POST", png, "Synthetic Doctor", user)).status,
      403,
    );
    assert.equal((await request("POST", Buffer.from("invalid"))).status, 400);
    assert.equal((await request("POST", png, "")).status, 400);
    assert.equal((await request("POST", png)).status, 201);
    assert.equal(
      (await (await request("GET")).json()).doctor_name,
      "Synthetic Doctor",
    );
    const image = await fetch(base + "/image", {
      headers: { Authorization: `Bearer ${jwt.sign({ id: actor }, secret)}` },
    });
    assert.equal(image.status, 200);
    assert.ok(Buffer.from(await image.arrayBuffer()).equals(png));
    assert.equal(
      (await request("POST", png, "Replacement Doctor")).status,
      201,
    );
    const rows = await db("insurance_provider_signatures").orderBy("id");
    assert.equal(rows.length, 2);
    assert.equal(Number(rows[0].active), 0);
    assert.equal(Number(rows[1].active), 1);
    assert.equal(rows[1].created_by, actor);
    const metadata=await (await request('GET')).json();
    assert.deepEqual(metadata.placement,{templateKey:'SADT_STANDARD_V1',page:1,x:40,y:550,width:240,height:40});
    assert.equal((await db("insurance_providers")).length, 1);
    const targets=[];
    for(const n of ['Destino A','Destino B','Destino C','Sem assinatura']) {
      const [providerId]=await db('insurance_providers').insert({name:n}); targets.push(providerId);
    }
    const rootSignatures=path.join(temp,'signatures');
    const sourceMetadata=await (await request('GET')).json();
    const input={source_id:provider,source_signer_id:sourceMetadata.id,destination_ids:targets.slice(0,2),overwrite_existing:false};
    const copy=async(body,as=actor)=>fetch(base.replace(/\/\d+\/signer$/,'/replicate-signer'),{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({id:as},secret),'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await copy(input,user)).status,403);
    assert.equal((await copy({...input,destination_ids:[provider]})).status,422);
    assert.equal((await copy({...input,destination_ids:[targets[0],99999]})).status,422);
    assert.equal((await copy({...input,source_id:targets[3]})).status,422);
    const response=await copy(input); assert.equal(response.status,200); assert.equal((await response.json()).copied,2);
    const sourceRow=await db('insurance_provider_signatures').where({id:sourceMetadata.id}).first();
    const active=await db('insurance_provider_signatures').whereIn('insurance_provider_id',targets.slice(0,2)).where({active:true});
    assert.equal(active.length,2);
    for(const row of active) {
      assert.equal(row.doctor_name,sourceRow.doctor_name);
      assert.equal(row.created_by,actor);
      assert.deepEqual(JSON.parse(row.placement),JSON.parse(sourceRow.placement));
      assert.notEqual(row.file_path,sourceRow.file_path);
      assert.ok(fs.readFileSync(path.join(rootSignatures,row.file_path)).equals(png));
    }
    assert.notEqual(active[0].file_path,active[1].file_path);
    const preserved=await copy({...input,destination_ids:[targets[0],targets[2]]});
    const report=await preserved.json(); assert.equal(report.copied,1);assert.equal(report.preserved,1);
    const replacement=await copy({...input,destination_ids:[targets[0]],overwrite_existing:true}); assert.equal(replacement.status,200);
    const versions=await db('insurance_provider_signatures').where({insurance_provider_id:targets[0]}).orderBy('id');
    assert.equal(versions.length,2);assert.equal(Number(versions[0].active),0);assert.equal(Number(versions[1].active),1);
    assert.ok(fs.existsSync(path.join(rootSignatures,versions[0].file_path)));
    assert.equal((await copy({...input,source_signer_id:rows[0].id})).status,409);
    const rowsBefore=await db('insurance_provider_signatures').orderBy('id'), filesBefore=fs.readdirSync(rootSignatures).sort();
    await assert.rejects(require(path.join(root,'backend/services/insuranceSignerReplication')).replicate({transaction:callback=>db.transaction(async trx=>{await callback(trx);throw Error('simulated commit failure')})},{...input,overwrite_existing:true},actor,rootSignatures),/simulated commit failure/);
    assert.deepEqual(await db('insurance_provider_signatures').orderBy('id'),rowsBefore);
    assert.deepEqual(fs.readdirSync(rootSignatures).sort(),filesBefore);
    const nullPosition=await fetch(base,{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({id:actor},secret),'Content-Type':'image/png','X-File-Name':'assinatura.png','X-Doctor-Name':'No placement','X-Signature-Placement':encodeURIComponent('null')},body:png});
    assert.equal(nullPosition.status,201);
    const newest=await (await request('GET')).json();
    assert.equal((await copy({...input,source_signer_id:newest.id,destination_ids:[targets[2]],overwrite_existing:true})).status,200);
    const targetNull=await db('insurance_provider_signatures').where({insurance_provider_id:targets[2],active:true}).first();
    assert.equal(JSON.parse(targetNull.placement),null);
    const sourceImage=await fetch(base+'/image',{headers:{Authorization:'Bearer '+jwt.sign({id:actor},secret)}});
    assert.ok(Buffer.from(await sourceImage.arrayBuffer()).equals(png));
    console.log('PASS replication: independent PNGs and versions, name/placement/null placement, default preservation, explicit replacement, stale source, permission checks and full rollback with file cleanup.');
    console.log(
      "PASS: signer name/PNG roundtrip, permissions, invalid image/name rejection, active replacement preserves previous version and uploader",
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
