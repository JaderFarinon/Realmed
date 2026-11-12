// Integration check in a temporary local MySQL database, never in production.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name));
(async()=>{
  const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env')));
  const connection={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};
  assert.ok(['localhost','127.0.0.1','::1'].includes(connection.host));
  const database='realmed_event_verify_'+Date.now()+'_'+crypto.randomBytes(3).toString('hex');
  const admin=await dep('mysql2/promise').createConnection(connection);let db,server;
  try{
    await admin.query('CREATE DATABASE ??',[database]);db=dep('knex')({client:'mysql2',connection:{...connection,database}});
    await require('../backend/migrations/20261112000001_event_confirmations').up(db);
    const app=dep('express')();app.use(dep('express').json());app.use('/api/public/events',require('../backend/routes/public-events').createPublicEventsRouter(db));
    server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener))});
    const url=`http://127.0.0.1:${server.address().port}/api/public/events/realmed-2026/confirmations`;
    const body={name:'Pessoa fictícia',companions:['Acompanhante fictício'],submission_key:crypto.randomUUID()};
    const post=data=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const responses=await Promise.all([post(body),post(body)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
    for(const response of responses){assert.deepEqual(await response.json(),{confirmed:true,total:2});assert.equal(response.headers.get('cache-control'),'no-store')}
    assert.equal(Number((await db('event_confirmations').count({n:'*'}).first()).n),1);
    const row=await db('event_confirmations').first();assert.equal(row.participant_name,body.name);assert.deepEqual(typeof row.companion_names==='string'?JSON.parse(row.companion_names):row.companion_names,body.companions);
    assert.equal((await post({...body,companions:[]})).status,409);
    assert.equal((await post({...body,submission_key:crypto.randomUUID(),companions:['']})).status,400);
    const excessive=await post({...body,submission_key:crypto.randomUUID(),companions:['Acompanhante Um','Acompanhante Dois']});
    assert.equal(excessive.status,400);assert.match((await excessive.json()).error,/no máximo 1 acompanhante/);
    assert.equal(Number((await db('event_confirmations').count({n:'*'}).first()).n),1,'Rejected companions do not create or alter a confirmation');
    assert.equal((await post({...body,submission_key:crypto.randomUUID(),companions:[]})).status,201);
    assert.equal((await fetch(url)).status,404,'Names are not publicly listed');
    console.log('PASS event API/MySQL: zero/one companion accepted, two rejected without writing, unauthenticated confirmation, persisted names/count, concurrent retry deduplication, mismatch and unnamed companion rejected, no public listing.');
  }finally{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.destroy();await admin.query('DROP DATABASE ??',[database]);await admin.end()}
})().catch(error=>{console.error(error);process.exitCode=1});
