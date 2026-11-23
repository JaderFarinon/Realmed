const StenciError = require('./StenciError');

const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const invalid = message => { throw new StenciError(message, { code: 'STENCI_INVALID_RESPONSE', status: 502 }); };

function assertRecord(record, expected = {}) {
  if (!record || !validId(String(record.id || ''))) invalid('O Stenci não confirmou o prontuário criado.');
  if (expected.patientId && String(record.patientId || record.patient?.id) !== String(expected.patientId)) invalid('O Stenci retornou outro paciente no prontuário.');
  return record;
}

async function appointment(client, appointmentId) {
  if (!validId(appointmentId)) invalid('Agendamento Stenci inválido.');
  const value = await client.request(`/v1/appointments/${appointmentId}`, { base: 'apiX' });
  if (!value || String(value.id) !== appointmentId || !validId(String(value.patient?.id || '')) || !validId(String(value.schedule?.id || ''))) invalid('O Stenci retornou um agendamento inválido.');
  return value;
}

async function defaultTemplate(client) {
  const data = await client.request('/v1/templates', { base: 'apiX', query: { limit: 0, active: true, type: 'anamnesis' } });
  const template = data?.items?.find(item => item?.active === true && item?.default === true && item?.type === 'default' && Array.isArray(item.inputs) && item.inputs.length === 1 && item.inputs[0]?.type === 'editor' && item.inputs[0]?.name === 'content');
  if (!template || !validId(String(template.id || ''))) invalid('O modelo de texto livre do Stenci não está disponível.');
  return template;
}

async function createRecord(client, body) {
  const value = await client.request('/v1/medical-records', { base: 'apiX', method: 'POST', body });
  return assertRecord(value, { patientId: body.patientId });
}

async function updateRecord(client, recordId, body) {
  if (!validId(recordId)) invalid('Prontuário Stenci inválido.');
  const value = await client.request(`/v1/medical-records/${recordId}`, { base: 'apiX', method: 'PUT', body });
  return assertRecord(value, { patientId: body.patientId });
}

async function readRecord(client, recordId) {
  if (!validId(recordId)) invalid('Prontuário Stenci inválido.');
  return assertRecord(await client.request(`/v1/medical-records/${recordId}`, { base: 'apiX' }));
}

module.exports = { appointment, defaultTemplate, createRecord, updateRecord, readRecord, assertRecord };
