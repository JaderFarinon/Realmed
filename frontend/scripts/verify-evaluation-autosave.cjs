const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const {prepare,records}=require('./verify-screen-pattern.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE});
 try{
  const page=await browser.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  const fixture={...records[0],patient_id:1,documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{reception:{completed_at:'2026-11-09'}}};let evaluation=null,owned=false,fail=false,releaseSave;
  const delayed=new Promise(resolve=>releaseSave=resolve);
  await page.route('**/api/guide-processes/1',r=>r.fulfill({json:fixture}));
  await page.route('**/api/guide-processes/1/evaluation**',async r=>{
   if(r.request().url().endsWith('/options'))return r.fulfill({json:{patient:{},professionals:[]}});
   if(r.request().method()==='GET')return r.fulfill({json:evaluation});
   assert.ok(!r.request().url().endsWith('/complete'),'Autosave must never finalize');assert.ok(owned);
   writes.push(r.request().postDataJSON());if(writes.length===1)await delayed;
   if(fail)return r.fulfill({status:500,json:{error:'Falha simulada no salvamento.'}});
   evaluation={...writes.at(-1),id:1,status:'DRAFT'};return r.fulfill({json:evaluation});
  });
  await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{insurances:[],professionals:[],procedures:[]}}));
  for(const endpoint of ['rotation','document-generation-options'])await page.route('**/api/guide-processes/1/'+endpoint+'**',r=>r.fulfill({json:[]}));
  await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:[],partial:false}}));
  await page.route('**/api/guide-processes/1/edit-lock/*',r=>{if(r.request().method()==='POST')owned=true;if(r.request().method()==='DELETE')owned=false;return r.fulfill({json:{locked:owned,owned,owner:'Teste',expiresAt:Date.now()+86400000}})});
  await page.goto(process.env.REALMED_UI_TEST_URL+'/central-de-guias/tratamentos/1');const complaint=page.getByLabel('Queixa principal / motivo do atendimento',{exact:true});await complaint.waitFor();
  await page.clock.runFor(60000);assert.equal(writes.length,0,'Readers do not autosave');
  await page.getByRole('button',{name:'Editar aba',exact:true}).click();await complaint.fill('Primeiro rascunho');
  await page.clock.runFor(59999);assert.equal(writes.length,0,'Wait a full minute');await page.clock.runFor(1);await page.waitForFunction(()=>document.querySelector('.evaluation-actions').textContent.includes('Salvando'));
  assert.equal(writes.length,1);assert.equal(writes[0].chief_complaint,'Primeiro rascunho');
  await complaint.fill('Texto digitado durante a gravação');assert.ok(await complaint.isEnabled());assert.ok(await complaint.evaluate(el=>el===document.activeElement));
  await page.clock.runFor(60000);assert.equal(writes.length,1,'No overlapping requests');releaseSave();
  await page.getByText('Rascunho salvo automaticamente.',{exact:true}).waitFor();assert.equal(await complaint.inputValue(),'Texto digitado durante a gravação');
  assert.ok(await complaint.evaluate(el=>el===document.activeElement),'Do not steal focus');assert.match(await page.locator('.evaluation-actions').innerText(),/alterações não salvas/);
  await page.clock.runFor(60000);await page.waitForFunction(()=>!document.querySelector('.evaluation-actions').textContent.includes('alterações não salvas'));assert.equal(writes.length,2);assert.equal(writes[1].chief_complaint,'Texto digitado durante a gravação');
  await page.clock.runFor(60000);assert.equal(writes.length,2,'Clean drafts do not autosave');
  fail=true;await complaint.fill('Preservar se falhar');await page.clock.runFor(60000);await page.getByText('Falha simulada no salvamento.',{exact:true}).waitFor();assert.equal(await complaint.inputValue(),'Preservar se falhar');assert.match(await page.locator('.evaluation-actions').innerText(),/alterações não salvas/);
  fail=false;await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByText('Rascunho salvo com sucesso.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Terminar edição',exact:true}).click();const before=writes.length;await page.clock.runFor(120000);assert.equal(writes.length,before,'Stop after releasing lease');
  await page.getByRole('tab',{name:'Histórico',exact:true}).click();await page.clock.runFor(60000);assert.equal(writes.length,before,'Stop outside evaluation');
  assert.deepEqual(errors,[]);console.log('PASS one-minute evaluation autosave, no reader/clean writes, no overlap, continued typing and focus, retained unsaved edits, failure recovery/manual save, stopped outside edit/active tab. APIs mocked.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
