const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const pool = require('../db')
const authMiddleware = require('../middleware/auth')
const { normalizeRoleValue } = require('../middleware/permission')

const router = express.Router()

router.post('/login', async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' })
  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Autenticação não configurada.' })

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username])
    const user = rows[0]
    if (!user || user.status !== 'active' || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
    }

    const [people] = await pool.query(
      'SELECT full_name, email, avatar_url FROM people WHERE id = ? LIMIT 1',
      [user.person_id],
    )
    const person = people[0] || {}
    const payload = {
      id: user.id,
      username: user.username,
      role: normalizeRoleValue(user.role) || user.role,
      status: user.status,
      personId: user.person_id,
      name: person.full_name || null,
      email: person.email || null,
      avatarUrl: person.avatar_url || null,
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.TOKEN_EXPIRES_IN || '2h',
    })
    return res.json({ token, user: payload })
  } catch (error) {
    console.error('[Auth] Falha no login:', error)
    return res.status(500).json({ error: 'Erro ao efetuar login.' })
  }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.role, u.status, u.person_id,
              p.full_name, p.email, p.avatar_url
         FROM users u LEFT JOIN people p ON p.id = u.person_id
        WHERE u.id = ? LIMIT 1`,
      [req.user.id],
    )
    if (!rows.length || rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' })
    }
    const [permissionRows] = await pool.query(
      'SELECT module_key, can_view, can_create, can_edit, can_delete FROM user_permissions WHERE user_id = ?',
      [req.user.id],
    )
    const user = rows[0]
    return res.json({ user: {
      id: user.id, username: user.username, role: normalizeRoleValue(user.role) || user.role,
      status: user.status, personId: user.person_id, name: user.full_name,
      email: user.email, avatarUrl: user.avatar_url,
      permissions: permissionRows.map((permission) => ({
        moduleKey: permission.module_key, canView: Boolean(permission.can_view),
        canCreate: Boolean(permission.can_create), canEdit: Boolean(permission.can_edit),
        canDelete: Boolean(permission.can_delete),
      })),
    } })
  } catch (error) {
    console.error('[Auth] Falha ao recuperar usuário:', error)
    return res.status(500).json({ error: 'Erro ao carregar usuário autenticado.' })
  }
})

module.exports = router
