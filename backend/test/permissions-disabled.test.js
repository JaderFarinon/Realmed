const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const jwt = require('jsonwebtoken')

Object.assign(process.env, { JWT_SECRET: 'permissions-test-secret', DB_HOST: 'localhost', DB_USER: 'test', DB_PASS: 'test', DB_NAME: 'test', DB_PORT: '3306' })
const auth = require('../middleware/auth')
const { modulePermission } = require('../middleware/permission')

test('disabled module permissions allow authenticated operational routes but preserve auth', async () => {
  const previous = process.env.PERMISSIONS_ENABLED
  process.env.PERMISSIONS_ENABLED = 'false'
  const app = express()
  app.use(auth)
  for (const path of ['/dashboard', '/insurance-providers', '/professionals', '/integrations/stenci/patients/search']) {
    app.get(path, modulePermission('guide_processes', 'create'), (_req, res) => res.json({ reached: true }))
  }
  const server = app.listen(0)
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const token = jwt.sign({ id: 99, sid: 'sid-without-permissions', role: 'user' }, process.env.JWT_SECRET)
    for (const path of ['/dashboard', '/insurance-providers?active=true', '/professionals?active=true', '/integrations/stenci/patients/search?search=teste']) {
      const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } })
      assert.equal(response.status, 200, path)
      assert.deepEqual(await response.json(), { reached: true })
    }
    assert.equal((await fetch(`${base}/dashboard`)).status, 401)
  } finally {
    server.close()
    if (previous === undefined) delete process.env.PERMISSIONS_ENABLED
    else process.env.PERMISSIONS_ENABLED = previous
  }
})
