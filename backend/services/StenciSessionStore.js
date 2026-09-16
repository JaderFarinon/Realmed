const crypto = require('node:crypto')

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }

function tokenTtlMs(value = '2h') {
  if (typeof value === 'number' && value > 0) return value * 1000
  const match = String(value).trim().match(/^(\d+)\s*([smhd])$/i)
  return match ? Number(match[1]) * UNIT_MS[match[2].toLowerCase()] : 2 * UNIT_MS.h
}

class StenciSessionStore {
  constructor({ ttlMs = tokenTtlMs(process.env.TOKEN_EXPIRES_IN), now = Date.now } = {}) {
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
    const timer = setTimeout(() => {
      const current = this.sessions.get(sid)
      if (current?.expiresAt === expiresAt) this.sessions.delete(sid)
    }, Math.min(this.ttlMs, 2_147_483_647))
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

  delete(sid) {
    if (!sid) return false
    const entry = this.sessions.get(sid)
    if (entry?.timer) clearTimeout(entry.timer)
    return this.sessions.delete(sid)
  }
  clear() {
    for (const sid of this.sessions.keys()) this.delete(sid)
  }
}

const stenciSessionStore = new StenciSessionStore()

module.exports = { StenciSessionStore, stenciSessionStore, tokenTtlMs }
