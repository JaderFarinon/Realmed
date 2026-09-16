const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { getStenciConfig, publicConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const StenciSession = require('../../integrations/stenci/StenciSession')
const StenciMapper = require('../../integrations/stenci/StenciMapper')
const { syncPatientFromStenci } = require('../../integrations/stenci/StenciPatientSyncService')
const { sanitize, createIntegrationLog } = require('../services/integrationLogService')

const env = { STENCI_ENABLED: 'true', STENCI_API_X_BASE_URL: 'https://api-x.example', STENCI_API_BASE_URL: 'https://api.example', STENCI_BRANCH_ID: 'configured-branch', STENCI_TIMEOUT_MS: '500' }
const session = new StenciSession({ deviceId: 'persistent-device', branchId: 'configured-branch' })
const externalPatient = { id: 'patient-1', identityId: 'identity-1', name: 'Maria da Silva', identity: { type: 'cpf', value: '12345678900' }, cellphone: '41999999999', phone: '4133333333', email: 'maria@example.test', birthDate: '1970-03-10', gender: 'female', patient: { cns: null, insurance: { id: 'insurance-1', name: 'Unimed Curitiba', planId: 'plan-1', plan: { id: 'plan-1', name: 'Fisioterapia' }, record: '0032', validity: '2027-01-31' } } }

test('Stenci is disabled by default and validates every required environment value', async () => {
  let called = false
  const disabled = new StenciClient({ config: getStenciConfig({}), fetchImpl: async () => { called = true } })
  await assert.rejects(disabled.authenticate(), { code: 'STENCI_DISABLED' }); assert.equal(called, false)
  const missing = new StenciClient({ config: getStenciConfig({ STENCI_ENABLED: 'true', STENCI_API_X_BASE_URL: 'https://x.example' }) })
  await assert.rejects(missing.authenticate('user', 'password', 'device'), (error) => error.code === 'STENCI_NOT_CONFIGURED' && error.message.includes('STENCI_API_BASE_URL') && error.message.includes('STENCI_BRANCH_ID') && !error.message.includes('STENCI_DEVICE_ID'))
})

test('authentication and branch selection use only the HAR-confirmed payloads', async () => {
  const calls = [], fetchImpl = async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, json: async () => ({ ok: true }) } }
  const client = new StenciClient({ config: getStenciConfig(env), fetchImpl }); await client.authenticateSession('interactive-user', 'interactive-password', 'persistent-device')
  assert.equal(calls[0].url, 'https://api-x.example/v1/auth'); assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'interactive-user', password: 'interactive-password', deviceId: 'persistent-device' })
  assert.equal(calls[1].url, 'https://api-x.example/v1/me/branch'); assert.deepEqual(JSON.parse(calls[1].options.body), { branchId: 'configured-branch', deviceId: 'persistent-device' })
  assert.equal(calls.some(({ options }) => options.headers.Authorization || options.headers.Cookie), false)
})

test('patient search reuses its session and never authenticates again', async () => {
  const calls = [], fetchImpl = async (url) => { calls.push(String(url)); return { ok: true, json: async () => String(url).includes('/patients/search') ? { items: [externalPatient], hasMore: true } : {} } }
  const service = new StenciService(new StenciClient({ config: getStenciConfig(env), session, fetchImpl }))
  let result
  for (let count = 0; count < 10; count += 1) result = await service.searchPatients('Maria', { limit: 20, offset: 40 })
  assert.equal(calls.length, 10); assert.equal(calls.some((url) => url.includes('/v1/auth') || url.includes('/v1/me/branch')), false)
  const url = new URL(calls[0]); assert.equal(url.origin, 'https://api.example'); assert.equal(url.pathname, '/v1/patients/search'); assert.deepEqual(Object.fromEntries(url.searchParams), { limit: '20', offset: '40', notFilterBranch: 'true', search: 'Maria' }); assert.equal(result.hasMore, true)
})

test('connection check uses the authenticated session and only GET /v1/me', async () => {
  const calls = [], fetchImpl = async (url, options) => { calls.push([String(url), options.method]); return { ok: true, json: async () => ({ id: 'me' }) } }
  await new StenciService(new StenciClient({ config: getStenciConfig(env), session, fetchImpl })).testConnection()
  assert.deepEqual(calls.map(([url, method]) => [new URL(url).pathname, method]), [['/v1/me', 'GET']])
})

