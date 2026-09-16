class StenciSession {
  constructor({ deviceId, branchId, cookie, token, authenticatedAt = new Date().toISOString() } = {}) {
    if (!deviceId || !branchId) throw new TypeError('A sessão Stenci exige deviceId e branchId.')
    this.deviceId = deviceId
    this.branchId = branchId
    // Stenci credentials remain in this server-side object and are never put in the Realmed JWT.
    this.cookie = cookie || null
    this.token = token || null
    this.authenticatedAt = authenticatedAt
    Object.freeze(this)
  }
}

module.exports = StenciSession
