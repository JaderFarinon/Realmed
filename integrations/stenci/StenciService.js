const StenciError = require('./StenciError')

class StenciService {
  constructor(client) { this.client = client }
  async searchPatients(search, options = {}) {
    this.client.assertAuthenticated()
    const result = await this.client.request('/v1/patients/search', { query: { limit: options.limit ?? 30, offset: options.offset ?? 0, notFilterBranch: true, search } })
    if (!result || !Array.isArray(result.items) || typeof result.hasMore !== 'boolean') throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502 })
    return result
  }
  async testConnection() {
    this.client.assertAuthenticated()
    const result = await this.client.getMe()
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502 })
    return result
  }
  async authenticateUser(username, password) {
    const me = await this.client.authenticateSession(username, password)
    return require('./StenciMapper').userIdentity(me, username)
  }
  getSession() { return this.client.getSession() }
}
module.exports = StenciService
