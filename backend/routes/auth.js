const express = require('express')
const jwt = require('jsonwebtoken')
const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const rateLimit = require('express-rate-limit')

const pool = require('../db')
const authMiddleware = require('../middleware/auth')
const { normalizeRoleValue } = require('../middleware/permission')
const { syncStenciUser, databaseDiagnostic } = require('../services/stenciUserService')
const { getStenciConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const { stenciSessionStore } = require('../services/StenciSessionStore')
const { withTransientStenci } = require('../services/transientStenciService')

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  role: normalizeRoleValue(user.role) || user.role,
  authProvider: user.auth_provider || user.authProvider || 'STENCI',
  status: user.status,
  personId: user.person_id,
  name: user.full_name || null,
  email: user.email || null,
  phone: user.phone || null,
  avatarUrl: user.avatar_url || null,
})

function createAuthRouter({
  db = pool,
  configFactory = getStenciConfig,
  serviceFactory,
  syncUser = syncStenciUser,
  jwtSecret = process.env.JWT_SECRET,
  sessionStore = stenciSessionStore,
  deviceIdFactory = () => crypto.randomUUID().replace(/-/g, ''),
  logger = console,
  passwordHasher = bcrypt,
} = {}) {
  const router = express.Router()

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.' },
  })

  router.post('/login', loginLimiter, async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' })
    if(username.length>300 || password.length>4096) return res.status(400).json({error:'Usuário ou senha excedem o limite permitido.'})
    if (!jwtSecret) return res.status(500).json({ error: 'Autenticação não configurada.' })

    let sid
    try {
      const [localRows] = await db.query(
        `SELECT u.id, u.username, u.role, u.status, u.person_id,
                u.auth_provider, u.password_hash, p.full_name, p.email, p.avatar_url
           FROM users u LEFT JOIN people p ON p.id = u.person_id
          WHERE u.username = ? AND u.auth_provider = 'LOCAL' LIMIT 1`,
        [username],
      )
      const localUser = localRows[0]
      if (localUser) {
        if (localUser.status !== 'active')
          return res.status(403).json({ error: 'Acesso indisponível. Solicite liberação ao administrador.', code: 'USER_ACCESS_DISABLED' })
        if (Buffer.byteLength(password, 'utf8') > 72)
          return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
        const valid = localUser.password_hash && await passwordHasher.compare(password, localUser.password_hash)
        if (!valid) return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
        await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [localUser.id])
        const user = { ...localUser, auth_provider: 'LOCAL' }
        const token = jwt.sign(publicUser(user), jwtSecret, { expiresIn: process.env.TOKEN_EXPIRES_IN || '2h' })
        logger.info('[REALMED AUTH] login local concluído')
        return res.json({ token, user: publicUser(user) })
      }

      const config = configFactory()
      const service = serviceFactory
        ? serviceFactory(config)
        : new StenciService(new StenciClient({ config }))
      const deviceId = deviceIdFactory()
      const { user, identity } = await withTransientStenci(service, async () => {
        const identity = await service.authenticateUser(username, password, deviceId)
        if (!service.getSession()) throw Object.assign(new Error('Contexto de sessão Stenci ausente.'), { code: 'STENCI_SESSION_ERROR', stage: 'session' })
        return { identity, user: await syncUser(db, identity) }
      }, logger)
      sid = sessionStore.create({ mode: 'detached', deviceId, branchId: config.branchId, stenciUserId: identity.stenci_user_id, cache: new Map() })
      const payload = { ...publicUser(user), sid }
      const token = jwt.sign(payload, jwtSecret, { expiresIn: process.env.TOKEN_EXPIRES_IN || '2h' })
      if(!sessionStore.limitExpiration(sid,jwt.decode(token).exp*1000)) throw Object.assign(new Error('Sessão Realmed inválida.'),{code:'REALMED_SESSION_ERROR'})
      sessionStore.setCredentials(sid, { username, password })
      logger.info('[REALMED AUTH] login concluído')
      return res.json({ token, user: publicUser(user) })
    } catch (error) {
      if (sid) sessionStore.delete(sid)
      if (error.code === 'USER_ACCESS_DISABLED') return res.status(403).json({ error: error.message, code: error.code })
      if (error.code === 'STENCI_INVALID_CREDENTIALS') return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
      if (error.code === 'USER_IDENTITY_CONFLICT') return res.status(409).json({ error: error.message, code: error.code })
      if (['REALMED_USER_SYNC_FAILED', 'USER_SYNC_LOCK_TIMEOUT', 'USER_SYNC_LOCK_ERROR'].includes(error.code)) {
        logger.error('[REALMED USER SYNC] falha', databaseDiagnostic(error.cause))
        return res.status(error.status || 500).json({ error: error.message, code: error.code })
      }
      logger.error('[REALMED AUTH] falha na autenticação Stenci', { code: error.code || error.name, stage: error.stage, upstreamStatus: error.upstreamStatus })
      if (error.code === 'STENCI_LOGOUT_FAILED') return res.status(502).json({ error: error.message, code: error.code })
      if (error.code === 'STENCI_BRANCH_FAILED') return res.status(502).json({ error: 'Não foi possível selecionar a unidade da Realmed no Stenci.' })
      if (error.code === 'STENCI_ME_FAILED') return res.status(502).json({ error: 'Autenticação realizada, mas não foi possível validar o usuário no Stenci.' })
      return res.status(error.code === 'STENCI_CONNECTION_ERROR' ? 503 : 502).json({ error: 'Não foi possível validar seu acesso no momento. Tente novamente.' })
    }
  })

  router.post('/logout', authMiddleware, (req, res) => {
    sessionStore.delete(req.user.sid)
    res.status(204).end()
  })

  router.get('/me', authMiddleware, async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT u.id, u.username, u.role, u.status, u.person_id, u.auth_provider,
                p.full_name, p.email, p.phone, p.avatar_url
           FROM users u LEFT JOIN people p ON p.id = u.person_id
          WHERE u.id = ? LIMIT 1`,
        [req.user.id],
      )
      if (!rows.length || rows[0].status !== 'active') return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' })
      const [permissionRows] = await db.query(
        'SELECT module_key, can_view, can_create, can_edit, can_delete FROM user_permissions WHERE user_id = ?',
        [req.user.id],
      )
      return res.json({ user: {
        ...publicUser(rows[0]),
        permissionsEnabled: process.env.PERMISSIONS_ENABLED !== 'false',
        permissions: permissionRows.map((permission) => ({
          moduleKey: permission.module_key, canView: Boolean(permission.can_view),
          canCreate: Boolean(permission.can_create), canEdit: Boolean(permission.can_edit),
          canDelete: Boolean(permission.can_delete),
        })),
      } })
    } catch (error) {
      console.error('[Auth] Falha ao recuperar usuário:', error.name)
      return res.status(500).json({ error: 'Erro ao carregar usuário autenticado.' })
    }
  })

  const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 5, skipSuccessfulRequests: true,
    keyGenerator: req => String(req.user.id), standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Muitas tentativas de troca de senha. Aguarde 15 minutos e tente novamente.' },
  })
  const saveOwnProfile = passwordOnly => async (req, res) => {
    try {
      const user = await require('../services/selfProfile').changeOwnProfile(db, req.user.id, req.body, passwordHasher, passwordOnly)
      res.set('Cache-Control', 'no-store')
      return res.json(passwordOnly ? { message: 'Senha alterada com sucesso.' } : { user: publicUser(user) })
    } catch (error) {
      if (!error.status) logger.error('[REALMED PROFILE] falha ao salvar', { code: error.code || error.name })
      return res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível salvar. Tente novamente.' })
    }
  }
  router.put('/me', authMiddleware, saveOwnProfile(false))
  router.post('/me/password', authMiddleware, passwordChangeLimiter, saveOwnProfile(true))

  return router
}

module.exports = createAuthRouter()
module.exports.createAuthRouter = createAuthRouter
module.exports.publicUser = publicUser
