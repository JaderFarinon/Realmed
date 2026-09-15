const express = require('express')
const knexFactory = require('knex')
const knexConfig = require('../knexfile')
const authMiddleware = require('../middleware/auth')
const {
  permissionMiddleware,
  canManageRole,
  normalizeRoleValue,
} = require('../middleware/permission')

const environment = process.env.NODE_ENV || 'development'
const config = knexConfig[environment] || knexConfig.development
const knex = knexFactory(config)

const router = express.Router()

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

const normalizeBoolean = (value) => {
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
  }

  return value === true || value === 1
}

const mapPermissionRow = (row) => ({
  moduleKey: row.module_key,
  canView: Boolean(row.can_view),
  canCreate: Boolean(row.can_create),
  canEdit: Boolean(row.can_edit),
  canDelete: Boolean(row.can_delete),
})

const findUserById = async (userId) => {
  return knex('users').where('id', userId).first()
}

const ensureCanManageUser = (currentUser, targetUser) => {
  if (!targetUser) {
    throw new HttpError(404, 'Usuário não encontrado.')
  }

  const currentRole = normalizeRoleValue(currentUser?.role)
  const targetRole = normalizeRoleValue(targetUser?.role)

  if (currentRole === 'masteradmin') {
    return
  }

  if (currentRole === 'admin') {
    if (canManageRole(currentRole, targetRole) === false) {
      throw new HttpError(403, 'Você não possui permissão para gerenciar este usuário.')
    }

    // Administradores devem sempre conseguir gerenciar permissões, independentemente
    // de vínculo com setor ou configurações adicionais.
    return
  }

  throw new HttpError(403, 'Permissão negada.')
}

const validateModuleKey = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 100)
}

const validatePermissionsPayload = (payload) => {
  if (!Array.isArray(payload)) {
    throw new HttpError(400, 'O formato de permissões enviado é inválido.')
  }

  const normalized = []
  const moduleKeys = new Set()

  payload.forEach((item, index) => {
    const moduleKey = validateModuleKey(item?.moduleKey)
    if (!moduleKey) {
      throw new HttpError(400, `moduleKey inválido ou ausente na posição ${index}.`)
    }

    if (moduleKeys.has(moduleKey)) {
      return
    }

    moduleKeys.add(moduleKey)

    normalized.push({
      module_key: moduleKey,
      can_view: normalizeBoolean(item?.canView),
      can_create: normalizeBoolean(item?.canCreate),
      can_edit: normalizeBoolean(item?.canEdit),
      can_delete: normalizeBoolean(item?.canDelete),
    })
  })

  return normalized
}

/**
 * @swagger
 * tags:
 *   - name: Permissions
 *     description: Gerenciamento de permissões por usuário
 */

router.use(authMiddleware)
router.use(permissionMiddleware(['masteradmin', 'admin']))

/**
 * @swagger
 * /api/permissoes/{userId}:
 *   get:
 *     summary: Lista as permissões atribuídas a um usuário
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Permissões cadastradas para o usuário informado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserPermission'
 *       403:
 *         description: Usuário autenticado não possui permissão para gerenciar o usuário informado.
 *       404:
 *         description: Usuário alvo não encontrado.
 *   post:
 *     summary: Atualiza as permissões de um usuário
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/UserPermissionPayload'
 *     responses:
 *       200:
 *         description: Permissões atualizadas com sucesso.
 *       400:
 *         description: Dados inválidos informados na requisição.
 *       403:
 *         description: Usuário autenticado não possui permissão para salvar as permissões.
 *       404:
 *         description: Usuário alvo não encontrado.
 */
router.route('/:userId').get(async (req, res) => {
  try {
    const userId = Number(req.params.userId)

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(400, 'Identificador de usuário inválido.')
    }

    const [currentUser, targetUser] = await Promise.all([
      findUserById(req.user.id),
      findUserById(userId),
    ])

    if (!currentUser) {
      throw new HttpError(403, 'Usuário autenticado não encontrado.')
    }

    ensureCanManageUser(currentUser, targetUser)

    const permissions = await knex('user_permissions').where('user_id', userId)

    res.json({
      userId,
      permissions: permissions.map(mapPermissionRow),
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message })
    }

    console.error('[Permissions] Erro ao listar permissões:', error)
    return res.status(500).json({ error: 'Erro ao listar permissões do usuário.' })
  }
}).post(async (req, res) => {
  const trx = await knex.transaction()

  try {
    const userId = Number(req.params.userId)

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(400, 'Identificador de usuário inválido.')
    }

    const [currentUser, targetUser] = await Promise.all([
      findUserById(req.user.id),
      findUserById(userId),
    ])

    if (!currentUser) {
      throw new HttpError(403, 'Usuário autenticado não encontrado.')
    }

    ensureCanManageUser(currentUser, targetUser)

    const normalizedPermissions = validatePermissionsPayload(req.body?.permissions)

    await trx('user_permissions').where('user_id', userId).del()

    if (normalizedPermissions.length > 0) {
      const rows = normalizedPermissions.map((permission) => ({
        user_id: userId,
        module_key: permission.module_key,
        can_view: permission.can_view,
        can_create: permission.can_create,
        can_edit: permission.can_edit,
        can_delete: permission.can_delete,
      }))

      await trx('user_permissions').insert(rows)
    }

    await trx.commit()

    const savedPermissions = await knex('user_permissions').where('user_id', userId)

    res.json({
      userId,
      permissions: savedPermissions.map(mapPermissionRow),
    })
  } catch (error) {
    await trx.rollback()

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message })
    }

    console.error('[Permissions] Erro ao salvar permissões:', error)
    return res.status(500).json({ error: 'Erro ao salvar permissões do usuário.' })
  }
})

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPermission:
 *       type: object
 *       properties:
 *         moduleKey:
 *           type: string
 *         canView:
 *           type: boolean
 *         canCreate:
 *           type: boolean
 *         canEdit:
 *           type: boolean
 *         canDelete:
 *           type: boolean
 *     UserPermissionPayload:
 *       type: object
 *       required:
 *         - moduleKey
 *       properties:
 *         moduleKey:
 *           type: string
 *         canView:
 *           type: boolean
 *           default: false
 *         canCreate:
 *           type: boolean
 *           default: false
 *         canEdit:
 *           type: boolean
 *           default: false
 *         canDelete:
 *           type: boolean
 *           default: false
 */

module.exports = router
