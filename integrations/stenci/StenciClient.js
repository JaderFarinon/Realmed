const StenciError = require('./StenciError')

class StenciClient {
  constructor({ config, fetchImpl = global.fetch } = {}) { this.config = config; this.fetch = fetchImpl }

  assertConfigured() {
    if (!this.config?.enabled) throw new StenciError('Integração Stenci desabilitada.', { code: 'STENCI_DISABLED', status: 503 })
    const missing = []
    for (const [key, value] of [['STENCI_API_X_BASE_URL', this.config.apiXBaseUrl], ['STENCI_API_BASE_URL', this.config.apiBaseUrl], ['STENCI_USERNAME', this.config.username], ['STENCI_PASSWORD', this.config.password], ['STENCI_DEVICE_ID', this.config.deviceId], ['STENCI_BRANCH_ID', this.config.branchId]]) if (!value) missing.push(key)
    if (missing.length) throw new StenciError(`Integração Stenci não configurada. Verifique: ${missing.join(', ')}.`, { code: 'STENCI_NOT_CONFIGURED', status: 503 })
  }

  async request(path, { base = 'api', query = {}, method = 'GET', body } = {}) {
    this.assertConfigured()
    const url = new URL(path, base === 'apiX' ? this.config.apiXBaseUrl : this.config.apiBaseUrl)
    Object.entries(query).forEach(([key, value]) => value != null && value !== '' && url.searchParams.set(key, String(value)))
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), this.config.timeoutMs)
    const options = { method, signal: controller.signal, headers: { Accept: 'application/json' } }
    if (body !== undefined) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body) }
    try {
      const response = await this.fetch(url, options)
      if (!response.ok) {
        const messages = { 401: 'Autenticação rejeitada pelo Stenci.', 403: 'Acesso negado pelo Stenci.', 404: 'Recurso não encontrado no Stenci.', 429: 'Limite de consultas do Stenci excedido.' }
        throw new StenciError(messages[response.status] || `Falha controlada na consulta ao Stenci (${response.status}).`, { code: `STENCI_HTTP_${response.status}`, status: 502 })
      }
      try { return await response.json() } catch (cause) { throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502, cause }) }
    } catch (error) {
      if (error instanceof StenciError) throw error
      const timeout = error.name === 'AbortError'
      throw new StenciError(timeout ? 'Tempo limite da consulta ao Stenci excedido.' : 'Não foi possível consultar o Stenci.', { code: timeout ? 'STENCI_TIMEOUT' : 'STENCI_NETWORK_ERROR', status: 503, cause: error })
    } finally { clearTimeout(timer) }
  }

  authenticate() { return this.request('/v1/auth', { base: 'apiX', method: 'POST', body: { username: this.config.username, password: this.config.password, deviceId: this.config.deviceId } }) }
  selectBranch() { return this.request('/v1/me/branch', { base: 'apiX', method: 'POST', body: { branchId: this.config.branchId, deviceId: this.config.deviceId } }) }
  async prepareSession() { await this.authenticate(); await this.selectBranch() }
}

module.exports = StenciClient
