class StenciError extends Error {
  constructor(message, { code = 'STENCI_ERROR', status = 503, stage, upstreamStatus, cause } = {}) {
    super(message, { cause })
    this.name = 'StenciError'
    this.code = code
    this.status = status
    this.stage = stage
    this.upstreamStatus = upstreamStatus
  }
}

module.exports = StenciError
