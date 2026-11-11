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

    const [provider]=await db('insurance_providers').insert({name:'Convênio sintético',authorization_type:'PRE_AUTHORIZATION'});
    const [insurance]=await db('patient_insurances').insert({patient_id:patientId,insurance_provider_id:provider,card_number:'0000'});
    const [physio]=await db('professionals').insert({full_name:'Fisioterapeuta',type:'PHYSIOTHERAPIST',council:'CREFITO',council_number:'000',state:'PR'});
    const [doctor]=await db('professionals').insert({full_name:'Médico',type:'DOCTOR',council:'CRM',council_number:'000',state:'PR'});
    const done={completed_at:'2026-11-11T12:00:00Z',completed_by:actorId};
    const stages={reception:done,central:done,documents:done,authorization:done};
    const procedureTypes=['CONSULTATION','PHYSIOTHERAPY','ELECTROSTIMULATION'];
    const documentTypes=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'];
    const procedureIds=[];
    for(const type of procedureTypes)procedureIds.push((await db('procedures').insert({code:'test-'+type,description:'Teste '+type,type}))[0]);
    const seedRequirements=async(id)=>{
      for(let i=0;i<3;i++){
        await db('guide_process_procedures').insert({guide_process_id:id,procedure_id:procedureIds[i],requested_quantity:10});
        await db('guide_process_documents').insert({guide_process_id:id,document_type:documentTypes[i],file_path:'synthetic-'+id+'-'+i+'.pdf',original_name:'synthetic.pdf',mime_type:'application/pdf',file_size:5,source:'UPLOADED',document_role:'RECEIVED',is_usable:true,uploaded_by:actorId});
      }
      await db.transaction(trx=>require(path.join(root,'backend/services/guideWorkflow')).syncDocumentStatus(trx,id));
    };
    const data={patient_insurance_id:insurance,physiotherapist_id:physio,requesting_doctor_id:doctor,assessment_date:'2026-11-11',requested_sessions:10,authorized_sessions:10,performed_sessions:10,authorization_status:'AUTHORIZED',workflow_stages:JSON.stringify(stages)};
    await db('guide_processes').where({id:processId}).update(data);
    await db('physiotherapy_evaluations').insert({guide_process_id:processId,status:'COMPLETED',chief_complaint:'Avaliação original preservada',body_marks:JSON.stringify([]),created_by:actorId,updated_by:actorId});
    const originalEvaluation=await db('physiotherapy_evaluations').where({guide_process_id:processId}).first();
    await seedRequirements(processId);
    const payload={requested_sessions:20,confirm_end_current:true,require_billing:true};
    assert.equal(Boolean((await call('GET',url)).data.billing_due),true,'Header uses the exact Faturar predicate');
    await db('guide_processes').where({id:processId}).update({workflow_stages:null});
    assert.equal((await call('POST',url+'/continuities',payload)).status,409,'Stale Faturar state is rechecked under lock');
    await db('guide_processes').where({id:processId}).update({workflow_stages:JSON.stringify(stages)});
    await db('guide_process_documents').where({guide_process_id:processId,document_type:'ELECTROSTIMULATION'}).update({deleted_at:db.fn.now()});
    assert.equal(Boolean((await call('GET',url)).data.billing_due),false);
    assert.equal((await call('POST',url+'/continuities',payload)).status,409,'Removed requirement invalidates a stale header action');
    await db('guide_process_documents').where({guide_process_id:processId,document_type:'ELECTROSTIMULATION'}).update({deleted_at:null});
    await db('guide_processes').where({id:processId}).update({deleted_at:db.fn.now()});
    assert.equal((await call('POST',url+'/continuities',payload)).status,409,'Archived treatment cannot continue');
    await db('guide_processes').where({id:processId}).update({deleted_at:null});
    for(const invalid of [{requested_sessions:0},{requested_sessions:true},{confirm_end_current:false}]) assert.equal((await call('POST',url+'/continuities',{...payload,...invalid})).status,422);
    const created=await call('POST',url+'/continuities',payload);
    assert.equal(created.status,201,JSON.stringify(created.data));
    const childId=created.data.id, childUrl='/guide-processes/'+childId;
    let child=(await call('GET',childUrl)).data;
    assert.equal(child.treatment_root_id,processId); assert.equal(child.guide_number,2); assert.equal(child.continuation_of_id,processId);
    assert.equal(child.authorization_status,'READY'); assert.equal(child.requested_sessions,20); assert.equal(child.authorized_sessions,null); assert.equal(child.performed_sessions,0);
    assert.equal(child.documents.length,0); assert.equal(child.authorizations.length,0); assert.equal(child.related_guides.length,2);
    assert.equal(child.procedures.length,0);assert.equal(Boolean(child.billing_due),false);
    const copy=await db('physiotherapy_evaluations').where({guide_process_id:childId}).first();
    assert.equal(copy.chief_complaint,originalEvaluation.chief_complaint); assert.equal(copy.created_by,originalEvaluation.created_by); assert.equal(copy.status,'COMPLETED');
    assert.deepEqual(await db('physiotherapy_evaluations').where({id:originalEvaluation.id}).first(),originalEvaluation);
    await db('physiotherapy_evaluations').where({id:originalEvaluation.id}).update({chief_complaint:'Alteração posterior na origem'});
    assert.equal((await call('GET',childUrl+'/evaluation')).data.chief_complaint,originalEvaluation.chief_complaint,'The snapshot is not replaced by later source edits');
    for(const [method,path] of [['POST','/evaluation'],['POST','/evaluation/complete'],['POST','/evaluation/reopen']]) assert.equal((await call(method,childUrl+path,{})).status,409);
    assert.equal((await call('POST',url+'/continuities',payload)).status,409,'Cannot create a sibling continuation');
    let dashboard=(await call('GET','/dashboard')).data; assert.equal(dashboard.billing,1); assert.equal(dashboard.assessment,1);
    assert.equal((await call('POST',childUrl+'/authorization/status',{status:'IN_PROGRESS',expected_status:'READY'})).status,409,'New cycle requires its own reception and Central');
    assert.equal((await call('POST',childUrl+'/stages/reception/complete',{})).status,200);
    assert.equal((await call('POST',childUrl+'/stages/central/complete',{})).status,422,'Continuity still requires all three procedures and guides');
    await seedRequirements(childId);
    assert.equal((await call('POST',childUrl+'/stages/central/complete',{})).status,200);
    assert.equal((await call('POST',childUrl+'/authorization/status',{status:'IN_PROGRESS',expected_status:'READY'})).status,200,'No new clinical assessment');
    assert.equal((await call('POST',childUrl+'/authorization/status',{status:'AUTHORIZED',expected_status:'IN_PROGRESS',authorized_sessions:20})).status,200);
    assert.equal((await call('POST',childUrl+'/stages/authorization/complete',{})).status,200);
    assert.equal((await call('PUT',childUrl,{performed_sessions:20,treatment_status:'IN_PROGRESS'})).status,200);
    dashboard=(await call('GET','/dashboard')).data; assert.equal(dashboard.billing,2,'Both completed guides remain billable');
    const next=await Promise.all([call('POST',childUrl+'/continuities',{...payload,requested_sessions:15}),call('POST',childUrl+'/continuities',{...payload,requested_sessions:15})]);
    assert.deepEqual(next.map(r=>r.status).sort(),[201,409]);
    const thirdId=next.find(r=>r.status===201).data.id;
    assert.equal((await db('guide_processes').where({id:thirdId}).first()).guide_number,3);
    assert.equal((await db('patients')).length,1,'Same patient preserved');
    assert.equal((await call('GET','/guide-processes/'+thirdId)).data.related_guides.length,3);
    assert.equal((await call('GET','/guide-processes/'+thirdId+'/evaluation')).data.chief_complaint,originalEvaluation.chief_complaint);
    await seedRequirements(thirdId);
    await db('guide_processes').where({id:thirdId}).update({authorization_status:'AUTHORIZED',authorized_sessions:15,performed_sessions:15,workflow_stages:JSON.stringify(stages)});
    const before=await db('guide_processes').where({id:thirdId}).first();
    await db.raw("CREATE TRIGGER fail_continuity_audit BEFORE INSERT ON guide_process_history FOR EACH ROW BEGIN IF NEW.action = 'GUIDE_CONTINUITY_CREATED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Simulated audit failure'; END IF; END");
    assert.equal((await call('POST','/guide-processes/'+thirdId+'/continuities',payload)).status,500);
    await db.raw('DROP TRIGGER fail_continuity_audit');
    assert.deepEqual(await db('guide_processes').where({id:thirdId}).first(),before);
    assert.equal((await db('guide_processes')).length,3,'Atomic rollback of new guide and snapshot');
    const [p2]=await db('people').insert({full_name:'Sem permissão'}); const [u2]=await db('users').insert({person_id:p2,username:'without-permission',role:'user',status:'active'});
    assert.equal((await call('POST','/guide-processes/'+thirdId+'/continuities',payload,jwt.sign({id:u2,role:'user'},secret))).status,403);
    const [legacyId]=await db('guide_processes').insert({...data,patient_id:patientId,created_by:actorId,billing_status:'BILLED'});
    const legacyNew=await call('POST','/guide-processes/'+legacyId+'/continuities',{...payload,require_billing:false});
    assert.equal(legacyNew.status,201,'Legacy patient does not need a new assessment');
    assert.equal((await db('guide_processes').where({id:legacyId}).first()).billing_status,'BILLED','Billed guide never reset');
    await seedRequirements(legacyNew.data.id);
    await db('guide_processes').where({id:legacyNew.data.id}).update({workflow_stages:JSON.stringify({reception:done,central:done,documents:done})});
    assert.equal((await call('POST','/guide-processes/'+legacyNew.data.id+'/authorization/status',{status:'IN_PROGRESS',expected_status:'READY'})).status,200);
    await require(path.join(root,'backend/migrations/20261027000014_guide_continuity')).up(db);
    console.log('PASS continuity: linked guides, preserved evaluation snapshots and original billing, new independent quotas/docs/authorization, clinical read-only, concurrency, rollback, legacy exemption and permission denial.');
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
  console.error("Guide continuity verification failed:", error.message);
  process.exitCode = 1;
});
