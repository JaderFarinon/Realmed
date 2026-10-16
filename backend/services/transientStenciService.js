const StenciError = require('../../integrations/stenci/StenciError')

// Credentials live only in the request. Always release the external context,
// including failures between auth, branch selection, identity and data loading.
async function withTransientStenci(service, operation, logger = console) {
  try {
    return await operation(service)
  } finally {
    let failure
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try { await service.logout(); failure = null; break } catch (error) { failure = error }
    }
    if (failure) {
      logger.error('[STENCI LOGOUT] falha', { code: failure.code, upstreamStatus: failure.upstreamStatus })
      throw new StenciError('Não foi possível confirmar o encerramento da sessão Stenci. Tente novamente.', { code: 'STENCI_LOGOUT_FAILED', status: 502, stage: 'logout' })
    }
  }
}

const CACHE_TTL_MS = 10 * 60_000
function operationKey(name, options = {}) {
  return name === 'searchPatients'
    ? JSON.stringify([name, String(options.search || '').trim(), options.limit ?? 30, options.offset ?? 0])
    : name
}
function detachedService(session, now = Date.now) {
  function read(name, options) {
    const key = operationKey(name, options)
    const entry = session.cache.get(key)
    if (!entry || now() - entry.createdAt >= CACHE_TTL_MS) {
      session.cache.delete(key)
      throw new StenciError('Entre no Stenci para consultar dados atualizados. Sua sessão Realmed permanece ativa.', { code: 'STENCI_REFRESH_REQUIRED', status: 428 })
    }
    if (name === 'testConnection') session.cache.delete(key)
    return entry.value
  }
  return {
    searchPatients: async (search, options) => read('searchPatients', { ...options, search }),
    listInsurances: async () => read('listInsurances'),
    listInsurancePlans: async () => read('listInsurancePlans'),
    listProfessionals: async () => read('listProfessionals'),
    testConnection: async () => read('testConnection'),
  }
}
module.exports = { withTransientStenci, detachedService, operationKey, CACHE_TTL_MS }
