const crypto = require('node:crypto');
const { readPatientPreview } = require('./patientPreview');
const fail = (message, status) => Object.assign(new Error(message), { status });
const invalid = () => fail('Este link do paciente não está disponível. Solicite o acesso à Realmed.', 404);
const hash = code => crypto.createHash('sha256').update(code).digest('hex');
const validCode = code => typeof code === 'string' && /^[A-Za-z0-9_-]{43}$/.test(code);
function key() {
  const secret = process.env.PATIENT_PORTAL_KEY || process.env.JWT_SECRET;
  if (!secret) throw fail('O acesso do paciente ainda não está configurado.', 503);
  return crypto.createHash('sha256').update('realmed-patient-portal-v1\0' + secret).digest();
}
function seal(code, patientId) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(String(patientId)));
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') });
}
function unseal(envelope, patientId) {
  const value = JSON.parse(envelope), decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64'));
  decipher.setAAD(Buffer.from(String(patientId))); decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8');
}
async function patientAccess(db, processId, actorId) {
  const id = Number(processId);
  if (!Number.isSafeInteger(id) || id < 1) throw fail('Tratamento inválido.', 400);
  return db.transaction(async trx => {
    const initial = await trx('guide_processes').where({ id }).whereNull('deleted_at').first('patient_id');
    if (!initial) throw fail('Tratamento não encontrado.', 404);
    // Every cycle for a patient serializes on the same row: one stable link, even under concurrent requests.
    const patient = await trx('patients').where({ id: initial.patient_id }).forUpdate().first('id');
    if (!patient) throw fail('Paciente não encontrado.', 404);
    const guide = await trx('guide_processes').where({ id, patient_id: patient?.id }).whereNull('deleted_at').forUpdate().first('id');
    if (!guide) throw fail('O paciente do tratamento foi alterado. Atualize a tela.', 409);
    let access = await trx('patient_portal_access').where({ patient_id: patient.id }).forUpdate().first();
    if (access?.revoked_at) throw fail('O acesso deste paciente foi desativado. Solicite conferência à administração.', 410);
    let code;
    if (access) code = unseal(access.token_envelope, patient.id);
    else {
      code = crypto.randomBytes(32).toString('base64url');
      access = { patient_id: patient.id, token_hash: hash(code), token_envelope: seal(code, patient.id), created_by: actorId };
      await trx('patient_portal_access').insert(access);
      await trx('guide_process_history').insert({ guide_process_id: id, user_id: actorId, action: 'PATIENT_PORTAL_ACCESS_CREATED', metadata: JSON.stringify({ patientId: patient.id }) });
    }
    return { path: '/paciente/' + code };
  });
}
async function patientPortal(db, code, processId, options = {}) {
  if (!validCode(code)) throw invalid();
  return db.transaction(async trx => {
    const access = await trx('patient_portal_access').where({ token_hash: hash(code) }).whereNull('revoked_at').first('patient_id');
    if (!access) throw invalid();
    const guides = await trx('guide_processes').where({ patient_id: access.patient_id }).whereNull('deleted_at').orderBy('id', 'desc')
      .select('id', 'treatment_root_id', 'guide_number', 'assessment_date');
    const selected = processId == null ? guides[0] : guides.find(guide => guide.id === Number(processId));
    if (!selected) throw invalid();
    const view = await readPatientPreview(trx, selected.id, { ...options, patientId: access.patient_id });
    const dateOnly = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10) || null;
    return { ...view, preview: false, capabilities: { ...view.capabilities, publicAccess: true },
      treatments: guides.map(guide => ({ id: guide.id, rootId: guide.treatment_root_id || guide.id, guideNumber: guide.guide_number || 1, assessmentDate: dateOnly(guide.assessment_date) })) };
  });
}
module.exports = { patientAccess, patientPortal, validCode, seal, unseal };
