const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare, records } = require('./verify-screen-pattern.cjs')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
const types = ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION']
const names = ['Guia SADT de consulta','Guia SADT de fisioterapia','Guia SADT de eletroestimulação']
;(async()=>{
 const browser=await chromium.launch({headless:true})
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768}})
  await prepare(page)
  const treatment={...records[0],insurance_provider_id:1,documents:[{id:99,document_type:'PHYSIOTHERAPY_GUIDE',document_role:'RECEIVED',source:'UPLOADED',original_name:'Guia-original-recebida.pdf',is_usable:false,created_at:'2026-10-19'}],authorizations:[],procedures:[],pendingItems:[],history:[]}
  let missing=true,versions=0,requests=0,previewRequests=0
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/guide-processes/1/**',async route=>{
   const p=new URL(route.request().url()).pathname
   const send=(status,data)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
   if(p.endsWith('/document-generation-options'))return send(200,types.map((type,index)=>({id:'sadt-v1:'+type,builtin_key:'SADT_STANDARD_V1',name:names[index],version:1,document_type:type,insurance_provider_id:null})))
   if(p.endsWith('/evaluation'))return send(200,null)
   if(p.endsWith('/code-review-options'))return send(200,[{id:1,procedure_id:1,code:'11111111',source_code:'11111111',description:'Consulta fictícia',type:'CONSULTATION',requested_quantity:1,mapping_rule_id:null}])
   if(p.endsWith('/documents/generate')){
    assert.equal(route.request().method(),'POST');assert.equal(route.request().postDataJSON().template_id,'sadt-v1:CONSULTATION_GUIDE');requests++
    await new Promise(resolve=>setTimeout(resolve,160))
    if(missing)return send(422,{error:'Campos faltantes.',missing:['carteirinha']})
    const document={id:900+versions,document_type:'CONSULTATION_GUIDE',document_role:'GENERATED',source:'GENERATED',document_version:++versions,original_name:'Guia-SADT-de-consulta-v'+versions+'.pdf',mime_type:'application/pdf',created_at:'2026-10-19',is_usable:true}
    treatment.documents.push(document);return send(201,document)
   }
   if(p.endsWith('/documents/preview')){previewRequests++;assert.equal(route.request().postDataJSON().template_id,'sadt-v1:CONSULTATION_GUIDE');return route.fulfill({status:200,contentType:'application/pdf',body:fs.readFileSync(path.resolve(__dirname,'../../backend/templates/sadt/guia-sadt-base.pdf'))})}
   throw new Error('Unexpected SADT test request: '+p)
  })
  await page.route('**/api/guide-processes/1',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(treatment)}))
  await page.goto(origin+'/central-de-guias/tratamentos')
  const action=page.getByRole('button',{name:'Gerar guias do tratamento selecionado',exact:true})
  assert.equal(await action.isDisabled(),true)
  await page.locator('tbody tr[aria-selected]').first().waitFor();await page.waitForTimeout(200)
  await page.locator('tbody tr[aria-selected]').first().click();await action.click()
  await page.waitForURL('**/central-de-guias/tratamentos/1?documents=1')
  await page.locator('#treatment-documents').getByRole('heading',{name:'2. Documentos para liberação',exact:true}).waitFor()
  const card=page.getByRole('article',{name:/Guia de consulta/i})
  await card.getByRole('button',{name:'Gerar guia faltante',exact:true}).waitFor()
  await card.getByRole('button',{name:'Gerar guia faltante',exact:true}).click()
  await page.getByRole('dialog').getByLabel('Conferi os procedimentos, códigos e quantidades desta guia.').check()
  await page.getByRole('dialog').getByRole('button',{name:'Gerar guia conferida',exact:true}).click()
  await page.getByText('Não foi possível gerar a guia. Faltam: carteirinha.',{exact:true}).waitFor()
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click()
  assert.equal(versions,0);missing=false
  await card.getByRole('button',{name:'Gerar guia faltante',exact:true}).click()
  await page.getByRole('dialog').getByLabel('Conferi os procedimentos, códigos e quantidades desta guia.').check()
  await page.getByRole('dialog').getByRole('button',{name:'Gerar guia conferida',exact:true}).click()
  assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Gerar guia conferida',exact:true}).isDisabled(),true)
  await card.getByRole('button',{name:'Gerar nova versão',exact:true}).waitFor()
  assert.equal(versions,1)
  await card.getByRole('button',{name:'Gerar nova versão',exact:true}).click()
  await page.getByRole('dialog').getByLabel('Conferi os procedimentos, códigos e quantidades desta guia.').check()
  await page.getByRole('dialog').getByRole('button',{name:'Gerar guia conferida',exact:true}).click()
  await card.getByText('Guia-SADT-de-consulta-v2.pdf',{exact:true}).waitFor()
  assert.equal(versions,2);assert.equal(requests,3)
  await page.getByText('Guia-original-recebida.pdf',{exact:true}).waitFor()
  await page.evaluate(()=>{window.open=()=>null})
  await card.getByRole('button',{name:'Pré-visualizar',exact:true}).click()
  await page.waitForTimeout(200);assert.equal(previewRequests,1)
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await card.scrollIntoViewIfNeeded()
  const output=path.resolve(__dirname,'../../.deployment/sadt-integration-qa');fs.mkdirSync(output,{recursive:true})
  await page.screenshot({path:path.join(output,'guias-mobile.png')})
  assert.deepEqual(errors,[])
  console.log('PASS SADT UI: treatment selection, missing data, generation, repeat-click guard, versions, received original, preview and mobile.')
 } finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
