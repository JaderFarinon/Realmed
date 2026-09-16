const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { getStenciConfig, publicConfig, DEFAULT_STENCI_USER_AGENT } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const StenciSession = require('../../integrations/stenci/StenciSession')
const StenciMapper = require('../../integrations/stenci/StenciMapper')
const { syncPatientFromStenci } = require('../../integrations/stenci/StenciPatientSyncService')
const { sanitize, createIntegrationLog } = require('../services/integrationLogService')

const env = { STENCI_ENABLED: 'true', STENCI_API_X_BASE_URL: 'https://api-x.example', STENCI_API_BASE_URL: 'https://api.example', STENCI_BRANCH_ID: 'configured-branch', STENCI_TIMEOUT_MS: '500' }
const session = new StenciSession({ deviceId: 'persistent-device', branchId: 'configured-branch', token: 'session-token' })
const externalPatient = { id: 'patient-1', identityId: 'identity-1', name: 'Maria da Silva', identity: { type: 'cpf', value: '12345678900' }, cellphone: '41999999999', phone: '4133333333', email: 'maria@example.test', birthDate: '1970-03-10', gender: 'female', patient: { cns: null, insurance: { id: 'insurance-1', name: 'Unimed Curitiba', planId: 'plan-1', plan: { id: 'plan-1', name: 'Fisioterapia' }, record: '0032', validity: '2027-01-31' } } }

test('Stenci is disabled by default and validates every required environment value', async () => {
  let called = false
  const disabled = new StenciClient({ config: getStenciConfig({}), fetchImpl: async () => { called = true } })
  await assert.rejects(disabled.authenticate(), { code: 'STENCI_DISABLED' }); assert.equal(called, false)
  const missing = new StenciClient({ config: getStenciConfig({ STENCI_ENABLED: 'true', STENCI_API_X_BASE_URL: 'https://x.example' }) })
  await assert.rejects(missing.authenticate('user', 'password', 'device'), (error) => error.code === 'STENCI_NOT_CONFIGURED' && error.message.includes('STENCI_API_BASE_URL') && error.message.includes('STENCI_BRANCH_ID') && !error.message.includes('STENCI_DEVICE_ID'))
})

test('all Stenci requests use the application headers and JWT scheme', async () => {
  const calls = [], fetchImpl = async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, json: async () => new URL(url).pathname === '/v1/auth' ? ({ token: 'auth-token' }) : ({ ok: true }) } }
  const client = new StenciClient({ config: getStenciConfig(env), fetchImpl }); await client.authenticateSession('interactive-user', 'interactive-password', 'persistent-device')
  assert.equal(calls[0].url, 'https://api-x.example/v1/auth'); assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'interactive-user', password: 'interactive-password', deviceId: 'persistent-device' })
  assert.equal(calls[1].url, 'https://api-x.example/v1/me/branch'); assert.deepEqual(JSON.parse(calls[1].options.body), { branchId: 'configured-branch', deviceId: 'persistent-device' })
  for (const { options } of calls) {
    assert.equal(options.headers.Accept, 'application/json, text/plain, */*')
    assert.equal(options.headers.Origin, 'https://stenci.app')
    assert.equal(options.headers.Referer, 'https://stenci.app/')
    assert.equal(options.headers['Accept-Language'], 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7')
    assert.equal(options.headers['User-Agent'], DEFAULT_STENCI_USER_AGENT)
  }
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
  assert.equal(calls[1].options.headers['Content-Type'], 'application/json')
  assert.equal(calls[2].options.headers['Content-Type'], undefined)
  assert.equal(calls[0].options.headers.Authorization, undefined)
  assert.equal(calls[1].options.headers.Authorization, 'JWT auth-token')
  assert.equal(calls[2].options.headers.Authorization, 'JWT auth-token')
})

test('optional Stenci browser headers can be configured without becoming required', () => {
  const defaults = getStenciConfig(env)
  assert.equal(defaults.origin, 'https://stenci.app')
  assert.equal(defaults.referer, 'https://stenci.app/')
  assert.equal(defaults.userAgent, DEFAULT_STENCI_USER_AGENT)
  const custom = getStenciConfig({ ...env, STENCI_ORIGIN: 'https://custom.example', STENCI_REFERER: 'https://custom.example/app', STENCI_USER_AGENT: 'Realmed test agent' })
  assert.equal(custom.origin, 'https://custom.example')
  assert.equal(custom.referer, 'https://custom.example/app')
  assert.equal(custom.userAgent, 'Realmed test agent')
})

test('StenciClient rejects non-string usernames instead of coercing them', async () => {
  const client = new StenciClient({ config: getStenciConfig(env), fetchImpl: async () => assert.fail('fetch should not be called') })
  await assert.rejects(client.authenticate(5286020984, 'password', 'device'), { name: 'TypeError' })
})

