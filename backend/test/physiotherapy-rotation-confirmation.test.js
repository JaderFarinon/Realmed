const test=require('node:test'),assert=require('node:assert/strict');
const {assertScheduled,previewFromHistory,historyItem}=require('../services/physiotherapyRotationConfirmation');
test('rotation confirmation requires explicit manual-booking attestation',()=>{
  for(const value of [undefined,null,false,'true',1]) assert.throws(()=>assertScheduled(value),error=>error.status===422);
  assert.doesNotThrow(()=>assertScheduled(true));
});
test('only the author can confirm the latest durable suggestion, without short-lived availability expiry',()=>{
  const row={id:4,user_id:8,created_at:'2026-11-01',metadata:JSON.stringify({previewToken:'chosen',candidate:{professional_id:2,professional_name:'Nome sorteado'},request:{total:6}})};
  assert.equal(previewFromHistory(row,'chosen',8).candidate.professional_id,2);
  assert.throws(()=>previewFromHistory(row,'chosen',9),error=>error.status===409);
  assert.throws(()=>previewFromHistory(row,'superseded',8),error=>error.status===409);
  assert.throws(()=>previewFromHistory(null,'chosen',8),error=>error.status===409);
});
test('history preserves the chosen name and distinguishes attested confirmations from legacy entries',()=>{
  const item=historyItem({id:4,action:'PHYSIOTHERAPY_ROTATION_SUGGESTED',metadata:{previewToken:'private-selector',candidate:{professional_name:'Nome sorteado',schedule_name:'Agenda',sessions:[]}}});
  assert.equal(item.professional_name,'Nome sorteado');assert.equal(item.stenci_scheduled_confirmed,false);
  assert.equal(JSON.stringify(item).includes('private-selector'),false);
  assert.equal(historyItem({action:'PHYSIOTHERAPY_ROTATION_CONFIRMED',metadata:{professionalName:'Confirmado',stenciScheduledConfirmed:true}}).stenci_scheduled_confirmed,true);
  assert.equal(historyItem({action:'PHYSIOTHERAPY_ROTATION_CONFIRMED',metadata:{}}).stenci_scheduled_confirmed,false);
});
