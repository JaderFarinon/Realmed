const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { prepare } = require('./verify-screen-pattern.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.REALMED_BROWSER_EXECUTABLE });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 600 } }), errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    await prepare(page);
    const providers = [{ id: 11, name: 'Convênio Alfa', external_source: 'STENCI', external_id: 'external-a', active: 1 }, { id: 22, name: 'Convênio Beta', external_source: 'STENCI', external_id: 'external-b', active: 1 }, { id: 33, name: 'Convênio Sem Vínculos', active: 1 }];
    const rows = {
      11: [{ id: 1, procedure_id: 101, code: '50000144', description: 'Consulta Alfa', type: 'CONSULTATION', table_name: 'TUSS', active: 1, replaces: ['99999'] }],
      22: [{ id: 2, procedure_id: 102, code: '50000160', description: 'Fisioterapia Beta', type: 'PHYSIOTHERAPY', table_name: 'TUSS', active: 0, replaces: [] }],
      33: [],
    };
    let fail = false, saves = 0, linkFail = true, linkCalls = 0;
    const catalog = [{id:101,code:'50000144',description:'Consulta do catálogo',type:'CONSULTATION',active:1}, {id:102,code:'50000160',description:'Fisioterapia do catálogo',type:'PHYSIOTHERAPY',active:1}];
    await page.route('**/api/procedures?active=true',r=>r.fulfill({json:catalog}));
    await page.route('**/api/insurance-providers', r => {
      assert.equal(r.request().method(), 'GET'); return r.fulfill({ json: providers });
    });
    await page.route('**/api/integrations/stenci/insurances', r => r.fulfill({ json: { items: providers.filter(p => p.external_id).map(p => ({ externalId: p.external_id, name: p.name })) } }));
    await page.route('**/api/insurance-providers/*/signer', r => r.fulfill({ json: null }));
    await page.route('**/api/insurance-providers/*/procedures**', r => {
      const match = new URL(r.request().url()).pathname.match(/insurance-providers\/(\d+)\/procedures(?:\/(\d+|link))?$/);
      assert.ok(match, 'procedures must use the resolved local provider ID');
      const providerId = Number(match[1]);
      requests.push({ providerId, method: r.request().method() });
      if(match[2]==='link'){
        assert.equal(providerId,33);assert.equal(r.request().method(),'POST');assert.deepEqual(r.request().postDataJSON(),{procedure_ids:[101]});linkCalls++;
        if(linkFail)return r.fulfill({status:422,json:{error:'Falha simulada ao vincular.'}});
        rows[33].push({...catalog[0],id:99,procedure_id:101,replaces:[]});return r.fulfill({json:{linked:1,existing:0}});
      }
      if (r.request().method() === 'PUT') {
        assert.equal(providerId, 11); assert.equal(Number(match[2]), 1);
        Object.assign(rows[11][0], r.request().postDataJSON()); saves++;
        return r.fulfill({ json: rows[11][0] });
      }
      assert.equal(r.request().method(), 'GET');
      if (fail) return r.fulfill({ status: 503, json: { error: 'Falha simulada ao consultar procedimentos.' } });
      return r.fulfill({ json: rows[providerId] });
    });
    await page.goto(process.env.REALMED_UI_TEST_URL + '/cadastros/convenios');
    async function open(name) {
      await page.getByRole('cell', { name, exact: true }).click();
      await page.getByRole('button', { name: 'Editar convênio selecionado', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Editar convênio', exact: true });
      await dialog.getByRole('tab', { name: 'Procedimentos', exact: true }).click();
      return dialog;
    }
    async function close(dialog) { await dialog.getByRole('button', { name: 'Fechar', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); }
    let dialog = await open('Convênio Alfa');
    await dialog.getByRole('cell', { name: 'Consulta Alfa', exact: true }).waitFor({ timeout: 5000 });
    assert.equal(requests.filter(r => r.providerId === 11 && r.method === 'GET').length, 1, 'must load automatically when first mounted already open');
    await dialog.getByRole('cell', { name: 'Consulta Alfa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Editar procedimento selecionado', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Editar procedimento do convênio', exact: true });
    await editor.getByLabel('Descrição do procedimento', { exact: true }).fill('Consulta Alfa atualizada');
    await editor.getByRole('button', { name: 'Salvar procedimento e substituições', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await dialog.getByRole('cell', { name: 'Consulta Alfa atualizada', exact: true }).waitFor();
    assert.equal(saves, 1);
    await dialog.getByRole('tab', { name: 'Dados do convênio', exact: true }).click();
    await dialog.getByRole('tab', { name: 'Procedimentos', exact: true }).click();
    await dialog.getByRole('cell', { name: 'Consulta Alfa atualizada', exact: true }).waitFor();
    await close(dialog);
    dialog = await open('Convênio Beta');
    await dialog.getByRole('cell', { name: 'Fisioterapia Beta', exact: true }).waitFor();
    assert.equal(await dialog.getByText('Consulta Alfa atualizada', { exact: true }).count(), 0);
    await dialog.getByRole('cell', { name: 'Inativo', exact: true }).waitFor();
    await close(dialog);
    dialog = await open('Convênio Alfa');
    await dialog.getByRole('cell', { name: 'Consulta Alfa atualizada', exact: true }).waitFor();
    fail = true;
    await dialog.getByRole('button', { name: 'Atualizar procedimentos', exact: true }).click();
    await page.getByText('Falha simulada ao consultar procedimentos.', { exact: true }).waitFor();
    assert.equal(await dialog.getByText('Consulta Alfa atualizada', { exact: true }).count(), 0, 'failed refresh must not leave stale rows');
    assert.equal(await dialog.getByRole('button', { name: 'Editar procedimento selecionado', exact: true }).isDisabled(), true);
    fail = false;
    await dialog.getByRole('button', { name: 'Atualizar procedimentos', exact: true }).click();
    await dialog.getByRole('cell', { name: 'Consulta Alfa atualizada', exact: true }).waitFor();
    await close(dialog);
    dialog = await open('Convênio Sem Vínculos');
    await dialog.getByText('Nenhum procedimento vinculado a este convênio.', { exact: true }).waitFor();
    assert.equal(await dialog.locator('tbody tr[aria-selected]').count(), 0);
    await dialog.getByRole('button',{name:'Vincular procedimentos do catálogo geral',exact:true}).click();
    const linkDialog=page.getByRole('dialog',{name:'Vincular procedimentos do catálogo geral',exact:true});
    await linkDialog.getByRole('checkbox',{name:'50000144 — Consulta do catálogo',exact:true}).waitFor();
    assert.equal(await linkDialog.getByRole('button',{name:'Vincular selecionados',exact:true}).isDisabled(),true);
    await linkDialog.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(linkCalls,0);
    await dialog.getByRole('button',{name:'Vincular procedimentos do catálogo geral',exact:true}).click();
    await linkDialog.getByRole('checkbox',{name:'50000144 — Consulta do catálogo',exact:true}).check();
    await linkDialog.getByRole('button',{name:'Vincular selecionados',exact:true}).click();
    await page.getByText('Falha simulada ao vincular.',{exact:true}).waitFor();
    assert.equal(await linkDialog.getByRole('checkbox',{name:'50000144 — Consulta do catálogo',exact:true}).isChecked(),true);
    linkFail=false;await linkDialog.getByRole('button',{name:'Vincular selecionados',exact:true}).click();
    await linkDialog.waitFor({state:'hidden'});await dialog.getByRole('cell',{name:'Consulta do catálogo',exact:true}).waitFor();
    assert.equal(linkCalls,2);assert.equal(rows[33].length,1);assert.equal(rows[11][0].description,'Consulta Alfa atualizada');
    await dialog.getByRole('button',{name:'Vincular procedimentos do catálogo geral',exact:true}).click();
    await linkDialog.getByRole('checkbox',{name:'50000160 — Fisioterapia do catálogo',exact:true}).waitFor();
    assert.equal(await linkDialog.getByRole('checkbox',{name:'50000144 — Consulta do catálogo',exact:true}).count(),0,'already-linked procedures must not be offered again');
    for(const viewport of [{width:1024,height:600},{width:390,height:844}]){await page.setViewportSize(viewport);await page.waitForTimeout(250);await page.screenshot({path:require('node:path').resolve('.deployment/link-catalog-'+viewport.width+'.png')});const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(dimensions.width<=dimensions.viewport+2,JSON.stringify(dimensions))}
    assert.deepEqual(errors, []);
    console.log('PASS insurer procedure loading and linking: first open, correct local ID, editing/reload, different insurer, inactive records, empty links, failure/retry, selected catalog entries only, cancel, no duplicates and tablet/mobile; APIs mocked.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
