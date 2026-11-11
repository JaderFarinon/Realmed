const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare,records}=require('./verify-screen-pattern.cjs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE});try{
 for(const scenario of ['empty','no-consultation','no-physiotherapy','no-electro','unusable-guide','complete']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);
  const done={completed_at:'2026-11-10',completed_by:1};let writes=0,owned=false;
  const types=['CONSULTATION','PHYSIOTHERAPY','ELECTROSTIMULATION'];
  const procedures=types.map((type,i)=>({id:i+1,procedure_id:i+1,type,requested_quantity:1,code:'test'+i,description:type}));
  const documents=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'].map((document_type,i)=>({id:i+1,document_type,document_role:'GENERATED',is_usable:true,original_name:'Teste.pdf'}));
  if(scenario==='empty'){procedures.length=0;documents.length=0}
  if(scenario==='no-consultation')procedures.splice(0,1);
  if(scenario==='no-physiotherapy')procedures.splice(1,1);
  if(scenario==='no-electro')procedures.splice(2,1);
  if(scenario==='unusable-guide')documents[2]={...documents[2],document_role:'RECEIVED',is_usable:false};
  const fixture={...records[0],patient_id:1,documents,authorizations:[],procedures,pendingItems:[],history:[],workflow_stages:{reception:done}};
  await page.route('**/api/guide-processes/1',r=>{if(r.request().method()==='PUT')Object.assign(fixture,r.request().postDataJSON());return r.fulfill({json:fixture})});
  await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:{id:1,status:'COMPLETED'}}));
  await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{insurances:[],professionals:[],procedures:[]}}));
  for(const endpoint of ['document-generation-options','rotation'])await page.route('**/api/guide-processes/1/'+endpoint+'**',r=>r.fulfill({json:[]}));
  await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:[],partial:false}}));
  await page.route('**/api/guide-processes/1/edit-lock/*',r=>{if(r.request().method()==='POST')owned=true;if(r.request().method()==='DELETE')owned=false;return r.fulfill({json:{locked:owned,owned,expiresAt:Date.now()+60000}})});
  await page.route('**/api/guide-processes/1/stages/central/complete',r=>{writes++;fixture.workflow_stages.central=done;fixture.workflow_stages.documents=done;return r.fulfill({json:{stage:'central',completed:true,workflow_stages:fixture.workflow_stages}})});
  await page.goto(process.env.REALMED_UI_TEST_URL+'/central-de-guias/tratamentos/1');
  const central=page.locator('#treatment-tabpanel-central');await central.getByRole('heading',{name:'Procedimentos do tratamento',exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar aba',exact:true}).click();
  assert.equal((await central.locator('article > p:first-child').allTextContents()).filter(text=>text.includes('Obrigatória')).length,3);
  await central.getByRole('button',{name:'Finalizar etapa',exact:true}).click();await page.getByRole('button',{name:'Confirmar finalização',exact:true}).click();
  if(scenario==='complete'){await page.getByText('Etapa finalizada com sucesso.',{exact:true}).waitFor();assert.equal(writes,1);assert.equal(await page.getByRole('tab',{name:/Liberação/}).getAttribute('aria-disabled'),'false')}
  else{await page.locator('.notification-error').filter({hasText:'Complete a Central de Guias'}).waitFor();assert.equal(writes,0);assert.equal(await page.getByRole('tab',{name:/Liberação/}).getAttribute('aria-disabled'),'true')}
  assert.deepEqual(errors,[]);console.log('PASS central mandatory procedures/documents: '+scenario+'; APIs mocked.');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
