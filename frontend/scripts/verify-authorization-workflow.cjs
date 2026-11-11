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
      authorization_min_date: '2026-10-27',
      patient_id: 1,
      patient_insurance_id: 1,
      physiotherapist_id: 1,
      requesting_doctor_id: 2,
      authorization_status: 'READY',
      document_status: 'COMPLETE',
      documents: [],
      authorizations: [],
      authorization_documents: [],
      pendingItems: [],
      history: [],
      procedures: [],
      workflow_stages: {},
    }
    const guides = ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION'].map(
      (document_type, i) => ({
        document_type,
        label: ['Consulta', 'Fisioterapia', 'Eletroestimulação'][i],
        status: 'READY',
        applicable: true,
        revision: 0,
        decision_source: 'INDIVIDUAL',
      }),
    )
    await page.route('**/api/guide-processes/1/authorization-guides', (r) =>
      r.fulfill({
        json: {
          items: guides,
          partial:
            guides.some((g) => g.status === 'AUTHORIZED') &&
            guides.some((g) => g.status === 'DENIED'),
        },
      }),
    )
    let writes = 0,
      fail = false,
      payload
    await page.route('**/api/guide-processes/1', (r) => r.fulfill({ json: fixture }))
    await page.route('**/api/guide-processes/1/preparation-options', (r) =>
      r.fulfill({ json: { insurances: [], professionals: [], procedures: [] } }),
    )
    await page.route('**/api/guide-processes/1/evaluation**', (r) =>
      r.fulfill({
        json: r.request().url().endsWith('/options')
          ? { patient: {}, professionals: [] }
          : { status: 'COMPLETED', body_marks: [], signature_strokes: [] },
      }),
    )
    await page.route('**/api/guide-processes/1/authorization/status', async (r) => {
      assert.equal(r.request().method(), 'POST')
      payload = r.request().postDataJSON()
      writes++
      if (fail) {
        fail = false
        return r.fulfill({
          status: 409,
          json: { error: 'Falha fictícia: situação alterada por outra operação.' },
        })
      }
      const own = guides.find((g) => g.document_type === payload.document_type)
      assert.equal(payload.expected_status, own.status)
      assert.equal(payload.revision, own.revision)
      Object.assign(own, payload, { revision: own.revision + 1 })
      fixture.history.unshift({
        id: writes,
        action: 'AUTHORIZATION_STATUS_CHANGED',
        field: 'authorization_status',
        old_value: fixture.authorization_status,
        new_value: payload.status,
        metadata: { notes: payload.notes },
        created_at: '2026-10-27T12:00:00Z',
        user_name: 'Teste',
      })
      if (payload.document_type === 'PHYSIOTHERAPY_GUIDE')
        fixture.authorization_status = payload.status
      if (payload.status === 'PENDING')
        fixture.pendingItems.push({ id: writes, status: 'OPEN', description: payload.notes })
      if (payload.status === 'IN_PROGRESS')
        fixture.pendingItems.forEach((i) => (i.status = 'RESOLVED'))
      if (['AUTHORIZED', 'DENIED', 'SESSION_TOKEN', 'NOT_REQUIRED'].includes(payload.status))
        fixture.authorizations.unshift({ ...payload, id: writes })
      if (payload.document_type === 'PHYSIOTHERAPY_GUIDE')
        fixture.authorized_sessions =
          payload.status === 'AUTHORIZED' ? payload.authorized_sessions : null
      await r.fulfill({
        json: { items: guides, partial: false, authorization_status: payload.status },
      })
    })
    let batchWrites = 0,
      rejectBatch = true
    await page.route('**/api/guide-processes/1/authorization/release-together', async (r) => {
      batchWrites++
      const data = r.request().postDataJSON()
      assert.equal(data.items.length, 2)
      if (rejectBatch) {
        rejectBatch = false
        return r.fulfill({
          status: 409,
          json: { error: 'Uma guia foi alterada. Confira novamente.' },
        })
      }
      for (const i of data.items) {
        const g = guides.find((g) => g.document_type === i.document_type)
        assert.equal(g.revision, i.revision)
        Object.assign(g, i, {
          status: 'AUTHORIZED',
          authorization_number: data.authorization_number,
          authorization_date: data.authorization_date,
          expiration_date: data.expiration_date,
          revision: g.revision + 1,
        })
      }
      fixture.authorized_sessions = guides[1].authorized_sessions
      fixture.partial_authorization = true
      await r.fulfill({
        json: { items: guides, partial: true, authorization_status: 'AUTHORIZED' },
      })
    })
    let documentUploads = 0,
      rejectUpload = true,
      documentReads = 0
    await page.route('**/api/guide-processes/1/authorization-documents', async (r) => {
      assert.equal(r.request().method(), 'POST')
      documentUploads++
      if (rejectUpload) {
        rejectUpload = false
        return r.fulfill({
          status: 400,
          json: { error: 'PDF fictício rejeitado para testar nova tentativa.' },
        })
      }
      const attachment = {
        id: documentUploads,
        original_name: decodeURIComponent(r.request().headers()['x-file-name']),
        file_size: 1024,
        uploaded_by_name: 'Administrador fictício',
        created_at: '2026-10-27T12:00:00Z',
      }
      fixture.authorization_documents.unshift(attachment)
      await r.fulfill({ status: 201, json: attachment })
    })
    await page.route('**/api/guide-processes/1/authorization-documents/*/download*', async (r) => {
      documentReads++
      await r.fulfill({
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4 synthetic test'),
      })
    })
    const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186',
      url = origin + '/central-de-guias/tratamentos/1'
    await page.goto(url)
    await page.locator('#treatment-tab-authorization').click()
    await page.getByRole('cell', { name: 'Fisioterapia', exact: true }).click()
    let selectedLabel = 'Fisioterapia'
    const group = page.getByRole('group', {
        name: 'Status de liberação — Fisioterapia',
        exact: true,
      }),
      button = (name) =>
        page
          .getByRole('group', { name: 'Status de liberação — ' + selectedLabel, exact: true })
          .getByRole('button', { name: new RegExp(name) })
    await group.waitFor()
    assert.equal(await group.getByRole('button').count(), 9)
    assert.equal(await button('Pendente$').getAttribute('aria-pressed'), 'true')
    assert.ok(await button('Em recurso').isDisabled())
    await button('Encaminhado ao convênio').click()
    assert.equal(writes, 0, 'Click alone must not change status')
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    assert.equal(writes, 0)
    async function change(label, notes, quantity) {
      await button(label).click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor()
      if (notes) await dialog.getByRole('textbox', { name: /Motivo|Observação/ }).fill(notes)
      if (quantity != null)
        await dialog.getByLabel('Quantidade autorizada', { exact: true }).fill(String(quantity))
      await dialog.getByRole('button', { name: 'Confirmar alteração', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
      await page.waitForFunction(
        (label) =>
          [...document.querySelectorAll('[aria-label^="Status de liberação —"] button')].some(
            (b) => b.textContent.includes(label) && b.getAttribute('aria-pressed') === 'true',
          ),
        label,
      )
    }
    await change('Encaminhado ao convênio')
    await change('Pendência do convênio', 'Anexar guia corrigida')
    await button('Encaminhado ao convênio').click()
    await page
      .getByText('As pendências desta guia serão marcadas como resolvidas.', { exact: true })
      .waitFor()
    await page
      .getByRole('dialog')
      .getByRole('textbox', { name: /Motivo/ })
      .fill('Guia corrigida')
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await button('Negado').waitFor({ state: 'visible' })
    await change('Negado', 'Negativa por análise do convênio')
    assert.ok(await button('Em recurso').isEnabled())
    await change('Em recurso', 'Contestação protocolada')
    assert.equal(fixture.authorization_status, 'IN_APPEAL')
    assert.equal(fixture.authorizations[0].status, 'DENIED')
    await page.screenshot({ path: '.deployment/authorization-status-desktop.png', fullPage: true })
    fail = true
    await button('Liberado').click()
    const authorizationDate = page
      .getByRole('dialog')
      .getByLabel('Data da autorização', { exact: true })
    await page.getByRole('dialog').getByLabel('Quantidade autorizada', { exact: true }).fill('10')
    await authorizationDate.fill('26/10/2026')
    const beforeDateWrite = writes
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click()
    assert.equal(writes, beforeDateWrite)
    assert.equal(await authorizationDate.getAttribute('aria-invalid'), 'true')
    await page
      .getByRole('dialog')
      .getByRole('alert')
      .filter({ hasText: 'Data da autorização' })
      .waitFor()
    await authorizationDate.fill('27/10/2026')
    assert.equal(await authorizationDate.getAttribute('aria-invalid'), 'false')
    await page.getByRole('dialog').getByLabel('Validade', { exact: true }).fill('27/11/2026')
    const authorizationNumber = page
      .getByRole('dialog')
      .getByLabel('Número da autorização', { exact: true })
    assert.equal(await authorizationNumber.getAttribute('inputmode'), 'numeric')
    await authorizationNumber.fill('00A123/45-6.7')
    assert.equal(await authorizationNumber.inputValue(), '001234567')
    await authorizationNumber.press('End')
    await authorizationNumber.pressSequentially('x8y')
    assert.equal(await authorizationNumber.inputValue(), '0012345678')
    await page.getByRole('dialog').getByLabel('Quantidade autorizada', { exact: true }).fill('10')
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click()
    await page
      .getByRole('alert')
      .getByText(/Falha fictícia/)
      .waitFor()
    assert.equal(
      await page
        .getByRole('dialog')
        .getByLabel('Quantidade autorizada', { exact: true })
        .inputValue(),
      '10',
    )
    await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.waitForFunction(() =>
      document
        .querySelector('[aria-label="Status de liberação — Fisioterapia"] [aria-pressed="true"]')
        ?.textContent.includes('Liberado'),
    )
    assert.equal(payload.authorization_number, '0012345678')
    assert.equal(payload.authorization_date, '2026-10-27')
    assert.equal(payload.expiration_date, '2026-11-27')
    await page.reload()
    await page.locator('#treatment-tab-authorization').click()
    await page.getByRole('cell', { name: 'Fisioterapia', exact: true }).click()
    assert.match(
      await page.locator('#treatment-tabpanel-authorization').innerText(),
      /27\/10\/2026/,
    )
    assert.match(
      await page.locator('#treatment-tabpanel-authorization').innerText(),
      /27\/11\/2026/,
    )
    await button('Liberado').click()
    assert.equal(
      await page
        .getByRole('dialog')
        .getByLabel('Data da autorização', { exact: true })
        .inputValue(),
      '27/10/2026',
    )
    assert.equal(
      await page.getByRole('dialog').getByLabel('Validade', { exact: true }).inputValue(),
      '27/11/2026',
    )
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    const documentSection = page.getByRole('region', { name: 'Documentos da liberação' })
    const attachButton = documentSection.getByRole('button', {
      name: 'Anexar documento da liberação',
      exact: true,
    })
    await attachButton.click()
    let uploadDialog = page.getByRole('dialog', { name: 'Anexar documento da liberação' })
    await uploadDialog
      .getByLabel('Arquivo PDF', { exact: true })
      .setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('invalid') })
    await uploadDialog.getByText('Selecione um arquivo PDF.', { exact: true }).waitFor()
    assert.equal(documentUploads, 0)
    await uploadDialog.getByLabel('Arquivo PDF', { exact: true }).setInputFiles({
      name: 'liberação.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 synthetic'),
    })
    await uploadDialog.getByRole('button', { name: 'Anexar PDF', exact: true }).click()
    await uploadDialog.getByRole('alert').filter({ hasText: 'PDF fictício rejeitado' }).waitFor()
    await uploadDialog.getByRole('button', { name: 'Anexar PDF', exact: true }).click()
    await uploadDialog.waitFor({ state: 'hidden' })
    await documentSection.getByText('liberação.pdf', { exact: true }).waitFor()
    assert.equal(fixture.authorization_status, 'AUTHORIZED')
    await attachButton.click()
    await uploadDialog.getByLabel('Arquivo PDF', { exact: true }).setInputFiles({
      name: 'complemento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 synthetic'),
    })
    await uploadDialog.getByRole('button', { name: 'Anexar PDF', exact: true }).click()
    await uploadDialog.waitFor({ state: 'hidden' })
    await page.reload()
    await page.locator('#treatment-tab-authorization').click()
    await documentSection.getByText('liberação.pdf', { exact: true }).click()
    await documentSection
      .getByRole('button', { name: 'Visualizar documento da liberação', exact: true })
      .click()
    const preview = page.getByRole('dialog', { name: 'Documento da liberação', exact: true })
    await preview.locator('iframe').waitFor()
    assert.match(await preview.locator('iframe').getAttribute('src'), /^blob:/)
    await preview.getByRole('button', { name: 'Fechar', exact: true }).last().click()
    const downloaded = page.waitForEvent('download')
    await documentSection
      .getByRole('button', { name: 'Baixar documento da liberação', exact: true })
      .click()
    assert.equal((await downloaded).suggestedFilename(), 'liberação.pdf')
    assert.equal(documentReads, 2)
    await page.screenshot({
      path: '.deployment/authorization-documents-desktop.png',
      fullPage: true,
    })
    await page.locator('#treatment-tab-history').click()
    await page.getByText('Contestação protocolada', { exact: true }).waitFor()
    await page.locator('#treatment-tab-authorization').click()
    selectedLabel = 'Consulta'
    await page.getByRole('cell', { name: 'Consulta', exact: true }).click()
    await change('Encaminhado ao convênio')
    const batchButton = page.getByRole('button', {
      name: 'Liberar guias selecionadas juntas',
      exact: true,
    })
    assert.ok(await batchButton.isDisabled())
    const selectAll=page.getByRole('checkbox',{name:'Selecionar todas as guias disponíveis para liberação conjunta',exact:true})
    await selectAll.check()
    assert.equal(await page.getByRole('checkbox',{name:'Selecionar Consulta para liberação conjunta',exact:true}).isChecked(),true)
    assert.equal(await page.getByRole('checkbox',{name:'Selecionar Fisioterapia para liberação conjunta',exact:true}).isChecked(),true)
    await selectAll.uncheck()
    await page
      .getByRole('checkbox', { name: 'Selecionar Consulta para liberação conjunta', exact: true })
      .check()
    assert.ok(await batchButton.isDisabled())
    await page
      .getByRole('checkbox', {
        name: 'Selecionar Fisioterapia para liberação conjunta',
        exact: true,
      })
      .check()
    await batchButton.click()
    let batchDialog = page.getByRole('dialog', { name: 'Liberar guias juntas', exact: true })
    await batchDialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    assert.equal(batchWrites, 0)
    await batchButton.click()
    await batchDialog.getByLabel('Número da autorização', { exact: true }).fill('000456')
    assert.equal(
      await batchDialog
        .getByLabel('Quantidade autorizada — Consulta', { exact: true })
        .inputValue(),
      '1',
    )
    assert.equal(
      await batchDialog
        .getByLabel('Quantidade autorizada — Fisioterapia', { exact: true })
        .inputValue(),
      '10',
    )
    await page.screenshot({path:'.deployment/bulk-authorization-dialog.png',fullPage:true})
    await batchDialog.getByRole('button', { name: 'Confirmar alteração', exact: true }).click()
    await batchDialog.getByRole('alert').filter({ hasText: 'Uma guia foi alterada' }).waitFor()
    assert.equal(
      await batchDialog.getByLabel('Número da autorização', { exact: true }).inputValue(),
      '000456',
    )
    await batchDialog.getByRole('button', { name: 'Confirmar alteração', exact: true }).click()
    await batchDialog.waitFor({ state: 'hidden' })
    assert.equal(batchWrites, 2)
    assert.equal(guides[0].authorization_number, '000456')
    assert.equal(guides[1].authorization_number, '000456')
    assert.equal(guides[0].authorized_sessions, 1)
    assert.equal(guides[1].authorized_sessions, 10)
    assert.ok(await batchButton.isDisabled())
    selectedLabel = 'Eletroestimulação'
    await page.getByRole('cell', { name: 'Eletroestimulação', exact: true }).click()
    await change('Encaminhado ao convênio')
    await change('Negado', 'Eletro não autorizada')
    assert.equal(guides[0].status, 'AUTHORIZED')
    assert.equal(guides[1].status, 'AUTHORIZED')
    assert.equal(guides[2].status, 'DENIED')
    assert.equal(fixture.authorized_sessions, 10)
    await page.screenshot({ path: '.deployment/authorization-by-guide-mixed.png', fullPage: true })
    selectedLabel = 'Fisioterapia'
    fixture.workflow_stages = { authorization: { completed_at: '2026-10-27T12:00:00Z' } }
    await page.reload()
    await page.locator('#treatment-tab-authorization').click()
    await page.getByRole('cell', { name: 'Fisioterapia', exact: true }).click()
    assert.ok(await batchButton.isDisabled())
    assert.ok(
      await page
        .getByRole('checkbox', { name: 'Selecionar Consulta para liberação conjunta', exact: true })
        .isDisabled(),
    )
    for (const b of await group.getByRole('button').all()) assert.ok(await b.isDisabled())
    assert.ok(await attachButton.isDisabled())
    await documentSection.getByText('complemento.pdf', { exact: true }).click()
    assert.ok(
      await documentSection
        .getByRole('button', { name: 'Visualizar documento da liberação', exact: true })
        .isEnabled(),
    )
    selectedLabel = 'Fisioterapia'
    fixture.workflow_stages = {}
    fixture.authorization_status = 'READY'
    fixture.requested_sessions = null
    await page.reload()
    await page.locator('#treatment-tab-authorization').click()
    await page.getByRole('cell', { name: 'Fisioterapia', exact: true }).click()
    await page.getByRole('link', { name: 'sessões', exact: true }).click()
    assert.equal(await page.locator('#treatment-tab-central').getAttribute('aria-selected'), 'true')
    fixture.requested_sessions = 10
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await page.locator('#treatment-tab-authorization').click()
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 2)
    guides[1].status = 'READY'
    await page.reload()
    await page.locator('#treatment-tab-authorization').click()
    await page.getByRole('cell', { name: 'Fisioterapia', exact: true }).click()
    await button('Encaminhado ao convênio').click()
    await page.screenshot({
      path: '.deployment/authorization-status-mobile-dialog.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.screenshot({
      path: '.deployment/authorization-documents-mobile.png',
      fullPage: true,
    })
    assert.deepEqual(errors, [])
    console.log(
      'PASS: nine horizontal statuses, confirmation/cancel, pending resolution, denial/appeal/release, failed save preserved, history, PDF attachments/upload/retry/preview/download/locks, required links and responsive dialog.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
