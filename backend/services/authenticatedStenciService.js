const { getStenciConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciError = require('../../integrations/stenci/StenciError')
const StenciService = require('../../integrations/stenci/StenciService')
const { stenciSessionStore } = require('./StenciSessionStore')

function getAuthenticatedStenciService(req, {
  configFactory = getStenciConfig,
  serviceFactory,
  sessionStore = stenciSessionStore,
} = {}) {
  const sid = req.user?.sid
  const session = sessionStore.get(sid)
  if (!session) throw new StenciError('Sua sessão expirou. Entre novamente.', { code: 'STENCI_SESSION_EXPIRED', status: 401 })
  const config = configFactory()
  const service = serviceFactory
    ? serviceFactory(config, session)
    : new StenciService(new StenciClient({ config, session }))
  return { service, sid, sessionStore }
}

function normalizeStenciSessionError(error, sid, sessionStore) {
  if (['STENCI_HTTP_401', 'STENCI_HTTP_403'].includes(error?.code)) {
    sessionStore.delete(sid)
    return new StenciError('Sua sessão expirou. Entre novamente.', { code: 'STENCI_SESSION_EXPIRED', status: 401, cause: error })
  }
  return error
}

module.exports = { getAuthenticatedStenciService, normalizeStenciSessionError }
