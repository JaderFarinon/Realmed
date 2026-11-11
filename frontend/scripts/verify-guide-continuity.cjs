const { chromium } = require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const assert = require('node:assert/strict')
const { prepare, records } = require('./verify-screen-pattern.cjs')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5198'
;(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.REALMED_BROWSER_EXECUTABLE ? { executablePath: process.env.REALMED_BROWSER_EXECUTABLE } : {}) })
  try {
    const done = { completed_at: '2026-11-11T12:00:00Z' }
    const parent = { ...records[0], id: 1, treatment_root_id: 1, guide_number: 1, billing_due: true, authorization_status: 'AUTHORIZED', authorized_sessions: 10, performed_sessions: 10, document_status: 'COMPLETE', documents: [], authorizations: [], pendingItems: [], procedures: [], history: [], workflow_stages: { reception: done, central: done, documents: done, authorization: done } }
    const clinical = { id: 7, status: 'COMPLETED', chief_complaint: 'Avaliação inicial preservada', referral_professional: 'Médico da avaliação inicial', requested_sessions: 10, body_marks: [], signature_strokes: [] }
    let child = null, writes = 0, fail = true
    const errors = []
    async function setup(page, user) {
      page.on('pageerror', e => errors.push(e.message))
      await prepare(page, user)
      await page.route('**/api/guide-processes/*/edit-lock/*', r => { assert.equal(r.request().method(), 'GET'); return r.fulfill({ json: { locked: false, owned: false } }) })
      for (const id of [1, 2]) {
        await page.route(`**/api/guide-processes/${id}`, r => r.fulfill({ json: { ...(id === 1 ? parent : child), related_guides: [parent, ...(child ? [child] : [])] } }))
        await page.route(`**/api/guide-processes/${id}/preparation-options`, r => r.fulfill({ json: { insurances: [], professionals: [], procedures: [] } }))
        await page.route(`**/api/guide-processes/${id}/evaluation**`, r => { assert.equal(r.request().method(), 'GET'); return r.fulfill({ json: r.request().url().endsWith('/options') ? { patient: {}, professionals: [] } : clinical }) })
        await page.route(`**/api/guide-processes/${id}/document-generation-options`, r => r.fulfill({ json: [] }))
        await page.route(`**/api/guide-processes/${id}/authorization-guides`, r => r.fulfill({ json: { items: [], partial: false } }))
        await page.route(`**/api/guide-processes/${id}/billing`, r => r.fulfill({ json: { process_id: id, items: [], complete: false } }))
      }
      await page.route('**/api/guide-processes/1/continuities', async r => {
        assert.equal(r.request().method(), 'POST'); writes++
        if (fail) { fail = false; return r.fulfill({ status: 409, json: { error: 'Falha fictícia. Tente novamente.' } }) }
        assert.deepEqual(r.request().postDataJSON(), { requested_sessions: 20, notes: '', confirm_end_current: true, require_billing: true })
        child = { ...parent, id: 2, guide_number: 2, continuation_of_id: 1, requested_sessions: 20, authorized_sessions: null, performed_sessions: 0, authorization_status: 'READY', billing_status: 'NOT_READY', billing_due: false, treatment_status: 'WAITING', document_status: 'INCOMPLETE', workflow_stages: {}, doctor_name: 'Médico do novo ciclo' }
        return r.fulfill({ status: 201, json: { id: 2 } })
      })
    }
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    await setup(page)
    await page.goto(origin + '/central-de-guias/tratamentos/1')
    const header = page.locator('.treatment-identity'), add = header.getByRole('button', { name: 'Gerar Continuação', exact: true })
    await add.waitFor()
    assert.ok(await add.isEnabled(), 'Create from the patient card without entering stage editing')
    assert.equal(await page.locator('#treatment-tab-billing').getAttribute('aria-selected'), 'true')
    while (await page.locator('.notification-close').count()) {
      await page.locator('.notification-close').first().click()
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(250)
    await page.screenshot({ path: '.deployment/guide-continuity-header.png', fullPage: true })
    await add.click()
    const dialog = page.getByRole('dialog', { name: 'Gerar Continuação', exact: true }), submit = dialog.getByRole('button', { name: 'Gerar Continuação', exact: true })
    assert.ok(await submit.isDisabled(), 'Sequential continuation requires explicit confirmation')
    await dialog.getByLabel('Sessões solicitadas na nova guia', { exact: true }).fill('20')
    await dialog.getByRole('checkbox').check()
    await submit.click()
    await page.getByText('Falha fictícia. Tente novamente.', { exact: true }).waitFor()
    assert.equal(await dialog.getByLabel('Sessões solicitadas na nova guia', { exact: true }).inputValue(), '20')
    await submit.click()
    await page.waitForURL(u => u.pathname.endsWith('/2'))
    await page.locator('#treatment-tab-reception[aria-selected="true"]').waitFor()
    const evaluation = page.locator('#treatment-tab-evaluation')
    assert.match(await evaluation.getAttribute('class'), /is-complete/)
    assert.equal(await evaluation.getAttribute('aria-disabled'), 'false', 'Initial evaluation can be viewed before new reception is finished')
    await evaluation.click()
    assert.equal(await page.getByLabel(/^Queixa principal/).inputValue(), clinical.chief_complaint)
    assert.ok(await page.getByLabel(/^Queixa principal/).isDisabled())
    assert.equal(await page.getByLabel('Médico / profissional solicitante', { exact: true }).inputValue(), clinical.referral_professional)
    assert.equal(await header.getByRole('button', { name: 'Editar aba', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Reabrir avaliação', exact: true }).count(), 0)
    assert.equal(await page.locator('#treatment-tab-central').getAttribute('aria-disabled'), 'true', 'Other stages keep reception prerequisite')
    assert.equal(writes, 2)
    await page.reload(); await evaluation.click()
    assert.equal(await page.getByLabel(/^Queixa principal/).inputValue(), clinical.chief_complaint)
    await page.goBack()
    await page.waitForURL(u => u.pathname.endsWith('/1'))
    await add.waitFor()
    assert.ok(await add.isDisabled(), 'A second continuation cannot branch from the same cycle')
    for (const viewport of [{ width: 1024, height: 600 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(250)
      const bounds = await add.boundingBox()
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    }
    parent.billing_due = false
    await page.reload()
    await page.locator('#treatment-patient-name').waitFor()
    assert.equal(await add.count(), 0, 'No button outside Faturar')
    parent.billing_due = true
    const reader = await browser.newPage()
    await setup(reader, { id: 2, role: 'user', username: 'reader', name: 'Consulta', permissionsEnabled: true, permissions: [{ moduleKey: 'guide_processes', canView: true }, { moduleKey: 'guide_billing', canView: true }, { moduleKey: 'authorizations', canView: true }] })
    await reader.goto(origin + '/central-de-guias/tratamentos/1')
    await reader.locator('#treatment-patient-name').waitFor()
    assert.equal(await reader.locator('.treatment-identity').getByRole('button', { name: 'Gerar Continuação', exact: true }).count(), 0, 'Read permission never grants creation')
    await reader.close()
    assert.deepEqual(errors, [])
    console.log('PASS: patient-card continuation in Faturar, confirmation/retry, new independent cycle, green accessible read-only original evaluation, original doctor, duplicate prevention, browser history, permissions and responsive header.')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
