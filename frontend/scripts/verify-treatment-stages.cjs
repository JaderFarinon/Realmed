const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const assert = require('node:assert/strict')
const { prepare, records } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } }),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await prepare(page)
    const fixture = {
      ...records[0],
      id: 1,
      patient_id: 1,
      assessment_date: '2026-10-27',
      notes: 'Nota original',
      workflow_stages: {},
      authorization_status: 'AUTHORIZED',
      document_status: 'COMPLETE',
      documents: [
        {
          id: 22,
          document_type: 'PHYSIOTHERAPY_GUIDE',
          document_role: 'GENERATED',
          original_name: 'Fisioterapia fictícia.pdf',
          is_usable: 1,
        },
        {
          id: 23,
          document_type: 'PHYSIO_ASSESSMENT',
          document_role: 'RECEIVED',
          original_name: 'Avaliação fictícia.pdf',
          is_usable: 1,
        },
        {
          id: 20,
          document_type: 'CONSULTATION_GUIDE',
          document_role: 'RECEIVED',
          original_name: 'Guia fictícia.pdf',
          is_usable: 1,
        },
        {
          id: 21,
          document_type: 'PHYSIOTHERAPY_EVALUATION',
          document_role: 'GENERATED',
          original_name: 'Ficha fictícia.pdf',
          document_version: 1,
        },
      ],
      procedures: [],
      authorizations: [],
      pendingItems: [],
      history: [],
    }
    let writes = 0,
      fail = false
    await page.route('**/api/guide-processes/1', async (r) => {
      if (r.request().method() === 'PUT') {
        Object.assign(fixture, r.request().postDataJSON())
        writes++
      }
      await r.fulfill({ json: fixture })
    })
    await page.route('**/api/guide-processes/1/evaluation**', (r) =>
      r.fulfill({
        json: r.request().url().endsWith('/options')
          ? { patient: {}, professionals: [] }
          : { id: 1, status: 'COMPLETED', body_marks: [], signature_strokes: [] },
      }),
    )
    await page.route('**/api/guide-processes/1/preparation-options', (r) =>
      r.fulfill({ json: { insurances: [], professionals: [], procedures: [] } }),
    )
    await page.route('**/api/guide-processes/1/stages/**', async (r) => {
      assert.equal(r.request().method(), 'POST')
      if (fail) {
        fail = false
        return r.fulfill({ status: 422, json: { error: 'Falha fictícia: confira a etapa.' } })
      }
      const [, stage, action] = new URL(r.request().url()).pathname.match(
        /stages\/([^/]+)\/(complete|reopen)$/,
      )
      if (action === 'complete')
        fixture.workflow_stages[stage] = { completed_at: '2026-10-27T12:00:00Z', completed_by: 1 }
      else delete fixture.workflow_stages[stage]
      await r.fulfill({
        json: { workflow_stages: fixture.workflow_stages, stage, completed: action === 'complete' },
      })
    })
    const url =
      (process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186') +
      '/central-de-guias/tratamentos/1'
    await page.goto(url)
    const card = (stage) => page.locator(`[data-treatment-stage="${stage}"]`)
    const tab = (stage) => page.locator('#treatment-tab-' + stage)
    async function expand(stage) {
      if (stage === 'treatment') {
        const toggle = card(stage).locator('.treatment-card-header button[aria-expanded]')
        if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
        return
      }
      await tab(stage).click()
    }
    async function collapse(stage) {
      await tab('history').click()
    }
    async function finish(stage) {
      await expand(stage)
      await card(stage).getByRole('button', { name: 'Finalizar etapa', exact: true }).click()
      await page.getByRole('button', { name: 'Confirmar finalização', exact: true }).click()
      await page.waitForFunction(
        (stage) =>
          stage === 'treatment'
            ? document
                .querySelector('[data-treatment-stage="treatment"]')
                .classList.contains('treatment-stage-complete')
            : document.querySelector('#treatment-tab-' + stage).classList.contains('is-complete'),
        stage,
      )
      assert.equal(
        await card(stage).getByRole('button', { name: 'Reabrir etapa', exact: true }).isVisible(),
        stage !== 'treatment',
      )
    }
    await tab('evaluation').waitFor()
    await tab('reception').focus()
    await tab('reception').press('End')
    assert.equal(await tab('history').getAttribute('aria-selected'), 'true')
    await tab('history').press('Home')
    assert.equal(await tab('reception').getAttribute('aria-selected'), 'true')
    await tab('reception').press('ArrowLeft')
    assert.equal(await tab('history').getAttribute('aria-selected'), 'true')
    await tab('history').press('ArrowRight')
    assert.equal(await tab('reception').getAttribute('aria-selected'), 'true')
    await expand('documents')
    assert.equal(await card('evaluation_document').count(), 0)
    assert.equal(
      await page
        .getByRole('heading', { name: 'Ficha de Avaliação Fisioterapêutica', exact: true })
        .count(),
      0,
    )
    assert.equal(
      await page.locator('article[aria-label="Avaliação fisioterapêutica recebida"]').count(),
      0,
    )
    await page.getByText('Documentação: 2/2 obrigatórios completos', { exact: true }).waitFor()
    assert.ok(
      await page
        .getByText('Arquivos anteriores de avaliação (opcionais)', { exact: true })
        .isVisible(),
    )
    assert.equal(
      await page
        .locator('article[aria-label="Carteirinha"]')
        .getByText('○ Pendente', { exact: true })
        .count(),
      0,
    )
    for (const stage of [
      'reception',
      'central',
      'evaluation',
      'documents',
      'authorization',
      'history',
    ]) {
      await expand(stage)
      assert.equal(await page.getByRole('tabpanel').count(), 1, 'Only selected panel is visible')
      assert.equal(await tab(stage).getAttribute('aria-selected'), 'true')
      if (stage === 'history') continue
      assert.equal(
        await card(stage).locator('.treatment-card-header button[aria-expanded]').count(),
        0,
      )
      assert.equal(
        await card(stage).evaluate((el) => el.classList.contains('treatment-stage-complete')),
        false,
        'Green belongs to the tab',
      )
    }
    await expand('central')
    await card('central').getByLabel('Observações', { exact: true }).fill('Rascunho central')
    await expand('reception')
    await expand('central')
    assert.equal(
      await card('central').getByLabel('Observações', { exact: true }).inputValue(),
      'Rascunho central',
    )
    await expand('evaluation')
    assert.ok(await tab('evaluation').evaluate((el) => el.classList.contains('is-complete')))
    assert.ok(
      await card('evaluation')
        .getByLabel('Queixa principal / motivo do atendimento', { exact: true })
        .isDisabled(),
    )
    await expand('reception')
    await finish('reception')
    assert.equal(writes, 1)
    await expand('reception')
    assert.ok(await card('reception').getByLabel('Data da avaliação', { exact: true }).isDisabled())
    await expand('central')
    assert.equal(
      await card('central').getByLabel('Observações', { exact: true }).inputValue(),
      'Rascunho central',
      'Reloading another stage must preserve the central draft',
    )
    await card('central').getByLabel('Observações', { exact: true }).fill('Preparação conferida')
    await finish('central')
    assert.equal(fixture.notes, 'Preparação conferida')
    await expand('central')
    assert.ok(await card('central').getByLabel('Observações', { exact: true }).isDisabled())
    fail = true
    await expand('documents')
    await card('documents').getByRole('button', { name: 'Finalizar etapa', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar finalização', exact: true }).click()
    await card('documents').getByRole('alert').waitFor()
    assert.ok(
      !(await card('documents').evaluate((el) =>
        el.classList.contains('treatment-stage-complete'),
      )),
    )
    for (const stage of ['documents', 'authorization', 'treatment']) await finish(stage)
    await page.reload()
    await tab('central').waitFor()
    await expand('history')
    for (const stage of ['reception', 'central', 'documents', 'authorization', 'treatment']) {
      assert.ok(
        await (stage === 'treatment' ? card(stage) : tab(stage)).evaluate(
          (el) =>
            el.classList.contains('is-complete') ||
            el.classList.contains('treatment-stage-complete'),
        ),
      )
      assert.equal(
        await card(stage).getByRole('button', { name: 'Reabrir etapa', exact: true }).isVisible(),
        false,
      )
    }
    await expand('documents')
    assert.ok(
      await card('documents')
        .getByRole('button', { name: 'Visualizar', exact: true })
        .first()
        .isVisible(),
    )
    assert.equal(await card('documents').locator('input[type=file]').count(), 0)
    await expand('authorization')
    assert.ok(
      await card('authorization')
        .getByRole('button', { name: /Liberado/, exact: false })
        .isDisabled(),
    )
    await card('authorization').getByRole('button', { name: 'Reabrir etapa', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar reabertura', exact: true }).click()
    await card('authorization')
      .getByRole('button', { name: 'Finalizar etapa', exact: true })
      .waitFor()
    assert.ok(
      await card('authorization')
        .getByRole('button', { name: /Liberado/, exact: false })
        .isEnabled(),
    )
    await finish('authorization')
    await expand('central')
    await card('central').getByRole('button', { name: 'Reabrir etapa', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar reabertura', exact: true }).click()
    await card('central').getByRole('button', { name: 'Finalizar etapa', exact: true }).waitFor()
    assert.ok(await card('central').getByLabel('Observações', { exact: true }).isEnabled())
    for (const stage of ['central', 'reception', 'documents', 'evaluation']) await collapse(stage)
    await page.screenshot({ path: '.deployment/treatment-stages-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 2)
    await page.screenshot({ path: '.deployment/treatment-stages-mobile.png', fullPage: true })
    await expand('central')
    const footer = card('central').locator('.treatment-stage-footer')
    assert.ok(
      await footer.getByRole('button', { name: 'Finalizar etapa', exact: true }).isVisible(),
    )
    await page.screenshot({ path: '.deployment/treatment-stage-footer-mobile.png', fullPage: true })
    assert.deepEqual(errors, [])
    console.log(
      'PASS: six tabs and compact treatment summary, only selected panel visible, green tabs, draft preservation, finalized locks, save/finalize/reopen persistence, desktop/mobile and optional documents.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
