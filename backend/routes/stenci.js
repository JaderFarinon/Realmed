const express = require('express')
const knexFactory = require('knex')
const knexConfig = require('../knexfile')
const auth = require('../middleware/auth')
const { modulePermission, permissionMiddleware } = require('../middleware/permission')
const { createIntegrationLog } = require('../services/integrationLogService')
const { getStenciConfig, publicConfig } = require('../../integrations/stenci/config')
const StenciMapper = require('../../integrations/stenci/StenciMapper')
const { syncPatientFromStenci } = require('../../integrations/stenci/StenciPatientSyncService')
const { stenciSessionStore } = require('../services/StenciSessionStore')
const { getAuthenticatedStenciService, normalizeStenciSessionError } = require('../services/authenticatedStenciService')

const knex = knexFactory(knexConfig[process.env.NODE_ENV || 'development'] || knexConfig.development)
const admin = [permissionMiddleware(['masteradmin', 'admin']), modulePermission('integrations')]
const safeText = (value, max) => typeof value === 'string' && value.length <= max ? value : null

function validatedPatient(body, externalId) {
  if (!body || String(body.id) !== String(externalId)) throw Object.assign(new Error('Dados do paciente Stenci inválidos.'), { status: 422 })
  if (!safeText(body.name, 180)) throw Object.assign(new Error('Dados do paciente Stenci inválidos.'), { status: 422 })
  const insurance = body.patient?.insurance
  return {
    id: String(body.id), identityId: safeText(body.identityId, 120), name: body.name,
    identity: body.identity?.type === 'cpf' ? { type: 'cpf', value: safeText(body.identity.value, 30) } : undefined,
    cellphone: safeText(body.cellphone, 30), phone: safeText(body.phone, 30), email: safeText(body.email, 180), birthDate: safeText(body.birthDate, 10), gender: safeText(body.gender, 40), socialName: safeText(body.socialName, 180),
    addresses: [],
    patient: { cns: safeText(body.patient?.cns, 30), insurance: insurance?.id && safeText(insurance.name, 180) ? { id: String(insurance.id), name: insurance.name, planId: safeText(insurance.planId, 120), plan: insurance.plan?.name ? { id: safeText(insurance.plan.id, 120), name: safeText(insurance.plan.name, 120) } : undefined, record: safeText(insurance.record, 80), validity: safeText(insurance.validity, 10) } : null },
  }
}

function createStenciRouter({ db = knex, configFactory = getStenciConfig, serviceFactory, sessionStore = stenciSessionStore, sync = syncPatientFromStenci } = {}) {
  const router = express.Router(); router.use(auth)
  const makeService = (req) => getAuthenticatedStenciService(req, { configFactory, serviceFactory, sessionStore })
  const log = async (entry) => { try { await createIntegrationLog(db, entry) } catch (error) { console.error('[Stenci] Falha ao registrar log:', error.message) } }
  const latestLog = () => db('integration_logs').where({ integration: 'STENCI' }).orderBy('created_at', 'desc').first()

  router.get('/status', ...admin, async (_req, res) => { try { const config = configFactory(), latest = await latestLog(); const status = !config.enabled ? 'DISABLED' : latest?.status === 'ERROR' ? 'ERROR' : latest?.status === 'SUCCESS' ? 'CONNECTED' : 'CONFIGURED'; res.json({ ...publicConfig(config), status, last_operation: latest ? { operation: latest.operation, status: latest.status, started_at: latest.started_at, finished_at: latest.finished_at, records_processed: latest.records_processed } : null, last_error: latest?.status === 'ERROR' ? latest.error_message : null }) } catch (_error) { res.status(500).json({ error: 'Não foi possível consultar o status da integração.' }) } })
  router.get('/logs', ...admin, async (_req, res) => { try { res.json(await db('integration_logs').where({ integration: 'STENCI' }).select('id', 'integration', 'operation', 'status', 'started_at', 'finished_at', 'duration_ms', 'records_processed', 'error_message', 'metadata', 'created_at').orderBy('created_at', 'desc').limit(100)) } catch (_error) { res.status(500).json({ error: 'Não foi possível consultar os logs da integração.' }) } })
  router.post('/test-connection', ...admin, async (req, res) => {
    const started = new Date()
    let context
    try { context = makeService(req); await context.service.testConnection(); const finished = new Date(); await log({ integration: 'STENCI', operation: 'TEST_CONNECTION', status: 'SUCCESS', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: 0 }); res.json({ message: 'Integração Stenci validada com sua sessão atual.' }) }
    catch (originalError) { const error = normalizeStenciSessionError(originalError, context?.sid || req.user?.sid, sessionStore); const finished = new Date(); await log({ integration: 'STENCI', operation: 'TEST_CONNECTION', status: 'ERROR', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: 0, error_message: error.message }); res.status(error.status || 503).json({ error: error.message || 'Falha controlada ao consultar o Stenci.', code: error.code || 'STENCI_ERROR' }) }
  })

  router.get('/patients/search', modulePermission('guide_processes', 'create'), async (req, res) => {
    const started = new Date(), search = String(req.query.search || '').trim(), limit = Math.min(30, Math.max(1, Number(req.query.limit) || 30)), offset = Math.max(0, Number(req.query.offset) || 0)
    if (search.length < 2) return res.status(400).json({ error: 'Informe pelo menos 2 caracteres para buscar.' })
    let context
    try { context = makeService(req); const result = await context.service.searchPatients(search, { limit, offset }); const items = result.items.map((item) => ({ ...StenciMapper.patient(item), insurance: StenciMapper.insurance(item), raw: validatedPatient(item, item.id) })); const finished = new Date(); await log({ integration: 'STENCI', operation: 'PATIENT_SEARCH', status: 'SUCCESS', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: items.length }); res.json({ items, hasMore: result.hasMore }) }
    catch (originalError) { const error = normalizeStenciSessionError(originalError, context?.sid || req.user?.sid, sessionStore); const finished = new Date(); await log({ integration: 'STENCI', operation: 'PATIENT_SEARCH', status: 'ERROR', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: 0, error_message: error.message }); res.status(error.status || 503).json({ error: error.code === 'STENCI_SESSION_EXPIRED' ? 'Sua sessão expirou. Entre novamente.' : 'Não foi possível consultar o Stenci no momento.', code: error.code || 'STENCI_ERROR' }) }
  })
  router.post('/patients/:externalId/sync', modulePermission('guide_processes', 'create'), async (req, res) => {
    const started = new Date()
    try { const externalPatient = validatedPatient(req.body?.patient, req.params.externalId), result = await sync(db, externalPatient); const finished = new Date(); await log({ integration: 'STENCI', operation: 'PATIENT_SYNC', status: 'SUCCESS', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: 1 }); res.json(result) }
    catch (error) { const finished = new Date(); await log({ integration: 'STENCI', operation: 'PATIENT_SYNC', status: 'ERROR', started_at: started, finished_at: finished, duration_ms: finished - started, records_processed: 0, error_message: error.message }); res.status(error.status || 500).json({ error: error.status === 422 ? error.message : 'Não foi possível importar o paciente do Stenci.' }) }
  })

  const pendingReport = (_req, res) => res.status(501).json({ error: 'Endpoint do Stenci ainda não configurado.' })
  router.get('/assessments', ...admin, pendingReport); router.get('/completed-treatments', ...admin, pendingReport)
  return router
}
module.exports = { createStenciRouter, knex, validatedPatient }
