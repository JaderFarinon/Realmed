const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { prepare, records } = require('./verify-screen-pattern.cjs');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.REALMED_BROWSER_EXECUTABLE });
  try {
    const page = await browser.newPage(), errors = [], generations = [], reviews = [];
    page.on('pageerror', e => errors.push(e.message));
    await prepare(page);
    const types = ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION'];
    const procedures = ['CONSULTATION', 'PHYSIOTHERAPY', 'ELECTROSTIMULATION'].map((type, index) => ({
      id: index + 1, procedure_id: index + 1, type, code: String(100 + index), source_code: String(100 + index),
      description: 'Procedimento fictício ' + type, requested_quantity: index ? 10 : 1,
    }));
    const originals = types.map((document_type, index) => ({
      id: 91 + index, document_type, document_role: 'RECEIVED', is_usable: false,
      original_name: 'Original fictício ' + index + (index === 1 ? '.png' : '.pdf'),
    }));
    const fixture = { ...records[0], patient_id: 1, requesting_doctor_id: 21,
      documents: [...originals], procedures, authorizations: [], pendingItems: [], history: [],
      workflow_stages: { reception: { completed_at: '2026-11-10', completed_by: 1 } },
    };
    let owned = false, reads = 0;
    await page.route('**/api/guide-processes/1', r => {
      assert.equal(r.request().method(), 'GET');
      return r.fulfill({ json: fixture });
    });
    await page.route('**/api/guide-processes/1/evaluation**', r => r.fulfill({ json: r.request().url().endsWith('/options') ? { patient: {}, professionals: [] } : { id: 1, status: 'COMPLETED' } }));
    await page.route('**/api/guide-processes/1/preparation-options', r => r.fulfill({ json: { insurances: [], procedures, professionals: [{ id: 21, full_name: 'Médico Fictício' }] } }));
    await page.route('**/api/guide-processes/1/document-generation-options', r => r.fulfill({ json: types.map(document_type => ({ id: 'sadt-v1:' + document_type, name: document_type, version: 1, document_type })) }));
    await page.route('**/api/guide-processes/1/rotation**', r => r.fulfill({ json: [] }));
    await page.route('**/api/guide-processes/1/authorization-guides', r => r.fulfill({ json: { items: [], partial: false } }));
    await page.route('**/api/guide-processes/1/edit-lock/*', r => {
      if (r.request().method() === 'POST') owned = true;
      if (r.request().method() === 'DELETE') owned = false;
      return r.fulfill({ json: { locked: owned, owned, expiresAt: Date.now() + 60000 } });
    });
    await page.route('**/api/guide-processes/1/code-review-options', r => {
      assert.ok(owned);
      reviews.push(r.request().postDataJSON());
      return r.fulfill({ json: procedures });
    });
    await page.route('**/api/guide-processes/1/documents/*/read-codes', r => {
      reads++;
      assert.ok(r.request().url().includes('/documents/91/read-codes'));
      return r.fulfill({ status: 422, json: { error: 'Leitura do original indisponível neste teste.' } });
    });
    await page.route('**/api/guide-processes/1/documents/generate', r => {
      assert.ok(owned);
      const payload = r.request().postDataJSON();
      assert.equal(payload.codes_confirmed, true);
      assert.equal(payload.code_review_id, undefined);
      assert.equal(payload.review_items, undefined);
      generations.push(payload);
      for (const type of payload.unified_document_types || [payload.template_id.split(':')[1]]) {
        fixture.documents.push({ id: 100 + fixture.documents.length, document_type: type, document_role: 'GENERATED', is_usable: true, original_name: 'Guia fictícia gerada.pdf' });
      }
      return r.fulfill({ json: { id: 101 } });
    });
    await page.goto(process.env.REALMED_UI_TEST_URL + '/central-de-guias/tratamentos/1');
    const central = page.locator('#treatment-tabpanel-central');
    await central.getByRole('heading', { name: 'Procedimentos do tratamento', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Editar aba', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Conferir códigos da guia', exact: true });
    async function confirm(expectedIds) {
      await modal.getByText('Confira os procedimentos e as quantidades cadastrados no tratamento.', { exact: false }).waitFor();
      assert.equal(await modal.getByRole('button', { name: 'Ler página', exact: true }).count(), 0);
      assert.equal(await modal.getByRole('spinbutton').count(), expectedIds.length);
      await modal.getByRole('checkbox', { name: /Conferi os procedimentos/ }).check();
      await modal.getByRole('button', { name: 'Gerar guia conferida', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      assert.deepEqual(generations.at(-1).code_selection, expectedIds.map(id => ({ procedure_id: id, requested_quantity: id === 1 ? 1 : 10 })));
      assert.deepEqual(fixture.documents.filter(d => d.document_role === 'RECEIVED'), originals);
    }
    for (let i = 0; i < types.length; i++) {
      const card = central.locator('#treatment-1-document-' + types[i]);
      for (const label of ['Gerar guia ajustada', 'Gerar nova versão']) {
        await card.getByRole('button', { name: label, exact: true }).click();
        await confirm([i + 1]);
        assert.equal(reviews.at(-1).document_type, types[i]);
        assert.equal(reads, 0);
      }
      console.log('PASS individual ' + types[i] + ': correct procedures/quantities; attached original and previous version preserved; no OCR.');
    }
    for (const type of types) await central.locator('#treatment-1-document-' + type).getByRole('checkbox').check();
    await central.getByRole('button', { name: 'Gerar guia unificada', exact: true }).click();
    await confirm([1, 2, 3]);
    assert.deepEqual(generations.at(-1).unified_document_types, types);
    assert.equal(reads, 0);
    console.log('PASS unified generation still includes only selected types without OCR.');
    const consultation = central.locator('#treatment-1-document-CONSULTATION_GUIDE');
    await consultation.getByRole('button', { name: 'Ler original e ajustar códigos', exact: true }).click();
    await page.getByText('Leitura do original indisponível neste teste.', { exact: true }).waitFor();
    assert.equal(reads, 1);
    assert.equal(await modal.getByRole('button', { name: 'Gerar guia conferida', exact: true }).isDisabled(), true);
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await consultation.getByRole('button', { name: 'Gerar nova versão', exact: true }).click();
    await confirm([1]);
    assert.equal(reads, 1);
    assert.deepEqual(errors, []);
    console.log('PASS explicit original-reading preserved; failed OCR does not block subsequent normal generation; all APIs mocked.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
