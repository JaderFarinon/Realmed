const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await prepare(page)
    await page.route('**/api/guide-processes/1/preparation-options', (route) =>
      route.fulfill({ json: { professionals: [], insurances: [], procedures: [] } }),
    )
    let confirmed = 0
    const sessions = [
      {
        date: '2026-11-02',
        day: 'MONDAY',
        requested_time: '14:00',
        session_time: '14:15',
        stenci_time: '14:18',
        free: 3,
        capacity: 6,
      },
    ]
    await page.route('**/api/guide-processes/1/rotation**', async (route) => {
      const url = new URL(route.request().url())
      let data = null
      if (url.pathname.endsWith('/suggest')) {
        assert.equal(route.request().method(), 'POST')
        data = {
          token: 'test-token',
          candidates: [
            { professional_name: 'Fisio indicado', schedule_name: 'Agenda matriz', sessions },
          ],
          message: 'Vagas verificadas',
        }
      } else if (url.pathname.endsWith('/confirm')) {
        confirmed++
        data = {
          assignment: {
            guide_process_id: 1,
            professional_id: 9999,
            professional_name: 'Fisio indicado',
            sessions,
          },
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    })
    await page.goto(
      (process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186') +
        '/central-de-guias/tratamentos/1?evaluate=1',
    )
    const button = page.getByRole('button', {
      name: 'Consultar próximo fisioterapeuta',
      exact: true,
    })
    await button.waitFor()
    assert.ok(
      await page.getByRole('button', { name: 'Agendas participantes', exact: true }).count(),
    )
    await page.getByRole('tab', { name: 'Central de Guias', exact: true }).click()
    const central = page.locator('#treatment-tabpanel-central')
    await central.getByLabel('Observações', { exact: true }).fill('Rascunho da central preservado')
    await page.getByRole('tab', { name: 'Avaliação', exact: true }).click()
    await page
      .locator('#digital-evaluation')
      .getByLabel('Fisioterapeuta', { exact: true })
      .fill('Avaliadora original')
    await button.click()
    await page.getByText('Fisio indicado', { exact: true }).waitFor()
    await page.getByRole('cell', { name: '14:18', exact: true }).waitFor()
    page.once('dialog', (d) => d.accept())
    await page
      .getByRole('button', { name: 'Confirmar indicação e usar horários', exact: true })
      .click()
    await page.getByText('Indicação registrada.', { exact: false }).first().waitFor()
    assert.equal(confirmed, 1)
    assert.equal(
      await page
        .locator('#digital-evaluation')
        .getByLabel('Fisioterapeuta', { exact: true })
        .inputValue(),
      'Avaliadora original',
    )
    await page.getByRole('tab', { name: 'Central de Guias', exact: true }).click()
    assert.equal(await central.locator('#preparation-1-physiotherapist_id').inputValue(), '9999')
    assert.equal(
      await central
        .locator('#preparation-1-physiotherapist_id')
        .locator('option:checked')
        .innerText(),
      'Fisio indicado',
    )
    assert.equal(
      await central.getByLabel('Observações', { exact: true }).inputValue(),
      'Rascunho da central preservado',
    )
    assert.ok(await central.getByRole('button', { name: 'Finalizar etapa', exact: true }).count())
    assert.equal(
      await page
        .getByRole('tab', { name: 'Central de Guias', exact: true })
        .getAttribute('class')
        .then((v) => v.includes('is-complete')),
      false,
    )
    await page.getByRole('tab', { name: 'Avaliação', exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await button.scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await page.screenshot({ path: '.deployment/rotation-mobile.png' })
    console.log(
      'PASS: rotation suggestion, exact slot, confirmation, configuration access and mobile layout',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
