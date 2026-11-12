const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./verify-screen-pattern.cjs');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[];
 const output=path.resolve(__dirname,'../../.deployment/physio-password-qa');fs.mkdirSync(output,{recursive:true});
 try{
  const admin=await browser.newPage({viewport:{width:1366,height:768}});admin.on('pageerror',e=>errors.push(e.message));await prepare(admin);
  const notices=[{id:2,title:'Fisioterapeuta entrou por senha',message:'Fisio de teste entrou com usuário e senha. Profissional: Fisio A.',created_at:'2026-11-11T14:00:00Z',read_at:null}];let polls=0;
  await admin.route('**/api/notifications**',r=>{
   const url=new URL(r.request().url());if(r.request().method()==='POST'){notices.find(n=>n.id===Number(url.pathname.split('/').at(-2))).read_at=new Date().toISOString();return r.fulfill({status:204})}
   polls++;const older=url.searchParams.has('before');return r.fulfill({json:{items:older?[{...notices[0],id:1,read_at:'2026-11-11',message:'Aviso anterior'}]:notices,unread:notices.filter(n=>!n.read_at).length,hasMore:!older}});
  });
  await admin.goto(origin+'/usuarios');const bell=admin.getByRole('button',{name:/^Notificações/});await bell.waitFor();
  await admin.getByRole('button',{name:'Notificações: 1 não lidas',exact:true}).waitFor();await bell.click();
  const dialog=admin.getByRole('dialog',{name:'Notificações',exact:true});await dialog.getByText(notices[0].message,{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Marcar como lida',exact:true}).click();await admin.getByRole('button',{name:'Notificações',exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Mais notificações',exact:true}).click();await dialog.getByText('Aviso anterior',{exact:true}).waitFor();
  for(const viewport of [{width:1366,height:768},{width:1024,height:600},{width:390,height:844}]){
   await admin.setViewportSize(viewport);await admin.waitForTimeout(150);const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=viewport.width+2);assert.ok(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await admin.screenshot({path:path.join(output,'notifications-'+viewport.width+'.png')});
  }
  await dialog.getByRole('button',{name:'Fechar',exact:true}).last().click();
  notices.unshift({...notices[0],id:3,message:'Outro fisioterapeuta entrou por senha.',read_at:null});const previous=polls;
  await admin.evaluate(()=>window.dispatchEvent(new Event('focus')));await admin.getByText(notices[0].message,{exact:true}).waitFor();assert.ok(polls>previous);
  await admin.setViewportSize({width:1366,height:900});
  // A local account can be linked and enrolled. Failed linking must not create a second account.
  let created=0,updated=0,links=0;const saved={id:70,nome:'Fisio local',login:'fisio-local',role:'user',status:'active',authProvider:'LOCAL',professionalId:null,faceEnrolled:false};
  await admin.route('**/api/usuarios/physiotherapist-options',r=>r.fulfill({json:[{id:7,full_name:'Fisio A',council_number:'12345',state:'PR'}]}));
  await admin.route('**/api/usuarios',r=>{if(r.request().method()==='GET')return r.fulfill({json:[]});created++;return r.fulfill({json:saved})});
  await admin.route('**/api/usuarios/70',r=>{updated++;return r.fulfill({json:saved})});
  await admin.route('**/api/usuarios/70/physiotherapist',r=>{links++;return links===1?r.fulfill({status:409,json:{error:'Conflito de vínculo de teste.'}}):r.fulfill({json:{...saved,professionalId:7,professionalName:'Fisio A'}})});
  await admin.reload();await admin.getByRole('button',{name:'Novo usuário',exact:true}).click();let userDialog=admin.getByRole('dialog',{name:'Novo usuário',exact:true});
  await userDialog.getByLabel(/Tipo de conta/).selectOption('LOCAL');await userDialog.getByLabel(/^Nome/).fill('Fisio local');await userDialog.getByLabel(/^Login/).fill('fisio-local');
  await userDialog.getByLabel(/^Senha/).fill('Synthetic-only-123');await userDialog.getByLabel(/Confirmar senha/).fill('Synthetic-only-123');
  await userDialog.getByLabel(/Profissional vinculado/).selectOption('7');await userDialog.getByRole('button',{name:'Salvar',exact:true}).click();
  await admin.getByText('Conflito de vínculo de teste.',{exact:true}).waitFor();userDialog=admin.getByRole('dialog',{name:'Editar usuário',exact:true});
  await userDialog.getByRole('button',{name:'Salvar',exact:true}).click();await userDialog.waitFor({state:'hidden'});assert.equal(created,1);assert.equal(updated,1);assert.equal(links,2);
  // Password option opens own area and renews only the shared connection after restart.
  const physio=await browser.newPage({viewport:{width:1024,height:600}});physio.on('pageerror',e=>errors.push(e.message));
  await prepare(physio,{id:70,username:'fisio-local',name:'Fisio local',role:'user',authProvider:'LOCAL',physiotherapistId:7,permissionsEnabled:true,permissions:[]});
  await physio.addInitScript(()=>localStorage.removeItem('token'));
  const profile={professionalId:7,professionalName:'Fisio A',schedules:[{schedule_id:'a',schedule_name:'Agenda A'}],developmentMode:false,needsSession:true};let sessions=0,agendaCalls=0;
  await physio.route('**/api/auth/login',r=>r.fulfill({json:{token:'local-login-test'}}));
  await physio.route('**/api/physio/me',r=>r.fulfill({json:profile}));
  await physio.route('**/api/physio/session',r=>{sessions++;return r.fulfill({json:{token:'shared-test-'+sessions,profile:{...profile,needsSession:false}}})});
  await physio.route('**/api/physio/agenda**',r=>{agendaCalls++;const appointment={id:'a1',patient_name:'Paciente da minha agenda',schedule_name:'Agenda A',startDate:'2026-11-11T12:00:00Z',status:'scheduled'};return agendaCalls===2?r.fulfill({status:428,json:{code:'PHYSIO_SESSION_REQUIRED'}}):r.fulfill({json:{items:[appointment],sessions:[{id:'a',number:1,start_time:'09:00',end_time:'09:45',items:[appointment]}]}})});
  await physio.route('**/api/physio/patients/search**',r=>r.fulfill({json:{items:[{external_id:'own-patient',full_name:'Paciente vinculado',appointments:[{id:'v1',date:'2026-11-11',startAt:'2026-11-11T12:00:00Z',schedule:'Agenda A',status:'finished'}]}],hasMore:false}}));
  await physio.route('**/api/auth/logout',r=>r.fulfill({status:204}));
  await physio.goto(origin+'/modo-fisio/entrar');await physio.getByRole('link',{name:'Entrar com senha',exact:true}).click();
  await physio.getByLabel(/^Usuário/).fill('fisio-local');await physio.getByLabel(/^Senha/).fill('Synthetic-only-123');await physio.getByRole('button',{name:'Entrar',exact:true}).click();
  await physio.waitForURL(/\/modo-fisio(?:\?|$)/);await physio.getByText('Paciente da minha agenda',{exact:true}).waitFor();assert.equal(sessions,1);
  assert.equal(await physio.evaluate(()=>localStorage.getItem('token')),'shared-test-1');assert.equal(await physio.getByRole('button',{name:/^Notificações/}).count(),0);
  await physio.screenshot({path:path.join(output,'own-agenda.png')});
  await Promise.all([physio.waitForResponse(r=>r.url().includes('/physio/agenda')&&r.status()===200),physio.getByLabel('Data',{exact:true}).fill('2026-11-12')]);
  await physio.getByText('Paciente da minha agenda',{exact:true}).waitFor();assert.equal(sessions,2);assert.equal(agendaCalls,3);
  await physio.getByRole('button',{name:'Pacientes',exact:true}).click();await physio.getByPlaceholder('Nome ou CPF do paciente').fill('Paciente');await physio.getByRole('button',{name:'Buscar',exact:true}).click();await physio.getByText('Paciente vinculado',{exact:true}).waitFor();
  await physio.getByRole('button',{name:'Sair',exact:true}).click();await physio.waitForURL('**/modo-fisio/entrar');assert.equal(await physio.evaluate(()=>localStorage.getItem('token')),null);
  assert.deepEqual(errors,[]);console.log('PASS password/notifications UI: local account/link retry, own agenda and patients, shared-session recovery, admin bell, unread/read/pagination, polling, desktop/tablet/mobile, logout.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
