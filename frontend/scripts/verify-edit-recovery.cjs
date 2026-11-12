const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare,records}=require('./verify-screen-pattern.cjs');
const locks=require('../../backend/services/treatmentEditLocks');
const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const errors=[],calls=[],owners={},offline=new Set(),editors=new Map();
 const fixture={...records[0],patient_id:1,notes:'Dados originais',documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{reception:{completed_at:'2026-11-11'}}};
 const output=path.resolve(__dirname,'../../.deployment/edit-recovery-qa');fs.mkdirSync(output,{recursive:true});
 try{
  async function pageFor(name,userId=999,canEdit=true){
   const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
   await prepare(page,canEdit?{id:userId,role:'admin',username:name,name,permissionsEnabled:true,permissions:[]}:{id:userId,role:'user',username:name,name,permissionsEnabled:true,permissions:[{moduleKey:'guide_processes',canView:true,canEdit:false,canCreate:false,canDelete:false}]});
   await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+100));
   await page.route('**/api/treatment-updates',r=>r.fulfill({contentType:'text/event-stream',body:'data: refresh\n\n'}));
   await page.route('**/api/guide-processes/1',r=>{assert.equal(r.request().method(),'GET','Recovery must not save stale fields');return r.fulfill({json:fixture})});
   await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:{id:1,status:'COMPLETED'}}));
   for(const endpoint of ['rotation','document-generation-options'])await page.route('**/api/guide-processes/1/'+endpoint+'**',r=>r.fulfill({json:[]}));
   await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{professionals:[],insurances:[],procedures:[]}}));
   await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:[],partial:false}}));
   await page.route('**/api/guide-processes/1/edit-lock/*',r=>{
    if(offline.has(name))return r.abort('internetdisconnected');
    const stage=new URL(r.request().url()).pathname.split('/').pop(),editor=r.request().headers()['x-realmed-editor'];editors.set(name,editor);
    const method=r.request().method(),body=method==='POST'?r.request().postDataJSON():{};calls.push({name,method,body,stage});
    try{
     if(method==='POST'){
      assert.ok(canEdit);locks.assertReservation(owners[stage],userId,editor,body);
      owners[stage]={owner_id:userId,editor_id:editor,expires_at:Date.now()+60000};
     }
     if(method==='DELETE'&&locks.owned(owners[stage],userId,editor))owners[stage].expires_at=0;
     const row=owners[stage],active=locks.active(row),owned=locks.owned(row,userId,editor),sameUser=active&&row.owner_id===userId;
     return r.fulfill({json:{locked:active,owned,sameUser,owner:'Pessoa de teste',expiresAt:row?.expires_at,...(active&&sameUser&&!owned?{recoverFrom:row.editor_id}:{})}});
    }catch(e){return r.fulfill({status:e.status||500,json:{error:e.message,code:e.code}})}
   });
   await page.goto(origin+'/central-de-guias/tratamentos/1');await page.getByRole('tab',{name:'Central de Guias',exact:true}).click();
   await page.locator('#treatment-tabpanel-central').getByLabel('Observações',{exact:true}).waitFor();return page;
  }
  const notes=p=>p.locator('#treatment-tabpanel-central').getByLabel('Observações',{exact:true});
  const recovering=p=>p.getByRole('button',{name:'Recuperar edição',exact:true});
  const dialog=p=>p.getByRole('dialog',{name:'Recuperar edição nesta janela?',exact:true});
  const focus=async p=>{await p.evaluate(()=>window.dispatchEvent(new Event('online')))};
  const confirm=async p=>{await recovering(p).click();await dialog(p).getByRole('button',{name:'Confirmar recuperação',exact:true}).click();await p.getByText('Edição recuperada nesta janela. Os dados salvos foram atualizados.',{exact:true}).waitFor()};
  const a=await pageFor('janela-a');await a.getByRole('button',{name:'Editar aba',exact:true}).click();await notes(a).fill('Rascunho da janela A');
  offline.add('janela-a');
  const b=await pageFor('janela-b');await recovering(b).waitFor();assert.equal(await notes(b).isDisabled(),true);
  await recovering(b).click();await dialog(b).getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(owners.central.editor_id,editors.get('janela-a'));
  for(const viewport of [{width:1366,height:900},{width:1024,height:600},{width:390,height:844}]){
   await b.setViewportSize(viewport);await recovering(b).click();
   assert.ok(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   const box=await dialog(b).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=viewport.width+2);
   await b.screenshot({path:path.join(output,'confirmation-'+viewport.width+'.png')});
   await dialog(b).getByRole('button',{name:'Cancelar',exact:true}).click();
  }
  await b.setViewportSize({width:1366,height:900});fixture.notes='Dados mais recentes do servidor';
  await confirm(b);assert.equal(await notes(b).inputValue(),fixture.notes);assert.equal(await notes(b).isDisabled(),false);
  assert.equal(owners.central.editor_id,editors.get('janela-b'));
  offline.delete('janela-a');await focus(a);await recovering(a).waitFor();
  assert.equal(await notes(a).isDisabled(),true);assert.equal(await notes(a).inputValue(),'Rascunho da janela A','Lost lease preserves the local draft');
  await a.getByText('Sua reserva de edição terminou ou foi recuperada em outra janela. Os dados não salvos continuam nesta tela.',{exact:true}).waitFor();
  const before=calls.filter(c=>c.name==='janela-a'&&c.method==='POST').length;
  await a.clock.runFor(15001);assert.equal(calls.filter(c=>c.name==='janela-a'&&c.method==='POST').length,before,'No automatic takeover from the old window');
  const c=await pageFor('outra-conta',1000);await c.getByText('Em edição por Pessoa de teste · Somente leitura',{exact:true}).waitFor();assert.equal(await recovering(c).count(),0);assert.equal(await notes(c).isDisabled(),true);
  const viewer=await pageFor('sem-permissao',999,false);assert.equal(await recovering(viewer).count(),0);assert.equal(await notes(viewer).isDisabled(),true);
  // A stale recovery modal cannot transfer a reservation that has since changed.
  const d=await pageFor('janela-d');await recovering(d).click();
  await recovering(a).click();a.once('dialog',d=>d.dismiss());await dialog(a).getByRole('button',{name:'Confirmar recuperação',exact:true}).click();
  await dialog(a).waitFor({state:'hidden'});assert.equal(owners.central.editor_id,editors.get('janela-b'));assert.equal(await notes(a).inputValue(),'Rascunho da janela A');
  await recovering(a).click();a.once('dialog',d=>d.accept());await dialog(a).getByRole('button',{name:'Confirmar recuperação',exact:true}).click();
  await a.getByText('Edição recuperada nesta janela. Os dados salvos foram atualizados.',{exact:true}).waitFor();assert.equal(await notes(a).inputValue(),fixture.notes);
  await dialog(d).getByRole('button',{name:'Confirmar recuperação',exact:true}).click();
  await d.getByText('A reserva de edição mudou. Confira a situação atual da aba e tente novamente.',{exact:true}).waitFor();assert.equal(await notes(d).isDisabled(),true);
  await focus(b);await recovering(b).waitFor();assert.equal(await notes(b).isDisabled(),true);
  // A completed stage stays completed even after its reservation is recovered.
  fixture.workflow_stages.documents={completed_at:'2026-11-11'};fixture.workflow_stages.central=fixture.workflow_stages.documents;
  await confirm(b);assert.equal(await notes(b).isDisabled(),true);assert.equal(await b.getByRole('button',{name:'Reabrir etapa',exact:true}).count(),1);
  assert.ok((await b.getByRole('tab',{name:/Central de Guias/}).textContent()).includes('✓'));
  await b.screenshot({path:path.join(output,'completed-stage.png')});
  assert.deepEqual(errors,[]);console.log('PASS edit recovery UI: own/foreign accounts, permissions, cancel/confirm, responsive modal, fresh data, reconnect, draft preservation/discard, no automatic takeover, stale dialog, completed stage.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
