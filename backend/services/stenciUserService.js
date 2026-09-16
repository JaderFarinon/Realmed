async function syncStenciUser(pool, identity) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    let [rows] = await connection.query(
      'SELECT * FROM users WHERE stenci_user_id = ? LIMIT 1 FOR UPDATE',
      [identity.stenci_user_id],
    )
    let user = rows[0]

    // A legacy account with the same username can be safely linked on its first Stenci login.
    if (!user && identity.stenci_username) {
      ;[rows] = await connection.query(
        'SELECT * FROM users WHERE username = ? AND stenci_user_id IS NULL LIMIT 1 FOR UPDATE',
        [identity.stenci_username],
      )
      user = rows[0]
    }

    let personId = user?.person_id
    if (!personId) {
      const [result] = await connection.query(
        'INSERT INTO people (full_name, email, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [identity.name, identity.email],
      )
      personId = result.insertId
    } else {
      const updates = []
      const values = []
      if (identity.name != null) { updates.push('full_name = ?'); values.push(identity.name) }
      if (identity.email != null) { updates.push('email = ?'); values.push(identity.email) }
      if (updates.length) {
        values.push(personId)
        await connection.query(`UPDATE people SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values)
      }
    }

    if (user) {
      await connection.query(
        `UPDATE users SET stenci_user_id = ?, stenci_username = ?, username = ?, person_id = ?,
                status = 'active', last_login = NOW(), updated_at = NOW() WHERE id = ?`,
        [identity.stenci_user_id, identity.stenci_username, identity.stenci_username, personId, user.id],
      )
    } else {
      const [result] = await connection.query(
        `INSERT INTO users
           (username, password, person_id, status, role, stenci_user_id, stenci_username, last_login, created_at, updated_at)
         VALUES (?, NULL, ?, 'active', 'user', ?, ?, NOW(), NOW(), NOW())`,
        [identity.stenci_username, personId, identity.stenci_user_id, identity.stenci_username],
      )
      user = { id: result.insertId }
    }

    const [synced] = await connection.query(
      `SELECT u.id, u.username, u.role, u.status, u.person_id, u.stenci_user_id, u.stenci_username,
              p.full_name, p.email, p.avatar_url
         FROM users u LEFT JOIN people p ON p.id = u.person_id WHERE u.id = ? LIMIT 1`,
      [user.id],
    )
    await connection.commit()
    return synced[0]
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { syncStenciUser }
