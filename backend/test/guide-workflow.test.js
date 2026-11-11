const test = require('node:test')
const assert = require('node:assert/strict')

Object.assign(process.env, { DB_HOST: 'localhost', DB_USER: 'test', DB_PASS: 'test', DB_NAME: 'test', DB_PORT: '3306' })
const { documentTransition, isDocumentComplete } = require('../services/guideWorkflow')

test('a new or incomplete process remains in preparation', () => {
  assert.deepEqual(documentTransition(false, 'NOT_READY'), { document_status: 'INCOMPLETE', authorization_status: 'NOT_READY' })
  assert.deepEqual(documentTransition(false, 'READY'), { document_status: 'INCOMPLETE', authorization_status: 'NOT_READY' })
})

test('the last required document automatically exposes the process to billing', () => {
  assert.deepEqual(documentTransition(true, 'NOT_READY'), { document_status: 'COMPLETE', authorization_status: 'READY' })
})

test('document replacement does not reset an authorization already in progress', () => {
  assert.deepEqual(documentTransition(true, 'IN_PROGRESS'), { document_status: 'COMPLETE', authorization_status: 'IN_PROGRESS' })
})

test('a received guide needing adjustment is not usable until a generated guide exists', () => {
  const documents = [
    { document_type: 'PHYSIOTHERAPY_GUIDE', document_role: 'RECEIVED', is_usable: false },
    { document_type: 'CONSULTATION_GUIDE', document_role: 'RECEIVED', is_usable: true },
    { document_type: 'ELECTROSTIMULATION', document_role: 'RECEIVED', is_usable: true },
    { document_type: 'PHYSIO_ASSESSMENT', document_role: 'RECEIVED', is_usable: true },
  ]
  assert.equal(isDocumentComplete(documents), false)
  documents.push({ document_type: 'PHYSIOTHERAPY_GUIDE', document_role: 'GENERATED', is_usable: true })
  assert.equal(isDocumentComplete(documents), true)
})

test('received and generated versions can remain active at the same time', () => {
  const documents = [
    { document_type: 'PHYSIOTHERAPY_GUIDE', document_role: 'RECEIVED', is_usable: false },
    { document_type: 'PHYSIOTHERAPY_GUIDE', document_role: 'GENERATED', is_usable: true },
  ]
  assert.equal(documents.filter(document => !document.deleted_at).length, 2)
})


test('all three guides are required; unrelated optional files never block', () => {
  const guides = [
    {document_type:'CONSULTATION_GUIDE',document_role:'RECEIVED',is_usable:1},
    {document_type:'PHYSIOTHERAPY_GUIDE',document_role:'GENERATED'},
    {document_type:'ELECTROSTIMULATION',document_role:'GENERATED'},
  ];
  assert.equal(isDocumentComplete(guides),true);
  for(const type of ['PHYSIO_ASSESSMENT','PHYSIOTHERAPY_EVALUATION','INSURANCE_CARD','OTHER'])
    assert.equal(isDocumentComplete([...guides,{document_type:type,document_role:'RECEIVED',is_usable:false}]),true);
  assert.equal(isDocumentComplete([guides[0]]),false);
  assert.equal(isDocumentComplete([guides[0],{...guides[1],deleted_at:'2026-10-27'}]),false);
});


test('all cycles including continuations require their own three usable guides',()=>{
  const {requiredForProcess}=require('../services/guideWorkflow');
  const requirements=requiredForProcess({continuation_of_id:1});
  assert.deepEqual(requirements,['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION']);
  assert.equal(isDocumentComplete([],requirements),false);
  assert.equal(isDocumentComplete([{document_type:'PHYSIOTHERAPY_GUIDE',document_role:'RECEIVED',is_usable:true}],requirements),false);
  assert.equal(isDocumentComplete(requirements.map(document_type=>({document_type,document_role:'GENERATED'})),requirements),true);
  assert.deepEqual(documentTransition(false,'READY',true),{document_status:'INCOMPLETE',authorization_status:'READY'});
  assert.deepEqual(requiredForProcess({}),requirements);
});
