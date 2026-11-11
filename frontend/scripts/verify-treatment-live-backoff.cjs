const assert = require('node:assert/strict')
const { chromium } = require(process.env.REALMED_PLAYWRIGHT_ROOT || 'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5198'
async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.REALMED_BROWSER_EXECUTABLE ? { executablePath: process.env.REALMED_BROWSER_EXECUTABLE } : {}) })
  try {
    for (const status of [503, 429, 403, 200]) {
      const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
      await prepare(page)
      await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000))
      await page.addInitScript(({ status }) => {
        window.streamAttempts = []
        const original = window.fetch
        window.fetch = (input, options) => {
          if (!String(input).endsWith('/treatment-updates')) return original(input, options)
          window.streamAttempts.push(Date.now())
          // A stream closed by a proxy just after sending its initial refresh is also unstable.
          return Promise.resolve(new Response(status === 200 ? 'data: refresh\n\n' : '', { status, headers: { 'Retry-After': '60', 'Content-Type': 'text/event-stream' } }))
        }
      }, { status })
      const apiRequests = []
      page.on('request', request => { if (request.url().includes('/api/guide-processes')) apiRequests.push(request.url()) })
      await page.goto(origin + '/central-de-guias/tratamentos')
      await page.getByRole('heading', { name: 'Gestão de Tratamentos', exact: true }).waitFor()
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      // Public assets/fonts can finish after the mocked API. Let the initial
      // layout queries settle before checking background retries in fake time.
      for (let i = 0; i < 3; i++) {
        await page.clock.runFor(500)
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      const initial = await page.evaluate(() => window.streamAttempts.length)
      assert.equal(initial, 1)
      const requestCount = apiRequests.length
      const elapsed = await page.evaluate(() => Date.now() - window.streamAttempts[0])
      await page.clock.runFor(59000 - elapsed)
      const attempts = await page.evaluate(() => window.streamAttempts)
      if (status === 429 || status === 403) {
        assert.equal(attempts.length, 1, 'No reconnect before Retry-After or after permission denial')
        assert.equal(apiRequests.length, requestCount, `No fallback refresh during ${status}: ${JSON.stringify(apiRequests)}`)
      } else {
        assert.ok(attempts.length <= 5, 'Unstable stream uses exponential backoff, not a three-second retry loop')
        for (let i = 2; i < attempts.length; i++) assert.ok(attempts[i] - attempts[i - 1] >= (attempts[i - 1] - attempts[i - 2]) * 1.8)
      }
      await page.clock.runFor(2000)
      if (status === 429) assert.equal(await page.evaluate(() => window.streamAttempts.length), 2, 'Reconnect after the server delay')
      await page.goto(origin + '/cadastros/convenios')
      await page.getByRole('heading', { name: 'Convênios', exact: true }).waitFor()
      const callsAfterLeave = apiRequests.length
      await page.clock.runFor(120000)
      assert.equal(apiRequests.length, callsAfterLeave, 'Leaving the screen stops refresh timers')
      await page.close()
    }
    console.log('PASS: failed/short streams back off; 429 Retry-After and 403 stop retries/fallback; leaving cleans timers.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
