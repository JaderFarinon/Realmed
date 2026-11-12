const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

process.env.DB_HOST ||= 'localhost'
process.env.DB_USER ||= 'test'
process.env.DB_PASS ||= 'test'
process.env.DB_NAME ||= 'test'
process.env.JWT_SECRET = 'test-only-local-auth-secret'

const { createAuthRouter } = require('../routes/auth')
const { StenciSessionStore } = require('../services/StenciSessionStore')

async function withServer(router, callback) {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', router)
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await callback(`http://127.0.0.1:${server.address().port}`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

function localDb(user,professional=null,notifications=[]) {
  return {
    query: async (sql,args) => {
      if (sql.includes('FROM physiotherapist_user_links')) return [professional?[professional]:[]]
      if (sql.includes('INSERT INTO system_notifications')) { notifications.push(args);return [{insertId:1}] }
      if (sql.includes("u.auth_provider = 'LOCAL'")) return [[user]]
      if (sql.includes('UPDATE users SET last_login')) return [{ affectedRows: 1 }]
      if (sql.includes('FROM users u LEFT JOIN people')) return [[user]]
      if (sql.includes('FROM user_permissions')) return [[]]
      return [[]]
    },
  }
}

test('local accounts authenticate in Realmed without creating a Stenci session', async () => {
  const passwordHash = await bcrypt.hash('realmed-local-pass-123', 4)
  const user = {
    id: 31,
    username: 'local.operator',
    role: 'user',
    status: 'active',
    person_id: 12,
    auth_provider: 'LOCAL',
    password_hash: passwordHash,
    full_name: 'Operador Local',
    email: 'local@example.test',
  }
  let stenciCalls = 0
  const sessionStore = new StenciSessionStore({ ttlMs: 60_000 })
  const router = createAuthRouter({
    db: localDb(user),
    jwtSecret: process.env.JWT_SECRET,
    sessionStore,
    configFactory: () => { stenciCalls += 1; throw new Error('Stenci must not be initialized') },
    serviceFactory: () => { stenciCalls += 1; throw new Error('Stenci must not be initialized') },
  })

  await withServer(router, async (base) => {
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, password: 'realmed-local-pass-123' }),
    })
    assert.equal(login.status, 200)
    const result = await login.json()
    const claims = jwt.verify(result.token, process.env.JWT_SECRET)
    assert.equal(claims.id, user.id)
    assert.equal(claims.authProvider, 'LOCAL')
    assert.equal(claims.sid, undefined)
    assert.equal(result.user.authProvider, 'LOCAL')
    assert.equal(sessionStore.sessions.size, 0)

    const me = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${result.token}` },
    })
    assert.equal(me.status, 200)
    assert.equal((await me.json()).user.authProvider, 'LOCAL')
  })
  assert.equal(stenciCalls, 0)
})

test('physiotherapist local password login exposes only its link and records an admin notification on success',async()=>{
  const user={id:71,username:'physio-local',role:'user',status:'active',auth_provider:'LOCAL',password_hash:await bcrypt.hash('physio-local-test-password',4),full_name:'Fisio fictício'};
  const notifications=[],router=createAuthRouter({db:localDb(user,{professional_id:8,professional_name:'Profissional fictício'},notifications),jwtSecret:process.env.JWT_SECRET,configFactory:()=>{throw new Error('Local password must not be sent to Stenci')}});
  await withServer(router,async base=>{
    const login=password=>fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.username,password})});
    assert.equal((await login('wrong')).status,401);assert.equal(notifications.length,0);
    const response=await login('physio-local-test-password');assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.user.physiotherapistId,8);assert.equal(jwt.decode(data.token).sid,undefined);
    assert.equal(notifications.length,1);assert.equal(notifications[0][0],'PHYSIO_PASSWORD_LOGIN');assert.equal(notifications[0][4],71);
    assert.ok(!JSON.stringify(notifications).includes('physio-local-test-password'));
  });
})

test('local account rejects incorrect password and disabled users without Stenci fallback', async () => {
  const passwordHash = await bcrypt.hash('realmed-local-pass-123', 4)
  let stenciCalls = 0
  for (const [status, password, expected] of [
    ['active', 'wrong-password', 401],
    ['blocked', 'realmed-local-pass-123', 403],
  ]) {
    const user = {
      id: 44,
      username: 'local.staff',
      role: 'user',
      status,
      person_id: 15,
      auth_provider: 'LOCAL',
      password_hash: passwordHash,
      full_name: 'Equipe Local',
    }
    const router = createAuthRouter({
      db: localDb(user),
      jwtSecret: process.env.JWT_SECRET,
      configFactory: () => { stenciCalls += 1; throw new Error('Unexpected Stenci login') },
      serviceFactory: () => { stenciCalls += 1; throw new Error('Unexpected Stenci login') },
    })
    await withServer(router, async (base) => {
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password }),
      })
      assert.equal(response.status, expected)
      assert.equal((await response.json()).token, undefined)
    })
  }
  assert.equal(stenciCalls, 0)
})
