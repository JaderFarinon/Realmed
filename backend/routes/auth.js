const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { normalizeRoleValue } = require('../middleware/permission');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Fluxos de autenticação da aplicação
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Cria um novo usuário local
 *     description: Registra um usuário que poderá acessar a API utilizando autenticação JWT.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Identificador único do usuário.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha em texto simples que será armazenada com hash.
 *     responses:
 *       200:
 *         description: Usuário criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuário criado!
 *       400:
 *         description: Já existe um usuário com o mesmo username.
 *       500:
 *         description: Erro inesperado ao gravar o usuário.
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autentica o usuário e retorna o token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário cadastrado.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha correspondente.
 *     responses:
 *       200:
 *         description: Credenciais válidas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT com as permissões do usuário.
 *       400:
 *         description: Credenciais não informadas ou incompletas.
 *       401:
 *         description: Usuário ou senha inválidos.
 *       500:
 *         description: Erro inesperado ao validar as credenciais.
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retorna o usuário autenticado pelo token informado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados básicos do usuário autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: Informações serializadas pelo middleware de autenticação.
 *       401:
 *         description: Token ausente ou inválido.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'minhasecretkey';
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '2h';

// Cadastro
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length) return res.status(400).json({ error: 'Usuário já existe' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
    res.json({ message: 'Usuário criado!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Credenciais são obrigatórias para autenticação
  if (!username || !password) {
    return res.status(400).json({ error: 'username e password são obrigatórios' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!users.length) return res.status(401).json({ error: 'Usuário/senha inválidos' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Usuário/senha inválidos' });

    let fullName = null;
    let email = null;

    let avatarUrl = null;

    if (user.person_id) {
      const [people] = await pool.query('SELECT full_name, email, avatar_url FROM people WHERE id = ?', [user.person_id]);
      if (people.length) {
        fullName = people[0].full_name;
        email = people[0].email;
        avatarUrl = people[0].avatar_url;
      }
    }

    const normalizedRole = normalizeRoleValue(user.role) || user.role;

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: normalizedRole,
      status: user.status,
      personId: user.person_id,
      name: fullName,
      email,
      avatarUrl,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
    res.json({ token, user: tokenPayload });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao efetuar login: ' + err.message });
  }
});

// Middleware de autenticação para as rotas abaixo
router.use(authMiddleware);

// Validação de token
router.get('/me', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.role,
        u.status,
        u.person_id,
        p.full_name,
        p.email,
        p.avatar_url
      FROM users u
      LEFT JOIN people p ON u.person_id = p.id
      WHERE u.id = ?`,
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = users[0];
    const normalizedRole = normalizeRoleValue(user.role) || user.role;

    let permissions = [];

    try {
      const [permissionRows] = await pool.query(
        `SELECT module_key, can_view, can_create, can_edit, can_delete
           FROM user_permissions
          WHERE user_id = ?`,
        [user.id],
      );

      if (Array.isArray(permissionRows)) {
        permissions = permissionRows.map((row) => ({
          moduleKey: row.module_key,
          canView: Boolean(row.can_view),
          canCreate: Boolean(row.can_create),
          canEdit: Boolean(row.can_edit),
          canDelete: Boolean(row.can_delete),
        }));
      }
    } catch (permissionError) {
      console.warn('[Auth] Falha ao carregar permissões do usuário autenticado:', permissionError);
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: normalizedRole,
        status: user.status,
        personId: user.person_id,
        name: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        permissions,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar usuário autenticado.', details: err.message });
  }
});

module.exports = router;
