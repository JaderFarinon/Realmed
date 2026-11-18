const crypto = require('node:crypto')
const { fail, parseJson, audit } = require('./whatsappAutomation')

const stable = value => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  return value
}
const digest = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')
const key = value => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(normalized)) throw fail('Envie uma Idempotency-Key válida.', 400, 'IDEMPOTENCY_KEY_REQUIRED')
  return normalized
}
const operationOutput = (row, repeated = false) => ({
  operationId: Number(row.id),
  operationKey: row.operation_key,
  kind: row.kind,
  status: row.status,
  result: parseJson(row.result_snapshot),
  request: parseJson(row.request_snapshot),
  errorCode: row.error_code || null,
  repeated,
})

async function acquireSlot(trx, targetKey, operationKey) {
  if (!targetKey) return
  const expiresAt = new Date(Date.now() + 120000)
  await trx('whatsapp_stenci_slot_locks').insert({ target_key: targetKey, operation_key: operationKey, expires_at: expiresAt }).onConflict('target_key').ignore()
  const row = await trx('whatsapp_stenci_slot_locks').where({ target_key: targetKey }).forUpdate().first()
  if (!row) throw fail('Não foi possível reservar o horário para gravação.', 409, 'STENCI_SLOT_LOCK_FAILED')
  if (row.operation_key !== operationKey) {
    if (new Date(row.expires_at).getTime() > Date.now()) throw fail('Outra operação está usando este horário.', 409, 'STENCI_SLOT_BUSY')
    await trx('whatsapp_stenci_slot_locks').where({ target_key: targetKey }).update({ operation_key: operationKey, expires_at: expiresAt, updated_at: trx.fn.now() })
  }
}

async function execute({ db, branchId, operationKey, kind, input, targetKey, sourceAppointmentId, executor }) {
  if (typeof branchId !== 'string' || !branchId.trim() || branchId.length > 64) throw fail('A unidade Stenci desta instalação não está configurada.', 503, 'STENCI_BRANCH_NOT_CONFIGURED')
  const normalizedBranch = branchId.trim()
  const normalizedKey = key(operationKey), requestHash = digest({ kind, input })
  const claimed = await db.transaction(async trx => {
    const existing = await trx('whatsapp_stenci_operations').where({ branch_id: normalizedBranch, operation_key: normalizedKey }).forUpdate().first()
    if (existing) {
      if (existing.request_hash !== requestHash || existing.kind !== kind) throw fail('A chave de idempotência já foi usada para outra operação.', 409, 'IDEMPOTENCY_KEY_CONFLICT')
      if (existing.status === 'SUCCEEDED') return { existing }
      throw fail('Esta operação já foi iniciada e precisa ser conferida antes de uma nova tentativa.', 409, existing.error_code || 'STENCI_OPERATION_PENDING')
    }
    await acquireSlot(trx, targetKey, normalizedKey)
    const [id] = await trx('whatsapp_stenci_operations').insert({ operation_key: normalizedKey, branch_id: normalizedBranch, kind, request_hash: requestHash, source_appointment_id: sourceAppointmentId || null, request_snapshot: JSON.stringify(input) })
    return { id }
  })
  if (claimed.existing) return operationOutput(claimed.existing, true)
  try {
    const result = await executor()
    const row = await db.transaction(async trx => {
      await trx('whatsapp_stenci_operations').where({ id: claimed.id, branch_id: normalizedBranch }).update({ status: 'SUCCEEDED', result_appointment_id: result?.appointmentId || null, result_snapshot: JSON.stringify(result || {}), error_code: null, updated_at: trx.fn.now() })
      if (targetKey) await trx('whatsapp_stenci_slot_locks').where({ target_key: targetKey, operation_key: normalizedKey }).delete()
      await audit(trx, 'STENCI_OPERATION_SUCCEEDED', 'stenci_operation', claimed.id, { externalEventId: normalizedKey, metadata: { kind } })
      return trx('whatsapp_stenci_operations').where({ id: claimed.id, branch_id: normalizedBranch }).first()
    })
    return operationOutput(row, false)
  } catch (error) {
    const ambiguous = ['STENCI_WRITE_AMBIGUOUS', 'STENCI_MOVE_PARTIAL'].includes(error.code)
    await db.transaction(async trx => {
      await trx('whatsapp_stenci_operations').where({ id: claimed.id, branch_id: normalizedBranch }).update({ status: ambiguous ? 'AMBIGUOUS' : 'FAILED', error_code: String(error.code || 'STENCI_WRITE_FAILED').slice(0, 80), updated_at: trx.fn.now() })
      if (targetKey) await trx('whatsapp_stenci_slot_locks').where({ target_key: targetKey, operation_key: normalizedKey }).delete()
      await audit(trx, ambiguous ? 'STENCI_OPERATION_AMBIGUOUS' : 'STENCI_OPERATION_FAILED', 'stenci_operation', claimed.id, { externalEventId: normalizedKey, metadata: { kind, code: error.code || null } })
    })
    throw error
  }
}

async function getOperation(db, branchId, operationKey) {
  if (typeof branchId !== 'string' || !branchId.trim() || branchId.length > 64) throw fail('A unidade Stenci desta instalação não está configurada.', 503, 'STENCI_BRANCH_NOT_CONFIGURED')
  const row = await db('whatsapp_stenci_operations').where({ branch_id: branchId.trim(), operation_key: key(operationKey) }).first()
  if (!row) throw fail('Operação não encontrada.', 404, 'STENCI_OPERATION_NOT_FOUND')
  return operationOutput(row)
}

module.exports = { execute, getOperation, digest }
