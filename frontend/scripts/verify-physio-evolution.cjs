const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./verify-screen-pattern.cjs'),{generateText,signedText}=require('../../backend/services/physioEvolutionText');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const output=path.resolve(__dirname,'../../.deployment/physio-evolution-qa');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1024,height:600},hasTouch:true}),errors=[],calls=[];
  page.on('pageerror',e=>errors.push(e.message));await prepare(page,{id:70,role:'user',name:'Fisio Teste',authProvider:'LOCAL',physiotherapistId:7,permissionsEnabled:true,permissions:[]});
  const date='2026-11-12',progress={current:10,total:10,final:true},professional={name:'Fisio Teste',crefito:'TEST-123',state:'PR'};
  const appointment={id:'appointment-a',patient_id:'patient-a',patient_name:'Paciente fictício para teste',schedule_id:'schedule-a',schedule_name:'Agenda Teste',startDate:date+'T13:01:00-03:00',status:'confirmed',expenses:[],session_progress:progress};
  const session={id:'session-a',schedule_id:'schedule-a',schedule_name:'Agenda Teste',number:1,start_time:'13:00',end_time:'13:45',start_minute:780,end_minute:825,date,items:[appointment]};
  await page.route('**/api/physio/**',async route=>{
   const req=route.request(),url=new URL(req.url());calls.push(req.method()+' '+url.pathname);let json;
   if(url.pathname.endsWith('/me'))json={professionalName:'Fisio Teste',needsSession:false,schedules:[{schedule_id:'schedule-a'}]};
   else if(url.pathname.endsWith('/clinical/preview')){assert.equal(req.method(),'POST');const body=req.postDataJSON();assert.equal(body.expectedProgress,JSON.stringify(progress));const text=generateText(body.answers,{date,progress});json={text,signedText:signedText(text,{professional_name:professional.name,council_number:professional.crefito,state:professional.state},date),progress};}
   else if(url.pathname.endsWith('/clinical'))json={progress,professional,writeEnabled:false,appointmentStatus:'confirmed'};
   else if(url.pathname.endsWith('/evaluation')){const id=url.searchParams.get('processId');json=id?{process:{id,continuation_of_id:id==='2'?1:null},evaluation:{status:'COMPLETED',evaluation_date:date,chief_complaint:'Avaliação fictícia '+id,individual_monitoring:1,responsible_name:'Avaliador teste',responsible_crefito:'TEST-A',regions:[{region:'Joelho',laterality:'RIGHT'}],treatment_days:[]}}:{options:[{id:1,guide_number:1,evaluation_status:'COMPLETED',evaluation_date:date},{id:2,guide_number:2,continuation_of_id:1,evaluation_status:'COMPLETED',evaluation_date:date}]};}
   else if(url.pathname.endsWith('/agenda'))json={date,server_time:date+'T16:15:00Z',items:[appointment],sessions:[session]};
   else{assert.ok(url.pathname.endsWith('/appointment-a'));json={date,server_time:date+'T16:15:00Z',appointment,session,history:[],capabilities:{start:false,saveEvolution:false,finish:false}};}
   if(!url.pathname.endsWith('/preview'))assert.equal(req.method(),'GET');return route.fulfill({json});
  });
  await page.goto(origin+'/modo-fisio?date='+date);await page.locator('.physio-session-toggle').click();await page.getByText('Sessão 10/10',{exact:false}).first().waitFor();await page.getByRole('link',{name:'Abrir atendimento de '+appointment.patient_name,exact:true}).click();await page.getByRole('heading',{name:appointment.patient_name}).waitFor();
  await page.getByRole('button',{name:'Ver Avaliação',exact:true}).click();await page.getByRole('dialog').getByLabel('Tratamento',{exact:true}).selectOption('2');await page.getByText('Avaliação fictícia 2',{exact:true}).waitFor();await page.getByText(/Avaliação inicial preservada/).waitFor();assert.equal(await page.getByRole('dialog').locator('textarea').count(),0);await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
  await page.getByRole('button',{name:'Preparar evolução',exact:true}).click();await page.getByText('Última sessão prevista · 10/10',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Iniciar atendimento no Stenci',exact:true}).isDisabled(),true);
  const fields=page.locator('.clinical-grid textarea');assert.equal(await fields.count(),11);for(let i=0;i<11;i++)await fields.nth(i).fill('Registro fictício '+i);
  await page.getByLabel('Dor antes',{exact:true}).selectOption('3');await page.getByLabel('Dor após',{exact:true}).selectOption('2');
  await page.getByRole('button',{name:'Gerar texto para revisar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.clinical-text textarea')?.value.includes('REAVALIAÇÃO AO FINAL'));
  const text=await page.getByLabel('Texto da evolução',{exact:true}).inputValue();assert.ok(text.includes('Sessão 10/10'));
  await page.getByRole('button',{name:'Pré-visualizar texto',exact:true}).click();await page.getByRole('dialog').getByText(/Fisioterapeuta responsável: Fisio Teste/).waitFor();await page.getByRole('button',{name:'Continuar revisando',exact:true}).click();
  await fields.first().fill('Alterado para teste');assert.equal(await page.getByRole('button',{name:'Pré-visualizar texto',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Gerar texto para revisar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.clinical-text textarea')?.value.includes('Alterado para teste'));
  await page.getByRole('tab',{name:'Resumo',exact:true}).click();await page.getByRole('tab',{name:'Anamnese / evolução',exact:true}).click();assert.equal(await fields.first().inputValue(),'Alterado para teste');
  for(const viewport of [{width:1024,height:600},{width:800,height:360},{width:390,height:844}]){await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:path.join(output,'questionnaire-'+viewport.width+'.png'),fullPage:true});}
  assert.equal(await page.getByRole('button',{name:'Salvar rascunho no Stenci',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Finalizar atendimento',exact:true}).isDisabled(),true);
  const storage=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));assert.ok(!storage.includes('Alterado para teste'));assert.ok(!storage.includes('Registro fictício'));
  await page.getByRole('button',{name:'Ver Avaliação',exact:true}).click();await page.getByRole('dialog').getByLabel('Tratamento',{exact:true}).selectOption('1');await page.getByText('Avaliação fictícia 1',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'evaluation-mobile.png')});await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
  await page.evaluate(()=>history.back());await page.getByRole('dialog',{name:'Sair sem enviar a evolução?'}).waitFor();await page.getByRole('button',{name:'Continuar preenchendo',exact:true}).click();assert.equal(await fields.first().inputValue(),'Alterado para teste');
  await page.evaluate(()=>history.back());await page.getByRole('button',{name:'Descartar e sair',exact:true}).click();await page.waitForURL('**/modo-fisio?date='+date);
  assert.deepEqual(errors,[]);assert.equal(calls.filter(call=>call.startsWith('POST')&&!call.endsWith('/preview')).length,0);
  console.log('PASS evolution UI: Stenci count, final questionnaire, explicit answers, review/signature, stale text, draft between tabs, readonly evaluation choice, no persistence/writes, tablet and mobile.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
