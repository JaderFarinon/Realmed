const test=require('node:test'),assert=require('node:assert/strict');
const {sessionProgress,physioRead}=require('../../integrations/stenci/physioRead');
const {generateText,signedText}=require('../services/physioEvolutionText');
const answers={arrival:'Queixa informada.',findings:'Medidas observadas.',procedures:'Condutas e parâmetros registrados.',response:'Resposta observada.',events:'Intercorrências descritas.',guidance:'Orientações discutidas.',plan:'Plano registrado.',painBefore:'5',painAfter:'3'};
test('session counter comes from explicit Stenci bundle; equality detects any final session',()=>{
 assert.deepEqual(sessionProgress({current:10,total:11}),{current:10,total:11,final:false});
 assert.equal(sessionProgress({current:11,total:11}).final,true);
 for(const bundle of [null,{}, {current:0,total:10},{current:12,total:10},{current:1.5,total:10},{current:'10',total:10}])assert.equal(sessionProgress(bundle),null);
});
test('counter lookup is scoped to appointment, patient and schedule and preserves empty positions',async()=>{
 const scheduleId='a'.repeat(24),date='2026-11-12',calls=[];
 const row={id:'appt',patient:{id:'patient',name:'Teste'},startDate:date+'T13:00:00-03:00',status:'confirmed'};
 let counter={...row,scheduleId,bundle:{current:10,total:10}};
 const client={assertAuthenticated(){},request:async(path,options)=>{calls.push({path,options});return {items:path.endsWith('attendances')?[counter]:[row,{isSlot:true,startDate:date+'T13:01:00-03:00'}]}}};
 let result=await physioRead(client,{date,scheduleId});assert.equal(result.items[0].session_progress.final,true);assert.equal(result.slots.length,2);
 assert.deepEqual(calls[1].options.query,{date,scheduleId});
 counter={...counter,patient:{id:'other'}};assert.equal((await physioRead(client,{date,scheduleId})).items[0].session_progress,null);
 counter={...counter,patient:row.patient,scheduleId:'b'.repeat(24)};assert.equal((await physioRead(client,{date,scheduleId})).items[0].session_progress,null);
});
test('daily narrative uses only explicit answers without inferring discharge or a local session number',()=>{
 const text=generateText(answers,{date:'2026-11-12',progress:null});
 assert.match(text,/Dor antes: 5\/10. Dor após: 3\/10/);assert.match(text,/Condutas e parâmetros registrados/);assert.ok(!text.includes('Sessão'));assert.ok(!text.includes('Alta'));
 assert.throws(()=>generateText({...answers,events:''},{date:'2026-11-12'}),{code:'PHYSIO_EVOLUTION_INVALID'});
 assert.throws(()=>generateText({...answers,painAfter:''},{date:'2026-11-12'}),{code:'PHYSIO_EVOLUTION_INVALID'});
 assert.match(generateText({...answers,painAfter:'not_assessed'},{date:'2026-11-12'}),/Dor após: não avaliada/);
});
test('final session requires a reassessment and signature uses the authenticated professional',()=>{
 const progress={current:11,total:11,final:true};assert.throws(()=>generateText(answers,{date:'2026-11-12',progress}),/Comparação/);
 const text=generateText({...answers,comparison:'Melhora descrita.',goals:'Objetivos registrados.',limitations:'Limitações registradas.',outcome:'Continuidade justificada.'},{date:'2026-11-12',progress});
 assert.match(text,/Sessão 11\/11/);assert.match(text,/REAVALIAÇÃO AO FINAL/);assert.match(text,/Continuidade justificada/);
 const result=signedText(text,{professional_name:'Fisio Teste',council_number:'123-TEST',state:'PR'},'2026-11-12');assert.match(result,/Fisioterapeuta responsável: Fisio Teste/);assert.match(result,/CREFITO: 123-TEST — PR/);
 assert.throws(()=>signedText(text,{professional_name:'Fisio Teste'},'2026-11-12'),/CREFITO/);
});
