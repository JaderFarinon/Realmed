const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const b = await chromium.launch()
  try {
    const p = await b.newPage()
    await prepare(p)
    let fail = false,
      payload
    await p.route('**/api/guide-processes/1/preparation-options', (r) =>
      r.fulfill({ json: { professionals: [], insurances: [], procedures: [] } }),
    )
    await p.route('**/api/guide-processes/1', async (r) => {
      if (r.request().method() !== 'PUT') return r.fallback()
      payload = r.request().postDataJSON()
      await new Promise((resolve) => setTimeout(resolve, 700))
      return r.fulfill({
        status: fail ? 422 : 200,
        json: fail ? { error: 'Falha simulada no salvamento' } : { id: 1 },
      })
    })
    await p.goto(
      (process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186') +
        '/central-de-guias/tratamentos/1',
    )
    const central = p.locator('section.treatment-preparation').nth(1),
      reception = p.locator('section.treatment-preparation').first()
    await p.locator('#treatment-tab-central').click()
    await central.getByLabel('Observações', { exact: true }).fill('Observação preservada')
    await central.getByRole('button', { name: 'Salvar preparação', exact: true }).click()
    const saving = central.getByRole('button', { name: 'Salvando…', exact: true })
    await saving.waitFor()
    assert.equal(await saving.isDisabled(), true)
    await central
      .getByRole('status')
      .getByText('Preparação salva com sucesso.', { exact: false })
      .waitFor()
    assert.equal(payload.notes, 'Observação preservada')
    assert.equal(
      await reception.getByText('Preparação salva com sucesso.', { exact: false }).count(),
      0,
    )
    fail = true
    await central.getByRole('button', { name: 'Salvar preparação', exact: true }).click()
    await central
      .getByRole('alert')
      .getByText('Falha simulada no salvamento', { exact: false })
      .waitFor()
    assert.equal(
      await central.getByLabel('Observações', { exact: true }).inputValue(),
      'Observação preservada',
    )
    assert.equal(
      await central.getByRole('button', { name: 'Salvar preparação', exact: true }).isEnabled(),
      true,
    )
    console.log(
      'PASS: saving label/disabled button, local success confirmation, visible failure and preserved form',
    )
  } finally {
    await b.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
