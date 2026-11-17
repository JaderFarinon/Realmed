// Synthetic fixtures in a disposable localhost database. No Stenci calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name));
(async()=>{
 const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env'))),connection={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};assert.ok(['localhost','127.0.0.1','::1'].includes(connection.host));
 const name='realmed_patient_portal_'+Date.now(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'realmed-patient-portal-')),admin=await dep('mysql2/promise').createConnection(connection);let created=false,db,pool,server;
 try{
  await admin.query('CREATE DATABASE ??',[name]);created=true;
  const envPath=path.join(temp,'.env');fs.writeFileSync(envPath,Object.entries({...env,DB_NAME:name,NODE_ENV:'test',JWT_SECRET:'synthetic-portal-test',STENCI_BRANCH_ID:'test-branch',PERMISSIONS_ENABLED:'true'}).map(([k,v])=>k+'='+JSON.stringify(String(v))).join('\n'));process.env.DOTENV_CONFIG_PATH=envPath;
  db=dep('knex')({client:'mysql2',connection:{...connection,database:name}});await db.migrate.latest({directory:path.join(root,'backend/migrations')});pool=require(path.join(root,'backend/db'));
  const [person]=await db('people').insert({full_name:'Equipe Teste'}),[user]=await db('users').insert({username:'patient-portal',person_id:person,role:'user',status:'active'});
  const [patient]=await db('patients').insert({full_name:'Paciente Sintético',external_source:'STENCI',external_id:'patient-a'}),[other]=await db('patients').insert({full_name:'Outro Paciente',external_source:'STENCI',external_id:'patient-b'});
  const [guide]=await db('guide_processes').insert({patient_id:patient,created_by:user}),[continuation]=await db('guide_processes').insert({patient_id:patient,created_by:user,continuation_of_id:guide,treatment_root_id:guide,guide_number:2}),[otherGuide]=await db('guide_processes').insert({patient_id:other,created_by:user});
  await db('physiotherapy_evaluations').insert([{guide_process_id:guide,status:'COMPLETED',chief_complaint:'Avaliação sintética',created_by:user,updated_by:user},{guide_process_id:continuation,status:'DRAFT',chief_complaint:'DRAFT PRIVATE',created_by:user,updated_by:user},{guide_process_id:otherGuide,status:'COMPLETED',chief_complaint:'OTHER PRIVATE',created_by:user,updated_by:user}]);
  const {patientAccess,patientPortal}=require(path.join(root,'backend/services/patientPortal'));
  const links=await Promise.all([patientAccess(db,guide,user),patientAccess(db,continuation,user),patientAccess(db,guide,user)]);
  assert.equal(new Set(links.map(v=>v.path)).size,1,'Stable per patient across cycles/concurrency');
  const code=links[0].path.split('/').pop();assert.equal(code.length,43);assert.equal(Number((await db('patient_portal_access').count({n:'*'}).first()).n),1);
  const persisted=await db('patient_portal_access').first();assert.ok(!JSON.stringify(persisted).includes(code));
  assert.equal(Number((await db('guide_process_history').where({action:'PATIENT_PORTAL_ACCESS_CREATED'}).count({n:'*'}).first()).n),1);
  const view=await patientPortal(db,code);assert.equal(view.treatment.id,continuation);assert.equal(view.evaluation,null);assert.equal(view.treatments.length,2);assert.equal(view.preview,false);
  assert.equal((await patientPortal(db,code,guide)).evaluation.chief_complaint,'Avaliação sintética');
  await assert.rejects(patientPortal(db,code,otherGuide),e=>e.status===404);await assert.rejects(patientPortal(db,'bad'),e=>e.status===404);
  assert.notEqual((await patientAccess(db,otherGuide,user)).path,links[0].path);
  const app=dep('express')();app.use(dep('express').json());const routers=require(path.join(root,'backend/routes/patient-portal')).createPatientPortal(db);app.use('/private',routers.privateRouter);app.use('/public',routers.publicRouter);server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port,jwt=dep('jsonwebtoken').sign({id:user,role:'admin'},process.env.JWT_SECRET);
  const post=(url,body={},token)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  assert.equal((await post('/private/treatments/'+guide+'/access')).status,401);assert.equal((await post('/private/treatments/'+guide+'/access',{},jwt)).status,403);
  await db('user_permissions').insert({user_id:user,module_key:'guide_processes',can_view:true});assert.equal((await post('/private/treatments/'+guide+'/access',{},jwt)).status,200);
  const publicResult=await post('/public/view',{code});assert.equal(publicResult.status,200);assert.equal(publicResult.headers.get('cache-control'),'no-store');assert.equal(publicResult.headers.get('referrer-policy'),'no-referrer');assert.equal((await publicResult.json()).patient.name,'Paciente Sintético');
  assert.equal((await post('/public/view',{code,treatmentId:otherGuide})).status,404);assert.equal((await post('/public/view',{},jwt)).status,404);
  await db('guide_processes').where({id:continuation}).update({deleted_at:new Date()});assert.equal((await patientPortal(db,code)).treatment.id,guide);await assert.rejects(patientPortal(db,code,continuation),e=>e.status===404);
  await db('patient_portal_access').where({patient_id:patient}).update({revoked_at:new Date()});assert.equal((await post('/public/view',{code})).status,404);await assert.rejects(patientAccess(db,guide,user),e=>e.status===410);
  assert.equal(Number((await db('treatment_edit_locks').count({n:'*'}).first()).n),0);assert.equal(Number((await db('guide_processes').count({n:'*'}).first()).n),3);
  console.log('PASS patient app: same stable link across concurrent requests/continuations, encrypted at rest, audit without code, anonymous access, exact patient scope, draft/deletion/revocation, view permission/current role, no clinical writes or edit locks.');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(pool)await pool.end();if(db)await db.destroy();if(created)await admin.query('DROP DATABASE ??',[name]);await admin.end();assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep+'realmed-patient-portal-'));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1});
