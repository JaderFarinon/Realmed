const { getStenciConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciError = require('../../integrations/stenci/StenciError')
const StenciService = require('../../integrations/stenci/StenciService')
const { stenciSessionStore } = require('./StenciSessionStore')
const { automaticService } = require('./stenciRefreshService')

function getAuthenticatedStenciService(
  req,
  {
    configFactory = getStenciConfig,
    serviceFactory,
    sessionStore = stenciSessionStore,
  } = {},
) {
  if (req.user?.authProvider === 'LOCAL')
    throw new StenciError('Esta conta local não possui integração com o Stenci.', {
      code: 'STENCI_NOT_AVAILABLE_FOR_LOCAL_ACCOUNT',
      status: 403,
    })
  const sid = req.user?.sid
  const session = sessionStore.get(sid)
  if (!session)
    throw new StenciError('Sua sessão expirou. Entre novamente.', {
      code: 'STENCI_SESSION_EXPIRED',
      status: 401,
    })
  if (session.mode === 'detached')
    return {
      service: automaticService({
        sid,
        sessionStore,
        configFactory,
        serviceFactory,
      }),
      sid,
      sessionStore,
    }
  const config = configFactory()
  const service = serviceFactory
    ? serviceFactory(config, session)
    : new StenciService(new StenciClient({ config, session }))
  return { service, sid, sessionStore }
}

function normalizeStenciSessionError(error, sid, sessionStore) {
  if (['STENCI_HTTP_401', 'STENCI_HTTP_403'].includes(error?.code)) {
    if (sessionStore.get(sid)?.mode === 'detached')
      return new StenciError(
        'Não foi possível concluir a consulta temporária do Stenci.',
        { code: 'STENCI_QUERY_FAILED', status: 502, cause: error },
      )
    sessionStore.delete(sid)
    return new StenciError('Sua sessão expirou. Entre novamente.', {
      code: 'STENCI_SESSION_EXPIRED',
      status: 401,
      cause: error,
    })
  }
  return error
}

module.exports = { getAuthenticatedStenciService, normalizeStenciSessionError }
