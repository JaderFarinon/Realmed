const crypto = require('node:crypto')
const express = require('express')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const auth = require('../middleware/auth')
const { knex } = require('./guide-center')
const { getStenciConfig } = require('../../integrations/stenci/config')
const StenciMapper = require('../../integrations/stenci/StenciMapper')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const { withTransientStenci } = require('../services/transientStenciService')
const { refreshStenci } = require('../services/stenciRefreshService')
const { stenciSessionStore } = require('../services/StenciSessionStore')
const { publicUser } = require('./auth')
const faceRecognition = require('../services/physiotherapistFaceRecognition')
const { period } = require('../services/billingDashboard')

const challenges = new Map()
const router = express.Router()
// Desafio e tentativa de autenticação têm limites separados: cada leitura usa os dois endpoints.
const challengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas leituras iniciadas. Aguarde alguns minutos antes de tentar novamente.' },
})
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 400 || res.locals.faceAdditionalCheck === true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Limite de tentativas de identificação facial atingido. Aguarde alguns minutos e tente novamente.' },
})

function isPhysioDevBypassEnabled() {
  if (process.env.STENCI_FISIO_DEV_BYPASS !== 'true') return false
  return process.env.NODE_ENV !== 'production' || process.env.STENCI_FISIO_DEV_BYPASS_IN_PRODUCTION === 'true'
}

function issueChallenge(mode = 'passive') {
  const now = Date.now()
  for (const [key, value] of challenges) if (value.expiresAt <= now) challenges.delete(key)
  if (challenges.size >= 500) challenges.delete(challenges.keys().next().value)
  const id = crypto.randomBytes(24).toString('base64url')
  challenges.set(id, { expiresAt: now + 30_000, mode })
  return { id, expiresInSeconds: 30, instruction: mode === 'blink' ? 'blink' : 'look', capture: { frames: mode === 'blink' ? 16 : 6, width: 480, intervalMs: 120 } }
}
router.post('/auth/challenge', challengeLimiter, (_req, res) => {
  res.set('Cache-Control', 'no-store').json(issueChallenge())
})

