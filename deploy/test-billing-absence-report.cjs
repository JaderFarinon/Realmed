const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name));
async function main(){
 const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env')));assert.ok(['localhost','127.0.0.1'].includes(env.DB_HOST));
 const config={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};
 const admin=await dep('mysql2/promise').createConnection(config),name='realmed_absence_verify_'+crypto.randomBytes(8).toString('hex'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'realmed-absence-'));let db,server,pool,guideKnex,created=false;
 try{
  await admin.query('CREATE DATABASE ??',[name]);created=true;
  const secret=crypto.randomBytes(32).toString('hex');Object.assign(env,{DB_NAME:name,JWT_SECRET:secret,PERMISSIONS_ENABLED:'true',NODE_ENV:'test',STENCI_BRANCH_ID:'branch-test'});
  const envPath=path.join(temp,'.env');fs.writeFileSync(envPath,Object.entries(env).map(([k,v])=>`${k}=${JSON.stringify(String(v))}`).join('\n'),{mode:0o600});process.env.DOTENV_CONFIG_PATH=envPath;process.chdir(temp);
  db=dep('knex')({client:'mysql2',connection:{...config,database:name}});
  await db.schema.createTable('users',t=>{t.integer('id').primary();t.string('role');t.string('status')});
  await db.schema.createTable('user_permissions',t=>{t.integer('user_id');t.string('module_key');t.boolean('can_view');t.boolean('can_create');t.boolean('can_edit');t.boolean('can_delete')});
  await db.schema.createTable('patients',t=>{t.string('external_id');t.string('external_source');t.string('phone')});
  await require(path.join(root,'backend/migrations/20261020000006_billing_agenda_collection')).up(db);
  await require(path.join(root,'backend/migrations/20261020000007_billing_agenda_filters')).up(db);
  await db('users').insert([{id:1,role:'admin',status:'active'},{id:2,role:'user',status:'active'},{id:3,role:'user',status:'active'}]);
  await db('user_permissions').insert({user_id:2,module_key:'billing_reports',can_view:true});
  await db('patients').insert([{external_id:'patient-a',external_source:'STENCI',phone:'4100000000'},{external_id:'patient-b',external_source:'OTHER',phone:'wrong-source'}]);
  for(const [i,date] of ['2026-10-01','2026-10-02','2026-10-20'].entries())for(const patient of ['patient-a','patient-b'])await db('billing_stenci_appointments').insert({branch_id:'branch-test',external_id:patient+'-'+i,service_date:date,schedule_id:'schedule',schedule_name:'Agenda fictícia',patient_external_id:patient,patient_name:patient==='patient-a'?'Nome igual':'Nome igual',start_at:date+'T12:00:00Z',status:'missed',is_evaluation:false,is_session:true,is_physiotherapy:true,expenses:'[]',schedule_memberships:'[]',collected_at:new Date()});
  // Same identity in another branch must not increase the count.
  await db('billing_stenci_appointments').insert({branch_id:'other-branch',external_id:'other',service_date:'2026-10-03',schedule_id:'s',schedule_name:'Outra',patient_external_id:'patient-a',patient_name:'Outro',start_at:'2026-10-03T12:00:00Z',status:'missed',is_evaluation:false,is_session:true,expenses:'[]',collected_at:new Date()});
  const app=dep('express')();app.use(dep('express').json());app.use('/api/billing',require(path.join(root,'backend/routes/billing')));pool=require(path.join(root,'backend/db'));guideKnex=require(path.join(root,'backend/routes/guide-center')).knex;
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}/api/billing`;
  async function call(url,as=2,status=200,body){const res=await fetch(base+url,{method:body?'POST':'GET',headers:{...(as?{Authorization:'Bearer '+dep('jsonwebtoken').sign({id:as,role:'admin'},secret)}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data}
  const report=await call('/reports/absences?date=2026-10-20&historyStart=2026-10-01');assert.equal(report.total,2);assert.equal(report.items.find(p=>p.id==='patient-a').total_misses,3);assert.equal(report.items.find(p=>p.id==='patient-a').phone,'4100000000');assert.equal(report.items.find(p=>p.id==='patient-b').phone,null);assert.equal(report.coverage.complete,false);
  assert.equal((await call('/reports/absences?date=2026-10-20&rule=prior3')).total,0);
  await call('/reports/absences?date=2026-10-20',3,403);await call('/reports/absences?date=2026-10-20',null,401);await call('/dashboard?start=2026-10-01&end=2026-10-20',2,403);
  await call('/reports/absences?date=2099-01-01',2,400);await call('/reports/absences?date=2026-10-20&rule=invalid',2,400);
  await call('/reports/absences/queue',2,202,{date:'2026-10-20',historyStart:'2026-10-01',rule:'total3',forceDate:true});assert.equal(Number((await db('billing_collection_days').where({branch_id:'branch-test'}).count('* as n').first()).n),20);
  assert.equal(Number((await db('billing_stenci_appointments').count('* as n').first()).n),7,'report and queue preserve appointments');
  console.log('PASS: daily report, 3 versus 4 misses, homonyms remain separate, phone identity/source, branch isolation, independent permission, date validation and non-destructive queue.');
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));if(pool)await pool.end();if(guideKnex)await guideKnex.destroy();if(db)await db.destroy();if(created&&/^realmed_absence_verify_[a-f0-9]{16}$/.test(name))await admin.query('DROP DATABASE ??',[name]);await admin.end();process.chdir(root);if(!path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unexpected temporary directory');fs.rmSync(temp,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e.code||e.name,e.code?.startsWith('ER_')?'Database verification failed':e.message);process.exitCode=1});
