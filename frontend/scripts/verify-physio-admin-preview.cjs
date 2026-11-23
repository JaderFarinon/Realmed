const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./verify-screen-pattern.cjs'),{groupSessions}=require('../../backend/services/physioAgenda');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:1024,height:600},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);
 // Do not load real data in the popup; verify its URL separately.
 await page.context().route('**/modo-fisio/visualizar/**',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<title>Prévia sintética</title>'}):r.continue());
 await page.goto(origin+'/cadastros/profissionais');const eye=page.getByRole('button',{name:'Ver visão do fisio',exact:true});await eye.waitFor();assert.equal(await eye.isDisabled(),true);
 await page.locator('.list-table tbody tr[aria-selected]').first().click();assert.equal(await eye.isDisabled(),false);
 const [popup]=await Promise.all([page.waitForEvent('popup'),eye.click()]);await popup.waitForLoadState();assert.equal(new URL(popup.url()).pathname,'/modo-fisio/visualizar/1');await popup.close();
 await page.locator('.list-actions button[aria-label^="Editar"]').first().click();await page.getByRole('dialog').getByRole('button',{name:'Ver visão do fisio',exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
 await page.context().unroute('**/modo-fisio/visualizar/**');
 const date='2026-11-12',rows=['08:00','08:01','13:00','13:01','18:00','18:01'].map((time,i)=>({id:'a-'+i,patient_id:'p-'+i,patient_name:'Paciente teste '+i,schedule_id:'a',schedule_name:'Agenda teste',startDate:date+'T'+time+':00-03:00',status:'confirmed',expenses:[],session_progress:{current:10,total:10,final:true}}));
 const sessions=groupSessions([{scheduleId:'a',scheduleName:'Agenda teste',slots:rows,items:rows}],date);let connected=false,renewals=0;const calls=[];
 await page.route('**/api/physio/**',async route=>{const req=route.request(),url=new URL(req.url());calls.push(req.method()+' '+url.pathname);assert.ok(url.pathname.startsWith('/api/physio/admin-preview/1/'),'All preview requests use the selected scope');let json;
  if(url.pathname.endsWith('/session')){assert.equal(req.method(),'POST');connected=true;renewals++;json={profile:{adminPreview:true,professionalName:'Fisio teste',needsSession:false,schedules:[{schedule_id:'a'}]}}}
  else{assert.equal(req.method(),'GET');
   if(url.pathname.endsWith('/me'))json={adminPreview:true,professionalName:'Fisio teste',needsSession:!connected,schedules:[{schedule_id:'a'}]};
   else if(url.pathname.endsWith('/agenda'))json={date,server_time:date+'T15:00:00Z',items:rows,sessions};
   else if(url.pathname.endsWith('/clinical'))json={progress:rows[0].session_progress,professional:{name:'Fisio teste',crefito:'TEST',state:'PR'},writeEnabled:false};
   else if(url.pathname.endsWith('/evaluation'))json=url.searchParams.get('processId')?{process:{id:1},evaluation:{status:'COMPLETED',chief_complaint:'Avaliação de teste',evaluation_date:date,regions:[],treatment_days:[]}}:{options:[{id:1,guide_number:1,evaluation_status:'COMPLETED',evaluation_date:date}]};
   else{const appointment=rows.find(r=>url.pathname.endsWith('/'+r.id));assert.ok(appointment);json={adminPreview:true,date,server_time:date+'T15:00:00Z',appointment,session:sessions.find(s=>s.items.some(r=>r.id===appointment.id)),history:[],capabilities:{start:false,saveEvolution:false,finish:false}}}
  }await route.fulfill({json});
 });
 await page.goto(origin+'/modo-fisio/visualizar/1?date='+date);await page.getByText('Visualização administrativa',{exact:false}).first().waitFor();await page.locator('.physio-session-toggle').first().waitFor();
 assert.equal(renewals,1);assert.equal(await page.evaluate(()=>localStorage.getItem('token')),'synthetic-ui-test');assert.equal(await page.getByRole('button',{name:'Sair',exact:true}).count(),0);
 for(const toggle of await page.locator('.physio-session-toggle').all())await toggle.click();assert.equal(await page.locator('.physio-patient-card[href]').count(),6,'All past/future sessions can be opened');
 const output=path.resolve(__dirname,'../../.deployment/physio-preview-qa');fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'agenda-tablet.png'),fullPage:true});
 await page.getByRole('link',{name:'Abrir atendimento de Paciente teste 0',exact:true}).click();await page.waitForURL('**/visualizar/1/atendimentos/a-0?date='+date);await page.getByRole('heading',{name:'Paciente teste 0',exact:true,level:1}).waitFor();
 await page.getByRole('button',{name:'Ver Avaliação',exact:true}).click();await page.getByText('Avaliação de teste',{exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Preparar evolução',exact:true}).click();await page.getByText('Última sessão prevista · 10/10',{exact:true}).waitFor();assert.equal(await page.locator('.evolution-question').count(),3);assert.equal(await page.getByRole('button',{name:'Finalizar atendimento',exact:true}).isDisabled(),true);
 for(const viewport of [{width:1024,height:600},{width:390,height:844}]){await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:path.join(output,'patient-'+viewport.width+'.png'),fullPage:true})}
 assert.equal(await page.evaluate(()=>localStorage.getItem('token')),'synthetic-ui-test');assert.deepEqual(errors,[]);
 const normal=await browser.newPage();await prepare(normal,{id:3,role:'user',name:'Teste',permissionsEnabled:false,permissions:[]});await normal.goto(origin+'/cadastros/profissionais');await normal.locator('.list-table tbody tr').first().waitFor();assert.equal(await normal.getByRole('button',{name:'Ver visão do fisio',exact:true}).count(),0);await normal.goto(origin+'/modo-fisio/visualizar/1');await normal.waitForURL('**/sem-permissao**');
 console.log('PASS admin preview UI: catalog button/new tab, modal, scoped APIs, session without token replacement, past/future patients, evaluation, questionnaire, read-only clinical writes, normal user denied, tablet/mobile.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
