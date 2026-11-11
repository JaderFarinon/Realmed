const assert = require('node:assert/strict'),
  {
    chromium,
  } = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),
  { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const p = await browser.newPage()
    await prepare(p)
    let balance = 5,
      withdrawals = [],
      orders = [],
      withdrawalAttempts = 0,
      firstKey,
      edits = 0
    const products = [
      { id: 1, code: '000001', name: 'Produto Um', balance: 5, minimum_quantity: 5 },
      { id: 2, code: '000002', name: 'Produto Dois', balance: 0, minimum_quantity: 2 },
      { id: 3, code: '000003', name: 'Produto Três', balance: 12, minimum_quantity: 1 },
    ]
    await p.route('**/api/inventory/consumptions-options**', (r) =>
      r.fulfill({ json: { sector_id: 1, sectors: [{ id: 1, name: 'Geral' }], products } }),
    )
    await p.route('**/api/inventory/purchase-orders-options**', (r) =>
      r.fulfill({ json: { sector_id: 1, sectors: [{ id: 1, name: 'Geral' }], products } }),
    )
    await p.route('**/api/inventory/consumptions', (r) => {
      if (r.request().method() === 'GET') return r.fulfill({ json: withdrawals })
      const body = r.request().postDataJSON()
      withdrawalAttempts++
      assert.equal(body.items.length, 1)
      if (withdrawalAttempts === 1) {
        firstKey = body.request_key
        return r.fulfill({ status: 409, json: { error: 'Saldo insuficiente para esta retirada.' } })
      }
      assert.equal(body.request_key, firstKey)
      assert.equal(body.items[0].quantity, 2)
      balance -= 2
      const row = {
        id: 1,
        sector_id: 1,
        created_at: '2026-10-19T12:00:00',
        sector_name: 'Geral',
        requester_name: 'Usuário logado',
        items: [{ id: 1, product_id: 1, code: '000001', product_name: 'Produto Um', quantity: 2 }],
      }
      withdrawals = [row]
      return r.fulfill({ status: 201, json: row })
    })
    await p.route('**/api/inventory/consumptions/1', (r) => r.fulfill({ json: withdrawals[0] }))
    await p.route('**/api/inventory/purchase-orders', (r) => {
      assert.equal(r.request().method(), 'GET')
      return r.fulfill({ json: orders })
    })
    await p.route('**/api/inventory/purchase-orders/automatic', (r) => {
      const body = r.request().postDataJSON()
      assert.equal(body.sector_id, 1)
      assert.ok(body.request_key)
      orders = [
        {
          id: 2,
          sector_id: 1,
          created_at: '2026-10-19T12:00:00',
          sector_name: 'Geral',
          requester_name: 'Comprador',
          source: 'MINIMUM',
          status: 'DRAFT',
          revision: 0,
          notes: '',
          items: [
            {
              id: 1,
              product_id: 1,
              code: '000001',
              product_name: 'Produto Um',
              quantity: 2,
              balance_snapshot: 3,
              minimum_snapshot: 5,
            },
            {
              id: 2,
              product_id: 2,
              code: '000002',
              product_name: 'Produto Dois',
              quantity: 2,
              balance_snapshot: 0,
              minimum_snapshot: 2,
            },
          ],
        },
      ]
      return r.fulfill({ status: 201, json: orders[0] })
    })
    await p.route('**/api/inventory/purchase-orders/2', (r) => {
      if (r.request().method() === 'PUT') {
        const body = r.request().postDataJSON()
        assert.equal(body.revision, 0)
        assert.deepEqual(body.items, [
          { product_id: 1, quantity: 7 },
          { product_id: 3, quantity: 4 },
        ])
        assert.equal(body.notes, 'Revisado por compras')
        edits++
        orders[0] = {
          ...orders[0],
          ...body,
          revision: 1,
          items: body.items.map((i) => ({
            ...i,
            id: i.product_id,
            product_name: products.find((p) => p.id === i.product_id).name,
            code: '00000' + i.product_id,
          })),
        }
      }
      return r.fulfill({ json: orders[0] })
    })
    await p.goto('http://127.0.0.1:5186/estoque/requisicoes')
    await p.getByRole('button', { name: 'Nova requisição para consumo', exact: true }).click()
    let d = p.getByRole('dialog')
    await d.getByPlaceholder('Digite o nome ou código do material').fill('Produto Um')
    await d.getByRole('option').filter({ hasText: 'Produto Um' }).click()
    await d.getByLabel('Quantidade', { exact: true }).fill('3')
    await d.getByRole('button', { name: 'Adicionar à lista', exact: true }).click()
    await d
      .getByRole('button', { name: 'Registrar retirada e baixar estoque', exact: true })
      .click()
    await d.getByRole('alert').filter({ hasText: 'Saldo insuficiente' }).waitFor()
    assert.equal(await d.locator('tbody tr[aria-selected]').count(), 1)
    await d.getByLabel('Quantidade de Produto Um', { exact: true }).fill('2')
    await d
      .getByRole('button', { name: 'Registrar retirada e baixar estoque', exact: true })
      .click()
    await p.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(balance, 3)
    assert.equal(withdrawals.length, 1)
    await p.locator('tbody tr[aria-selected]').first().click()
    await p.getByRole('button', { name: 'Abrir selecionado', exact: true }).click()
    await p.getByRole('dialog').getByText('Produto Um', { exact: true }).waitFor()
    assert.equal(
      await p
        .getByRole('dialog')
        .getByRole('button', { name: 'Registrar retirada e baixar estoque', exact: true })
        .count(),
      0,
    )
    await p.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
    await p.goto('http://127.0.0.1:5186/estoque/pedidos')
    await p
      .getByRole('button', { name: 'Gerar pedido automático pelo estoque mínimo', exact: true })
      .click()
    d = p.getByRole('dialog')
    await d.getByRole('button', { name: 'Gerar rascunho para revisão', exact: true }).click()
    await d.getByLabel('Quantidade de Produto Um', { exact: true }).waitFor()
    await d.getByLabel('Quantidade de Produto Um', { exact: true }).fill('7')
    await p.waitForTimeout(350)
    await d
      .locator('tbody tr[aria-selected]')
      .filter({ hasText: 'Produto Dois' })
      .locator('td')
      .nth(1)
      .click()
    await d.getByRole('button', { name: 'Remover item selecionado', exact: true }).click()
    await d.getByPlaceholder('Digite o nome ou código do material').fill('000003')
    await d.getByRole('option').filter({ hasText: 'Produto Três' }).click()
    await d.getByLabel('Quantidade', { exact: true }).fill('4')
    await d.getByRole('button', { name: 'Adicionar à lista', exact: true }).click()
    await d.getByLabel('Observações', { exact: true }).fill('Revisado por compras')
    for (const width of [1366, 390]) {
      await p.setViewportSize({ width, height: 900 })
      await p.waitForTimeout(250)
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
      await p.screenshot({ path: '.deployment/stock-purchase-review-' + width + '.png' })
    }
    await d.getByRole('button', { name: 'Salvar pedido de compra', exact: true }).click()
    await p.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(edits, 1)
    assert.equal(balance, 3)
    console.log(
      'PASS UI consumption with insufficient stock retry, no duplicate, read-only record, automatic draft opens for review, edit/remove/add products, no purchase deduction and responsive modal.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
