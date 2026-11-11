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
      patient_id: 1,
      patient_insurance_id: 1,
      physiotherapist_id: 1,
      requesting_doctor_id: 2,
      authorization_status: 'IN_PROGRESS',
      documents: [],
      authorizations: [],
      procedures: [],
      pendingItems: [],
      history: [],
    }
    await page.route('**/api/guide-processes/1', (r) => r.fulfill({ json: fixture }))
    await page.route('**/api/guide-processes/1/preparation-options', (r) =>
      r.fulfill({ json: { professionals: [], insurances: [], procedures: [] } }),
    )
    await page.route('**/api/guide-processes/1/evaluation**', (r) =>
      r.fulfill({
        json: r.request().url().endsWith('/options') ? { professionals: [], patient: {} } : null,
      }),
    )
    const base = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
    async function marked(input, expected = true) {
      const count = await input.evaluate(
        (el) => el.closest('label')?.querySelectorAll('.required-field-marker').length || 0,
      )
      assert.equal(count, expected ? 1 : 0)
      if (expected)
        assert.equal(
          await input.evaluate(
            (el) =>
              getComputedStyle(el.closest('label').querySelector('.required-field-marker')).color,
          ),
          'rgb(217, 45, 32)',
        )
    }
    await page.goto(base + '/central-de-guias/novo')
    await marked(page.getByRole('combobox'))
    await marked(page.getByLabel('Data da avaliação', { exact: true }), false)
    await page.goto(base + '/central-de-guias/tratamentos/1?evaluate=1')
    const evaluation = page.locator('#digital-evaluation')
    for (const name of [
      'Queixa principal / motivo do atendimento',
      'Exame físico e achados relevantes',
      'Gravidade do quadro',
      'Risco assistencial global',
      'Objetivos terapêuticos',
      'Fisioterapeuta',
      'CREFITO',
      'Data da avaliação',
      'Sessões solicitadas',
    ]) {
      const input = evaluation.getByLabel(name, { exact: true })
      await input.waitFor()
      await marked(input)
      assert.equal(
        await input.evaluate((el) => el.required),
        false,
        'Deferred requirement must not block draft saving',
      )
    }
    await marked(evaluation.getByLabel('Diagnóstico médico / hipótese', { exact: true }), false)
    await marked(evaluation.getByLabel('Dor EVA (0–10)', { exact: true }), false)
    assert.equal(
      await evaluation
        .locator('legend')
        .filter({ hasText: 'Conduta proposta' })
        .locator('.required-field-marker')
        .count(),
      1,
    )
    const time = evaluation.getByLabel('Horário', { exact: true }).first()
    await marked(time, false)
    await evaluation.getByLabel('Segunda', { exact: true }).check()
    await marked(time)
    assert.equal(await time.evaluate((el) => el.required), false)
    await evaluation.getByLabel('Outro', { exact: true }).first().check()
    await marked(evaluation.getByLabel('Outra região', { exact: true }))
    await evaluation
      .getByLabel('Queixa principal / motivo do atendimento', { exact: true })
      .fill('Rascunho fictício')
    await page.locator('#treatment-tab-central').click()
    const central = page.locator('[data-treatment-stage="central"]')
    for (const key of [
      'patient_insurance_id',
      'physiotherapist_id',
      'requesting_doctor_id',
      'requested_sessions',
    ])
      await marked(central.locator('#preparation-1-' + key))
    await marked(central.getByLabel('Observações', { exact: true }), false)
    await page.locator('#treatment-tab-evaluation').click()
    assert.equal(
      await evaluation
        .getByLabel('Queixa principal / motivo do atendimento', { exact: true })
        .inputValue(),
      'Rascunho fictício',
    )
    await page.locator('#treatment-tab-documents').click()
    assert.equal(await page.locator('#treatment-documents b .required-field-marker').count(), 2)
    await page.locator('#treatment-tab-authorization').click()
    const statuses = page.getByRole('group', { name: 'Status de liberação' })
    await statuses.getByRole('button', { name: 'Liberado', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await marked(dialog.getByLabel('Quantidade autorizada', { exact: true }))
    await marked(dialog.getByLabel('Número da autorização', { exact: true }), false)
    await marked(dialog.getByLabel('Observação', { exact: true }), false)
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await statuses.getByRole('button', { name: 'Negado', exact: true }).click()
    await marked(page.getByRole('dialog').getByRole('textbox', { name: /Motivo/ }))
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
    page.on('dialog', (d) => d.accept())
    await page.goto(base + '/estoque/requisicoes')
    await page.getByRole('button', { name: 'Nova requisição para consumo', exact: true }).click()
    await marked(page.getByRole('dialog').getByRole('combobox', { name: 'Setor', exact: true }))
    await marked(page.getByRole('dialog').getByPlaceholder('Digite o nome ou código do material'))
    await marked(page.getByRole('dialog').getByLabel('Quantidade', { exact: true }))
    assert.equal(
      await page
        .getByRole('dialog')
        .getByRole('columnheader', { name: 'Quantidade', exact: true })
        .locator('.required-field-marker')
        .count(),
      1,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 2)
    await page.screenshot({ path: '.deployment/required-markers-mobile.png', fullPage: true })
    assert.deepEqual(errors, [])
    console.log(
      'PASS: red markers for native/deferred rules, conditional times/other/reasons, required groups, optional fields unchanged, drafts preserved and editable table headers/mobile.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
