const express = require('express');
const bcrypt = require('bcryptjs');
const knexFactory = require('knex');
const knexConfig = require('../knexfile');
const authMiddleware = require('../middleware/auth');
const {
  permissionMiddleware,
  canManageRole,
  normalizeRoleValue,
} = require('../middleware/permission');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development;
const knex = knexFactory(config);

const router = express.Router();

const UNITS_TABLE = 'units';
const USER_UNITS_TABLE = 'user_units';

const VALID_ROLES = [
  'masteradmin',
  'admin',
  'cac_coord',
  'cac',
  'secretaria',
  'user',
  'doctor',
  'nurse',
  'pharmacist',
  'patient',
];

const VALID_STATUS = ['active', 'inactive', 'blocked'];

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const sanitizeString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const getUserByIdQuery = (builder, id) =>
  builder('users as u')
    .select(
      'u.id',
      'u.username',
      'u.status',
      'u.role',
      'u.person_id as personId',
      'u.created_at',
      'u.updated_at',
      'p.full_name',
      'p.email',
      'p.phone',
      'p.cpf'
    )
    .leftJoin('people as p', 'u.person_id', 'p.id')
    .where('u.id', id)
    .first();

const normalizeUnitIds = (value) => {
  if (!Array.isArray(value)) return [];

  const normalized = [];
  const seen = new Set();

  value.forEach((item) => {
    const parsed = Number(item);

    if (Number.isNaN(parsed) || parsed <= 0) {
      return;
    }

    if (seen.has(parsed)) {
      return;
    }

    seen.add(parsed);
    normalized.push(parsed);
  });

  return normalized;
};

const extractUnitIds = (body) => {
  if (!body || typeof body !== 'object') {
    return [];
  }

  if (Array.isArray(body.unidadeIds)) {
    return normalizeUnitIds(body.unidadeIds);
  }

  if (Array.isArray(body.unitIds)) {
    return normalizeUnitIds(body.unitIds);
  }

  return [];
};

const fetchUnitsForUsers = async (builder, userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return new Map();
  }

  const rows = await builder(USER_UNITS_TABLE + ' as uu')
    .leftJoin(UNITS_TABLE + ' as un', 'un.id', 'uu.unit_id')
    .select('uu.user_id as userId', 'un.id', 'un.name')
    .whereIn('uu.user_id', userIds)
    .orderBy('un.name', 'asc');

  const grouped = new Map();

  rows.forEach((row) => {
    if (!grouped.has(row.userId)) {
      grouped.set(row.userId, []);
    }

    if (row.id) {
      grouped.get(row.userId).push({ id: row.id, nome: row.name });
    }
  });

  return grouped;
};

const ensureUnitsExist = async (trx, unitIds) => {
  if (!Array.isArray(unitIds) || unitIds.length === 0) {
    return;
  }

  const rows = await trx(UNITS_TABLE).select('id').whereIn('id', unitIds);
  if (rows.length !== unitIds.length) {
    throw new HttpError(400, 'Algumas unidades selecionadas não foram encontradas.');
  }
};

const syncUserUnits = async (trx, userId, unitIds) => {
  await trx(USER_UNITS_TABLE).where('user_id', userId).delete();

  if (!Array.isArray(unitIds) || unitIds.length === 0) {
    return;
  }

  const payload = unitIds.map((unitId) => ({ user_id: userId, unit_id: unitId }));

  await trx(USER_UNITS_TABLE).insert(payload);
};

const mapUserResponse = (row, unidades = []) => ({
  id: row.id,
  personId: row.personId,
  nome: row.full_name,
  email: row.email,
  telefone: row.phone,
  documento: row.cpf,
  login: row.username,
  role: normalizeRoleValue(row.role) || row.role,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  unidades,
  unidadeIds: unidades.map((unidade) => unidade.id),
});

