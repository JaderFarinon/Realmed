const crypto = require('node:crypto')

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }

function tokenTtlMs(value = '2h') {
  if (typeof value === 'number' && value > 0) return value * 1000
  const match = String(value)
    .trim()
    .match(/^(\d+)\s*([smhd])$/i)
  return match
    ? Number(match[1]) * UNIT_MS[match[2].toLowerCase()]
    : 2 * UNIT_MS.h
}

class StenciSessionStore {
  #credentialKey = crypto.randomBytes(32)
  constructor({
    ttlMs = tokenTtlMs(process.env.TOKEN_EXPIRES_IN),
    now = Date.now,
  } = {}) {
    this.ttlMs = ttlMs
    this.now = now
    this.sessions = new Map()
  }

  create(session) {
    const sid = crypto.randomUUID()
    this.set(sid, session)
    return sid
  }

  set(sid, session) {
    this.delete(sid)
    const expiresAt = this.now() + this.ttlMs
    const timer = setTimeout(
      () => {
        const current = this.sessions.get(sid)
        if (current?.expiresAt === expiresAt) this.delete(sid)
      },
      Math.min(this.ttlMs, 2_147_483_647),
    )
    timer.unref?.()
    this.sessions.set(sid, { session, expiresAt, timer })
  }

  get(sid) {
    const entry = sid && this.sessions.get(sid)
    if (!entry) return null
    if (entry.expiresAt <= this.now()) {
      this.delete(sid)
      return null
    }
    return entry.session
  }
  limitExpiration(sid, expiresAt) {
    const entry = this.sessions.get(sid)
    if (!entry || !Number.isFinite(expiresAt)) return false
    clearTimeout(entry.timer)
    entry.expiresAt = Math.min(entry.expiresAt, expiresAt)
    if (entry.expiresAt <= this.now()) {
      this.delete(sid)
      return false
    }
    entry.timer = setTimeout(
      () => this.delete(sid),
      Math.min(entry.expiresAt - this.now(), 2_147_483_647),
    )
    entry.timer.unref?.()
    return true
  }

  delete(sid) {
    if (!sid) return false
    const entry = this.sessions.get(sid)
    if (entry?.timer) clearTimeout(entry.timer)
    this.clearCredentials(sid)
    return this.sessions.delete(sid)
  }
  setCredentials(sid, { username, password }) {
    if (!this.get(sid)) return false
    if (
      typeof username !== 'string' ||
      !username ||
      username.length > 300 ||
      typeof password !== 'string' ||
      !password ||
      password.length > 4096
    )
      throw new Error('Credenciais Stenci inválidas.')
    const entry = this.sessions.get(sid)
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.#credentialKey, iv)
    cipher.setAAD(
      Buffer.from(JSON.stringify([sid, entry.session.stenciUserId])),
    )
    const plaintext = Buffer.from(JSON.stringify({ username, password }))
    try {
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
      ])
      this.clearCredentials(sid)
      entry.credentials = { iv, ciphertext, tag: cipher.getAuthTag() }
      return true
    } finally {
      plaintext.fill(0)
    }
  }
  getCredentials(sid) {
    if (!this.get(sid)) return null
    const entry = this.sessions.get(sid),
      secret = entry.credentials
    if (!secret) return null
    let plaintext
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.#credentialKey,
        secret.iv,
        { authTagLength: 16 },
      )
      decipher.setAAD(
        Buffer.from(JSON.stringify([sid, entry.session.stenciUserId])),
      )
      decipher.setAuthTag(secret.tag)
      plaintext = Buffer.concat([
        decipher.update(secret.ciphertext),
        decipher.final(),
      ])
      return JSON.parse(plaintext.toString('utf8'))
    } catch {
      this.clearCredentials(sid)
      return null
    } finally {
      plaintext?.fill(0)
    }
  }
  clearCredentials(sid) {
    const entry = this.sessions.get(sid)
    if (entry?.credentials) {
      for (const value of Object.values(entry.credentials)) value.fill(0)
      delete entry.credentials
    }
  }
  hasCredentials(sid) {
    return Boolean(this.get(sid) && this.sessions.get(sid)?.credentials)
  }
  clear() {
    for (const sid of this.sessions.keys()) this.delete(sid)
  }
}

const stenciSessionStore = new StenciSessionStore()

module.exports = { StenciSessionStore, stenciSessionStore, tokenTtlMs }
