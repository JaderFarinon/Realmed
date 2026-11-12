// Synthetic data in an isolated temporary database; no production rows or Stenci calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name));
async function main(){
  const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env'))),connection={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};
  assert.ok(['localhost','127.0.0.1','::1'].includes(connection.host));
  const name='realmed_physio_verify_'+Date.now()+'_'+crypto.randomBytes(3).toString('hex'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'realmed-physio-'));
  const admin=await dep('mysql2/promise').createConnection(connection);let db,pool,server,guideDb,userDb,store;
  try{
    await admin.query('CREATE DATABASE ??',[name]);
    const secret=crypto.randomBytes(32).toString('hex'),settings={...env,DB_NAME:name,JWT_SECRET:secret,NODE_ENV:'test',PERMISSIONS_ENABLED:'true',STENCI_BRANCH_ID:'test-branch'};
    const envPath=path.join(temp,'.env');fs.writeFileSync(envPath,Object.entries(settings).map(([k,v])=>k+'='+JSON.stringify(String(v))).join('\n'),{mode:0o600});process.env.DOTENV_CONFIG_PATH=envPath;
    pool=require(path.join(root,'backend/db'));db=dep('knex')({client:'mysql2',connection:{...connection,database:name}});
    for(const file of ['001_create_people.js','002_create_users.js','20250520000031_create_user_permissions.js','20260916000001_add_stenci_users.js','20260915000002_create_guide_center.js','20261014000001_create_inventory.js','20261020000006_billing_agenda_collection.js','20261020000007_billing_agenda_filters.js','20261028000001_physiotherapy_rotation.js','20261029000001_physiotherapist_face_access.js','20261106000001_add_local_authentication.js','20261111000001_system_notifications.js'])await require(path.join(root,'backend/migrations',file)).up(db);
    const [person]=await db('people').insert({full_name:'Admin fictício A'}),[actor]=await db('users').insert({username:'admin-a',person_id:person,role:'admin',status:'active'});
    const [personB]=await db('people').insert({full_name:'Admin fictício B'}),[actorB]=await db('users').insert({username:'admin-b',person_id:personB,role:'admin',status:'active'});
    const [professionalA]=await db('professionals').insert({full_name:'Fisio A',type:'PHYSIOTHERAPIST',council:'CREFITO',council_number:'TEST-A',state:'PR'});
    const [professionalB]=await db('professionals').insert({full_name:'Fisio B',type:'PHYSIOTHERAPIST',council:'CREFITO',council_number:'TEST-B',state:'PR'});
    const scheduleA='a'.repeat(24),scheduleB='b'.repeat(24);
    await db('physiotherapy_rotation_agendas').insert([{schedule_id:scheduleA,schedule_name:'Agenda A',professional_id:professionalA,place_id:'test-place'},{schedule_id:scheduleB,schedule_name:'Agenda B',professional_id:professionalB,place_id:'test-place'}]);
    const remote=[],configFactory=()=>({branchId:'test-branch'}),serviceFactory=()=>({
      authenticateUser:async(username,password)=>{assert.equal(username,'shared-test');assert.equal(password,'shared-test-password');remote.push('login');return{stenci_user_id:'shared-id'}},
      logout:async()=>{remote.push('logout')},
      physioRead:async op=>{remote.push(op.scheduleId);return{slots:Array.from({length:6},(_,i)=>({startDate:op.date+`T12:0${i}:00Z`})),items:[{id:'today-'+op.scheduleId,patient_id:op.scheduleId===scheduleA?'patient-new':'patient-b',patient_name:op.scheduleId===scheduleA?'Paciente novo A':'Paciente B',startDate:op.date+'T12:05:00Z',status:'scheduled',expenses:[]}]}},
      searchPatients:async()=>({items:[{id:'patient-a',name:'Paciente A'},{id:'patient-b',name:'Paciente B'},{id:'patient-new',name:'Paciente novo A'}],hasMore:false}),
    });
    const shared=require(path.join(root,'backend/services/physioStenciSession')),createShared=shared.createPhysioSession;
    shared.createPhysioSession=options=>createShared({...options,env:{STENCI_FISIO_USERNAME:'shared-test',STENCI_FISIO_PASSWORD:'shared-test-password'},configFactory,serviceFactory});
    const refresh=require(path.join(root,'backend/services/stenciRefreshService')),originalRefresh=refresh.refreshStenci;
    refresh.refreshStenci=options=>originalRefresh({...options,configFactory,serviceFactory});
    const face=require(path.join(root,'backend/services/physiotherapistFaceRecognition'));let faceUser;
    face.enrollmentTemplates=async()=>[Array(1024).fill(1)];face.encryptTemplates=()=>({encrypted_templates:'test-only',iv:'test',auth_tag:'test'});
    face.authenticateFrames=async()=>[Array(1024).fill(1),Array(1024).fill(1)];face.matchDescriptors=async()=>faceUser;
    const express=dep('express'),jwt=dep('jsonwebtoken'),app=express();app.use(express.json());
    const users=require(path.join(root,'backend/routes/usuarios'));userDb=users.knex;app.use('/api/usuarios',users);
    app.use('/api/auth',require(path.join(root,'backend/routes/auth')));
    let accessNow=Date.parse('2026-11-11T12:00:00Z'),accessClockSequence=[];
    require(path.join(root,'backend/services/physioAgenda')).serverNow=()=>accessClockSequence.length?accessClockSequence.shift():accessNow;
    app.use('/api/physio',require(path.join(root,'backend/routes/physiotherapist-mode')));
    app.use('/api/notifications',require(path.join(root,'backend/routes/notifications')).createNotificationsRouter(db));
    app.use((e,_req,res,_next)=>{console.error(e.code||e.name);res.status(e.status||500).json({error:e.message})});
    guideDb=require(path.join(root,'backend/routes/guide-center')).knex;store=require(path.join(root,'backend/services/StenciSessionStore')).stenciSessionStore;
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))}),base='http://127.0.0.1:'+server.address().port+'/api';
    const adminToken=id=>jwt.sign({id,role:'admin'},secret,{expiresIn:'1h'});
    const call=async(method,url,body,token=adminToken(actor),expected=200)=>{
      const response=await fetch(base+url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),data=response.status===204?null:await response.json();
      assert.equal(response.status,expected,`${method} ${url}: ${JSON.stringify(data)}`);return data;
    };
    const payload={nome:'Fisio local A',login:'physio.a',authProvider:'LOCAL',role:'user',status:'active',senha:'test-local-password-123',confirmarSenha:'test-local-password-123'};
    const a=await call('POST','/usuarios',payload,undefined,201),b=await call('POST','/usuarios',{...payload,nome:'Fisio local B',login:'physio.b'},undefined,201);faceUser=a.id;
    await call('PUT',`/usuarios/${a.id}/physiotherapist`,{professionalId:professionalA});await call('PUT',`/usuarios/${b.id}/physiotherapist`,{professionalId:professionalB});
    await call('PUT',`/usuarios/${b.id}/physiotherapist`,{professionalId:professionalA},undefined,409);
    await call('POST',`/usuarios/${a.id}/face`,{images:['synthetic']},undefined,201);
    assert.equal(Number((await db('user_permissions').where({user_id:a.id}).count({n:'*'}).first()).n),0,'No automatic permission grants');
    await call('POST','/auth/login',{username:'physio.a',password:'incorrect'},undefined,401);
    assert.equal((await call('GET','/notifications')).unread,0);
    const login=await call('POST','/auth/login',{username:'physio.a',password:payload.senha});assert.equal(login.user.authProvider,'LOCAL');assert.equal(login.user.physiotherapistId,professionalA);assert.equal(remote.length,0);
    const notices=await call('GET','/notifications');assert.equal(notices.unread,1);assert.match(notices.items[0].message,/Fisio local A/);
    assert.ok(!JSON.stringify(notices).includes(payload.senha));await call('GET','/notifications',undefined,login.token,403);
    await call('POST',`/notifications/${notices.items[0].id}/read`,{},undefined,204);await call('POST',`/notifications/${notices.items[0].id}/read`,{},undefined,204);
    assert.equal((await call('GET','/notifications')).unread,0);assert.equal((await call('GET','/notifications',undefined,adminToken(actorB))).unread,1);
    assert.equal((await call('GET','/physio/me',undefined,login.token)).needsSession,true);
    const access=await call('POST','/physio/session',{},login.token);let token=access.token;
    assert.equal(access.profile.developmentMode,false);assert.equal(jwt.decode(token).authProvider,'LOCAL');assert.ok(jwt.decode(token).exp<=jwt.decode(login.token).exp);
    assert.deepEqual(remote,['login','logout']);const before=remote.length;assert.equal((await call('POST','/physio/session',{},token)).token,undefined);assert.equal(remote.length,before);
    const agenda=await call('GET',`/physio/agenda?date=2026-11-11&professionalId=${professionalB}&scheduleId=${scheduleB}`,undefined,token);
    assert.equal(agenda.items.length,1);assert.equal(agenda.items[0].schedule_id,scheduleA);assert.ok(!remote.includes(scheduleB));assert.deepEqual(remote.slice(-3),['login',scheduleA,'logout']);
    const visit={branch_id:'test-branch',service_date:'2026-11-10',schedule_name:'Agenda A',patient_name:'Paciente A',insurance_name:'Teste',start_at:'2026-11-10T12:00:00Z',status:'finished',is_evaluation:false,is_session:true,expenses:'[]',collected_at:new Date()};
    await db('billing_stenci_appointments').insert([{...visit,external_id:'visit-a',patient_external_id:'patient-a',schedule_id:scheduleA},{...visit,external_id:'visit-b',patient_external_id:'patient-a',schedule_id:scheduleB,schedule_name:'Agenda B'},{...visit,external_id:'visit-b2',patient_external_id:'patient-b',schedule_id:scheduleB,schedule_name:'Agenda B'}]);
    await db('billing_stenci_appointments').insert({...visit,external_id:'visit-shared',patient_external_id:'patient-a',schedule_id:scheduleB,schedule_name:'Agenda B',schedule_memberships:JSON.stringify([{id:scheduleB,name:'Agenda B'},{id:scheduleA,name:'Agenda A'}])});
    const patients=await call('GET','/physio/patients/search?search=Paciente',undefined,token);
    assert.deepEqual(patients.items.map(p=>p.external_id).sort(),['patient-a','patient-new']);assert.deepEqual(patients.items[0].appointments.map(a=>a.schedule),['Agenda A','Agenda A']);
    const production=await call('GET','/physio/production?start=2026-11-01&end=2026-11-30',undefined,token);assert.equal(production.totals.appointments,2);
    assert.equal(agenda.sessions.length,1);assert.equal(agenda.sessions[0].start_time,'09:00');assert.equal(agenda.sessions[0].end_time,'09:45');
    await db('billing_stenci_appointments').insert({...visit,external_id:'private-patient-new',patient_external_id:'patient-new',schedule_id:scheduleB,schedule_name:'Agenda B'});
    const detail=await call('GET',`/physio/agenda/today-${scheduleA}?date=2026-11-11`,undefined,token);
    assert.equal(detail.appointment.patient_id,'patient-new');assert.deepEqual(detail.history,[]);assert.deepEqual(detail.capabilities,{start:false,saveEvolution:false,finish:false});assert.equal(detail.clinicalHistoryAvailable,false);
    assert.equal(detail.server_time,'2026-11-11T12:00:00.000Z');assert.equal(detail.session.end_minute,585);
    accessNow=Date.parse('2026-11-11T11:59:59.999Z');
    const outside=await call('GET',`/physio/agenda/today-${scheduleA}?date=2026-11-11&now=2026-11-11T12:15:00Z&server_time=2026-11-11T12:15:00Z`,undefined,token,409);
    assert.equal(outside.code,'PHYSIO_OUTSIDE_SESSION');assert.equal(outside.appointment,undefined);
    accessNow=Date.parse('2026-11-11T12:45:00Z');await call('GET',`/physio/agenda/today-${scheduleA}?date=2026-11-11`,undefined,token,409);
    accessClockSequence=[Date.parse('2026-11-11T12:44:59.999Z'),Date.parse('2026-11-11T12:45:00Z')];
    await call('GET',`/physio/agenda/today-${scheduleA}?date=2026-11-11`,undefined,token,409);assert.equal(accessClockSequence.length,0,'Revalidate the window after reading history');
    accessNow=Date.parse('2026-11-11T12:00:00Z');
    await call('GET',`/physio/agenda/today-${scheduleA}?date=2026-11-10`,undefined,token,409);
    await call('GET',`/physio/agenda/today-${scheduleA}?date=2026-11-12`,undefined,token,409);
    await call('GET',`/physio/agenda/today-${scheduleB}?date=2026-11-11`,undefined,token,404);
    await call('GET',`/physio/agenda/today-${scheduleA}?date=2026-02-31`,undefined,token,400);
    const challenge=await call('POST','/physio/auth/challenge',{});const facial=await call('POST','/physio/auth/face',{challenge:challenge.id,frames:['synthetic']});assert.equal(jwt.decode(facial.token).authProvider,'LOCAL');assert.equal(Number((await db('system_notifications').count({n:'*'}).first()).n),1,'Facial login does not notify admins');
    store.delete(jwt.decode(token).sid);await call('GET','/physio/agenda?date=2026-11-11',undefined,token,428);
    token=(await call('POST','/physio/session',{},token)).token;await call('GET','/physio/agenda?date=2026-11-11',undefined,token);
    await db('users').where({id:a.id}).update({status:'blocked'});for(const url of ['/physio/me','/physio/agenda?date=2026-11-11','/physio/production?start=2026-11-01&end=2026-11-30'])await call('GET',url,undefined,token,403);
    await db('users').where({id:actorB}).update({role:'user'});await call('GET','/notifications',undefined,adminToken(actorB),403);
    await db('users').where({id:a.id}).update({status:'active'});await db('physiotherapist_user_links').where({user_id:a.id}).delete();await call('GET','/physio/patients/search?search=Paciente',undefined,token,403);
    console.log('PASS isolated MySQL/API: local creation/link/face, password notification, individual read receipts/admin revocation, no grants, shared login/logoff, bound agenda/patients/production, grouped sessions and appointment detail scope, session recovery, blocked/unlinked accounts, no facial notification.');
  }finally{
    if(store)for(const sid of store.sessions.keys())store.delete(sid);
    if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();for(const pool of [db,guideDb,userDb])if(pool)await pool.destroy();
    await admin.query('DROP DATABASE ??',[name]);await admin.end();
    assert.equal(path.dirname(path.resolve(temp)),path.resolve(os.tmpdir()));assert.ok(path.basename(temp).startsWith('realmed-physio-'));fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
