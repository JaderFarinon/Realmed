const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    for (const [slug, endpoint] of [
      ['produtos', 'products'],
      ['setores', 'sectors'],
      ['categorias', 'categories'],
      ['apresentacoes', 'presentations'],
      ['fornecedores', 'suppliers'],
    ]) {
      const p = await browser.newPage()
      await prepare(p)
      let saved
      const records = [
        {
          id: 1,
          name: 'Ativo teste',
          code: '000001',
          active: 1,
          minimum_quantity: 0,
          category_id: 1,
          presentation_id: 1,
        },
        {
          id: 2,
          name: 'Inativo teste',
          code: '000002',
          active: 0,
          minimum_quantity: 0,
          category_id: 1,
          presentation_id: 1,
        },
      ]
      await p.route(`**/api/inventory/${endpoint}**`, (route) => {
        const req = route.request()
        if (req.method() === 'PUT') {
          saved = req.postDataJSON()
          return route.fulfill({ json: { ...saved, id: 1 } })
        }
        return route.fulfill({ json: records })
      })
      await p.goto('http://127.0.0.1:5186/estoque/' + slug)
      for (const active of [true, false]) {
        await p
          .locator('tbody tr[aria-selected]')
          .filter({ hasText: active ? 'Ativo teste' : 'Inativo teste' })
          .first()
          .click()
        await p.getByRole('button', { name: /Editar selecionado/ }).click()
        const dialog = p.getByRole('dialog')
        assert.equal(
          await dialog.getByRole('checkbox', { name: 'Ativo', exact: true }).isChecked(),
          active,
          slug,
        )
        await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
        await dialog.waitFor({ state: 'hidden' })
        assert.equal(saved.active, active, slug + ' must preserve active on save')
      }
      await p.close()
    }
    console.log(
      'PASS: numeric active/inactive loads and survives save in products, sectors, categories, presentations and suppliers',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
