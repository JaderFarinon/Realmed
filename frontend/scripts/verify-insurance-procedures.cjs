const assert = require('node:assert/strict'),
  {
    chromium,
  } = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const b = await chromium.launch()
  try {
    const p = await b.newPage()
    const errors = []
    p.on('pageerror', (e) => errors.push(e.message))
    await prepare(p)
    let rows = [],
      saved = 0,
      bound = 0
    await p.route('**/api/insurance-providers', (r) =>
      r.fulfill({
        json: [
          {
            id: 1,
            name: 'Convênio A',
            external_source: 'STENCI',
            external_id: 'a',
            active: 1,
            authorization_type: 'PRE_AUTHORIZATION',
          },
        ],
      }),
    )
    await p.route('**/api/integrations/stenci/insurances', (r) =>
      r.fulfill({
        json: {
          items: [
            { externalId: 'a', name: 'Convênio A' },
            { externalId: 'b', name: 'Convênio B' },
          ],
        },
      }),
    )
    await p.route('**/api/insurance-providers/from-stenci', (r) => {
      assert.equal(r.request().postDataJSON().external_id, 'b')
      bound++
      return r.fulfill({
        json: { id: 2, name: 'Convênio B', external_id: 'b', external_source: 'STENCI', active: 1 },
      })
    })
    await p.route('**/api/insurance-providers/2/procedures**', (r) => {
      if (r.request().method() !== 'GET') {
        const data = r.request().postDataJSON()
        assert.equal(data.code, '1567')
        assert.deepEqual(data.replaces, ['1234'])
        saved++
        rows = [{ ...data, id: 1, procedure_id: 1 }]
      }
      return r.fulfill({ json: r.request().method() === 'GET' ? rows : rows[0] })
    })
    await p.goto('http://127.0.0.1:5186/cadastros/convenios')
    await p.getByText('Convênio B', { exact: true }).waitFor()
    assert.equal(await p.getByRole('link', { name: 'Procedimentos', exact: true }).count(), 0)
    const open = p.getByRole('button', {
      name: 'Procedimentos do convênio selecionado',
      exact: true,
    })
    assert.equal(await open.isDisabled(), true)
    await p.getByText('Convênio B', { exact: true }).click()
    await open.click()
    let d = p.getByRole('dialog')
    await d.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click()
    let form = p.getByRole('dialog').last()
    await form.getByLabel('Código do procedimento', { exact: true }).fill('1567')
    await form.getByLabel('Descrição do procedimento', { exact: true }).fill('Fisioterapia B')
    await form.getByLabel('Códigos que este procedimento substitui', { exact: true }).fill('1234')
    await form.getByRole('button', { name: 'Salvar procedimento e substituições' }).click()
    await p.getByRole('dialog').getByText('1567', { exact: true }).waitFor()
    assert.equal(saved, 1)
    assert.equal(bound, 1)
    for (const v of [
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await p.setViewportSize(v)
      await p.getByRole('dialog').locator('tbody tr[aria-selected]').first().click()
      await p
        .getByRole('dialog')
        .getByRole('button', { name: 'Editar procedimento selecionado' })
        .click()
      form = p.getByRole('dialog').last()
      assert.equal(
        await form
          .getByLabel('Códigos que este procedimento substitui', { exact: true })
          .inputValue(),
        '1234',
      )
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
      await p.screenshot({ path: '.deployment/insurance-procedures-' + v.width + '.png' })
      await form.getByRole('button', { name: 'Cancelar', exact: true }).click()
      await p.getByRole('dialog').locator('tbody tr[aria-selected]').first().click()
    }
    await p.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click()
    rows.push({ ...rows[0], id: 2, procedure_id: 2, code: '7654', description: 'Outro procedimento', replaces: [] })
    let replicated = 0
    await p.route('**/api/insurance-providers/replicate-procedures', (r) => {
      assert.deepEqual(r.request().postDataJSON(), {
        source_id: 2,
        destination_ids: [1],
        procedure_ids: [1],
      })
      replicated++
      return r.fulfill(
        replicated === 1
          ? {
              status: 422,
              json: { error: 'Conflito no convênio A. Nenhum procedimento foi replicado.' },
            }
          : {
              json: {
                source_id: 2,
                results: [{ insurance_provider_id: 1, name: 'Convênio A', copied: 1, skipped: 0 }],
              },
            },
      )
    })
    await p
      .getByRole('button', { name: 'Replicar procedimentos entre convênios', exact: true })
      .click()
    const replica = p.getByRole('dialog')
    await replica.getByLabel('Convênio de origem').selectOption('stenci:b')
    await replica
      .getByRole('checkbox', { name: 'Selecionar todos os procedimentos', exact: true })
      .waitFor()
    assert.equal(
      await replica
        .getByRole('button', { name: 'Replicar procedimentos', exact: true })
        .isDisabled(),
      true,
    )
    await replica
      .getByRole('checkbox', { name: 'Selecionar todos os procedimentos', exact: true })
      .check()
    assert.equal(
      await replica
        .getByRole('checkbox', { name: '1567 — Fisioterapia B', exact: true })
        .isChecked(),
      true,
    )
    assert.equal(await replica.getByRole('checkbox', { name: '7654 — Outro procedimento', exact: true }).isChecked(), true)
    await replica
      .getByRole('checkbox', { name: 'Selecionar todos os procedimentos', exact: true })
      .uncheck()
    await replica.getByRole('checkbox', { name: '1567 — Fisioterapia B', exact: true }).check()
    assert.equal(await replica.getByRole('checkbox', { name: '7654 — Outro procedimento', exact: true }).isChecked(), false)
    assert.equal(
      await replica.getByRole('checkbox', { name: 'Convênio B', exact: true }).count(),
      0,
    )
    await replica.getByRole('checkbox', { name: 'Convênio A', exact: true }).check()
    for (const width of [1366, 390]) {
      await p.setViewportSize({ width, height: 844 })
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
      await p.screenshot({ path: '.deployment/replication-' + width + '.png' })
    }
    await replica.getByRole('button', { name: 'Replicar procedimentos', exact: true }).click()
    await replica.getByRole('alert').filter({ hasText: 'Conflito' }).waitFor()
    assert.equal(
      await replica.getByRole('checkbox', { name: 'Convênio A', exact: true }).isChecked(),
      true,
    )
    await replica.getByRole('button', { name: 'Replicar procedimentos', exact: true }).click()
    await replica.getByText('Replicação concluída.', { exact: true }).waitFor()
    assert.equal(replicated, 2)
    assert.equal(
      await replica
        .getByRole('button', { name: 'Replicar procedimentos', exact: true })
        .isDisabled(),
      true,
    )
    await replica.getByRole('button', { name: 'Fechar', exact: true }).last().click()
    assert.deepEqual(errors, [])
    console.log(
      'PASS insurer catalog uses Stenci, binds stable ID, procedures inside insurer, combined 1567 replaces 1234 creation/edit and desktop/mobile.',
    )
  } finally {
    await b.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
