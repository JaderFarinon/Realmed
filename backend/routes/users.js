const express = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const ADMIN_ROLES = new Set(['admin', 'masteradmin']);

const mapUserRow = (row) => ({
  id: row.id,
  username: row.username,
  status: row.status,
  role: row.role,
  person_id: row.person_id,
  created_at: row.user_created_at,
  updated_at: row.user_updated_at,
  last_login: row.last_login,
  person: {
    id: row.person_id,
    cpf: row.cpf,
    full_name: row.full_name,
    email: row.email,
    birth_date: row.birth_date,
    phone: row.phone,
    blood_type: row.blood_type,
    zip_code: row.zip_code,
    street: row.street,
    number: row.number,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    gender: row.gender,
    marital_status: row.marital_status,
    nationality: row.nationality,
    birthplace: row.birthplace,
    avatar_url: row.avatar_url,
  },
});

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Gerenciamento de usuários do sistema
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários com dados da pessoa vinculada.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Erro ao listar usuários.
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
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
 *                 id:
 *                   type: integer
 *       400:
 *         description: Username já cadastrado ou pessoa inexistente.
 *       500:
 *         description: Erro ao criar usuário.
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Retorna um usuário por ID
 *     tags: [Users]
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
 *         description: Dados do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro ao buscar usuário.
 *   put:
 *     summary: Atualiza dados de um usuário
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso.
 *       400:
 *         description: Username já utilizado ou pessoa inexistente.
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro ao atualizar usuário.
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Users]
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
 *         description: Usuário removido com sucesso.
 *       500:
 *         description: Erro ao remover usuário.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         person_id:
 *           type: integer
 *         status:
 *           type: string
 *         role:
 *           type: string
 *         full_name:
 *           type: string
 *         email:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         updated_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         last_login:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     UserInput:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - person_id
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         person_id:
 *           type: integer
 *         status:
 *           type: string
 *           default: active
 *         role:
 *           type: string
 *           default: patient
 *     UserUpdate:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         person_id:
 *           type: integer
 *         status:
 *           type: string
 *         role:
 *           type: string
 */


// All routes require authentication
router.use(authMiddleware);

const canManageUser = (requestUser, targetUserId) => {
  if (!requestUser) return false;
  if (requestUser.id === Number(targetUserId)) return true;
  return requestUser.role && ADMIN_ROLES.has(String(requestUser.role).toLowerCase());
};

// Create user
router.post('/', async (req, res) => {
  const { username, password, person_id, status = 'active', role = 'patient' } = req.body;
  try {
    // Check for duplicate username
    const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length) return res.status(400).json({ error: 'Username already exists' }); 

    // Check if referenced person exists
    const [person] = await pool.query('SELECT id FROM people WHERE id = ?', [person_id]);
    if (!person.length) return res.status(400).json({ error: 'Referenced person not found' });

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (username, password, person_id, status, role) VALUES (?, ?, ?, ?, ?)',
      [username, hash, person_id, status, role]
    );
    res.json({ message: 'User created!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update user
router.put('/:id/password', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve conter ao menos 6 caracteres.' });
  }

  if (!canManageUser(req.user, id)) {
    return res.status(403).json({ error: 'Você não possui permissão para alterar esta senha.' });
  }

  try {
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [id]);
    if (!users.length) return res.status(404).json({ error: 'User not found' });

    const isAdminChangingOtherUser = req.user.id !== Number(id) && req.user.role && ADMIN_ROLES.has(String(req.user.role).toLowerCase());

    if (!isAdminChangingOtherUser) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Senha atual obrigatória.' });
      }

      const matches = await bcrypt.compare(currentPassword, users[0].password);
      if (!matches) {
        return res.status(400).json({ error: 'Senha atual inválida.' });
      }
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hash, id]);
    res.json({ message: 'Password updated!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { username, password, person_id, status, role } = req.body;
  const { id } = req.params;

  if (!canManageUser(req.user, id)) {
    return res.status(403).json({ error: 'Você não possui permissão para atualizar este usuário.' });
  }
  try {
    // Check if user exists
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check for duplicate username (other users)
    if (username) {
      const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
      if (existingUser.length) return res.status(400).json({ error: 'Username already used by another user' });
    }

    // Check if referenced person exists (if changed)
    if (person_id) {
      const [person] = await pool.query('SELECT id FROM people WHERE id = ?', [person_id]);
      if (!person.length) return res.status(400).json({ error: 'Referenced person not found' });
    }

    // Update fields (conditionally)
    let updateQuery = 'UPDATE users SET ';
    const updateFields = [];
    const values = [];

    if (username) { updateFields.push('username = ?'); values.push(username); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      values.push(hash);
    }
    if (person_id) { updateFields.push('person_id = ?'); values.push(person_id); }
    if (status) { updateFields.push('status = ?'); values.push(status); }
    if (role) { updateFields.push('role = ?'); values.push(role); }
    if (!updateFields.length) {
      return res.status(400).json({ error: 'Nenhum campo informado para atualização.' });
    }

    updateFields.push('updated_at = NOW()');
    updateQuery += updateFields.join(', ') + ' WHERE id = ?';
    values.push(id);

    await pool.query(updateQuery, values);
    res.json({ message: 'User updated!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// List all users
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.status,
        u.role,
        u.person_id,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at,
        u.last_login,
        p.cpf,
        p.full_name,
        p.email,
        p.birth_date,
        p.phone,
        p.blood_type,
        p.zip_code,
        p.street,
        p.number,
        p.neighborhood,
        p.city,
        p.state,
        p.gender,
        p.marital_status,
        p.nationality,
        p.birthplace,
        p.avatar_url
      FROM users u
      JOIN people p ON u.person_id = p.id`
    );
    res.json(users.map(mapUserRow));
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get user by id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!canManageUser(req.user, id)) {
      return res.status(403).json({ error: 'Você não possui permissão para visualizar este usuário.' });
    }

    const [users] = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.status,
        u.role,
        u.person_id,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at,
        u.last_login,
        p.cpf,
        p.full_name,
        p.email,
        p.birth_date,
        p.phone,
        p.blood_type,
        p.zip_code,
        p.street,
        p.number,
        p.neighborhood,
        p.city,
        p.state,
        p.gender,
        p.marital_status,
        p.nationality,
        p.birthplace,
        p.avatar_url
      FROM users u
      JOIN people p ON u.person_id = p.id
      WHERE u.id = ?`,
      [id]
    );
    if (!users.length) return res.status(404).json({ error: 'User not found' });
    res.json(mapUserRow(users[0]));
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!canManageUser(req.user, id)) {
    return res.status(403).json({ error: 'Você não possui permissão para remover este usuário.' });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
