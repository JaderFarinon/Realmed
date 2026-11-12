const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events')
const {createFacialLoginAttempts,isFacialLoginRequest}=require('../services/facialLoginAttempts')
function fixture(){
  let clock=1000000
  const limiter=createFacialLoginAttempts({now:()=>clock})
  const response=()=>Object.assign(new EventEmitter(),{statusCode:200,locals:{},headers:{},status(code){this.statusCode=code;return this},set(key,value){this.headers[key]=value;return this},json(body){this.body=body;return this}})
  const start=(ip='tablet-a')=>{const res=response();limiter.attempt({ip},res,()=>{res.accepted=true});return res}
  const check=()=>{const res=response();limiter.check({ip:'tablet-a'},res,()=>{res.accepted=true});return res}
  return {start,check,advance:ms=>{clock+=ms}}
}
test('facial pause starts at the tenth failure, never grows and restores ten attempts every minute',()=>{
  const f=fixture()
  for(let cycle=0;cycle<3;cycle++){
    for(let i=0;i<9;i++){const r=f.start();assert.ok(r.accepted);r.status(401).json({error:'Rejected'});assert.equal(r.statusCode,401);f.advance(10000)}
    const tenth=f.start();assert.ok(tenth.accepted);tenth.status(401).json({error:'Rejected'})
    assert.equal(tenth.statusCode,429);assert.equal(tenth.headers['Retry-After'],'60')
    for(let second=1;second<60;second++){
      f.advance(1000);const denied=f.start();assert.ok(!denied.accepted);assert.equal(Number(denied.headers['Retry-After']),60-second)
      assert.equal(f.check().statusCode,429)
    }
    f.advance(999);assert.equal(f.start().headers['Retry-After'],'1')
    f.advance(1);assert.ok(f.check().accepted)
  }
})
test('concurrent attempts reserve the remaining budget; aborted work, server issues and step-up do not count',()=>{
  const f=fixture(),pending=Array.from({length:10},()=>f.start())
  assert.ok(pending.every(r=>r.accepted));assert.equal(f.start().statusCode,503)
  pending[0].locals.faceAdditionalCheck=true;pending[0].status(401).json({code:'FACE_MOTION_REQUIRED'})
  pending[1].status(503).json({error:'Unavailable'})
  pending[2].emit('close');pending[2].status(401).json({error:'Late reply'})
  for(const r of pending.slice(3))r.status(401).json({error:'Rejected'})
  for(let i=0;i<2;i++)assert.equal(f.start().status(401).json({error:'Rejected'}).statusCode,401)
  assert.equal(f.start().status(401).json({error:'Rejected'}).statusCode,429)
  assert.ok(f.start('tablet-b').accepted,'Other client IP has an independent budget')
})
test('successful facial login clears earlier failures without consuming attempts',()=>{
  const f=fixture()
  for(let cycle=0;cycle<3;cycle++){
    for(let i=0;i<9;i++)assert.equal(f.start().status(401).json({error:'Rejected'}).statusCode,401)
    assert.equal(f.start().json({token:'test'}).statusCode,200)
  }
})
test('only the two public facial endpoints use the separate limiter',()=>{
  for(const path of ['/api/physio/auth/face','/api/physio/auth/challenge','/api/physio/auth/face/']){
    assert.equal(isFacialLoginRequest({path,method:'POST'}),true)
    assert.equal(isFacialLoginRequest({path,method:'GET'}),false)
  }
  for(const path of ['/api/auth/login','/api/auth/change-password','/api/physio/me','/api/physio/auth/face/extra','/api/guide-processes'])assert.equal(isFacialLoginRequest({path,method:'POST'}),false)
})
