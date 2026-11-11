const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path')
const { chromium } = require(
  process.env.REALMED_PLAYWRIGHT_ROOT ||
    'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
)
const { prepare, records } = require('./verify-screen-pattern.cjs')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
const source = {
  id: 1,
  procedure_id: 1,
  code: '11111111',
  description: 'Fisioterapia original',
  type: 'PHYSIOTHERAPY',
  active: 1,
  requested_quantity: 20,
}
const mapped = {
  ...source,
  code: '22222222',
  source_code: source.code,
  description: 'Fisioterapia alternativa',
  mapping_rule_id: 1,
  mapping_reason: 'Regra do convênio · prioridade 1',
}
const electro = {
  id: 3,
  procedure_id: 3,
  code: '33333333',
  source_code: '33333333',
  description: 'Eletroestimulação',
  type: 'ELECTROSTIMULATION',
  mapping_rule_id: null,
  requested_quantity: 20,
}
;(async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await prepare(page)
    const treatment = {
      ...records[0],
      insurance_provider_id: 1,
      documents: [
        {
          id: 99,
          document_type: 'PHYSIOTHERAPY_GUIDE',
          document_role: 'RECEIVED',
          original_name: 'Original-ficticio.pdf',
          is_usable: false,
        },
      ],
      authorizations: [],
      procedures: [source, electro],
      pendingItems: [],
      history: [],
    }
    let saved = 0,
      generated = 0,
      readCount = 0
    await page.route('**/api/procedure-code-rules**', (route) => {
      const req = route.request(),
        url = req.url()
      let data
      if (req.method() === 'GET')
        data = url.endsWith('/lookups')
          ? {
              procedures: [
                source,
                { ...source, id: 2, code: '22222222', description: 'Fisioterapia alternativa' },
              ],
              insurers: [{ id: 1, name: 'Convênio fictício' }],
            }
          : [
              {
                id: 1,
                source_code: source.code,
                target_procedure_id: 2,
                target_code: mapped.code,
                target_description: mapped.description,
                priority: 1,
                insurance_provider_id: 1,
                active: true,
              },
            ]
      else {
        saved++
        assert.equal(req.postDataJSON().source_code, '44444444')
        data = { id: 2 }
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    })
    await page.route('**/api/guide-processes/1**', async (route) => {
      const p = new URL(route.request().url()).pathname
      const send = (data) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
      if (p === '/api/guide-processes/1') return send(treatment)
      if (p.endsWith('/evaluation/options')) return send({ professionals: [], patient: {} })
      if (p.endsWith('/evaluation')) return send(null)
      if (p.endsWith('/document-generation-options'))
        return send(
          ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION'].map((type) => ({
            id: 'sadt-v1:' + type,
            name: 'SADT ' + type,
            document_type: type,
            version: 1,
          })),
        )
      if (p.endsWith('/code-review-options')) return send([mapped, electro])
      if (p.endsWith('/read-codes')) {
        readCount++
        return send({
          code_review_id: 'fictitious-review',
          text: '11111111 fisioterapia',
          candidates: [
            { candidate_id: '1', source, proposed: mapped },
            { candidate_id: '2', source: electro, proposed: electro },
          ],
          procedures: [source, electro],
        })
      }
      if (p.endsWith('/documents/preview'))
        return route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: fs.readFileSync(
            path.resolve(__dirname, '../../backend/templates/sadt/guia-sadt-base.pdf'),
          ),
        })
      if (p.endsWith('/documents/generate')) {
        const body = route.request().postDataJSON()
        assert.equal(body.codes_confirmed, true)
        if (body.code_review_id) {
          assert.equal(body.review_items.length, 2)
          assert.equal(body.review_items[0].requested_quantity, 20)
        } else assert.equal(body.code_selection.length, 2)
        generated++
        return send({ id: 100 + generated })
      }
      throw Error('Unexpected ' + p)
    })
    await page.goto(origin + '/cadastros/codigos')
    await page.getByRole('heading', { name: 'Códigos e de/para', exact: true }).waitFor()
    assert.equal(
      await page
        .getByRole('button', { name: 'Editar de/para selecionado', exact: true })
        .isDisabled(),
      true,
    )
    await page.locator('tbody tr[aria-selected]').first().click()
    assert.equal(
      await page
        .getByRole('button', { name: 'Editar de/para selecionado', exact: true })
        .isDisabled(),
      false,
    )
    await page.getByRole('button', { name: 'Novo de/para', exact: true }).click()
    const form = page.getByRole('dialog')
    await form.getByLabel('Código de origem', { exact: true }).fill('44444444')
    await form
      .getByRole('combobox', { name: /Procedimento \/ código de destino/ })
      .selectOption('2')
    await form.getByRole('button', { name: 'Salvar', exact: true }).click()
    await form.waitFor({ state: 'hidden' })
    assert.equal(saved, 1)
    await page.goto(origin + '/central-de-guias/tratamentos/1')
    await page.getByRole('button', { name: 'Gerar guia ajustada', exact: true }).first().click()
    let dialog = page.getByRole('dialog')
    await dialog.getByText('22222222', { exact: true }).waitFor()
    const generate = dialog.getByRole('button', { name: 'Gerar guia conferida', exact: true })
    assert.equal(await generate.isDisabled(), true)
    await dialog.getByLabel('Quantidade de 11111111', { exact: true }).fill('20')
    await dialog.getByLabel('Quantidade de 33333333', { exact: true }).fill('20')
    await dialog.getByLabel('Conferi os procedimentos, códigos e quantidades desta guia.').check()
    await generate.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(generated, 1)
    await page.getByRole('button', { name: 'Ler original e ajustar códigos', exact: true }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByText('22222222', { exact: true }).waitFor()
    assert.equal(readCount, 2)
    assert.equal(
      await dialog.getByRole('button', { name: 'Gerar guia conferida', exact: true }).isDisabled(),
      true,
    )
    await dialog.getByLabel('Quantidade de 11111111', { exact: true }).fill('20')
    await dialog.getByLabel('Quantidade de 33333333', { exact: true }).fill('20')
    await dialog.getByLabel('Conferi os procedimentos, códigos e quantidades desta guia.').check()
    await page.evaluate(() => {
      window.open = () => null
    })
    await dialog.getByRole('button', { name: 'Pré-visualizar guia', exact: true }).click()
    await page.waitForTimeout(100)
    for (const viewport of [
      { width: 1024, height: 650 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(400)
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll('body *'))
          .filter(
            (el) =>
              el.getBoundingClientRect().right > innerWidth + 2 &&
              getComputedStyle(el).position === 'fixed',
          )
          .map((el) => el.className),
      }))
      assert.ok(metrics.scroll <= metrics.width, JSON.stringify(metrics))
      const out = path.resolve(__dirname, '../../.deployment/procedure-codes-qa')
      fs.mkdirSync(out, { recursive: true })
      await page.screenshot({ path: path.join(out, 'review-' + viewport.width + '.png') })
    }
    await dialog.getByRole('button', { name: 'Gerar guia conferida', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(generated, 2)
    await page.getByText('Original-ficticio.pdf', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.log(
      'PASS codes UI: permissions, selected table, creation, mapping review, scanned guide, quantity confirmation, preview, preserved original, mobile.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
