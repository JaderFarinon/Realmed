import { onMounted, onBeforeUnmount, ref } from 'vue'
import api from '@/plugins/axios'
import { apiCooldownRemaining, deferApiRequests } from '@/utils/apiCooldown'

export function useTreatmentLiveUpdates(refresh: () => Promise<unknown>) {
  const connected = ref(false)
  let stopped = false, denied = false, refreshing = false, pending = false, retryDelay = 3000
  let controller: AbortController | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let debounce: ReturnType<typeof setTimeout> | undefined
  let watchdog: ReturnType<typeof setTimeout> | undefined
  let fallback: ReturnType<typeof setInterval> | undefined
  async function update() {
    if (stopped || denied || document.hidden) return
    if (apiCooldownRemaining()) { schedule(); return }
    if (refreshing) { pending = true; return }
    refreshing = true
    try { await refresh() } catch { if (apiCooldownRemaining()) schedule() }
    finally {
      refreshing = false
      if (pending) { pending = false; schedule() }
    }
  }
  function schedule() {
    if (stopped || denied) return
    clearTimeout(debounce)
    debounce = setTimeout(update, Math.max(350, apiCooldownRemaining()))
  }
  function onVisible() { if (!document.hidden) schedule() }
  async function connect() {
    if (stopped || denied) return
    if (apiCooldownRemaining()) { retry = setTimeout(connect, apiCooldownRemaining()); return }
    const token = localStorage.getItem('token')
    if (!token) return
    const connection = new AbortController(), started = Date.now()
    controller = connection
    const touch = () => { clearTimeout(watchdog); watchdog = setTimeout(() => connection.abort(), 40000) }
    touch()
    try {
      const response = await fetch(`${api.defaults.baseURL}/treatment-updates`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal: connection.signal,
      })
      if (response.status === 401 || response.status === 403) { denied = true; return }
      if (response.status === 429) deferApiRequests(response.headers.get('Retry-After'))
      if (!response.ok || !response.body) throw new Error('Connection unavailable')
      connected.value = true
      const reader = response.body.getReader(), decoder = new TextDecoder()
      let buffer = ''
      while (!stopped) {
        const chunk = await reader.read()
        if (chunk.done) break
        touch()
        buffer += decoder.decode(chunk.value, { stream: true })
        let boundary: number
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const event = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          if (event.includes('data: refresh')) schedule()
        }
      }
    } catch { /* Network interruptions reconnect without discarding drafts. */ }
    finally {
      connected.value = false
      clearTimeout(watchdog)
      connection.abort()
      if (Date.now() - started >= 30000) retryDelay = 3000
      if (!stopped && !denied) {
        retry = setTimeout(connect, Math.max(retryDelay, apiCooldownRemaining()))
        retryDelay = Math.min(60000, retryDelay * 2)
      }
    }
  }
  onMounted(() => {
    void connect()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    fallback = setInterval(() => { if (!connected.value) schedule() }, 30000)
  })
  onBeforeUnmount(() => {
    stopped = true
    controller?.abort()
    clearTimeout(retry); clearTimeout(debounce); clearTimeout(watchdog); clearInterval(fallback)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onVisible)
  })
  return { connected }
}
