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
    let current = null,
      saved
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2WQAAAAASUVORK5CYII=',
      'base64',
    )
    await p.route('**/api/insurance-providers/*/signer**', (route) => {
      if (route.request().method() === 'POST') {
        saved = route.request().headers()
        current = {
          doctor_name: decodeURIComponent(saved['x-doctor-name']),
          has_image: true,
          placement: JSON.parse(decodeURIComponent(saved['x-signature-placement'])),
        }
        return route.fulfill({ status: 201, json: { id: 1 } })
      }
      if (route.request().url().endsWith('/image'))
        return route.fulfill({ contentType: 'image/png', body: png })
      return route.fulfill({ json: current })
    })
    await p.goto((process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186')+'/cadastros/convenios')
    await p.locator('tbody tr[aria-selected]').first().click()
    await p.getByRole('button', { name: 'Médico assinante do convênio', exact: true }).click()
    const d = p.getByRole('dialog')
    await d.getByLabel('Nome do médico', { exact: true }).fill('Dra. Teste')
    await d
      .locator('input[type=file]')
      .setInputFiles({ name: 'assinatura.png', mimeType: 'image/png', buffer: png })
    await d.getByAltText('Prévia da assinatura do médico').waitFor()
    await d
      .getByRole('checkbox', { name: 'Aplicar assinatura nas guias SADT padrão deste convênio' })
      .check()
    const overlay = d.getByRole('button', { name: 'Mover assinatura na guia', exact: true })
    await overlay.scrollIntoViewIfNeeded()
    const box = await overlay.boundingBox()
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await p.mouse.down()
    await p.mouse.move(box.x + box.width / 2 - 45, box.y + box.height / 2 - 65, { steps: 6 })
    await p.mouse.up()
    const handle = d.getByRole('button', { name: 'Redimensionar assinatura', exact: true })
    const corner = await handle.boundingBox()
    await p.mouse.move(corner.x + 14, corner.y + 14)
    await p.mouse.down()
    await p.mouse.move(corner.x + 45, corner.y + 14, { steps: 5 })
    await p.mouse.up()
    await p.screenshot({ path: '.deployment/insurance-signer-placement.png', fullPage: true })
    await d.getByRole('button', { name: 'Salvar', exact: true }).click()
    await d.waitFor({ state: 'hidden' })
    assert.equal(decodeURIComponent(saved['x-doctor-name']), 'Dra. Teste')
    const position = JSON.parse(decodeURIComponent(saved['x-signature-placement']))
    assert.ok(position.x < 620 && position.y < 530 && position.width > 140)

    await p.getByRole('button', { name: 'Médico assinante do convênio', exact: true }).click()
    await d.getByAltText('Prévia da assinatura do médico').waitFor()
    assert.equal(await d.getByLabel('Nome do médico', { exact: true }).inputValue(), 'Dra. Teste')
    assert.equal(
      await d
        .getByRole('checkbox', { name: 'Aplicar assinatura nas guias SADT padrão deste convênio' })
        .isChecked(),
      true,
    )
    await p.setViewportSize({ width: 390, height: 844 })
    await p.waitForTimeout(350)
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    console.log(
      'PASS: selected insurer signer dialog, PNG preview/save, reload name/image and mobile layout',
    )
  } finally {
    await b.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
