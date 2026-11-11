const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare,records}=require('./verify-screen-pattern.cjs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE});try{
 for(const scenario of ['individual','unified','preview','save-failure']){
  const page=await browser.newPage(),calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);await page.addInitScript(()=>window.open=()=>null);
  const done={completed_at:'2026-11-10',completed_by:1},types=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'];
  const fixture={...records[0],patient_id:1,requesting_doctor_id:null,doctor_name:null,referral_date:null,expected_start_date:null,documents:[],authorizations:[],procedures:[{id:1,procedure_id:1,type:'CONSULTATION',code:'100',description:'Consulta fictícia',requested_quantity:1}],pendingItems:[],history:[],workflow_stages:{reception:done}};let owned=false,fail=scenario==='save-failure';
  await page.route('**/api/guide-processes/1',async r=>{if(r.request().method()==='PUT'){calls.push('save');assert.ok(owned);const body=r.request().postDataJSON();assert.equal(Number(body.requesting_doctor_id),21);assert.equal(body.referral_date,'2026-11-18');assert.equal(body.expected_start_date,'2026-11-18');if(fail)return r.fulfill({status:422,json:{error:'Falha simulada ao salvar a Central.'}});Object.assign(fixture,body,{doctor_name:'Médico Fictício'})}return r.fulfill({json:fixture})});
  await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:{id:1,status:'COMPLETED'}}));
  await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{insurances:[],procedures:[],professionals:[{id:21,full_name:'Médico Fictício',council:'CRM',council_number:'12345',state:'PR'}]}}));
  await page.route('**/api/guide-processes/1/document-generation-options',r=>r.fulfill({json:types.map(document_type=>({id:'sadt-v1:'+document_type,name:document_type,version:1,document_type}))}));
  await page.route('**/api/guide-processes/1/rotation**',r=>r.fulfill({json:[]}));
  await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:[],partial:false}}));
  await page.route('**/api/guide-processes/1/edit-lock/*',r=>{if(r.request().method()==='POST')owned=true;if(r.request().method()==='DELETE')owned=false;return r.fulfill({json:{locked:owned,owned,expiresAt:Date.now()+60000}})});
  const checkSaved=()=>{assert.equal(Number(fixture.requesting_doctor_id),21);assert.equal(fixture.referral_date,'2026-11-18');assert.equal(fixture.expected_start_date,'2026-11-18')};
  await page.route('**/api/guide-processes/1/code-review-options',r=>{checkSaved();calls.push('review');return r.fulfill({json:[{id:1,procedure_id:1,type:'CONSULTATION',code:'100',source_code:'100',description:'Consulta fictícia',requested_quantity:1}]})});
  await page.route('**/api/guide-processes/1/documents/preview',r=>{checkSaved();calls.push('preview');return r.fulfill({contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'})});
  await page.route('**/api/guide-processes/1/documents/generate',r=>{checkSaved();calls.push('generate');return r.fulfill({json:{id:101,document_type:'CONSULTATION_GUIDE'}})});
  await page.goto(process.env.REALMED_UI_TEST_URL+'/central-de-guias/tratamentos/1');const central=page.locator('#treatment-tabpanel-central');await central.getByRole('heading',{name:'Procedimentos do tratamento',exact:true}).waitFor();await page.getByRole('button',{name:'Editar aba',exact:true}).click();
  await central.locator('#preparation-1-requesting_doctor_id').selectOption('21');await central.getByLabel('Início previsto',{exact:true}).fill('18/11/2026');await central.getByLabel('Data do encaminhamento',{exact:true}).fill('18/11/2026');
  const card=central.locator('#treatment-1-document-CONSULTATION_GUIDE');
  if(scenario==='unified'){await card.getByRole('checkbox').check();await central.locator('#treatment-1-document-PHYSIOTHERAPY_GUIDE').getByRole('checkbox').check();await central.getByRole('button',{name:'Gerar guia unificada',exact:true}).click()}
  else if(scenario==='preview')await card.getByRole('button',{name:/Pré-visualizar/}).click();
  else await card.getByRole('button',{name:'Gerar guia faltante',exact:true}).click();
  if(scenario==='save-failure'){await page.getByText('Falha simulada ao salvar a Central.',{exact:true}).waitFor();assert.deepEqual(calls,['save']);assert.equal(await page.getByRole('dialog',{name:'Conferir códigos da guia',exact:true}).count(),0);assert.equal(await central.locator('#preparation-1-requesting_doctor_id').inputValue(),'21');fail=false;await card.getByRole('button',{name:'Gerar guia faltante',exact:true}).click()}
  if(scenario==='preview'){await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Salvando')));assert.deepEqual(calls,['save','preview'])}
  else{const modal=page.getByRole('dialog',{name:'Conferir códigos da guia',exact:true});await modal.getByRole('checkbox',{name:/Conferi os procedimentos/}).check();await modal.getByRole('button',{name:'Gerar guia conferida',exact:true}).click();await modal.waitFor({state:'hidden'});assert.deepEqual(calls,scenario==='save-failure'?['save','save','review','generate']:['save','review','generate'])}
  assert.deepEqual(errors,[]);console.log('PASS save current physician/dates before document '+scenario+'; persisted API data used; APIs mocked.');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
