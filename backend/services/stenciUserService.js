const crypto = require('node:crypto')

const SYNC_MESSAGE = 'Não foi possível concluir seu acesso ao Realmed.'

class UserSyncError extends Error {
  constructor(code, status = 500, cause) {
    super(SYNC_MESSAGE, cause ? { cause } : undefined)
    this.name = 'UserSyncError'
    this.code = code
    this.status = status
    if (cause && !this.cause) this.cause = cause
  }
}

const developmentLog = (logger, message, details) => {
  if (process.env.NODE_ENV === 'development') logger.info(`[REALMED USER SYNC] ${message}`, details)
}

function databaseDiagnostic(error) {
  const message = typeof error?.sqlMessage === 'string' ? error.sqlMessage : ''
  return {
    code: error?.code,
    errno: error?.errno,
    constraint: error?.constraint || message.match(/for key ['`](.+?)['`]/i)?.[1],
    duplicateField: message.match(/Duplicate entry .* for key ['`](.+?)['`]/i)?.[1],
    sqlState: error?.sqlState,
  }
}

function lockNames(identity) {
  return [...new Set([identity.stenci_user_id, identity.email, identity.stenci_username, identity.identity]
    .filter((value) => value != null && String(value).trim())
    .map((value) => `realmed-user-sync:${crypto.createHash('sha256').update(String(value)).digest('hex')}`))]
    .sort()
}

async function selectUser(connection, sql, value) {
  const [rows] = await connection.query(sql, Array.isArray(value) ? value : [value])
  return rows[0] || null
}

async function selectPerson(connection, column, value) {
  if (!value) return null
  const [rows] = await connection.query(
    `SELECT p.*, u.id AS linked_user_id, u.stenci_user_id AS linked_stenci_user_id
       FROM people p LEFT JOIN users u ON u.person_id = p.id
      WHERE p.${column} = ? FOR UPDATE`,
    [value],
  )
  if (!rows.length) return null
  const personIds = new Set(rows.map((row) => row.id))
  const linkedUserIds = new Set(rows.map((row) => row.linked_user_id).filter(Boolean))
  if (personIds.size !== 1 || linkedUserIds.size > 1) throw new UserSyncError('USER_IDENTITY_CONFLICT', 409)
  return rows[0]
}

function assertCompatible(candidate, identity) {
  if (candidate?.stenci_user_id != null && String(candidate.stenci_user_id) !== identity.stenci_user_id) {
    throw new UserSyncError('USER_IDENTITY_CONFLICT', 409)
  }
}

async function reconcile(connection, identity, logger) {
  developmentLog(logger, 'buscando por stenci_user_id')
  const byStenci = await selectUser(connection,
    'SELECT u.* FROM users u WHERE u.stenci_user_id = ? LIMIT 1 FOR UPDATE', identity.stenci_user_id)
  developmentLog(logger, `encontrado: ${Boolean(byStenci)}`)
  developmentLog(logger, 'buscando usuário local compatível')

  const byEmail = identity.email ? await selectUser(connection,
    `SELECT u.* FROM users u JOIN people p ON p.id = u.person_id
      WHERE p.email = ? LIMIT 1 FOR UPDATE`, identity.email) : null
  const byUsername = identity.stenci_username ? await selectUser(connection,
    `SELECT u.* FROM users u WHERE (u.username = ? OR u.stenci_username = ?)
      LIMIT 1 FOR UPDATE`, [identity.stenci_username, identity.stenci_username]) : null
  const byIdentity = identity.identity ? await selectUser(connection,
    `SELECT u.* FROM users u JOIN people p ON p.id = u.person_id
      WHERE p.cpf = ? LIMIT 1 FOR UPDATE`, identity.identity) : null

  for (const candidate of [byEmail, byUsername, byIdentity]) {
    assertCompatible(candidate, identity)
    if (byStenci && candidate && candidate.id !== byStenci.id) {
      throw new UserSyncError('USER_IDENTITY_CONFLICT', 409)
    }
  }
  const compatibleIds = new Set([byEmail, byUsername, byIdentity].filter(Boolean).map((candidate) => candidate.id))
  if (compatibleIds.size > 1) throw new UserSyncError('USER_IDENTITY_CONFLICT', 409)

  const user = byStenci || byEmail || byUsername || byIdentity
  const reconciledBy = byStenci ? 'stenci_user_id' : byEmail ? 'email' : byUsername ? 'username' : byIdentity ? 'cpf' : null

  // Lock and reconcile people independently of users. This catches legacy, unlinked
  // people before either an INSERT or an UPDATE can hit cpf/email UNIQUE indexes.
  const personByCpf = await selectPerson(connection, 'cpf', identity.identity)
  const personByEmail = await selectPerson(connection, 'email', identity.email)
  if (personByCpf && personByEmail && personByCpf.id !== personByEmail.id) {
    throw new UserSyncError('USER_IDENTITY_CONFLICT', 409)
  }
  const matchingPerson = personByCpf || personByEmail
  if (matchingPerson?.linked_user_id && matchingPerson.linked_user_id !== user?.id) {
    throw new UserSyncError('USER_IDENTITY_CONFLICT', 409)
  }
  let personId = matchingPerson?.id || user?.person_id

  if (!personId) {
    const [result] = await connection.query(
      'INSERT INTO people (cpf, full_name, email, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [identity.identity || null, identity.name, identity.email],
    )
    personId = result.insertId
  } else {
    const updates = []
    const values = []
    if (identity.name != null) { updates.push('full_name = ?'); values.push(identity.name) }
    if (identity.email != null) { updates.push('email = ?'); values.push(identity.email) }
    if (identity.identity != null) { updates.push('cpf = ?'); values.push(identity.identity) }
    if (updates.length) {
      values.push(personId)
      await connection.query(`UPDATE people SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values)
    }
  }

  let userId = user?.id
  if (user) {
    const username = identity.stenci_username || user.username
    await connection.query(
      `UPDATE users SET stenci_user_id = ?, stenci_username = ?, username = ?, person_id = ?,
              status = 'active', last_login = NOW(), updated_at = NOW() WHERE id = ?`,
      [identity.stenci_user_id, identity.stenci_username, username, personId, user.id],
    )
  } else {
    const [result] = await connection.query(
      `INSERT INTO users
         (username, password, person_id, status, role, stenci_user_id, stenci_username, last_login, created_at, updated_at)
       VALUES (?, NULL, ?, 'active', 'user', ?, ?, NOW(), NOW(), NOW())`,
      [identity.stenci_username, personId, identity.stenci_user_id, identity.stenci_username],
    )
    userId = result.insertId
  }

  logger.info(`[REALMED USER SYNC] reconciliado por: ${reconciledBy || (matchingPerson ? 'person' : 'novo usuário')}`)
  developmentLog(logger, `criado novo usuário: ${!user}`)
  const [synced] = await connection.query(
    `SELECT u.id, u.username, u.role, u.status, u.person_id, u.stenci_user_id, u.stenci_username,
            p.full_name, p.email, p.avatar_url
       FROM users u LEFT JOIN people p ON p.id = u.person_id WHERE u.id = ? LIMIT 1`,
    [userId],
  )
  return synced[0]
}

async function syncStenciUser(pool, rawIdentity, { logger = console } = {}) {
  const identity = {
    ...rawIdentity,
    stenci_user_id: String(rawIdentity?.stenci_user_id || '').trim(),
    stenci_username: rawIdentity?.stenci_username == null ? null : String(rawIdentity.stenci_username).trim(),
    identity: rawIdentity?.identity == null ? null : String(rawIdentity.identity).trim(),
  }
  if (!identity.stenci_user_id) throw new UserSyncError('REALMED_USER_SYNC_FAILED')

  const locks = lockNames(identity)
  let connection
  try {
    connection = await pool.getConnection()
    for (const name of locks) {
      const [rows] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [name])
      if (!Number(rows[0]?.acquired)) throw new UserSyncError('REALMED_USER_SYNC_FAILED')
    }
    await connection.beginTransaction()
    const user = await reconcile(connection, identity, logger)
    await connection.commit()
    return user
  } catch (error) {
    try { await connection?.rollback() } catch (_) {}
    if (error instanceof UserSyncError) throw error
    logger.error('[REALMED USER SYNC] falha', databaseDiagnostic(error))
    throw new UserSyncError('REALMED_USER_SYNC_FAILED', 500, error)
  } finally {
    for (const name of connection ? [...locks].reverse() : []) {
      try { await connection.query('SELECT RELEASE_LOCK(?) AS released', [name]) } catch (_) {}
    }
    connection?.release()
  }
}

module.exports = { syncStenciUser, UserSyncError, databaseDiagnostic, reconcile, SYNC_MESSAGE }
