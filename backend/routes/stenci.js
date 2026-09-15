const express = require('express')
const knexFactory = require('knex')
const knexConfig = require('../knexfile')
const auth = require('../middleware/auth')
const { modulePermission, permissionMiddleware } = require('../middleware/permission')
const { createIntegrationLog } = require('../services/integrationLogService')
const { getStenciConfig, publicConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')

const knex = knexFactory(knexConfig[process.env.NODE_ENV || 'development'] || knexConfig.development)

function createStenciRouter({ db = knex, configFactory = getStenciConfig, serviceFactory } = {}) {
  const router = express.Router()
  router.use(auth, permissionMiddleware(['masteradmin', 'admin']), modulePermission('integrations'))

  const latestLog = () => db('integration_logs').where({ integration: 'STENCI' }).orderBy('created_at', 'desc').first()
  router.get('/status', async (_req, res) => {
    try {
      const config = configFactory()
      const latest = await latestLog()
      const status = !config.enabled ? 'DISABLED' : latest?.status === 'ERROR' ? 'ERROR' : latest?.status === 'SUCCESS' ? 'CONNECTED' : 'CONFIGURED'
      res.json({ ...publicConfig(config), status, last_operation: latest ? { operation: latest.operation, status: latest.status, started_at: latest.started_at, finished_at: latest.finished_at, records_processed: latest.records_processed } : null, last_error: latest?.status === 'ERROR' ? latest.error_message : null })
    } catch (error) { res.status(500).json({ error: 'Não foi possível consultar o status da integração.' }) }
  })

  router.get('/logs', async (_req, res) => {
    try { res.json(await db('integration_logs').where({ integration: 'STENCI' }).select('id', 'integration', 'operation', 'status', 'started_at', 'finished_at', 'duration_ms', 'records_processed', 'error_message', 'metadata', 'created_at').orderBy('created_at', 'desc').limit(100)) }
    catch (_error) { res.status(500).json({ error: 'Não foi possível consultar os logs da integração.' }) }
  })

  router.post('/test-connection', async (_req, res) => {
    const started = new Date()
    try {
      const config = configFactory()
      const service = serviceFactory ? serviceFactory(config) : new StenciService(new StenciClient({ config }))
      await service.testConnection()
      const finished = new Date()
      await createIntegrationLog(db, { integration: 'STENCI', operation: 'TEST_CONNECTION', status: 'SUCCESS', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: 0, metadata: { base_url_configured: Boolean(config.baseUrl) } })
      return res.json({ message: 'Conexão com o Stenci realizada com sucesso.' })
    } catch (error) {
      const finished = new Date()
      try { await createIntegrationLog(db, { integration: 'STENCI', operation: 'TEST_CONNECTION', status: 'ERROR', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: 0, error_message: error.message }) } catch (logError) { console.error('[Stenci] Falha ao registrar log:', logError.message) }
      return res.status(error.status || 503).json({ error: error.message || 'Falha controlada ao consultar o Stenci.', code: error.code || 'STENCI_ERROR' })
    }
  })

  const pendingReport = (_req, res) => res.status(501).json({ error: 'Endpoint do Stenci ainda não configurado.' })
  router.get('/assessments', pendingReport)
  router.get('/completed-treatments', pendingReport)
  return router
}

module.exports = { createStenciRouter, knex }
