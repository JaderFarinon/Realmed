const crypto = require('node:crypto');

const fail = (message, status = 503, code = 'PHYSIO_SNAPSHOT_KEY_REQUIRED') => Object.assign(new Error(message), { status, code });

function key(env = process.env) {
  const secret = env.PATIENT_PORTAL_KEY || env.JWT_SECRET;
  if (!secret) throw fail('A chave do app do paciente ainda não está configurada.');
  return crypto.createHash('sha256').update('realmed-physio-evolution-v1\0' + secret).digest();
}

function aad(row) {
  return Buffer.from([row.branch_id, row.patient_external_id, row.stenci_record_id].map(String).join('\0'));
}

function seal(snapshot, row, env = process.env) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(env), iv);
  cipher.setAAD(aad(row));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(snapshot), 'utf8'), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') });
}

function unseal(envelope, row, env = process.env) {
  try {
    const value = JSON.parse(envelope), decipher = crypto.createDecipheriv('aes-256-gcm', key(env), Buffer.from(value.iv, 'base64'));
    decipher.setAAD(aad(row));
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8'));
  } catch (error) {
    if (error.code === 'PHYSIO_SNAPSHOT_KEY_REQUIRED') throw error;
    throw fail('Não foi possível abrir uma evolução finalizada. Solicite conferência à administração.', 503, 'PHYSIO_SNAPSHOT_UNAVAILABLE');
  }
}

async function listForPatient(db, branchId, patientExternalId, env = process.env) {
  const rows = await db('physio_evolutions').where({ branch_id: branchId, patient_external_id: patientExternalId, state: 'FINISHED' })
    .whereNotNull('snapshot_envelope').orderBy('service_date', 'desc').orderBy('finalized_at', 'desc')
    .select('branch_id', 'patient_external_id', 'stenci_record_id', 'service_date', 'finalized_at', 'snapshot_envelope');
  return rows.map(row => {
    const snapshot = unseal(row.snapshot_envelope, row, env);
    return { id: row.stenci_record_id, date: String(row.service_date).slice(0, 10), finalizedAt: row.finalized_at, ...snapshot };
  });
}

module.exports = { seal, unseal, listForPatient };
