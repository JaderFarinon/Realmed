class StenciSession {
  constructor({ deviceId, branchId, authenticatedAt = new Date().toISOString() } = {}) {
    if (!deviceId || !branchId) throw new TypeError('A sessão Stenci exige deviceId e branchId.')
    this.deviceId = deviceId
    this.branchId = branchId
    this.authenticatedAt = authenticatedAt
    Object.freeze(this)
  }
}

module.exports = StenciSession
