const express = require('express')
const jwt = require('jsonwebtoken')

const pool = require('../db')
const authMiddleware = require('../middleware/auth')
const { normalizeRoleValue } = require('../middleware/permission')
const { syncStenciUser } = require('../services/stenciUserService')
const { getStenciConfig } = require('../../integrations/stenci/config')
const StenciClient = require('../../integrations/stenci/StenciClient')
const StenciService = require('../../integrations/stenci/StenciService')

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
} = {}) {
  const router = express.Router()

  router.post('/login', async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' })
    if (!jwtSecret) return res.status(500).json({ error: 'Autenticação não configurada.' })

    try {
      const config = configFactory()
      const service = serviceFactory
        ? serviceFactory(config)
        : new StenciService(new StenciClient({ config }))
      const identity = await service.authenticateUser(username, password)
      const user = await syncUser(db, identity)
      const payload = publicUser(user)
      const token = jwt.sign(payload, jwtSecret, { expiresIn: process.env.TOKEN_EXPIRES_IN || '2h' })
      return res.json({ token, user: payload })
    } catch (error) {
      const invalidCredentials = ['STENCI_HTTP_401', 'STENCI_HTTP_403'].includes(error.code)
      if (invalidCredentials) return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
      console.error('[Auth] Falha controlada na autenticação Stenci:', error.code || error.name)
      return res.status(503).json({ error: 'Não foi possível validar seu acesso no momento. Tente novamente em alguns instantes.' })
    }
  })

  router.post('/logout', authMiddleware, (_req, res) => res.status(204).end())

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
