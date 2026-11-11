const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const {prepare,records}=require('./verify-screen-pattern.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE});
 try{
  for(const scenario of ['complete','locked','denied','invalid']){
   const page=await browser.newPage(),calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
   await prepare(page,scenario==='denied'?{id:999,role:'user',username:'viewer',permissionsEnabled:true,permissions:[{moduleKey:'guide_processes',canView:true,canEdit:false,canCreate:false,canDelete:false}]}:undefined);
   const fixture={...records[0],patient_id:1,documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{}};let owned=false,reads=0;
   await page.route('**/api/guide-processes/1',r=>{assert.equal(r.request().method(),'GET','No unnecessary save or stale PATCH');reads++;return r.fulfill({json:{...fixture,assessment_date:reads>1?'2026-11-10':fixture.assessment_date}})});
   for(const endpoint of ['evaluation','rotation','document-generation-options'])await page.route('**/api/guide-processes/1/'+endpoint+'**',r=>r.fulfill({json:endpoint==='evaluation'?null:[]}));
   await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{insurances:[],professionals:[],procedures:[]}}));
   await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:[],partial:false}}));
   await page.route('**/api/guide-processes/1/edit-lock/*',r=>{const method=r.request().method();if(method==='POST'){calls.push('acquire');if(scenario==='locked')return r.fulfill({status:423,json:{error:'Outra pessoa está editando a Recepção.'}});owned=true}if(method==='DELETE')owned=false;return r.fulfill({json:{locked:owned||scenario==='locked',owned,owner:'Outro editor',expiresAt:Date.now()+60000}})});
   await page.route('**/api/guide-processes/1/stages/reception/complete',r=>{assert.ok(owned);assert.ok(reads>=2,'Reload under lease before finalizing');calls.push('complete');if(scenario==='invalid')return r.fulfill({status:422,json:{error:'Confira os requisitos da Recepção.'}});fixture.workflow_stages.reception={completed_at:'2026-11-09',completed_by:999};return r.fulfill({json:{stage:'reception',completed:true,workflow_stages:fixture.workflow_stages}})});
   await page.goto(process.env.REALMED_UI_TEST_URL+'/central-de-guias/tratamentos/1');await page.locator('#treatment-patient-name').waitFor();
   const finish=page.getByRole('button',{name:'Finalizar etapa',exact:true});
   if(scenario==='denied'){await page.waitForTimeout(400);assert.equal(await finish.count(),0)}else{
    await finish.click();assert.equal(calls.length,0,'Opening confirmation must not reserve');await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(calls.length,0);
    await finish.click();await page.getByRole('button',{name:'Confirmar finalização',exact:true}).click();
    if(scenario==='complete'){await page.getByText('Etapa finalizada com sucesso.',{exact:true}).waitFor();assert.deepEqual(calls,['acquire','complete']);await page.getByRole('tab',{name:'Recepção'}).click();assert.equal(await finish.count(),0);assert.equal(await page.getByRole('button',{name:'Reabrir etapa',exact:true}).count(),0)}
    if(scenario==='locked'){await page.getByText('Outra pessoa está editando a Recepção.',{exact:true}).waitFor();assert.deepEqual(calls,['acquire'])}
    if(scenario==='invalid'){await page.getByText('Confira os requisitos da Recepção.',{exact:true}).waitFor();assert.deepEqual(calls,['acquire','complete']);assert.equal(Object.keys(fixture.workflow_stages).length,0)}
   }
   assert.deepEqual(errors,[]);console.log('PASS reception finalize '+scenario);await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});


