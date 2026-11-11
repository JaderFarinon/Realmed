const path = require('node:path')
const metadata = require('../templates/sadt/guia-sadt.fields.json')
const BUILTIN_KEY = 'SADT_STANDARD_V1'
const builtinFile = path.resolve(__dirname, '../templates/sadt/guia-sadt-base.pdf')
const names = { CONSULTATION_GUIDE: 'Guia SADT de consulta', PHYSIOTHERAPY_GUIDE: 'Guia SADT de fisioterapia', ELECTROSTIMULATION: 'Guia SADT de eletroestimulação' }
// ANS TUSS 26: https://fhir-hm.ans.gov.br/CodeSystem-tuss-26.html
function councilCode(value) {
  const codes={CRESS:'01',COREN:'02',CRF:'03',CREFONO:'04',CREFITO:'05',CRM:'06',CRN:'07',CRO:'08',CRP:'09',CRBIO:'11',CRBM:'12',CREF:'13',CRMV:'14',CRTR:'15'}
  const normalized=String(value||'').trim().toUpperCase()
  return codes[normalized] || (/^(0[1-9]|1[0-5])$/.test(normalized)?normalized:'')
}
function referenceFor(type) { return `sadt-v1:${type}` }
function field(key, x, y, width, options = {}) { return { field_key:key, page:1, x,y,width,font_size:7,options:{fit:true,minFontSize:4.5,...options} } }
function cells(key, number, row = 0, options = {}) {
  const source = metadata.inputCells[String(number)]?.[row]
  if (!source?.centers.length) throw new Error(`Coordenadas SADT ausentes: campo ${number}, linha ${row+1}`)
  return field(key,source.centers[0],source.baseline-7,0,{characterCells:source.centers,baseline:source.baseline,...options})
}
function templateFor(reference) {
  const type = Object.keys(names).find(type => reference === referenceFor(type))
  if (!type) return null
  const fields = [
    cells('INSURANCE_ANS_REGISTRATION',1), cells('PATIENT_CARD_NUMBER',8),
    cells('PATIENT_CARD_EXPIRATION',9,0,{skipCharacters:'/'}),
    field('PATIENT_NAME',322,114,280),
    field('DOCTOR_NAME',30,166,222), cells('DOCTOR_COUNCIL',16), cells('DOCTOR_COUNCIL_NUMBER',17),
    cells('DOCTOR_STATE',18), cells('DOCTOR_CBO',19),
    cells('REFERRAL_DATE',22,0,{skipCharacters:'/'}),
    field('MEDICAL_DIAGNOSIS',177,196,628,{multiline:true,height:11}),
    {field_key:'INSURANCE_LOGO',page:1,...metadata.insuranceLogo,options:{fit:'contain'}},
    {field_key:'DOCTOR_SIGNATURE',page:1,x:565,y:164,width:242,height:11,options:{fit:'contain'}},
  ]
  for(let index=0;index<5;index++) {
    const prefix = `PROCEDURE_${index+1}_`
    fields.push(cells(prefix+'CODE',25,index,{skipCharacters:' .-/'}), field(prefix+'DESCRIPTION',168,metadata.inputCells['25'][index].baseline-7,526,{height:9.6,multiline:true,mask:true}), cells(prefix+'REQUESTED_QUANTITY',27,index,{cellAlign:'RIGHT'}), cells(prefix+'AUTHORIZED_QUANTITY',28,index,{cellAlign:'RIGHT'}))
  }
  return {id:null,selection_id:reference,builtin_key:BUILTIN_KEY,name:names[type],document_type:type,insurance_provider_id:null,active:true,version:1,template_file_path:path.basename(builtinFile),fields}
}
function options() { return Object.keys(names).map(type => {const template=templateFor(referenceFor(type));return {...template,id:template.selection_id,fields:undefined,template_file_path:undefined} }) }
function selectProcedures(type, procedures) {
  const types = Array.isArray(type) ? type : [type]
  const allowed = types.map(value => ({CONSULTATION_GUIDE:'CONSULTATION',PHYSIOTHERAPY_GUIDE:'PHYSIOTHERAPY',ELECTROSTIMULATION:'ELECTROSTIMULATION'})[value]).filter(Boolean)
  return procedures.filter(procedure => allowed.includes(procedure.type))
}
function unifiedTypes(value) {
  if (value === undefined) return null
  if (!Array.isArray(value) || value.length < 2 || value.length > 3 || new Set(value).size !== value.length || value.some(type => !Object.hasOwn(names, type)))
    throw Object.assign(new Error('Selecione duas ou três guias distintas para unificar.'), {status:422})
  return Object.keys(names).filter(type => value.includes(type))
}
module.exports = { BUILTIN_KEY, builtinFile, templateFor, options, referenceFor, selectProcedures, councilCode, unifiedTypes }
