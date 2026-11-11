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
    const seedDocuments=async process=>{
      const types=process.continuation_of_id?['PHYSIOTHERAPY_GUIDE']:['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE'];
      const ids=[];
      for(const type of types) ids.push((await db('guide_process_documents').insert({guide_process_id:process.id,document_type:type,file_path:'fixture-'+process.id+'-'+type+'.pdf',original_name:type+'.pdf',mime_type:'application/pdf',file_size:1,source:'GENERATED',document_role:'GENERATED',is_usable:true,uploaded_by:actorId}))[0]);
      return ids;
    };
    await seedDocuments({id:processId});
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
    app.use('/api',require(path.join(root,'backend/routes/guide-billing')));
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
    const service=require(path.join(root,'backend/services/guideBilling'));
    const patch=(type,data)=>call('PATCH',url+'/billing/'+type,data);
    const due=async()=>(await call('GET','/guide-processes?process_stage=billing')).data.data.map(x=>x.id);
    assert.deepEqual(await due(),[]);
    assert.equal((await patch('CONSULTATION_GUIDE',{status:'BILLED',revision:0})).status,409);
    await db('physiotherapy_evaluations').insert({guide_process_id:processId,status:'COMPLETED',created_by:actorId,updated_by:actorId});
    const completedStages=JSON.stringify(Object.fromEntries(['reception','central','documents','authorization'].map(stage=>[stage,{completed_at:'2026-11-09T10:00:00Z',completed_by:actorId}])));
    await db('guide_processes').where({id:processId}).update({authorization_status:'AUTHORIZED',document_status:'COMPLETE',workflow_stages:completedStages});
    assert.ok((await due()).includes(processId));
    assert.equal((await call('GET','/guide-processes?billing_status=READY')).data.pagination.total,1);
    let dashboard=(await call('GET','/dashboard')).data;assert.equal(dashboard.authorized,1);assert.equal(dashboard.billing,1);assert.equal(dashboard.total,1);
    const consult=await patch('CONSULTATION_GUIDE',{status:'BILLED',revision:0,notes:'Consulta cobrada'});assert.equal(consult.status,200,JSON.stringify(consult.data));
    assert.equal((await db('guide_processes').where({id:processId}).first()).authorization_status,'AUTHORIZED');
    assert.deepEqual(await due(),[]);assert.equal((await call('GET','/dashboard')).data.authorized,1);
    assert.equal((await patch('PHYSIOTHERAPY_GUIDE',{status:'BILLED',revision:0})).status,422);
    assert.equal((await patch('CONSULTATION_GUIDE',{status:'PENDING',revision:0})).status,409);
    assert.equal((await call('PUT',url,{billing_status:'BILLED'})).status,422);
    const enabled=await patch('ELECTROSTIMULATION',{status:'PENDING',revision:0,applicable:true});assert.equal(enabled.status,200);
    await db('guide_processes').where({id:processId}).update({authorization_status:'AUTHORIZED',authorized_sessions:10,performed_sessions:9});assert.deepEqual(await due(),[]);
    await db('guide_processes').where({id:processId}).update({performed_sessions:10});assert.deepEqual(await due(),[processId]);
    const physio=await patch('PHYSIOTHERAPY_GUIDE',{status:'BILLED',revision:0});assert.equal(physio.status,200);assert.deepEqual(await due(),[processId]);
    const electro=await patch('ELECTROSTIMULATION',{status:'BILLED',revision:1,applicable:true});assert.equal(electro.status,200);assert.deepEqual(await due(),[]);assert.equal(electro.data.complete,true);
    assert.equal((await db('guide_processes').where({id:processId}).first()).billing_status,'BILLED');
    const reopened=await patch('CONSULTATION_GUIDE',{status:'PENDING',revision:1});assert.equal(reopened.status,200);assert.deepEqual(await due(),[processId]);
    const [child]=await db('guide_processes').insert({patient_id:patientId,created_by:actorId,treatment_root_id:processId,continuation_of_id:processId,guide_number:2,authorization_status:'READY',workflow_stages:completedStages});
    const family=await call('GET','/guide-processes/'+child+'/billing');assert.equal(family.status,200);assert.equal(family.data.items.length,6);assert.equal(family.data.items.find(i=>i.guide_process_id===child&&i.document_type==='CONSULTATION_GUIDE').applicable,false);
    const [person2]=await db('people').insert({full_name:'Somente leitura'});const [user2]=await db('users').insert({person_id:person2,username:'bill-reader',role:'user',status:'active'});const denied=jwt.sign({id:user2,role:'user'},secret);assert.equal((await call('GET',url+'/billing',undefined,denied)).status,403);assert.equal((await call('PATCH',url+'/billing/CONSULTATION_GUIDE',{status:'BILLED',revision:2},denied)).status,403);
    await db('user_permissions').insert([{user_id:user2,module_key:'guide_processes',can_view:true},{user_id:user2,module_key:'guide_billing',can_view:true}]);
    assert.equal((await call('GET',url+'/billing',undefined,denied)).status,200);assert.equal((await call('PATCH',url+'/billing/CONSULTATION_GUIDE',{status:'BILLED',revision:2},denied)).status,403);
    assert.equal(await db('guide_process_history').where({guide_process_id:processId,action:'GUIDE_BILLING_UPDATED'}).count('* as n').first().then(x=>Number(x.n)),5);
    await require(path.join(root,'backend/migrations/20261028000002_guide_billing')).up(db);assert.equal((await service.single(db,await db('guide_processes').where({id:processId}).first())).find(i=>i.document_type==='CONSULTATION_GUIDE').status,'PENDING');
    // Real mutation sequence: a previously eligible cycle loses its prerequisites.
    const [regression]=await db('guide_processes').insert({patient_id:patientId,created_by:actorId,authorization_status:'AUTHORIZED',document_status:'COMPLETE',treatment_status:'COMPLETED',workflow_stages:completedStages});
    await db('physiotherapy_evaluations').insert({guide_process_id:regression,status:'COMPLETED',created_by:actorId,updated_by:actorId});
    let documentIds=await seedDocuments({id:regression});
    await db('guide_billing_items').insert({guide_process_id:regression,document_type:'CONSULTATION_GUIDE',status:'BILLED'});
    const inBilling=async()=>assert.ok((await due()).includes(regression));
    const outsideBilling=async(stage)=>{
      assert.ok(!(await due()).includes(regression),'Must leave Faturar');
      assert.ok(!(await call('GET','/guide-processes?billing_status=READY&pageSize=100')).data.data.some(p=>p.id===regression));
      const summary=await call('GET','/dashboard');assert.equal(summary.data.billing,(await due()).length,'Dashboard and queue agree');
      if(stage)assert.ok((await call('GET','/guide-processes?process_stage='+stage+'&pageSize=100')).data.data.some(p=>p.id===regression));
      if(['preparation','assessment'].includes(stage))assert.ok((await call('GET','/guide-processes?workflow_queue='+(stage==='preparation'?'AWAITING_GUIDE_CENTER':'AWAITING_EVALUATION')+'&pageSize=100')).data.data.some(p=>p.id===regression),'Return to the correct operational queue');
      const items=await service.single(db,await db('guide_processes').where({id:regression}).first());
      assert.ok(items.every(i=>!i.eligible));assert.equal(items.find(i=>i.document_type==='CONSULTATION_GUIDE').status,'BILLED','Preserve billing history');
    };
    await inBilling();
    assert.equal((await call('POST',`/guide-processes/${regression}/stages/authorization/reopen`,{})).status,200);await outsideBilling('authorized');
    assert.equal((await call('POST',`/guide-processes/${regression}/stages/central/reopen`,{})).status,200);await outsideBilling('preparation');
    assert.equal((await call('DELETE','/documents/'+documentIds[1])).status,204);await outsideBilling('preparation');
    await db('guide_process_documents').where({id:documentIds[1]}).update({deleted_at:null});
    await db.transaction(trx=>require(path.join(root,'backend/services/guideWorkflow')).syncDocumentStatus(trx,regression));
    assert.equal((await call('POST',`/guide-processes/${regression}/stages/central/complete`,{})).status,200);await outsideBilling();
    assert.equal((await call('POST',`/guide-processes/${regression}/stages/authorization/complete`,{})).status,200);await inBilling();
    for(const field of ['reception','documents','authorization']){
      const incomplete=JSON.parse(completedStages);delete incomplete[field];
      await db('guide_processes').where({id:regression}).update({workflow_stages:JSON.stringify(incomplete)});await outsideBilling();
    }
    await db('guide_processes').where({id:regression}).update({workflow_stages:completedStages});
    await db('physiotherapy_evaluations').where({guide_process_id:regression}).update({status:'DRAFT'});await outsideBilling('assessment');
    await db('physiotherapy_evaluations').where({guide_process_id:regression}).update({status:'COMPLETED'});
    await db('guide_process_documents').where({id:documentIds[1]}).update({deleted_at:db.fn.now()});await outsideBilling('preparation');
    await db('guide_process_documents').where({id:documentIds[1]}).update({deleted_at:null});await inBilling();
    await db('guide_process_documents').where({id:documentIds[1]}).update({source:'UPLOADED',document_role:'RECEIVED',is_usable:false});await outsideBilling('preparation');
    await db('guide_process_documents').where({id:documentIds[1]}).update({is_usable:true});await inBilling();
    const [optional]=await db('guide_process_documents').insert({guide_process_id:regression,document_type:'OTHER',file_path:'optional.pdf',original_name:'optional.pdf',mime_type:'application/pdf',file_size:1,source:'UPLOADED',uploaded_by:actorId});
    await db('guide_process_documents').where({id:optional}).update({deleted_at:db.fn.now()});await inBilling();
    const continuation=await db('guide_processes').where({id:child}).first();await seedDocuments(continuation);
    await db('guide_processes').where({id:child}).update({authorization_status:'AUTHORIZED',treatment_status:'COMPLETED'});
    assert.ok((await due()).includes(child),'Continuation has no new evaluation or consultation requirement');
    console.log('PASS regression: reopening stages/deleting required documents/reopening evaluation removes billing immediately; queue, dashboard and per-guide eligibility agree; restoring prerequisites returns billing; optional deletion, billed history and continuations preserved.');
    console.log('PASS guide billing: simultaneous queues, early consultation billing, later physio/electro, preserved authorization, revisions, reopened billing, cycles, permissions and idempotent migration.');
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
  console.error("Guide billing verification failed:", error.message);
  process.exitCode = 1;
});
