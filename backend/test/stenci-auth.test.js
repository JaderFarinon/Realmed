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
const { UserSyncError } = require('../services/stenciUserService')

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
    return { ok: true, json: async () => new URL(url).pathname === '/v1/auth' ? { token: 'auth-token' } : new URL(url).pathname === '/v1/me' ? { identityId: 'identity-7', username: 'maria', name: 'Maria', email: 'maria@example.test' } : {} }
  }
  const identity = await new StenciService(new StenciClient({ config, fetchImpl })).authenticateUser('maria', 'secret-value', 'session-device')
  assert.deepEqual(calls, [
    { path: '/v1/auth', body: { username: 'maria', password: 'secret-value', deviceId: 'session-device' } },
    { path: '/v1/me/branch', body: { branchId: 'realmed-branch', deviceId: 'session-device' } },
    { path: '/v1/me', body: undefined },
  ])
  assert.deepEqual(identity, { stenci_user_id: 'identity-7', stenci_username: 'maria', identity: null, name: 'Maria', email: 'maria@example.test' })
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
        storedSession = new StenciSession({ deviceId, branchId: 'realmed-branch', token: 'server-only-stenci-token' })
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
      assert.equal(JSON.stringify(result).includes('server-only-stenci-token'), false)
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
    { error: Object.assign(new Error('remote body'), { code: 'STENCI_INVALID_CREDENTIALS', stage: 'auth', upstreamStatus: 401 }), status: 401, message: 'Usuário ou senha inválidos.' },
    { error: Object.assign(new Error('socket and headers'), { code: 'STENCI_CONNECTION_ERROR', stage: 'auth' }), status: 503, message: 'Não foi possível validar seu acesso no momento. Tente novamente.' },
  ]) {
    const router = createAuthRouter({ configFactory: () => config, serviceFactory: () => ({ authenticateUser: async () => { throw scenario.error } }), jwtSecret: process.env.JWT_SECRET })
    await withServer(router, async (base) => {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'x', password: 'sensitive' }) })
      assert.equal(response.status, scenario.status)
      assert.deepEqual(await response.json(), { error: scenario.message })
    })
  }
})

test('user sync failures log only sanitized MySQL diagnostics before returning 500', async () => {
  const entries = []
  const logger = { info() {}, error: (...values) => entries.push(values) }
  const mysqlError = Object.assign(new Error('private database failure'), {
    code: 'ER_DUP_ENTRY', errno: 1062, sqlState: '23000',
    sqlMessage: "Duplicate entry 'private@example.test' for key 'people.uk_people_email'",
    sql: "UPDATE people SET email = 'private@example.test'",
  })
  const serviceFactory = () => {
    let session
    return {
      authenticateUser: async () => {
        session = new StenciSession({ deviceId: 'device', branchId: 'branch', token: 'private-stenci-token' })
        return { stenci_user_id: 'stable-1', stenci_username: 'private-cpf', email: 'private@example.test' }
      },
      getSession: () => session,
    }
  }
  const router = createAuthRouter({
    serviceFactory, logger, jwtSecret: process.env.JWT_SECRET,
    syncUser: async () => { throw new UserSyncError('REALMED_USER_SYNC_FAILED', 500, mysqlError) },
  })
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'private-cpf', password: 'private-password' }) })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { error: 'Não foi possível concluir seu acesso ao Realmed.', code: 'REALMED_USER_SYNC_FAILED' })
  })
  const output = JSON.stringify(entries)
  assert.match(output, /REALMED USER SYNC|ER_DUP_ENTRY|uk_people_email|23000/)
  assert.doesNotMatch(output, /private@example\.test|private-cpf|private-password|private-stenci-token|UPDATE people/)
})

