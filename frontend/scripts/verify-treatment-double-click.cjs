const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const assert = require('node:assert/strict')
const { prepare, records } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage(),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await prepare(page)
    await page.route('**/api/guide-processes/*', async (route) => {
      const match = new URL(route.request().url()).pathname.match(/\/guide-processes\/(\d+)$/)
      if (!match) return route.fallback()
      assert.equal(route.request().method(), 'GET')
      const record = records.find((row) => row.id === Number(match[1]))
      await route.fulfill({
        json: {
          ...record,
          documents: [],
          authorizations: [],
          procedures: [],
          pendingItems: [],
          history: [],
        },
      })
    })
    await page.route('**/api/guide-processes/*/evaluation**', (route) =>
      route.fulfill({
        json: route.request().url().endsWith('/options')
          ? { patient: {}, professionals: [] }
          : null,
      }),
    )
    const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186',
      list = '/central-de-guias/tratamentos'
    await page.goto(origin + list)
    const rows = page.locator('.list-table tbody tr[aria-selected]')
    await rows.nth(1).waitFor()
    await rows.first().click()
    assert.equal(new URL(page.url()).pathname, list)
    assert.equal(await rows.first().getAttribute('aria-selected'), 'true')
    await rows.nth(1).evaluate((row) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Controle fictício'
      row.lastElementChild.appendChild(button)
    })
    await page.getByRole('button', { name: 'Controle fictício', exact: true }).dblclick()
    assert.equal(new URL(page.url()).pathname, list, 'Inner controls must not open the treatment')
    await rows.nth(1).locator('td').first().dblclick()
    await page.waitForURL((url) => url.pathname === list + '/' + records[1].id)
    await page.locator('#treatment-patient-name').waitFor()
    assert.ok(
      (await page.locator('.treatment-identity').innerText()).includes(records[1].patient_name),
    )
    await page.goto(origin + list)
    await rows.first().waitFor()
    await rows.first().locator('td').first().dblclick()
    await page.waitForURL((url) => url.pathname === list + '/' + records[0].id)
    await page.goto(origin + '/estoque/produtos')
    const product = page.locator('.list-table tbody tr[aria-selected]').first()
    await product.waitFor()
    await product.dblclick()
    assert.equal(new URL(page.url()).pathname, '/estoque/produtos')
    assert.equal(
      await page.getByRole('dialog').count(),
      0,
      'Other tables retain selection-only behavior',
    )
    assert.deepEqual(errors, [])
    console.log(
      'PASS: single click selects, double click opens clicked treatment with or without prior selection, interactive controls ignored, other tables unchanged.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
