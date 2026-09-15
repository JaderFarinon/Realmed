const StenciError = require('./StenciError')

class StenciClient {
  constructor({ config, fetchImpl = global.fetch } = {}) {
    this.config = config
    this.fetch = fetchImpl
  }

  assertEnabled() {
    if (!this.config?.enabled) throw new StenciError('Integração Stenci desabilitada.', { code: 'STENCI_DISABLED', status: 503 })
    if (!this.config.baseUrl) throw new StenciError('Integração Stenci não configurada.', { code: 'STENCI_NOT_CONFIGURED', status: 503 })
  }

  endpoint(name) {
    this.assertEnabled()
    const endpoint = this.config.endpoints?.[name]
    if (!endpoint) throw new StenciError('Endpoint do Stenci ainda não configurado.', { code: 'STENCI_ENDPOINT_NOT_CONFIGURED', status: 501 })
    return endpoint
  }

  async request(name, { query = {}, method = 'GET' } = {}) {
    const endpoint = this.endpoint(name)
    const url = new URL(endpoint, this.config.baseUrl)
    Object.entries(query).forEach(([key, value]) => value != null && value !== '' && url.searchParams.set(key, String(value)))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)
    try {
      const response = await this.fetch(url, { method, signal: controller.signal, headers: { Accept: 'application/json' } })
      if (!response.ok) {
        const messages = { 401: 'Autenticação rejeitada pelo Stenci.', 403: 'Acesso negado pelo Stenci.', 404: 'Recurso não encontrado no Stenci.', 429: 'Limite de consultas do Stenci excedido.' }
        throw new StenciError(messages[response.status] || `Falha controlada na consulta ao Stenci (${response.status}).`, { code: `STENCI_HTTP_${response.status}`, status: 502 })
      }
      try { return await response.json() } catch (cause) {
        throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502, cause })
      }
    } catch (error) {
      if (error instanceof StenciError) throw error
      const timeout = error.name === 'AbortError'
      throw new StenciError(timeout ? 'Tempo limite da consulta ao Stenci excedido.' : 'Não foi possível consultar o Stenci.', { code: timeout ? 'STENCI_TIMEOUT' : 'STENCI_NETWORK_ERROR', status: 503, cause: error })
    } finally { clearTimeout(timer) }
  }

  // A paginação será implementada aqui quando seu contrato real for conhecido.
  paginate() { return this.endpoint('pagination') }
}

module.exports = StenciClient
