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
    await page.addLocatorHandler(page.getByRole('dialog',{name:'Aba em somente leitura',exact:true}),async dialog=>{await dialog.getByRole('button',{name:'Entendi',exact:true}).click()});
    const fixture={...records[0],id:1,patient_id:1,requested_sessions:10,notes:'Original',documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{}};
    let evaluation=null,billingDone=false;const owners={},writes=[];
    await page.route('**/api/guide-processes/1/billing',r=>r.fulfill({json:{process_id:1,items:[],complete:billingDone}}));
    const complete=()=>({completed_at:new Date().toISOString(),completed_by:1});
    await page.route('**/api/treatment-updates',r=>r.fulfill({contentType:'text/event-stream',body:'data: refresh\n\n'}));
    await page.route('**/api/guide-processes/1',r=>{
      if(r.request().method()==='PUT'){Object.assign(fixture,r.request().postDataJSON());writes.push('save');}
      return r.fulfill({json:fixture});
    });
    await page.route('**/api/guide-processes/1/edit-lock/*',r=>{
      const stage=new URL(r.request().url()).pathname.split('/').pop(),editor=r.request().headers()['x-realmed-editor'];
      if(r.request().method()==='POST')owners[stage]=editor;
      if(r.request().method()==='DELETE')delete owners[stage];
      return r.fulfill({json:{locked:!!owners[stage],owned:owners[stage]===editor,owner:'Teste',expiresAt:Date.now()+60000}});
    });
    await page.route('**/api/guide-processes/1/stages/*/*',r=>{
      const parts=new URL(r.request().url()).pathname.split('/'),stage=parts.at(-2),action=parts.at(-1);
      if(action==='complete')fixture.workflow_stages[stage]=complete();else delete fixture.workflow_stages[stage];
      if(stage==='central'){
        if(action==='complete')fixture.workflow_stages.documents=fixture.workflow_stages.central;else delete fixture.workflow_stages.documents;
      }
      writes.push(stage+':'+action);
      return r.fulfill({json:{workflow_stages:fixture.workflow_stages,stage,completed:action==='complete'}});
    });
    await page.route('**/api/guide-processes/1/document-generation-options',r=>r.fulfill({json:[]}));
    await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{professionals:[],insurances:[],procedures:[{id:7,code:"31602185",description:"Procedimento fictício"}]}}));
    await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:evaluation}));
    await page.route('**/api/guide-processes/1/rotation**',r=>r.fulfill({json:r.request().url().endsWith('/history')?[]:null}));
    await page.route('**/api/guide-processes/1/procedures',r=>{
      const body=r.request().postDataJSON();fixture.procedures.push({id:7,code:'31602185',description:'Procedimento fictício',requested_quantity:body.requested_quantity});return r.fulfill({json:fixture.procedures[0]});
    });
    const tab=key=>page.locator('#treatment-tab-'+key);
    await page.goto(origin+'/central-de-guias/tratamentos/1?documents=1');
    await tab('reception').waitFor();
    assert.deepEqual(await page.getByRole('tab').allTextContents().then(a=>a.map(v=>v.trim())),['Recepção','Avaliação','Central de Guias','Liberação','Faturamento','Histórico']);
    for(const key of ['evaluation','central','authorization','billing'])assert.equal(await tab(key).isDisabled(),true,key);
    assert.equal(await tab('history').isDisabled(),false);
    const blockedAlert=async(key,previous)=>{
      await tab(key).click({force:true});
      const toast=page.locator('.notification-warning').filter({hasText:previous});await toast.waitFor();
      await toast.getByRole('button',{name:/Fechar notificação/}).click();
      assert.equal(await tab('reception').getAttribute('aria-selected'),'true','Blocked click must keep the current tab');
    };
    await blockedAlert('central','Recepção');
    assert.equal(await tab('central').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(242, 244, 247)');
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await page.getByRole('button',{name:'Finalizar etapa',exact:true}).click();
    await page.getByRole('button',{name:'Confirmar finalização',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#treatment-tab-evaluation').getAttribute('aria-disabled')==='false');
    assert.equal(await tab('central').isDisabled(),true);
    await blockedAlert('central','Avaliação');
    // A previously completed preparation does not bypass evaluation or documents.
    fixture.workflow_stages.central=complete();evaluation={id:1,status:'COMPLETED'};
    await page.reload();await tab('central').click();
    const central=page.locator('#treatment-tabpanel-central');
    await central.getByRole('heading',{name:'Procedimentos do tratamento'}).waitFor();
    await central.getByRole('heading',{name:'Documentos para liberação'}).waitFor();
    assert.equal(await tab('authorization').isDisabled(),true);
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await central.getByRole('button',{name:'Adicionar procedimento',exact:true}).click();
    const procedureDialog=page.getByRole('dialog',{name:'Adicionar procedimento',exact:true});
    await procedureDialog.getByRole('combobox').selectOption('7');
    await procedureDialog.getByRole('spinbutton').fill('10');
    await procedureDialog.getByRole('button',{name:'Adicionar procedimento',exact:true}).click();
    await procedureDialog.waitFor({state:'hidden'});
    await central.getByRole('cell',{name:'31602185',exact:true}).waitFor();
    assert.equal(await central.getByRole('button',{name:'Adicionar procedimento ao tratamento',exact:true}).count(),0);
    await central.getByLabel('Observações',{exact:true}).fill('Rascunho unificado');
    assert.equal(await central.getByRole('button',{name:'Finalizar etapa',exact:true}).count(),1);
    assert.equal(await central.getByRole('button',{name:'Salvar rascunho',exact:true}).count(),1);
    await central.getByRole('button',{name:'Salvar rascunho',exact:true}).click();
    await page.getByText('Rascunho salvo com sucesso.',{exact:true}).waitFor();
    assert.equal(fixture.notes,'Rascunho unificado');
    assert.equal(await tab('authorization').isDisabled(),true,'Saving is not completing');
    fixture.procedures=[{id:1,type:'CONSULTATION',requested_quantity:1},{id:2,type:'PHYSIOTHERAPY',requested_quantity:10},{id:3,type:'ELECTROSTIMULATION',requested_quantity:10}];
    fixture.documents=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'].map((document_type,i)=>({id:i+1,document_type,document_role:'GENERATED',original_name:'Teste.pdf'}));
    await page.getByRole('button',{name:'Terminar edição',exact:true}).click();await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await central.getByLabel('Observações',{exact:true}).fill('Salvo ao finalizar');
    await central.getByRole('button',{name:'Finalizar etapa',exact:true}).click();
    await page.getByRole('button',{name:'Confirmar finalização',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#treatment-tab-authorization').getAttribute('aria-disabled')==='false');
    assert.equal(fixture.notes,'Salvo ao finalizar');
    assert.deepEqual(writes.slice(-2),['save','central:complete']);
    assert.equal(await central.getByLabel('Observações',{exact:true}).isDisabled(),true);
    assert.equal(await tab('billing').isDisabled(),true);
    await tab('authorization').click();
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await page.getByRole('button',{name:'Finalizar etapa',exact:true}).click();
    await page.getByRole('button',{name:'Confirmar finalização',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#treatment-tab-billing').getAttribute('aria-disabled')==='false');
    await page.reload();await tab('central').click();
    assert.equal(await page.getByRole('dialog',{name:'Etapa finalizada',exact:true}).count(),0,'No completed-stage alert on entry');
    await central.getByLabel('Observações',{exact:true}).scrollIntoViewIfNeeded();
    const closedField=await central.getByLabel('Observações',{exact:true}).boundingBox();await page.mouse.click(closedField.x+20,closedField.y+20);
    const closedNotice=page.locator('.notification-warning').filter({hasText:'reabra a etapa primeiro'});await closedNotice.waitFor();
    await closedNotice.getByText(/reabra a etapa primeiro/).waitFor();await closedNotice.getByRole('button',{name:/Fechar notificação/}).click();

    const out=path.join(root,'.deployment/merged-central-qa');fs.mkdirSync(out,{recursive:true});
    await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
    await page.setViewportSize({width:1024,height:600});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await page.screenshot({path:path.join(out,'tablet.png'),fullPage:true});
    fixture.patient_name='Maria Aparecida de Oliveira Santos';
    await page.reload();await tab('central').click();
    for(const viewport of [{width:1366,height:900},{width:1024,height:600},{width:390,height:844}]) {
      await page.setViewportSize(viewport);
      await page.evaluate(()=>window.scrollTo(0,900));
      await page.waitForTimeout(150);
      const metrics=await page.evaluate(()=>{
        const context=document.querySelector('.treatment-context').getBoundingClientRect();
        const name=document.querySelector('#treatment-patient-name');
        return {top:context.top,bottom:context.bottom,size:parseFloat(getComputedStyle(name).fontSize),weight:getComputedStyle(name).fontWeight,name:name.textContent,width:document.documentElement.scrollWidth};
      });
      assert.ok(metrics.top>=0 && metrics.top<=10,'Patient card remains at the top while scrolling');
      assert.ok(metrics.bottom<viewport.height*0.65,'Sticky context leaves space to work');
      assert.ok(metrics.size>=28 && Number(metrics.weight)>=700,'Patient name is genuinely prominent');
      assert.equal(metrics.name,fixture.patient_name);
      assert.ok(metrics.width<=viewport.width+2);
      await page.screenshot({path:path.join(out,'patient-sticky-'+viewport.width+'.png')});
    }
    for(const [stages,clinical,expected] of [
      [[],null,'reception'],
      [['reception'],null,'evaluation'],
      [['reception'],'COMPLETED','central'],
      [['reception','documents'],'COMPLETED','authorization'],
      [['reception','documents','authorization'],'COMPLETED','billing'],
    ]) {
      fixture.workflow_stages=Object.fromEntries(stages.map(key=>[key,complete()]));
      evaluation=clinical?{id:1,status:clinical}:null;
      await page.goto(origin+'/central-de-guias/tratamentos/1?evaluate=1');
      await page.waitForFunction(key=>document.querySelector('#treatment-tab-'+key)?.getAttribute('aria-selected')==='true',expected);
    }
    billingDone=true;await page.reload();
    await page.waitForFunction(()=>document.querySelector('#treatment-tab-history')?.getAttribute('aria-selected')==='true');
    await tab('reception').click();
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await page.waitForTimeout(250);
    assert.equal(await tab('reception').getAttribute('aria-selected'),'true','Refresh preserves a manually selected completed stage');
    fixture.workflow_stages={reception:complete()};evaluation={id:1,status:'COMPLETED'};
    fixture.documents=[{id:100,document_type:'CONSULTATION_GUIDE',document_role:'GENERATED',original_name:'Guia teste.pdf',is_usable:true,created_at:'2026-11-06'}];
    await page.goto(origin+'/central-de-guias/tratamentos/1');
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    const viewDocument=central.getByRole('button',{name:'Visualizar Guia teste.pdf',exact:true});
    await viewDocument.waitFor();
    assert.equal(await viewDocument.locator('svg').count(),1);
    assert.equal(await viewDocument.getAttribute('title'),'Visualizar Guia teste.pdf');
    const removeDocument=central.getByRole('button',{name:'Remover Guia teste.pdf',exact:true});
    assert.ok((await removeDocument.getAttribute('class')).includes('is-danger'));
    assert.equal(await central.getByRole('button',{name:'Substituir documento',exact:true}).count(),1);
    await page.setViewportSize({width:1366,height:900});
    await page.locator('#treatment-documents').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'document-icons.png')});
    const guideTypes=['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'];
    const authorizationTestStatuses=Object.fromEntries(guideTypes.map(type=>[type,'AUTHORIZED']));
    const authorizationTestItems=()=>guideTypes.map((document_type,i)=>({document_type,label:['Consulta','Fisioterapia','Eletroestimulação'][i],status:authorizationTestStatuses[document_type],revision:0,applicable:true}));
    await page.route('**/api/guide-processes/1/authorization-guides',r=>r.fulfill({json:{items:authorizationTestItems(),partial:false}}));
    fixture.workflow_stages={reception:complete(),documents:complete(),authorization:complete()};
    fixture.documents=[
      {id:101,document_type:guideTypes[0],document_role:'GENERATED',original_name:'Consulta v1.pdf',document_version:1},
      {id:102,document_type:guideTypes[0],document_role:'GENERATED',original_name:'Consulta v2.pdf',document_version:2,created_at:'2026-11-02'},
      {id:103,document_type:guideTypes[0],document_role:'GENERATED',original_name:'Excluída v3.pdf',document_version:3,deleted_at:'2026-11-06'},
      {id:104,document_type:guideTypes[0],document_role:'RECEIVED',original_name:'Original recebido.pdf',document_version:10,created_at:'2026-11-01'},
      ...guideTypes.slice(1).map((document_type,i)=>({id:105+i,document_type,document_role:'GENERATED',original_name:'Guia unificada.pdf',document_version:4})),
    ];
    const pdf=await require('../../backend/node_modules/pdf-lib').PDFDocument.create();pdf.addPage();const pdfBytes=Buffer.from(await pdf.save());let downloadedId=null;
    await page.route('**/api/documents/*/download',r=>{downloadedId=Number(new URL(r.request().url()).pathname.split('/')[3]);return r.fulfill({contentType:'application/pdf',body:pdfBytes})});
    await page.reload();await tab('authorization').click();
    const release=page.locator('#treatment-tabpanel-authorization');
    await release.getByText('Consulta v2.pdf',{exact:true}).waitFor();
    assert.equal(await release.getByText('Consulta v1.pdf',{exact:true}).count(),0);
    assert.equal(await release.getByText('Excluída v3.pdf',{exact:true}).count(),0);
    assert.equal(await release.getByText('Original recebido.pdf',{exact:true}).count(),0);
    assert.equal(await release.getByText('Guia unificada.pdf',{exact:true}).count(),2);
    assert.equal(await release.getByRole('button',{name:'Visualizar documento de Consulta',exact:true}).isEnabled(),true);
    const writesBeforePreview=writes.length;
    await release.getByRole('button',{name:'Visualizar documento de Consulta',exact:true}).click();
    const previewDialog=page.getByRole('dialog',{name:'Consulta v2.pdf',exact:true});
    await previewDialog.waitFor();assert.equal(downloadedId,102);assert.equal(await previewDialog.locator('iframe').count(),1);
    await previewDialog.getByRole('button',{name:'Fechar',exact:true}).click();
    assert.equal(writes.length,writesBeforePreview,'Reading guides must not mutate authorization');
    await release.getByRole('columnheader',{name:'Documento da guia',exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'authorization-latest-guide.png'),fullPage:true});
    fixture.documents.push({id:107,document_type:guideTypes[0],document_role:'RECEIVED',original_name:'Anexo atualizado.pdf',created_at:'2026-11-03'});
    await page.reload();await tab('authorization').click();
    await release.getByText('Anexo atualizado.pdf',{exact:true}).waitFor();
    assert.equal(await release.getByText('Consulta v2.pdf',{exact:true}).count(),0);
    await release.getByRole('button',{name:'Visualizar documento de Consulta',exact:true}).click();
    await page.getByRole('dialog',{name:'Anexo atualizado.pdf',exact:true}).waitFor();assert.equal(downloadedId,107);
    await page.getByRole('dialog',{name:'Anexo atualizado.pdf',exact:true}).getByRole('button',{name:'Fechar',exact:true}).click();
    fixture.workflow_stages={reception:complete(),documents:complete()};
    for(const type of guideTypes)authorizationTestStatuses[type]='READY';
    let failBulk=true,bulkRequests=0;
    await page.route('**/api/guide-processes/1/authorization/status-together',r=>{
      const body=r.request().postDataJSON();bulkRequests++;assert.equal(body.status,'IN_PROGRESS');assert.equal(body.items.length,2);
      if(failBulk){failBulk=false;return r.fulfill({status:409,json:{error:'Outra pessoa alterou uma guia. Confira os dados.'}})}
      for(const item of body.items)authorizationTestStatuses[item.document_type]=body.status;
      return r.fulfill({json:{items:authorizationTestItems(),partial:false}});
    });
    await page.reload();
    const consultCheckbox=release.getByRole('checkbox',{name:'Selecionar Consulta para alterar status',exact:true});
    const physioCheckbox=release.getByRole('checkbox',{name:'Selecionar Fisioterapia para alterar status',exact:true});
    assert.equal(await consultCheckbox.isDisabled(),true,'Readonly requires Editar aba');
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await consultCheckbox.check();await physioCheckbox.check();
    assert.equal(await consultCheckbox.isChecked(),true);assert.equal(await physioCheckbox.isChecked(),true);
    await release.getByRole('button',{name:'Alterar status das guias selecionadas',exact:true}).click();
    const bulkDialog=page.getByRole('dialog',{name:'Alterar status das guias',exact:true});
    await bulkDialog.waitFor();assert.equal(await bulkDialog.getByLabel('Novo status',{exact:true}).inputValue(),'IN_PROGRESS');
    assert.equal(await bulkDialog.getByRole('option',{name:'Liberado',exact:true}).count(),0,'Cannot skip required forwarding');
    await bulkDialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();
    await page.locator('.notification-error').getByText('Outra pessoa alterou uma guia. Confira os dados.',{exact:true}).waitFor();
    assert.equal(await consultCheckbox.isChecked(),true);
    await bulkDialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();await bulkDialog.waitFor({state:'hidden'});
    assert.equal(bulkRequests,2);assert.equal(authorizationTestStatuses[guideTypes[0]],'IN_PROGRESS');assert.equal(authorizationTestStatuses[guideTypes[1]],'IN_PROGRESS');assert.equal(authorizationTestStatuses[guideTypes[2]],'READY');
    await release.getByRole('checkbox',{name:'Selecionar todas as guias disponíveis',exact:true}).check();
    for(const label of ['Consulta','Fisioterapia','Eletroestimulação'])assert.equal(await release.getByRole('checkbox',{name:'Selecionar '+label+' para alterar status',exact:true}).isChecked(),true);
    await page.screenshot({path:path.join(out,'bulk-status-selection.png'),fullPage:true});
    await page.route('**/api/guide-processes/1/edit-lock/authorization',r=>r.fulfill({json:{locked:true,owned:false,owner:'Colega de teste',expiresAt:Date.now()+60000}}));
    await page.reload();
    const colleagueNotice=page.locator('.notification-warning').filter({hasText:'Colega de teste está editando'});await colleagueNotice.waitFor();
    await colleagueNotice.getByText(/Colega de teste está editando/).waitFor();
    await colleagueNotice.getByRole('button',{name:/Fechar notificação/}).click();
    await page.getByText('Em edição por Colega de teste · Somente leitura',{exact:true}).waitFor();
    await page.screenshot({path:path.join(out,'editing-modal-status.png')});
    await page.removeLocatorHandler(page.getByRole('dialog',{name:'Aba em somente leitura',exact:true}));
    let modalEditorOwned=false;
    await page.route('**/api/guide-processes/1/edit-lock/authorization',r=>{if(r.request().method()==='POST')modalEditorOwned=true;return r.fulfill({json:{locked:modalEditorOwned,owned:modalEditorOwned,owner:'Teste',expiresAt:Date.now()+60000}})});
    await page.reload();
    const readNotice=page.locator('.notification-info').filter({hasText:'clique em Editar aba'});await readNotice.waitFor();
    await readNotice.getByText(/clique em Editar aba/).waitFor();
    await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await page.getByRole('button',{name:'Terminar edição',exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS sequential tabs, gray disabled stages, legacy preparation compatibility, merged contents, one save/finalize, persisted data, completion unlocks, readonly and tablet layout; APIs mocked.');
  } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
