// Uses synthetic records in a disposable localhost database, without Stenci calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name));
(async()=>{
 const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env'))),connection={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};assert.ok(['localhost','127.0.0.1','::1'].includes(connection.host));
 const name='realmed_patient_preview_'+Date.now(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'realmed-patient-preview-')),admin=await dep('mysql2/promise').createConnection(connection);let created=false,db,pool,server;
 try{
  await admin.query('CREATE DATABASE ??',[name]);created=true;
  const envPath=path.join(temp,'.env');fs.writeFileSync(envPath,Object.entries({...env,DB_NAME:name,NODE_ENV:'test',JWT_SECRET:'synthetic-preview-test',STENCI_BRANCH_ID:'test-branch',PERMISSIONS_ENABLED:'true'}).map(([k,v])=>k+'='+JSON.stringify(String(v))).join('\n'));process.env.DOTENV_CONFIG_PATH=envPath;
  db=dep('knex')({client:'mysql2',connection:{...connection,database:name}});await db.migrate.latest({directory:path.join(root,'backend/migrations')});pool=require(path.join(root,'backend/db'));
  const [person]=await db('people').insert({full_name:'Equipe Teste'}),[user]=await db('users').insert({username:'patient-preview',person_id:person,role:'user',status:'active'});
  const [patient]=await db('patients').insert({full_name:'Paciente Sintético',external_source:'STENCI',external_id:'patient-a',cpf:'52998224725'}),[other]=await db('patients').insert({full_name:'Outro Paciente',external_source:'STENCI',external_id:'patient-b'});
  const [guide]=await db('guide_processes').insert({patient_id:patient,created_by:user,requested_sessions:10,authorized_sessions:10,performed_sessions:3}),[otherGuide]=await db('guide_processes').insert({patient_id:other,created_by:user});
  await db('physiotherapy_evaluations').insert([{guide_process_id:guide,status:'COMPLETED',chief_complaint:'Avaliação sintética',pain_score:0,responsible_name:'Fisio Teste',evaluation_date:'2026-11-12',created_by:user,updated_by:user},{guide_process_id:otherGuide,status:'COMPLETED',chief_complaint:'OUTRO PACIENTE PRIVADO',created_by:user,updated_by:user}]);
  const appointment={branch_id:'test-branch',external_id:'appointment-a',service_date:'2026-11-13',schedule_id:'schedule-a',schedule_name:'Agenda teste',patient_external_id:'patient-a',patient_name:'Paciente Sintético',start_at:'2026-11-13T10:00:00-03:00',status:'finished',is_evaluation:false,is_session:true,is_physiotherapy:true,expenses:'[]',collected_at:new Date()};
  await db('billing_stenci_appointments').insert([appointment,{...appointment,external_id:'appointment-b',patient_external_id:'patient-b',schedule_name:'OUTRO PACIENTE PRIVADO'},{...appointment,branch_id:'other-branch',schedule_name:'OUTRA UNIDADE PRIVADA'}]);
  await db('billing_collection_days').insert({branch_id:'test-branch',service_date:'2026-11-13',status:'COMPLETE',requested_at:new Date(),last_success_at:new Date()});
  const {readPatientPreview}=require(path.join(root,'backend/services/patientPreview'));
  const view=await readPatientPreview(db,guide,{now:Date.parse('2026-11-13T14:00:00-03:00'),branchId:'test-branch'});
  assert.equal(view.patient.name,'Paciente Sintético');assert.equal(view.evaluation.pain_score,0);assert.equal(view.agenda.history.length,1);assert.equal(view.agenda.history[0].status,'finished');assert.equal(view.capabilities.evolutions,false);assert.equal(view.treatment.performed,3);
  const json=JSON.stringify(view);for(const secret of ['OUTRO PACIENTE','OUTRA UNIDADE','52998224725','patient-a'])assert.ok(!json.includes(secret));
  await db('physiotherapy_evaluations').where({guide_process_id:guide}).update({status:'DRAFT',chief_complaint:'RASCUNHO PRIVADO'});assert.equal((await readPatientPreview(db,guide)).evaluation,null);
  await db('patients').where({id:patient}).update({external_source:'LOCAL'});assert.equal((await readPatientPreview(db,guide)).agenda.linked,false);await db('patients').where({id:patient}).update({external_source:'STENCI'});
  const jwt=dep('jsonwebtoken').sign({id:user,role:'admin'},process.env.JWT_SECRET);const app=dep('express')();app.use('/preview',require(path.join(root,'backend/routes/patient-preview')).createPatientPreviewRouter(db));server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/preview/'+guide;
  const get=token=>fetch(url,{headers:token?{Authorization:'Bearer '+token}:{}});
  assert.equal((await get()).status,401);assert.equal((await get(jwt)).status,403);
  await db('user_permissions').insert({user_id:user,module_key:'guide_processes',can_view:true});const ok=await get(jwt);assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store');assert.equal((await ok.json()).evaluation,null);
  await db('users').where({id:user}).update({status:'inactive'});assert.equal((await get(jwt)).status,401);await db('users').where({id:user}).update({status:'active'});
  await db('guide_processes').where({id:guide}).update({deleted_at:new Date()});assert.equal((await get(jwt)).status,404);
  assert.equal(Number((await db('guide_processes').count({n:'*'}).first()).n),2);assert.equal(Number((await db('treatment_edit_locks').count({n:'*'}).first()).n),0);
  console.log('PASS patient preview API: authenticated/current role, view permission, deleted treatment, exact patient/branch scope, no drafts/internal metadata, local-only patient, no clinical inference, no writes or edit locks.');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(pool)await pool.end();if(db)await db.destroy();if(created)await admin.query('DROP DATABASE ??',[name]);await admin.end();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1});
