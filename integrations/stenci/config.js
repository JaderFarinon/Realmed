const configured = (value) => typeof value === 'string' && value.trim().length > 0

function getStenciConfig(env = process.env) {
  return Object.freeze({
    enabled: String(env.STENCI_ENABLED || 'false').toLowerCase() === 'true',
    apiXBaseUrl: configured(env.STENCI_API_X_BASE_URL) ? env.STENCI_API_X_BASE_URL.trim() : null,
    apiBaseUrl: configured(env.STENCI_API_BASE_URL) ? env.STENCI_API_BASE_URL.trim() : null,
    username: configured(env.STENCI_USERNAME) ? env.STENCI_USERNAME : null,
    password: configured(env.STENCI_PASSWORD) ? env.STENCI_PASSWORD : null,
    deviceId: configured(env.STENCI_DEVICE_ID) ? env.STENCI_DEVICE_ID : null,
    branchId: configured(env.STENCI_BRANCH_ID) ? env.STENCI_BRANCH_ID : null,
    timeoutMs: Number(env.STENCI_TIMEOUT_MS) > 0 ? Number(env.STENCI_TIMEOUT_MS) : 10000,
  })
}

function publicConfig(config) {
  return {
    enabled: config.enabled,
    api_x_base_url_configured: Boolean(config.apiXBaseUrl),
    api_base_url_configured: Boolean(config.apiBaseUrl),
    authentication_configured: Boolean(config.username && config.password && config.deviceId),
    branch_configured: Boolean(config.branchId),
  }
}

module.exports = { getStenciConfig, publicConfig }
