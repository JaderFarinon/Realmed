const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

Object.assign(process.env, { JWT_SECRET: 'test-only-secret', DB_HOST: 'localhost', DB_USER: 'test', DB_PASS: 'test', DB_NAME: 'test', DB_PORT: '3306' })
const authMiddleware = require('../middleware/auth')
const { createApp } = require('../app')

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
}

test('health endpoint starts without exposing storage', async () => {
  const server = createApp().listen(0)
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const health = await fetch(`${base}/api/health`)
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { status: 'ok' })
    assert.equal((await fetch(`${base}/storage/documents/example.pdf`)).status, 404)
  } finally { server.close() }
})

test('authentication middleware rejects missing tokens', () => {
  const res = response()
  let called = false
  authMiddleware({ headers: {} }, res, () => { called = true })
  assert.equal(res.statusCode, 401)
  assert.equal(called, false)
})

test('authentication middleware accepts a valid bearer token', async () => {
  const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET)
  const req = { headers: { authorization: `Bearer ${token}` } }
  await new Promise((resolve, reject) => {
    authMiddleware(req, response(), resolve)
    setTimeout(() => reject(new Error('middleware timeout')), 100)
  })
  assert.equal(req.user.id, 1)
})
