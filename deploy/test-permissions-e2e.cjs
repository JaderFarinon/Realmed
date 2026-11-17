// Real browser + complete API + disposable local MySQL. No production accounts or API mocks.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..'), dep = name => require(path.join(root, 'backend/node_modules', name));
const { chromium } = require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function main() {
  const env = dep('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST), 'Disposable database must be local');
  const name = 'realmed_permissions_e2e_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  const connection = {host:env.DB_HOST, port:Number(env.DB_PORT), user:env.DB_USER, password:env.DB_PASS};
  const owner = await dep('mysql2/promise').createConnection(connection);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'realmed-permissions-'));
  let created = false, db, app, server, vite, browser;
  try {
    await owner.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [name]); created = true;
    const settings = {...env, DB_NAME:name, JWT_SECRET:crypto.randomBytes(32).toString('hex'), NODE_ENV:'test', PERMISSIONS_ENABLED:'true', STENCI_ENABLED:'false'};
    fs.writeFileSync(path.join(temp,'.env'), Object.entries(settings).map(([k,v])=>`${k}=${JSON.stringify(String(v))}`).join('\n'), {mode:0o600});
    process.env.DOTENV_CONFIG_PATH = path.join(temp,'.env'); process.chdir(temp);
    require(path.join(root,'backend/db'));
    db = dep('knex')({client:'mysql2', connection:{...connection,database:name}, migrations:{directory:path.join(root,'backend/migrations')}});
    await db.migrate.latest();
    const password = crypto.randomBytes(18).toString('hex');
    const [person] = await db('people').insert({full_name:'Administrador de teste'});
    const [actor] = await db('users').insert({person_id:person,username:'test-admin',role:'admin',status:'active',auth_provider:'LOCAL',password_hash:await dep('bcryptjs').hash(password,4)});
    const [sector] = await db('inventory_sectors').insert({name:'Setor de teste',active:true});
    app = require(path.join(root,'backend/app')).createApp();
    server = await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
    const base = 'http://127.0.0.1:'+server.address().port;
    process.env.VITE_API_URL = base;
    process.chdir(path.join(root,'frontend')); // Tailwind discovers the same sources as the production build.
    const {createServer} = await import(pathToFileURL(path.join(root,'frontend/node_modules/vite/dist/node/index.js')).href);
    vite = await createServer({root:path.join(root,'frontend'),server:{host:'127.0.0.1',port:5198,strictPort:true},logLevel:'error'}); await vite.listen();
    const origin = 'http://127.0.0.1:5198';
    browser = await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
    const errors = [], responses = [];
    async function page() {const p=await browser.newPage({viewport:{width:1440,height:1000}}); p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base))responses.push({path:new URL(r.url()).pathname,status:r.status()})}); return p;}
    async function login(p,username) {await p.goto(origin+'/login');await p.getByLabel('Usuário',{exact:true}).fill(username);await p.getByLabel('Senha',{exact:true}).fill(password);await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.waitForURL(u=>u.pathname!='/login');}
    const adminPage=await page();await login(adminPage,'test-admin');
    const adminToken=await adminPage.evaluate(()=>localStorage.getItem('token'));
    async function call(method,url,body,token=adminToken,status=200) {
      const r=await fetch(base+'/api'+url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      const data=r.status===204?null:await r.json();assert.equal(r.status,status,`${method} ${url}: ${JSON.stringify(data)}`);return data;
    }
    const staff=await call('POST','/usuarios',{nome:'Pessoa de teste',login:'test-staff',authProvider:'LOCAL',senha:password,confirmarSenha:password,role:'user',status:'active'},adminToken,201);
    async function editor() {await adminPage.goto(origin+'/configuracoes/permissoes?userId='+staff.id);await adminPage.getByRole('button',{name:'Salvar permissões',exact:true}).waitFor();await adminPage.getByRole('region',{name:'Permissões de Tratamentos',exact:true}).waitFor();}
    async function save() {await adminPage.getByRole('button',{name:'Salvar permissões',exact:true}).click();await adminPage.getByText('Permissões salvas.',{exact:true}).waitFor();}
    await editor();
    await adminPage.getByRole('checkbox',{name:'Visualizar Pacientes',exact:true}).check();
    await adminPage.getByRole('checkbox',{name:'Criar Pacientes',exact:true}).check();
    const editPatient=adminPage.getByRole('checkbox',{name:'Editar / operar Pacientes',exact:true});
    await editPatient.focus();await editPatient.press('Space');assert.ok(await editPatient.isChecked(),'Space must toggle a permission checkbox');await editPatient.press('Space');assert.equal(await editPatient.isChecked(),false);
    await save();
    let rights=(await call('GET','/permissoes/'+staff.id)).permissions.find(p=>p.moduleKey==='patients');assert.deepEqual([rights.canView,rights.canCreate,rights.canEdit,rights.canDelete],[true,true,false,false]);
    await editor();assert.ok(await adminPage.getByRole('checkbox',{name:'Visualizar Pacientes',exact:true}).isChecked());
    const staffPage=await page();await login(staffPage,'test-staff');await staffPage.waitForURL('**/pacientes');
    const staffToken=await staffPage.evaluate(()=>localStorage.getItem('token'));
    await call('GET','/patients',undefined,staffToken);
    const patient=await call('POST','/patients',{full_name:'Paciente de teste'},staffToken,201);
    await call('PUT','/patients/'+patient.id,{full_name:'Proibido'},staffToken,403);
    await call('GET','/permissoes/users',undefined,staffToken,403);
    console.log('PASS individual checkboxes persist; real user login, view/create allowed, edit/admin denied.');
    // Mandatory host access is proposed, never silently granted.
    const billingCheckbox=adminPage.getByRole('checkbox',{name:'Visualizar Tratamentos — Faturamento por guia',exact:true});
    const hostCheckbox=adminPage.getByRole('checkbox',{name:'Visualizar Tratamentos — Gestão de tratamentos',exact:true});
    await billingCheckbox.click();const dependencyDialog=adminPage.getByRole('dialog',{name:'Autorizar acessos necessários?',exact:true});
    await dependencyDialog.waitFor();assert.equal(await hostCheckbox.isChecked(),false);
    await dependencyDialog.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await billingCheckbox.isChecked(),false);assert.equal(await hostCheckbox.isChecked(),false);
    await billingCheckbox.click();await dependencyDialog.getByRole('button',{name:'Marcar acessos necessários',exact:true}).click();assert.ok(await hostCheckbox.isChecked());assert.ok(await billingCheckbox.isChecked());
    await hostCheckbox.click();const removalDialog=adminPage.getByRole('dialog',{name:'Remover acessos dependentes?',exact:true});await removalDialog.waitFor();await removalDialog.getByRole('button',{name:'Cancelar',exact:true}).click();assert.ok(await hostCheckbox.isChecked());
    await hostCheckbox.click();await removalDialog.getByRole('button',{name:'Confirmar remoção',exact:true}).click();assert.equal(await billingCheckbox.isChecked(),false);
    await call('POST','/permissoes/'+staff.id,{permissions:[{moduleKey:'authorizations',canView:true}]},adminToken,422);
    console.log('PASS dependency dialog: cancel, explicit approval, removal cascade and direct API rejection.');
    await adminPage.getByRole('region',{name:'Permissões de Tratamentos',exact:true}).getByRole('button',{name:'Sem excluir',exact:true}).click();await save();
    await staffPage.goto(origin+'/central-de-guias/tratamentos');
    await staffPage.getByRole('heading',{name:'Gestão de Tratamentos',exact:true}).waitFor();
    await staffPage.waitForTimeout(800);
    assert.equal(new URL(staffPage.url()).pathname,'/central-de-guias/tratamentos','Treatment-only access must not require unrelated catalog permissions');
    assert.deepEqual(responses.filter(r=>r.status===403&&['/api/insurance-providers','/api/professionals'].includes(r.path)),[],'Treatment filters must use authorized scoped lookups');
    console.log('PASS treatment-only access without catalog grants.');
    const treatment=await call('POST','/guide-processes',{patient_id:patient.id,assessment_date:'2026-11-16'},staffToken,201);
    await staffPage.goto(origin+'/central-de-guias/tratamentos/'+treatment.id);
    await staffPage.getByText('Paciente de teste',{exact:true}).first().waitFor();await staffPage.waitForTimeout(500);
    assert.equal(new URL(staffPage.url()).pathname,'/central-de-guias/tratamentos/'+treatment.id);
    await staffPage.getByRole('button',{name:'Editar aba',exact:true}).click();
    await staffPage.getByRole('button',{name:'Terminar edição',exact:true}).waitFor();
    await staffPage.getByRole('button',{name:'Terminar edição',exact:true}).click();
    console.log('PASS treatment detail and editing with User role.');
    // Module shortcuts go through the actual form and save API.
    await editor();await adminPage.getByLabel('Setor',{exact:true}).selectOption(String(sector));
    const groups=adminPage.getByRole('button',{name:'Habilitar tudo',exact:true});
    for(let i=0;i<await groups.count();i++)await groups.nth(i).click();
    await save();
    rights=(await call('GET','/permissoes/'+staff.id)).permissions;
    assert.ok(rights.filter(p=>p.moduleKey!=='integrations').every(p=>p.canView&&p.canCreate&&p.canEdit&&p.canDelete));
    assert.equal((await call('GET','/auth/me',undefined,staffToken)).user.role,'user');
    const screenPaths=['/central-de-guias/dashboard','/central-de-guias/tratamentos','/pacientes','/cadastros/profissionais','/cadastros/convenios','/cadastros/convenios/procedimentos-gerais','/cadastros/convenios/regras','/cadastros/modelos-documentos','/estoque/resumo','/estoque/saldos','/estoque/produtos','/estoque/fornecedores','/estoque/setores','/estoque/categorias','/estoque/apresentacoes','/estoque/notas-fiscais','/estoque/requisicoes-anteriores','/estoque/requisicoes','/estoque/pedidos','/estoque/relatorios','/faturamento/dashboard','/faturamento/relatorios','/eventos/confraternizacao-2026','/indicadores/paineis','/indicadores/analise-critica'];
    const failures=[];
    for(const screen of screenPaths){
      const start=responses.length;await staffPage.goto(origin+screen);await staffPage.locator('h1').first().waitFor();await staffPage.waitForTimeout(350);
      const denied=responses.slice(start).filter(r=>r.status>=400);
      if(new URL(staffPage.url()).pathname!==screen||denied.length)failures.push({screen,landed:new URL(staffPage.url()).pathname,denied});
    }
    assert.deepEqual(failures,[],'All granted operational screens must load without denied secondary requests');
    console.log('PASS all 25 operational screens with grants, no administrator role.');
    // Revocation while a form is open must reject the API write without losing the draft/session.
    await staffPage.goto(origin+'/pacientes');await staffPage.getByRole('button',{name:'Novo paciente',exact:true}).click();
    const patientForm=staffPage.getByRole('dialog',{name:'Novo paciente',exact:true});await patientForm.getByLabel('Nome completo',{exact:true}).fill('Rascunho preservado');
    await call('POST','/permissoes/'+staff.id,{permissions:[{moduleKey:'patients',canView:true}]});
    const deniedSave=staffPage.waitForResponse(r=>new URL(r.url()).pathname==='/api/patients'&&r.request().method()==='POST');
    await patientForm.getByRole('button',{name:'Salvar',exact:true}).click();assert.equal((await deniedSave).status(),403);
    await staffPage.getByText('Usuário sem permissão a essa função',{exact:true}).first().waitFor();
    assert.equal(await patientForm.getByLabel('Nome completo',{exact:true}).inputValue(),'Rascunho preservado');
    assert.equal(new URL(staffPage.url()).pathname,'/pacientes');assert.equal(await staffPage.evaluate(()=>localStorage.getItem('token')),staffToken);
    assert.equal((await db('patients').where({full_name:'Rascunho preservado'})).length,0);
    await patientForm.getByRole('button',{name:'Cancelar',exact:true}).click();await staffPage.reload();
    assert.ok(await staffPage.getByRole('button',{name:'Novo paciente',exact:true}).isDisabled());
    await staffPage.locator('tbody tr[aria-selected]').first().click();assert.ok(await staffPage.getByRole('button',{name:'Editar paciente selecionado',exact:true}).isDisabled());
    await call('POST','/patients',{full_name:'Proibido'},staffToken,403);
    await call('PUT','/patients/'+patient.id,{full_name:'Proibido'},staffToken,403);
    console.log('PASS immediate revocation: rejected write, draft/token retained, read-only controls and direct API enforced.');
    // Stock-only accounts need neither treatments nor an administrator role.
    await editor();await adminPage.getByLabel('Setor',{exact:true}).selectOption(String(sector));
    await adminPage.getByRole('region',{name:'Permissões de Estoque',exact:true}).getByRole('button',{name:'Sem excluir',exact:true}).click();await save();
    const stockPage=await page();await login(stockPage,'test-staff');await stockPage.waitForURL('**/estoque/resumo');
    const stockToken=await stockPage.evaluate(()=>localStorage.getItem('token'));
    const supplier=await call('POST','/inventory/suppliers',{name:'Fornecedor de teste'},stockToken,201);
    await call('PUT','/inventory/suppliers/'+supplier.id,{name:'Fornecedor editado'},stockToken);
    await call('DELETE','/inventory/suppliers/'+supplier.id,undefined,stockToken,403);
    await call('PATCH','/inventory/suppliers/'+supplier.id+'/active',{active:false},stockToken,403);
    await stockPage.goto(origin+'/estoque/fornecedores');await stockPage.getByText('Fornecedor editado',{exact:true}).click();
    assert.ok(await stockPage.getByRole('button',{name:/Inativar selecionado|Excluir selecionado/}).first().isDisabled());
    const viewOnly=(await call('GET','/permissoes/'+staff.id)).permissions.map(p=>({...p,canCreate:false,canEdit:false,canDelete:false}));
    await call('POST','/permissoes/'+staff.id,{permissions:viewOnly});
    await call('GET','/inventory/suppliers',undefined,stockToken);
    await call('POST','/inventory/suppliers',{name:'Proibido'},stockToken,403);
    await call('PUT','/inventory/suppliers/'+supplier.id,{name:'Proibido'},stockToken,403);
    await call('POST','/permissoes/'+staff.id,{permissions:[{moduleKey:'inventory_suppliers',canView:true,canDelete:true}]});
    await call('DELETE','/inventory/suppliers/'+supplier.id,undefined,stockToken,204);
    assert.equal(Number((await db('inventory_suppliers').where({id:supplier.id}).first()).active),0);
    await call('POST','/inventory/suppliers',{name:'Proibido'},stockToken,403);
    await call('PUT','/inventory/suppliers/'+supplier.id,{name:'Proibido'},stockToken,403);
    for(const screen of ['/usuarios','/configuracoes/permissoes','/integracoes/stenci','/central-de-guias/tratamentos']){
      await stockPage.goto(origin+screen);await stockPage.waitForURL('**/sem-permissao');assert.equal(await stockPage.evaluate(()=>localStorage.getItem('token')),stockToken);
    }
    console.log('PASS stock-only login; view/create/edit/delete isolated, no-delete also denies inactivation, admin screens denied without ending login.');
    for(const [moduleKey,screen] of [['document_templates','/cadastros/modelos-documentos'],['events','/eventos/confraternizacao-2026'],['indicator_analysis','/indicadores/analise-critica'],['professionals','/cadastros/profissionais'],['insurance_providers','/cadastros/convenios']]) {
      await call('POST','/permissoes/'+staff.id,{permissions:[{moduleKey,canView:true}]});
      const start=responses.length;await stockPage.goto(origin+screen);await stockPage.locator('h1').first().waitFor();await stockPage.waitForTimeout(300);
      assert.equal(new URL(stockPage.url()).pathname,screen);
      assert.deepEqual(responses.slice(start).filter(r=>r.status>=400),[],'Independent access: '+moduleKey);
    }
    console.log('PASS independent module access without granting unrelated catalogs or dashboards.');
    const catalog=await call('GET','/permissoes/catalog');
    for(const item of catalog.filter(p=>p.requires.length)) {
      await call('POST','/permissoes/'+staff.id,{permissions:[]});await editor();
      await adminPage.getByLabel('Pesquisar funções',{exact:true}).fill(item.label);
      await adminPage.getByRole('checkbox',{name:'Visualizar '+item.label,exact:true}).click();
      await dependencyDialog.waitFor();
      for(const required of item.requires)await dependencyDialog.getByText('Visualizar '+catalog.find(p=>p.key===required.moduleKey).label,{exact:true}).waitFor();
      if(item.key==='authorizations') {
        const output=path.join(root,'.deployment/permissions-qa');fs.mkdirSync(output,{recursive:true});
        await adminPage.screenshot({path:path.join(output,'dependencies-desktop.png')});
        await adminPage.setViewportSize({width:390,height:844});await adminPage.screenshot({path:path.join(output,'dependencies-mobile.png')});
        assert.ok(await dependencyDialog.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
        await adminPage.setViewportSize({width:1440,height:1000});
      }
      await dependencyDialog.getByRole('button',{name:'Marcar acessos necessários',exact:true}).click();await save();
      const saved=(await call('GET','/auth/me',undefined,staffToken)).user.permissions;
      assert.ok(saved.find(p=>p.moduleKey===item.key).canView);
      for(const required of item.requires)assert.ok(saved.find(p=>p.moduleKey===required.moduleKey)[required.action]);
      assert.equal(saved.filter(p=>p.canView).length,1+item.requires.length,'Only approved dependencies may be added');
      assert.ok(saved.every(p=>!p.canCreate&&!p.canEdit&&!p.canDelete));
    }
    console.log('PASS all dependency pairs, filtered matrix, persisted consent, mobile/desktop dialog and minimal grants.');
    assert.deepEqual(errors,[]);
  } finally {
    if(browser)await browser.close();if(vite)await vite.close();
    require(path.join(root,'frontend/node_modules/esbuild')).stop();
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    if(app)await app.locals.editLockDb.destroy();
    for(const file of ['guide-center','usuarios','permissoes','inventory']) {const item=require.cache[require.resolve(path.join(root,'backend/routes',file))];if(item?.exports.knex)await item.exports.knex.destroy();}
    const pool=require.cache[require.resolve(path.join(root,'backend/db'))]?.exports;if(pool)await pool.end();if(db)await db.destroy();
    if(created && /^realmed_permissions_e2e_\d+_[a-f0-9]{6}$/.test(name))await owner.query('DROP DATABASE ??',[name]);await owner.end();process.chdir(root);
    assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));
    try {fs.rmSync(temp,{recursive:true,force:true,maxRetries:3,retryDelay:100});} catch {console.warn('Temporary test directory is still held by Windows; disposable database removed.');}
  }
}
main().catch(e=>{console.error(e.code?.startsWith('ER_')?{code:e.code,message:'Disposable database verification failed'}:e);process.exitCode=1});
