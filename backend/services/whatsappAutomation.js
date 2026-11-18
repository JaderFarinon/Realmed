const crypto = require('crypto')
const { buildAbsenceReport } = require('./billingAbsenceReport')
const { dateText, localToday } = require('./billingAgendaCollection')

const fail = (message, status = 422, code = 'WHATSAPP_VALIDATION_FAILED') => Object.assign(new Error(message), { status, code })
const parseJson = value => {
  if (value == null) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return null }
}
const asDate = value => dateText(value)
const phone = value => {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13 ? digits : null
}
const text = (value, max) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
const dateOnly = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z')) ? value : null
const clinicDateTime = value => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const parsed = new Date(value + ':00-03:00')
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
const token = () => crypto.randomBytes(32).toString('hex')

function normalizeEvent(input = {}) {
  const type = String(input.type || '').toUpperCase()
  const status = String(input.status || 'DRAFT').toUpperCase()
  const name = text(input.name, 180)
  const startDate = dateOnly(input.startDate)
  const endDate = dateOnly(input.endDate)
  if (!['HOLIDAY', 'CAMPAIGN', 'OTHER'].includes(type)) throw fail('Escolha um tipo de evento válido.')
  if (!['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'].includes(status)) throw fail('Escolha uma situação válida.')
  if (!name) throw fail('Informe o nome do evento.')
  if (!startDate || !endDate || endDate < startDate) throw fail('Informe um período válido.')
  const message = text(input.message, 4000)
  if (type === 'CAMPAIGN' && !message) throw fail('Informe o texto da campanha.')
  const sendAt = type === 'CAMPAIGN' ? clinicDateTime(input.sendAt) : null
  const sendDeadlineAt = type === 'CAMPAIGN' ? clinicDateTime(input.sendDeadlineAt) : null
  if (type === 'CAMPAIGN' && (!sendAt || !sendDeadlineAt || sendDeadlineAt <= sendAt)) throw fail('Informe o início e o prazo final de envio da campanha.')
  const audienceInput = input.audience && typeof input.audience === 'object' && !Array.isArray(input.audience) ? input.audience : {}
  const patientStatus = String(audienceInput.patientStatus || 'ALL').toUpperCase()
  const gender = String(audienceInput.gender || 'ALL').toUpperCase()
  const ageMin = audienceInput.ageMin === '' || audienceInput.ageMin == null ? null : Number(audienceInput.ageMin)
  const ageMax = audienceInput.ageMax === '' || audienceInput.ageMax == null ? null : Number(audienceInput.ageMax)
  const services = Array.isArray(audienceInput.services) ? [...new Set(audienceInput.services.map(v => text(v, 80)).filter(Boolean))].slice(0, 30) : []
  if (!['ALL', 'ACTIVE', 'ABSENT'].includes(patientStatus)) throw fail('Situação de paciente inválida.')
  if (!['ALL', 'FEMALE', 'MALE'].includes(gender)) throw fail('Sexo do público inválido.')
  if ((ageMin != null && (!Number.isInteger(ageMin) || ageMin < 0 || ageMin > 130)) || (ageMax != null && (!Number.isInteger(ageMax) || ageMax < 0 || ageMax > 130)) || (ageMin != null && ageMax != null && ageMax < ageMin)) throw fail('Faixa etária inválida.')
  return { type, name, start_date: startDate, end_date: endDate, message, audience: JSON.stringify({ patientStatus, gender, ageMin, ageMax, services }), send_at: sendAt, send_deadline_at: sendDeadlineAt, status }
}

function normalizeAbsenceChoice(value) {
  const choice = String(value || '').toUpperCase()
  if (!['CONTINUE_TREATMENT', 'STOP_TREATMENT', 'HUMAN_ASSISTANCE', 'NO_RESPONSE', 'OTHER'].includes(choice)) throw fail('Resposta de falta inválida.')
  return choice
}

function normalizeSurvey(input = {}) {
  const rating = (key, label) => {
    const value = Number(input[key])
    if (!Number.isInteger(value) || value < 1 || value > 5) throw fail(`Informe uma nota de 1 a 5 para ${label}.`)
    return value
  }
  if (typeof input.wouldRecommend !== 'boolean') throw fail('Informe se recomendaria a clínica.')
  return {
    structureRating: rating('structureRating', 'estrutura'),
    serviceRating: rating('serviceRating', 'atendimento'),
    professionalsRating: rating('professionalsRating', 'profissionais'),
    overallRating: rating('overallRating', 'avaliação geral'),
    wouldRecommend: input.wouldRecommend,
    comment: text(input.comment, 2000),
  }
}

