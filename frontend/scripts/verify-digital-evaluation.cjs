const {
    chromium,
  } = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),
  assert = require('node:assert/strict')
const { prepare, records } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await prepare(page)
    let evaluation = null,
      payload
    await page.route('**/api/guide-processes/1/evaluation**', async (route) => {
      const p = new URL(route.request().url()).pathname,
        m = route.request().method()
      let data = evaluation
      if (p.endsWith('/options'))
        data = {
          professionals: [],
          patient: {
            cpf: '000.000.000-00',
            birth_date: '1990-01-01',
            gender: 'F',
            cellphone: '(41) 00000-0000',
          },
        }
      else if (m !== 'GET') {
        if (p.endsWith('/complete')) evaluation = { ...evaluation, status: 'COMPLETED' }
        else if (p.endsWith('/reopen')) evaluation = { ...evaluation, status: 'IN_PROGRESS' }
        else {
          payload = route.request().postDataJSON()
          evaluation = { ...payload, id: 1, status: 'IN_PROGRESS' }
        }
        data = evaluation
      }
      await route.fulfill({ json: data })
    })
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('http://127.0.0.1:5186/central-de-guias/tratamentos/1?evaluate=1', {
        waitUntil: 'domcontentloaded',
      })
      const panel = page.locator('#digital-evaluation')
      await panel
        .getByRole('heading', { name: '8. Responsável pela avaliação', exact: true })
        .waitFor()
      assert.equal(await panel.locator('h3').count(), 8)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
      await panel
        .getByLabel('Queixa principal / motivo do atendimento', { exact: true })
        .fill('Dor ao caminhar')
      await panel
        .getByLabel('Exame físico e achados relevantes', { exact: true })
        .fill('Exame fictício')
      await panel.getByLabel('Gravidade do quadro', { exact: true }).selectOption('MILD')
      await panel.getByLabel('Risco assistencial global', { exact: true }).selectOption('LOW')
      await panel.getByLabel('Objetivos terapêuticos', { exact: true }).fill('Melhorar mobilidade')
      await panel.getByLabel('Cinesioterapia', { exact: true }).check()
      await panel.getByLabel('Fisioterapeuta', { exact: true }).fill('Profissional fictício')
      await panel.getByLabel('CREFITO', { exact: true }).fill('000000 / PR')
      await panel.getByLabel('Joelho', { exact: true }).check()
      await panel.getByLabel('Lateralidade de Joelho', { exact: true }).selectOption('LEFT')
      await panel.getByLabel('Segunda', { exact: true }).check()
      await panel.getByLabel('Horário', { exact: true }).first().fill('08:30')
      const map = panel.getByRole('img', {
        name: 'Mapa corporal: toque para marcar dor, limitação ou atenção',
      })
      if (await map.locator('circle').count())
        await panel.getByRole('button', { name: 'Limpar mapa', exact: true }).click()
      await map.click({ position: { x: 50, y: 80 } })
      const undo = panel.getByRole('button', { name: 'Desfazer marcação', exact: true })
      const redo = panel.getByRole('button', { name: 'Refazer marcação', exact: true })
      assert.equal(await undo.getAttribute('title'), 'Desfazer marcação')
      assert.equal(await redo.getAttribute('title'), 'Refazer marcação')
      await undo.click()
      assert.equal(await map.locator('circle').count(), 0)
      await redo.click()
      assert.equal(await map.locator('circle').count(), 1)
      await panel.getByRole('button', { name: 'Atenção', exact: true }).click()
      await map.click({ position: { x: 80, y: 100 } })
      assert.equal(await map.locator('circle').last().getAttribute('fill'), '#d97706')
      await undo.click()
      await map.click({ position: { x: 90, y: 110 } })
      assert.ok(await redo.isDisabled(), 'A new mark must clear redo history')
      await panel.getByRole('button', { name: 'Limpar mapa', exact: true }).click()
      assert.equal(await map.locator('circle').count(), 0)
      await undo.click()
      assert.equal(await map.locator('circle').count(), 2)
      await redo.click()
      assert.equal(await map.locator('circle').count(), 0)
      await panel.getByRole('button', { name: 'Dor', exact: true }).click()
      await map.click({ position: { x: 50, y: 80 } })
      const markCount = await map.locator('circle').count()
      const mapBox = await map.boundingBox()
      await page.mouse.move(mapBox.x + 60, mapBox.y + 90)
      await page.mouse.down()
      await page.mouse.move(mapBox.x + 60, mapBox.y + 160, { steps: 6 })
      await page.mouse.up()
      assert.equal(
        await map.locator('circle').count(),
        markCount,
        'Dragging to scroll must not mark the body map',
      )
      const signature = panel.getByRole('img', { name: 'Área para assinatura ou rubrica' })
      await signature.scrollIntoViewIfNeeded()
      const box = await signature.boundingBox()
      await page.mouse.move(box.x + 20, box.y + 20)
      await page.mouse.down()
      await page.mouse.move(box.x + 100, box.y + 50, { steps: 8 })
      await page.mouse.up()
      const strokeCount = await signature.locator('polyline').count()
      await panel.getByRole('button', { name: 'Desfazer traço', exact: true }).click()
      assert.equal(await signature.locator('polyline').count(), strokeCount - 1)
      await panel.getByRole('button', { name: 'Refazer traço', exact: true }).click()
      assert.equal(await signature.locator('polyline').count(), strokeCount)
      await panel.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
      await panel.getByText('Rascunho salvo com sucesso.', { exact: true }).first().waitFor()
      assert.equal(payload.regions[0].laterality, 'LEFT')
      assert.ok(payload.body_marks.length)
      assert.ok(payload.signature_strokes.length)
      assert.equal(payload.treatment_days[0].time, '08:30')
      await panel.screenshot({ path: `.deployment/evaluation-tablet-${viewport.width}.png` })
    }
    const panel = page.locator('#digital-evaluation')
    await panel.getByRole('button', { name: 'Concluir avaliação', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar e concluir' }).click()
    await page.locator('#treatment-tab-evaluation').click()
    await panel.getByRole('button', { name: 'Reabrir avaliação', exact: true }).waitFor()
    assert.equal(
      await panel
        .getByLabel('Queixa principal / motivo do atendimento', { exact: true })
        .isDisabled(),
      true,
    )
    page.on('dialog', (d) => d.accept())
    await panel.getByRole('button', { name: 'Reabrir avaliação', exact: true }).click()
    await panel.getByRole('button', { name: 'Salvar rascunho', exact: true }).waitFor()
    evaluation = {
      id: 1,
      status: 'IN_PROGRESS',
      regions: null,
      body_marks: null,
      signature_strokes: null,
      medical_diagnosis: null,
      responsible_name: null,
    }
    await page.route('**/api/guide-processes/1', (r) =>
      r.fulfill({
        json: {
          ...records[0],
          patient_id: 1,
          medical_diagnosis: 'Hipótese existente',
          documents: [],
          authorizations: [],
          procedures: [],
          pendingItems: [],
          history: [],
        },
      }),
    )
    await page.goto('http://127.0.0.1:5186/central-de-guias/tratamentos/1?evaluate=1', {
      waitUntil: 'domcontentloaded',
    })
    await panel.getByLabel('Diagnóstico médico / hipótese', { exact: true }).waitFor()
    assert.equal(
      await panel.getByLabel('Diagnóstico médico / hipótese', { exact: true }).inputValue(),
      'Hipótese existente',
    )
    assert.equal(
      await panel.getByLabel('Fisioterapeuta', { exact: true }).inputValue(),
      '', // Executor do tratamento não identifica automaticamente o avaliador.
    )
    await page.route('**/api/guide-processes/1/evaluation/complete', (route) =>
      route.fulfill({
        status: 422,
        json: {
          error: 'Complete a avaliação antes de concluir: queixa principal, exame físico.',
          missing: ['queixa principal', 'exame físico'],
        },
      }),
    )
    await panel.getByLabel('Outro', { exact: true }).first().check()
    await panel.getByLabel('Segunda', { exact: true }).check()
    await panel.getByLabel('Horário', { exact: true }).first().fill('')
    await panel.getByRole('button', { name: 'Concluir avaliação', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar e concluir', exact: true }).click()
    const summary = panel.locator('.validation-summary')
    await summary.waitFor()
    assert.ok((await summary.locator('ol > li').count()) >= 7)
    assert.ok((await summary.innerText()).includes('Item 3 — Queixa principal'))
    const complaint = panel.getByLabel('Queixa principal / motivo do atendimento', { exact: true })
    assert.equal(await complaint.getAttribute('aria-invalid'), 'true')
    assert.equal(
      await complaint.evaluate((el) => getComputedStyle(el).borderTopColor),
      'rgb(217, 45, 32)',
    )
    assert.equal(
      await panel.getByLabel('Outra região', { exact: true }).getAttribute('aria-invalid'),
      'true',
    )
    assert.equal(
      await panel.getByLabel('Horário', { exact: true }).first().getAttribute('aria-invalid'),
      'true',
    )
    assert.equal(
      await panel.locator('[data-validation-key="conducts"]').getAttribute('aria-invalid'),
      'true',
    )
    await summary.getByRole('button', { name: /Item 3 — Queixa principal/ }).click()
    assert.ok(await complaint.evaluate((el) => el === document.activeElement))
    await complaint.fill('Queixa fictícia corrigida')
    assert.equal(await complaint.getAttribute('aria-invalid'), 'false')
    assert.equal(
      await summary.getByRole('button', { name: /Item 3 — Queixa principal/ }).count(),
      0,
    )
    await panel.screenshot({ path: '.deployment/evaluation-missing-fields.png' })
    await panel.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
    await panel.getByText('Rascunho salvo com sucesso.', { exact: true }).first().waitFor()
    assert.equal(await summary.count(), 0)
    await page.goto('http://127.0.0.1:5186/central-de-guias/novo', {
      waitUntil: 'domcontentloaded',
    })
    await page.getByLabel('Data da avaliação', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Data prevista de início', { exact: true }).count(), 0)
    assert.equal(await page.getByLabel('Quantidade de sessões', { exact: true }).count(), 0)
    assert.equal(await page.locator('input[type="time"]').count(), 0)
    assert.deepEqual(errors, [])
    console.log(
      'PASS tablet portrait/landscape/mobile: all 8 sections, no page overflow, touch marks and signature, save roundtrip, confirmation, read-only completion and reopen.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
