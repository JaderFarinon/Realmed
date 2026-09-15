const express = require('express');
const knexFactory = require('knex');
const knexConfig = require('../knexfile');
const authMiddleware = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permission');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development;
const knex = knexFactory(config);

const router = express.Router();

const TABLE_NAME = 'units';

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const sanitizeName = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const ensureUniqueName = async (trx, name, ignoreId) => {
  const query = trx(TABLE_NAME).where('name', name);

  if (ignoreId) {
    query.andWhereNot('id', ignoreId);
  }

  const existing = await query.first();

  if (existing) {
    throw new HttpError(400, 'Já existe uma unidade cadastrada com este nome.');
  }
};

router.use(authMiddleware);
router.use(permissionMiddleware(['masteradmin', 'admin']));

router.get('/', async (_req, res) => {
  try {
    const unidades = await knex(TABLE_NAME)
      .select('id', 'name as nome', 'created_at as createdAt', 'updated_at as updatedAt')
      .orderBy('name', 'asc');

    res.json(unidades);
  } catch (error) {
    console.error('Erro ao listar unidades:', error);
    res.status(500).json({ error: 'Erro ao listar unidades.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const nome = sanitizeName(req.body.nome);

    if (!nome) {
      throw new HttpError(400, 'Nome da unidade é obrigatório.');
    }

    const unidade = await knex.transaction(async (trx) => {
      await ensureUniqueName(trx, nome);

      const [id] = await trx(TABLE_NAME).insert({ name: nome });

      const criada = await trx(TABLE_NAME)
        .select('id', 'name as nome', 'created_at as createdAt', 'updated_at as updatedAt')
        .where('id', id)
        .first();

      return criada;
    });

    res.status(201).json(unidade);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Erro ao criar unidade:', error);
    return res.status(500).json({ error: 'Erro ao criar unidade.' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const unidadeId = Number(id);

  if (Number.isNaN(unidadeId)) {
    return res.status(400).json({ error: 'Identificador inválido.' });
  }

  try {
    const nome = sanitizeName(req.body.nome);

    if (!nome) {
      throw new HttpError(400, 'Nome da unidade é obrigatório.');
    }

    const unidadeAtualizada = await knex.transaction(async (trx) => {
      const existente = await trx(TABLE_NAME).where('id', unidadeId).first();

      if (!existente) {
        throw new HttpError(404, 'Unidade não encontrada.');
      }

      await ensureUniqueName(trx, nome, unidadeId);

      await trx(TABLE_NAME)
        .where('id', unidadeId)
        .update({
          name: nome,
          updated_at: trx.fn.now(),
        });

      return trx(TABLE_NAME)
        .select('id', 'name as nome', 'created_at as createdAt', 'updated_at as updatedAt')
        .where('id', unidadeId)
        .first();
    });

    res.json(unidadeAtualizada);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Erro ao atualizar unidade:', error);
    return res.status(500).json({ error: 'Erro ao atualizar unidade.' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const unidadeId = Number(id);

  if (Number.isNaN(unidadeId)) {
    return res.status(400).json({ error: 'Identificador inválido.' });
  }

  try {
    const unidade = await knex(TABLE_NAME).where('id', unidadeId).first();

    if (!unidade) {
      return res.status(404).json({ error: 'Unidade não encontrada.' });
    }

    const vinculados = await knex('user_units').where('unit_id', unidadeId).first();

    if (vinculados) {
      return res.status(400).json({ error: 'Não é possível excluir a unidade pois existem usuários vinculados.' });
    }

    await knex(TABLE_NAME).where('id', unidadeId).delete();

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover unidade:', error);
    res.status(500).json({ error: 'Erro ao remover unidade.' });
  }
});

module.exports = router;
