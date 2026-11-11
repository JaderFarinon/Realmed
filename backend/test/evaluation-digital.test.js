const test=require('node:test'),assert=require('node:assert/strict')
const {normalize,serialize,validate}=require('../services/evaluationValidation')
test('tablet evaluation preserves lateralities, annotations, schedule and signature across serialization',()=>{
 const input={chief_complaint:'Dor',pain_score:0,individual_monitoring:false,regions:[{region:'Joelho',laterality:'LEFT'}],body_marks:[{x:.4,y:.5,kind:'PAIN'}],signature_strokes:[[{x:.1,y:.2},{x:.8,y:.7}]],treatment_days:[{day:'MONDAY',enabled:true,time:'08:30'}],other_conduct:'Exercício orientado'}
 assert.deepEqual(serialize(normalize(input)),input)
})
test('draft requires no completed clinical fields; completion reports missing fields',()=>{
 assert.doesNotThrow(()=>validate({}))
 assert.throws(()=>validate({},true),e=>e.status===422&&e.missing.includes('CREFITO'))
 const valid={chief_complaint:'Dor',physical_exam:'Achados',severity:'MILD',care_risk:'LOW',therapeutic_goals:'Mobilidade',conducts:['Cinesioterapia'],evaluation_date:'2026-10-19',responsible_name:'Fisioterapeuta fictício',responsible_crefito:'000000 / PR'}
 assert.doesNotThrow(()=>validate(valid,true))
 assert.throws(()=>validate({...valid,conducts:['Outra']},true),e=>e.missing.includes('outra conduta'))
})
test('rejects malformed clinical data and out of bounds tablet annotations',()=>{
 for(const data of [{pain_score:11},{individual_monitoring:'false'},{body_marks:[{x:1.1,y:0,kind:'PAIN'}]},{signature_strokes:[[{x:0,y:-1}]]},{evaluation_date:'2026-02-30'},{regions:[{region:'Joelho',laterality:'invented'}]},{treatment_days:[{day:'MONDAY',enabled:true,time:'25:00'}]}])assert.throws(()=>normalize(data),e=>e.status===422)
 assert.throws(()=>normalize({conducts:'invalid'}),e=>e.status===422)
})
