const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare, records } = require('./verify-screen-pattern.cjs')
async function readyTreatment(page) {
  const complete={completed_at:'2026-11-09T10:00:00Z',completed_by:1};
  await page.route('**/api/guide-processes/1',r=>r.fulfill({json:{...records[0],documents:[],authorizations:[],procedures:[],pendingItems:[],history:[],workflow_stages:{reception:complete,central:complete,documents:complete,authorization:complete}}}));
  await page.route('**/api/guide-processes/1/evaluation**',r=>r.fulfill({json:r.request().url().endsWith('/options')?{patient:{},professionals:[]}:{id:1,status:'COMPLETED'}}));
  await page.route('**/api/guide-processes/1/edit-lock/*',r=>r.fulfill({json:{locked:r.request().method()==='POST',owned:r.request().method()==='POST',expiresAt:Date.now()+60000}}));
  await page.route('**/api/guide-processes/1/preparation-options',r=>r.fulfill({json:{professionals:[],insurances:[],procedures:[]}}));
  await page.route('**/api/guide-processes/1/document-generation-options',r=>r.fulfill({json:[]}));
  await page.route('**/api/guide-processes/1/rotation**',r=>r.fulfill({json:[]}));
}
;(async () => {
  const browser = await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||undefined})
  try {
    const page = await browser.newPage()
    await prepare(page)
    await readyTreatment(page)
    let calls = 0
    let items = [
      {
        key: '1:CONSULTATION_GUIDE',
        guide_process_id: 1,
        guide_number: 1,
        document_type: 'CONSULTATION_GUIDE',
        label: 'Consulta / Avaliação',
        applicable: true,
        eligible: true,
        completion_ready: true,
        status: 'PENDING',
        status_label: 'A faturar',
        revision: 0,
        files: [],
      },
      {
        key: '1:PHYSIOTHERAPY_GUIDE',
        guide_process_id: 1,
        guide_number: 1,
        document_type: 'PHYSIOTHERAPY_GUIDE',
        label: 'Fisioterapia',
        applicable: true,
        eligible: false,
        completion_ready: false,
        status: 'PENDING',
        status_label: 'Aguardando conclusão das sessões',
        revision: 0,
        files: [],
      },
    ]
    await page.route('**/api/guide-processes/1/billing**', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON()
        assert.equal(body.status, 'BILLED')
        calls++
        items = items.map((i) =>
          i.document_type === 'CONSULTATION_GUIDE'
            ? { ...i, status: 'BILLED', status_label: 'Faturada', revision: 1 }
            : i,
        )
      }
      await route.fulfill({
        json: {
          items,
          ready: calls ? 0 : 1,
          complete: false,
          process_id: 1,
          billing_status: 'NOT_READY',
        },
      })
    })
    await page.goto(
      (process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186') +
        '/central-de-guias/tratamentos/1?billing=1',
    )
    await page.getByRole('tab', { name: 'Faturamento', exact: true }).waitFor()
    const panel = page.locator('#treatment-tabpanel-billing')
    await page.getByRole('button',{name:'Editar aba',exact:true}).click()
    await panel.getByRole('cell', { name: 'Consulta / Avaliação', exact: true }).click()
    await panel
      .getByRole('button', { name: 'Atualizar faturamento da guia selecionada', exact: true })
      .click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Situação').selectOption('BILLED')
    await dialog.getByRole('button', { name: 'Salvar faturamento', exact: true }).click()
    await panel.getByRole('cell', { name: 'Faturada', exact: true }).waitFor()
    assert.equal(calls, 1)
    await panel.getByRole('cell', { name: 'Fisioterapia', exact: true }).click()
    await panel
      .getByRole('button', { name: 'Atualizar faturamento da guia selecionada', exact: true })
      .click()
    dialog = page.getByRole('dialog')
    await dialog.getByText('Fisioterapia', { exact: true }).waitFor()
    assert.equal(await dialog.locator('option[value=BILLED]').evaluate((el) => el.disabled), true)
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.reload()
    await panel.getByRole('cell', { name: 'Faturada', exact: true }).waitFor()
    items[1]={...items[1],blocking_reason:'Complete a documentação obrigatória na Central de Guias antes de faturar.'};
    await page.reload();await panel.getByRole('cell',{name:'Fisioterapia',exact:true}).click();await page.getByRole('button',{name:'Editar aba',exact:true}).click();
    await panel.getByRole('button',{name:'Atualizar faturamento da guia selecionada',exact:true}).click();
    await page.getByRole('dialog').getByText(items[1].blocking_reason,{exact:true}).waitFor();
    assert.equal(await page.getByRole('dialog').locator('option[value=BILLED]').evaluate(el=>el.disabled),true);
    await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(250)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await page.screenshot({ path: '.deployment/guide-billing-mobile.png' })
    const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
    await page.goto(origin + '/central-de-guias/tratamentos?queue=BILLING')
    await page.waitForURL((url) => url.searchParams.get('process_stage') === 'billing')
    const denied = await browser.newPage()
    await prepare(denied, {
      id: 2,
      username: 'leitor',
      role: 'user',
      permissionsEnabled: true,
      permissions: [
        {
          moduleKey: 'guide_processes',
          canView: true,
          canEdit: false,
          canCreate: false,
          canDelete: false,
        },
      ],
    })
    await readyTreatment(denied)
    await denied.goto(origin + '/central-de-guias/tratamentos/1?billing=1')
    await denied
      .locator('#treatment-tabpanel-billing')
      .getByText('Usuário sem permissão a essa função', { exact: true })
      .waitFor()
    assert.equal(await denied.evaluate(() => Boolean(localStorage.getItem('token'))), true)
    await denied.close()
    console.log(
      'PASS: billing tab, early consultation billed, therapy blocked before completion, reload and mobile',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
