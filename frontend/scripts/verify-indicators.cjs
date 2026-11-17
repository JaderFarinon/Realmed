const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  { randomUUID } = require('node:crypto')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs'),
  { summarize, areas, definitions } = require('../../backend/services/indicators')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5198',
  out = path.resolve(__dirname, '../../.deployment/indicators-qa')
fs.mkdirSync(out, { recursive: true })
const fixtures = {
  patients: [
    {
      id: 1,
      external_source: 'STENCI',
      external_id: 'p1',
      gender: 'female',
      birth_date: '1980-01-01',
      city: 'Curitiba',
      neighborhood: 'Centro',
      state: 'PR',
    },
    {
      id: 2,
      external_source: 'STENCI',
      external_id: 'p2',
      gender: 'male',
      birth_date: '1990-01-01',
    },
  ],
  appointments: Array.from({ length: 45 }, (_, i) => ({
    external_id: 'a' + i,
    patient_external_id: 'p' + ((i % 2) + 1),
    service_date: '2026-11-' + String((i % 10) + 1).padStart(2, '0'),
    start_at: '2026-11-01T12:00:00Z',
    status: i % 4 ? 'finished' : 'missed',
    is_physiotherapy: 1,
    schedule_id: 's',
    schedule_name: 'Fisio',
    insurance_name: 'Convênio de teste',
  })),
  coverage: [
    { service_date: '2026-11-01', status: 'COMPLETE', last_success_at: '2026-11-12T12:00:00Z' },
  ],
  treatments: [
    {
      id: 1,
      patient_id: 1,
      created_date: '2026-11-01',
      stage: 'preparation',
      document_status: 'INCOMPLETE',
      insurance_name: 'Convênio de teste',
    },
  ],
  billing: [{ guide_process_id: 1, status: 'PENDING' }],
  procedures: [{ guide_process_id: 1, type: 'PHYSIOTHERAPY', quantity: 10 }],
}
;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await prepare(page)
    let saved = [],
      snapshots = new Map(),
      gets = 0
    await page.route('**/api/indicators/**', async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        p = url.pathname,
        method = req.method()
      let data
      if (method === 'GET') gets++
      if (p.endsWith('/catalog')) data = { areas, definitions }
      else if (p.endsWith('/dashboard'))
        data = summarize(fixtures, Object.fromEntries(url.searchParams))
      else if (p.endsWith('/snapshots')) {
        const b = req.postDataJSON(),
          def = definitions.find((d) => d.key === b.indicatorKey),
          metric = summarize(fixtures, { ...b.filters, area: def.area }).metrics.find(
            (m) => m.key === def.key,
          ),
          id = randomUUID()
        snapshots.set(id, metric)
        return route.fulfill({ status: 201, json: { id, metric } })
      } else if (p.endsWith('/presentations') && method === 'POST') {
        const b = req.postDataJSON()
        data = {
          ...b,
          id: 1,
          revision: 1,
          slides: b.slides.map((s) => ({
            ...s,
            before: snapshots.get(s.beforeId),
            now: snapshots.get(s.nowId),
          })),
          updated_at: new Date().toISOString(),
        }
        saved = [structuredClone(data)]
        return route.fulfill({ status: 201, json: data })
      } else if (p.endsWith('/presentations/1') && method === 'PUT') {
        const b = req.postDataJSON()
        data = { ...b, id: 1, revision: b.revision + 1, updated_at: new Date().toISOString() }
        saved = [structuredClone(data)]
      } else if (p.endsWith('/presentations/1')) data = saved[0]
      else if (p.endsWith('/presentations'))
        data = {
          items: saved.map((s) => ({ ...s, slide_count: s.slides.length })),
          total: saved.length,
        }
      else throw new Error('Unexpected indicator request ' + method + ' ' + p)
      await route.fulfill({ json: data })
    })
    await page.goto(origin + '/indicadores/paineis')
    await page.getByRole('heading', { name: 'Pacientes por sexo', exact: true }).waitFor()
    assert.equal(await page.locator('.indicator-controls details').getAttribute('open'), null)
    for (const area of areas) {
      await page.getByRole('tab', { name: area.label, exact: true }).click()
      await page
        .getByRole('heading', {
          name: definitions.find((d) => d.area === area.key).label,
          exact: true,
        })
        .waitFor()
    }
    await page.getByRole('tab', { name: 'Perfil epidemiológico', exact: true }).click()
    await page.getByRole('heading', { name: 'Pacientes por sexo', exact: true }).waitFor()
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.screenshot({ path: path.join(out, 'panels-' + width + '.png'), fullPage: true })
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No page overflow ' + width,
      )
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.getByRole('link', { name: 'Analisar este indicador', exact: true }).first().click()
    await page.getByLabel('De onde eu vim *', { exact: true }).waitFor()
    await page
      .getByLabel('Título da apresentação', { exact: true })
      .fill('Análise crítica de teste')
    await page.getByRole('button', { name: 'Apresentar', exact: true }).click()
    await page.getByText(/Preencha a interpretação de Antes/).waitFor()
    const fill = async () => {
      await page
        .getByLabel('De onde eu vim *', { exact: true })
        .fill('O cenário inicial está descrito no gráfico.')
      await page
        .getByLabel('Como cheguei a este resultado *', { exact: true })
        .fill('Revisamos o cadastro e conferimos a cobertura.')
      await page
        .getByLabel('Para onde estou indo *', { exact: true })
        .fill('Melhorar a completude dos dados.')
      await page
        .getByLabel('O que fazer para seguir *', { exact: true })
        .fill('Conferir os registros incompletos na recepção.')
      await page.getByLabel('Meta', { exact: true }).fill('Reduzir campos não informados.')
      await page.getByLabel('Responsável', { exact: true }).fill('Equipe de teste')
      await page.getByLabel('Prazo', { exact: true }).fill('2026-12-01')
    }
    await fill()
    await page.locator('.analysis-periods summary').click()
    await page
      .getByRole('group', { name: 'Antes', exact: true })
      .getByLabel('De', { exact: true })
      .fill('2026-10-05')
    await page.getByRole('button', { name: 'Aplicar e atualizar comparação', exact: true }).click()
    await page
      .getByText('Comparação atualizada. Salve a apresentação para preservar estes resultados.', {
        exact: true,
      })
      .waitFor()
    await page.getByRole('tab', { name: 'Recepção', exact: true }).click()
    await page.getByRole('button', { name: 'Comparecimento e faltas', exact: true }).click()
    await page.waitForFunction(
      () => document.querySelector('.analysis-outline ol')?.children.length === 2,
    )
    await fill()
    await page.getByRole('button', { name: 'Mover tela para cima', exact: true }).click()
    assert.ok(
      (await page.locator('.analysis-outline ol li').first().innerText()).includes(
        'Comparecimento',
      ),
    )
    await page.getByRole('button', { name: 'Salvar apresentação', exact: true }).click()
    await page.getByText('Apresentação salva.', { exact: true }).waitFor()
    assert.equal(saved[0].slides.length, 2)
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.screenshot({ path: path.join(out, 'analysis-' + width + '.png'), fullPage: true })
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'Analysis overflow ' + width,
      )
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.getByRole('button', { name: 'Apresentar', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('heading', { name: 'Comparecimento e faltas', exact: true })
      .first()
      .waitFor()
    await page.getByRole('button', { name: 'Próxima tela', exact: true }).click()
    await page.screenshot({ path: path.join(out, 'presentation.png'), fullPage: true })
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click()
    await page.evaluate(() => {
      window.print = () => {
        window.printCheck = {
          slides: document.querySelectorAll('.indicator-print-document .analysis-slide').length,
          printClass: document.body.classList.contains('printing-indicators'),
        }
      }
    })
    await page.getByRole('button', { name: 'Imprimir / PDF', exact: true }).click()
    assert.deepEqual(await page.evaluate(() => window.printCheck), { slides: 2, printClass: true })
    await page.getByRole('button', { name: 'Nova apresentação', exact: true }).click()
    await page.getByText('Selecione um indicador acima para começar.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Abrir apresentações', exact: true }).click()
    await page.getByRole('dialog').getByText('Análise crítica de teste', { exact: true }).click()
    await page.getByRole('button', { name: 'Abrir apresentação', exact: true }).click()
    await page.getByLabel('De onde eu vim *', { exact: true }).waitFor()
    assert.equal(
      await page.getByLabel('Título da apresentação', { exact: true }).inputValue(),
      'Análise crítica de teste',
    )
    const settled = gets
    await page.waitForTimeout(1200)
    assert.equal(gets, settled, 'No repeat reload loop')
    assert.deepEqual(errors, [])
    console.log(
      'PASS Indicators UI: four areas, responsive charts, persisted comparison/editor, required critical narrative, multiple slides/reorder, save/reopen, slideshow, print document, no reload loop.',
    )
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
