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
      "20261014000001_create_inventory.js",
      "20261019000002_legacy_inventory_import.js",
      "20261027000010_treatment_stage_completion.js",
      "20261027000012_authorization_appeal.js",
      "20261027000013_authorization_documents.js",
      "20261027000014_guide_continuity.js",
      "20261028000001_physiotherapy_rotation.js",
      "20261028000002_guide_billing.js",
      "20261028000003_authorization_by_guide.js",
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

    const service=require(path.join(root,'backend/services/guideDashboard'));
    const expected=Object.fromEntries(service.stages.map(stage=>[stage.key,[]]));
    expected.assessment.push(processId);
    async function add(stage,fields={},evaluated=false,pendingConsult=false) {
      evaluated ||= stage!=='assessment';
      const completed={completed_at:'2026-11-09T10:00:00Z',completed_by:actorId},state={};
      if(stage!=='assessment')state.reception=completed;
      if(!['assessment','preparation'].includes(stage))state.central=state.documents=completed;
      if(['billing','treatment'].includes(stage))state.authorization=completed;
      const [recordId]=await db('guide_processes').insert({patient_id:patientId,created_by:actorId,...(stage==='billing'?{authorization_status:'AUTHORIZED'}:{}),...fields,workflow_stages:JSON.stringify(state)});
      if(evaluated) await db('physiotherapy_evaluations').insert({guide_process_id:recordId,status:'COMPLETED',created_by:actorId,updated_by:actorId});
      if(state.documents)for(const type of ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE'])await db('guide_process_documents').insert({guide_process_id:recordId,document_type:type,file_path:'fixture-'+recordId+'-'+type+'.pdf',original_name:type+'.pdf',mime_type:'application/pdf',file_size:1,source:'GENERATED',document_role:'GENERATED',is_usable:true,uploaded_by:actorId});
      if(!pendingConsult)await db('guide_billing_items').insert({guide_process_id:recordId,document_type:'CONSULTATION_GUIDE',status:'BILLED'});
      else {state.authorization=completed;await db('guide_processes').where({id:recordId}).update({workflow_stages:JSON.stringify(state)});}
      if(stage) expected[stage].push(recordId);
      if(pendingConsult && stage!=='billing') expected.billing.push(recordId);
      return recordId;
    }
    await add('assessment',{authorization_status:'READY'});
    await add('preparation',{},true);
    await add('ready',{authorization_status:'READY'},true);
    await add('authorizing',{authorization_status:'IN_PROGRESS'});
    await add('pending',{authorization_status:'PENDING'});
    await add('denied',{authorization_status:'DENIED'});
    await add('appeals',{authorization_status:'IN_APPEAL'});
    for(const status of ['AUTHORIZED','SESSION_TOKEN','NOT_REQUIRED']) await add('authorized',{authorization_status:status});
    await add('treatment',{authorization_status:'AUTHORIZED',treatment_status:'IN_PROGRESS',authorized_sessions:10,performed_sessions:9});
    await add('treatment',{authorization_status:'AUTHORIZED',treatment_status:'IN_PROGRESS',authorized_sessions:null,performed_sessions:10});
    await add('billing',{treatment_status:'COMPLETED',billing_status:'READY'});
    await add('billing',{treatment_status:'COMPLETED',billing_status:'NOT_READY'});
    for(const status of ['AUTHORIZED','SESSION_TOKEN','NOT_REQUIRED']) await add('billing',{authorization_status:status,authorized_sessions:10,performed_sessions:10});
    await add('billing',{authorization_status:'AUTHORIZED',treatment_status:'IN_PROGRESS',authorized_sessions:10,performed_sessions:11});
    await add('authorized',{authorization_status:'AUTHORIZED',authorized_sessions:0,performed_sessions:0});
    await add('authorized',{authorization_status:'AUTHORIZED',authorized_sessions:null,performed_sessions:12,requested_sessions:10});
    await add('denied',{authorization_status:'DENIED',authorized_sessions:10,performed_sessions:10});
    await add(null,{authorization_status:'AUTHORIZED',treatment_status:'COMPLETED',billing_status:'BILLED'});
    await add(null,{authorization_status:'AUTHORIZED',treatment_status:'IN_PROGRESS',authorized_sessions:10,performed_sessions:10,billing_status:'DELIVERED'});
    await add('authorized',{authorization_status:'AUTHORIZED',authorized_sessions:10,performed_sessions:0},true,true);
    const result=await call('GET','/dashboard');
    assert.equal(result.status,200);
    assert.equal(result.data.stages.at(-1).label,'Faturar');
    assert.equal(result.data.stages.length,11);
    const seen=[];
    for(const stage of result.data.stages) {
      assert.equal(stage.value,expected[stage.key].length,stage.key+' chart count');
      assert.equal(result.data[stage.key],stage.value,stage.key+' card count');
      const list=await call('GET','/guide-processes?process_stage='+stage.key+'&pageSize=100');
      assert.equal(list.status,200);
      assert.equal(list.data.pagination.total,stage.value,stage.key+' list count matches');
      assert.deepEqual(list.data.data.map(row=>row.id).sort((a,b)=>a-b),expected[stage.key].sort((a,b)=>a-b),stage.key+' exact process set');
      seen.push(...list.data.data.map(row=>row.id));
    }
    assert.equal(result.data.total,new Set(seen).size,'Unique total does not double count overlapping billing');
    assert.equal((await call('GET','/guide-processes?process_stage=invalid')).status,422);
    const [person2]=await db('people').insert({full_name:'Usuário sem permissão'});
    const [user2]=await db('users').insert({person_id:person2,username:'no-permission',role:'user',status:'active'});
    const deniedToken=jwt.sign({id:user2,role:'user'},secret);
    assert.equal((await call('GET','/dashboard',undefined,deniedToken)).status,403);
    console.log('PASS isolated MySQL: ten exclusive process stages, completion and authorized-session billing readiness, zero/null quantity guards, delivered/billed exclusion, exact drill-down queues, invalid filters and permissions.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (guideDb) await guideDb.destroy();
    if (pool) await pool.end();
    if (db) {
      if (await db.schema.hasTable('guide_authorization_documents')) {
        for (const doc of await db('guide_authorization_documents')) {
          if (!/^authorization-[a-f0-9-]{36}\.pdf$/.test(doc.file_path)) throw Error('Unsafe test attachment path');
          fs.rmSync(path.join(root,'storage/documents',doc.file_path),{force:true});
        }
      }
      await db.destroy();
    }
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
  console.error("Guide dashboard verification failed:", error.message);
  process.exitCode = 1;
});
