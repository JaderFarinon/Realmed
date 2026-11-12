const test=require('node:test'),assert=require('node:assert/strict');
const {createPhysioSession,serializePhysioStenci}=require('../services/physioStenciSession');
const {StenciSessionStore}=require('../services/StenciSessionStore');
const {refreshStenci,automaticService}=require('../services/stenciRefreshService');
test('shared physio session authenticates/logs out before publishing and binds each Realmed user',async()=>{
  const events=[],store=new StenciSessionStore(),env={STENCI_FISIO_USERNAME:'shared-test',STENCI_FISIO_PASSWORD:'test-only-password'};
  const args={userId:3,professionalId:9,sessionStore:store,env,configFactory:()=>({branchId:'test-branch'}),serviceFactory:()=>({authenticateUser:async(u,p)=>{assert.equal(u,env.STENCI_FISIO_USERNAME);assert.equal(p,env.STENCI_FISIO_PASSWORD);events.push('login');return{stenci_user_id:'shared-external'}},logout:async()=>{assert.equal(store.sessions.size,0);events.push('logout')}})};
  const result=await createPhysioSession(args);
  assert.deepEqual(events,['login','logout']);assert.equal(result.developmentMode,false);
  const session=store.get(result.sid);assert.equal(session.mode,'physio-shared');assert.equal(session.userId,3);assert.equal(session.professionalId,9);
  assert.equal(session.password,undefined);assert.equal(store.getCredentials(result.sid).username,'shared-test');
  await assert.rejects(refreshStenci({sid:result.sid,sessionStore:store,operations:[]}),e=>e.code==='PHYSIO_SCOPE_REQUIRED');
  assert.throws(()=>automaticService({sid:result.sid,sessionStore:store}),e=>e.code==='PHYSIO_SCOPE_REQUIRED');
  store.delete(result.sid);
  await assert.rejects(createPhysioSession({...args,serviceFactory:()=>({authenticateUser:async()=>({stenci_user_id:'shared-external'}),logout:async()=>{throw Object.assign(new Error('test'),{code:'TEST_LOGOUT'})}}),logger:{error:()=>{}}}),e=>e.code==='STENCI_LOGOUT_FAILED');
  assert.equal(store.sessions.size,0);
});
test('shared physio operations across different sessions are serialized and recover after failure',async()=>{
  let active=0,max=0;const calls=[];
  await Promise.all(Array.from({length:3},(_,i)=>serializePhysioStenci(async()=>{active++;max=Math.max(max,active);calls.push(i);await new Promise(r=>setTimeout(r,5));active--;if(i===1)throw new Error('expected')})).map(p=>p.catch(()=>{})));
  assert.equal(max,1);assert.deepEqual(calls,[0,1,2]);
});
test('development bypass is explicit and never selected when shared credentials exist',async()=>{
  const store=new StenciSessionStore();
  await assert.rejects(createPhysioSession({userId:1,professionalId:2,sessionStore:store,env:{NODE_ENV:'production',STENCI_FISIO_DEV_BYPASS:'true'}}),e=>e.code==='STENCI_FISIO_NOT_CONFIGURED');
  const result=await createPhysioSession({userId:1,professionalId:2,sessionStore:store,env:{NODE_ENV:'test',STENCI_FISIO_DEV_BYPASS:'true'}});
  assert.equal(result.developmentMode,true);assert.equal(store.get(result.sid).professionalId,2);store.delete(result.sid);
});
