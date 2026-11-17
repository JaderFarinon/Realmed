const test = require('node:test'), assert = require('node:assert/strict');
const r = require('../services/evaluationBooking');
const { createBookingConnector } = require('../services/evaluationBookingStenci');
const date = '2026-11-13', now = Date.parse(date + 'T06:00:00-03:00');
const config = { ...r.DEFAULT_CONFIG, enabled: true, scheduleIds: ['evaluation'], serviceId: 'consultation', insuranceKeys: ['insurance:plan'] };
const options = { schedules: [{ id: 'evaluation' }], services: [{ id: 'consultation', scheduleIds: ['evaluation'], insuranceIds: ['insurance'] }], insurances: [{ key: 'insurance:plan', insuranceId: 'insurance', planId: 'plan', insuranceName: 'Convênio teste', planName: 'Plano teste', scheduleIds: ['evaluation'] }] };
const row = (start = '08:00', end = '08:20', extra = {}) => ({ scheduleId: 'evaluation', startDate: date + 'T' + start, endDate: date + 'T' + end, status: 'available', occupied: false, isSlot: false, planIds: ['plan'], ...extra });
const grid = (rows, changes = {}) => r.makeGrid({ date, config, options, insuranceKey: 'insurance:plan', calendars: { evaluation: rows }, now, ...changes });
test('CPF checksum, repeated digits and exact dates', () => {
  assert.ok(r.validCpf('529.982.247-25')); assert.ok(!r.validCpf('52998224724')); assert.ok(!r.validCpf('11111111111')); assert.ok(!r.validCpf(''));
  assert.equal(r.dateOnly('2026-02-30'), null); assert.equal(r.dateOnly('2028-02-29'), '2028-02-29');
  assert.deepEqual(r.dateBounds(config, Date.parse('2026-11-14T01:00:00Z')), { minDate: '2026-11-13', maxDate: '2026-12-12' });
});
test('20 minute grid, empty is occupied, cutoff inclusivity and closing at 20h', () => {
  assert.equal(grid([]).length, 36); assert.ok(grid([]).every(s => !s.available));
  const slots = grid([row(), row('19:40', '20:00')]); assert.equal(slots[0].available, true); assert.equal(slots.at(-1).time, '19:40'); assert.equal(slots.at(-1).available, true); assert.equal(slots.filter(s => s.available).length, 2);
  assert.equal(grid([row()], { now: now + 1 })[0].available, false);
  assert.throws(() => grid([], { date: '2026-12-13' }), /período/);
});
test('slot coverage, reservations, overlap, insurance, malformed and unrelated agenda fail closed', () => {
  assert.equal(grid([row('08:00', '08:10')])[0].available, false);
  assert.equal(grid([row('08:00', '08:10'), row('08:10', '08:20')])[0].available, true);
  for (const change of [{ occupied: true }, { status: 'blocked' }, { planIds: [] }, { planIds: ['insurance'] }, { planIds: null }, { isSlot: true }, { scheduleId: 'physio' }, { startDate: date + 'T25:00:00' }]) assert.equal(grid([row('08:00', '08:20', change)])[0].available, false);
  assert.equal(grid([row(), row('08:10', '08:30', { status: 'confirmed', occupied: true })])[0].available, false);
  assert.throws(() => grid([], { calendars: {} }), /agenda completa/);
  assert.throws(() => grid([], { insuranceKey: 'other:plan' }), /convênio/);
});
test('existing identity is immutable, missing required data and card policy', () => {
  const context = { patient: { name: 'Paciente teste', birthDate: '1980-01-01' } };
  const input = { name: 'Spoofed Name', birthDate: '2000-01-01', phone: '(41) 99999-1234', insuranceKey: 'insurance:plan' };
  const details = r.normalizeDetails(input, context, config, options, now); assert.equal(details.name, 'Paciente teste'); assert.equal(details.birthDate, '1980-01-01');
  assert.throws(() => r.normalizeDetails({ ...input, phone: '' }, context, config, options, now), /celular/);
  const strict = { ...config, cardRequiredKeys: ['insurance:plan'], expiryRequiredKeys: ['insurance:plan'] };
  assert.throws(() => r.normalizeDetails(input, context, strict, options, now), /carteirinha/);
  assert.throws(() => r.normalizeDetails({ ...input, cardNumber: 'TEST', cardExpiry: '2026-11-12' }, context, strict, options, now), /validade/);
});
test('private configuration validates horizon, scopes and plan requirements', () => {
  assert.equal(r.normalizeConfig(r.DEFAULT_CONFIG).enabled, false);
  assert.equal(r.normalizeConfig({ ...r.DEFAULT_CONFIG, ...config, enabled: true, address: '', contact: '' }).enabled, true, 'Read-only availability does not require receipt details');
  assert.throws(() => r.normalizeConfig({ ...r.DEFAULT_CONFIG, enabled: true }), /Selecione/);
  assert.throws(() => r.normalizeConfig({ ...r.DEFAULT_CONFIG, horizonDays: 500 }), /90 dias/);
  assert.throws(() => r.validateSelection({ ...config, scheduleIds: ['physio'] }, options), /agenda/);
  assert.throws(() => r.normalizeConfig({ ...r.DEFAULT_CONFIG, cardRequiredKeys: ['other'] }), /exigências/);
});
test('opaque contexts expire, bound capacity and serialize same-context requests', async () => {
  let clock = 0; const store = r.createContexts({ now: () => clock, ttlMs: 1000, max: 1 });
  const token = store.create({ verified: true }); assert.equal(token.length, 43); assert.throws(() => store.create({}), { status: 503 });
  let release; const pending = store.run(token, () => new Promise(resolve => { release = resolve; }));
  await assert.rejects(() => store.run(token, async () => true), { code: 'BOOKING_BUSY' }); release(true); await pending;
  clock = 1000; assert.throws(() => store.get(token), { status: 410 }); assert.ok(store.create({}));
});
test('restricted connector matches exact CPF, rejects duplicate/inconsistent registrations and logs off', async () => {
  let records = [], hasMore = false, logins = 0, logouts = 0, failed = false;
  const connector = createBookingConnector({ env: { STENCI_BOOKING_USERNAME: 'test', STENCI_BOOKING_PASSWORD: 'synthetic' }, configFactory: () => ({}), serviceFactory: () => ({ authenticateUser: async () => { logins++; }, logout: async () => { logouts++; }, searchPatients: async () => { if (failed) throw new Error('Vendor private data'); return { items: records, hasMore }; } }) });
  const patient = { id: 'p1', name: 'Synthetic Person', identity: { type: 'cpf', value: '529.982.247-25' }, birthDate: '1980-01-01', cellphone: '41999991234' };
  records = [{ ...patient, identity: { type: 'cpf', value: '52998224724' } }]; assert.equal(await connector.lookup(config, '52998224725'), null);
  records = [patient]; assert.equal((await connector.lookup(config, '52998224725')).externalId, 'p1');
  records.push({ ...patient, id: 'p2' }); await assert.rejects(() => connector.lookup(config, '52998224725'), { code: 'BOOKING_PATIENT_REVIEW' });
  records = [{ ...patient, birthDate: null }]; await assert.rejects(() => connector.lookup(config, '52998224725'), { code: 'BOOKING_PATIENT_REVIEW' });
  records = []; hasMore = true; await assert.rejects(() => connector.lookup(config, '52998224725'), { code: 'BOOKING_UPSTREAM_INCOMPLETE' });
  failed = true; await assert.rejects(() => connector.lookup(config, '52998224725')); assert.equal(logins, logouts); assert.equal(connector.confirm, undefined);
});
test('connector uses only confirmed GET contracts and strips other patients', async () => {
  const calls = [], raw = { ...row(), patient: null, id: null, reserves: 1, available: { insurancePlans: ['plan'] } };
  const payloads = {
    '/v1/schedules': { items: [{ id: 'evaluation', name: 'Avaliação', type: 'elective', place: { id: 'matrix', name: 'Realmed Matriz' } }, { id: 'other', name: 'Other', type: 'elective', place: { id: 'branch', name: 'Other clinic' } }] },
    '/v1/schedule-expenses': { items: [{ id: 'consultation', name: 'Consulta', scheduleIds: ['evaluation'], insuranceIds: ['insurance'] }] },
    '/v1/schedule-insurance-plans': { items: [{ id: 'insurance', name: 'Convênio', plan: { id: 'plan', name: 'Plano' }, scheduleIds: ['evaluation'] }] },
    '/v1/calendar': { items: [raw, { ...raw, id: 'private-id', patient: { id: 'secret', name: 'Never publish this' } }] },
  };
  const connector = createBookingConnector({ env: { STENCI_BOOKING_USERNAME: 'test', STENCI_BOOKING_PASSWORD: 'synthetic' }, configFactory: () => ({}), serviceFactory: () => ({ authenticateUser: async () => {}, logout: async () => {}, client: { request: async (path, opts) => { calls.push([path, opts]); assert.equal(opts.method, undefined); return payloads[path]; } } }) });
  const result = await connector.availability(config, date); assert.equal(result.options.schedules.length, 1); assert.ok(!JSON.stringify(result).includes('Never publish')); assert.ok(!JSON.stringify(result).includes('private-id'));
  assert.equal(calls.at(-1)[1].query.scheduleId, 'evaluation');
  const unconfigured = createBookingConnector({ env: {} }); assert.equal(unconfigured.ready(config), false);
});
