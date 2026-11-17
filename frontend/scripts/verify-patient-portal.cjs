const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare,records}=require('./verify-screen-pattern.cjs');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198',code='a'.repeat(43),appPath='/paciente/'+code,output=path.resolve(__dirname,'../../.deployment/patient-portal-qa');
const fixture={preview:false,patient:{name:'Paciente Exemplo'},treatments:[{id:1,rootId:1,guideNumber:1,assessmentDate:'2026-11-01'},{id:2,rootId:1,guideNumber:2,assessmentDate:'2026-11-01'}],treatment:{id:2,rootId:1,guideNumber:2,continuation:true,insurance:'Convênio exemplo',physiotherapist:'Profissional exemplo',requested:10,authorized:10,performed:4,status:'IN_PROGRESS'},evaluation:{evaluation_date:'2026-11-01',responsible_name:'Avaliador exemplo',responsible_crefito:'0000',chief_complaint:'Queixa registrada na avaliação',pain_score:0,therapeutic_goals:'Objetivos registrados'},agenda:{linked:true,upcoming:[{date:'2026-11-20',time:'13:00',status:'confirmed',type:'Fisioterapia',schedule:'Agenda exemplo',upcoming:true}],history:[],limited:false,coverage:{from:'2026-11-01',to:'2026-11-20',updatedAt:'2026-11-13T12:00:00Z'}}};
(async()=>{
 assert.equal(code.length,43);fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE});
 try{
  for(const width of [390,360,1280]){
   const page=await browser.newPage({viewport:{width,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));let calls=0,bad=false;
   await page.route('**/api/**',route=>{
    assert.ok(route.request().url().endsWith('/public/patient-portal/view'),'Only public API is called');assert.equal(route.request().headers().authorization,undefined);assert.equal(route.request().method(),'POST');
    const body=route.request().postDataJSON();assert.equal(body.code,code);calls++;
    return route.fulfill({status:bad?404:200,json:bad?{error:'Este link do paciente não está disponível.'}:{...fixture,treatment:{...fixture.treatment,id:body.treatmentId||2},evaluation:body.treatmentId===1?null:fixture.evaluation}});
   });
   await page.goto(origin+appPath);await page.getByRole('heading',{name:'Olá, Paciente.'}).waitFor();assert.ok(!page.url().includes('login'));
   assert.equal(await page.getByText('Visão do paciente · prévia interna').count(),0);
   await page.screenshot({path:path.join(output,'app-'+width+'.png'),fullPage:true});
   await page.getByRole('tab',{name:'Avaliação',exact:true}).click();await page.getByText('Queixa registrada na avaliação',{exact:true}).waitFor();assert.equal(await page.locator('dd',{hasText:/^0$/}).count(),1);
   await page.getByRole('tab',{name:'Evolução',exact:true}).click();await page.getByRole('heading',{name:'Evoluções ainda não disponíveis'}).waitFor();
   await page.getByRole('tab',{name:'Agenda',exact:true}).click();await page.getByText('13:00 · Agenda exemplo',{exact:true}).waitFor();
   await page.getByLabel('Selecionar tratamento',{exact:true}).selectOption('1');await page.getByRole('tab',{name:'Avaliação',exact:true}).click();await page.getByRole('heading',{name:'Sua avaliação está sendo preparada'}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(!JSON.stringify(await page.evaluate(()=>({...localStorage,...sessionStorage}))).includes('Paciente Exemplo'));
   await page.waitForFunction(()=>navigator.serviceWorker.controller && document.querySelector('link[rel=manifest]')?.getAttribute('href')?.includes('/paciente/'));
   const manifest=await page.evaluate(async()=>{const r=await fetch(document.querySelector('link[rel=manifest]').href);return r.json()});assert.equal(manifest.start_url,appPath);assert.equal(manifest.id,appPath);
   const cached=await page.evaluate(async()=>{const values=[];for(const key of await caches.keys())values.push(...(await(await caches.open(key)).keys()).map(r=>r.url));return values});assert.ok(!cached.some(url=>url.includes('/paciente/')),'No patient URL cached');
   bad=true;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('heading',{name:'Não foi possível abrir esta consulta'}).waitFor();assert.equal(await page.getByText('Paciente Exemplo',{exact:true}).count(),0);assert.equal(calls,3);assert.deepEqual(errors,[]);await page.close();console.log('PASS anonymous app, no admin credentials, treatment selection, completed/draft/error states, mobile/PWA '+width);
  }
  const page=await browser.newPage({viewport:{width:1280,height:850}});await prepare(page);
  await page.context().route('**/api/public/patient-portal/view',route=>{assert.equal(route.request().headers().authorization,undefined);return route.fulfill({json:fixture})});
  let accessCalls=0;await page.route('**/api/patient-portal/treatments/1/access',route=>{assert.equal(route.request().method(),'POST');accessCalls++;return route.fulfill({json:{path:appPath}})});
  await page.goto(origin+'/central-de-guias/tratamentos');const eye=page.getByRole('button',{name:'Abrir app do paciente em outra aba',exact:true});await eye.waitFor();assert.ok(await eye.isDisabled());assert.equal(await page.getByRole('link',{name:/Agendamento online/}).count(),0);
  await page.getByText('Paciente fictício 1',{exact:true}).click();const popupPromise=page.waitForEvent('popup');await eye.click();const popup=await popupPromise;await popup.waitForURL('**'+appPath);await popup.getByRole('heading',{name:'Olá, Paciente.'}).waitFor();assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();assert.equal(accessCalls,1);
  await page.route('**/api/guide-processes/1',route=>route.fulfill({json:{...records[0],patient_id:1,documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{reception:{completed_at:'2026-11-01'}}}}));
  for(const endpoint of ['evaluation','rotation','document-generation-options'])await page.route('**/api/guide-processes/1/'+endpoint+'**',route=>route.fulfill({json:endpoint==='evaluation'?null:[]}));
  await page.route('**/api/guide-processes/1/evaluation/options',route=>route.fulfill({json:{professionals:[],patient:records[0]}}));
  await page.route('**/api/guide-processes/1/preparation-options',route=>route.fulfill({json:{insurances:[],professionals:[],procedures:[]}}));
  await page.route('**/api/guide-processes/1/authorization-guides',route=>route.fulfill({json:{items:[],partial:false}}));
  await page.route('**/api/guide-processes/1/edit-lock/*',route=>{assert.equal(route.request().method(),'GET');return route.fulfill({json:{locked:false,owned:false}})});
  await page.goto(origin+'/central-de-guias/tratamentos/1');const qr=page.getByRole('img',{name:'QR code para abrir o app deste paciente'});await qr.waitFor();const link=page.getByRole('link',{name:'Abrir app do paciente ↗',exact:true});assert.equal(await link.getAttribute('href'),origin+appPath);assert.ok((await qr.getAttribute('src')).startsWith('data:image/svg+xml;'));assert.equal(accessCalls,2,'Automatic QR in assessment');
  await page.locator('.patient-access').screenshot({path:path.join(output,'evaluation-qr.png')});
  const secondPopup=page.waitForEvent('popup');await page.getByRole('button',{name:'Abrir app do paciente em outra aba',exact:true}).click();const app=await secondPopup;await app.waitForURL('**'+appPath);await app.getByRole('heading',{name:'Olá, Paciente.'}).waitFor();await app.close();await page.close();
  console.log('PASS same patient app from list/card/assessment QR; booking shortcut removed; no editing reservation.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

