const test = require('node:test');
const assert = require('node:assert/strict');
const { seal, unseal } = require('../services/physioEvolutionSnapshot');
const clinical = require('../../integrations/stenci/physioClinical');

test('final evolution snapshot is encrypted and bound to patient and Stenci record', () => {
  const env = { PATIENT_PORTAL_KEY: 'test-only-clinical-key' };
  const row = { branch_id: 'branch-a', patient_external_id: 'patient-a', stenci_record_id: 'record-a' };
  const snapshot = { text: 'Conteúdo clínico fictício', professional: { name: 'Fisio Teste', crefito: 'TEST-1', state: 'PR' } };
  const envelope = seal(snapshot, row, env);
  assert.equal(envelope.includes(snapshot.text), false);
  assert.deepEqual(unseal(envelope, row, env), snapshot);
  assert.throws(() => unseal(envelope, { ...row, patient_external_id: 'patient-b' }, env), error => error.code === 'PHYSIO_SNAPSHOT_UNAVAILABLE');
});

test('confirmed HAR contract selects text template and uses create, update and individual read routes', async () => {
  const calls = [];
  const client = { request: async (path, options = {}) => {
    calls.push({ path, options });
    if (path === '/v1/templates') return { items: [
      { id: 'soap', active: true, default: true, type: 'anamnesis', inputs: [{ name: 'subjective', type: 'editor' }] },
      { id: 'free-text', active: true, default: true, type: 'default', inputs: [{ name: 'content', type: 'editor' }] },
    ] };
    if (path === '/v1/appointments/appointment-a') return { id: 'appointment-a', patient: { id: 'patient-a' }, schedule: { id: 'schedule-a' } };
    return { id: 'record-a', patientId: 'patient-a', status: options.body?.status || 'finished' };
  } };
  assert.equal((await clinical.defaultTemplate(client)).id, 'free-text');
  assert.equal((await clinical.appointment(client, 'appointment-a')).patient.id, 'patient-a');
  await clinical.createRecord(client, { patientId: 'patient-a' });
  await clinical.updateRecord(client, 'record-a', { patientId: 'patient-a', status: 'finished' });
  await clinical.readRecord(client, 'record-a');
  assert.deepEqual(calls.map(call => [call.options.method || 'GET', call.path]), [
    ['GET', '/v1/templates'], ['GET', '/v1/appointments/appointment-a'], ['POST', '/v1/medical-records'], ['PUT', '/v1/medical-records/record-a'], ['GET', '/v1/medical-records/record-a'],
  ]);
  assert.equal(calls.every(call => call.options.base === 'apiX'), true);
});