const applyFilters = (query, { search, role, status }) => {
  const normalizedSearch = sanitizeString(search);
  const normalizedRole = normalizeRoleValue(role);
  const normalizedStatus = sanitizeString(status);

  if (normalizedSearch) {
    const likeValue = `%${normalizedSearch.toLowerCase()}%`;
    query.where((builder) => {
      builder
        .whereRaw('LOWER(p.full_name) LIKE ?', [likeValue])
        .orWhereRaw('LOWER(p.email) LIKE ?', [likeValue])
        .orWhereRaw('LOWER(u.username) LIKE ?', [likeValue]);
    });
  }

  if (normalizedRole && VALID_ROLES.includes(normalizedRole)) {
    query.andWhere('u.role', normalizedRole);
  }

  if (normalizedStatus && VALID_STATUS.includes(normalizedStatus)) {
    query.andWhere('u.status', normalizedStatus);
  }

  return query;
};

const validateRoleChange = (currentRole, targetRole) => {
  const normalizedCurrentRole = normalizeRoleValue(currentRole);
  const normalizedTargetRole = normalizeRoleValue(targetRole);

  if (normalizedTargetRole && VALID_ROLES.includes(normalizedTargetRole) === false) {
    throw new HttpError(400, 'Perfil inválido informado.');
  }

  if (
    normalizedTargetRole &&
    canManageRole(normalizedCurrentRole, normalizedTargetRole) === false
  ) {
    throw new HttpError(403, 'Você não possui permissão para atribuir este perfil.');
  }
};

const validateStatus = (status) => {
  if (status && VALID_STATUS.includes(status) === false) {
    throw new HttpError(400, 'Status informado é inválido.');
  }
};

const ensurePersonUniqueness = async (trx, { personId, documento, email }) => {
  const normalizedDocumento = sanitizeString(documento);
  const normalizedEmail = sanitizeString(email);

  if (!normalizedDocumento || !normalizedEmail) {
    throw new HttpError(400, 'Documento e e-mail são obrigatórios.');
  }

  const duplicateDocumentoQuery = trx('people')
    .where('cpf', normalizedDocumento);

  const duplicateEmailQuery = trx('people')
    .where('email', normalizedEmail);

  if (personId) {
    duplicateDocumentoQuery.andWhereNot('id', personId);
    duplicateEmailQuery.andWhereNot('id', personId);
  }

  const [duplicateDocumento, duplicateEmail] = await Promise.all([
    duplicateDocumentoQuery.first(),
    duplicateEmailQuery.first(),
  ]);

  if (duplicateDocumento) {
    throw new HttpError(400, 'Documento já cadastrado para outra pessoa.');
  }

  if (duplicateEmail) {
    throw new HttpError(400, 'E-mail já cadastrado para outra pessoa.');
  }

  return {
    documento: normalizedDocumento,
    email: normalizedEmail,
  };
};

const ensureUsernameUniqueness = async (trx, { username, ignoreId }) => {
  const normalizedUsername = sanitizeString(username);

  if (!normalizedUsername) {
    throw new HttpError(400, 'Login é obrigatório.');
  }

  const query = trx('users').where('username', normalizedUsername);

  if (ignoreId) {
    query.andWhereNot('id', ignoreId);
  }

  const existingUser = await query.first();

  if (existingUser) {
    throw new HttpError(400, 'Login já cadastrado.');
  }

  return normalizedUsername;
};