async function audit(trx, eventType, entityType, entityId, options = {}) {
  await trx('whatsapp_automation_audit').insert({
    event_type: eventType,
    entity_type: entityType,
    entity_id: String(entityId),
    actor_user_id: options.actorId || null,
    external_event_id: options.externalEventId || null,
    metadata: options.metadata ? JSON.stringify(options.metadata) : null,
  })
}

async function absenceReport(db, branchId, input = {}) {
  const date = dateOnly(input.date) || localToday()
  if (date > localToday()) throw fail('A data do relatório não pode estar no futuro.')
  const oldest = await db('billing_collection_days').where({ branch_id: branchId }).where('service_date', '<=', date).min('service_date as first').first()
  const historyStart = dateOnly(input.historyStart) || (oldest?.first ? asDate(oldest.first) : date.slice(0, 7) + '-01')
  if (historyStart > date) throw fail('O início do histórico deve ser anterior à data do relatório.')
  const rule = input.rule || 'total3'
  if (!['total3', 'prior3'].includes(rule)) throw fail('Regra de faltas inválida.')
  const [rows, coverage] = await Promise.all([
    db('billing_stenci_appointments as a')
      .leftJoin('patients as p', function () { this.on('p.external_id', '=', 'a.patient_external_id').andOnVal('p.external_source', 'STENCI') })
      .where({ 'a.branch_id': branchId }).whereBetween('a.service_date', [historyStart, date])
      .select('a.external_id', 'a.patient_external_id', 'a.patient_name', 'a.service_date', 'a.start_at', 'a.status', 'a.schedule_id', 'a.schedule_name', 'a.schedule_memberships', 'p.phone'),
    db('billing_collection_days').where({ branch_id: branchId }).whereBetween('service_date', [historyStart, date]),
  ])
  const contacts = rows.filter(row => row.phone).map(row => ({ external_id: row.patient_external_id, phone: row.phone }))
  const minimumMisses = input.minimumMisses == null ? 3 : Number(input.minimumMisses)
  return buildAbsenceReport({ rows, coverage, date, historyStart, rule, minimumMisses, contacts })
}

function batchResponse(row) {
  if (!row) return null
  return { ...row, report_date: asDate(row.report_date), history_start: row.history_start ? asDate(row.history_start) : undefined, coverage: parseJson(row.coverage), minimum_misses: Number(row.minimum_misses), eligible_total: Number(row.eligible_total), contactable_total: Number(row.contactable_total), excluded_no_phone: Number(row.excluded_no_phone) }
}

async function createAbsenceBatch(db, branchId, input = {}) {
  const report = await absenceReport(db, branchId, input)
  if (!report.coverage.complete) throw fail('A coleta do período ainda está incompleta. Atualize o relatório antes do contato.', 409, 'ABSENCE_COVERAGE_INCOMPLETE')
  return db.transaction(async trx => {
    let batch = await trx('whatsapp_absence_batches').where({ branch_id: branchId, report_date: report.date, history_start: report.historyStart, rule: report.rule, minimum_misses: report.minimumMisses }).forUpdate().first()
    if (!batch) {
      const contactable = report.items.filter(item => phone(item.phone))
      const [id] = await trx('whatsapp_absence_batches').insert({ branch_id: branchId, report_date: report.date, history_start: report.historyStart, rule: report.rule, minimum_misses: report.minimumMisses, eligible_total: report.items.length, contactable_total: contactable.length, excluded_no_phone: report.items.length - contactable.length, coverage: JSON.stringify(report.coverage) })
      batch = await trx('whatsapp_absence_batches').where({ id, branch_id: branchId }).first()
      for (const item of contactable) await trx('whatsapp_absence_cases').insert({ batch_id: id, case_token: token(), patient_external_id: item.id, patient_name: item.patient_name, phone: phone(item.phone), absence_snapshot: JSON.stringify({ dailyMisses: item.daily_misses, priorMisses: item.prior_misses, totalMisses: item.total_misses, agendas: item.agendas, places: item.places, history: item.history }) })
      await audit(trx, 'ABSENCE_BATCH_CREATED', 'absence_batch', id, { metadata: { eligible: report.items.length, contactable: contactable.length } })
    }
    return batchResponse(batch)
  })
}

