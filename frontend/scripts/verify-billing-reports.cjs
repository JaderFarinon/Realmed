const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186'
const rows = Array.from({ length: 25 }, (_, i) => ({
  id: 'synthetic-' + i,
  patient_name: `Paciente Fictício ${String(i + 1).padStart(2, '0')}`,
  phone: i % 2 ? '4100000000' : null,
  daily_misses: 1,
  prior_misses: 2,
  total_misses: 3,
  agendas: 'Agenda Fictícia',
  places: 'Matriz',
  previous_dates: ['2026-10-01', '2026-10-05'],
  history: [1, 5, 20].map((day, index) => ({
    id: String(index),
    date: `2026-10-${String(day).padStart(2, '0')}`,
    start_at: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
    agenda: 'Agenda Fictícia',
    place: 'Matriz',
  })),
}))
async function mock(page) {
  await page.route('**/api/billing/reports/absences**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/queue'))
      return route.fulfill({ status: 202, json: { queued: true } })
    const params = Object.fromEntries(url.searchParams)
    return route.fulfill({
      json: {
        date: params.date,
        historyStart: params.historyStart || '2026-10-01',
        rule: params.rule || 'total3',
        total: rows.length,
        items: rows,
        generatedAt: new Date().toISOString(),
        coverage: {
          days: 20,
          collectedDays: 20,
          currentDays: 19,
          complete: false,
          failedDays: 0,
          lastSuccessAt: new Date().toISOString(),
          reportDayLastSuccessAt: new Date().toISOString(),
        },
      },
    })
  })
}
async function run() {
  const browser = await chromium.launch({ executablePath: process.env.REALMED_BROWSER_EXECUTABLE })
  try {
    const page = await browser.newPage()
    await prepare(page)
    await mock(page)
    await page.addInitScript(() => {
      window.print = () => {
        window.__printed = (window.__printed || 0) + 1
      }
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(origin + '/faturamento/relatorios')
    await page.getByRole('heading', { name: 'Relatórios de Faturamento', exact: true }).waitFor()
    await page.locator('.report-screen tbody b').waitFor()
    assert.match(
      await page.locator('.report-screen tbody b').innerText(),
      /^Faltas Recorrentes — \d{2}\/\d{2}\/\d{4}/,
    )
    assert.match(await page.locator('.report-screen tbody').innerText(), /Emitido em/)
    assert.doesNotMatch(await page.locator('.report-screen tbody').innerText(), /Paciente Fictício/)
    const open = page.getByRole('button', { name: 'Abrir relatório selecionado', exact: true })
    assert.equal(await open.isDisabled(), true)
    await page.locator('.report-screen tbody tr[aria-selected]').click()
    await open.click()
    const report = page.getByRole('dialog', { name: 'Faltas Recorrentes — Telefonia', exact: true })
    await report.waitFor()
    const detail = report.getByRole('button', {
      name: 'Ver histórico do paciente selecionado',
      exact: true,
    })
    assert.equal(await detail.isDisabled(), true)
    await report.locator('.list-table tbody tr[aria-selected]').first().click()
    await detail.click()
    await page
      .getByRole('dialog', { name: 'Histórico de Faltas do Paciente', exact: true })
      .waitFor()
    assert.equal(
      await page
        .getByRole('dialog', { name: 'Histórico de Faltas do Paciente', exact: true })
        .locator('tbody tr')
        .count(),
      3,
    )
    await page.keyboard.press('Escape')
    await page.getByLabel('Pesquisar paciente no relatório', { exact: true }).fill('Fictício 25')
    assert.equal(await page.locator('.absence-print tbody tr').count(), 1)
    await page.getByLabel('Pesquisar paciente no relatório', { exact: true }).fill('')
    await report.getByRole('button', { name: 'Imprimir relatório completo', exact: true }).click()
    assert.equal(await page.evaluate(() => window.__printed), 1)
    assert.equal(
      await page.locator('.absence-print tbody tr').count(),
      25,
      'print must include all pages, not only visible table rows',
    )
    for (const width of [1366, 1024, 390]) {
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 })
      await page.waitForTimeout(180)
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'horizontal overflow at ' + width,
      )
      await page.screenshot({ path: `.deployment/absence-report-${width}.png`, fullPage: true })
    }
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.emulateMedia({ media: 'print' })
    assert.equal(await page.locator('.report-screen').isVisible(), false)
    assert.equal(await page.locator('.absence-print').isVisible(), true)
    assert.equal(await page.locator('.absence-print tbody tr').count(), 25)
    await page.screenshot({ path: '.deployment/absence-report-print.png', fullPage: true })
    await page.emulateMedia({ media: 'screen' })
    await report.getByRole('button', { name: 'Fechar', exact: true }).click()
    await page
      .locator('details')
      .first()
      .evaluate((el) => (el.open = true))
    await page.getByLabel('Regra de inclusão', { exact: true }).selectOption('prior3')
    await page.getByRole('button', { name: 'Gerar relatório', exact: true }).click()
    await page.getByText('25 pacientes para contato', { exact: true }).waitFor()
    const denied = await browser.newPage()
    await prepare(denied, {
      id: 2,
      role: 'user',
      permissionsEnabled: true,
      permissions: [{ moduleKey: 'billing_dashboard', canView: true }],
    })
    await denied.goto(origin + '/faturamento/relatorios')
    await denied.waitForURL('**/sem-permissao')
    await denied.getByRole('button', { name: 'Faturamento', exact: true }).click()
    assert.ok(await denied.getByRole('link', { name: 'Relatórios', exact: true }).count())
    assert.ok(await denied.evaluate(() => localStorage.getItem('token')))
    const reportsOnly = await browser.newPage()
    await prepare(reportsOnly, {
      id: 3,
      role: 'user',
      permissionsEnabled: true,
      permissions: [{ moduleKey: 'billing_reports', canView: true }],
    })
    await mock(reportsOnly)
    await reportsOnly.goto(origin + '/faturamento/relatorios')
    await reportsOnly.locator('.report-screen tbody b').waitFor()
    assert.match(
      await reportsOnly.locator('.report-screen tbody b').innerText(),
      /^Faltas Recorrentes — \d{2}\/\d{2}\/\d{4}/,
    )
    assert.deepEqual(errors, [])
    console.log(
      'PASS: report identified by type/emission (not a patient), open action, unchanged patient history, search, all-page print, partial-history warning, desktop/mobile layout and independent report permission.',
    )
  } finally {
    await browser.close()
  }
}
run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
