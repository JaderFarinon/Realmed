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
    const workflow=require(path.join(root,'backend/services/guideWorkflow'));
    const types=['CONSULTATION','PHYSIOTHERAPY','ELECTROSTIMULATION'];
    const procedureIds=[];
    for(const type of types)procedureIds.push((await db('procedures').insert({code:'test-'+type,description:'Fictício '+type,type}))[0]);
    const addProc=async(i)=>db('guide_process_procedures').insert({guide_process_id:processId,procedure_id:procedureIds[i],requested_quantity:1});
    for(let i=0;i<3;i++)await addProc(i);
    const [electroDoc]=await db('guide_process_documents').insert({guide_process_id:processId,document_type:'ELECTROSTIMULATION',file_path:'fixture-electro.pdf',original_name:'electro.pdf',mime_type:'application/pdf',file_size:1,source:'GENERATED',document_role:'GENERATED',is_usable:true,uploaded_by:actorId});
    await db('physiotherapy_evaluations').insert({guide_process_id:processId,status:'COMPLETED',created_by:actorId,updated_by:actorId});
    const done={completed_at:'2026-11-10',completed_by:actorId};
    await db('guide_processes').where({id:processId}).update({workflow_stages:JSON.stringify({reception:done})});
    for(let i=0;i<3;i++){
     await db('guide_process_procedures').where({guide_process_id:processId,procedure_id:procedureIds[i]}).del();
     const result=await call('POST',url+'/stages/central/complete');assert.equal(result.status,422,JSON.stringify(result.data));assert.match(result.data.error,/Procedimento/);await addProc(i);
    }
    const docs=await db('guide_process_documents').where({guide_process_id:processId});
    for(const doc of docs){
     await db('guide_process_documents').where({id:doc.id}).update({document_role:'RECEIVED',is_usable:false});
     assert.equal((await call('POST',url+'/stages/central/complete')).status,422);
     await db('guide_process_documents').where({id:doc.id}).update({is_usable:true});
    }
    assert.equal((await call('POST',url+'/stages/central/complete')).status,200);
    await db('guide_processes').where({id:processId}).update({authorization_status:'AUTHORIZED',workflow_stages:JSON.stringify({reception:done,central:done,documents:done,authorization:done}),document_status:'COMPLETE'});
    const due=async()=>(await call('GET','/guide-processes?process_stage=billing')).data.data.map(p=>p.id);
    const checkCounts=async()=>{
      const result=await call('GET','/guide-processes/queue-counts');assert.equal(result.status,200,JSON.stringify(result.data));
      for(const [key,filters] of Object.entries(require(path.join(root,'backend/services/treatmentQueues')).queues)){
        const listed=await call('GET','/guide-processes?'+new URLSearchParams({...filters,pageSize:1}));
        assert.equal(listed.status,200);assert.equal(result.data[key],listed.data.pagination.total,'Counter matches list: '+key);
      }
    };
    await checkCounts();
    assert.ok((await due()).includes(processId));
    const read=()=>call('GET',url+'/billing');
    assert.ok((await read()).data.items.every(i=>i.applicable));
    await db('guide_process_procedures').where({guide_process_id:processId,procedure_id:procedureIds[2]}).del();
    assert.ok(!(await due()).includes(processId));assert.ok((await read()).data.items.every(i=>!i.eligible));
    await checkCounts();
    assert.equal((await call('PATCH',url+'/billing/CONSULTATION_GUIDE',{status:'BILLED',revision:0})).status,422);
    await addProc(2);assert.ok((await due()).includes(processId));
    await db('guide_process_documents').where({id:electroDoc}).update({deleted_at:db.fn.now()});
    assert.ok(!(await due()).includes(processId));
    const migration=require(path.join(root,'backend/migrations/20261110000001_require_three_treatment_guides'));
    await migration.up(db);assert.equal((await db('guide_processes').where({id:processId}).first()).document_status,'INCOMPLETE');assert.equal((await db('guide_processes').where({id:processId}).first()).authorization_status,'AUTHORIZED');
    const auditCount=(await db('guide_process_history').where({guide_process_id:processId,action:'DOCUMENT_REQUIREMENTS_UPDATED'})).length;await migration.up(db);assert.equal((await db('guide_process_history').where({guide_process_id:processId,action:'DOCUMENT_REQUIREMENTS_UPDATED'})).length,auditCount);
    await db('guide_process_documents').where({id:electroDoc}).update({deleted_at:null});
    const applicable=await call('PATCH',url+'/billing/ELECTROSTIMULATION',{status:'PENDING',revision:0,applicable:false});assert.equal(applicable.status,422);
    const authService=require(path.join(root,'backend/services/guideAuthorization'));
    const sql=require(path.join(root,'backend/services/guideAuthorizationSql'));
    const documentTypes=workflow.requiredDocuments;
    for(const type of documentTypes)await db('guide_authorization_items').insert({guide_process_id:processId,document_type:type,status:'AUTHORIZED',is_individual:true,applicable:false});
    for(const status of ['NOT_READY','READY','IN_PROGRESS','PENDING','AUTHORIZED','DENIED','IN_APPEAL','SESSION_TOKEN','NOT_REQUIRED']){
     await db('guide_authorization_items').where({guide_process_id:processId,document_type:'ELECTROSTIMULATION'}).update({status});
     const process=await db('guide_processes').where({id:processId}).first(),items=await authService.list(db,process);
     const row=await db('guide_processes as gp').where('gp.id',processId).select(db.raw(sql.partialSQL+' as partial'),db.raw(sql.statusSQL('ELECTROSTIMULATION')+' as status')).first();
     assert.equal(Boolean(row.partial),authService.partial(items));assert.equal(row.status,items.find(i=>i.document_type==='ELECTROSTIMULATION').status);assert.ok(items.every(i=>i.applicable));
     await checkCounts();
    }
    const [billed]=await db('guide_processes').insert({patient_id:patientId,created_by:actorId,billing_status:'BILLED',document_status:'COMPLETE'});await migration.up(db);assert.equal((await db('guide_processes').where({id:billed}).first()).document_status,'COMPLETE');
    await db('guide_processes').insert({patient_id:patientId,created_by:actorId,deleted_at:db.fn.now()});
    await checkCounts();
    await db('users').where({id:actorId}).update({role:'user'});
    assert.equal((await call('GET','/guide-processes/queue-counts')).status,403,'Counters require view permission');
    console.log('PASS: batch counters match all 11 queues across billing requirements, individual authorization states and deleted treatments; permission enforced.');
    console.log('PASS real MySQL/API: each missing procedure/usable guide blocks central; all three release central; SQL billing queue and eligibility regress on missing procedure/electro PDF; no billing bypass; no opt-out; migration audited/idempotent and preserves authorization.');
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
