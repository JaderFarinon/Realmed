const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare, records } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const p = await browser.newPage()
    await prepare(p)
    let refreshed = false,
      failed = false,
      calls = 0
    const processData = () => ({
      ...records[0],
      patient_id: 1,
      patient_name: refreshed ? 'Paciente atualizado' : 'Paciente antes',
      card_number: refreshed ? 'CARD-NEW' : null,
      documents: [],
      authorizations: [],
      procedures: [],
      pendingItems: [],
      history: [],
    })
    await p.route('**/api/guide-processes/1', (r) => r.fulfill({ json: processData() }))
    await p.route('**/api/guide-processes/1/evaluation**', (r) =>
      r.fulfill({
        json: r.request().url().endsWith('/options')
          ? { professionals: [], patient: { cpf: '00000000000' } }
          : null,
      }),
    )
    await p.route('**/api/integrations/stenci/treatments/1/refresh-patient', (r) => {
      calls++
      if (failed) return r.fulfill({ status: 502, json: { error: 'Falha simulada de consulta' } })
      refreshed = true
      return r.fulfill({
        json: {
          patient: {
            id: 1,
            full_name: 'Paciente atualizado',
            cpf: '00000000000',
            gender: 'female',
            cellphone: '41999999999',
          },
          insurancePreserved: false,
        },
      })
    })
    const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
    await p.goto(origin + '/central-de-guias/tratamentos/1?evaluate=1')
    const panel = p.locator('#digital-evaluation'),
      draft = panel.getByLabel('Queixa principal / motivo do atendimento', { exact: true })
    await draft.fill('Rascunho clínico não salvo')
    await p.locator('.treatment-identity-more > summary').click()
    await p.getByRole('button', { name: 'Atualizar dados do Stenci', exact: true }).click()
    await panel.getByText('CARD-NEW', { exact: true }).waitFor()
    await panel.getByText('Feminino', { exact: true }).waitFor()
    await panel.getByText('41999999999', { exact: true }).waitFor()
    assert.equal(await draft.inputValue(), 'Rascunho clínico não salvo')
    assert.equal(calls, 1)
    failed = true
    await p.getByRole('button', { name: 'Atualizar dados do Stenci', exact: true }).click()
    await p.getByText('Falha simulada de consulta', { exact: true }).waitFor()
    assert.equal(await draft.inputValue(), 'Rascunho clínico não salvo')
    await p.setViewportSize({ width: 390, height: 844 })
    await p.waitForTimeout(300)
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    const denied = await browser.newPage()
    await prepare(denied, {
      id: 2,
      role: 'user',
      permissionsEnabled: true,
      permissions: [
        { moduleKey: 'guide_processes', canView: true, canEdit: false, canCreate: false },
      ],
    })
    await denied.goto(origin + '/central-de-guias/tratamentos/1')
    await denied.getByRole('heading', { name: 'Tratamento', exact: true }).waitFor()
    assert.equal(
      await denied.getByRole('button', { name: 'Atualizar dados do Stenci', exact: true }).count(),
      0,
    )
    console.log(
      'PASS: refresh existing treatment, patient identification updates immediately, unsaved evaluation survives success/failure, edit permission and mobile layout',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
