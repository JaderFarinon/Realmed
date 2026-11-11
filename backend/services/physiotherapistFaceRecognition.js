const crypto = require('node:crypto')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const { MATCH_OPTIONS, MATCH_THRESHOLD, MIN_CONFIRMATIONS, captureIndexes, isUsable, matchingUser, confirmedUser, shadowCorrection, motionSignature, motionDifference } = require('./physiotherapistFacePolicy')
let runtimePromise
let analysisTail = Promise.resolve()
let analysisPending = 0

function exclusiveAnalysis(work) {
  if (analysisPending >= 4) return Promise.reject(Object.assign(new Error('O reconhecimento está ocupado. Aguarde um instante e tente novamente.'), { status: 503, code: 'FACE_BUSY' }))
  analysisPending++
  const task = analysisTail.then(work).finally(() => { analysisPending-- })
  analysisTail = task.catch(() => {})
  return task
}

function encryptionKey() {
  const value = String(process.env.REALMED_BIOMETRY_KEY || '').trim()
  const key = Buffer.from(value, 'base64')
  if (!value || key.length !== 32) {
    key.fill(0)
    throw Object.assign(new Error('A chave de criptografia biométrica não está configurada.'), { code: 'BIOMETRY_KEY_REQUIRED', status: 503 })
  }
  return key
}

function encryptTemplates(userId, templates) {
  const key = encryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(`realmed-face-v1:${userId}`))
  const input = Buffer.from(JSON.stringify(templates))
  try {
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()])
    return { encrypted_templates: encrypted.toString('base64'), iv: iv.toString('hex'), auth_tag: cipher.getAuthTag().toString('hex') }
  } finally {
    input.fill(0)
    key.fill(0)
  }
}

function decryptTemplates(row) {
  const key = encryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(row.iv, 'hex'))
  decipher.setAAD(Buffer.from(`realmed-face-v1:${row.user_id}`))
  decipher.setAuthTag(Buffer.from(row.auth_tag, 'hex'))
  const ciphertext = Buffer.from(row.encrypted_templates, 'base64')
  let plaintext
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    const templates = JSON.parse(plaintext.toString('utf8'))
    if (!Array.isArray(templates) || !templates.length || templates.some((v) => !Array.isArray(v) || v.length !== 1024 || v.some((n) => !Number.isFinite(n))))
      throw new Error('Invalid face template')
    return templates
  } finally {
    key.fill(0)
    ciphertext.fill(0)
    plaintext?.fill(0)
  }
}

async function runtime() {
  if (!runtimePromise) runtimePromise = (async () => {
    const tf = require('@tensorflow/tfjs-node')
    const Human = require('@vladmandic/human').default
    const packageDirectory = path.resolve(path.dirname(require.resolve('@vladmandic/human')), '..')
    const modelsDirectory = pathToFileURL(path.join(packageDirectory, 'models') + path.sep).href
    const human = new Human({
      backend: 'tensorflow',
      modelBasePath: modelsDirectory,
      warmup: 'face',
      cacheSensitivity: 0,
      filter: { enabled: false, return: false, autoBrightness: false },
      face: {
        enabled: true,
        detector: { rotation: true, maxDetected: 2, minConfidence: 0.6, skipFrames: 0, skipTime: 0, return: false },
        mesh: { enabled: true, skipFrames: 0, skipTime: 0 },
        iris: { enabled: false },
        emotion: { enabled: false },
        description: { enabled: true, skipFrames: 0, skipTime: 0 },
        antispoof: { enabled: true, skipFrames: 0, skipTime: 0 },
        liveness: { enabled: true, skipFrames: 0, skipTime: 0 },
      },
      gesture: { enabled: true },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
    })
    await human.load()
    const warmup = await human.warmup()
    clearResult(warmup)
    return { tf, human }
  })()
  try {
    return await runtimePromise
  } catch (error) {
    runtimePromise = null
    throw error
  }
}

function clearResult(result) {
  result?.face?.forEach(face => face.embedding?.fill(0))
  if (result?.face) result.face.length = 0
}

async function prepare() { await runtime() }

function decodeFrame(input) {
  if (typeof input !== 'string' || input.length > 220_000) throw Object.assign(new Error('Imagem facial inválida.'), { status: 422 })
  const base64 = input.replace(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, '')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length < 100) throw Object.assign(new Error('Imagem facial inválida.'), { status: 422 })
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > 160_000) throw Object.assign(new Error('Imagem facial muito grande.'), { status: 413 })
  return buffer
}

