const crypto = require('node:crypto');
const TIME_ZONE = 'America/Sao_Paulo';
const CONTRACT_MESSAGE = 'A confirmação online ainda não está disponível. Nenhum agendamento foi realizado. Entre em contato com a recepção.';
const DEFAULT_CONFIG = Object.freeze({ enabled: false, useInstitutionalConnection: false, horizonDays: 30, scheduleIds: [], serviceId: '', insuranceKeys: [], cardRequiredKeys: [], expiryRequiredKeys: [], address: '', contact: '', revision: 0 });
const fail = (message, status = 422, code = 'BOOKING_INVALID_INPUT') => Object.assign(new Error(message), { status, code, bookingSafe: true });
const digits = value => String(value || '').replace(/\D/g, '');
const clean = (value, max = 180) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
function validCpf(value) {
  const cpf = digits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length++) {
    const sum = [...cpf.slice(0, length)].reduce((total, n, i) => total + Number(n) * (length + 1 - i), 0);
    if (((sum * 10) % 11) % 10 !== Number(cpf[length])) return false;
  }
  return true;
}
function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value ? value : null;
}
function today(now = Date.now()) { return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now)); }
function addDays(date, amount) { return new Date(Date.parse(date + 'T12:00:00Z') + amount * 86400000).toISOString().slice(0, 10); }
function dateBounds(config, now = Date.now()) { const minDate = today(now); return { minDate, maxDate: addDays(minDate, config.horizonDays - 1) }; }
function checkDate(date, config, now = Date.now()) {
  const bounds = dateBounds(config, now);
  if (!dateOnly(date) || date < bounds.minDate || date > bounds.maxDate) throw fail('Escolha uma data dentro do período disponível.');
}
function normalizeConfig(input) {
  const list = value => Array.isArray(value) ? [...new Set(value.map(v => clean(v, 130)).filter(Boolean))] : [];
  const result = { enabled: input?.enabled === true, useInstitutionalConnection: input?.useInstitutionalConnection === true, horizonDays: Number(input?.horizonDays), scheduleIds: list(input?.scheduleIds), serviceId: clean(input?.serviceId, 80), insuranceKeys: list(input?.insuranceKeys), cardRequiredKeys: list(input?.cardRequiredKeys), expiryRequiredKeys: list(input?.expiryRequiredKeys), address: clean(input?.address, 250), contact: clean(input?.contact, 160) };
  if (!Number.isInteger(result.horizonDays) || result.horizonDays < 1 || result.horizonDays > 90) throw fail('O período deve estar entre 1 e 90 dias.');
  if (result.scheduleIds.length > 10 || result.insuranceKeys.length > 300) throw fail('Seleção de agendas ou convênios excedida.');
  if (result.cardRequiredKeys.some(k => !result.insuranceKeys.includes(k)) || result.expiryRequiredKeys.some(k => !result.cardRequiredKeys.includes(k))) throw fail('Revise as exigências de carteirinha e validade dos convênios selecionados.');
  // This flag enables reads only. Address/contact belong to the future confirmed receipt.
  if (result.enabled && (!result.scheduleIds.length || !result.serviceId || !result.insuranceKeys.length)) throw fail('Selecione as agendas, o serviço e os convênios antes de habilitar as consultas.');
  return result;
}
function validateSelection(config, options) {
  if (config.scheduleIds.some(id => !options.schedules.some(s => s.id === id))) throw fail('Uma agenda selecionada está inativa ou fora da Realmed Matriz.');
  const service = options.services.find(s => s.id === config.serviceId);
  if (config.serviceId && (!service || config.scheduleIds.some(id => !service.scheduleIds.includes(id)))) throw fail('O serviço precisa estar disponível em todas as agendas selecionadas.');
  if (config.insuranceKeys.some(key => !options.insurances.some(p => p.key === key && config.scheduleIds.some(id => p.scheduleIds.includes(id)) && service?.insuranceIds.includes(p.insuranceId)))) throw fail('Um convênio/plano não atende ao serviço e às agendas selecionadas.');
}
function configuredInsurances(config, options) {
  const service = options.services.find(s => s.id === config.serviceId);
  return options.insurances.filter(p => config.insuranceKeys.includes(p.key) && service?.insuranceIds.includes(p.insuranceId) && p.scheduleIds.some(id => config.scheduleIds.includes(id))).map(p => ({ key: p.key, insuranceName: p.insuranceName, planName: p.planName, cardRequired: config.cardRequiredKeys.includes(p.key), expiryRequired: config.expiryRequiredKeys.includes(p.key) }));
}
function normalizeDetails(input, context, config, options, now = Date.now()) {
  const patient = context.patient;
  const name = patient?.name || clean(input?.name, 160);
  const birthDate = patient?.birthDate || dateOnly(input?.birthDate);
  const phone = digits(input?.phone);
  const insurance = configuredInsurances(config, options).find(p => p.key === input?.insuranceKey);
  if (name.length < 3 || !name.includes(' ')) throw fail('Informe o nome completo.');
  if (!birthDate || birthDate > today(now) || birthDate < '1900-01-01') throw fail('Informe uma data de nascimento válida.');
  if (!/^[1-9]{2}9\d{8}$/.test(phone)) throw fail('Informe o celular com DDD e 9 dígitos.');
  if (!insurance) throw fail('Selecione um convênio e plano disponíveis para avaliação.');
  const cardNumber = clean(input?.cardNumber, 80), cardExpiry = input?.cardExpiry ? dateOnly(input.cardExpiry) : '';
  if (insurance.cardRequired && !cardNumber) throw fail('Informe o número da carteirinha.');
  if ((insurance.expiryRequired || input?.cardExpiry) && (!cardExpiry || cardExpiry < today(now))) throw fail('Informe uma validade de carteirinha vigente.');
  return { name, birthDate, phone, insuranceKey: insurance.key, cardNumber, cardExpiry: cardExpiry || '' };
}
// The captured /calendar contract uses local clinic timestamps (YYYY-MM-DDTHH:mm).
// Explicit offsets remain supported; never let the server's operating-system zone interpret them.
function timestamp(value) {
  if (typeof value !== 'string') return NaN;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(value);
  if (!match || !dateOnly(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] || 0) > 59) return NaN;
  return Date.parse(match[5] ? value : value + '-03:00');
}
function makeGrid({ date, config, options, calendars, insuranceKey, now = Date.now() }) {
  checkDate(date, config, now);
  validateSelection(config, options);
  const insurance = options.insurances.find(p => p.key === insuranceKey && config.insuranceKeys.includes(p.key));
  if (!insurance) throw fail('Selecione um convênio e plano disponíveis para avaliação.');
  const service = options.services.find(s => s.id === config.serviceId);
  const candidates = config.scheduleIds.filter(id => service?.scheduleIds.includes(id) && service.insuranceIds.includes(insurance.insuranceId) && insurance.scheduleIds.includes(id));
  // Incomplete/missing snapshots fail the whole query; they never become empty/free schedules.
  for (const id of config.scheduleIds) if (!Array.isArray(calendars[id])) throw fail('Não foi possível consultar a agenda completa. Tente novamente.', 502, 'BOOKING_AVAILABILITY_FAILED');
  return Array.from({ length: 36 }, (_, index) => {
    const minute = 480 + index * 20, time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    const start = Date.parse(`${date}T${time}:00-03:00`), end = start + 20 * 60000;
    const available = start >= now + 2 * 3600000 && candidates.some(id => {
      const rows = calendars[id].map(row => ({ ...row, start: timestamp(row.startDate), end: timestamp(row.endDate) }));
      // A malformed position makes this agenda inconclusive, not available.
      if (rows.some(row => !Number.isFinite(row.start) || !Number.isFinite(row.end) || row.end <= row.start)) return false;
      const overlaps = rows.filter(row => row.start < end && row.end > start);
      if (!overlaps.length || overlaps.some(row => row.scheduleId !== id || row.status !== 'available' || row.occupied || row.isSlot !== false || !Array.isArray(row.planIds) || !row.planIds.includes(insurance.planId))) return false;
      let coveredUntil = start;
      for (const row of overlaps.sort((a, b) => a.start - b.start)) {
        if (row.start > coveredUntil) return false;
        coveredUntil = Math.max(coveredUntil, row.end);
      }
      return coveredUntil >= end;
    });
    return { time, available, label: available ? 'Disponível' : 'Ocupado' };
  });
}
function createContexts({ now = Date.now, max = 1000, ttlMs = 30 * 60000 } = {}) {
  const entries = new Map(), key = token => crypto.createHash('sha256').update(String(token)).digest('hex');
  function prune() { for (const [id, item] of entries) if (item.expiresAt <= now()) entries.delete(id); }
  return {
    create(data) { prune(); if (entries.size >= max) throw fail('Há muitas consultas em andamento. Tente novamente em alguns minutos.', 503); const token = crypto.randomBytes(32).toString('base64url'); entries.set(key(token), { ...data, expiresAt: now() + ttlMs, attempts: 0, busy: false }); return token; },
    get(token) { prune(); const item = typeof token === 'string' && /^[\w-]{43}$/.test(token) ? entries.get(key(token)) : null; if (!item) throw fail('Sua consulta expirou. Informe o CPF novamente.', 410, 'BOOKING_CONTEXT_EXPIRED'); return item; },
    remove(token) { entries.delete(key(token)); },
    async run(token, operation) { const item = this.get(token); if (item.busy) throw fail('Aguarde a consulta em andamento.', 409, 'BOOKING_BUSY'); item.busy = true; try { const result = await operation(item); this.get(token); return result; } finally { item.busy = false; } },
  };
}
module.exports = { TIME_ZONE, CONTRACT_MESSAGE, DEFAULT_CONFIG, fail, digits, clean, validCpf, dateOnly, today, dateBounds, normalizeConfig, validateSelection, configuredInsurances, normalizeDetails, makeGrid, createContexts };
