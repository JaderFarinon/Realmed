const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const express = require('express')
const jwt = require('jsonwebtoken')
process.env.JWT_SECRET = 'test-transient-secret'
process.env.PERMISSIONS_ENABLED = 'false'
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const { withTransientStenci, detachedService, operationKey, CACHE_TTL_MS } = require('../services/transientStenciService')
const { StenciSessionStore } = require('../services/StenciSessionStore')
const { createAuthRouter } = require('../routes/auth')
const { createStenciRouter, knex } = require('../routes/stenci')
const config = { enabled: true, apiXBaseUrl: 'https://x.example', apiBaseUrl: 'https://api.example', branchId: 'branch', timeoutMs: 1000 }
const silent = { info() {}, error() {} }
async function serverWith(routers, run) {
  const app = express(); app.use(express.json())
  for (const [path, router] of routers) app.use(path, router)
  const server = http.createServer(app)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try { await run(`http://127.0.0.1:${server.address().port}`) } finally { await new Promise(resolve => server.close(resolve)) }
}
test.after(async () => { await knex.destroy() })

test('HAR logout is an authenticated bodyless POST and accepts 204 without JSON', async () => {
  const calls = []
  const client = new StenciClient({ config, logger: silent, fetchImpl: async (url, options) => {
    calls.push({ path: url.pathname, options })
    return { ok: true, status: url.pathname === '/v1/logout' ? 204 : 200, json: async () => {
      if (url.pathname === '/v1/logout') throw new Error('204 has no body')
      return url.pathname === '/v1/auth' ? { token: 'A' } : url.pathname === '/v1/me/branch' ? { token: 'B' } : { id: 'same-user' }
    } }
  } })
  await withTransientStenci(new StenciService(client), service => service.authenticateUser('user', 'private', 'device'), silent)
  assert.deepEqual(calls.map(c => c.path), ['/v1/auth', '/v1/me/branch', '/v1/me', '/v1/logout'])
  assert.equal(calls[3].options.method, 'POST')
  assert.equal(calls[3].options.body, undefined)
  assert.equal(calls[3].options.headers.Authorization, 'JWT B')
  assert.equal(client.getSession(), null)
  assert.deepEqual(client.authState, {})
})

test('partial authentication, failed consultation and DB failures still release Stenci', async () => {
  for (const failedPath of ['/v1/me/branch', '/v1/me', '/v1/patients/search']) {
    const calls = []
    const client = new StenciClient({ config, logger: silent, fetchImpl: async (url) => {
      calls.push(url.pathname)
      return { ok: url.pathname !== failedPath, status: url.pathname === failedPath ? 500 : url.pathname === '/v1/logout' ? 204 : 200, json: async () => url.pathname === '/v1/auth' ? { token: 'A' } : { id: 'same-user' } }
    } })
    await assert.rejects(withTransientStenci(new StenciService(client), async service => {
      await service.authenticateUser('user', 'private', 'device')
      await service.searchPatients('Maria')
    }, silent))
    assert.equal(calls.at(-1), '/v1/logout')
    assert.deepEqual(client.authState, {})
  }
  let released = 0
  await assert.rejects(withTransientStenci({ logout: async () => released++ }, async () => { throw new Error('DB failed') }, silent), /DB failed/)
  assert.equal(released, 1)
})

test('unconfirmed logout retries and never reports successful login', async () => {
  let attempts = 0
  const store = new StenciSessionStore()
  const router = createAuthRouter({ configFactory: () => config, sessionStore: store, logger: silent, jwtSecret: process.env.JWT_SECRET,
    serviceFactory: () => ({ authenticateUser: async () => ({ stenci_user_id: '1' }), getSession: () => ({}), logout: async () => { attempts++; throw new Error('offline') } }),
    syncUser: async () => ({ id: 1, role: 'admin', status: 'active' }) })
  await serverWith([['/auth', router]], async base => {
    const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'user', password: 'private' }) })
    assert.equal(response.status, 502)
    const body = await response.json()
    assert.equal(body.code, 'STENCI_LOGOUT_FAILED')
    assert.equal(body.token, undefined)
  })
  assert.equal(attempts, 2)
  assert.equal(store.sessions.size, 0)
})

test('cached results expire and missing data asks reauthentication without ending Realmed', async () => {
  const session = { cache: new Map([[operationKey('listInsurances'), { value: { items: [{ id: 'i' }] }, createdAt: 0 }]]) }
  assert.deepEqual(await detachedService(session, () => 1).listInsurances(), { items: [{ id: 'i' }] })
  await assert.rejects(detachedService(session, () => CACHE_TTL_MS).listInsurances(), { status: 428, code: 'STENCI_REFRESH_REQUIRED' })
})

test('refresh validates the same account, releases before publishing cache, and preserves Realmed on invalid credentials', async () => {
  const store = new StenciSessionStore()
  const session = { mode: 'detached', stenciUserId: 'same', cache: new Map() }
  const sid = store.create(session)
  const token = jwt.sign({ id: 1, role: 'admin', sid }, process.env.JWT_SECRET)
  let released = 0, searched = 0, identity = 'same', fail = null
  const db = () => ({ insert: async () => {} })
  const serviceFactory = () => ({
    authenticateUser: async () => { if (fail) throw fail; return { stenci_user_id: identity } },
    logout: async () => { assert.equal(session.cache.size, 0); released++ },
    searchPatients: async () => { searched++; return { items: [{ id: 'p1', name: 'Maria', patient: {} }], hasMore: false } },
    listInsurances: async () => ({ items: [{ id: 'i1', name: 'Convênio' }], hasMore: false }),
  })
  const router = createStenciRouter({ db, configFactory: () => config, serviceFactory, sessionStore: store })
  await serverWith([['/stenci', router]], async base => {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const body = JSON.stringify({ username: 'user', password: 'private', operations: [{ name: 'searchPatients', search: 'Maria' }, { name: 'listInsurances' }] })
    let response = await fetch(base + '/stenci/patients/search?search=Maria', { headers })
    assert.equal(response.status, 428)
    response = await fetch(base + '/stenci/refresh', { method: 'POST', headers, body })
    assert.equal(response.status, 200)
    assert.equal(released, 1)
    assert.equal(session.cache.size, 2)
    response = await fetch(base + '/stenci/patients/search?search=Maria', { headers })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).items[0].full_name, 'Maria')
    assert.equal(searched, 1)
    session.cache.clear(); identity = 'another'
    response = await fetch(base + '/stenci/refresh', { method: 'POST', headers, body })
    assert.equal(response.status, 422)
    assert.equal((await response.json()).code, 'STENCI_ACCOUNT_MISMATCH')
    assert.equal(searched, 1)
    assert.equal(session.cache.size, 0)
    assert.equal(released, 2)
    fail = Object.assign(new Error('bad login'), { code: 'STENCI_INVALID_CREDENTIALS' })
    response = await fetch(base + '/stenci/refresh', { method: 'POST', headers, body })
    assert.equal(response.status, 422)
    assert.equal(released, 3)
    assert.equal(store.get(sid), session)
  })
  store.clear()
})
