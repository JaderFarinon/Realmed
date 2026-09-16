const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const jwt = require('jsonwebtoken')

process.env.DB_HOST ||= 'localhost'
process.env.DB_USER ||= 'test'
process.env.DB_PASS ||= 'test'
process.env.DB_NAME ||= 'test'
process.env.JWT_SECRET = 'test-only-realmed-secret'

const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const { getStenciConfig } = require('../../integrations/stenci/config')
const { createAuthRouter } = require('../routes/auth')
const express = require('express')
const StenciSession = require('../../integrations/stenci/StenciSession')
const { StenciSessionStore } = require('../services/StenciSessionStore')

const config = getStenciConfig({
  STENCI_ENABLED: 'true',
  STENCI_API_X_BASE_URL: 'https://api-x.example',
  STENCI_API_BASE_URL: 'https://api.example',
  STENCI_BRANCH_ID: 'realmed-branch',
})

async function withServer(router, callback) {
  const app = express(); app.use(express.json()); app.use('/api/auth', router)
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try { await callback(`http://127.0.0.1:${server.address().port}`) } finally { await new Promise((resolve) => server.close(resolve)) }
}

test('employee authentication uses credentials once, fixed branch, session device and GET /me', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ path: new URL(url).pathname, body: options.body && JSON.parse(options.body) })
    return { ok: true, json: async () => new URL(url).pathname === '/v1/me' ? { identityId: 'identity-7', username: 'maria', name: 'Maria', email: 'maria@example.test' } : {} }
  }
  const identity = await new StenciService(new StenciClient({ config, fetchImpl })).authenticateUser('maria', 'secret-value', 'session-device')
  assert.deepEqual(calls, [
    { path: '/v1/auth', body: { username: 'maria', password: 'secret-value', deviceId: 'session-device' } },
    { path: '/v1/me/branch', body: { branchId: 'realmed-branch', deviceId: 'session-device' } },
    { path: '/v1/me', body: undefined },
  ])
  assert.deepEqual(identity, { stenci_user_id: 'identity-7', stenci_username: 'maria', name: 'Maria', email: 'maria@example.test' })
})

test('valid logins create isolated device contexts, issue safe JWTs and logout clears them', async () => {
  const users = new Map(); let created = 0
  const syncUser = async (_db, identity) => {
    if (!users.has(identity.stenci_user_id)) {
      created += 1
      users.set(identity.stenci_user_id, { id: created, username: identity.stenci_username, role: 'user', status: 'active', person_id: created, full_name: identity.name, email: identity.email })
    }
    return users.get(identity.stenci_user_id)
  }
  const receivedDeviceIds = []
  const serviceFactory = () => {
    let storedSession
    return {
      authenticateUser: async (_username, _password, deviceId) => {
        receivedDeviceIds.push(deviceId)
        storedSession = new StenciSession({ deviceId, branchId: 'realmed-branch' })
        return { stenci_user_id: 'stable-1', stenci_username: 'joao', name: 'João', email: null }
      },
      getSession: () => storedSession,
    }
  }
  const sessionStore = new StenciSessionStore({ ttlMs: 60_000 })
  const router = createAuthRouter({ configFactory: () => config, serviceFactory, syncUser, jwtSecret: process.env.JWT_SECRET, sessionStore })
  await withServer(router, async (base) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'joao', password: 'never-persist-this' }) })
      assert.equal(response.status, 200)
      const result = await response.json(); const claims = jwt.verify(result.token, process.env.JWT_SECRET)
      assert.equal(claims.id, 1); assert.equal(typeof claims.sid, 'string'); assert.equal(claims.password, undefined); assert.equal(claims.username, 'joao')
      assert.equal(result.user.sid, undefined)
      const session = sessionStore.get(claims.sid)
      assert.equal(session.deviceId, receivedDeviceIds[attempt])
      assert.match(session.deviceId, /^[0-9a-f]{32}$/)
      assert.equal(JSON.stringify(result).includes('never-persist-this'), false)
      assert.equal(result.user.permissions, undefined)
      const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${result.token}` } })
      assert.equal(logout.status, 204)
      assert.equal(sessionStore.get(claims.sid), null)
    }
  })
  assert.equal(created, 1)
  assert.equal(new Set(receivedDeviceIds).size, 2)
})

test('invalid credentials and unavailable Stenci return controlled messages', async () => {
  for (const scenario of [
    { error: Object.assign(new Error('remote body'), { code: 'STENCI_HTTP_401' }), status: 401, message: 'Usuário ou senha inválidos.' },
    { error: Object.assign(new Error('socket and headers'), { code: 'STENCI_NETWORK_ERROR' }), status: 503, message: 'Não foi possível validar seu acesso no momento. Tente novamente em alguns instantes.' },
  ]) {
    const router = createAuthRouter({ configFactory: () => config, serviceFactory: () => ({ authenticateUser: async () => { throw scenario.error } }), jwtSecret: process.env.JWT_SECRET })
    await withServer(router, async (base) => {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'x', password: 'sensitive' }) })
      assert.equal(response.status, scenario.status)
      assert.deepEqual(await response.json(), { error: scenario.message })
    })
  }
})