async function listAppointmentsByStatus(db, branchId, status, input = {}) {
  if (!['scheduled', 'confirmed'].includes(status)) throw fail('Situação de agenda inválida.')
  const from = dateOnly(input.from) || localToday()
  const days = input.days == null ? 2 : Number(input.days)
  if (!Number.isSafeInteger(days) || days < 1 || days > 7) throw fail('Período da agenda inválido.')
  const endDate = new Date(from + 'T12:00:00-03:00')
  endDate.setUTCDate(endDate.getUTCDate() + days - 1)
  const to = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(endDate)
  const [rows, coverage] = await Promise.all([
    db('billing_stenci_appointments as a')
      .leftJoin('patients as p', function () { this.on('p.external_id', '=', 'a.patient_external_id').andOnVal('p.external_source', 'STENCI') })
      .where({ 'a.branch_id': branchId, 'a.status': status }).whereBetween('a.service_date', [from, to])
      .select('a.external_id', 'a.patient_external_id', 'a.patient_name', 'a.service_date', 'a.start_at', 'a.schedule_id', 'a.schedule_name', 'a.is_evaluation', 'a.is_physiotherapy', 'a.is_session', 'a.expenses', 'p.phone')
      .orderBy('a.service_date').orderBy('a.start_at').orderBy('a.external_id'),
    db('billing_collection_days').where({ branch_id: branchId }).whereBetween('service_date', [from, to]),
  ])
  const completeDates = new Set(coverage.filter(row => row.status === 'COMPLETE' && row.last_success_at).map(row => asDate(row.service_date)))
  const expected = Array.from({ length: days }, (_, index) => {
    const date = new Date(from + 'T12:00:00-03:00'); date.setUTCDate(date.getUTCDate() + index)
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
  })
  return {
    status, from, to,
    coverage: { complete: expected.every(date => completeDates.has(date)), completeDates: expected.filter(date => completeDates.has(date)), missingDates: expected.filter(date => !completeDates.has(date)) },
    items: rows.map(row => ({ appointmentId: row.external_id, patientId: row.patient_external_id, patientName: row.patient_name, phone: phone(row.phone), date: asDate(row.service_date), startAt: row.start_at, scheduleId: row.schedule_id, scheduleName: row.schedule_name, modality: row.is_evaluation ? 'EVALUATION' : row.is_physiotherapy || row.is_session ? 'PHYSIOTHERAPY' : 'OTHER', expenses: parseJson(row.expenses) || [] })),
  }
}

const normalizedGender = value => {
  const current = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  if (['female', 'f', 'feminino'].includes(current)) return 'FEMALE'
  if (['male', 'm', 'masculino'].includes(current)) return 'MALE'
  return null
}
const ageAt = (birth, reference) => {
  if (!dateOnly(birth) || !dateOnly(reference)) return null
  const [year, month, day] = birth.split('-').map(Number), [refYear, refMonth, refDay] = reference.split('-').map(Number)
  const value = refYear - year - (refMonth < month || (refMonth === month && refDay < day) ? 1 : 0)
  return value >= 0 && value <= 130 ? value : null
}
const serviceKeys = row => {
  const keys = [row.schedule_id, row.schedule_name]
  for (const expense of parseJson(row.expenses) || []) keys.push(expense.id, expense.code, expense.name, expense.type)
  return new Set(keys.filter(Boolean).map(value => String(value).trim().toLocaleLowerCase('pt-BR')))
}

