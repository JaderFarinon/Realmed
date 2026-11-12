function createCooldown() {
  let retryAt = 0
  return {
    defer(retryAfter: unknown) {
      const value = String(retryAfter ?? '').trim()
      const seconds = value ? Number(value) : NaN
      const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now()
      retryAt = Math.max(retryAt, Date.now() + (Number.isFinite(delay) && delay > 0 ? delay : 60000))
    },
    remaining: () => Math.max(0, retryAt - Date.now()),
  }
}
// General API requests and the treatment event stream share one pause.
const general = createCooldown(), facial = createCooldown()
export const deferApiRequests = general.defer
export const apiCooldownRemaining = general.remaining
// Facial login must not inherit a longer pause from a different module.
export const deferFacialLogin = facial.defer
export const facialCooldownRemaining = facial.remaining
