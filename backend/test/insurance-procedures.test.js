const test=require('node:test'),assert=require('node:assert/strict')
const {validate}=require('../services/insuranceProcedureService'),codes=require('../services/procedureCodeService')
test('procedure input keeps leading zeros and deduplicates replacement codes without clinical inference',()=>{
 const result=validate({code:'01567',description:'Procedimento',replaces:['01234','01234','04321']})
 assert.equal(result.code,'01567');assert.deepEqual(result.replaces,['01234','04321']);assert.equal(result.type,'PHYSIOTHERAPY')
})
test('rejects self replacement, invalid codes and malformed source lists',()=>{
 for(const replaces of [['1567'],['<script>'],'1234'])assert.throws(()=>validate({code:'1567',description:'Procedimento',replaces}),e=>e.status===422)
})
test('1234 becomes 1567 only in the configured insurer, keeping quantity and without chaining',()=>{
 const source={code:'1234',description:'Original',type:'PHYSIOTHERAPY',requested_quantity:10}
 const rule={id:1,insurance_provider_id:10,source_code:'1234',target_procedure_id:2,target_code:'1567',target_description:'Descrição do convênio',target_type:'PHYSIOTHERAPY',priority:1,active:true,target_active:true}
 const result=codes.choose(source,[rule],10);assert.equal(result.code,'1567');assert.equal(result.requested_quantity,10);assert.equal(result.source_code,'1234');assert.equal(codes.choose(source,[rule],11).code,'1234')
})
