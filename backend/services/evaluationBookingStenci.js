const crypto = require('node:crypto');
const StenciClient = require('../../integrations/stenci/StenciClient');
const StenciService = require('../../integrations/stenci/StenciService');
const { getStenciConfig } = require('../../integrations/stenci/config');
const { withTransientStenci } = require('./transientStenciService');
const { serializePhysioStenci } = require('./physioStenciSession');
const { fail, digits, clean, dateOnly } = require('./evaluationBooking');
const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function complete(data) {
  if (!Array.isArray(data?.items) || data.hasMore || (Number.isFinite(data.total) && data.total > data.items.length)) throw fail('O Stenci retornou uma consulta incompleta. Tente novamente.', 502, 'BOOKING_UPSTREAM_INCOMPLETE');
  return data.items;
}
function optionsFrom(schedules, services, insurances) {
  const matrix = schedules.filter(s => s.id && s.place?.id && normalized(s.place.name) === 'realmed matriz' && s.type === 'elective');
  return {
    schedules: matrix.map(s => ({ id: String(s.id), name: clean(s.name), placeName: 'Realmed Matriz' })),
    services: services.filter(s => s.id && s.name && Array.isArray(s.scheduleIds) && Array.isArray(s.insuranceIds)).map(s => ({ id: String(s.id), name: clean(s.name), scheduleIds: s.scheduleIds.map(String), insuranceIds: s.insuranceIds.map(String) })),
    insurances: insurances.filter(p => p.id && p.plan?.id && Array.isArray(p.scheduleIds)).map(p => ({ key: `${p.id}:${p.plan.id}`, insuranceId: String(p.id), planId: String(p.plan.id), insuranceName: clean(p.name), planName: clean(p.customName || p.plan.name), scheduleIds: p.scheduleIds.map(String) })),
  };
}
function createBookingConnector({ env = process.env, serviceFactory, configFactory = getStenciConfig, logger = { error() {}, info() {}, warn() {}, debug() {} } } = {}) {
  let pendingOperations = 0;
  function credentials(settings) {
    if (env.STENCI_BOOKING_USERNAME && env.STENCI_BOOKING_PASSWORD) return { username: env.STENCI_BOOKING_USERNAME, password: env.STENCI_BOOKING_PASSWORD };
    if (settings.useInstitutionalConnection && env.STENCI_FISIO_USERNAME && env.STENCI_FISIO_PASSWORD) return { username: env.STENCI_FISIO_USERNAME, password: env.STENCI_FISIO_PASSWORD };
    throw fail('A conexão para agendamento online ainda não foi configurada pela clínica.', 503, 'BOOKING_CONNECTION_PENDING');
  }
  // Sharing the institutional account also shares its serialization and logout boundary.
  async function run(settings, operation) {
    const credential = credentials(settings);
    if (pendingOperations >= 4) throw fail('As consultas estão ocupadas. Aguarde um momento e tente novamente.', 503, 'BOOKING_CONNECTION_BUSY');
    pendingOperations++;
    const queuedAt = Date.now();
    try { return await serializePhysioStenci(async () => {
      if (Date.now() - queuedAt > 30000) throw fail('A consulta demorou mais que o esperado. Tente novamente.', 503, 'BOOKING_CONNECTION_BUSY');
      const config = configFactory(), client = serviceFactory ? null : new StenciClient({ config, logger, deadlineAt: Date.now() + 45000 });
      const service = serviceFactory ? serviceFactory(config) : new StenciService(client);
      return withTransientStenci(service, async () => {
        await service.authenticateUser(credential.username, credential.password, crypto.randomUUID().replace(/-/g, ''));
        return operation(service);
      }, logger);
    }); } finally { pendingOperations--; }
  }
  async function options(service) {
    const read = (path) => service.client.request(path, { base: 'apiX', query: { limit: 0, active: true, ...(path === '/v1/schedules' ? { type: 'elective' } : {}) } });
    const schedules = complete(await read('/v1/schedules'));
    const services = complete(await read('/v1/schedule-expenses'));
    const insurances = complete(await read('/v1/schedule-insurance-plans'));
    return optionsFrom(schedules, services, insurances);
  }
  return {
    ready(settings) { try { credentials(settings); return true; } catch { return false; } },
    options: settings => run(settings, options),
    lookup: (settings, cpf) => run(settings, async service => {
      const exact = new Map();
      for (let offset = 0; offset < 1000; offset += 100) {
        const data = await service.searchPatients(cpf, { limit: 100, offset });
        if (!Array.isArray(data?.items) || typeof data.hasMore !== 'boolean') throw fail('Não foi possível conferir o cadastro. Tente novamente.', 502);
        for (const p of data.items) if (p.identity?.type === 'cpf' && digits(p.identity.value) === cpf) {
          if (!p.id) throw fail('Este cadastro precisa de conferência pela recepção.', 409, 'BOOKING_PATIENT_REVIEW');
          const birthDate = dateOnly(String(p.birthDate || '').slice(0, 10));
          const insurance = p.patient?.insurance;
          const patient = { externalId: String(p.id), name: clean(p.name, 160), birthDate, phone: digits(p.cellphone || p.phone), insuranceId: String(insurance?.id || ''), planId: String(insurance?.planId || insurance?.plan?.id || ''), cardNumber: clean(insurance?.record, 80), cardExpiry: dateOnly(String(insurance?.validity || '').slice(0, 10)) || '' };
          if (!birthDate || (exact.has(patient.externalId) && JSON.stringify(exact.get(patient.externalId)) !== JSON.stringify(patient))) throw fail('Este cadastro precisa de conferência pela recepção.', 409, 'BOOKING_PATIENT_REVIEW');
          exact.set(patient.externalId, patient);
        }
        if (exact.size > 1) throw fail('Este cadastro precisa de conferência pela recepção.', 409, 'BOOKING_PATIENT_REVIEW');
        if (!data.hasMore) return [...exact.values()][0] || null;
        if (!data.items.length) break;
      }
      throw fail('Não foi possível conferir o cadastro completo. Entre em contato com a recepção.', 502, 'BOOKING_UPSTREAM_INCOMPLETE');
    }),
    availability: (settings, date) => run(settings, async service => {
      const catalogs = await options(service);
      require('./evaluationBooking').validateSelection(settings, catalogs);
      const calendars = {};
      for (const scheduleId of settings.scheduleIds) {
        const data = await service.client.request('/v1/calendar', { base: 'apiX', query: { type: 'elective', date, scheduleId } });
        calendars[scheduleId] = complete(data).map(row => ({
          scheduleId: String(row.scheduleId || ''), startDate: row.startDate, endDate: row.endDate,
          status: row.status, occupied: Boolean(row.patient || row.id), isSlot: row.isSlot,
          // Calendar lists plan IDs; schedule-expenses lists parent insurance IDs.
          planIds: Array.isArray(row.available?.insurancePlans) ? row.available.insurancePlans.map(String) : null,
        }));
      }
      return { options: catalogs, calendars };
    }),
    // No write method until patient/appointment/reconciliation/conflict contracts are validated.
  };
}
module.exports = { createBookingConnector, optionsFrom, complete };
