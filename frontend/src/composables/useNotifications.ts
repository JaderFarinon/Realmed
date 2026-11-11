import { readonly, ref, watch } from 'vue'
export type NoticeTone = 'success' | 'info' | 'warning' | 'error'
export interface Notice { id: number; message: string; tone: NoticeTone; durationMs: number }
const notices = ref<Notice[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let sequence = 0
export function dismissNotification(id: number) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  notices.value = notices.value.filter(notice => notice.id !== id)
}
export function notify(message: unknown, tone: NoticeTone = 'info', durationMs = 5000) {
  if (typeof message !== 'string' || !message.trim()) return
  const text = message.trim()
  if (notices.value.some(notice => notice.message === text && notice.tone === tone)) return
  if (notices.value.length >= 4) dismissNotification(notices.value[0].id)
  const id = ++sequence
  notices.value.push({ id, message: text, tone, durationMs })
  timers.set(id, setTimeout(() => dismissNotification(id), durationMs))
}
export const notifications = readonly(notices)
export function useFeedback(message: () => unknown, tone: () => NoticeTone = () => 'info') {
  let queued = false
  watch(() => [message(), tone()] as const, () => {
    if (queued) return
    queued = true
    queueMicrotask(() => { queued = false; notify(message(), tone()) })
  }, { immediate: true, flush: 'sync' })
}
