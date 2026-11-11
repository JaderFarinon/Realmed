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
      "20261027000010_treatment_stage_completion.js",
      "20261104000001_soft_delete_guide_processes.js",
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
    app.use('/api',require(path.join(root,'backend/routes/guide-operations')));
    app.use('/api',require(path.join(root,'backend/routes/document-generation')));
    guideDb = require(path.join(root, "backend/routes/guide-center")).knex;
    pool = require(path.join(root, "backend/db"));
    server = await new Promise((resolve) => {
      const running = app.listen(0, "127.0.0.1", () => resolve(running));
    });
    const jwt=require(path.join(root,'backend/node_modules/jsonwebtoken'));
    const token=jwt.sign({id:actorId,role:'admin'},secret);
    const base='http://127.0.0.1:'+server.address().port+'/api';
    const call=async(method,url,data,authToken=token)=>{
      const r=await fetch(base+url,{method,headers:{Authorization:'Bearer '+authToken,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
      return {status:r.status,data:r.status===204?null:await r.json()};
    };
    const url='/guide-processes/'+processId;
    const stage=(name,action='complete',authToken=token)=>call('POST',url+'/stages/'+name+'/'+action,{},authToken);
    assert.equal((await stage('bogus')).status,400);
    await require(path.join(root,'backend/migrations/20261027000010_treatment_stage_completion.js')).up(db);
    await db('guide_processes').where({id:processId}).update({assessment_date:'2026-10-27',notes:'original'});
    const stages=require(path.join(root,'backend/services/treatmentStages'));
    for(const next of ['central','documents','authorization','treatment']) assert.equal((await stage(next)).status,409,next+' locked before reception');
    assert.equal((await stage('reception')).status,200);
    assert.equal((await stage('central')).status,409,'Evaluation is mandatory before Central');
    assert.equal((await call('PUT',url,{notes:'forbidden'})).status,409);
    assert.equal((await call('POST',url+'/procedures',{procedure_id:1,requested_quantity:1})).status,409);
    assert.equal((await call('POST',url+'/evaluation',{evaluation_date:'2026-11-06',requested_sessions:10})).status,201,'Evaluation may sync shared fields before Central unlocks');
    await db('physiotherapy_evaluations').where({guide_process_id:processId}).update({status:'COMPLETED',completed_at:new Date()});
    assert.equal((await call('PUT',url,{notes:'allowed'})).status,200);
    assert.equal((await stage('central')).status,422,'Merged Central requires documents');
    assert.equal((await stage('authorization')).status,409);
    const documentIds=[];
    for(const type of ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE']) {
      const [docId]=await db('guide_process_documents').insert({guide_process_id:processId,document_type:type,file_path:'synthetic-not-a-file.pdf',original_name:'synthetic.pdf',mime_type:'application/pdf',file_size:5,source:'UPLOADED',document_role:'RECEIVED',is_usable:true,uploaded_by:actorId});
      documentIds.push(docId);
    }
    const completions=await Promise.all([stage('central'),stage('documents')]);
    assert.ok(completions.every(result=>result.status===200),'Both compatible endpoints complete the same stage');
    let current=await db('guide_processes').where({id:processId}).first();
    assert.ok(stages.state(current).central.completed_at);
    assert.equal(stages.state(current).central.completed_at,stages.state(current).documents.completed_at);
    assert.equal((await db('guide_process_history').where({guide_process_id:processId,action:'STAGE_COMPLETED'})).length,2,'One reception and one unified completion');
    assert.equal((await call('POST',url+'/evaluation/reopen',{})).status,409,'Cannot reopen evaluation under finalized Central');
    assert.equal((await call('PUT',url,{notes:'forbidden'})).status,409);
    assert.equal((await call('PATCH','/documents/'+documentIds[0]+'/usability',{is_usable:false})).status,409);
    assert.equal((await call('DELETE','/documents/'+documentIds[0])).status,409);
    assert.equal((await call('POST',url+'/documents/generate',{template_id:1})).status,409);
    assert.equal((await stage('authorization')).status,422);
    await db('guide_processes').where({id:processId}).update({authorization_status:'AUTHORIZED'});
    assert.equal((await stage('authorization')).status,200);
    assert.equal((await stage('central','reopen')).status,409,'Must reopen downstream first');
    assert.equal((await stage('treatment')).status,200);
    assert.equal((await call('PUT',url,{performed_sessions:1})).status,409);
    assert.equal((await stage('treatment','reopen')).status,200);
    assert.equal((await stage('authorization','reopen')).status,200);
    assert.equal((await stage('central','reopen')).status,200);
    current=await db('guide_processes').where({id:processId}).first();
    assert.equal(stages.state(current).central,undefined);
    assert.equal(stages.state(current).documents,undefined);
    assert.equal((await call('PATCH','/documents/'+documentIds[0]+'/usability',{is_usable:true})).status,200);
    assert.equal((await call('PUT',url,{notes:'reopened'})).status,200);
    assert.equal((await call('POST',url+'/evaluation/reopen',{})).status,200);
    assert.equal((await call('PUT',url,{notes:'blocked again'})).status,409);
    const [viewerPerson]=await db('people').insert({full_name:'Leitor fictício'});
    const [viewerId]=await db('users').insert({username:'stage-viewer',person_id:viewerPerson,role:'user',status:'active'});
    await db('user_permissions').insert({user_id:viewerId,module_key:'guide_processes',can_view:true});
    const viewer=jwt.sign({id:viewerId,role:'user'},secret);
    assert.equal((await stage('reception','reopen',viewer)).status,403);
    assert.equal((await call('GET',url)).status,200);
    assert.ok((await db('guide_process_history').where({guide_process_id:processId,action:'STAGE_REOPENED'})).every(row=>row.user_id===actorId));
    assert.equal(current.treatment_status,'WAITING','Visual stages do not finish sessions');
    console.log('PASS sequential merged stages: prerequisites, evaluation sync, required documents, atomic/idempotent aliases, closed mutations, reopen dependencies, permissions and preserved data.');
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
  console.error("Treatment stage verification failed:", error.message);
  process.exitCode = 1;
});
