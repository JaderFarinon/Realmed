const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const policy = require('../services/physiotherapistFacePolicy')

const captures = (count = 6) => Array.from({ length: count }, (_, i) => `data:image/jpeg;base64,${Buffer.alloc(96, i + 1).toString('base64')}`)
const descriptor = (id = 1) => Array(1024).fill(id)
const face = (overrides = {}) => ({ score: .9, real: .9, live: .9, embedding: descriptor(), ...overrides })
function fixture() {
  const state = { configs: [], calls: 0, active: 0, peak: 0, disposed: 0, results: [], queue: [], delay: 0 }
  const tensor = (bytes = [1]) => ({ shape: [8, 8, 3], dataSync: () => Uint8Array.from({ length: 192 }, (_, i) => 100 + ((Math.floor(i / 3) % 8 + bytes[0]) % 8 < 4 ? 80 : 0)), dispose: () => { state.disposed++ } })
  const tf = { node: { decodeImage: tensor }, tensor3d: tensor, dispose: t => t.dispose() }
  class Human {
    constructor(config) { state.configs.push(config); this.match = { find: (query, [template]) => ({ similarity: query[0] === template[0] ? .85 : .1 }) } }
    async load() {}
    async warmup() { return { face: [] } }
    async detect() {
      state.calls++; state.active++; state.peak = Math.max(state.peak, state.active)
      try {
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay))
        const result = state.queue.length ? state.queue.shift() : { face: [face()] }
        if (result instanceof Error) throw result
        state.results.push(...(result.face || []).map(f => f.embedding))
        return result
      } finally { state.active-- }
    }
  }
  const filename = path.resolve(__dirname, '../services/physiotherapistFaceRecognition.js')
  const originalRequire = createRequire(filename)
  const requireMock = Object.assign(name => name === '@tensorflow/tfjs-node' ? tf : name === '@vladmandic/human' ? { default: Human } : originalRequire(name), { resolve: originalRequire.resolve })
  const context = { require: requireMock, module: { exports: {} }, Buffer, process: { env: { REALMED_BIOMETRY_KEY: Buffer.alloc(32, 7).toString('base64') } } }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename })
  return { service: context.module.exports, state }
}

test('face login uses passive checks, independent frames and unchanged identity boundaries', async () => {
  const { service, state } = fixture()
  const queries = await service.authenticateFrames(captures())
  assert.equal(queries.length, 3)
  assert.equal(state.calls, 3)
  assert.equal(state.configs[0].face.detector.rotation, true)
  assert.equal(state.configs[0].face.iris.enabled, false)
  assert.equal(state.configs[0].face.emotion.enabled, false)
  assert.equal(state.configs[0].face.antispoof.enabled, true)
  assert.equal(state.configs[0].face.liveness.enabled, true)
  assert.equal(state.configs[0].cacheSensitivity, 0)
  assert.equal(state.configs[0].face.detector.skipFrames, 0)
  assert.equal(state.configs[0].gesture.enabled, true)
  assert.equal(service.MATCH_THRESHOLD, .5)
  assert.ok(state.results.every(d => d.every(value => value === 0)), 'library result descriptors wiped')
  assert.ok(queries.every(d => d[0] === 1), 'returned independent copies retained for comparison')
  const row = { user_id: 10, ...service.encryptTemplates(10, [descriptor()]) }
  assert.equal(await service.matchDescriptors(queries, [row]), 10)
  assert.ok(queries.every(d => d.every(value => value === 0)))
  assert.equal(state.disposed, 3)
})

test('bad transient frames are skipped but two passive confirmations remain mandatory', async () => {
  const { service, state } = fixture()
  state.queue = [{ face: [] }, { face: [face({ real: .2 })] }, { face: [face({ live: .3 })] }, { face: [face()] }, { face: [face()] }, { face: [] }]
  const queries = await service.authenticateFrames(captures())
  assert.equal(queries.length, 2)
  assert.equal(state.calls, 6)
  assert.ok(queries.every(d => d[0] === 1))
})

test('spoof, replayed identical bytes, multiple faces and insufficient live frames fail closed', async () => {
  for (const bad of [{ real: .59 }, { live: .59 }, { score: .59 }, { real: NaN }]) {
    const { service, state } = fixture()
    state.queue = captures().map(() => ({ face: [face(bad)] }))
    await assert.rejects(service.authenticateFrames(captures()), { code: 'FACE_LIVENESS_FAILED' })
    assert.ok(state.results.every(d => d.every(value => value === 0)))
  }
  const replay = fixture()
  await assert.rejects(replay.service.authenticateFrames(Array(6).fill(captures()[0])), { code: 'FACE_MOTION_REQUIRED' })
  assert.equal(replay.state.calls, 1)
  const multiple = fixture()
  multiple.state.queue = [{ face: [face()] }, { face: [face(), face({ embedding: descriptor(2) })] }]
  await assert.rejects(multiple.service.authenticateFrames(captures()), { code: 'FACE_MULTIPLE' })
  assert.ok(multiple.state.results.every(d => d.every(value => value === 0)))
})

