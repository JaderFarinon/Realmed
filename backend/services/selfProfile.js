const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
function payload(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key)))
    fail(400, 'Dados de perfil inválidos.')
}
function personalData(body) {
  payload(body, ['name', 'email', 'phone'])
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 150)
    fail(400, 'Informe um nome com até 150 caracteres.')
  const data = { name: body.name.trim() }
  for (const [key, limit] of [['email', 150], ['phone', 20]]) {
    if (body[key] != null && typeof body[key] !== 'string') fail(400, 'Dados de contato inválidos.')
    const value = (body[key] || '').trim()
    if (value.length > limit) fail(400, 'Dados de contato excedem o limite permitido.')
    data[key] = value || null
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) fail(400, 'Informe um e-mail válido.')
  if (data.email) data.email = data.email.toLowerCase()
  return data
}
function passwordData(body) {
  payload(body, ['currentPassword', 'newPassword', 'confirmPassword'])
  if (typeof body.currentPassword !== 'string' || !body.currentPassword || Buffer.byteLength(body.currentPassword, 'utf8') > 72)
    fail(400, 'Informe a senha atual.')
  if (typeof body.newPassword !== 'string' || body.newPassword.length < 12 || Buffer.byteLength(body.newPassword, 'utf8') > 72)
    fail(400, 'A nova senha deve ter pelo menos 12 caracteres e no máximo 72 bytes.')
  if (body.newPassword !== body.confirmPassword) fail(400, 'A confirmação da nova senha não confere.')
  if (body.currentPassword === body.newPassword) fail(400, 'Escolha uma senha diferente da atual.')
}
async function changeOwnProfile(db, userId, body, passwordHasher, passwordOnly = false) {
  const data = passwordOnly ? (passwordData(body), null) : personalData(body)
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query(`SELECT u.id, u.username, u.role, u.status, u.person_id, u.auth_provider, u.password_hash,
      p.full_name, p.email, p.phone, p.avatar_url FROM users u LEFT JOIN people p ON p.id = u.person_id WHERE u.id = ? FOR UPDATE`, [userId])
    const user = rows[0]
    if (!user || user.status !== 'active') fail(403, 'Acesso indisponível. Solicite liberação ao administrador.')
    if (passwordOnly) {
      if (user.auth_provider !== 'LOCAL') fail(422, 'A senha desta conta deve ser alterada no Stenci.')
      if (!user.password_hash || !await passwordHasher.compare(body.currentPassword, user.password_hash)) fail(400, 'A senha atual está incorreta.')
      const hash = await passwordHasher.hash(body.newPassword, 12)
      await connection.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, userId])
    } else {
      if (!user.person_id) fail(409, 'Cadastro pessoal não encontrado. Procure um administrador.')
      await connection.query('UPDATE people SET full_name = ?, email = ?, phone = ?, updated_at = NOW() WHERE id = ?', [data.name, data.email, data.phone, user.person_id])
    }
    const context = passwordOnly ? { action: 'SELF_PASSWORD_CHANGED' } : {
      action: 'SELF_PROFILE_UPDATED', before: { name: user.full_name, email: user.email, phone: user.phone }, after: data,
    }
    await connection.query('INSERT INTO permission_audit (user_id, changed_by, previous_permissions, new_permissions, context) VALUES (?, ?, NULL, ?, ?)', [userId, userId, '[]', JSON.stringify(context)])
    await connection.commit()
    const { password_hash, ...safeUser } = user
    return passwordOnly ? null : { ...safeUser, full_name: data.name, email: data.email, phone: data.phone }
  } catch (error) {
    await connection.rollback()
    if (error.code === 'ER_DUP_ENTRY') fail(409, 'Este e-mail já está cadastrado em outra conta.')
    throw error
  } finally { connection.release() }
}
module.exports = { changeOwnProfile, personalData, passwordData }
