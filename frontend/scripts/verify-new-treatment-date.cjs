const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ locale: 'pt-BR' })
    await prepare(page)
    await page.goto(
      (process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186') + '/central-de-guias/novo',
    )
    const field = page.getByLabel('Data da avaliação', { exact: true })
    assert.equal(await field.getAttribute('required'), null)
    await field.pressSequentially('27102026')
    assert.equal(await field.inputValue(), '27/10/2026')
    await field.blur()
    assert.equal(await field.inputValue(), '27/10/2026')
    await field.fill('31022026')
    await field.blur()
    assert.equal(await field.inputValue(), '')
    await field.fill('')
    assert.equal(await field.inputValue(), '')
    console.log(
      'PASS: assessment date accepts masked typing, rejects invalid dates and remains optional',
    )
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
