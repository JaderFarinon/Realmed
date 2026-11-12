import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'

// Anchor to server time; changing the tablet's wall clock must not unlock a session.
export function usePhysioClock(onResume: () => void) {
  const now = ref<number | null>(null)
  let anchor: { server: number; monotonic: number } | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  function tick() { now.value = anchor ? anchor.server + Math.max(0, performance.now() - anchor.monotonic) : null }
  function invalidate() { anchor = null; now.value = null }
  function sync(value: unknown) {
    const server = typeof value === 'string' ? Date.parse(value) : NaN
    if(!Number.isFinite(server) || document.hidden) { invalidate(); return }
    anchor = {server,monotonic:performance.now()}; tick()
  }
  function visibility() {
    invalidate()
    if(!document.hidden) onResume()
  }
  onMounted(() => { timer = setInterval(tick, 1000); document.addEventListener('visibilitychange', visibility) })
  onBeforeUnmount(() => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); invalidate() })
  return {now:readonly(now),sync,invalidate}
}
