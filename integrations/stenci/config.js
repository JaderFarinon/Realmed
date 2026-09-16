const configured = (value) => typeof value === 'string' && value.trim().length > 0

function getStenciConfig(env = process.env) {
  return Object.freeze({
    enabled: String(env.STENCI_ENABLED || 'false').toLowerCase() === 'true',
    apiXBaseUrl: configured(env.STENCI_API_X_BASE_URL) ? env.STENCI_API_X_BASE_URL.trim() : null,
    apiBaseUrl: configured(env.STENCI_API_BASE_URL) ? env.STENCI_API_BASE_URL.trim() : null,
    branchId: configured(env.STENCI_BRANCH_ID) ? env.STENCI_BRANCH_ID : null,
    timeoutMs: Number(env.STENCI_TIMEOUT_MS) > 0 ? Number(env.STENCI_TIMEOUT_MS) : 10000,
  })
}

function publicConfig(config) {
  return {
    enabled: config.enabled,
    api_x_base_url_configured: Boolean(config.apiXBaseUrl),
    api_base_url_configured: Boolean(config.apiBaseUrl),
    authentication_configured: Boolean(config.enabled && config.apiXBaseUrl && config.apiBaseUrl && config.branchId),
    branch_configured: Boolean(config.branchId),
  }
}

module.exports = { getStenciConfig, publicConfig }