test('patient search reuses its session and never authenticates again', async () => {
  const calls = [], fetchImpl = async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, status: 200, json: async () => String(url).includes('/patients/search') ? { items: [externalPatient], hasMore: true } : {} } }
  const service = new StenciService(new StenciClient({ config: getStenciConfig(env), session, fetchImpl }))
  let result
  for (let count = 0; count < 10; count += 1) result = await service.searchPatients('Maria', { limit: 20, offset: 40 })
  assert.equal(calls.length, 10); assert.equal(calls.some(({ url }) => url.includes('/v1/auth') || url.includes('/v1/me/branch')), false)
  const url = new URL(calls[0].url); assert.equal(url.origin, 'https://api.example'); assert.equal(url.pathname, '/v1/patients/search'); assert.deepEqual(Object.fromEntries(url.searchParams), { limit: '20', offset: '40', notFilterBranch: 'true', search: 'Maria' }); assert.equal(calls[0].options.headers.Authorization, 'JWT session-token'); assert.equal(result.hasMore, true)
})

test('patient search uses the post-branch token and exact default query', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options })
    const pathname = new URL(url).pathname
    if (pathname === '/v1/auth') return { ok: true, status: 200, headers: { getSetCookie: () => [] }, json: async () => ({ token: 'token-A' }) }
    if (pathname === '/v1/me/branch') return { ok: true, status: 200, headers: { getSetCookie: () => [] }, json: async () => ({ token: 'token-B' }) }
    if (pathname === '/v1/me') return { ok: true, status: 200, json: async () => ({ id: 'user-1' }) }
    return { ok: true, status: 200, json: async () => ({ items: [], hasMore: false }) }
  }
  const client = new StenciClient({ config: getStenciConfig(env), fetchImpl })
  await client.authenticateSession('user', 'password', 'persistent-device')
  await new StenciService(client).searchPatients('teste')
  const searchCall = calls.at(-1)
  assert.equal(searchCall.url, 'https://api.example/v1/patients/search?limit=30&offset=0&notFilterBranch=true&search=teste')
  assert.equal(searchCall.options.headers.Authorization, 'JWT token-B')
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

test('mapper tolerates absent insurance and optional identity and contact fields', () => {
  const optional = { id: 'patient-2', identityId: null, name: 'Paciente sem cadastro completo', identity: null, email: '', birthDate: null, patient: { insurance: null } }
  assert.deepEqual(StenciMapper.patient(optional), { external_source: 'STENCI', external_id: 'patient-2', full_name: 'Paciente sem cadastro completo', cpf: null, birth_date: null, phone: null, email: null, metadata: { identityId: null, gender: null, socialName: null, address: null, cns: null } })
  assert.equal(StenciMapper.insurance(optional), null)
  const nullValidity = structuredClone(externalPatient); nullValidity.patient.insurance.validity = null
  assert.equal(StenciMapper.insurance(nullValidity).card_expiration, null)
})

test('catalog mappers preserve distinct insurance and plan ids and classify professionals by council data', () => {
  assert.deepEqual(StenciMapper.insuranceCatalog({ id: 'insurance-1', name: 'Particular', type: 'particular' }), { externalId: 'insurance-1', name: 'Particular', type: 'particular', imageUrl: null })
  assert.deepEqual(StenciMapper.insurancePlan({ id: 'insurance-1', name: 'FUSEX', customName: 'Plano regional', plan: { id: 'plan-9', name: 'Fusex', type: 'insurance' } }), { insuranceExternalId: 'insurance-1', insuranceName: 'FUSEX', planExternalId: 'plan-9', planName: 'Plano regional', originalPlanName: 'Fusex', type: 'insurance', record: null })
  const professional = StenciMapper.professional({ id: 'pro-1', identityId: 'person-1', name: 'Dra. Ana', professional: { active: true, councils: [{ name: 'CRM', state: 'PR', record: '123' }], specialties: [], signature: 'signed', signatureImageUrl: 'https://example.test/signature.png' } })
  assert.equal(professional.councils[0].name, 'CRM'); assert.deepEqual(professional.specialties, []); assert.equal(professional.signature, 'signed')
  assert.deepEqual(StenciMapper.professional({ id: 'pro-2', name: 'Sem conselho', professional: { active: true } }).councils, [])
})

test('catalog calls use the operational API, session JWT and exact queries', async () => {
  const calls = [], fetchImpl = async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, status: 200, json: async () => ({ items: [], hasMore: false }) } }
  const service = new StenciService(new StenciClient({ config: getStenciConfig(env), session, fetchImpl }))
  await Promise.all([service.listInsurances(), service.listInsurancePlans(), service.listProfessionals()])
  assert.deepEqual(calls.map(call => call.url), ['https://api.example/v1/insurances?limit=0&active=true', 'https://api.example/v1/insurance-plans?limit=0&offset=0&active=true', 'https://api.example/v1/professionals?limit=100&offset=0&active=true'])
  assert.equal(calls.every(call => call.options.headers.Authorization === 'JWT session-token'), true)
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
  assert.match(source, /selectedInsurance\.value\s*=\s*insurances\.value\.find/)
  assert.match(source, /\/integrations\/stenci\/insurance-plans/)
  assert.match(source, /hasCouncil\(p,\s*'CREFITO'\)/)
  assert.match(source, /hasCouncil\(p,\s*'CRM'\)/)
  assert.match(source, /Não foi possível consultar o Stenci no momento\./)
  assert.match(source, /Cadastrar manualmente/)
  assert.equal(source.includes(env.STENCI_BRANCH_ID), false)
})
