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
    page.on('dialog', (d) => d.accept())
    await prepare(page)
    const fixture = {
      ...records[0],
      id: 1,
      patient_id: 1,
      patient_insurance_id: null,
      physiotherapist_id: null,
      requesting_doctor_id: null,
      requested_sessions: null,
      document_status: 'INCOMPLETE',
      authorization_status: 'NOT_READY',
      documents: [
        {
          id: 1,
          document_type: 'CONSULTATION_GUIDE',
          document_role: 'GENERATED',
          original_name: 'Guia fictícia.pdf',
        },
      ],
      authorizations: [],
      procedures: [],
      pendingItems: [],
      history: [],
      workflow_stages: {},
    }
    let mutations = 0
    await page.route('**/api/guide-processes/1', (r) => {
      if (r.request().method() !== 'GET') mutations++
      return r.fulfill({ json: fixture })
    })
    await page.route('**/api/guide-processes/1/evaluation**', (r) =>
      r.fulfill({
        json: r.request().url().endsWith('/options') ? { patient: {}, professionals: [] } : null,
      }),
    )
    await page.route('**/api/guide-processes/1/preparation-options', (r) =>
      r.fulfill({ json: { insurances: [], professionals: [], procedures: [] } }),
    )
    const base = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
    await page.goto(base + '/central-de-guias/tratamentos/1')
    const central = page.locator('[data-treatment-stage="central"]'),
      documents = page.locator('[data-treatment-stage="documents"]'),
      evaluation = page.locator('#digital-evaluation')
    const link = (name) => page.getByRole('link', { name, exact: true })
    await page.locator('#treatment-tab-authorization').click()
    await link('sessões').waitFor()
    for (const [name, key] of [
      ['sessões', 'requested_sessions'],
      ['convênio e plano', 'patient_insurance_id'],
      ['médico solicitante', 'requesting_doctor_id'],
      ['fisioterapeuta', 'physiotherapist_id'],
    ]) {
      await page.locator('#treatment-tab-authorization').click()
      assert.equal(await link(name).getAttribute('href'), '#preparation-1-' + key)
      await link(name).click()
      const target = page.locator('#preparation-1-' + key)
      await target.waitFor()
      assert.ok(await target.evaluate((el) => document.activeElement === el))
      if (name === 'sessões') await target.fill('12')
    }
    assert.equal(
      await page.locator('#preparation-1-requested_sessions').inputValue(),
      '12',
      'Navigation must preserve unsaved data',
    )
    await page.locator('#treatment-tab-authorization').click()
    await link('documentação obrigatória').click()
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'treatment-1-document-PHYSIOTHERAPY_GUIDE',
    )
    await page.locator('#treatment-tab-authorization').click()
    await link('avaliação concluída').click()
    await evaluation
      .getByLabel('Queixa principal / motivo do atendimento', { exact: true })
      .fill('Rascunho clínico preservado')
    await page.locator('#treatment-tab-authorization').click()
    await link('avaliação concluída').click()
    assert.equal(
      await evaluation
        .getByLabel('Queixa principal / motivo do atendimento', { exact: true })
        .inputValue(),
      'Rascunho clínico preservado',
    )
    fixture.workflow_stages = { central: { completed_at: '2026-10-27T12:00:00Z', completed_by: 1 } }
    await page.reload()
    await page.locator('#treatment-tab-authorization').click()
    await link('sessões').click()
    assert.ok(
      await page.locator('#preparation-1-requested_sessions').isDisabled(),
      'A link cannot reopen or bypass finalized stages',
    )
    assert.ok(await central.getByRole('button', { name: 'Reabrir etapa', exact: true }).isVisible())
    assert.equal(mutations, 0)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('#treatment-tab-authorization').click()
    await link('documentação obrigatória').click()
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 2)
    await page.screenshot({ path: '.deployment/forwarding-links-mobile.png', fullPage: true })
    assert.deepEqual(errors, [])
    console.log(
      'PASS: each pending link opens and focuses its field/document/evaluation; drafts, finalized locks and permissions preserved without mutation; mobile layout.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
