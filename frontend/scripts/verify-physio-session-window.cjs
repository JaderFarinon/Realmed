const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./verify-screen-pattern.cjs'),{groupSessions,sessionAccess}=require('../../backend/services/physioAgenda');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:1024,height:600},hasTouch:true,timezoneId:'Asia/Tokyo'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2035-01-01T00:00:00Z')});
 await prepare(page,{id:70,role:'user',name:'Fisio de teste',authProvider:'LOCAL',physiotherapistId:7,permissionsEnabled:true,permissions:[]});
 const date='2026-11-11',rows=Array.from({length:15},(_,i)=>({id:'appt-'+i,patient_id:'p-'+i,patient_name:'Paciente fictício '+i,schedule_id:'a',schedule_name:'Agenda A',status:'scheduled',startDate:date+'T'+(i<6?'13:0'+i:i<12?'13:'+String(45+i-6):'14:'+String(45+i-12))+':00-03:00'}));
 const sessions=groupSessions([{scheduleId:'a',scheduleName:'Agenda A',slots:rows,items:rows}],date);
 let serverMs=Date.parse('2026-11-11T15:59:58Z'),agendaGets=0,detailGets=0,missingClock=false,night=false;
 const nightSession={id:'night',number:1,start_minute:1425,end_minute:1470,start_time:'23:45',end_time:'00:30',end_next_day:true,end_estimated:true,schedule_id:'a',schedule_name:'Agenda A',items:[{...rows[0],startDate:date+'T23:45:00-03:00'}]};
 const stamp=()=>missingClock?{}:{server_time:new Date(serverMs).toISOString()};
 await page.route('**/api/physio/**',async route=>{assert.equal(route.request().method(),'GET');const url=new URL(route.request().url()),day=url.searchParams.get('date');
  if(url.pathname.endsWith('/me'))return route.fulfill({json:{professionalName:'Fisio de teste',needsSession:false,schedules:[{schedule_id:'a',schedule_name:'Agenda A'}]}});
  if(url.pathname.endsWith('/agenda')){agendaGets++;return route.fulfill({json:{date:day,items:night?nightSession.items:rows,sessions:night?[nightSession]:sessions,...stamp()}})}
  detailGets++;const session=sessions.find(session=>session.items.some(row=>url.pathname.endsWith('/'+row.id)));
  if(!session||sessionAccess(session,day,serverMs)!=='current')return route.fulfill({status:409,json:{code:'PHYSIO_OUTSIDE_SESSION',error:'Este atendimento só pode ser aberto durante o horário da sessão.'}});
  return route.fulfill({json:{date:day,appointment:rows.find(row=>url.pathname.endsWith('/'+row.id)),session,history:[],...stamp(),capabilities:{start:false,saveEvolution:false,finish:false}}});
 });
 const links=()=>page.locator('.physio-patient-card[href]');
 async function expandAll(){await page.locator('.physio-session-toggle').first().waitFor();for(const toggle of await page.locator('.physio-session-toggle').all())if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click()}
 async function advance(ms){serverMs+=ms;await page.clock.fastForward(ms)}
 await page.goto(origin+'/modo-fisio?date='+date);await page.getByRole('heading',{name:'Sessão 1 13:00 – 13:45'}).waitFor();assert.equal(await links().count(),0);
 await expandAll();
 await page.locator('.physio-patient-card').first().tap();assert.equal(detailGets,0);assert.ok(!page.url().includes('/atendimentos/'));
 assert.ok(await page.locator('.physio-patient-card').evaluateAll(cards=>cards.every(card=>card.tagName==='ARTICLE'&&!card.hasAttribute('href')&&card.tabIndex===-1)));
 await advance(2000);await links().first().waitFor();assert.equal(await links().count(),6);assert.equal(agendaGets,1,'Clock changes must not poll the API');
 await page.clock.setSystemTime(new Date('2040-12-25T18:00:00Z'));assert.equal(await links().count(),6,'Tablet date changes must not change session access');
 const output=path.resolve(__dirname,'../../.deployment/physio-window-qa');fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'current-session-tablet.png')});
 await page.getByRole('link',{name:'Abrir atendimento de Paciente fictício 5',exact:true}).tap();await page.getByRole('heading',{name:'Paciente fictício 5',exact:true,level:1}).waitFor();assert.equal(detailGets,1,'All minute offsets share the session start');
 await advance(45*60000);await page.getByRole('heading',{name:'Atendimento fora do horário',exact:true}).waitFor();assert.equal(await page.locator('.appointment-patient').count(),0);assert.equal(detailGets,1,'Open detail expires without repeated requests');
 await page.goBack();await page.getByRole('heading',{name:'Sessão 1 13:00 – 13:45'}).waitFor();await expandAll();assert.equal(await page.locator('.physio-session').first().getByRole('link').count(),0);assert.equal(await page.locator('.physio-session').nth(1).getByRole('link').count(),6);
 const loaded=agendaGets;
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await links().count(),0);
 serverMs=Date.parse('2026-11-11T17:45:00Z');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});await page.getByRole('link',{name:'Abrir atendimento de Paciente fictício 12',exact:true}).waitFor();assert.equal(await links().count(),3);assert.equal(agendaGets,loaded+1,'Resume revalidates once');
 await page.getByLabel('Data',{exact:true}).fill('2026-11-10');await page.getByText('Horário encerrado',{exact:true}).first().waitFor();assert.equal(await links().count(),0);
 await page.getByLabel('Data',{exact:true}).fill('2026-11-12');await page.getByText('Aguardando horário',{exact:true}).first().waitFor();assert.equal(await links().count(),0);
 await page.goto(origin+'/modo-fisio/atendimentos/appt-0?date='+date);await page.getByRole('heading',{name:'Atendimento indisponível',exact:true}).waitFor();assert.ok(page.url().includes('/atendimentos/appt-0'));assert.equal(await page.locator('.appointment-patient').count(),0);assert.ok(await page.evaluate(()=>localStorage.getItem('token')));
 missingClock=true;await page.goto(origin+'/modo-fisio?date='+date);await page.getByText('Abertura indisponível',{exact:true}).first().waitFor();await expandAll();assert.equal(await links().count(),0,'Missing server time must fail closed');
 missingClock=false;night=true;serverMs=Date.parse('2026-11-12T03:15:00Z');await page.reload();await expandAll();await page.getByRole('link',{name:'Abrir atendimento de Paciente fictício 0',exact:true}).waitFor();assert.equal(await links().count(),1);await advance(15*60000);await page.getByText('Horário encerrado',{exact:true}).waitFor();assert.equal(await links().count(),0);
 assert.deepEqual(errors,[]);console.log('PASS session access UI: server clock, wrong tablet timezone/date, current group offsets, no link/touch outside window, automatic boundaries, open detail expiry, past/future dates, resume revalidation, direct URL denial, missing time and midnight.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
