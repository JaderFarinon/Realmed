import { reactive } from 'vue'

export interface StenciOperation {
  name: string
  search?: string
  limit?: number
  offset?: number
}
interface Pending {
  operation: StenciOperation
  resolve: () => void
  reject: (error: Error) => void
}
const pending: Pending[] = []
export const stenciRefreshState = reactive({ open: false, busy: false, error: '' })

export function requestStenciRefresh(operation: StenciOperation) {
  return new Promise<void>((resolve, reject) => {
    pending.push({ operation, resolve, reject })
    stenciRefreshState.open = true
  })
}
export function refreshBatch() {
  return pending.slice()
}
export function completeRefresh(batch: Pending[]) {
  for (const item of batch) {
    const index = pending.indexOf(item)
    if (index >= 0) pending.splice(index, 1)
    item.resolve()
  }
  stenciRefreshState.open = pending.length > 0
}
export function cancelStenciRefresh() {
  if (stenciRefreshState.busy) return
  pending.splice(0).forEach((item) => item.reject(new Error('Consulta Stenci cancelada.')))
  stenciRefreshState.open = false
  stenciRefreshState.error = ''
}
