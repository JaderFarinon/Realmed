const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('node:crypto');
const rules = require('../services/evaluationBooking');
const { createBookingConnector } = require('../services/evaluationBookingStenci');

function createEvaluationBooking({ db, connector = createBookingConnector(), now = Date.now, adminMiddleware } = {}) {
  const publicRouter = express.Router(), privateRouter = express.Router();
  const contexts = rules.createContexts({ now });
  const birthFailures = new Map(), hashSecret = crypto.randomBytes(32);
  const fingerprint = cpf => crypto.createHmac('sha256', hashSecret).update(cpf).digest('hex');
  function birthQuota(cpf, increment = false) {
    for (const [key, value] of birthFailures) if (value.expiresAt <= now()) birthFailures.delete(key);
    const key = fingerprint(cpf), entry = birthFailures.get(key) || { count: 0, expiresAt: now() + 15 * 60000 };
    if (entry.count >= 5) throw rules.fail('Não foi possível confirmar o cadastro. Aguarde 15 minutos ou entre em contato com a recepção.', 429, 'BOOKING_BIRTH_LIMIT');
    if (increment) { if (birthFailures.size >= 10000 && !birthFailures.has(key)) throw rules.fail('Tente novamente mais tarde.', 503); entry.count++; birthFailures.set(key, entry); }
  }
  async function config() {
    const row = await db('evaluation_booking_config').where({ id: 1 }).first();
    const settings = typeof row?.settings === 'string' ? JSON.parse(row.settings) : row?.settings;
    return { ...rules.DEFAULT_CONFIG, ...settings, revision: row?.revision || 0 };
  }
  async function active() {
    const settings = await config();
    if (!settings.enabled || !connector.ready(settings)) throw rules.fail('O agendamento online está em preparação. Entre em contato com a recepção.', 503, 'BOOKING_NOT_CONFIGURED');
    return settings;
  }
  async function unchanged(settings) {
    if ((await config()).revision !== settings.revision) throw rules.fail('A disponibilidade foi atualizada pela clínica. Consulte novamente.', 409, 'BOOKING_CONFIG_CHANGED');
  }
  const handle = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
      // Vendor messages and request bodies can contain patient data. Never expose/log them.
      if (error.code === 'BOOKING_BIRTH_LIMIT') res.set('Retry-After', '900');
      res.status(error.bookingSafe ? error.status : 502).json({ error: error.bookingSafe ? error.message : 'Não foi possível consultar o Stenci. Tente novamente ou fale com a recepção.', code: error.bookingSafe ? error.code : 'BOOKING_UPSTREAM_FAILED' });
    }
  };
  const context = (req, operation) => contexts.run(req.get('X-Booking-Context'), operation);
  const verified = item => { if (!item.verified) throw rules.fail('Confirme a data de nascimento para continuar.', 403, 'BOOKING_BIRTH_REQUIRED'); };
  const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('Referrer-Policy', 'no-referrer'); next(); };
  publicRouter.use(noStore);
  publicRouter.use(rateLimit({ windowMs: 60000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas consultas. Aguarde um minuto e tente novamente.' } }));
  publicRouter.get('/config', handle(async (_req, res) => {
    const settings = await config();
    res.json({ enabled: settings.enabled && connector.ready(settings), confirmationEnabled: false, confirmationMessage: rules.CONTRACT_MESSAGE, unit: 'Realmed Matriz', address: settings.address, contact: settings.contact, horizonDays: settings.horizonDays, ...rules.dateBounds(settings, now()), serverNow: new Date(now()).toISOString(), timeZone: rules.TIME_ZONE, leadMinutes: 120, durationMinutes: 20 });
  }));
  publicRouter.post('/identify', rateLimit({ windowMs: 15 * 60000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas consultas de CPF. Aguarde 15 minutos ou fale com a recepção.' } }), handle(async (req, res) => {
    if (!rules.validCpf(req.body?.cpf)) throw rules.fail('Informe um CPF válido.');
    const settings = await active(), cpf = rules.digits(req.body.cpf);
    birthQuota(cpf);
    const patient = await connector.lookup(settings, cpf);
    await unchanged(settings);
    const token = contexts.create({ cpf, patient, verified: !patient, details: null });
    res.json({ context: token, needsBirthDate: Boolean(patient), expiresInSeconds: 1800 });
  }));
  publicRouter.post('/birth-date', handle(async (req, res) => res.json(await context(req, async item => {
    await active();
    if (!item.patient) throw rules.fail('Preencha os dados para o novo cadastro.');
    birthQuota(item.cpf);
    if (!rules.dateOnly(req.body?.birthDate) || req.body.birthDate !== item.patient.birthDate) {
      birthQuota(item.cpf, true); item.attempts++;
      throw rules.fail('A data de nascimento não confere. Verifique o preenchimento ou fale com a recepção.', 422, 'BOOKING_BIRTH_MISMATCH');
    }
    item.verified = true;
    return { verified: true };
  }))));
  publicRouter.post('/catalogs', handle(async (req, res) => res.json(await context(req, async item => {
    verified(item);
    const settings = await active(), options = await connector.options(settings);
    rules.validateSelection(settings, options); await unchanged(settings);
    const insurances = rules.configuredInsurances(settings, options);
    const patient = item.patient;
    const insuranceKey = patient ? options.insurances.find(p => p.insuranceId === patient.insuranceId && p.planId === patient.planId)?.key : '';
    return { insurances, existing: Boolean(patient), patient: patient ? { name: patient.name, birthDate: patient.birthDate, phone: patient.phone.replace(/^55(?=\d{11}$)/, ''), insuranceKey: insurances.some(p => p.key === insuranceKey) ? insuranceKey : '', cardNumber: patient.cardNumber, cardExpiry: patient.cardExpiry } : null };
  }))));
  publicRouter.post('/details', handle(async (req, res) => res.json(await context(req, async item => {
    verified(item);
    const settings = await active(), options = await connector.options(settings);
    const details = rules.normalizeDetails(req.body, item, settings, options, now());
    await unchanged(settings); item.details = details;
    return { prepared: true }; // Preparation only: nothing is created or changed in Stenci.
  }))));
  publicRouter.post('/availability', handle(async (req, res) => res.json(await context(req, async item => {
    verified(item);
    if (!item.details) throw rules.fail('Confira seus dados antes de escolher o horário.');
    const settings = await active(), date = req.body?.date;
    // Date validation also runs after the upstream read, with a fresh server clock.
    const bounds = rules.dateBounds(settings, now());
    if (!rules.dateOnly(date) || date < bounds.minDate || date > bounds.maxDate) throw rules.fail('Escolha uma data dentro do período disponível.');
    const data = await connector.availability(settings, date);
    await unchanged(settings);
    const slots = rules.makeGrid({ date, config: settings, ...data, insuranceKey: item.details.insuranceKey, now: now() });
    return { date, slots, serverNow: new Date(now()).toISOString(), confirmationEnabled: false };
  }))));
  publicRouter.post('/confirm', handle(async (req, _res) => context(req, async item => {
    verified(item);
    // Deliberately unconditional. A config/env/body flag cannot enable unverified writes.
    throw rules.fail(rules.CONTRACT_MESSAGE, 503, 'BOOKING_WRITE_CONTRACT_PENDING');
  })));
  publicRouter.post('/result', handle(async (req, res) => res.json(await context(req, async item => {
    verified(item);
    return { status: 'not_submitted', confirmationEnabled: false, message: rules.CONTRACT_MESSAGE };
  }))));
  publicRouter.delete('/context', handle(async (req, res) => { contexts.remove(req.get('X-Booking-Context')); res.status(204).end(); }));

  privateRouter.use(noStore, ...(adminMiddleware || [require('../middleware/auth'), require('../middleware/permission').permissionMiddleware(['admin', 'masteradmin'])]));
  privateRouter.get('/config', handle(async (_req, res) => res.json({ settings: await config(), confirmationEnabled: false, pendingContracts: ['Cadastro do paciente com convênio', 'Criação da avaliação', 'Consulta e reconciliação da confirmação', 'Conflito com agendamento pela recepção'] })));
  privateRouter.post('/options', handle(async (req, res) => {
    const settings = await config();
    res.json(await connector.options({ ...settings, useInstitutionalConnection: req.body?.useInstitutionalConnection === true }));
  }));
  privateRouter.post('/availability', handle(async (req, res) => {
    const settings = await active(), date = req.body?.date, insuranceKey = req.body?.insuranceKey;
    const bounds = rules.dateBounds(settings, now());
    if (!rules.dateOnly(date) || date < bounds.minDate || date > bounds.maxDate) throw rules.fail('Escolha uma data dentro do período disponível.');
    if (!settings.insuranceKeys.includes(insuranceKey)) throw rules.fail('Selecione um convênio e plano disponíveis para avaliação.');
    const data = await connector.availability(settings, date);
    await unchanged(settings);
    res.json({ date, slots: rules.makeGrid({ date, config: settings, ...data, insuranceKey, now: now() }), serverNow: new Date(now()).toISOString(), confirmationEnabled: false });
  }));
  privateRouter.put('/config', handle(async (req, res) => {
    const settings = rules.normalizeConfig(req.body);
    // The clinic can always disable public reads, including during a Stenci outage.
    if (settings.enabled) rules.validateSelection(settings, await connector.options(settings));
    const revision = await db.transaction(async trx => {
      const current = await trx('evaluation_booking_config').where({ id: 1 }).forUpdate().first();
      if (Number(req.body?.revision) !== current.revision) throw rules.fail('Outra pessoa alterou esta configuração. Recarregue antes de salvar.', 409, 'BOOKING_CONFIG_CONFLICT');
      const revision = current.revision + 1;
      await trx('evaluation_booking_config').where({ id: 1 }).update({ settings: JSON.stringify(settings), revision, updated_by: req.user.id, updated_at: trx.fn.now() });
      await trx('evaluation_booking_audit').insert({ settings: JSON.stringify(settings), revision, actor_id: req.user.id });
      return revision;
    });
    res.json({ settings: { ...settings, revision }, confirmationEnabled: false });
  }));
  return { publicRouter, privateRouter };
}
module.exports = { createEvaluationBooking };
