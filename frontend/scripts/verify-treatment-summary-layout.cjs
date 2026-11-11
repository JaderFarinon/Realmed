const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const {prepare,records}=require('./verify-screen-pattern.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);
  const fixture={...records[0],patient_id:1,patient_name:'Paciente com Nome Completo de Teste',doctor_name:'Dr. Solicitante',requested_sessions:10,authorized_sessions:8,performed_sessions:3,documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{reception:{completed_at:'2026-11-09',completed_by:1}}};
  let owned=false;
  await page.route('**/api/guide-processes/1',r=>r.fulfill({json:fixture}));
  await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:null}));
  await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{insurances:[],professionals:[],procedures:[]}}));
  await page.route('**/api/guide-processes/1/document-generation-options',r=>r.fulfill({json:[]}));
  await page.route('**/api/guide-processes/1/rotation**',r=>r.fulfill({json:[]}));
  await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:[],partial:false}}));
  await page.route('**/api/guide-processes/1/edit-lock/*',r=>{if(r.request().method()==='POST')owned=true;if(r.request().method()==='DELETE')owned=false;return r.fulfill({json:{locked:owned,owned,owner:'Teste',expiresAt:Date.now()+60000}})});
  await page.goto((process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5186')+'/central-de-guias/tratamentos/1');
  const card=page.locator('.treatment-identity'),summary=card.locator('.treatment-identity-more > summary');
  await card.waitFor();assert.equal(await page.getByRole('heading',{name:'Resumo Tratamento',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Dados do Paciente',exact:true}).count(),0);assert.equal(await page.locator('#treatment-summary,.treatment-patient-card').count(),0);
  assert.equal(await card.locator('#treatment-patient-name').innerText(),fixture.patient_name);
  assert.deepEqual(await card.locator('.treatment-identity-sessions dd').allTextContents(),['10','8','3','5']);
  assert.equal(await card.locator('.treatment-edit-notice').count(),1);
  await summary.click();await card.getByText('Dr. Solicitante',{exact:true}).waitFor();await card.getByText('Início previsto',{exact:true}).waitFor();await card.getByText('Prioridade',{exact:true}).waitFor();await card.getByText('Situação do tratamento',{exact:true}).waitFor();await summary.click();
  await page.getByRole('button',{name:'Editar aba',exact:true}).click();const complaint=page.getByLabel('Queixa principal / motivo do atendimento',{exact:true});await complaint.fill('Rascunho preservado ao consultar o cabeçalho');
  await summary.click();await summary.click();assert.equal(await complaint.inputValue(),'Rascunho preservado ao consultar o cabeçalho');
  for(const close of await page.locator('.notification-close').all())await close.click();await page.waitForTimeout(220);
  await page.screenshot({path:'.deployment/treatment-header-unified-desktop.png'});
  for(const viewport of [{width:1024,height:600},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(250);await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(150);
   const metrics=await page.evaluate(()=>{const c=document.querySelector('.treatment-context').getBoundingClientRect(),n=document.querySelector('#treatment-patient-name');return{top:c.top,bottom:c.bottom,width:document.documentElement.scrollWidth,size:parseFloat(getComputedStyle(n).fontSize)}});
   assert.ok(metrics.width<=viewport.width+2);assert.ok(metrics.top>=0&&metrics.top<=10);assert.ok(metrics.bottom<viewport.height*0.65,'Keep enough room below the sticky identity');assert.ok(metrics.size>=28);
   await summary.click();await card.getByText('Dr. Solicitante',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await summary.click();
   await page.screenshot({path:'.deployment/treatment-header-unified-'+viewport.width+'.png'});
  }
  assert.deepEqual(errors,[]);console.log('PASS one sticky patient card, merged counters/remaining sessions, clinical/administrative details, embedded editor notice, no duplicate cards, prominent full name, unchanged draft and landscape/mobile layout.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
