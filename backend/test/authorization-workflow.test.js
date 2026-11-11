const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateInput,transitions}=require('../services/authorizationWorkflow');
test('authorization status input rejects invalid states, quantities and dates',()=>{
  const base={status:'AUTHORIZED',expected_status:'IN_PROGRESS',authorized_sessions:10};
  assert.equal(validateInput(base).authorized_sessions,10);
  for (const change of [{status:'BILLED'},{expected_status:'x'},{authorized_sessions:-1},{authorized_sessions:true},{authorized_sessions:[2]},{authorized_sessions:1.2},{authorization_date:'2026-02-30'},{authorization_date:'2026-10-27',expiration_date:'2026-10-26'},{notes:'a'.repeat(5001)}]) assert.throws(()=>validateInput({...base,...change}),e=>e.status===422);
});
test('appeal is a denial branch and not a release or a billing appeal',()=>{
  assert.ok(transitions.DENIED.includes('IN_APPEAL'));
  assert.ok(!transitions.READY.includes('IN_APPEAL'));
  assert.ok(!transitions.AUTHORIZED.includes('IN_APPEAL'));
  assert.ok(transitions.IN_APPEAL.includes('AUTHORIZED'));
  assert.ok(transitions.IN_APPEAL.includes('DENIED'));
  assert.deepEqual(transitions.NOT_READY,[]);
});


test('authorization number accepts digits only, preserves leading zeros and remains optional',()=>{
  const base={status:'AUTHORIZED',expected_status:'IN_PROGRESS',authorized_sessions:10};
  assert.equal(validateInput({...base,authorization_number:'0012345678901234567890'}).authorization_number,'0012345678901234567890');
  for (const value of [undefined,null,'']) assert.equal(validateInput({...base,authorization_number:value}).authorization_number,null);
  for (const value of ['12ABC','1.2','-12','12/34','1e3','12 34','1'.repeat(101),123]) assert.throws(()=>validateInput({...base,authorization_number:value}),e=>e.status===422);
});


test('authorization dates cannot precede the process/request boundary, same day is valid',()=>{
  const {validateAuthorizationDates}=require('../services/authorizationWorkflow');
  for (const minimum of ['2026-10-20','2026-10-27']) {
    assert.throws(()=>validateAuthorizationDates({authorization_date:'2026-10-19'},minimum),e=>e.status===422);
    assert.equal(validateAuthorizationDates({authorization_date:minimum},minimum).authorization_date,minimum);
    assert.equal(validateAuthorizationDates({authorization_date:'2026-10-28'},minimum).authorization_date,'2026-10-28');
  }
  assert.deepEqual(validateAuthorizationDates({},'2026-10-27'),{authorization_date:null,expiration_date:null});
  for (const input of [{authorization_date:'2026-02-30'},{authorization_date:'2026-10-27',expiration_date:'2026-10-26'}]) assert.throws(()=>validateAuthorizationDates(input,null),e=>e.status===422);
});
