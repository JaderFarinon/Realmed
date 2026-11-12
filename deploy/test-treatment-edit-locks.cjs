// Only synthetic rows in a temporary database; never reads the source database.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name));
async function main(){
  const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env')));
  const connection={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};
  const name='realmed_verify_locks_'+Date.now()+'_'+crypto.randomBytes(3).toString('hex');
  const admin=await dep('mysql2/promise').createConnection(connection),temp=fs.mkdtempSync(path.join(os.tmpdir(),'realmed-locks-'));
  let db,guardDb,pool,server;
  try{
    await admin.query('CREATE DATABASE ??',[name]);
    const secret=crypto.randomBytes(32).toString('hex');
    const settings={...env,DB_NAME:name,JWT_SECRET:secret,PERMISSIONS_ENABLED:'true',NODE_ENV:'test'};
    const envPath=path.join(temp,'.env');
    fs.writeFileSync(envPath,Object.entries(settings).map(([k,v])=>k+'='+JSON.stringify(String(v))).join('\n'),{mode:0o600});
    process.env.DOTENV_CONFIG_PATH=envPath;
    pool=require(path.join(root,'backend/db'));
    const config={client:'mysql2',connection:{...connection,database:name},pool:{min:0,max:6}};
    db=dep('knex')(config);guardDb=dep('knex')(config);
    await db.schema.createTable('people',t=>{t.increments('id');t.string('full_name')});
    await db.schema.createTable('users',t=>{t.increments('id');t.integer('person_id');t.string('role');t.string('status')});
    await db.schema.createTable('user_permissions',t=>{t.integer('user_id');t.string('module_key');for(const c of ['view','edit','create','delete'])t.boolean('can_'+c).defaultTo(false)});
    await db.schema.createTable('guide_processes',t=>{t.increments('id');t.json('workflow_stages');t.integer('continuation_of_id');t.timestamp('deleted_at').nullable().defaultTo(null);t.date('assessment_date')});
    await db.schema.createTable('physiotherapy_evaluations',t=>{t.integer('guide_process_id');t.string('status')});
    await require(path.join(root,'backend/migrations/20261106000004_treatment_edit_locks')).up(db);
    await db('people').insert([{id:1,full_name:'Pessoa de teste A'},{id:2,full_name:'Pessoa de teste B'}]);
    await db('users').insert([{id:1,person_id:1,role:'user',status:'active'},{id:2,person_id:2,role:'admin',status:'active'}]);
    await db('user_permissions').insert({user_id:1,module_key:'guide_processes',can_view:true,can_edit:true});
    await db('guide_processes').insert({id:1,assessment_date:'2026-11-11',workflow_stages:'{}'});
    const express=dep('express'),app=express(),{createEditLocks}=require(path.join(root,'backend/routes/treatment-edit-locks'));
    const locks=createEditLocks(db,guardDb),stages=require(path.join(root,'backend/services/treatmentStages'));
    const auth=require(path.join(root,'backend/middleware/auth')),{modulePermission}=require(path.join(root,'backend/middleware/permission'));
    app.use(express.json());app.use(locks.guard);app.use('/api',locks.router);
    let holdWrite,writeEntered;
    app.put('/api/guide-processes/1',auth,modulePermission('guide_processes','edit'),async(req,res,next)=>{
      try{
        await db.transaction(async trx=>{
          await stages.lockOpen(trx,1,'reception');
          if(holdWrite){writeEntered();await holdWrite}
          await trx('guide_processes').where({id:1}).update({assessment_date:req.body.assessment_date});
        });res.json({saved:true});
      }catch(e){next(e)}
    });
    app.use((e,_req,res,_next)=>res.status(e.status||500).json({error:e.message,code:e.code}));
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
    const base='http://127.0.0.1:'+server.address().port+'/api',jwt=dep('jsonwebtoken');
    const tokens={1:jwt.sign({id:1,role:'user'},secret),2:jwt.sign({id:2,role:'admin'},secret)};
    const a=crypto.randomUUID(),b=crypto.randomUUID(),c=crypto.randomUUID(),url='/guide-processes/1/edit-lock/reception';
    const call=async(method,editor=a,body,who=1,target=url)=>{
      const r=await fetch(base+target,{method,headers:{Authorization:'Bearer '+tokens[who],'X-Realmed-Editor':editor,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:r.status,data:await r.json()};
    };
    assert.equal((await call('POST',a,{renew:true})).status,423,'Heartbeat cannot acquire an empty lease');
    assert.equal((await call('POST',a,{})).data.owned,true);
    const same=await call('GET',b);assert.equal(same.data.sameUser,true);assert.equal(same.data.recoverFrom,a);
    const foreign=await call('GET',b,undefined,2);assert.equal(foreign.data.sameUser,false);assert.equal(foreign.data.recoverFrom,undefined);
    assert.equal((await call('POST',b,{})).status,423);
    assert.equal((await call('POST',b,{recoverFrom:a},2)).status,423,'Admin cannot steal another account lease');
    const recovered=await call('POST',b,{recoverFrom:same.data.recoverFrom});assert.equal(recovered.data.owned,true);
    assert.equal((await call('POST',a,{renew:true})).data.code,'TREATMENT_EDIT_LOST');
    assert.equal((await call('PUT',a,{assessment_date:'2026-11-12'},1,'/guide-processes/1')).status,423);
    assert.equal((await call('DELETE',a)).data.locked,true);assert.equal((await call('GET',b)).data.owned,true);
    assert.equal((await call('POST',c,{recoverFrom:a})).status,409,'Stale confirmation cannot override the new owner');
    const contenders=await Promise.all([call('POST',a,{recoverFrom:b}),call('POST',c,{recoverFrom:b})]);
    assert.deepEqual(contenders.map(r=>r.status).sort(),[200,409]);
    const winner=contenders[0].status===200?a:c;
    await call('DELETE',winner);assert.equal((await call('POST',b,{renew:true})).status,423,'Released lease cannot be reacquired by a late heartbeat');
    await call('POST',a,{});await guardDb('treatment_edit_locks').update({expires_at:Date.now()-1});
    assert.equal((await call('POST',a,{renew:true})).status,423,'Expired renewal must fail');
    assert.equal((await call('POST',b,{})).data.owned,true,'Expired lease can be explicitly acquired');
    await db('user_permissions').where({user_id:1}).update({can_edit:false});
    assert.equal((await call('POST',a,{recoverFrom:b})).status,403);
    await db('user_permissions').where({user_id:1}).update({can_edit:true});
    await db('users').where({id:1}).update({status:'inactive'});
    assert.equal((await call('POST',a,{recoverFrom:b})).status,401);
    await db('users').where({id:1}).update({status:'active'});
    assert.equal((await call('POST',a,{recoverFrom:b},1,'/guide-processes/1/edit-lock/evaluation')).data.code,'TREATMENT_STAGE_LOCKED');
    await db('guide_processes').update({deleted_at:new Date()});
    assert.equal((await call('POST',a,{recoverFrom:b})).data.code,'TREATMENT_ARCHIVED');
    await db('guide_processes').update({deleted_at:null,workflow_stages:JSON.stringify({reception:{completed_at:'2026-11-11'}})});
    assert.equal((await call('POST',a,{recoverFrom:b})).data.owned,true,'Recovery can reserve a completed stage for explicit reopening');
    assert.equal((await call('PUT',a,{assessment_date:'2026-11-12'},1,'/guide-processes/1')).data.code,'TREATMENT_STAGE_CLOSED','Recovery must not reopen a stage');
    await db('guide_processes').update({workflow_stages:'{}'});
    // Transfer waits for a mutation already protected by the previous lease to commit.
    let unblock;holdWrite=new Promise(resolve=>{unblock=resolve});
    const entered=new Promise(resolve=>{writeEntered=resolve});
    const writing=call('PUT',a,{assessment_date:'2026-11-13'},1,'/guide-processes/1');await entered;
    let transferred=false;const transfer=call('POST',b,{recoverFrom:a}).then(r=>{transferred=true;return r});
    await new Promise(r=>setTimeout(r,100));assert.equal(transferred,false);
    unblock();assert.equal((await writing).status,200);assert.equal((await transfer).data.owned,true);holdWrite=null;
    assert.equal(String((await db('guide_processes').first()).assessment_date).includes('13'),true);
    console.log('PASS MySQL/API recovery: ownership, permissions, inactive user, CAS concurrency, stale renewal/delete/write, expiry, completed/locked stages, in-flight write serialization.');
  }finally{
    if(server)await new Promise(r=>server.close(r));
    if(pool)await pool.end();if(db)await db.destroy();if(guardDb)await guardDb.destroy();
    await admin.query('DROP DATABASE ??',[name]);await admin.end();
    assert.equal(path.dirname(path.resolve(temp)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('realmed-locks-'));
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
