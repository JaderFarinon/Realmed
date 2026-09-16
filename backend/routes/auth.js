const express = require('express')
const jwt = require('jsonwebtoken')
const crypto = require('node:crypto')

const pool = require('../db')
const authMiddleware = require('../middleware/auth')
const { normalizeRoleValue } = require('../middleware/permission')
const { syncStenciUser } = require('../services/stenciUserService')
const { getStenciConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')
const { stenciSessionStore } = require('../services/StenciSessionStore')

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  role: normalizeRoleValue(user.role) || user.role,
  status: user.status,
  personId: user.person_id,
  name: user.full_name || null,
  email: user.email || null,
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
} = {}) {
  const router = express.Router()

  router.post('/login', async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' })
    if (!jwtSecret) return res.status(500).json({ error: 'Autenticação não configurada.' })

    let sid
    try {
      const config = configFactory()
      const service = serviceFactory
        ? serviceFactory(config)
        : new StenciService(new StenciClient({ config }))
      const deviceId = deviceIdFactory()
      const identity = await service.authenticateUser(username, password, deviceId)
      const stenciSession = service.getSession()
      if (!stenciSession) throw Object.assign(new Error('Contexto de sessão Stenci ausente.'), { code: 'STENCI_SESSION_ERROR', stage: 'session' })
      const user = await syncUser(db, identity)
      sid = sessionStore.create(stenciSession)
      const payload = { ...publicUser(user), sid }
      const token = jwt.sign(payload, jwtSecret, { expiresIn: process.env.TOKEN_EXPIRES_IN || '2h' })
      console.info('[REALMED AUTH] login concluído')
      return res.json({ token, user: publicUser(user) })
    } catch (error) {
      if (sid) sessionStore.delete(sid)
      if (error.code === 'STENCI_INVALID_CREDENTIALS') return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
      console.error('[REALMED AUTH] falha na autenticação Stenci', { code: error.code || error.name, stage: error.stage, upstreamStatus: error.upstreamStatus })
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
        `SELECT u.id, u.username, u.role, u.status, u.person_id,
                p.full_name, p.email, p.avatar_url
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

  return router
}

module.exports = createAuthRouter()
module.exports.createAuthRouter = createAuthRouter
module.exports.publicUser = publicUser
