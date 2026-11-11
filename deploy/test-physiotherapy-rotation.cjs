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
      "20260916000002_add_stenci_treatment_catalog_ids.js",
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
      workflow_stages: JSON.stringify({reception:{completed_at:new Date().toISOString()}}),
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
    const rotation = require(path.join(root,'backend/services/physiotherapyRotation'));
    const ids=['a'.repeat(24),'b'.repeat(24)], externalIds=['c'.repeat(24),'d'.repeat(24)];
    const sourceProfessionals=externalIds.map((externalId,i)=>({externalId,name:'Fisio teste '+i,active:true,councils:[{name:'CREFITO',record:'123'+i,state:'PR'}]}));
    let availabilityFree=[6,6],calls=0;
    const serviceFactory=()=>({async rotationRead(options){calls++;if(options.kind==='options')return {schedules:ids.map((id,i)=>({id,name:'Agenda teste '+i,place:{id:'matrix',name:'Realmed Matriz'}})),professionals:sourceProfessionals};const r=rotation.normalize(options.request);return {fetchedAt:new Date().toISOString(),snapshots:Object.fromEntries(options.scheduleIds.flatMap((id,i)=>r.sessions.map(s=>[id+':'+s.date,Array.from({length:6},(_,n)=>({startDate:s.date+'T14:0'+n+':00-03:00',status:n<availabilityFree[i]?'available':'occupied'}))])))};}});
    app.use('/api',require(path.join(root,'backend/routes/physiotherapy-rotation')).createRouter({db,serviceFactory,onError:e=>{if(!e.status)console.error("TEST",e.stack)}}));
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
    const request={startDate:'2026-11-02',total:6,days:[{day:'MONDAY',time:'14:00'},{day:'WEDNESDAY',time:'14:00'},{day:'FRIDAY',time:'14:00'}]};
    const configured=await call('PUT','/physiotherapy-rotation/agendas',{mappings:ids.map((schedule_id,i)=>({schedule_id,external_id:externalIds[i]}))});
    assert.equal(configured.status,200,JSON.stringify(configured.data));
    const suggested=await call('POST',url+'/rotation/suggest',request);assert.equal(suggested.status,200,JSON.stringify(suggested.data));assert.equal(suggested.data.candidates[0].sessions.length,6);assert.equal(await db('physiotherapy_rotation_assignments').count('* as n').first().then(x=>Number(x.n)),0);
    assert.equal((await call('POST',url+'/rotation/confirm',{token:suggested.data.token})).status,422);
    const beforeConfirm=calls;
    const confirmed=await call('POST',url+'/rotation/confirm',{token:suggested.data.token,stenci_scheduled_confirmed:true});assert.equal(confirmed.status,200,JSON.stringify(confirmed.data));assert.equal(calls,beforeConfirm);
    const again=await call('POST',url+'/rotation/confirm',{token:suggested.data.token,stenci_scheduled_confirmed:true});assert.equal(again.status,200);assert.equal((await db('physiotherapy_rotation_state').first()).sequence,1);
    const log=await call('GET',url+'/rotation/history');assert.equal(log.status,200);assert.equal(log.data.length,2);assert.equal(log.data[0].stenci_scheduled_confirmed,true);assert.ok(log.data[0].professional_name);
    const [otherId]=await db('guide_processes').insert({patient_id:patientId,created_by:actorId,workflow_stages:JSON.stringify({reception:{completed_at:new Date().toISOString()}})});
    const other=await call('POST','/guide-processes/'+otherId+'/rotation/suggest',request);assert.equal(other.data.candidates[0].professional_id,configured.data.mappings[1].professional_id);
    availabilityFree=[0,0];assert.equal((await call('POST','/guide-processes/'+otherId+'/rotation/confirm',{token:other.data.token,stenci_scheduled_confirmed:true})).status,200);
    assert.equal((await db('physiotherapy_rotation_state').first()).sequence,2);
    availabilityFree=[6,6];
    await db('physiotherapy_evaluations').insert({guide_process_id:processId,status:'IN_PROGRESS',created_by:actorId,updated_by:actorId});
    const assessor=configured.data.mappings[1].professional_id;
    const saved=await call('PUT',url+'/evaluation',{physiotherapist_id:assessor,chief_complaint:'teste'});assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal((await db('guide_processes').where({id:processId}).first()).physiotherapist_id,configured.data.mappings[0].professional_id);assert.equal((await db('physiotherapy_evaluations').where({guide_process_id:processId}).first()).physiotherapist_id,assessor);
    await db('physiotherapy_evaluations').where({guide_process_id:processId}).update({status:'COMPLETED'});assert.equal((await call('POST',url+'/rotation/suggest',request)).status,409);
    const [person2]=await db('people').insert({full_name:'Sem acesso'});const [user2]=await db('users').insert({person_id:person2,username:'denied',role:'user',status:'active'});const denied=jwt.sign({id:user2,role:'user'},secret);assert.equal((await call('POST',url+'/rotation/suggest',request,denied)).status,403);
    const [thirdId]=await db('guide_processes').insert({patient_id:patientId,created_by:actorId,workflow_stages:JSON.stringify({reception:{completed_at:new Date().toISOString()}})});
    const previews=await Promise.all([otherId,thirdId].map(p=>call('POST','/guide-processes/'+p+'/rotation/suggest',request)));
    const confirmations=await Promise.all([otherId,thirdId].map((p,i)=>call('POST','/guide-processes/'+p+'/rotation/confirm',{token:previews[i].data.token,stenci_scheduled_confirmed:true})));
    assert.deepEqual(confirmations.map(r=>r.status).sort(),[200,200]);assert.equal((await db('physiotherapy_rotation_state').first()).sequence,4);
    await require(path.join(root,'backend/migrations/20261028000001_physiotherapy_rotation')).up(db);
    console.log('PASS rotation database: checkbox enforcement, durable history, confirmation after manual booking without reranking, idempotency, executor update, evaluator independence, permissions and transaction serialization.');
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
  console.error("Rotation verification failed:", error.message);
  process.exitCode = 1;
});
