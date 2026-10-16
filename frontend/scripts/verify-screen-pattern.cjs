const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict')
const playwrightRoot=process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
const {chromium}=require(playwrightRoot)
const origin=process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
const output=path.resolve(__dirname,'../../.deployment/screen-pattern-qa')
fs.mkdirSync(output,{recursive:true})
const records=Array.from({length:57},(_,i)=>({id:i+1,name:`Produto fictício ${i+1}`,full_name:`Paciente fictício ${i+1}`,nome:`Usuário fictício ${i+1}`,patient_name:`Paciente fictício ${i+1}`,username:`usuario${i+1}`,login:`usuario${i+1}`,email:`teste${i+1}@example.invalid`,cpf:'000.000.000-00',phone:'(41) 99999-0000',birth_date:'1990-01-01',role:'user',status:'active',active:1,code:String(i+1).padStart(6,'0'),description:`Descrição fictícia ${i+1}`,type:'PHYSIOTHERAPIST',council:'CREFITO',council_number:'0000',state:'PR',authorization_type:'STANDARD',category_id:1,presentation_id:1,minimum_quantity:5,quantity:10,category_name:'Categoria fictícia',presentation_name:'Unidade',requester_name:'Solicitante fictício',sector_id:1,sector_name:'Setor fictício',invoice_date:'2026-10-14',request_date:'2026-10-14',number:String(i+1),supplier_id:1,supplier_name:'Fornecedor fictício',closed:false,product_name:`Produto fictício ${i+1}`,product_id:i+1,requested_quantity:10,fulfilled_quantity:0,unit_price:'2.50',kind:'RECEIPT',delta:10,balance_after:10,created_at:'2026-10-14T12:00:00',document_type:'CONSULTATION_GUIDE',insurance_name:'Convênio fictício',insurance_provider_id:1,physiotherapist_name:'Fisioterapeuta fictício',assessment_date:'2026-10-14',expected_start_date:'2026-10-20',requested_sessions:10,authorized_sessions:null,performed_sessions:0,document_status:'INCOMPLETE',authorization_status:'NOT_READY',treatment_status:'WAITING',billing_status:'NOT_READY',priority:0,version:1,template_file_path:null}))
const treatment={...records[0],documents:Array.from({length:17},(_,i)=>({id:i+1,document_type:'PHYSIOTHERAPY_EVALUATION',document_version:i+1,original_name:`Ficha fictícia v${i+1}.pdf`,created_at:'2026-10-14T12:00:00',document_role:'GENERATED',source:'GENERATED',is_usable:true})),authorizations:[],procedures:[],pendingItems:[],history:[{id:1,action:'TREATMENT_CREATED',user_name:'Teste',created_at:'2026-10-14T12:00:00'}]}
async function prepare(page,user={id:999,role:'admin',username:'teste-visual',name:'Teste visual',permissionsEnabled:true,permissions:[]}){
  await page.addInitScript(()=>localStorage.setItem('token','synthetic-ui-test'))
  await page.route('**/api/**',async route=>{
    assert.equal(route.request().method(),'GET','Visual verification must never write data')
    const url=new URL(route.request().url()),p=url.pathname
    let data=records
    if(p==='/api/auth/me')data={user}
    else if(p==='/api/guide-processes'){const size=Number(url.searchParams.get('pageSize')||20),pageNum=Number(url.searchParams.get('page')||1);data={data:records.slice((pageNum-1)*size,pageNum*size),pagination:{page:pageNum,pageSize:size,total:records.length,pages:Math.ceil(records.length/size)}}}
    else if(p==='/api/guide-processes/1')data=treatment
    else if(p.endsWith('/evaluation'))data=null
    else if(p==='/api/patients/1')data={...records[0],insurances:records.map(r=>({...r,card_number:'FICTICIA',plan:'Plano fictício'})),processes:records}
    else if(p==='/api/inventory/options')data={products:records,sectors:records,categories:records,presentations:records,suppliers:records,users:records,profile:{sector_id:1,profile:'USER'},canFilterSectors:true}
    else if(p==='/api/inventory/requests')data=records.map(r=>({...r,status:'PENDENTE'}))
    else if(p==='/api/inventory/requests/1')data={...records[0],status:'PENDENTE',items:records.map(r=>({...r,status:'PENDENTE'}))}
    else if(p==='/api/inventory/invoices/1')data={...records[0],items:records,total:1425}
    else if(p==='/api/inventory/dashboard')data={cards:{products:57,zero:2,belowMinimum:4,pending:5,waiting:1,purchaseValue:300},alerts:records.slice(0,10),topProducts:records.slice(0,10),monthlyPurchases:[{month:'2026-10',total:300}]}
    else if(p==='/api/dashboard')data={preparation:3,ready:2,authorized:1}
    else if(p==='/api/permissoes/catalog')data=[{key:'guide_processes',label:'Tratamentos'},{key:'inventory_stock',label:'Estoque'}]
    else if(p==='/api/permissoes/users')data={users:records,sectors:records}
    else if(/^\/api\/permissoes\/\d+$/.test(p))data={userId:1,permissions:[]}
    else if(/^\/api\/document-templates\/\d+$/.test(p))data={...records[0],fields:[{id:1,field_key:'PATIENT_NAME',page:1,x:10,y:20,font_size:10,alignment:'LEFT',options:{required:true}}]}
    else if(p==='/api/integrations/stenci/status')data={enabled:true,status:'CONFIGURED',api_x_base_url_configured:true,api_base_url_configured:true,authentication_configured:true,last_operation:null,last_error:null}
    else if(p.startsWith('/api/integrations/stenci/'))data={items:[],hasMore:false}
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
  })
}
const listPages=['/pacientes','/central-de-guias/tratamentos','/cadastros/convenios','/cadastros/profissionais','/cadastros/procedimentos','/cadastros/modelos-documentos','/usuarios','/configuracoes/permissoes',...['saldos','produtos','fornecedores','setores','categorias','apresentacoes','notas-fiscais','pedidos','relatorios'].map(p=>'/estoque/'+p)]
async function run(){
  const browser=await chromium.launch({headless:true}),errors=[]
  const page=await browser.newPage()
  page.on('pageerror',error=>errors.push(error.message));await prepare(page)
  try{
    for(const viewport of [{width:1366,height:768},{width:1920,height:1080},{width:1024,height:650},{width:390,height:844}]){
      await page.setViewportSize(viewport)
      for(const route of listPages){
        await page.goto(origin+route);await page.locator('.list-table tbody tr[aria-selected]').first().waitFor();await page.waitForTimeout(180)
        const metrics=await page.evaluate(()=>({height:innerHeight,width:innerWidth,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,pagination:document.querySelector('.list-pagination')?.getBoundingClientRect().bottom,table:document.querySelector('.list-table-viewport')?.getBoundingClientRect().toJSON(),rows:Array.from(document.querySelectorAll('.list-table tbody tr[aria-selected]')).map(el=>el.getBoundingClientRect().toJSON())}))
        assert.ok(metrics.documentWidth<=viewport.width+2,`${route}: horizontal page overflow at ${viewport.width}`)
        if(viewport.width>=1024){assert.ok(metrics.documentHeight<=viewport.height+3,`${route}: desktop page scroll (${metrics.documentHeight}) at ${viewport.width}x${viewport.height}`);assert.ok(metrics.pagination<=viewport.height,`${route}: pagination below viewport`);assert.ok(metrics.rows.at(-1).bottom<=metrics.table.bottom+2,`${route}: clipped last row`)}
        const edit=page.locator('.list-actions button[aria-label^="Editar"],.list-actions button[aria-label^="Configurar"],.list-actions button[aria-label^="Ajustar"] ').first()
        if(await edit.count())assert.equal(await edit.isDisabled(),true,route+' edit must require selection')
        await page.locator('.list-table tbody tr[aria-selected]').first().click()
        await page.waitForTimeout(50)
        await page.locator('.list-table tbody tr[aria-selected="true"]').first().waitFor()
        if(await edit.count())assert.equal(await edit.isDisabled(),false,route+' edit must activate after selection')
        const next=page.getByRole('button',{name:'Próxima página',exact:true}).first()
        if(!await next.isDisabled()){await next.click();await page.waitForTimeout(160);assert.equal(await page.locator('.list-table tbody tr[aria-selected="true"]').count(),0,route+' page change must clear selection')}
        if(['/estoque/produtos','/central-de-guias/tratamentos','/usuarios'].includes(route)&&viewport.width===1366)await page.screenshot({path:path.join(output,route.split('/').filter(Boolean).join('-')+'.png'),fullPage:true})
      }
    }
    await page.setViewportSize({width:1366,height:768})
    for(const route of ['/pacientes','/cadastros/convenios','/cadastros/profissionais','/cadastros/procedimentos','/cadastros/modelos-documentos','/usuarios','/configuracoes/permissoes','/estoque/produtos','/estoque/pedidos','/estoque/notas-fiscais']){
      await page.goto(origin+route);await page.locator('.list-table tbody tr[aria-selected]').first().waitFor();await page.waitForTimeout(150);await page.locator('.list-table tbody tr[aria-selected]').first().click()
      const action=page.locator('.list-actions button[aria-label^="Editar"],.list-actions button[aria-label^="Configurar"]').first();await action.click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').locator('input,select,textarea').first().waitFor();assert.ok(await page.getByRole('dialog').locator('input,select,textarea').count(),route+' form must preserve fields');await page.screenshot({path:path.join(output,'dialog-'+route.split('/').filter(Boolean).join('-')+'.png')});await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0)
    }
    await page.goto(origin+'/estoque/pedidos');await page.locator('.list-table tbody tr').first().click();await page.getByRole('button',{name:'Abrir selecionado',exact:true}).click();await page.getByRole('dialog').waitFor();const dialog=page.getByRole('dialog');assert.equal(await dialog.getByRole('button',{name:'Editar item selecionado',exact:true}).isDisabled(),true);await dialog.locator('tbody tr[aria-selected]').first().click();await dialog.getByRole('button',{name:'Editar item selecionado',exact:true}).click();await page.waitForTimeout(100);assert.equal(await page.getByRole('dialog').count(),2,'item editor must open above request details');await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),1);await page.keyboard.press('Escape')
    for(const route of ['/dashboard','/estoque/resumo','/pacientes/1','/central-de-guias/novo','/central-de-guias/tratamentos/1','/integracoes/stenci','/sem-permissao']){await page.goto(origin+route);await page.waitForTimeout(180);assert.equal(await page.locator('.page-heading h1').count(),1,route+' shared heading')}
    const denied=await browser.newPage();await prepare(denied,{id:2,role:'user',username:'sem-acesso',name:'Teste sem permissão',permissionsEnabled:true,permissions:[]});await denied.goto(origin+'/estoque/produtos');await denied.waitForURL('**/sem-permissao');assert.equal(await denied.evaluate(()=>Boolean(localStorage.getItem('token'))),true);assert.ok(await denied.getByRole('link',{name:'Produtos',exact:true}).count(),'menu must remain visible');await denied.close()
    assert.deepEqual(errors,[],'Browser runtime errors')
    console.log('PASS: shared screen pattern, responsive capacity, selection, server pagination, dialogs, preserved forms and permission page. Screenshots: '+output)
  }finally{await browser.close()}
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1})
module.exports={prepare,records}
