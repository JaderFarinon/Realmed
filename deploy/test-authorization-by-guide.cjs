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
      "20261104000001_soft_delete_guide_processes.js",
      "20261027000012_authorization_appeal.js",
      "20261027000013_authorization_documents.js",
      "20261027000014_guide_continuity.js",
      "20261028000001_physiotherapy_rotation.js",
      "20261028000002_guide_billing.js",
      "20261028000003_authorization_by_guide.js",
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
    const [provider]=await db('insurance_providers').insert({name:'Convenio teste',authorization_type:'PRE_AUTHORIZATION'});
    const [insurance]=await db('patient_insurances').insert({patient_id:patientId,insurance_provider_id:provider,card_number:'000'});
    const [physio]=await db('professionals').insert({full_name:'Fisio teste',type:'PHYSIOTHERAPIST',council:'CREFITO',council_number:'111',state:'PR'});
    const [doctor]=await db('professionals').insert({full_name:'Medico teste',type:'DOCTOR',council:'CRM',council_number:'222',state:'PR'});
    await db('guide_processes').where({id:processId}).update({patient_insurance_id:insurance,physiotherapist_id:physio,requesting_doctor_id:doctor,requested_sessions:10,document_status:'COMPLETE',authorization_status:'READY'});
    await db('physiotherapy_evaluations').insert({guide_process_id:processId,status:'COMPLETED',created_by:actorId,updated_by:actorId});
    const types=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'];
    for(const type of types)await db('guide_process_documents').insert({guide_process_id:processId,document_type:type,file_path:'synthetic.pdf',original_name:type+'.pdf',mime_type:'application/pdf',file_size:5,source:'UPLOADED',document_role:'RECEIVED',is_usable:true,uploaded_by:actorId});
    const state=async()=>(await call('GET',url+'/authorization-guides')).data;
    const change=async(type,status,extra={})=>{const item=(await state()).items.find(i=>i.document_type===type);return call('POST',url+'/authorization/status',{document_type:type,status,expected_status:item.status,revision:item.revision,notes:['DENIED','IN_APPEAL','READY','PENDING'].includes(status)?'Motivo de teste':null,...extra});};
    await db('guide_processes').where({id:processId}).update({workflow_stages:JSON.stringify({reception:{completed_at:'2026-11-06'},documents:{completed_at:'2026-11-06'}})});
    const pendingBatch={status:'IN_PROGRESS',items:(await state()).items.map(i=>({document_type:i.document_type,expected_status:i.status,revision:i.revision}))};
    assert.equal((await call('POST',url+'/authorization/status-together',{...pendingBatch,status:'AUTHORIZED'})).status,409,'Cannot skip sending step');
    assert.equal((await call('POST',url+'/authorization/status-together',{...pendingBatch,items:pendingBatch.items.map((i,n)=>n===1?{...i,revision:999}:i)})).status,409,'All guides roll back after stale second revision');
    assert.ok((await state()).items.every(i=>i.status==='READY'));
    assert.equal((await call('POST',url+'/authorization/status-together',pendingBatch)).status,200,'Pending guides can be sent together');
    for(const status of ['PENDING','IN_PROGRESS']) {
      const body={status,notes:'Conferência conjunta',items:(await state()).items.map(i=>({document_type:i.document_type,expected_status:i.status,revision:i.revision}))};
      assert.equal((await call('POST',url+'/authorization/status-together',body)).status,200);
      assert.ok((await state()).items.every(i=>i.status===status));
    }

    const batchItems=(await state()).items.slice(0,2).map((i,index)=>({document_type:i.document_type,expected_status:i.status,revision:i.revision,authorized_sessions:index?10:1}));
    const batch={items:batchItems,authorization_number:'000123',authorization_date:new Date().toISOString().slice(0,10),expiration_date:'2027-12-31'};
    await db('users').where({id:actorId}).update({role:'user'});
    assert.equal((await call('POST',url+'/authorization/release-together',batch)).status,403);
    assert.equal((await call('POST',url+'/authorization/status-together',{...batch,status:'AUTHORIZED'})).status,403);
    await db('users').where({id:actorId}).update({role:'admin'});
    const beforeHistory=await db('guide_process_history').where({guide_process_id:processId});
    assert.equal((await call('POST',url+'/authorization/release-together',{...batch,items:[batchItems[0],{...batchItems[1],revision:999}]})).status,409);
    assert.equal((await state()).items[0].status,'IN_PROGRESS');
    assert.equal((await db('guide_authorizations').where({guide_process_id:processId})).length,0);
    assert.equal((await db('guide_process_history').where({guide_process_id:processId})).length,beforeHistory.length);
    assert.equal((await call('POST',url+'/authorization/release-together',{...batch,items:[batchItems[0],batchItems[0]]})).status,422);
    assert.equal((await call('POST',url+'/authorization/release-together',{...batch,items:[batchItems[0],{...batchItems[1],authorized_sessions:0}]})).status,422);
    assert.equal((await state()).items[0].status,'IN_PROGRESS');
    assert.equal((await call('POST',url+'/authorization/release-together',batch)).status,200);
    const shared=(await state()).items;assert.equal(shared[0].authorization_number,'000123');assert.equal(shared[1].authorization_number,'000123');assert.equal(shared[0].authorized_sessions,1);assert.equal(shared[1].authorized_sessions,10);assert.equal(shared[2].status,'IN_PROGRESS');
    assert.equal((await call('POST',url+'/authorization/release-together',batch)).status,409);
    let p=await db('guide_processes').where({id:processId}).first();
    assert.equal((await change(types[2],'DENIED')).status,200);
    const result=await state();assert.equal(result.partial,true);assert.equal(result.items[0].status,'AUTHORIZED');assert.equal(result.items[1].status,'AUTHORIZED');assert.equal(result.items[2].status,'DENIED');p=await db('guide_processes').where({id:processId}).first();assert.equal(p.authorization_status,'AUTHORIZED');assert.equal(p.authorized_sessions,10);
    const detail=(await call('GET',url)).data;assert.equal(Number(detail.partial_authorization),1);
    const dashboard=(await call('GET','/dashboard')).data;assert.equal(dashboard.partial,1);assert.equal(dashboard.total,1);
    assert.equal((await call('GET','/guide-processes?authorization_status=DENIED')).data.pagination.total,1);assert.equal((await call('GET','/guide-processes?authorization_status=AUTHORIZED')).data.pagination.total,1);
    const oldPayload={status:'DENIED',expected_status:'AUTHORIZED',notes:'nao pode sobrescrever'};assert.equal((await call('POST',url+'/authorization/status',oldPayload)).status,409);assert.equal((await call('POST',url+'/authorization/start',{})).status,409);
    assert.equal((await call('POST',url+'/authorizations',{status:'DENIED'})).status,409);
    assert.equal((await call('PUT',url,{authorized_sessions:1})).status,409);
    const stale={document_type:types[2],status:'IN_APPEAL',expected_status:'DENIED',revision:0,notes:'stale'};assert.equal((await call('POST',url+'/authorization/status',stale)).status,409);
    assert.equal((await call('POST',url+'/stages/authorization/complete',{})).status,200);
    const consultation=await call('PATCH',url+'/billing/'+types[0],{status:'BILLED',revision:0});assert.equal(consultation.status,200);
    await db('guide_processes').where({id:processId}).update({performed_sessions:10,treatment_status:'COMPLETED'});
    const bill=(await call('GET',url+'/billing')).data.items;assert.equal(bill.find(i=>i.document_type===types[1]).eligible,true);assert.equal(bill.find(i=>i.document_type===types[2]).eligible,false);assert.ok(bill.find(i=>i.document_type===types[2]).status_label.includes('negada'));
    assert.equal((await call('PATCH',url+'/billing/'+types[2],{status:'BILLED',revision:0})).status,422);
    assert.equal((await call('PATCH',url+'/billing/'+types[1],{status:'BILLED',revision:0})).status,200);
    assert.equal((await call('GET','/guide-processes?process_stage=billing')).data.pagination.total,0);
    assert.equal((await call('POST',url+'/stages/authorization/complete',{})).status,200);
    assert.equal((await change(types[2],'IN_APPEAL')).status,409);
    assert.equal((await call('POST',url+'/stages/authorization/reopen',{})).status,200);
    assert.equal((await change(types[2],'IN_APPEAL')).status,200);
    assert.equal((await change(types[2],'AUTHORIZED',{authorized_sessions:10,authorization_number:'003'})).status,200);
    p=await db('guide_processes').where({id:processId}).first();assert.equal(p.authorized_sessions,10);assert.equal((await state()).partial,false);assert.equal((await call('GET','/guide-processes?process_stage=billing')).data.pagination.total,1);
    const allRows=await db('guide_authorizations').where({guide_process_id:processId});assert.equal(allRows.filter(a=>a.document_type===types[0]).length,1);assert.equal(allRows.filter(a=>a.document_type===types[2]).length,2);
    await require(path.join(root,'backend/migrations/20261028000003_authorization_by_guide')).up(db);
    console.log('PASS atomic joint release/rollback/permissions and authorization per guide: consultation and physio approved/electro denied, correct therapy quota, partial queues, blocked legacy writes, revisions, independent billing, finalization/reopen and electro appeal after therapy completion.');
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
  console.error("Authorization per guide verification failed:", error.message);
  process.exitCode = 1;
});
