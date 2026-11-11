const assert = require('node:assert/strict');
const {chromium} = require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare} = require('./verify-screen-pattern.cjs');
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186';
async function run() {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage(); await prepare(page);
    await page.goto(origin+'/usuarios');
    await page.getByRole('button',{name:'Novo usuário',exact:true}).click();
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.locator('input[type=password]').count(),0);
    await dialog.getByLabel('Login no Stenci',{exact:true}).fill('synthetic-login');
    assert.equal(await dialog.getByLabel('E-mail',{exact:true}).getAttribute('required'),null);
    await dialog.getByRole('button',{name:'Fechar',exact:true}).click();
    await page.goto(origin+'/configuracoes/permissoes');
    await page.locator('tbody tr[aria-selected]').first().click();
    await page.getByRole('button',{name:'Editar permissões do usuário selecionado',exact:true}).click();
    await page.getByRole('button',{name:'Salvar permissões',exact:true}).waitFor();
    await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
    await page.route('**/api/permissoes/2',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Falha simulada ao carregar permissões'})}));
    await page.locator('tbody tr[aria-selected]').nth(1).click();
    await page.getByRole('button',{name:'Editar permissões do usuário selecionado',exact:true}).click();
    await page.getByRole('dialog').getByText('Falha simulada ao carregar permissões').waitFor();
    assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Salvar permissões',exact:true}).count(),0);
    const denied = await browser.newPage();
    await prepare(denied,{id:2,role:'user',name:'Sem acesso',permissionsEnabled:true,permissions:[]});
    for(const route of ['/usuarios','/configuracoes/permissoes','/estoque/produtos','/faturamento']) {
      await denied.goto(origin+route); await denied.waitForURL('**/sem-permissao');
      await denied.getByRole('heading',{name:'Sem Permissão',exact:true}).waitFor();
      await denied.getByRole('button',{name:'Estoque',exact:true}).click();
      assert.ok(await denied.getByRole('link',{name:'Produtos',exact:true}).count());
      await denied.getByRole('button',{name:'Configurações',exact:true}).click();
      assert.ok(await denied.getByRole('link',{name:'Usuários',exact:true}).count());
      assert.ok(await denied.evaluate(()=>Boolean(localStorage.getItem('token'))));
    }
    console.log('PASS: Stenci-only user form, optional email, failed permission load cannot save stale matrix, visible menus, direct URL denial and preserved login.');
  } finally {await browser.close()}
}
run().catch(error=>{console.error(error);process.exitCode=1});
