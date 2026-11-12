const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./verify-screen-pattern.cjs'),{groupSessions}=require('../../backend/services/physioAgenda');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[];
 const output=path.resolve(__dirname,'../../.deployment/physio-agenda-qa');fs.mkdirSync(output,{recursive:true});
 const date='2026-11-11',statuses=['scheduled','patient_canceled','professional_canceled','confirmed','unsuccessful','in_attendance','waiting','missed','finished','report','payment','pending','rescheduled','screening','new_status'];
 const colors=['#f1e87a','#ff9696','#ff9696','#00b6ae','#8b68ce','#20f8ff','#e8a363','#f85c5c','#3197ff','#30ff9b','#b74aff','#787878','#e895ff','#b4ff00','#64748b'];
 const rows=statuses.map((status,i)=>({id:'appt-'+i,patient_id:'patient-'+i,patient_name:i===0?'Paciente de teste com nome longo para conferência no tablet':'Paciente de teste '+i,patient_birth_date:'1985-02-14',insurance_name:'Convênio de teste',schedule_id:'schedule-a',schedule_name:'Agenda do fisioterapeuta A',startDate:date+'T'+(i<6?'13:0'+i:i<12?'13:'+String(45+i-6):'14:'+String(45+i-12))+':00-03:00',status,expenses:[{code:'50000160',name:'Sessão de fisioterapia',type:'session',quantity:1}]}));
 const sessions=groupSessions([{scheduleId:'schedule-a',scheduleName:'Agenda do fisioterapeuta A',slots:rows,items:rows}],date);
 try{
  const page=await browser.newPage({viewport:{width:1024,height:600},hasTouch:true});page.on('pageerror',error=>errors.push(error.message));
  await prepare(page,{id:70,role:'user',name:'Fisio A',authProvider:'LOCAL',physiotherapistId:7,permissionsEnabled:true,permissions:[]});let gets=0,delay=false;
  await page.route('**/api/physio/**',async r=>{
   assert.equal(r.request().method(),'GET','The prepared clinical screen must not write to Stenci or Realmed');const url=new URL(r.request().url());
   if(url.pathname==='/api/physio/me')return r.fulfill({json:{professionalName:'Fisio A',needsSession:false,developmentMode:false,schedules:[{schedule_id:'schedule-a'}]}});
   if(url.pathname==='/api/physio/agenda'){gets++;const requested=url.searchParams.get('date');if(delay&&requested==='2026-11-12')await new Promise(resolve=>setTimeout(resolve,450));return r.fulfill({json:{server_time:'2026-11-11T16:00:00Z',...(requested===date?{date,items:rows,sessions}:{date:requested,items:[],sessions:[]})}})}
   if(url.pathname==='/api/physio/agenda/missing')return r.fulfill({status:404,json:{error:'Este agendamento não está disponível nas suas agendas para esta data.'}});
   const row=rows.find(row=>url.pathname.endsWith('/'+row.id));assert.ok(row,'Unexpected API route');return r.fulfill({json:{date,server_time:'2026-11-11T16:00:00Z',appointment:row,session:sessions.find(session=>session.items.some(item=>item.id===row.id)),history:[{id:'visit',date:'2026-11-10',startAt:'2026-11-10T13:01:00-03:00',schedule:'Agenda do fisioterapeuta A',status:'finished'}],hasMoreHistory:false,clinicalHistoryAvailable:false,capabilities:{start:false,saveEvolution:false,finish:false}}});
  });
  await page.goto(origin+'/modo-fisio?date='+date);await page.getByRole('heading',{name:'Sessão 1 13:00 – 13:45'}).waitFor();assert.equal(await page.locator('.physio-session').count(),3);
  const toggles=page.locator('.physio-session-toggle');assert.equal(await page.locator('.physio-patient-card').count(),0,'All sessions start collapsed, including current');assert.equal(await page.locator('.physio-session-toggle[aria-expanded="false"]').count(),3);
  for(const viewport of [{width:1280,height:800},{width:1024,height:600},{width:800,height:360},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,'agenda-collapsed-'+viewport.width+'.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.ok((await toggles.first().boundingBox()).height>=48);
  }
  await page.setViewportSize({width:1024,height:600});const beforeToggleGets=gets;await toggles.first().tap();assert.equal(await toggles.first().getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.physio-patient-card').count(),6);
  await toggles.first().focus();await page.keyboard.press('Space');assert.equal(await toggles.first().getAttribute('aria-expanded'),'false');assert.equal(await page.locator('.physio-patient-card').count(),0);await page.keyboard.press('Enter');
  for(let i=1;i<3;i++)await toggles.nth(i).tap();assert.equal(await page.locator('.physio-patient-card').count(),15);assert.equal(gets,beforeToggleGets,'Expanding sessions does not reload the agenda');
  await page.getByRole('button',{name:'Pacientes',exact:true}).click();await page.getByRole('button',{name:'Agenda',exact:true}).click();assert.equal(await page.locator('.physio-patient-card').count(),15,'Switching tabs preserves explicit expansion');assert.equal(gets,beforeToggleGets);
  assert.equal(await page.locator('.physio-session').first().getByRole('link').count(),6);await page.getByText('14:45 – 15:45',{exact:true}).waitFor();await page.getByText(/Fim previsto pelo intervalo anterior/).waitFor();
  assert.equal(await page.locator('.physio-patient-card[href]').count(),6);assert.equal(await page.locator('.physio-patient-card[aria-disabled="true"]').count(),9);
  const styleColors=await page.locator('.physio-patient-card .physio-status').evaluateAll(elements=>elements.map(el=>el.style.getPropertyValue('--status-color')));assert.deepEqual(styleColors,colors);await page.getByText('Status não identificado',{exact:true}).waitFor();
  for(const viewport of [{width:1280,height:800},{width:1024,height:600},{width:800,height:360},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,'agenda-'+viewport.width+'.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   const box=await page.locator('.physio-patient-card').first().boundingBox();assert.ok(box.height>=48);
  }
  await page.setViewportSize({width:1024,height:600});await page.getByRole('link',{name:'Abrir atendimento de '+rows[0].patient_name,exact:true}).tap();await page.getByRole('heading',{name:rows[0].patient_name,exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Iniciar atendimento',exact:true}).isDisabled(),true);await page.getByText(/Alergias não consultadas/).waitFor();await page.getByText('Sessão de fisioterapia',{exact:true}).waitFor();
  for(const viewport of [{width:1280,height:800},{width:1024,height:600},{width:800,height:360},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.screenshot({path:path.join(output,'detail-'+viewport.width+'.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  }
  await page.setViewportSize({width:1024,height:600});await page.getByRole('button',{name:'Visualizar ficha de atendimento',exact:true}).click();assert.equal(await page.getByLabel('Texto da evolução',{exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Finalizar atendimento',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Salvar rascunho',exact:true}).isDisabled(),true);
  await page.screenshot({path:path.join(output,'evolution-tablet.png')});const navBox=await page.getByRole('tablist').boundingBox(),headerBox=await page.locator('.appointment-patient').boundingBox();assert.ok(navBox.y>=headerBox.y+headerBox.height,'Tabs stay visible below patient header');
  await page.getByRole('tab',{name:'Anamnese / evolução',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.getByText('10/11/2026 · 13:01',{exact:true}).waitFor();await page.getByText('Finalizado',{exact:true}).waitFor();
  await page.goBack();await page.getByRole('heading',{name:'Sessão 1 13:00 – 13:45'}).waitFor();assert.equal(await page.getByLabel('Data',{exact:true}).inputValue(),date);assert.equal(await page.locator('.physio-patient-card').count(),0,'Returning to agenda starts collapsed');await toggles.first().click();
  delay=true;const previous=gets;await page.getByLabel('Data',{exact:true}).fill('2026-11-12');await page.getByLabel('Data',{exact:true}).fill('2026-11-13');await page.getByText('Nenhum atendimento encontrado',{exact:true}).waitFor();await page.waitForTimeout(600);assert.equal(await page.locator('.physio-patient-card').count(),0);assert.ok(gets-previous<=2,'No request loop');
  await page.getByLabel('Data',{exact:true}).fill(date);await toggles.first().waitFor();assert.equal(await page.locator('.physio-patient-card').count(),0,'Changing dates resets expanded sessions');assert.equal(await page.locator('.physio-session-toggle[aria-expanded="false"]').count(),3);
  await page.goto(origin+'/modo-fisio/atendimentos/missing?date='+date);await page.getByRole('heading',{name:'Atendimento indisponível',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Iniciar atendimento',exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS physio agenda UI: collapsed default, keyboard/touch expansion, independent sections, reset on date/back, no extra requests, minute groups, dynamic intervals, status palette, patient details, history, stale responses, tablet/landscape/mobile.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