/**
 * @swagger
 * tags:
 *   - name: Usuários
 *     description: Gerenciamento de usuários do sistema com controle de perfis.
 */

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Lista usuários do sistema
 *     description: Retorna a lista de usuários cadastrados com os dados básicos da pessoa vinculada.
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filtro por nome, e-mail ou login.
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [masteradmin, admin, cac_coord, cac, secretaria, user, doctor, nurse, pharmacist, patient]
 *         description: Filtra usuários por perfil.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, blocked]
 *         description: Filtra usuários pelo status atual.
 *     responses:
 *       200:
 *         description: Lista de usuários cadastrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Usuário sem permissão para acessar o recurso.
 *       500:
 *         description: Erro interno ao listar usuários.
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Dados inválidos ou já cadastrados.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Usuário autenticado sem permissão para criar o perfil informado.
 *       500:
 *         description: Erro inesperado ao cadastrar usuário.
 */

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário existente
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioUpdate'
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Dados inválidos para atualização.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Usuário sem permissão para atualizar o registro.
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro inesperado ao atualizar usuário.
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Usuário removido com sucesso.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Usuário sem permissão para excluir o registro.
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro ao remover usuário.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         personId:
 *           type: integer
 *           nullable: true
 *         nome:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         telefone:
 *           type: string
 *           nullable: true
 *         documento:
 *           type: string
 *         login:
 *           type: string
 *         role:
 *           type: string
 *           enum: [masteradmin, admin, cac_coord, cac, secretaria, user, doctor, nurse, pharmacist, patient]
 *         status:
 *           type: string
 *           enum: [active, inactive, blocked]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     UsuarioInput:
 *       type: object
 *       required:
 *         - nome
 *         - email
 *         - documento
 *         - login
 *         - senha
 *       properties:
 *         personId:
 *           type: integer
 *           nullable: true
 *         nome:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         telefone:
 *           type: string
 *           nullable: true
 *         documento:
 *           type: string
 *         login:
 *           type: string
 *         senha:
 *           type: string
 *           format: password
 *         role:
 *           type: string
 *           enum: [masteradmin, admin, cac_coord, cac, secretaria, user, doctor, nurse, pharmacist, patient]
 *         status:
 *           type: string
 *           enum: [active, inactive, blocked]
 *     UsuarioUpdate:
 *       type: object
 *       properties:
 *         nome:
 *           type: string
 *         email:
 *           type: string
 *         telefone:
 *           type: string
 *         documento:
 *           type: string
 *         login:
 *           type: string
 *         senha:
 *           type: string
 *           format: password
 *         role:
 *           type: string
 *           enum: [masteradmin, admin, cac_coord, cac, secretaria, user, doctor, nurse, pharmacist, patient]
 *         status:
 *           type: string
 *           enum: [active, inactive, blocked]
 */

router.use(authMiddleware);
router.use(permissionMiddleware(['masteradmin', 'admin']));

