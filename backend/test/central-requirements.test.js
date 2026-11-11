const test=require('node:test'),assert=require('node:assert/strict');
const {missing,assertComplete,proceduresSQL}=require('../services/centralRequirements');
const types=['CONSULTATION','PHYSIOTHERAPY','ELECTROSTIMULATION'];
const docs=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'].map(document_type=>({document_type,document_role:'GENERATED'}));
const procedures=types.map(type=>({type,requested_quantity:1}));
test('central requires each procedure type and each usable document independently',()=>{
 assert.deepEqual(missing(procedures,docs),[]);
 for(let i=0;i<3;i++){
  assert.equal(missing(procedures.filter((_,j)=>i!==j),docs).length,1);
  assert.equal(missing(procedures,docs.filter((_,j)=>i!==j)).length,1);
  assert.equal(missing(procedures,docs.map((d,j)=>i===j?{...d,deleted_at:'2026-11-10'}:d)).length,1);
  assert.equal(missing(procedures,docs.map((d,j)=>i===j?{...d,document_role:'RECEIVED',is_usable:0}:d)).length,1);
 }
 assert.equal(missing([...procedures,{type:'OTHER',requested_quantity:5}],docs).length,0);
 assert.equal(missing(procedures.map(p=>({...p,requested_quantity:0})),docs).length,3);
 assert.deepEqual(missing(procedures,docs.map(d=>({...d,document_role:'RECEIVED',is_usable:1}))),[]);
 for(const type of types)assert.ok(proceduresSQL.includes(type));
});
test('API central requirement assertion rejects missing types instead of inferring from documents',async()=>{
 let rows=procedures.slice(1);
 const db=table=>{const q={join:()=>q,where:()=>q,whereNull:()=>q,select:()=>Promise.resolve(rows),then:(resolve,reject)=>Promise.resolve(table==='guide_process_documents'?docs:rows).then(resolve,reject)};return q;};
 await assert.rejects(assertComplete(db,1),e=>e.status===422&&e.code==='CENTRAL_REQUIREMENTS_MISSING'&&e.missing.length===1);
 rows=procedures;await assertComplete(db,1);
});
