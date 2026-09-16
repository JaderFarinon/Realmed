const StenciError = require('./StenciError')

class StenciService {
  constructor(client) { this.client = client }
  async searchPatients(search, options = {}) {
    await this.client.prepareSession()
    const result = await this.client.request('/v1/patients/search', { query: { limit: options.limit ?? 30, offset: options.offset ?? 0, notFilterBranch: true, search } })
    if (!result || !Array.isArray(result.items) || typeof result.hasMore !== 'boolean') throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502 })
    return result
  }
  async testConnection() {
    await this.client.prepareSession()
    const result = await this.client.request('/v1/me', { base: 'apiX' })
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new StenciError('Resposta inválida recebida do Stenci.', { code: 'STENCI_INVALID_RESPONSE', status: 502 })
    return result
  }
}
module.exports = StenciService
