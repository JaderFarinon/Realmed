const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { prepare, records } = require('./verify-screen-pattern.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.REALMED_BROWSER_EXECUTABLE });
  try {
    for (const scenario of ['create', 'retry', 'no-create', 'read-only', 'closed', 'other-editor']) {
      const page = await browser.newPage({ viewport: { width: scenario === 'retry' ? 390 : 1024, height: scenario === 'retry' ? 844 : 600 } });
      const errors = [], writes = [], creates = [];
      page.on('pageerror', e => errors.push(e.message));
      const permission = (moduleKey, canCreate, canEdit) => ({ moduleKey, canView: true, canCreate, canEdit, canDelete: false });
      await prepare(page, { id: 999, role: 'user', username: 'teste', name: 'Teste', permissionsEnabled: true,
        permissions: [permission('guide_processes', true, scenario !== 'read-only'), permission('professionals', scenario !== 'no-create', false)] });
      const done = { completed_at: '2026-11-10', completed_by: 1 };
      const fixture = { ...records[0], patient_id: 1, requesting_doctor_id: 21, documents: [], procedures: [], authorizations: [], pendingItems: [], history: [],
        workflow_stages: scenario === 'closed' ? { reception: done, central: done, documents: done } : { reception: done } };
      const doctors = [{ id: 21, full_name: 'Médico anterior', type: 'DOCTOR', council: 'CRM', council_number: '123', state: 'PR' }];
      let owned = false, fail = scenario === 'retry';
      await page.route('**/api/guide-processes/1', r => {
        if (r.request().method() === 'PUT') { const body = r.request().postDataJSON(); writes.push(body); Object.assign(fixture, body); }
        return r.fulfill({ json: fixture });
      });
      await page.route('**/api/guide-processes/1/evaluation**', r => r.fulfill({ json: r.request().url().endsWith('/options') ? { patient: {}, professionals: [] } : { id: 1, status: 'COMPLETED' } }));
      await page.route('**/api/guide-processes/1/preparation-options', r => r.fulfill({ json: { professionals: doctors, insurances: [], procedures: [] } }));
      await page.route('**/api/guide-processes/1/document-generation-options', r => r.fulfill({ json: [] }));
      await page.route('**/api/guide-processes/1/rotation**', r => r.fulfill({ json: [] }));
      await page.route('**/api/guide-processes/1/authorization-guides', r => r.fulfill({ json: { items: [], partial: false } }));
      await page.route('**/api/guide-processes/1/authorization-documents', r => r.fulfill({ json: [] }));
      await page.route('**/api/guide-processes/1/edit-lock/*', r => {
        if (r.request().method() === 'POST') owned = true;
        if (r.request().method() === 'DELETE') owned = false;
        return r.fulfill({ json: { locked: owned || scenario === 'other-editor', owned: scenario !== 'other-editor' && owned, userName: 'Outro editor', expiresAt: Date.now() + 60000 } });
      });
      await page.route('**/api/professionals', r => {
        assert.equal(r.request().method(), 'POST');
        assert.ok(owned);
        const body = r.request().postDataJSON();
        assert.deepEqual(body, { full_name: 'Médica Fictícia', type: 'DOCTOR', council: 'CRM', council_number: '987654', state: 'SC', cbo: null, active: true });
        creates.push(body);
        if (fail) return r.fulfill({ status: 422, json: { error: 'Falha simulada ao cadastrar médico.' } });
        const doctor = { ...body, id: 31 }; doctors.push(doctor);
        return r.fulfill({ status: 201, json: doctor });
      });
      await page.goto(process.env.REALMED_UI_TEST_URL + '/central-de-guias/tratamentos/1');
      if (scenario === 'closed') await page.locator('#treatment-tab-central').click();
      const central = page.locator('#treatment-tabpanel-central');
      await central.getByRole('heading', { name: 'Procedimentos do tratamento', exact: true }).waitFor();
      const plus = central.getByRole('button', { name: 'Cadastrar médico', exact: true });
      const doctorSelect = central.locator('#preparation-1-requesting_doctor_id');
      if (scenario === 'no-create') {
        await page.getByRole('button', { name: 'Editar aba', exact: true }).click();
        assert.equal(await plus.count(), 0);
      } else if (['read-only', 'closed', 'other-editor'].includes(scenario)) {
        assert.equal(await plus.isDisabled(), true);
      } else {
        assert.equal(await plus.isDisabled(), true);
        await page.getByRole('button', { name: 'Editar aba', exact: true }).click();
        await central.getByLabel('Diagnóstico', { exact: true }).fill('Rascunho fictício preservado');
        const selectBox = await doctorSelect.boundingBox(), plusBox = await plus.boundingBox();
        assert.ok(plusBox.x >= selectBox.x + selectBox.width - 1, 'plus must be alongside doctor select');
        assert.ok(Math.abs(plusBox.y - selectBox.y) < 8, 'plus must align with select');
        await plus.click();
        const modal = page.getByRole('dialog', { name: 'Cadastrar médico', exact: true });
        await modal.getByLabel('Nome completo').fill('Cadastro cancelado');
        await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
        assert.equal(await doctorSelect.inputValue(), '21');
        assert.equal(creates.length, 0);
        await plus.click();
        assert.equal(await modal.getByLabel('Nome completo').inputValue(), '');
        await modal.getByRole('button', { name: 'Cadastrar e selecionar', exact: true }).click();
        assert.equal(creates.length, 0, 'required fields must prevent incomplete registration');
        await modal.getByLabel('Nome completo').fill('  Médica Fictícia  ');
        await modal.getByLabel('Número do CRM').fill('123');
        await modal.getByLabel('UF do CRM').selectOption('PR');
        await modal.getByRole('button', { name: 'Cadastrar e selecionar', exact: true }).click();
        await page.getByText('Já existe um médico com esse CRM e UF. Selecione o cadastro existente.', { exact: true }).waitFor();
        assert.equal(creates.length, 0);
        await modal.getByLabel('Número do CRM').fill('987654');
        await modal.getByLabel('UF do CRM').selectOption('SC');
        await page.screenshot({ path: require('node:path').resolve('.deployment/quick-doctor-' + scenario + '.png') });
        await modal.getByRole('button', { name: 'Cadastrar e selecionar', exact: true }).click();
        if (fail) {
          await page.getByText('Falha simulada ao cadastrar médico.', { exact: true }).waitFor();
          assert.equal(await modal.getByLabel('Número do CRM').inputValue(), '987654');
          assert.equal(await doctorSelect.inputValue(), '21');
          fail = false;
          await modal.getByRole('button', { name: 'Cadastrar e selecionar', exact: true }).click();
        }
        await modal.waitFor({ state: 'hidden' });
        assert.equal(await doctorSelect.inputValue(), '31');
        assert.equal(await central.getByLabel('Diagnóstico', { exact: true }).inputValue(), 'Rascunho fictício preservado');
        assert.equal(writes.length, 0, 'creating professional does not finalize or overwrite treatment');
        await central.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
        await page.getByText('Preparação salva com sucesso.', { exact: true }).waitFor();
        assert.equal(Number(writes[0].requesting_doctor_id), 31);
        assert.equal(writes[0].medical_diagnosis, 'Rascunho fictício preservado');
        assert.equal(page.url().split('?')[0].endsWith('/tratamentos/1'), true);
      }
      assert.deepEqual(errors, []);
      console.log('PASS quick doctor ' + scenario + ': permissions, stage/lease, draft and selection preserved; APIs mocked.');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
