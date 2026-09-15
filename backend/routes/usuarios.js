const express = require('express')
const bcrypt = require('bcryptjs')
const knexFactory = require('knex')

const knexConfig = require('../knexfile')
const authMiddleware = require('../middleware/auth')
const { permissionMiddleware, canManageRole, normalizeRoleValue } = require('../middleware/permission')

const knex = knexFactory(knexConfig[process.env.NODE_ENV || 'development'] || knexConfig.development)
const router = express.Router()
const ROLES = ['masteradmin', 'admin', 'user', 'doctor', 'nurse', 'pharmacist', 'patient']
const STATUSES = ['active', 'inactive', 'blocked']

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

const clean = (value) => typeof value === 'string' ? value.trim() : ''
const mapUser = (row) => ({
  id: row.id, personId: row.personId, nome: row.full_name, email: row.email,
  telefone: row.phone || null, documento: row.cpf, login: row.username,
  role: normalizeRoleValue(row.role) || row.role, status: row.status,
  createdAt: row.created_at, updatedAt: row.updated_at,
})
const userQuery = () => knex('users as u').leftJoin('people as p', 'p.id', 'u.person_id').select(
  'u.id', 'u.username', 'u.role', 'u.status', 'u.person_id as personId',
  'u.created_at', 'u.updated_at', 'p.full_name', 'p.email', 'p.phone', 'p.cpf',
)

router.use(authMiddleware)
router.use(permissionMiddleware(['masteradmin', 'admin']))

router.get('/', async (req, res) => {
  try {
    const query = userQuery().orderBy('p.full_name')
    const search = clean(req.query.search)
    if (search) query.where((builder) => builder.where('p.full_name', 'like', `%${search}%`).orWhere('p.email', 'like', `%${search}%`).orWhere('u.username', 'like', `%${search}%`))
    if (ROLES.includes(req.query.role)) query.andWhere('u.role', req.query.role)
    if (STATUSES.includes(req.query.status)) query.andWhere('u.status', req.query.status)
    return res.json((await query).map(mapUser))
  } catch (error) { return handle(error, res, 'listar') }
})

router.post('/', async (req, res) => {
  const trx = await knex.transaction()
  try {
    const data = validate(req.body, true)
    ensureRole(req.user.role, data.role)
    await ensureUnique(trx, data)
    const [personId] = await trx('people').insert({ cpf: data.documento, full_name: data.nome, email: data.email, phone: data.telefone || null })
    const [id] = await trx('users').insert({ username: data.login, password: await bcrypt.hash(data.senha, 12), person_id: personId, role: data.role, status: data.status })
    await trx.commit()
    return res.status(201).json(mapUser(await userQuery().where('u.id', id).first()))
  } catch (error) { await trx.rollback(); return handle(error, res, 'criar') }
})

router.put('/:id', async (req, res) => {
  const trx = await knex.transaction()
  try {
    const id = positiveId(req.params.id)
    const current = await trx('users').where({ id }).first()
    if (!current) throw new HttpError(404, 'Usuário não encontrado.')
    if (!canManageRole(req.user.role, current.role)) throw new HttpError(403, 'Permissão negada.')
    const data = validate(req.body, false)
    ensureRole(req.user.role, data.role)
    await ensureUnique(trx, data, id, current.person_id)
    await trx('people').where({ id: current.person_id }).update({ cpf: data.documento, full_name: data.nome, email: data.email, phone: data.telefone || null })
    const update = { username: data.login, role: data.role, status: data.status }
    if (data.senha) update.password = await bcrypt.hash(data.senha, 12)
    await trx('users').where({ id }).update(update)
    await trx.commit()
    return res.json(mapUser(await userQuery().where('u.id', id).first()))
  } catch (error) { await trx.rollback(); return handle(error, res, 'atualizar') }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = positiveId(req.params.id)
    if (id === Number(req.user.id)) throw new HttpError(400, 'Não é possível excluir o próprio usuário.')
    const user = await knex('users').where({ id }).first()
    if (!user) throw new HttpError(404, 'Usuário não encontrado.')
    if (!canManageRole(req.user.role, user.role)) throw new HttpError(403, 'Permissão negada.')
    await knex('people').where({ id: user.person_id }).delete()
    return res.status(204).send()
  } catch (error) { return handle(error, res, 'excluir') }
})

function positiveId(value) {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Identificador inválido.')
  return id
}
function validate(body, passwordRequired) {
  const data = { nome: clean(body.nome), email: clean(body.email), telefone: clean(body.telefone), documento: clean(body.documento), login: clean(body.login), senha: typeof body.senha === 'string' ? body.senha : '', role: normalizeRoleValue(body.role) || 'user', status: clean(body.status) || 'active' }
  if (!data.nome || !data.email || !data.documento || !data.login || (passwordRequired && data.senha.length < 8)) throw new HttpError(400, 'Nome, e-mail, documento, login e senha de ao menos 8 caracteres são obrigatórios.')
  if (data.senha && data.senha.length < 8) throw new HttpError(400, 'A senha deve ter ao menos 8 caracteres.')
  if (!ROLES.includes(data.role) || !STATUSES.includes(data.status)) throw new HttpError(400, 'Perfil ou status inválido.')
  return data
}
function ensureRole(current, target) {
  if (!canManageRole(current, target)) throw new HttpError(403, 'Você não pode atribuir este perfil.')
}
async function ensureUnique(trx, data, userId, personId) {
  const username = trx('users').where({ username: data.login }); if (userId) username.whereNot({ id: userId })
  const person = trx('people').where((q) => q.where({ email: data.email }).orWhere({ cpf: data.documento })); if (personId) person.whereNot({ id: personId })
  if (await username.first() || await person.first()) throw new HttpError(409, 'Login, e-mail ou documento já cadastrado.')
}
function handle(error, res, action) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message })
  console.error(`[Usuários] Falha ao ${action}:`, error)
  return res.status(500).json({ error: `Erro ao ${action} usuário.` })
}

module.exports = router
