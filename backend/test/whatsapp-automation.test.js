const test = require('node:test')
const assert = require('node:assert/strict')
const { equalSecret } = require('../middleware/serviceAuth')
const { normalizeEvent, normalizeAbsenceChoice, normalizeSurvey, validateResumptionSource } = require('../services/whatsappAutomation')
const { createWhatsAppStenci } = require('../services/whatsappStenci')

test('chatbot service secrets use exact comparison without accepting missing values', () => {
  assert.equal(equalSecret('secret-value', 'secret-value'), true)
  assert.equal(equalSecret('secret-value', 'secret-other'), false)
  assert.equal(equalSecret('', 'secret-value'), false)
  assert.equal(equalSecret('secret-value', ''), false)
})

test('WhatsApp events validate period, campaign text and explicit audience fields', () => {
  const event = normalizeEvent({
    type: 'campaign', name: 'Outubro Rosa', startDate: '2026-10-01', endDate: '2026-10-31',
    message: 'Mensagem aprovada', status: 'draft', sendAt: '2026-10-01T08:00', sendDeadlineAt: '2026-10-01T18:00',
    audience: { patientStatus: 'active', gender: 'female', ageMin: 18, ageMax: 80, services: ['Pilates', 'Pilates'] },
  })
  assert.equal(event.type, 'CAMPAIGN')
  assert.deepEqual(JSON.parse(event.audience), { patientStatus: 'ACTIVE', gender: 'FEMALE', ageMin: 18, ageMax: 80, services: ['Pilates'] })
  assert.throws(() => normalizeEvent({ type: 'campaign', name: 'Sem texto', startDate: '2026-10-01', endDate: '2026-10-31' }), error => error.status === 422)
  assert.throws(() => normalizeEvent({ type: 'holiday', name: 'Inválido', startDate: '2026-12-02', endDate: '2026-12-01' }), error => error.status === 422)
})

test('absence responses and final survey accept only closed business values', () => {
  assert.equal(normalizeAbsenceChoice('stop_treatment'), 'STOP_TREATMENT')
  assert.throws(() => normalizeAbsenceChoice('charge-now'), error => error.status === 422)
  assert.deepEqual(normalizeSurvey({ structureRating: 5, serviceRating: 4, professionalsRating: 5, overallRating: 5, wouldRecommend: true, comment: 'Muito bom' }), {
    structureRating: 5, serviceRating: 4, professionalsRating: 5, overallRating: 5, wouldRecommend: true, comment: 'Muito bom',
  })
  assert.throws(() => normalizeSurvey({ structureRating: 6, serviceRating: 4, professionalsRating: 5, overallRating: 5, wouldRecommend: true }), error => error.status === 422)
})

test('resumption sources must belong to the case snapshot and cannot be reused', () => {
  const caseRow = { patient_external_id: 'patient-a', absence_snapshot: JSON.stringify({ history: [{ id: 'miss-a', date: '2026-11-17', source_schedule_id: 'schedule-a', schedule_ids: ['schedule-a'] }] }) }
  const used = new Set()
  assert.equal(validateResumptionSource(caseRow, { appointmentId: 'miss-a', date: '2026-11-17', scheduleId: 'schedule-a' }, used).id, 'miss-a')
  assert.throws(() => validateResumptionSource(caseRow, { appointmentId: 'miss-a', date: '2026-11-17', scheduleId: 'schedule-a' }, used), error => error.code === 'RESUMPTION_SOURCE_MISMATCH')
  assert.throws(() => validateResumptionSource(caseRow, { appointmentId: 'miss-other', date: '2026-11-17', scheduleId: 'schedule-a' }, new Set()), error => error.code === 'RESUMPTION_SOURCE_MISMATCH')
})

test('Stenci writes revalidate a free slot, copy the source and reconcile through the calendar', async () => {
  const sourceId = 'a'.repeat(24), sourceSchedule = 'b'.repeat(24), targetSchedule = 'c'.repeat(24), professionalId = 'd'.repeat(24), patientId = 'e'.repeat(24)
  const calendars = new Map([
    [`2026-11-17:${sourceSchedule}`, [{ id: sourceId, key: 'f'.repeat(32), scheduleId: sourceSchedule, startDate: '2026-11-17T08:00', endDate: '2026-11-17T08:01', status: 'missed', isSlot: false, patient: { id: patientId, name: 'Paciente' }, professional: { id: professionalId }, insurance: { id: 'insurance', planId: 'plan' }, expenses: [{ expense: { id: 'expense' } }], reserves: 1 }]],
    [`2026-11-18:${targetSchedule}`, [{ scheduleId: targetSchedule, startDate: '2026-11-18T09:00', endDate: '2026-11-18T09:01', status: 'available', isSlot: false, available: { professionals: [{ id: professionalId, specialties: ['223605'] }], insurancePlans: ['plan'] } }]],
  ])
  const calls = []
  const serviceFactory = () => ({
    authenticateUser: async () => {}, logout: async () => {},
    client: { request: async (path, options = {}) => {
      calls.push([path, options.method || 'GET'])
      if (path === '/v1/calendar') return { items: calendars.get(`${options.query.date}:${options.query.scheduleId}`) || [] }
      if (path === '/v1/appointments' && options.method === 'POST') {
        const created = { ...options.body, id: '1'.repeat(24), key: '2'.repeat(32), patient: options.body.patient, status: 'scheduled', isSlot: false }
        calendars.set(`2026-11-18:${targetSchedule}`, [created])
        return created
      }
      throw new Error(`Unexpected ${options.method || 'GET'} ${path}`)
    } },
  })
  const connector = createWhatsAppStenci({ env: { STENCI_FISIO_USERNAME: 'test', STENCI_FISIO_PASSWORD: 'secret' }, configFactory: () => ({}), serviceFactory })
  const result = await connector.copyAppointment({ appointmentId: sourceId, date: '2026-11-17', scheduleId: sourceSchedule }, { scheduleId: targetSchedule, professionalId, startDate: '2026-11-18T09:00', endDate: '2026-11-18T09:01' })
  assert.equal(result.appointmentId, '1'.repeat(24))
  assert.equal(result.patientId, patientId)
  assert.ok(calls.some(([path, method]) => path === '/v1/appointments' && method === 'POST'))
  await assert.rejects(() => connector.copyAppointment({ appointmentId: sourceId, date: '2026-11-17', scheduleId: sourceSchedule }, { scheduleId: targetSchedule, professionalId, startDate: '2026-11-18T09:00', endDate: '2026-11-18T09:01' }, '9'.repeat(24)), error => error.code === 'RESUMPTION_PATIENT_MISMATCH')
})
