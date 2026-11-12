// Disposable local MySQL database. No production rows or external calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name));
(async()=>{
 const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env')));
 const connection={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};assert.ok(['localhost','127.0.0.1','::1'].includes(connection.host));
 const database='realmed_events_verify_'+Date.now()+'_'+crypto.randomBytes(3).toString('hex'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'realmed-events-'));
 const admin=await dep('mysql2/promise').createConnection(connection);let db,pool,server,permissions,created=false;
 try{
  await admin.query('CREATE DATABASE ??',[database]);created=true;
  const secret=crypto.randomBytes(32).toString('hex');Object.assign(env,{DB_NAME:database,JWT_SECRET:secret,PERMISSIONS_ENABLED:'true',NODE_ENV:'test'});
  const envPath=path.join(temp,'.env');fs.writeFileSync(envPath,Object.entries(env).map(([k,v])=>k+'='+JSON.stringify(String(v))).join('\n'),{mode:0o600});process.env.DOTENV_CONFIG_PATH=envPath;process.chdir(temp);
  db=dep('knex')({client:'mysql2',connection:{...connection,database}});
  for(const file of ['001_create_people.js','002_create_users.js','20250520000031_create_user_permissions.js','20260916000001_add_stenci_users.js','20261014000001_create_inventory.js','20261112000001_event_confirmations.js','20261112000002_events.js'])await require(path.join(root,'backend/migrations',file)).up(db);
  const [person]=await db('people').insert({full_name:'Administrador de teste'}),[actor]=await db('users').insert({username:'admin-events',role:'admin',status:'active',person_id:person});
  const [person2]=await db('people').insert({full_name:'Pessoa de teste'}),[user]=await db('users').insert({username:'user-events',role:'user',status:'active',person_id:person2});
  const legacy={event_slug:'realmed-2026',submission_key:crypto.randomUUID(),payload_hash:'legacy',participant_name:'Ana de teste',companion_names:JSON.stringify(['Acompanhante Um','Acompanhante Dois']),companion_count:2,created_at:'2026-11-12 12:00:00'};
  await db('event_confirmations').insert([legacy,{...legacy,submission_key:crypto.randomUUID(),participant_name:'Bia de teste',companion_names:'[]',companion_count:0},{...legacy,event_slug:'other-event',submission_key:crypto.randomUUID(),participant_name:'Não pode aparecer'}]);
  const express=dep('express'),jwt=dep('jsonwebtoken'),app=express();app.use(express.json());pool=require(path.join(root,'backend/db'));
  permissions=require(path.join(root,'backend/routes/permissoes'));app.use('/api/permissoes',permissions);
  app.use('/api/events',require(path.join(root,'backend/routes/events')).createEventsRouter(db));app.use('/api/public/events',require(path.join(root,'backend/routes/public-events')).createPublicEventsRouter(db));
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}/api`;
  async function call(method,url,body,status=200,id=actor){const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer '+jwt.sign({id,role:'admin'},secret)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();assert.equal(response.status,status,method+' '+url+': '+JSON.stringify(data));return data}
  const endpoint='/events/realmed-2026/confirmations';
  await call('GET',endpoint,undefined,401,null);await call('GET',endpoint,undefined,403,user);
  assert.ok((await call('GET','/permissoes/catalog')).some(row=>row.key==='events'));
  const grant={permissions:[{moduleKey:'events',canView:true,canCreate:false,canEdit:false,canDelete:false}]};await call('POST','/permissoes/'+user,grant);
  assert.equal((await call('GET','/permissoes/'+user)).permissions.find(row=>row.moduleKey==='events').canView,true);
  const list=await call('GET',endpoint,undefined,200,user);assert.equal(list.event.name,'Confraternização 2026');assert.deepEqual(list.summary,{confirmations:2,companions:2,total_people:4});assert.equal(list.items.length,2);assert.equal(list.items.find(row=>row.participant_name==='Ana de teste').companion_names.length,2,'Existing multiple companions are preserved');assert.equal(list.items[0].submission_key,undefined);assert.equal(list.items[0].payload_hash,undefined);
  const second=await call('GET',endpoint+'?page=2&pageSize=1&sort=name',undefined,200,user);assert.equal(second.items[0].participant_name,'Bia de teste');assert.equal(second.pagination.total,2);
  assert.equal((await call('GET',endpoint+'?search=Acompanhante%20Dois',undefined,200,user)).items.length,1);
  assert.equal((await call('GET',endpoint+'?companions=without',undefined,200,user)).items[0].participant_name,'Bia de teste');assert.equal((await call('GET',endpoint+'?companions=with',undefined,200,user)).items.length,1);
  assert.equal((await call('GET',endpoint+'?search=%25',undefined,200,user)).items.length,0,'Wildcard is literal');assert.equal((await call('GET',endpoint+'?search=inexistente',undefined,200,user)).summary.confirmations,2);
  await call('GET',endpoint+'?pageSize=1000',undefined,400,user);await call('GET','/events/missing/confirmations',undefined,404,user);
  await call('POST','/public/events/realmed-2026/confirmations',{name:'Carlos de teste',companions:['Acompanhante Três'],submission_key:crypto.randomUUID()},201,null);
  assert.deepEqual((await call('GET',endpoint,undefined,200,user)).summary,{confirmations:3,companions:3,total_people:6});
  await call('POST','/permissoes/'+user,{permissions:[]});await call('GET',endpoint,undefined,403,user);
  await call('POST','/permissoes/'+user,grant);await db('users').where({id:user}).update({status:'blocked'});await call('GET',endpoint,undefined,401,user);
  assert.equal((await db('event_confirmations').where({submission_key:legacy.submission_key}).first()).companion_count,2);
  console.log('PASS Events module/API/MySQL: registered event, existing/new confirmations, legacy companions, summaries, search/filter/pagination, no cross-event exposure, auth required, real permission catalog/save/grant/revoke, stale admin token and blocked user denied.');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(permissions)await permissions.knex.destroy();if(pool)await pool.end();if(db)await db.destroy();if(created)await admin.query('DROP DATABASE ??',[database]);await admin.end();process.chdir(root);const target=path.resolve(temp);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('realmed-events-'));fs.rmSync(target,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
