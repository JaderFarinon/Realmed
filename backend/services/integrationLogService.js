const SECRET_KEYS = /password|senha|token|cookie|authorization|headers?/i

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !SECRET_KEYS.test(key)).map(([key, item]) => [key, sanitize(item)]))
  return value
}

async function createIntegrationLog(db, entry) {
  const safe = { ...entry, metadata: entry.metadata == null ? null : JSON.stringify(sanitize(entry.metadata)) }
  await db('integration_logs').insert(safe)
}

module.exports = { createIntegrationLog, sanitize }
