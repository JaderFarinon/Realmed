const assert = require('node:assert/strict')
const {
  chromium,
} = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { prepare } = require('./verify-screen-pattern.cjs')
;(async () => {
  const browser = await chromium.launch()
  try {
    const p = await browser.newPage()
    await prepare(p)
    const errors = []
    p.on('pageerror', (e) => errors.push(e.message))
    const dashboardQueries = []
    let queueRequests = 0
    await p.route('**/api/billing/collection/queue', (r) => {
      assert.equal(r.request().method(), 'POST')
      queueRequests++
      return r.fulfill({ status: 202, json: { queued: true } })
    })
    await p.route('**/api/billing/dashboard**', (r) => {
      dashboardQueries.push(Object.fromEntries(new URL(r.request().url()).searchParams))
      return r.fulfill({
        json: {
          filterOptions: {
            schedules: [
              { id: 'a'.repeat(24), name: 'Agenda Matriz' },
              { id: 'b'.repeat(24), name: 'Agenda Hauer' },
            ],
            places: [
              { id: 'place-a', name: 'Matriz' },
              { id: 'place-b', name: 'Hauer' },
            ],
            statuses: ['scheduled', 'finished', 'missed'],
            metadataPending: false,
          },
          totals: { inTreatment: 2, completed: 1, evaluated: 1 },
          generatedAt: new Date().toISOString(),
          collection: { configured: true, enabled: true, running: false },
          agenda: {
            totals: {
              appointments: 205,
              patients: 2,
              evaluations: 1,
              sessions: 2,
              evaluatedWithSessions: 1,
              finished: 1,
              missed: 1,
              evolutionPending: 1,
            },
            coverage: {
              days: 20,
              collectedDays: 20,
              currentDays: 20,
              pendingDays: 0,
              failedDays: 0,
              complete: true,
              lastSuccessAt: new Date().toISOString(),
            },
            daily: Array.from({ length: 20 }, (_, i) => ({
              label: `2026-10-${String(i + 1).padStart(2, '0')}`,
              value: [5, 8, 12, 6, 0, 0, 8, 16, 12, 24][i % 10],
            })),
            statuses: [
              { label: 'finished', value: 80 },
              { label: 'scheduled', value: 113 },
              { label: 'missed', value: 12 },
            ],
            insurers: [
              { label: 'Convênio A', value: 82 },
              { label: 'Convênio B', value: 63 },
              { label: 'Convênio C', value: 31 },
              { label: 'Outros', value: 29 },
            ],
            alerts: [
              ...Array.from({length: 104}, (_, i) => ({id: `extra-${i}`, patient_name: `Teste paginação ${i}`, date: '2026-10-19', schedule_name: 'Agenda teste', reason: 'Conferir'})),
              {
                id: 'alert1',
                patient_name: 'Paciente consolidado',
                date: '2026-10-19',
                schedule_name: 'Agenda teste',
                reason: 'Evolução pendente — regra temporária',
              },
            ],
          },
          aging: [
            { label: 'Até 7 dias', value: 116 },
            { label: '8 a 15 dias', value: 28 },
            { label: '16 a 30 dias', value: 18 },
            { label: '31 a 60 dias', value: 18 },
            { label: 'Acima de 60 dias', value: 44 },
          ],
          insurers: [
            { label: 'Convênio A', value: 82 },
            { label: 'Convênio B', value: 81 },
            { label: 'Convênio C', value: 61 },
          ],
          months: Array.from({ length: 10 }, (_, i) => ({
            label: `2026-${String(i + 1).padStart(2, '0')}`,
            value: [1, 1, 2, 6, 8, 8, 22, 16, 50, 116][i],
          })),
          alerts: [
            {
              id: 1,
              patient_name: 'Paciente para conferir',
              insurance_name: 'Convênio',
              created_date: '2026-10-19',
              age: 0,
              reasons: 'Documentação incompleta',
            },
          ],
        },
      })
    })
    await p.route('**/api/billing/stenci**', (r) => {
      const q = new URL(r.request().url()).searchParams,
        kind = q.get('kind')
      let data = { items: [], fetchedAt: new Date().toISOString(), hasMore: false }
      if (kind === 'schedules') data.items = [{ id: 'a'.repeat(32), name: 'Agenda teste' }]
      if (kind === 'calendar')
        Object.assign(data, {
          date: q.get('date'),
          items: [
            {
              id: 'a',
              patient_name: 'Paciente da agenda',
              startDate: '2026-10-19T12:00:00Z',
              status: 'finished',
              evolution_status: 'PENDING_POLICY',
              expenses: [{ name: 'Fisioterapia', accountId: 'b'.repeat(24) }],
            },
          ],
        })
      if (kind === 'invoices')
        data.items = [{ id: 'i', code: 'FAT-TESTE', status: 'in_appeal', quantity: 2, total: 120 }]
      if (kind === 'account')
        data = { id: 'b'.repeat(24), invoice: { code: 'FAT-TESTE' }, status: 'closed' }
      return r.fulfill({ json: data })
    })
    await p.goto('http://127.0.0.1:5186/faturamento')
    await p.getByRole('heading', { name: 'Dashboard de Faturamento', exact: true }).waitFor()
    await p.waitForURL('**/faturamento/dashboard')
    assert.equal(await p.locator('.menu-group-toggle[aria-expanded="true"]').count(), 1)
    assert.equal(
      await p
        .getByRole('button', { name: 'Faturamento', exact: true })
        .getAttribute('aria-expanded'),
      'true',
    )
    const parents = await p
      .locator('#realmed-menu nav')
      .evaluate((nav) =>
        Array.from(nav.children).map((el) =>
          el.matches('a')
            ? el.textContent.trim()
            : el.querySelector('button span')?.textContent.trim(),
        ),
      )
    assert.deepEqual(parents, [
      'Cadastros',
      'Central de Guias',
      'Configurações',
      'Dashboard',
      'Estoque',
      'Faturamento',
      'Integrações',
      'Pacientes',
    ])
    assert.equal(
      await p
        .locator('#realmed-menu-group-billing a[href="/faturamento/dashboard"]')
        .getAttribute('href'),
      '/faturamento/dashboard',
    )
    const beforeToggle = p.url()
    await p.getByRole('button', { name: 'Faturamento', exact: true }).click()
    assert.equal(p.url(), beforeToggle, 'parent only collapses, without navigating to charts')
    await p.getByRole('button', { name: 'Faturamento', exact: true }).click()
    await p.getByRole('heading', { name: 'Evolução dos Agendamentos', exact: true }).waitFor()
    assert.equal(await p.getByRole('tab').count(), 4)
    await p.getByRole('button', { name: 'Mais indicadores', exact: true }).click()
    await p.getByRole('heading', { name: 'Faltas Registradas', exact: true }).waitFor()
    await p.getByRole('button', { name: 'Recolher indicadores', exact: true }).click()
    await p.getByRole('tab', { name: /Pendências/ }).click()
    const pageSize = p.getByLabel('Registros por página', { exact: true })
    assert.equal(await pageSize.inputValue(), '10')
    assert.equal(await p.locator('.billing-tab-panel tbody tr').count(), 10)
    for (const size of ['20', '50', '100', '10']) {
      await pageSize.selectOption(size)
      await p.waitForTimeout(100)
      assert.equal(await p.locator('.billing-tab-panel tbody tr').count(), Number(size))
    }
    await p.getByLabel('Pesquisar paciente na agenda consolidada').fill('Paciente consolidado')
    await p.getByText('Paciente consolidado', { exact: true }).waitFor()
    await p
      .getByLabel('Pesquisar paciente na agenda consolidada', { exact: true })
      .fill('inexistente')
    assert.equal(await p.getByText('Paciente consolidado', { exact: true }).count(), 0)
    await p.getByRole('tab', { name: 'Consultas Stenci', exact: true }).click()
    await p.getByRole('button', { name: 'Carregar agendas', exact: true }).click()
    await p.getByLabel('Agenda', { exact: true }).selectOption('a'.repeat(32))
    await p.getByRole('button', { name: 'Consultar agenda', exact: true }).click()
    await p.getByText('Paciente da agenda', { exact: true }).waitFor()
    await p.getByText('Evolução pendente', { exact: true }).waitFor()
    assert.equal(await p.getByRole('heading', { name: 'Guias em recurso', exact: true }).count(), 0)
    assert.equal(
      await p.getByRole('columnheader', { name: 'Valor em recurso', exact: true }).count(),
      0,
    )
    await p.getByText('Paciente da agenda', { exact: true }).click()
    await p.getByRole('button', { name: 'Consultar vínculo com fatura', exact: true }).click()
    await p.getByRole('dialog').waitFor()
    assert.ok(await p.getByRole('dialog').getByText('FAT-TESTE', { exact: true }).count())
    await p.keyboard.press('Escape')
    await p.getByRole('button', { name: 'Consultar faturas', exact: true }).click()
    await p.getByText('Em recurso', { exact: true }).waitFor()
    assert.equal(
      await p.getByText('Paciente da agenda', { exact: true }).count(),
      0,
      'invoice results replace agenda instead of stacking',
    )
    await p.getByRole('tab', { name: /Pendências/ }).click()
    await p.getByRole('button', { name: 'Tratamentos', exact: true }).click()
    await p.getByLabel('Paciente', { exact: true }).fill('ninguém')
    assert.equal(await p.getByText('Paciente para conferir', { exact: true }).count(), 0)
    for (const width of [1366, 1920, 768, 390]) {
      await p.setViewportSize({ width, height: width === 1366 ? 768 : 900 })
      for (const tab of ['Agenda', 'Guias e Tratamentos', 'Pendências', 'Consultas Stenci']) {
        await p
          .getByRole('tab', {
            name: tab === 'Pendências' ? /Pendências/ : tab,
            exact: tab !== 'Pendências',
          })
          .click()
        await p.waitForTimeout(180)
        assert.ok(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          'overflow ' + width + ' ' + tab,
        )
        if (width === 1366 && tab === 'Agenda')
          console.log(
            'Agenda desktop height:',
            await p.evaluate(() => document.documentElement.scrollHeight),
          )
        await p.screenshot({
          path: '.deployment/billing-' + width + '-' + tab.replaceAll(' ', '-') + '.png',
          fullPage: true,
        })
      }
    }
    await p.getByRole('tab', { name: 'Guias e Tratamentos', exact: true }).click()
    await p.getByRole('button', { name: 'Evolução por Mês', exact: true }).click()
    await p.getByRole('heading', { name: 'Evolução Mensal de Pendências', exact: true }).waitFor()
    await p
      .getByRole('button', { name: 'Ver dados de Evolução Mensal de Pendências', exact: true })
      .click()
    await p.getByRole('dialog').waitFor()
    await p.keyboard.press('Escape')
    assert.equal(queueRequests, 1, 'tab switching must not refetch or queue agenda')
    await p.reload()
    await p.getByRole('tab', { name: 'Guias e Tratamentos', exact: true }).waitFor()
    assert.equal(
      await p
        .getByRole('tab', { name: 'Guias e Tratamentos', exact: true })
        .getAttribute('aria-selected'),
      'true',
    )
    assert.deepEqual(errors, [])
    assert.equal(queueRequests, 2, 'queue the whole period once per load, not per tab')
    await p.getByLabel('Filtrar agenda', { exact: true }).selectOption('a'.repeat(24))
    await p.getByLabel('Tipo de atendimento', { exact: true }).selectOption('physiotherapy')
    await p.getByLabel('Local de atendimento', { exact: true }).selectOption('place-a')
    await p.getByLabel('Status da agenda', { exact: true }).selectOption('missed')
    await p.getByLabel('De', { exact: true }).fill('2026-10-10')
    await p.getByLabel('Até', { exact: true }).fill('2026-10-19')
    await p.getByRole('button', { name: 'Aplicar filtros', exact: true }).click()
    await p.getByRole('heading', { name: 'Aging de Pendências', exact: true }).waitFor()
    assert.deepEqual(dashboardQueries.at(-1), {
      start: '2026-10-10',
      end: '2026-10-19',
      scheduleId: 'a'.repeat(24),
      attendanceType: 'physiotherapy',
      placeId: 'place-a',
      status: 'missed',
    })
    await p.getByRole('tab', { name: 'Agenda', exact: true }).click()
    assert.equal(await p.getByLabel('Filtrar agenda', { exact: true }).inputValue(), 'a'.repeat(24))
    await p.getByRole('button', { name: 'Limpar', exact: true }).first().click()
    await p.getByRole('heading', { name: 'Evolução dos Agendamentos', exact: true }).waitFor()
    assert.equal(dashboardQueries.at(-1).attendanceType, 'all')
    assert.equal(dashboardQueries.at(-1).placeId, 'all')
    assert.equal(dashboardQueries.at(-1).status, 'active')
    await p.route('**/api/billing/dashboard**', (r) => {
      dashboardQueries.push(Object.fromEntries(new URL(r.request().url()).searchParams))
      return r.fulfill({
        json: {
          totals: { inTreatment: 0, completed: 0, evaluated: 0 },
          generatedAt: new Date().toISOString(),
          collection: { configured: false, enabled: true },
          agenda: {
            totals: null,
            coverage: { days: 20, currentDays: 0, pendingDays: 20, failedDays: 0, complete: false },
            daily: [],
            statuses: [],
            insurers: [],
            alerts: [],
          },
          aging: [],
          insurers: [],
          months: [],
          alerts: [],
        },
      })
    })
    await p.goto('http://127.0.0.1:5186/faturamento')
    await p
      .getByText('Aguardando configuração da conta exclusiva de coleta.', { exact: true })
      .waitFor()
    assert.equal(
      await p
        .locator('article')
        .filter({ has: p.getByRole('heading', { name: 'Avaliações Agendadas', exact: true }) })
        .locator('b')
        .innerText(),
      '—',
      'uncollected dates cannot appear as zero',
    )
    console.log(
      'PASS billing dashboard, filters, Stenci agenda/account/invoices, responsive layouts',
    )
    const denied = await browser.newPage()
    await prepare(denied, {
      id: 2,
      role: 'user',
      username: 'denied',
      permissionsEnabled: true,
      permissions: [],
    })
    await denied.goto('http://127.0.0.1:5186/faturamento')
    await denied.waitForURL('**/sem-permissao')
    assert.ok(await denied.getByRole('button', { name: 'Faturamento', exact: true }).count())
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
