const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const { chromium } = require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
async function run() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    await prepare(page)
    const consulted = new Set(), operationsReceived = [], errors = []
    let refreshAttempts = 0
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/integrations/stenci/**', async route => {
      const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.split('/').pop()
      const names = { insurances: 'listInsurances', 'insurance-plans': 'listInsurancePlans', professionals: 'listProfessionals', search: 'searchPatients', 'test-connection': 'testConnection' }
      const send = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
      if (endpoint === 'refresh') {
        assert.equal(request.method(), 'POST')
        const body = request.postDataJSON()
        assert.equal(body.username, 'teste-visual')
        refreshAttempts++
        if (body.password !== 'synthetic-password') return send(422, { error: 'Usuário ou senha Stenci inválidos.', code: 'STENCI_INVALID_CREDENTIALS' })
        for (const item of body.operations) { consulted.add(item.name); operationsReceived.push(item) }
        return send(200, { message: 'Dados consultados e sessão Stenci encerrada.' })
      }
      if (names[endpoint]) {
        if (!consulted.has(names[endpoint])) return send(428, { error: 'Consultar novamente', code: 'STENCI_REFRESH_REQUIRED' })
        if (endpoint === 'search') return send(200, { items: [{ external_id: 'p1', full_name: 'Paciente fictício Stenci', raw: { id: 'p1', name: 'Paciente fictício Stenci', patient: {} } }], hasMore: false })
        return send(200, { items: [], hasMore: false })
      }
      return send(200, {})
    })
    await page.goto(origin + '/central-de-guias/novo')
    const dialog = page.getByRole('dialog', { name: 'Consultar dados do Stenci' })
    await dialog.waitFor()
    await page.waitForTimeout(200)
    await dialog.getByLabel('Usuário Stenci').fill('teste-visual')
    await dialog.getByLabel('Senha Stenci').fill('wrong-synthetic')
    await dialog.getByRole('button', { name: 'Consultar e encerrar sessão', exact: true }).click()
    await dialog.getByRole('alert').waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), 'synthetic-ui-test')
    assert.equal(await dialog.getByLabel('Senha Stenci').inputValue(), '')
    await dialog.getByLabel('Senha Stenci').fill('synthetic-password')
    await dialog.getByRole('button', { name: 'Consultar e encerrar sessão', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(new Set(operationsReceived.map(item => item.name)), new Set(['listInsurances', 'listInsurancePlans', 'listProfessionals']))
    assert.equal(refreshAttempts, 2, 'concurrent catalog requests must share one successful prompt')
    await page.getByPlaceholder('Digite nome, CPF etc.').fill('Paciente')
    await dialog.waitFor()
    await dialog.getByLabel('Usuário Stenci').fill('teste-visual')
    await dialog.getByLabel('Senha Stenci').fill('synthetic-password')
    await dialog.getByRole('button', { name: 'Consultar e encerrar sessão', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(operationsReceived.at(-1).search, 'Paciente')
    await page.getByText('Paciente fictício Stenci', { exact: true }).waitFor()
    consulted.delete('searchPatients')
    await page.getByPlaceholder('Digite nome, CPF etc.').fill('Outro')
    await dialog.waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(100)
    const output = path.resolve(__dirname, '../../.deployment/stenci-refresh-qa')
    fs.mkdirSync(output, { recursive: true })
    await page.screenshot({ path: path.join(output, 'reauth-mobile.png') })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), 'synthetic-ui-test')
    assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes('synthetic-password')), false)
    assert.deepEqual(errors, [])
    console.log('PASS: batched Stenci reauthentication, invalid credentials, credential clearing, resumed patient search, mobile and cancellation preserve Realmed.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
