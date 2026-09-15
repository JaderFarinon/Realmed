const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

Object.assign(process.env, { JWT_SECRET: 'test-only-secret', DB_HOST: 'localhost', DB_USER: 'test', DB_PASS: 'test', DB_NAME: 'test', DB_PORT: '3306' })
const { getStenciConfig, publicConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const { sanitize, createIntegrationLog } = require('../services/integrationLogService')
const { createStenciRouter } = require('../routes/stenci')
const express = require('express')

test('Stenci is disabled by default and performs no HTTP request', async () => {
  let called = false
  const client = new StenciClient({ config: getStenciConfig({}), fetchImpl: async () => { called = true } })
  await assert.rejects(client.request('patients.search'), { message: 'Integração Stenci desabilitada.', code: 'STENCI_DISABLED' })
  assert.equal(called, false)
})

test('incomplete configuration and unknown endpoint fail clearly without HTTP', async () => {
  const noBase = new StenciClient({ config: getStenciConfig({ STENCI_ENABLED: 'true' }) })
  await assert.rejects(noBase.request('patients.search'), { message: 'Integração Stenci não configurada.' })
  const noEndpoint = new StenciClient({ config: getStenciConfig({ STENCI_ENABLED: 'true', STENCI_BASE_URL: 'https://example.invalid' }) })
  await assert.rejects(noEndpoint.request('patients.search'), { message: 'Endpoint do Stenci ainda não configurado.', status: 501 })
})

test('public configuration and log sanitizer never expose secrets', () => {
  const config = getStenciConfig({ STENCI_ENABLED: 'true', STENCI_BASE_URL: 'https://example.invalid', STENCI_USERNAME: 'user', STENCI_PASSWORD: 'secret', STENCI_TOKEN: 'token' })
  assert.deepEqual(publicConfig(config), { enabled: true, base_url_configured: true, authentication_configured: true, endpoints_configured: false })
  assert.deepEqual(sanitize({ token: 'x', nested: { cookie: 'y', safe: 1 }, authorizationHeader: 'z' }), { nested: { safe: 1 } })
  assert.equal(JSON.stringify(publicConfig(config)).includes('secret'), false)
})

test('integration log is persisted with sanitized metadata', async () => {
  let inserted
  const db = () => ({ insert: async (value) => { inserted = value } })
  await createIntegrationLog(db, { integration: 'STENCI', operation: 'TEST', status: 'SUCCESS', metadata: { token: 'hidden', count: 2 } })
  assert.deepEqual(JSON.parse(inserted.metadata), { count: 2 })
})

test('report contracts return 501 and administrative permission is enforced', async () => {
  const db = () => ({ insert: async () => {} })
  const app = express()
  app.use(express.json(), createStenciRouter({ db }))
  const server = app.listen(0)
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    assert.equal((await fetch(`${base}/assessments`)).status, 401)
    const regularToken = jwt.sign({ id: 2, role: 'cac' }, process.env.JWT_SECRET)
    assert.equal((await fetch(`${base}/assessments`, { headers: { Authorization: `Bearer ${regularToken}` } })).status, 403)
    const token = jwt.sign({ id: 1, role: 'masteradmin' }, process.env.JWT_SECRET)
    for (const path of ['/assessments?start_date=2026-01-01&patient=A', '/completed-treatments?insurance=B']) {
      const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } })
      assert.equal(response.status, 501)
      assert.deepEqual(await response.json(), { error: 'Endpoint do Stenci ainda não configurado.' })
    }
  } finally { server.close() }
})

test('network and invalid responses become controlled errors', async () => {
  const config = { enabled: true, baseUrl: 'https://example.invalid', timeoutMs: 50, endpoints: { test: '/test' } }
  const network = new StenciClient({ config, fetchImpl: async () => { throw new Error('socket details') } })
  await assert.rejects(network.request('test'), { code: 'STENCI_NETWORK_ERROR', status: 503 })
  const invalid = new StenciClient({ config, fetchImpl: async () => ({ ok: true, json: async () => { throw new Error('invalid') } }) })
  await assert.rejects(invalid.request('test'), { code: 'STENCI_INVALID_RESPONSE', status: 502 })
})
