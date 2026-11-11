const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare,records}=require('./verify-screen-pattern.cjs');
const root=path.resolve(__dirname,'../..'),origin='http://127.0.0.1:5199';
(async()=>{
  const server=spawn(process.execPath,[path.join(root,'frontend/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5199','--strictPort'],{cwd:path.join(root,'frontend'),windowsHide:true,stdio:'ignore'});
  let browser;
  try {
    for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,500));}
    browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
    const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await prepare(page);
    const fixture={...records[0],id:1,patient_id:1,requested_sessions:1,expected_start_date:'2026-11-09',treatment_days:[{day:'MONDAY',enabled:true,time:'14:00'}],documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{reception:{completed_at:new Date().toISOString()}}};
    const sessions=[{date:'2026-11-09',day:'MONDAY',requested_time:'14:00',session_time:'14:15',stenci_time:'14:18',free:3}];
    let evaluation=null,assignment=null,log=[],confirms=0;const owners={};
    await page.route('**/api/treatment-updates',r=>r.fulfill({contentType:'text/event-stream',body:'data: refresh\n\n'}));
    await page.route('**/api/guide-processes/1',r=>r.fulfill({json:fixture}));
    await page.route('**/api/guide-processes/1/edit-lock/*',r=>{
      const stage=new URL(r.request().url()).pathname.split('/').pop(),editor=r.request().headers()['x-realmed-editor'];
      if(r.request().method()==='POST')owners[stage]=editor;
      if(r.request().method()==='DELETE')delete owners[stage];
      return r.fulfill({json:{locked:!!owners[stage],owned:owners[stage]===editor,owner:'Teste',expiresAt:Date.now()+60000}});
    });
    await page.route('**/api/guide-processes/1/document-generation-options',r=>r.fulfill({json:[]}));
    await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{professionals:[{id:99,full_name:'Fisio sorteado',council:'CREFITO',active:true}],insurances:[],procedures:[]}}));
    await page.route('**/api/guide-processes/1/evaluation**',r=>{
      if(r.request().url().endsWith('/options'))return r.fulfill({json:{patient:{},professionals:[]}});
      if(['POST','PUT'].includes(r.request().method()))evaluation={...r.request().postDataJSON(),id:1,status:'IN_PROGRESS'};
      return r.fulfill({json:evaluation});
    });
    await page.route('**/api/guide-processes/1/rotation**',r=>{
      const route=new URL(r.request().url()).pathname;
      if(route.endsWith('/history'))return r.fulfill({json:log});
      if(route.endsWith('/suggest')){
        log=[{id:1,created_at:new Date().toISOString(),professional_name:'Fisio sorteado',schedule_name:'Agenda teste',user_name:'Teste',label:'Sorteio consultado',stenci_scheduled_confirmed:false}];
        return r.fulfill({json:{token:'suggestion-token',candidates:[{professional_id:99,professional_name:'Fisio sorteado',schedule_name:'Agenda teste',sessions}]}});
      }
      if(route.endsWith('/confirm')){
        assert.equal(r.request().postDataJSON().stenci_scheduled_confirmed,true);confirms++;
        assignment={guide_process_id:1,professional_id:99,professional_name:'Fisio sorteado',sessions};fixture.physiotherapist_id=99;fixture.physiotherapist_name='Fisio sorteado';
        log=[{...log[0],id:2,label:'Confirmado',stenci_scheduled_confirmed:true},...log];
        return r.fulfill({json:{assignment}});
      }
      return r.fulfill({json:assignment});
    });
    await page.goto(origin+'/central-de-guias/tratamentos/1?evaluate=1');
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    const assessor=page.locator('#digital-evaluation').getByLabel('Fisioterapeuta',{exact:true});
    await assessor.fill('Avaliadora original');
    await page.getByRole('button',{name:'Consultar próximo fisioterapeuta',exact:true}).click();
    const modal=page.getByRole('dialog',{name:'Confirmar fisioterapeuta sorteado'});
    await modal.waitFor();assert.equal(await modal.getByRole('button',{name:'Confirmar',exact:true}).isDisabled(),true);
    await modal.getByText('Fisio sorteado',{exact:true}).waitFor();
    const out=path.join(root,'.deployment/rotation-confirm-qa');fs.mkdirSync(out,{recursive:true});
    await page.screenshot({path:path.join(out,'modal.png'),fullPage:true});
    await modal.getByLabel('Agendei o paciente no Stenci',{exact:true}).check();
    await modal.getByRole('button',{name:'Confirmar',exact:true}).click();await modal.waitFor({state:'hidden'});
    assert.equal(confirms,1);assert.equal(await assessor.inputValue(),'Avaliadora original');
    await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();
    await page.getByText('Rascunho salvo com sucesso.',{exact:true}).first().waitFor();
    assert.equal(await page.getByRole('tab',{name:'Central de Guias',exact:true}).isDisabled(),true);
    evaluation.status='COMPLETED';
    await page.reload();
    await page.getByRole('tab',{name:'Central de Guias',exact:true}).click();
    assert.equal(await page.locator('#preparation-1-physiotherapist_id').inputValue(),'99');
    await page.reload();
    await page.getByRole('region',{name:'Histórico do sorteio'}).getByRole('cell',{name:'Confirmado',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Consultar próximo fisioterapeuta',exact:true}).count(),0);
    assert.equal(await page.getByRole('region',{name:'Histórico do sorteio'}).getByRole('cell',{name:'Fisio sorteado',exact:true}).count(),2);
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('region',{name:'Histórico do sorteio'}).scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await page.screenshot({path:path.join(out,'history-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: modal, mandatory booking checkbox, executor in Central, independent assessor, history after reload/completion, mobile layout; all writes mocked.');
  } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
