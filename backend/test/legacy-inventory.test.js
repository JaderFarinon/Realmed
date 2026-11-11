const test = require('node:test'),
  assert = require('node:assert/strict')
const fixture = require('../test-support/legacyInventoryFixture.cjs')
const {
  planLegacyInventory,
  digest,
} = require('../services/legacyInventoryImport')
test('legacy plan preserves stock and history without replaying receipts or inventing actors/dates', () => {
  const snapshot = fixture(),
    plan = planLegacyInventory(snapshot)
  assert.equal(plan.summary.totalQuantity, 8)
  assert.equal(plan.invoices.length, 1)
  assert.equal(plan.invoiceItems.length, 1)
  assert.equal(plan.invoiceItems[0].attributes.unit_price, '10.00')
  assert.equal(
    plan.products.find((p) => p.key === '102').attributes.active,
    false,
  )
  assert.equal(
    plan.products.find((p) => p.key === '1').attributes.code,
    '000001',
  )
  const recovered = plan.requests.find((p) => p.key === '3813')
  assert.equal(recovered.attributes.request_date, null)
  assert.equal(recovered.attributes.requester_id, null)
  assert.equal(recovered.attributes.legacy_incomplete, true)
  assert.equal(
    plan.requests.find((p) => p.key === '1').attributes.legacy_requester_name,
    'usuario.legado',
  )
  assert.equal(
    plan.records.filter((p) => !p.synthetic).length,
    Object.values(snapshot.data).reduce((sum, rows) => sum + rows.length, 0),
  )
  assert.equal(digest(snapshot.data), snapshot.fingerprint)
})
test('import never silently rounds, clamps or drops invalid source quantities and relationships', () => {
  for (const value of [-1, 1.5, 2147483648]) {
    const s = fixture()
    s.data.estoque[0].quantidade = value
    s.fingerprint = digest(s.data)
    assert.throws(() => planLegacyInventory(s), /Quantidade inválida/)
  }
  const s = fixture()
  s.data.item_pedido[0].quantidade_atendida = 3
  s.fingerprint = digest(s.data)
  assert.throws(() => planLegacyInventory(s), /excede/)
})
test('source integrity, credentials and ambiguous legacy writeoffs block import', () => {
  let s = fixture()
  s.data.produto[0].nome_produto = 'Alterado'
  assert.throws(() => planLegacyInventory(s), /integridade/)
  s = fixture()
  s.data.usuario[0].senha = 'forbidden'
  s.fingerprint = digest(s.data)
  assert.throws(() => planLegacyInventory(s), /autenticação/)
  s = fixture()
  s.data.item_pedido[0].flag_baixa = 'S'
  s.fingerprint = digest(s.data)
  assert.throws(() => planLegacyInventory(s), /ambígua/)
})
