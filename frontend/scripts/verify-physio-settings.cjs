const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./verify-screen-pattern.cjs');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[];
 const output=path.resolve(__dirname,'../../.deployment/physio-settings-qa');fs.mkdirSync(output,{recursive:true});
 const date='2026-11-11',schedules=[{schedule_id:'a',schedule_name:'Agenda do fisioterapeuta A'},{schedule_id:'b',schedule_name:'Agenda complementar'}];
 const sessions=[{id:'a:1',number:1,schedule_id:'a',schedule_name:schedules[0].schedule_name,start_time:'13:00',end_time:'13:45',items:[]},{id:'b:2',number:2,schedule_id:'b',schedule_name:schedules[1].schedule_name,start_time:'14:00',end_time:'14:45',end_estimated:true,end_source:'default_45',items:[]}];
 try{
  const page=await browser.newPage({viewport:{width:1024,height:600},hasTouch:true});page.on('pageerror',error=>errors.push(error.message));
  await prepare(page,{id:70,role:'user',name:'Fisio de teste',authProvider:'LOCAL',physiotherapistId:7,permissionsEnabled:true,permissions:[]});let agendaGets=0,noSchedules=false;
  await page.route('**/api/physio/**',async route=>{
   assert.equal(route.request().method(),'GET','Settings preview must not write or submit requests');const url=new URL(route.request().url());
   if(url.pathname==='/api/physio/me')return route.fulfill({json:{professionalName:'Fisio de teste',needsSession:false,developmentMode:false,schedules:noSchedules?[]:schedules}});
   assert.equal(url.pathname,'/api/physio/agenda');agendaGets++;const day=url.searchParams.get('date');
   if(day==='2026-11-13')return route.fulfill({status:503,json:{error:'Consulta temporariamente indisponível.'}});
   return route.fulfill({json:{date:day,items:[],sessions:day===date?sessions:[]}});
  });
  await page.goto(origin+'/modo-fisio?date='+date);await page.getByRole('button',{name:'Configurações',exact:true}).tap();await page.getByRole('heading',{name:'Ajustes na agenda',exact:true}).waitFor();
  await page.getByText(/Esta consulta não representa a grade semanal completa/).waitFor();assert.equal(await page.getByLabel('Agenda',{exact:true}).inputValue(),'');
  await page.getByRole('button',{name:'Usar horário 13:00 de Agenda do fisioterapeuta A',exact:true}).click();assert.equal(await page.getByLabel('Agenda',{exact:true}).inputValue(),'a');assert.equal(await page.getByLabel('Início atual',{exact:true}).inputValue(),'13:00');assert.equal(await page.getByLabel('Fim atual',{exact:true}).inputValue(),'13:45');
  await page.getByLabel('Novo início',{exact:true}).fill('14:00');await page.getByLabel('Novo fim',{exact:true}).fill('14:45');await page.getByLabel('Motivo / observações',{exact:true}).fill('Teste de ajuste de horário para o tablet.');
  await page.getByRole('button',{name:'Revisar solicitação',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Revisar solicitação de ajuste',exact:true});await dialog.waitFor();await dialog.getByText('Pontual · Alterar horário',{exact:true}).waitFor();await dialog.getByText('14:00 – 14:45',{exact:true}).waitFor();assert.ok(await dialog.getByRole('button',{name:'Enviar solicitação',exact:true}).isDisabled());await dialog.getByText(/não enviado/).waitFor();
  await page.locator('.notification-card').first().waitFor({state:'hidden'});
  await page.screenshot({path:path.join(output,'review-tablet.png')});await page.keyboard.press('Escape');
  await page.getByRole('radio',{name:/Definitivo/}).check();await page.getByLabel('Qua',{exact:true}).uncheck();await page.getByRole('button',{name:'Revisar solicitação',exact:true}).click();await page.getByText('Selecione pelo menos um dia da semana para o ajuste definitivo.',{exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByLabel('Seg',{exact:true}).check();await page.getByLabel('Sex',{exact:true}).check();await page.getByLabel('Válido a partir de',{exact:true}).fill('2026-11-16');await page.getByRole('button',{name:'Revisar solicitação',exact:true}).click();await dialog.getByText('A partir de 16/11/2026 · Seg, Sex',{exact:true}).waitFor();await page.keyboard.press('Escape');
  await page.getByLabel('Novo fim',{exact:true}).fill('13:00');await page.getByRole('button',{name:'Revisar solicitação',exact:true}).click();await page.getByText(/Confira o novo horário/).waitFor();assert.equal(await page.getByRole('dialog').count(),0);await page.getByLabel('Novo fim',{exact:true}).fill('14:45');
  await page.locator('.notification-card').first().waitFor({state:'hidden'});
  for(const viewport of [{width:1280,height:800},{width:1024,height:600},{width:800,height:360},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'settings-'+viewport.width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal overflow');const button=await page.getByRole('button',{name:'Configurações',exact:true}).boundingBox();assert.ok(button.height>=(viewport.width>=640?36:48));assert.ok(button.x+button.width<=viewport.width);assert.ok(await page.locator('.physio-mode-tabs button').evaluateAll(buttons=>buttons.every(button=>button.scrollWidth<=button.clientWidth)),'Tab labels fit without clipping');
  }
  await page.setViewportSize({width:1024,height:600});await page.getByRole('button',{name:'Agenda',exact:true}).click();await page.getByRole('button',{name:'Configurações',exact:true}).click();assert.equal(await page.getByLabel('Motivo / observações',{exact:true}).inputValue(),'Teste de ajuste de horário para o tablet.');assert.equal(agendaGets,1,'Switching tabs must reuse the agenda without request loops');
  await page.getByLabel('O que deseja ajustar?',{exact:true}).selectOption('bloquear');await page.getByRole('button',{name:'Revisar solicitação',exact:true}).click();await dialog.getByText('Definitivo · Bloquear horário',{exact:true}).waitFor();assert.equal(await dialog.getByText('Horário solicitado',{exact:true}).count(),0);await page.keyboard.press('Escape');
  await page.getByLabel('O que deseja ajustar?',{exact:true}).selectOption('adicionar');await page.getByRole('radio',{name:/Pontual/}).check();await page.getByLabel('Novo início',{exact:true}).fill('23:00');await page.getByLabel('Novo fim',{exact:true}).fill('00:30');await page.getByLabel('Novo horário termina no dia seguinte',{exact:true}).check();await page.getByRole('button',{name:'Revisar solicitação',exact:true}).click();await dialog.getByText('23:00 – 00:30 (+1 dia)',{exact:true}).waitFor();assert.equal(await dialog.getByText('Horário atual',{exact:true}).count(),0);await page.keyboard.press('Escape');
  await page.getByLabel('Consultar data',{exact:true}).fill('2026-11-12');await page.getByText(/Nenhum horário com pacientes encontrado nesta data/).waitFor();assert.equal(await page.getByLabel('Data do ajuste',{exact:true}).inputValue(),'2026-11-16','Browsing another day must preserve the prepared request');
  await page.getByLabel('Consultar data',{exact:true}).fill('2026-11-13');await page.getByText('Não foi possível consultar os horários desta data.',{exact:true}).waitFor();assert.equal(await page.getByText(/Nenhum horário com pacientes encontrado/).count(),0);await page.getByRole('button',{name:'Tentar novamente',exact:true}).waitFor();
  const storage=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));assert.ok(!storage.includes('Teste de ajuste de horário'),'No request contents stored in browser');
  noSchedules=true;await page.reload();await page.getByRole('button',{name:'Configurações',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Revisar solicitação',exact:true}).isDisabled());assert.equal(await page.getByLabel('Motivo / observações',{exact:true}).inputValue(),'');
  assert.deepEqual(errors,[]);console.log('PASS physio settings: own schedule references, punctual/permanent requests, weekdays, validation, overnight period, add/block review, no writes/storage, draft across tabs, empty/error states and tablet/mobile layout.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
