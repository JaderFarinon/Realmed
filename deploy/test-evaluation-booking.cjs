// Synthetic data in a disposable localhost database; never contacts Stenci.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), dep = name => require(path.join(root, 'backend/node_modules', name));
(async () => {
  const env = dep('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env'))), connection = { host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASS };
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(connection.host));
  const name = 'realmed_booking_verify_' + Date.now(), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'realmed-booking-')), admin = await dep('mysql2/promise').createConnection(connection);
  let db, server, created = false, appPool;
  try {
    await admin.query('CREATE DATABASE ??', [name]); created = true;
    const envPath = path.join(temp, '.env'); fs.writeFileSync(envPath, Object.entries({ ...env, DB_NAME: name, NODE_ENV: 'test', JWT_SECRET: 'synthetic-booking-test' }).map(([k, v]) => k + '=' + JSON.stringify(String(v))).join('\n')); process.env.DOTENV_CONFIG_PATH = envPath;
    db = dep('knex')({ client: 'mysql2', connection: { ...connection, database: name } }); await db.migrate.latest({ directory: path.join(root, 'backend/migrations') });
    appPool = require(path.join(root, 'backend/db'));
    const [person] = await db('people').insert({ full_name: 'Admin Teste' }), [user] = await db('users').insert({ username: 'booking-admin', person_id: person, role: 'admin', status: 'active' });
    const jwt = dep('jsonwebtoken').sign({ id: user, role: 'admin' }, process.env.JWT_SECRET);
    let clock = Date.parse('2026-11-13T06:00:00-03:00'), existing = true, availabilityFailure = false, pause = null, reads = 0;
    const options = { schedules: [{ id: 'evaluation', name: 'Avaliação teste' }], services: [{ id: 'consultation', name: 'Consulta', scheduleIds: ['evaluation'], insuranceIds: ['insurance'] }], insurances: [{ key: 'insurance:plan', insuranceId: 'insurance', planId: 'plan', insuranceName: 'Convênio teste', planName: 'Plano teste', scheduleIds: ['evaluation'] }] };
    const connector = {
      ready: () => true, options: async () => options,
      lookup: async () => existing ? { externalId: 'private-patient-id', name: 'Pessoa Sintética', birthDate: '1980-01-01', phone: '41999991234', insuranceId: 'insurance', planId: 'plan', cardNumber: 'SYNTHETIC', cardExpiry: '2027-01-01' } : null,
      availability: async () => { reads++; if (pause) await pause; if (availabilityFailure) throw new Error('Secret patient data'); return { options, calendars: { evaluation: [{ scheduleId: 'evaluation', startDate: '2026-11-13T08:00', endDate: '2026-11-13T08:20', status: 'available', occupied: false, isSlot: false, planIds: ['plan'] }] } }; },
    };
    const app = dep('express')(); app.use(dep('express').json()); const routers = require(path.join(root, 'backend/routes/evaluation-booking')).createEvaluationBooking({ db, connector, now: () => clock });
    app.use('/public', routers.publicRouter); app.use('/private', routers.privateRouter); server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    async function request(url, body, token, method = body === undefined ? 'GET' : 'POST', auth = false) {
      const response = await fetch(origin + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Booking-Context': token } : {}), ...(auth ? { Authorization: 'Bearer ' + jwt } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await response.text(); return { status: response.status, data: text ? JSON.parse(text) : null, headers: response.headers };
    }
    assert.equal((await request('/private/config')).status, 401);
    const initial = await request('/public/config'); assert.equal(initial.data.enabled, false); assert.equal(initial.data.confirmationEnabled, false); assert.equal(initial.headers.get('cache-control'), 'no-store');
    const settings = { ...require(path.join(root, 'backend/services/evaluationBooking')).DEFAULT_CONFIG, enabled: true, scheduleIds: ['evaluation'], serviceId: 'consultation', insuranceKeys: ['insurance:plan'], address: 'Endereço sintético', contact: 'Contato sintético' };
    assert.equal((await request('/private/config', settings, null, 'PUT', true)).status, 200);
    assert.equal((await request('/private/availability', { date: '2026-11-13', insuranceKey: 'insurance:plan' })).status, 401);
    const preview = await request('/private/availability', { date: '2026-11-13', insuranceKey: 'insurance:plan' }, null, 'POST', true);
    assert.equal(preview.status, 200); assert.equal(preview.data.slots.length, 36); assert.equal(preview.data.slots[0].available, true);
    assert.equal((await request('/private/availability', { date: '2027-11-13', insuranceKey: 'insurance:plan' }, null, 'POST', true)).status, 422);
    assert.equal((await request('/private/availability', { date: '2026-11-13', insuranceKey: 'other' }, null, 'POST', true)).status, 422);
    assert.equal((await request('/private/config', settings, null, 'PUT', true)).status, 409); assert.equal((await db('evaluation_booking_audit')).length, 1);
    await db('users').where({ id: user }).update({ role: 'user' }); assert.equal((await request('/private/config', undefined, null, 'GET', true)).status, 403); await db('users').where({ id: user }).update({ role: 'admin' });
    assert.equal((await request('/public/identify', { cpf: '123' })).status, 422);
    const identity = await request('/public/identify', { cpf: '529.982.247-25' }); const token = identity.data.context;
    assert.equal(identity.data.needsBirthDate, true); assert.deepEqual(Object.keys(identity.data).sort(), ['context', 'expiresInSeconds', 'needsBirthDate']);
    assert.equal((await request('/public/catalogs', {}, token)).status, 403);
    assert.equal((await request('/public/birth-date', { birthDate: '1981-01-01' }, token)).status, 422);
    assert.equal((await request('/public/birth-date', { birthDate: '1980-01-01' }, token)).status, 200);
    const catalogs = await request('/public/catalogs', {}, token); assert.equal(catalogs.data.patient.name, 'Pessoa Sintética'); assert.ok(!JSON.stringify(catalogs).includes('private-patient-id')); assert.ok(!JSON.stringify(catalogs).includes('52998224725'));
    const details = { phone: '41999991234', insuranceKey: 'insurance:plan' };
    assert.equal((await request('/public/details', { ...details, phone: '' }, token)).status, 422); assert.equal((await request('/public/details', details, token)).status, 200);
    const available = await request('/public/availability', { date: '2026-11-13' }, token); assert.equal(available.status, 200); assert.equal(available.data.slots.length, 36); assert.equal(available.data.slots[0].available, true); assert.ok(!JSON.stringify(available.data).includes('Pessoa Sintética'));
    assert.deepEqual(Object.keys(available.data.slots[0]).sort(), ['available', 'label', 'time']);
    availabilityFailure = true; const failed = await request('/public/availability', { date: '2026-11-13' }, token); assert.equal(failed.status, 502); assert.ok(!JSON.stringify(failed.data).includes('Secret')); availabilityFailure = false;
    let release; pause = new Promise(resolve => { release = resolve; }); const before = reads;
    const pending = request('/public/availability', { date: '2026-11-13' }, token); while (reads === before) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal((await request('/public/availability', { date: '2026-11-13' }, token)).status, 409); release(); await pending; pause = null;
    for (let i = 0; i < 2; i++) { const result = await request('/public/confirm', { date: '2026-11-13', time: '08:00', confirmationEnabled: true, operationId: 'synthetic' }, token); assert.equal(result.status, 503); assert.equal(result.data.code, 'BOOKING_WRITE_CONTRACT_PENDING'); }
    assert.equal((await request('/public/result', {}, token)).data.status, 'not_submitted');
    existing = false; const newIdentity = await request('/public/identify', { cpf: '11144477735' }); assert.equal(newIdentity.data.needsBirthDate, false); const newToken = newIdentity.data.context;
    assert.equal((await request('/public/catalogs', {}, newToken)).data.patient, null);
    assert.equal((await request('/public/details', { ...details, name: 'Nova Pessoa', birthDate: '1990-01-01' }, newToken)).status, 200);
    clock++; assert.equal((await request('/public/availability', { date: '2026-11-13' }, newToken)).data.slots[0].available, false);
    clock += 1800000; assert.equal((await request('/public/catalogs', {}, token)).status, 410);
    assert.equal(Number((await db('patients').count({ n: '*' }).first()).n), 0); assert.equal(Number((await db('guide_processes').count({ n: '*' }).first()).n), 0);
    console.log('PASS booking API/MySQL: migration, admin authorization/current role, audit/revision, CPF, DOB gate, minimal patient data, new patient preparation, completeness, 36 slots, errors, serialized contexts, repeated confirmation blocked, no treatment/patient writes, expiration.');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve)); if (appPool) await appPool.end(); if (db) await db.destroy(); if (created) await admin.query('DROP DATABASE ??', [name]); await admin.end(); fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
