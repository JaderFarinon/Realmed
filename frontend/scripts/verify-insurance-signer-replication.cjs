const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const assert = require('node:assert/strict')
const { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage(),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await prepare(page)
    const providers = [
      { id: 1, name: 'Origem', external_source: 'STENCI', external_id: 'origin', active: 1 },
      { id: 2, name: 'Destino A', external_source: 'STENCI', external_id: 'target-a', active: 1 },
      { id: 3, name: 'Destino B', external_source: 'STENCI', external_id: 'target-b', active: 1 },
    ]
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2WQAAAAASUVORK5CYII=',
      'base64',
    )
    await page.route('**/api/insurance-providers', (r) => r.fulfill({ json: providers }))
    await page.route('**/api/integrations/stenci/insurances**', (r) =>
      r.fulfill({
        json: {
          items: providers.map((row) => ({
            id: row.external_id,
            externalId: row.external_id,
            name: row.name,
            type: 'insurance',
          })),
          hasMore: false,
        },
      }),
    )
    await page.route('**/api/insurance-providers/from-stenci', (r) => {
      const item = providers.find((p) => p.external_id === r.request().postDataJSON().external_id)
      assert.ok(item)
      return r.fulfill({ json: item })
    })
    await page.route('**/api/insurance-providers/*/signer**', (r) => {
      if (r.request().url().endsWith('/image'))
        return r.fulfill({ contentType: 'image/png', body: png })
      const id = Number(new URL(r.request().url()).pathname.match(/providers\/(\d+)/)[1])
      return r.fulfill({
        json:
          id === 1
            ? {
                id: 11,
                doctor_name: 'Dra. Fictícia',
                has_image: true,
                placement: {
                  templateKey: 'SADT_STANDARD_V1',
                  page: 1,
                  x: 40,
                  y: 550,
                  width: 140,
                  height: 40,
                },
              }
            : null,
      })
    })
    let payloads = []
    await page.route('**/api/insurance-providers/replicate-signer', async (r) => {
      const body = r.request().postDataJSON()
      payloads.push(body)
      await new Promise((resolve) => setTimeout(resolve, 250))
      await r.fulfill({
        json: {
          results: body.destination_ids.map((id, index) => ({
            insurance_provider_id: id,
            name: providers.find((p) => p.id === id).name,
            status: body.overwrite_existing || index ? 'copied' : 'preserved',
          })),
        },
      })
    })
    await page.goto(
      (process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5186') + '/cadastros/convenios',
    )
    await page
      .getByRole('button', { name: 'Replicar assinatura do médico entre convênios', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Convênio de origem', { exact: true }).selectOption({ label: 'Origem' })
    await dialog.getByAltText('Assinatura a copiar').waitFor()
    assert.ok((await dialog.innerText()).includes('Dra. Fictícia'))
    await dialog.getByRole('button', { name: 'Selecionar resultados', exact: true }).click()
    const overwrite = dialog.getByRole('checkbox', { name: /^Substituir assinaturas/ })
    assert.equal(await overwrite.isChecked(), false)
    await dialog.getByRole('button', { name: 'Replicar assinatura', exact: true }).click()
    await dialog.getByText('Replicação concluída.', { exact: true }).waitFor()
    assert.deepEqual(payloads[0], {
      source_id: 1,
      destination_ids: [2, 3],
      source_signer_id: 11,
      overwrite_existing: false,
    })
    assert.ok((await dialog.innerText()).includes('Assinatura existente preservada.'))
    await overwrite.check()
    await dialog.getByRole('button', { name: 'Replicar assinatura', exact: true }).click()
    await dialog.getByText('Replicação concluída.', { exact: true }).waitFor()
    assert.equal(payloads[1].overwrite_existing, true)
    await dialog
      .getByLabel('Convênio de origem', { exact: true })
      .selectOption({ label: 'Destino B' })
    await dialog
      .getByText('O convênio de origem não possui assinatura cadastrada.', { exact: true })
      .waitFor()
    assert.ok(
      await dialog.getByRole('button', { name: 'Replicar assinatura', exact: true }).isDisabled(),
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 2)
    await page.screenshot({
      path: '.deployment/insurance-signer-replication-mobile.png',
      fullPage: true,
    })
    assert.deepEqual(errors, [])
    console.log(
      'PASS: insurer action, origin and PNG preview, multiple destinations, source version, preserve/replace modes, empty origin, success and mobile.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
