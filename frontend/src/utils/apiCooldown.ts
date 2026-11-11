// Shared by Axios requests and the fetch-based treatment event stream.
let retryAt = 0
export function deferApiRequests(retryAfter: unknown) {
  const value = String(retryAfter ?? '').trim()
  const seconds = value ? Number(value) : NaN
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now()
  retryAt = Math.max(retryAt, Date.now() + (Number.isFinite(delay) && delay > 0 ? delay : 60000))
}
export function apiCooldownRemaining() { return Math.max(0, retryAt - Date.now()) }