test('identity must agree on at least two frames; ambiguity and different users cannot open a session', async () => {
  assert.equal(policy.matchingUser([{ userId: 1, similarity: .49 }]), null)
  assert.equal(policy.matchingUser([{ userId: 1, similarity: .75 }, { userId: 2, similarity: .73 }]), null)
  assert.equal(policy.confirmedUser([1, null, 1]), 1)
  assert.equal(policy.confirmedUser([1, 2, 1]), null)
  assert.equal(policy.confirmedUser([1, null, null]), null)
  const { service } = fixture()
  const rows = [1, 2].map(id => ({ user_id: id, ...service.encryptTemplates(id, [descriptor(id)]) }))
  assert.equal(await service.matchDescriptors([descriptor(1), descriptor(2), descriptor(1)], rows), null)
  assert.equal(await service.matchDescriptors([descriptor(8), descriptor(8)], rows), null)
  const queries = [descriptor(), descriptor()]
  await assert.rejects(service.matchDescriptors(queries, [{ ...rows[0], auth_tag: '00'.repeat(16) }]))
  assert.ok(queries.every(d => d.every(value => value === 0)))
})

test('inference is serialized across users and enrollment; overload is bounded and failures release the queue', async () => {
  const { service, state } = fixture()
  state.delay = 5
  const pending = [service.authenticateFrames(captures()), service.enrollmentTemplates(captures(3)), service.authenticateFrames(captures()), service.authenticateFrames(captures())]
  await assert.rejects(service.authenticateFrames(captures()), { code: 'FACE_BUSY' })
  await Promise.all(pending)
  assert.equal(state.peak, 1)
  state.queue.push(new Error('test inference failure'))
  await assert.rejects(service.authenticateFrames(captures()), /test inference failure/)
  assert.equal((await service.authenticateFrames(captures())).length, 3)
})

test('capture limits reject malformed requests and older 16-frame clients use at most six analyses', async () => {
  const { service, state } = fixture()
  for (const invalid of [null, [], captures(3), captures(21), [null, ...captures(5)], ['x'.repeat(220001), ...captures(5)]])
    await assert.rejects(service.authenticateFrames(invalid), { status: 422 })
  assert.equal(state.calls, 0)
  await service.authenticateFrames(captures(16))
  assert.equal(state.calls, 3)
})

test('shadow compensation targets central exposure, preserves highlights and leaves normal/black input unchanged', () => {
  const width = 80, height = 60
  const normal = new Uint8Array(width * height * 3).fill(120)
  assert.equal(policy.shadowCorrection(normal, width, height), null)
  assert.equal(policy.shadowCorrection(new Uint8Array(normal.length), width, height), null)
  const backlit = new Uint8Array(normal.length).fill(255)
  for (let y = 0; y < height; y++) for (let x = 20; x < 60; x++) for (let c = 0; c < 3; c++) backlit[(y * width + x) * 3 + c] = 40
  const corrected = policy.shadowCorrection(backlit, width, height)
  assert.ok(corrected[30 * 3] > 40 && corrected[30 * 3] <= 100)
  assert.equal(corrected[0], 255)
  assert.equal(backlit[30 * 3], 40, 'source bytes preserved')
})

test('static images with exposure changes require a gesture; an active challenge cannot be passed without blinking', async () => {
  const pixels = Uint8Array.from({ length: 80 * 60 * 3 }, (_, i) => 35 + (Math.floor(i / 3) % 80))
  const shifted = Uint8Array.from(pixels, value => value * 2 + 10)
  const a = policy.motionSignature(pixels, 80, 60), b = policy.motionSignature(shifted, 80, 60)
  assert.ok(policy.motionDifference(a, b) < .0005)
  const noBlink = fixture()
  await assert.rejects(noBlink.service.authenticateFrames(captures(16), { requireBlink: true }), { code: 'FACE_CHALLENGE_FAILED' })
  const blink = fixture()
  blink.state.queue = [{ face: [face()] }, { face: [face()], gesture: [{ gesture: 'blink left eye' }] }, { face: [face()] }]
  assert.equal((await blink.service.authenticateFrames(captures(16), { requireBlink: true })).length, 2)
  const wink = fixture()
  wink.state.queue = [{ face: [face()], gesture: [{ gesture: 'blink left eye' }] }, ...Array.from({ length: 15 }, () => ({ face: [face()] }))]
  await assert.rejects(wink.service.authenticateFrames(captures(16), { requireBlink: true }), { code: 'FACE_CHALLENGE_FAILED' }, 'closing before the sequence does not count as an open/closed/open blink')
})
