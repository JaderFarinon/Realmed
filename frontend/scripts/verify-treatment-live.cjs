const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare,records}=require('./verify-screen-pattern.cjs');
const root=path.resolve(__dirname,'../..'),origin='http://127.0.0.1:5198';
(async()=>{
  const server=spawn(process.execPath,[path.join(root,'frontend/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5198','--strictPort'],{cwd:path.join(root,'frontend'),windowsHide:true,stdio:'ignore'});
  let browser;
  try {
    for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break}catch{} await new Promise(r=>setTimeout(r,500));}
    browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
    const fixture={...records[0],id:1,patient_id:1,assessment_date:'2026-11-06',documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{}};
    let owner='',expires=0,writes=0,evaluation=null;
    const errors=[];
    const pages=[];
    for(let i=0;i<2;i++){
      const page=await browser.newPage({viewport:{width:1366,height:900}});
      page.on('pageerror',e=>errors.push(e.message));
      await prepare(page);
      await page.route('**/api/treatment-updates',r=>r.fulfill({contentType:'text/event-stream',body:'data: refresh\n\n'}));
      await page.route('**/api/guide-processes/1',async r=>{
        if(r.request().method()==='PUT'){
          assert.equal(r.request().headers()['x-realmed-editor'],owner);
          Object.assign(fixture,r.request().postDataJSON());writes++;
        }
        await r.fulfill({json:fixture});
      });
      await page.route('**/api/guide-processes/1/edit-lock/*',async r=>{
        const editor=r.request().headers()['x-realmed-editor'];
        if(r.request().method()==='POST'){
          if(owner && owner!==editor) return r.fulfill({status:423,json:{error:'Outra janela está editando.'}});
          owner=editor;expires=Date.now()+60000;
        } else if(r.request().method()==='DELETE' && owner===editor){owner='';expires=0;}
        await r.fulfill({json:{locked:!!owner,owned:!!owner&&owner===editor,owner:owner?'Ana — teste fictício':undefined,expiresAt:expires}});
      });
      await page.route('**/api/guide-processes/1/document-generation-options',r=>r.fulfill({json:[]}));
      await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:evaluation}));
      await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{professionals:[],insurances:[],procedures:[]}}));
      await page.route('**/api/guide-processes/1/stages/reception/complete',r=>{
        assert.equal(r.request().headers()['x-realmed-editor'],owner);
        fixture.workflow_stages.reception={completed_at:new Date().toISOString(),completed_by:999};
        return r.fulfill({json:{stage:'reception',completed:true,workflow_stages:fixture.workflow_stages}});
      });
      await page.goto(origin+'/central-de-guias/tratamentos/1');
      await page.getByRole('button',{name:'Editar aba',exact:true}).waitFor();
      pages.push(page);
    }
    const [a,b]=pages,field=p=>p.locator('[data-treatment-stage="reception"] input').first();
    assert.equal(await field(a).isDisabled(),true);
    await a.getByRole('button',{name:'Editar aba',exact:true}).click();
    await a.getByText('Você está editando a aba Recepção.',{exact:false}).waitFor();
    const warning=b.getByText('Ana — teste fictício está editando a aba Recepção.',{exact:false});
    await warning.waitFor({timeout:15000});
    assert.equal(await field(b).isDisabled(),true);
    assert.equal(await b.getByRole('button',{name:'Salvar rascunho',exact:true}).count(),0);
    await field(a).fill('07/11/2026');
    await a.getByRole('button',{name:'Salvar rascunho',exact:true}).click();
    await b.waitForFunction(()=>document.querySelector('[data-treatment-stage="reception"] input')?.value==='07/11/2026');
    assert.equal(writes,1);
    const out=path.join(root,'.deployment/live-edit-qa');fs.mkdirSync(out,{recursive:true});
    await b.screenshot({path:path.join(out,'other-editor.png'),fullPage:true});
    await a.getByRole('button',{name:'Finalizar etapa',exact:true}).click();
    await a.getByRole('button',{name:'Confirmar finalização',exact:true}).click();
    await b.locator('#treatment-tab-reception.is-complete').waitFor({timeout:15000});
    await b.getByRole('button',{name:'Editar aba',exact:true}).waitFor({timeout:15000});
    assert.equal(await field(b).isDisabled(),true);
    await b.getByRole('button',{name:'Editar aba',exact:true}).click();
    await b.getByRole('button',{name:'Reabrir etapa',exact:true}).waitFor();
    assert.equal(await b.locator('#treatment-tab-central').isDisabled(),false);
    assert.equal(await b.locator('#treatment-tab-evaluation').isDisabled(),false);
    assert.equal(await b.locator('#treatment-tab-documents').isDisabled(),true);
    fixture.workflow_stages.central={completed_at:new Date().toISOString()};
    await b.locator('#treatment-tab-central.is-complete').waitFor();
    assert.equal(await b.locator('#treatment-tab-documents').isDisabled(),true);
    evaluation={id:1,status:'COMPLETED'};
    await b.waitForFunction(()=>!document.querySelector('#treatment-tab-documents').disabled);
    assert.equal(await b.locator('#treatment-tab-authorization').isDisabled(),true);
    fixture.workflow_stages.documents={completed_at:new Date().toISOString()};
    await b.waitForFunction(()=>!document.querySelector('#treatment-tab-authorization').disabled);
    assert.equal(await b.locator('#treatment-tab-billing').isDisabled(),true);
    fixture.workflow_stages.authorization={completed_at:new Date().toISOString()};
    await b.waitForFunction(()=>!document.querySelector('#treatment-tab-billing').disabled);
    assert.deepEqual(errors,[]);
    console.log('PASS: two browser windows, edit lock, live updates, parallel Central/evaluation gates and sequential Documents/Authorization/Billing gates; synthetic data only.');
  } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
