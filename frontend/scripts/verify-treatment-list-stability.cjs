const assert = require('node:assert/strict')
const { chromium } = require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare, records } = require('./verify-screen-pattern.cjs')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5198'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.REALMED_BROWSER_EXECUTABLE ? { executablePath: process.env.REALMED_BROWSER_EXECUTABLE } : {}) })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const errors = [], requests = []
    page.on('pageerror', error => errors.push(error.message))
    await prepare(page)
    await page.addInitScript(() => {
      const original = window.fetch
      window.fetch = (input, options) => {
        if (!String(input).endsWith('/treatment-updates')) return original(input, options)
        const encoder = new TextEncoder()
        const stream = new ReadableStream({ start(controller) {
          window.emitTreatmentRefresh = () => controller.enqueue(encoder.encode('data: refresh\n\n'))
          options.signal.addEventListener('abort', () => controller.close(), { once: true })
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } })
        return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
      }
    })
    let delay = 500, fail = false, active = 0, peak = 0
    const rows = records.map((row, i) => ({ ...row, patient_name: `Paciente fictício ${i + 1}`, insurance_name: i === 4 ? 'Convênio de assistência médica e hospitalar com descrição longa para testar quebra de linha' : 'Convênio', physiotherapist_name: '—' }))
    await page.route('**/api/guide-processes?*', async route => {
      const url = new URL(route.request().url()), size = Number(url.searchParams.get('pageSize') || 10), number = Number(url.searchParams.get('page') || 1)
      const list = url.searchParams.has('page')
      if (list) { requests.push({ number, size, params: Object.fromEntries(url.searchParams), time: Date.now() }); active++; peak = Math.max(peak, active) }
      await sleep(list ? delay : 20)
      if (list) active--
      await route.fulfill(fail ? { status: 429, headers: { 'Retry-After': '3' }, json: { error: 'Muitas requisições. Tente novamente mais tarde.' } } : { json: { data: rows.slice((number - 1) * size, number * size), pagination: { page: number, pageSize: size, total: rows.length, pages: Math.ceil(rows.length / size) } } })
    })
    await page.goto(origin + '/central-de-guias/tratamentos?queue=AWAITING_EVALUATION')
    await page.waitForTimeout(5000)
    console.log('Initial list requests:', JSON.stringify(requests.map(({ size }) => size)))
    assert.ok(requests.length <= 4, 'Loading/row measurement must settle instead of repeatedly fetching the list')
    async function stable(label) {
      await page.waitForTimeout(2000)
      const before = requests.length
      await page.waitForTimeout(1800)
      assert.equal(requests.length, before, label + ': no idle requests')
      const layout = await page.evaluate(() => {
        const view = document.querySelector('.list-table-viewport').getBoundingClientRect(), rows = [...document.querySelectorAll('tbody tr[aria-selected]')]
        return { count: rows.length, bottom: rows.at(-1)?.getBoundingClientRect().bottom, edge: view.bottom, footer: document.querySelector('.list-pagination').getBoundingClientRect().bottom, height: innerHeight }
      })
      assert.ok(layout.count > 0, label + ': populated rows remain visible')
      if (!await page.locator('.list-filter-disclosure').evaluate(el => el.open)) {
        assert.ok(layout.bottom <= layout.edge + 2, label + ': rows fit')
        assert.ok(layout.footer <= layout.height + 2, label + ': pagination visible')
      }
    }
    await stable('initial')
    for (const viewport of [{ width: 1024, height: 600 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport)
      await stable(`${viewport.width}x${viewport.height}`)
    }
    await page.getByRole('button', { name: 'Próxima página', exact: true }).click()
    await stable('second page with shorter content')
    await page.locator('.list-filter-disclosure summary').click()
    await stable('expanded filters')
    await page.locator('.list-filter-disclosure summary').click()
    await stable('collapsed filters')
    await page.locator('tbody tr[aria-selected]').first().click()
    const selection = await page.locator('tbody tr[aria-selected="true"]').innerText()
    await page.evaluate(() => window.emitTreatmentRefresh())
    await page.waitForTimeout(420)
    assert.ok(await page.locator('tbody tr[aria-selected]').count() > 0, 'Live refresh must retain visible rows')
    await stable('remote update')
    assert.equal(await page.locator('tbody tr[aria-selected="true"]').innerText(), selection, 'Live update preserves selection')
    // Slow overlapping refreshes and a manual filter change must be serialized; latest query wins.
    delay = 900
    await page.evaluate(() => window.emitTreatmentRefresh())
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: /^Liberados \(/ }).click()
    await stable('overlapping remote update and queue change')
    assert.equal(peak, 1, 'At most one list request in flight')
    assert.equal(new URL(page.url()).searchParams.get('queue'), 'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED', 'Late responses cannot restore the previous queue')
    assert.equal(requests.at(-1).params.authorization_status, 'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED')
    fail = true
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
    await page.waitForTimeout(1000)
    const limitedCount = requests.length
    for (let i = 0; i < 3; i++) { await page.evaluate(() => window.emitTreatmentRefresh()); await page.waitForTimeout(450) }
    assert.equal(requests.length, limitedCount, 'Rate-limited refresh respects Retry-After')
    fail = false
    await page.waitForTimeout(4500)
    await stable('recovered after rate limit')
    assert.deepEqual(errors, [])
    console.log('PASS: stable capacity, slow API, heterogeneous rows, resize, pages, filters, live selection, serialized requests and rate-limit recovery.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