router.get('/', async (req, res) => {
  try {
    const query = knex('users as u')
      .select(
        'u.id',
        'u.username',
        'u.status',
        'u.role',
        'u.person_id as personId',
        'u.created_at',
        'u.updated_at',
        'p.full_name',
        'p.email',
        'p.phone',
        'p.cpf'
      )
      .leftJoin('people as p', 'u.person_id', 'p.id')
      .orderBy('p.full_name', 'asc');

    applyFilters(query, req.query);

    const users = await query;
    const unidadesMap = await fetchUnitsForUsers(knex, users.map((user) => user.id));

    res.json(
      users.map((user) => mapUserResponse(user, unidadesMap.get(user.id) || []))
    );
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body || {};

  const nome = sanitizeString(body.nome);
  const telefone = sanitizeString(body.telefone);
  const senha = sanitizeString(body.senha);
  const role = normalizeRoleValue(body.role) || 'user';
  const status = sanitizeString(body.status) || 'active';
  const personId = body.personId ? Number(body.personId) : null;

  try {
    if (!nome) {
      throw new HttpError(400, 'Nome é obrigatório.');
    }

    if (!senha) {
      throw new HttpError(400, 'Senha é obrigatória.');
    }

    const requesterRole = normalizeRoleValue(req.user.role);

    validateRoleChange(requesterRole, role);
    validateStatus(status);

    const unidadeIds = extractUnitIds(body);

    const createdUser = await knex.transaction(async (trx) => {
      const { documento, email } = await ensurePersonUniqueness(trx, {
        personId,
        documento: body.documento,
        email: body.email,
      });

      await ensureUnitsExist(trx, unidadeIds);

      let personIdToUse = personId;

      if (personIdToUse) {
        const existingPerson = await trx('people').where('id', personIdToUse).first();
        if (!existingPerson) {
          throw new HttpError(400, 'Pessoa informada não foi encontrada.');
        }

        await trx('people')
          .where('id', personIdToUse)
          .update({
            full_name: nome,
            email,
            phone: telefone,
            cpf: documento,
            updated_at: trx.fn.now(),
          });
      } else {
        const [newPersonId] = await trx('people').insert({
          full_name: nome,
          email,
          phone: telefone,
          cpf: documento,
        });

        personIdToUse = newPersonId;
      }

      const username = await ensureUsernameUniqueness(trx, {
        username: body.login,
      });

      const passwordHash = await bcrypt.hash(senha, 10);

      const [userId] = await trx('users').insert({
        username,
        password: passwordHash,
        person_id: personIdToUse,
        role,
        status,
      });

      await syncUserUnits(trx, userId, unidadeIds);

      const created = await getUserByIdQuery(trx, userId);
      const unidadesMap = await fetchUnitsForUsers(trx, [userId]);
      return mapUserResponse(created, unidadesMap.get(userId) || []);
    });

    res.status(201).json(createdUser);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Identificador inválido.' });
  }

  try {
    const existingUser = await getUserByIdQuery(knex, userId);

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const requesterRole = normalizeRoleValue(req.user.role);
    const existingUserRole = normalizeRoleValue(existingUser.role);

    if (canManageRole(requesterRole, existingUserRole) === false) {
      return res.status(403).json({ error: 'Você não possui permissão para atualizar este usuário.' });
    }

    const role = normalizeRoleValue(req.body.role) || existingUserRole;
    const status = sanitizeString(req.body.status) || existingUser.status;
    const nome = sanitizeString(req.body.nome) || existingUser.full_name;
    const telefone = sanitizeString(req.body.telefone);
    const telefoneAtualizado =
      Object.prototype.hasOwnProperty.call(req.body, 'telefone') ? telefone : existingUser.phone;
    const senha = sanitizeString(req.body.senha);
    const unidadesInformadas =
      Object.prototype.hasOwnProperty.call(req.body, 'unidadeIds') ||
      Object.prototype.hasOwnProperty.call(req.body, 'unitIds');
    const unidadeIds = unidadesInformadas ? extractUnitIds(req.body) : null;

    validateRoleChange(requesterRole, role);
    validateStatus(status);

    const updatedUser = await knex.transaction(async (trx) => {
      const { documento, email } = await ensurePersonUniqueness(trx, {
        personId: existingUser.personId,
        documento: req.body.documento || existingUser.cpf,
        email: req.body.email || existingUser.email,
      });

      if (existingUser.personId) {
        await trx('people')
          .where('id', existingUser.personId)
          .update({
            full_name: nome,
            email,
            phone: telefoneAtualizado,
            cpf: documento,
            updated_at: trx.fn.now(),
          });
      }

      const username = await ensureUsernameUniqueness(trx, {
        username: req.body.login || existingUser.username,
        ignoreId: userId,
      });

      const updatePayload = {
        username,
        role,
        status,
        updated_at: trx.fn.now(),
      };

      if (senha) {
        updatePayload.password = await bcrypt.hash(senha, 10);
      }

      await trx('users').where('id', userId).update(updatePayload);

      if (unidadesInformadas) {
        await ensureUnitsExist(trx, unidadeIds);
        await syncUserUnits(trx, userId, unidadeIds);
      }

      const updated = await getUserByIdQuery(trx, userId);
      const unidadesMap = await fetchUnitsForUsers(trx, [userId]);
      return mapUserResponse(updated, unidadesMap.get(userId) || []);
    });

    res.json(updatedUser);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Identificador inválido.' });
  }

  try {
    const existingUser = await knex('users').where('id', userId).first();

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const requesterRole = normalizeRoleValue(req.user.role);
    const existingUserRole = normalizeRoleValue(existingUser.role);

    if (canManageRole(requesterRole, existingUserRole) === false) {
      return res.status(403).json({ error: 'Você não possui permissão para excluir este usuário.' });
    }

    await knex('users').where('id', userId).delete();

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

module.exports = router;
