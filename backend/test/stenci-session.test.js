const test = require('node:test')
const assert = require('node:assert/strict')

const StenciSession = require('../../integrations/stenci/StenciSession')
const { getStenciConfig, publicConfig } = require('../../integrations/stenci/config')
const { StenciSessionStore, tokenTtlMs } = require('../services/StenciSessionStore')
const { getAuthenticatedStenciService, normalizeStenciSessionError } = require('../services/authenticatedStenciService')

const configuredEnv = {
  STENCI_ENABLED: 'true',
  STENCI_API_X_BASE_URL: 'https://api-x.example',
  STENCI_API_BASE_URL: 'https://api.example',
  STENCI_DEVICE_ID: 'realmed-device',
  STENCI_BRANCH_ID: 'realmed-branch',
}

test('configuration requires infrastructure but never fixed username and password', () => {
  const config = getStenciConfig(configuredEnv)
  assert.equal(config.username, undefined)
  assert.equal(config.password, undefined)
  assert.deepEqual(publicConfig(config), {
    enabled: true,
    api_x_base_url_configured: true,
    api_base_url_configured: true,
    authentication_configured: true,
    device_configured: true,
    branch_configured: true,
  })
  assert.equal(publicConfig(getStenciConfig({ ...configuredEnv, STENCI_DEVICE_ID: '' })).authentication_configured, false)
  assert.equal(publicConfig(getStenciConfig({ ...configuredEnv, STENCI_BRANCH_ID: '' })).authentication_configured, false)
})

test('server-side store isolates users and expires sessions with the JWT-compatible TTL', () => {
  let now = 100
  const store = new StenciSessionStore({ ttlMs: tokenTtlMs('2h'), now: () => now })
  const maria = new StenciSession({ deviceId: 'device', branchId: 'maria-branch' })
  const joao = new StenciSession({ deviceId: 'device', branchId: 'joao-branch' })
  const mariaSid = store.create(maria)
  const joaoSid = store.create(joao)
  assert.notEqual(mariaSid, joaoSid)
  assert.equal(store.get(mariaSid), maria)
  assert.equal(store.get(joaoSid), joao)
  now += tokenTtlMs('2h')
  assert.equal(store.get(mariaSid), null)
  assert.equal(store.get(joaoSid), null)
})

test('authenticated service helper resolves sid and invalidates remote 401/403 sessions', () => {
  const store = new StenciSessionStore({ ttlMs: 1000 })
  const session = new StenciSession({ deviceId: 'device', branchId: 'branch' })
  const sid = store.create(session)
  const expectedService = { searchPatients() {} }
  const context = getAuthenticatedStenciService({ user: { sid } }, {
    configFactory: () => getStenciConfig(configuredEnv),
    serviceFactory: (_config, receivedSession) => {
      assert.equal(receivedSession, session)
      return expectedService
    },
    sessionStore: store,
  })
  assert.equal(context.service, expectedService)
  const normalized = normalizeStenciSessionError({ code: 'STENCI_HTTP_403' }, sid, store)
  assert.equal(normalized.code, 'STENCI_SESSION_EXPIRED')
  assert.equal(normalized.status, 401)
  assert.equal(store.get(sid), null)
  assert.throws(() => getAuthenticatedStenciService({ user: { sid } }, { sessionStore: store }), { code: 'STENCI_SESSION_EXPIRED' })
})
