class StenciError extends Error {
  constructor(message, { code = 'STENCI_ERROR', status = 503, cause } = {}) {
    super(message, { cause })
    this.name = 'StenciError'
    this.code = code
    this.status = status
  }
}

module.exports = StenciError
