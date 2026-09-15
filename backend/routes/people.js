const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const authMiddleware = require('../middleware/auth'); // Middleware para autenticação
const router = express.Router();

const AVATAR_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname) || '.png';
    cb(null, `${timestamp}-${randomSuffix}${extension}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos.'));
    }
  },
});

const resolveAvatarPath = (filename = '') =>
  path.posix.join('uploads', 'avatars', filename).replace(/\\/g, '/');

const deleteAvatarFile = (avatarPath) => {
  if (!avatarPath) return;
  const normalized = avatarPath.startsWith('uploads')
    ? avatarPath
    : avatarPath.replace(/^\/+/, '');
  const filePath = path.join(__dirname, '..', normalized);
  fs.promises
    .unlink(filePath)
    .catch(() => {
      // Ignora erros ao remover o arquivo para evitar falhas na requisição
    });
};

/**
 * @swagger
 * tags:
 *   - name: People
 *     description: Gerenciamento de pessoas físicas (tabela `people`)
 */

/**
 * @swagger
 * /api/people:
 *   get:
 *     summary: Lista todas as pessoas físicas cadastradas
 *     tags: [People]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pessoas físicas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/People'
 *       500:
 *         description: Erro ao listar pessoas.
 *   post:
 *     summary: Cadastra uma nova pessoa física
 *     tags: [People]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PeopleInput'
 *     responses:
 *       200:
 *         description: Pessoa cadastrada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: integer
 *       400:
 *         description: CPF ou email já cadastrados.
 *       500:
 *         description: Erro inesperado ao cadastrar pessoa.
 */

/**
 * @swagger
 * /api/people/{id}:
 *   get:
 *     summary: Retorna uma pessoa física por ID
 *     tags: [People]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Dados da pessoa física.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/People'
 *       404:
 *         description: Pessoa não encontrada.
 *       500:
 *         description: Erro ao buscar pessoa.
 *   put:
 *     summary: Atualiza dados de uma pessoa física
 *     tags: [People]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PeopleInput'
 *     responses:
 *       200:
 *         description: Pessoa atualizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: CPF ou email já utilizados em outro registro.
 *       500:
 *         description: Erro ao atualizar pessoa.
 *   delete:
 *     summary: Remove uma pessoa física
 *     tags: [People]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Pessoa removida com sucesso.
 *       500:
 *         description: Erro ao remover pessoa.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     People:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         cpf:
 *           type: string
 *         full_name:
 *           type: string
 *         email:
 *           type: string
 *         birth_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         phone:
 *           type: string
 *           nullable: true
 *         blood_type:
 *           type: string
 *           nullable: true
 *         zip_code:
 *           type: string
 *           nullable: true
 *         street:
 *           type: string
 *           nullable: true
 *         number:
 *           type: string
 *           nullable: true
 *         neighborhood:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         state:
 *           type: string
 *           nullable: true
 *         gender:
 *           type: string
 *           nullable: true
 *         marital_status:
 *           type: string
 *           nullable: true
 *         nationality:
 *           type: string
 *           nullable: true
 *         birthplace:
 *           type: string
 *           nullable: true
 *     PeopleInput:
 *       type: object
 *       required:
 *         - cpf
 *         - full_name
 *         - email
 *       properties:
 *         cpf:
 *           type: string
 *         full_name:
 *           type: string
 *         email:
 *           type: string
 *         birth_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         phone:
 *           type: string
 *           nullable: true
 *         blood_type:
 *           type: string
 *           nullable: true
 *         zip_code:
 *           type: string
 *           nullable: true
 *         street:
 *           type: string
 *           nullable: true
 *         number:
 *           type: string
 *           nullable: true
 *         neighborhood:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         state:
 *           type: string
 *           nullable: true
 *         gender:
 *           type: string
 *           nullable: true
 *         marital_status:
 *           type: string
 *           nullable: true
 *         nationality:
 *           type: string
 *           nullable: true
 *         birthplace:
 *           type: string
 *           nullable: true
 */



router.use(authMiddleware); // Middleware para autenticação

// Create (Inserir pessoa)
router.post('/', async (req, res) => {
  const {
    cpf, full_name, email, birth_date, phone,
    blood_type, zip_code, street, number,
    neighborhood, city, state, gender, marital_status,
    nationality, birthplace, avatar_url
  } = req.body;
  try {
    const [existCpf] = await pool.query('SELECT id FROM people WHERE cpf = ?', [cpf]);
    if (existCpf.length) return res.status(400).json({ error: 'CPF already exists' });

    const [existEmail] = await pool.query('SELECT id FROM people WHERE email = ?', [email]);
    if (existEmail.length) return res.status(400).json({ error: 'Email already exists' });

    const [result] = await pool.query(
      `INSERT INTO people (
        cpf, full_name, email, birth_date, phone,
        blood_type, zip_code, street, number,
        neighborhood, city, state, gender, marital_status,
        nationality, birthplace, avatar_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cpf, full_name, email, birth_date || null, phone || null,
        blood_type || null, zip_code || null, street || null, number || null,
        neighborhood || null, city || null, state || null, gender || null, marital_status || null,
        nationality || null, birthplace || null, avatar_url || null
      ]
    );
    res.json({ message: 'Person created!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update (Editar pessoa)
router.put('/:id', async (req, res) => {
  const {
    cpf, full_name, email, birth_date, phone,
    blood_type, zip_code, street, number,
    neighborhood, city, state, gender, marital_status,
    nationality, birthplace, avatar_url
  } = req.body;
  const { id } = req.params;
  try {
    // Checa duplicidade de email e cpf em outros registros
    const [cpfExist] = await pool.query('SELECT id FROM people WHERE cpf = ? AND id != ?', [cpf, id]);
    if (cpfExist.length) return res.status(400).json({ error: 'CPF already in use by another person' });

    const [emailExist] = await pool.query('SELECT id FROM people WHERE email = ? AND id != ?', [email, id]);
    if (emailExist.length) return res.status(400).json({ error: 'Email already in use by another person' });

    await pool.query(
      `UPDATE people SET
        cpf=?, full_name=?, email=?, birth_date=?, phone=?,
        blood_type=?, zip_code=?, street=?, number=?,
        neighborhood=?, city=?, state=?, gender=?, marital_status=?,
        nationality=?, birthplace=?, avatar_url=?
      WHERE id=?`,
      [
        cpf, full_name, email, birth_date || null, phone || null,
        blood_type || null, zip_code || null, street || null, number || null,
        neighborhood || null, city || null, state || null, gender || null, marital_status || null,
        nationality || null, birthplace || null, avatar_url || null,
        id
      ]
    );
    res.json({ message: 'Person updated!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Read (Listar todas as pessoas)
router.get('/', async (req, res) => {
  try {
    const [people] = await pool.query('SELECT * FROM people');
    res.json(people);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Read (Obter dados de uma pessoa por ID)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [people] = await pool.query('SELECT * FROM people WHERE id = ?', [id]);
    if (!people.length) return res.status(404).json({ error: 'Person not found' });
    res.json(people[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete (Excluir pessoa)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM people WHERE id = ?', [id]);
    res.json({ message: 'Person deleted!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/:id/avatar', avatarUpload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo de avatar não enviado.' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const [people] = await connection.query('SELECT avatar_url FROM people WHERE id = ?', [id]);
    if (!people.length) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Person not found' });
    }

    const relativePath = resolveAvatarPath(req.file.filename);
    await connection.query('UPDATE people SET avatar_url = ? WHERE id = ?', [relativePath, id]);

    const previousAvatar = people[0].avatar_url;
    if (previousAvatar && previousAvatar !== relativePath) {
      deleteAvatarFile(previousAvatar);
    }

    res.json({ message: 'Avatar updated!', avatarUrl: relativePath });
  } catch (err) {
    await fs.promises.unlink(req.file?.path || '').catch(() => {});
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.delete('/:id/avatar', async (req, res) => {
  const { id } = req.params;
  try {
    const [people] = await pool.query('SELECT avatar_url FROM people WHERE id = ?', [id]);
    if (!people.length) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const currentAvatar = people[0].avatar_url;
    if (!currentAvatar) {
      return res.json({ message: 'Avatar already removed.' });
    }

    await pool.query('UPDATE people SET avatar_url = NULL WHERE id = ?', [id]);
    deleteAvatarFile(currentAvatar);

    res.json({ message: 'Avatar removed!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
