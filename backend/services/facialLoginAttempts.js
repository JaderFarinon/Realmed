const LIMIT = 10
const COOLDOWN_MS = 60_000
const isFacialLoginRequest = req => req.method === 'POST' && /^\/api\/physio\/auth\/(?:challenge|face)\/?$/i.test(req.path)

function createFacialLoginAttempts({ now = Date.now } = {}) {
  const clients = new Map()
  let nextCleanup = 0
  function stateFor(req) {
    const time = now()
    if (time >= nextCleanup) {
      for (const [key, value] of clients) {
        if (!value.pending && (value.blockedUntil ? value.blockedUntil <= time : time - value.lastSeen >= 15 * 60_000)) clients.delete(key)
      }
      nextCleanup = time + COOLDOWN_MS
    }
    const key = req.ip
    let state = clients.get(key)
    if (!state || (state.blockedUntil && state.blockedUntil <= time)) {
      state = { failures: 0, pending: 0, blockedUntil: 0, lastSeen: time }
      clients.set(key, state)
    }
    state.lastSeen = time
    return state
  }
  function blocked(res, state) {
    const seconds = Math.max(1, Math.ceil((state.blockedUntil - now()) / 1000))
    return res.status(429).set('Retry-After', String(seconds)).set('Cache-Control', 'no-store').json({
      code: 'FACE_ATTEMPTS_LIMIT', retryAfterSeconds: seconds,
      error: 'Foram 10 tentativas sem sucesso. Aguarde 1 minuto; depois você terá mais 10 tentativas.',
    })
  }
  function check(req, res, next) {
    const state = stateFor(req)
    if (state.blockedUntil > now()) return blocked(res, state)
    next()
  }
  function attempt(req, res, next) {
    const state = stateFor(req)
    if (state.blockedUntil > now()) return blocked(res, state)
    // Reserve an attempt while the asynchronous recognition is running.
    if (state.failures + state.pending >= LIMIT) return res.status(503).json({ error: 'Há uma leitura em andamento. Aguarde a conclusão antes de tentar novamente.' })
    state.pending++
    let settled = false
    const json = res.json
    const release = () => { if (!settled) { settled = true; state.pending--; state.lastSeen = now() } }
    res.once('close', release)
    res.json = function (body) {
      if (!settled) {
        release()
        if (this.statusCode < 400) state.failures = 0
        else if (this.statusCode < 500 && !this.locals.faceAdditionalCheck) {
          state.failures++
          if (state.failures === LIMIT) {
            state.blockedUntil = now() + COOLDOWN_MS
            this.json = json
            return blocked(this, state)
          }
        }
      }
      return json.call(this, body)
    }
    next()
  }
  return { check, attempt }
}
module.exports = { createFacialLoginAttempts, isFacialLoginRequest }