router.post('/auth/face', loginLimiter, async (req, res) => {
  const challenge = String(req.body?.challenge || '')
  const state = challenges.get(challenge)
  challenges.delete(challenge)
  if (!state || state.expiresAt <= Date.now()) return res.status(401).json({ error: 'A leitura expirou. Toque em Entrar e tente novamente.' })
  let sid
  let descriptors
  try {
    descriptors = await faceRecognition.authenticateFrames(req.body?.frames, { requireBlink: state.mode === 'blink' })
    const biometricRows = await knex('physiotherapist_face_biometrics as b')
      .join('users as u', 'u.id', 'b.user_id')
      .join('physiotherapist_user_links as l', 'l.user_id', 'u.id')
      .join('professionals as p', 'p.id', 'l.professional_id')
      .where({ 'u.status': 'active', 'u.role': 'user', 'p.active': 1 })
      .select('b.user_id', 'b.encrypted_templates', 'b.iv', 'b.auth_tag')
    const userId = await faceRecognition.matchDescriptors(descriptors, biometricRows)
    if (!userId) return res.status(401).json({ error: 'Não reconheci um fisioterapeuta cadastrado. Tente novamente ou use o login do Realmed.' })
    const user = await knex('users as u').join('people as p', 'p.id', 'u.person_id')
      .join('physiotherapist_user_links as l', 'l.user_id', 'u.id')
      .join('professionals as pr', 'pr.id', 'l.professional_id')
      .where({ 'u.id': userId, 'u.status': 'active', 'u.role': 'user', 'pr.active': 1 })
      .first('u.id', 'u.username', 'u.role', 'u.status', 'u.person_id', 'p.full_name', 'p.email', 'p.avatar_url', 'l.professional_id', 'pr.full_name as professional_name')
    if (!user) return res.status(401).json({ error: 'Este usuário não está ativo para o modo fisioterapeuta.' })

    const username = String(process.env.STENCI_FISIO_USERNAME || '').trim()
    const password = String(process.env.STENCI_FISIO_PASSWORD || '')
    const developmentMode = !username || !password
    if (developmentMode && !isPhysioDevBypassEnabled()) return res.status(503).json({ error: 'O acesso compartilhado do Stenci para fisioterapia ainda não foi configurado.', code: 'STENCI_FISIO_NOT_CONFIGURED' })
    if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'Autenticação do Realmed não está configurada.' })

    if (developmentMode) {
      sid = stenciSessionStore.create({ mode: 'physio-development', stenciUserId: null, cache: new Map() })
    } else {
      const config = getStenciConfig()
      const deviceId = crypto.randomUUID().replace(/-/g, '')
      const service = new StenciService(new StenciClient({ config }))
      const identity = await withTransientStenci(service, () => service.authenticateUser(username, password, deviceId))
      if (!identity?.stenci_user_id) throw Object.assign(new Error('A conta Stenci não retornou uma identidade válida.'), { code: 'STENCI_FISIO_INVALID_IDENTITY' })
      sid = stenciSessionStore.create({ mode: 'detached', deviceId, branchId: config.branchId, stenciUserId: identity.stenci_user_id, cache: new Map() })
      stenciSessionStore.setCredentials(sid, { username, password })
    }
    const token = jwt.sign({ ...publicUser(user), sid, physiotherapistId: user.professional_id }, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRES_IN || '2h' })
    if (!stenciSessionStore.limitExpiration(sid, jwt.decode(token).exp * 1000)) throw Object.assign(new Error('Não foi possível criar a sessão.'), { code: 'REALMED_SESSION_ERROR' })
    await knex('users').where({ id: user.id }).update({ last_login: knex.fn.now(), updated_at: knex.fn.now() })
    res.set('Cache-Control', 'no-store').json({ token, developmentMode, user: { ...publicUser(user), professionalId: user.professional_id, professionalName: user.professional_name } })
  } catch (error) {
    if (sid) stenciSessionStore.delete(sid)
    if (error.code === 'FACE_MOTION_REQUIRED') {
      res.locals.faceAdditionalCheck = true
      return res.status(401).set('Cache-Control', 'no-store').json({ error: error.message, code: error.code, challenge: issueChallenge('blink') })
    }
    if (error.code === 'BIOMETRY_KEY_REQUIRED') return res.status(503).json({ error: error.message, code: error.code })
    if (error.code === 'FACE_BUSY') return res.status(503).json({ error: error.message })
    if (error.code === 'STENCI_LOGOUT_FAILED') return res.status(502).json({ error: 'O Stenci não confirmou o encerramento da autenticação. Tente novamente.' })
    if (error.code === 'STENCI_INVALID_CREDENTIALS') return res.status(503).json({ error: 'A conta compartilhada do Stenci não autenticou. Confira as credenciais configuradas.' })
    if (error.code === 'STENCI_CONNECTION_ERROR' || error.code === 'STENCI_BRANCH_FAILED' || error.code === 'STENCI_ME_FAILED') return res.status(503).json({ error: 'Não foi possível validar a conta compartilhada do Stenci. Tente novamente.' })
    if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message })
    console.error('[Modo Fisioterapeuta] falha de autenticação facial', error.code || error.name)
    res.status(error.status || 503).json({ error: 'Não foi possível entrar no modo fisioterapeuta. Tente novamente.' })
  } finally { descriptors?.forEach(descriptor => descriptor.fill(0)) }
})

router.use(auth)

router.get('/me', async (req, res) => {
  try {
    const session = stenciSessionStore.get(req.user.sid)
    const link = await knex('physiotherapist_user_links as l').join('professionals as p', 'p.id', 'l.professional_id')
      .leftJoin('physiotherapist_face_biometrics as b', 'b.user_id', 'l.user_id')
      .where({ 'l.user_id': req.user.id, 'p.active': 1 })
      .first('p.id as professionalId', 'p.full_name as professionalName', 'b.user_id as faceEnrolled')
    if (!link || !link.faceEnrolled) return res.status(403).json({ error: 'Seu usuário ainda não está configurado para o modo fisioterapeuta.' })
    res.set('Cache-Control', 'no-store').json({ ...link, developmentMode: session?.mode === 'physio-development' })
  } catch (error) {
    res.status(500).json({ error: 'Não foi possível carregar o perfil de fisioterapia.' })
  }
})