async function campaignPreview(db, event) {
  if (!event || event.type !== 'CAMPAIGN') throw fail('Selecione uma campanha.', 422, 'CAMPAIGN_REQUIRED')
  if (!event.branch_id) throw fail('A campanha não está vinculada a uma unidade.', 409, 'CAMPAIGN_BRANCH_MISSING')
  const audience = parseJson(event.audience) || {}
  const rows = await db('billing_stenci_appointments as a')
    .leftJoin('patients as p', function () { this.on('p.external_id', '=', 'a.patient_external_id').andOnVal('p.external_source', 'STENCI') })
    .where({ 'a.branch_id': event.branch_id }).whereBetween('a.service_date', [asDate(event.start_date), asDate(event.end_date)])
    .select('a.external_id', 'a.patient_external_id', 'a.patient_name', 'a.status', 'a.service_date', 'a.start_at', 'a.schedule_id', 'a.schedule_name', 'a.expenses', 'a.patient_demographics', 'p.phone', 'p.birth_date', 'p.gender')
    .orderBy('a.service_date').orderBy('a.start_at').orderBy('a.external_id')
  const grouped = new Map()
  for (const row of rows) {
    if (!row.patient_external_id) continue
    if (!grouped.has(row.patient_external_id)) grouped.set(row.patient_external_id, [])
    grouped.get(row.patient_external_id).push(row)
  }
  const recipients = [], excluded = { noPhone: 0, missingDemographics: 0, filters: 0 }
  for (const [patientId, appointments] of grouped) {
    const latest = appointments[appointments.length - 1], demographics = parseJson(latest.patient_demographics) || {}
    const patientPhone = phone(latest.phone)
    if (!patientPhone) { excluded.noPhone++; continue }
    if (audience.patientStatus === 'ACTIVE' && !appointments.some(row => !['available', 'patient_canceled', 'professional_canceled', 'canceled', 'rescheduled', 'missed'].includes(row.status))) { excluded.filters++; continue }
    if (audience.patientStatus === 'ABSENT' && !appointments.some(row => row.status === 'missed')) { excluded.filters++; continue }
    const gender = normalizedGender(latest.gender || demographics.gender)
    if (audience.gender !== 'ALL' && gender !== audience.gender) { if (!gender) excluded.missingDemographics++; else excluded.filters++; continue }
    const birthDate = latest.birth_date ? asDate(latest.birth_date) : demographics.birth_date
    const age = ageAt(birthDate, asDate(event.end_date))
    if ((audience.ageMin != null && (age == null || age < Number(audience.ageMin))) || (audience.ageMax != null && (age == null || age > Number(audience.ageMax)))) { if (age == null) excluded.missingDemographics++; else excluded.filters++; continue }
    const requested = (audience.services || []).map(value => String(value).trim().toLocaleLowerCase('pt-BR')).filter(Boolean)
    if (requested.length && !appointments.some(row => requested.some(key => serviceKeys(row).has(key)))) { excluded.filters++; continue }
    recipients.push({ patientId, patientName: latest.patient_name, phone: patientPhone, snapshot: { gender, age, appointments: appointments.map(row => ({ id: row.external_id, date: asDate(row.service_date), scheduleId: row.schedule_id, scheduleName: row.schedule_name, status: row.status })) } })
  }
  recipients.sort((a, b) => a.patientName.localeCompare(b.patientName, 'pt-BR') || a.patientId.localeCompare(b.patientId))
  return { eventId: event.id, revision: Number(event.revision), total: recipients.length, excluded, recipients }
}

async function approveCampaign(db, eventId, revision, actorId, branchId) {
  return db.transaction(async trx => {
    const event = await trx('whatsapp_events').where({ id: eventId, branch_id: branchId }).whereNull('deleted_at').forUpdate().first()
    if (!event) throw fail('Campanha não encontrada.', 404, 'CAMPAIGN_NOT_FOUND')
    if (Number(event.revision) !== Number(revision)) throw fail('Outra pessoa alterou a campanha. Recarregue antes de aprovar.', 409, 'WHATSAPP_EVENT_CONFLICT')
    const preview = await campaignPreview(trx, event)
    await trx('whatsapp_campaign_recipients').where({ event_id: eventId, event_revision: revision }).delete()
    if (preview.recipients.length) await trx('whatsapp_campaign_recipients').insert(preview.recipients.map(item => ({ event_id: eventId, event_revision: revision, patient_external_id: item.patientId, patient_name: item.patientName, phone: item.phone, snapshot: JSON.stringify(item.snapshot) })))
    await trx('whatsapp_events').where({ id: eventId, branch_id: branchId }).update({ status: 'ACTIVE', webhook_status: 'PENDING', webhook_attempts: 0, webhook_retry_at: event.send_at, webhook_error_code: null, updated_by: actorId, updated_at: trx.fn.now() })
    await audit(trx, 'CAMPAIGN_APPROVED', 'whatsapp_event', eventId, { actorId, metadata: { revision: Number(revision), recipients: preview.total } })
    return { eventId, revision: Number(revision), recipients: preview.total, sendAt: event.send_at, sendDeadlineAt: event.send_deadline_at, webhookStatus: 'PENDING' }
  })
}

