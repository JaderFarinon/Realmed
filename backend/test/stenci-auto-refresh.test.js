const test = require('node:test')
const assert = require('node:assert/strict')
const { StenciSessionStore } = require('../services/StenciSessionStore')
const {
  automaticService,
  refreshStenci,
} = require('../services/stenciRefreshService')
const { operationKey } = require('../services/transientStenciService')
const configFactory = () => ({ branchId: 'branch' })
const silent = { error() {}, info() {} }
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
test('a timed-out automatic batch still permits logout requests', async () => {
  const StenciClient = require('../../integrations/stenci/StenciClient')
  let calls = 0
  const client = new StenciClient({
    config: {
      enabled: true,
      apiXBaseUrl: 'https://x.example',
      apiBaseUrl: 'https://api.example',
      branchId: 'b',
      timeoutMs: 1000,
    },
    deadlineAt: Date.now() - 1,
    logger: silent,
    fetchImpl: async () => {
      calls++
      return { ok: true, status: 204 }
    },
  })
  await assert.rejects(client.request('/v1/patients/search'), {
    code: 'STENCI_QUERY_TIMEOUT',
  })
  assert.equal(calls, 0)
  await client.request('/v1/logout', {
    base: 'apiX',
    method: 'POST',
    stage: 'logout',
  })
  assert.equal(calls, 1)
})
function fixture() {
  const store = new StenciSessionStore(),
    session = {
      mode: 'detached',
      stenciUserId: 'external-user',
      cache: new Map(),
    },
    sid = store.create(session)
  store.setCredentials(sid, {
    username: 'private-user',
    password: 'private-session-password',
  })
  return { store, session, sid }
}
test('session credentials are authenticated ciphertext, isolated by session and removed on logout, expiry and restart', () => {
  let now = 1
  const store = new StenciSessionStore({ ttlMs: 50, now: () => now }),
    sid = store.create({ stenciUserId: 'u' }),
    other = store.create({ stenciUserId: 'u' })
  store.setCredentials(sid, { username: 'user', password: 'sensitive-secret' })
  const secret = store.sessions.get(sid).credentials
  assert.equal(JSON.stringify(store).includes('sensitive-secret'), false)
  assert.equal(
    JSON.stringify(store.get(sid)).includes('sensitive-secret'),
    false,
  )
  assert.equal(store.getCredentials(sid).password, 'sensitive-secret')
  assert.equal(secret.iv.length, 12)
  assert.equal(secret.tag.length, 16)
  store.sessions.get(other).credentials = {
    iv: Buffer.from(secret.iv),
    ciphertext: Buffer.from(secret.ciphertext),
    tag: Buffer.from(secret.tag),
  }
  assert.equal(store.getCredentials(other), null)
  const restarted = new StenciSessionStore()
  restarted.set(sid, { stenciUserId: 'u' })
  restarted.sessions.get(sid).credentials = {
    iv: Buffer.from(secret.iv),
    ciphertext: Buffer.from(secret.ciphertext),
    tag: Buffer.from(secret.tag),
  }
  assert.equal(restarted.getCredentials(sid), null)
  now = 51
  assert.equal(store.get(sid), null)
  assert.ok(secret.ciphertext.every((byte) => byte === 0))
  assert.equal(store.getCredentials(sid), null)
  store.clear()
  restarted.clear()
})
test('tampered ciphertext is rejected and deleted instead of sending corrupted credentials upstream', () => {
  const { store, sid } = fixture()
  store.sessions.get(sid).credentials.ciphertext[0] ^= 1
  assert.equal(store.getCredentials(sid), null)
  assert.equal(store.hasCredentials(sid), false)
  store.clear()
})
test('parallel catalog requests share one automatic login, logout before returning and cached lookups do not log in again', async () => {
  const { store, session, sid } = fixture()
  let logins = 0,
    logouts = 0,
    active = 0,
    max = 0
  const serviceFactory = () => ({
    authenticateUser: async (username, password) => {
      assert.equal(username, 'private-user')
      assert.equal(password, 'private-session-password')
      logins++
      active++
      max = Math.max(max, active)
      return { stenci_user_id: 'external-user' }
    },
    logout: async () => {
      assert.equal(session.cache.size, 0)
      active--
      logouts++
    },
    ...Object.fromEntries(
      ['listInsurances', 'listInsurancePlans', 'listProfessionals'].map(
        (name) => [name, async () => ({ items: [{ name }], hasMore: false })],
      ),
    ),
  })
  const api = automaticService({
    sid,
    sessionStore: store,
    configFactory,
    serviceFactory,
    logger: silent,
  })
  try {
    const values = await Promise.all([
      api.listInsurances(),
      api.listInsurancePlans(),
      api.listProfessionals(),
    ])
    assert.equal(values.length, 3)
    assert.equal(logins, 1)
    assert.equal(logouts, 1)
    assert.equal(active, 0)
    assert.equal(max, 1)
    assert.equal(session.cache.size, 3)
    await api.listInsurances()
    assert.equal(logins, 1)
    assert.equal(store.hasCredentials(sid), true)
  } finally {
    store.clear()
  }
})
test('new search terms authenticate automatically and all queued sessions are serialized', async () => {
  const { store, session, sid } = fixture()
  let active = 0,
    max = 0,
    logins = 0,
    logouts = 0
  const serviceFactory = () => ({
    authenticateUser: async () => {
      active++
      max = Math.max(max, active)
      logins++
      return { stenci_user_id: 'external-user' }
    },
    searchPatients: async (search) => {
      await delay(3)
      return { items: [{ name: search }], hasMore: false }
    },
    logout: async () => {
      active--
      logouts++
    },
  })
  const api = automaticService({
    sid,
    sessionStore: store,
    configFactory,
    serviceFactory,
    logger: silent,
  })
  try {
    const first = await api.searchPatients('Maria', { limit: 30, offset: 0 })
    assert.equal(first.items[0].name, 'Maria')
    const values = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        api.searchPatients('Paciente ' + i, { limit: 30, offset: 0 }),
      ),
    )
    assert.equal(values.length, 12)
    assert.equal(logins, 3)
    assert.equal(logouts, 3)
    assert.equal(max, 1)
    assert.equal(active, 0)
    assert.equal(store.get(sid), session)
  } finally {
    store.clear()
  }
})
test('logout failure publishes no cache, retries logout and keeps encrypted credentials for a later network retry', async () => {
  const { store, session, sid } = fixture()
  let logouts = 0
  const serviceFactory = () => ({
    authenticateUser: async () => ({ stenci_user_id: 'external-user' }),
    listInsurances: async () => ({ items: [] }),
    logout: async () => {
      logouts++
      throw Error('network down')
    },
  })
  const api = automaticService({
    sid,
    sessionStore: store,
    configFactory,
    serviceFactory,
    logger: silent,
  })
  try {
    await assert.rejects(api.listInsurances(), { code: 'STENCI_LOGOUT_FAILED' })
    assert.equal(logouts, 2)
    assert.equal(session.cache.size, 0)
    assert.equal(store.hasCredentials(sid), true)
  } finally {
    store.clear()
  }
})
test('invalid stored password and wrong external identity request credentials once without closing Realmed', async () => {
  for (const mismatch of [false, true]) {
    const { store, session, sid } = fixture()
    let logins = 0,
      logouts = 0,
      queries = 0
    const serviceFactory = () => ({
      authenticateUser: async () => {
        logins++
        if (!mismatch)
          throw Object.assign(Error('bad login'), {
            code: 'STENCI_INVALID_CREDENTIALS',
          })
        return { stenci_user_id: 'someone-else' }
      },
      listInsurances: async () => {
        queries++
        return { items: [] }
      },
      logout: async () => logouts++,
    })
    const api = automaticService({
      sid,
      sessionStore: store,
      configFactory,
      serviceFactory,
      logger: silent,
    })
    try {
      await assert.rejects(api.listInsurances(), {
        code: 'STENCI_REFRESH_REQUIRED',
        status: 428,
      })
      assert.equal(store.get(sid), session)
      assert.equal(store.hasCredentials(sid), false)
      await assert.rejects(api.listInsurances(), {
        code: 'STENCI_REFRESH_REQUIRED',
      })
      assert.equal(logins, 1)
      assert.equal(logouts, 1)
      assert.equal(queries, 0)
    } finally {
      store.clear()
    }
  }
})
test('logout during a query releases Stenci and never restores cached data or credentials', async () => {
  const { store, session, sid } = fixture()
  let logouts = 0
  const serviceFactory = () => ({
    authenticateUser: async () => ({ stenci_user_id: 'external-user' }),
    listInsurances: async () => {
      store.delete(sid)
      return { items: [] }
    },
    logout: async () => logouts++,
  })
  const api = automaticService({
    sid,
    sessionStore: store,
    configFactory,
    serviceFactory,
    logger: silent,
  })
  await assert.rejects(api.listInsurances(), { code: 'AUTH_SESSION_EXPIRED' })
  assert.equal(logouts, 1)
  assert.equal(session.cache.size, 0)
  assert.equal(store.getCredentials(sid), null)
})
test('manual reauthentication saves new credentials only after logout, then later searches reuse them automatically', async () => {
  const store = new StenciSessionStore(),
    session = {
      mode: 'detached',
      stenciUserId: 'external-user',
      cache: new Map(),
    },
    sid = store.create(session)
  let received = []
  const serviceFactory = () => ({
    authenticateUser: async (u, p) => {
      received.push([u, p])
      return { stenci_user_id: 'external-user' }
    },
    listInsurances: async () => ({ items: [] }),
    searchPatients: async () => ({ items: [], hasMore: false }),
    logout: async () => {
      if (received.length === 1) assert.equal(store.hasCredentials(sid), false)
    },
  })
  try {
    await refreshStenci({
      sid,
      sessionStore: store,
      configFactory,
      serviceFactory,
      credentials: { username: 'new-user', password: 'new-password' },
      operations: [{ name: 'listInsurances' }],
      logger: silent,
    })
    assert.equal(store.hasCredentials(sid), true)
    await automaticService({
      sid,
      sessionStore: store,
      configFactory,
      serviceFactory,
      logger: silent,
    }).searchPatients('Maria', { limit: 30, offset: 0 })
    assert.deepEqual(received, [
      ['new-user', 'new-password'],
      ['new-user', 'new-password'],
    ])
    assert.ok(
      session.cache.has(
        operationKey('searchPatients', {
          search: 'Maria',
          limit: 30,
          offset: 0,
        }),
      ),
    )
  } finally {
    store.clear()
  }
})