test('authentication stages have distinct errors and preserve a string username and its leading zero', async () => {
  const scenarios = [
    { statuses: [401], code: 'STENCI_INVALID_CREDENTIALS', stage: 'auth', status: 401 },
    { statuses: [200, 401], code: 'STENCI_BRANCH_FAILED', stage: 'branch', status: 502 },
    { statuses: [200, 200, 401], code: 'STENCI_ME_FAILED', stage: 'me', status: 502 },
  ]
  for (const scenario of scenarios) {
    const calls = []
    const fetchImpl = async (_url, options) => {
      calls.push(options)
      const status = scenario.statuses[calls.length - 1]
      return { ok: status === 200, status, headers: { get: () => null }, json: async () => calls.length === 1 && status === 200 ? { token: 'auth-token' } : { code: 'remote_error', message: 'safe diagnostic' } }
    }
    const client = new StenciClient({ config, fetchImpl, logger: { info() {}, warn() {}, error() {} } })
    await assert.rejects(client.authenticateSession('05286020984', 'top-secret', 'same-device'), (error) => {
      assert.equal(error.code, scenario.code)
      assert.equal(error.stage, scenario.stage)
      assert.equal(error.status, scenario.status)
      return true
    })
    const authBody = JSON.parse(calls[0].body)
    assert.equal(authBody.username, '05286020984')
    assert.equal(typeof authBody.username, 'string')
    assert.deepEqual(Object.keys(authBody), ['username', 'password', 'deviceId'])
    if (calls[1]) assert.equal(JSON.parse(calls[1].body).deviceId, authBody.deviceId)
  }
})

test('network failures retain their stage and become connection errors', async () => {
  const client = new StenciClient({ config, fetchImpl: async () => { throw new Error('socket failed') }, logger: { info() {}, error() {} } })
  await assert.rejects(client.authenticateSession('user', 'secret', 'device'), { code: 'STENCI_CONNECTION_ERROR', stage: 'auth', status: 503 })
})

test('auth token remains server-side, branch can replace it, and current token uses JWT', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ path: new URL(url).pathname, headers: options.headers })
    const path = new URL(url).pathname
    const auth = path === '/v1/auth'
    return {
      ok: true,
      status: 200,
      headers: { getSetCookie: () => auth ? ['session=private-cookie; HttpOnly; Path=/'] : [], get: () => null },
      json: async () => auth ? { user: { id: '1' }, token: 'auth-token' } : path === '/v1/me/branch' ? { token: 'branch-token' } : { identityId: '1', username: 'user' },
    }
  }
  const client = new StenciClient({ config, fetchImpl, logger: { info() {} } })
  await client.authenticateSession('user', 'password-must-not-log', 'one-device')
  assert.equal(calls[0].headers.Cookie, undefined)
  for (const call of calls.slice(1)) {
    assert.equal(call.headers.Cookie, 'session=private-cookie')
    assert.notEqual(call.headers.Authorization, 'Bearer auth-token')
  }
  assert.equal(calls[1].headers.Authorization, 'JWT auth-token')
  assert.equal(calls[2].headers.Authorization, 'JWT branch-token')
  const session = client.getSession()
  assert.equal(session.cookie, 'session=private-cookie')
  assert.equal(session.token, 'branch-token')
})

test('development auth diagnostics contain status and token presence but never credentials', async () => {
  const entries = []
  const logger = Object.fromEntries(['info', 'warn', 'error'].map((level) => [level, (...values) => entries.push(values)]))
  const previousNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
  const client = new StenciClient({ config, session: new StenciSession({ deviceId: 'stored-device', branchId: 'realmed-branch', cookie: 'private-cookie', token: 'private-token' }), logger, fetchImpl: async () => ({ ok: false, status: 401, headers: { get: () => null }, json: async () => ({ message: 'invalid', password: 'leaked-password' }) }) })
  try {
    await assert.rejects(client.authenticateSession('05286020984', 'private-password', '0123456789abcdef0123456789abcdef'), { code: 'STENCI_INVALID_CREDENTIALS' })
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
  }
  const output = JSON.stringify(entries)
  assert.match(output, /STENCI AUTH/)
  assert.match(output, /status: 401/)
  assert.doesNotMatch(output, /05286020984|private-password|leaked-password|private-cookie|private-token|authorization|cookie/i)
})

test('branch is not called when auth does not return a token', async () => {
  let calls = 0
  const client = new StenciClient({ config, fetchImpl: async () => { calls += 1; return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ user: {} }) } }, logger: { info() {} } })
  await assert.rejects(client.authenticateSession('user', 'password', 'same-device'), { code: 'STENCI_AUTH_TOKEN_MISSING', stage: 'branch', status: 401 })
  assert.equal(calls, 1)
})
