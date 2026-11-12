const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const express = require('express')

async function setup() {
  const state = { user: { id: 41, username: 'physio-test', role: 'user', status: 'active', professional_id: 7 }, fail: false, matched: true, descriptors: [], filters: [], writes: 0, clock: 0, options: [] }
  const knex = table => {
    const builder = {
      join: () => builder,
      where: conditions => { state.filters.push(conditions); return builder },
      whereRaw: () => builder,
      select: async () => [{ user_id: 41 }],
      first: async () => state.user,
      update: async () => { state.writes++ },
    }
    assert.ok(['physiotherapist_face_biometrics as b', 'users as u', 'users'].includes(table), table)
    return builder
  }
  knex.fn = { now: () => new Date() }
  const filename = path.resolve(__dirname, '../routes/physiotherapist-mode.js')
  const originalRequire = createRequire(filename)
  const dependencies = {
    '../services/physioStenciSession': {createPhysioSession:async()=>({sid:'test-sid',developmentMode:true}),serializePhysioStenci:task=>task()},
    '../services/facialLoginAttempts': { createFacialLoginAttempts: () => require('../services/facialLoginAttempts').createFacialLoginAttempts({now:()=>Date.now()+state.clock}) },
    './guide-center': { knex },
    './auth': { publicUser: user => ({ id: user.id, username: user.username, role: user.role }) },
    '../middleware/auth': (_req, res) => res.sendStatus(401),
    '../services/StenciSessionStore': { stenciSessionStore: { create: () => 'test-sid', limitExpiration: () => true, delete: () => {} } },
    '../services/physiotherapistFaceRecognition': {
      authenticateFrames: async (_images, options) => {
        state.options.push(options)
        if (state.fail === 'motion') throw Object.assign(new Error('Extra check'), { status: 401, code: 'FACE_MOTION_REQUIRED' })
        if (state.fail === 'busy') throw Object.assign(new Error('Server busy'), { status: 503, code: 'FACE_BUSY' })
        if (state.fail) throw Object.assign(new Error('Face rejected'), { status: 401 })
        const queries = [Array(1024).fill(1), Array(1024).fill(1)]
        state.descriptors.push(...queries)
        return queries
      },
      matchDescriptors: async () => state.matched ? 41 : null,
    },
  }
  class Clock extends Date { static now() { return Date.now() + state.clock } }
  const context = { require: name => dependencies[name] || originalRequire(name), module: { exports: {} }, Buffer, Date: Clock, console, process: { env: { NODE_ENV: 'test', STENCI_FISIO_DEV_BYPASS: 'true', JWT_SECRET: 'test-only-physio-secret' } } }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename })
  const app = express(); app.use(express.json()); app.use('/api/physio', context.module.exports)
  const server = app.listen(0)
  const call = async (endpoint, body = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/physio/auth/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    return { status: response.status, body: await response.json(), retry: response.headers.get('retry-after') }
  }
  return { state, call, close: () => new Promise(resolve => server.close(resolve)) }
}

test('facial API keeps disposable/expiring challenges, active-professional checks and descriptor cleanup', async () => {
  const { state, call, close } = await setup()
  try {
    const challenge = await call('challenge')
    assert.equal(challenge.body.instruction, 'look')
    assert.equal(challenge.body.capture.frames, 6)
    assert.equal((await call('face', { challenge: challenge.body.id })).status, 200)
    assert.equal((await call('face', { challenge: challenge.body.id })).status, 401)
    assert.ok(state.descriptors.every(d => d.every(x => x === 0)))
    assert.ok(state.filters.some(f => f['u.status'] === 'active' && f['u.role'] === 'user' && f['p.active'] === 1))
    assert.ok(state.filters.some(f => f['u.id'] === 41 && f['pr.active'] === 1))
    const expired = await call('challenge'); state.clock += 31000
    assert.equal((await call('face', { challenge: expired.body.id })).status, 401)
    state.user = null
    assert.equal((await call('face', { challenge: (await call('challenge')).body.id })).status, 401)
    state.matched = false
    assert.equal((await call('face', { challenge: (await call('challenge')).body.id })).status, 401)
    assert.equal(state.writes, 1)
    assert.ok(state.descriptors.every(d => d.every(x => x === 0)))
  } finally { await close() }
})

test('only the server chooses the extra gesture, with a fresh single-use challenge', async () => {
  const { state, call, close } = await setup()
  try {
    state.fail = 'motion'
    const first = await call('challenge')
    const fallback = await call('face', { challenge: first.body.id })
    assert.equal(fallback.body.code, 'FACE_MOTION_REQUIRED')
    assert.equal(fallback.body.challenge.instruction, 'blink')
    assert.notEqual(fallback.body.challenge.id, first.body.id)
    state.fail = false
    assert.equal((await call('face', { challenge: fallback.body.challenge.id, requireBlink: false })).status, 200)
    assert.equal(state.options.at(-1).requireBlink, true)
    assert.equal((await call('face', { challenge: fallback.body.challenge.id })).status, 401)
  } finally { await close() }
})

test('shared tablet successes and extra gesture do not consume failed-login quota', async () => {
  const { state, call, close } = await setup()
  try {
    for (let i = 0; i < 11; i++) {
      const challenge = await call('challenge')
      state.fail = i % 2 ? 'motion' : false
      const response = await call('face', { challenge: challenge.body.id })
      if (state.fail) {
        assert.equal(response.body.code, 'FACE_MOTION_REQUIRED')
        state.fail = false
        assert.equal((await call('face', { challenge: response.body.challenge.id })).status, 200)
      } else assert.equal(response.status, 200)
    }
    state.fail = true
    for (let i = 0; i < 9; i++) assert.equal((await call('face', { challenge: (await call('challenge')).body.id })).status, 401)
    const blocked = await call('face', { challenge: (await call('challenge')).body.id })
    assert.equal(blocked.status, 429)
    assert.equal(Number(blocked.retry), 60)
    assert.equal(state.writes, 11)
  } finally { await close() }
})

test('facial API restores ten attempts after a fixed minute and blocks both public endpoints meanwhile', async () => {
  const { state, call, close } = await setup()
  try {
    state.fail = 'busy'
    for(let i=0;i<11;i++)assert.equal((await call('face',{challenge:(await call('challenge')).body.id})).status,503)
    state.fail = true
    for(let i=0;i<9;i++)assert.equal((await call('face',{challenge:(await call('challenge')).body.id})).status,401)
    const tenth=await call('face',{challenge:(await call('challenge')).body.id})
    assert.equal(tenth.status,429);assert.equal(tenth.retry,'60');assert.equal(tenth.body.code,'FACE_ATTEMPTS_LIMIT')
    state.clock+=30000
    for(const endpoint of ['challenge','face']){const blocked=await call(endpoint);assert.equal(blocked.status,429);assert.ok(Number(blocked.retry)<=30)}
    state.clock+=30000
    assert.equal((await call('challenge')).status,200)
    for(let i=0;i<9;i++)assert.equal((await call('face',{challenge:'invalid'})).status,401)
    assert.equal((await call('face',{challenge:'invalid'})).retry,'60')
    state.clock+=60000
    state.fail=false
    assert.equal((await call('face',{challenge:(await call('challenge')).body.id})).status,200)
  } finally { await close() }
})

test('challenge flood has a separate wait of at most one minute', async () => {
  const { call, close } = await setup()
  try {
    for(let i=0;i<30;i++)assert.equal((await call('challenge')).status,200)
    const response=await call('challenge');assert.equal(response.status,429);assert.ok(Number(response.retry)>0&&Number(response.retry)<=60)
  } finally { await close() }
})