async function getCampaignRecipients(db, eventId, revision, branchId) {
  const event = await db('whatsapp_events').where({ id: eventId, type: 'CAMPAIGN', branch_id: branchId }).whereNull('deleted_at').first()
  if (!event) throw fail('Campanha não encontrada.', 404, 'CAMPAIGN_NOT_FOUND')
  if (Number(event.revision) !== Number(revision) || event.status !== 'ACTIVE') throw fail('A revisão da campanha não está aprovada.', 409, 'CAMPAIGN_REVISION_NOT_APPROVED')
  const rows = await db('whatsapp_campaign_recipients').where({ event_id: eventId, event_revision: revision }).orderBy('patient_name').orderBy('id')
  return { campaign: { id: event.id, revision: Number(event.revision), name: event.name, message: event.message, sendAt: event.send_at, sendDeadlineAt: event.send_deadline_at }, items: rows.map(row => ({ patientToken: crypto.createHash('sha256').update(`${eventId}:${revision}:${row.patient_external_id}`).digest('hex'), patientName: row.patient_name, phone: row.phone })) }
}

async function getAbsenceBatch(db, id, branchId) {
  const row = await db('whatsapp_absence_batches').where({ id, branch_id: branchId }).first()
  if (!row) throw fail('Lote de faltas não encontrado.', 404, 'ABSENCE_BATCH_NOT_FOUND')
  return batchResponse(row)
}

async function listAbsenceCases(db, batchId, branchId) {
  await getAbsenceBatch(db, batchId, branchId)
  const rows = await db('whatsapp_absence_cases as c').join('whatsapp_absence_batches as b', 'b.id', 'c.batch_id').where({ 'c.batch_id': batchId, 'b.branch_id': branchId }).select('c.*').orderBy('c.patient_name').orderBy('c.id')
  return rows.map(row => ({ caseToken: row.case_token, patientName: row.patient_name, phone: row.phone, choice: row.choice, respondedAt: row.responded_at, ...parseJson(row.absence_snapshot) }))
}

async function recordAbsenceResponse(db, caseToken, input = {}, branchId) {
  const choice = normalizeAbsenceChoice(input.choice)
  const responseText = text(input.text, 2000)
  const externalEventId = text(input.externalEventId, 160)
  return db.transaction(async trx => {
    const row = await trx('whatsapp_absence_cases as c').join('whatsapp_absence_batches as b', 'b.id', 'c.batch_id').where({ 'c.case_token': caseToken, 'b.branch_id': branchId }).select('c.*').forUpdate().first()
    if (!row) throw fail('Contato de faltas não encontrado.', 404, 'ABSENCE_CASE_NOT_FOUND')
    if (externalEventId) {
      const repeated = await trx('whatsapp_absence_responses as r').join('whatsapp_absence_cases as c', 'c.id', 'r.case_id').join('whatsapp_absence_batches as b', 'b.id', 'c.batch_id').where({ 'r.external_event_id': externalEventId, 'b.branch_id': branchId }).select('r.*').first()
      if (repeated) {
        if (repeated.case_id !== row.id || repeated.choice !== choice) throw fail('O evento externo já foi usado com outro conteúdo.', 409, 'EXTERNAL_EVENT_CONFLICT')
        return { caseToken, choice: row.choice, billingStatus: row.billing_status, respondedAt: row.responded_at, repeated: true }
      }
    }
    await trx('whatsapp_absence_responses').insert({ case_id: row.id, external_event_id: externalEventId, choice, response_text: responseText })
    const billingStatus = choice === 'STOP_TREATMENT' ? (row.billing_status === 'NOT_APPLICABLE' ? 'PENDING' : row.billing_status) : 'NOT_APPLICABLE'
    await trx('whatsapp_absence_cases').where({ id: row.id, batch_id: row.batch_id }).update({ choice, response_text: responseText, billing_status: billingStatus, responded_at: trx.fn.now(), revision: row.revision + 1, updated_at: trx.fn.now() })
    await audit(trx, 'ABSENCE_RESPONSE_RECORDED', 'absence_case', row.id, { externalEventId, metadata: { choice } })
    const updated = await trx('whatsapp_absence_cases').where({ id: row.id, batch_id: row.batch_id }).first()
    return { caseToken, choice: updated.choice, billingStatus: updated.billing_status, respondedAt: updated.responded_at, repeated: false }
  })
}

const weekdayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const weekdayLabels = { SUNDAY: 'domingo', MONDAY: 'segunda-feira', TUESDAY: 'terça-feira', WEDNESDAY: 'quarta-feira', THURSDAY: 'quinta-feira', FRIDAY: 'sexta-feira', SATURDAY: 'sábado' }
const weekday = date => weekdayKeys[new Date(date + 'T12:00:00Z').getUTCDay()]
const timeText = value => {
  const match = String(value || '').match(/T(\d{2}:\d{2})/)
  return match ? match[1] : null
}

