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
   else if(url.pathname.endsWith('/clinical/finish')){assert.equal(req.method(),'POST');const body=req.postDataJSON();assert.match(body.text,/Observação complementar editada/);assert.equal(body.expectedProgress,JSON.stringify(progress));json={finished:true,recordId:'record-a',appointmentStatus:'finished',progress};}
   else if(url.pathname.endsWith('/clinical'))json={progress,professional,writeEnabled:true,appointmentStatus:'confirmed',evolution:null};
   else if(url.pathname.endsWith('/evaluation')){const id=url.searchParams.get('processId');json=id?{process:{id,continuation_of_id:id==='2'?1:null},evaluation:{status:'COMPLETED',evaluation_date:date,chief_complaint:'Avaliação fictícia '+id,individual_monitoring:1,responsible_name:'Avaliador teste',responsible_crefito:'TEST-A',regions:[{region:'Joelho',laterality:'RIGHT'}],treatment_days:[]}}:{options:[{id:1,guide_number:1,evaluation_status:'COMPLETED',evaluation_date:date},{id:2,guide_number:2,continuation_of_id:1,evaluation_status:'COMPLETED',evaluation_date:date}]};}
   else if(url.pathname.endsWith('/agenda'))json={date,server_time:date+'T16:15:00Z',items:[appointment],sessions:[session]};
   else{assert.ok(url.pathname.endsWith('/appointment-a'));json={date,server_time:date+'T16:15:00Z',appointment,session,history:[],capabilities:{start:false,saveEvolution:false,finish:false}};}
   if(!url.pathname.endsWith('/preview')&&!url.pathname.endsWith('/finish'))assert.equal(req.method(),'GET');return route.fulfill({json});
  });
  await page.goto(origin+'/modo-fisio?date='+date);await page.locator('.physio-session-toggle').click();await page.getByText('Sessão 10/10',{exact:false}).first().waitFor();await page.getByRole('link',{name:'Abrir atendimento de '+appointment.patient_name,exact:true}).click();await page.getByRole('heading',{name:appointment.patient_name}).waitFor();
  await page.getByRole('button',{name:'Ver Avaliação',exact:true}).click();await page.getByRole('dialog').getByLabel('Tratamento',{exact:true}).selectOption('2');await page.getByText('Avaliação fictícia 2',{exact:true}).waitFor();await page.getByText(/Avaliação inicial preservada/).waitFor();assert.equal(await page.getByRole('dialog').locator('textarea').count(),0);await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
  await page.getByRole('button',{name:'Preparar evolução',exact:true}).click();await page.getByText('Última sessão prevista · 10/10',{exact:true}).waitFor();
  for(const viewport of [{width:1024,height:600},{width:390,height:844}]){await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:path.join(output,'touch-questions-'+viewport.width+'.png'),fullPage:true})}await page.setViewportSize({width:1024,height:600});
  async function answerStage(choices,nextHeading){const questions=page.locator('.evolution-question');assert.equal(await questions.count(),3);for(let i=0;i<3;i++)await questions.nth(i).locator('.answer-options button').nth(choices[i]).click();await page.getByRole('heading',{name:nextHeading,exact:true}).waitFor()}
  await answerStage([0,0,3],'O que foi realizado e como o paciente respondeu?');
  await answerStage([0,1,2],'Segurança, orientações e próximos passos');
  await answerStage([0,0,0],'Reavaliação ao final das sessões previstas');
  const finalQuestions=page.locator('.evolution-question');for(const [index,choice] of [1,1,0].entries())await finalQuestions.nth(index).locator('.answer-options button').nth(choice).click();
  await page.getByRole('heading',{name:'Confira e edite a evolução',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.clinical-text textarea')?.value.includes('REAVALIAÇÃO AO FINAL'));
  let text=await page.getByLabel('Texto da evolução',{exact:true}).inputValue();assert.ok(text.includes('Sessão 10/10'));assert.ok(text.includes('Objetivos terapêuticos parcialmente alcançados'));
  await page.getByRole('button',{name:'Voltar às perguntas',exact:true}).click();await page.getByRole('heading',{name:'Reavaliação ao final das sessões previstas',exact:true}).waitFor();await page.locator('.evolution-question').first().locator('.answer-options button').first().click();await page.getByRole('heading',{name:'Confira e edite a evolução',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.clinical-text textarea')?.value.includes('melhora global'));
  const editor=page.getByLabel('Texto da evolução',{exact:true});text=await editor.inputValue();await editor.fill(text+'\nObservação complementar editada pelo fisioterapeuta.');
  await page.getByRole('button',{name:'Conferir prévia',exact:true}).click();await page.getByRole('dialog').getByText(/Fisioterapeuta responsável: Fisio Teste/).waitFor();await page.getByRole('dialog').getByText(/Observação complementar editada/).waitFor();await page.getByRole('button',{name:'Continuar revisando',exact:true}).click();
  await page.getByRole('tab',{name:'Resumo',exact:true}).click();await page.getByRole('tab',{name:'Anamnese / evolução',exact:true}).click();assert.match(await editor.inputValue(),/Observação complementar editada/);
  for(const viewport of [{width:1024,height:600},{width:800,height:360},{width:390,height:844}]){await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:path.join(output,'questionnaire-'+viewport.width+'.png'),fullPage:true});}
  assert.equal(await page.getByRole('button',{name:'Salvar rascunho no Stenci',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Finalizar atendimento',exact:true}).isEnabled(),true);
  const storage=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));assert.ok(!storage.includes('Observação complementar editada'));assert.ok(!storage.includes('Objetivos terapêuticos parcialmente'));
  await page.getByRole('button',{name:'Ver Avaliação',exact:true}).click();await page.getByRole('dialog').getByLabel('Tratamento',{exact:true}).selectOption('1');await page.getByText('Avaliação fictícia 1',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'evaluation-mobile.png')});await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
  await page.getByRole('button',{name:'Finalizar atendimento',exact:true}).click();await page.getByRole('dialog',{name:'Finalizar evolução no Stenci?'}).waitFor();await page.getByRole('button',{name:'Confirmar e finalizar',exact:true}).click();await page.getByText('Evolução finalizada no Stenci',{exact:true}).waitFor();await page.getByText(/Fisioterapeuta responsável: Fisio Teste/).waitFor();
  await page.evaluate(()=>history.back());await page.waitForURL('**/modo-fisio?date='+date);assert.equal(await page.getByRole('dialog',{name:'Sair sem enviar a evolução?'}).count(),0);
  assert.deepEqual(errors,[]);assert.equal(calls.filter(call=>call.endsWith('POST /api/physio/agenda/appointment-a/clinical/finish')).length,1);
  console.log('PASS evolution UI: touch wizard, automatic advance, signed immutable Stenci finalization, final reassessment, back/edit/review, no browser persistence, tablet and mobile.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
