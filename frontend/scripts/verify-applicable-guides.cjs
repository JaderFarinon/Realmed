const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare,records}=require('./verify-screen-pattern.cjs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE});try{
 for(const scenario of ['without-electro','with-electro','continuation']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);
  const done={completed_at:'2026-11-10',completed_by:1};const fixture={...records[0],patient_id:1,continuation_of_id:scenario==='continuation'?42:null,documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{reception:done,central:done,documents:done,authorization:done}};
  const guides=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'].map((type,i)=>({key:'1:'+type,guide_process_id:1,guide_number:1,document_type:type,label:['Consulta / Avaliação','Fisioterapia','Eletroestimulação'][i],applicable:i===0?scenario!=='continuation':i===1||scenario==='with-electro',status:i===2?'DENIED':'AUTHORIZED',status_label:i===2?'Não aplicável':'A faturar',files:[],revision:0,eligible:i!==2,completion_ready:i!==2}));
  await page.route('**/api/guide-processes/1',r=>r.fulfill({json:fixture}));
  await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:{id:1,status:'COMPLETED'}}));
  await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{insurances:[],professionals:[],procedures:[]}}));
  for(const endpoint of ['document-generation-options','rotation'])await page.route('**/api/guide-processes/1/'+endpoint+'**',r=>r.fulfill({json:[]}));
  await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:guides,partial:scenario==='with-electro'}}));
  await page.route('**/api/guide-processes/1/billing',r=>r.fulfill({json:{process_id:1,items:guides,complete:false}}));
  await page.route('**/api/guide-processes/1/edit-lock/*',r=>{assert.equal(r.request().method(),'GET');return r.fulfill({json:{locked:false,owned:false}})});
  await page.goto(process.env.REALMED_UI_TEST_URL+'/central-de-guias/tratamentos/1?billing=1');
  const bill=page.locator('#treatment-tabpanel-billing');await bill.getByRole('cell',{name:'Fisioterapia',exact:true}).waitFor();
  const expected=scenario==='with-electro'?3:scenario==='continuation'?1:2;
  assert.equal(await bill.locator('tbody tr[aria-selected]').count(),expected);
  assert.equal(await bill.getByRole('cell',{name:'Eletroestimulação',exact:true}).count(),scenario==='with-electro'?1:0);
  await page.getByRole('tab',{name:/Liberação/}).click();const auth=page.locator('#treatment-tabpanel-authorization');await auth.getByRole('cell',{name:'Fisioterapia',exact:true}).waitFor();
  assert.equal(await auth.locator('tbody tr[aria-selected]').count(),expected);assert.equal(await auth.getByRole('cell',{name:'Eletroestimulação',exact:true}).count(),scenario==='with-electro'?1:0);
  assert.equal(await auth.getByRole('checkbox',{name:'Selecionar Eletroestimulação para alterar status',exact:true}).count(),scenario==='with-electro'?1:0);
  assert.deepEqual(errors,[]);console.log('PASS applicable guide visibility in authorization/billing: '+scenario+'; no API mutations.');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
