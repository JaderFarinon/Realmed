const test=require('node:test'), assert=require('node:assert/strict');
const {state,assertOpen,assertFieldsOpen,assertStagePrerequisites,assertNoCompletedDependents}=require('../services/treatmentStages');
const closed=stage=>({workflow_stages:JSON.stringify({[stage==='central'?'documents':stage]:{completed_at:'2026-10-27T12:00:00Z',completed_by:1}})});
test('stage state accepts MySQL JSON strings, objects and legacy empty state',()=>{
 assert.deepEqual(state({}),{}); assert.ok(state(closed('central')).central.completed_at);
 assert.ok(state({workflow_stages:{documents:{completed_at:'now'}}}).central);
});
test('closed stages reject owning changes and preserve independent cards',()=>{
 assert.throws(()=>assertOpen(closed('central'),'central'),e=>e.status===409);
 assert.doesNotThrow(()=>assertOpen(closed('central'),'reception'));
 for(const [stage,payload] of [['reception',{assessment_date:'2026-10-28'}],['central',{notes:'changed'}],['authorization',{authorized_sessions:8}],['treatment',{performed_sessions:3}]])
  assert.throws(()=>assertFieldsOpen(closed(stage),payload),e=>e.status===409);
 assert.doesNotThrow(()=>assertFieldsOpen(closed('central'),{assessment_date:'2026-10-28'}));
});
test('unchanged values synchronized from evaluation do not require reopening',()=>{
 const p={...closed('central'),requested_sessions:10,treatment_days:'[{"time": "08:30", "day": "MONDAY", "enabled": true}]'};
 assert.doesNotThrow(()=>assertFieldsOpen(p,{requested_sessions:'10',treatment_days:'[{"day":"MONDAY","enabled":true,"time":"08:30"}]'}));
 assert.throws(()=>assertFieldsOpen(p,{requested_sessions:11}),e=>e.status===409);
 assert.doesNotThrow(()=>assertFieldsOpen({...closed('reception'),assessment_date:new Date('2026-10-27T00:00:00Z')},{assessment_date:'2026-10-27'}));
});
test('workflow stages unlock only after every prior stage is completed',()=>{
 const p=closed('reception');
 assert.doesNotThrow(()=>assertStagePrerequisites(p,'evaluation','IN_PROGRESS'));
 assert.throws(()=>assertStagePrerequisites(p,'central','IN_PROGRESS'),e=>e.prerequisite==='evaluation');
 assert.throws(()=>assertStagePrerequisites({},'central','COMPLETED'),e=>e.prerequisite==='reception');
 assert.throws(()=>assertStagePrerequisites({},'evaluation','IN_PROGRESS'),e=>e.prerequisite==='reception');
 const afterEvaluation={...p,workflow_stages:JSON.stringify({reception:{completed_at:'now'}})};
 assert.doesNotThrow(()=>assertStagePrerequisites(afterEvaluation,'central','COMPLETED'));
 assert.doesNotThrow(()=>assertStagePrerequisites(afterEvaluation,'documents','COMPLETED'));
 const allBeforeDocs={...afterEvaluation,workflow_stages:JSON.stringify({reception:{completed_at:'now'},central:{completed_at:'now'}})};
 assert.doesNotThrow(()=>assertStagePrerequisites(allBeforeDocs,'documents','COMPLETED'));
 assert.throws(()=>assertStagePrerequisites(allBeforeDocs,'documents','IN_PROGRESS'),e=>e.prerequisite==='evaluation');
 assert.throws(()=>assertStagePrerequisites({...allBeforeDocs,continuation_of_id:12},'authorization',undefined),e=>e.prerequisite==='central');
 const readyForBilling={...allBeforeDocs,workflow_stages:JSON.stringify({reception:{completed_at:'now'},central:{completed_at:'now'},documents:{completed_at:'now'},authorization:{completed_at:'now'}})};
 assert.doesNotThrow(()=>assertStagePrerequisites(readyForBilling,'billing','COMPLETED'));
 assert.doesNotThrow(()=>assertStagePrerequisites({...p,continuation_of_id:12},'central',undefined));
});
test('reopening a prior stage requires later completed stages to be reopened first',()=>{
 const p={workflow_stages:JSON.stringify({reception:{completed_at:'now'},central:{completed_at:'now'},documents:{completed_at:'now'},authorization:{completed_at:'now'}})};
 assert.throws(()=>assertNoCompletedDependents(p,'central','COMPLETED'),e=>e.code==='TREATMENT_STAGE_DEPENDENT_CLOSED'&&e.dependent==='authorization');
 assert.throws(()=>assertNoCompletedDependents(p,'evaluation','COMPLETED'),e=>e.dependent==='central');
 assert.throws(()=>assertNoCompletedDependents(closed('central'),'evaluation','COMPLETED'),e=>e.dependent==='central');
 assert.doesNotThrow(()=>assertNoCompletedDependents({},'central','COMPLETED'));
 assert.throws(()=>assertNoCompletedDependents(p,'reception','COMPLETED'),e=>e.dependent==='evaluation');
 const downstreamReopened={workflow_stages:JSON.stringify({reception:{completed_at:'now'}})};
 assert.doesNotThrow(()=>assertNoCompletedDependents(downstreamReopened,'evaluation','COMPLETED'));
});
test('evaluation preserves completed Central data when completed or reserved by another editor',()=>{
 const {evaluationSync}=require('../services/treatmentStages');
 const values={requested_sessions:12,medical_diagnosis:'Clinical draft',treatment_days:'[]'};
 assert.deepEqual(evaluationSync({},values),values);
 assert.deepEqual(evaluationSync(closed('central'),values),{});
 assert.deepEqual(evaluationSync({},values,true),{});
 assert.deepEqual(values,{requested_sessions:12,medical_diagnosis:'Clinical draft',treatment_days:'[]'});
});


test('merged Central preserves completed documents and ignores preparation-only completion',()=>{
 const legacy={workflow_stages:{reception:{completed_at:'now'},central:{completed_at:'old'}}};
 assert.equal(state(legacy).central,undefined);
 assert.throws(()=>assertStagePrerequisites(legacy,'authorization','COMPLETED'),e=>e.prerequisite==='central');
 assert.doesNotThrow(()=>assertOpen(legacy,'central'));
 const completed={workflow_stages:{...legacy.workflow_stages,documents:{completed_at:'later',completed_by:7}}};
 assert.equal(state(completed).central.completed_at,'later');
 assert.equal(legacy.workflow_stages.central.completed_at,'old','State reading must not mutate stored legacy data');
 for(const stage of ['central','documents','evaluation_document']) assert.throws(()=>assertOpen(completed,stage),e=>e.status===409);
 assert.doesNotThrow(()=>assertStagePrerequisites(completed,'authorization','COMPLETED'));
});
