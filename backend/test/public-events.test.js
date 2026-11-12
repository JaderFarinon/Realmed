const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeConfirmation}=require('../routes/public-events');
const key='45f93301-d011-418b-a5d0-57b57da8b329';
test('event confirmation accepts one participant and at most one named companion',()=>{
  assert.deepEqual(normalizeConfirmation({name:'  Pessoa   de Teste ',companions:[],submission_key:key}),{participant:'Pessoa de Teste',companions:[],key});
  assert.deepEqual(normalizeConfirmation({name:'Pessoa de Teste',companions:[' Acompanhante Um '],submission_key:key}).companions,['Acompanhante Um']);
});
test('event confirmation rejects blank names, unnamed companions, excessive lists and invalid retry keys',()=>{
  const valid={name:'Pessoa de Teste',companions:[],submission_key:key};
  assert.throws(()=>normalizeConfirmation({...valid,companions:['Acompanhante Um','Acompanhante Dois']}),/no máximo 1 acompanhante/);
  for(const value of [null,{}, {...valid,name:' '},{...valid,name:'x'.repeat(121)},{...valid,companions:[' ']},{...valid,companions:[{}]},{...valid,companions:'name'},{...valid,companions:Array(21).fill('Nome')},{...valid,submission_key:'invalid'}])assert.throws(()=>normalizeConfirmation(value));
});
