const StenciError = require('./StenciError')

class StenciService {
  constructor(client) { this.client = client }
  async searchPatients(search, options = {}) {
    this.client.assertAuthenticated()
    const limit = options.limit ?? 30
    const offset = options.offset ?? 0
    if (process.env.NODE_ENV === 'development') this.client.logger.info('[STENCI PATIENT SEARCH] iniciando', {
      tokenPresent: Boolean(this.client.authState.token), authorizationScheme: 'JWT', limit, offset,
      notFilterBranch: true, searchLength: String(search).length,
    })
    const result = await this.client.request('/v1/patients/search', { query: { limit, offset, notFilterBranch: true, search } })
    if (!result || !Array.isArray(result.items) || typeof result.hasMore !== 'boolean') throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502 })
    if (process.env.NODE_ENV === 'development') this.client.logger.info('[STENCI PATIENT SEARCH] status: 200', { items: result.items.length, hasMore: result.hasMore })
    return result
  }
  async listInsurances() {
    return this.list('/v1/insurances', { limit: 0, active: true })
  }
  async listInsurancePlans() {
    return this.list('/v1/insurance-plans', { limit: 0, offset: 0, active: true })
  }
  async listProfessionals() {
    return this.list('/v1/professionals', { limit: 100, offset: 0, active: true })
  }
  async list(path, query) {
    this.client.assertAuthenticated()
    const result = await this.client.request(path, { query })
    if (!result || !Array.isArray(result.items)) throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502 })
    return { items: result.items, hasMore: Boolean(result.hasMore) }
  }
  async testConnection() {
    this.client.assertAuthenticated()
    const result = await this.client.getMe()
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502 })
    return result
  }
  async authenticateUser(username, password, deviceId) {
    const me = await this.client.authenticateSession(username, password, deviceId)
    return require('./StenciMapper').userIdentity(me, username)
  }
  getSession() { return this.client.getSession() }
}
module.exports = StenciService