async function getResumptionCase(db, caseToken, branchId) {
  const row = await db('whatsapp_absence_cases as c').join('whatsapp_absence_batches as b', 'b.id', 'c.batch_id').where({ 'c.case_token': caseToken, 'b.branch_id': branchId }).select('c.*', 'b.branch_id', 'b.report_date', 'b.history_start', 'b.minimum_misses').first()
  if (!row) throw fail('Contato de faltas não encontrado.', 404, 'ABSENCE_CASE_NOT_FOUND')
  if (row.choice !== 'CONTINUE_TREATMENT') throw fail('Registre primeiro que o paciente deseja retomar o tratamento.', 409, 'RESUMPTION_NOT_CONFIRMED')
  return row
}

async function getResumptionContext(db, caseToken, branchId) {
  const row = await getResumptionCase(db, caseToken, branchId)
  const reportDate = asDate(row.report_date), snapshot = parseJson(row.absence_snapshot) || {}
  const appointments = await db('billing_stenci_appointments').where({ branch_id: row.branch_id, patient_external_id: row.patient_external_id }).where('service_date', '>=', asDate(row.history_start)).select('external_id', 'service_date', 'start_at', 'status', 'schedule_id', 'schedule_name').orderBy('service_date').orderBy('start_at').orderBy('external_id')
  const future = appointments.filter(item => asDate(item.service_date) > reportDate && ['scheduled', 'confirmed'].includes(item.status)).map(item => ({ appointmentId: item.external_id, date: asDate(item.service_date), weekday: weekday(asDate(item.service_date)), startAt: item.start_at, time: timeText(item.start_at), status: item.status, scheduleId: item.schedule_id, scheduleName: item.schedule_name }))
  const patterns = new Map()
  for (const item of appointments.filter(item => ['finished', 'scheduled', 'confirmed'].includes(item.status))) {
    const date = asDate(item.service_date), day = weekday(date), time = timeText(item.start_at), key = `${day}:${time || ''}`
    if (!patterns.has(key)) patterns.set(key, { weekday: day, label: weekdayLabels[day], time, occurrences: 0, scheduleIds: new Set() })
    const current = patterns.get(key); current.occurrences++; if (item.schedule_id) current.scheduleIds.add(item.schedule_id)
  }
  const usualDays = [...patterns.values()].map(item => ({ ...item, scheduleIds: [...item.scheduleIds] })).sort((a, b) => b.occurrences - a.occurrences || weekdayKeys.indexOf(a.weekday) - weekdayKeys.indexOf(b.weekday) || String(a.time).localeCompare(String(b.time)))
  return { caseToken, patientName: row.patient_name, minimumMisses: Number(row.minimum_misses), missingCount: Number(snapshot.totalMisses || 0), missedAppointments: snapshot.history || [], futureAppointments: future, usualDays }
}

function validateResumptionSource(caseRow, source, used = new Set()) {
  const snapshot = parseJson(caseRow?.absence_snapshot) || {}, missed = (snapshot.history || []).find(item => String(item.id) === String(source?.appointmentId))
  const allowedSchedules = new Set([missed?.source_schedule_id, ...(missed?.schedule_ids || [])].filter(Boolean).map(String))
  if (!caseRow?.patient_external_id || !missed || used.has(String(source.appointmentId)) || missed.date !== source.date || !allowedSchedules.has(String(source.scheduleId))) throw fail('A reposição precisa usar uma falta pertencente a este paciente e a este caso.', 409, 'RESUMPTION_SOURCE_MISMATCH')
  used.add(String(source.appointmentId))
  return missed
}

