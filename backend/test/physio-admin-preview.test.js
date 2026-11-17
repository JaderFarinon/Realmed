const test=require('node:test'),assert=require('node:assert/strict');
const {createAdminPreviewAccess}=require('../services/physioAdminPreview');
const {StenciSessionStore}=require('../services/StenciSessionStore');
test('a preview request reuses a connection completed after its middleware, with one audit and no replacement of admin session',async()=>{
 const audits=[],store=new StenciSessionStore();let created=0;
 const db=table=>({where(){return this},whereIn(){return this},whereRaw(){return this},async first(){return table==='users'?{id:9}:{id:7,full_name:'Fisio teste',council_number:'TEST',state:'PR'}},async select(){return[{schedule_id:'agenda-a'}]},async insert(row){audits.push(row)}});
 const access=createAdminPreviewAccess({db,sessionStore:store,createSession:async()=>{created++;return{sid:store.create({mode:'physio-development',userId:9,professionalId:7})}}});
 const adminSid=store.create({mode:'normal',userId:9});
 async function request(){const req={method:'POST',path:'/session',params:{professionalId:'7'},user:{id:9,sid:adminSid,exp:Math.floor(Date.now()/1000)+3600},get:()=> 'Bearer test-token'};let next=false;await access.middleware(req,{set(){return this},status(status){throw Error('Unexpected status '+status)}},()=>{next=true});assert.equal(next,true);return req}
 try{
  const first=await request(),second=await request();assert.equal(second.physioSid,undefined);
  await first.ensurePhysioPreview();await second.ensurePhysioPreview();
  assert.equal(created,1);assert.equal(audits.length,1);assert.ok(first.physioSid);assert.equal(second.physioSid,first.physioSid);assert.equal(store.get(first.physioSid).adminPreview,true);
  assert.ok(store.get(adminSid));assert.equal(second.user.sid,adminSid);assert.ok(store.sessions.get(first.physioSid).expiresAt<=Date.now()+30*60000);
 }finally{store.clear()}
});
