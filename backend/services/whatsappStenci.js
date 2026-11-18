const crypto = require('node:crypto')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const { getStenciConfig } = require('../../integrations/stenci/config')
const { withTransientStenci } = require('./transientStenciService')
const { serializePhysioStenci } = require('./physioStenciSession')
const { fail } = require('./whatsappAutomation')

const dateOnly = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z'))
const localDateTime = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value) && dateOnly(value.slice(0, 10))
const id = value => typeof value === 'string' && /^[a-f0-9]{24,32}$/i.test(value)
const millis = value => Date.parse(String(value).length === 16 ? value + ':00-03:00' : String(value).match(/(?:Z|[+-]\d{2}:?\d{2})$/) ? value : value + '-03:00')
const publicAppointment = row => ({
  appointmentId: row?.id ? String(row.id) : null,
  key: row?.key ? String(row.key) : null,
  scheduleId: row?.scheduleId ? String(row.scheduleId) : null,
  startDate: row?.startDate || null,
  endDate: row?.endDate || null,
  status: row?.status || null,
  patientId: row?.patient?.id ? String(row.patient.id) : null,
  professionalId: row?.professional?.id ? String(row.professional.id) : null,
})

function createWhatsAppStenci({ env = process.env, configFactory = getStenciConfig, serviceFactory, logger = { error() {}, info() {}, warn() {}, debug() {} } } = {}) {
  function credentials() {
    const username = env.STENCI_FISIO_USERNAME || env.STENCI_BOOKING_USERNAME
    const password = env.STENCI_FISIO_PASSWORD || env.STENCI_BOOKING_PASSWORD
    if (!username || !password) throw fail('A conexão institucional do Stenci não está configurada.', 503, 'WHATSAPP_STENCI_CONNECTION_PENDING')
    return { username, password }
  }
  async function run(operation) {
    const credential = credentials()
    return serializePhysioStenci(async () => {
      const config = configFactory()
      const client = serviceFactory ? null : new StenciClient({ config, logger, deadlineAt: Date.now() + 60000 })
      const service = serviceFactory ? serviceFactory(config) : new StenciService(client)
      return withTransientStenci(service, async () => {
        await service.authenticateUser(credential.username, credential.password, crypto.randomUUID().replace(/-/g, ''))
        return operation(service)
      }, logger)
    })
  }
  async function calendar(service, date, scheduleId) {
    const data = await service.client.request('/v1/calendar', { base: 'apiX', query: { type: 'elective', date, scheduleId } })
    if (!Array.isArray(data?.items)) throw fail('O Stenci retornou uma agenda inválida.', 502, 'STENCI_CALENDAR_INVALID')
    return data.items
  }
  async function appointment(service, locator) {
    if (!id(locator.appointmentId) || !id(locator.scheduleId) || !dateOnly(locator.date)) throw fail('Identificação do agendamento inválida.')
    const row = (await calendar(service, locator.date, locator.scheduleId)).find(item => String(item.id || '') === locator.appointmentId)
    if (!row) throw fail('O agendamento não foi localizado na agenda informada.', 404, 'STENCI_APPOINTMENT_NOT_FOUND')
    return row
  }
  async function availableTarget(service, target) {
    if (!id(target.scheduleId) || !id(target.professionalId) || !localDateTime(target.startDate) || !localDateTime(target.endDate) || millis(target.endDate) <= millis(target.startDate) || millis(target.endDate) - millis(target.startDate) > 120 * 60000) throw fail('Destino do agendamento inválido.')
    const rows = await calendar(service, target.startDate.slice(0, 10), target.scheduleId)
    const overlapping = rows.filter(row => millis(row.startDate) < millis(target.endDate) && millis(row.endDate) > millis(target.startDate))
    if (!overlapping.length || overlapping.some(row => row.status !== 'available' || row.patient || row.id || row.isSlot !== false)) throw fail('O horário escolhido não está mais disponível.', 409, 'STENCI_SLOT_CONFLICT')
    let covered = millis(target.startDate)
    for (const row of overlapping.sort((a, b) => millis(a.startDate) - millis(b.startDate))) {
      if (millis(row.startDate) > covered) throw fail('A agenda não cobre todo o horário escolhido.', 409, 'STENCI_SLOT_CONFLICT')
      if (!Array.isArray(row.available?.professionals) || !row.available.professionals.some(item => String(item.id) === target.professionalId)) throw fail('O profissional não está disponível nesse horário.', 409, 'STENCI_PROFESSIONAL_CONFLICT')
      covered = Math.max(covered, millis(row.endDate))
    }
    if (covered < millis(target.endDate)) throw fail('A agenda não cobre todo o horário escolhido.', 409, 'STENCI_SLOT_CONFLICT')
    const professional = overlapping[0].available.professionals.find(item => String(item.id) === target.professionalId)
    return { rows, professional: { id: target.professionalId, specialties: Array.isArray(professional.specialties) ? professional.specialties : [] }, placeId: overlapping.find(row => row.placeId)?.placeId || null }
  }
  async function reconcileTarget(service, target, patientId, expectedId) {
    const rows = await calendar(service, target.startDate.slice(0, 10), target.scheduleId)
    const occupiedAtTarget = rows.filter(row => row.id && row.status !== 'available' && millis(row.startDate) < millis(target.endDate) && millis(row.endDate) > millis(target.startDate))
    const matches = occupiedAtTarget.filter(row =>
      row.id && row.startDate === target.startDate && String(row.patient?.id || '') === String(patientId || '') && (!expectedId || String(row.id) === String(expectedId)))
    if (matches.length !== 1 || occupiedAtTarget.some(row => String(row.id) !== String(matches[0].id))) return null
    return matches[0]
  }
  const createBodyFrom = (source, target, professional, placeId) => ({
    scheduleId: target.scheduleId,
    startDate: target.startDate,
    endDate: target.endDate,
    professional,
    patient: source.patient,
    insurance: source.insurance,
    status: ['scheduled', 'confirmed'].includes(source.status) ? source.status : 'scheduled',
    expenses: Array.isArray(source.expenses) ? source.expenses : [],
    arrivedAt: null,
    notes: source.notes || '',
    slot: false,
    reserves: source.reserves ?? 1,
    indicated: source.indicated ?? null,
    asoClient: source.asoClient ?? null,
    type: source.type ?? null,
    markerId: source.markerId ?? null,
    placeId: placeId || source.placeId || null,
    attendanceMode: source.attendanceMode || 'in_person',
  })
  async function writeAndReconcile(target, patientId, writer) {
    let response
    try { response = await run(writer) } catch (error) {
      const reconciled = await run(service => reconcileTarget(service, target, patientId)).catch(() => null)
      if (reconciled) return publicAppointment(reconciled)
      throw error
    }
    const reconciled = await run(service => reconcileTarget(service, target, patientId, response?.id)).catch(() => null)
    if (!reconciled) throw fail('O Stenci respondeu, mas a gravação não pôde ser reconciliada na agenda.', 502, 'STENCI_WRITE_AMBIGUOUS')
    return publicAppointment(reconciled)
  }

  return {
    ready() { try { credentials(); return true } catch { return false } },
    patient(patientId) {
      if (!id(patientId)) throw fail('Paciente Stenci inválido.')
      return run(async service => {
        const patient = await service.client.request(`/v1/patients/${patientId}`, { base: 'apiX' })
        if (!patient?.id || String(patient.id) !== patientId) throw fail('O Stenci não confirmou o paciente.', 502, 'STENCI_PATIENT_INVALID')
        const insurance = patient.patient?.insurance
        return { id: String(patient.id), planId: insurance?.planId || insurance?.plan?.id ? String(insurance.planId || insurance.plan.id) : null, insuranceId: insurance?.id ? String(insurance.id) : null }
      })
    },
    calendars(date, scheduleIds) { return this.availability([date], scheduleIds) },
    availability(dates, scheduleIds) {
      if (!Array.isArray(dates) || !dates.length || dates.length > 20 || dates.some(value => !dateOnly(value)) || !Array.isArray(scheduleIds) || !scheduleIds.length || scheduleIds.length > 10 || scheduleIds.some(value => !id(value)) || dates.length * scheduleIds.length > 60) throw fail('Datas ou agendas inválidas.')
      return run(async service => {
        const result = []
        for (const date of dates) for (const scheduleId of scheduleIds) {
          const items = await calendar(service, date, scheduleId)
          result.push({ date, scheduleId, items: items.map(row => ({
            id: row.id ? String(row.id) : null,
            key: row.key ? String(row.key) : null,
            refKey: row.refKey ? String(row.refKey) : null,
            startDate: row.startDate,
            endDate: row.endDate,
            status: row.status,
            isSlot: row.isSlot,
            occupied: Boolean(row.patient || (row.id && row.status !== 'available')),
            planIds: Array.isArray(row.available?.insurancePlans) ? row.available.insurancePlans.map(String) : [],
            professionals: Array.isArray(row.available?.professionals) ? row.available.professionals.filter(item => item?.id).map(item => ({ id: String(item.id), name: String(item.name || ''), council: item.council || null, specialty: item.specialty || null })) : [],
          })) })
        }
        return result
      })
    },
    readAppointment(locator) { return run(service => appointment(service, locator).then(publicAppointment)) },
    async setStatus(locator, status) {
      if (!['scheduled', 'confirmed', 'patient_canceled', 'professional_canceled'].includes(status)) throw fail('Situação de agendamento não permitida.')
      let response
      try {
        response = await run(async service => {
          const source = await appointment(service, locator)
          if (source.status === status) return source
          return service.client.request(`/v1/appointments/${locator.appointmentId}`, { base: 'apiX', method: 'PUT', body: { status, arrivedAt: null } })
        })
      } catch (error) {
        const current = await this.readAppointment(locator).catch(() => null)
        if (current?.status === status) return current
        throw error
      }
      const current = await this.readAppointment(locator).catch(() => null)
      if (current?.status !== status || String(response?.id || '') !== locator.appointmentId) throw fail('A alteração de situação não pôde ser reconciliada.', 502, 'STENCI_WRITE_AMBIGUOUS')
      return current
    },
    async copyAppointment(locator, target, expectedPatientId = null) {
      const source = await run(service => appointment(service, locator))
      if (!source.patient?.id) throw fail('O agendamento original não possui paciente confirmado.', 409, 'STENCI_SOURCE_INCOMPLETE')
      if (expectedPatientId && String(source.patient.id) !== String(expectedPatientId)) throw fail('O agendamento informado não pertence ao paciente deste caso.', 409, 'RESUMPTION_PATIENT_MISMATCH')
      return writeAndReconcile(target, source.patient.id, async service => {
        const fresh = await appointment(service, locator)
        if (expectedPatientId && String(fresh.patient?.id || '') !== String(expectedPatientId)) throw fail('O agendamento informado não pertence ao paciente deste caso.', 409, 'RESUMPTION_PATIENT_MISMATCH')
        const available = await availableTarget(service, target)
        const body = createBodyFrom(fresh, target, available.professional, available.placeId)
        return service.client.request('/v1/appointments', { base: 'apiX', method: 'POST', query: { toCalendar: true }, body })
      })
    },
    async rescheduleAppointment(locator, target) {
      const source = await run(service => appointment(service, locator))
      if (!source.patient?.id) throw fail('O agendamento original não possui paciente confirmado.', 409, 'STENCI_SOURCE_INCOMPLETE')
      if (target.scheduleId === locator.scheduleId) {
        return writeAndReconcile(target, source.patient.id, async service => {
          const fresh = await appointment(service, locator)
          const available = await availableTarget(service, target)
          return service.client.request(`/v1/appointments/${locator.appointmentId}`, { base: 'apiX', method: 'PUT', body: { scheduleId: target.scheduleId, startDate: target.startDate, endDate: target.endDate, professional: available.professional, originalKey: fresh.key, status: fresh.status, slot: false } })
        })
      }
      const created = await this.copyAppointment(locator, target)
      try { await this.setStatus(locator, 'professional_canceled') }
      catch (error) {
        const current = await this.readAppointment(locator).catch(() => null)
        if (current?.status !== 'professional_canceled') throw fail('O novo horário foi criado, mas o original ainda precisa ser cancelado por um atendente.', 409, 'STENCI_MOVE_PARTIAL')
      }
      return { ...created, sourceStatus: 'professional_canceled' }
    },
    async block(target, notes) {
      return writeAndReconcile(target, null, async service => {
        const available = await availableTarget(service, target)
        return service.client.request('/v1/appointments', { base: 'apiX', method: 'POST', query: { toCalendar: true }, body: { scheduleId: target.scheduleId, startDate: target.startDate, endDate: target.endDate, professional: available.professional, type: null, status: 'blocked', notes: String(notes || '').slice(0, 500) } })
      })
    },
  }
}

module.exports = { createWhatsAppStenci, publicAppointment }