async function resumptionAvailability(db, connector, caseToken, input = {}, branchId) {
  const context = await getResumptionContext(db, caseToken, branchId)
  const selected = input.keepUsualDays === true ? [...new Set(context.usualDays.map(item => item.weekday))] : Array.isArray(input.weekdays) ? [...new Set(input.weekdays.map(value => String(value).toUpperCase()))] : []
  if (!selected.length || selected.some(value => !weekdayKeys.includes(value))) throw fail('Escolha ao menos um dia da semana válido.')
  const preferredTime = input.preferredTime == null || input.preferredTime === '' ? null : String(input.preferredTime)
  if (preferredTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) throw fail('Horário preferido inválido.')
  const horizonDays = input.horizonDays == null ? 30 : Number(input.horizonDays)
  if (!Number.isSafeInteger(horizonDays) || horizonDays < 7 || horizonDays > 60) throw fail('Horizonte de disponibilidade inválido.')
  const scheduleIds = [...new Set([
    ...context.missedAppointments.flatMap(item => item.schedule_ids || []),
    ...context.futureAppointments.map(item => item.scheduleId),
    ...context.usualDays.flatMap(item => item.scheduleIds || []),
  ].filter(Boolean))].slice(0, 10)
  if (!scheduleIds.length) throw fail('Não foi possível identificar a agenda do tratamento.', 409, 'RESUMPTION_SCHEDULE_MISSING')
  const today = localToday(), dates = []
  for (let offset = 1; offset <= horizonDays && dates.length < 20; offset++) {
    const current = new Date(today + 'T12:00:00-03:00'); current.setUTCDate(current.getUTCDate() + offset)
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(current)
    if (selected.includes(weekday(date))) dates.push(date)
  }
  const caseRow = await getResumptionCase(db, caseToken, branchId)
  const patient = await connector.patient(caseRow.patient_external_id)
  const calendars = await connector.availability(dates, scheduleIds)
  const options = []
  for (const calendar of calendars) for (const item of calendar.items) {
    if (item.status !== 'available' || item.occupied || item.isSlot !== false || !item.startDate || !item.endDate) continue
    if (patient.planId && (!item.planIds.length || !item.planIds.includes(patient.planId))) continue
    const time = timeText(item.startDate)
    if (!time || !item.professionals.length) continue
    for (const professional of item.professionals) options.push({ date: calendar.date, weekday: weekday(calendar.date), weekdayLabel: weekdayLabels[weekday(calendar.date)], time, startDate: item.startDate, endDate: item.endDate, scheduleId: calendar.scheduleId, professional })
  }
  const minute = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
  options.sort((a, b) => a.date.localeCompare(b.date) || (preferredTime ? Math.abs(minute(a.time) - minute(preferredTime)) - Math.abs(minute(b.time) - minute(preferredTime)) : a.time.localeCompare(b.time)) || a.professional.name.localeCompare(b.professional.name, 'pt-BR'))
  const exactMatches = preferredTime ? options.filter(item => item.time === preferredTime).slice(0, Math.max(6, context.missingCount * 3)) : []
  const suggestions = options.filter(item => !preferredTime || item.time !== preferredTime).slice(0, Math.max(12, context.missingCount * 5))
  return { requested: { weekdays: selected, preferredTime, horizonDays }, missingCount: context.missingCount, exactMatches, suggestions, availabilityCheckedAt: new Date().toISOString(), bookingEnabled: false }
}

async function completionCandidates(db, branchId, date) {
  const coverage = await db('billing_collection_days').where({ branch_id: branchId, service_date: date }).first()
  if (!coverage?.last_success_at || coverage.status !== 'COMPLETE') throw fail('A coleta do dia ainda está incompleta. Atualize a agenda antes da pesquisa.', 409, 'COMPLETION_COVERAGE_INCOMPLETE')
  return db('billing_stenci_appointments as a')
    .leftJoin('patients as p', function () { this.on('p.external_id', '=', 'a.patient_external_id').andOnVal('p.external_source', 'STENCI') })
    .where({ 'a.branch_id': branchId, 'a.service_date': date, 'a.status': 'finished', 'a.is_session': true })
    .whereNotNull('a.bundle_current').whereNotNull('a.bundle_total')
    .whereRaw('a.bundle_current = a.bundle_total').where('a.bundle_total', '>=', 10)
    .select('a.external_id', 'a.patient_external_id', 'a.patient_name', 'a.service_date', 'a.start_at', 'a.schedule_name', 'a.bundle_current', 'a.bundle_total', 'p.phone')
}

