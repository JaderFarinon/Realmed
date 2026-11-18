const express = require('express')
const crypto = require('node:crypto')
const auth = require('../middleware/auth')
const { modulePermission } = require('../middleware/permission')
const { serviceAuth } = require('../middleware/serviceAuth')
const automation = require('../services/whatsappAutomation')
const appointmentWrites = require('../services/whatsappAppointmentWrites')
const { getStenciConfig } = require('../../integrations/stenci/config')

const handle = operation => async (req, res) => {
  try { await operation(req, res) } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível concluir a operação.', code: error.code || 'WHATSAPP_AUTOMATION_ERROR' })
  }
}
const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() }
const number = (value, fallback, min, max) => {
  const parsed = Number(value ?? fallback)
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw automation.fail('Parâmetro de paginação inválido.', 400)
  return parsed
}
const eventOutput = row => ({ ...row, start_date: require('../services/billingAgendaCollection').dateText(row.start_date), end_date: require('../services/billingAgendaCollection').dateText(row.end_date), audience: automation.parseJson(row.audience), active: Boolean(row.active), revision: Number(row.revision) })
const operationKey = req => req.get('Idempotency-Key') || req.body?.externalEventId
const locator = (appointmentId, body = {}) => ({ appointmentId, date: body.sourceDate || body.date, scheduleId: body.sourceScheduleId || body.scheduleId })
const target = (body = {}) => ({ scheduleId: body.targetScheduleId || body.scheduleId, professionalId: body.professionalId, startDate: body.startDate, endDate: body.endDate })
const slotKey = (branchId, value) => value?.scheduleId && value?.startDate ? `${branchId}:${value.scheduleId}:${value.startDate}` : null

