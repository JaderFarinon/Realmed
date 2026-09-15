const configured = (value) => typeof value === 'string' && value.trim().length > 0

function getStenciConfig(env = process.env) {
  const enabled = String(env.STENCI_ENABLED || 'false').toLowerCase() === 'true'
  return Object.freeze({
    enabled,
    baseUrl: configured(env.STENCI_BASE_URL) ? env.STENCI_BASE_URL.trim() : null,
    username: configured(env.STENCI_USERNAME) ? env.STENCI_USERNAME : null,
    password: configured(env.STENCI_PASSWORD) ? env.STENCI_PASSWORD : null,
    token: configured(env.STENCI_TOKEN) ? env.STENCI_TOKEN : null,
    timeoutMs: Number(env.STENCI_TIMEOUT_MS) > 0 ? Number(env.STENCI_TIMEOUT_MS) : 10000,
    // Preencher somente depois do HAR. Nenhuma rota externa é presumida aqui.
    endpoints: Object.freeze({}),
  })
}

function publicConfig(config) {
  return {
    enabled: config.enabled,
    base_url_configured: Boolean(config.baseUrl),
    authentication_configured: Boolean(config.token || (config.username && config.password)),
    endpoints_configured: Object.keys(config.endpoints || {}).length > 0,
  }
}

module.exports = { getStenciConfig, publicConfig }