router.get('/agenda', async (req, res) => {
  const date = String(req.query.date || '')
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null
  if (!parsedDate || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return res.status(400).json({ error: 'Informe uma data válida.' })
  try {
    const link = await knex('physiotherapist_user_links').where({ user_id: req.user.id }).first()
    if (!link) return res.status(403).json({ error: 'Não há agenda associada a este fisioterapeuta.' })
    const schedules = await knex('physiotherapy_rotation_agendas').where({ professional_id: link.professional_id }).select('schedule_id', 'schedule_name')
    if (!schedules.length) return res.json({ items: [], date })
    const results = []
    for (let index = 0; index < schedules.length; index += 4) {
      const group = schedules.slice(index, index + 4)
      const batch = await refreshStenci({ sid: req.user.sid, sessionStore: stenciSessionStore, operations: group.map((schedule) => ({ name: 'billingRead', kind: 'calendar', date, scheduleId: schedule.schedule_id })) })
      for (let itemIndex = 0; itemIndex < group.length; itemIndex += 1) {
        const schedule = group[itemIndex]
        for (const item of batch[itemIndex]?.value?.items || []) results.push({ ...item, schedule_id: schedule.schedule_id, schedule_name: schedule.schedule_name })
      }
    }
    results.sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')))
    res.set('Cache-Control', 'no-store').json({ items: results, date })
  } catch (error) {
    if (error.code === 'STENCI_REFRESH_REQUIRED') return res.status(428).json({ error: error.message, code: error.code, stenciOperation: error.stenciOperation })
    res.status(error.status || 502).json({ error: 'Não foi possível carregar a agenda do Stenci.' })
  }
})

router.get('/patients/search', async (req, res) => {
  const search = String(req.query.search || '').trim()
  if (search.length < 2 || search.length > 180) return res.status(400).json({ error: 'Digite pelo menos dois caracteres para buscar.' })
  try {
    const batch = await refreshStenci({ sid: req.user.sid, sessionStore: stenciSessionStore, operations: [{ name: 'searchPatients', search, limit: 30, offset: 0 }] })
    const result = batch[0]?.value || { items: [], hasMore: false }
    const patients = (result.items || []).map((source) => StenciMapper.patient(source))
    const patientIds = patients.map((patient) => String(patient.external_id)).filter(Boolean)
    let visits = []
    if (patientIds.length) {
      visits = await knex('billing_stenci_appointments')
        .where({ branch_id: getStenciConfig().branchId })
        .whereIn('patient_external_id', patientIds)
        .select('external_id', 'patient_external_id', 'service_date', 'schedule_name', 'start_at', 'status', 'is_session')
        .orderBy('service_date', 'desc').orderBy('start_at', 'desc')
    }
    const grouped = new Map()
    for (const visit of visits) {
      const key = String(visit.patient_external_id)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push({ id: visit.external_id, date: visit.service_date instanceof Date ? visit.service_date.toISOString().slice(0, 10) : String(visit.service_date).slice(0, 10), schedule: visit.schedule_name, startAt: visit.start_at, status: visit.status, isSession: Boolean(visit.is_session) })
    }
    res.set('Cache-Control', 'no-store').json({ items: patients.map((patient) => ({ ...patient, appointments: grouped.get(String(patient.external_id)) || [] })), hasMore: Boolean(result.hasMore) })
  } catch (error) {
    if (error.code === 'STENCI_REFRESH_REQUIRED') return res.status(428).json({ error: error.message, code: error.code, stenciOperation: error.stenciOperation })
    res.status(error.status || 502).json({ error: 'Não foi possível buscar pacientes no Stenci.' })
  }
})

router.get('/production', async (req, res) => {
  try {
    const { start, end } = period({ start: String(req.query.start || ''), end: String(req.query.end || '') })
    const link = await knex('physiotherapist_user_links').where({ user_id: req.user.id }).first()
    if (!link) return res.status(403).json({ error: 'Não há agenda associada a este fisioterapeuta.' })
    const schedules = await knex('physiotherapy_rotation_agendas').where({ professional_id: link.professional_id }).pluck('schedule_id')
    const items = schedules.length ? await knex('billing_stenci_appointments')
      .where({ branch_id: getStenciConfig().branchId })
      .whereIn('schedule_id', schedules)
      .whereBetween('service_date', [start, end])
      .select('service_date', 'status', 'is_session')
      .orderBy('service_date') : []
    const byDay = new Map()
    for (const item of items) {
      const day = item.service_date instanceof Date ? item.service_date.toISOString().slice(0, 10) : String(item.service_date).slice(0, 10)
      const current = byDay.get(day) || { date: day, appointments: 0, completed: 0, sessions: 0 }
      current.appointments += 1
      current.completed += item.status === 'finished' ? 1 : 0
      current.sessions += item.is_session ? 1 : 0
      byDay.set(day, current)
    }
    res.set('Cache-Control', 'no-store').json({ start, end, totals: { appointments: items.length, completed: items.filter((item) => item.status === 'finished').length, sessions: items.filter((item) => Boolean(item.is_session)).length }, days: [...byDay.values()] })
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível carregar o relatório de produção.' })
  }
})

module.exports = router
