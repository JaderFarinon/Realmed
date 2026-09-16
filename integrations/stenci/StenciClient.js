const StenciError = require('./StenciError')
const StenciSession = require('./StenciSession')

class StenciClient {
  constructor({ config, session = null, fetchImpl = global.fetch, logger = console } = {}) {
    this.config = config
    this.fetch = fetchImpl
    this.session = session
    this.logger = logger
    this.authState = session ? { cookie: session.cookie, authorization: session.authorization } : {}
  }

  assertConfigured({ requireCredentials = false, username, password } = {}) {
    if (!this.config?.enabled) throw new StenciError('Integração Stenci desabilitada.', { code: 'STENCI_DISABLED', status: 503 })
    const missing = []
    for (const [key, value] of [['STENCI_API_X_BASE_URL', this.config.apiXBaseUrl], ['STENCI_API_BASE_URL', this.config.apiBaseUrl], ['STENCI_BRANCH_ID', this.config.branchId]]) if (!value) missing.push(key)
    if (requireCredentials) {
      if (!username) missing.push('username')
      if (!password) missing.push('password')
    }
    if (missing.length) throw new StenciError(`Integração Stenci não configurada. Verifique: ${missing.join(', ')}.`, { code: 'STENCI_NOT_CONFIGURED', status: 503 })
  }

  async request(path, { base = 'api', query = {}, method = 'GET', body, stage } = {}) {
    this.assertConfigured()
    const url = new URL(path, base === 'apiX' ? this.config.apiXBaseUrl : this.config.apiBaseUrl)
    Object.entries(query).forEach(([key, value]) => value != null && value !== '' && url.searchParams.set(key, String(value)))
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), this.config.timeoutMs)
    const options = { method, signal: controller.signal, headers: { Accept: 'application/json' } }
    if (this.authState.cookie) options.headers.Cookie = this.authState.cookie
    if (this.authState.authorization) options.headers.Authorization = this.authState.authorization
    if (body !== undefined) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body) }
    const label = stage && `[STENCI ${stage.toUpperCase()}]`
    if (label) {
      this.logger.info(`${label} iniciando ${url.pathname}`, { url: url.origin + url.pathname, method, deviceIdPresent: Boolean(body?.deviceId) })
    }
    try {
      const response = await this.fetch(url, options)
      if (label) this.logger.info(`${label} status: ${response.status}`)
      if (!response.ok) {
        const remote = await this.safeError(response)
        if (label && remote) this.logger.warn(`${label} erro do Stenci`, remote)
        const code = stage === 'auth' && response.status === 401 ? 'STENCI_INVALID_CREDENTIALS'
          : stage === 'auth' ? 'STENCI_AUTH_FAILED'
            : stage === 'branch' ? 'STENCI_BRANCH_FAILED'
              : stage === 'me' ? 'STENCI_ME_FAILED' : `STENCI_HTTP_${response.status}`
        throw new StenciError('Falha controlada na consulta ao Stenci.', { code, status: code === 'STENCI_INVALID_CREDENTIALS' ? 401 : 502, stage, upstreamStatus: response.status })
      }
      try {
        const data = await response.json()
        if (stage === 'auth') this.captureAuthState(response, data)
        return data
      } catch (cause) { throw new StenciError('Resposta inválida recebida do Stenci.', { code: stage ? `STENCI_${stage.toUpperCase()}_FAILED` : 'STENCI_INVALID_RESPONSE', status: 502, stage, cause }) }
    } catch (error) {
      if (error instanceof StenciError) throw error
      const timeout = error.name === 'AbortError'
      if (label) this.logger.error(`${label} falha de conexão`, { name: error.name })
      throw new StenciError(timeout ? 'Tempo limite da consulta ao Stenci excedido.' : 'Não foi possível consultar o Stenci.', { code: 'STENCI_CONNECTION_ERROR', status: 503, stage, cause: error })
    } finally { clearTimeout(timer) }
  }

  async safeError(response) {
    try {
      const data = await response.json()
      const result = {}
      if (typeof data?.code === 'string') result.code = data.code.slice(0, 100)
      if (typeof data?.message === 'string' && !/token|password|senha|authorization|cookie/i.test(data.message)) result.message = data.message.slice(0, 200)
      return Object.keys(result).length ? result : null
    } catch { return null }
  }

  captureAuthState(response, data) {
    const headers = response.headers
    const setCookies = typeof headers?.getSetCookie === 'function' ? headers.getSetCookie() : [headers?.get?.('set-cookie')].filter(Boolean)
    if (setCookies.length) this.authState.cookie = setCookies.map((value) => value.split(';', 1)[0]).join('; ')
    const headerAuthorization = headers?.get?.('authorization')
    if (headerAuthorization) this.authState.authorization = headerAuthorization
    else {
      const token = data?.accessToken || data?.token
      if (typeof token === 'string' && token) this.authState.authorization = `Bearer ${token}`
    }
    this.logger.info('[STENCI AUTH] contexto de sessão recebido', { cookiePresent: Boolean(this.authState.cookie), tokenPresent: Boolean(this.authState.authorization) })
  }

  async authenticate(username, password, deviceId) {
    this.assertConfigured({ requireCredentials: true, username, password })
    if (!deviceId) throw new TypeError('deviceId é obrigatório para autenticar no Stenci.')
    return this.request('/v1/auth', { base: 'apiX', method: 'POST', body: { username, password, deviceId }, stage: 'auth' })
  }
  selectBranch(branchId, deviceId) {
    if (!deviceId) throw new TypeError('deviceId é obrigatório para selecionar a branch no Stenci.')
    return this.request('/v1/me/branch', { base: 'apiX', method: 'POST', body: { branchId, deviceId }, stage: 'branch' })
  }
  getMe() { return this.request('/v1/me', { base: 'apiX', stage: 'me' }) }
  async authenticateSession(username, password, deviceId) {
    await this.authenticate(username, password, deviceId)
    await this.selectBranch(this.config.branchId, deviceId)
    const me = await this.getMe()
    this.session = new StenciSession({ deviceId, branchId: this.config.branchId, ...this.authState })
    return me
  }

  getSession() { return this.session }

  assertAuthenticated() {
    if (!this.session) throw new StenciError('Sessão Stenci ausente ou expirada.', { code: 'STENCI_SESSION_EXPIRED', status: 401 })
  }
}

module.exports = StenciClient