async function analyzeFrame(input) {
  const { tf, human } = await runtime()
  const bytes = decodeFrame(input)
  let tensor
  let result
  let signature
  try {
    tensor = tf.node.decodeImage(bytes, 3)
    const [height, width] = tensor.shape
    if (!width || !height || width * height > 1280 * 1280) throw Object.assign(new Error('Resolução da captura inválida.'), { status: 422, code: 'FACE_CAPTURE_INVALID' })
    const pixels = tensor.dataSync()
    signature = motionSignature(pixels, width, height)
    const corrected = shadowCorrection(pixels, width, height)
    if (corrected) {
      const adjusted = tf.tensor3d(corrected, tensor.shape, 'int32')
      corrected.fill(0)
      tensor.dispose()
      tensor = adjusted
    }
    result = await human.detect(tensor)
    const faces = result.face || []
    if (faces.length > 1) throw Object.assign(new Error('Mantenha apenas uma pessoa na frente da câmera.'), { status: 422, code: 'FACE_MULTIPLE' })
    if (!faces.length) throw Object.assign(new Error('Aproxime o rosto da câmera e tente novamente.'), { status: 422, code: 'FACE_COUNT_INVALID' })
    const face = faces[0]
    const embedding = face.embedding
    if (!Array.isArray(embedding) || embedding.length !== 1024 || embedding.some((value) => !Number.isFinite(value)))
      throw Object.assign(new Error('Não foi possível ler o rosto. Ajuste a iluminação e tente novamente.'), { status: 422, code: 'FACE_QUALITY_LOW' })
    const frame = {
      embedding: [...embedding],
      signature,
      confidence: Number(face.score || face.faceScore || face.boxScore || 0),
      real: Number(face.real || 0),
      live: Number(face.live || 0),
      blink: Object.values(result.gesture || {}).some(item => /blink/i.test(item.gesture || '')),
    }
    signature = null
    return frame
  } finally {
    signature?.fill(0)
    clearResult(result)
    if (tensor) tf.dispose(tensor)
    bytes.fill(0)
  }
}

async function enrollmentTemplates(images) {
  if (!Array.isArray(images) || images.length !== 3) throw Object.assign(new Error('Capture três imagens do rosto: de frente, levemente para a esquerda e para a direita.'), { status: 422 })
  return exclusiveAnalysis(async () => {
    const frames = []
    try {
      for (const image of images) {
        const frame = await analyzeFrame(image)
        frame.signature.fill(0)
        frames.push(frame.embedding)
        if (frame.confidence < 0.6) throw Object.assign(new Error('A imagem ficou pouco nítida. Aproxime o rosto e tente novamente.'), { status: 422, code: 'FACE_QUALITY_LOW' })
      }
      return frames
    } catch (error) { frames.forEach(frame => frame.fill(0)); throw error }
  })
}

async function authenticateFrames(images, { requireBlink = false } = {}) {
  if (!Array.isArray(images) || images.length < (requireBlink ? 8 : 4) || images.length > 20 || images.some(image => typeof image !== 'string' || image.length > 220_000))
    throw Object.assign(new Error('Não foi possível validar a captura. Toque em Entrar e tente novamente.'), { status: 422 })
  return exclusiveAnalysis(async () => {
    const descriptors = [], signatures = [], seen = new Set()
    let blink = false, eyesWereOpen = false, blinkStarted = false
    try {
      const indexes = requireBlink ? images.map((_, index) => index) : captureIndexes(images.length)
      for (const index of indexes) {
        // Identical uploaded bytes do not count as independent confirmations.
        const fingerprint = crypto.createHash('sha256').update(images[index]).digest('hex')
        if (seen.has(fingerprint)) continue
        seen.add(fingerprint)
        let frame
        try { frame = await analyzeFrame(images[index]) } catch (error) {
          if (error.code === 'FACE_COUNT_INVALID' || error.code === 'FACE_QUALITY_LOW') continue
          throw error
        }
        if (!isUsable(frame)) { frame.embedding.fill(0); frame.signature.fill(0); continue }
        if (frame.blink && eyesWereOpen) blinkStarted = true
        if (!frame.blink) { if (blinkStarted) blink = true; eyesWereOpen = true }
        signatures.push(frame.signature)
        if (!frame.blink && descriptors.length < 3) descriptors.push(frame.embedding)
        else frame.embedding.fill(0)
        if (requireBlink ? blink && descriptors.length >= MIN_CONFIRMATIONS : descriptors.length === 3) break
      }
      if (!requireBlink && descriptors.length && !signatures.some((signature, index) => index > 0 && motionDifference(signatures[0], signature) >= .0005))
        throw Object.assign(new Error('Precisamos de uma confirmação adicional. Toque em Confirmar e pisque uma vez.'), { status: 401, code: 'FACE_MOTION_REQUIRED' })
      if (descriptors.length < MIN_CONFIRMATIONS)
        throw Object.assign(new Error('Não foi possível confirmar seu rosto. Aproxime-se da câmera; se houver luz forte atrás, ajuste um pouco o tablet.'), { status: 401, code: 'FACE_LIVENESS_FAILED' })
      if (requireBlink && !blink) throw Object.assign(new Error('Não percebemos a piscada. Toque em Entrar para tentar novamente.'), { status: 401, code: 'FACE_CHALLENGE_FAILED' })
      return descriptors
    } catch (error) { descriptors.forEach(descriptor => descriptor.fill(0)); throw error }
    finally { signatures.forEach(signature => signature.fill(0)) }
  })
}

async function matchDescriptors(queries, rows) {
  const { human } = await runtime()
  const candidates = queries.map(() => [])
  try {
    for (const row of rows) {
      const templates = decryptTemplates(row)
      try {
        queries.forEach((query, index) => {
          let similarity = 0
          for (const template of templates) similarity = Math.max(similarity, human.match.find(query, [template], MATCH_OPTIONS).similarity)
          candidates[index].push({ userId: row.user_id, similarity })
        })
      } finally { templates.forEach(template => template.fill(0)) }
    }
    return confirmedUser(candidates.map(matchingUser))
  } finally {
    queries.forEach(query => query.fill(0))
  }
}

module.exports = {
  encryptTemplates,
  decryptTemplates,
  enrollmentTemplates,
  authenticateFrames,
  matchDescriptors,
  prepare,
  MATCH_THRESHOLD,
}