function createWhatsAppRouters({ db, serviceToken, branchId, stenciConnector } = {}) {
  if (!db) throw new Error('Banco obrigatório para as APIs de WhatsApp.')
  const currentBranch = () => {
    const value = branchId || getStenciConfig().branchId
    if (typeof value !== 'string' || !value.trim() || value.length > 64) throw automation.fail('A unidade Stenci desta instalação não está configurada.', 503, 'STENCI_BRANCH_NOT_CONFIGURED')
    return value.trim()
  }
  const stenci = stenciConnector || require('../services/whatsappStenci').createWhatsAppStenci()
  const integrationRouter = express.Router()
  const adminRouter = express.Router()

  integrationRouter.use(noStore, serviceAuth(serviceToken))
  integrationRouter.get('/health', handle(async (_req, res) => { currentBranch(); res.json({ status: 'ok', version: 'v1', serverTime: new Date().toISOString(), timeZone: 'America/Sao_Paulo', branchConfigured: true }) }))
  integrationRouter.get('/capabilities', handle(async (_req, res) => { currentBranch(); res.json({
    absenceBatches: true,
    absenceResponses: true,
    completionBatches: true,
    completionSurveyResponses: true,
    scheduledAppointments: true,
    confirmedAppointments: true,
    campaignRecipients: true,
    evaluationAvailability: true,
    evaluationBooking: false,
    appointmentStatusWrite: true,
    appointmentCreate: true,
    appointmentReschedule: true,
    scheduleBlockWrite: true,
    resumptionBooking: true,
    canceledAppointmentsRemainHistory: true,
    canceledSlotReplacementRequired: false,
  }) }))
  integrationRouter.post('/absence-batches', handle(async (req, res) => res.status(201).json(await automation.createAbsenceBatch(db, currentBranch(), req.body))))
  integrationRouter.get('/appointments/scheduled', handle(async (req, res) => res.json(await automation.listAppointmentsByStatus(db, currentBranch(), 'scheduled', req.query))))
  integrationRouter.get('/appointments/confirmed', handle(async (req, res) => res.json(await automation.listAppointmentsByStatus(db, currentBranch(), 'confirmed', req.query))))
  integrationRouter.get('/absence-batches/:id', handle(async (req, res) => res.json(await automation.getAbsenceBatch(db, number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), currentBranch()))))
  integrationRouter.get('/absence-batches/:id/items', handle(async (req, res) => res.json({ items: await automation.listAbsenceCases(db, number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), currentBranch()) })))
  integrationRouter.post('/absence-cases/:caseToken/response', handle(async (req, res) => res.json(await automation.recordAbsenceResponse(db, req.params.caseToken, req.body, currentBranch()))))
  integrationRouter.get('/absence-cases/:caseToken/resumption', handle(async (req, res) => res.json(await automation.getResumptionContext(db, req.params.caseToken, currentBranch()))))
  integrationRouter.post('/absence-cases/:caseToken/availability', handle(async (req, res) => res.json(await automation.resumptionAvailability(db, stenci, req.params.caseToken, req.body, currentBranch()))))
  integrationRouter.post('/absence-cases/:caseToken/book', handle(async (req, res) => {
    const branch = currentBranch(), caseRow = await automation.getResumptionCase(db, req.params.caseToken, branch)
    const context = await automation.getResumptionContext(db, req.params.caseToken, branch)
    const items = Array.isArray(req.body?.appointments) ? req.body.appointments : []
    if (!items.length || items.length !== context.missingCount) throw automation.fail(`Confirme exatamente ${context.missingCount} reposição(ões) antes de gravar.`)
    const baseKey = operationKey(req)
    if (!baseKey) throw automation.fail('Envie uma Idempotency-Key válida.', 400, 'IDEMPOTENCY_KEY_REQUIRED')
    const used = new Set(), results = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index], source = locator(item.sourceAppointmentId, item), destination = target(item)
      automation.validateResumptionSource(caseRow, source, used)
      results.push(await appointmentWrites.execute({ db, branchId: branch, operationKey: `${baseKey}:replacement:${index + 1}`.slice(0, 160), kind: 'RESUMPTION_COPY', input: { caseToken: req.params.caseToken, patientId: caseRow.patient_external_id, source, destination }, targetKey: slotKey(branch, destination), sourceAppointmentId: source.appointmentId, executor: () => stenci.copyAppointment(source, destination, caseRow.patient_external_id) }))
    }
    res.json({ caseToken: req.params.caseToken, status: 'SUCCEEDED', results })
  }))
  integrationRouter.get('/operations/:operationKey', handle(async (req, res) => res.json(await appointmentWrites.getOperation(db, currentBranch(), req.params.operationKey))))
  integrationRouter.post('/appointments/:appointmentId/status', handle(async (req, res) => {
    const source = locator(req.params.appointmentId, req.body), status = String(req.body?.status || '').toLowerCase()
    res.json(await appointmentWrites.execute({ db, branchId: currentBranch(), operationKey: operationKey(req), kind: 'APPOINTMENT_STATUS', input: { source, status }, targetKey: `${currentBranch()}:appointment:${source.appointmentId}`, sourceAppointmentId: source.appointmentId, executor: () => stenci.setStatus(source, status) }))
  }))
  integrationRouter.post('/appointments/:appointmentId/reschedule', handle(async (req, res) => {
    const source = locator(req.params.appointmentId, req.body), destination = target(req.body)
    res.json(await appointmentWrites.execute({ db, branchId: currentBranch(), operationKey: operationKey(req), kind: source.scheduleId === destination.scheduleId ? 'APPOINTMENT_RESCHEDULE' : 'APPOINTMENT_MOVE', input: { source, destination }, targetKey: slotKey(currentBranch(), destination), sourceAppointmentId: source.appointmentId, executor: () => stenci.rescheduleAppointment(source, destination) }))
  }))
  integrationRouter.post('/schedule-blocks', handle(async (req, res) => {
    const destination = target(req.body), notes = String(req.body?.notes || '').trim()
    res.status(201).json(await appointmentWrites.execute({ db, branchId: currentBranch(), operationKey: operationKey(req), kind: 'SCHEDULE_BLOCK', input: { destination, notes }, targetKey: slotKey(currentBranch(), destination), executor: () => stenci.block(destination, notes) }))
  }))
  integrationRouter.post('/completion-batches', handle(async (req, res) => res.status(201).json(await automation.createCompletionBatch(db, currentBranch(), req.body))))
  integrationRouter.get('/completion-batches/:id', handle(async (req, res) => res.json(await automation.getCompletionBatch(db, number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), currentBranch()))))
  integrationRouter.get('/completion-batches/:id/items', handle(async (req, res) => res.json({ items: await automation.listCompletionCases(db, number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), currentBranch()) })))
  integrationRouter.post('/completion-cases/:caseToken/response', handle(async (req, res) => res.json(await automation.recordSurveyResponse(db, req.params.caseToken, req.body, currentBranch()))))
  integrationRouter.get('/campaigns/:id/recipients', handle(async (req, res) => res.json(await automation.getCampaignRecipients(db, number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), number(req.query.revision, 0, 1, Number.MAX_SAFE_INTEGER), currentBranch()))))

  adminRouter.use(auth, noStore)
  adminRouter.get('/schedule-block-options', modulePermission('whatsapp_automation'), handle(async (_req, res) => {
    const rows = await db('physiotherapy_rotation_agendas as a').join('professionals as p', 'p.id', 'a.professional_id').where({ 'p.active': 1 }).whereNotNull('p.external_id').select('a.schedule_id', 'a.schedule_name', 'p.external_id as professional_id', 'p.full_name as professional_name').orderBy('p.full_name').orderBy('a.schedule_name')
    res.json({ items: rows.map(row => ({ scheduleId: row.schedule_id, scheduleName: row.schedule_name, professionalId: row.professional_id, professionalName: row.professional_name })) })
  }))
  adminRouter.get('/schedule-blocks', modulePermission('whatsapp_automation'), handle(async (req, res) => {
    const page = number(req.query.page, 1, 1, 100000), pageSize = number(req.query.pageSize, 20, 1, 100)
    const query = db('whatsapp_stenci_operations').where({ branch_id: currentBranch(), kind: 'SCHEDULE_BLOCK' })
    const [{ total }] = await query.clone().count({ total: 'id' })
    const items = await query.select('*').orderBy('id', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    res.json({ items: items.map(row => ({ id: Number(row.id), status: row.status, request: automation.parseJson(row.request_snapshot), result: automation.parseJson(row.result_snapshot), errorCode: row.error_code, createdAt: row.created_at })), pagination: { page, pageSize, total: Number(total) } })
  }))
  adminRouter.post('/schedule-blocks', modulePermission('whatsapp_automation', 'create'), handle(async (req, res) => {
    const destination = target(req.body), notes = String(req.body?.notes || '').trim()
    const key = `admin-block:${req.user.id}:${crypto.randomUUID()}`
    res.status(201).json(await appointmentWrites.execute({ db, branchId: currentBranch(), operationKey: key, kind: 'SCHEDULE_BLOCK', input: { destination, notes }, targetKey: slotKey(currentBranch(), destination), executor: () => stenci.block(destination, notes) }))
  }))
  adminRouter.get('/events', modulePermission('whatsapp_automation'), handle(async (req, res) => {
    const page = number(req.query.page, 1, 1, 100000), pageSize = number(req.query.pageSize, 20, 1, 100)
    const query = db('whatsapp_events').where({ branch_id: currentBranch() }).whereNull('deleted_at')
    if (req.query.type) query.where('type', String(req.query.type).toUpperCase())
    if (req.query.status) query.where('status', String(req.query.status).toUpperCase())
    const [{ total }] = await query.clone().count({ total: 'id' })
    const items = await query.select('*').orderBy('start_date', 'desc').orderBy('id', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    res.json({ items: items.map(eventOutput), pagination: { page, pageSize, total: Number(total) } })
  }))
  adminRouter.post('/events', modulePermission('whatsapp_automation', 'create'), handle(async (req, res) => {
    const data = automation.normalizeEvent(req.body)
    const row = await db.transaction(async trx => {
      const [id] = await trx('whatsapp_events').insert({ ...data, branch_id: currentBranch(), created_by: req.user.id, updated_by: req.user.id })
      await automation.audit(trx, 'WHATSAPP_EVENT_CREATED', 'whatsapp_event', id, { actorId: req.user.id, metadata: { type: data.type, status: data.status } })
      return trx('whatsapp_events').where({ id, branch_id: currentBranch() }).first()
    })
    res.status(201).json(eventOutput(row))
  }))
  adminRouter.put('/events/:id', modulePermission('whatsapp_automation', 'edit'), handle(async (req, res) => {
    const id = number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), data = automation.normalizeEvent(req.body), revision = number(req.body.revision, 0, 1, Number.MAX_SAFE_INTEGER)
    const row = await db.transaction(async trx => {
      const current = await trx('whatsapp_events').where({ id, branch_id: currentBranch() }).whereNull('deleted_at').forUpdate().first()
      if (!current) throw automation.fail('Evento não encontrado.', 404, 'WHATSAPP_EVENT_NOT_FOUND')
      if (Number(current.revision) !== revision) throw automation.fail('Outra pessoa alterou este evento. Recarregue antes de salvar.', 409, 'WHATSAPP_EVENT_CONFLICT')
      await trx('whatsapp_events').where({ id, branch_id: currentBranch() }).update({ ...data, revision: revision + 1, webhook_status: 'NOT_SCHEDULED', webhook_attempts: 0, webhook_retry_at: null, webhook_delivered_at: null, webhook_error_code: null, updated_by: req.user.id, updated_at: trx.fn.now() })
      await automation.audit(trx, 'WHATSAPP_EVENT_UPDATED', 'whatsapp_event', id, { actorId: req.user.id, metadata: { fromRevision: revision, toRevision: revision + 1 } })
      return trx('whatsapp_events').where({ id, branch_id: currentBranch() }).first()
    })
    res.json(eventOutput(row))
  }))
  adminRouter.post('/events/:id/preview', modulePermission('whatsapp_automation'), handle(async (req, res) => {
    const id = number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER)
    const event = await db('whatsapp_events').where({ id, branch_id: currentBranch() }).whereNull('deleted_at').first()
    if (!event) throw automation.fail('Campanha não encontrada.', 404, 'CAMPAIGN_NOT_FOUND')
    const preview = await automation.campaignPreview(db, event)
    res.json({ eventId: preview.eventId, revision: preview.revision, total: preview.total, excluded: preview.excluded, items: preview.recipients.slice(0, 100).map(item => ({ patientName: item.patientName, phone: item.phone })) })
  }))
  adminRouter.post('/events/:id/approve', modulePermission('whatsapp_automation', 'edit'), handle(async (req, res) => {
    const id = number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), revision = number(req.body.revision, 0, 1, Number.MAX_SAFE_INTEGER)
    res.json(await automation.approveCampaign(db, id, revision, req.user.id, currentBranch()))
  }))
  adminRouter.post('/events/:id/notify', modulePermission('whatsapp_automation', 'edit'), handle(async (req, res) => {
    const id = number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER)
    const event = await db('whatsapp_events').where({ id, branch_id: currentBranch() }).whereNull('deleted_at').first()
    if (!event) throw automation.fail('Campanha não encontrada.', 404, 'CAMPAIGN_NOT_FOUND')
    res.json(await require('../services/whatsappCampaignWorker').notifyCampaign(db, id, new Date(), currentBranch()))
  }))
  adminRouter.delete('/events/:id', modulePermission('whatsapp_automation', 'delete'), handle(async (req, res) => {
    const id = number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), revision = number(req.body?.revision, 0, 1, Number.MAX_SAFE_INTEGER)
    await db.transaction(async trx => {
      const current = await trx('whatsapp_events').where({ id, branch_id: currentBranch() }).whereNull('deleted_at').forUpdate().first()
      if (!current) throw automation.fail('Evento não encontrado.', 404, 'WHATSAPP_EVENT_NOT_FOUND')
      if (Number(current.revision) !== revision) throw automation.fail('Outra pessoa alterou este evento. Recarregue antes de excluir.', 409, 'WHATSAPP_EVENT_CONFLICT')
      await trx('whatsapp_events').where({ id, branch_id: currentBranch() }).update({ active: false, revision: revision + 1, deleted_at: trx.fn.now(), updated_by: req.user.id, updated_at: trx.fn.now() })
      await automation.audit(trx, 'WHATSAPP_EVENT_DELETED', 'whatsapp_event', id, { actorId: req.user.id })
    })
    res.status(204).end()
  }))

  adminRouter.get('/absence-responses', modulePermission('whatsapp_automation'), handle(async (req, res) => {
    const page = number(req.query.page, 1, 1, 100000), pageSize = number(req.query.pageSize, 20, 1, 100)
    const query = db('whatsapp_absence_cases as c').join('whatsapp_absence_batches as b', 'b.id', 'c.batch_id').where({ 'b.branch_id': currentBranch() })
    if (req.query.choice) query.where('c.choice', String(req.query.choice).toUpperCase())
    if (req.query.billingStatus) query.where('c.billing_status', String(req.query.billingStatus).toUpperCase())
    const [{ total }] = await query.clone().count({ total: 'c.id' })
    const items = await query.select('c.id', 'c.patient_name', 'c.phone', 'c.choice', 'c.response_text', 'c.billing_status', 'c.billing_notes', 'c.responded_at', 'c.revision', 'c.absence_snapshot', 'b.report_date').orderBy('c.responded_at', 'desc').orderBy('c.id', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    res.json({ items: items.map(row => ({ ...row, report_date: require('../services/billingAgendaCollection').dateText(row.report_date), absence_snapshot: automation.parseJson(row.absence_snapshot), revision: Number(row.revision) })), pagination: { page, pageSize, total: Number(total) } })
  }))
  adminRouter.patch('/absence-responses/:id/billing', modulePermission('whatsapp_automation', 'edit'), handle(async (req, res) => {
    const id = number(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER), revision = number(req.body.revision, 0, 1, Number.MAX_SAFE_INTEGER), status = String(req.body.status || '').toUpperCase()
    if (!['PENDING', 'CONTACTED', 'RESOLVED', 'NOT_APPLICABLE'].includes(status)) throw automation.fail('Situação de cobrança inválida.')
    const notes = typeof req.body.notes === 'string' && req.body.notes.trim() ? req.body.notes.trim().slice(0, 2000) : null
    const row = await db.transaction(async trx => {
      const current = await trx('whatsapp_absence_cases as c').join('whatsapp_absence_batches as b', 'b.id', 'c.batch_id').where({ 'c.id': id, 'b.branch_id': currentBranch() }).select('c.*').forUpdate().first()
      if (!current) throw automation.fail('Resposta não encontrada.', 404, 'ABSENCE_CASE_NOT_FOUND')
      if (Number(current.revision) !== revision) throw automation.fail('Outra pessoa alterou este retorno. Recarregue antes de salvar.', 409, 'ABSENCE_CASE_CONFLICT')
      await trx('whatsapp_absence_cases').where({ id, batch_id: current.batch_id }).update({ billing_status: status, billing_notes: notes, revision: revision + 1, updated_at: trx.fn.now() })
      await automation.audit(trx, 'ABSENCE_BILLING_UPDATED', 'absence_case', id, { actorId: req.user.id, metadata: { status } })
      return trx('whatsapp_absence_cases').where({ id, batch_id: current.batch_id }).first()
    })
    res.json({ id: row.id, billing_status: row.billing_status, billing_notes: row.billing_notes, revision: Number(row.revision) })
  }))

  adminRouter.get('/completion-responses', modulePermission('whatsapp_automation'), handle(async (req, res) => {
    const page = number(req.query.page, 1, 1, 100000), pageSize = number(req.query.pageSize, 20, 1, 100)
    const query = db('whatsapp_completion_cases as c').join('whatsapp_completion_batches as b', 'b.id', 'c.batch_id').where({ 'b.branch_id': currentBranch() })
    if (req.query.status) query.where('c.response_status', String(req.query.status).toUpperCase())
    const [{ total }] = await query.clone().count({ total: 'c.id' })
    const items = await query.select('c.id', 'c.patient_name', 'c.phone', 'c.response_status', 'c.survey_response', 'c.responded_at', 'c.completion_snapshot', 'b.report_date').orderBy('c.responded_at', 'desc').orderBy('c.id', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    res.json({ items: items.map(row => ({ ...row, report_date: require('../services/billingAgendaCollection').dateText(row.report_date), survey_response: automation.parseJson(row.survey_response), completion_snapshot: automation.parseJson(row.completion_snapshot) })), pagination: { page, pageSize, total: Number(total) } })
  }))

  return { integrationRouter, adminRouter }
}

module.exports = { createWhatsAppRouters }
