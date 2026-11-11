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

    const change=(status,expected_status,extra={},authToken=token)=>call('POST',url+'/authorization/status',{status,expected_status,...extra},authToken);
    assert.equal((await change('IN_PROGRESS','NOT_READY')).status,409);
    const [provider]=await db('insurance_providers').insert({name:'Convênio fictício',authorization_type:'PRE_AUTHORIZATION'});
    const [insurance]=await db('patient_insurances').insert({patient_id:patientId,insurance_provider_id:provider,card_number:'0000'});
    const [physio]=await db('professionals').insert({full_name:'Fisioterapeuta fictício',type:'PHYSIOTHERAPIST',council:'CREFITO',council_number:'000',state:'PR'});
    const [doctor]=await db('professionals').insert({full_name:'Médico fictício',type:'DOCTOR',council:'CRM',council_number:'000',state:'PR'});
    await db('guide_processes').where({id:processId}).update({patient_insurance_id:insurance,physiotherapist_id:physio,requesting_doctor_id:doctor,requested_sessions:10,authorization_status:'READY',document_status:'COMPLETE'});
    assert.equal((await change('IN_PROGRESS','READY')).status,422,'Cannot bypass actual document requirements');
    for(const type of ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE']) await db('guide_process_documents').insert({guide_process_id:processId,document_type:type,file_path:'synthetic.pdf',original_name:'synthetic.pdf',mime_type:'application/pdf',file_size:5,source:'UPLOADED',document_role:'RECEIVED',is_usable:true,uploaded_by:actorId});
    assert.equal((await change('IN_PROGRESS','READY')).status,422,'Clinical evaluation required');
    await db('physiotherapy_evaluations').insert({guide_process_id:processId,status:'COMPLETED',created_by:actorId,updated_by:actorId});
    assert.equal((await change('IN_APPEAL','READY',{notes:'Tentativa inválida'})).status,409);
    const sends=await Promise.all([change('IN_PROGRESS','READY'),change('IN_PROGRESS','READY')]);
    assert.deepEqual(sends.map(r=>r.status).sort(),[200,409]);
    const pdf=await require(path.join(root,'backend/node_modules/pdf-lib')).PDFDocument.create();
    pdf.addPage().drawText('Authorization attachment synthetic test');
    const pdfBytes=Buffer.from(await pdf.save());
    const uploadPdf=async(name='liberacao.pdf',bytes=pdfBytes,mime='application/pdf',authToken=token)=>{
      const r=await fetch(base+url+'/authorization-documents',{method:'POST',headers:{Authorization:'Bearer '+authToken,'Content-Type':mime,'X-File-Name':encodeURIComponent(name)},body:bytes});
      return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():null};
    };
    assert.equal((await uploadPdf('invalid.pdf',Buffer.from('%PDF-invalid'))).status,400);
    assert.equal((await uploadPdf('invalid.png')).status,400);
    assert.equal((await uploadPdf('invalid.pdf',pdfBytes,'image/png')).status,400);
    const oversized=await uploadPdf('large.pdf',Buffer.alloc(10*1024*1024+1));
    assert.equal(oversized.status,413);
    assert.match(oversized.data.error,/10 MB/);
    const firstAttachment=await uploadPdf('liberação do convênio.pdf');
    assert.equal(firstAttachment.status,201);
    assert.equal((await uploadPdf('segunda via.pdf')).status,201);
    const attachments=(await call('GET',url)).data.authorization_documents;
    assert.equal(attachments.length,2);
    assert.equal(attachments[1].original_name,'liberação do convênio.pdf');
    assert.equal(attachments[1].uploaded_by,actorId);
    assert.equal(attachments[1].uploaded_by_name,'Administrador fictício');
    const attachmentUrl=url+'/authorization-documents/'+firstAttachment.data.id+'/download';
    const pdfDownload=await fetch(base+attachmentUrl,{headers:{Authorization:'Bearer '+token}});
    assert.equal(pdfDownload.status,200);
    assert.equal(pdfDownload.headers.get('content-type'),'application/pdf');
    assert.deepEqual(Buffer.from(await pdfDownload.arrayBuffer()),pdfBytes,'Original PDF bytes preserved');
    assert.equal((await fetch(base+'/guide-processes/999999/authorization-documents/'+firstAttachment.data.id+'/download',{headers:{Authorization:'Bearer '+token}})).status,404);
    assert.equal((await db('guide_processes').where({id:processId}).first()).authorization_status,'IN_PROGRESS','Attachment does not change authorization');
    assert.equal((await db('guide_process_documents').where({guide_process_id:processId})).length,2,'Mandatory guides preserved');
    const storage=path.join(root,'storage/documents');
    const countFiles=()=>fs.readdirSync(storage).filter(n=>n.startsWith('authorization-')).length;
    const fileCount=countFiles();
    await db.raw("CREATE TRIGGER fail_auth_document_audit BEFORE INSERT ON guide_process_history FOR EACH ROW BEGIN IF NEW.action = 'AUTHORIZATION_DOCUMENT_ATTACHED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Simulated audit failure'; END IF; END");
    assert.equal((await uploadPdf('rollback.pdf')).status,500);
    await db.raw('DROP TRIGGER fail_auth_document_audit');
    assert.equal(countFiles(),fileCount,'Rollback removes newly written file');
    assert.equal((await db('guide_authorization_documents').where({guide_process_id:processId})).length,2);
    assert.equal((await change('PENDING','IN_PROGRESS')).status,422);
    assert.equal((await change('PENDING','IN_PROGRESS',{notes:'Ajustar documento'})).status,200);
    assert.equal((await change('AUTHORIZED','PENDING',{authorized_sessions:10})).status,409);
    assert.equal((await change('IN_PROGRESS','PENDING',{notes:'Documentação corrigida'})).status,200);
    assert.equal((await db('guide_process_pending_items').where({guide_process_id:processId,status:'OPEN'})).length,0);
    await db('guide_processes').where({id:processId}).update({created_at:'2026-10-20 23:50:00'});
    await db('guide_process_history').where({guide_process_id:processId,new_value:'IN_PROGRESS'}).update({created_at:'2026-10-25 00:10:00'});
    await db('guide_process_history').insert({guide_process_id:processId,user_id:actorId,action:'PENDING_ITEM_RESOLVED',field:'authorization_status',old_value:'PENDING',new_value:'IN_PROGRESS',created_at:'2026-10-27 12:00:00'});
    assert.equal((await call('GET',url)).data.authorization_min_date,'2026-10-25');
    await db('guide_processes').where({id:processId}).update({created_at:'2026-10-26 00:10:00'});
    assert.equal((await call('GET',url)).data.authorization_min_date,'2026-10-26');
    await db('guide_processes').where({id:processId}).update({created_at:'2026-10-20 23:50:00'});
    for (const authorization_date of ['2026-10-19','2026-10-24','2026-02-30']) {
      assert.equal((await change('AUTHORIZED','IN_PROGRESS',{authorized_sessions:10,authorization_date})).status,422);
      assert.equal((await call('POST',url+'/authorizations',{status:'AUTHORIZED',authorized_sessions:10,authorization_date})).status,422);
    }
    assert.equal(Number((await db('guide_authorizations').where({guide_process_id:processId}).count('* as n').first()).n),0,'Rejected dates do not write decisions');
    assert.equal((await change('AUTHORIZED','IN_PROGRESS',{authorized_sessions:0})).status,422);
    assert.equal((await change('DENIED','IN_PROGRESS',{notes:'Negativa de autorização',authorization_date:'2026-10-25',expiration_date:'2026-11-25'})).status,200);
    const savedDates=(await call('GET',url)).data.authorizations[0];
    assert.equal(savedDates.authorization_date,'2026-10-25','Authorization DATE must round-trip as calendar date');
    assert.equal(savedDates.expiration_date,'2026-11-25','Expiry DATE must round-trip as calendar date');
    const denial=await db('guide_authorizations').where({guide_process_id:processId}).first();
    assert.equal(denial.status,'DENIED');
    assert.equal((await change('IN_APPEAL','DENIED')).status,422);
    assert.equal((await change('IN_APPEAL','DENIED',{notes:'Contestação protocolada no convênio'})).status,200);
    assert.equal((await db('guide_authorizations').where({id:denial.id}).first()).status,'DENIED','Original decision preserved');
    assert.equal((await call('POST',url+'/stages/authorization/complete',{})).status,422,'Appeal does not finalize authorization');
    assert.equal((await change('AUTHORIZED','IN_APPEAL',{authorized_sessions:10})).status,200);
    const versions=await db('guide_authorizations').where({guide_process_id:processId}).orderBy('id');
    assert.deepEqual(versions.map(r=>r.status),['DENIED','AUTHORIZED']);
    const latest=versions.at(-1);
    assert.equal((await change('AUTHORIZED','AUTHORIZED',{authorized_sessions:8,expected_authorization_id:denial.id})).status,409);
    assert.equal((await change('AUTHORIZED','AUTHORIZED',{authorized_sessions:8,expected_authorization_id:latest.id})).status,200);
    assert.equal((await db('guide_authorizations').where({id:latest.id}).first()).authorized_sessions,10,'Editing creates a new decision version');
    await db('guide_processes').where({id:processId}).update({workflow_stages:JSON.stringify({authorization:{completed_at:new Date().toISOString(),completed_by:actorId}})});
    assert.equal((await change('DENIED','AUTHORIZED',{notes:'Não deve alterar'})).status,409);
    assert.equal((await uploadPdf()).status,409,'Closed authorization prevents attachments');
    assert.equal((await fetch(base+attachmentUrl,{headers:{Authorization:'Bearer '+token}})).status,200,'Closed stage still allows reading attachments');
    await db('guide_processes').where({id:processId}).update({workflow_stages:null,treatment_status:'IN_PROGRESS'});
    assert.equal((await change('READY','AUTHORIZED',{notes:'Não deve regredir'})).status,409);
    await db('guide_processes').where({id:processId}).update({treatment_status:'WAITING'});
    assert.equal((await change('READY','AUTHORIZED',{notes:'Revisão da solicitação'})).status,200);
    assert.equal((await db('guide_processes').where({id:processId}).first()).authorized_sessions,null);
    const [person2]=await db('people').insert({full_name:'Usuário sem permissão'});
    const [user2]=await db('users').insert({person_id:person2,username:'no-permission',role:'user',status:'active'});
    const deniedToken=jwt.sign({id:user2,role:'user'},secret);
    assert.equal((await change('IN_PROGRESS','READY',{},deniedToken)).status,403);
    assert.equal((await uploadPdf('forbidden.pdf',pdfBytes,'application/pdf',deniedToken)).status,403);
    assert.equal((await fetch(base+attachmentUrl,{headers:{Authorization:'Bearer '+deniedToken}})).status,403);
    const before=await db('guide_processes').where({id:processId}).first();
    const auditsBefore=Number((await db('guide_process_history').where({guide_process_id:processId}).count('* as n').first()).n);
    const service=require(path.join(root,'backend/services/authorizationWorkflow'));
    await assert.rejects(db.transaction(async trx=>{await service.changeStatus(trx,processId,actorId,{status:'IN_PROGRESS',expected_status:'READY'});throw Error('Simulated commit failure');}));
    assert.equal((await db('guide_processes').where({id:processId}).first()).authorization_status,before.authorization_status);
    assert.equal(Number((await db('guide_process_history').where({guide_process_id:processId}).count('* as n').first()).n),auditsBefore);
    await require(path.join(root,'backend/migrations/20261027000012_authorization_appeal')).up(db);
    assert.equal((await db('guide_authorizations').where({id:denial.id}).first()).status,'DENIED');
    await require(path.join(root,'backend/migrations/20261027000013_authorization_documents')).up(db);
    assert.equal((await db('guide_authorization_documents').where({guide_process_id:processId})).length,2);
    console.log('PASS isolated MySQL: PDF attachments/validation/permissions/closed-stage/read/original bytes/atomic cleanup, enum migration, authorization prerequisites, denial/appeal/release, immutable decision versions, stale/concurrent updates, pending resolution, stage locks, permission denial and transaction rollback.');
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
  console.error("Authorization workflow verification failed:", error.message);
  process.exitCode = 1;
});