test('mapper follows patient and current insurance structure exactly', () => {
  assert.deepEqual(StenciMapper.patient(externalPatient), { external_source: 'STENCI', external_id: 'patient-1', full_name: 'Maria da Silva', cpf: '12345678900', birth_date: '1970-03-10', phone: '41999999999', email: 'maria@example.test', metadata: { identityId: 'identity-1', gender: 'female', socialName: null, address: null, cns: null } })
  assert.deepEqual(StenciMapper.insurance(externalPatient), { external_source: 'STENCI', external_id: 'insurance-1', name: 'Unimed Curitiba', plan_id: 'plan-1', plan: 'Fisioterapia', card_number: '0032', card_expiration: '2027-01-31' })
})

function memoryDb() {
  const tables = { patients: [], insurance_providers: [], patient_insurances: [] }
  const db = (tableExpression) => {
    const table = tableExpression.split(' ')[0]; let filters = {}; let joined = false
    const matches = (row) => Object.entries(filters).every(([key, value]) => row[key.split('.').pop()] === value)
    const result = () => { let rows = tables[table].filter(matches).map((row) => ({ ...row })); if (joined) rows = rows.map((row) => ({ ...row, insurance_name: tables.insurance_providers.find((provider) => provider.id === row.insurance_provider_id)?.name })); return rows }
    const query = {
      where(a, b) { if (typeof a === 'object') filters = { ...filters, ...a }; else filters[a] = b; return query },
      first: async () => result()[0], join() { joined = true; return query }, select() { return query },
      insert: async (data) => { const id = tables[table].length + 1; tables[table].push({ id, ...data }); return [id] },
      update: async (data) => { for (const row of tables[table].filter(matches)) Object.assign(row, data); return 1 },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
    }; return query
  }
  db.transaction = async (callback) => callback(db); db.tables = tables; return db
}

test('sync creates once, reuses provider and updates patient insurance', async () => {
  const db = memoryDb(), first = await syncPatientFromStenci(db, externalPatient)
  assert.equal(first.created, true); assert.equal(first.patient_insurance.card_number, '0032')
  const changed = structuredClone(externalPatient); changed.patient.insurance.record = '0099'; changed.patient.insurance.plan.name = 'Novo plano'
  const second = await syncPatientFromStenci(db, changed)
  assert.equal(second.created, false); assert.equal(second.patient_insurance.card_number, '0099'); assert.equal(second.patient_insurance.plan, 'Novo plano')
  assert.equal(db.tables.patients.length, 1); assert.equal(db.tables.insurance_providers.length, 1); assert.equal(db.tables.patient_insurances.length, 1)
})

test('public configuration and integration logs do not expose secrets or patient payloads', async () => {
  const config = getStenciConfig(env), serialized = JSON.stringify(publicConfig(config)); assert.equal(serialized.includes('configured-password'), false); assert.equal(serialized.includes('persistent-device'), false)
  assert.deepEqual(sanitize({ password: 'x', token: 'y', nested: { cookie: 'z', count: 1 } }), { nested: { count: 1 } })
  let inserted; const db = () => ({ insert: async (value) => { inserted = value } }); await createIntegrationLog(db, { integration: 'STENCI', operation: 'PATIENT_SEARCH', status: 'SUCCESS', metadata: { token: 'hidden', count: 2 } }); assert.deepEqual(JSON.parse(inserted.metadata), { count: 2 })
})

test('network and invalid responses become controlled errors', async () => {
  const config = getStenciConfig(env), network = new StenciClient({ config, fetchImpl: async () => { throw new Error('socket details') } }); await assert.rejects(network.authenticate('user', 'password', 'device'), { code: 'STENCI_CONNECTION_ERROR', status: 503, stage: 'auth' })
  const invalid = new StenciClient({ config, fetchImpl: async () => ({ ok: true, json: async () => { throw new Error('invalid') } }) }); await assert.rejects(invalid.authenticate('user', 'password', 'device'), { code: 'STENCI_AUTH_FAILED', status: 502, stage: 'auth' })
})

test('New Treatment uses the backend Stenci flow, preselects insurance and keeps manual fallback', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/views/Guides/NewTreatment.vue'), 'utf8')
  assert.match(source, /\/integrations\/stenci\/patients\/search/)
  assert.match(source, /\/integrations\/stenci\/patients\/\$\{encodeURIComponent\(patient\.external_id\)\}\/sync/)
  assert.match(source, /form\.patient_insurance_id=synced\.patient_insurance\?\.id/)
  assert.match(source, /Não foi possível consultar o Stenci no momento\./)
  assert.match(source, /Cadastrar manualmente/)
  assert.equal(source.includes(env.STENCI_BRANCH_ID), false)
})
