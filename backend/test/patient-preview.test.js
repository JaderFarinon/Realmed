const test = require('node:test'), assert = require('node:assert/strict');
const { evaluationForPatient, appointmentForPatient } = require('../services/patientPreview');
test('patient preview excludes evaluation drafts and internal metadata', () => {
  assert.equal(evaluationForPatient({ status: 'DRAFT', chief_complaint: 'Private draft' }), null);
  const view = evaluationForPatient({ status: 'COMPLETED', chief_complaint: 'Synthetic complaint', pain_score: 0, conducts: '["Conduta teste"]', created_by: 99, notes: 'Internal', patient_id: 8 });
  assert.equal(view.chief_complaint, 'Synthetic complaint'); assert.equal(view.pain_score, 0); assert.deepEqual(view.conducts, ['Conduta teste']); assert.ok(!('created_by' in view)); assert.ok(!('notes' in view)); assert.ok(!('patient_id' in view));
});
test('patient agenda preserves real status and uses São Paulo date/time without inferring clinical progress', () => {
  const now = Date.parse('2026-11-13T16:00:00Z');
  const future = appointmentForPatient({ start_at: '2026-11-13T16:01:00Z', status: 'patient_canceled', is_session: true, schedule_name: 'Agenda teste', patient_name: 'Must not return' }, now);
  assert.equal(future.date, '2026-11-13'); assert.equal(future.time, '13:01'); assert.equal(future.upcoming, true); assert.equal(future.status, 'patient_canceled'); assert.ok(!('patient_name' in future));
  const previous = appointmentForPatient({ start_at: '2026-11-13T12:59', status: 'finished', is_evaluation: true }, now); assert.equal(previous.upcoming, false); assert.equal(previous.type, 'Avaliação'); assert.equal(appointmentForPatient({ start_at: null }, now), null);
});
