const test=require('node:test'), assert=require('node:assert/strict');
const locks=require('../services/treatmentEditLocks');
const {EventEmitter}=require('node:events');
const {createTreatmentLiveUpdates}=require('../services/treatmentLiveUpdates');
test('editing lease distinguishes users and browser tabs and expires',()=>{
  const row={owner_id:4,editor_id:'window-a',expires_at:Date.now()+60000};
  assert.doesNotThrow(()=>locks.assertAvailable(row,4,'window-a'));
  for(const [id,tab] of [[5,'window-b'],[4,'window-b'],[4,'']])
    assert.throws(()=>locks.assertAvailable(row,id,tab),e=>e.status===423);
  assert.doesNotThrow(()=>locks.assertAvailable({...row,expires_at:Date.now()-1},5,'window-b'));
});
test('mutation scopes protect the affected tab and shared evaluation fields',()=>{
  assert.deepEqual(locks.mutationTarget('/api/guide-processes/12','PUT',{assessment_date:'2026-11-06'}),{id:12,stages:['reception']});
  assert.deepEqual(locks.mutationTarget('/api/guide-processes/12/evaluation','PUT'),{id:12,stages:['evaluation','central']});
  assert.deepEqual(locks.mutationTarget('/api/guide-processes/12/stages/documents/complete','POST'),{id:12,stages:['central']});
  assert.equal(locks.mutationTarget('/api/guide-processes/12/documents/preview','POST'),null);
  assert.equal(locks.mutationTarget('/api/guide-processes/12/edit-lock/central','POST'),null);
  assert.deepEqual(locks.mutationTarget('/api/guide-processes/12/billing/CONSULTATION_GUIDE','PATCH'),{id:12,stages:['billing']});
});
test('live stream notifies two viewers only after successful authenticated mutations and cleans up disconnects',()=>{
  const live=createTreatmentLiveUpdates();
  const viewer=()=>{
    const res=new EventEmitter();res.writableEnded=false;res.set=()=>{};res.flushHeaders=()=>{};res.messages=[];
    res.write=value=>res.messages.push(value);res.end=()=>res.emit('close');
    live.stream({user:{exp:Math.floor(Date.now()/1000)+60}},res);return res;
  };
  const a=viewer(),b=viewer();
  const mutate=(status,user={id:1})=>{
    const response=new EventEmitter();response.statusCode=status;
    live.observe({method:'POST',path:'/api/guide-processes/12/stages/reception/complete',user},response,()=>{});
    assert.equal(a.messages.length,1); response.emit('finish');
  };
  mutate(409);mutate(200,null);mutate(200);
  assert.equal(a.messages.length,2);assert.equal(b.messages.length,2);
  a.end();b.end();
});