async function createCompletionBatch(db, branchId, input = {}) {
  const date = dateOnly(input.date) || localToday()
  if (date > localToday()) throw fail('A data da pesquisa não pode estar no futuro.')
  const candidates = await completionCandidates(db, branchId, date)
  return db.transaction(async trx => {
    let batch = await trx('whatsapp_completion_batches').where({ branch_id: branchId, report_date: date }).forUpdate().first()
    if (!batch) {
      const contactable = candidates.filter(row => phone(row.phone))
      const [id] = await trx('whatsapp_completion_batches').insert({ branch_id: branchId, report_date: date, eligible_total: candidates.length, contactable_total: contactable.length, excluded_no_phone: candidates.length - contactable.length })
      batch = await trx('whatsapp_completion_batches').where({ id, branch_id: branchId }).first()
      for (const row of contactable) {
        const exists = await trx('whatsapp_completion_cases').where({ appointment_external_id: row.external_id }).first()
        if (!exists) await trx('whatsapp_completion_cases').insert({ batch_id: id, case_token: token(), appointment_external_id: row.external_id, patient_external_id: row.patient_external_id, patient_name: row.patient_name, phone: phone(row.phone), completion_snapshot: JSON.stringify({ date: asDate(row.service_date), startAt: row.start_at, schedule: row.schedule_name, current: Number(row.bundle_current), total: Number(row.bundle_total) }) })
      }
      await audit(trx, 'COMPLETION_BATCH_CREATED', 'completion_batch', id, { metadata: { eligible: candidates.length, contactable: contactable.length } })
    }
    return { ...batch, report_date: asDate(batch.report_date), eligible_total: Number(batch.eligible_total), contactable_total: Number(batch.contactable_total), excluded_no_phone: Number(batch.excluded_no_phone) }
  })
}

async function getCompletionBatch(db, id, branchId) {
  const row = await db('whatsapp_completion_batches').where({ id, branch_id: branchId }).first()
  if (!row) throw fail('Lote de pesquisas não encontrado.', 404, 'COMPLETION_BATCH_NOT_FOUND')
  return { ...row, report_date: asDate(row.report_date), eligible_total: Number(row.eligible_total), contactable_total: Number(row.contactable_total), excluded_no_phone: Number(row.excluded_no_phone) }
}

async function listCompletionCases(db, batchId, branchId) {
  await getCompletionBatch(db, batchId, branchId)
  const rows = await db('whatsapp_completion_cases as c').join('whatsapp_completion_batches as b', 'b.id', 'c.batch_id').where({ 'c.batch_id': batchId, 'b.branch_id': branchId }).select('c.*').orderBy('c.patient_name').orderBy('c.id')
  return rows.map(row => ({ caseToken: row.case_token, patientName: row.patient_name, phone: row.phone, responseStatus: row.response_status, respondedAt: row.responded_at, ...parseJson(row.completion_snapshot) }))
}

async function recordSurveyResponse(db, caseToken, input = {}, branchId) {
  const survey = normalizeSurvey(input)
  const externalEventId = text(input.externalEventId, 160)
  return db.transaction(async trx => {
    const row = await trx('whatsapp_completion_cases as c').join('whatsapp_completion_batches as b', 'b.id', 'c.batch_id').where({ 'c.case_token': caseToken, 'b.branch_id': branchId }).select('c.*').forUpdate().first()
    if (!row) throw fail('Pesquisa não encontrada.', 404, 'COMPLETION_CASE_NOT_FOUND')
    if (row.response_external_event_id && externalEventId === row.response_external_event_id) return { caseToken, status: row.response_status, repeated: true }
    if (row.response_status === 'COMPLETED') throw fail('Esta pesquisa já foi respondida.', 409, 'SURVEY_ALREADY_COMPLETED')
    await trx('whatsapp_completion_cases').where({ id: row.id, batch_id: row.batch_id }).update({ response_status: 'COMPLETED', response_external_event_id: externalEventId, survey_response: JSON.stringify(survey), responded_at: trx.fn.now(), updated_at: trx.fn.now() })
    await audit(trx, 'COMPLETION_SURVEY_RECORDED', 'completion_case', row.id, { externalEventId, metadata: { ratings: { structure: survey.structureRating, service: survey.serviceRating, professionals: survey.professionalsRating, overall: survey.overallRating }, wouldRecommend: survey.wouldRecommend } })
    return { caseToken, status: 'COMPLETED', repeated: false }
  })
}

module.exports = {
  fail, parseJson, normalizeEvent, normalizeAbsenceChoice, normalizeSurvey,
  audit, createAbsenceBatch, getAbsenceBatch, listAbsenceCases, recordAbsenceResponse,
  createCompletionBatch, getCompletionBatch, listCompletionCases, recordSurveyResponse,
  listAppointmentsByStatus, campaignPreview, approveCampaign, getCampaignRecipients,
  getResumptionCase, getResumptionContext, validateResumptionSource, resumptionAvailability,
}
