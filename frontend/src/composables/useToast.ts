import { reactive, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  timeout: number
}

const state = reactive<{ toasts: ToastItem[] }>({ toasts: [] })
let counter = 0

const removeToast = (id: number) => {
  const index = state.toasts.findIndex((toast) => toast.id === id)
  if (index >= 0) {
    state.toasts.splice(index, 1)
  }
}

const addToast = (type: ToastType, message: string, timeout = 4000) => {
  const id = ++counter
  state.toasts.push({ id, type, message, timeout })
  window.setTimeout(() => removeToast(id), timeout)
  return id
}

export const useToast = () => ({
  success: (message: string) => addToast('success', message),
  error: (message: string) => addToast('error', message),
  info: (message: string) => addToast('info', message),
  warning: (message: string) => addToast('warning', message),
  remove: removeToast,
})

export const useToastState = () => readonly(state)
